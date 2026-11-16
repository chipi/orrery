<script lang="ts">
  /**
   * /missions/launches — global launches calendar (PRD-020 / RFC-023), on the catalogue pattern of
   * /missions and /fleet (UXD-048): search, FILTERS (view, tier, decade, outcome, year), the era
   * strip by launch year, the provider chips, the "N launches | Showing" line with sort and
   * List / Grid, then the manifest. It is a long manifest, so it opens as the month-grouped list;
   * the grid is one card of one size per launch. A launch card links to its mission or its
   * launcher in Orrery where the manifest names one, and is a plain card where it does not.
   *
   * Eras: the page holds one manifest at a time (the upcoming list or one decade). The era tiles
   * count from `launches-years.json`; choosing an era loads the decades it spans (and the upcoming
   * list when it runs into the present) and keeps the launches of its years.
   */

  import { onMount, untrack } from 'svelte';
  import { metaDescription } from '$lib/seo';
  import { localHref } from '$lib/locale';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import {
    loadUpcoming,
    loadHistoricDecade,
    loadYearIndex,
    decadeForYear,
    formatNet,
    groupByMonth,
    feedText,
    ALL_DECADES,
    type LaunchEntry,
    type Manifest,
  } from '$lib/launches/manifest.js';
  import {
    launchEra,
    launchSources,
    launchYear,
    listMode,
    mergeEntries,
    providerCounts,
    providerOf,
    sortLaunches,
    type LaunchMode,
    type LaunchSort,
  } from '$lib/launches/browse';
  import { countsByEra, providersByEra, type YearIndex } from '$lib/launches/year-index';
  import Timeline from '$lib/components/launches/Timeline.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import AgencyFilterRow from '$lib/components/AgencyFilterRow.svelte';
  import BrowseToolbar from '$lib/components/BrowseToolbar.svelte';
  import EntityCard from '$lib/components/EntityCard.svelte';
  import { EPOCH_BANDS } from '$lib/epoch-bands';
  import { epochLabel } from '$lib/epoch-label';
  import { agencyDataColor, agencyFullName, agencyShortName } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { launchStatusLabel } from '$lib/launches/status-label';
  import { nativeCompound } from '$lib/name-origins.js';
  import { getLocale } from '$lib/paraglide/runtime';
  import { pickHero, loadHeroOverrides } from '$lib/image-hero';
  import * as m from '$lib/paraglide/messages';
  import VisuallyHiddenH1 from '$lib/components/VisuallyHiddenH1.svelte';
  import type { FleetEpoch } from '$types/fleet';

  type TierFilter = 'ALL' | 'FEATURED';
  type OutcomeFilter = 'ALL' | 'SUCCESS' | 'FAILURE';

  const THIS_YEAR = new Date().getUTCFullYear();
  const DEFAULT_DECADE = decadeForYear(THIS_YEAR);

  let mode: LaunchMode = $state('upcoming');
  let entries: LaunchEntry[] = $state([]);
  let loading = $state(true);
  let loadedOnce = $state(false);
  let activeDecade: string = $state(DEFAULT_DECADE);
  let yearIndex: YearIndex = $state({ version: 1, years: {} });

  /**
   * Launches list filter state, one typed `$state` (#330 C.1). `expanded` is a UI-only field (the
   * filter strip's disclosure); clearing filters keeps the strip open. `sort` is null for the
   * default order (oldest first, soonest first in the upcoming list: the order the list always had).
   */
  interface LaunchFilterState {
    tier: TierFilter;
    agency: string;
    outcome: OutcomeFilter;
    year: string; // 'ALL' or 4-digit year
    epoch: FleetEpoch | 'ALL';
    q: string;
    sort: LaunchSort | null;
    view: 'list' | 'grid';
    expanded: boolean;
  }
  const filterState = $state<LaunchFilterState>({
    tier: 'ALL',
    agency: 'ALL',
    outcome: 'ALL',
    year: 'ALL',
    epoch: 'ALL',
    q: '',
    sort: null,
    view: 'list',
    expanded: false,
  });

  function resetLaunchFilters(): void {
    filterState.tier = 'ALL';
    filterState.agency = 'ALL';
    filterState.outcome = 'ALL';
    filterState.year = 'ALL';
    filterState.epoch = 'ALL';
    filterState.q = '';
  }

  const eraOn = $derived(filterState.epoch !== 'ALL');
  const shown = $derived(listMode(filterState.epoch, mode, THIS_YEAR)); // what the list holds
  const sourceKeys = $derived(launchSources(filterState.epoch, mode, activeDecade, THIS_YEAR));

  // The launches in scope: the manifest(s) loaded, narrowed to the era's years when an era is chosen.
  let scoped = $derived(
    filterState.epoch === 'ALL'
      ? entries
      : entries.filter((e) => launchEra(e) === filterState.epoch),
  );
  let agencyCount = $derived(providerCounts(scoped));
  let agencies = $derived([...agencyCount.keys()].sort());
  let years = $derived(Array.from(new Set(scoped.map((e) => String(launchYear(e))))).sort());

  const locale = getLocale();
  const nativeOr = (name: string) => nativeCompound(locale, name) ?? name;
  const missionLine = (e: LaunchEntry) => feedText(nativeOr(e.mission_name ?? e.name));
  const vehicle = (e: LaunchEntry) => nativeOr(e.rocket_config_name);

  // The old links carry the provider as the manifest names it ("National Aeronautics and Space
  // Administration"); the chips carry the short name. Both select the same launches.
  const agencyWanted = $derived(
    filterState.agency === 'ALL' ? 'ALL' : agencyShortName(filterState.agency),
  );

  let filtered = $derived(
    scoped.filter((e) => {
      if (filterState.tier === 'FEATURED' && e.tier !== 'T1') return false;
      if (agencyWanted !== 'ALL' && providerOf(e) !== agencyWanted) return false;
      if (filterState.outcome !== 'ALL' && e.status.code !== filterState.outcome) return false;
      if (filterState.year !== 'ALL' && !e.net.startsWith(filterState.year)) return false;
      return matchesQuery(
        [
          vehicle(e),
          missionLine(e),
          e.rocket_config_name,
          e.mission_name,
          e.agency_name,
          providerOf(e),
          e.pad_name,
          e.orbit_name,
          e.editorial_note,
        ],
        filterState.q,
      );
    }),
  );

  const effectiveSort = $derived<LaunchSort>(filterState.sort ?? 'chrono-asc');
  let sorted = $derived(sortLaunches(filtered, effectiveSort, vehicle));
  let months = $derived(
    effectiveSort === 'alpha'
      ? [{ key: 'all', label: '', entries: sorted }]
      : groupByMonth(sorted, effectiveSort === 'chrono-desc' ? 'desc' : 'asc'),
  );

  // The era strip counts the whole catalogue (the year index), not the manifest in scope.
  let countByEpoch = $derived(countsByEra(yearIndex));
  let colorsByEpoch = $derived.by(() => {
    const out = new Map<FleetEpoch, string[]>();
    for (const [ep, byName] of providersByEra(yearIndex)) {
      const merged = new Map<string, number>();
      for (const [name, n] of byName) {
        const short = agencyShortName(name);
        merged.set(short, (merged.get(short) ?? 0) + n);
      }
      // One dot per colour: the strip keys its dots by colour, and two providers can share one.
      out.set(ep, [
        ...new Set(
          [...merged.entries()]
            .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
            .map(([a]) => agencyDataColor(a))
            .filter((c): c is string => !!c),
        ),
      ]);
    }
    return out;
  });

  let anyFilterActive = $derived(
    filterState.tier !== 'ALL' ||
      filterState.agency !== 'ALL' ||
      filterState.outcome !== 'ALL' ||
      filterState.year !== 'ALL' ||
      filterState.epoch !== 'ALL' ||
      filterState.q.trim() !== '',
  );

  // ─── Loading: one request per manifest, kept for the visit ────────
  const manifests = new Map<string, Promise<Manifest>>();
  const manifestOf = (key: string): Promise<Manifest> => {
    let p = manifests.get(key);
    if (!p) {
      p = key === 'upcoming' ? loadUpcoming() : loadHistoricDecade(key);
      manifests.set(key, p);
    }
    return p;
  };
  let loadToken = 0;
  async function load(keys: string[]) {
    const token = ++loadToken;
    loading = true;
    const loaded = await Promise.all(keys.map(manifestOf));
    if (token !== loadToken) return; // a newer request superseded this one
    entries = mergeEntries(loaded);
    loading = false;
    loadedOnce = true;
  }

  // ─── Setters (each writes the URL) ───────────────────────────────
  function setMode(next: LaunchMode) {
    if (next === mode) return;
    mode = next;
    if (next === 'upcoming') filterState.outcome = 'ALL';
    filterState.year = 'ALL'; // the years on offer change with the manifest
    pushUrl();
  }

  function setDecade(d: string) {
    if (d === activeDecade) return;
    activeDecade = d;
    filterState.year = 'ALL';
    pushUrl();
  }

  function setEpoch(v: FleetEpoch | 'ALL') {
    filterState.epoch = v;
    filterState.year = 'ALL';
    if (v !== 'ALL' && listMode(v, mode, THIS_YEAR) === 'upcoming') filterState.outcome = 'ALL';
    pushUrl();
  }

  function clearFilters() {
    resetLaunchFilters();
    pushUrl();
  }

  // ─── URL ↔ filter sync ───────────────────────────────────────────
  const epochValid = (v: string) => EPOCH_BANDS.some((b) => b.id === v);

  function applyUrl(url: URL) {
    const sp = url.searchParams;
    mode = sp.get('mode') === 'historic' ? 'historic' : 'upcoming';
    const d = sp.get('decade');
    if (d && (ALL_DECADES as readonly string[]).includes(d)) activeDecade = d;
    filterState.tier = sp.get('tier') === 'FEATURED' ? 'FEATURED' : 'ALL';
    filterState.agency = sp.get('agency') ?? 'ALL';
    const o = sp.get('outcome');
    filterState.outcome = o === 'SUCCESS' || o === 'FAILURE' ? o : 'ALL';
    const y = sp.get('year');
    filterState.year = y && /^\d{4}$/.test(y) ? y : 'ALL';
    const ep = sp.get('epoch');
    filterState.epoch = ep && epochValid(ep) ? (ep as FleetEpoch) : 'ALL';
    filterState.q = sp.get('q') ?? '';
    const so = sp.get('sort');
    filterState.sort = so === 'chrono-desc' || so === 'alpha' ? so : null;
    filterState.view = sp.get('view') === 'grid' ? 'grid' : 'list';
    if (
      sp.has('mode') ||
      sp.has('decade') ||
      sp.has('tier') ||
      sp.has('outcome') ||
      sp.has('year')
    ) {
      filterState.expanded = true;
    }
  }

  function pushUrl() {
    const params = new URLSearchParams();
    if (mode !== 'upcoming') params.set('mode', mode);
    if (mode === 'historic' && activeDecade !== DEFAULT_DECADE) params.set('decade', activeDecade);
    if (filterState.tier !== 'ALL') params.set('tier', filterState.tier);
    if (filterState.agency !== 'ALL') params.set('agency', filterState.agency);
    if (filterState.outcome !== 'ALL') params.set('outcome', filterState.outcome);
    if (filterState.year !== 'ALL') params.set('year', filterState.year);
    if (filterState.epoch !== 'ALL') params.set('epoch', filterState.epoch);
    if (filterState.q.trim() !== '') params.set('q', filterState.q.trim());
    if (filterState.sort) params.set('sort', filterState.sort);
    if (filterState.view === 'grid') params.set('view', 'grid');
    const qs = params.toString();
    const target = localHref(`/missions/launches${qs ? `?${qs}` : ''}`);
    if (target !== page.url.pathname + page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  let urlApplied = $state(false);
  onMount(() => {
    void loadHeroOverrides('fleet');
    void loadYearIndex().then((idx) => (yearIndex = idx));
  });
  $effect(() => {
    const url = page.url;
    untrack(() => {
      applyUrl(url);
      urlApplied = true;
    });
  });
  $effect(() => {
    if (!urlApplied) return;
    const keys = sourceKeys;
    untrack(() => void load(keys));
  });

  // ─── Cards ───────────────────────────────────────────────────────
  const dateLabel = (e: LaunchEntry) =>
    formatNet(
      e.net,
      ['second', 'minute', 'hour'].includes(e.net_precision) ? 'day' : e.net_precision,
    );
  const destination = (e: LaunchEntry): string | undefined =>
    e.orrery_mission_ref
      ? localHref(`/missions?id=${e.orrery_mission_ref}`)
      : e.orrery_launcher_ref
        ? localHref(`/fleet?id=${e.orrery_launcher_ref}`)
        : undefined;
  // Done launches look like a flown mission, a failure like a failed one, the rest like a planned one.
  const statusClass = (code: string) =>
    code === 'SUCCESS'
      ? 'flown'
      : code === 'FAILURE'
        ? 'failed'
        : code === 'GO'
          ? 'active'
          : 'planned';
  const sortLabel = (): string =>
    mode === 'upcoming' && !eraOn ? m.launches_sort_soonest() : m.fleet_sort_oldest();
</script>

<svelte:head>
  <title>{m.launches_page_title()} — Orrery</title>
  <meta name="description" content={metaDescription(m.launches_meta_description())} />
</svelte:head>
<VisuallyHiddenH1 title={m.launches_page_title()} />

<div
  class="launches entity-browse-page browse-main"
  data-route-ready={!loading}
  data-loading={loading ? 'true' : null}
  data-mode={shown === 'upcoming' ? 'upcoming' : eraOn ? 'historic' : mode}
>
  <a class="back-link" href={localHref(`/missions`)} data-sveltekit-preload-data="hover">
    <span class="back-arrow" aria-hidden="true">←</span>
    <span class="back-label">{m.launches_back_to_missions()}</span>
  </a>

  <div class="search-row">
    <input
      type="search"
      class="search-input"
      placeholder={m.launches_search_placeholder()}
      aria-label={m.launches_search_placeholder()}
      data-testid="launches-search"
      value={filterState.q}
      oninput={(e) => {
        filterState.q = (e.currentTarget as HTMLInputElement).value;
        pushUrl();
      }}
    />
  </div>

  <div class="filters-bar">
    <Chip
      kind="action"
      class="filters-strip"
      aria-expanded={filterState.expanded}
      aria-controls="launches-filters"
      onclick={() => (filterState.expanded = !filterState.expanded)}
    >
      {m.filters_eyebrow()}
      {#if filtered.length !== scoped.length}
        <span class="filters-count count-fraction" aria-hidden="true"
          >{filtered.length} / {scoped.length}</span
        >
        <span class="filters-count-sr"
          >{m.filters_count_of({ shown: filtered.length, total: scoped.length })}</span
        >
      {:else}
        <span class="filters-count count-total-only">{scoped.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filterState.expanded ? '▾' : '▸'}</span>
    </Chip>
    {#if anyFilterActive}
      <Chip kind="action" quiet dismiss class="filters-clear" onclick={clearFilters}>
        {m.missions_clear_filters()}
      </Chip>
    {/if}
  </div>

  <EpochTimelineStrip
    {countByEpoch}
    {colorsByEpoch}
    selected={filterState.epoch}
    onSelect={(v) => setEpoch(v)}
  />
  <div class="filters agency-row">
    {#if agencies.length > 0}
      <AgencyFilterRow
        agencies={agencies.map((name) => ({ name, count: agencyCount.get(name) ?? 0 }))}
        value={agencyWanted}
        onSelect={(v) => {
          filterState.agency = v;
          pushUrl();
        }}
        label={m.launches_filter_agency()}
        allLabel={m.launches_filter_all()}
      />
    {/if}
  </div>

  {#if filterState.expanded}
    <nav id="launches-filters" class="filters" aria-label={m.filters_eyebrow()}>
      <ChipGroup role="radiogroup" class="filter-group" label={m.launches_filter_view()}>
        <span class="filter-label">{m.launches_filter_view()}</span>
        <Chip
          kind="choice"
          active={shown === 'upcoming' || (!eraOn && mode === 'upcoming')}
          disabled={eraOn}
          onclick={() => setMode('upcoming')}>{m.launches_tab_upcoming().toUpperCase()}</Chip
        >
        <Chip
          kind="choice"
          active={eraOn ? shown !== 'upcoming' : mode === 'historic'}
          disabled={eraOn}
          onclick={() => setMode('historic')}>{m.launches_tab_historic().toUpperCase()}</Chip
        >
      </ChipGroup>

      <ChipGroup role="radiogroup" class="filter-group" label={m.launches_filter_tier()}>
        <span class="filter-label">{m.launches_filter_tier()}</span>
        <Chip
          kind="choice"
          active={filterState.tier === 'ALL'}
          onclick={() => {
            filterState.tier = 'ALL';
            pushUrl();
          }}>{m.launches_filter_all()}</Chip
        >
        <Chip
          kind="choice"
          active={filterState.tier === 'FEATURED'}
          onclick={() => {
            filterState.tier = 'FEATURED';
            pushUrl();
          }}>{m.launches_tier_featured()}</Chip
        >
      </ChipGroup>

      {#if mode === 'historic' && !eraOn}
        <ChipGroup role="radiogroup" class="filter-group" label={m.launches_filter_decade()}>
          <span class="filter-label">{m.launches_filter_decade()}</span>
          {#each ALL_DECADES as d (d)}
            <Chip kind="choice" active={d === activeDecade} onclick={() => setDecade(d)}
              >{d === '1957-1969' ? '1957-69' : d.replace('-', '–')}</Chip
            >
          {/each}
        </ChipGroup>
      {/if}

      {#if shown !== 'upcoming'}
        <ChipGroup role="radiogroup" class="filter-group" label={m.launches_filter_outcome()}>
          <span class="filter-label">{m.launches_filter_outcome()}</span>
          <Chip
            kind="choice"
            active={filterState.outcome === 'ALL'}
            onclick={() => {
              filterState.outcome = 'ALL';
              pushUrl();
            }}>{m.launches_outcome_all()}</Chip
          >
          <Chip
            kind="choice"
            active={filterState.outcome === 'SUCCESS'}
            onclick={() => {
              filterState.outcome = 'SUCCESS';
              pushUrl();
            }}>{m.launches_outcome_success()}</Chip
          >
          <Chip
            kind="choice"
            active={filterState.outcome === 'FAILURE'}
            onclick={() => {
              filterState.outcome = 'FAILURE';
              pushUrl();
            }}>{m.launches_outcome_failure()}</Chip
          >
        </ChipGroup>
      {/if}

      {#if years.length > 1}
        <ChipGroup role="radiogroup" class="filter-group" label={m.launches_filter_year()}>
          <span class="filter-label">{m.launches_filter_year()}</span>
          <Chip
            kind="choice"
            active={filterState.year === 'ALL'}
            onclick={() => {
              filterState.year = 'ALL';
              pushUrl();
            }}>{m.launches_filter_all()}</Chip
          >
          {#each years as y (y)}
            <Chip
              kind="choice"
              active={y === filterState.year}
              onclick={() => {
                filterState.year = y;
                pushUrl();
              }}>{y}</Chip
            >
          {/each}
        </ChipGroup>
      {/if}
    </nav>
  {/if}

  {#if loadedOnce}
    <BrowseToolbar
      total={scoped.length}
      noun={m.launches_page_title()}
      showing={m.browse_showing({
        era: filterState.epoch === 'ALL' ? m.epoch_all() : epochLabel(filterState.epoch),
        count: filtered.length,
      })}
      sortOptions={[
        { value: 'chrono-desc', label: m.fleet_sort_newest() },
        { value: 'chrono-asc', label: sortLabel() },
        { value: 'alpha', label: m.fleet_sort_alpha() },
      ]}
      sort={effectiveSort}
      onSort={(v) => {
        filterState.sort = v === 'chrono-asc' ? null : (v as LaunchSort);
        pushUrl();
      }}
      views={[
        { value: 'list', label: m.browse_view_list() },
        { value: 'grid', label: m.fleet_view_grid() },
      ]}
      view={filterState.view}
      onView={(v) => {
        filterState.view = v as 'list' | 'grid';
        pushUrl();
      }}
    />
  {/if}

  {#if loading}
    <p class="loading">{m.launches_loading()}</p>
  {:else if filtered.length === 0}
    <p class="empty">{m.launches_no_matches()}</p>
  {:else if filterState.view === 'grid'}
    <ul class="entity-card-grid" aria-label={m.launches_timeline_aria()}>
      {#each sorted as e (e.id)}
        {@const lead = agencyDataColor(providerOf(e))}
        <EntityCard
          photo={e.orrery_launcher_ref ? pickHero('fleet', e.orrery_launcher_ref) : ''}
          name={vehicle(e)}
          year={launchYear(e)}
          agencies={[{ name: providerOf(e), color: lead }]}
          agencyTitle={agencyFullName(e.agency_name)}
          accent={lead ?? 'var(--color-state)'}
          story={`${dateLabel(e)} · ${e.editorial_note ?? missionLine(e)}`}
          testid="launch-card-{e.id}"
          href={destination(e)}
          facts={[
            { label: m.missions_card_year_label(), value: dateLabel(e) },
            ...(e.pad_name ? [{ label: m.card_stat_launch(), value: feedText(e.pad_name) }] : []),
          ]}
        >
          {#snippet pills()}
            <span class="card-status status-{statusClass(e.status.code)}" title={e.status.label}
              >{launchStatusLabel(e.status)}</span
            >
            {#if e.tier === 'T1'}
              <span class="card-kind">{m.launches_tier_featured()}</span>
            {:else if e.tier === 'T4'}
              <span class="card-kind">{m.launches_tier_routine()}</span>
            {/if}
          {/snippet}
        </EntityCard>
      {/each}
    </ul>
  {:else}
    <Timeline {months} mode={shown} flat={effectiveSort === 'alpha'} />
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
  /* The frame is .browse-main (entity-browse-page.css), the same as /missions and /fleet. */

  /* Back link sits above the search row. Matches the visual weight of the FILTERS strip so the
     two read as a vertical stack. */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 8px;
    color: rgba(255, 255, 255, 0.6);
    font-family: var(--font-mono, 'Space Mono', monospace);
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

  /* Page chrome (.search-row, .filters-bar, .filters-count, .filters-chevron, .filters,
     .filter-group, .filter-label) lives in src/lib/styles/entity-browse-page.css; the card, the
     grid, the toolbar, the agency row are the shared components /missions and /fleet render. */

  /* The two-column phone grid has room for the status alone; the tier shows in the list. */
  @media (max-width: 600px) {
    .launches :global(.entity-card-grid .card-kind) {
      display: none;
    }
  }

  .loading,
  .empty {
    padding: 40px 16px;
    color: rgba(230, 232, 238, 0.6);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    text-align: center;
  }

  .footer-note {
    margin-top: 24px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: rgba(230, 232, 238, 0.6);
    line-height: 1.6;
  }
  .footer-note a {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
