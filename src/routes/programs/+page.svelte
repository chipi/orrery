<!--
  /programs — the programs index (PRD-029), on the catalogue pattern of /missions and /fleet
  (UXD-048): search, FILTERS (kind), the era strip, the agency chips, the "N programs | Showing"
  line with sort and Grid / List, then one card of one size per program. The title, lead and patch
  wall stay: this is an editorial index, so its frame is the text-page shell at the catalogue's
  width. A program sits in the era of its start year (`$lib/programs-browse`). A card is a link
  (`href`), so every program page is reachable without script.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { metaDescription, seoPageTitle } from '$lib/seo';
  import { localHref } from '$lib/locale';
  import { assetUrl } from '$lib/asset-url';
  import { EPOCH_BANDS } from '$lib/epoch-bands';
  import { epochLabel } from '$lib/epoch-label';
  import { agencyDataColor, agencyFullName } from '$lib/agencies';
  import { matchesQuery } from '$lib/list-search';
  import { programStatusLabel } from '$lib/status-label';
  import {
    agencyColorsByEra,
    programAgencies,
    programEra,
    programStatusClass,
    programsByAgency,
    programsByEra,
    sortPrograms,
    type ProgramSort,
  } from '$lib/programs-browse';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import AgencyFilterRow from '$lib/components/AgencyFilterRow.svelte';
  import BrowseToolbar from '$lib/components/BrowseToolbar.svelte';
  import EntityCard from '$lib/components/EntityCard.svelte';
  import EntityList from '$lib/components/EntityList.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { FleetEpoch } from '$types/fleet';
  import type { ProgramIndexEntry, ProgramKind } from '$types/program';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let programs = $derived(data.programs);
  let badges = $derived(data.badges ?? {});

  // Opening graphic: a wall of the iconic program mission patches (existing,
  // vetted assets). Thematically the page's subject IS programs, and patches are
  // their signature. Capped so the header stays a band, not a gallery.
  let patchWall = $derived(Object.values(badges).slice(0, 28));

  const KINDS: ProgramKind[] = [
    'crewed-campaign',
    'station',
    'robotic-campaign',
    'infrastructure',
    'funding-line',
  ];
  const KIND_LABEL: Record<ProgramKind, () => string> = {
    'crewed-campaign': m.programs_kind_crewed,
    station: m.programs_kind_station,
    'robotic-campaign': m.programs_kind_robotic,
    infrastructure: m.programs_kind_infrastructure,
    'funding-line': m.programs_kind_funding,
  };
  const kindLabel = (k: string) => (KIND_LABEL[k as ProgramKind] ?? (() => k))();
  // The card's pill and the list row say the kind in the singular, the shorter form the program
  // page already uses, so the whole word fits the pill row.
  const KIND_ONE: Record<ProgramKind, () => string> = {
    'crewed-campaign': m.program_kind_crewed,
    station: m.program_kind_station,
    'robotic-campaign': m.program_kind_robotic,
    infrastructure: m.program_kind_infrastructure,
    'funding-line': m.program_kind_funding,
  };
  const kindOne = (k: string) => (KIND_ONE[k as ProgramKind] ?? (() => k))();
  const kindsPresent = $derived(KINDS.filter((k) => programs.some((p) => p.kind === k)));

  interface ProgramFilterState {
    epoch: FleetEpoch | 'ALL';
    agency: string;
    kind: ProgramKind | 'ALL';
    q: string;
    sort: ProgramSort;
    view: 'grid' | 'list';
    expanded: boolean;
  }
  const filterState = $state<ProgramFilterState>({
    epoch: 'ALL',
    agency: 'ALL',
    kind: 'ALL',
    q: '',
    sort: 'chrono-desc',
    view: 'grid',
    expanded: false,
  });

  let anyFilterActive = $derived(
    filterState.epoch !== 'ALL' ||
      filterState.agency !== 'ALL' ||
      filterState.kind !== 'ALL' ||
      filterState.q.trim() !== '',
  );

  // The strip and the chips count the whole catalogue, not the filtered slice.
  let countByEpoch = $derived(programsByEra(programs));
  let colorsByEpoch = $derived(agencyColorsByEra(programs));
  let agencyCount = $derived(programsByAgency(programs));
  let agencies = $derived([...agencyCount.keys()].sort());

  let filtered = $derived(
    sortPrograms(
      programs.filter(
        (p) =>
          matchesQuery(
            [p.name, ...programAgencies(p), kindLabel(p.kind), p.tagline, p.country],
            filterState.q,
          ) &&
          (filterState.epoch === 'ALL' || programEra(p) === filterState.epoch) &&
          (filterState.agency === 'ALL' || programAgencies(p).includes(filterState.agency)) &&
          (filterState.kind === 'ALL' || p.kind === filterState.kind),
      ),
      filterState.sort,
    ),
  );

  // ─── URL ↔ filter sync (same shape as /missions) ─────────────────
  const epochValid = (v: string) => EPOCH_BANDS.some((b) => b.id === v);

  function applyUrl(url: URL) {
    const sp = url.searchParams;
    const ep = sp.get('epoch');
    filterState.epoch = ep && epochValid(ep) ? (ep as FleetEpoch) : 'ALL';
    filterState.agency = sp.get('agency') ?? 'ALL';
    const kind = sp.get('kind');
    filterState.kind = kind && (KINDS as string[]).includes(kind) ? (kind as ProgramKind) : 'ALL';
    filterState.q = sp.get('q') ?? '';
    const so = sp.get('sort');
    filterState.sort = so === 'chrono-asc' || so === 'alpha' ? so : 'chrono-desc';
    filterState.view = sp.get('view') === 'list' ? 'list' : 'grid';
    if (sp.has('kind')) filterState.expanded = true;
  }

  function pushUrl() {
    const params = new URLSearchParams();
    if (filterState.epoch !== 'ALL') params.set('epoch', filterState.epoch);
    if (filterState.agency !== 'ALL') params.set('agency', filterState.agency);
    if (filterState.kind !== 'ALL') params.set('kind', filterState.kind);
    if (filterState.q.trim() !== '') params.set('q', filterState.q.trim());
    if (filterState.sort !== 'chrono-desc') params.set('sort', filterState.sort);
    if (filterState.view === 'list') params.set('view', 'list');
    const qs = params.toString();
    const target = localHref(`/programs${qs ? `?${qs}` : ''}`);
    if (target !== page.url.pathname + page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function clearAllFilters() {
    filterState.epoch = 'ALL';
    filterState.agency = 'ALL';
    filterState.kind = 'ALL';
    filterState.q = '';
    pushUrl();
  }

  onMount(() => applyUrl(page.url));
  $effect(() => {
    const url = page.url;
    untrack(() => applyUrl(url));
  });

  // ─── Card data ───────────────────────────────────────────────────
  function heroSrc(hero?: string): string {
    if (!hero) return '';
    const parts = hero.split('/');
    const coll = parts[0];
    const id = parts.slice(1, -1).join('/');
    const n = parts[parts.length - 1];
    if (coll === 'missions') return assetUrl(`/images/missions/${id}/${n}.webp`);
    if (coll === 'fleet') return assetUrl(`/images/fleet-galleries/${id}/${n}.webp`);
    return '';
  }

  const years = (p: ProgramIndexEntry) => `${p.start_year}–${p.end_year ?? m.programs_meta_now()}`;
  const leadColor = (p: ProgramIndexEntry) =>
    agencyDataColor(programAgencies(p)[0]) ?? 'var(--color-state)';
  const open = (p: ProgramIndexEntry) => goto(localHref(`/programs/${p.id}`));
</script>

<svelte:head>
  <title>{seoPageTitle(m.programs_seo_title(), `${m.programs_index_title()} · Orrery`)}</title>
  <meta name="description" content={metaDescription(m.programs_seo_description())} />
</svelte:head>

<div class="programs-index page-shell page-shell--wide entity-browse-page">
  <header class="head">
    {#if patchWall.length}
      <div class="patch-wall" aria-hidden="true">
        {#each patchWall as src (src)}
          <img src={assetUrl(src)} alt="" loading="eager" decoding="async" />
        {/each}
      </div>
    {/if}
    <h1 class="page-title">{m.programs_index_title()}</h1>
    <p class="intro page-lead">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output only, no user input -->
      {@html m.programs_index_intro({
        program: `<em>${m.programs_index_intro_program()}</em>`,
      })}
    </p>
  </header>

  <div class="search-row">
    <input
      type="search"
      class="search-input"
      placeholder={m.programs_search_placeholder()}
      aria-label={m.programs_search_placeholder()}
      data-testid="programs-search"
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
      aria-controls={filterState.expanded ? 'programs-filters' : undefined}
      onclick={() => (filterState.expanded = !filterState.expanded)}
    >
      {m.filters_eyebrow()}
      {#if filtered.length !== programs.length}
        <span class="filters-count count-fraction" aria-hidden="true"
          >{filtered.length} / {programs.length}</span
        >
        <span class="filters-count-sr"
          >{m.filters_count_of({ shown: filtered.length, total: programs.length })}</span
        >
      {:else}
        <span class="filters-count count-total-only">{programs.length}</span>
      {/if}
      <span class="filters-chevron" aria-hidden="true">{filterState.expanded ? '▾' : '▸'}</span>
    </Chip>
    {#if anyFilterActive}
      <Chip kind="action" quiet dismiss class="filters-clear" onclick={clearAllFilters}>
        {m.missions_clear_filters()}
      </Chip>
    {/if}
  </div>

  <EpochTimelineStrip
    {countByEpoch}
    {colorsByEpoch}
    selected={filterState.epoch}
    onSelect={(v) => {
      filterState.epoch = v;
      pushUrl();
    }}
  />
  <div class="filters agency-row">
    <AgencyFilterRow
      agencies={agencies.map((name) => ({ name, count: agencyCount.get(name) ?? 0 }))}
      value={filterState.agency}
      onSelect={(v) => {
        filterState.agency = v;
        pushUrl();
      }}
      label={m.lib_filter_agency_label()}
      allLabel={m.lib_filter_agency_all()}
    />
  </div>
  {#if filterState.expanded}
    <nav id="programs-filters" class="filters" aria-label={m.filters_eyebrow()}>
      <ChipGroup role="radiogroup" label={m.programs_filter_kind()} class="filter-group">
        <span class="filter-label">{m.programs_filter_kind()}</span>
        <Chip
          kind="choice"
          active={filterState.kind === 'ALL'}
          onclick={() => {
            filterState.kind = 'ALL';
            pushUrl();
          }}>{m.lib_filter_status_all()}</Chip
        >
        {#each kindsPresent as k (k)}
          <Chip
            kind="choice"
            active={filterState.kind === k}
            onclick={() => {
              filterState.kind = k;
              pushUrl();
            }}>{kindLabel(k)}</Chip
          >
        {/each}
      </ChipGroup>
    </nav>
  {/if}

  <BrowseToolbar
    total={programs.length}
    noun={m.programs_index_title()}
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
    onSort={(v) => {
      filterState.sort = v as ProgramSort;
      pushUrl();
    }}
    views={[
      { value: 'grid', label: m.fleet_view_grid() },
      { value: 'list', label: m.browse_view_list() },
    ]}
    view={filterState.view}
    onView={(v) => {
      filterState.view = v as 'grid' | 'list';
      pushUrl();
    }}
  />

  {#if filtered.length === 0}
    <p class="empty">{m.programs_empty()}</p>
  {:else if filterState.view === 'list'}
    <EntityList
      label={m.programs_index_title()}
      rows={filtered.map((p) => ({
        id: p.id,
        name: p.name,
        kind: kindOne(p.kind),
        agency: programAgencies(p).join(' / '),
        year: years(p),
        status: programStatusClass(p.status),
        statusLabel: programStatusLabel(p.status),
      }))}
      onOpen={(id) => {
        const p = programs.find((x) => x.id === id);
        if (p) open(p);
      }}
    />
  {:else}
    <ul class="entity-card-grid programs-grid" aria-label={m.programs_index_title()}>
      {#each filtered as p (p.id)}
        <EntityCard
          photo={heroSrc(p.hero)}
          name={p.name}
          nameLines={2}
          year={years(p)}
          agencies={programAgencies(p).map((a) => ({ name: a, color: agencyDataColor(a) }))}
          agencyTitle={programAgencies(p).map(agencyFullName).join(' / ')}
          accent={leadColor(p)}
          story={p.tagline}
          badge={badges[`program:${p.id}`]}
          testid="program-card-{p.id}"
          href={localHref(`/programs/${p.id}`)}
          facts={[
            { label: m.card_stat_country(), value: p.country },
            { label: m.missions_card_year_label(), value: years(p) },
            { label: m.card_stat_status(), value: programStatusLabel(p.status) },
          ]}
        >
          <!-- The year range already says whether a program is running ("2019–today") or ended
               ("2013–2022"); the status is read out in `facts` and shown in the list view, so the
               card keeps one pill, the kind, whole in every language. -->
          {#snippet pills()}
            <span class="card-kind">{kindOne(p.kind)}</span>
          {/snippet}
        </EntityCard>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Opening graphic — a masked band of program mission patches (#programs hero). */
  .patch-wall {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px 14px;
    max-height: 128px;
    overflow: hidden;
    margin: 4px 0 20px;
    opacity: 0.92;
    /* Fade the band into the page at the horizontal edges + soften the clipped
       bottom row so it reads as a backdrop, not a cut-off grid. */
    -webkit-mask-image:
      linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent),
      linear-gradient(#000 62%, transparent);
    mask-image:
      linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent),
      linear-gradient(#000 62%, transparent);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }
  .patch-wall img {
    width: 54px;
    height: 54px;
    object-fit: contain;
    flex: none;
    filter: drop-shadow(0 2px 7px rgba(0, 0, 0, 0.55));
  }
  @media (max-width: 560px) {
    .patch-wall {
      max-height: 104px;
      gap: 10px 12px;
    }
    .patch-wall img {
      width: 44px;
      height: 44px;
    }
  }
  /* a2-keep: inline emphasis inside the lead (A1 decision 3); its colour is slice A3's */
  .intro :global(em) {
    font-style: italic; /* a1-keep: inline emphasis */
    color: var(--color-state);
  }
  .head {
    margin-bottom: 18px;
  }

  /* Two pills share a 232 px row on a card; a tighter tracking lets the longest status and the
     longest kind (en) show whole. */
  .programs-index :global(.entity-card-grid .card-status),
  .programs-index :global(.entity-card-grid .card-kind) {
    letter-spacing: 0.5px;
    padding-inline: 5px;
  }
  /* The kind is the first pill and always shows whole; the status gives way to it. On the two-column
     phone grid there is room for the kind alone (the years already say ongoing or ended). */
  @media (max-width: 600px) {
    .programs-index :global(.entity-card-grid .card-status) {
      display: none;
    }
  }

  /* A joint program lists several agencies on one line: they clip at the card's edge instead of
     squeezing into each other. */
  .programs-index :global(.entity-card-grid .card-agency) {
    flex: none;
  }

  .empty {
    padding: 40px;
    text-align: center;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
  }

  /* The page chrome is src/lib/styles/entity-browse-page.css, the card and the grid are EntityCard and
     entity-card-grid.css, the toolbar, agency row and list are shared components: /missions, /fleet and
     /missions/launches render the same ones. */

  /* A program's name is long ("Kommerzielle Raumstationen") and its title row carries a year
     range, so the name takes two lines; the tagline drops to one so the body keeps the shared
     142 px height. */
  .entity-card-grid.programs-grid :global(.card-first) {
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }
  /* A phone card is ~170 px wide: the name takes the whole width and the years go under it; the
     tagline (two words at that width) gives way. */
  @media (max-width: 600px) {
    .entity-card-grid.programs-grid :global(.card-name-row) {
      flex-wrap: wrap;
      row-gap: 4px;
    }
    .entity-card-grid.programs-grid :global(.card-name) {
      flex-basis: 100%;
    }
    .entity-card-grid.programs-grid :global(.card-first) {
      display: none;
    }
  }
</style>
