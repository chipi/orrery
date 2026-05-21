<script lang="ts">
  /**
   * Decade picker for HISTORIC mode (PRD-020 M19 / S8b).
   *
   * Triggers lazy load of the matching `launches-historic/<decade>.json`
   * file. Visible only in HISTORIC mode.
   */

  import { ALL_DECADES } from '$lib/launches/manifest.js';

  let {
    activeDecade,
    counts,
    onSelect,
  }: {
    activeDecade: string;
    counts: Record<string, number | null>;
    onSelect: (decade: string) => void;
  } = $props();

  function shortLabel(d: string): string {
    if (d === '1957-1969') return '1957–69';
    return d.replace('-', '–');
  }
</script>

<nav class="decade-picker" aria-label="Historic decades">
  <span class="picker-label">Decade</span>
  <div class="chips">
    {#each ALL_DECADES as decade (decade)}
      <button
        type="button"
        class="chip"
        class:active={decade === activeDecade}
        onclick={() => onSelect(decade)}
        data-decade={decade}
        aria-current={decade === activeDecade}
      >
        <span class="d-label">{shortLabel(decade)}</span>
        {#if counts[decade] != null}
          <span class="d-count">{counts[decade]}</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

<style>
  .decade-picker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
  }

  @media (min-width: 768px) {
    .decade-picker {
      padding: 12px 18px;
    }
  }

  .picker-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
    margin-right: 4px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 6px 10px;
    min-height: 32px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.02);
    color: #e6e8ee;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 120ms, border-color 120ms;
  }

  .chip:hover,
  .chip:focus-visible {
    background: rgba(68, 102, 255, 0.12);
    border-color: rgba(68, 102, 255, 0.5);
    outline: none;
  }

  .chip.active {
    background: rgba(68, 102, 255, 0.22);
    border-color: #4466ff;
    color: #fff;
  }

  .d-count {
    color: rgba(230, 232, 238, 0.5);
    font-size: 10px;
  }

  .chip.active .d-count {
    color: #4ecdc4;
  }
</style>
