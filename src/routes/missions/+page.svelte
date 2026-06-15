<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { audio } from '$lib/audio-state.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { getMissionsForLibrary } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import type { Destination, Mission, MissionStatus } from '$types/mission';
  import { isMissionDestination } from '$lib/mission-dest';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import TimelineNavigator from '$lib/components/TimelineNavigator.svelte';
  import LaunchesBanner from '$lib/components/LaunchesBanner.svelte';
  import * as m from '$lib/paraglide/messages';
  import { agencyLogo, agencyFullName, splitAgencies } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { pickHero, loadHeroOverrides } from '$lib/image-hero';
  import {
    type RemoteData,
    loading as rdLoading,
    error as rdError,
    success as rdSuccess,
    isError,
    isSuccess,
  } from '$lib/types/remote-data';

  // Timeline navigator bounds (ADR-027). Match the constants in
  // TimelineNavigator.svelte; copied here so the URL coercion logic
  // doesn't need a cross-component import dance.
  const TIMELINE_MIN_YEAR = 1957;
  const TIMELINE_MAX_YEAR = 2035;

  // ─── State ───────────────────────────────────────────────────────
  // RemoteData<E,T> per #330 C.2 — collapses the prior {items, loading,
  // loadFailed} triple into a single discriminated union. The `missions`
  // $derived below exposes the success-branch payload as a plain array
  // so the existing filter / sort / template body keeps reading
  // `missions.length`, `missions.filter(...)` without each callsite
  // having to defend against the loading / error variants.
  let missionsRequest = $state<RemoteData<Error, Mission[]>>(rdLoading());
  let missions = $derived(isSuccess(missionsRequest) ? missionsRequest.data : []);

  /**
   * Mission catalog filter state. Bagged into a single typed `$state`
   * object per #330 C.1 — replaces 7 scattered `$state` declarations
   * with one shape that callers can pass around (e.g. the reset funnel
   * below, future URL-sync abstractions).
   *
   * `expanded` is a UI-only field that controls the filter strip's
   * disclosure; the reset funnel deliberately leaves it untouched
   * because clearing filters shouldn't also collapse the strip the
   * user opened.
   */
  interface MissionFilterState {
    dest: Destination | 'ALL';
    status: MissionStatus | 'ALL';
    agency: string;
    crew: 'ALL' | 'CREWED' | 'UNCREWED';
    fromYear: number;
    toYear: number;
    /** RFC-027 — free-text search across name + agency + type + first. */
    q: string;
    expanded: boolean;
  }
  const filterState = $state<MissionFilterState>({
    dest: 'ALL',
    status: 'ALL',
    agency: 'ALL',
    crew: 'ALL',
    fromYear: TIMELINE_MIN_YEAR,
    toYear: TIMELINE_MAX_YEAR,
    q: '',
    expanded: false,
  });

  function resetMissionFilters(): void {
    filterState.dest = 'ALL';
    filterState.status = 'ALL';
    filterState.agency = 'ALL';
    filterState.crew = 'ALL';
    filterState.fromYear = TIMELINE_MIN_YEAR;
    filterState.toYear = TIMELINE_MAX_YEAR;
    filterState.q = '';
  }

  // True when at least one filter is set away from its 'ALL' / full-range
  // default — drives the CLEAR-FILTERS chip in the expanded strip.
  let anyFilterActive = $derived(
    filterState.dest !== 'ALL' ||
      filterState.status !== 'ALL' ||
      filterState.agency !== 'ALL' ||
      filterState.crew !== 'ALL' ||
      filterState.fromYear !== TIMELINE_MIN_YEAR ||
      filterState.toYear !== TIMELINE_MAX_YEAR ||
      filterState.q.trim() !== '',
  );

  function clearAllFilters(): void {
    resetMissionFilters();
    pushFiltersToUrl();
  }

  // Agencies are derived from the loaded mission set so the filter
  // always reflects what's actually in the data — no hardcoded list to
  // drift. Compound agencies like "NASA / ESA / ASI" split into each
  // component chip so clicking ESA matches Cassini, BepiColombo, etc.
  let agencies = $derived(
    Array.from(new Set(missions.flatMap((m) => splitAgencies(m.agency)))).sort(),
  );

  let filtered = $derived(
    missions
      .filter(
        (mission) =>
          // RFC-027 — free-text search across the fields the card renders.
          matchesQuery(
            [mission.name ?? mission.id, mission.agency, mission.type, mission.first],
            filterState.q,
          ) &&
          (filterState.dest === 'ALL' || mission.dest === filterState.dest) &&
          (filterState.status === 'ALL' || mission.status === filterState.status) &&
          (filterState.agency === 'ALL' ||
            splitAgencies(mission.agency).includes(filterState.agency)) &&
          (filterState.crew === 'ALL' ||
            (filterState.crew === 'CREWED' ? mission.crewed === true : mission.crewed !== true)) &&
          mission.year >= filterState.fromYear &&
          mission.year <= filterState.toYear,
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
    filterState.dest = dest && isMissionDestination(dest) ? dest : 'ALL';
    filterState.status =
      status === 'ACTIVE' || status === 'FLOWN' || status === 'PLANNED' ? status : 'ALL';
    filterState.agency = agency ?? 'ALL';
    const crew = url.searchParams.get('crew')?.toUpperCase();
    filterState.crew = crew === 'CREWED' || crew === 'UNCREWED' ? crew : 'ALL';
    // Timeline year-window: out-of-range / non-numeric values clamp
    // to the legal bounds per ADR-027 §URL contract.
    const fromRaw = url.searchParams.get('from');
    const toRaw = url.searchParams.get('to');
    const fromParsed = fromRaw ? parseInt(fromRaw, 10) : NaN;
    const toParsed = toRaw ? parseInt(toRaw, 10) : NaN;
    filterState.fromYear = Number.isFinite(fromParsed)
      ? Math.max(TIMELINE_MIN_YEAR, Math.min(TIMELINE_MAX_YEAR, fromParsed))
      : TIMELINE_MIN_YEAR;
    filterState.toYear = Number.isFinite(toParsed)
      ? Math.max(filterState.fromYear, Math.min(TIMELINE_MAX_YEAR, toParsed))
      : TIMELINE_MAX_YEAR;
    filterState.q = url.searchParams.get('q') ?? '';
    // Auto-expand the filter strip whenever the URL carries any
    // filter param — even if the value clamped back to the default,
    // the user explicitly asked about filters and should see the
    // strip open. Tests rely on this for `?from=…&to=…` deep links.
    if (
      url.searchParams.has('dest') ||
      url.searchParams.has('status') ||
      url.searchParams.has('agency') ||
      url.searchParams.has('crew') ||
      url.searchParams.has('from') ||
      url.searchParams.has('to')
    ) {
      filterState.expanded = true;
    }
  }

  function pushFiltersToUrl() {
    const params = new URLSearchParams();
    if (filterState.dest !== 'ALL') params.set('dest', filterState.dest);
    if (filterState.status !== 'ALL') params.set('status', filterState.status);
    if (filterState.agency !== 'ALL') params.set('agency', filterState.agency);
    if (filterState.crew !== 'ALL') params.set('crew', filterState.crew);
    if (filterState.fromYear !== TIMELINE_MIN_YEAR)
      params.set('from', String(filterState.fromYear));
    if (filterState.toYear !== TIMELINE_MAX_YEAR) params.set('to', String(filterState.toYear));
    if (filterState.q.trim() !== '') params.set('q', filterState.q.trim());
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
    filterState.fromYear = from;
    filterState.toYear = to;
    pushFiltersToUrl();
  }

  function setDest(value: Destination | 'ALL') {
    filterState.dest = value;
    pushFiltersToUrl();
  }

  function setStatus(value: MissionStatus | 'ALL') {
    filterState.status = value;
    pushFiltersToUrl();
  }

  function setCrew(value: 'ALL' | 'CREWED' | 'UNCREWED') {
    filterState.crew = value;
    pushFiltersToUrl();
  }

  function setAgency(value: string) {
    filterState.agency = value;
    pushFiltersToUrl();
  }

  // RFC-027 search input handler. We push immediately on every input
  // event — SvelteKit's `replaceState: true` keeps the back-button
  // clean and the visible card grid updates synchronously via the
  // $derived chain. If real performance hurts on giant lists later,
  // wrap the URL write in a debounce; the matcher itself is sub-ms.
  function setQuery(value: string) {
    filterState.q = value;
    pushFiltersToUrl();
  }

  // Agency logo + full-name lookups delegate to the unified registry
  // at src/lib/agencies.ts. Add new agencies / logos there — every
  // consumer (fleet, missions, ISS modules, launches) picks them up.
  const logoFor = agencyLogo;
  const fullNameFor = (agency: string) => agencyFullName(agency);

  // ─── Card click → open MissionPanel ──────────────────────────────
  let selectedId: string | null = $state(null);
  let panelOpen = $state(false);

  // Auto-compact the Curator Tour overlay when the mission detail panel
  // opens during an active tour (PRD-016 §S8 / RFC-019 §12).
  $effect(() => {
    if (audio.tourActive && panelOpen && !audio.compact) {
      audio.compact = true;
    }
  });

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
    // Pre-warm the hero overrides cache so the first paint of mission
    // cards picks up any Marko-blessed override slot. Falls back to
    // `<id>/01.jpg` silently when no override file exists; safe to
    // fire-and-forget.
    void loadHeroOverrides('missions');
  });
  // Re-fetch when the URL `?lang=` changes so locale switches replace
  // the merged mission overlay set without a full page reload.
  $effect(() => {
    const locale = localeFromPage($page);
    missionsRequest = rdLoading();
    getMissionsForLibrary(locale)
      .then((list) => {
        missionsRequest = rdSuccess(list);
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
        missionsRequest = rdError(err instanceof Error ? err : new Error(String(err)));
      });
  });

  // Keep filters in sync if the user navigates with the back/forward
  // button (URL changes without onMount re-firing).
  $effect(() => {
    applyUrlFilters($page.url);
  });
</script>

<svelte:head><title>{m.missions_page_title()}</title></svelte:head>

<LaunchesBanner />

<div class="library">
  <!-- RFC-027 — free-text search across name + agency + type + first.
       Sits above the FILTERS toggle so it's visible without expanding.
       Placeholder + aria reuse the same i18n key (the ellipsis suffix
       reads fine in a screen-reader announcement). -->
  <div class="search-row">
    <input
      type="search"
      class="search-input"
      placeholder={m.missions_search_placeholder()}
      aria-label={m.missions_search_placeholder()}
      data-testid="missions-search"
      data-audio-stage="missions-search-input"
      value={filterState.q}
      oninput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
    />
  </div>
  <!-- Filters + timeline collapsed by default. The count lives at the
       right end of the toggle bar so the screen stays clean above the
       grid — fraction (filtered / total) when active, total-only when
       not, identical to /fleet for visual consistency. -->
  <button
    type="button"
    class="filters-toggle"
    aria-expanded={filterState.expanded}
    aria-controls={filterState.expanded ? 'missions-filters' : undefined}
    onclick={() => (filterState.expanded = !filterState.expanded)}
  >
    <span class="filters-eyebrow">FILTERS</span>
    <span class="filters-right">
      {#if filtered.length !== missions.length}
        <span class="filters-count count-fraction">{filtered.length} / {missions.length}</span>
      {:else}
        <span class="filters-count count-total-only">{missions.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filterState.expanded ? '▾' : '▸'}</span>
    </span>
  </button>

  {#if filterState.expanded}
    {#if anyFilterActive}
      <button type="button" class="clear-filters" onclick={clearAllFilters}> CLEAR FILTERS </button>
    {/if}
    <TimelineNavigator
      {missions}
      fromYear={filterState.fromYear}
      toYear={filterState.toYear}
      onChange={setYearWindow}
      onSelectMission={selectMission}
    />
    <nav
      id="missions-filters"
      class="filters"
      data-audio-stage="missions-filters"
      aria-label={m.missions_filters_aria()}
    >
      <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_dest_label()}>
        <span class="filter-label">{m.lib_filter_dest_label()}</span>
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'ALL'}
          role="radio"
          aria-checked={filterState.dest === 'ALL'}
          onclick={() => setDest('ALL')}>{m.lib_filter_dest_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'MARS'}
          role="radio"
          aria-checked={filterState.dest === 'MARS'}
          onclick={() => setDest('MARS')}>{m.lib_filter_dest_mars()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'MOON'}
          role="radio"
          aria-checked={filterState.dest === 'MOON'}
          onclick={() => setDest('MOON')}>{m.lib_filter_dest_moon()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'EARTH'}
          role="radio"
          aria-checked={filterState.dest === 'EARTH'}
          onclick={() => setDest('EARTH')}>{m.lib_filter_dest_earth()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'JUPITER'}
          role="radio"
          aria-checked={filterState.dest === 'JUPITER'}
          onclick={() => setDest('JUPITER')}>{m.lib_filter_dest_jupiter()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'NEPTUNE'}
          role="radio"
          aria-checked={filterState.dest === 'NEPTUNE'}
          onclick={() => setDest('NEPTUNE')}>{m.lib_filter_dest_neptune()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'PLUTO'}
          role="radio"
          aria-checked={filterState.dest === 'PLUTO'}
          onclick={() => setDest('PLUTO')}>{m.lib_filter_dest_pluto()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'CERES'}
          role="radio"
          aria-checked={filterState.dest === 'CERES'}
          onclick={() => setDest('CERES')}>{m.lib_filter_dest_ceres()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'COMET'}
          role="radio"
          aria-checked={filterState.dest === 'COMET'}
          onclick={() => setDest('COMET')}>{m.lib_filter_dest_comet()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'ASTEROID'}
          role="radio"
          aria-checked={filterState.dest === 'ASTEROID'}
          onclick={() => setDest('ASTEROID')}>{m.lib_filter_dest_asteroid()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.dest === 'SUN'}
          role="radio"
          aria-checked={filterState.dest === 'SUN'}
          onclick={() => setDest('SUN')}>{m.lib_filter_dest_sun()}</button
        >
      </div>

      <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_status_label()}>
        <span class="filter-label">{m.lib_filter_status_label()}</span>
        <button
          type="button"
          class="pill"
          class:active={filterState.status === 'ALL'}
          role="radio"
          aria-checked={filterState.status === 'ALL'}
          onclick={() => setStatus('ALL')}>{m.lib_filter_status_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.status === 'ACTIVE'}
          role="radio"
          aria-checked={filterState.status === 'ACTIVE'}
          onclick={() => setStatus('ACTIVE')}>{m.lib_filter_status_active()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.status === 'FLOWN'}
          role="radio"
          aria-checked={filterState.status === 'FLOWN'}
          onclick={() => setStatus('FLOWN')}>{m.lib_filter_status_flown()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.status === 'PLANNED'}
          role="radio"
          aria-checked={filterState.status === 'PLANNED'}
          onclick={() => setStatus('PLANNED')}>{m.lib_filter_status_planned()}</button
        >
      </div>

      <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_crew_label()}>
        <span class="filter-label">{m.lib_filter_crew_label()}</span>
        <button
          type="button"
          class="pill"
          class:active={filterState.crew === 'ALL'}
          role="radio"
          aria-checked={filterState.crew === 'ALL'}
          onclick={() => setCrew('ALL')}>{m.lib_filter_crew_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.crew === 'CREWED'}
          role="radio"
          aria-checked={filterState.crew === 'CREWED'}
          onclick={() => setCrew('CREWED')}>{m.lib_filter_crew_crewed()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.crew === 'UNCREWED'}
          role="radio"
          aria-checked={filterState.crew === 'UNCREWED'}
          onclick={() => setCrew('UNCREWED')}>{m.lib_filter_crew_uncrewed()}</button
        >
      </div>

      {#if agencies.length > 0}
        <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_agency_label()}>
          <span class="filter-label">{m.lib_filter_agency_label()}</span>
          <button
            type="button"
            class="pill"
            class:active={filterState.agency === 'ALL'}
            role="radio"
            aria-checked={filterState.agency === 'ALL'}
            onclick={() => setAgency('ALL')}>{m.lib_filter_agency_all()}</button
          >
          {#each agencies as agency (agency)}
            {@const logo = logoFor(agency)}
            {@const fullName = fullNameFor(agency)}
            <button
              type="button"
              class="pill agency-pill"
              class:active={filterState.agency === agency}
              class:logo-pill={logo != null}
              role="radio"
              aria-checked={filterState.agency === agency}
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
                  loading="lazy"
                  decoding="async"
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

  {#if isError(missionsRequest)}
    <div class="load-banner" role="alert">{m.lib_load_failed()}</div>
  {:else if !isSuccess(missionsRequest)}
    <div class="loading" role="status" aria-live="polite">{m.missions_loading()}</div>
  {:else if filtered.length === 0}
    <div class="empty">{m.lib_empty()}</div>
  {:else}
    <ul class="grid" data-audio-stage="missions-grid" aria-label={m.missions_grid_aria()}>
      {#each filtered as mission (mission.id)}
        <li class="card-li">
          <button
            type="button"
            class="card"
            class:selected={selectedId === mission.id}
            style:--accent={mission.color}
            data-testid="mission-card-{mission.id}"
            data-audio-stage="missions-select-{mission.id}"
            onclick={() => selectMission(mission.id)}
          >
            <div class="card-accent" aria-hidden="true"></div>
            <figure class="card-photo">
              <img
                class="card-cover"
                src={pickHero('missions', mission.id)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </figure>
            <div class="card-body">
              <header class="card-head">
                <span
                  class="agency-badge"
                  style:background-color={mission.color}
                  title={agencyFullName(mission.agency) ?? mission.agency}
                >
                  {#if logoFor(mission.agency)}
                    <img
                      src={logoFor(mission.agency)}
                      alt=""
                      class="agency-logo"
                      aria-hidden="true"
                      onerror={(e) =>
                        ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                      loading="lazy"
                      decoding="async"
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
              <!-- <dl> upgrade (PRD-007 / GH #256 / ADR-025 v0.7.0):
                   year + dest expressed as definition pairs so screen
                   readers announce them as labelled facts ("Year: 1969",
                   "Destination: MOON") rather than two adjacent spans. -->
              <dl class="card-meta">
                <dt class="sr-only">{m.missions_card_year_label()}</dt>
                <dd class="card-year">{mission.year}</dd>
                <dt class="sr-only">{m.missions_card_dest_label()}</dt>
                <dd class="card-dest">{mission.dest}</dd>
              </dl>
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

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
     handles for the audio executor's `click` action so the tour can
     demonstrate "Click any mission card" without a real raycaster hit. -->
<div class="tour-anchors" aria-hidden="true">
  <button
    type="button"
    data-audio-stage="missions-select-apollo11"
    tabindex="-1"
    onclick={() => selectMission('apollo11')}>select apollo 11</button
  >
  <button
    type="button"
    data-audio-stage="missions-select-curiosity"
    tabindex="-1"
    onclick={() => selectMission('curiosity')}>select curiosity</button
  >
  <button
    type="button"
    data-audio-stage="missions-select-voyager-2"
    tabindex="-1"
    onclick={() => selectMission('voyager-2')}>select voyager 2</button
  >
  <button
    type="button"
    data-audio-stage="missions-select-cassini"
    tabindex="-1"
    onclick={() => selectMission('cassini')}>select cassini</button
  >
</div>

<style>
  .library {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }
  /* Screen-reader-only — visually hidden, kept in tab order + a11y tree.
     Used for the <dl><dt> labels on card metadata (GH #256). */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* RFC-027 search input — sits above the FILTERS toggle. Same visual
     family as the .filters-toggle border + Space-Mono type so it reads
     as part of the same control strip. */
  .search-row {
    margin-bottom: 8px;
  }
  .search-input {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 12px;
    color: rgba(255, 255, 255, 0.85);
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    transition: border-color 120ms;
  }
  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
  .search-input:focus {
    outline: none;
    border-color: #4ecdc4;
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
  /* CLEAR FILTERS chip — visible inside the expanded strip only when
     at least one filter is active. Same chip aesthetic as the other
     filter rows but with a muted accent to read as a discard action
     rather than a select action. */
  .clear-filters {
    align-self: flex-end;
    padding: 6px 12px;
    margin-bottom: 8px;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    cursor: pointer;
  }
  .clear-filters:hover,
  .clear-filters:focus-visible {
    border-color: rgba(255, 255, 255, 0.35);
    color: rgba(255, 255, 255, 0.95);
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

  /* Card list-item wrapper — `height: 100%` makes the wrapper fill its
   * grid cell (which is row-height = tallest item per row, by CSS Grid
   * default). Without it the wrapper sizes to its content, and adjacent
   * cards in the same row appear at different heights when one has
   * more text than another. Issue #225. */
  .card-li {
    position: relative;
    height: 100%;
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
