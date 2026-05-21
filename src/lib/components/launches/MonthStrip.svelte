<script lang="ts">
  /**
   * Year-grouped month strip for /missions/launches (PRD-020 M8).
   *
   * Replaces the single-line horizontal-scroll pattern with year rows
   * that wrap naturally on narrow viewports. Each year-row shows its
   * months as compact chips with launch counts.
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

  // Group monthly buckets by year. The bucket key is "YYYY-MM"; label
  // is "Mmm 'YY" — we strip the 4-digit year off the chip label since
  // it's redundant once we have the year header.
  type YearGroup = { year: string; months: Array<{ key: string; mLabel: string; count: number }> };
  let yearGroups = $derived.by<YearGroup[]>(() => {
    const map = new Map<string, YearGroup['months']>();
    for (const b of months) {
      const y = b.key.split('-')[0];
      const mLabel = b.label.split(' ')[0]; // "Jun '26" → "Jun"
      const list = map.get(y) ?? [];
      list.push({ key: b.key, mLabel, count: b.entries.length });
      map.set(y, list);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, months]) => ({ year, months }));
  });
</script>

<nav class="month-strip" aria-label="Jump to month">
  {#each yearGroups as group (group.year)}
    <div class="year-row">
      <span class="year-label">{group.year}</span>
      <div class="month-chips">
        {#each group.months as month (month.key)}
          <button
            type="button"
            class="chip"
            class:active={month.key === activeKey}
            onclick={() => onSelect(month.key)}
            data-month-key={month.key}
            aria-current={month.key === activeKey}
            title="{month.count} launches"
          >
            <span class="m-label">{month.mLabel}</span>
            <span class="m-count">{month.count}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</nav>

<style>
  .month-strip {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (min-width: 768px) {
    .month-strip {
      padding: 12px 18px;
      gap: 10px;
    }
  }

  .year-row {
    display: grid;
    grid-template-columns: 48px 1fr;
    align-items: start;
    gap: 10px;
  }

  .year-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 1px;
    color: #4466ff;
    line-height: 28px;
    text-align: right;
    padding-right: 4px;
    border-right: 1px solid rgba(68, 102, 255, 0.25);
  }

  .month-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
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
