<script lang="ts">
  /**
   * Assembly-sequence playback control for /tiangong + /iss (Shape B).
   *
   * The control exposes:
   *   - play / pause (auto-loop)
   *   - a scrub-bar (0 → 1, mapped to nowEpoch ∈ [startEpoch, endEpoch])
   *   - a reset button (jump to t=0)
   *   - a current-date readout
   *   - a "🚀 launched on <launcher> · <date>" chip for whatever module
   *     most recently entered the timeline.
   *
   * The component is purely a controller — the actual mesh tweening
   * happens in the parent's Three.js animate() loop via
   * applyAssembly(). The parent passes us:
   *   - durationMs (how long the full playback takes wall-clock)
   *   - startEpoch / endEpoch (the range of launch dates in this station)
   *   - bound playing + progress
   *   - latestChip (derived in the parent from currentChip())
   */
  import { fmtDate } from '$lib/station-assembly-anim';

  type Props = {
    playing: boolean;
    /** Playback progress 0..1 — bound, parent owns the truth. */
    progress: number;
    startEpoch: number;
    endEpoch: number;
    /** Wall-clock duration of a full play-through. */
    durationMs: number;
    latestChip: { name: string; launcher: string; date: string } | null;
    onTogglePlay: () => void;
    onScrub: (next: number) => void;
    onReset: () => void;
    onClose: () => void;
  };

  let {
    playing,
    progress,
    startEpoch,
    endEpoch,
    durationMs,
    latestChip,
    onTogglePlay,
    onScrub,
    onReset,
    onClose,
  }: Props = $props();

  const nowEpoch = $derived(startEpoch + progress * (endEpoch - startEpoch));
  const nowDate = $derived(fmtDate(nowEpoch));
</script>

<div class="assembly-overlay" data-testid="station-assembly">
  <button
    type="button"
    class="assembly-close"
    aria-label="Close assembly playback"
    title="Close assembly playback"
    onclick={onClose}
  >
    ×
  </button>

  <div class="assembly-row">
    <button
      type="button"
      class="ctrl"
      data-testid="assembly-play"
      aria-label={playing ? 'Pause assembly' : 'Play assembly'}
      title={playing ? 'Pause' : 'Play'}
      onclick={onTogglePlay}
    >
      {playing ? '⏸' : '▶'}
    </button>

    <button
      type="button"
      class="ctrl"
      data-testid="assembly-reset"
      aria-label="Reset assembly to the first launch"
      title="Reset to start"
      onclick={onReset}
    >
      ⟲
    </button>

    <input
      class="scrub"
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={progress}
      data-testid="assembly-scrub"
      aria-label="Assembly date scrubber"
      oninput={(e) => onScrub(Number((e.target as HTMLInputElement).value))}
    />

    <span class="date" data-testid="assembly-date">{nowDate}</span>
  </div>

  {#if latestChip}
    <p class="chip" data-testid="assembly-chip">
      <span aria-hidden="true">🚀</span>
      <strong>{latestChip.name}</strong>
      <span class="sep">·</span>
      <span>{latestChip.launcher}</span>
      <span class="sep">·</span>
      <time>{latestChip.date}</time>
    </p>
  {:else}
    <p class="chip empty" data-testid="assembly-chip">
      <span aria-hidden="true">·</span>
      <span>Waiting for the first launch…</span>
    </p>
  {/if}

  <p class="hint" aria-live="polite">
    Playback {Math.round(durationMs / 1000)}s · scrub to any date · click pause to inspect
  </p>
</div>

<style>
  .assembly-overlay {
    position: absolute;
    left: 50%;
    bottom: 5.5rem;
    transform: translateX(-50%);
    width: min(92vw, 640px);
    background: rgba(8, 12, 18, 0.92);
    border: 1px solid rgba(120, 180, 255, 0.35);
    border-radius: 12px;
    padding: 0.9rem 1.2rem 0.7rem;
    font-family: var(--font-stack, system-ui), sans-serif;
    color: #cfe2ff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
    z-index: 12;
  }

  .assembly-close {
    position: absolute;
    top: 0.3rem;
    right: 0.4rem;
    width: 1.6rem;
    height: 1.6rem;
    border: none;
    background: transparent;
    color: #cfe2ff;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 50%;
  }
  .assembly-close:hover {
    background: rgba(120, 180, 255, 0.18);
  }

  .assembly-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .ctrl {
    width: 2rem;
    height: 2rem;
    border: 1px solid rgba(120, 180, 255, 0.45);
    background: rgba(20, 28, 40, 0.6);
    color: #cfe2ff;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1;
    display: grid;
    place-items: center;
    flex: none;
  }
  .ctrl:hover {
    background: rgba(120, 180, 255, 0.2);
  }

  .scrub {
    flex: 1;
    accent-color: #6fb3ff;
    height: 1.4rem;
  }

  .date {
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
    min-width: 6.2rem;
    text-align: right;
    color: #ffd57a;
  }

  .chip {
    margin: 0.55rem 0 0;
    font-size: 0.86rem;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
    line-height: 1.3;
  }
  .chip strong {
    color: #fff;
  }
  .chip .sep {
    opacity: 0.55;
  }
  .chip.empty {
    opacity: 0.6;
  }

  .hint {
    margin: 0.35rem 0 0;
    font-size: 0.74rem;
    opacity: 0.6;
    line-height: 1.25;
  }
</style>
