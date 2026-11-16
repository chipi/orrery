<!--
  BrowseToolbar — the line above the grid of /missions and /fleet (UXD-048): the catalogue total
  with its noun, "Showing: <era> (<n>)", and at the end the sort select and the view toggle
  (Grid / List, and any page-specific view such as /fleet's Line-up). One component, so the two
  pages cannot drift. The sort options and the views are props; nothing here knows a page.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';
  import ChipGroup from './ChipGroup.svelte';

  interface Props {
    total: number;
    /** The plural noun of the catalogue ("MISSIONS", "FLEET"). */
    noun: string;
    /** "Showing: <era> (<n>)", already formatted. */
    showing: string;
    sortOptions: { value: string; label: string }[];
    sort: string;
    onSort: (v: string) => void;
    views: { value: string; label: string }[];
    view: string;
    onView: (v: string) => void;
    /** Hide the total, the showing line and the sort (a view that does not obey them). */
    bare?: boolean;
  }
  let {
    total,
    noun,
    showing,
    sortOptions,
    sort,
    onSort,
    views,
    view,
    onView,
    bare = false,
  }: Props = $props();
</script>

<div class="browse-toolbar" data-testid="browse-toolbar">
  {#if !bare}
    <p class="showing-line" data-testid="browse-showing">
      <b class="showing-total">{total}</b>
      <span>{noun}</span>
      <span class="showing-sep" aria-hidden="true">|</span>
      <span class="showing-now" aria-live="polite">{showing}</span>
    </p>
  {:else}
    <span></span>
  {/if}
  <div class="browse-controls">
    {#if !bare}
      <label class="sort-field">
        <span class="filter-label">{m.fleet_filter_sort()}</span>
        <select
          aria-label={m.fleet_sort_aria()}
          value={sort}
          onchange={(e) => onSort((e.currentTarget as HTMLSelectElement).value)}
        >
          {#each sortOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
        </select>
      </label>
    {/if}
    <ChipGroup role="radiogroup" label={m.fleet_view_aria()} class="view-group">
      {#each views as v (v.value)}
        <Chip kind="choice" active={view === v.value} onclick={() => onView(v.value)}
          >{v.label}</Chip
        >
      {/each}
    </ChipGroup>
  </div>
</div>

<style>
  .browse-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    margin: 0 0 14px;
  }
  .showing-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-dim);
  }
  .showing-total {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 400;
    letter-spacing: 2px;
    color: var(--color-text);
  }
  .browse-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
    margin-inline-start: auto;
  }
  .sort-field {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .sort-field select {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.85);
    padding: 4px 8px;
    min-block-size: 30px;
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    .browse-controls {
      inline-size: 100%;
      margin-inline-start: 0;
    }
    .sort-field {
      display: flex;
      flex: 1 1 100%;
      inline-size: 100%;
      min-inline-size: 0;
    }
    .sort-field select {
      flex: 1 1 0;
      inline-size: 0;
      min-inline-size: 0;
    }
  }
  @media (pointer: coarse) {
    .sort-field select {
      min-block-size: 44px;
    }
  }
</style>
