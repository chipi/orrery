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
  import { launchAgencyLogo, launchAgencyShortName } from '$lib/launches/agency-logos.js';
  import * as m from '$lib/paraglide/messages';

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

  /**
   * Launches list filter state. Bagged into a single typed `$state`
   * per #330 C.1 — replaces 5 scattered `$state` declarations with
   * one shape that's passed to the reset funnel + future URL-sync.
   * `expanded` is a UI-only field (filter strip disclosure); the
   * funnel doesn't touch it so clearing filters keeps the strip open.
   */
  interface LaunchFilterState {
    tier: TierFilter;
    agency: string;
    outcome: OutcomeFilter;
    year: string; // 'ALL' or 4-digit year
    expanded: boolean;
  }
  const filterState = $state<LaunchFilterState>({
    tier: 'ALL',
    agency: 'ALL',
    outcome: 'ALL',
    year: 'ALL',
    expanded: false,
  });

  function resetLaunchFilters(): void {
    filterState.tier = 'ALL';
    filterState.agency = 'ALL';
    filterState.outcome = 'ALL';
    filterState.year = 'ALL';
  }

  let allEntries = $derived(Object.values(manifest.entries));
  let agencies = $derived(
    Array.from(new Set(allEntries.map((e) => e.agency_name).filter(Boolean))).sort(),
  );
  let years = $derived(Array.from(new Set(allEntries.map((e) => e.net.slice(0, 4)))).sort());

  let filtered = $derived(
    allEntries.filter((e) => {
      if (filterState.tier === 'FEATURED' && e.tier !== 'T1') return false;
      if (filterState.agency !== 'ALL' && e.agency_name !== filterState.agency) return false;
      if (
        mode === 'historic' &&
        filterState.outcome !== 'ALL' &&
        e.status.code !== filterState.outcome
      )
        return false;
      if (filterState.year !== 'ALL' && !e.net.startsWith(filterState.year)) return false;
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
    if (m === 'upcoming') filterState.outcome = 'ALL';
    filterState.year = 'ALL'; // reset year when switching modes; available years change
    pushUrl();
    void loadForMode(m);
  }

  function setDecade(d: string) {
    if (d === activeDecade) return;
    activeDecade = d;
    filterState.year = 'ALL'; // reset year when switching decades
    pushUrl();
    void loadForMode('historic', d);
  }

  function setYear(y: string) {
    filterState.year = y;
    pushUrl();
  }

  function setTier(t: TierFilter) {
    filterState.tier = t;
    pushUrl();
  }

  function setAgency(a: string) {
    filterState.agency = a;
    pushUrl();
  }

  function setOutcome(o: OutcomeFilter) {
    filterState.outcome = o;
    pushUrl();
  }

  function clearFilters() {
    resetLaunchFilters();
    pushUrl();
  }

  function applyUrl(url: URL) {
    const m = url.searchParams.get('mode');
    mode = m === 'historic' ? 'historic' : 'upcoming';
    const d = url.searchParams.get('decade');
    if (d && (ALL_DECADES as readonly string[]).includes(d)) activeDecade = d;
    const t = url.searchParams.get('tier');
    filterState.tier = t === 'FEATURED' ? 'FEATURED' : 'ALL';
    const a = url.searchParams.get('agency');
    filterState.agency = a ?? 'ALL';
    const o = url.searchParams.get('outcome');
    filterState.outcome = o === 'SUCCESS' || o === 'FAILURE' ? o : 'ALL';
    const y = url.searchParams.get('year');
    filterState.year = y && /^\d{4}$/.test(y) ? y : 'ALL';
    if (
      url.searchParams.has('mode') ||
      url.searchParams.has('decade') ||
      url.searchParams.has('tier') ||
      url.searchParams.has('agency') ||
      url.searchParams.has('outcome') ||
      url.searchParams.has('year')
    ) {
      filterState.expanded = true;
    }
  }

  function pushUrl() {
    const params = new URLSearchParams();
    if (mode !== 'upcoming') params.set('mode', mode);
    if (mode === 'historic' && activeDecade !== decadeForYear(new Date().getUTCFullYear())) {
      params.set('decade', activeDecade);
    }
    if (filterState.tier !== 'ALL') params.set('tier', filterState.tier);
    if (filterState.agency !== 'ALL') params.set('agency', filterState.agency);
    if (mode === 'historic' && filterState.outcome !== 'ALL')
      params.set('outcome', filterState.outcome);
    if (filterState.year !== 'ALL') params.set('year', filterState.year);
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
  <a class="back-link" href="{base}/missions" data-sveltekit-preload-data="hover">
    <span class="back-arrow" aria-hidden="true">←</span>
    <span class="back-label">{m.launches_back_to_missions()}</span>
  </a>

  <button
    type="button"
    class="filters-toggle"
    aria-expanded={filterState.expanded}
    aria-controls="launches-filters"
    onclick={() => (filterState.expanded = !filterState.expanded)}
  >
    <span class="filters-eyebrow">{m.launches_filters_label().toUpperCase()}</span>
    <span class="filters-right">
      {#if filtered.length !== allEntries.length}
        <span class="filters-count count-fraction">{filtered.length} / {allEntries.length}</span>
      {:else}
        <span class="filters-count count-total-only">{allEntries.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filterState.expanded ? '▾' : '▸'}</span>
    </span>
  </button>

  {#if filterState.expanded}
    <nav id="launches-filters" class="filters" aria-label={m.launches_filters_label()}>
      <div class="filter-group" role="radiogroup" aria-label={m.launches_filter_view()}>
        <span class="filter-label">{m.launches_filter_view()}</span>
        <button
          type="button"
          class="pill"
          class:active={mode === 'upcoming'}
          role="radio"
          aria-checked={mode === 'upcoming'}
          onclick={() => setMode('upcoming')}>{m.launches_tab_upcoming().toUpperCase()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={mode === 'historic'}
          role="radio"
          aria-checked={mode === 'historic'}
          onclick={() => setMode('historic')}>{m.launches_tab_historic().toUpperCase()}</button
        >
      </div>

      <div class="filter-group" role="radiogroup" aria-label={m.launches_filter_tier()}>
        <span class="filter-label">{m.launches_filter_tier()}</span>
        <button
          type="button"
          class="pill"
          class:active={filterState.tier === 'ALL'}
          role="radio"
          aria-checked={filterState.tier === 'ALL'}
          onclick={() => setTier('ALL')}>{m.launches_filter_all()}</button
        >
        <button
          type="button"
          class="pill"
          class:active={filterState.tier === 'FEATURED'}
          role="radio"
          aria-checked={filterState.tier === 'FEATURED'}
          onclick={() => setTier('FEATURED')}>{m.launches_tier_featured()}</button
        >
      </div>

      {#if mode === 'historic'}
        <div class="filter-group" role="radiogroup" aria-label={m.launches_filter_decade()}>
          <span class="filter-label">{m.launches_filter_decade()}</span>
          {#each ALL_DECADES as d (d)}
            <button
              type="button"
              class="pill"
              class:active={d === activeDecade}
              role="radio"
              aria-checked={d === activeDecade}
              onclick={() => setDecade(d)}
              >{d === '1957-1969' ? '1957-69' : d.replace('-', '–')}</button
            >
          {/each}
        </div>

        <div class="filter-group" role="radiogroup" aria-label={m.launches_filter_outcome()}>
          <span class="filter-label">{m.launches_filter_outcome()}</span>
          <button
            type="button"
            class="pill"
            class:active={filterState.outcome === 'ALL'}
            role="radio"
            aria-checked={filterState.outcome === 'ALL'}
            onclick={() => setOutcome('ALL')}>{m.launches_outcome_all()}</button
          >
          <button
            type="button"
            class="pill"
            class:active={filterState.outcome === 'SUCCESS'}
            role="radio"
            aria-checked={filterState.outcome === 'SUCCESS'}
            onclick={() => setOutcome('SUCCESS')}>{m.launches_outcome_success()}</button
          >
          <button
            type="button"
            class="pill"
            class:active={filterState.outcome === 'FAILURE'}
            role="radio"
            aria-checked={filterState.outcome === 'FAILURE'}
            onclick={() => setOutcome('FAILURE')}>{m.launches_outcome_failure()}</button
          >
        </div>
      {/if}

      <div class="filter-group">
        <span class="filter-label">{m.launches_filter_agency()}</span>
        <PillDropdown
          value={filterState.agency}
          options={agencies}
          placeholder={m.launches_filter_all()}
          label={m.launches_filter_agency()}
          logoFor={launchAgencyLogo}
          shortNameFor={launchAgencyShortName}
          searchable
          onChange={setAgency}
        />
      </div>

      {#if years.length > 1}
        <div class="filter-group" role="radiogroup" aria-label={m.launches_filter_year()}>
          <span class="filter-label">{m.launches_filter_year()}</span>
          <button
            type="button"
            class="pill"
            class:active={filterState.year === 'ALL'}
            role="radio"
            aria-checked={filterState.year === 'ALL'}
            onclick={() => setYear('ALL')}>{m.launches_filter_all()}</button
          >
          {#each years as y (y)}
            <button
              type="button"
              class="pill"
              class:active={y === filterState.year}
              role="radio"
              aria-checked={y === filterState.year}
              onclick={() => setYear(y)}>{y}</button
            >
          {/each}
        </div>
      {/if}

      {#if filterState.tier !== 'ALL' || filterState.agency !== 'ALL' || filterState.outcome !== 'ALL' || filterState.year !== 'ALL'}
        <button type="button" class="clear-btn" onclick={clearFilters}>{m.launches_clear()}</button>
      {/if}
    </nav>
  {/if}

  {#if loading}
    <p class="loading">{m.launches_loading()}</p>
  {:else if months.length === 0}
    <p class="empty">{m.launches_no_matches()}</p>
  {:else}
    <Timeline {months} {mode} />
  {/if}

  <footer class="footer-note">
    <p>
      {m.launches_footer_sources_lead()}
      <a href="https://planet4589.org/space/gcat/" rel="noopener noreferrer external" hreflang="en"
        >{m.launches_citation_gcat_label()} (CC&nbsp;BY&nbsp;4.0)</a
      >
      ·
      <a href="https://thespacedevs.com/llapi" rel="noopener noreferrer external" hreflang="en"
        >{m.launches_citation_ll2_label()}</a
      >. {m.launches_footer_per_row_provenance()}
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

  /* Back link sits above the filters strip. Matches the visual weight
     of .filters-toggle so the two read as a vertical stack. */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 8px;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.04em;
    text-decoration: none;
    border-radius: 4px;
    transition:
      color 120ms,
      background 120ms;
  }
  .back-link:hover,
  .back-link:focus-visible {
    color: rgba(255, 255, 255, 0.92);
    background: rgba(255, 255, 255, 0.04);
    outline: none;
  }
  .back-arrow {
    font-size: 14px;
    line-height: 1;
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
