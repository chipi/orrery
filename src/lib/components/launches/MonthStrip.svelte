<script lang="ts">
  /**
   * Single-row month strip with inline year markers for /missions/launches.
   * S8c iteration: collapses the previous year-grouped multi-row layout
   * into one horizontal-scroll line so the calendar reaches the timeline
   * faster. Year markers act as inline visual dividers (e.g. "2026" then
   * Jun…Dec then "2027" then Jan…Mar).
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

  // Build the sequence of cells: either a year marker (when the year
  // changes vs the previous bucket) or a month chip.
  type Cell =
    | { kind: 'year'; year: string }
    | { kind: 'month'; key: string; label: string; count: number };

  let cells = $derived.by<Cell[]>(() => {
    const out: Cell[] = [];
    let prevYear = '';
    for (const b of months) {
      const year = b.key.split('-')[0];
      const mLabel = b.label.split(' ')[0]; // "Jun '26" → "Jun"
      if (year !== prevYear) {
        out.push({ kind: 'year', year });
        prevYear = year;
      }
      out.push({ kind: 'month', key: b.key, label: mLabel, count: b.entries.length });
    }
    return out;
  });
</script>

<nav class="month-strip" aria-label="Jump to month">
  {#each cells as cell, i (i)}
    {#if cell.kind === 'year'}
      <span class="year-marker">{cell.year}</span>
    {:else}
      <button
        type="button"
        class="chip"
        class:active={cell.key === activeKey}
        onclick={() => onSelect(cell.key)}
        data-month-key={cell.key}
        aria-current={cell.key === activeKey}
        title="{cell.count} launches in {cell.label}"
      >
        <span class="m-label">{cell.label}</span>
        <span class="m-count">{cell.count}</span>
      </button>
    {/if}
  {/each}
</nav>

<style>
  .month-strip {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  @media (min-width: 768px) {
    .month-strip {
      padding: 10px 18px;
      gap: 8px;
    }
  }

  .year-marker {
    flex-shrink: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 1px;
    color: #4466ff;
    padding: 0 6px;
    border-left: 1px solid rgba(68, 102, 255, 0.35);
    line-height: 28px;
  }

  /* The first year marker doesn't need the left divider. */
  .year-marker:first-child {
    border-left: none;
    padding-left: 0;
  }

  .chip {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 5px 9px;
    min-height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
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

  .m-label {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .m-count {
    color: rgba(230, 232, 238, 0.6);
    font-size: 10px;
  }

  .chip.active .m-count {
    color: #4ecdc4;
  }
</style>
