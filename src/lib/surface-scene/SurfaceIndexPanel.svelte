<!--
  SurfaceIndexPanel — searchable orbit/land index for /mars, /moon, /earth.

  Renders a search box + Domain / Agency / Era / Status filter chips + a
  scrollable, logo-badged list. A row click calls `onSelect(id)`; the host
  (SurfaceScene) wires that to `selectSite(id, { face: true })` which flies the
  camera + opens the detail panel. Layout-agnostic: fills its container, so the
  same component drives the desktop side-panel and the mobile drawer body.

  Filter logic lives in the pure `surface-index` module (unit-tested); this file
  is presentation + local filter state only. Mirrors /fleet's filter model.
-->
<script lang="ts">
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import { roving } from '$lib/a11y/roving';
  import {
    filterIndexItems,
    indexAgencies,
    indexStatuses,
    type IndexItem,
  } from '$lib/surface-map/surface-index';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    items: IndexItem[];
    selectedId?: string | null;
    onSelect: (id: string) => void;
    /** Desktop passes a close; mobile omits it (the drawer's own × handles it). */
    onClose?: () => void;
  }
  let { items, selectedId = null, onSelect, onClose }: Props = $props();

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
    return item.domain === 'orbit' ? '#7b9cff' : '#c1440e';
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
      <div class="sidx-chiprow" role="group" aria-label={m.surface_index_filter_domain()}>
        <button
          type="button"
          class="sidx-chip"
          class:active={domainFilter === 'ALL'}
          onclick={() => (domainFilter = 'ALL')}>{m.surface_index_all()}</button
        >
        <button
          type="button"
          class="sidx-chip"
          class:active={domainFilter === 'orbit'}
          onclick={() => (domainFilter = 'orbit')}>{m.surface_index_orbit()}</button
        >
        <button
          type="button"
          class="sidx-chip"
          class:active={domainFilter === 'land'}
          onclick={() => (domainFilter = 'land')}>{m.surface_index_land()}</button
        >
      </div>
    {/if}

    <div class="sidx-chiprow" role="group" aria-label={m.surface_index_filter_agency()}>
      <button
        type="button"
        class="sidx-chip"
        class:active={agencyFilter === 'ALL'}
        onclick={() => (agencyFilter = 'ALL')}>{m.surface_index_all()}</button
      >
      {#each agencies as a (a)}
        <button
          type="button"
          class="sidx-chip sidx-chip-agency"
          class:active={agencyFilter === a}
          onclick={() => (agencyFilter = a)}
        >
          <AgencyBadge agency={a} /><span>{a}</span>
        </button>
      {/each}
    </div>

    <div class="sidx-chiprow" role="group" aria-label={m.surface_index_filter_era()}>
      <button
        type="button"
        class="sidx-chip"
        class:active={eraFilter === 'ALL'}
        onclick={() => (eraFilter = 'ALL')}>{m.surface_index_all()}</button
      >
      {#each ERAS as e (e.id)}
        <button
          type="button"
          class="sidx-chip"
          class:active={eraFilter === e.id}
          onclick={() => (eraFilter = e.id)}>{e.label}</button
        >
      {/each}
    </div>

    <div class="sidx-chiprow" role="group" aria-label={m.surface_index_filter_status()}>
      <button
        type="button"
        class="sidx-chip"
        class:active={statusFilter === 'ALL'}
        onclick={() => (statusFilter = 'ALL')}>{m.surface_index_all()}</button
      >
      {#each statuses as s (s)}
        <button
          type="button"
          class="sidx-chip"
          class:active={statusFilter === s}
          onclick={() => (statusFilter = s)}>{s}</button
        >
      {/each}
    </div>
  </div>

  <div class="sidx-count">{filtered.length} / {items.length}</div>

  <!-- Roving (RFC-031 S3): the surface site index (moon/mars/earth) is one Tab
       stop; ↑↓ / TV D-pad move between sites, Enter selects. Gives the canvas
       scenes a keyboard path to every site without touching the 3D pick code. -->
  <ul
    class="sidx-list"
    data-testid="surface-index-list"
    use:roving={{ orientation: 'vertical', wrap: true }}
  >
    {#each filtered as item (item.id)}
      <li>
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
          <span class="row-meta">{item.year} · {item.status}</span>
        </button>
      </li>
    {/each}
    {#if filtered.length === 0}
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
    border-color: rgba(78, 205, 196, 0.6);
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
  .sidx-chiprow {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sidx-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    color: rgba(207, 224, 255, 0.75);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
  }
  .sidx-chip.active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.6);
    background: rgba(20, 26, 50, 0.85);
  }
  .sidx-chip:focus-visible {
    outline: 2px solid var(--color-accent, #4ecdc4);
    outline-offset: -2px;
  }
  .sidx-chip-agency :global(.badge) {
    height: 13px;
  }
  .sidx-count {
    font-size: 10px;
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
  .sidx-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
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
    background: rgba(78, 205, 196, 0.12);
    border-color: rgba(78, 205, 196, 0.55);
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
    font-size: 9px;
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
