<script lang="ts">
  import PanelLinkTiers from './PanelLinkTiers.svelte';
  import PanelGalleryGrid from './PanelGalleryGrid.svelte';
  import PanelTabRow from './PanelTabRow.svelte';
  import PanelHeroImage from './PanelHeroImage.svelte';
  import PanelLightbox from './PanelLightbox.svelte';
  import Panel from './Panel.svelte';
  import Chip from './Chip.svelte';
  import PanelActions from './PanelActions.svelte';
  import AgencyRow from './AgencyRow.svelte';
  import { page } from '$app/state';
  import { assetOrigin, assetUrl } from '$lib/asset-url';
  import { trackMissionView, trackGalleryImageOpen } from '$lib/analytics';
  import { getMissionGallery, getMarsSites, getMoonSites, getBadges } from '$lib/data';
  import { getMissionIndex } from '$lib/data/missions';
  import type { CardSpec } from '$lib/cards/card-spec';
  import { loadCardModules, type CardModules } from '$lib/cards/lazy-card';
  import type { MissionIndex } from '$types/mission';
  import type { SurfaceSite } from '$types/surface-site';
  import { formatNumber } from '$lib/format';
  import { localeFromPage, localHref } from '$lib/locale';
  import type { Mission } from '$types/mission';
  import * as m from '$lib/paraglide/messages';
  import { missionStatusLabel } from '$lib/status-label';
  import { missionGalleryCredit } from '$lib/image-credits';
  import MediaPlayer from './MediaPlayer.svelte';
  import VideoThumb from './VideoThumb.svelte';
  import { getVideosForEntity, type VideoProvenanceEntry } from '$lib/video-provenance';
  import ScienceChip from './ScienceChip.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import { pickScienceLinks, rankMissionScience } from '$lib/science-links';
  import WhyPopover from './WhyPopover.svelte';
  import { VehicleIcon, SpacecraftIcon, TrajectoryArrowIcon } from '$lib/components/icons';
  import type { ScienceTabId } from '$types/science';
  import { dataLoadFailed } from '$lib/data/core';
  import {
    getInterstellarCraft,
    hasTrajectory,
    type InterstellarCraft,
  } from '$lib/data/interstellar';
  import { INTERSTELLAR_CRAFT } from '$lib/explore/paths-legend';
  import MissionMessageSection from './MissionMessageSection.svelte';
  import { missionBlueprint } from '$lib/blueprints';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';

  // The former LEARN tab folds into SCIENCE (Phase 4 cleanup): ScienceCards
  // on top, the tiered learn-link list below — one tab destination, less
  // crowding in the strip.
  type Tab = 'overview' | 'gallery' | 'flight' | 'science';

  // Surface-site lists by destination and locale, kept while the panel lives so a second Mars or
  // Moon mission reads its cross-link before the first paint.
  const siteListCache = new Map<string, SurfaceSite[]>();

  type Props = {
    mission: Mission | null;
    open: boolean;
    onClose: () => void;
    onFly?: (id: string) => void;
    /** Set when the mission was opened over a body panel: the bar's back chip returns to it. */
    onBack?: () => void;
  };
  let { mission, open, onClose, onFly, onBack }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  // #547 S1 — the collectible card. Index loads once (cached loader) for
  // the collection numbering; the spec derives from data already on hand.
  let cardOpen = $state(false);
  let missionIndex = $state<MissionIndex[]>([]);
  // Card hero == the app hero (gallery[0], override-blessed). One picture
  // per entity everywhere — a bad card hero is fixed at the hero override,
  // never by a card-specific derivation (operator direction 2026-09-12).
  // The card code loads on demand (lazy-card.ts): fetched when a mission opens.
  let cards = $state<CardModules | null>(null);
  $effect(() => {
    if (mission && !cards)
      void loadCardModules().then(
        (c) => (cards = c),
        () => {},
      );
  });
  let cardSpec = $derived<CardSpec | null>(
    mission && cards ? cards.spec.cardForMission(mission, missionIndex, gallery[0]) : null,
  );
  let badges = $state<Record<string, string>>({});
  /** Thumbs under GALLERY tab: skip first image when a hero duplicates it. */
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);
  // Mission blueprint (#641): shown on OVERVIEW and atop FLIGHT; opens alone in the zoom viewer.
  let blueprint = $derived(mission ? missionBlueprint(mission.id) : null);
  let lightboxImages = $derived(lightboxSrc && lightboxSrc === blueprint ? [blueprint] : gallery);
  // PRD-031 / RFC-033 S1 — linked videos interleaved into the gallery rail.
  let videos = $state<VideoProvenanceEntry[]>([]);
  let playerVideo = $state<VideoProvenanceEntry | null>(null);
  // Cross-link chip: when the mission corresponds to a surface or
  // orbital site on /mars or /moon, surface a chip that deep-links
  // there. Resolved from the body's surface-site catalogue —
  // matches by either mission_id field (preferred) or id parity.
  let crossSite: SurfaceSite | null = $state(null);
  // True from the open of a Mars or Moon mission until its site list has been read (L35): the
  // action row holds its place, and its chips appear together, instead of the surface chip
  // arriving late, shifting Fly to the right and pushing the hero down.
  let crossSitePending = $state(false);
  // The message an outbound craft carries (Voyagers, Pioneers, New Horizons), a section of the
  // overview.
  let craft = $state<InterstellarCraft | null>(null);
  // True from the open of one of the five craft until its message is read: the section holds its
  // place (MissionMessageSection with no craft) instead of being inserted late.
  let craftPending = $state(false);

  // Cross-links to fleet entries. Wired from mission.fleet_refs (Phase
  // 3 backfill). When present, the vehicle / payload spec cells render
  // as anchors to /fleet?id=<entry>. Each role maps as follows:
  //   · launcher → vehicle cell
  //   · spacecraft → payload cell (the bus that actually goes to dest)
  //   · payload   → payload cell (used for Shuttle-deployed deep-space
  //                 probes like Ulysses + Galileo where the orbiter is
  //                 the deployment vehicle and the probe is the payload)
  let launcherRef = $derived(mission?.fleet_refs?.find((r) => r.role === 'launcher')?.id ?? null);
  let spacecraftRef = $derived(
    mission?.fleet_refs?.find((r) => r.role === 'payload')?.id ??
      mission?.fleet_refs?.find((r) => r.role === 'spacecraft')?.id ??
      null,
  );

  // Reset to OVERVIEW each time a different mission is selected; also
  // (re-)load the photo gallery for the new mission.
  let lastId = $state<string | null>(null);
  $effect(() => {
    if (mission && mission.id !== lastId) {
      tab = 'overview';
      lastId = mission.id;
      lightboxSrc = null;
      gallery = [];
      videos = [];
      playerVideo = null;
      crossSite = null;
      crossSitePending = false;
      craft = null;
      craftPending = INTERSTELLAR_CRAFT.has(mission.id);
      // Popularity signal: a mission detail was opened. `open` gates it so
      // a prefetched/derived mission that never shows isn't counted.
      if (open) trackMissionView(mission.id, page.url.pathname);
      void getMissionGallery(mission.id)
        .then((urls) => {
          if (mission && mission.id === lastId) gallery = urls;
        })
        .catch(dataLoadFailed);
      void getVideosForEntity(mission.id)
        .then((v) => {
          if (mission && mission.id === lastId) videos = v;
        })
        .catch(dataLoadFailed);
      // Insignia map (PRD-029) — gate the badge so patch-less missions
      // (Mercury/Gemini flights predate mission patches) fire no 404.
      void getBadges()
        .then((b) => (badges = b))
        .catch(dataLoadFailed);
      // #547 — collection numbering for the collectible card.
      cardOpen = false;
      if (missionIndex.length === 0) {
        void getMissionIndex()
          .then((idx) => (missionIndex = idx))
          .catch(dataLoadFailed);
      }
      // Resolve cross-link to /mars or /moon surface-site catalogue.
      const findSite = (sites: SurfaceSite[]) =>
        sites.find((s) => s.mission_id === mission!.id) ??
        sites.find((s) => s.id === mission!.id) ??
        null;
      const loc = localeFromPage(page);
      const forId = mission.id;
      const settle = (list: SurfaceSite[]) => {
        if (mission && mission.id === forId && lastId === forId) {
          crossSite = findSite(list);
          crossSitePending = false;
        }
      };
      const siteKey = `${mission.dest}:${loc}`;
      const cachedSites = siteListCache.get(siteKey);
      if (cachedSites) {
        // Read before first paint: a list already fetched this session settles at once.
        crossSite = findSite(cachedSites);
      } else if (mission.dest === 'MARS' || mission.dest === 'MOON') {
        crossSitePending = true;
        void (mission.dest === 'MARS' ? getMarsSites(loc) : getMoonSites(loc))
          .then((list) => {
            siteListCache.set(siteKey, list);
            settle(list);
          })
          .catch((err) => {
            if (mission && mission.id === forId) crossSitePending = false;
            dataLoadFailed(err);
          });
      }
      if (INTERSTELLAR_CRAFT.has(forId)) {
        void getInterstellarCraft(forId, loc)
          .then((c) => {
            if (mission && mission.id === forId && lastId === forId) craft = c;
          })
          .catch(dataLoadFailed)
          .finally(() => {
            if (lastId === forId) craftPending = false;
          });
      }
    }
  });

  // FLIGHT tab visibility: only render when the mission has any
  // flight-params data (or an explicit data-quality flag), so missions
  // not yet populated (slice 1.7a-5 in progress) silently fall back to
  // the OVERVIEW / GALLERY / LEARN-only tab set.
  let hasFlightData = $derived(
    mission != null && (mission.flight != null || mission.flight_data_quality != null),
  );

  // The Fly chip needs flight data backing the /fly sim, a mission that flew (not PLANNED or
  // CANCELLED) and a host route that wired onFly (/explore iconic missions, /missions).
  let canFly = $derived(
    mission != null &&
      mission.status !== 'PLANNED' &&
      mission.status !== 'CANCELLED' &&
      hasFlightData &&
      !!onFly,
  );

  // Ranked /science picks for the SCIENCE tab: the mission's class and defining phase, from language-neutral
  // facts (science-links.ts). `crewed` lives in the index only, which this panel already loads.
  let missionScienceSections = $derived(
    mission
      ? pickScienceLinks(
          rankMissionScience({
            ...mission,
            crewed: mission.crewed ?? missionIndex.find((e) => e.id === mission.id)?.crewed,
          }),
        )
      : [],
  );

  // Map of `flight_data_quality !== "measured"` → caveat banner text.
  // null when measured / missing — banner hides entirely.
  let flightCaveat = $derived.by(() => {
    if (!mission) return null;
    const q = mission.flight_data_quality;
    if (q === 'reconstructed') return m.mp_flight_caveat_reconstructed();
    if (q === 'sparse') return m.mp_flight_caveat_sparse();
    if (q === 'unknown') return m.mp_flight_caveat_unknown();
    return null;
  });
  // Long-form explanation of the caveat for the WhyPopover next to the
  // banner. Null when no caveat applies.
  let flightCaveatWhy = $derived.by(() => {
    if (!mission) return null;
    const q = mission.flight_data_quality;
    if (q === 'reconstructed') return m.why_caveat_reconstructed_body();
    if (q === 'sparse') return m.why_caveat_sparse_body();
    if (q === 'unknown') return m.why_caveat_unknown_body();
    return null;
  });

  // Render a possibly-undefined-or-null numeric value as a localised
  // string, or em-dash for missing. Honest by construction (ADR-027 §2).
  function fmtNum(value: number | null | undefined, fractionDigits = 2): string {
    if (value == null) return '—';
    return value.toFixed(fractionDigits);
  }
  function fmtInt(value: number | null | undefined): string {
    if (value == null) return '—';
    return formatNumber(Math.round(value), localeFromPage(page));
  }

  // Map an event type enum to its localised label so the EVENTS list
  // reads in the active locale. Falls back to the raw enum if the
  // i18n key is missing for some reason.
  function eventLabel(type: string): string {
    switch (type) {
      case 'launch':
        return m.mp_flight_event_launch();
      case 'tli_or_tmi':
        return m.mp_flight_event_tli_or_tmi();
      case 'tcm':
        return m.mp_flight_event_tcm();
      case 'arrival':
        return m.mp_flight_event_arrival();
      case 'edl_or_oi':
        return m.mp_flight_event_edl_or_oi();
      case 'flyby':
        return m.mp_flight_event_flyby();
      case 'earth_return':
        return m.mp_flight_event_earth_return();
      case 'anomaly':
        return m.mp_flight_event_anomaly();
      default:
        return type.toUpperCase();
    }
  }

  function flyMission() {
    if (mission && onFly) onFly(mission.id);
  }
</script>

<!-- grabFocus={false}: keep focus on the triggering iconic-legend row so
     arrow-key legend nav works immediately after the first click. -->
<Panel
  {open}
  {onClose}
  grabFocus={false}
  title={mission?.name ?? mission?.id ?? ''}
  onShare={cardSpec ? () => (cardOpen = true) : undefined}
  {onBack}
>
  {#snippet eyebrow()}
    {#if mission}
      <AgencyRow agency={mission.agency} color={mission.color}>
        <span class="status status-{mission.status.toLowerCase()}"
          >{missionStatusLabel(mission.status)}</span
        >
        {#if mission.data_quality === 'partial'}
          <span class="quality">{m.mp_data_quality_partial()}</span>
        {:else if mission.data_quality === 'reconstructed'}
          <span class="quality">{m.mp_data_quality_reconstructed()}</span>
        {/if}
      </AgencyRow>
    {/if}
  {/snippet}
  {#snippet heading()}
    {#if mission}
      <div class="name-row">
        <h1 class="name">{mission.name ?? mission.id}</h1>
        {#if badges[`mission:${mission.id}`]}
          <img
            class="panel-badge"
            src={assetUrl(badges[`mission:${mission.id}`])}
            alt=""
            decoding="async"
          />
        {/if}
      </div>
    {/if}
  {/snippet}

  {#if mission}
    <div class="head">
      {#if mission.type}
        <p class="type">{mission.type}</p>
      {/if}
    </div>

    {#if canFly || crossSite || crossSitePending}
      <!-- Fly-mission chip: only when the mission has flight data backing the /fly sim, did not
           stay PLANNED / CANCELLED, and a host route wired onFly. (2026-06-17 user correction:
           iconic missions without flight-params data skip it instead of linking into a broken
           /fly sim.) While the surface site is still being read the row only holds its place. -->
      <div
        class="action-slot"
        class:reserved={crossSitePending}
        class:withhold={crossSitePending && !canFly}
      >
        {#if !crossSitePending}
          <PanelActions>
            {#if crossSite}
              {@const surfaceLabel =
                crossSite.kind === 'orbiter'
                  ? mission.dest === 'MARS'
                    ? m.mp_surface_mars_orbit()
                    : m.mp_surface_lunar_orbit()
                  : mission.dest === 'MARS'
                    ? m.mp_surface_mars_surface()
                    : m.mp_surface_lunar_surface()}
              <Chip
                kind="link"
                href={localHref(
                  `/${mission.dest === 'MARS' ? 'mars' : 'moon'}?site=${crossSite.id}`,
                )}
                data-testid="surface-link"
                data-audio-stage="mission-surface-link">{surfaceLabel}</Chip
              >
            {/if}
            {#if canFly}
              <Chip kind="action" onclick={flyMission} data-testid="fly-mission-btn">
                {#snippet icon()}<TrajectoryArrowIcon />{/snippet}
                {m.mp_fly_button()}
              </Chip>
            {/if}
          </PanelActions>
        {/if}
      </div>
    {/if}

    {#if gallery.length > 0}
      <PanelHeroImage
        src={gallery[0]}
        name={mission.name ?? mission.id}
        onOpen={() => {
          lightboxSrc = gallery[0]!;
          if (mission) trackGalleryImageOpen('mission', mission.id, 0);
        }}
      />
    {/if}

    <!-- Tab order: OVERVIEW · FLIGHT (cond) · GALLERY (cond) · SCIENCE.
         FLIGHT is positioned as the 2nd tab whenever it's available so
         the "fly this mission" surface is the user's first follow-on
         after the overview (2026-06-17 user direction: "on mission
         details, can we get fly to be 2nd tab always for all missions
         in details template"). -->
    <PanelTabRow
      idPrefix="mp"
      tabs={[
        { id: 'overview', label: m.mp_tab_overview(), audioStage: 'mission-tab-overview' },
        {
          id: 'flight',
          label: m.mp_tab_flight(),
          visible: hasFlightData,
          audioStage: 'mission-tab-flight',
        },
        {
          id: 'gallery',
          label: m.mp_tab_gallery(),
          visible: gallery.length > 0 || videos.length > 0,
          audioStage: 'mission-tab-gallery',
        },
        { id: 'science', label: m.panel_tab_science(), audioStage: 'mission-tab-science' },
      ]}
      bind:active={tab}
    />

    <div
      class="tab-content"
      role="tabpanel"
      id="mp-tabpanel"
      aria-labelledby={tab === 'overview'
        ? 'mp-tab-overview'
        : tab === 'flight'
          ? 'mp-tab-flight'
          : tab === 'gallery'
            ? 'mp-tab-gallery'
            : 'mp-tab-science'}
    >
      {#if tab === 'overview'}
        {#if mission.dispatch}
          <p class="dispatch">{mission.dispatch}</p>
        {/if}
        {#if blueprint}
          {@render blueprintFigure(blueprint)}
        {/if}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">{m.mp_label_departure()}</div>
            <div class="cell-value">{mission.departure_date ?? '—'}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.mp_label_arrival()}</div>
            <div class="cell-value">{mission.arrival_date ?? '—'}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.mp_label_transit()}</div>
            <div class="cell-value">
              {mission.transit_days
                ? m.mp_transit_days({ count: mission.transit_days.toString() })
                : '—'}
            </div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.mp_label_year()}</div>
            <div class="cell-value">{mission.year}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.mp_label_delta_v()}</div>
            <div class="cell-value">{mission.delta_v ?? '—'}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.mp_label_agency()}</div>
            <div class="cell-value short">{mission.agency_full ?? mission.agency}</div>
          </div>
        </div>

        <!-- Vehicle + Payload as prominent clickable CTAs. Previously
             rendered as cramped grid cells with thin underlined links
             which the user found "not seen well and links not clear"
             (2026-06-15). Promoted to button-style anchors matching the
             the action chips but with a distinct blue tint (they are
             navigation cards, not actions). Each carries a small inline
             SVG glyph — rocket for the launch vehicle, satellite-with-
             antenna for the payload spacecraft — so the buttons read
             at a glance even before the text resolves. When the
             fleet_refs link isn't populated for the mission (no
             matching launcher or spacecraft entry in /fleet) the chip
             falls back to a non-clickable static frame in the same
             colour so the spec stays visible but doesn't suggest a
             dead link. -->
        <!-- b1-keep: navigation cards (label + value), not actions -->
        <div class="spec-cta-bar">
          {#if mission.vehicle}
            {#if launcherRef}
              <a
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--vehicle"
                href={localHref(`/fleet?id=${launcherRef}`)}
                data-testid="mission-vehicle-fleet-link"
                title={m.mp_open_in_fleet_title({ vehicle: mission.vehicle ?? '' })}
              >
                <span class="spec-icon" aria-hidden="true">
                  <VehicleIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_vehicle()}</span>
                  <span class="spec-value">{mission.vehicle}</span>
                </span>
              </a>
            {:else}
              <div
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--vehicle is-static"
                data-testid="mission-vehicle-static"
              >
                <span class="spec-icon" aria-hidden="true">
                  <VehicleIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_vehicle()}</span>
                  <span class="spec-value">{mission.vehicle}</span>
                </span>
              </div>
            {/if}
          {/if}
          {#if mission.payload}
            {#if spacecraftRef}
              <a
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--payload"
                href={localHref(`/fleet?id=${spacecraftRef}`)}
                data-testid="mission-payload-fleet-link"
                title={m.mission_open_in_fleet_title()}
              >
                <span class="spec-icon" aria-hidden="true">
                  <SpacecraftIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_payload()}</span>
                  <span class="spec-value">{mission.payload}</span>
                </span>
              </a>
            {:else}
              <div
                // b1-keep: navigation card (label + value), not an action
                class="spec-cta spec-cta--payload is-static"
                data-testid="mission-payload-static"
              >
                <span class="spec-icon" aria-hidden="true">
                  <SpacecraftIcon />
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_payload()}</span>
                  <span class="spec-value">{mission.payload}</span>
                </span>
              </div>
            {/if}
          {/if}
        </div>

        {#if mission.first}
          <div class="first">{mission.first}</div>
        {/if}

        {#if mission.description}
          <p class="editorial">{mission.description}</p>
        {/if}

        {#if craft}
          <MissionMessageSection {craft} />
        {:else if craftPending}
          <MissionMessageSection craftId={mission.id} />
        {/if}

        {#if hasTrajectory(mission.id)}
          <!-- #306 panel ↔ /explore backlink. Every mission whose path
               /explore draws (TRAJECTORY_IDS, the same list /explore
               reads) gets a chip that deep-links to /explore with the
               PATHS layer active. Cassini also gets the orbital tour
               at Saturn-system scale on zoom-in (Slice D). -->
          <a
            class="explore-backlink"
            href={localHref(`/explore?paths=1${mission.id === 'cassini' ? '&focus=saturn' : ''}`)}
            data-testid="explore-backlink"
          >
            {mission.id === 'cassini' ? m.mp_see_tour_on_explore() : m.mp_see_path_on_explore()}
          </a>
        {/if}

        {#if mission.credit}
          <div class="credit">{mission.credit}</div>
        {/if}
      {:else if tab === 'flight'}
        <!-- Trajectory thumbnail at the top of the FLIGHT tab — drawn ahead of time by
             scripts/render-mission-thumbnails.ts from /fly's own trajectory code, so the panel
             shows flight data + the path it produces in one place. Every mission has one
             (mission-thumbnails.test.ts); those with no orbit data show a labelled placeholder. -->
        {#if blueprint}
          {@render blueprintFigure(blueprint)}
        {/if}
        <figure class="flight-thumbnail">
          <img
            src="{assetOrigin}/images/missions/thumbnails/{mission.id}.webp"
            alt=""
            loading="lazy"
            onerror={(e) => {
              const fig = (e.currentTarget as HTMLImageElement).closest('figure');
              if (fig) fig.style.display = 'none';
            }}
            decoding="async"
          />
        </figure>
        {#if flightCaveat}
          <div class="flight-caveat" role="note">
            {flightCaveat}
            {#if flightCaveatWhy}
              <WhyPopover title={m.why_caveat_title()} body={flightCaveatWhy} />
            {/if}
          </div>
        {/if}
        {#if mission.flight}
          {#if mission.flight.launch}
            <section class="flight-section">
              <h3>{m.mp_flight_section_launch()}</h3>
              <dl class="flight-rows">
                {#if mission.flight.launch.vehicle_stage}
                  <dt>{m.mp_flight_label_vehicle_stage()}</dt>
                  <dd>{mission.flight.launch.vehicle_stage}</dd>
                {/if}
                <dt>
                  {m.mp_flight_label_c3()}<ScienceChip
                    tab="propulsion"
                    section="c3"
                    label={m.chip_label_c3()}
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.launch.c3_km2_s2 != null
                    ? m.mp_flight_unit_c3({ value: fmtNum(mission.flight.launch.c3_km2_s2, 2) })
                    : '—'}
                </dd>
                <dt>
                  {m.mp_flight_label_dla()}<WhyPopover
                    title={m.why_dla_title()}
                    body={m.why_dla_body()}
                    tab="propulsion"
                    section="c3"
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.launch.declination_deg != null
                    ? m.mp_flight_unit_deg({
                        value: fmtNum(mission.flight.launch.declination_deg, 1),
                      })
                    : '—'}
                </dd>
                <dt>
                  {m.mp_flight_label_mass_at_tli()}<WhyPopover
                    title={m.why_mass_tli_title()}
                    body={m.why_mass_tli_body()}
                    tab="propulsion"
                    section="tsiolkovsky"
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.launch.mass_at_tli_kg != null
                    ? m.mp_flight_unit_kg({ value: fmtInt(mission.flight.launch.mass_at_tli_kg) })
                    : '—'}
                </dd>
              </dl>
              {#if mission.flight.launch.source}
                <p class="flight-source">
                  {m.mp_flight_source_prefix()}
                  {mission.flight.launch.source}
                </p>
              {/if}
            </section>
          {/if}
          {#if mission.flight.cruise}
            <section class="flight-section">
              <h3>{m.mp_flight_section_cruise()}</h3>
              <dl class="flight-rows">
                <dt>
                  {m.mp_flight_label_tcm_count()}<ScienceChip
                    tab="mission-phases"
                    section="tcm"
                    label={m.chip_label_tcm()}
                  />
                </dt>
                <dd class="numeric">{fmtInt(mission.flight.cruise.tcm_count)}</dd>
                <dt>
                  {m.mp_flight_label_peak_speed()}<WhyPopover
                    title={m.why_peak_speed_title()}
                    body={m.why_peak_speed_body()}
                    tab="orbits"
                    section="vis-viva"
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.cruise.peak_heliocentric_speed_km_s != null
                    ? m.mp_flight_unit_kms({
                        value: fmtNum(mission.flight.cruise.peak_heliocentric_speed_km_s, 1),
                      })
                    : '—'}
                </dd>
              </dl>
              {#if mission.flight.cruise.source}
                <p class="flight-source">
                  {m.mp_flight_source_prefix()}
                  {mission.flight.cruise.source}
                </p>
              {/if}
            </section>
          {/if}
          {#if mission.flight.arrival}
            <section class="flight-section">
              <h3>{m.mp_flight_section_arrival()}</h3>
              <dl class="flight-rows">
                <dt>
                  {m.mp_flight_label_v_infinity()}<ScienceChip
                    tab="propulsion"
                    section="v-infinity"
                    label={m.chip_label_v_infinity()}
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.arrival.v_infinity_km_s != null
                    ? m.mp_flight_unit_kms({
                        value: fmtNum(mission.flight.arrival.v_infinity_km_s, 2),
                      })
                    : '—'}
                </dd>
                {#if mission.flight.arrival.entry_velocity_km_s != null}
                  <dt>
                    {m.mp_flight_label_entry_velocity()}<WhyPopover
                      title={m.why_entry_velocity_title()}
                      body={m.why_entry_velocity_body()}
                      tab="mission-phases"
                      section="edl"
                    />
                  </dt>
                  <dd class="numeric">
                    {m.mp_flight_unit_kms({
                      value: fmtNum(mission.flight.arrival.entry_velocity_km_s, 2),
                    })}
                  </dd>
                {/if}
                <dt>
                  {m.mp_flight_label_periapsis()}<WhyPopover
                    title={m.why_periapsis_title()}
                    body={m.why_periapsis_body()}
                    tab="orbits"
                    section="apsides"
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.arrival.periapsis_km != null
                    ? m.mp_flight_unit_km({ value: fmtInt(mission.flight.arrival.periapsis_km) })
                    : '—'}
                </dd>
                <dt>
                  {m.mp_flight_label_inclination()}<WhyPopover
                    title={m.why_arrival_inclination_title()}
                    body={m.why_arrival_inclination_body()}
                    tab="orbits"
                    section="inclination"
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.arrival.inclination_deg != null
                    ? m.mp_flight_unit_deg({
                        value: fmtNum(mission.flight.arrival.inclination_deg, 1),
                      })
                    : '—'}
                </dd>
                <dt>
                  {m.mp_flight_label_oi_dv()}<ScienceChip
                    tab="mission-phases"
                    section="orbit-insertion"
                    label={m.chip_label_orbit_insertion()}
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.arrival.orbit_insertion_dv_km_s != null
                    ? m.mp_flight_unit_kms({
                        value: fmtNum(mission.flight.arrival.orbit_insertion_dv_km_s, 2),
                      })
                    : '—'}
                </dd>
              </dl>
              {#if mission.flight.arrival.source}
                <p class="flight-source">
                  {m.mp_flight_source_prefix()}
                  {mission.flight.arrival.source}
                </p>
              {/if}
            </section>
          {/if}
          {#if mission.flight.totals}
            <section class="flight-section">
              <h3>{m.mp_flight_section_totals()}</h3>
              <dl class="flight-rows">
                <dt>
                  {m.mp_flight_label_total_dv()}<ScienceChip
                    tab="propulsion"
                    section="dv-budget"
                    label={m.chip_label_dv_budget()}
                  />
                </dt>
                <dd class="numeric accent-dv">
                  {mission.flight.totals.total_dv_km_s != null
                    ? m.mp_flight_unit_kms({
                        value: fmtNum(mission.flight.totals.total_dv_km_s, 2),
                      })
                    : '—'}
                </dd>
                <dt>
                  {m.mp_flight_label_tli_dv()}<ScienceChip
                    tab="mission-phases"
                    section="trans-x-injection"
                    label={m.chip_label_trans_x_injection()}
                  />
                </dt>
                <dd class="numeric">
                  {mission.flight.totals.tli_or_tmi_dv_km_s != null
                    ? m.mp_flight_unit_kms({
                        value: fmtNum(mission.flight.totals.tli_or_tmi_dv_km_s, 2),
                      })
                    : '—'}
                </dd>
              </dl>
              {#if mission.flight.totals.source}
                <p class="flight-source">
                  {m.mp_flight_source_prefix()}
                  {mission.flight.totals.source}
                </p>
              {/if}
            </section>
          {/if}
          {#if mission.flight.events && mission.flight.events.length > 0}
            <section class="flight-section">
              <h3>{m.mp_flight_section_events()}</h3>
              <ol class="flight-events">
                {#each mission.flight.events as evt, i (i)}
                  <li>
                    <span class="event-met"
                      >{m.mp_flight_event_met({ day: fmtNum(evt.met_days, 2) })}</span
                    >
                    <span class="event-type">{eventLabel(evt.type)}</span>
                  </li>
                {/each}
              </ol>
            </section>
          {/if}
        {/if}
      {:else if tab === 'science'}
        <div class="science-tab">
          <p class="science-blurb">
            {m.mp_science_blurb({ name: mission.name ?? mission.id })}
          </p>
          {#each missionScienceSections as { tab: t, section } (t + section)}
            <ScienceCard tab={t as ScienceTabId} {section} />
          {/each}
          {#if mission.links && mission.links.length > 0}
            <div class="science-library">
              <h3 class="library-heading">{m.mp_tab_learn()}</h3>
              <PanelLinkTiers links={mission.links} entityId={mission.id} />
            </div>
          {/if}
        </div>
      {:else if tab === 'gallery'}
        {#if gallery.length === 0 && videos.length === 0}
          <p class="empty-tab">{m.mp_gallery_empty()}</p>
        {:else}
          <PanelGalleryGrid
            images={galleryGrid}
            gridLabel={m.mp_gallery_aria()}
            thumbLabel={mission.name ?? mission.id}
            onOpen={(src) => {
              lightboxSrc = src;
              if (mission) trackGalleryImageOpen('mission', mission.id);
            }}
          >
            {#snippet leading()}
              {#each videos as v (v.id)}
                <VideoThumb video={v} onOpen={(vv) => (playerVideo = vv)} />
              {/each}
            {/snippet}
            {#snippet trailing()}
              {#if mission && badges[`mission:${mission.id}`]}
                <button
                  type="button"
                  class="gallery-thumb badge-thumb"
                  onclick={() => (lightboxSrc = assetUrl(badges[`mission:${mission.id}`]))}
                  aria-label={m.mp_insignia_aria({ name: mission.name ?? mission.id })}
                >
                  <img src={assetUrl(badges[`mission:${mission.id}`])} alt="" decoding="async" />
                  <span class="badge-tag">{m.gallery_insignia_title()}</span>
                </button>
              {/if}
            {/snippet}
          </PanelGalleryGrid>
          <p class="gallery-credit">{missionGalleryCredit(mission.agency)}</p>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

{#if cardSpec && cards}
  <cards.CardOverlay spec={cardSpec} open={cardOpen} onClose={() => (cardOpen = false)} />
{/if}

{#snippet blueprintFigure(src: string)}
  <figure class="blueprint" data-testid="mission-blueprint">
    <button
      type="button"
      class="blueprint-open"
      onclick={() => (lightboxSrc = src)}
      aria-label={m.mp_blueprint_open_aria({ name: mission?.name ?? '' })}
    >
      <img
        {...responsive(src, IMAGE_SIZES.panel)}
        alt={m.mp_blueprint_alt({ name: mission?.name ?? '' })}
        loading="lazy"
        decoding="async"
      />
    </button>
    <figcaption>
      <span class="blueprint-title">{m.mp_blueprint_heading()}</span>
      {m.mp_blueprint_caption()}
    </figcaption>
  </figure>
{/snippet}

<PanelLightbox src={lightboxSrc} images={lightboxImages} onClose={() => (lightboxSrc = null)} />

<MediaPlayer video={playerVideo} onClose={() => (playerVideo = null)} />

<style>
  .blueprint {
    margin: 12px 0 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 10px;
  }
  .blueprint-open {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
  }
  .blueprint img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 2px;
  }
  .blueprint figcaption {
    margin: 8px 0 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic; /* a1-keep: caption */
    font-size: var(--size-caption);
    color: rgba(255, 255, 255, 0.55);
  }
  .blueprint-title {
    display: block;
    font-family: inherit;
    font-style: normal;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2px;
  }
  .head {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  /* .agency-row / .agency-badge / .status + .quality base now from AgencyRow.svelte. */
  .status-active {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .status-flown {
    color: var(--color-text-label);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #889fe7;
    border-color: rgba(136, 159, 231, 0.4);
    background: rgba(136, 159, 231, 0.08);
  }
  .status-cancelled {
    color: var(--color-text-label);
    border-color: rgba(255, 255, 255, 0.15);
    text-decoration: line-through;
  }
  .quality {
    color: #ffc850;
    border: 1px solid rgba(255, 200, 80, 0.4);
    background: rgba(255, 200, 80, 0.08);
  }

  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0 0 4px;
  }
  .type {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    margin: 0;
  }

  /* .tabs / .tab-content moved to src/lib/styles/panel-tabs.css (v0.1.10) */

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
  .cell.wide {
    grid-column: 1 / -1;
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
  .cell-value.short {
    font-size: var(--size-label);
    font-weight: 400;
    color: rgba(255, 255, 255, 0.65);
  }
  .fleet-link {
    color: var(--color-text);
    text-decoration: underline;
    text-decoration-color: rgba(255, 255, 255, 0.35);
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
    transition:
      color 120ms,
      text-decoration-color 120ms;
  }
  .fleet-link:hover,
  .fleet-link:focus-visible {
    color: #5fb7ff;
    text-decoration-color: #5fb7ff;
    outline: none;
  }

  /* Editorial lead paragraph (PRD-029 dispatch). Reads as a magazine
     standfirst — prominent roman serif, brighter than the italic
     .editorial below, set apart by a hairline. */
  /* L35: the action row's place while the surface site is read — one chip tall (44 px on touch,
     30 px on a fine pointer) plus the row's 12 px margin. */
  .action-slot.reserved {
    min-block-size: calc(44px + 12px);
  }
  /* A mission that cannot fly has no chip to show if its site list turns up nothing, so the row
     then leaves and everything below it moves up. Until the list is read, that part is laid out
     but not painted: the move happens while it cannot be seen. */
  .action-slot.withhold ~ :global(*) {
    visibility: hidden;
  }
  @media (hover: hover) and (pointer: fine) {
    .action-slot.reserved {
      min-block-size: calc(30px + 12px);
    }
  }
  .dispatch {
    font-size: var(--size-lead);
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 14px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .first {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 12px;
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    border-left: 3px solid var(--color-accent);
    border-radius: 2px;
    margin-bottom: 12px;
  }

  .credit {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text-label);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }

  .explore-backlink {
    display: inline-block;
    margin: 0 0 14px;
    padding: 6px 10px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.78);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    text-decoration: none;
    transition:
      background 0.12s ease,
      border-color 0.12s ease;
  }
  .explore-backlink:hover,
  .explore-backlink:focus-visible {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.24);
  }

  /* .link-tier / .tier-* / .empty-tab moved to panel-tabs.css */

  /* Spec-CTA buttons — vehicle + payload navigation cards in the
     overview tab (uppercase mono label, 4px radius) in a blue tint so
     they don't read as an action chip.
     Layout: side-by-side flex row on desktop; wraps to stacked column
     on narrow viewports via the bar's flex-wrap. Static fallback
     (when no fleet ref exists) keeps the same chrome but loses the
     hover lift + cursor pointer. */
  .spec-cta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0 14px;
  }
  .spec-cta {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
    min-height: 48px;
    padding: 10px 12px;
    border-radius: 4px;
    color: #fff;
    font-family: var(--font-mono, 'Space Mono', monospace);
    cursor: pointer;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 10px;
    transition:
      background 120ms,
      border-color 120ms;
  }
  /* Per-CTA hue split — the two cards share a blue family (2026-06-15
     user note: "let them all be in same style"). Vehicle leans
     darker/cooler (deep navy); payload leans lighter/warmer (cobalt
     with slight violet push). Same hue axis; just value + slight hue
     shift so they stay sibling-to-fly but distinguishable from each
     other at a glance. */
  /* Vehicle = deep indigo / navy (darkest end of the blue axis);
     Payload = bright sky-blue with blue push (lightest end). Both
     stay in one blue family, but with a
     dramatic value + hue spread so the two read as obviously
     different at a glance (2026-06-15 user note: "they look almost
     the same, make more difference"). */
  .spec-cta--vehicle {
    background: #0c1660;
    border: 1px solid rgba(60, 80, 180, 0.6);
  }
  .spec-cta--vehicle:hover,
  .spec-cta--vehicle:focus-visible {
    background: #142082;
    border-color: #4858c8;
    outline: none;
  }
  .spec-cta--vehicle .spec-icon,
  .spec-cta--vehicle .spec-label {
    color: rgba(160, 185, 245, 0.82);
  }
  .spec-cta--payload {
    background: var(--color-accent);
    border: 1px solid var(--color-accent-strong);
  }
  .spec-cta--payload:hover,
  .spec-cta--payload:focus-visible {
    background: var(--color-accent);
    border-color: var(--color-accent-hover);
    outline: none;
  }
  .spec-cta--payload .spec-icon,
  .spec-cta--payload .spec-label {
    color: #04040c;
  }
  .spec-cta.is-static {
    cursor: default;
    opacity: 0.65;
  }
  .spec-cta--vehicle.is-static:hover {
    background: #0c1660;
    border-color: rgba(60, 80, 180, 0.6);
  }
  .spec-cta--payload.is-static:hover {
    background: var(--color-accent);
    border-color: var(--color-accent-strong);
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
  }
  .spec-cta .spec-label {
    font-size: var(--size-label);
    letter-spacing: 2.5px;
    font-weight: 700;
    text-transform: uppercase;
  }
  /* Allow the value to wrap to a SECOND line when the text is too
     long for the narrow CTA width (user note 2026-06-15: "maybe we
     can break text in 2 rows when cut off since buttons are small").
     Clamp at 2 lines so the button height stays predictable; extras
     fall to ellipsis on the second line. */
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

  /* .gallery-credit / .lightbox / .lightbox-close moved to panel-tabs.css */

  /* FLIGHT tab (v0.1.7 / ADR-027 / UXS-004 §Extension) */
  .flight-thumbnail {
    margin: 0 0 12px;
    padding: 4px;
    background: rgba(4, 4, 12, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    aspect-ratio: 16 / 9;
    overflow: hidden;
  }
  .flight-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 2px;
  }
  .flight-caveat {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: #ffc850;
    background: rgba(255, 200, 80, 0.18);
    border: 1px solid #ffc850;
    border-radius: 4px;
    padding: 8px 10px;
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .science-tab {
    padding-top: 4px;
  }
  .science-blurb {
    font-size: var(--size-lead);
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 14px;
  }
  .flight-section {
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .flight-section:last-of-type {
    border-bottom: none;
  }
  .flight-section h3 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 3px;
    color: rgba(220, 230, 255, 0.95);
    margin: 0 0 8px;
  }
  .flight-rows {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 14px;
    row-gap: 6px;
    margin: 0;
  }
  .flight-rows dt {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: rgba(180, 200, 255, 0.6);
    align-self: center;
  }
  .flight-rows dd {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: #fff;
    margin: 0;
    align-self: center;
  }
  .flight-rows dd.numeric {
    font-weight: 700;
  }
  .flight-rows dd.accent-dv {
    color: #ffc850;
  }
  .flight-source {
    font-size: var(--size-label);
    color: rgba(180, 200, 255, 0.6);
    margin: 6px 0 0;
    line-height: 1.4;
  }
  .flight-events {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .flight-events li {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 12px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.025);
    border-left: 2px solid var(--color-accent-edge);
    border-radius: 2px;
  }
  .flight-events .event-met {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: var(--color-state);
    font-weight: 700;
  }
  .flight-events .event-type {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.85);
  }
</style>
