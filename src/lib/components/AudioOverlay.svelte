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
  import {
    CURATOR_FULL_TOUR,
    CURATOR_EXTENDED_TOUR,
    stagesForEpisode,
    type AudioStage,
  } from '$lib/audio-tour';
  import { tourElapsedSec, tourRemainingSec, tourTotalSec } from '$lib/audio-tour-progress';
  import { fmtTime } from '$lib/audio-format';
  import { readTourCookie, clearTourCookie, type TourResumeState } from '$lib/audio-tour-cookie';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

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
  // Drag / zoom / click visual indicator — small toast shown while the
  // tour is manipulating the scene on the user's behalf, so the motion
  // reads as "the tour is doing this" not "what just happened to me?".
  let manualActionLabel = $state<string | null>(null);
  let manualActionTimer = $state<number | null>(null);
  // Captures focus origin so closing the overlay restores focus to the
  // element that opened it (PRD-016 M14 — desktop focus discipline).
  let focusReturnTo: HTMLElement | null = null;

  // Voice picker (Google ↔ ElevenLabs A/B switcher) intentionally
  // unwired from the UI (Marko 2026-06-06). ElevenLabs is the preferred
  // provider per PROVIDER_PRIORITY in audio-registry. PROVIDER_LABEL +
  // switchToProvider are retained for re-wiring without re-authoring;
  // marked as deliberately-unused via the void references at script end.
  const PROVIDER_LABEL: Record<string, string> = {
    google: 'Google',
    elevenlabs: 'ElevenLabs',
    openai: 'OpenAI',
    azure: 'Azure',
    'coqui-local': 'Coqui',
  };

  onMount(() => {
    void audioRegistry.load();
    // Test-only hook (RFC-019 §12 / pattern parallel to `window.__flyArcHash`
    // — ADR-056). Lets the audio-stage e2e suite drive `audio.positionSec`
    // without depending on real <audio> playback (Playwright denies
    // autoplay without user gesture). Read-only access is fine; the
    // setter is the surface specs need.
    if (browser) {
      (window as Window & { __orreryAudio?: unknown }).__orreryAudio = {
        state: audio,
        registry: audioRegistry,
        setPosition: (sec: number) => {
          audio.positionSec = sec;
        },
      };
    }
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
  // Track the last episode id we navigated FOR so we can tell tour-
  // advance navigation apart from a user link click that we have to
  // revert. The toast only fires on the latter — silent on the former.
  let lastAutoNavEpisodeId: string | null = null;
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
    if (have === want) {
      lastAutoNavEpisodeId = ep.id;
      return;
    }
    const isUserBouncedAway = lastAutoNavEpisodeId === ep.id;
    void goto(target, {
      replaceState: false,
      noScroll: false,
      keepFocus: true,
    });
    if (isUserBouncedAway) {
      showManualActionIndicator(m.audio_action_tour_driving(), 3500);
    }
    lastAutoNavEpisodeId = ep.id;
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

  function showManualActionIndicator(label: string, ms: number): void {
    if (manualActionTimer !== null) window.clearTimeout(manualActionTimer);
    manualActionLabel = label;
    manualActionTimer = window.setTimeout(() => {
      manualActionLabel = null;
      manualActionTimer = null;
    }, ms);
  }

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
        if (typeof el.click === 'function') {
          el.click();
          // Mirror the cue + drag/zoom pattern: tell the user the tour
          // just clicked something on their behalf. Aria-label of the
          // target makes a sensible default when available.
          const label = el.getAttribute('aria-label')?.trim();
          showManualActionIndicator(
            label ? m.audio_action_opened_named({ name: label }) : m.audio_action_opened_generic(),
            2200,
          );
        }
        break;
      case 'drag':
      case 'zoom': {
        // Dispatch a CustomEvent the route listens for. Each canvas-
        // driven route wires its own listener and translates the event
        // into camera motion (see /explore +page.svelte). Keeping the
        // executor camera-agnostic means /moon, /mars, /fly, /iss,
        // /tiangong, /earth can all wire the same events without
        // teaching AudioOverlay about any specific scene controller.
        const durationMs = stage.duration_ms ?? 1500;
        el.dispatchEvent(
          new CustomEvent(`audio-stage-${stage.action}`, {
            detail: { durationMs, ...(stage.params ?? {}) },
            bubbles: true,
          }),
        );
        // Visual indicator so the listener can relate the motion to
        // the tour ("Rotating view…" / "Zooming in…") instead of
        // wondering why the scene just moved on its own.
        showManualActionIndicator(
          stage.action === 'drag' ? m.audio_action_rotating() : m.audio_action_zooming(),
          durationMs + 400,
        );
        break;
      }
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
    if (!audioEl) return;
    audio.positionSec = audioEl.currentTime;
    // ADR-075 §write triggers — throttled tour-resume persistence. No-op
    // when the tour isn't active (single-episode plays don't persist).
    if (audio.tourActive) audio.persistTourThrottled();
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

  async function startTourFromSequence(sequence: string[]): Promise<void> {
    // Filter the canonical sequence down to episodes actually present in
    // the registry — defensive against partial generation.
    const available = sequence.filter((id) => audioRegistry.byId(id));
    if (available.length === 0) return;
    audio.startTour(available);
    const first = audioRegistry.byId(available[0]);
    if (first) await loadAndPlay(first);
  }
  async function startTour(): Promise<void> {
    await startTourFromSequence(CURATOR_FULL_TOUR);
  }
  async function startExtendedTour(): Promise<void> {
    await startTourFromSequence(CURATOR_EXTENDED_TOUR);
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

  // Tour progress (PRD-016 §S7 / RFC-019 §11.1) — pure derived state from
  // registry + tourSequence + positionSec. Visible only while tourActive.
  const tourLookup = (id: string): number | undefined => audioRegistry.byId(id)?.durationSec;
  const tourTotal = $derived(tourTotalSec(audio.tourSequence, tourLookup));
  const tourElapsed = $derived(
    tourElapsedSec(audio.tourSequence, audio.tourIndex, audio.positionSec, tourLookup),
  );
  const tourRemaining = $derived(
    tourRemainingSec(audio.tourSequence, audio.tourIndex, audio.positionSec, tourLookup),
  );
  // Tour totals routinely exceed an hour (~66 min for the en-US 21-ep tour),
  // so format with h:mm:ss; elapsed + remaining follow the same axis so the
  // numbers line up visually.
  const tourUseHours = $derived(tourTotal >= 3600);

  // Tour resume offer (ADR-075 / PRD-016 §S9). Read the cookie on overlay
  // open; surface a one-click [Resume] banner if the saved episode still
  // exists in the registry. Never autoplays — the click IS the gesture.
  let resumeOffer = $state<TourResumeState | null>(null);
  let resumeOfferTitle = $state<string>('');
  $effect(() => {
    if (!audio.open) {
      resumeOffer = null;
      return;
    }
    if (!audioRegistry.loaded) return;
    if (untrack(() => audio.tourActive)) return; // active tour wins
    const cookie = readTourCookie();
    if (!cookie) return;
    const ep = audioRegistry.byId(cookie.ep);
    if (!ep) {
      // Saved episode no longer exists (registry pruned, locale changed,
      // mis-saved cookie). Clear silently — no user-visible error.
      clearTourCookie();
      return;
    }
    resumeOffer = cookie;
    resumeOfferTitle = ep.title;
  });

  async function acceptResume(): Promise<void> {
    const offer = resumeOffer;
    if (!offer) return;
    const ep = audioRegistry.byId(offer.ep);
    if (!ep) {
      clearTourCookie();
      resumeOffer = null;
      return;
    }
    // Filter the canonical sequence down to what's actually in the
    // registry, then locate the saved episode by id — using ep id is
    // more durable than trusting idx across registry changes.
    const available = CURATOR_FULL_TOUR.filter((id) => audioRegistry.byId(id));
    const realIdx = available.indexOf(offer.ep);
    if (realIdx < 0) {
      clearTourCookie();
      resumeOffer = null;
      return;
    }
    audio.resumeTour(available, realIdx);
    audio.compact = offer.cmp === 1;
    resumeOffer = null;
    await loadAndPlay(ep);
    // The episode just started at position 0; seek to the saved point.
    // Use a tick to let the <audio> element mount + load metadata.
    await tick();
    if (audioEl && Number.isFinite(offer.pos) && offer.pos > 0) {
      try {
        audioEl.currentTime = offer.pos;
        audio.positionSec = offer.pos;
      } catch {
        // Metadata not ready yet — the existing pause-on-close effect
        // will re-seek on next play.
      }
    }
  }

  function dismissResume(): void {
    clearTourCookie();
    resumeOffer = null;
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

  // Voice picker code retained — see PROVIDER_LABEL block at top of
  // script. These `void` references silence TS unused-warning without
  // deleting the underlying provider-switch infrastructure.
  void PROVIDER_LABEL;
  void switchToProvider;
</script>

{#if audio.open}
  <div
    bind:this={overlayRoot}
    id="audio-overlay"
    class="audio-overlay"
    class:compact={audio.compact}
    role="dialog"
    aria-modal="false"
    aria-label={m.audio_overlay_aria_label()}
    tabindex="-1"
    onkeydown={onOverlayKeydown}
  >
    <header class="overlay-header">
      <div class="header-top">
        <span class="overlay-eyebrow">AUDIO</span>
        <div class="header-actions">
          <button
            type="button"
            class="header-btn minimize-btn"
            aria-label={m.audio_minimize_aria()}
            title={m.audio_minimize_title()}
            onclick={() => audio.toggleCompact()}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <line x1="3" y1="13" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" />
            </svg>
          </button>
          <button
            type="button"
            class="header-btn close-btn"
            aria-label={m.audio_close_aria()}
            onclick={() => audio.closeOverlay()}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" />
              <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.6" />
            </svg>
          </button>
        </div>
      </div>
      <h2 class="overlay-title">
        {audio.currentEpisode?.title ?? m.audio_overlay_title_default()}
      </h2>
    </header>

    {#if resumeOffer && !audio.compact}
      <section class="resume-offer" aria-label={m.audio_resume_offer_aria()}>
        <span class="resume-text">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html m.audio_resume_prompt({
            title: `<strong>${resumeOfferTitle}</strong>`,
            pos: `<span class="resume-pos">${fmtTime(resumeOffer.pos)}</span>`,
          })}
        </span>
        <span class="resume-actions">
          <button type="button" class="resume-btn resume-accept" onclick={acceptResume}>
            {m.audio_resume_button()}
          </button>
          <button
            type="button"
            class="resume-btn resume-dismiss"
            aria-label={m.audio_resume_dismiss_aria()}
            onclick={dismissResume}
          >
            ×
          </button>
        </span>
      </section>
    {/if}

    {#if audio.compact && audio.currentEpisode}
      <section class="compact-bar" aria-label={m.audio_compact_bar_aria()}>
        <span class="persona-dot persona-{audio.currentEpisode.persona}" aria-hidden="true"></span>
        <span class="compact-title" title={audio.currentEpisode.title}>
          {audio.currentEpisode.title}
        </span>
        {#if audio.tourActive}
          <span class="compact-position" aria-label={m.audio_tour_position_aria()}>
            {audio.tourIndex + 1}/{audio.tourSequence.length}
          </span>
        {/if}
        <span class="compact-clock" aria-label={m.audio_compact_clock_aria()}>
          {fmtTime(audio.tourActive ? tourElapsed : audio.positionSec, {
            withHours: audio.tourActive && tourUseHours,
          })}
        </span>
        <button
          type="button"
          class="compact-btn"
          aria-label={audio.playing ? 'Pause' : 'Play'}
          onclick={() => audio.togglePlay()}
        >
          {audio.playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          class="compact-btn"
          aria-label={m.audio_compact_expand_aria()}
          title={m.audio_compact_expand_title()}
          onclick={() => audio.toggleCompact()}
        >
          ↑
        </button>
        {#if audio.tourActive}
          <button
            type="button"
            class="compact-btn compact-stop"
            aria-label={m.audio_compact_stop_aria()}
            onclick={() => audio.stopTour()}
          >
            ×
          </button>
        {/if}
      </section>
    {/if}

    <section class="tour-bar" aria-label={m.audio_tour_bar_aria()}>
      {#if audio.tourActive}
        <span class="tour-eyebrow">TOUR</span>
        <span class="tour-position">{audio.tourIndex + 1}/{audio.tourSequence.length}</span>
        <span
          class="tour-clock"
          aria-label={m.audio_tour_progress_aria({
            elapsed: fmtTime(tourElapsed, { withHours: tourUseHours }),
            total: fmtTime(tourTotal, { withHours: tourUseHours }),
            remaining: fmtTime(tourRemaining, { withHours: tourUseHours }),
          })}
        >
          {fmtTime(tourElapsed, { withHours: tourUseHours })} / {fmtTime(tourTotal, {
            withHours: tourUseHours,
          })}
        </span>
        <button
          type="button"
          class="tour-btn"
          aria-label={m.audio_tour_prev_aria()}
          onclick={tourPrev}
          disabled={audio.tourIndex === 0}
        >
          ‹
        </button>
        <button
          type="button"
          class="tour-btn tour-stop"
          aria-label={m.audio_compact_stop_aria()}
          onclick={() => audio.stopTour()}
        >
          stop
        </button>
        <button
          type="button"
          class="tour-btn"
          aria-label={m.audio_tour_next_aria()}
          onclick={tourNext}
          disabled={audio.tourIndex >= audio.tourSequence.length - 1}
        >
          ›
        </button>
        <p class="tour-note">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html m.audio_tour_note({
            stop: `<strong>${m.audio_tour_note_stop()}</strong>`,
          })}
        </p>
      {:else}
        <!-- Two tour launchers side-by-side on wide viewports, stacked
             on narrow ones (mobile gets the cramped 320-400 px width). -->
        <div class="tour-launchers">
          <button
            type="button"
            class="tour-start"
            onclick={startTour}
            disabled={!audioRegistry.loaded}
          >
            {m.audio_tour_start_curator()}
            <span class="tour-meta">
              {m.audio_tour_meta_standard({ count: CURATOR_FULL_TOUR.length })}
            </span>
          </button>
          <button
            type="button"
            class="tour-start tour-start-extended"
            onclick={startExtendedTour}
            disabled={!audioRegistry.loaded}
          >
            {m.audio_tour_start_extended()}
            <span class="tour-meta">
              {m.audio_tour_meta_extended({ count: CURATOR_EXTENDED_TOUR.length })}
            </span>
          </button>
        </div>
      {/if}
    </section>

    {#if audio.currentEpisode}
      <section class="now-playing" aria-label={m.audio_now_playing_aria()}>
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

        <!-- Voice picker (Google ↔ ElevenLabs A/B switcher) intentionally
             unwired from the UI. ElevenLabs is the preferred provider per
             PROVIDER_PRIORITY in audio-registry; Google variants still
             load when ElevenLabs is missing. `switchToProvider`,
             `PROVIDER_LABEL`, and audio store's `switchVariant` retained
             so the picker can be re-added by uncommenting prior markup
             once we decide to expose per-episode voice choice again. -->

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
          <span class="time" aria-label={m.audio_current_time_aria()}>
            {fmtTime(audio.positionSec)} / {fmtTime(audio.durationSec)}
          </span>
          <label class="speed">
            <span class="sr-only">{m.audio_speed_label()}</span>
            <select aria-label={m.audio_speed_aria()} value={audio.speed} onchange={onSpeedChange}>
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
            title={m.audio_captions_title()}
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
      <span>Voices · ElevenLabs · Scripts · drafted by Claude (Anthropic)</span>
      <span class="origin-detail"
        >Per-episode attribution on <a href="{base}/credits">/credits</a> ·
        <a href="{base}/library/episodes">Read transcripts</a></span
      >
    </footer>
  </div>
{/if}

<!-- Floating banner stack — positioned bottom-center of the viewport so
     the tour's narration overlays (cue / caption) and "the tour is
     doing this" indicators (drag / zoom / click) stay visible whether
     the overlay is expanded, compact, or closed. Cue + manual-action
     share an aria-live channel so screen readers don't double-read.
     Captions get their own region so a SR user can opt out of cues
     while keeping captions for accessibility. -->
{#if activeCue || manualActionLabel || (audio.captionsOn && audio.currentCaption)}
  <div class="tour-banners" aria-hidden={false}>
    {#if activeCue}
      <div class="cue-banner" role="status" aria-live="polite" aria-atomic="true">
        <span class="cue-arrow" aria-hidden="true">→</span>
        <span class="cue-text">{activeCue}</span>
      </div>
    {/if}

    {#if manualActionLabel}
      <div class="manual-action" role="status" aria-live={activeCue ? 'off' : 'polite'}>
        {manualActionLabel}
      </div>
    {/if}

    {#if audio.captionsOn && audio.currentCaption}
      <div
        class="caption-banner"
        role="region"
        aria-label="Captions"
        aria-live={activeCue || manualActionLabel ? 'off' : 'polite'}
        aria-atomic="true"
      >
        {audio.currentCaption}
      </div>
    {/if}
  </div>
{/if}

<style>
  .audio-overlay {
    position: fixed;
    top: var(--nav-height);
    right: 0;
    width: min(var(--panel-width, 400px), 100vw);
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
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px 10px;
    border-bottom: 1px solid var(--color-border);
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
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

  .header-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .header-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.65);
    cursor: pointer;
    flex-shrink: 0;
  }
  .header-btn:hover,
  .header-btn:focus-visible {
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
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(201, 170, 111, 0.04);
  }
  .tour-eyebrow {
    font-family: var(--font-display, inherit);
    font-size: 11px;
    letter-spacing: 2px;
    color: #c9aa6f;
    flex-shrink: 0;
  }
  .tour-position {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.8);
    flex-shrink: 0;
  }
  .tour-clock {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.65);
    margin-right: auto;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .tour-note {
    flex-basis: 100%;
    margin: 6px 0 0;
    font-size: 10px;
    line-height: 1.4;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.45);
  }
  .tour-note :global(strong) {
    color: rgba(201, 170, 111, 0.85);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
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
  .tour-launchers {
    display: flex;
    flex-direction: row;
    gap: 8px;
    width: 100%;
  }
  .tour-launchers .tour-start {
    flex: 1 1 0;
  }
  @media (max-width: 520px) {
    .tour-launchers {
      flex-direction: column;
    }
  }
  .tour-start-extended {
    background: rgba(78, 205, 196, 0.06);
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.35);
  }
  .tour-start-extended:hover,
  .tour-start-extended:focus-visible {
    background: rgba(78, 205, 196, 0.12);
    border-color: rgba(78, 205, 196, 0.6);
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

  /* Compact tour mode (PRD-016 §S8 / RFC-019 §11.2). Collapses the
     overlay to a thin strip pinned directly under the nav (same top
     anchor as the expanded form), so it never floats orphaned at the
     viewport edge. Desktop: panel width, slim bar. Mobile: full-width. */
  .audio-overlay.compact {
    top: var(--nav-height);
    right: 0;
    bottom: auto;
    left: auto;
    width: min(var(--panel-width, 400px), 100vw);
    max-width: 100vw;
    max-height: none;
    height: auto;
    border-left: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    overflow: visible;
  }
  .audio-overlay.compact .overlay-header,
  .audio-overlay.compact .tour-bar,
  .audio-overlay.compact .now-playing,
  .audio-overlay.compact .inventory,
  .audio-overlay.compact .origin-disclosure {
    display: none;
  }
  /* Banner positioning is now globally bottom-center via .tour-banners
     (see below) — no overlay-state-specific overrides needed. */
  @media (max-width: 799px) {
    .audio-overlay.compact {
      top: var(--nav-height);
      bottom: auto;
      right: 0;
      left: 0;
      width: 100vw;
      max-width: 100vw;
      border-left: none;
      border-right: none;
    }
  }

  .compact-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    min-height: 64px;
    background: var(--color-nav-bg);
  }
  @media (max-width: 799px) {
    .compact-bar {
      min-height: 56px;
      padding: 10px 14px;
    }
  }
  .compact-bar .persona-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.35);
  }
  .compact-bar .persona-dot.persona-curator {
    background: #c9aa6f;
  }
  .compact-bar .persona-dot.persona-guide {
    background: #6fb6c9;
  }
  .compact-bar .persona-dot.persona-enthusiast {
    background: #c96fa0;
  }
  .compact-title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.2;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .compact-position {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
  }
  .compact-clock {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.6);
    flex-shrink: 0;
  }
  .compact-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .compact-btn:hover,
  .compact-btn:focus-visible {
    border-color: rgba(201, 170, 111, 0.6);
    color: #c9aa6f;
    outline: none;
  }
  .compact-btn.compact-stop {
    border-color: rgba(255, 255, 255, 0.25);
  }

  /* Floating banner stack — bottom-center of the viewport. Always
     above other UI so the tour overlays stay legible in expanded /
     compact / closed states alike. */
  :global(.tour-banners) {
    position: fixed;
    left: 50%;
    bottom: max(20px, env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 60;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    width: min(560px, calc(100vw - 32px));
    pointer-events: none;
  }
  :global(.tour-banners > *) {
    pointer-events: auto;
    width: 100%;
    margin: 0;
  }

  /* Manual-action indicator (drag / zoom / click while the tour is
     driving). Small pill, dim background, monospace — distinct from
     cue + caption banners so the listener reads "the tour is doing X"
     rather than "the narrator just said X". */
  :global(.tour-banners .manual-action) {
    padding: 6px 12px;
    background: rgba(78, 205, 196, 0.12);
    border: 1px solid rgba(78, 205, 196, 0.45);
    border-radius: 4px;
    color: rgba(78, 205, 196, 0.95);
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    letter-spacing: 1px;
    text-align: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* Resume-tour offer banner (ADR-075 / PRD-016 §S9). Sits just under
     the header when a valid cookie is read and no live tour is running. */
  .resume-offer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(201, 170, 111, 0.08);
    border-bottom: 1px solid rgba(201, 170, 111, 0.3);
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
  }
  .resume-text {
    flex: 1;
    min-width: 0;
    line-height: 1.3;
  }
  .resume-text :global(strong) {
    color: #c9aa6f;
    font-weight: 500;
  }
  .resume-pos {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.65);
  }
  .resume-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .resume-btn {
    background: transparent;
    border: 1px solid rgba(201, 170, 111, 0.45);
    border-radius: 3px;
    color: #c9aa6f;
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
  }
  .resume-btn.resume-dismiss {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;
  }
  .resume-btn:hover,
  .resume-btn:focus-visible {
    border-color: rgba(201, 170, 111, 0.8);
    outline: none;
  }
</style>
