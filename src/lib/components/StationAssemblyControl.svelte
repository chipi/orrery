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
  import Chip from '$lib/components/Chip.svelte';

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
    <Chip
      kind="action"
      data-testid="assembly-play"
      aria-label={playing ? m.station_assembly_pause_aria() : m.station_assembly_play_aria()}
      title={playing ? m.fly_pause() : m.fly_play()}
      onclick={onTogglePlay}
    >
      {playing ? '⏸' : '▶'}
    </Chip>

    <Chip
      kind="action"
      data-testid="assembly-reset"
      aria-label={m.assembly_reset_aria()}
      title={m.assembly_reset_title()}
      onclick={onReset}
    >
      ⟲
    </Chip>

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

    <Chip
      kind="action"
      aria-label={m.assembly_close()}
      title={m.assembly_close()}
      onclick={onClose}
    >
      ×
    </Chip>
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
    {m.station_assembly_hint({ seconds: Math.round(durationMs / 1000) })}
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
    border: 1px solid var(--color-accent-edge);
    border-radius: 12px;
    padding: 0.9rem 1.2rem 0.7rem;
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: var(--color-text);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.55);
    z-index: 12;
  }

  .assembly-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .scrub {
    flex: 1;
    accent-color: var(--color-accent);
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
    text-decoration: underline dotted var(--color-accent-strong);
    text-underline-offset: 3px;
  }
  .chip-name:hover {
    color: var(--color-text);
    text-decoration: underline solid var(--color-accent-hover);
  }
  .chip-name:focus-visible {
    outline: 2px solid var(--color-focus);
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
