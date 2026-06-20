<script lang="ts">
  import Panel from './Panel.svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { getMissionGallery, getMarsSites, getMoonSites } from '$lib/data';
  import type { SurfaceSite } from '$types/surface-site';
  import { formatNumber } from '$lib/format';
  import { localeFromPage } from '$lib/locale';
  import type { Mission } from '$types/mission';
  import * as m from '$lib/paraglide/messages';
  import { missionGalleryCredit } from '$lib/image-credits';
  import ImageCredit from './ImageCredit.svelte';
  import LearnLink from './LearnLink.svelte';
  import ScienceChip from './ScienceChip.svelte';
  import ScienceCard from './ScienceCard.svelte';
  import WhyPopover from './WhyPopover.svelte';
  import type { ScienceTabId } from '$types/science';

  // The former LEARN tab folds into SCIENCE (Phase 4 cleanup): ScienceCards
  // on top, the tiered learn-link list below — one tab destination, less
  // crowding in the strip.
  type Tab = 'overview' | 'gallery' | 'flight' | 'science';

  // #306 panel ↔ /explore PATHS-layer backlink. Stays in sync with
  // ICONIC_TRAJECTORY_IDS in src/routes/explore/+page.svelte —
  // updating one without the other gives misleading "see on /explore"
  // chips. Validated by the explore-paths-layer e2e spec.
  const MISSIONS_WITH_ICONIC_PATH = new Set([
    'voyager-1',
    'voyager-2',
    'pioneer-10',
    'pioneer-11',
    'new-horizons',
    'galileo',
    'juno',
    'cassini',
    'dawn',
  ]);

  type Props = {
    mission: Mission | null;
    open: boolean;
    onClose: () => void;
    onFly?: (id: string) => void;
  };
  let { mission, open, onClose, onFly }: Props = $props();

  let tab: Tab = $state('overview');
  let gallery: string[] = $state([]);
  /** Thumbs under GALLERY tab: skip first image when a hero duplicates it. */
  let galleryGrid = $derived(gallery.length <= 1 ? gallery : gallery.slice(1));
  let lightboxSrc = $state<string | null>(null);
  // Cross-link chip: when the mission corresponds to a surface or
  // orbital site on /mars or /moon, surface a chip that deep-links
  // there. Resolved from the body's surface-site catalogue —
  // matches by either mission_id field (preferred) or id parity.
  let crossSite: SurfaceSite | null = $state(null);

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
      crossSite = null;
      void getMissionGallery(mission.id).then((urls) => {
        if (mission && mission.id === lastId) gallery = urls;
      });
      // Resolve cross-link to /mars or /moon surface-site catalogue.
      const findSite = (sites: SurfaceSite[]) =>
        sites.find((s) => s.mission_id === mission!.id) ??
        sites.find((s) => s.id === mission!.id) ??
        null;
      const loc = localeFromPage($page);
      if (mission.dest === 'MARS') {
        void getMarsSites(loc).then((list) => {
          if (mission && mission.id === lastId) crossSite = findSite(list);
        });
      } else if (mission.dest === 'MOON') {
        void getMoonSites(loc).then((list) => {
          if (mission && mission.id === lastId) crossSite = findSite(list);
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

  // Curated /science cross-section list for the SCIENCE tab. Driven by what
  // flight fields the mission actually has — only show sections relevant to
  // this mission's actual phases. ∆v + Hohmann + mission-types always show
  // (every mission touches them); the others gate on flight data presence.
  let missionScienceSections = $derived.by(() => {
    const list: { tab: ScienceTabId; section: string }[] = [
      { tab: 'propulsion', section: 'dv-budget' },
      { tab: 'transfers', section: 'hohmann-transfer' },
    ];
    const f = mission?.flight;
    if (f?.launch?.c3_km2_s2 != null) list.push({ tab: 'propulsion', section: 'c3' });
    if (f?.launch != null) {
      list.push({ tab: 'mission-phases', section: 'trans-x-injection' });
      // Launch-vehicle context — every mission's launcher draws from
      // these foundational topics (issue #303 close-out).
      list.push({ tab: 'propulsion', section: 'thrust-and-twr' });
      list.push({ tab: 'propulsion', section: 'rocket-stages' });
      list.push({ tab: 'propulsion', section: 'engine-types' });
      list.push({ tab: 'propulsion', section: 'engine-clustering' });
      list.push({ tab: 'propulsion', section: 'fuels-and-oxidizers' });
      list.push({ tab: 'history', section: 'tsiolkovsky-equation-1903' });
      // Goddard's 1926 first liquid-fueled rocket — the engineering
      // companion to Tsiolkovsky's 1903 equation, paired in every
      // MissionPanel that surfaces a launch vehicle. (#303 close-out.)
      list.push({ tab: 'history', section: 'goddard-liquid-rocket-1926' });
    }
    if (f?.cruise?.tcm_count != null && f.cruise.tcm_count > 0)
      list.push({ tab: 'mission-phases', section: 'tcm' });
    if (f?.arrival?.v_infinity_km_s != null)
      list.push({ tab: 'propulsion', section: 'v-infinity' });
    if (f?.arrival?.orbit_insertion_dv_km_s != null)
      list.push({ tab: 'mission-phases', section: 'orbit-insertion' });
    if (f?.arrival?.entry_velocity_km_s != null) {
      list.push({ tab: 'mission-phases', section: 'edl' });
      // EDL phase pairs with throttling-and-gimbaling (powered descent).
      list.push({ tab: 'propulsion', section: 'throttling-and-gimbaling' });
    }
    list.push({ tab: 'mission-phases', section: 'mission-types' });
    return list;
  });

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
    return formatNumber(Math.round(value), localeFromPage($page));
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

  // Group links by tier for the LEARN tab. The mission JSON stores
  // links in a flat array with a `t` (tier) discriminator.
  let linksByTier = $derived.by(() => {
    if (!mission?.links) return { intro: [], core: [], deep: [] };
    const out = {
      intro: [] as typeof mission.links,
      core: [] as typeof mission.links,
      deep: [] as typeof mission.links,
    };
    for (const link of mission.links) out[link.t].push(link);
    return out;
  });

  function flyMission() {
    if (mission && onFly) onFly(mission.id);
  }
</script>

<!-- grabFocus={false}: keep focus on the triggering iconic-legend row so
     arrow-key legend nav works immediately after the first click. -->
<Panel {open} {onClose} grabFocus={false} title={mission?.name ?? mission?.id ?? ''}>
  {#if mission}
    <div class="head">
      <div class="agency-row">
        <span class="agency-badge" style:background-color={mission.color}>{mission.agency}</span>
        <span class="status status-{mission.status.toLowerCase()}">{mission.status}</span>
        {#if mission.data_quality === 'partial'}
          <span class="quality">{m.mp_data_quality_partial()}</span>
        {:else if mission.data_quality === 'reconstructed'}
          <span class="quality">{m.mp_data_quality_reconstructed()}</span>
        {/if}
      </div>
      <h1 class="name">{mission.name ?? mission.id}</h1>
      {#if mission.type}
        <p class="type">{mission.type}</p>
      {/if}
    </div>

    {#if gallery.length > 0}
      <div class="panel-hero">
        <button
          type="button"
          class="panel-hero-btn"
          onclick={() => (lightboxSrc = gallery[0]!)}
          aria-label={m.panel_hero_aria({ name: mission.name ?? mission.id })}
        >
          <img src={gallery[0]} alt="" fetchpriority="high" decoding="async" />
        </button>
      </div>
    {/if}

    <!-- Tab order: OVERVIEW · FLIGHT (cond) · GALLERY (cond) · SCIENCE.
         FLIGHT is positioned as the 2nd tab whenever it's available so
         the "fly this mission" surface is the user's first follow-on
         after the overview (2026-06-17 user direction: "on mission
         details, can we get fly to be 2nd tab always for all missions
         in details template"). -->
    <div class="tabs" role="tablist">
      <button
        type="button"
        id="mp-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="mp-tabpanel">{m.mp_tab_overview()}</button
      >
      {#if hasFlightData}
        <button
          type="button"
          id="mp-tab-flight"
          class:active={tab === 'flight'}
          onclick={() => (tab = 'flight')}
          role="tab"
          aria-selected={tab === 'flight'}
          aria-controls="mp-tabpanel">{m.mp_tab_flight()}</button
        >
      {/if}
      {#if gallery.length > 0}
        <button
          type="button"
          id="mp-tab-gallery"
          class:active={tab === 'gallery'}
          onclick={() => (tab = 'gallery')}
          role="tab"
          aria-selected={tab === 'gallery'}
          aria-controls="mp-tabpanel">{m.mp_tab_gallery()}</button
        >
      {/if}
      <button
        type="button"
        id="mp-tab-science"
        class:active={tab === 'science'}
        onclick={() => (tab = 'science')}
        role="tab"
        aria-selected={tab === 'science'}
        aria-controls="mp-tabpanel">SCIENCE</button
      >
    </div>

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
             "Fly this mission" .cta template but with a distinct teal
             tint (so the secondary navigation CTAs don't compete with
             the primary blue Fly action). Each carries a small inline
             SVG glyph — rocket for the launch vehicle, satellite-with-
             antenna for the payload spacecraft — so the buttons read
             at a glance even before the text resolves. When the
             fleet_refs link isn't populated for the mission (no
             matching launcher or spacecraft entry in /fleet) the chip
             falls back to a non-clickable static frame in the same
             colour so the spec stays visible but doesn't suggest a
             dead link. -->
        <div class="spec-cta-bar">
          {#if mission.vehicle}
            {#if launcherRef}
              <a
                class="spec-cta spec-cta--vehicle"
                href="{base}/fleet?id={launcherRef}"
                data-testid="mission-vehicle-fleet-link"
                title="Open {mission.vehicle} in /fleet"
              >
                <span class="spec-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 20" width="16" height="20" fill="currentColor">
                    <path
                      d="M8 1 L11 6 L11 13 L13 16 L13 18 L11 17 L11 18 L5 18 L5 17 L3 18 L3 16 L5 13 L5 6 Z"
                    />
                    <circle cx="8" cy="9" r="1.6" fill="rgba(0,0,0,0.45)" />
                  </svg>
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_vehicle()}</span>
                  <span class="spec-value">{mission.vehicle}</span>
                </span>
              </a>
            {:else}
              <div
                class="spec-cta spec-cta--vehicle is-static"
                data-testid="mission-vehicle-static"
              >
                <span class="spec-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 20" width="16" height="20" fill="currentColor">
                    <path
                      d="M8 1 L11 6 L11 13 L13 16 L13 18 L11 17 L11 18 L5 18 L5 17 L3 18 L3 16 L5 13 L5 6 Z"
                    />
                    <circle cx="8" cy="9" r="1.6" fill="rgba(0,0,0,0.45)" />
                  </svg>
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
                class="spec-cta spec-cta--payload"
                href="{base}/fleet?id={spacecraftRef}"
                data-testid="mission-payload-fleet-link"
                title="Open spacecraft in /fleet"
              >
                <span class="spec-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                    <rect x="1" y="8" width="4" height="4" />
                    <rect x="15" y="8" width="4" height="4" />
                    <line x1="10" y1="3" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" />
                    <circle cx="10" cy="2.4" r="1.3" />
                  </svg>
                </span>
                <span class="spec-text">
                  <span class="spec-label">{m.mp_label_payload()}</span>
                  <span class="spec-value">{mission.payload}</span>
                </span>
              </a>
            {:else}
              <div
                class="spec-cta spec-cta--payload is-static"
                data-testid="mission-payload-static"
              >
                <span class="spec-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                    <rect x="1" y="8" width="4" height="4" />
                    <rect x="15" y="8" width="4" height="4" />
                    <line x1="10" y1="3" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" />
                    <circle cx="10" cy="2.4" r="1.3" />
                  </svg>
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

        {#if MISSIONS_WITH_ICONIC_PATH.has(mission.id)}
          <!-- #306 panel ↔ /explore backlink. The 9 missions with
               iconic trajectories on /explore (Voyager 1+2, Pioneer
               10+11, New Horizons, Galileo, Juno, Cassini, Dawn) get
               a small chip that deep-links to /explore with the
               PATHS layer active. Cassini also gets the orbital tour
               at Saturn-system scale on zoom-in (Slice D). -->
          <a
            class="explore-backlink"
            href="{base}/explore?paths=1{mission.id === 'cassini' ? '&focus=saturn' : ''}"
            data-testid="explore-backlink"
          >
            {mission.id === 'cassini' ? m.mp_see_tour_on_explore() : m.mp_see_path_on_explore()}
          </a>
        {/if}

        {#if mission.credit}
          <div class="credit">{mission.credit}</div>
        {/if}
      {:else if tab === 'flight'}
        <!-- Trajectory thumbnail at the top of the FLIGHT tab —
             pre-rendered at build time by scripts/fetch-assets.ts so
             the panel shows flight data + the path it produces in
             one place. -->
        <figure class="flight-thumbnail">
          <img
            src="{base}/images/missions/thumbnails/{mission.id}.png"
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
            The orbital mechanics behind {mission.name ?? mission.id} — every formula and named phase
            the FLIGHT tab references, with the option to read deeper.
          </p>
          {#each missionScienceSections as { tab: t, section } (t + section)}
            <ScienceCard tab={t} {section} />
          {/each}
          {#if mission.links && mission.links.length > 0}
            <div class="science-library">
              <h3 class="library-heading">{m.mp_tab_learn()}</h3>
              {#if linksByTier.intro.length > 0}
                <section class="link-tier tier-intro">
                  <h3>{m.mp_links_intro()}</h3>
                  <ul>
                    {#each linksByTier.intro as link (link.u)}
                      <li>
                        <LearnLink entityId={mission.id} url={link.u} label={link.l} />
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
              {#if linksByTier.core.length > 0}
                <section class="link-tier tier-core">
                  <h3>{m.mp_links_core()}</h3>
                  <ul>
                    {#each linksByTier.core as link (link.u)}
                      <li>
                        <LearnLink entityId={mission.id} url={link.u} label={link.l} />
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
              {#if linksByTier.deep.length > 0}
                <section class="link-tier tier-deep">
                  <h3>{m.mp_links_deep()}</h3>
                  <ul>
                    {#each linksByTier.deep as link (link.u)}
                      <li>
                        <LearnLink entityId={mission.id} url={link.u} label={link.l} />
                      </li>
                    {/each}
                  </ul>
                </section>
              {/if}
            </div>
          {/if}
        </div>
      {:else if tab === 'gallery'}
        {#if gallery.length === 0}
          <p class="empty-tab">{m.mp_gallery_empty()}</p>
        {:else}
          <div class="gallery-grid" aria-label={m.mp_gallery_aria()}>
            {#each galleryGrid as src (src)}
              <button
                type="button"
                class="gallery-thumb"
                onclick={() => (lightboxSrc = src)}
                aria-label={mission.name ?? mission.id}
              >
                <img {src} alt="" loading="lazy" decoding="async" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{missionGalleryCredit(mission.agency)}</p>
        {/if}
      {/if}
    </div>

    <!-- Fly-mission CTA — only render when the mission has actual
         flight data backing the /fly sim (hasFlightData), is not still
         in the PLANNED bucket, AND a host route wired the onFly
         callback. (2026-06-17 user correction: "I didn't ask to add
         fly this mission to all cards, you added them where it makes
         no sense. I asked to make it visible on iconic mission on
         explore page where it was not visible." → restore onFly on
         /explore AND gate the button at the MissionPanel level on
         hasFlightData so iconic missions without flight-params data
         silently skip the CTA instead of linking into a broken /fly
         sim.) -->
    {#if (mission.status !== 'PLANNED' && hasFlightData && onFly) || crossSite}
      <div class="cta-bar">
        {#if mission.status !== 'PLANNED' && hasFlightData && onFly}
          <button type="button" class="cta" onclick={flyMission} data-testid="fly-mission-btn">
            <!-- Trajectory-arc glyph — curved path with arrowhead.
                 Replaces the prior "▶" play-character (2026-06-15
                 user note: "invent small logo instead of play
                 character"). Reads as "fly this path" — visually
                 matches what /fly actually does: animate a curved
                 mission trajectory. Inline SVG so it ships in the
                 same bundle as the button + tints with currentColor. -->
            <span class="cta-icon" aria-hidden="true">
              <svg
                viewBox="0 0 22 22"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 17 Q 9 3 19 9" />
                <path d="M19 9 L14 7 M19 9 L17 14" />
              </svg>
            </span>
            <span class="cta-text">{m.mp_fly_button()}</span>
          </button>
        {/if}
        {#if crossSite}
          {@const surfaceLabel =
            crossSite.kind === 'orbiter'
              ? mission.dest === 'MARS'
                ? 'IN MARS ORBIT ↗'
                : 'IN LUNAR ORBIT ↗'
              : mission.dest === 'MARS'
                ? 'ON THE SURFACE ↗'
                : 'ON THE LUNAR SURFACE ↗'}
          <a
            class="surface-link"
            href={`${base}/${mission.dest === 'MARS' ? 'mars' : 'moon'}?site=${crossSite.id}`}
            data-testid="surface-link"
          >
            {surfaceLabel}
          </a>
        {/if}
      </div>
    {/if}
  {/if}
</Panel>

{#if lightboxSrc}
  <!-- Lightbox overlay: clickable backdrop dismisses; outer is a
       <button> so role+keyboard are implicit, satisfying svelte's
       a11y plugin. The image inside is non-interactive (alt="" since
       the gallery context already labels it). -->
  <button
    type="button"
    class="lightbox"
    aria-label={m.panel_lightbox_close()}
    onclick={() => (lightboxSrc = null)}
  >
    <img src={lightboxSrc} alt="" loading="lazy" decoding="async" />
    <span class="lightbox-close" aria-hidden="true">×</span>
  </button>
  <div class="lightbox-meta">
    <ImageCredit src={lightboxSrc} />
  </div>
{/if}

<style>
  .head {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status,
  .quality {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
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
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-flown {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
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
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
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
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .cell-value.short {
    font-size: 9px;
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

  .first {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    padding: 10px 12px;
    background: rgba(68, 102, 255, 0.08);
    border-left: 3px solid #4466ff;
    border-radius: 2px;
    margin-bottom: 12px;
  }

  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.6;
    margin: 0 0 14px;
  }

  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }

  .explore-backlink {
    display: inline-block;
    margin: 0 0 14px;
    padding: 6px 10px;
    font-family: 'Space Mono', monospace;
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

  .cta-bar {
    padding: 12px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .surface-link {
    align-self: stretch;
    text-align: center;
    padding: 10px 12px;
    background: rgba(193, 68, 14, 0.14);
    border: 1px solid rgba(193, 68, 14, 0.55);
    border-radius: 4px;
    color: #ffd2c0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    text-decoration: none;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .surface-link:hover,
  .surface-link:focus-visible {
    background: rgba(193, 68, 14, 0.28);
    border-color: #c1440e;
    color: #fff;
    outline: none;
  }
  .cta {
    width: 100%;
    min-height: 48px;
    padding: 12px;
    background: #1a33bb;
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms;
    /* Icon + text alignment for the trajectory-arc glyph. */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .cta:hover,
  .cta:focus-visible {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
  }
  .cta .cta-icon {
    flex: 0 0 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(200, 215, 255, 0.95);
  }

  /* Spec-CTA buttons — vehicle + payload navigation chips at the top
     of the overview tab. Match .cta's general shape (uppercase mono
     label, 4px radius, prominent) but a TEAL tint so they don't read
     as a second primary action competing with the blue Fly button.
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
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 10px;
    transition:
      background 120ms,
      border-color 120ms;
  }
  /* Per-CTA hue split — kept in the SAME blue family as the
     primary .cta (#1a33bb) so all three buttons read as one cohesive
     style (2026-06-15 user note: "harmonize those 2 new buttons more
     with color of fly button — let them all be in same style, fly
     stays as it, we just need to adjust 2 new ones"). Vehicle leans
     darker/cooler (deep navy); payload leans lighter/warmer (cobalt
     with slight violet push). Same hue axis; just value + slight hue
     shift so they stay sibling-to-fly but distinguishable from each
     other at a glance. */
  /* Vehicle = deep indigo / navy (darkest end of the blue axis);
     Payload = bright sky-blue with cyan push (lightest end). Both
     stay in the blue family that anchors Fly (#1a33bb), but with a
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
    background: #1788d4;
    border: 1px solid rgba(120, 200, 250, 0.7);
  }
  .spec-cta--payload:hover,
  .spec-cta--payload:focus-visible {
    background: #2aa0ec;
    border-color: #80c8ff;
    outline: none;
  }
  .spec-cta--payload .spec-icon,
  .spec-cta--payload .spec-label {
    color: rgba(220, 240, 255, 0.95);
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
    background: #1788d4;
    border-color: rgba(120, 200, 250, 0.7);
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
    font-size: 9px;
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
    font-family: 'Space Mono', monospace;
    font-size: 9px;
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
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
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
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(180, 200, 255, 0.55);
    align-self: center;
  }
  .flight-rows dd {
    font-family: 'Space Mono', monospace;
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
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 10px;
    color: rgba(180, 200, 255, 0.5);
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
    border-left: 2px solid rgba(78, 205, 196, 0.4);
    border-radius: 2px;
  }
  .flight-events .event-met {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #4ecdc4;
    font-weight: 700;
  }
  .flight-events .event-type {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.85);
  }
</style>
