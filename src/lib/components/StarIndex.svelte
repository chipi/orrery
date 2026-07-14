<!--
  StarIndex — keyboard-reachable, searchable list of the curated named stars for
  /explore v2 (Slice 1 Part 2). The DOM "mirror" for the neighborhood: every named
  star is selectable without the canvas. Selecting frames + opens it.
-->
<script lang="ts">
  import { constellationName } from '$lib/universe/iau-constellations';
  import type { NamedStar } from '$lib/data';

  type Props = {
    stars: NamedStar[];
    open: boolean;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onClose: () => void;
  };
  let { stars, open, selectedId, onSelect, onClose }: Props = $props();

  let query = $state('');
  let input: HTMLInputElement | undefined = $state();

  let filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const list = [...stars].sort((a, b) => a.proper.localeCompare(b.proper));
    if (!q) return list;
    return list.filter(
      (s) =>
        s.proper.toLowerCase().includes(q) ||
        (s.con ? constellationName(s.con).toLowerCase().includes(q) : false),
    );
  });

  $effect(() => {
    if (open) input?.focus();
  });

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

{#if open}
  <div class="star-index" aria-label="Named stars">
    <div class="si-head">
      <input
        bind:this={input}
        bind:value={query}
        type="search"
        placeholder="Search stars…"
        aria-label="Search named stars"
        onkeydown={onKeydown}
      />
      <button type="button" class="si-close" aria-label="Close" onclick={onClose}>×</button>
    </div>
    <ul class="si-list">
      {#each filtered as s (s.id)}
        <li>
          <button
            type="button"
            class="si-item"
            class:active={s.id === selectedId}
            aria-current={s.id === selectedId ? 'true' : undefined}
            onclick={() => onSelect(s.id)}
          >
            <span class="si-name">{s.proper}</span>
            <span class="si-con">{s.con ? constellationName(s.con) : ''}</span>
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="si-empty">No stars match “{query}”.</li>
      {/if}
    </ul>
  </div>
{/if}

<style>
  .star-index {
    position: absolute;
    left: 12px;
    top: 60px;
    z-index: 8;
    width: 240px;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    background: rgba(6, 10, 22, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    backdrop-filter: blur(6px);
    overflow: hidden;
  }
  .si-head {
    display: flex;
    gap: 6px;
    padding: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .si-head input {
    flex: 1;
    min-width: 0;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 4px;
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 6px 8px;
  }
  .si-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    cursor: pointer;
    min-width: 28px;
  }
  .si-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }
  .si-item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    background: none;
    border: none;
    border-radius: 4px;
    padding: 7px 8px;
    cursor: pointer;
    text-align: left;
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
  }
  .si-item:hover,
  .si-item:focus-visible {
    background: rgba(78, 205, 196, 0.12);
    outline: none;
  }
  .si-item.active {
    background: rgba(78, 205, 196, 0.2);
  }
  .si-name {
    font-size: 13px;
  }
  .si-con {
    font-size: 10px;
    color: rgba(159, 232, 226, 0.8);
  }
  .si-empty {
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    padding: 10px 8px;
    list-style: none;
  }
</style>
