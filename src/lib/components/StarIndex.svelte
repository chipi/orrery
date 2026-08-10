<!--
  StarIndex — the neighborhood's primary index: a searchable, keyboard-reachable
  list of the curated named stars, styled to match the solar-system body index
  (ExploreBodyIndex) for cross-scale cohesion. It's the DOM "mirror" of the star
  field: every named star is selectable without the canvas, and rows are badged +
  filterable by what you can do with them — ⊕ has a planetary system you can enter,
  ◈ has a culture door. Selecting frames + opens the star.
-->
<script lang="ts">
  import { roving } from '$lib/a11y/roving';
  import { constellationName } from '$lib/universe/iau-constellations';
  import * as m from '$lib/paraglide/messages';
  import type { NamedStar } from '$lib/data';

  type Filter = 'all' | 'planets' | 'culture';
  type Props = {
    stars: NamedStar[];
    open: boolean;
    selectedId: string | null;
    hostIds?: Set<string>;
    cultureIds?: Set<string>;
    onSelect: (id: string) => void;
    onClose: () => void;
  };
  let {
    stars,
    open,
    selectedId,
    hostIds = new Set(),
    cultureIds = new Set(),
    onSelect,
    onClose,
  }: Props = $props();

  let query = $state('');
  let filter = $state<Filter>('all');

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    let list = [...stars].sort((a, b) => a.proper.localeCompare(b.proper));
    if (filter === 'planets') list = list.filter((s) => hostIds.has(s.id));
    else if (filter === 'culture') list = list.filter((s) => cultureIds.has(s.id));
    if (!q) return list;
    return list.filter(
      (s) =>
        s.proper.toLowerCase().includes(q) ||
        (s.con ? constellationName(s.con).toLowerCase().includes(q) : false),
    );
  });
</script>

{#if open}
  <aside class="star-index" aria-label={m.star_index_aria()}>
    <div class="si-top">
      <input
        bind:value={query}
        type="search"
        class="si-input"
        placeholder={m.star_index_search_placeholder()}
        aria-label={m.star_index_search_aria()}
      />
      <button type="button" class="si-close" aria-label={m.star_index_close()} onclick={onClose}
        >×</button
      >
    </div>
    <div class="si-filters" role="group" aria-label={m.star_index_filter_aria()}>
      <button type="button" class:active={filter === 'all'} onclick={() => (filter = 'all')}
        >{m.star_index_filter_all()}</button
      >
      <button
        type="button"
        class:active={filter === 'planets'}
        onclick={() => (filter = 'planets')}
        title={m.star_index_filter_planets()}>⊕ {m.star_index_filter_planets()}</button
      >
      <button
        type="button"
        class:active={filter === 'culture'}
        onclick={() => (filter = 'culture')}
        title={m.star_index_filter_culture()}>◈ {m.star_index_filter_culture()}</button
      >
    </div>
    <div class="si-count">{filtered.length} / {stars.length}</div>
    <ul class="si-list" use:roving={{ orientation: 'vertical', wrap: true }}>
      {#each filtered as s (s.id)}
        <li>
          <button
            type="button"
            class="si-row"
            class:selected={s.id === selectedId}
            data-index-id={s.id}
            aria-current={s.id === selectedId ? 'true' : undefined}
            onclick={() => onSelect(s.id)}
          >
            <span class="si-badges" aria-hidden="true">
              {#if hostIds.has(s.id)}<span
                  class="si-badge planets"
                  title={m.star_index_planetary_system()}>⊕</span
                >{/if}{#if cultureIds.has(s.id)}<span
                  class="si-badge culture"
                  title={m.star_index_culture_door()}>◈</span
                >{/if}
            </span>
            <span class="si-name">{s.proper}</span>
            <span class="si-con">{s.con ? constellationName(s.con) : ''}</span>
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="si-empty">{m.star_index_no_match({ query })}</li>
      {/if}
    </ul>
  </aside>
{/if}

<style>
  /* Matches ExploreBodyIndex (.body-index) so the index reads the same at every
     scale — left rail, search → filters → count → roving list. */
  .star-index {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 12px;
    top: 152px;
    bottom: 12px;
    z-index: 45;
    width: min(300px, calc(100vw - 24px));
    padding: 12px;
    min-height: 0;
    background: color-mix(in srgb, var(--bg-base, #04040c) 92%, transparent);
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    color: var(--text-base, #e8e8ed);
  }
  .si-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .si-input {
    flex: 1;
    min-width: 0;
    padding: 7px 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    color: var(--text-base, #e8e8ed);
    font: inherit;
    font-size: 12px;
  }
  .si-input:focus-visible {
    outline: none;
    border-color: rgba(78, 205, 196, 0.6);
  }
  .si-close {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    background: none;
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 8px;
    color: var(--text-dim, #9a9aa7);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
  }
  .si-filters {
    display: flex;
    gap: 5px;
    margin-bottom: 8px;
  }
  .si-filters button {
    flex: 1;
    padding: 5px 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.62);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    cursor: pointer;
    white-space: nowrap;
  }
  .si-filters button.active {
    color: #04121a;
    background: #4ecdc4;
    border-color: #4ecdc4;
    font-weight: 700;
  }
  .si-filters button:hover:not(.active) {
    border-color: rgba(78, 205, 196, 0.5);
  }
  .si-count {
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--text-dim, #9a9aa7);
    margin-bottom: 4px;
  }
  .si-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .si-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-base, #e8e8ed);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .si-row:hover,
  .si-row:focus-visible {
    background: color-mix(in srgb, var(--brand, #4a7dff) 18%, transparent);
    outline: none;
  }
  .si-row.selected {
    background: color-mix(in srgb, var(--brand, #4a7dff) 28%, transparent);
    border-color: rgba(78, 205, 196, 0.55);
  }
  .si-badges {
    display: inline-flex;
    gap: 3px;
    flex: none;
    width: 26px;
    font-size: 11px;
  }
  .si-badge.planets {
    color: #6ad0ff;
  }
  .si-badge.culture {
    color: #d3a4ff;
  }
  .si-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }
  .si-con {
    font-size: 10px;
    color: rgba(159, 232, 226, 0.8);
    flex: none;
  }
  .si-empty {
    padding: 16px 8px;
    color: var(--text-dim, #9a9aa7);
    font-size: 11px;
    text-align: center;
    list-style: none;
  }
</style>
