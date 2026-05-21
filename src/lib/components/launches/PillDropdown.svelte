<script lang="ts">
  /**
   * Chip-styled dropdown picker — visual extension of the .pill system
   * used across /missions and /fleet, for filter axes that have too
   * many options to fit as a pill row (e.g. AGENCY with 60+ launches
   * sources).
   *
   * The trigger is a `.pill` (with `.active` styling when a non-default
   * value is set). Click it → a popover opens below with the full
   * option list as one-per-row chip-styled buttons. Outside click /
   * Escape closes the popover.
   */

  let {
    value,
    options,
    placeholder = 'All',
    label,
    onChange,
  }: {
    value: string;
    options: string[];
    placeholder?: string;
    label: string;
    onChange: (next: string) => void;
  } = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();

  // Outside click + Escape close.
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

  let displayLabel = $derived(value === 'ALL' ? placeholder : value);
  let active = $derived(value !== 'ALL');
</script>

<div class="pill-dropdown">
  <button
    type="button"
    class="pill"
    class:active
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={label}
    bind:this={triggerEl}
    onclick={() => (open = !open)}
  >
    <span class="trigger-label">{displayLabel}</span>
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
        {placeholder}
      </button>
      {#each options as o (o)}
        <button
          type="button"
          class="opt"
          class:active={value === o}
          role="option"
          aria-selected={value === o}
          onclick={() => pick(o)}
        >
          {o}
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

  /* Mirror .pill from /missions exactly so the trigger reads as part
     of the same filter row. */
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
  .trigger-label {
    max-width: 18ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .caret {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.5);
  }

  .popover {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 30;
    min-width: 220px;
    max-width: 320px;
    max-height: 360px;
    overflow-y: auto;
    background: rgba(4, 4, 12, 0.98);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
    padding: 4px;
  }

  .opt {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    background: transparent;
    border: none;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    cursor: pointer;
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
</style>
