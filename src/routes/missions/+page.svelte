<script lang="ts">
  import EntityIndex from '$lib/components/EntityIndex.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import EntityCard from '$lib/components/EntityCard.svelte';
  import EntityList from '$lib/components/EntityList.svelte';
  import AgencyFilterRow from '$lib/components/AgencyFilterRow.svelte';
  import BrowseToolbar from '$lib/components/BrowseToolbar.svelte';
  let { data } = $props();
  import { metaDescription } from '$lib/seo';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { audio } from '$lib/audio-state.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { setCurrentCard, trackCardNavigation, seedBackTarget } from '$lib/card-chain.svelte';
  import { getMissionsForLibrary, getBadges } from '$lib/data';
  import { localeFromPage, localHref } from '$lib/locale';
  import type { Destination, Mission, MissionStatus } from '$types/mission';
  import { isMissionDestination } from '$lib/mission-dest';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import { handleGridKeydown } from '$lib/grid-keyboard-nav';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import { EPOCH_BANDS, epochForYear } from '$lib/epoch-bands';
  import type { FleetEpoch } from '$types/fleet';
  import LaunchesBanner from '$lib/components/LaunchesBanner.svelte';
  import VisuallyHiddenH1 from '$lib/components/VisuallyHiddenH1.svelte';
  import * as m from '$lib/paraglide/messages';
  import { missionStatusLabel } from '$lib/status-label';
  import { agencyColor, agencyDataColor, agencyFullName, splitAgencies } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { trackFilterChange, trackSearch } from '$lib/analytics';
  import { pickHero, loadHeroOverrides } from '$lib/image-hero';
  import { cue } from '$lib/sensory/feedback';
  import {
    type RemoteData,
    loading as rdLoading,
    error as rdError,
    success as rdSuccess,
    isError,
    isSuccess,
  } from '$lib/types/remote-data';
  import { dataLoadFailed } from '$lib/data/core';
  import { missionDestLabel } from '$lib/mission-dest-label';
  import { epochLabel } from '$lib/epoch-label';

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

  // Insignia map (PRD-029) — gate card badges so unbadged missions fire no 404.
  let badges = $state<Record<string, string>>({});

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
    /** FAILED is not a MissionStatus: it lists missions whose index entry carries
     *  outcome 'failure' (they FLEW, or never got off the pad). */
    status: MissionStatus | 'FAILED' | 'ALL';
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
    /** Order of the grid; the names are /fleet's (`?sort=`). */
    sort: 'chrono-desc' | 'chrono-asc' | 'alpha';
    /** Grid of cards or the compact list (`?view=list`). */
    view: 'grid' | 'list';
    expanded: boolean;
  }
  const filterState = $state<MissionFilterState>({
    dest: 'ALL',
    status: 'ALL',
    agency: 'ALL',
    crew: 'ALL',
    epoch: 'ALL',
    q: '',
    sort: 'chrono-desc',
    view: 'grid',
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

  // Agencies active in each era (their palette colours, most missions first) for the era tiles,
  // and the number of missions each agency flew for the filter chips (unfiltered inventory).
  let agencyCount: Map<string, number> = $derived.by(() => {
    const map = new Map<string, number>();
    for (const mission of missions) {
      for (const a of new Set(splitAgencies(mission.agency))) map.set(a, (map.get(a) ?? 0) + 1);
    }
    return map;
  });
  let colorsByEpoch: Map<FleetEpoch, string[]> = $derived.by(() => {
    const perEra = new Map<FleetEpoch, Map<string, number>>();
    for (const mission of missions) {
      const ep = epochForYear(mission.year);
      if (!ep) continue;
      const counts = perEra.get(ep) ?? new Map<string, number>();
      for (const a of new Set(splitAgencies(mission.agency)))
        counts.set(a, (counts.get(a) ?? 0) + 1);
      perEra.set(ep, counts);
    }
    const out = new Map<FleetEpoch, string[]>();
    for (const [ep, counts] of perEra) {
      out.set(
        ep,
        [...counts.entries()]
          .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
          .map(([a]) => agencyColor(a))
          .filter((c): c is string => !!c),
      );
    }
    return out;
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
          (filterState.status === 'ALL' ||
            (filterState.status === 'FAILED'
              ? mission.outcome === 'failure'
              : mission.status === filterState.status)) &&
          (filterState.agency === 'ALL' ||
            splitAgencies(mission.agency).includes(filterState.agency)) &&
          (filterState.crew === 'ALL' ||
            (filterState.crew === 'CREWED' ? mission.crewed === true : mission.crewed !== true)) &&
          (filterState.epoch === 'ALL' || epochForYear(mission.year) === filterState.epoch),
      )
      // Newest first by default so the latest and upcoming missions lead; the tiebreak is the id,
      // so the order inside a year is stable.
      .slice()
      .sort((a, b) =>
        filterState.sort === 'alpha'
          ? (a.name ?? a.id).localeCompare(b.name ?? b.id)
          : filterState.sort === 'chrono-asc'
            ? a.year - b.year || a.id.localeCompare(b.id)
            : b.year - a.year || a.id.localeCompare(b.id),
      ),
  );

  // ─── URL ↔ filter sync ───────────────────────────────────────────
  function applyUrlFilters(url: URL) {
    const dest = url.searchParams.get('dest')?.toUpperCase();
    const status = url.searchParams.get('status')?.toUpperCase();
    const agency = url.searchParams.get('agency');
    filterState.dest = dest && isMissionDestination(dest) ? dest : 'ALL';
    filterState.status =
      status === 'ACTIVE' ||
      status === 'FLOWN' ||
      status === 'PLANNED' ||
      status === 'CANCELLED' ||
      status === 'FAILED'
        ? status
        : 'ALL';
    filterState.agency = agency ?? 'ALL';
    const crew = url.searchParams.get('crew')?.toUpperCase();
    filterState.crew = crew === 'CREWED' || crew === 'UNCREWED' ? crew : 'ALL';
    // Epoch filter — falls back to 'ALL' on unknown values so a stale
    // ?epoch param from a removed band doesn't crater the page.
    const epochRaw = url.searchParams.get('epoch');
    filterState.epoch = epochRaw && epochValid(epochRaw) ? (epochRaw as FleetEpoch) : 'ALL';
    filterState.q = url.searchParams.get('q') ?? '';
    const so = url.searchParams.get('sort');
    filterState.sort = so === 'chrono-asc' || so === 'alpha' ? so : 'chrono-desc';
    filterState.view = url.searchParams.get('view') === 'list' ? 'list' : 'grid';
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
    if (filterState.sort !== 'chrono-desc') params.set('sort', filterState.sort);
    if (filterState.view === 'list') params.set('view', 'list');
    const qs = params.toString();
    const target = localHref(`/missions${qs ? `?${qs}` : ''}`);
    if (target !== page.url.pathname + page.url.search) {
      // replaceState avoids littering the back-button history with
      // every filter toggle.
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function setSort(value: MissionFilterState['sort']) {
    filterState.sort = value;
    pushFiltersToUrl();
  }

  function setView(value: MissionFilterState['view']) {
    filterState.view = value;
    pushFiltersToUrl();
  }

  function setEpoch(value: FleetEpoch | 'ALL') {
    filterState.epoch = value;
    pushFiltersToUrl();
  }

  function setDest(value: Destination | 'ALL') {
    filterState.dest = value;
    pushFiltersToUrl();
  }

  function setStatus(value: MissionStatus | 'FAILED' | 'ALL') {
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

  const destOptions: [Destination | 'ALL', () => string][] = [
    ['ALL', m.lib_filter_dest_all],
    ['MARS', m.lib_filter_dest_mars],
    ['MOON', m.lib_filter_dest_moon],
    ['EARTH', m.lib_filter_dest_earth],
    ['JUPITER', m.lib_filter_dest_jupiter],
    ['NEPTUNE', m.lib_filter_dest_neptune],
    ['PLUTO', m.lib_filter_dest_pluto],
    ['CERES', m.lib_filter_dest_ceres],
    ['COMET', m.lib_filter_dest_comet],
    ['ASTEROID', m.lib_filter_dest_asteroid],
    ['SUN', m.lib_filter_dest_sun],
  ];
  const statusOptions: [MissionStatus | 'FAILED' | 'ALL', () => string][] = [
    ['ALL', m.lib_filter_status_all],
    ['ACTIVE', m.lib_filter_status_active],
    ['FLOWN', m.lib_filter_status_flown],
    ['PLANNED', m.lib_filter_status_planned],
    ['CANCELLED', m.lib_filter_status_cancelled],
    ['FAILED', m.lib_filter_status_failed],
  ];
  const crewOptions: ['ALL' | 'CREWED' | 'UNCREWED', () => string][] = [
    ['ALL', m.lib_filter_crew_all],
    ['CREWED', m.lib_filter_crew_crewed],
    ['UNCREWED', m.lib_filter_crew_uncrewed],
  ];

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
  // One colour per agency (UXD-048): the card, its badge and the filter dot read the registry, not
  // the per-mission `color` of the data (which the 3D scenes still use).
  const colorOf = (mission: { agency: string; color: string }) =>
    agencyColor(mission.agency) ?? mission.color;

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
    cue('select');
    selectedId = id;
    panelOpen = true;
    // Grid-click opens the panel via state only (no ?id= in the URL), so
    // afterNavigate never fires — the detail-card chain would miss this card
    // and an in-card link out (e.g. the launcher → /fleet?id=) would start a
    // fresh chain with no back button. Register it directly, same as the
    // explore / surface shallow-overlay hosts do.
    const cardUrl = new URL(page.url);
    cardUrl.searchParams.set('id', id);
    setCurrentCard(cardUrl);
  }
  function closePanel() {
    panelOpen = false;
    setCurrentCard(null);
  }
  function flyMission(id: string) {
    goto(localHref(`/fly?mission=${id}`));
  }

  // Detail-card back chain (#29) — track ?id= navigations into / out of cards.
  // When arriving from a program (?from=program:<id>), seed the chain so the
  // in-card back button returns to that program.
  function seedProgramBack(url: URL): void {
    const from = url.searchParams.get('from');
    if (from?.startsWith('program:')) {
      seedBackTarget(localHref(`/programs/${from.slice('program:'.length)}`), url);
    }
  }
  afterNavigate((nav) => {
    if (nav.to?.url) {
      trackCardNavigation(nav.to.url, nav.type);
      seedProgramBack(nav.to.url);
    }
  });

  // ─── Load ────────────────────────────────────────────────────────
  onMount(() => {
    applyUrlFilters(page.url);
    // Pre-warm the hero overrides cache so the first paint of mission
    // cards picks up any Marko-blessed override slot. Falls back to
    // `<id>/01.jpg` silently when no override file exists; safe to
    // fire-and-forget.
    void loadHeroOverrides('missions');
    void getBadges()
      .then((b) => (badges = b))
      .catch(dataLoadFailed);
  });
  // Re-fetch when the URL `?lang=` changes so locale switches replace
  // the merged mission overlay set without a full page reload.
  $effect(() => {
    const locale = localeFromPage(page);
    missionsRequest = rdLoading();
    getMissionsForLibrary(locale)
      .then((list) => {
        missionsRequest = rdSuccess(list);
        // Apply ?id= deep-link after data lands so the cross-link from
        // /mars or /moon ("FULL MISSION CARD" chip) opens the right
        // mission's panel pre-selected.
        const idParam = page.url.searchParams.get('id');
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
    applyUrlFilters(page.url);
  });
</script>

<svelte:head>
  <title>{m.missions_page_title()}</title>
  <meta name="description" content={metaDescription(m.landing_card_missions_desc())} />
</svelte:head>
<VisuallyHiddenH1 title={m.missions_page_title()} />

<LaunchesBanner />

<div class="library entity-browse-page browse-main">
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
  <!-- Filters + timeline collapsed by default. The count sits right after the
       FILTERS label — fraction (filtered / total) when active, total-only when
       not, identical to /fleet and /missions/launches. -->
  <div class="filters-bar">
    <Chip
      kind="action"
      class="filters-strip"
      aria-expanded={filterState.expanded}
      aria-controls={filterState.expanded ? 'missions-filters' : undefined}
      onclick={() => (filterState.expanded = !filterState.expanded)}
      data-audio-stage="missions-filters-toggle"
    >
      {m.filters_eyebrow()}
      {#if filtered.length !== missions.length}
        <span class="filters-count count-fraction" aria-hidden="true"
          >{filtered.length} / {missions.length}</span
        >
        <span class="filters-count-sr"
          >{m.filters_count_of({ shown: filtered.length, total: missions.length })}</span
        >
      {:else}
        <span class="filters-count count-total-only">{missions.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filterState.expanded ? '▾' : '▸'}</span>
    </Chip>
    {#if anyFilterActive}
      <Chip kind="action" quiet dismiss class="filters-clear" onclick={clearAllFilters}>
        {m.missions_clear_filters()}
      </Chip>
    {/if}
  </div>

  <div data-audio-stage="missions-epoch-timeline">
    <EpochTimelineStrip
      {countByEpoch}
      {colorsByEpoch}
      selected={filterState.epoch}
      onSelect={(v) => setEpoch(v)}
    />
  </div>
  <div class="filters agency-row" data-audio-stage="missions-agency-filter">
    {#if agencies.length > 0}
      <AgencyFilterRow
        agencies={agencies.map((name) => ({ name, count: agencyCount.get(name) ?? 0 }))}
        value={filterState.agency}
        onSelect={setAgency}
        label={m.lib_filter_agency_label()}
        allLabel={m.lib_filter_agency_all()}
      />
    {/if}
  </div>
  {#if filterState.expanded}
    <nav
      id="missions-filters"
      class="filters"
      data-audio-stage="missions-filters"
      aria-label={m.missions_filters_aria()}
    >
      <ChipGroup role="radiogroup" label={m.lib_filter_dest_label()} class="filter-group">
        <span class="filter-label">{m.lib_filter_dest_label()}</span>
        {#each destOptions as [value, label] (value)}
          <Chip kind="choice" active={filterState.dest === value} onclick={() => setDest(value)}>
            {label()}
          </Chip>
        {/each}
      </ChipGroup>

      <ChipGroup role="radiogroup" label={m.lib_filter_status_label()} class="filter-group">
        <span class="filter-label">{m.lib_filter_status_label()}</span>
        {#each statusOptions as [value, label] (value)}
          <Chip
            kind="choice"
            active={filterState.status === value}
            onclick={() => setStatus(value)}
          >
            {label()}
          </Chip>
        {/each}
      </ChipGroup>

      <ChipGroup role="radiogroup" label={m.lib_filter_crew_label()} class="filter-group">
        <span class="filter-label">{m.lib_filter_crew_label()}</span>
        {#each crewOptions as [value, label] (value)}
          <Chip kind="choice" active={filterState.crew === value} onclick={() => setCrew(value)}>
            {label()}
          </Chip>
        {/each}
      </ChipGroup>
    </nav>
  {/if}

  {#if isSuccess(missionsRequest)}
    <BrowseToolbar
      total={missions.length}
      noun={m.card_stat_missions()}
      showing={m.browse_showing({
        era: filterState.epoch === 'ALL' ? m.epoch_all() : epochLabel(filterState.epoch),
        count: filtered.length,
      })}
      sortOptions={[
        { value: 'chrono-desc', label: m.fleet_sort_newest() },
        { value: 'chrono-asc', label: m.fleet_sort_oldest() },
        { value: 'alpha', label: m.fleet_sort_alpha() },
      ]}
      sort={filterState.sort}
      onSort={(v) => setSort(v as MissionFilterState['sort'])}
      views={[
        { value: 'grid', label: m.fleet_view_grid() },
        { value: 'list', label: m.browse_view_list() },
      ]}
      view={filterState.view}
      onView={(v) => setView(v as MissionFilterState['view'])}
    />
  {/if}

  {#if isError(missionsRequest)}
    <div class="load-banner" role="alert">{m.lib_load_failed()}</div>
  {:else if !isSuccess(missionsRequest)}
    <div class="loading" role="status" aria-live="polite">{m.missions_loading()}</div>
  {:else if filtered.length === 0}
    <div class="empty">{m.lib_empty()}</div>
  {:else}
    {#if filterState.view === 'list'}
      <EntityList
        label={m.missions_grid_aria()}
        rows={filtered.map((mission) => ({
          id: mission.id,
          name: mission.name ?? mission.id,
          kind: missionDestLabel(mission.dest),
          agency: mission.agency,
          year: mission.year,
          status: mission.status,
          statusLabel: missionStatusLabel(mission.status),
        }))}
        onOpen={selectMission}
      />
    {:else}
      <ul
        class="grid entity-card-grid"
        data-audio-stage="missions-grid"
        aria-label={m.missions_grid_aria()}
      >
        {#each filtered as mission (mission.id)}
          <EntityCard
            photo={pickHero('missions', mission.id)}
            name={mission.name ?? mission.id}
            year={mission.year}
            agencies={splitAgencies(mission.agency).map((a) => ({
              name: a,
              color: agencyDataColor(a) ?? mission.color,
            }))}
            agencyTitle={agencyFullName(mission.agency) ?? mission.agency}
            accent={colorOf(mission)}
            story={mission.first}
            badge={badges[`mission:${mission.id}`]}
            selected={selectedId === mission.id}
            testid="mission-card-{mission.id}"
            audioStage="missions-select-{mission.id}"
            facts={[
              { label: m.missions_card_year_label(), value: String(mission.year) },
              { label: m.missions_card_dest_label(), value: missionDestLabel(mission.dest) },
            ]}
            onclick={() => selectMission(mission.id)}
            onkeydown={(e) => handleGridKeydown(e, closePanel)}
          >
            {#snippet pills()}
              <span class="card-status status-{mission.status.toLowerCase()}">
                {missionStatusLabel(mission.status)}
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
            {/snippet}
          </EntityCard>
        {/each}
      </ul>
    {/if}
  {/if}
  <EntityIndex hub="missions" title={m.entity_index_missions()} links={data.entityIndex} />
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

  /* Page chrome (.search-row, .search-input, .filters-bar, .filters-count,
     .filters-chevron, .filters, .filter-group, .filter-label) lives in
     src/lib/styles/entity-browse-page.css — opted into by the
     `entity-browse-page` class on the page root. The chips are <Chip>
     (src/lib/styles/chip.css). Shared with /fleet and /missions/launches
     so chrome can't visually drift. */

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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
  }

  .load-banner {
    margin: 24px 0;
    padding: 12px 16px;
    background: rgba(193, 68, 14, 0.15);
    border: 1px solid rgba(193, 68, 14, 0.5);
    border-radius: 4px;
    color: #ffc850;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-align: center;
  }
</style>
