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
    .editorial — comparison line + story paragraph (shared, panel-tabs.css)
    Residents — 28 px photo in an agency-colour ring, or the agency dot (Space Mono mono labels)
    Firsts    — year + label list; a first with a mission page is a link
    ScienceCard — the regime's own best /science card (one per pane; no card repeats inside a ruler,
                  UXD-010; the data rule is tested in science-links.test.ts)
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import { localHref, localeFromPage } from '$lib/locale';
  import { page } from '$app/state';
  import { fmtRegimeBand } from '$lib/orbit-regime-format';
  import { onMissionLinkClick } from '$lib/missions-linkify';
  import { thumbOf, thumbOfRef } from '$lib/entity-thumb';
  import { agencyRingColor } from '$lib/surface-map/nation-palette';
  import ScienceCard from './ScienceCard.svelte';
  import EntityThumb from './EntityThumb.svelte';
  import * as m from '$lib/paraglide/messages';
  import thumbRefs from '$data/orbit-regime-thumbs.json';
  import missionIndex from '$data/missions/index.json';
  import type { OrbitRegime } from '$types/orbit-regime';
  import type { ScienceTabId } from '$types/science';

  interface Props {
    regime: OrbitRegime | null;
    open: boolean;
    onClose: () => void;
    /** The ruler bundle the regime and its residents belong to: a resident id means different
     *  things per bundle (`lro`, `queqiao`, `galileo` appear in two), so the thumbnail map is
     *  keyed `<bundle>/<id>`. */
    bundle?:
      'orbit-regimes' | 'orbit-regimes-moon' | 'orbit-regimes-mars' | 'orbit-regimes-explore';
    /** Open a founding mission in place (/explore: the mission panel stacks over this one, which
     *  stays mounted). Without it a first is an anchor to /missions?id=. */
    onMissionOpen?: (missionId: string) => void;
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
    bundle = 'orbit-regimes',
    onMissionOpen,
    selectableIds = new Set<string>(),
    onResidentClick,
  }: Props = $props();

  const loc = $derived(localeFromPage(page));
  // The map says which entity a resident is (`<surface>/<id>`), because a resident id means
  // different things per bundle; the file is the entity's blessed-hero thumb (entity-thumb.ts).
  const residentThumb = (id: string): string | null =>
    thumbOfRef((thumbRefs as Record<string, string>)[`${bundle}/${id}`]);
  // A first carries only its mission id; the ring is that mission's agency colour.
  const missionAgency = new Map(missionIndex.map((x) => [x.id, x.agency]));
  const firstRing = (id: string | undefined): string | undefined =>
    id ? agencyRingColor(missionAgency.get(id) ?? '') : undefined;
</script>

<!--
  zIndex=28 sits the regime panel UNDER the standard detail-panel
  z-index (30). When a resident click opens the satellite panel, that
  satellite panel paints on top of this regime panel (#354 — Marko's
  2026-06-22 "z order has to be swapped" feedback); closing the
  satellite panel reveals the regime panel underneath.
-->
<Panel {open} {onClose} title={regime?.name ?? ''} zIndex={28}>
  {#snippet eyebrow()}
    {#if regime}<div style:--regime-color={regime.color} class="kind-row">
        <span class="kind">{regime.short ?? regime.id}</span>
      </div>{/if}
  {/snippet}
  {#snippet heading()}
    {#if regime}<div style:--regime-color={regime.color} class="name">
        {regime.name ?? regime.id}
      </div>{/if}
  {/snippet}

  {#if regime}
    <div class="head">
      <div class="stat-row">
        <div>
          <div class="stat-label">{m.earth_regime_altitude_label()}</div>
          <div class="stat-value">{fmtRegimeBand(regime, loc, { round: false })}</div>
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
              <EntityThumb src={residentThumb(r.id)} ring={agencyRingColor(r.agency)} />
              {#if clickable}
                <button type="button" class="resident-link" onclick={() => onResidentClick?.(r.id)}>
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
          {#each regime.firsts as f (f)}
            <li>
              <EntityThumb
                src={f.mission_id ? thumbOf('missions', f.mission_id) : null}
                ring={firstRing(f.mission_id)}
              />
              <span class="firsts-year">{f.year}</span>
              {#if f.mission_id}
                <a
                  class="firsts-link"
                  href={localHref(`/missions?id=${f.mission_id}`)}
                  onclick={(e) =>
                    onMissionLinkClick(e, { kind: 'mission', id: f.mission_id }, onMissionOpen)}
                >
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .stat-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    color: var(--color-text);
  }

  .story {
    margin-bottom: 14px;
  }
  .story-text {
    font-size: var(--size-lead);
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.88);
    margin: 0;
  }

  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.45;
  }
  /* A first: the mission's photo (EntityThumb, 28 px) before the year; a first with no mission
     or no photo keeps the dot in the same slot so the years and labels line up (UXD-025). */
  .firsts li {
    display: grid;
    grid-template-columns: 28px 52px 1fr;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.45;
  }
  .firsts-year {
    color: var(--color-text-label);
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
    font-size: var(--size-label);
    opacity: 0.75;
    margin-left: 2px;
  }

  .science-block {
    margin-top: 18px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .library-heading {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--color-text-label);
    margin: 0 0 10px;
    font-weight: 700;
  }
</style>
