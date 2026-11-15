<!-- Option A (brief D13a): nine equal tiles, label + years + count bar, no proportional axis. -->
<script lang="ts">
  import type { FleetEpoch } from '$types/fleet';
  import { EPOCH_BANDS } from '$lib/epoch-bands';
  import { epochLabel } from '$lib/epoch-label';

  type Props = {
    countByEpoch: Map<FleetEpoch, number>;
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
  };
  let { countByEpoch, selected, onSelect }: Props = $props();

  const max = $derived(Math.max(1, ...EPOCH_BANDS.map((b) => countByEpoch.get(b.id) ?? 0)));
  const todayYear = new Date().getFullYear();
  const years = (b: (typeof EPOCH_BANDS)[number]) =>
    `${b.yearStart}–${b.id === 'mars-era' ? '∞' : b.yearEnd}`;
  const isNow = (b: (typeof EPOCH_BANDS)[number]) =>
    todayYear >= b.yearStart && todayYear <= b.yearEnd;
</script>

<section class="strip" data-strip="A">
  <div class="tiles" role="radiogroup" aria-label="Filter by epoch">
    {#each EPOCH_BANDS as ep (ep.id)}
      <button
        type="button"
        role="radio"
        class="tile"
        class:on={selected === ep.id}
        aria-checked={selected === ep.id}
        style:--tone={ep.color}
        data-era-clip
        onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
      >
        <span class="name" data-era-label
          ><span class="dot" aria-hidden="true"></span>{epochLabel(ep.id)}</span
        >
        <span class="years" data-era-label
          ><bdi dir="ltr">{years(ep)}</bdi>{isNow(ep) ? ' · now' : ''}</span
        >
        <span class="count">
          <span class="bar" aria-hidden="true"
            ><i style:inline-size="{((countByEpoch.get(ep.id) ?? 0) / max) * 100}%"></i></span
          >
          <b>{countByEpoch.get(ep.id) ?? 0}</b>
        </span>
      </button>
    {/each}
  </div>
</section>

<style>
  .strip {
    container-type: inline-size;
    margin: 0 0 14px;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(9, minmax(0, 1fr));
    gap: 6px;
  }
  .tile {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
    min-block-size: 78px;
    padding: 9px 10px 8px;
    text-align: start;
    background: var(--color-chip-glass);
    border: 1px solid var(--color-chip-edge);
    border-radius: 4px;
    color: var(--color-chip-text);
    font-family: var(--font-mono);
    cursor: pointer;
  }
  .tile:hover:not(.on) {
    border-color: var(--color-state);
    color: var(--color-text);
  }
  .tile:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .tile.on {
    background: color-mix(in srgb, var(--color-accent) 22%, var(--color-chip-glass));
    border-color: var(--color-accent);
    color: var(--color-text);
  }
  .name {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 1.25;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .dot {
    display: inline-block;
    inline-size: 8px;
    block-size: 8px;
    margin-inline-end: 6px;
    border-radius: 50%;
    background: var(--tone);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
    vertical-align: baseline;
  }
  .years {
    font-size: 11px;
    color: var(--color-text-dim);
  }
  .count {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
  }
  .bar {
    flex: 1;
    block-size: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .bar i {
    display: block;
    block-size: 100%;
    background: var(--tone);
  }
  @container (max-width: 1099px) {
    .tiles {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }
  @container (max-width: 559px) {
    .tiles {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
    }
    .tile {
      flex: 0 0 132px;
      scroll-snap-align: start;
    }
  }
</style>
