<script lang="ts">
  import EntityIndex from '$lib/components/EntityIndex.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  let { data } = $props();
  import { metaDescription } from '$lib/seo';
  import { onMount, untrack } from 'svelte';
  import { canonicalId } from '$lib/data/retired-ids';
  import { page } from '$app/state';
  import { audio } from '$lib/audio-state.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { trackCardNavigation, seedBackTarget } from '$lib/card-chain.svelte';
  import { getFleet, getFleetGallery, getFleetIndex, getBadges } from '$lib/data';
  import type {
    FleetCategory,
    FleetEntry,
    FleetEpoch,
    FleetIndexEntry,
    FleetStatus,
  } from '$types/fleet';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import EntityCard from '$lib/components/EntityCard.svelte';
  import EntityList from '$lib/components/EntityList.svelte';
  import AgencyFilterRow from '$lib/components/AgencyFilterRow.svelte';
  import BrowseToolbar from '$lib/components/BrowseToolbar.svelte';
  import { epochLabel } from '$lib/epoch-label';
  import FleetEntryPanel from '$lib/components/FleetEntryPanel.svelte';
  import VisuallyHiddenH1 from '$lib/components/VisuallyHiddenH1.svelte';
  import { LINEUP_LIVE, lineupKindFor, type LineupKind } from '$lib/three/lineup/lineup-kind';
  import { handleGridKeydown } from '$lib/grid-keyboard-nav';
  import { agencyDataColor, splitAgencies } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { trackFilterChange, trackSearch } from '$lib/analytics';
  import * as m from '$lib/paraglide/messages';
  import { countryLabel } from '$lib/country-label';
  import { fleetStatusLabel } from '$lib/status-label';
  import { fleetCategoryLabel } from '$lib/fleet-category-label';
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
  import { localeFromPage, localHref } from '$lib/locale';

  // ─── State ───────────────────────────────────────────────────────
  // RemoteData<E,T> per #330 C.2. `entries` is the success-branch
  // payload exposed as a plain array so existing filter / sort /
  // template reads (`entries.length`, `entries.find(...)`) don't
  // each have to guard against the loading / error variants.
  let entriesRequest = $state<RemoteData<Error, FleetIndexEntry[]>>(rdLoading());
  let entries = $derived(isSuccess(entriesRequest) ? entriesRequest.data : []);
  // Card names + taglines come from the locale overlays; reload them when the locale changes.
  let indexLocale = $state<string | null>(null);
  $effect(() => {
    const loc = localeFromPage(page);
    if (indexLocale === null || loc === indexLocale) return;
    indexLocale = loc;
    getFleetIndex(loc)
      .then((list) => (entriesRequest = rdSuccess(list)))
      .catch(dataLoadFailed);
  });

  // Insignia map (PRD-029) — gate card badges so unbadged vehicles fire no 404.
  let badges = $state<Record<string, string>>({});

  let selectedEntry: FleetEntry | null = $state(null);
  let panelOpen = $state(false);

  // Auto-compact the Curator Tour overlay when the fleet detail panel
  // opens during an active tour (PRD-016 §S8 / RFC-019 §12).
  $effect(() => {
    if (audio.tourActive && panelOpen && !audio.compact) {
      audio.compact = true;
    }
  });
  let panelLoadingId = $state<string | null>(null);

  let categoryFilter: FleetCategory | 'ALL' = $state('ALL');
  let agencyFilter: string = $state('ALL');
  let epochFilter: FleetEpoch | 'ALL' = $state('ALL');
  // Count map for EpochTimelineStrip — the strip is now pure
  // presentation and takes counts as a prop. Built from the unfiltered
  // entries list so band labels show full inventory, not filtered.
  let countByEpoch: Map<FleetEpoch, number> = $derived.by(() => {
    const map = new Map<FleetEpoch, number>();
    for (const e of entries) map.set(e.epoch, (map.get(e.epoch) ?? 0) + 1);
    return map;
  });
  let statusFilter: FleetStatus | 'ALL' = $state('ALL');
  let sortMode: 'chrono-desc' | 'chrono-asc' | 'alpha' | 'category' = $state('chrono-desc');
  let listView = $state(false);
  /** True-scale line-up (`?view=lineup&kind=`), for launchers or capsules and spacecraft. */
  let lineupView = $state(false);
  let lineupFocus = $state<string | null>(null);
  // The line-up's own kind: choosing it never touches the category filter.
  let lineupKind = $state<LineupKind>('launchers');
  /** RFC-027 — free-text search across name + agency + category + tagline + country. */
  let query = $state('');

  // Analytics: which category/sort filters + searches people use on the
  // fleet catalog. Chips fire immediately; query is debounced + capped.
  let _prevFleetCat: string = 'ALL';
  let _prevFleetSort: string = 'chrono-desc';
  let _fleetSearchTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
    if (categoryFilter !== _prevFleetCat) {
      trackFilterChange('fleet', 'category', categoryFilter);
      _prevFleetCat = categoryFilter;
    }
    if (sortMode !== _prevFleetSort) {
      trackFilterChange('fleet', 'sort', sortMode);
      _prevFleetSort = sortMode;
    }
    const q = query;
    if (_fleetSearchTimer) clearTimeout(_fleetSearchTimer);
    if (q.trim()) _fleetSearchTimer = setTimeout(() => trackSearch('fleet', q), 800);
    return () => {
      if (_fleetSearchTimer) clearTimeout(_fleetSearchTimer);
    };
  });
  // Filters strip is collapsed by default; clicking the eyebrow expands.
  // Mirrors the /missions pattern (J.1) so users land on the clean
  // grid first and only opt into filtering when they need it.
  let filtersExpanded = $state(false);

  // Filter chips reflect what's actually in the loaded data rather than
  // a hard-coded enum. Multi-agency entries ("NASA / ESA" for Hubble,
  // "CNSA / CMSA" for Tiangong, "Multi (NASA / ESA / ASI)" for Cassini)
  // split into one chip per component via splitAgencies in $lib/agencies.
  let agencies = $derived(
    Array.from(new Set(entries.flatMap((e) => splitAgencies(e.agency)))).sort(),
  );

  // Agency logo + full-name lookups delegate to the unified registry
  // at src/lib/agencies.ts. Add new agencies / logos there — every
  // consumer (fleet, missions, ISS modules, launches) picks them up.
  // Agencies per era and per chip: the era tiles' dots and the chips' counts (unfiltered inventory).
  let agencyCount: Map<string, number> = $derived.by(() => {
    const map = new Map<string, number>();
    for (const e of entries)
      for (const a of new Set(splitAgencies(e.agency))) map.set(a, (map.get(a) ?? 0) + 1);
    return map;
  });
  let colorsByEpoch: Map<FleetEpoch, string[]> = $derived.by(() => {
    const perEra = new Map<FleetEpoch, Map<string, number>>();
    for (const e of entries) {
      const counts = perEra.get(e.epoch) ?? new Map<string, number>();
      for (const a of new Set(splitAgencies(e.agency))) counts.set(a, (counts.get(a) ?? 0) + 1);
      perEra.set(e.epoch, counts);
    }
    const out = new Map<FleetEpoch, string[]>();
    for (const [ep, counts] of perEra) {
      out.set(
        ep,
        [...counts.entries()]
          .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
          .map(([a]) => agencyDataColor(a))
          .filter((c): c is string => !!c),
      );
    }
    return out;
  });

  // ─── Filtering + sorting ─────────────────────────────────────────
  function firstFlightYear(e: FleetIndexEntry): number {
    if (e.first_flight === 'planned') return 9999; // sort planned to end ascending, top descending
    const yr = parseInt(e.first_flight.slice(0, 4), 10);
    return Number.isFinite(yr) ? yr : 9999;
  }

  let filtered = $derived(
    entries
      .filter(
        (e) =>
          // RFC-027 — free-text search across the fields the card renders.
          matchesQuery([e.name, e.agency, e.category, e.tagline, e.country], query) &&
          (categoryFilter === 'ALL' || e.category === categoryFilter) &&
          (agencyFilter === 'ALL' || splitAgencies(e.agency).includes(agencyFilter)) &&
          (epochFilter === 'ALL' || e.epoch === epochFilter) &&
          (statusFilter === 'ALL' || e.status === statusFilter),
      )
      .slice()
      .sort((a, b) => {
        if (sortMode === 'chrono-desc') {
          return firstFlightYear(b) - firstFlightYear(a) || a.id.localeCompare(b.id);
        }
        if (sortMode === 'chrono-asc') {
          return firstFlightYear(a) - firstFlightYear(b) || a.id.localeCompare(b.id);
        }
        if (sortMode === 'alpha') {
          return a.name.localeCompare(b.name);
        }
        // category
        return (
          a.category.localeCompare(b.category) ||
          firstFlightYear(b) - firstFlightYear(a) ||
          a.id.localeCompare(b.id)
        );
      }),
  );

  const CATEGORIES: Array<FleetCategory> = [
    'launcher',
    'crewed-spacecraft',
    'cargo-spacecraft',
    'station',
    'rover',
    'lander',
    'orbiter',
    'observatory',
    'space-suit',
    'constellation',
    'launch-site',
    'engine',
  ];

  const categoryLabel = (c: FleetCategory): string => fleetCategoryLabel(c);
  // first_flight is a date, or "planned" for hardware that has not flown.
  const firstFlightLabel = (f: string): string =>
    f === 'planned' ? m.fleet_value_planned() : f.slice(0, 4);

  const CATEGORY_COLOR: Record<FleetCategory, string> = {
    launcher: '#ffc850', // gold — boosters
    'crewed-spacecraft': '#c1440e', // mars-red — humans
    'cargo-spacecraft': '#ff8c42', // orange
    station: '#4b9cd3', // earth-blue — habitats // a3-keep: category / Earth identity colour, palette review at the end
    rover: '#a05a2c', // mars surface
    lander: '#9c8c4e', // dust-tan
    orbiter: '#7a4ecd', // violet — outer space
    observatory: '#8fd16a', // green — the lowest-orbit band
    'space-suit': '#cbd5e1', // ice-white — pressure shell
    constellation: '#9bdbff', // pale sky-blue — Earth-orbiting collectives
    'launch-site': '#6b8e6b', // moss-green — Earth-surface launch sites (#285)
    engine: '#e8734a', // ember-orange — the fire under every launcher (PRD-032)
  };

  const STATUSES: Array<FleetStatus> = ['ACTIVE', 'FLOWN', 'RETIRED', 'FAILED', 'PLANNED'];

  // Data colour of each status chip (its dot, and its edge when on).
  const STATUS_TONE: Record<FleetStatus, string> = {
    ACTIVE: 'var(--color-state)',
    FLOWN: 'var(--color-accent)',
    RETIRED: 'var(--color-gold)',
    FAILED: 'var(--color-mars)',
    PLANNED: 'var(--color-text-dim)',
  };

  // ─── URL ↔ filter sync ───────────────────────────────────────────
  function applyUrl(url: URL) {
    const cat = url.searchParams.get('category');
    const ag = url.searchParams.get('agency');
    const ep = url.searchParams.get('epoch');
    const st = url.searchParams.get('status');
    const so = url.searchParams.get('sort');
    const view = url.searchParams.get('view');

    categoryFilter = (CATEGORIES as string[]).includes(cat ?? '') ? (cat as FleetCategory) : 'ALL';
    epochFilter = ep && epochValid(ep) ? (ep as FleetEpoch) : 'ALL';
    statusFilter = (STATUSES as string[]).includes(st ?? '') ? (st as FleetStatus) : 'ALL';
    agencyFilter = ag ?? 'ALL';
    sortMode = so === 'chrono-asc' || so === 'alpha' || so === 'category' ? so : 'chrono-desc';
    listView = view === 'list';
    lineupView = view === 'lineup';
    lineupFocus = url.searchParams.get('focus');
    // Old links carry the kind as `category=launcher&view=lineup`.
    const kind = url.searchParams.get('kind') as LineupKind | null;
    const fromCategory = lineupKindFor(categoryFilter);
    lineupKind =
      kind && LINEUP_LIVE.includes(kind)
        ? kind
        : fromCategory && LINEUP_LIVE.includes(fromCategory)
          ? fromCategory
          : 'launchers';
    query = url.searchParams.get('q') ?? '';
  }

  function epochValid(v: string): boolean {
    return [
      'first-steps',
      'space-race',
      'lunar-era',
      'first-stations',
      'shuttle-and-mir',
      'iss-assembly',
      'commercial-era',
      'lunar-return',
      // 2026-06-17 — added 'mars-era'. The EpochTimelineStrip has
      // shipped Mars Era as its 9th band but this allowlist missed
      // it; clicking the band wrote ?epoch=mars-era to the URL and
      // then the next URL roundtrip threw it out, resetting the
      // filter to 'ALL'. User report: "last future segment with 2
      // items on fleet does not work".
      'mars-era',
    ].includes(v);
  }

  function syncUrl() {
    const url = new URL(page.url);
    const params = url.searchParams;
    if (categoryFilter === 'ALL') params.delete('category');
    else params.set('category', categoryFilter);
    if (agencyFilter === 'ALL') params.delete('agency');
    else params.set('agency', agencyFilter);
    if (epochFilter === 'ALL') params.delete('epoch');
    else params.set('epoch', epochFilter);
    if (statusFilter === 'ALL') params.delete('status');
    else params.set('status', statusFilter);
    if (sortMode === 'chrono-desc') params.delete('sort');
    else params.set('sort', sortMode);
    if (lineupView) params.set('view', 'lineup');
    else if (listView) params.set('view', 'list');
    else params.delete('view');
    if (lineupView) params.set('kind', lineupKind);
    else {
      params.delete('focus');
      params.delete('kind');
    }
    // Write the raw query (not trimmed): the URL→state effect re-reads `q`
    // on every goto, so a trimmed write would strip the trailing space the
    // instant it's typed — making " " un-typeable in the search box (e.g.
    // "luna 16"). matchesQuery trims internally for matching. (2026-06-29)
    if (query.trim() === '') params.delete('q');
    else params.set('q', query);
    goto(url.pathname + (params.toString() ? `?${params}` : ''), {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  function setView(view: 'grid' | 'list' | 'lineup') {
    lineupView = view === 'lineup';
    listView = view === 'list';
    syncUrl();
  }
  function setLineupKind(kind: LineupKind) {
    lineupKind = kind;
    syncUrl();
  }

  let anyFilterActive = $derived(
    categoryFilter !== 'ALL' ||
      agencyFilter !== 'ALL' ||
      epochFilter !== 'ALL' ||
      statusFilter !== 'ALL',
  );
  function clearAllFilters() {
    categoryFilter = 'ALL';
    agencyFilter = 'ALL';
    epochFilter = 'ALL';
    statusFilter = 'ALL';
    syncUrl();
  }
  function setCategory(v: FleetCategory | 'ALL') {
    categoryFilter = v;
    syncUrl();
  }
  function setAgency(v: string) {
    agencyFilter = v;
    syncUrl();
  }
  function setEpoch(v: FleetEpoch | 'ALL') {
    epochFilter = v;
    syncUrl();
  }
  function setStatus(v: FleetStatus | 'ALL') {
    statusFilter = v;
    syncUrl();
  }
  function setSort(v: typeof sortMode) {
    sortMode = v;
    syncUrl();
  }

  // RFC-027 search input handler. Push immediately on every input event;
  // SvelteKit's `replaceState: true` keeps the back-button clean and the
  // visible grid updates synchronously via the $derived chain.
  function setQuery(v: string) {
    query = v;
    syncUrl();
  }

  async function loadEntry(rawId: string) {
    const id = canonicalId(rawId);
    if (panelLoadingId === id) return;
    panelLoadingId = id;
    const summary = entries.find((e) => e.id === id);
    if (!summary) {
      panelLoadingId = null;
      return;
    }
    const full = await getFleet(id, summary.category, localeFromPage(page));
    if (panelLoadingId !== id) return; // a newer load superseded us
    selectedEntry = full;
    panelOpen = true;
    panelLoadingId = null;
  }

  function openEntry(entry: FleetIndexEntry) {
    cue('select');
    const url = new URL(page.url);
    url.searchParams.set('id', entry.id);
    goto(url.pathname + `?${url.searchParams}`, {
      replaceState: false,
      // keepFocus so the triggering grid card retains focus — otherwise
      // SvelteKit resets focus to <body> on navigation and the grid's
      // arrow-key nav dies after the first open (matches /missions).
      keepFocus: true,
      noScroll: true,
    });
    void loadEntry(entry.id);
  }

  // PRD-032 — cross-navigation from the panel (engine ↔ launcher). knownIds
  // gates which cross-links become clickable so we never link a dead id.
  const knownIds = $derived(new Set(entries.map((e) => e.id)));
  function navigateToId(id: string) {
    const summary = entries.find((e) => e.id === id);
    if (summary) openEntry(summary);
  }

  function closePanel() {
    panelOpen = false;
    selectedEntry = null;
    const url = new URL(page.url);
    url.searchParams.delete('id');
    goto(url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ''), {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

  // Detail-card back chain (#29) — track ?id= navigations into / out of cards.
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

  onMount(async () => {
    applyUrl(page.url);
    // Pre-warm hero override cache so card covers pick up override
    // slots on first paint; safe to fire-and-forget.
    void loadHeroOverrides('fleet');
    void getBadges()
      .then((b) => (badges = b))
      .catch(dataLoadFailed);
    try {
      indexLocale = localeFromPage(page);
      entriesRequest = rdSuccess(await getFleetIndex(indexLocale));
    } catch (err) {
      entriesRequest = rdError(err instanceof Error ? err : new Error(String(err)));
    }

    // Pre-select an entry if ?id= is in the URL on first visit.
    const id = page.url.searchParams.get('id');
    if (id) void loadEntry(id);
  });

  $effect(() => {
    // Re-apply URL when navigating in-app (back/forward buttons).
    // applyUrl writes to filter $state values; if those writes were
    // tracked here they would feed back through syncUrl → goto → page
    // store and cause an effect_update_depth_exceeded loop on first
    // load with `?id=` deep-links. untrack isolates the write batch.
    const url = page.url;
    untrack(() => {
      applyUrl(url);
      const id = url.searchParams.get('id');
      if (id && canonicalId(id) !== selectedEntry?.id) {
        void loadEntry(id);
      } else if (!id && panelOpen) {
        panelOpen = false;
        selectedEntry = null;
      }
    });
  });
</script>

<svelte:head>
  <title>{m.fleet_page_title()} · Orrery</title>
  <meta name="description" content={metaDescription(m.fleet_meta_description())} />
</svelte:head>
<VisuallyHiddenH1 title={m.fleet_page_title()} />

<div class="fleet entity-browse-page browse-main">
  {#if !isSuccess(entriesRequest) && !isError(entriesRequest)}
    <p class="status">{m.fleet_loading()}</p>
  {:else if isError(entriesRequest)}
    <p class="status error">{m.fleet_load_failed()}</p>
  {:else}
    <!-- RFC-027 — free-text search across name + agency + category +
         tagline + country. Sits above the FILTERS toggle so it's visible
         without expanding. Placeholder + aria reuse the same i18n key. -->
    <div class="search-row">
      <input
        type="search"
        class="search-input"
        placeholder={m.fleet_search_placeholder()}
        aria-label={m.fleet_search_placeholder()}
        data-testid="fleet-search"
        value={query}
        oninput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
      />
    </div>
    <!-- Filters collapsed by default. The count sits right after the FILTERS
         label (fraction when active, total-only otherwise) — matches /missions. -->
    <div class="filters-bar">
      <Chip
        kind="action"
        class="filters-strip"
        data-audio-stage="fleet-filters-toggle"
        aria-expanded={filtersExpanded && !lineupView}
        aria-controls={filtersExpanded && !lineupView ? 'fleet-filters' : undefined}
        disabled={lineupView}
        onclick={() => (filtersExpanded = !filtersExpanded)}
      >
        {m.filters_eyebrow()}
        {#if filtered.length !== entries.length}
          <span class="filters-count count-fraction count" aria-hidden="true"
            >{filtered.length} / {entries.length}</span
          >
          <span class="filters-count-sr"
            >{m.filters_count_of({ shown: filtered.length, total: entries.length })}</span
          >
        {:else}
          <span class="filters-count count-total-only count">{entries.length}</span>
        {/if}
        <span class="filters-chevron" aria-hidden="true">{filtersExpanded ? '▾' : '▸'}</span>
      </Chip>
      {#if anyFilterActive && !lineupView}
        <Chip kind="action" quiet dismiss class="filters-clear" onclick={clearAllFilters}>
          {m.missions_clear_filters()}
        </Chip>
      {/if}
      <!-- The view toggle is in the toolbar (BrowseToolbar), the same on /missions. FILTERS is
           disabled, not removed, while the line-up is on: it is a fixed true-scale comparison. -->
      {#if lineupView}
        <ChipGroup role="radiogroup" class="view-group" label={m.fleet_lineup_toggle_aria()}>
          <Chip
            kind="choice"
            active={lineupKind === 'launchers'}
            onclick={() => setLineupKind('launchers')}>{m.fleet_lineup_launchers()}</Chip
          >
          {#if LINEUP_LIVE.includes('spacecraft')}
            <Chip
              kind="choice"
              active={lineupKind === 'spacecraft'}
              onclick={() => setLineupKind('spacecraft')}>{m.fleet_lineup_spacecraft()}</Chip
            >
          {/if}
        </ChipGroup>
      {/if}
    </div>

    {#if !lineupView}
      <div data-audio-stage="fleet-epoch-timeline">
        <EpochTimelineStrip
          {countByEpoch}
          {colorsByEpoch}
          selected={epochFilter}
          onSelect={(v) => setEpoch(v)}
        />
      </div>
      <div class="filters agency-row" data-audio-stage="fleet-agency-filter">
        {#if agencies.length > 0}
          <AgencyFilterRow
            agencies={agencies.map((name) => ({ name, count: agencyCount.get(name) ?? 0 }))}
            value={agencyFilter}
            onSelect={setAgency}
            label={m.fleet_filter_agency()}
            allLabel={m.lib_filter_status_all()}
          />
        {/if}
      </div>
    {/if}
    {#if filtersExpanded && !lineupView}
      <nav
        id="fleet-filters"
        class="filters"
        data-audio-stage="fleet-filters"
        aria-label={m.fleet_filters_aria()}
      >
        <ChipGroup role="radiogroup" class="filter-group" label={m.fleet_category_aria()}>
          <span class="filter-label">{m.fleet_filter_category()}</span>
          <Chip kind="choice" active={categoryFilter === 'ALL'} onclick={() => setCategory('ALL')}
            >{m.lib_filter_status_all()}</Chip
          >
          {#each CATEGORIES as cat (cat)}
            <Chip kind="choice" active={categoryFilter === cat} onclick={() => setCategory(cat)}
              >{categoryLabel(cat)}</Chip
            >
          {/each}
        </ChipGroup>

        <ChipGroup role="radiogroup" class="filter-group" label={m.fleet_status_aria()}>
          <span class="filter-label">{m.fleet_filter_status()}</span>
          <Chip kind="choice" active={statusFilter === 'ALL'} onclick={() => setStatus('ALL')}
            >{m.lib_filter_status_all()}</Chip
          >
          {#each STATUSES as st (st)}
            <Chip
              kind="choice"
              dot
              tone={STATUS_TONE[st]}
              active={statusFilter === st}
              onclick={() => setStatus(st)}>{fleetStatusLabel(st)}</Chip
            >
          {/each}
        </ChipGroup>
      </nav>
    {/if}
    <BrowseToolbar
      total={entries.length}
      noun={m.nav_fleet()}
      showing={m.browse_showing({
        era: epochFilter === 'ALL' ? m.epoch_all() : epochLabel(epochFilter),
        count: filtered.length,
      })}
      sortOptions={[
        { value: 'chrono-desc', label: m.fleet_sort_newest() },
        { value: 'chrono-asc', label: m.fleet_sort_oldest() },
        { value: 'alpha', label: m.fleet_sort_alpha() },
        { value: 'category', label: m.fleet_sort_category() },
      ]}
      sort={sortMode}
      onSort={(v) => setSort(v as typeof sortMode)}
      views={[
        { value: 'grid', label: m.fleet_view_grid() },
        { value: 'list', label: m.browse_view_list() },
        { value: 'lineup', label: m.fleet_lineup_toggle() },
      ]}
      view={lineupView ? 'lineup' : listView ? 'list' : 'grid'}
      onView={(v) => setView(v as 'grid' | 'list' | 'lineup')}
      bare={lineupView}
    />
    {#if lineupView}
      {#key lineupKind + localeFromPage(page)}
        <!-- Loaded only when a line-up opens: its landmark/cast lists and labels stay off the grid. -->
        {#await import('$lib/components/FleetLineup.svelte') then { default: FleetLineup }}
          <FleetLineup
            kind={lineupKind}
            {entries}
            locale={localeFromPage(page)}
            focusId={lineupFocus}
            onOpen={(id) => {
              const e = entries.find((x) => x.id === id);
              if (e) openEntry(e);
            }}
          />
        {/await}
      {/key}
    {:else if filtered.length === 0}
      <p class="status">{m.fleet_empty()}</p>
    {:else if listView}
      <EntityList
        label={m.fleet_grid_aria()}
        rows={filtered.map((entry) => ({
          id: entry.id,
          name: entry.name,
          kind: categoryLabel(entry.category),
          agency: entry.agency,
          year: firstFlightLabel(entry.first_flight),
          status: entry.status,
          statusLabel: fleetStatusLabel(entry.status),
        }))}
        onOpen={(id) => {
          const e = entries.find((x) => x.id === id);
          if (e) openEntry(e);
        }}
      />
    {:else}
      <ul
        class="fleet-grid entity-card-grid"
        data-audio-stage="fleet-grid"
        aria-label={m.fleet_grid_aria()}
      >
        {#each filtered as entry (entry.id)}
          <EntityCard
            photo={pickHero('fleet', entry.id)}
            name={entry.name}
            year={entry.first_flight === 'planned' ? null : firstFlightLabel(entry.first_flight)}
            agencies={splitAgencies(entry.agency).map((a) => ({
              name: a,
              color: agencyDataColor(a),
            }))}
            agencyTitle={entry.agency}
            accent={CATEGORY_COLOR[entry.category]}
            story={entry.tagline}
            badge={badges[`fleet:${entry.id}`]}
            selected={selectedEntry?.id === entry.id}
            testid="fleet-card-{entry.id}"
            audioStage="fleet-select-{entry.id}"
            ariaLabel="{entry.name} ({entry.agency}, {firstFlightLabel(entry.first_flight)})"
            facts={[{ label: m.card_stat_country(), value: countryLabel(entry.country) }]}
            onclick={() => openEntry(entry)}
            onkeydown={(e) => handleGridKeydown(e, closePanel)}
          >
            {#snippet pills()}
              <span class="card-status status-{entry.status.toLowerCase()}">
                {fleetStatusLabel(entry.status)}
              </span>
              <span class="card-kind">{categoryLabel(entry.category)}</span>
            {/snippet}
          </EntityCard>
        {/each}
      </ul>
    {/if}
  {/if}
  <EntityIndex hub="fleet" title={m.entity_index_fleet()} links={data.entityIndex} />
</div>

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
     handles for the audio executor's `click` action so the tour can
     demonstrate "Click Saturn V" without simulating a grid-card click. -->
<div class="tour-anchors" aria-hidden="true">
  <button
    type="button"
    data-audio-stage="fleet-select-saturn-v"
    tabindex="-1"
    onclick={() => void loadEntry('saturn-v')}>select saturn v</button
  >
  <button
    type="button"
    data-audio-stage="fleet-select-iss"
    tabindex="-1"
    onclick={() => void loadEntry('iss')}>select iss</button
  >
  <button
    type="button"
    data-audio-stage="fleet-select-hubble"
    tabindex="-1"
    onclick={() => void loadEntry('hubble')}>select hubble</button
  >
</div>

<FleetEntryPanel
  entry={selectedEntry}
  open={panelOpen}
  onClose={closePanel}
  galleryFetcher={getFleetGallery}
  {knownIds}
  onNavigate={navigateToId}
/>

<style>
  .status {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 60px 20px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
  }

  .status.error {
    color: #c1440e;
  }

  /* Page chrome (.search-row, .search-input, .filters-bar, .filters-count,
     .filters-chevron, .filters, .filter-group, .filter-label) lives in
     src/lib/styles/entity-browse-page.css — opted into by the
     `entity-browse-page` class on the page root. The chips are <Chip>
     (src/lib/styles/chip.css); the status colours are STATUS_TONE.
     Shared with /missions so chrome can't visually drift. */

  /* Grid layout itself (display, columns, gap, breakpoints) lives in
     src/lib/styles/entity-card-grid.css — shared with /missions so the
     column count tracks viewport identically across both routes. */

  /* The card, the grid, the toolbar, the agency row and the list are the shared components
     (EntityCard, entity-card-grid.css, BrowseToolbar, AgencyFilterRow, EntityList): /missions
     renders the same ones. */
</style>
