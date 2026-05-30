<script lang="ts">
  // Audio episode overlay (PRD-016 M1 / RFC-019 §7).
  // Right-panel on desktop ≥800 px; bottom-sheet on mobile <800 px.
  // S5.1 — real playback. <audio> element + per-route inventory + transport.

  import { onMount, tick, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { base } from '$app/paths';
  import { audio, type Episode } from '$lib/audio-state.svelte';
  import { audioRegistry } from '$lib/audio-registry.svelte';
  import { CURATOR_FULL_TOUR, stagesForEpisode, type AudioStage } from '$lib/audio-tour';
  import { localeFromPage } from '$lib/locale';

  let audioEl: HTMLAudioElement | null = $state(null);
  let overlayRoot: HTMLDivElement | null = $state(null);
  let scope: 'screen' | 'all' = $state('screen');
  // Tour Phase 2 — track which stage timings already fired this play.
  // Keyed by `${episode_id}:${at_sec}:${action}` so re-loading the same
  // episode (or clicking it again) restarts the stage sequence.
  let firedStages = $state<Set<string>>(new Set());
  // Active cue message (banner inside overlay) — null = no cue showing.
  let activeCue = $state<string | null>(null);
  // Reactive so episode swaps can cancel a pending cue dismissal without
  // a stale timer trampling the new cue.
  let cueTimer = $state<number | null>(null);
  // Captures focus origin so closing the overlay restores focus to the
  // element that opened it (PRD-016 M14 — desktop focus discipline).
  let focusReturnTo: HTMLElement | null = null;

  const PROVIDER_LABEL: Record<string, string> = {
    google: 'Google',
    elevenlabs: 'ElevenLabs',
    openai: 'OpenAI',
    azure: 'Azure',
    'coqui-local': 'Coqui',
  };

  onMount(() => {
    void audioRegistry.load();
  });

  // Focus management (PRD-016 M14 — keyboard focus discipline).
  // When the overlay opens, capture the launching element and move focus
  // into the panel so Tab/Shift+Tab cycles inside it. When it closes,
  // restore focus to the launcher. Escape also closes the panel.
  $effect(() => {
    if (!browser) return;
    if (audio.open) {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body) focusReturnTo = active;
      // Defer focus move until the overlay's DOM is in place.
      void tick().then(() => {
        if (!overlayRoot) return;
        const firstBtn = overlayRoot.querySelector(
          'button:not([disabled]), [href], input:not([disabled])',
        ) as HTMLElement | null;
        firstBtn?.focus();
      });
    } else if (focusReturnTo) {
      focusReturnTo.focus();
      focusReturnTo = null;
    }
  });

  function onOverlayKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      audio.closeOverlay();
      return;
    }
    if (e.key !== 'Tab' || !overlayRoot) return;
    const focusables = overlayRoot.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const activeEl = document.activeElement as HTMLElement | null;
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const routeEpisodes = $derived(audioRegistry.forRoute($page.url.pathname));
  const visibleEpisodes = $derived(scope === 'screen' ? routeEpisodes : audioRegistry.episodes);

  // When the visible list is empty under 'screen' scope, fall back to 'all'.
  $effect(() => {
    if (audioRegistry.loaded && scope === 'screen' && routeEpisodes.length === 0) {
      scope = 'all';
    }
  });

  // Sync playing-state to the audio element. On overlay re-open mid-episode
  // the <audio> element is freshly mounted at currentTime=0 — restore the
  // saved positionSec before playing (#13 — pause-on-close resume). Without
  // this, closing the panel mid-track and reopening would silently rewind.
  $effect(() => {
    if (!audioEl) return;
    if (audio.playing && audioEl.paused) {
      const savedPos = untrack(() => audio.positionSec);
      if (savedPos > 0 && Math.abs(audioEl.currentTime - savedPos) > 0.25) {
        try {
          audioEl.currentTime = savedPos;
        } catch {
          // The audio element may not have a duration yet — the seek will
          // retry on the next play attempt once metadata loads.
        }
      }
      void audioEl.play().catch(() => {
        // Browser blocked autoplay or load failed — flip state back.
        audio.pause();
      });
    } else if (!audio.playing && !audioEl.paused) {
      audioEl.pause();
    }
  });

  // Sync playback speed.
  $effect(() => {
    if (audioEl) audioEl.playbackRate = audio.speed;
  });

  // Virtual-walkthrough auto-navigation. When the tour advances to an
  // episode anchored to a different route, drive the browser there so
  // the listener sees the screen they're hearing about. Only runs while
  // a tour is active — manual episode loads from the inventory leave
  // navigation under the user's control.
  //
  // Intentional behaviour: if the user manually navigates away from the
  // tour's current route mid-episode (Nav link click, browser back), the
  // NEXT tour episode advance will pull them back to its anchored route.
  // Stop the tour first (the stop button in the tour-bar) to free
  // navigation entirely.
  $effect(() => {
    if (!browser || !audio.tourActive) return;
    const ep = audio.currentEpisode;
    if (!ep?.route) return;
    const target = `${base}${ep.route === '/' ? '' : ep.route}` || '/';
    // Strip query string + hash for the compare; preserve scroll reset
    // because each route's content is its own scene.
    const current = $page.url.pathname.replace(/\/+$/, '') || '/';
    const want = (target.replace(/\/+$/, '') || '/').replace(base, '') || '/';
    const have = current.replace(base, '') || '/';
    if (have === want) return;
    void goto(target, {
      replaceState: false,
      noScroll: false,
      keepFocus: true,
    });
  });

  // Tour Phase 2 — fire stage hooks during playback. Watches position
  // against the current episode's stage timings; each stage fires once.
  // Episode-change handling: reset firedStages + clear pending cue inside
  // an untrack() so the reset is part of this single effect and doesn't
  // need a sibling $effect (the previous sibling-reset effect had no
  // ordering guarantee with this one — sibling-effect race could fire
  // a stage from the prior episode against the new positionSec).
  let lastEpisodeIdForStages = $state<string | null>(null);
  $effect(() => {
    if (!browser || !audio.currentEpisode) return;
    const epId = audio.currentEpisode.id;
    if (epId !== lastEpisodeIdForStages) {
      untrack(() => {
        firedStages = new Set();
        if (cueTimer !== null) {
          window.clearTimeout(cueTimer);
          cueTimer = null;
        }
        activeCue = null;
      });
      lastEpisodeIdForStages = epId;
    }
    const stages = stagesForEpisode(epId);
    if (stages.length === 0) return;
    const pos = audio.positionSec;
    for (const stage of stages) {
      if (pos < stage.at_sec) continue;
      const key = `${epId}:${stage.at_sec}:${stage.action}:${stage.target}`;
      if (firedStages.has(key)) continue;
      firedStages = new Set([...firedStages, key]);
      executeStage(stage);
    }
  });

  // Mark heard at ≥80 % completion (PRD-016 US-4). The Set guards against
  // re-firing on positions past the threshold — markHeard is idempotent
  // anyway, but the guard avoids state churn.
  $effect(() => {
    const ep = audio.currentEpisode;
    if (!ep || audio.durationSec <= 0) return;
    if (audio.positionSec / audio.durationSec < 0.8) return;
    if (audio.isHeard(ep.id)) return;
    audio.markHeard(ep.id);
  });

  function executeStage(stage: AudioStage): void {
    if (typeof document === 'undefined') return;
    // `cue` is the DOM-free action — `target` is the message text, not a selector.
    if (stage.action === 'cue') {
      activeCue = stage.target;
      const ms = stage.duration_ms ?? 6000;
      if (cueTimer) window.clearTimeout(cueTimer);
      cueTimer = window.setTimeout(() => {
        activeCue = null;
        cueTimer = null;
      }, ms);
      return;
    }
    const el = document.querySelector(stage.target) as HTMLElement | null;
    if (!el) return;
    switch (stage.action) {
      case 'flash':
        el.classList.add('audio-stage-flash');
        window.setTimeout(() => el.classList.remove('audio-stage-flash'), 1800);
        break;
      case 'scroll-to':
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'click':
      case 'open-tab':
        if (typeof el.click === 'function') el.click();
        break;
    }
  }

  async function loadAndPlay(ep: Episode): Promise<void> {
    // Stop the prior track first — explicitly, not via the playing-state
    // effect — so the browser doesn't keep streaming the old src while we
    // swap to the new one.
    if (audioEl && !audioEl.paused) audioEl.pause();
    audio.loadEpisode(ep);
    // Wait for Svelte to flush the new src attribute onto <audio>. Without
    // this, .load() below would re-read the OLD src and the previous
    // episode would resume from position 0.
    await tick();
    if (!audioEl) return;
    audioEl.load();
    audio.play();
  }

  async function switchToProvider(provider: string): Promise<void> {
    if (!audio.currentEpisode) return;
    const wasPlaying = audio.playing;
    const pos = audio.positionSec;
    if (audioEl && !audioEl.paused) audioEl.pause();
    audio.switchVariant(provider as 'google' | 'elevenlabs');
    await tick();
    if (!audioEl) return;
    audioEl.load();
    audioEl.currentTime = pos;
    if (wasPlaying) audio.play();
  }

  function onTimeUpdate(): void {
    if (audioEl) audio.positionSec = audioEl.currentTime;
  }
  function onDurationChange(): void {
    if (audioEl && Number.isFinite(audioEl.duration)) audio.durationSec = audioEl.duration;
  }
  function onEnded(): void {
    audio.endEpisode();
    // Auto-advance through the tour if active. Stops at the last episode.
    if (audio.tourActive) {
      const nextId = audio.nextTourId();
      if (nextId) {
        const ep = audioRegistry.byId(nextId);
        if (ep) void loadAndPlay(ep);
      }
    }
  }

  async function startTour(): Promise<void> {
    // Filter the canonical sequence down to episodes actually present in
    // the registry — defensive against partial generation.
    const available = CURATOR_FULL_TOUR.filter((id) => audioRegistry.byId(id));
    if (available.length === 0) return;
    audio.startTour(available);
    const first = audioRegistry.byId(available[0]);
    if (first) await loadAndPlay(first);
  }

  async function tourNext(): Promise<void> {
    const id = audio.nextTourId();
    if (!id) return;
    const ep = audioRegistry.byId(id);
    if (ep) await loadAndPlay(ep);
  }

  async function tourPrev(): Promise<void> {
    const id = audio.prevTourId();
    if (!id) return;
    const ep = audioRegistry.byId(id);
    if (ep) await loadAndPlay(ep);
  }
  function onScrub(e: Event): void {
    const t = Number((e.currentTarget as HTMLInputElement).value);
    audio.positionSec = t;
    if (audioEl) audioEl.currentTime = t;
  }
  function onSpeedChange(e: Event): void {
    audio.speed = Number((e.currentTarget as HTMLSelectElement).value);
  }

  function fmtTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Caption <track> label — Intl.DisplayNames where available, locale
  // string as fallback. Avoids hardcoded "English" once v0.8 adds locales.
  function localeLabel(locale: string): string {
    try {
      const dn = new Intl.DisplayNames([locale], { type: 'language' });
      return dn.of(locale) ?? locale;
    } catch {
      return locale;
    }
  }

  // ─── Captions (S9 — PRD-016 M9 / RFC-019 §7.5) ─────────────────────────
  // The <track> element is wired to the VTT URL; we keep its mode `hidden`
  // so cuechange fires without the browser drawing its native caption UI
  // (which we replace with our own banner so styling matches the overlay).

  $effect(() => {
    if (!audioEl) return;
    const tracks = audioEl.textTracks;
    if (tracks.length === 0) return;
    const track = tracks[0];
    track.mode = 'hidden';
    const onCueChange = () => {
      const cues = track.activeCues;
      if (cues && cues.length > 0) {
        // VTTCue.text is the rendered string for the active cue.
        audio.currentCaption = (cues[0] as VTTCue).text;
      } else {
        audio.currentCaption = '';
      }
    };
    track.addEventListener('cuechange', onCueChange);
    return () => track.removeEventListener('cuechange', onCueChange);
  });

  // Auto-on triggers (PRD-016 M9 / RFC-019 §7.5). Four signals that flip
  // captions on by default; the user can still override with the manual
  // toggle.
  // - prefers-reduced-motion: assume reduced sensory load preferred
  // - <audio> muted at episode start: caption is the only path to content
  // - navigator.connection effectiveType slow: bandwidth-bound listener
  // - assistive-tech hint: forced-colors active OR
  //   inverted-colors active OR navigator.userActivation indicates a
  //   pointer-only session is unlikely. Browsers don't expose a stable
  //   "is a screen reader attached" API on purpose; we use the strongest
  //   accessibility-preference signals available cross-browser as a
  //   proxy. False positives default-on captions — harmless because the
  //   user can still hide them.
  $effect(() => {
    if (!browser) return;
    const queries = [
      '(prefers-reduced-motion: reduce)',
      '(forced-colors: active)',
      '(inverted-colors: inverted)',
      '(prefers-contrast: more)',
    ];
    const mqs: MediaQueryList[] = [];
    for (const q of queries) {
      try {
        mqs.push(window.matchMedia(q));
      } catch {
        // unsupported query — skip silently
      }
    }
    const evaluate = () => {
      const reduced = mqs[0]?.matches === true;
      const a11yHint = mqs.slice(1).some((mq) => mq.matches === true);
      const muted = audioEl?.muted === true;
      const eff = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
        ?.effectiveType;
      const slowConn = eff === 'slow-2g' || eff === '2g' || eff === '3g';
      if (reduced || a11yHint || muted || slowConn) audio.captionsOn = true;
    };
    evaluate();
    for (const mq of mqs) mq.addEventListener?.('change', evaluate);
    return () => {
      for (const mq of mqs) mq.removeEventListener?.('change', evaluate);
    };
  });

  // Locale-switch mid-playback (PRD-016 US-5 / S4, RFC-019 §7.4).
  // When the page-level locale flips, swap the current episode to the
  // matching-locale variant if one exists and seek to the proportional
  // timestamp. v0.7 ships en-US only so this is dormant; wiring it now
  // lands the contract in code so v0.8 i18n surfaces it on first ride.
  $effect(() => {
    if (!browser) return;
    const targetLocale = localeFromPage($page);
    const ep = audio.currentEpisode;
    if (!ep || ep.locale === targetLocale) return;
    const dur = audio.durationSec;
    const pos = audio.positionSec;
    const ratio = dur > 0 ? pos / dur : 0;
    const wasPlaying = audio.playing;
    const swap = audioRegistry.byIdLocale(ep.id, targetLocale);
    if (!swap) return;
    untrack(() => {
      audio.loadEpisode(swap);
    });
    void tick().then(() => {
      if (!audioEl) return;
      audioEl.load();
      const seekTo = (swap.durationSec || dur) * ratio;
      try {
        audioEl.currentTime = seekTo;
      } catch {
        // Pre-metadata seek may throw — onDurationChange will pick up
        // the saved positionSec via untrack-restore below.
      }
      audio.positionSec = seekTo;
      if (wasPlaying) audio.play();
    });
  });

  function toggleCaptions(): void {
    audio.captionsOn = !audio.captionsOn;
  }

  async function downloadTranscript(): Promise<void> {
    const ep = audio.currentEpisode;
    if (!ep) return;
    try {
      const res = await fetch(ep.txt);
      if (!res.ok) return;
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ep.id}-${ep.locale}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // network error or browser refused download — silent no-op
    }
  }
</script>

{#if audio.open}
  <div
    bind:this={overlayRoot}
    id="audio-overlay"
    class="audio-overlay"
    role="dialog"
    aria-modal="false"
    aria-label="Audio episode player"
    tabindex="-1"
    onkeydown={onOverlayKeydown}
  >
    <header class="overlay-header">
      <div class="title-block">
        <span class="overlay-eyebrow">AUDIO</span>
        <h2 class="overlay-title">
          {audio.currentEpisode?.title ?? 'Audio episodes'}
        </h2>
      </div>
      <button
        type="button"
        class="close-btn"
        aria-label="Close audio overlay"
        onclick={() => audio.closeOverlay()}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" />
          <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </button>
    </header>

    <section class="tour-bar" aria-label="Curator Full Tour">
      {#if audio.tourActive}
        <span class="tour-eyebrow">TOUR</span>
        <span class="tour-position">{audio.tourIndex + 1} / {audio.tourSequence.length}</span>
        <button
          type="button"
          class="tour-btn"
          aria-label="Previous in tour"
          onclick={tourPrev}
          disabled={audio.tourIndex === 0}
        >
          ‹
        </button>
        <button
          type="button"
          class="tour-btn tour-stop"
          aria-label="Stop tour"
          onclick={() => audio.stopTour()}
        >
          stop
        </button>
        <button
          type="button"
          class="tour-btn"
          aria-label="Next in tour"
          onclick={tourNext}
          disabled={audio.tourIndex >= audio.tourSequence.length - 1}
        >
          ›
        </button>
      {:else}
        <button
          type="button"
          class="tour-start"
          onclick={startTour}
          disabled={!audioRegistry.loaded}
        >
          ▶ Take the Curator Tour
          <span class="tour-meta">{CURATOR_FULL_TOUR.length} episodes · ~66 min</span>
        </button>
      {/if}
    </section>

    {#if audio.currentEpisode}
      <section class="now-playing" aria-label="Now playing">
        <!-- Hidden audio element — UI controls drive it through state. -->
        <audio
          bind:this={audioEl}
          src={audio.currentEpisode.mp3}
          preload="metadata"
          ontimeupdate={onTimeUpdate}
          ondurationchange={onDurationChange}
          onended={onEnded}
        >
          <track
            kind="subtitles"
            srclang={audio.currentEpisode.locale.split('-')[0]}
            label={localeLabel(audio.currentEpisode.locale)}
            src={audio.currentEpisode.vtt}
            default
          />
        </audio>

        {#if audio.currentEpisode.variants.length > 1}
          <div class="provider-switcher" role="group" aria-label="Voice provider (A/B compare)">
            <span class="provider-eyebrow">VOICE</span>
            {#each audio.currentEpisode.variants as v (v.provider)}
              <button
                type="button"
                class="provider-btn"
                class:active={v.provider === audio.currentEpisode.activeProvider}
                aria-pressed={v.provider === audio.currentEpisode.activeProvider}
                onclick={() => switchToProvider(v.provider)}
              >
                {PROVIDER_LABEL[v.provider] ?? v.provider}
              </button>
            {/each}
          </div>
        {/if}

        <div class="transport">
          <button
            type="button"
            class="play-pause"
            aria-label={audio.playing ? 'Pause' : 'Play'}
            aria-pressed={audio.playing}
            onclick={() => audio.togglePlay()}
          >
            {audio.playing ? '⏸' : '▶'}
          </button>
          <span class="time" aria-label="Current time">
            {fmtTime(audio.positionSec)} / {fmtTime(audio.durationSec)}
          </span>
          <label class="speed">
            <span class="sr-only">Playback speed</span>
            <select aria-label="Playback speed" value={audio.speed} onchange={onSpeedChange}>
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          </label>
          <button
            type="button"
            class="cc-toggle"
            class:active={audio.captionsOn}
            aria-label={audio.captionsOn ? 'Hide captions' : 'Show captions'}
            aria-pressed={audio.captionsOn}
            title="Toggle captions"
            onclick={toggleCaptions}
          >
            CC
          </button>
        </div>

        <input
          type="range"
          class="scrubber"
          min="0"
          max={audio.durationSec || 0}
          step="0.1"
          value={audio.positionSec}
          aria-label="Episode position"
          oninput={onScrub}
        />

        <!-- Single aria-live channel: cues take priority over captions
             when both are present so screen readers don't read both
             simultaneously (#24). Caption text still renders silently
             via the caption banner when no cue is active. -->
        {#if activeCue}
          <div class="cue-banner" role="status" aria-live="polite" aria-atomic="true">
            <span class="cue-arrow" aria-hidden="true">→</span>
            <span class="cue-text">{activeCue}</span>
          </div>
        {/if}

        {#if audio.captionsOn && audio.currentCaption}
          <div
            class="caption-banner"
            role="region"
            aria-label="Captions"
            aria-live={activeCue ? 'off' : 'polite'}
            aria-atomic="true"
          >
            {audio.currentCaption}
          </div>
        {/if}

        <div class="extras">
          <button
            type="button"
            class="link-btn"
            aria-label="Download transcript as text"
            onclick={downloadTranscript}
          >
            ↓ transcript (.txt)
          </button>
        </div>
      </section>
    {/if}

    <section class="inventory" aria-label="Episode inventory">
      {#if audioRegistry.loaded}
        <div class="scope-tabs" role="tablist" aria-label="Episode scope">
          <button
            type="button"
            role="tab"
            class="scope-tab"
            class:active={scope === 'screen'}
            aria-selected={scope === 'screen'}
            disabled={routeEpisodes.length === 0}
            onclick={() => (scope = 'screen')}
          >
            For this screen{routeEpisodes.length > 0 ? ` (${routeEpisodes.length})` : ''}
          </button>
          <button
            type="button"
            role="tab"
            class="scope-tab"
            class:active={scope === 'all'}
            aria-selected={scope === 'all'}
            onclick={() => (scope = 'all')}
          >
            All episodes ({audioRegistry.episodes.length})
          </button>
        </div>

        {#if visibleEpisodes.length === 0}
          <p class="inventory-empty">No episodes for this screen yet — try "All episodes".</p>
        {:else}
          <ul class="episode-list" role="list">
            {#each visibleEpisodes as ep (ep.id)}
              {@const heard = audio.isHeard(ep.id)}
              {@const current = ep.id === audio.currentEpisode?.id}
              <li>
                <button
                  type="button"
                  class="episode-row"
                  class:current
                  class:heard
                  onclick={() => void loadAndPlay(ep)}
                >
                  <span class="ep-title">{ep.title}</span>
                  <span class="ep-meta">
                    <span class="persona-tag persona-{ep.persona}">{ep.persona}</span>
                    {#if ep.route}<span class="route-tag">{ep.route}</span>{/if}
                    {#if ep.durationSec}<span class="dur-tag">
                        {Math.floor(ep.durationSec / 60)}:{(ep.durationSec % 60)
                          .toString()
                          .padStart(2, '0')}
                      </span>{/if}
                    {#if ep.variants.length > 1}<span
                        class="ab-tag"
                        aria-label="A/B variants available">A/B {ep.variants.length}</span
                      >{/if}
                    {#if heard}<span class="heard-tag" aria-label="Played">✓</span>{/if}
                  </span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      {:else if audioRegistry.loading}
        <p class="inventory-empty">Loading episodes…</p>
      {:else if audioRegistry.loadError}
        <p class="inventory-empty error">
          Could not load episode registry: {audioRegistry.loadError}
        </p>
      {:else}
        <p class="inventory-empty">No episodes yet.</p>
      {/if}
    </section>

    <footer class="origin-disclosure" aria-label="Audio origin disclosure">
      <span>Voices · Google Cloud TTS · Scripts · drafted by Claude (Anthropic)</span>
      <span class="origin-detail"
        >Per-episode attribution on <a href="{base}/credits">/credits</a></span
      >
    </footer>
  </div>
{/if}

<style>
  .audio-overlay {
    position: fixed;
    top: var(--nav-height);
    right: 0;
    width: min(360px, 100vw);
    max-height: calc(100vh - var(--nav-height));
    z-index: 50;
    background: var(--color-nav-bg);
    border-left: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    color: var(--color-text);
  }

  .overlay-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .title-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .overlay-eyebrow {
    font-family: var(--font-display, inherit);
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
  }

  .overlay-title {
    margin: 0;
    font-size: 16px;
    line-height: 1.25;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .close-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    flex-shrink: 0;
  }
  .close-btn:hover,
  .close-btn:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }

  .now-playing {
    padding: 14px 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .transport {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .play-pause {
    background: rgba(68, 102, 255, 0.2);
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    color: var(--color-text);
    width: 44px;
    height: 44px;
    font-size: 16px;
    cursor: pointer;
  }
  .play-pause:hover,
  .play-pause:focus-visible {
    background: rgba(68, 102, 255, 0.3);
    outline: none;
  }

  .time {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
    font-variant-numeric: tabular-nums;
  }

  .speed select {
    background: transparent;
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 12px;
    min-height: 32px;
  }

  .scrubber {
    width: 100%;
    accent-color: #4466ff;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .inventory {
    padding: 12px 0 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .scope-tabs {
    display: flex;
    gap: 4px;
    padding: 0 14px 8px;
  }
  .scope-tab {
    flex: 1;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .scope-tab:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.85);
  }
  .scope-tab:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .scope-tab.active {
    background: rgba(68, 102, 255, 0.18);
    border-color: rgba(68, 102, 255, 0.5);
    color: rgba(150, 175, 255, 0.95);
  }
  .episode-list {
    list-style: none;
    margin: 0;
    padding: 0 6px;
    max-height: 320px;
    overflow-y: auto;
  }
  .episode-row {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .episode-row:hover,
  .episode-row:focus-visible {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.14);
    color: var(--color-text);
    outline: none;
  }
  .episode-row.current {
    background: rgba(68, 102, 255, 0.16);
    border-color: rgba(68, 102, 255, 0.45);
    color: var(--color-text);
  }
  .episode-row.heard:not(.current) .ep-title {
    color: rgba(255, 255, 255, 0.6);
  }
  .ep-title {
    font-size: 13px;
    line-height: 1.35;
    font-weight: 500;
  }
  .ep-meta {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.55);
  }
  .persona-tag {
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .persona-tag.persona-curator {
    color: #c9aa6f;
    border-color: rgba(201, 170, 111, 0.4);
    background: rgba(201, 170, 111, 0.08);
  }
  .persona-tag.persona-guide {
    color: #6fb3c9;
    border-color: rgba(111, 179, 201, 0.4);
    background: rgba(111, 179, 201, 0.08);
  }
  .persona-tag.persona-enthusiast {
    color: #6fc99f;
    border-color: rgba(111, 201, 159, 0.4);
    background: rgba(111, 201, 159, 0.08);
  }
  .route-tag {
    font-family: var(--font-mono, monospace);
    color: rgba(255, 255, 255, 0.5);
  }
  .dur-tag {
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.5);
  }
  .heard-tag {
    color: rgba(111, 201, 159, 0.85);
  }

  .tour-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(201, 170, 111, 0.04);
  }
  .tour-eyebrow {
    font-family: var(--font-display, inherit);
    font-size: 11px;
    letter-spacing: 2px;
    color: #c9aa6f;
  }
  .tour-position {
    font-family: var(--font-mono, monospace);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.8);
    margin-right: auto;
  }
  .tour-btn {
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    width: 32px;
    height: 28px;
    min-width: 32px;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }
  .tour-btn:hover:not(:disabled),
  .tour-btn:focus-visible:not(:disabled) {
    border-color: rgba(201, 170, 111, 0.6);
    color: #c9aa6f;
    outline: none;
  }
  .tour-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .tour-btn.tour-stop {
    width: auto;
    padding: 0 10px;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .tour-start {
    width: 100%;
    background: rgba(201, 170, 111, 0.08);
    color: #c9aa6f;
    border: 1px solid rgba(201, 170, 111, 0.4);
    border-radius: 4px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    font-size: 13px;
    font-family: var(--font-display, inherit);
    letter-spacing: 1px;
    cursor: pointer;
  }
  .tour-start:hover,
  .tour-start:focus-visible {
    background: rgba(201, 170, 111, 0.14);
    border-color: rgba(201, 170, 111, 0.7);
    outline: none;
  }
  .tour-start:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .tour-meta {
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.55);
    font-family: var(--font-mono, monospace);
    text-transform: none;
  }
  .ab-tag {
    padding: 1px 5px;
    border-radius: 2px;
    background: rgba(255, 200, 80, 0.1);
    border: 1px solid rgba(255, 200, 80, 0.4);
    color: #ffc850;
    font-weight: 600;
  }

  .provider-switcher {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  .provider-eyebrow {
    font-family: var(--font-display, inherit);
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.45);
    margin-right: 4px;
  }
  .provider-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.7);
    padding: 4px 10px;
    font-size: 11px;
    letter-spacing: 0.4px;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .provider-btn:hover,
  .provider-btn:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }
  .provider-btn.active {
    background: rgba(68, 102, 255, 0.22);
    border-color: rgba(68, 102, 255, 0.6);
    color: #96afff;
  }
  .inventory-empty {
    margin: 0;
    padding: 12px 18px 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.5;
  }
  .inventory-empty.error {
    color: rgba(255, 132, 132, 0.85);
  }

  .origin-disclosure {
    margin-top: auto;
    padding: 12px 18px 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    line-height: 1.5;
    letter-spacing: 0.3px;
    color: rgba(255, 255, 255, 0.5);
  }
  .origin-disclosure a {
    color: rgba(150, 175, 255, 0.8);
    text-decoration: underline;
    text-decoration-color: rgba(150, 175, 255, 0.4);
  }
  .origin-detail {
    color: rgba(255, 255, 255, 0.4);
  }

  .cc-toggle {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.65);
    width: auto;
    padding: 4px 8px;
    min-height: 32px;
    font-size: 11px;
    letter-spacing: 1px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .cc-toggle:hover,
  .cc-toggle:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }
  .cc-toggle.active {
    background: rgba(68, 102, 255, 0.22);
    border-color: rgba(68, 102, 255, 0.6);
    color: #96afff;
  }

  .caption-banner {
    margin-top: 4px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.55);
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.95);
    min-height: 2.4em;
    text-align: center;
    white-space: pre-line;
  }

  .extras {
    margin-top: 6px;
    display: flex;
    justify-content: flex-end;
  }
  .link-btn {
    background: transparent;
    border: none;
    color: rgba(150, 175, 255, 0.7);
    font-size: 11px;
    letter-spacing: 0.5px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 3px;
  }
  .link-btn:hover,
  .link-btn:focus-visible {
    color: rgba(150, 175, 255, 1);
    background: rgba(150, 175, 255, 0.08);
    outline: none;
  }

  .cue-banner {
    margin-top: 4px;
    padding: 10px 12px;
    background: rgba(255, 200, 80, 0.1);
    border: 1px solid rgba(255, 200, 80, 0.4);
    border-radius: 4px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    line-height: 1.45;
    color: #ffd680;
    animation: cue-appear 250ms ease-out;
  }
  .cue-arrow {
    color: #ffc850;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .cue-text {
    flex: 1;
  }
  @keyframes cue-appear {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Tour Phase 2 — global flash highlight used by stage hooks. Defined
     here (scoped via :global so it can target arbitrary route elements).
     Audio-stage-flash gives a brief warm-gold pulse via box-shadow so
     it works regardless of an element's background. */
  :global(.audio-stage-flash) {
    animation: audio-stage-flash 1.8s ease-out;
    position: relative;
    z-index: 1;
  }
  @keyframes audio-stage-flash {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 200, 80, 0.85);
    }
    50% {
      box-shadow: 0 0 24px 10px rgba(255, 200, 80, 0.55);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 200, 80, 0);
    }
  }

  /* Bottom-sheet on narrow viewports (PRD-016 M1 / RFC-019 §7.1). */
  @media (max-width: 799px) {
    .audio-overlay {
      top: auto;
      bottom: 0;
      right: 0;
      left: 0;
      width: 100vw;
      max-height: 70vh;
      border-left: none;
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.35);
    }
  }
</style>
