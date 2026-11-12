<script lang="ts">
  import {
    contextLabel,
    distanceUnitLabel,
    distanceWithUnit,
    fmtScale,
    lightUnitLabel,
  } from '$lib/explore/format';
  import ScaleBar from '$lib/components/ScaleBar.svelte';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import type { ExploreContextId } from '$lib/three/explore-scene-host';
  import { RUNG_LADDER, type ScaleReadout } from '$lib/universe/scale-readout';

  let {
    readout,
    contextId,
    blackHole,
    barPx,
    barLabel,
    bodyHostName,
    panelCoverPx = 0,
    dockBelow = true,
  }: {
    readout: ScaleReadout | null;
    contextId: ExploreContextId;
    blackHole: boolean;
    barPx: number;
    barLabel: string;
    bodyHostName: string;
    /** Width a docked side panel covers at the right edge; the strip sits left of it. */
    panelCoverPx?: number;
    /** The time dock is drawn under the strip (solar system only); without it the strip sits at
     *  the bottom edge. */
    dockBelow?: boolean;
  } = $props();

  const rightOffset = $derived(panelCoverPx > 0 ? `${12 + panelCoverPx}px` : undefined);
</script>

{#if readout && (contextId === 'solar-system' || contextId === 'neighborhood')}
  <div
    class="scale-strip"
    class:neighborhood={contextId === 'neighborhood'}
    class:no-dock={!dockBelow}
    style:right={rightOffset}
    aria-hidden="true"
  >
    <div class="scale-ladder">
      {#each RUNG_LADDER as rung (rung)}
        <span
          class="rung"
          class:active={readout.rung === rung || (readout.rung === 'ly' && rung === 'pc')}
        >
          {distanceUnitLabel(rung === 'au' ? 'AU' : rung)}
        </span>
      {/each}
    </div>
    <!-- Numeric distance + light-time only where the Orbit Ruler (solar
         system) isn't already showing them — keeps the two rulers complementary,
         not redundant. -->
    {#if contextId === 'neighborhood'}
      <div class="scale-readout">
        <span class="primary"
          >{distanceWithUnit(fmtScale(readout.primary.value), readout.primary.unit)}</span
        >
        {#if readout.companion}
          <span class="companion"
            >≈ {distanceWithUnit(fmtScale(readout.companion.value), readout.companion.unit)}</span
          >
        {/if}
      </div>
      <div class="scale-light">
        {m.explore_scale_light_prefix()}: {fmtScale(readout.lightTravel.value)}
        {lightUnitLabel(readout.lightTravel.unit)}
      </div>
    {/if}
    {#if barPx > 0}
      <div class="scale-bar-wrap">
        <ScaleBar widthPx={barPx} label={barLabel} stacked />
      </div>
    {/if}
    <div class="scale-context">{contextLabel(contextId, bodyHostName)}</div>
  </div>
{:else if !blackHole && (contextId === 'milky-way' || contextId === 'local-group' || contextId === 'local-sheet' || contextId === 'virgo' || contextId === 'laniakea' || contextId === 'cosmic-web')}
  <div
    class="scale-strip schematic"
    class:no-dock={!dockBelow}
    role="note"
    style:right={rightOffset}
  >
    {#if contextId === 'milky-way'}
      <div class="scale-schematic-size">{m.explore_mw_scale_note()}</div>
      <div class="scale-schematic-note">
        <span>{m.explore_mw_schematic_badge()}</span>
        <a class="mw-badge-link" href={localHref(`/science/observation/our-galaxy`)}
          >{m.science_learn_more()} →</a
        >
      </div>
    {:else if contextId === 'local-group'}
      <div class="scale-schematic-note">
        <span>{m.explore_lg_schematic_badge()}</span>
        <a class="mw-badge-link" href={localHref(`/science/observation/local-group`)}
          >{m.science_learn_more()} →</a
        >
      </div>
    {:else if contextId === 'local-sheet'}
      <div class="scale-schematic-note"><span>{m.explore_ls_schematic_badge()}</span></div>
    {:else if contextId === 'virgo'}
      <div class="scale-schematic-note"><span>{m.explore_virgo_schematic_badge()}</span></div>
    {:else if contextId === 'laniakea'}
      <div class="scale-schematic-note"><span>{m.explore_laniakea_schematic_badge()}</span></div>
    {:else if contextId === 'cosmic-web'}
      <div class="scale-schematic-note">
        <span>{m.explore_cosmic_web_schematic_badge()}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  /* v2 scale ruler HUD (PRD-030 / RFC-032). Bottom-left, unobtrusive. */
  /* #45 unified scale strip — one bottom-right box on every shell. Same slot the
     old .scale-hud used (proven not to overlap the bottom control stack); the
     picker no longer shares this corner, so nothing collides here now. */
  .scale-strip {
    position: absolute;
    right: 12px;
    bottom: 46px;
    z-index: 6;
    padding: 9px 11px;
    background: rgba(6, 10, 22, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    backdrop-filter: blur(5px);
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #dde4ff;
    pointer-events: none;
    box-sizing: border-box;
  }
  /* Fixed box: the strip never resizes with its text (UXD-021). 232 px holds the 120 px bar and
     the longest label under it; under 600 px (the bar's own breakpoint) 190 px holds the 64 px
     bar. The schematic note keeps its content width. */
  .scale-strip:not(.schematic) {
    inline-size: 232px;
  }
  .scale-strip.schematic {
    max-inline-size: 260px;
  }
  .scale-strip.neighborhood {
    border-color: var(--color-accent-edge);
  }
  /* Schematic shells (Milky Way … Cosmic Web): the honesty note + optional
     Learn-more link, in the same box. Slate-accented to read as "not to scale". */
  .scale-strip.schematic {
    border-color: rgba(255, 255, 255, 0.18);
    color: #cdd4e6;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 11px;
    line-height: 1.5;
    pointer-events: auto; /* the Learn-more link is focusable */
  }
  .scale-schematic-size {
    color: #9fb2cf;
    font-size: var(--size-label);
    margin-bottom: 4px;
  }
  .scale-schematic-note {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px;
  }
  .scale-ladder {
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  }
  .scale-ladder .rung {
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    color: var(--color-text-label);
    background: rgba(255, 255, 255, 0.04);
  }
  .scale-ladder .rung.active {
    color: #04121a;
    background: var(--color-accent);
    font-weight: 700;
  }
  .scale-readout {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .scale-readout .primary {
    font-size: 15px;
    color: #fff;
  }
  .scale-readout .companion {
    font-size: 11px;
    color: var(--color-state);
  }
  .scale-light {
    font-size: var(--size-label);
    color: var(--color-text-label);
    margin-top: 2px;
  }
  .scale-bar-wrap {
    margin-top: 7px;
  }
  .scale-context {
    font-size: var(--size-label);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--color-text-label);
    margin-top: 6px;
  }

  /* Milky Way schematic → the /science overview article (S5 · our-galaxy). */
  .mw-badge-link {
    margin-left: 10px;
    padding-left: 10px;
    border-left: 1px solid rgba(255, 255, 255, 0.22);
    color: var(--color-state);
    text-decoration: none;
    pointer-events: auto;
    white-space: nowrap;
  }

  .mw-badge-link:hover,
  .mw-badge-link:focus-visible {
    text-decoration: underline;
  }

  /* Compact the scale strip on phones and lift it ABOVE the two stacked bottom
     bars (the Ruler/Controls/Missions drawer + the Scale/time controls, which
     together occupy ~96px from the bottom edge) so it no longer overlaps them. */
  /* The fixed 232 px box reaches back over the time dock's right end below 900 px (the dock
     ends near x 590), so it lifts above the dock there too. */
  @media (max-width: 899px) {
    .scale-strip {
      bottom: 104px;
    }
  }
  @media (max-width: 767px) {
    .scale-strip {
      padding: 7px 9px;
    }
    .scale-strip.schematic {
      max-inline-size: 190px;
    }
    .scale-readout .primary {
      font-size: 13px;
    }
  }
  @media (max-width: 599px) {
    .scale-strip:not(.schematic) {
      inline-size: 190px;
    }
  }
  /* No time dock under it (every scale but the solar system): the lifts above are for the dock,
     so the strip keeps only the footer's 46 px, and on touch (no footer) sits at the bottom. */
  .scale-strip.no-dock {
    bottom: 46px;
  }
  :global(html[data-touch]) .scale-strip.no-dock {
    bottom: max(12px, env(safe-area-inset-bottom, 0px));
  }
  /* Touch landscape at the solar system: the time dock sits bottom-left and the drawer's tab row
     (8 px up, 34 px tall) bottom-right, under the strip; the strip sits 8 px above the tabs. */
  @media (orientation: landscape) and (max-height: 500px) {
    :global(html[data-touch]) .scale-strip:not(.no-dock) {
      bottom: 50px;
    }
  }
</style>
