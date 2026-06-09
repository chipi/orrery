<!--
  FdPhaseMarkerLabel — gold trajectory stage marker for the 4 FlightDirector
  narrative stages (injection / cruise / approach / arrival).

  Renders per stage:
    - a small diamond tick on the path at the stage's tickArc position
      (suppressed for INJECTION because LAUNCH ring is its anchor)
    - a labelled chip floating directly above the diamond with a thin
      vertical leader line. Per-slot horizontal stagger keeps adjacent
      stages from piling chips when their tickArcs project close
      together in screen space.

  The chip-above-diamond layout is intentional: any Sun-aware push
  pulls the chip along the sun-to-diamond axis, which makes the leader
  visually "point at the Sun" even when it terminates at the diamond.
  A purely vertical leader avoids that reading.

  Styled gold to match the FD banner chrome (same #ffc850 accent) so the
  two read as one announcement system.
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
    /** Uppercase stage name shown in the chip. */
    label: string;
    /** True once arcProgress ≥ this stage's threshold. */
    revealed: boolean;
    /** 0-based slot — drives horizontal chip stagger so adjacent
     *  stages with close-projected ticks don't pile chips on top of
     *  each other. */
    slot?: number;
  }
  let {
    tickScreenX,
    tickScreenY,
    onScreen,
    showTick,
    label,
    revealed,
    slot = 0,
  }: Props = $props();

  const VERT_OFFSET = 32;
  const HORZ_STAGGER = 56;

  let chipPos = $derived({
    x: tickScreenX + (slot - 1.5) * HORZ_STAGGER,
    y: tickScreenY - VERT_OFFSET,
  });

  let leader = $derived.by(() => {
    const dx = chipPos.x - tickScreenX;
    const dy = chipPos.y - tickScreenY;
    return {
      len: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
    };
  });
</script>

{#if onScreen && revealed}
  <div class="fd-marker" data-testid="fd-phase-marker" data-fd-phase={label}>
    {#if showTick}
      <span class="diamond" style="left: {tickScreenX}px; top: {tickScreenY}px;" aria-hidden="true"
      ></span>
    {/if}
    <!-- Leader always renders: even when the diamond is suppressed
         (INJECTION + ARRIVAL-EARTH, both anchored by the LAUNCH /
         RETURN rings at Earth), the leader still ties the chip to
         the underlying anchor position so the labels don't read as
         "floating alone" in screen space. -->
    <span
      class="leader"
      style="left: {tickScreenX}px; top: {tickScreenY}px; width: {leader.len}px; transform: rotate({leader.angle}rad);"
      aria-hidden="true"
    ></span>
    <span class="chip" style="left: {chipPos.x}px; top: {chipPos.y}px;">{label}</span>
  </div>
{/if}

<style>
  .fd-marker {
    position: absolute;
    inset: 0;
    pointer-events: none;
    user-select: none;
    animation: fd-pop 320ms ease-out;
  }
  .diamond {
    position: absolute;
    width: 5px;
    height: 5px;
    background: #ffc850;
    transform: translate(-50%, -50%) rotate(45deg);
    box-shadow: 0 0 2px rgba(255, 200, 80, 0.65);
    z-index: 12;
  }
  .leader {
    position: absolute;
    height: 1px;
    background: rgba(255, 200, 80, 0.55);
    transform-origin: 0 50%;
    z-index: 11;
  }
  .chip {
    position: absolute;
    transform: translate(-50%, -50%);
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
    z-index: 13;
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
    .fd-marker {
      animation: none;
    }
  }
</style>
