<!--
  ExploreBodyIndex (RFC-031 S2) — a DOM index of every selectable body on
  /explore (Sun · planets · small bodies), the keyboard / screen-reader / TV
  path into a canvas scene that is otherwise pointer-only. Selecting a row runs
  the same select* function a canvas click would, opening that body's panel — no
  3D projection, camera, or zoom involved (deliberately: the index IS the
  accessible "another way to select things"). Roving list: one Tab stop, ↑↓ /
  D-pad move, Enter selects.
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
  };
  let { bodies, selectedId, open, onSelect, onClose }: Props = $props();
</script>

{#if open}
  <aside class="body-index" aria-label={m.explore_body_index_aria()}>
    <div class="bidx-head">
      <h2>{m.explore_body_index_title()}</h2>
      <button type="button" class="bidx-close" aria-label={m.panel_close()} onclick={onClose}
        >×</button
      >
    </div>
    <ul class="bidx-list" use:roving={{ orientation: 'vertical', wrap: true }}>
      {#each bodies as b (b.kind + ':' + b.id)}
        <li>
          <button
            type="button"
            class="bidx-row"
            class:selected={b.id === selectedId}
            aria-current={b.id === selectedId ? 'true' : undefined}
            onclick={() => onSelect(b)}
          >
            <span class="bidx-dot bidx-dot--{b.kind}" aria-hidden="true"></span>
            <span class="bidx-name">{b.name}</span>
          </button>
        </li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .body-index {
    position: fixed;
    top: 72px;
    left: 12px;
    z-index: 26;
    width: 240px;
    max-height: calc(100dvh - 120px);
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--bg-base, #04040c) 92%, transparent);
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 10px;
    backdrop-filter: blur(8px);
  }
  .bidx-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle, #23232e);
  }
  .bidx-head h2 {
    margin: 0;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim, #9a9aa7);
  }
  .bidx-close {
    background: none;
    border: none;
    color: var(--text-dim, #9a9aa7);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }
  .bidx-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }
  .bidx-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--text-base, #e8e8ed);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .bidx-row:hover,
  .bidx-row:focus-visible {
    background: color-mix(in srgb, var(--brand, #4a7dff) 18%, transparent);
  }
  .bidx-row.selected {
    background: color-mix(in srgb, var(--brand, #4a7dff) 28%, transparent);
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
</style>
