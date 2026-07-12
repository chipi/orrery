<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { audio } from '$lib/audio-state.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { trackCardNavigation, seedBackTarget } from '$lib/card-chain.svelte';
  import { base } from '$app/paths';
  import { getFleet, getFleetGallery, getFleetIndex, getBadges } from '$lib/data';
  import type {
    FleetCategory,
    FleetEntry,
    FleetEpoch,
    FleetIndexEntry,
    FleetStatus,
  } from '$types/fleet';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import FleetEntryPanel from '$lib/components/FleetEntryPanel.svelte';
  import { handleGridKeydown } from '$lib/grid-keyboard-nav';
  import { agencyLogo, agencyFullName, splitAgencies } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { trackFilterChange, trackSearch } from '$lib/analytics';
  import * as m from '$lib/paraglide/messages';
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

  // ─── State ───────────────────────────────────────────────────────
  // RemoteData<E,T> per #330 C.2. `entries` is the success-branch
  // payload exposed as a plain array so existing filter / sort /
  // template reads (`entries.length`, `entries.find(...)`) don't
  // each have to guard against the loading / error variants.
  let entriesRequest = $state<RemoteData<Error, FleetIndexEntry[]>>(rdLoading());
  let entries = $derived(isSuccess(entriesRequest) ? entriesRequest.data : []);

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
  const logoFor = agencyLogo;
  const fullNameFor = (agency: string) => agencyFullName(agency);

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
  ];

  const CATEGORY_LABEL: Record<FleetCategory, string> = {
    launcher: 'Launcher',
    'crewed-spacecraft': 'Crewed',
    'cargo-spacecraft': 'Cargo',
    station: 'Station',
    rover: 'Rover',
    lander: 'Lander',
    orbiter: 'Orbiter',
    observatory: 'Observatory',
    'space-suit': 'Suit',
    constellation: 'Constellation',
    'launch-site': 'Launch site',
  };

  const CATEGORY_COLOR: Record<FleetCategory, string> = {
    launcher: '#ffc850', // gold — boosters
    'crewed-spacecraft': '#c1440e', // mars-red — humans
    'cargo-spacecraft': '#ff8c42', // orange
    station: '#4b9cd3', // earth-blue — habitats
    rover: '#a05a2c', // mars surface
    lander: '#9c8c4e', // dust-tan
    orbiter: '#7a4ecd', // violet — outer space
    observatory: '#4ecdc4', // teal — scientific
    'space-suit': '#cbd5e1', // ice-white — pressure shell
    constellation: '#9bdbff', // pale sky-blue — Earth-orbiting collectives
    'launch-site': '#6b8e6b', // moss-green — Earth-surface launch sites (#285)
  };

  const STATUSES: Array<FleetStatus> = ['ACTIVE', 'FLOWN', 'RETIRED', 'FAILED', 'PLANNED'];

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
    const url = new URL($page.url);
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
    if (!listView) params.delete('view');
    else params.set('view', 'list');
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

  async function loadEntry(id: string) {
    if (panelLoadingId === id) return;
    panelLoadingId = id;
    const summary = entries.find((e) => e.id === id);
    if (!summary) {
      panelLoadingId = null;
      return;
    }
    const full = await getFleet(id, summary.category);
    if (panelLoadingId !== id) return; // a newer load superseded us
    selectedEntry = full;
    panelOpen = true;
    panelLoadingId = null;
  }

  function openEntry(entry: FleetIndexEntry) {
    cue('select');
    const url = new URL($page.url);
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

  function closePanel() {
    panelOpen = false;
    selectedEntry = null;
    const url = new URL($page.url);
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
      seedBackTarget(`${base}/programs/${from.slice('program:'.length)}`, url);
    }
  }
  afterNavigate((nav) => {
    if (nav.to?.url) {
      trackCardNavigation(nav.to.url, nav.type);
      seedProgramBack(nav.to.url);
    }
  });

  onMount(async () => {
    applyUrl($page.url);
    // Pre-warm hero override cache so card covers pick up override
    // slots on first paint; safe to fire-and-forget.
    void loadHeroOverrides('fleet');
    void getBadges().then((b) => (badges = b));
    try {
      entriesRequest = rdSuccess(await getFleetIndex());
    } catch (err) {
      entriesRequest = rdError(err instanceof Error ? err : new Error(String(err)));
    }

    // Pre-select an entry if ?id= is in the URL on first visit.
    const id = $page.url.searchParams.get('id');
    if (id) void loadEntry(id);
  });

  $effect(() => {
    // Re-apply URL when navigating in-app (back/forward buttons).
    // applyUrl writes to filter $state values; if those writes were
    // tracked here they would feed back through syncUrl → goto → page
    // store and cause an effect_update_depth_exceeded loop on first
    // load with `?id=` deep-links. untrack isolates the write batch.
    const url = $page.url;
    untrack(() => {
      applyUrl(url);
      const id = url.searchParams.get('id');
      if (id && id !== selectedEntry?.id) {
        void loadEntry(id);
      } else if (!id && panelOpen) {
        panelOpen = false;
        selectedEntry = null;
      }
    });
  });
</script>

<svelte:head>
  <title>Fleet — Spaceflight hardware</title>
  <meta
    name="description"
    content="Curated inventory of the machines used in spaceflight: launchers, crewed and cargo spacecraft, stations, rovers, landers, orbiters, observatories."
  />
</svelte:head>

<div class="fleet entity-browse-page">
  {#if !isSuccess(entriesRequest) && !isError(entriesRequest)}
    <p class="status">Loading fleet…</p>
  {:else if isError(entriesRequest)}
    <p class="status error">Failed to load fleet data.</p>
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
    <!-- Filters collapsed by default. Count lives on the right end of
         the toggle bar (fraction when active, total-only otherwise) —
         matches /missions for visual consistency. -->
    <button
      type="button"
      class="filters-toggle"
      data-audio-stage="fleet-filters-toggle"
      aria-expanded={filtersExpanded}
      aria-controls={filtersExpanded ? 'fleet-filters' : undefined}
      onclick={() => (filtersExpanded = !filtersExpanded)}
    >
      <span class="filters-eyebrow">{m.filters_eyebrow()}</span>
      <span class="filters-right">
        {#if filtered.length !== entries.length}
          <span class="filters-count count-fraction count"
            >{filtered.length} / {entries.length}</span
          >
        {:else}
          <span class="filters-count count-total-only count">{entries.length}</span>
        {/if}
        <span class="filters-chevron" aria-hidden="true">{filtersExpanded ? '▾' : '▸'}</span>
      </span>
    </button>

    {#if filtersExpanded}
      <div data-audio-stage="fleet-epoch-timeline">
        <EpochTimelineStrip {countByEpoch} selected={epochFilter} onSelect={(v) => setEpoch(v)} />
      </div>
      <nav
        id="fleet-filters"
        class="filters"
        data-audio-stage="fleet-filters"
        aria-label={m.fleet_filters_aria()}
      >
        <div class="filter-group" role="radiogroup" aria-label={m.fleet_category_aria()}>
          <span class="filter-label">{m.fleet_filter_category()}</span>
          <button
            type="button"
            class="pill"
            class:active={categoryFilter === 'ALL'}
            role="radio"
            aria-checked={categoryFilter === 'ALL'}
            onclick={() => setCategory('ALL')}>ALL</button
          >
          {#each CATEGORIES as cat (cat)}
            <button
              type="button"
              class="pill"
              class:active={categoryFilter === cat}
              role="radio"
              aria-checked={categoryFilter === cat}
              onclick={() => setCategory(cat)}>{CATEGORY_LABEL[cat]}</button
            >
          {/each}
        </div>

        <div class="filter-group" role="radiogroup" aria-label={m.fleet_status_aria()}>
          <span class="filter-label">{m.fleet_filter_status()}</span>
          <button
            type="button"
            class="pill"
            class:active={statusFilter === 'ALL'}
            role="radio"
            aria-checked={statusFilter === 'ALL'}
            onclick={() => setStatus('ALL')}>ALL</button
          >
          {#each STATUSES as st (st)}
            <button
              type="button"
              class="pill status-pill status-{st.toLowerCase()}"
              class:active={statusFilter === st}
              role="radio"
              aria-checked={statusFilter === st}
              onclick={() => setStatus(st)}>{st}</button
            >
          {/each}
        </div>

        {#if agencies.length > 0}
          <div class="filter-group" role="radiogroup" aria-label={m.fleet_agency_aria()}>
            <span class="filter-label">{m.fleet_filter_agency()}</span>
            <button
              type="button"
              class="pill"
              class:active={agencyFilter === 'ALL'}
              role="radio"
              aria-checked={agencyFilter === 'ALL'}
              onclick={() => setAgency('ALL')}>ALL</button
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

        <div class="filter-group sort-group">
          <span class="filter-label">{m.fleet_filter_sort()}</span>
          <select
            aria-label={m.fleet_sort_aria()}
            value={sortMode}
            onchange={(e) =>
              setSort((e.currentTarget as HTMLSelectElement).value as typeof sortMode)}
          >
            <option value="chrono-desc">Newest first</option>
            <option value="chrono-asc">Oldest first</option>
            <option value="alpha">Alphabetical</option>
            <option value="category">By category</option>
          </select>
        </div>
      </nav>
    {/if}

    {#if filtered.length === 0}
      <p class="status">No entries match the current filters.</p>
    {:else if listView}
      <ul class="fleet-list">
        {#each filtered as entry (entry.id)}
          <li>
            <button type="button" class="list-row" onclick={() => openEntry(entry)}>
              <span class="list-name">{entry.name}</span>
              <span class="list-cat">{CATEGORY_LABEL[entry.category]}</span>
              <span class="list-agency">{entry.agency}</span>
              <span class="list-year">{entry.first_flight.slice(0, 4)}</span>
              <span class="list-status status-{entry.status.toLowerCase()}">{entry.status}</span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <ul
        class="fleet-grid entity-card-grid"
        data-audio-stage="fleet-grid"
        aria-label={m.fleet_grid_aria()}
      >
        {#each filtered as entry (entry.id)}
          {@const primaryAgency = (entry.agency ?? '').split(/\s*\/\s*/)[0]?.trim() ?? entry.agency}
          {@const cardLogo = logoFor(primaryAgency)}
          {@const cardFullName = fullNameFor(primaryAgency)}
          {@const accent = CATEGORY_COLOR[entry.category]}
          <li class="card-li">
            <button
              type="button"
              class="card"
              class:selected={selectedEntry?.id === entry.id}
              style:--accent={accent}
              data-testid="fleet-card-{entry.id}"
              data-audio-stage="fleet-select-{entry.id}"
              onclick={() => openEntry(entry)}
              onkeydown={(e) => handleGridKeydown(e, closePanel)}
              aria-label="{entry.name} ({entry.agency}, {entry.first_flight.slice(0, 4)})"
            >
              <div class="card-accent" aria-hidden="true"></div>
              <figure class="card-photo">
                <img
                  class="card-cover"
                  src={pickHero('fleet', entry.id)}
                  alt=""
                  loading="lazy"
                  onerror={(e) => {
                    const fig = (e.currentTarget as HTMLImageElement).closest('figure');
                    if (fig) fig.classList.add('cover-missing');
                  }}
                  decoding="async"
                />
              </figure>
              <div class="card-body">
                <header class="card-head">
                  <span class="agency-badge" style:background-color={accent} title={cardFullName}>
                    {#if cardLogo}
                      <img
                        src={cardLogo}
                        alt=""
                        class="agency-logo"
                        aria-hidden="true"
                        onerror={(e) =>
                          ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                        loading="lazy"
                        decoding="async"
                      />
                    {/if}
                    {primaryAgency}
                  </span>
                  <span class="card-status status-{entry.status.toLowerCase()}">
                    {entry.status}
                  </span>
                </header>
                <div class="card-name-row">
                  <h2 class="card-name">{entry.name}</h2>
                  {#if badges[`fleet:${entry.id}`]}
                    <img
                      class="card-badge"
                      src="{base}{badges[`fleet:${entry.id}`]}"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  {/if}
                </div>
                <p class="card-type">{CATEGORY_LABEL[entry.category]}</p>
                <div class="card-meta">
                  <span class="card-year">{entry.first_flight.slice(0, 4)}</span>
                  <span class="card-country">{entry.country}</span>
                </div>
                <p class="card-first">{entry.tagline}</p>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
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
/>

<style>
  .fleet {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
    position: relative;
  }

  .status {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 60px 20px;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
  }

  .status.error {
    color: #c1440e;
  }

  /* Page chrome (.search-row, .search-input, .filters-toggle,
     .filters-right, .filters-count, .filters-eyebrow, .filters-chevron,
     .filters, .filter-group, .filter-label, .pill + variants) lives in
     src/lib/styles/entity-browse-page.css — opted into by the
     `entity-browse-page` class on the page root. Shared with /missions
     so chrome can't visually drift. */

  .status-pill.status-active.active {
    background: rgba(78, 205, 196, 0.25);
    border-color: rgba(78, 205, 196, 0.55);
  }
  .status-pill.status-flown.active {
    background: rgba(75, 156, 211, 0.25);
    border-color: rgba(75, 156, 211, 0.55);
  }
  .status-pill.status-retired.active {
    background: rgba(255, 200, 80, 0.22);
    border-color: rgba(255, 200, 80, 0.55);
  }
  .status-pill.status-failed.active {
    background: rgba(193, 68, 14, 0.28);
    border-color: rgba(193, 68, 14, 0.7);
  }
  .status-pill.status-planned.active {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .sort-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sort-group select {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.85);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
  }

  /* Grid layout itself (display, columns, gap, breakpoints) lives in
     src/lib/styles/entity-card-grid.css — shared with /missions so the
     column count tracks viewport identically across both routes. */

  /* W4 (GH #274) — content-visibility: auto lets the browser skip
   * layout + paint for off-screen cards (152 fleet entries × ~280px
   * each = ~21000px tall before virtualisation; we only need ~3-4
   * rows visible at any time). `contain-intrinsic-size` is the
   * scrollbar-friendly height hint that prevents jump-scroll when
   * cards come back into view. CSS-native solution — no JS, no
   * virtualizer library, no scroll-listener; relies on Chromium
   * (mobile-chromium e2e target) + modern Safari/Firefox support.
   * Trade-off vs DOM virtualisation: DOM nodes still exist (cheap
   * memory), but layout/paint cost drops to ~0 for off-screen items.
   * Route-local because /missions doesn't yet have enough entries to
   * benefit from the optimisation. */
  .fleet-grid > .card-li {
    content-visibility: auto;
    contain-intrinsic-size: auto 280px;
  }
  /* content-visibility:auto applies paint containment, which clips the
     SHARED focus outline / selected glow — they draw OUTSIDE the card box
     (outline-offset, box-shadow) and get cropped to the card-li. /missions
     has no content-visibility so the identical highlight shows there. Lift
     content-visibility for the focused/selected card so the keyboard
     roving-nav highlight renders the same on both routes. One card opts
     out of the optimisation at a time — negligible. */
  .fleet-grid > .card-li:has(.card:focus-visible),
  .fleet-grid > .card-li:has(.card.selected) {
    content-visibility: visible;
  }

  /* Card chrome (.card, .card-photo, .card-body, .card-head,
     .agency-badge, .card-status, .card-name, .card-type, .card-meta,
     .card-country, .card-first, plus interactive states) lives in
     src/lib/styles/entity-card-grid.css and is opted into by the
     `entity-card-grid` class on `<ul class="fleet-grid entity-card-grid">`.
     Shared with /missions so the two routes can't visually drift again. */

  .fleet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  /* W4 (GH #274) — same content-visibility treatment as the grid; list
   * rows are ~50px each so a list-view scroll skips layout/paint for
   * the ~140 off-screen rows. See note on .fleet-grid above. */
  .fleet-list > li {
    content-visibility: auto;
    contain-intrinsic-size: auto 50px;
  }
  .list-row {
    width: 100%;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    color: inherit;
    text-align: left;
    padding: 8px 12px;
    cursor: pointer;
    display: grid;
    grid-template-columns: 2fr 1fr 1.2fr 0.6fr 0.7fr;
    align-items: center;
    gap: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 11.5px;
  }
  .list-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  .list-name {
    color: #fff;
    font-weight: 600;
  }
  .list-cat,
  .list-agency,
  .list-year {
    color: rgba(255, 255, 255, 0.6);
  }
  .list-status {
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.06em;
    padding: 1px 6px;
    border-radius: 3px;
    text-align: center;
  }
  .list-status.status-active {
    background: rgba(78, 205, 196, 0.18);
    color: #4ecdc4;
  }
  .list-status.status-flown {
    background: rgba(75, 156, 211, 0.18);
    color: #4b9cd3;
  }
  .list-status.status-retired {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
  }
  .list-status.status-failed {
    background: rgba(193, 68, 14, 0.22);
    color: #ff6b3a;
  }
  .list-status.status-planned {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
  }

  /* Mobile-first: stack filters cleanly at 375 px */
  @media (max-width: 600px) {
    .fleet {
      padding: 14px 12px 30px;
    }
    .filter-label {
      min-width: 100%;
      margin-bottom: 2px;
    }
    /* Mobile grid floor lives in entity-card-grid.css.
       Fleet-specific name shrink — selector tightened to .fleet-grid
       so Svelte's scoped-CSS specificity wins over the shared
       entity-card-grid.css default of 22 px. */
    .fleet-grid .card-name {
      font-size: 18px;
    }
    .list-row {
      grid-template-columns: 2fr 1fr 0.6fr;
      grid-template-areas:
        'name name year'
        'cat agency status';
    }
    .list-name {
      grid-area: name;
    }
    .list-year {
      grid-area: year;
      text-align: right;
    }
    .list-cat {
      grid-area: cat;
    }
    .list-agency {
      grid-area: agency;
    }
    .list-status {
      grid-area: status;
    }
  }
</style>
