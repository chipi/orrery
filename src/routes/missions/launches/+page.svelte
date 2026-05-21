<script lang="ts">
  /**
   * /missions/launches — global launches calendar (PRD-020 / RFC-023).
   *
   * Layout consolidated to mirror /missions and /fleet:
   * - No H1 / subtitle / explainer in the page body (title in svelte:head).
   * - Single `.launches` container (max-width 1400 px, matches .library).
   * - Single `.filters-toggle` button (FILTERS ▸ N/total).
   * - When expanded: `.filters` nav with .filter-group × N of .pill buttons.
   * - Timeline below, full-width.
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
  import Timeline from '$lib/components/launches/Timeline.svelte';
  import PillDropdown from '$lib/components/PillDropdown.svelte';

  type Mode = 'upcoming' | 'historic';
  type TierFilter = 'ALL' | 'FEATURED';
  type OutcomeFilter = 'ALL' | 'SUCCESS' | 'FAILURE';

  let mode: Mode = $state('upcoming');
  let manifest: Manifest = $state({
    version: 1,
    generated_at: null,
    sources_active: [],
    entries: {},
  });
  let loading = $state(true);
  let activeDecade: string = $state(decadeForYear(new Date().getUTCFullYear()));
  let tierFilter: TierFilter = $state('ALL');
  let agencyFilter: string = $state('ALL');
  let outcomeFilter: OutcomeFilter = $state('ALL');
  let yearFilter: string = $state('ALL'); // 'ALL' or 4-digit year
  let filtersExpanded = $state(false);

  let allEntries = $derived(Object.values(manifest.entries));
  let agencies = $derived(
    Array.from(new Set(allEntries.map((e) => e.agency_name).filter(Boolean))).sort(),
  );
  let years = $derived(
    Array.from(new Set(allEntries.map((e) => e.net.slice(0, 4)))).sort(),
  );

  let filtered = $derived(
    allEntries.filter((e) => {
      if (tierFilter === 'FEATURED' && e.tier !== 'T1') return false;
      if (agencyFilter !== 'ALL' && e.agency_name !== agencyFilter) return false;
      if (mode === 'historic' && outcomeFilter !== 'ALL' && e.status.code !== outcomeFilter)
        return false;
      if (yearFilter !== 'ALL' && !e.net.startsWith(yearFilter)) return false;
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
    }
    loading = false;
  }

  function setMode(m: Mode) {
    if (m === mode) return;
    mode = m;
    if (m === 'upcoming') outcomeFilter = 'ALL';
    yearFilter = 'ALL'; // reset year when switching modes; available years change
    pushUrl();
    void loadForMode(m);
  }

  function setDecade(d: string) {
    if (d === activeDecade) return;
    activeDecade = d;
    yearFilter = 'ALL'; // reset year when switching decades
    pushUrl();
    void loadForMode('historic', d);
  }

  function setYear(y: string) {
    yearFilter = y;
    pushUrl();
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
    yearFilter = 'ALL';
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
    outcomeFilter = o === 'SUCCESS' || o === 'FAILURE' ? o : 'ALL';
    const y = url.searchParams.get('year');
    yearFilter = y && /^\d{4}$/.test(y) ? y : 'ALL';
    if (
      url.searchParams.has('mode') ||
      url.searchParams.has('decade') ||
      url.searchParams.has('tier') ||
      url.searchParams.has('agency') ||
      url.searchParams.has('outcome') ||
      url.searchParams.has('year')
    ) {
      filtersExpanded = true;
    }
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
    if (yearFilter !== 'ALL') params.set('year', yearFilter);
    const qs = params.toString();
    const target = `${base}/missions/launches${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
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
</script>

<svelte:head>
  <title>Launches — Orrery</title>
  <meta
    name="description"
    content="Global spaceflight launches — upcoming and historic. Agency-first sourcing with provenance per row."
  />
</svelte:head>

<div
  class="launches"
  data-route-ready={!loading}
  data-loading={loading ? 'true' : null}
  data-mode={mode}
>
  <button
    type="button"
    class="filters-toggle"
    aria-expanded={filtersExpanded}
    aria-controls="launches-filters"
    onclick={() => (filtersExpanded = !filtersExpanded)}
  >
    <span class="filters-eyebrow">FILTERS</span>
    <span class="filters-right">
      {#if filtered.length !== allEntries.length}
        <span class="filters-count count-fraction">{filtered.length} / {allEntries.length}</span>
      {:else}
        <span class="filters-count count-total-only">{allEntries.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filtersExpanded ? '▾' : '▸'}</span>
    </span>
  </button>

  {#if filtersExpanded}
    <nav id="launches-filters" class="filters" aria-label="Launches filters">
      <div class="filter-group" role="radiogroup" aria-label="View">
        <span class="filter-label">VIEW</span>
        <button
          type="button"
          class="pill"
          class:active={mode === 'upcoming'}
          role="radio"
          aria-checked={mode === 'upcoming'}
          onclick={() => setMode('upcoming')}>UPCOMING</button
        >
        <button
          type="button"
          class="pill"
          class:active={mode === 'historic'}
          role="radio"
          aria-checked={mode === 'historic'}
          onclick={() => setMode('historic')}>HISTORIC</button
        >
      </div>

      <div class="filter-group" role="radiogroup" aria-label="Tier">
        <span class="filter-label">TIER</span>
        <button
          type="button"
          class="pill"
          class:active={tierFilter === 'ALL'}
          role="radio"
          aria-checked={tierFilter === 'ALL'}
          onclick={() => setTier('ALL')}>ALL</button
        >
        <button
          type="button"
          class="pill"
          class:active={tierFilter === 'FEATURED'}
          role="radio"
          aria-checked={tierFilter === 'FEATURED'}
          onclick={() => setTier('FEATURED')}
          title="Crewed, beyond-LEO, or first flights of new vehicles. Operator-tunable."
          >FEATURED</button
        >
      </div>

      {#if mode === 'historic'}
        <div class="filter-group" role="radiogroup" aria-label="Decade">
          <span class="filter-label">DECADE</span>
          {#each ALL_DECADES as d (d)}
            <button
              type="button"
              class="pill"
              class:active={d === activeDecade}
              role="radio"
              aria-checked={d === activeDecade}
              onclick={() => setDecade(d)}>{d === '1957-1969' ? '1957-69' : d.replace('-', '–')}</button
            >
          {/each}
        </div>

        <div class="filter-group" role="radiogroup" aria-label="Outcome">
          <span class="filter-label">OUTCOME</span>
          <button
            type="button"
            class="pill"
            class:active={outcomeFilter === 'ALL'}
            role="radio"
            aria-checked={outcomeFilter === 'ALL'}
            onclick={() => setOutcome('ALL')}>ALL</button
          >
          <button
            type="button"
            class="pill"
            class:active={outcomeFilter === 'SUCCESS'}
            role="radio"
            aria-checked={outcomeFilter === 'SUCCESS'}
            onclick={() => setOutcome('SUCCESS')}>SUCCESS</button
          >
          <button
            type="button"
            class="pill"
            class:active={outcomeFilter === 'FAILURE'}
            role="radio"
            aria-checked={outcomeFilter === 'FAILURE'}
            onclick={() => setOutcome('FAILURE')}>FAILURE</button
          >
        </div>
      {/if}

      <div class="filter-group">
        <span class="filter-label">AGENCY</span>
        <PillDropdown
          value={agencyFilter}
          options={agencies}
          placeholder="ALL"
          label="Agency filter"
          onChange={setAgency}
        />
      </div>

      {#if years.length > 1}
        <div class="filter-group" role="radiogroup" aria-label="Year">
          <span class="filter-label">YEAR</span>
          <button
            type="button"
            class="pill"
            class:active={yearFilter === 'ALL'}
            role="radio"
            aria-checked={yearFilter === 'ALL'}
            onclick={() => setYear('ALL')}>ALL</button
          >
          {#each years as y (y)}
            <button
              type="button"
              class="pill"
              class:active={y === yearFilter}
              role="radio"
              aria-checked={y === yearFilter}
              onclick={() => setYear(y)}>{y}</button
            >
          {/each}
        </div>
      {/if}

      {#if tierFilter !== 'ALL' || agencyFilter !== 'ALL' || outcomeFilter !== 'ALL' || yearFilter !== 'ALL'}
        <button type="button" class="clear-btn" onclick={clearFilters}>CLEAR ✕</button>
      {/if}
    </nav>
  {/if}

  {#if loading}
    <p class="loading">Loading launches…</p>
  {:else if months.length === 0}
    <p class="empty">No launches match these filters.</p>
  {:else}
    <Timeline {months} {mode} />
  {/if}

  <footer class="footer-note">
    <p>
      Sources: NASA · SpaceX · ESA ·
      <a href="https://planet4589.org/space/gcat/" rel="noopener noreferrer external" hreflang="en"
        >McDowell's GCAT (CC&nbsp;BY&nbsp;4.0)</a
      >
      ·
      <a href="https://thespacedevs.com/llapi" rel="noopener noreferrer external" hreflang="en"
        >Launch Library 2</a
      >. Per-row provenance on every entry.
    </p>
  </footer>
</div>

<style>
  /* Container mirrors .library on /missions and .fleet on /fleet. */
  .launches {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  /* ── Filters toggle strip + count, copied verbatim from /missions
       for visual consistency. ─────────────────────────────────────── */
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
    transition: border-color 120ms, color 120ms;
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
  .filters-chevron {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }

  /* ── Filter groups + pills, same shape as /missions. ─────────── */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding: 8px 0 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 14px;
    align-items: center;
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
    min-height: 32px;
    padding: 6px 12px;
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

  .clear-btn {
    margin-left: auto;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid rgba(255, 82, 82, 0.4);
    border-radius: 3px;
    color: #ff5252;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
    cursor: pointer;
  }
  .clear-btn:hover {
    background: rgba(255, 82, 82, 0.12);
  }

  .loading,
  .empty {
    padding: 40px 16px;
    color: rgba(230, 232, 238, 0.5);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    text-align: center;
  }

  .footer-note {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(230, 232, 238, 0.45);
    line-height: 1.6;
  }
  .footer-note a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
