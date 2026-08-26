<!--
  MobileControlsDrawer — the unified mobile "controls" surface.

  A partial, NON-BLOCKING bottom drawer: the 3D scene stays live and
  interactive above it, so filtering / hovering still visibly changes the
  scene (2026-07 UX decision G). Two states: PEEK (handle + first row, the
  default — decision C) and EXPANDED. Opened by a bottom "◫ CONTROLS" tab
  (decision A); collapses on swipe-down, tap-away (a LIGHT dim, not an opaque
  scrim), or Esc.

  Desktop (≥768px) is a no-op passthrough — routes keep their existing inline
  controls; this component renders nothing there.

  Generic by design: the consumer route passes the control sections as
  `children` (expanded content) and an optional `peek` snippet (the single
  row shown while peeking). Position above a route's primary bar (time
  scrubber / station timeline / footer) via the `--mcd-bottom` CSS var.

  Model: ScienceLayersPanel's mobile bottom-drawer (collapse header, 40vh cap,
  z-37 tier). See docs/wip mobile de-clutter plan.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    /** Handle label (e.g. "Controls"). */
    label?: string;
    /** Row shown while peeking (collapsed-but-hinting). Optional. */
    peek?: Snippet;
    /** Full control content, rendered when expanded. */
    children?: Snippet;
    /** Start expanded instead of peek. Default false (peek). */
    startExpanded?: boolean;
    /**
     * Half-width placement: 'left' pins to the left ~50%, 'right' to the
     * right ~50%. Default 'full' = full-width (existing behavior).
     */
    side?: 'left' | 'right' | 'full';
  };
  let {
    label = 'Controls',
    peek,
    children,
    startExpanded = false,
    side = 'full',
  }: Props = $props();

  // Seed the local open/closed state from the prop's initial value once; the
  // drawer owns `expanded` after mount (capturing the initial prop is intended).

  let expanded = $state(startExpanded);

  // Swipe-down on the drawer collapses it.
  let startY = $state(0);
  let deltaY = $state(0);
  function onTouchStart(e: TouchEvent) {
    startY = e.touches[0]?.clientY ?? 0;
    deltaY = 0;
  }
  function onTouchMove(e: TouchEvent) {
    deltaY = Math.max(0, (e.touches[0]?.clientY ?? 0) - startY);
  }
  function onTouchEnd() {
    if (deltaY > 60) expanded = false;
    deltaY = 0;
  }

  // Esc collapses (parity with the rest of the app's overlays).
  $effect(() => {
    if (!expanded) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') expanded = false;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
</script>

{#if expanded}
  <!-- Light dim, NOT an opaque scrim — the scene must stay visible + live
       while filtering/hovering (decision G). Tap collapses. -->
  <button
    type="button"
    class="mcd-dim"
    aria-label={m.panel_close()}
    tabindex="-1"
    onclick={() => (expanded = false)}
  ></button>
{/if}

<section
  class="mcd"
  class:expanded
  class:mcd-left={side === 'left'}
  class:mcd-right={side === 'right'}
  aria-label={label}
  style:transform={deltaY > 0 ? `translateY(${deltaY}px)` : ''}
  ontouchstart={onTouchStart}
  ontouchmove={onTouchMove}
  ontouchend={onTouchEnd}
>
  <button
    type="button"
    class="mcd-handle"
    aria-expanded={expanded}
    onclick={() => (expanded = !expanded)}
  >
    <span class="mcd-grab" aria-hidden="true"></span>
    <span class="mcd-tab">◫ {label.toUpperCase()}</span>
    <span class="mcd-chev" aria-hidden="true">{expanded ? '▾' : '▴'}</span>
  </button>
  <div class="mcd-body">
    {#if expanded}
      {@render children?.()}
    {:else if peek}
      {@render peek?.()}
    {/if}
  </div>
</section>

<style>
  /* Desktop: render nothing — routes keep their inline controls. */
  .mcd,
  .mcd-dim {
    display: none;
  }

  @media (hover: none), (pointer: coarse) {
    .mcd {
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 8px;
      right: 8px;
      /* Sits above the route's primary bar (scrubber/timeline/footer).
         Consumer overrides --mcd-bottom per route. */
      bottom: var(--mcd-bottom, calc(52px + env(safe-area-inset-bottom, 0px)));
      z-index: 38;
      max-height: 46vh;
      background: rgba(8, 10, 22, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
      color: var(--color-text);
      overflow: hidden;
      transition: max-height 160ms ease;
    }
    /* Half-width variants -- each drawer takes ~50% of the viewport with
       an 8px gap between them (each side inset 8px + 4px). */
    .mcd.mcd-left {
      left: 8px;
      right: calc(50% + 4px);
    }
    .mcd.mcd-right {
      left: calc(50% + 4px);
      right: 8px;
    }
    .mcd.expanded {
      overflow-y: auto;
    }
    /* Light dim behind the expanded drawer — scene reads through it. */
    .mcd-dim {
      display: block;
      position: fixed;
      inset: 0;
      margin: 0;
      padding: 0;
      border: none;
      background: rgba(2, 2, 8, 0.28);
      cursor: pointer;
      z-index: 37;
    }

    .mcd-handle {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 8px 12px;
      color: inherit;
      flex-shrink: 0;
      position: relative;
    }
    .mcd-grab {
      position: absolute;
      top: 5px;
      left: 50%;
      transform: translateX(-50%);
      width: 34px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.28);
    }
    .mcd-tab {
      font-family: var(--font-mono, 'Space Mono', monospace);
      font-size: 11px;
      letter-spacing: 1.5px;
      color: rgba(255, 255, 255, 0.9);
    }
    .mcd-chev {
      margin-left: auto;
      font-family: var(--font-mono, 'Space Mono', monospace);
      font-size: 12px;
      color: rgba(255, 255, 255, 0.55);
    }
    .mcd-handle:focus-visible {
      outline: 2px solid var(--color-accent, #4ecdc4);
      outline-offset: -2px;
      border-radius: 8px;
    }

    .mcd-body {
      padding: 0 12px 12px;
    }
    /* Peek: show just the first row, capped, no scroll. */
    .mcd:not(.expanded) .mcd-body {
      max-height: 44px;
      overflow: hidden;
      -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent);
      mask-image: linear-gradient(to bottom, #000 60%, transparent);
    }
    .mcd:not(.expanded) .mcd-body:empty {
      display: none;
    }
  }
</style>
