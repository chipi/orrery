<!--
  SurfaceIndexPanel — searchable orbit/land index for /mars, /moon, /earth.

  Renders a search box + Domain / Agency / Era / Status filter chips + a
  scrollable, logo-badged list. A row click calls `onSelect(id)`; the host
  (SurfaceScene) wires that to `selectSite(id, { face: true })` which flies the
  camera + opens the detail panel. Layout-agnostic: fills its container, so the
  same component drives the desktop side-panel and the mobile drawer body.

  Filter logic lives in the pure `surface-index` module (unit-tested); this file
  is presentation + local filter state only. Mirrors /fleet's filter model.

  A row whose object has an entity page (`/<hub>/<id>`, from the route's server load) also
  carries a real link to it. Before the sites load (the prerender), the list is the plain
  link list of every page, so the hub links all its pages in the static HTML (ADR-096 item 11).
-->
<script lang="ts">
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import { roving } from '$lib/a11y/roving';
  import { localHref } from '$lib/locale';
  import {
    filterIndexItems,
    indexAgencies,
    indexStatuses,
    type IndexItem,
  } from '$lib/surface-map/surface-index';
  import * as m from '$lib/paraglide/messages';
  import { surfaceStatusLabel } from '$lib/status-label';

  interface Props {
    items: IndexItem[];
    /** Entity pages of this hub; rows with a page get a link, and they are the list until `items` load. */
    entityLinks?: { id: string; name: string }[];
    /** Hub path segment of those pages (`moon`, `mars`, `venus`). */
    hub?: string;
    selectedId?: string | null;
    onSelect: (id: string) => void;
    /** Desktop passes a close; mobile omits it (the drawer's own × handles it). */
    onClose?: () => void;
    /** False while the host hides the panel; re-runs roving when it opens. */
    open?: boolean;
  }
  let {
    items,
    entityLinks = [],
    hub = '',
    selectedId = null,
    onSelect,
    onClose,
    open = true,
  }: Props = $props();
  const pageIds = $derived(new Set(entityLinks.map((l) => l.id)));
  const pageHref = (id: string) => localHref(`/${hub}/${id}`);

  let query = $state('');
  let domainFilter = $state<'ALL' | 'orbit' | 'land'>('ALL');
  let agencyFilter = $state<string>('ALL');
  let statusFilter = $state<string>('ALL');
  let eraFilter = $state<string>('ALL');

  const agencies = $derived(indexAgencies(items));
  const statuses = $derived(indexStatuses(items));

  // Era buckets → inclusive [min,max]. Numeric labels need no translation.
  const ERAS: ReadonlyArray<{ id: string; label: string; min?: number; max?: number }> = [
    { id: 'pre70', label: '–1969', max: 1969 },
    { id: '70s80s', label: '1970s–80s', min: 1970, max: 1989 },
    { id: '90s00s', label: '1990s–2000s', min: 1990, max: 2009 },
    { id: '10s', label: '2010s', min: 2010, max: 2019 },
    { id: '20s', label: '2020s+', min: 2020 },
  ];
  const era = $derived(ERAS.find((e) => e.id === eraFilter));

  const filtered = $derived(
    filterIndexItems(items, {
      query,
      domain: domainFilter,
      agency: agencyFilter,
      status: statusFilter,
      yearMin: era?.min,
      yearMax: era?.max,
    }),
  );

  // Only show the orbit/land toggle when the body actually has both (Earth is
  // orbit-only today — until land-type locations land).
  const hasBoth = $derived(
    items.some((i) => i.domain === 'land') && items.some((i) => i.domain === 'orbit'),
  );

  function domainColor(item: IndexItem): string {
    if (item.color) return item.color;
    return item.domain === 'orbit' ? '#5070ff' : '#c1440e';
  }
</script>

<div class="sidx" role="group" aria-label={m.surface_index_aria()}>
  <div class="sidx-top">
    <input
      type="search"
      class="sidx-input"
      placeholder={m.surface_index_search()}
      aria-label={m.surface_index_search()}
      data-testid="surface-index-search"
      bind:value={query}
    />
    {#if onClose}
      <button type="button" class="sidx-close" aria-label={m.panel_close()} onclick={onClose}
        >×</button
      >
    {/if}
  </div>

  <div class="sidx-filters">
    {#if hasBoth}
      <ChipGroup role="radiogroup" label={m.surface_index_filter_domain()}>
        <Chip kind="choice" active={domainFilter === 'ALL'} onclick={() => (domainFilter = 'ALL')}
          >{m.surface_index_all()}</Chip
        >
        <Chip
          kind="choice"
          active={domainFilter === 'orbit'}
          onclick={() => (domainFilter = 'orbit')}>{m.surface_index_orbit()}</Chip
        >
        <Chip kind="choice" active={domainFilter === 'land'} onclick={() => (domainFilter = 'land')}
          >{m.surface_index_land()}</Chip
        >
      </ChipGroup>
    {/if}

    <ChipGroup role="radiogroup" label={m.surface_index_filter_agency()}>
      <Chip kind="choice" active={agencyFilter === 'ALL'} onclick={() => (agencyFilter = 'ALL')}
        >{m.surface_index_all()}</Chip
      >
      {#each agencies as a (a)}
        <Chip kind="choice" active={agencyFilter === a} onclick={() => (agencyFilter = a)}>
          <AgencyBadge agency={a} /><span>{a}</span>
        </Chip>
      {/each}
    </ChipGroup>

    <ChipGroup role="radiogroup" label={m.surface_index_filter_era()}>
      <Chip kind="choice" active={eraFilter === 'ALL'} onclick={() => (eraFilter = 'ALL')}
        >{m.surface_index_all()}</Chip
      >
      {#each ERAS as e (e.id)}
        <Chip kind="choice" active={eraFilter === e.id} onclick={() => (eraFilter = e.id)}
          >{e.label}</Chip
        >
      {/each}
    </ChipGroup>

    <ChipGroup role="radiogroup" label={m.surface_index_filter_status()}>
      <Chip kind="choice" active={statusFilter === 'ALL'} onclick={() => (statusFilter = 'ALL')}
        >{m.surface_index_all()}</Chip
      >
      {#each statuses as s (s)}
        <Chip kind="choice" active={statusFilter === s} onclick={() => (statusFilter = s)}
          >{surfaceStatusLabel(s)}</Chip
        >
      {/each}
    </ChipGroup>
  </div>

  <div class="sidx-count">{filtered.length} / {items.length}</div>

  <!-- Roving (RFC-031 S3): the surface site index (moon/mars/earth) is one Tab
       stop; ↑↓ / TV D-pad move between sites, Enter selects. Gives the canvas
       scenes a keyboard path to every site without touching the 3D pick code. -->
  <ul
    class="sidx-list"
    data-testid="surface-index-list"
    use:roving={{
      orientation: 'vertical',
      wrap: true,
      itemSelector: 'button.sidx-row, a.sidx-page',
      active: open,
    }}
  >
    {#each filtered as item (item.id)}
      <li class="sidx-item">
        <button
          type="button"
          class="sidx-row"
          class:selected={item.id === selectedId}
          data-index-id={item.id}
          aria-current={item.id === selectedId ? 'true' : undefined}
          onclick={() => onSelect(item.id)}
        >
          <span class="row-dot" style:background={domainColor(item)} aria-hidden="true"></span>
          <span class="row-name">{item.name}</span>
          <AgencyBadge agency={item.agencies.join(' / ')} />
          <span class="row-meta">{item.year} · {surfaceStatusLabel(item.status)}</span>
        </button>
        {#if pageIds.has(item.id)}
          <a
            class="sidx-page"
            href={pageHref(item.id)}
            title={m.surface_index_open_page()}
            aria-label="{m.surface_index_open_page()}: {item.name}"
            data-testid="surface-index-page-link"
            data-index-id={item.id}>↗</a
          >
        {/if}
      </li>
    {/each}
    {#if items.length === 0}
      {#each entityLinks as link (link.id)}
        <li class="sidx-item">
          <a class="sidx-page sidx-page--name" href={pageHref(link.id)}>{link.name}</a>
        </li>
      {/each}
    {/if}
    {#if (items.length > 0 || entityLinks.length === 0) && filtered.length === 0}
      <li class="sidx-empty">{m.surface_index_empty()}</li>
    {/if}
  </ul>
</div>

<style>
  .sidx {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    color: var(--color-text);
    font-family: var(--font-mono, 'Space Mono', monospace);
  }
  .sidx-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .sidx-input {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    color: var(--color-text);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .sidx-input:focus-visible {
    outline: none;
    border-color: var(--color-accent-strong);
  }
  .sidx-close {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }
  .sidx-filters {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 8px;
  }
  .sidx-filters :global(.badge) {
    height: 13px;
  }
  .sidx-count {
    font-size: var(--size-label);
    letter-spacing: 0.5px;
    color: var(--color-text-dim);
    margin-bottom: 4px;
  }
  .sidx-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* Landscape phones are short: the wrapped filter chips (esp. under Linux font
     metrics) can eat the whole panel and squeeze the flex:1 list to zero. Cap
     the filters so they scroll internally and the list always keeps a real
     scroll area, and guarantee the list a minimum visible height. */
  @media (max-height: 500px) {
    .sidx-filters {
      max-height: 42%;
      overflow-y: auto;
    }
    .sidx-list {
      min-height: 96px;
    }
  }
  .sidx-item {
    display: flex;
    align-items: stretch;
    gap: 4px;
  }
  .sidx-page {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--color-text-dim);
    text-decoration: none;
    font-size: 14px;
  }
  @media (hover: hover) and (pointer: fine) {
    .sidx-page {
      min-width: 30px;
      min-height: 0;
    }
  }
  .sidx-page:hover,
  .sidx-page:focus-visible {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    color: var(--color-text);
    outline: none;
  }
  .sidx-page--name {
    flex: 1;
    justify-content: flex-start;
    padding: 8px;
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 0.5px;
    color: var(--color-text);
  }
  .sidx-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    padding: 8px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
  }
  .sidx-row:hover,
  .sidx-row:focus-visible {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    outline: none;
  }
  .sidx-row.selected {
    background: var(--color-accent-soft);
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
  }
  .row-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .row-name {
    flex: 1;
    min-width: 0;
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-meta {
    flex-shrink: 0;
    font-size: var(--size-label);
    letter-spacing: 0.4px;
    color: var(--color-text-dim);
    text-transform: uppercase;
  }
  .sidx-empty {
    padding: 16px 8px;
    color: var(--color-text-dim);
    font-size: 11px;
    text-align: center;
  }
</style>
