<!--
  CommandPalette (RFC-031 S5) — app-wide jump-to-anything. Cmd/Ctrl-K opens a
  modal search over destinations (routes + key bodies); type, ↑↓ to move, Enter
  to go, Esc to close. The force-multiplier for keyboard users AND the TV remote
  (D-pad ↑↓ + OK), where sweeping a 100-item list is otherwise painful — search
  is the escape hatch. Modelled on ScienceSearch's proven modal pattern.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { goto } from '$app/navigation';
  import * as m from '$lib/paraglide/messages';

  export type CommandItem = {
    id: string;
    label: string;
    hint?: string;
    /** Root-relative href (without base); base is prepended on navigate. */
    href: string;
    keywords?: string;
  };

  type Props = { items: CommandItem[]; open: boolean; onClose: () => void };
  let { items, open, onClose }: Props = $props();

  let query = $state('');
  let highlighted = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const norm = (s: string) => s.toLowerCase();
  let results = $derived.by(() => {
    const q = norm(query.trim());
    if (!q) return items.slice(0, 12);
    const terms = q.split(/\s+/);
    return items
      .filter((it) => {
        const hay = norm(`${it.label} ${it.hint ?? ''} ${it.keywords ?? ''}`);
        return terms.every((t) => hay.includes(t));
      })
      .slice(0, 20);
  });

  // Reset + focus on open; clamp the highlight as results change.
  $effect(() => {
    if (open) {
      query = '';
      highlighted = 0;
      queueMicrotask(() => inputEl?.focus());
    }
  });
  $effect(() => {
    if (highlighted >= results.length) highlighted = Math.max(0, results.length - 1);
  });

  function go(item: CommandItem) {
    onClose();
    void goto(`${base}${item.href}`);
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      onClose();
    } else if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (results.length) highlighted = Math.min(highlighted + 1, results.length - 1);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (results.length) highlighted = Math.max(highlighted - 1, 0);
    } else if (ev.key === 'Enter') {
      ev.preventDefault();
      const pick = results[highlighted];
      if (pick) go(pick);
    }
  }
</script>

{#if open}
  <div class="cmdk-overlay" role="dialog" aria-modal="true" aria-label={m.command_palette_aria()}>
    <button type="button" class="cmdk-scrim" aria-label={m.panel_close()} onclick={onClose}
    ></button>
    <div class="cmdk-panel" role="document">
      <input
        bind:this={inputEl}
        bind:value={query}
        class="cmdk-input"
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="cmdk-results"
        aria-autocomplete="list"
        placeholder={m.command_palette_placeholder()}
        onkeydown={onKeydown}
      />
      <ul class="cmdk-results" id="cmdk-results" role="listbox">
        {#each results as r, i (r.id)}
          <li>
            <button
              type="button"
              class="cmdk-row"
              class:highlighted={i === highlighted}
              role="option"
              aria-selected={i === highlighted}
              onmouseenter={() => (highlighted = i)}
              onclick={() => go(r)}
            >
              <span class="cmdk-label">{r.label}</span>
              {#if r.hint}<span class="cmdk-hint">{r.hint}</span>{/if}
            </button>
          </li>
        {/each}
        {#if results.length === 0}
          <li class="cmdk-empty">{m.command_palette_empty()}</li>
        {/if}
      </ul>
      <div class="cmdk-foot">
        <kbd>↑</kbd><kbd>↓</kbd>
        {m.command_palette_hint_move()} · <kbd>↵</kbd>
        {m.command_palette_hint_open()} · <kbd>esc</kbd>
        {m.command_palette_hint_close()}
      </div>
    </div>
  </div>
{/if}

<style>
  .cmdk-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
  }
  .cmdk-scrim {
    position: absolute;
    inset: 0;
    border: none;
    background: rgba(0, 0, 0, 0.55);
    cursor: pointer;
  }
  .cmdk-panel {
    position: relative;
    width: min(560px, 92vw);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-base, #04040c);
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }
  .cmdk-input {
    padding: 16px 18px;
    font-size: 1.05rem;
    color: var(--text-base, #e8e8ed);
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-subtle, #23232e);
    outline: none;
  }
  .cmdk-results {
    list-style: none;
    margin: 0;
    padding: 6px;
    overflow-y: auto;
  }
  .cmdk-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    border-radius: 8px;
    color: var(--text-base, #e8e8ed);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .cmdk-row.highlighted {
    background: color-mix(in srgb, var(--brand, #4a7dff) 24%, transparent);
  }
  .cmdk-hint {
    color: var(--text-dim, #9a9aa7);
    font-size: 0.85rem;
  }
  .cmdk-empty {
    padding: 14px 12px;
    color: var(--text-dim, #9a9aa7);
  }
  .cmdk-foot {
    padding: 8px 14px;
    border-top: 1px solid var(--border-subtle, #23232e);
    color: var(--text-dim, #9a9aa7);
    font-size: 0.75rem;
  }
  kbd {
    padding: 1px 5px;
    border: 1px solid var(--border-subtle, #23232e);
    border-radius: 4px;
    font-size: 0.72rem;
  }
</style>
