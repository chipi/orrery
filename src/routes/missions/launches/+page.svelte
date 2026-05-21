<script lang="ts">
  /**
   * /missions/launches — global launches calendar (PRD-020 / RFC-023).
   *
   * Hybrid UI: horizontal month strip + vertical chronological timeline.
   * Two modes: UPCOMING (default) and HISTORIC. URL-encoded filter state.
   *
   * S8b: year-grouped month strip, decade picker for HISTORIC (lazy
   * loads each decade file on demand), tier + agency + outcome filters.
   */

  import { onMount, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import {
    loadUpcoming,
    loadHistoricDecade,
    decadeForYear,
    groupByMonth,
    ALL_DECADES,
    type Manifest,
  } from '$lib/launches/manifest.js';
  import MonthStrip from '$lib/components/launches/MonthStrip.svelte';
  import DecadePicker from '$lib/components/launches/DecadePicker.svelte';
  import FilterStrip from '$lib/components/launches/FilterStrip.svelte';
  import AboutStrip from '$lib/components/launches/AboutStrip.svelte';
  import Timeline from '$lib/components/launches/Timeline.svelte';

  type Mode = 'upcoming' | 'historic';
  type TierFilter = 'ALL' | 'FEATURED';
  type OutcomeFilter = 'ALL' | 'SUCCESS' | 'FAILURE' | 'PARTIAL';

  let mode: Mode = $state('upcoming');
  let manifest: Manifest = $state({
    version: 1,
    generated_at: null,
    sources_active: [],
    entries: {},
  });
  let loading = $state(true);
  let activeMonth: string | null = $state(null);
  let activeDecade: string = $state(decadeForYear(new Date().getUTCFullYear()));
  let tierFilter: TierFilter = $state('ALL');
  let agencyFilter: string = $state('ALL');
  let outcomeFilter: OutcomeFilter = $state('ALL');

  // Per-decade entry counts populated as the user clicks through. Lets
  // the DecadePicker show "n entries" hints without forcing eager load
  // of all 7 files.
  let decadeCounts: Record<string, number | null> = $state({
    '1957-1969': null,
    '1970-1979': null,
    '1980-1989': null,
    '1990-1999': null,
    '2000-2009': null,
    '2010-2019': null,
    '2020-2026': null,
  });

  let allEntries = $derived(Object.values(manifest.entries));
  let agencies = $derived(
    Array.from(new Set(allEntries.map((e) => e.agency_name).filter(Boolean))).sort(),
  );

  let filtered = $derived(
    allEntries.filter((e) => {
      if (tierFilter === 'FEATURED' && e.tier !== 'T1') return false;
      if (agencyFilter !== 'ALL' && e.agency_name !== agencyFilter) return false;
      if (mode === 'historic' && outcomeFilter !== 'ALL' && e.status.code !== outcomeFilter)
        return false;
      return true;
    }),
  );

  let sorted = $derived(
    filtered
      .slice()
      .sort((a, b) =>
        mode === 'upcoming' ? a.net.localeCompare(b.net) : b.net.localeCompare(a.net),
      ),
  );

  let months = $derived(groupByMonth(sorted));

  async function loadForMode(m: Mode, decade?: string) {
    loading = true;
    if (m === 'upcoming') {
      manifest = await loadUpcoming();
    } else {
      const d = decade ?? activeDecade;
      activeDecade = d;
      manifest = await loadHistoricDecade(d);
      decadeCounts = { ...decadeCounts, [d]: Object.keys(manifest.entries).length };
    }
    loading = false;
    if (months.length > 0) activeMonth = months[0].key;
  }

  function setMode(m: Mode) {
    if (m === mode) return;
    mode = m;
    activeMonth = null;
    if (m === 'upcoming') {
      outcomeFilter = 'ALL'; // outcome doesn't apply to upcoming
    }
    pushUrl();
    void loadForMode(m);
  }

  function setDecade(d: string) {
    if (d === activeDecade) return;
    activeDecade = d;
    activeMonth = null;
    pushUrl();
    void loadForMode('historic', d);
  }

  function setTier(t: TierFilter) {
    tierFilter = t;
    pushUrl();
  }

  function setAgency(a: string) {
    agencyFilter = a;
    pushUrl();
  }

  function setOutcome(o: OutcomeFilter) {
    outcomeFilter = o;
    pushUrl();
  }

  function clearFilters() {
    tierFilter = 'ALL';
    agencyFilter = 'ALL';
    outcomeFilter = 'ALL';
    pushUrl();
  }

  function applyUrl(url: URL) {
    const m = url.searchParams.get('mode');
    mode = m === 'historic' ? 'historic' : 'upcoming';
    const d = url.searchParams.get('decade');
    if (d && (ALL_DECADES as readonly string[]).includes(d)) activeDecade = d;
    const t = url.searchParams.get('tier');
    tierFilter = t === 'FEATURED' ? 'FEATURED' : 'ALL';
    const a = url.searchParams.get('agency');
    agencyFilter = a ?? 'ALL';
    const o = url.searchParams.get('outcome');
    outcomeFilter =
      o === 'SUCCESS' || o === 'FAILURE' || o === 'PARTIAL' ? o : 'ALL';
  }

  function pushUrl() {
    const params = new URLSearchParams();
    if (mode !== 'upcoming') params.set('mode', mode);
    if (mode === 'historic' && activeDecade !== decadeForYear(new Date().getUTCFullYear())) {
      params.set('decade', activeDecade);
    }
    if (tierFilter !== 'ALL') params.set('tier', tierFilter);
    if (agencyFilter !== 'ALL') params.set('agency', agencyFilter);
    if (mode === 'historic' && outcomeFilter !== 'ALL') params.set('outcome', outcomeFilter);
    const qs = params.toString();
    const target = `${base}/missions/launches${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function jumpToMonth(key: string) {
    activeMonth = key;
    const el = document.getElementById(`month-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    applyUrl($page.url);
    void loadForMode(mode);
  });

  $effect(() => {
    const url = $page.url;
    untrack(() => {
      applyUrl(url);
      void loadForMode(mode);
    });
  });

  let gcatRelease = $derived(manifest.gcat_release);
</script>

<svelte:head>
  <title>Launches Calendar — Orrery</title>
  <meta
    name="description"
    content="Global spaceflight launches calendar — upcoming and historic. Sourced agency-first from NASA, SpaceX, ESA, Jonathan McDowell's GCAT, and Launch Library 2."
  />
</svelte:head>

<main
  class="launches-page"
  data-route-ready={!loading}
  data-loading={loading ? 'true' : null}
  data-mode={mode}
>
  <header class="page-header">
    <h1 class="page-title">Launches Calendar</h1>
    <p class="page-subtitle">
      Upcoming and historic global spaceflight launches. Agency-first sourcing with
      provenance per row.
    </p>
    <nav class="mode-tabs" aria-label="Launches view mode">
      <button
        type="button"
        class="tab"
        class:active={mode === 'upcoming'}
        onclick={() => setMode('upcoming')}
      >
        Upcoming
      </button>
      <button
        type="button"
        class="tab"
        class:active={mode === 'historic'}
        onclick={() => setMode('historic')}
      >
        Historic
      </button>
    </nav>
  </header>

  <AboutStrip {gcatRelease} />

  {#if mode === 'historic'}
    <DecadePicker {activeDecade} counts={decadeCounts} onSelect={setDecade} />
  {/if}

  <FilterStrip
    {mode}
    tier={tierFilter}
    agency={agencyFilter}
    outcome={outcomeFilter}
    {agencies}
    onTierChange={setTier}
    onAgencyChange={setAgency}
    onOutcomeChange={setOutcome}
    onClear={clearFilters}
    matchCount={filtered.length}
    totalCount={allEntries.length}
  />

  {#if loading}
    <p class="loading">Loading launches…</p>
  {:else}
    <MonthStrip {months} activeKey={activeMonth} onSelect={jumpToMonth} />
    <Timeline {months} {mode} />
  {/if}

  <footer class="citations">
    <p>
      Sources: NASA · SpaceX · ESA ·
      <a
        href="https://planet4589.org/space/gcat/"
        rel="noopener noreferrer external"
        hreflang="en">GCAT</a
      >
      ·
      <a href="https://thespacedevs.com/llapi" rel="noopener noreferrer external" hreflang="en"
        >LL2</a
      >. Full provenance per row.
    </p>
  </footer>
</main>

<style>
  .launches-page {
    min-height: 100vh;
    padding-top: 52px;
    background: #04040c;
    color: #e6e8ee;
  }

  .page-header {
    padding: 18px 12px 0;
  }

  @media (min-width: 768px) {
    .page-header {
      padding: 24px 24px 0;
    }
  }

  .page-title {
    margin: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 1px;
    color: #fff;
  }

  .page-subtitle {
    margin: 4px 0 16px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(230, 232, 238, 0.7);
    max-width: 60ch;
  }

  .mode-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0 -12px;
    padding: 0 12px;
  }

  @media (min-width: 768px) {
    .mode-tabs {
      margin: 0 -24px;
      padding: 0 24px;
    }
  }

  .tab {
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(230, 232, 238, 0.6);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    min-height: 44px;
  }

  .tab:hover {
    color: #fff;
  }

  .tab.active {
    color: #4466ff;
    border-bottom-color: #4466ff;
  }

  .loading {
    padding: 32px 16px;
    color: rgba(230, 232, 238, 0.5);
    font-family: 'Space Mono', monospace;
    text-align: center;
  }

  .citations {
    padding: 24px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.6);
    line-height: 1.6;
  }

  .citations a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  @media (min-width: 768px) {
    .citations {
      padding: 28px 24px;
    }
  }
</style>
