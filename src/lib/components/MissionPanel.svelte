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
  import type { ScienceTabId } from '$types/science';

  type Tab = 'overview' | 'gallery' | 'flight' | 'science' | 'learn';

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
    if (f?.launch != null) list.push({ tab: 'mission-phases', section: 'trans-x-injection' });
    if (f?.cruise?.tcm_count != null && f.cruise.tcm_count > 0)
      list.push({ tab: 'mission-phases', section: 'tcm' });
    if (f?.arrival?.v_infinity_km_s != null)
      list.push({ tab: 'propulsion', section: 'v-infinity' });
    if (f?.arrival?.orbit_insertion_dv_km_s != null)
      list.push({ tab: 'mission-phases', section: 'orbit-insertion' });
    if (f?.arrival?.entry_velocity_km_s != null)
      list.push({ tab: 'mission-phases', section: 'edl' });
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

<Panel {open} {onClose} title={mission?.name ?? mission?.id ?? ''}>
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
      <button
        type="button"
        id="mp-tab-science"
        class:active={tab === 'science'}
        onclick={() => (tab = 'science')}
        role="tab"
        aria-selected={tab === 'science'}
        aria-controls="mp-tabpanel">SCIENCE</button
      >
      <button
        type="button"
        id="mp-tab-learn"
        class:active={tab === 'learn'}
        onclick={() => (tab = 'learn')}
        role="tab"
        aria-selected={tab === 'learn'}
        aria-controls="mp-tabpanel">{m.mp_tab_learn()}</button
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
            : tab === 'science'
              ? 'mp-tab-science'
              : 'mp-tab-learn'}
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
          <div class="cell wide">
            <div class="cell-label">{m.mp_label_vehicle()}</div>
            <div class="cell-value">{mission.vehicle ?? '—'}</div>
          </div>
          <div class="cell wide">
            <div class="cell-label">{m.mp_label_payload()}</div>
            <div class="cell-value">{mission.payload ?? '—'}</div>
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

        {#if mission.first}
          <div class="first">{mission.first}</div>
        {/if}

        {#if mission.description}
          <p class="editorial">{mission.description}</p>
        {/if}

        {#if mission.credit}
          <div class="credit">{mission.credit}</div>
        {/if}
      {:else if tab === 'flight'}
        <!-- Trajectory thumbnail at the top of the FLIGHT tab — same
             pre-rendered image used by /missions card hover, mounted
             here so the panel is self-contained (read flight data and
             see the path it produces in one place). -->
        <figure class="flight-thumbnail">
          <img
            src="{base}/images/missions/thumbnails/{mission.id}.png"
            alt=""
            loading="lazy"
            onerror={(e) => {
              const fig = (e.currentTarget as HTMLImageElement).closest('figure');
              if (fig) fig.style.display = 'none';
            }}
          />
        </figure>
        {#if flightCaveat}
          <div class="flight-caveat" role="note">{flightCaveat}</div>
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
                <dt>{m.mp_flight_label_dla()}</dt>
                <dd class="numeric">
                  {mission.flight.launch.declination_deg != null
                    ? m.mp_flight_unit_deg({
                        value: fmtNum(mission.flight.launch.declination_deg, 1),
                      })
                    : '—'}
                </dd>
                <dt>{m.mp_flight_label_mass_at_tli()}</dt>
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
                <dt>{m.mp_flight_label_peak_speed()}</dt>
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
                  <dt>{m.mp_flight_label_entry_velocity()}</dt>
                  <dd class="numeric">
                    {m.mp_flight_unit_kms({
                      value: fmtNum(mission.flight.arrival.entry_velocity_km_s, 2),
                    })}
                  </dd>
                {/if}
                <dt>{m.mp_flight_label_periapsis()}</dt>
                <dd class="numeric">
                  {mission.flight.arrival.periapsis_km != null
                    ? m.mp_flight_unit_km({ value: fmtInt(mission.flight.arrival.periapsis_km) })
                    : '—'}
                </dd>
                <dt>{m.mp_flight_label_inclination()}</dt>
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
                <img {src} alt="" loading="lazy" />
              </button>
            {/each}
          </div>
          <p class="gallery-credit">{missionGalleryCredit(mission.agency)}</p>
        {/if}
      {:else if tab === 'learn'}
        {#if !mission.links || mission.links.length === 0}
          <p class="empty-tab">{m.mp_no_links()}</p>
        {:else}
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
        {/if}
      {/if}
    </div>

    {#if (mission.status !== 'PLANNED' && onFly) || crossSite}
      <div class="cta-bar">
        {#if mission.status !== 'PLANNED' && onFly}
          <button type="button" class="cta" onclick={flyMission} data-testid="fly-mission-btn">
            {m.mp_fly_button()}
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
    <img src={lightboxSrc} alt="" />
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
  }
  .cta:hover,
  .cta:focus-visible {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
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
