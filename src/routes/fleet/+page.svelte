<script lang="ts">
  import { onMount } from 'svelte';
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

  // Agencies derived from the loaded data — filter chips reflect what's
  // actually present rather than a hard-coded enum.
  let agencies = $derived(Array.from(new Set(entries.map((e) => e.agency).filter(Boolean))).sort());

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
    // Re-apply URL when navigating in-app (back/forward buttons)
    applyUrl($page.url);
    // Also keep the panel selection in sync with ?id=
    const id = $page.url.searchParams.get('id');
    if (id && id !== selectedEntry?.id) {
      void loadEntry(id);
    } else if (!id && panelOpen) {
      panelOpen = false;
      selectedEntry = null;
    }
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
    <div class="count-corner">
      <span class="count">{filtered.length}</span>
      <span class="count-label">of {entries.length}</span>
    </div>

    <EpochTimelineStrip {entries} selected={epochFilter} onSelect={(v) => setEpoch(v)} />

    <div class="filters" role="region" aria-label="Filters">
      <div class="filter-group" role="radiogroup" aria-label="Category">
        <span class="filter-label">Category</span>
        <button
          type="button"
          class="pill"
          class:active={categoryFilter === 'ALL'}
          role="radio"
          aria-checked={categoryFilter === 'ALL'}
          onclick={() => setCategory('ALL')}>All</button
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
        <span class="filter-label">Status</span>
        <button
          type="button"
          class="pill"
          class:active={statusFilter === 'ALL'}
          role="radio"
          aria-checked={statusFilter === 'ALL'}
          onclick={() => setStatus('ALL')}>All</button
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
          <span class="filter-label">Agency</span>
          <button
            type="button"
            class="pill"
            class:active={agencyFilter === 'ALL'}
            role="radio"
            aria-checked={agencyFilter === 'ALL'}
            onclick={() => setAgency('ALL')}>All</button
          >
          {#each agencies as agency (agency)}
            <button
              type="button"
              class="pill"
              class:active={agencyFilter === agency}
              role="radio"
              aria-checked={agencyFilter === agency}
              onclick={() => setAgency(agency)}>{agency}</button
            >
          {/each}
        </div>
      {/if}

      <div class="sort-group">
        <span class="filter-label">Sort</span>
        <select
          aria-label="Sort fleet entries"
          value={sortMode}
          onchange={(e) => setSort((e.currentTarget as HTMLSelectElement).value as typeof sortMode)}
        >
          <option value="chrono-desc">Newest first</option>
          <option value="chrono-asc">Oldest first</option>
          <option value="alpha">Alphabetical</option>
          <option value="category">By category</option>
        </select>
      </div>
    </div>

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
      <ul class="fleet-grid">
        {#each filtered as entry (entry.id)}
          <li>
            <button
              type="button"
              class="card"
              onclick={() => openEntry(entry)}
              aria-label="{entry.name} ({entry.agency}, {entry.first_flight.slice(0, 4)})"
            >
              <figure class="card-photo">
                <img
                  class="card-cover"
                  src="{base}/images/fleet/{entry.id}.jpg"
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
                  <span class="card-cat">{CATEGORY_LABEL[entry.category]}</span>
                  <span class="card-status status-{entry.status.toLowerCase()}">
                    {entry.status}
                  </span>
                </header>
                <h2 class="card-name">{entry.name}</h2>
                <p class="card-tagline">{entry.tagline}</p>
                <div class="card-meta">
                  <span class="card-year">{entry.first_flight.slice(0, 4)}</span>
                  <span class="card-agency">{entry.agency}</span>
                </div>
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

  .count-corner {
    position: absolute;
    top: 18px;
    right: 22px;
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    pointer-events: none;
  }
  .count {
    font-size: 18px;
    color: #4ecdc4;
    font-weight: 600;
  }
  .count-label {
    font-size: 11px;
    opacity: 0.6;
  }

  .filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 16px 0 20px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-label {
    font-family: 'Space Mono', monospace;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
    margin-right: 6px;
    min-width: 70px;
  }

  .pill {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.78);
    padding: 4px 10px;
    border-radius: 12px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
    min-height: 28px;
  }
  .pill:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.3);
  }
  .pill.active {
    background: rgba(78, 205, 196, 0.15);
    border-color: #4ecdc4;
    color: #4ecdc4;
  }

  .status-pill.status-active.active {
    background: rgba(78, 205, 196, 0.15);
    border-color: #4ecdc4;
    color: #4ecdc4;
  }
  .status-pill.status-flown.active {
    background: rgba(75, 156, 211, 0.15);
    border-color: #4b9cd3;
    color: #4b9cd3;
  }
  .status-pill.status-retired.active {
    background: rgba(255, 200, 80, 0.15);
    border-color: #ffc850;
    color: #ffc850;
  }
  .status-pill.status-failed.active {
    background: rgba(193, 68, 14, 0.18);
    border-color: #c1440e;
    color: #c1440e;
  }
  .status-pill.status-planned.active {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.5);
    color: rgba(255, 255, 255, 0.85);
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

  .card {
    width: 100%;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: inherit;
    cursor: pointer;
    text-align: left;
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }

  .card-photo {
    margin: 0;
    aspect-ratio: 16 / 9;
    background: rgba(255, 255, 255, 0.03);
    overflow: hidden;
    position: relative;
  }
  .card-photo.cover-missing {
    background: linear-gradient(135deg, rgba(78, 205, 196, 0.05), rgba(255, 255, 255, 0.02));
  }
  .card-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  :global(.card-photo.cover-missing .card-cover) {
    display: none;
  }

  .card-body {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .card-cat {
    color: rgba(255, 255, 255, 0.65);
  }
  .card-status {
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 9.5px;
  }
  .card-status.status-active {
    background: rgba(78, 205, 196, 0.18);
    color: #4ecdc4;
  }
  .card-status.status-flown {
    background: rgba(75, 156, 211, 0.18);
    color: #4b9cd3;
  }
  .card-status.status-retired {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
  }
  .card-status.status-failed {
    background: rgba(193, 68, 14, 0.22);
    color: #ff6b3a;
  }
  .card-status.status-planned {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
  }

  .card-name {
    margin: 2px 0 0;
    font-family: 'Bebas Neue', system-ui, sans-serif;
    font-size: 22px;
    letter-spacing: 0.02em;
    color: #fff;
  }
  .card-tagline {
    margin: 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.35;
  }
  .card-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 10.5px;
    color: rgba(255, 255, 255, 0.55);
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
    .count-corner {
      top: 14px;
      right: 12px;
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
