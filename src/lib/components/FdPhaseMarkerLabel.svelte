<!--
  FdPhaseMarkerLabel — gold trajectory marker for the 5 FlightDirector
  narrative phases (departure / injection / cruise / approach / arrival).

  Unlike PhaseMarkerLabel (cislunar / interplanetary event markers, with
  reveal-state machine + ScienceChip link), this is purely a visual cue
  that the FD banner is announcing this phase. Markers appear as the
  spacecraft's arcProgress crosses each phase threshold and stay visible
  for the rest of the run.

  Styled gold to match the FD banner chrome (same #ffc850 accent) so the
  two read as one announcement system.
-->
<script lang="ts">
  interface Props {
    /** Where to position the marker (CSS px relative to its container). */
    screenX: number;
    screenY: number;
    /** Hidden when the boundary projects outside the canvas. */
    onScreen: boolean;
    /** Uppercase phase name shown in the label chip. */
    label: string;
    /** True once arcProgress ≥ this phase's threshold. */
    revealed: boolean;
  }
  let { screenX, screenY, onScreen, label, revealed }: Props = $props();
</script>

{#if onScreen && revealed}
  <div
    class="fd-marker"
    style="left: {screenX}px; top: {screenY}px;"
    data-testid="fd-phase-marker"
    data-fd-phase={label}
  >
    <span class="dot" aria-hidden="true"></span>
    <span class="label">{label}</span>
  </div>
{/if}

<style>
  .fd-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 12;
    user-select: none;
    animation: fd-pop 320ms ease-out;
  }
  .dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ffc850;
    box-shadow: 0 0 8px rgba(255, 200, 80, 0.7);
  }
  .label {
    position: absolute;
    left: 12px;
    top: -8px;
    white-space: nowrap;
    padding: 2px 6px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  @keyframes fd-pop {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.6);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .fd-marker {
      animation: none;
    }
  }
</style>
