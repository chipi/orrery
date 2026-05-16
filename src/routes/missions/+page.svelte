<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { getMissionsForLibrary } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import type { Destination, Mission, MissionStatus } from '$types/mission';
  import { isMissionDestination } from '$lib/mission-dest';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import TimelineNavigator from '$lib/components/TimelineNavigator.svelte';
  import * as m from '$lib/paraglide/messages';

  // Timeline navigator bounds (ADR-027). Match the constants in
  // TimelineNavigator.svelte; copied here so the URL coercion logic
  // doesn't need a cross-component import dance.
  const TIMELINE_MIN_YEAR = 1957;
  const TIMELINE_MAX_YEAR = 2035;

  // ─── State ───────────────────────────────────────────────────────
  let missions: Mission[] = $state([]);
  let loading = $state(true);
  let loadFailed = $state(false);

  // Filters: parsed from URL query so /missions?dest=MARS pre-applies
  // on first load (RFC-004). Updates write back to the URL via goto().
  let destFilter: Destination | 'ALL' = $state('ALL');
  let statusFilter: MissionStatus | 'ALL' = $state('ALL');
  let agencyFilter: string = $state('ALL');
  // J.1 — filter strip is collapsed by default; clicking the eyebrow
  // expands it. Resets on route mount.
  let filtersExpanded = $state(false);
  // Timeline navigator year window (ADR-027). Default = full range
  // = no year filter applied.
  let fromYear: number = $state(TIMELINE_MIN_YEAR);
  let toYear: number = $state(TIMELINE_MAX_YEAR);

  // Agencies are derived from the loaded mission set so the filter
  // always reflects what's actually in the data — no hardcoded list
  // to drift.
  let agencies = $derived(
    Array.from(new Set(missions.map((m) => m.agency).filter(Boolean))).sort(),
  );

  let filtered = $derived(
    missions
      .filter(
        (mission) =>
          (destFilter === 'ALL' || mission.dest === destFilter) &&
          (statusFilter === 'ALL' || mission.status === statusFilter) &&
          (agencyFilter === 'ALL' || mission.agency === agencyFilter) &&
          mission.year >= fromYear &&
          mission.year <= toYear,
      )
      // J.1 — sort descending by year so the latest + upcoming missions
      // surface at the top of the grid. Tiebreak by mission id for
      // stable order within a year.
      .slice()
      .sort((a, b) => b.year - a.year || a.id.localeCompare(b.id)),
  );

  // ─── URL ↔ filter sync ───────────────────────────────────────────
  function applyUrlFilters(url: URL) {
    const dest = url.searchParams.get('dest')?.toUpperCase();
    const status = url.searchParams.get('status')?.toUpperCase();
    const agency = url.searchParams.get('agency');
    destFilter = dest && isMissionDestination(dest) ? dest : 'ALL';
    statusFilter =
      status === 'ACTIVE' || status === 'FLOWN' || status === 'PLANNED' ? status : 'ALL';
    agencyFilter = agency ?? 'ALL';
    // Timeline year-window: out-of-range / non-numeric values clamp
    // to the legal bounds per ADR-027 §URL contract.
    const fromRaw = url.searchParams.get('from');
    const toRaw = url.searchParams.get('to');
    const fromParsed = fromRaw ? parseInt(fromRaw, 10) : NaN;
    const toParsed = toRaw ? parseInt(toRaw, 10) : NaN;
    fromYear = Number.isFinite(fromParsed)
      ? Math.max(TIMELINE_MIN_YEAR, Math.min(TIMELINE_MAX_YEAR, fromParsed))
      : TIMELINE_MIN_YEAR;
    toYear = Number.isFinite(toParsed)
      ? Math.max(fromYear, Math.min(TIMELINE_MAX_YEAR, toParsed))
      : TIMELINE_MAX_YEAR;
    // Auto-expand the filter strip whenever the URL carries any
    // filter param — even if the value clamped back to the default,
    // the user explicitly asked about filters and should see the
    // strip open. Tests rely on this for `?from=…&to=…` deep links.
    if (
      url.searchParams.has('dest') ||
      url.searchParams.has('status') ||
      url.searchParams.has('agency') ||
      url.searchParams.has('from') ||
      url.searchParams.has('to')
    ) {
      filtersExpanded = true;
    }
  }

  function pushFiltersToUrl() {
    const params = new URLSearchParams();
    if (destFilter !== 'ALL') params.set('dest', destFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (agencyFilter !== 'ALL') params.set('agency', agencyFilter);
    if (fromYear !== TIMELINE_MIN_YEAR) params.set('from', String(fromYear));
    if (toYear !== TIMELINE_MAX_YEAR) params.set('to', String(toYear));
    const qs = params.toString();
    const target = `${base}/missions${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      // replaceState avoids littering the back-button history with
      // every filter toggle.
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  // Timeline drag handler — debounced via the existing reactive flow
  // so a long drag doesn't thrash the URL. (Svelte 5's $derived reacts
  // synchronously per assignment; goto() is debounced inside SvelteKit.)
  function setYearWindow(from: number, to: number) {
    fromYear = from;
    toYear = to;
    pushFiltersToUrl();
  }

  function setDest(value: Destination | 'ALL') {
    destFilter = value;
    pushFiltersToUrl();
  }

  function setStatus(value: MissionStatus | 'ALL') {
    statusFilter = value;
    pushFiltersToUrl();
  }

  function setAgency(value: string) {
    agencyFilter = value;
    pushFiltersToUrl();
  }

  // Agency logo path. SVGs are fetched at build by scripts/fetch-assets.ts
  // (Wikimedia Commons, public-domain). Only the eight agencies whose
  // logos ship with the build appear in the whitelist below — any
  // agency outside it (Inspiration Mars, Blue Origin, etc.) returns
  // null and the <img> is omitted entirely so the browser never fires
  // a 404 for a known-missing logo (which the smoke-test asserts on).
  const KNOWN_AGENCY_LOGOS = new Set([
    'nasa',
    'esa',
    'jaxa',
    'isro',
    'cnsa',
    'roscosmos',
    'spacex',
    'uaesa',
  ]);
  function logoFor(agency: string): string | null {
    const key = agency.toLowerCase();
    return KNOWN_AGENCY_LOGOS.has(key) ? `${base}/logos/${key}.svg` : null;
  }

  // Full-name mapping for the agency filter pills' tooltips. Sourced
  // from static/data/source-logos.json (the same canonical names the
  // /credits page renders). Inline because the filter row only needs
  // names for the agency abbreviations that actually appear in mission
  // data — about a dozen — and an inline map avoids an extra fetch.
  const AGENCY_FULL_NAMES: Record<string, string> = {
    nasa: 'NASA',
    esa: 'European Space Agency',
    jaxa: 'Japan Aerospace Exploration Agency',
    isro: 'Indian Space Research Organisation',
    cnsa: 'China National Space Administration',
    roscosmos: 'Roscosmos',
    spacex: 'SpaceX',
    uaesa: 'MBRSC / UAE Space Agency',
    'blue-origin': 'Blue Origin',
    'blue origin': 'Blue Origin',
    csa: 'Canadian Space Agency',
  };
  function fullNameFor(agency: string): string {
    return AGENCY_FULL_NAMES[agency.toLowerCase()] ?? agency;
  }

  // ─── Card click → open MissionPanel ──────────────────────────────
  let selectedId: string | null = $state(null);
  let panelOpen = $state(false);

  let selectedMission = $derived(
    selectedId ? (missions.find((mission) => mission.id === selectedId) ?? null) : null,
  );

  function selectMission(id: string) {
    selectedId = id;
    panelOpen = true;
  }
  function closePanel() {
    panelOpen = false;
  }
  function flyMission(id: string) {
    goto(`${base}/fly?mission=${id}`);
  }

  // ─── Load ────────────────────────────────────────────────────────
  onMount(() => {
    applyUrlFilters($page.url);
  });
  // Re-fetch when the URL `?lang=` changes so locale switches replace
  // the merged mission overlay set without a full page reload.
  $effect(() => {
    const locale = localeFromPage($page);
    loading = true;
    loadFailed = false;
    getMissionsForLibrary(locale)
      .then((list) => {
        missions = list;
        loading = false;
        // Apply ?id= deep-link after data lands so the cross-link from
        // /mars or /moon ("FULL MISSION CARD" chip) opens the right
        // mission's panel pre-selected.
        const idParam = $page.url.searchParams.get('id');
        if (idParam && list.some((mission) => mission.id === idParam)) {
          selectedId = idParam;
          panelOpen = true;
        }
      })
      .catch((err) => {
        console.error('Failed to load mission library:', err);
        loading = false;
        loadFailed = true;
      });
  });

  // Keep filters in sync if the user navigates with the back/forward
  // button (URL changes without onMount re-firing).
  $effect(() => {
    applyUrlFilters($page.url);
  });
</script>

<svelte:head><title>{m.missions_page_title()}</title></svelte:head>

<div class="library">
  <!-- Filters + timeline collapsed by default. The count lives at the
       right end of the toggle bar so the screen stays clean above the
       grid — fraction (filtered / total) when active, total-only when
       not, identical to /fleet for visual consistency. -->
  <button
    type="button"
    class="filters-toggle"
    aria-expanded={filtersExpanded}
    aria-controls="missions-filters"
    onclick={() => (filtersExpanded = !filtersExpanded)}
  >
    <span class="filters-eyebrow">FILTERS</span>
    <span class="filters-right">
      {#if filtered.length !== missions.length}
        <span class="filters-count count-fraction">{filtered.length} / {missions.length}</span>
      {:else}
        <span class="filters-count count-total-only">{missions.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filtersExpanded ? '▾' : '▸'}</span>
    </span>
  </button>

  {#if filtersExpanded}
    <TimelineNavigator
      {missions}
      {fromYear}
      {toYear}
      onChange={setYearWindow}
      onSelectMission={selectMission}
    />
    <nav id="missions-filters" class="filters" aria-label={m.missions_filters_aria()}>
      <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_dest_label()}>
        <span class="filter-label">{m.lib_filter_dest_label()}</span>
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'ALL'}
          role="radio"
          aria-checked={destFilter === 'ALL'}
          onclick={() => setDest('ALL')}>{m.lib_filter_dest_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'MARS'}
          role="radio"
          aria-checked={destFilter === 'MARS'}
          onclick={() => setDest('MARS')}>{m.lib_filter_dest_mars()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'MOON'}
          role="radio"
          aria-checked={destFilter === 'MOON'}
          onclick={() => setDest('MOON')}>{m.lib_filter_dest_moon()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'JUPITER'}
          role="radio"
          aria-checked={destFilter === 'JUPITER'}
          onclick={() => setDest('JUPITER')}>{m.lib_filter_dest_jupiter()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'NEPTUNE'}
          role="radio"
          aria-checked={destFilter === 'NEPTUNE'}
          onclick={() => setDest('NEPTUNE')}>{m.lib_filter_dest_neptune()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'PLUTO'}
          role="radio"
          aria-checked={destFilter === 'PLUTO'}
          onclick={() => setDest('PLUTO')}>{m.lib_filter_dest_pluto()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={destFilter === 'CERES'}
          role="radio"
          aria-checked={destFilter === 'CERES'}
          onclick={() => setDest('CERES')}>{m.lib_filter_dest_ceres()}</button
        >
      </div>

      <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_status_label()}>
        <span class="filter-label">{m.lib_filter_status_label()}</span>
        <button
          type="button"
          class="pill"
          class:active={statusFilter === 'ALL'}
          role="radio"
          aria-checked={statusFilter === 'ALL'}
          onclick={() => setStatus('ALL')}>{m.lib_filter_status_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={statusFilter === 'ACTIVE'}
          role="radio"
          aria-checked={statusFilter === 'ACTIVE'}
          onclick={() => setStatus('ACTIVE')}>{m.lib_filter_status_active()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={statusFilter === 'FLOWN'}
          role="radio"
          aria-checked={statusFilter === 'FLOWN'}
          onclick={() => setStatus('FLOWN')}>{m.lib_filter_status_flown()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={statusFilter === 'PLANNED'}
          role="radio"
          aria-checked={statusFilter === 'PLANNED'}
          onclick={() => setStatus('PLANNED')}>{m.lib_filter_status_planned()}</button
        >
      </div>

      {#if agencies.length > 0}
        <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_agency_label()}>
          <span class="filter-label">{m.lib_filter_agency_label()}</span>
          <button
            type="button"
            class="pill"
            class:active={agencyFilter === 'ALL'}
            role="radio"
            aria-checked={agencyFilter === 'ALL'}
            onclick={() => setAgency('ALL')}>{m.lib_filter_agency_all()}</button
          >
          {#each agencies as agency (agency)}
            {@const logo = logoFor(agency)}
            {@const fullName = fullNameFor(agency)}
            <button
              type="button"
              class="pill agency-pill"
              class:active={agencyFilter === agency}
              class:logo-pill={logo != null}
              role="radio"
              aria-checked={agencyFilter === agency}
              aria-label={fullName}
              title={fullName}
              onclick={() => setAgency(agency)}
            >
              {#if logo}
                <img
                  src={logo}
                  alt={fullName}
                  class="agency-pill-logo"
                  onerror={(e) => {
                    // Logo missing → fall back to text label so the pill
                    // never renders blank.
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                    const fb = img.nextElementSibling as HTMLElement | null;
                    if (fb) fb.style.display = 'inline';
                  }}
                />
                <span class="agency-pill-fallback" hidden>{agency}</span>
              {:else}
                {agency}
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </nav>
  {/if}

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.lib_load_failed()}</div>
  {:else if loading}
    <div class="loading" role="status" aria-live="polite">{m.missions_loading()}</div>
  {:else if filtered.length === 0}
    <div class="empty">{m.lib_empty()}</div>
  {:else}
    <ul class="grid" aria-label={m.missions_grid_aria()}>
      {#each filtered as mission (mission.id)}
        <li class="card-li">
          <button
            type="button"
            class="card"
            class:selected={selectedId === mission.id}
            style:--accent={mission.color}
            data-testid="mission-card-{mission.id}"
            onclick={() => selectMission(mission.id)}
          >
            <div class="card-accent" aria-hidden="true"></div>
            <!-- Mission cover image + trajectory thumbnail. The
                 trajectory image (pre-rendered at build time, see
                 scripts/fetch-assets.ts) overlays the cover photo on
                 hover so the card itself flips to the flight preview
                 — replaces the v0.1.11 floating popup since the
                 in-place swap uses the existing card real estate
                 instead of competing with neighbouring tiles for
                 viewport space. -->
            <figure class="card-photo">
              <img
                class="card-cover"
                src="{base}/images/missions/{mission.id}.jpg"
                alt=""
                loading="lazy"
                onerror={(e) => {
                  const fig = (e.currentTarget as HTMLImageElement).closest('figure');
                  if (fig) fig.classList.add('cover-missing');
                }}
              />
              <img
                class="card-trajectory"
                src="{base}/images/missions/thumbnails/{mission.id}.png"
                alt=""
                loading="lazy"
                aria-hidden="true"
              />
            </figure>
            <div class="card-body">
              <header class="card-head">
                <span class="agency-badge" style:background-color={mission.color}>
                  {#if logoFor(mission.agency)}
                    <img
                      src={logoFor(mission.agency)}
                      alt=""
                      class="agency-logo"
                      aria-hidden="true"
                      onerror={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                    />
                  {/if}
                  {mission.agency}
                </span>
                <span class="card-status status-{mission.status.toLowerCase()}">
                  {mission.status}
                </span>
                {#if mission.flight_data_quality}
                  <span
                    class="card-quality quality-{mission.flight_data_quality}"
                    title={m.lib_flight_data_quality_aria({
                      q: mission.flight_data_quality.toUpperCase(),
                    })}
                  >
                    {#if mission.flight_data_quality === 'measured'}
                      {m.lib_flight_data_quality_measured()}
                    {:else if mission.flight_data_quality === 'sparse'}
                      {m.lib_flight_data_quality_sparse()}
                    {:else if mission.flight_data_quality === 'reconstructed'}
                      {m.lib_flight_data_quality_reconstructed()}
                    {:else}
                      {m.lib_flight_data_quality_unknown()}
                    {/if}
                  </span>
                {/if}
              </header>
              <h2 class="card-name">{mission.name ?? mission.id}</h2>
              {#if mission.type}
                <p class="card-type">{mission.type}</p>
              {/if}
              <div class="card-meta">
                <span class="card-year">{mission.year}</span>
                <span class="card-dest">{mission.dest}</span>
              </div>
              {#if mission.first}
                <p class="card-first">{mission.first}</p>
              {/if}
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<MissionPanel mission={selectedMission} open={panelOpen} onClose={closePanel} onFly={flyMission} />

<style>
  .library {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Inline count chip on the right end of the filters toggle bar.
     Fraction (filtered / total) is teal when active; total-only is
     muted. Mirrors the same chip on /fleet. */
  .filters-right {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .filters-count {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
  }
  .count-fraction {
    color: #4ecdc4;
  }
  .count-total-only {
    color: rgba(255, 255, 255, 0.5);
  }

  /* Collapsible filters toggle strip. */
  .filters-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.65);
    font-family: 'Space Mono', monospace;
    cursor: pointer;
    transition:
      border-color 120ms,
      color 120ms;
  }
  .filters-toggle:hover,
  .filters-toggle:focus-visible {
    border-color: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.92);
    outline: none;
  }
  .filters-eyebrow {
    font-size: 8px;
    letter-spacing: 2px;
  }
  .filters-chevron {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding: 8px 0 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 14px;
    overflow-x: auto;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .filter-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.3);
    margin-right: 4px;
  }
  .pill {
    min-height: 44px;
    min-width: 44px;
    padding: 6px 14px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pill:hover:not(.active) {
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.75);
  }
  .pill.active {
    background: rgba(68, 102, 255, 0.25);
    border-color: rgba(68, 102, 255, 0.5);
    color: #fff;
  }
  .pill:focus-visible {
    outline: 2px solid #4466ff;
    outline-offset: 2px;
  }

  /* Logo-mode agency pill: tighter padding (the logo is the label),
     fixed minimum width so all agency pills line up uniformly, and
     a subtle white tint that hover/active darkens. The image itself
     is sized to match the pill's text metrics so the row reads as
     one consistent strip. */
  .pill.logo-pill {
    padding: 4px 10px;
    min-width: 56px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .agency-pill-logo {
    height: 22px;
    width: auto;
    max-width: 60px;
    object-fit: contain;
    display: block;
    /* Most logos are full-color SVGs; lift contrast on the dark UI
       and de-saturate the inactive state so the active one pops. */
    opacity: 0.6;
    transition: opacity 0.15s;
  }
  .pill.logo-pill:hover .agency-pill-logo,
  .pill.logo-pill.active .agency-pill-logo {
    opacity: 1;
  }
  .pill.logo-pill.active {
    background: rgba(68, 102, 255, 0.18);
    border-color: rgba(68, 102, 255, 0.55);
  }

  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    /* Mobile (≤600 px): 2 columns at typical phone widths via auto-fill +
     * minmax(150 px) — same density as /fleet, which is what the
     * user is comparing against. 1-column was wasted vertical space on
     * a 9-cards-tall viewport. (Issue #125.) The min(150 px) floor still
     * gracefully falls back to 1 column on very narrow viewports (<340 px). */
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
  @media (min-width: 600px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 960px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 1280px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* Card list-item wrapper — needed so the absolutely-positioned
   * thumbnail can be a sibling of the card button without breaking
   * the grid-cell layout. `height: 100%` makes the wrapper fill its
   * grid cell (which is row-height = tallest item per row, by CSS
   * Grid default). Without it the wrapper sizes to its content, and
   * adjacent cards in the same row appear at different heights when
   * one has more text than another. Issue #225. */
  .card-li {
    position: relative;
    height: 100%;
  }
  /* Trajectory image stacks on top of the cover photo and fades in
     on hover (desktop). Mobile devices without :hover get the FLY
     button to /fly for the full trajectory — no in-card swap. */
  .card-trajectory {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: rgba(4, 4, 12, 0.92);
    opacity: 0;
    transition: opacity 160ms ease;
    pointer-events: none;
  }
  @media (hover: hover) {
    .card:hover .card-trajectory,
    .card:focus-visible .card-trajectory {
      opacity: 1;
    }
  }
  /* When the cover photo's onerror fires, the trajectory is the only
     thing in the figure — make it always visible so the card is not
     blank. The class is set imperatively via onerror, so wrap in
     :global() to keep Svelte's CSS purger from dropping the rule. */
  :global(.card-photo.cover-missing .card-trajectory) {
    opacity: 1;
  }
  :global(.card-photo.cover-missing .card-cover) {
    display: none;
  }

  .card {
    width: 100%;
    /* Fill the .card-li wrapper, which itself fills the grid cell.
     * Equal-height cards across the row regardless of text length. */
    height: 100%;
    text-align: left;
    background: rgba(10, 10, 22, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 4px 1fr;
    grid-template-rows: auto 1fr;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    transition:
      border-color 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    min-height: 44px;
  }
  .card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
  .card:focus-visible {
    outline: 2px solid var(--accent, #4466ff);
    outline-offset: 2px;
  }
  .card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 20px rgb(from var(--accent) r g b / 0.2);
  }
  .card-accent {
    background: var(--accent);
    grid-row: 1 / span 2;
  }
  .card-photo {
    grid-column: 2;
    margin: 0;
    padding: 0;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    position: relative;
    background: rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  .card-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  .card:hover .card-photo img {
    transform: scale(1.04);
  }
  .card-body {
    grid-column: 2;
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .agency-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .agency-logo {
    height: 14px;
    width: auto;
    max-width: 18px;
    object-fit: contain;
    /* White-tint the SVG so dark logos remain legible against the
       coloured agency badge background. CSS filter avoids needing a
       per-agency variant. */
    filter: brightness(0) invert(1);
    opacity: 0.95;
  }
  .card-status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-flown {
    /* Was 0.5 — bumped to 0.7 (F3) so the 7 px FLOWN badge clears
       WCAG AA against the card background. */
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    /* Was #4466ff — bumped to #7b96ff (F3) so the 7 px PLANNED badge
       clears WCAG AA on the dark card background. Same blue family,
       lighter step. */
    color: #7b96ff;
    border-color: rgba(123, 150, 255, 0.45);
    background: rgba(68, 102, 255, 0.1);
  }

  /* Flight-data quality badge (v0.1.13). Sits next to .card-status
   * inside .card-head. Same visual scale; semantic colour scheme. */
  .card-quality {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 3px;
    border: 1px solid;
  }
  .quality-measured {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.35);
    background: rgba(78, 205, 196, 0.06);
  }
  .quality-sparse {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.4);
    background: rgba(255, 200, 80, 0.08);
  }
  .quality-reconstructed {
    color: #ff9966;
    border-color: rgba(255, 153, 102, 0.4);
    background: rgba(255, 153, 102, 0.08);
  }
  .quality-unknown {
    color: rgba(255, 255, 255, 0.4);
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.02);
  }

  .card-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    color: #fff;
    line-height: 1;
    margin: 0;
  }
  .card-type {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    /* Was 0.4 — bumped to 0.7 (F3) to clear AA on 7 px caption text. */
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }
  .card-meta {
    display: flex;
    gap: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    /* Was 0.3 — bumped to 0.65 (F3) for the 8 px year/dest meta-row. */
    color: rgba(255, 255, 255, 0.65);
  }
  .card-dest {
    max-width: 12ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-first {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin: 0;
  }

  .loading,
  .empty {
    padding: 40px;
    text-align: center;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
  }

  .load-banner {
    margin: 24px 0;
    padding: 12px 16px;
    background: rgba(193, 68, 14, 0.15);
    border: 1px solid rgba(193, 68, 14, 0.5);
    border-radius: 4px;
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    text-align: center;
  }
</style>
