<!--
  FdPhaseMarkerLabel — gold trajectory stage marker for the 4 FlightDirector
  narrative stages (injection / cruise / approach / arrival).

  Renders a small gold diamond on the path with a label sitting flush
  below it — no leader line, no chip box. The label hangs directly
  under the diamond so the reading is "this dot on the path = that
  word." Pre-polish-wave-2 a leader line tethered a boxed chip to the
  diamond; the line crossed the canvas and the chip read as orphaned
  text after a few seconds. The line + box are gone; only the small
  centered label remains, anchored to the diamond's screen position.

  Slot prop kept for backward compat with callers; unused now.
-->
<script lang="ts">
  interface Props {
    /** Diamond tick position on the path. */
    tickScreenX: number;
    tickScreenY: number;
    /** Hidden when the tick projects outside the canvas. */
    onScreen: boolean;
    /** True for cruise/approach/arrival; false for injection (LAUNCH ring covers it). */
    showTick: boolean;
    /** Uppercase stage name. */
    label: string;
    /** True once arcProgress ≥ this stage's threshold. */
    revealed: boolean;
    /** Unused — retained so call-sites don't churn. */
    slot?: number;
  }
  let { tickScreenX, tickScreenY, onScreen, showTick, label, revealed }: Props = $props();
</script>

{#if onScreen && revealed && showTick}
  <span
    class="diamond"
    data-testid="fd-phase-marker"
    data-fd-phase={label}
    style="left: {tickScreenX}px; top: {tickScreenY}px;"
    aria-hidden="true"
  ></span>
  <span class="label" style="left: {tickScreenX}px; top: {tickScreenY + 10}px;" aria-hidden="true"
    >{label}</span
  >
{/if}

<style>
  .diamond {
    position: absolute;
    width: 5px;
    height: 5px;
    background: #ffc850;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 0 0 2px rgba(255, 200, 80, 0.65);
    z-index: 12;
    pointer-events: none;
    user-select: none;
    animation: fd-pop 320ms ease-out;
  }
  .label {
    position: absolute;
    transform: translate(-50%, 0);
    white-space: nowrap;
    color: rgba(255, 200, 80, 0.92);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    text-shadow:
      0 0 4px rgba(8, 10, 22, 0.95),
      0 0 8px rgba(8, 10, 22, 0.85);
    pointer-events: none;
    user-select: none;
    z-index: 12;
    animation: fd-pop 320ms ease-out;
  }
  @keyframes fd-pop {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .diamond,
    .label {
      animation: none;
    }
  }
</style>
