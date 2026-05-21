<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { getFleet, getFleetGallery, getFleetIndex } from '$lib/data';
  import type {
    FleetCategory,
    FleetEntry,
    FleetEpoch,
    FleetIndexEntry,
    FleetStatus,
  } from '$types/fleet';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import FleetEntryPanel from '$lib/components/FleetEntryPanel.svelte';

  // ─── State ───────────────────────────────────────────────────────
  let entries: FleetIndexEntry[] = $state([]);
  let loading = $state(true);
  let loadFailed = $state(false);

  let selectedEntry: FleetEntry | null = $state(null);
  let panelOpen = $state(false);
  let panelLoadingId = $state<string | null>(null);

  let categoryFilter: FleetCategory | 'ALL' = $state('ALL');
  let agencyFilter: string = $state('ALL');
  let epochFilter: FleetEpoch | 'ALL' = $state('ALL');
  let statusFilter: FleetStatus | 'ALL' = $state('ALL');
  let sortMode: 'chrono-desc' | 'chrono-asc' | 'alpha' | 'category' = $state('chrono-desc');
  let listView = $state(false);
  // Filters strip is collapsed by default; clicking the eyebrow expands.
  // Mirrors the /missions pattern (J.1) so users land on the clean
  // grid first and only opt into filtering when they need it.
  let filtersExpanded = $state(false);

  // Agencies derived from the loaded data — filter chips reflect what's
  // actually present rather than a hard-coded enum. Multi-agency entries
  // (e.g., "NASA / ESA" for Hubble, "CNSA / CMSA" for Tiangong) split on
  // " / " so each component agency shows as its own chip.
  let agencies = $derived(
    Array.from(
      new Set(
        entries
          .flatMap((e) => (e.agency ?? '').split(/\s*\/\s*/))
          .map((a) => a.trim())
          .filter(Boolean),
      ),
    ).sort(),
  );

  // Same agency-logo whitelist + full-name table that /missions uses.
  // Centralising would touch the established /missions code; for V1
  // the duplication is fine — when a per-route filter helper extracts
  // (Issue #57's refactor scope) the constants land in one place.
  // Logos must exist on disk under static/logos/{key}.svg — the page
  // surfaces a 404 console error if a key here has no matching SVG.
  const KNOWN_AGENCY_LOGOS = new Set([
    'nasa',
    'esa',
    'jaxa',
    'isro',
    'cnsa',
    'roscosmos',
    'spacex',
    'uaesa',
    'boeing',
    'csa',
    'northrop-grumman',
  ]);
  function logoFor(agency: string): string | null {
    const key = agency.toLowerCase().replace(/\s+/g, '-');
    return KNOWN_AGENCY_LOGOS.has(key) ? `${base}/logos/${key}.svg` : null;
  }
  const AGENCY_FULL_NAMES: Record<string, string> = {
    nasa: 'NASA',
    esa: 'European Space Agency',
    jaxa: 'Japan Aerospace Exploration Agency',
    isro: 'Indian Space Research Organisation',
    cnsa: 'China National Space Administration',
    cmsa: 'China Manned Space Agency',
    roscosmos: 'Roscosmos',
    spacex: 'SpaceX',
    uaesa: 'MBRSC / UAE Space Agency',
    'blue origin': 'Blue Origin',
    'blue-origin': 'Blue Origin',
    csa: 'Canadian Space Agency',
    boeing: 'Boeing',
    'northrop grumman': 'Northrop Grumman',
    'northrop-grumman': 'Northrop Grumman',
    ula: 'United Launch Alliance',
    ispace: 'ispace',
    spaceil: 'SpaceIL',
    'intuitive machines': 'Intuitive Machines',
  };
  function fullNameFor(agency: string): string {
    const key = agency.toLowerCase();
    return AGENCY_FULL_NAMES[key] ?? AGENCY_FULL_NAMES[key.replace(/\s+/g, '-')] ?? agency;
  }

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
          (categoryFilter === 'ALL' || e.category === categoryFilter) &&
          (agencyFilter === 'ALL' || e.agency === agencyFilter) &&
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
    const url = new URL($page.url);
    url.searchParams.set('id', entry.id);
    goto(url.pathname + `?${url.searchParams}`, {
      replaceState: false,
      keepFocus: false,
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

  onMount(async () => {
    applyUrl($page.url);
    try {
      entries = await getFleetIndex();
    } catch {
      loadFailed = true;
    }
    loading = false;

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

<div class="fleet">
  {#if loading}
    <p class="status">Loading fleet…</p>
  {:else if loadFailed}
    <p class="status error">Failed to load fleet data.</p>
  {:else}
    <!-- Filters collapsed by default. Count lives on the right end of
         the toggle bar (fraction when active, total-only otherwise) —
         matches /missions for visual consistency. -->
    <button
      type="button"
      class="filters-toggle"
      aria-expanded={filtersExpanded}
      aria-controls="fleet-filters"
      onclick={() => (filtersExpanded = !filtersExpanded)}
    >
      <span class="filters-eyebrow">FILTERS</span>
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
      <EpochTimelineStrip {entries} selected={epochFilter} onSelect={(v) => setEpoch(v)} />
      <nav id="fleet-filters" class="filters" aria-label="Fleet filters">
        <div class="filter-group" role="radiogroup" aria-label="Category">
          <span class="filter-label">CATEGORY</span>
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

        <div class="filter-group" role="radiogroup" aria-label="Status">
          <span class="filter-label">STATUS</span>
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
          <div class="filter-group" role="radiogroup" aria-label="Agency">
            <span class="filter-label">AGENCY</span>
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
          <span class="filter-label">SORT</span>
          <select
            aria-label="Sort fleet entries"
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
      <ul class="fleet-grid" aria-label="Fleet card grid">
        {#each filtered as entry (entry.id)}
          {@const primaryAgency = (entry.agency ?? '').split(/\s*\/\s*/)[0]?.trim() ?? entry.agency}
          {@const cardLogo = logoFor(primaryAgency)}
          {@const cardFullName = fullNameFor(primaryAgency)}
          {@const accent = CATEGORY_COLOR[entry.category]}
          <li class="card-li">
            <button
              type="button"
              class="card"
              style:--accent={accent}
              data-testid="fleet-card-{entry.id}"
              onclick={() => openEntry(entry)}
              aria-label="{entry.name} ({entry.agency}, {entry.first_flight.slice(0, 4)})"
            >
              <div class="card-accent" aria-hidden="true"></div>
              <figure class="card-photo">
                <img
                  class="card-cover"
                  src="{base}/images/fleet-galleries/{entry.id}/01.jpg"
                  alt=""
                  loading="lazy"
                  onerror={(e) => {
                    const fig = (e.currentTarget as HTMLImageElement).closest('figure');
                    if (fig) fig.classList.add('cover-missing');
                  }}
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
                      />
                    {/if}
                    {primaryAgency}
                  </span>
                  <span class="card-status status-{entry.status.toLowerCase()}">
                    {entry.status}
                  </span>
                </header>
                <h2 class="card-name">{entry.name}</h2>
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

  /* Inline count chip on the right end of the filters toggle bar.
     Mirrors /missions for visual parity. */
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

  /* Filters — visually identical to /missions per route-parity directive. */
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

  .fleet-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
  }

  /* Card grid — visually identical to /missions per route-parity directive. */
  .card-li {
    position: relative;
    /* `height: 100%` makes the wrapper fill its grid cell (which is
     * row-height = tallest item per row, by CSS Grid default). Without
     * it, cards in the same row appear at different heights when one
     * has more text than another. Issue #225. */
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
    padding: 0;
  }
  .card:hover {
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
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
  .card-photo.cover-missing {
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.05), rgba(255, 255, 255, 0.02));
  }
  .card-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  :global(.card-photo.cover-missing .card-cover) {
    display: none;
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
  .card-status.status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.12);
  }
  .card-status.status-flown {
    color: #4b9cd3;
    border-color: rgba(75, 156, 211, 0.55);
    background: rgba(75, 156, 211, 0.12);
  }
  .card-status.status-retired {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.55);
    background: rgba(255, 200, 80, 0.12);
  }
  .card-status.status-failed {
    color: #ff6b3a;
    border-color: rgba(193, 68, 14, 0.7);
    background: rgba(193, 68, 14, 0.18);
  }
  .card-status.status-planned {
    color: rgba(255, 255, 255, 0.78);
    border-color: rgba(255, 255, 255, 0.45);
    background: rgba(255, 255, 255, 0.06);
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
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
  .card-meta {
    display: flex;
    gap: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.3);
  }
  .card-country {
    max-width: 14ch;
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

  .fleet-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
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
    .fleet-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
    }
    .card-name {
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
