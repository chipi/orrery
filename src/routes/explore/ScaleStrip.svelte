<script lang="ts">
  import { contextLabel, fmtScale, lightUnitLabel } from '$lib/explore/format';
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
  }: {
    readout: ScaleReadout | null;
    contextId: ExploreContextId;
    blackHole: boolean;
    barPx: number;
    barLabel: string;
    bodyHostName: string;
  } = $props();
</script>

{#if readout && (contextId === 'solar-system' || contextId === 'neighborhood')}
  <div class="scale-strip" class:neighborhood={contextId === 'neighborhood'} aria-hidden="true">
    <div class="scale-ladder">
      {#each RUNG_LADDER as rung (rung)}
        <span
          class="rung"
          class:active={readout.rung === rung || (readout.rung === 'ly' && rung === 'pc')}
        >
          {rung === 'au' ? 'AU' : rung}
        </span>
      {/each}
    </div>
    <!-- Numeric distance + light-time only where the Orbit Ruler (solar
         system) isn't already showing them — keeps the two rulers complementary,
         not redundant. -->
    {#if contextId === 'neighborhood'}
      <div class="scale-readout">
        <span class="primary">{fmtScale(readout.primary.value)} {readout.primary.unit}</span>
        {#if readout.companion}
          <span class="companion"
            >≈ {fmtScale(readout.companion.value)} {readout.companion.unit}</span
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
        <span class="scale-bar" style="width:{Math.round(Math.min(barPx, 220))}px"></span>
        <span class="scale-bar-label">{barLabel}</span>
      </div>
    {/if}
    <div class="scale-context">{contextLabel(contextId, bodyHostName)}</div>
  </div>
{:else if !blackHole && (contextId === 'milky-way' || contextId === 'local-group' || contextId === 'local-sheet' || contextId === 'virgo' || contextId === 'laniakea' || contextId === 'cosmic-web')}
  <div class="scale-strip schematic" role="note">
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
    max-width: 260px;
  }
  .scale-strip.neighborhood {
    border-color: rgba(78, 205, 196, 0.35);
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
    font-size: 10px;
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
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }
  .scale-ladder .rung.active {
    color: #04121a;
    background: #4ecdc4;
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
    color: #9fe8e2;
  }
  .scale-light {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }
  .scale-bar-wrap {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 7px;
  }
  .scale-bar {
    display: inline-block;
    height: 3px;
    background: rgba(255, 255, 255, 0.8);
    border-left: 1px solid rgba(255, 255, 255, 0.8);
    border-right: 1px solid rgba(255, 255, 255, 0.8);
    box-sizing: border-box;
    min-width: 12px;
  }
  .scale-bar-label {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
  }
  .scale-context {
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 6px;
  }

  /* Milky Way schematic → the /science overview article (S5 · our-galaxy). */
  .mw-badge-link {
    margin-left: 10px;
    padding-left: 10px;
    border-left: 1px solid rgba(255, 255, 255, 0.22);
    color: #4ecdc4;
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
  @media (max-width: 767px) {
    .scale-strip {
      bottom: 104px;
      padding: 7px 9px;
      max-width: 190px;
    }
    .scale-readout .primary {
      font-size: 13px;
    }
  }
</style>
