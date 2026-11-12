<script lang="ts">
  /**
   * Reusable EarthObject detail panel — overview / gallery / learn
   * tabs, with hero image, mission cross-link, and lightbox. Pulled out
   * of EarthOrbitalScene (#290 Slice 6b) so SurfaceScene can mount the
   * same UI when an EarthObject is selected on the unified /earth
   * route. EarthOrbitalScene keeps using this component during the
   * Slice 7 transition; once Slice 7 ships, EarthOrbitalScene goes
   * away and SurfaceScene becomes the sole consumer.
   *
   * The component owns all panel-local state (tab, gallery, lightbox)
   * so callers only feed in the EarthObject and the open/close flag.
   * Gallery fetch + reset-on-selection-change is handled internally
   * via $effect — same behaviour as the original EarthOrbitalScene
   * implementation.
   */
  import { page } from '$app/state';
  import PanelGalleryGrid from '$lib/components/PanelGalleryGrid.svelte';
  import PanelLinkTiers from '$lib/components/PanelLinkTiers.svelte';
  import PanelHeroImage from '$lib/components/PanelHeroImage.svelte';
  import PanelLightbox from '$lib/components/PanelLightbox.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import PanelTabRow from '$lib/components/PanelTabRow.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import ScienceCard from '$lib/components/ScienceCard.svelte';
  import { pickScienceLinks, refsFromSlugs } from '$lib/science-links';
  import type { ScienceTabId } from '$types/science';
  import {
    getEarthObjectGallery,
    getFleet,
    getFleetGallery,
    getFleetIndex,
    getMission,
    getMissionGallery,
    getMissionIndex,
  } from '$lib/data';
  import { panelGalleryCredit } from '$lib/image-credits';
  import { formatNumber } from '$lib/format';
  import { localeFromPage, localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { surfaceStatusLabel } from '$lib/status-label';
  import type { EarthObject } from '$types/earth-object';
  import type { Mission, MissionIndex } from '$types/mission';
  import type { FleetEntry, FleetIndexEntry } from '$types/fleet';
  import type { CardSpec } from '$lib/cards/card-spec';
  import { loadCardModules, type CardModules } from '$lib/cards/lazy-card';
  import { spacecraftDiagramPath, launcherCutawayPath } from '$lib/spacecraft-diagrams';
  import type { OrbitRegime } from '$types/orbit-regime';
  import RegimeChip from '$lib/components/RegimeChip.svelte';
  import { regimeById } from '$lib/physics/util/orbit-regime-match';
  import { dataLoadFailed } from '$lib/data/core';
  import { readableTextOn, DARK_TEXT } from '$lib/readable-text';

  interface Props {
    selected: EarthObject | null;
    open: boolean;
    onClose: () => void;
    /** Mission ids that exist in the mission index — drives the "FULL
     *  MISSION CARD →" cross-link visibility. */
    missionIds: Set<string>;
    /** Optional orbital-regime reference (passed through from
     *  SurfaceScene → /earth +page). When present + the EarthObject's
     *  regime matches a known regime id, a RegimeChip renders in the
     *  chip row and clicking it opens the regime panel underneath the
     *  satellite panel (2026-06-22 "tag orbiters back to orbit
     *  panels" — #354). */
    regimes?: OrbitRegime[];
    onRegimeOpen?: (regimeId: string) => void;
  }
  let { selected, open, onClose, missionIds, regimes, onRegimeOpen }: Props = $props();
  let scienceLinks = $derived(pickScienceLinks(refsFromSlugs(selected?.science)));

  let matchedRegime = $derived(regimes ? regimeById(selected?.regime, regimes) : null);

  type PanelTab = 'overview' | 'gallery' | 'learn';
  let panelTab: PanelTab = $state('overview');
  let panelGallery: string[] = $state([]);
  let panelGalleryGrid = $derived(panelGallery.length <= 1 ? panelGallery : panelGallery.slice(1));
  let panelLightbox = $state<string | null>(null);
  let lastSelectedId = $state<string | null>(null);

  // #547 S5c — the collectible card. Every earth-object aliases an
  // existing canonical card (lunar orbiters → mission, constellations/
  // stations/observatories → their fleet_refs fleet entry); objects
  // matching neither (the generic GEO belt marker) show no card CTA.
  let cardOpen = $state(false);
  let cardMissionIndex = $state<MissionIndex[]>([]);
  let cardFleetIndex = $state<FleetIndexEntry[]>([]);
  let cardAliasMission = $state<Mission | null>(null);
  let cardAliasFleet = $state<FleetEntry | null>(null);
  // The canonical entity's OWN blessed hero — aliased cards must show the
  // same picture as the canonical card everywhere.
  let cardAliasHero = $state<string | undefined>(undefined);
  // The card code loads on demand (lazy-card.ts), in the alias loader below.
  let cards = $state<CardModules | null>(null);
  let cardSpec = $derived.by<CardSpec | null>(() => {
    if (!selected || !cards) return null;
    if (cardAliasMission)
      return cards.spec.cardForMission(cardAliasMission, cardMissionIndex, cardAliasHero);
    if (cardAliasFleet)
      return cards.spec.cardForFleet(
        cardAliasFleet,
        cardFleetIndex,
        cardAliasHero,
        spacecraftDiagramPath(cardAliasFleet.id) ??
          launcherCutawayPath(cardAliasFleet.id) ??
          undefined,
      );
    return null;
  });

  $effect(() => {
    if (selected && selected.id !== lastSelectedId) {
      panelTab = 'overview';
      panelLightbox = null;
      panelGallery = [];
      cardOpen = false;
      cardAliasMission = null;
      cardAliasFleet = null;
      cardAliasHero = undefined;
      lastSelectedId = selected.id;
      // Earth-object ids often match a mission id (e.g. "lro",
      // "hubble", "jwst", "chandrayaan1") so getEarthObjectGallery's
      // built-in mission-gallery fallback is enough.
      void getEarthObjectGallery(selected.id)
        .then((urls: string[]) => {
          if (selected && selected.id === lastSelectedId) panelGallery = urls;
        })
        .catch(dataLoadFailed);
      const sid = selected.id;
      const eo = selected;
      void (async () => {
        try {
          if (cardMissionIndex.length === 0) cardMissionIndex = await getMissionIndex();
          if (cardFleetIndex.length === 0) cardFleetIndex = await getFleetIndex();
          cards ??= await loadCardModules();
          const alias = cards.spec.earthObjectCardAlias(eo, cardMissionIndex, cardFleetIndex);
          if (!alias) return;
          if (alias.kind === 'mission') {
            const row = cardMissionIndex.find((mi) => mi.id === alias.id)!;
            const [mission, missionGallery] = await Promise.all([
              getMission(alias.id, row.dest, localeFromPage(page)),
              getMissionGallery(alias.id).catch(() => [] as string[]),
            ]);
            if (selected && selected.id === lastSelectedId && sid === lastSelectedId) {
              cardAliasMission = mission;
              cardAliasHero = missionGallery[0];
            }
          } else {
            const row = cardFleetIndex.find((fi) => fi.id === alias.id)!;
            const [entry, fleetGallery] = await Promise.all([
              getFleet(alias.id, row.category, localeFromPage(page)),
              getFleetGallery(alias.id).catch(() => [] as string[]),
            ]);
            if (selected && selected.id === lastSelectedId && sid === lastSelectedId) {
              cardAliasFleet = entry;
              cardAliasHero = fleetGallery[0];
            }
          }
        } catch {
          /* flaky fetch — the card CTA simply stays absent */
        }
      })();
    }
  });

  // The `as EarthObject | null` cast guards against a Svelte 5 flow-
  // analysis quirk where `selected` is narrowed to `never` after the
  // earlier $derived.by reads it inside another closure. The cast
  // restores the union type for length-checking.
  let panelHasLinks = $derived.by(() => {
    const sel = selected as EarthObject | null;
    return sel != null && sel.links.length > 0;
  });
</script>

<Panel
  {open}
  title={selected?.name ?? selected?.short ?? selected?.id ?? ''}
  {onClose}
  onShare={cardSpec ? () => (cardOpen = true) : undefined}
>
  {#snippet eyebrow()}
    {#if selected}
      <div class="agency-row">
        <span
          class="agency-badge"
          style:background-color={selected.color}
          style:color={readableTextOn(selected.color)}
          style:text-shadow={readableTextOn(selected.color) === DARK_TEXT ? 'none' : null}
        >
          {selected.agencies.join(' · ')}
        </span>
        {#if matchedRegime && onRegimeOpen}
          <RegimeChip regime={matchedRegime} onClick={() => onRegimeOpen?.(matchedRegime.id)} />
        {/if}
        <span class="status status-{selected.status.toLowerCase()}"
          >{surfaceStatusLabel(selected.status)}</span
        >
      </div>
    {/if}
  {/snippet}
  {#snippet heading()}
    {#if selected}
      <h1 class="name">{selected.name ?? selected.id}</h1>
    {/if}
  {/snippet}

  {#if selected}
    <!-- No PanelActions row: an Earth object has no entity action. Share is in the Panel bar. -->

    {#if panelGallery.length > 0}
      <PanelHeroImage
        src={panelGallery[0]}
        name={selected.name ?? selected.id}
        onOpen={() => (panelLightbox = panelGallery[0]!)}
      />
    {/if}

    <PanelTabRow
      tabs={[
        { id: 'overview', label: m.panel_tab_overview() },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: panelGallery.length > 0 },
        { id: 'learn', label: m.panel_tab_learn(), visible: panelHasLinks },
      ]}
      bind:active={panelTab}
    />

    {#if panelTab === 'overview'}
      <div class="grid">
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_alt()}<WhyPopover
              title={m.why_earth_altitude_title()}
              body={m.why_earth_altitude_body()}
              tab="orbits"
              section="orbit-regimes"
            />
          </div>
          <div class="cell-value">
            {m.earth_alt_km({
              value: formatNumber(
                selected.altitude_km ?? selected.earth_distance_km,
                localeFromPage(page),
              ),
            })}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_period()}<WhyPopover
              title={m.why_earth_period_title()}
              body={m.why_earth_period_body()}
              tab="orbits"
              section="keplers-laws"
            />
          </div>
          <div class="cell-value">
            {selected.period_min
              ? m.earth_period_min({ value: selected.period_min.toFixed(0) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">
            {m.earth_panel_inclination()}<WhyPopover
              title={m.why_earth_inclination_title()}
              body={m.why_earth_inclination_body()}
              tab="orbits"
              section="inclination"
            />
          </div>
          <div class="cell-value">
            {selected.inclination !== undefined
              ? m.earth_inclination_deg({ value: selected.inclination.toFixed(1) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_launched()}</div>
          <div class="cell-value">{selected.launched}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_count()}</div>
          <div class="cell-value">{selected.count}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_crew()}</div>
          <div class="cell-value">{selected.crew}</div>
        </div>
      </div>

      {#if selected.scale_fact}
        <div class="scale-fact" style:--accent={selected.color}>
          {selected.scale_fact}
        </div>
      {/if}

      {#if selected.description}
        <p class="editorial">{selected.description}</p>
      {/if}

      {#if missionIds.has(selected.id)}
        <a
          class="mission-link"
          href={localHref(`/missions?id=${selected.id}`)}
          data-testid="mission-card-link"
        >
          {m.mission_card_full()}
        </a>
      {/if}

      <!-- Historic-milestone cross-link to /science/history. Issue #303
           follow-up: closes the Sputnik orphan. ISS gets the
           "where it began" pointer to the 1957 launch that opened
           the orbital era. Per-id check keeps the pattern open for
           additional EarthObject → history mappings later. -->
      {#if selected.id === 'iss'}
        <!-- b2-keep: one contextual milestone link, not a list -->
        <a class="mission-link" href={localHref(`/science/history/sputnik-1957`)}>
          {m.surface_panel_historic_milestone()}
        </a>
      {/if}

      {#if scienceLinks.length > 0}
        <div class="science-section">
          <h3 class="library-heading">{m.panel_tab_science()}</h3>
          {#each scienceLinks as r (r.tab + r.section)}
            <ScienceCard tab={r.tab as ScienceTabId} section={r.section} expanded={false} />
          {/each}
        </div>
      {/if}

      {#if selected.credit}
        <div class="credit">{selected.credit}</div>
      {/if}
    {:else if panelTab === 'gallery'}
      {#if panelGallery.length === 0}
        <p class="empty-tab">{m.panel_gallery_empty()}</p>
      {:else}
        <PanelGalleryGrid
          images={panelGalleryGrid}
          gridLabel={m.panel_gallery_aria({ name: selected.name ?? selected.id })}
          thumbLabel={selected.name ?? selected.id}
          onOpen={(src) => (panelLightbox = src)}
        />
        <p class="gallery-credit">
          {panelGalleryCredit(selected.agencies?.join(' / '))}
        </p>
      {/if}
    {:else if panelTab === 'learn'}
      {#if !panelHasLinks}
        <p class="empty-tab">{m.panel_no_links()}</p>
      {:else}
        <PanelLinkTiers links={selected.links} entityId={selected.id} />
      {/if}
    {/if}
  {/if}
</Panel>

{#if cardSpec && cards}
  <cards.CardOverlay spec={cardSpec} open={cardOpen} onClose={() => (cardOpen = false)} />
{/if}

<PanelLightbox src={panelLightbox} images={panelGallery} onClose={() => (panelLightbox = null)} />

<style>
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
    border: 1px solid;
  }
  .status-active {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .status-retired {
    color: var(--color-text-label);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 14px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .scale-fact {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--accent, var(--color-accent));
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-size: var(--size-meta);
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }
  .mission-link {
    align-self: flex-start;
    display: inline-block;
    margin: 4px 0 10px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
    color: #fff;
    text-decoration: none;
    border-radius: 3px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    font-weight: 700;
    transition: all 0.15s;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    background: var(--color-accent-edge);
    border-color: var(--color-accent);
    outline: none;
  }
  .credit {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text-label);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }
  /* Detail-panel tabs / gallery / learn / lightbox CSS in src/lib/styles/panel-tabs.css (v0.1.10) */
</style>
