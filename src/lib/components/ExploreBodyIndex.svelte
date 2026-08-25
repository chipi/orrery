<!--
  ExploreBodyIndex (RFC-031 S2) — a searchable DOM index of every selectable body
  on /explore (Sun · planets · small bodies), the keyboard / screen-reader / TV
  path into a canvas scene that is otherwise pointer-only. Selecting a row runs
  the same select* function a canvas click would, opening that body's panel — no
  3D projection, camera, or zoom involved (deliberately: the index IS the
  accessible "another way to select things"). Roving list: one Tab stop, ↑↓ /
  D-pad move, Enter selects.

  Same treatment as the surface SurfaceIndexPanel (search + side panel on desktop,
  drawer body on mobile) — bodies just carry no agency/orbit-land/era filters.
-->
<script lang="ts">
  import { roving } from '$lib/a11y/roving';
  import * as m from '$lib/paraglide/messages';

  export type IndexBody = { kind: 'sun' | 'planet' | 'small'; id: string; name: string };

  type Props = {
    bodies: IndexBody[];
    selectedId: string | null;
    open: boolean;
    onSelect: (body: IndexBody) => void;
    onClose: () => void;
    /** Render the bare panel body (no floating aside chrome) for embedding in the
     *  mobile drawer's Index tab. Reuses the same search + rows + roving nav. */
    inline?: boolean;
  };
  let { bodies, selectedId, open, onSelect, onClose, inline = false }: Props = $props();

  let query = $state('');
  const filtered = $derived(
    bodies.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
</script>

{#snippet panelBody(withClose: boolean)}
  <div class="bidx-top">
    <input
      type="search"
      class="bidx-input"
      placeholder={m.surface_index_search()}
      aria-label={m.surface_index_search()}
      data-testid="explore-body-index-search"
      bind:value={query}
    />
    {#if withClose}
      <button type="button" class="bidx-close" aria-label={m.panel_close()} onclick={onClose}
        >×</button
      >
    {/if}
  </div>
  <div class="bidx-count">{filtered.length} / {bodies.length}</div>
  <ul class="bidx-list" use:roving={{ orientation: 'vertical', wrap: true }}>
    {#each filtered as b (b.kind + ':' + b.id)}
      <li>
        <button
          type="button"
          class="bidx-row"
          class:selected={b.id === selectedId}
          data-index-id={b.id}
          aria-current={b.id === selectedId ? 'true' : undefined}
          onclick={() => onSelect(b)}
        >
          <span class="bidx-dot bidx-dot--{b.kind}" aria-hidden="true"></span>
          <span class="bidx-name">{b.name}</span>
        </button>
      </li>
    {/each}
    {#if filtered.length === 0}
      <li class="bidx-empty">{m.surface_index_empty()}</li>
    {/if}
  </ul>
{/snippet}

{#if inline}
  <div class="bidx bidx-inline">{@render panelBody(false)}</div>
{:else if open}
  <aside class="body-index bidx" aria-label={m.explore_body_index_aria()}>
    {@render panelBody(true)}
  </aside>
{/if}

<style>
  /* Left side panel — matches the surface index panel (left, top:152→bottom,
     master → detail on the right). Shown on ALL viewports: the body-index handle
     is a left-edge pullout tab on every viewport (A1), so the panel it toggles
     must render on touch too — a prior desktop-only `@media (hover) and (pointer:
     fine)` gate here left the mobile handle opening nothing (dead button). The
     `min(320px, 100vw-24px)` width already fits a phone. */
  .body-index {
    display: flex;
    position: fixed;
    left: 12px;
    top: 152px;
    bottom: 12px;
    z-index: 45;
    width: min(320px, calc(100vw - 24px));
    padding: 12px;
    background: color-mix(in srgb, var(--bg-base, #04040c) 92%, transparent);
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
  }
  .bidx {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    color: var(--text-base, #e8e8ed);
  }
  .bidx-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .bidx-input {
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
  .bidx-input:focus-visible {
    outline: none;
    border-color: rgba(78, 205, 196, 0.6);
  }
  .bidx-close {
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
  .bidx-count {
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--text-dim, #9a9aa7);
    margin-bottom: 4px;
  }
  .bidx-list {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* Embedded in the mobile drawer: bounded height, drawer owns the outer frame. */
  .bidx-inline .bidx-list {
    max-height: 42dvh;
  }
  .bidx-row {
    display: flex;
    align-items: center;
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
  .bidx-row:hover,
  .bidx-row:focus-visible {
    background: color-mix(in srgb, var(--brand, #4a7dff) 18%, transparent);
    outline: none;
  }
  .bidx-row.selected {
    background: color-mix(in srgb, var(--brand, #4a7dff) 28%, transparent);
    border-color: rgba(78, 205, 196, 0.55);
  }
  .bidx-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: none;
  }
  .bidx-dot--sun {
    background: #ffcc33;
  }
  .bidx-dot--planet {
    background: #6aa0ff;
  }
  .bidx-dot--small {
    background: #b0b0bd;
  }
  .bidx-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bidx-empty {
    padding: 16px 8px;
    color: var(--text-dim, #9a9aa7);
    font-size: 11px;
    text-align: center;
  }
</style>
