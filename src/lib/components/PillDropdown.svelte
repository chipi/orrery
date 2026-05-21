<script lang="ts">
  /**
   * Chip-styled dropdown picker — shared filter primitive used across
   * /missions, /fleet, and /missions/launches so the AGENCY (and any
   * future high-cardinality filter) reads the same on every page.
   *
   * Visual language mirrors the .pill system: the trigger is a pill
   * (with .active when a non-default value is set), and each option
   * row in the popover uses the same monospace + letter-spacing.
   * When a `logoFor` prop is supplied, each option renders its logo
   * inline (e.g. NASA/ESA/SpaceX SVGs) — same agency-recognition
   * affordance the per-pill version used to provide on /missions
   * and /fleet.
   */

  let {
    value,
    options,
    placeholder = 'ALL',
    label,
    logoFor,
    fullNameFor,
    onChange,
  }: {
    value: string;
    options: string[];
    placeholder?: string;
    label: string;
    logoFor?: (value: string) => string | null;
    fullNameFor?: (value: string) => string;
    onChange: (next: string) => void;
  } = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();

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
    triggerEl?.focus();
  }

  let active = $derived(value !== 'ALL');
  let triggerLogo = $derived(active && logoFor ? logoFor(value) : null);
  let triggerLabel = $derived(
    value === 'ALL'
      ? placeholder
      : fullNameFor
        ? fullNameFor(value)
        : value,
  );
</script>

<div class="pill-dropdown">
  <button
    type="button"
    class="pill"
    class:active
    class:has-logo={triggerLogo != null}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    title={triggerLabel}
    bind:this={triggerEl}
    onclick={() => (open = !open)}
  >
    {#if triggerLogo}
      <img src={triggerLogo} alt="" class="trigger-logo" />
    {/if}
    <span class="trigger-label">{triggerLabel}</span>
    <span class="caret" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="popover" role="listbox" bind:this={popoverEl}>
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
      {#each options as o (o)}
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
            <img src={logo} alt="" class="opt-logo" />
          {/if}
          <span class="opt-label">{full}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .pill-dropdown {
    position: relative;
    display: inline-block;
  }

  .pill {
    min-height: 32px;
    padding: 6px 10px 6px 12px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .pill:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.75);
  }
  .pill.active {
    background: rgba(68, 102, 255, 0.25);
    border-color: rgba(68, 102, 255, 0.5);
    color: #fff;
  }
  .pill:focus-visible {
    outline: 2px solid #4466ff;
    outline-offset: 2px;
  }
  .pill.has-logo {
    padding-left: 8px;
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
    font-size: 9px;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 2px;
  }

  .popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    min-width: 240px;
    max-width: 360px;
    max-height: 360px;
    overflow-y: auto;
    background: rgba(4, 4, 12, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
    padding: 4px;
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
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    cursor: pointer;
    text-align: left;
    transition: background-color 100ms, color 100ms;
  }
  .opt:hover,
  .opt:focus-visible {
    background: rgba(68, 102, 255, 0.18);
    color: #fff;
    outline: none;
  }
  .opt.active {
    background: rgba(68, 102, 255, 0.28);
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
