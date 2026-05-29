<!--
  PhaseMarkerLabel — a single trajectory marker (GH #107).

  Renders an HTML overlay at (screenX, screenY) consisting of:
    - A small dot (always visible, ghosted/fresh/visited intensity)
    - An optional text label (visible during the `fresh` reveal window)
    - A ScienceChip (`?` icon) linking to the matching /science section
      when the reveal state has surfaced the label

  This is a presentation-only component. All projection math (commit P2)
  and reveal state machine logic (commit P3) live in their pure modules
  and are passed in as props. The component just renders the result.

  Used by /fly's commit 5 to mark each `flight.events[]` entry on the
  cislunar trajectory. One instance per event. Same component for both
  the 3D view and the 2D canvas overlay — the caller supplies the right
  (screenX, screenY) from `cislunar-screen-projection` per render mode.

  The dot uses CSS transitions on opacity so reveal animation is GPU-
  compositor work, not main-thread JS. The label fades in via
  `intensity > 0.05` per the reveal state machine.

  A11y:
    - The dot is decorative (`aria-hidden`); the label carries the
      semantic event name.
    - When labelVisible is false, the chip is also hidden from the
      tab order (no chip rendered → no focusable element).
    - The dot's title attribute carries the event name so a hover on
      the dot alone (no label) still surfaces the milestone.
-->
<script lang="ts">
  import ScienceChip from './ScienceChip.svelte';
  import { intensityToOpacity } from '$lib/cislunar-marker-reveal';
  import type { ScienceRef } from '$lib/cislunar-events';
  import type { RevealResult } from '$lib/cislunar-marker-reveal';

  interface Props {
    /** Where to position the marker (CSS px relative to its container). */
    screenX: number;
    screenY: number;
    /** Hidden when false — the projection helper sets this based on
     *  camera frustum / canvas bounds. */
    onScreen: boolean;
    /** Event name to show as the reveal label, already i18n-resolved. */
    eventLabel: string;
    /** /science cross-link (P1). null → no chip rendered. */
    scienceRef: ScienceRef | null;
    /** Output of `markerStateFor(event.met_days, currentMet, opts)`. */
    reveal: RevealResult;
    /** Optional intro_sentence for the chip's hover tooltip. */
    scienceLabel?: string;
    /** #107 Step 6g — clickable scrubber. When provided, the dot
     *  becomes a button that calls onJump(metDays) so the sim can jump
     *  to this event's moment. Default no-op = the marker stays a
     *  decorative dot (back-compat). */
    onJump?: () => void;
    /** Event's MET in days, for the aria-label when clickable. */
    eventMetDays?: number;
  }

  let {
    screenX,
    screenY,
    onScreen,
    eventLabel,
    scienceRef,
    reveal,
    scienceLabel,
    onJump,
    eventMetDays,
  }: Props = $props();

  let dotOpacity = $derived(intensityToOpacity(reveal.intensity));
  let clickable = $derived(typeof onJump === 'function');
  let ariaLabel = $derived(
    clickable && typeof eventMetDays === 'number'
      ? `${eventLabel} at MET ${eventMetDays.toFixed(2)} days. Click to jump.`
      : eventLabel,
  );
</script>

{#if onScreen}
  <div
    class="marker"
    class:visited={reveal.state === 'visited'}
    class:fresh={reveal.state === 'fresh'}
    class:ghosted={reveal.state === 'ghosted'}
    style="left: {screenX}px; top: {screenY}px;"
    data-testid="phase-marker"
    data-phase-state={reveal.state}
  >
    {#if clickable}
      <button
        type="button"
        class="dot dot-btn"
        title={eventLabel}
        aria-label={ariaLabel}
        style="opacity: {dotOpacity};"
        data-testid="phase-marker-jump"
        onclick={() => onJump?.()}
      ></button>
    {:else}
      <span class="dot" aria-hidden="true" title={eventLabel} style="opacity: {dotOpacity};"></span>
    {/if}
    {#if reveal.labelVisible}
      <span class="label" data-testid="phase-marker-label">
        {eventLabel}
        {#if scienceRef}
          <ScienceChip tab={scienceRef.tab} section={scienceRef.slug} label={scienceLabel} />
        {/if}
      </span>
    {/if}
  </div>
{/if}

<style>
  .marker {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none; /* dot is decorative; label/chip re-enable below */
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.95);
    z-index: 12; /* above trajectory tube, below CAPCOM panel */
    user-select: none;
  }
  .dot {
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ecdc4;
    box-shadow: 0 0 6px rgba(78, 205, 196, 0.55);
    transition: opacity 220ms ease-out;
  }
  .dot-btn {
    /* Reset button styles to look like the decorative dot but stay
       clickable + keyboard-focusable for the scrubber UX (#107 Step 6g). */
    border: 0;
    padding: 0;
    cursor: pointer;
    pointer-events: auto;
  }
  .dot-btn:focus-visible {
    outline: 2px solid rgba(78, 205, 196, 0.95);
    outline-offset: 3px;
  }
  .dot-btn:hover {
    transform: scale(1.4);
    box-shadow: 0 0 10px rgba(78, 205, 196, 0.85);
  }
  .marker.fresh .dot {
    /* Brief halo pulse during the fresh-reveal window. */
    box-shadow: 0 0 12px rgba(78, 205, 196, 0.95);
  }
  .marker.visited .dot {
    background: rgba(78, 205, 196, 0.7);
    box-shadow: none;
  }
  .label {
    pointer-events: auto;
    position: absolute;
    left: 10px;
    top: -7px;
    white-space: nowrap;
    padding: 2px 6px;
    background: rgba(4, 4, 12, 0.6);
    border: 1px solid rgba(78, 205, 196, 0.45);
    border-radius: 3px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    animation: label-in 240ms ease-out forwards;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }
  @keyframes label-in {
    from {
      opacity: 0;
      transform: translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Respect prefers-reduced-motion (ADR-025): no animation, just show
     the final state immediately. */
  @media (prefers-reduced-motion: reduce) {
    .label {
      animation: none;
      opacity: 1;
    }
    .dot {
      transition: none;
    }
  }
</style>
