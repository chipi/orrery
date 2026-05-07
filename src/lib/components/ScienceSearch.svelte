<!--
  ScienceSearch — Cmd-K (Ctrl-K on Windows/Linux) overlay search for the
  /science encyclopedia (RFC-011 step 9).

  Behaviour:
    - Listens for Cmd/Ctrl-K globally; opens an overlay with a single
      search input and a results list
    - Esc closes; ↑/↓ navigates results; Enter follows the highlighted
      result; click on a result follows it directly
    - Index loads lazily on first open; cached after that
    - Mounted at the layout level so any /science page can trigger it

  Mounted in /science/+layout.svelte at the root level. Mobile users
  with no Cmd/Ctrl key see no shortcut, but the small chip in the rail
  (added separately) opens the same overlay.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  type IndexEntry = {
    tab: string;
    section: string;
    title: string;
    intro: string;
    haystack: string;
  };

  let open = $state(false);
  let index: IndexEntry[] | null = $state(null);
  let query = $state('');
  let highlighted = $state(0);
  let inputEl: HTMLInputElement | null = $state(null);

  const results = $derived.by(() => {
    if (!index || query.trim().length === 0) return index ?? [];
    const q = query.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length > 0);
    const ranked = (index ?? [])
      .map((e) => {
        let score = 0;
        for (const tok of tokens) {
          if (e.title.toLowerCase().includes(tok)) score += 10;
          if (e.intro.toLowerCase().includes(tok)) score += 3;
          if (e.haystack.includes(tok)) score += 1;
        }
        return { e, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return ranked.map(({ e }) => e);
  });

  $effect(() => {
    if (results.length === 0) highlighted = 0;
    else if (highlighted >= results.length) highlighted = results.length - 1;
  });

  async function loadIndex(): Promise<void> {
    if (index !== null) return;
    try {
      const res = await fetch(`${base}/data/science-index.json`);
      if (res.ok) index = (await res.json()) as IndexEntry[];
      else index = [];
    } catch {
      index = [];
    }
  }

  async function openSearch(): Promise<void> {
    open = true;
    query = '';
    highlighted = 0;
    await loadIndex();
    // Focus on next tick so the input exists in the DOM.
    queueMicrotask(() => inputEl?.focus());
  }

  function close(): void {
    open = false;
  }

  function onKeyDown(ev: KeyboardEvent): void {
    const isMeta = ev.metaKey || ev.ctrlKey;
    if (!open && isMeta && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      void openSearch();
      return;
    }
    if (!open) return;
    if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (results.length > 0) highlighted = Math.min(highlighted + 1, results.length - 1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (results.length > 0) highlighted = Math.max(highlighted - 1, 0);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = results[highlighted];
      if (pick) {
        close();
        void goto(`${base}/science/${pick.tab}/${pick.section}`);
      }
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
  });
  onDestroy(() => {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeyDown);
  });

  /** Public hook so /science layout can wire a chip / button to this same
   * overlay instead of needing the keyboard shortcut. */
  export function open_(): Promise<void> {
    return openSearch();
  }
</script>

{#if open}
  <div class="overlay" role="dialog" aria-modal="true" aria-label="Search /science">
    <button type="button" class="backdrop" aria-label="Close search" tabindex="-1" onclick={close}
    ></button>
    <div class="panel" role="document">
      <input
        bind:this={inputEl}
        bind:value={query}
        type="search"
        class="input"
        placeholder="Search the encyclopedia… (e.g. perihelion, ∆v, porkchop)"
        autocomplete="off"
        spellcheck="false"
        aria-label="Search query"
      />
      <ul class="results" role="listbox">
        {#each results as r, i (`${r.tab}/${r.section}`)}
          <li>
            <a
              class="result"
              class:active={i === highlighted}
              href="{base}/science/{r.tab}/{r.section}"
              onclick={() => close()}
              onmouseenter={() => (highlighted = i)}
              role="option"
              aria-selected={i === highlighted}
            >
              <span class="result-title">{r.title}</span>
              <span class="result-meta">{r.tab}</span>
              <span class="result-intro">{r.intro}</span>
            </a>
          </li>
        {/each}
        {#if index && results.length === 0 && query.trim().length > 0}
          <li class="empty">No matches for "{query}".</li>
        {/if}
        {#if !index}
          <li class="empty">Loading…</li>
        {/if}
      </ul>
      <div class="hint">
        <kbd>↑</kbd><kbd>↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 88px 16px 16px;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 4, 12, 0.78);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 0;
    padding: 0;
    margin: 0;
    cursor: default;
    z-index: -1;
  }
  .panel {
    position: relative;
    width: 100%;
    max-width: 580px;
    background: rgba(10, 10, 24, 0.96);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 8px;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.6);
    overflow: hidden;
    color: var(--color-text);
  }
  .input {
    width: 100%;
    padding: 14px 18px;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text);
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    outline: none;
  }
  .input::placeholder {
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    max-height: 60vh;
    overflow-y: auto;
  }
  .result {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas: 'title meta' 'intro intro';
    column-gap: 12px;
    row-gap: 2px;
    padding: 10px 18px;
    color: var(--color-text);
    text-decoration: none;
  }
  .result.active,
  .result:hover {
    background: rgba(78, 205, 196, 0.08);
  }
  .result.active {
    border-left: 2px solid #4ecdc4;
    padding-left: 16px;
  }
  .result-title {
    grid-area: title;
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
  }
  .result-meta {
    grid-area: meta;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    text-transform: uppercase;
  }
  .result-intro {
    grid-area: intro;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
  }
  .empty {
    padding: 14px 18px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
  }
  .hint {
    padding: 8px 18px;
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
  }
  kbd {
    display: inline-block;
    padding: 1px 5px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.05);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    margin-right: 2px;
  }
</style>
