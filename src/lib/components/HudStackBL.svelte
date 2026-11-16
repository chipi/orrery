<!--
  HudStackBL — the bottom-left column of /earth, /moon and /mars (UXD-024): the "AS SEEN FROM YOU"
  readout (Moon), the locate chip and the orbit ruler, top to bottom, one flex column so they never
  overlap (it replaces a script that nudged the ruler to the right of the chip).

  Pointer device: readout / chip / ruler (children) in the column. Phone: only the readout stands
  above the scene's bottom bar; the chip is the first icon of that bar (the route renders it from
  `hudTouch`) and the ruler lives in the drawer. The imagery card (TierContextCard) is scene
  attribution, not a control: it stays outside and clears the column's top edge, published here as
  `--hud-stack-top` on <html>. Its right edge is published as `--hud-stack-right`: the nation legend
  strip (SurfaceScene) starts there, since the column stands above the strip's layer.
-->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { hudTouch, watchHudTouch } from '$lib/hud-touch.svelte';

  interface Props {
    /** The "as seen from you" readout (Moon only); shown on both device types. */
    readout?: Snippet;
    /** The locate chip; rendered here on a pointer device only. */
    chip?: Snippet;
    /** The ruler; rendered here on a pointer device only. */
    children?: Snippet;
  }
  let { readout, chip, children }: Props = $props();

  let el: HTMLDivElement | undefined = $state();
  onMount(() => watchHudTouch());

  // Where the column's top edge is, as a distance from the window bottom, for the imagery card.
  $effect(() => {
    if (!el) return;
    const node = el;
    const root = document.documentElement;
    let raf = 0;
    const publish = () => {
      const r = node.getBoundingClientRect();
      if (r.width && r.height && !hudTouch.value) {
        root.style.setProperty('--hud-stack-top', `${Math.round(window.innerHeight - r.top)}px`);
        root.style.setProperty('--hud-stack-right', `${Math.round(r.right)}px`);
      } else {
        root.style.removeProperty('--hud-stack-top');
        root.style.removeProperty('--hud-stack-right');
      }
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(publish);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(node);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
      root.style.removeProperty('--hud-stack-top');
      root.style.removeProperty('--hud-stack-right');
    };
  });
</script>

<div class="hud-stack-bl" bind:this={el} data-testid="hud-stack-bl">
  {@render readout?.()}
  {#if !hudTouch.value}
    {@render chip?.()}
    {@render children?.()}
  {/if}
</div>

<style>
  .hud-stack-bl {
    position: absolute;
    left: 12px;
    /* --ruler-clear lifts the column over the centred footer on narrow windows (SurfaceScene). */
    bottom: max(14px, var(--ruler-clear, 0px));
    z-index: 7;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    /* Under the layer-chip rows at the top (150 px, as /explore's --ruler-top-clear). */
    max-height: calc(100dvh - 150px - max(14px, var(--ruler-clear, 0px)));
    pointer-events: none;
  }
  .hud-stack-bl > :global(*) {
    pointer-events: auto;
  }
  /* The ruler stands in the column, not on its own pin; it shrinks (and scrolls) first when the
     window is short. */
  .hud-stack-bl :global(.ruler) {
    position: static;
    flex: 0 1 auto;
    min-height: 0;
    max-height: none;
  }
  .hud-stack-bl :global(.ruler-desktop-only) {
    display: contents;
  }
  /* Phone: the readout rides above the scene's bottom bar, as it did before. */
  @media (hover: none), (pointer: coarse) {
    .hud-stack-bl {
      bottom: calc(106px + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
