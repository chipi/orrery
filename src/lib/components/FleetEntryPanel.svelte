<script lang="ts">
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import Panel from './Panel.svelte';
  import Chip from './Chip.svelte';
  import PanelActions from './PanelActions.svelte';
  import AgencyRow from './AgencyRow.svelte';
  import { page } from '$app/state';
  import { assetUrl } from '$lib/asset-url';
  import {
    getBadges,
    getFleetIndex,
    getMission,
    getMissionGallery,
    getMissionIndex,
  } from '$lib/data';
  import { localeFromPage, localHref } from '$lib/locale';
  import type { CardSpec } from '$lib/cards/card-spec';
  import { fleetAliasMissionId } from '$lib/cards/card-alias';
  import { loadCardModules, type CardModules } from '$lib/cards/lazy-card';
  import type { Mission, MissionIndex } from '$types/mission';
  import type { FleetIndexEntry } from '$types/fleet';
  import { spacecraftDiagramPath, launcherCutawayPath } from '$lib/spacecraft-diagrams';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { track, trackGalleryImageOpen } from '$lib/analytics';
  import type { FleetEntry, FleetSiteLink } from '$types/fleet';
  import type { ScienceTabId } from '$types/science';
  import ScienceCard from './ScienceCard.svelte';
  import LauncherFlightsWidget from '$lib/components/launches/LauncherFlightsWidget.svelte';
  import { MissionOrbitIcon } from '$lib/components/icons';
  import * as m from '$lib/paraglide/messages';
  import { countryLabel } from '$lib/country-label';
  import { epochLabel } from '$lib/epoch-label';
  import { fleetSpecRows } from '$lib/fleet-spec-rows';
  import { fleetStatusLabel } from '$lib/status-label';
  import MuseumsForObject from './MuseumsForObject.svelte';
  import VideoThumb from './VideoThumb.svelte';
  import { getVideosForEntity, type VideoProvenanceEntry } from '$lib/video-provenance';
  import {
    launchersForEngine,
    enginesForLauncher,
    scienceSlugForCycle,
    type EngineCycle,
  } from '$lib/physics/propulsion/engine-registry';
  import { dataLoadFailed } from '$lib/data/core';

  /**
   * Fleet detail panel. Six tabs (OVERVIEW / GALLERY / ANATOMY / CREW /
   * MISSIONS / LEARN) per PRD-012 v0.2; tabs render conditionally based
   * on what the entry actually has (skeleton entries from Phase A only
   * have OVERVIEW + LEARN populated; later phases progressively unlock
   * GALLERY, ANATOMY, CREW, MISSIONS).
   *
   * Cloned/streamlined from StationModulePanel.svelte (RFC-016 OQ-4) so
   * station-specific concerns (microgravity-axes, station context links)
   * stay out. A unified EntityDetailPanel refactor is tracked for v0.7+.
   */

  // ANATOMY+LEARN and MISSIONS+CREW are each merged into one tab now, so the
  // 'crew' / 'learn' tab values are retired.
  type Tab = 'overview' | 'gallery' | 'anatomy' | 'missions';

  type Props = {
    entry: FleetEntry | null;
    open: boolean;
    onClose: () => void;
    galleryFetcher: (id: string) => Promise<string[]>;
    /** All fleet ids present in the index — cross-links only linkify known ids. */
    knownIds?: Set<string>;
    /** Open another fleet entry in-place (engine ↔ launcher cross-navigation). */
    onNavigate?: (id: string) => void;
  };
  let { entry, open, onClose, galleryFetcher, knownIds, onNavigate }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  let badges = $state<Record<string, string>>({});
  let lastId = $state<string | null>(null);
  let lightboxSrc = $state<string | null>(null);
  // PRD-031 / RFC-033 S2 — linked videos interleaved into the fleet gallery.
  let videos = $state<VideoProvenanceEntry[]>([]);
  let playerVideo = $state<VideoProvenanceEntry | null>(null);
  // #547 S4 — the collectible card. Entries that ARE missions (shared id,
  // e.g. Perseverance) alias to the canonical MISSION card; the rest get a
  // FLEET card numbered against the fleet index.
  let cardOpen = $state(false);
  let fleetIndex = $state<FleetIndexEntry[]>([]);
  let missionIndex = $state<MissionIndex[]>([]);
  let aliasMission = $state<Mission | null>(null);
  // The canonical mission's OWN blessed hero — an aliased card must show
  // the same picture as the mission card everywhere (the fleet gallery's
  // lead can be a different photo of the same craft).
  let aliasHero = $state<string | undefined>(undefined);
  // True until the alias question is answered for the current entry — no
  // card derives meanwhile, so an aliased entry never flashes a fleet-typed
  // card while its mission record is in flight.
  let aliasPending = $state(false);
  // The card code loads on demand (lazy-card.ts): fetched when an entry opens.
  let cards = $state<CardModules | null>(null);
  $effect(() => {
    if (entry && !cards)
      void loadCardModules().then(
        (c) => (cards = c),
        () => {},
      );
  });
  let cardSpec = $derived<CardSpec | null>(
    !entry || aliasPending || !cards
      ? null
      : aliasMission
        ? cards.spec.cardForMission(aliasMission, missionIndex, aliasHero)
        : // Wait for the index before deriving a fleet card — an empty index
          // would flash a '—/0' collection number on first open.
          fleetIndex.length === 0
          ? null
          : cards.spec.cardForFleet(
              entry,
              fleetIndex,
              gallery[0],
              spacecraftDiagramPath(entry.id) ?? launcherCutawayPath(entry.id) ?? undefined,
            ),
  );

  $effect(() => {
    if (entry && entry.id !== lastId) {
      tab = 'overview';
      lastId = entry.id;
      lightboxSrc = null;
      gallery = [];
      videos = [];
      playerVideo = null;
      // Umami custom event: which fleet entries earn the click. /fleet
      // is a v0.6 launch route; this tells us which of the ~137 entries
      // pull engagement.
      track('fleet-entry-view', { id: entry.id, category: entry.category });
      void getBadges()
        .then((b) => (badges = b))
        .catch(dataLoadFailed);
      void galleryFetcher(entry.id)
        .then((urls) => {
          if (entry && entry.id === lastId) gallery = urls;
        })
        .catch(dataLoadFailed);
      void getVideosForEntity(entry.id)
        .then((v) => {
          if (entry && entry.id === lastId) videos = v;
        })
        .catch(dataLoadFailed);
      // #547 S4 — card numbering + mission-alias resolution.
      cardOpen = false;
      aliasMission = null;
      aliasHero = undefined;
      aliasPending = true;
      const forId = entry.id;
      void (async () => {
        // On a thrown fetch aliasPending stays true → CTA absent; clearing
        // it in a finally would mislabel an aliased entry as a fleet card.
        try {
          if (fleetIndex.length === 0) fleetIndex = await getFleetIndex();
          if (missionIndex.length === 0) missionIndex = await getMissionIndex();
          const stillCurrent = () => entry != null && entry.id === lastId && forId === lastId;
          const aliasId = fleetAliasMissionId(forId, missionIndex);
          if (!aliasId) {
            if (stillCurrent()) aliasPending = false;
            return;
          }
          const row = missionIndex.find((mi) => mi.id === aliasId)!;
          const [mission, missionGallery] = await Promise.all([
            getMission(aliasId, row.dest, localeFromPage(page)),
            getMissionGallery(aliasId).catch(() => [] as string[]),
          ]);
          if (stillCurrent()) {
            aliasMission = mission;
            aliasHero = missionGallery[0];
            aliasPending = false;
          }
        } catch {
          /* flaky fetch — aliasPending stays true, the card CTA stays absent */
        }
      })();
    }
  });

  // ANATOMY tab gates on whether a /diagrams/spacecraft/{id}.svg exists —
  // reuses the manifest from the station-visitor anatomy work
  // (RFC-016 OQ-13: same path, /fleet IDs added to SPACECRAFT_DIAGRAMS
  // as new SVGs land in Phase F).
  let diagramPath = $derived(entry ? spacecraftDiagramPath(entry.id) : null);
  let hasDiagram = $derived(diagramPath !== null);
  // Exploded-stage watercolor cutaway — a richer companion to the pencil
  // anatomy, shown alongside it in the DETAIL tab for launch vehicles.
  let cutawayPath = $derived(entry ? launcherCutawayPath(entry.id) : null);
  // Opened on a drawing, the viewer steps through the craft's drawings, not the photo gallery.
  let drawings = $derived([diagramPath, cutawayPath].filter((p): p is string => !!p));
  let lightboxImages = $derived(lightboxSrc && drawings.includes(lightboxSrc) ? drawings : gallery);

  // Upgrade the pencil anatomy + exploded cutaway to their responsive WebP
  // ladders once the manifest loads; plain webp until then / when no ladder
  // exists (RFC-030 Slice 3, mirrors PanelHeroImage).
  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);
  let diagramLadder = $derived(ladderReady && diagramPath ? ladderSources(diagramPath) : null);
  let cutawayLadder = $derived(ladderReady && cutawayPath ? ladderSources(cutawayPath) : null);

  let hasGallery = $derived(gallery.length > 0);
  let hasVideos = $derived(videos.length > 0);
  let hasFlights = $derived((entry?.flights?.length ?? 0) > 0);
  // Mission-link CTA on OVERVIEW renders whenever there's at least
  // one linked mission. MISSIONS tab is shown only when there are
  // 2+ — the single-mission case is fully served by the
  // .spec-cta--mission button (which direct-links to that one
  // mission), so showing a tab containing a list-of-one would just
  // duplicate the CTA (2026-06-15 user note: "when we have 1
  // mission only, I don't think we need missions tab?").
  let hasAnyMission = $derived((entry?.linked_missions?.length ?? 0) > 0);
  let hasMissions = $derived((entry?.linked_missions?.length ?? 0) > 1);
  let hasLinks = $derived((entry?.links?.length ?? 0) > 0);

  let linksByTier = $derived.by(() => {
    const out = {
      intro: [] as NonNullable<FleetEntry['links']>,
      core: [] as NonNullable<FleetEntry['links']>,
      deep: [] as NonNullable<FleetEntry['links']>,
    };
    for (const link of entry?.links ?? []) out[link.t].push(link);
    return out;
  });

  // Spec grid rows, shared with the /fleet/<id> page.
  let specRows = $derived(entry ? fleetSpecRows(entry) : []);

  // PRD-032 — engine ↔ launcher graph, derived from launcher-engines.ts.
  const isEngine = $derived(entry?.category === 'engine');
  const engineLaunchers = $derived(isEngine && entry ? launchersForEngine(entry.id) : []);
  const launcherEngines = $derived(
    entry?.category === 'launcher' && entry ? enginesForLauncher(entry.id) : [],
  );
  // Every engine illustrates the two propulsion primers; per-engine `science`
  // slugs (from the registry, PRD-032) append the specific topics that engine
  // demonstrates — e.g. staged-combustion cycle, the rocket equation. Deduped;
  // primers first. Labels here mirror the science-card titles.
  const SCIENCE_LABELS: Record<string, () => string> = {
    'propulsion/engine-types': m.fleet_sci_engine_types,
    'propulsion/thrust-and-twr': m.fleet_sci_twr,
    'propulsion/specific-impulse': m.fleet_spec_isp,
    'propulsion/tsiolkovsky': m.chip_label_tsiolkovsky,
    'propulsion/fuels-and-oxidizers': m.fleet_sci_fuels,
    'propulsion/gas-generator': m.fleet_sci_gas_generator,
    'propulsion/staged-combustion': m.fleet_sci_staged,
    'propulsion/expander-cycle': m.fleet_sci_expander,
  };
  const ENGINE_SCIENCE_PRIMERS = ['propulsion/engine-types', 'propulsion/thrust-and-twr'];
  const engineScience = $derived.by(() => {
    // Two primers + this engine's power-cycle card (derived from specs.cycle,
    // PRD-032 Phase 2) + any explicit registry science topics. Deduped.
    const cycleSlug = entry?.specs?.cycle
      ? scienceSlugForCycle(String(entry.specs.cycle) as EngineCycle)
      : null;
    const seen = new Set<string>();
    const out: { slug: string; label: string }[] = [];
    for (const slug of [...ENGINE_SCIENCE_PRIMERS, cycleSlug, ...(entry?.science ?? [])]) {
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push({ slug, label: SCIENCE_LABELS[slug]?.() ?? slug.split('/').pop()! });
    }
    return out;
  });

  function siteRoute(ls: FleetSiteLink): string {
    if (ls.type === 'moon') return localHref(`/moon?site=${encodeURIComponent(ls.site_id)}`);
    if (ls.type === 'mars') return localHref(`/mars?site=${encodeURIComponent(ls.site_id)}`);
    return localHref(`/earth?id=${encodeURIComponent(ls.site_id)}`);
  }

  // Per-category label: landers/rovers say "Landing site"; orbiters
  // + stations say "In <body> orbit"; the body name is the linked
  // type (moon / mars / earth-object). Falls back to a generic
  // "Operating site" for any future category we haven't enumerated.
  // Per Marko's #311 Tier H ask: surface the kind of relationship,
  // not just the link target.
  function categoryRole(category: string | undefined): 'surface' | 'orbital' | 'generic' {
    if (category === 'lander' || category === 'rover') return 'surface';
    if (category === 'orbiter' || category === 'station' || category === 'observatory')
      return 'orbital';
    return 'generic';
  }

  function bodyLabel(type: string): string {
    if (type === 'moon') return m.lab_body_moon();
    if (type === 'mars') return m.lab_body_mars();
    return m.lab_body_earth();
  }

  function siteLabel(ls: FleetSiteLink): string {
    const role = categoryRole(entry?.category);
    const body = bodyLabel(ls.type);
    if (role === 'surface') return `${m.surface_landing_site()} · ${body} · ${ls.site_id}`;
    if (role === 'orbital') return `${m.fleet_in_orbit({ body })} · ${ls.site_id}`;
    return `${body} · ${ls.site_id}`;
  }

  function siteSectionHeading(): string {
    const role = categoryRole(entry?.category);
    if (role === 'surface') return m.surface_landing_site();
    if (role === 'orbital') return m.fleet_operating_orbit();
    return m.fleet_operating_sites();
  }
</script>

<!-- grabFocus={false}: keep focus on the triggering fleet card so the
     grid's arrow-key nav keeps working immediately after the first open. -->
<Panel
  {open}
  {onClose}
  grabFocus={false}
  title={entry?.name ?? entry?.id ?? ''}
  onShare={cardSpec ? () => (cardOpen = true) : undefined}
>
  {#snippet eyebrow()}
    {#if entry}
      <AgencyRow agency={entry.agency}>
        <span class="status status-{entry.status.toLowerCase()}">
          {fleetStatusLabel(entry.status)}
        </span>
        <span class="category-chip">{entry.category}</span>
      </AgencyRow>
    {/if}
  {/snippet}
  {#snippet heading()}
    {#if entry}
      <div class="name-row">
        <h1 class="name">{entry.name}</h1>
        {#if badges[`fleet:${entry.id}`]}
          <img
            class="panel-badge"
            src={assetUrl(badges[`fleet:${entry.id}`])}
            alt=""
            decoding="async"
          />
        {/if}
      </div>
    {/if}
  {/snippet}

  {#if entry}
    <div class="head">
      {#if entry.tagline ?? entry.best_known_for}
        <p class="tagline">{entry.tagline ?? entry.best_known_for}</p>
      {/if}
    </div>

    {#if entry.explorer_route}
      <PanelActions>
        <Chip
          kind="link"
          href={localHref(`${entry.explorer_route}?id=${entry.id}`)}
          data-sveltekit-preload-data="hover">{m.fleet_open_explorer({ name: entry.name })}</Chip
        >
      </PanelActions>
    {/if}

    {#if hasGallery}
      <PanelHeroImage
        src={gallery[0]}
        name={entry.name}
        ariaLabel={m.fleet_view_hero_aria({ name: entry.name })}
        heroClass="fleet-hero"
        onOpen={() => {
          lightboxSrc = gallery[0]!;
          trackGalleryImageOpen('fleet', entry.id, 0);
        }}
      />
    {/if}

    <!-- Tab order: OVERVIEW · MISSIONS (cond) · GALLERY · ANATOMY · CREW
         · LEARN. MISSIONS sits 2nd whenever the vehicle has linked
         missions, so the "what has actually flown on this" surface is
         the user's first follow-on after the overview (2026-06-17 user
         direction: "on fly details, can we get missions tab to be
         second when available"). -->
    <!-- MISSIONS + CREW merged (user direction): crewed vehicles show their flights + crew rosters under "CREW"; everything else shows the linked-mission list under "MISSIONS". Hidden when neither. -->
    <!-- ANATOMY + LEARN merged (user direction) to keep the tab row from overflowing. Shows the diagram (if any) then the tiered links. -->
    <PanelTabRow
      rowClass="tabs fleet-tabs"
      tabs={[
        { id: 'overview', label: m.panel_tab_overview(), audioStage: 'fleet-tab-overview' },
        {
          id: 'missions',
          label: hasFlights ? m.panel_tab_crew() : m.panel_tab_missions(),
          visible: hasMissions || hasFlights,
          audioStage: 'fleet-tab-missions',
        },
        { id: 'gallery', label: m.panel_tab_gallery(), visible: hasGallery || hasVideos },
        {
          id: 'anatomy',
          label: m.panel_tab_detail(),
          visible: hasDiagram || !!cutawayPath || hasLinks,
          audioStage: 'fleet-tab-anatomy',
        },
      ]}
      bind:active={tab}
    />

    <div class="tab-body">
      {#if tab === 'overview'}
        {#if entry.dispatch}
          <p class="dispatch">{entry.dispatch}</p>
        {/if}
        <MuseumsForObject objectRef={entry.id} />

        <!-- Fleet -> Mission back-link CTA. Mirrors the Vehicle +
             Payload CTAs on /missions panel so the cross-page
             navigation is symmetric (2026-06-15 user direction:
             "make feedback from fleet to mission as we have from
             mission to fleet with same style buttons"). Label adapts
             to cardinality: 1 mission -> direct deep-link with the
             mission ID; N missions -> tab switcher to the MISSIONS
             tab. 0 missions -> nothing rendered (consistent with the
             MISSIONS tab being auto-hidden for those entries). -->
        {#if hasAnyMission}
          {@const missionIds = entry.linked_missions ?? []}
          {#if missionIds.length === 1}
            <!-- b1-keep: navigation cards (label + value), not actions -->
            <div class="mission-cta-bar">
              <a
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--mission"
                href={localHref(`/missions?id=${missionIds[0]}`)}
                data-testid="fleet-mission-cta-single"
                data-sveltekit-preload-data="hover"
              >
                <span class="spec-icon" aria-hidden="true">
                  <MissionOrbitIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.fleet_mission_cta_label()}</span>
                  <span class="spec-value">{missionIds[0]}</span>
                </span>
              </a>
            </div>
          {:else}
            <!-- b1-keep: navigation cards (label + value), not actions -->
            <div class="mission-cta-bar">
              <button
                type="button"
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--mission"
                onclick={() => (tab = 'missions')}
                data-testid="fleet-mission-cta-multi"
              >
                <span class="spec-icon" aria-hidden="true">
                  <MissionOrbitIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.panel_tab_missions()}</span>
                  <span class="spec-value"
                    >{m.fleet_missions_count({ count: missionIds.length })}</span
                  >
                </span>
              </button>
            </div>
          {/if}
        {/if}

        {#if entry.description}
          <p class="description">{entry.description}</p>
        {/if}

        <dl class="spec-grid">
          <div class="spec">
            <dt>{m.card_stat_builder()}</dt>
            <dd>{entry.manufacturer}</dd>
          </div>
          <div class="spec">
            <dt>{m.card_stat_country()}</dt>
            <dd>{countryLabel(entry.country)}</dd>
          </div>
          <div class="spec">
            <dt>{m.fleet_first_flight()}</dt>
            <dd>
              {entry.first_flight === 'planned' ? m.fleet_value_planned() : entry.first_flight}
            </dd>
          </div>
          {#if entry.last_flight}
            <div class="spec">
              <dt>{m.fleet_last_flight()}</dt>
              <dd>{entry.last_flight}</dd>
            </div>
          {/if}
          <div class="spec">
            <dt>{m.card_stat_era()}</dt>
            <dd>
              {entry.era === 'planned'
                ? m.fleet_value_planned()
                : entry.era.replace('now', m.programs_meta_now())}
            </dd>
          </div>
          <div class="spec">
            <dt>{m.fleet_label_epoch()}</dt>
            <dd>{epochLabel(entry.epoch)}</dd>
          </div>
          {#each specRows as row (row.key)}
            <div class="spec">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          {/each}
        </dl>

        <!-- PRD-032 — engine ↔ launcher cross-reference (the workhorse graph). -->
        {#if isEngine && engineLaunchers.length > 0}
          <h3 class="section-h">{m.fleet_used_on()}</h3>
          <ul class="xref-list">
            {#each engineLaunchers as v (v.launcherId)}
              <li>
                {#if knownIds?.has(v.launcherId) && onNavigate}
                  <button
                    type="button"
                    class="xref-link ui-hit"
                    onclick={() => onNavigate?.(v.launcherId)}
                  >
                    {v.launcherName}
                  </button>
                {:else}
                  <span class="xref-link xref-link--plain">{v.launcherName}</span>
                {/if}
                <span class="xref-sub">{v.stages.join(' · ')}</span>
              </li>
            {/each}
          </ul>
          <h3 class="section-h">{m.fleet_entry_learn_science()}</h3>
          <ul class="xref-list">
            {#each engineScience as s (s.slug)}
              <li>
                <a
                  class="xref-link ui-hit"
                  href={localHref(`/science/${s.slug}`)}
                  data-sveltekit-preload-data="hover">{s.label} →</a
                >
              </li>
            {/each}
          </ul>
        {/if}

        {#if entry.category === 'launcher' && launcherEngines.length > 0}
          <h3 class="section-h">{m.fleet_engines_heading()}</h3>
          <ul class="xref-list">
            {#each launcherEngines as e (e.id)}
              <li>
                {#if onNavigate}
                  <button type="button" class="xref-link ui-hit" onclick={() => onNavigate?.(e.id)}>
                    {e.name}
                  </button>
                {:else}
                  <span class="xref-link xref-link--plain">{e.name}</span>
                {/if}
                <span class="xref-sub">{e.best_known_for}</span>
              </li>
            {/each}
          </ul>
        {/if}

        {#if entry.linked_sites && entry.linked_sites.length > 0}
          <h3 class="section-h">{siteSectionHeading()}</h3>
          <ul class="site-list">
            {#each entry.linked_sites as ls (ls.type + ls.site_id)}
              <li>
                <a class="site-link" href={siteRoute(ls)} data-sveltekit-preload-data="hover">
                  {siteLabel(ls)} →
                </a>
              </li>
            {/each}
          </ul>
        {/if}

        <!-- Flights widget mounts for every fleet entry. The widget
             self-hides when there are no matches in launches.json so
             entries without manifest coverage (today: most spacecraft
             outside the SpaceX / Arianespace / Long March / H3 set)
             stay silent without UI noise. Cross-reference gap tracked
             separately — see commit message. -->
        <!-- Science articles named in the entry's data (suits today); engines list
             theirs, with the cycle primers, under DETAIL instead. -->
        {#if entry.category !== 'engine' && entry.science?.length}
          <h3 class="section-h">{m.fleet_entry_learn_science()}</h3>
          {#each entry.science as slug (slug)}
            <ScienceCard tab={slug.split('/')[0] as ScienceTabId} section={slug.split('/')[1]!} />
          {/each}
        {/if}

        <LauncherFlightsWidget launcherId={entry.id} />

        <p class="credit">{entry.credit}</p>
      {:else if tab === 'gallery'}
        {#if hasGallery || hasVideos}
          <PanelGalleryGrid
            images={gallery.slice(1)}
            thumbLabel={m.fleet_view_photo_aria()}
            gridClass="fleet-gallery"
            thumbClass="thumb fleet-photo"
            onOpen={(src) => {
              lightboxSrc = src;
              trackGalleryImageOpen('fleet', entry.id);
            }}
          >
            {#snippet leading()}
              {#each videos as v (v.id)}
                <VideoThumb video={v} onOpen={(vv) => (playerVideo = vv)} />
              {/each}
            {/snippet}
            {#snippet trailing()}
              <!-- Only entries badges.json lists have an insignia; requesting the file
                   for every entry 404ed for most of them on prod. -->
              {@const badgeSrc = badges[`fleet:${entry.id}`]}
              {#if badgeSrc}
                {#key entry.id}
                  <button
                    type="button"
                    class="thumb badge-thumb"
                    onclick={() => (lightboxSrc = assetUrl(badgeSrc))}
                    aria-label={m.fleet_insignia_aria({ name: entry.name })}
                  >
                    <img src={assetUrl(badgeSrc)} alt="" decoding="async" />
                    <span class="badge-tag">{m.fleet_insignia_tag()}</span>
                  </button>
                {/key}
              {/if}
            {/snippet}
          </PanelGalleryGrid>
        {/if}
      {:else if tab === 'anatomy' && (diagramPath || cutawayPath || hasLinks)}
        {#if diagramPath}
          <div class="anatomy">
            <button
              type="button"
              class="anatomy-open"
              onclick={() => (lightboxSrc = diagramPath)}
              aria-label={m.fleet_anatomy_open_aria({ name: entry.name })}
            >
              {#if diagramLadder}
                <img
                  src={diagramLadder.src}
                  srcset={diagramLadder.srcset}
                  sizes="(max-width: 640px) 100vw, 640px"
                  alt={m.fleet_anatomy_alt({ name: entry.name })}
                  loading="lazy"
                  decoding="async"
                />
              {:else}
                <img
                  src={diagramPath}
                  alt={m.fleet_anatomy_alt({ name: entry.name })}
                  loading="lazy"
                  decoding="async"
                />
              {/if}
            </button>
            <p class="anatomy-caption">{m.fleet_anatomy_caption()}</p>
          </div>
        {/if}
        {#if cutawayPath}
          <div class="anatomy">
            <button
              type="button"
              class="anatomy-open"
              onclick={() => (lightboxSrc = cutawayPath)}
              aria-label={m.fleet_cutaway_open_aria({ name: entry.name })}
            >
              {#if cutawayLadder}
                <img
                  src={cutawayLadder.src}
                  srcset={cutawayLadder.srcset}
                  sizes="(max-width: 640px) 100vw, 640px"
                  alt={m.fleet_cutaway_alt({ name: entry.name })}
                  loading="lazy"
                  decoding="async"
                />
              {:else}
                <img
                  src={cutawayPath}
                  alt={m.fleet_cutaway_alt({ name: entry.name })}
                  loading="lazy"
                  decoding="async"
                />
              {/if}
            </button>
            <p class="anatomy-caption">{m.fleet_exploded_caption()}</p>
          </div>
        {/if}
        {#if hasLinks}
          <ul class="links">
            {#if linksByTier.intro.length > 0}
              <li class="tier">
                <h4>{m.panel_links_intro()}</h4>
                <ul>
                  {#each linksByTier.intro as link (link.u)}
                    <li>
                      <a href={link.u} target="_blank" rel="noopener noreferrer external">
                        {link.l}
                      </a>
                    </li>
                  {/each}
                </ul>
              </li>
            {/if}
            {#if linksByTier.core.length > 0}
              <li class="tier">
                <h4>{m.panel_links_core()}</h4>
                <ul>
                  {#each linksByTier.core as link (link.u)}
                    <li>
                      <a href={link.u} target="_blank" rel="noopener noreferrer external">
                        {link.l}
                      </a>
                    </li>
                  {/each}
                </ul>
              </li>
            {/if}
            {#if linksByTier.deep.length > 0}
              <li class="tier">
                <h4>{m.panel_links_deep()}</h4>
                <ul>
                  {#each linksByTier.deep as link (link.u)}
                    <li>
                      <a href={link.u} target="_blank" rel="noopener noreferrer external">
                        {link.l}
                      </a>
                    </li>
                  {/each}
                </ul>
              </li>
            {/if}
          </ul>
        {/if}
      {:else if tab === 'missions' && (hasMissions || hasFlights)}
        {#if hasFlights}
          <ul class="flights">
            {#each entry.flights ?? [] as flight (flight.mission_id)}
              <li class="flight">
                <header class="flight-head">
                  <span class="flight-designation">{flight.flight_designation}</span>
                  <a
                    class="mission-link"
                    href={localHref(`/missions?id=${flight.mission_id}`)}
                    data-sveltekit-preload-data="hover"
                  >
                    {m.fleet_flight_mission_link()}
                  </a>
                </header>
                {#if flight.patch_path}
                  <img
                    class="patch"
                    src={flight.patch_path}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
                {#if flight.crew && flight.crew.length > 0}
                  <ul class="crew-grid">
                    {#each flight.crew as crew (crew.name)}
                      <li class="crew-card">
                        {#if crew.portrait_path}
                          <img src={crew.portrait_path} alt="" loading="lazy" decoding="async" />
                        {:else}
                          <div class="crew-portrait-empty" aria-hidden="true">—</div>
                        {/if}
                        <span class="crew-name">{crew.name}</span>
                        <span class="crew-role">{crew.role}</span>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <ul class="missions-list">
            {#each entry.linked_missions ?? [] as mid (mid)}
              <li>
                <a
                  class="mission-link"
                  href={localHref(`/missions?id=${mid}`)}
                  data-sveltekit-preload-data="hover"
                >
                  {mid}
                  <span class="mission-arrow">→</span>
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

{#if cardSpec && cards}
  <cards.CardOverlay spec={cardSpec} open={cardOpen} onClose={() => (cardOpen = false)} />
{/if}

<PanelLightbox src={lightboxSrc} images={lightboxImages} onClose={() => (lightboxSrc = null)} />

<!-- Loaded when a clip opens: a static import kept /fleet over its JS budget in the prod build. -->
{#if playerVideo}
  {#await import('./MediaPlayer.svelte') then { default: MediaPlayer }}
    <MediaPlayer video={playerVideo} onClose={() => (playerVideo = null)} />
  {/await}
{/if}

<style>
  .head {
    padding: 12px 16px 4px;
  }
  /* The head ends with 4 px padding; the other panels leave 12 px above the action row. */
  .head + :global(.panel-actions) {
    margin-top: 8px;
  }
  /* .agency-row / .agency-badge / .status base now from AgencyRow.svelte;
     status chips converted from filled to the shared bordered treatment. */
  .status-active {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .status-flown {
    color: var(--color-state);
    border-color: var(--color-accent-edge);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  }
  .status-retired {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.4);
    background: rgba(255, 200, 80, 0.08);
  }
  .status-failed {
    color: #ff6b3a;
    border-color: rgba(193, 68, 14, 0.4);
    background: rgba(193, 68, 14, 0.08);
  }
  .status-planned {
    color: rgba(255, 255, 255, 0.78);
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.06);
  }
  .category-chip {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
  }

  .name {
    margin: 8px 0 4px;
    font-family: 'Bebas Neue', system-ui, sans-serif;
    font-size: 28px;
    letter-spacing: 0.02em;
    color: #fff;
  }
  .tagline {
    margin: 0 0 6px;
    font-size: var(--size-lead);
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
  }

  :global(.panel-hero.fleet-hero) {
    margin: 4px 0 8px;
    aspect-ratio: 16 / 9;
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
  }
  :global(.fleet-hero .panel-hero-btn) {
    width: 100%;
    height: 100%;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  :global(.fleet-hero .panel-hero-btn img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* Tab base styles inherited from src/lib/styles/panel-tabs.css —
     matches the rest of the detail-panel family. Fleet keeps its
     accent blue on the active-tab indicator as a category cue. */
  :global(.tabs.fleet-tabs button.active) {
    color: var(--color-state);
    border-bottom-color: var(--color-accent);
  }

  .tab-body {
    padding: 14px 16px 20px;
  }

  /* Fleet -> Mission back-link CTA. Mirrors the .spec-cta system on
     /missions MissionPanel.svelte. Third blue in the same family:
     vehicle = #0c1660 (darkest), payload = var(--color-accent) (lightest),
     mission = #1f4ca8 (mid). Lives on a different panel so the three
     never appear together; the modifier color exists for sibling
     identity, not for in-panel disambiguation. Both <a> (single
     mission) and <button> (multi-mission tab-switcher) share the
     base class so the chrome is identical regardless of element. */
  .mission-cta-bar {
    margin: 0 0 14px;
  }
  .spec-cta {
    width: 100%;
    min-height: 48px;
    padding: 10px 12px;
    border-radius: 4px;
    color: #fff;
    font-family: var(--font-mono, 'Space Mono', monospace);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    transition:
      background 120ms,
      border-color 120ms;
    background: transparent;
  }
  .spec-cta--mission {
    background: #1f4ca8;
    border: 1px solid rgba(100, 150, 240, 0.6);
  }
  .spec-cta--mission:hover,
  .spec-cta--mission:focus-visible {
    background: #2a5ec8;
    border-color: #6090f0;
    outline: none;
  }
  .spec-cta--mission .spec-icon,
  .spec-cta--mission .spec-label {
    color: rgba(200, 220, 255, 0.9);
  }
  .spec-cta .spec-icon {
    flex: 0 0 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spec-cta .spec-text {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
    text-align: left;
  }
  .spec-cta .spec-label {
    font-size: var(--size-label);
    letter-spacing: 2.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .spec-cta .spec-value {
    font-size: 12px;
    line-height: 1.25;
    letter-spacing: 0.4px;
    font-weight: 400;
    color: #fff;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
  }
  /* Reset native button defaults so the <button> variant for the
     multi-mission tab-switcher looks identical to the <a> single
     variant. */
  button.spec-cta {
    border-style: solid;
    appearance: none;
    text-align: left;
  }

  /* Editorial lead paragraph (PRD-029 dispatch — innovation + purpose). Reads
     as a magazine standfirst: prominent roman serif, brighter than the italic
     .description below, set apart by a hairline. Matches MissionPanel. */
  .dispatch {
    font-size: var(--size-lead);
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .description {
    margin: 0 0 14px;
    font-size: var(--size-lead);
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.5;
  }

  .spec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px 12px;
    margin: 0 0 14px;
    padding: 0;
  }
  .spec {
    margin: 0;
  }
  .spec dt {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-label);
    margin-bottom: 1px;
  }
  .spec dd {
    margin: 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: #fff;
    word-break: break-word;
  }

  .section-h {
    margin: 14px 0 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-label);
    font-weight: normal;
  }
  /* PRD-032 — engine ↔ launcher cross-reference list. */
  .xref-list {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .xref-list li {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 8px;
  }
  .xref-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 13px;
    color: #e8734a;
    cursor: pointer;
    text-align: left;
    text-decoration: none;
  }
  .xref-link:hover,
  .xref-link:focus-visible {
    text-decoration: underline;
  }
  .xref-link--plain {
    color: #fff;
    cursor: default;
    text-decoration: none;
  }
  .xref-sub {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text-label);
  }
  .site-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .site-link,
  .mission-link {
    display: inline-block;
    color: var(--color-state);
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    transition: background 0.15s;
  }
  .site-link:hover,
  .mission-link:hover {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    text-decoration: underline;
  }
  .mission-arrow {
    margin-left: 6px;
    color: var(--color-state);
  }

  .credit {
    margin: 16px 0 0;
    font-size: var(--size-meta);
    color: var(--color-text-label);
    line-height: 1.5;
  }

  :global(.gallery-grid.fleet-gallery) {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 6px;
  }
  .thumb,
  :global(.fleet-gallery .fleet-photo) {
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
    aspect-ratio: 4 / 3;
    overflow: hidden;
  }
  .thumb img,
  :global(.fleet-gallery .fleet-photo img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .anatomy {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 12px;
    text-align: center;
  }
  .anatomy-open {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
  }
  .anatomy img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .anatomy-caption {
    margin: 8px 0 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic; /* a1-keep: caption */
    font-size: var(--size-caption);
    color: rgba(255, 255, 255, 0.5);
  }

  .flights {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .flight {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 10px;
  }
  .flight-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .flight-designation {
    font-family: 'Bebas Neue', system-ui, sans-serif;
    font-size: 16px;
    color: #fff;
  }
  .patch {
    width: 90px;
    height: 90px;
    object-fit: contain;
    margin-bottom: 8px;
  }
  .crew-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 8px;
  }
  .crew-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  }
  .crew-card img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 50%;
  }
  .crew-portrait-empty {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 18px;
  }
  .crew-name {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: #fff;
    line-height: 1.2;
  }
  .crew-role {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text-label);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .missions-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .links {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tier {
    margin-bottom: 12px;
  }
  .tier h4 {
    margin: 0 0 4px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-label);
    font-weight: normal;
  }
  .tier ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tier ul a {
    color: var(--color-accent);
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .tier ul a:hover {
    text-decoration: underline;
  }
</style>
