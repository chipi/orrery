<!--
  FdPhaseMarkerLabel — gold trajectory stage marker for the 4 FlightDirector
  narrative stages (injection / cruise / approach / arrival).

  Renders one element: a small diamond tick on the path at the stage's
  tickArc position. Suppressed for INJECTION (LAUNCH ring covers it).

  Polish-wave-2 (2026-06): the leader-line + floating chip "INJECTION /
  CRUISE / APPROACH / ARRIVAL" label was dropped. The FlightDirectorBanner
  already names the current stage at the bottom of the canvas — the
  on-canvas chip was a redundant tether that read as orphaned text after
  the LAUNCH banner faded. Discipline-of-not-doing-things per the
  cinematic creative-direction guide (don't add foreground when the
  planet/ship is the subject). The diamond alone is enough correlation.

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
    /** Uppercase stage name — kept on the element as a data-attr for tests + a11y. */
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
  @keyframes fd-pop {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .diamond {
      animation: none;
    }
  }
</style>
