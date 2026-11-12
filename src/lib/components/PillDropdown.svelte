<script lang="ts">
  /**
   * Chip-styled dropdown picker — shared filter primitive used across
   * /missions, /fleet, and /missions/launches so the AGENCY (and any
   * future high-cardinality filter) reads the same on every page.
   *
   * Visual language is the one chip (chip.css): the trigger is a <Chip>
   * (on when a non-default value is set), and each option
   * row in the popover uses the same monospace + letter-spacing.
   * When a `logoFor` prop is supplied, each option renders its logo
   * inline (e.g. NASA/ESA/SpaceX SVGs) — same agency-recognition
   * affordance the per-pill version used to provide on /missions
   * and /fleet.
   */
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';

  let {
    value,
    options,
    placeholder = 'ALL',
    label,
    logoFor,
    fullNameFor,
    shortNameFor,
    searchable,
    onChange,
  }: {
    value: string;
    options: string[];
    placeholder?: string;
    label: string;
    logoFor?: (value: string) => string | null;
    /** Long-form display name shown in the option rows. */
    fullNameFor?: (value: string) => string;
    /** Compact display name shown on the trigger pill. Defaults to value. */
    shortNameFor?: (value: string) => string;
    /** Show a text-filter input at the top of the popover when option count is high. */
    searchable?: boolean;
    onChange: (next: string) => void;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let triggerEl: HTMLElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let searchEl: HTMLInputElement | undefined = $state();

  let filteredOptions = $derived.by(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => {
      const full = (fullNameFor ? fullNameFor(o) : o).toLowerCase();
      return o.toLowerCase().includes(q) || full.includes(q);
    });
  });

  $effect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        triggerEl &&
        popoverEl &&
        !triggerEl.contains(e.target as Node) &&
        !popoverEl.contains(e.target as Node)
      ) {
        open = false;
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        open = false;
        triggerEl?.focus();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  });

  function pick(next: string) {
    onChange(next);
    open = false;
    query = '';
    triggerEl?.focus();
  }

  // Auto-focus the search box when opening a searchable popover.
  $effect(() => {
    if (open && searchable) {
      queueMicrotask(() => searchEl?.focus());
    }
  });

  let active = $derived(value !== 'ALL');
  let triggerLogo = $derived(active && logoFor ? logoFor(value) : null);
  let triggerLabel = $derived(
    value === 'ALL'
      ? placeholder
      : shortNameFor
        ? shortNameFor(value)
        : fullNameFor
          ? fullNameFor(value)
          : value,
  );
</script>

<div class="chip-dropdown">
  <Chip
    kind="action"
    {active}
    class={triggerLogo != null ? 'has-logo' : ''}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    title={triggerLabel}
    bind:ref={triggerEl}
    onclick={() => (open = !open)}
  >
    {#if triggerLogo}
      <img src={triggerLogo} alt="" class="trigger-logo" loading="lazy" decoding="async" />
    {/if}
    <span class="trigger-label">{triggerLabel}</span>
    <span class="caret" aria-hidden="true">▾</span>
  </Chip>

  {#if open}
    <div class="popover" role="listbox" bind:this={popoverEl}>
      {#if searchable}
        <div class="search-row">
          <input
            type="text"
            class="search"
            bind:this={searchEl}
            bind:value={query}
            placeholder={m.dropdown_filter_placeholder()}
            aria-label={m.dropdown_filter_aria({ label })}
          />
        </div>
      {/if}
      <div class="opts">
        {#if !query.trim()}
          <button
            type="button"
            class="opt"
            class:active={value === 'ALL'}
            role="option"
            aria-selected={value === 'ALL'}
            onclick={() => pick('ALL')}
          >
            <span class="opt-label">{placeholder}</span>
          </button>
        {/if}
        {#each filteredOptions as o (o)}
          {@const logo = logoFor ? logoFor(o) : null}
          {@const full = fullNameFor ? fullNameFor(o) : o}
          <button
            type="button"
            class="opt"
            class:active={value === o}
            role="option"
            aria-selected={value === o}
            onclick={() => pick(o)}
            title={full}
          >
            {#if logo}
              <img src={logo} alt="" class="opt-logo" loading="lazy" decoding="async" />
            {/if}
            <span class="opt-label">{full}</span>
          </button>
        {/each}
        {#if filteredOptions.length === 0 && query.trim()}
          <p class="empty">{m.dropdown_no_match({ query })}</p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .chip-dropdown {
    position: relative;
    display: inline-block;
  }

  .chip-dropdown :global(.has-logo) {
    padding-inline-start: 8px;
  }
  .trigger-logo {
    height: 16px;
    width: auto;
    max-width: 24px;
    object-fit: contain;
    opacity: 0.95;
  }
  .trigger-label {
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .caret {
    font-size: var(--size-label);
    color: var(--color-text-label);
    margin-left: 2px;
  }

  .popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    width: 320px;
    max-width: calc(100vw - 32px);
    background: rgba(4, 4, 12, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
    display: flex;
    flex-direction: column;
    max-height: 420px;
  }

  .search-row {
    padding: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .search {
    width: 100%;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    color: #e6e8ee;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  .search:focus {
    outline: none;
    border-color: var(--color-accent-strong);
  }
  .search::placeholder {
    color: var(--color-text-label);
    text-transform: none;
    letter-spacing: 0;
  }

  .opts {
    overflow-y: auto;
    padding: 4px;
  }

  .empty {
    margin: 0;
    padding: 12px;
    color: rgba(230, 232, 238, 0.6);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-align: center;
  }

  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    border: none;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.75);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    cursor: pointer;
    text-align: left;
    transition:
      background-color 100ms,
      color 100ms;
  }
  .opt:hover,
  .opt:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: #fff;
    outline: none;
  }
  .opt.active {
    background: color-mix(in srgb, var(--color-accent) 28%, transparent);
    color: #fff;
  }
  .opt-logo {
    height: 18px;
    width: auto;
    max-width: 32px;
    object-fit: contain;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .opt.active .opt-logo,
  .opt:hover .opt-logo {
    opacity: 1;
  }
  .opt-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
