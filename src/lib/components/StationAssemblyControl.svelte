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
  import * as m from '$lib/paraglide/messages';

  type Props = {
    playing: boolean;
    /** Playback progress 0..1 — bound, parent owns the truth. */
    progress: number;
    startEpoch: number;
    endEpoch: number;
    /** Wall-clock duration of a full play-through. */
    durationMs: number;
    latestChip: {
      name: string;
      launcher: string;
      date: string;
      /**
       * Pickable mesh id (module or visitor) the chip click should open.
       * Null for synthetic phases with no clickable target — e.g. /iss
       * truss-segment + iROSA roll-out chips, which describe an STS or
       * EVA install date but don't map to a single panel.
       */
      pickableId: string | null;
    } | null;
    onTogglePlay: () => void;
    onScrub: (next: number) => void;
    onReset: () => void;
    onClose: () => void;
    onChipClick: (pickableId: string) => void;
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
    onChipClick,
  }: Props = $props();

  const nowEpoch = $derived(startEpoch + progress * (endEpoch - startEpoch));
  const nowDate = $derived(fmtDate(nowEpoch));
</script>

<div class="assembly-overlay" data-testid="station-assembly">
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
      aria-label={m.assembly_reset_aria()}
      title={m.assembly_reset_title()}
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
      aria-label={m.assembly_scrubber_aria()}
      oninput={(e) => onScrub(Number((e.target as HTMLInputElement).value))}
    />

    <span class="date" data-testid="assembly-date">{nowDate}</span>

    <button
      type="button"
      class="assembly-close"
      aria-label={m.assembly_close()}
      title={m.assembly_close()}
      onclick={onClose}
    >
      ×
    </button>
  </div>

  {#if latestChip}
    <p class="chip" data-testid="assembly-chip">
      <span aria-hidden="true">🚀</span>
      {#if latestChip.pickableId}
        <button
          type="button"
          class="chip-name"
          data-testid="assembly-chip-name"
          title={m.assembly_open_module_title()}
          onclick={() => onChipClick(latestChip!.pickableId!)}
        >
          {latestChip.name}
        </button>
      {:else}
        <!-- Truss / iROSA phases have no panel target — render the chip
             name as plain text, no click affordance. -->
        <span class="chip-name chip-name-static" data-testid="assembly-chip-name">
          {latestChip.name}
        </span>
      {/if}
      <span class="sep">·</span>
      <span>{latestChip.launcher}</span>
      <span class="sep">·</span>
      <time>{latestChip.date}</time>
    </p>
  {:else}
    <p class="chip empty" data-testid="assembly-chip">
      <span aria-hidden="true">·</span>
      <span>{m.assembly_waiting_first_launch()}</span>
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #cfe2ff;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
    z-index: 12;
  }

  .assembly-close {
    width: 1.8rem;
    height: 1.8rem;
    border: 1px solid rgba(120, 180, 255, 0.35);
    background: rgba(20, 28, 40, 0.6);
    color: #cfe2ff;
    font-size: 1.05rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 50%;
    flex: none;
    display: grid;
    place-items: center;
  }
  .assembly-close:hover {
    background: rgba(120, 180, 255, 0.22);
    color: #fff;
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
  .chip-name {
    color: #fff;
    background: transparent;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline dotted rgba(120, 180, 255, 0.6);
    text-underline-offset: 3px;
  }
  .chip-name:hover {
    color: #cfe2ff;
    text-decoration: underline solid rgba(160, 200, 255, 0.9);
  }
  .chip-name:focus-visible {
    outline: 2px solid #6fb3ff;
    outline-offset: 2px;
    border-radius: 2px;
  }
  .chip-name-static {
    /* Truss / iROSA phases — non-clickable variant, no underline / cursor. */
    cursor: default;
    text-decoration: none;
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
