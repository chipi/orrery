<script lang="ts">
  // Audio episode overlay (PRD-016 M1 / RFC-019 §7).
  // Right-panel on desktop ≥800 px; bottom-sheet on mobile <800 px.
  // S5 v0.1 — visual shell + empty state. Transport controls + <audio>
  // wiring light up alongside first content drop (S3 + S6).

  import { audio } from '$lib/audio-state.svelte';

  function fmtTime(sec: number): string {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function onSpeedChange(e: Event) {
    audio.speed = Number((e.currentTarget as HTMLSelectElement).value);
  }
</script>

{#if audio.open}
  <div
    id="audio-overlay"
    class="audio-overlay"
    role="dialog"
    aria-modal="false"
    aria-label="Audio episode player"
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

    {#if audio.currentEpisode}
      <section class="now-playing" aria-label="Now playing">
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
        </div>

        <input
          type="range"
          class="scrubber"
          min="0"
          max={audio.durationSec || 0}
          value={audio.positionSec}
          aria-label="Episode position"
          oninput={(e) => (audio.positionSec = Number((e.currentTarget as HTMLInputElement).value))}
        />

        {#if audio.captionsOn}
          <div class="captions" aria-live="polite">{audio.currentCaption}</div>
        {/if}
      </section>
    {:else}
      <section class="empty-state">
        <p class="empty-headline">No episodes yet.</p>
        <p class="empty-detail">
          The first audio episodes (8 Atmospheric Moves in en-US) land alongside the v0.7 audio
          narration epic. This overlay opens automatically when an episode loads.
        </p>
      </section>
    {/if}
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

  .captions {
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    font-size: 13px;
    line-height: 1.45;
    min-height: 2.5em;
    color: rgba(255, 255, 255, 0.9);
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

  .empty-state {
    padding: 24px 20px 28px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: rgba(255, 255, 255, 0.7);
  }

  .empty-headline {
    margin: 0;
    font-family: var(--font-display, inherit);
    font-size: 14px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.85);
  }

  .empty-detail {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
  }

  /* Bottom-sheet on narrow viewports (PRD-016 M1 / RFC-019 §7.1). */
  @media (max-width: 799px) {
    .audio-overlay {
      top: auto;
      bottom: 0;
      right: 0;
      left: 0;
      width: 100vw;
      max-height: 60vh;
      border-left: none;
      border-top: 1px solid var(--color-border);
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.35);
    }
  }
</style>
