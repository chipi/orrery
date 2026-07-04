<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { audio } from '$lib/audio-state.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { setCurrentCard, trackCardNavigation } from '$lib/card-chain.svelte';
  import { base } from '$app/paths';
  import { getMissionsForLibrary } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import type { Destination, Mission, MissionStatus } from '$types/mission';
  import { isMissionDestination } from '$lib/mission-dest';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import { handleGridKeydown } from '$lib/grid-keyboard-nav';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import { EPOCH_BANDS, epochForYear } from '$lib/epoch-bands';
  import type { FleetEpoch } from '$types/fleet';
  import LaunchesBanner from '$lib/components/LaunchesBanner.svelte';
  import * as m from '$lib/paraglide/messages';
  import { agencyLogo, agencyFullName, splitAgencies } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { trackFilterChange, trackSearch } from '$lib/analytics';
  import { pickHero, loadHeroOverrides } from '$lib/image-hero';
  import {
    type RemoteData,
    loading as rdLoading,
    error as rdError,
    success as rdSuccess,
    isError,
    isSuccess,
  } from '$lib/types/remote-data';

  // EpochTimelineStrip URL allowlist — same shape as /fleet's epochValid.
  // The strip writes `?epoch=<id>`; this validates round-trips so a junk
  // value falls back to 'ALL' instead of cratering the filter.
  function epochValid(v: string): boolean {
    return EPOCH_BANDS.some((b) => b.id === v);
  }

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
    /**
     * Historic-epoch filter (2026-06-17). Replaces the prior
     * fromYear/toYear range driven by TimelineNavigator — Marko
     * preferred /fleet's named-band UX ("apply time scrub filter as we
     * have on fleet also on missions. I like that one more"). Bands +
     * year ranges live in $lib/epoch-bands.ts.
     */
    epoch: FleetEpoch | 'ALL';
    /** RFC-027 — free-text search across name + agency + type + first. */
    q: string;
    expanded: boolean;
  }
  const filterState = $state<MissionFilterState>({
    dest: 'ALL',
    status: 'ALL',
    agency: 'ALL',
    crew: 'ALL',
    epoch: 'ALL',
    q: '',
    expanded: false,
  });

  function resetMissionFilters(): void {
    filterState.dest = 'ALL';
    filterState.status = 'ALL';
    filterState.agency = 'ALL';
    filterState.crew = 'ALL';
    filterState.epoch = 'ALL';
    filterState.q = '';
  }

  // Analytics: which filters + searches people use on the mission catalog.
  // Chip changes fire immediately; the free-text query is debounced and
  // length-capped (privacy) so we learn what they look for, not a keylog.
  const _prevMissionFilters = {
    dest: 'ALL',
    status: 'ALL',
    agency: 'ALL',
    crew: 'ALL',
    epoch: 'ALL',
  };
  let _missionSearchTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    for (const k of ['dest', 'status', 'agency', 'crew', 'epoch'] as const) {
      if (filterState[k] !== _prevMissionFilters[k]) {
        trackFilterChange('missions', k, filterState[k]);
        _prevMissionFilters[k] = filterState[k];
      }
    }
    const q = filterState.q;
    if (_missionSearchTimer) clearTimeout(_missionSearchTimer);
    if (q.trim()) _missionSearchTimer = setTimeout(() => trackSearch('missions', q), 800);
    return () => {
      if (_missionSearchTimer) clearTimeout(_missionSearchTimer);
    };
  });

  // True when at least one filter is set away from its 'ALL' default —
  // drives the CLEAR-FILTERS chip in the expanded strip.
  let anyFilterActive = $derived(
    filterState.dest !== 'ALL' ||
      filterState.status !== 'ALL' ||
      filterState.agency !== 'ALL' ||
      filterState.crew !== 'ALL' ||
      filterState.epoch !== 'ALL' ||
      filterState.q.trim() !== '',
  );

  // Count map for EpochTimelineStrip — band labels show counts based
  // on the unfiltered mission set (full inventory per band, not the
  // current filter slice). Computed via epochForYear() since Mission
  // records have only `year`, not the explicit `epoch` field that
  // FleetIndexEntry records carry.
  let countByEpoch: Map<FleetEpoch, number> = $derived.by(() => {
    const map = new Map<FleetEpoch, number>();
    for (const mission of missions) {
      const ep = epochForYear(mission.year);
      if (ep) map.set(ep, (map.get(ep) ?? 0) + 1);
    }
    return map;
  });

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
          // RFC-027 — free-text search across the fields the user can
          // see on the mission card + panel. 2026-06-15: extended to
          // cover description / payload / vehicle so the search
          // matches /fleet's behaviour ("fleet search finds text in
          // description / overview tab while on missions it does
          // not"). description + first live in the i18n overlay so
          // they're present on the merged Mission record at runtime.
          matchesQuery(
            [
              mission.name ?? mission.id,
              mission.agency,
              mission.type,
              mission.first,
              mission.description,
              mission.payload,
              mission.vehicle,
            ],
            filterState.q,
          ) &&
          (filterState.dest === 'ALL' || mission.dest === filterState.dest) &&
          (filterState.status === 'ALL' || mission.status === filterState.status) &&
          (filterState.agency === 'ALL' ||
            splitAgencies(mission.agency).includes(filterState.agency)) &&
          (filterState.crew === 'ALL' ||
            (filterState.crew === 'CREWED' ? mission.crewed === true : mission.crewed !== true)) &&
          (filterState.epoch === 'ALL' || epochForYear(mission.year) === filterState.epoch),
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
    // Epoch filter — falls back to 'ALL' on unknown values so a stale
    // ?epoch param from a removed band doesn't crater the page.
    const epochRaw = url.searchParams.get('epoch');
    filterState.epoch = epochRaw && epochValid(epochRaw) ? (epochRaw as FleetEpoch) : 'ALL';
    filterState.q = url.searchParams.get('q') ?? '';
    // Auto-expand the filter strip whenever the URL carries any
    // filter param — even if the value clamped back to the default,
    // the user explicitly asked about filters and should see the
    // strip open.
    if (
      url.searchParams.has('dest') ||
      url.searchParams.has('status') ||
      url.searchParams.has('agency') ||
      url.searchParams.has('crew') ||
      url.searchParams.has('epoch')
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
    if (filterState.epoch !== 'ALL') params.set('epoch', filterState.epoch);
    if (filterState.q.trim() !== '') params.set('q', filterState.q.trim());
    const qs = params.toString();
    const target = `${base}/missions${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      // replaceState avoids littering the back-button history with
      // every filter toggle.
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function setEpoch(value: FleetEpoch | 'ALL') {
    filterState.epoch = value;
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
    // Grid-click opens the panel via state only (no ?id= in the URL), so
    // afterNavigate never fires — the detail-card chain would miss this card
    // and an in-card link out (e.g. the launcher → /fleet?id=) would start a
    // fresh chain with no back button. Register it directly, same as the
    // explore / surface shallow-overlay hosts do.
    const cardUrl = new URL($page.url);
    cardUrl.searchParams.set('id', id);
    setCurrentCard(cardUrl);
  }
  function closePanel() {
    panelOpen = false;
    setCurrentCard(null);
  }
  function flyMission(id: string) {
    goto(`${base}/fly?mission=${id}`);
  }

  // Detail-card back chain (#29) — track ?id= navigations into / out of cards.
  afterNavigate((nav) => {
    if (nav.to?.url) trackCardNavigation(nav.to.url, nav.type);
  });

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

<div class="library entity-browse-page">
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
    <span class="filters-eyebrow">{m.filters_eyebrow()}</span>
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
    <div data-audio-stage="missions-epoch-timeline">
      <EpochTimelineStrip
        {countByEpoch}
        selected={filterState.epoch}
        onSelect={(v) => setEpoch(v)}
      />
    </div>
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
    <ul
      class="grid entity-card-grid"
      data-audio-stage="missions-grid"
      aria-label={m.missions_grid_aria()}
    >
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
            onkeydown={(e) => handleGridKeydown(e, closePanel)}
          >
            <div class="card-accent" aria-hidden="true"></div>
            <figure class="card-photo">
              <img
                class="card-cover"
                src={pickHero('missions', mission.id)}
                alt=""
                loading="lazy"
                onerror={(e) => {
                  // Hero missing → mark parent figure as cover-missing
                  // so CSS swaps the broken-image icon for the same
                  // soft gradient placeholder /fleet uses (2026-06-15
                  // user note: "fleet page handles that better, can we
                  // do the same on mission"). Image sourcing happens
                  // separately via the image pipeline; this just keeps
                  // the gap honest while it does.
                  const fig = (e.currentTarget as HTMLImageElement).closest('figure');
                  if (fig) fig.classList.add('cover-missing');
                }}
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
  /* Page chrome (.search-row, .search-input, .filters-toggle,
     .filters-right, .filters-count, .filters-eyebrow, .filters-chevron,
     .filters, .filter-group, .filter-label, .pill + variants,
     .clear-filters) lives in src/lib/styles/entity-browse-page.css —
     opted into by the `entity-browse-page` class on the page root.
     Shared with /fleet so chrome can't visually drift. */

  /* Grid layout itself (display, columns, gap, breakpoints) lives in
     src/lib/styles/entity-card-grid.css — shared with /fleet so the
     column count tracks viewport identically across both routes. */

  /* Card chrome (.card, .card-photo, .card-body, .card-head,
     .agency-badge, .card-status, .card-quality, .card-name, .card-type,
     .card-meta, .card-dest, .card-first, plus interactive states) lives
     in src/lib/styles/entity-card-grid.css and is opted into by the
     `entity-card-grid` class on `<ul class="grid entity-card-grid">`.
     Shared with /fleet so the two routes can't visually drift again. */

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
