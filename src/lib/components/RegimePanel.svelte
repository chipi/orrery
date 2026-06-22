<!--
  RegimePanel — detail panel for one orbital regime (#354).

  Reuses the shared `<Panel>` shell (right-drawer desktop / bottom-
  sheet mobile) so the regime panel reads as a peer of every other
  detail panel — SatellitePanel, SmallBodyPanel, MissionPanel — rather
  than the bespoke modal-card it shipped as in v1. Per 2026-06-22
  feedback: header / fonts / science-link styling now mirror the rest.

  Layout (mirrors SatellitePanel typography):
    .head     — kind eyebrow (regime short, regime-coloured)
               + name (Bebas Neue big title)
               + stat-row (altitude + first-year)
    .editorial — comparison line + story paragraph (Crimson Pro italic)
    Residents — agency-dot list (Space Mono mono labels)
    Firsts    — year + label list
    ScienceCard — standard /science cross-link card
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import type { OrbitRegime } from '$types/orbit-regime';
  import type { ScienceTabId } from '$types/science';

  interface Props {
    regime: OrbitRegime | null;
    open: boolean;
    onClose: () => void;
    /** Set of object ids currently selectable in the scene (#354 /earth
     *  EarthObjects; #355 lunar orbiter SurfaceSites; #356 Mars orbiter
     *  sites). A resident whose `id` matches becomes a clickable button
     *  — selecting them in the scene via onResidentClick. Residents not
     *  in this set render as plain text. */
    selectableIds?: Set<string>;
    /** Click handler for clickable residents — parent decides whether
     *  to select in the scene + close the panel. */
    onResidentClick?: (id: string) => void;
  }
  let {
    regime,
    open,
    onClose,
    selectableIds = new Set<string>(),
    onResidentClick,
  }: Props = $props();

  function fmtAltitude(alt: OrbitRegime['altitude_km']): string {
    if (typeof alt === 'number') {
      return alt >= 1000 ? `${alt.toLocaleString('en-US')} km` : `${alt} km`;
    }
    const [lo, hi] = alt;
    const f = (x: number) => x.toLocaleString('en-US');
    return `${f(lo)} - ${f(hi)} km`;
  }

  // Per-agency accent for resident dots. Mirrors `nationChipFor` in
  // src/lib/surface-map/nation-palette.ts so the regime panel reads
  // consistent with the nation legend at the bottom of the scene.
  function agencyColor(agency: string): string {
    switch (agency) {
      case 'NASA':
      case 'SpaceX':
        return '#3b82f6';
      case 'ROSCOSMOS':
        return '#ef4444';
      case 'CNSA':
        return '#dc2626';
      case 'ISRO':
        return '#f97316';
      case 'JAXA':
        return '#1d4ed8';
      case 'ESA':
      case 'Arianespace':
        return '#1d4ed8';
      case 'UAESA':
        return '#00732F';
      default:
        return 'rgba(255,255,255,0.5)';
    }
  }
</script>

<!--
  zIndex=28 sits the regime panel UNDER the standard detail-panel
  z-index (30). When a resident click opens the satellite panel, that
  satellite panel paints on top of this regime panel (#354 — Marko's
  2026-06-22 "z order has to be swapped" feedback); closing the
  satellite panel reveals the regime panel underneath.
-->
<Panel {open} {onClose} title={regime?.name ?? ''} zIndex={28}>
  {#if regime}
    <div class="head" style:--regime-color={regime.color}>
      <div class="kind-row">
        <span class="kind">{regime.short ?? regime.id}</span>
      </div>
      <div class="name">{regime.name ?? regime.id}</div>
      <div class="stat-row">
        <div>
          <div class="stat-label">{m.earth_regime_altitude_label()}</div>
          <div class="stat-value">{fmtAltitude(regime.altitude_km)}</div>
        </div>
        {#if regime.firsts && regime.firsts.length > 0}
          <div>
            <div class="stat-label">{m.earth_regime_firsts_label()}</div>
            <div class="stat-value">{regime.firsts[0].year}</div>
          </div>
        {/if}
      </div>
    </div>

    {#if regime.comparison}
      <p class="editorial">{regime.comparison}</p>
    {/if}

    {#if regime.story}
      <div class="story">
        <div class="cell-label">{m.earth_regime_story_label()}</div>
        <p class="story-text">{regime.story}</p>
      </div>
    {/if}

    {#if regime.residents && regime.residents.length > 0}
      <div class="block">
        <div class="cell-label">{m.earth_regime_residents_label()}</div>
        <ul class="residents">
          {#each regime.residents as r (r.id)}
            {@const clickable = selectableIds.has(r.id) && onResidentClick != null}
            <li>
              <span
                class="agency-dot"
                style:background={agencyColor(r.agency)}
                aria-hidden="true"
              ></span>
              {#if clickable}
                <button
                  type="button"
                  class="resident-link"
                  onclick={() => onResidentClick?.(r.id)}
                >
                  {r.label}
                  <span class="resident-arrow" aria-hidden="true">↗</span>
                </button>
              {:else}
                <span class="resident-label">{r.label}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if regime.firsts && regime.firsts.length > 0}
      <div class="block">
        <div class="cell-label">{m.earth_regime_firsts_label_missions()}</div>
        <ul class="firsts">
          {#each regime.firsts as f}
            <li>
              <span class="firsts-year">{f.year}</span>
              {#if f.mission_id}
                <a class="firsts-link" href="{base}/missions?id={f.mission_id}">
                  {f.label}
                  <span class="resident-arrow" aria-hidden="true">↗</span>
                </a>
              {:else}
                <span class="firsts-label">{f.label}</span>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if regime.science_link}
      <div class="science-block">
        <h3 class="library-heading">{m.panel_tab_science()}</h3>
        <ScienceCard
          tab={regime.science_link.tab as ScienceTabId}
          section={regime.science_link.section}
        />
      </div>
    {/if}
  {/if}
</Panel>

<style>
  /* Tokens cribbed from SatellitePanel.svelte so the regime panel reads
     as a peer of the existing detail panels (#354 styling feedback). */
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .kind-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kind {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: var(--regime-color);
    text-transform: uppercase;
    font-weight: 700;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 12px;
  }
  .stat-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .stat-value {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: var(--color-text);
  }

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 14px;
  }

  .story {
    margin-bottom: 14px;
  }
  .story-text {
    font-family: 'Crimson Pro', serif;
    font-size: 15px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.88);
    margin: 0;
  }

  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 6px;
    text-transform: uppercase;
  }

  .block {
    margin-bottom: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .residents,
  .firsts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .residents li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.45;
  }
  .agency-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .firsts li {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.45;
  }
  .firsts-year {
    color: rgba(255, 255, 255, 0.55);
    font-weight: 700;
  }
  .resident-link,
  .firsts-link {
    background: transparent;
    border: 0;
    padding: 0;
    color: rgba(160, 200, 255, 0.95);
    text-decoration: none;
    cursor: pointer;
    font: inherit;
    text-align: left;
    line-height: inherit;
    display: inline;
  }
  .resident-link:hover,
  .firsts-link:hover,
  .resident-link:focus-visible,
  .firsts-link:focus-visible {
    color: #fff;
    text-decoration: underline;
    outline: none;
  }
  .resident-arrow {
    font-size: 9px;
    opacity: 0.75;
    margin-left: 2px;
  }

  .science-block {
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .library-heading {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 10px;
    font-weight: 700;
  }
</style>
