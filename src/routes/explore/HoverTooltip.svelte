<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import type { ExploreHoverData } from '$lib/three/explore-scene-host';

  let {
    hoverData,
    expanded,
    container,
  }: {
    hoverData: ExploreHoverData;
    expanded: boolean;
    container: HTMLDivElement | undefined;
  } = $props();
</script>

<div
  class="tooltip"
  class:expanded
  role="status"
  aria-live="polite"
  aria-label="{hoverData.name} — {hoverData.velocity}, {hoverData.distance}, {hoverData.extras}"
  style:left="{Math.min(hoverData.x + 14, (container?.clientWidth ?? 0) - 220)}px"
  style:top="{Math.max(hoverData.y - 60, 60)}px"
>
  {#if hoverData.kind === 'lagrange'}
    <!-- Lagrange-point tooltip — co-orbits with the parent planet,
         so no orbital velocity. Title + physics blurb + (for the
         Sun–Earth points) notable spacecraft hosting that point. -->
    <div class="tt-eyebrow">{hoverData.lagrangeTitle}</div>
    <div class="tt-line dim">{hoverData.lagrangeBlurb}</div>
    {#if hoverData.lagrangeNotable}
      <div class="tt-line dim">{hoverData.lagrangeNotable}</div>
    {/if}
  {:else if expanded}
    <!-- Lens-on expanded card. The cursor-tracking tooltip can't be
         clicked-through (mouse leaves the planet immediately on
         entry into the card area), so we drop the ScienceChip info
         icons and surface only the live numbers. Users navigate to
         /science via the lens banner instead. -->
    <div class="tt-eyebrow">{hoverData.name.toUpperCase()}</div>
    <div class="tt-row">
      <span class="tt-key">{m.explore_tt_speed()}</span>
      <span class="tt-val">{hoverData.velocityKms.toFixed(2)} km/s</span>
    </div>
    <div class="tt-row">
      <span class="tt-key">{m.explore_tt_dist()}</span>
      <span class="tt-val">
        {hoverData.distanceAU.toFixed(3)} AU ·
        {(hoverData.distanceAU * 8.317).toFixed(1)} l-min
      </span>
    </div>
    <div class="tt-row">
      <span class="tt-key">{m.explore_tt_ecc()}</span>
      <span class="tt-val">{hoverData.eccentricity.toFixed(3)}</span>
    </div>
    <div class="tt-row">
      <span class="tt-key">{m.explore_tt_incl()}</span>
      <span class="tt-val">{hoverData.inclinationDeg.toFixed(1)}°</span>
    </div>
  {:else}
    <div class="tt-line">{hoverData.velocity}</div>
    <div class="tt-line dim">{hoverData.distance}</div>
    <div class="tt-line dim">{hoverData.extras}</div>
  {/if}
</div>

<style>
  .tooltip {
    position: absolute;
    z-index: 24;
    min-width: 170px;
    pointer-events: none;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(68, 102, 255, 0.5);
    border-radius: 4px;
    padding: 8px 12px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    backdrop-filter: blur(6px);
  }
  /* Lens-on expanded card: gold border (matches the lens family) +
     pointer-events enabled so users can click the science chips
     into /science. */
  .tooltip.expanded {
    pointer-events: auto;
    min-width: 220px;
    border-color: rgba(255, 200, 80, 0.6);
    padding: 10px 12px 8px;
  }
  .tt-line {
    font-size: 9px;
    line-height: 1.5;
    color: rgba(230, 235, 255, 0.85);
  }
  .tt-line.dim {
    color: rgba(255, 255, 255, 0.5);
    font-size: 8px;
  }
  .tt-eyebrow {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 2px;
    color: rgba(255, 200, 80, 0.92);
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 200, 80, 0.18);
    padding-bottom: 4px;
  }
  .tt-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 9px;
    line-height: 1.55;
  }
  .tt-row + .tt-row {
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    padding-top: 2px;
  }
  .tt-key {
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: 1px;
    font-size: 8px;
    display: inline-flex;
    align-items: baseline;
  }
  .tt-val {
    color: rgba(255, 255, 255, 0.92);
  }
</style>
