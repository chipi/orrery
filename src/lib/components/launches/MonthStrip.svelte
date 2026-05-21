<script lang="ts">
  /**
   * Horizontal-scroll month strip for the /missions/launches calendar
   * (PRD-020 §M8 / RFC-023 §8.2). Mobile: thumb-scrollable. Desktop:
   * mouse-wheel scrolls horizontally on hover.
   */

  type MonthBucket = { key: string; label: string; entries: { id: string }[] };

  let {
    months,
    activeKey,
    onSelect,
  }: {
    months: MonthBucket[];
    activeKey: string | null;
    onSelect: (key: string) => void;
  } = $props();
</script>

<nav class="month-strip" aria-label="Jump to month">
  {#each months as bucket (bucket.key)}
    <button
      type="button"
      class="chip"
      class:active={bucket.key === activeKey}
      onclick={() => onSelect(bucket.key)}
      data-month-key={bucket.key}
      aria-current={bucket.key === activeKey}
    >
      <span class="label">{bucket.label}</span>
      <span class="count">{bucket.entries.length}</span>
    </button>
  {/each}
</nav>

<style>
  .month-strip {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  .chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    min-width: 64px;
    min-height: 44px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.02);
    color: #e6e8ee;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    flex-shrink: 0;
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

  .label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .count {
    font-size: 14px;
    font-weight: 700;
    margin-top: 2px;
  }
</style>
