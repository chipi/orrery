<script lang="ts">
  /**
   * Two-tier picker for /missions/launches.
   * Row 1: year chips (one per year that has launches).
   * Row 2: month chips for the currently selected year only.
   *
   * Marko's smoke-test feedback (2026-05-21): replace the single
   * horizontal scroll with a structured year → month drill-down.
   * Default selected year = the earliest year present in the data
   * (= "next year up" for upcoming, = decade-start for historic).
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

  // Group monthly buckets by year for the two-tier picker.
  type YearGroup = {
    year: string;
    months: Array<{ key: string; mLabel: string; count: number }>;
    total: number;
  };
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
      .map(([year, months]) => ({
        year,
        months,
        total: months.reduce((s, m) => s + m.count, 0),
      }));
  });

  let selectedYear = $state<string | null>(null);

  // Default the selected year to:
  //   1. The year of the currently-active month, if set
  //   2. Else the first year in the data (earliest)
  // Re-runs whenever the underlying data changes (mode switch, decade
  // switch, filter change). Untrack the read of `selectedYear` to
  // avoid feedback loops.
  $effect(() => {
    const groups = yearGroups;
    if (groups.length === 0) {
      selectedYear = null;
      return;
    }
    const activeYearFromKey = activeKey ? activeKey.split('-')[0] : null;
    const stillValid =
      selectedYear !== null && groups.some((g) => g.year === selectedYear);
    if (activeYearFromKey && groups.some((g) => g.year === activeYearFromKey)) {
      selectedYear = activeYearFromKey;
    } else if (!stillValid) {
      selectedYear = groups[0].year;
    }
  });

  let visibleMonths = $derived(
    selectedYear
      ? (yearGroups.find((g) => g.year === selectedYear)?.months ?? [])
      : [],
  );
</script>

<nav class="picker" aria-label="Jump to launches by year then month">
  <div class="row years" role="tablist" aria-label="Year">
    {#each yearGroups as group (group.year)}
      <button
        type="button"
        class="year-chip"
        class:active={group.year === selectedYear}
        role="tab"
        aria-selected={group.year === selectedYear}
        onclick={() => (selectedYear = group.year)}
        data-year={group.year}
      >
        <span class="y-label">{group.year}</span>
        <span class="y-count">{group.total}</span>
      </button>
    {/each}
  </div>

  <div class="row months" role="tabpanel">
    {#each visibleMonths as month (month.key)}
      <button
        type="button"
        class="month-chip"
        class:active={month.key === activeKey}
        onclick={() => onSelect(month.key)}
        data-month-key={month.key}
        aria-current={month.key === activeKey}
        title="{month.count} launches in {month.mLabel} {selectedYear}"
      >
        <span class="m-label">{month.mLabel}</span>
        <span class="m-count">{month.count}</span>
      </button>
    {/each}
    {#if visibleMonths.length === 0}
      <p class="empty">No launches in this view.</p>
    {/if}
  </div>
</nav>

<style>
  .picker {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
  }

  @media (min-width: 768px) {
    .row {
      gap: 8px;
      padding: 10px 18px;
    }
  }

  .years {
    background: rgba(68, 102, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .year-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    padding: 5px 11px;
    min-height: 30px;
    border: 1px solid rgba(68, 102, 255, 0.25);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.02);
    color: #e6e8ee;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 1px;
    cursor: pointer;
    transition: background-color 120ms, border-color 120ms;
  }

  .year-chip:hover,
  .year-chip:focus-visible {
    background: rgba(68, 102, 255, 0.12);
    border-color: rgba(68, 102, 255, 0.65);
    outline: none;
  }

  .year-chip.active {
    background: rgba(68, 102, 255, 0.28);
    border-color: #4466ff;
    color: #fff;
  }

  .y-count {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.55);
    letter-spacing: 0;
  }

  .year-chip.active .y-count {
    color: #4ecdc4;
  }

  .month-chip {
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

  .month-chip:hover,
  .month-chip:focus-visible {
    background: rgba(68, 102, 255, 0.12);
    border-color: rgba(68, 102, 255, 0.5);
    outline: none;
  }

  .month-chip.active {
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

  .month-chip.active .m-count {
    color: #4ecdc4;
  }

  .empty {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.5);
  }
</style>
