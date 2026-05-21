<script lang="ts">
  /**
   * Filter strip for /missions/launches (PRD-020 M8 / S8b).
   *
   * v0.1 axes: tier (ALL / FEATURED ONLY) + agency dropdown + outcome
   * (HISTORIC only). Vehicle / orbit / year-range = S8c.
   */

  type TierFilter = 'ALL' | 'FEATURED';
  type OutcomeFilter = 'ALL' | 'SUCCESS' | 'FAILURE' | 'PARTIAL';

  let {
    mode,
    tier,
    agency,
    outcome,
    agencies,
    onTierChange,
    onAgencyChange,
    onOutcomeChange,
    onClear,
    matchCount,
    totalCount,
  }: {
    mode: 'upcoming' | 'historic';
    tier: TierFilter;
    agency: string;
    outcome: OutcomeFilter;
    agencies: string[];
    onTierChange: (t: TierFilter) => void;
    onAgencyChange: (a: string) => void;
    onOutcomeChange: (o: OutcomeFilter) => void;
    onClear: () => void;
    matchCount: number;
    totalCount: number;
  } = $props();

  let hasFilter = $derived(tier !== 'ALL' || agency !== 'ALL' || outcome !== 'ALL');
</script>

<nav class="filter-strip" aria-label="Launches filters">
  <div class="group" role="radiogroup" aria-label="Tier">
    <span class="group-label">Tier</span>
    <button
      type="button"
      class="pill"
      class:active={tier === 'ALL'}
      role="radio"
      aria-checked={tier === 'ALL'}
      onclick={() => onTierChange('ALL')}>All</button
    >
    <button
      type="button"
      class="pill pill-featured"
      class:active={tier === 'FEATURED'}
      role="radio"
      aria-checked={tier === 'FEATURED'}
      onclick={() => onTierChange('FEATURED')}>Featured only</button
    >
  </div>

  <div class="group">
    <span class="group-label">Agency</span>
    <select
      class="select"
      value={agency}
      onchange={(e) => onAgencyChange((e.target as HTMLSelectElement).value)}
    >
      <option value="ALL">All agencies</option>
      {#each agencies as a (a)}
        <option value={a}>{a}</option>
      {/each}
    </select>
  </div>

  {#if mode === 'historic'}
    <div class="group" role="radiogroup" aria-label="Outcome">
      <span class="group-label">Outcome</span>
      <button
        type="button"
        class="pill"
        class:active={outcome === 'ALL'}
        role="radio"
        aria-checked={outcome === 'ALL'}
        onclick={() => onOutcomeChange('ALL')}>All</button
      >
      <button
        type="button"
        class="pill"
        class:active={outcome === 'SUCCESS'}
        role="radio"
        aria-checked={outcome === 'SUCCESS'}
        onclick={() => onOutcomeChange('SUCCESS')}>Success</button
      >
      <button
        type="button"
        class="pill"
        class:active={outcome === 'FAILURE'}
        role="radio"
        aria-checked={outcome === 'FAILURE'}
        onclick={() => onOutcomeChange('FAILURE')}>Failure</button
      >
    </div>
  {/if}

  <div class="count-group">
    {#if matchCount !== totalCount}
      <span class="count count-fraction">{matchCount} / {totalCount}</span>
    {:else}
      <span class="count count-total">{totalCount}</span>
    {/if}
    {#if hasFilter}
      <button type="button" class="clear-btn" onclick={onClear}>Clear ✕</button>
    {/if}
  </div>
</nav>

<style>
  .filter-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px 18px;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
  }

  @media (min-width: 768px) {
    .filter-strip {
      padding: 12px 18px;
    }
  }

  .group {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .group-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .pill {
    padding: 5px 10px;
    min-height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.02);
    color: #e6e8ee;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 120ms, border-color 120ms;
  }

  .pill:hover,
  .pill:focus-visible {
    background: rgba(68, 102, 255, 0.12);
    border-color: rgba(68, 102, 255, 0.5);
    outline: none;
  }

  .pill.active {
    background: rgba(68, 102, 255, 0.22);
    border-color: #4466ff;
    color: #fff;
  }

  .pill-featured.active {
    background: rgba(255, 200, 80, 0.18);
    border-color: #ffc850;
    color: #ffc850;
  }

  .select {
    padding: 5px 8px;
    min-height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    background: rgba(4, 4, 12, 0.8);
    color: #e6e8ee;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
  }

  .count-group {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
  }

  .count {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .count-fraction {
    color: #4466ff;
  }

  .clear-btn {
    padding: 4px 8px;
    background: transparent;
    border: 1px solid rgba(255, 82, 82, 0.4);
    border-radius: 3px;
    color: #ff5252;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .clear-btn:hover {
    background: rgba(255, 82, 82, 0.12);
  }
</style>
