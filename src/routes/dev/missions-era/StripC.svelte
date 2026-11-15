<!--
  Option C: the current proportional axis, repaired. Overlapping eras sit in two lanes (no band
  drawn over another); a name that fits inside its band stays inside, one that does not is lifted
  above the axis on a leader line in the first free row; years under the axis; the "today" line
  stays. Under 560 px the strip is the chip carousel it is today.
-->
<script lang="ts">
  import type { FleetEpoch } from '$types/fleet';
  import { EPOCH_BANDS, AXIS_MIN, AXIS_MAX } from '$lib/epoch-bands';
  import { epochLabel } from '$lib/epoch-label';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import { bandLanes, placeLabels } from './proto';

  type Props = {
    countByEpoch: Map<FleetEpoch, number>;
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
  };
  let { countByEpoch, selected, onSelect }: Props = $props();

  let width = $state(0);
  let need: number[] = $state(EPOCH_BANDS.map(() => 0));
  const wide = $derived(width >= 560);
  const range = AXIS_MAX - AXIS_MIN;
  const px = (year: number) => ((year - AXIS_MIN) / range) * width;
  const lanes = bandLanes(EPOCH_BANDS);
  const bandW = (i: number) => px(EPOCH_BANDS[i].yearEnd) - px(EPOCH_BANDS[i].yearStart);
  const inside = $derived(EPOCH_BANDS.map((_, i) => need[i] > 0 && need[i] + 10 <= bandW(i)));
  const lifted = $derived(EPOCH_BANDS.map((_, i) => i).filter((i) => !inside[i]));
  const place = $derived(
    placeLabels(
      lifted.map((i) => ({ x: px(EPOCH_BANDS[i].yearStart), w: need[i] })),
      8,
    ),
  );
  const todayX = $derived(px(Math.min(AXIS_MAX, new Date().getFullYear())));
  const years = (b: (typeof EPOCH_BANDS)[number]) =>
    `${b.yearStart}–${b.id === 'mars-era' ? '∞' : b.yearEnd}`;
  const toggle = (id: FleetEpoch) => onSelect(selected === id ? 'ALL' : id);
  const LIFT = 16;
  const LANE = 30;
</script>

<section class="strip" data-strip="C" bind:clientWidth={width}>
  {#if wide}
    <!-- measuring copies: the single-line width of each name -->
    <div class="measure" aria-hidden="true">
      {#each EPOCH_BANDS as b, i (b.id)}
        <span bind:clientWidth={need[i]}>{epochLabel(b.id)}</span>
      {/each}
    </div>
    <div class="lift" style:block-size="{place.count * LIFT + 4}px">
      {#each lifted as bi, k (EPOCH_BANDS[bi].id)}
        <span
          class="lifted"
          style:inset-inline-start="{px(EPOCH_BANDS[bi].yearStart)}px"
          style:inset-block-start="{place.rows[k] * LIFT}px"
          style:--tone={EPOCH_BANDS[bi].color}
          data-era-label>{epochLabel(EPOCH_BANDS[bi].id)}</span
        >
        <span
          class="leader"
          style:inset-inline-start="{px(EPOCH_BANDS[bi].yearStart)}px"
          style:inset-block-start="{place.rows[k] * LIFT + 12}px"
          style:block-size="{(place.count - place.rows[k]) * LIFT - 8}px"
          style:--tone={EPOCH_BANDS[bi].color}
        ></span>
      {/each}
    </div>
    <div class="axis" style:block-size="{lanes.some((l) => l > 0) ? LANE * 2 : LANE}px">
      {#each EPOCH_BANDS as b, i (b.id)}
        <button
          type="button"
          class="band"
          class:on={selected === b.id}
          style:inset-inline-start="{px(b.yearStart)}px"
          style:inline-size="{bandW(i)}px"
          style:inset-block-start="{lanes[i] * LANE}px"
          style:--tone={b.color}
          aria-label="{epochLabel(b.id)} ({years(b)}), {countByEpoch.get(b.id) ?? 0}"
          data-era-clip
          onclick={() => toggle(b.id)}
        >
          {#if inside[i]}<span class="in" data-era-label>{epochLabel(b.id)}</span>{/if}
          <span class="cnt">{countByEpoch.get(b.id) ?? 0}</span>
        </button>
      {/each}
      <i class="today" style:inset-inline-start="{todayX}px"></i>
    </div>
    <div class="ticks" aria-hidden="true">
      {#each [1957, 1969, 1986, 2011, 2030] as y (y)}
        <span style:inset-inline-start="{px(y)}px">{y}</span>
      {/each}
    </div>
  {:else}
    <div class="chips">
      <ChipGroup role="radiogroup" label="Filter by epoch">
        {#each EPOCH_BANDS as ep (ep.id)}
          <Chip
            kind="choice"
            dot
            tone={ep.color}
            active={selected === ep.id}
            count={countByEpoch.get(ep.id) ?? 0}
            onclick={() => toggle(ep.id)}
          >
            <span data-era-label>{epochLabel(ep.id)}</span>
          </Chip>
        {/each}
      </ChipGroup>
    </div>
  {/if}
</section>

<style>
  .strip {
    margin: 0 0 14px;
    position: relative;
  }
  .measure span {
    display: inline-block;
  }
  .measure {
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    pointer-events: none;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .lift {
    position: relative;
  }
  .lifted {
    position: absolute;
    padding-inline-start: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 12px;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--color-chip-text);
  }
  .leader {
    position: absolute;
    inline-size: 1px;
    background: var(--tone);
    opacity: 0.7;
  }
  .axis {
    position: relative;
    border-block: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }
  .band {
    position: absolute;
    block-size: 30px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    overflow: hidden;
    background: color-mix(in srgb, var(--tone) 22%, transparent);
    border: 1px solid color-mix(in srgb, var(--tone) 40%, transparent);
    border-top: 3px solid var(--tone);
    color: var(--color-chip-text);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 12px;
    cursor: pointer;
  }
  .band.on,
  .band:hover {
    background: color-mix(in srgb, var(--tone) 45%, transparent);
    color: var(--color-text);
  }
  .band:focus-visible {
    outline: 2px solid var(--color-focus);
    z-index: 3;
  }
  .in {
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .today {
    position: absolute;
    inset-block: -4px;
    inline-size: 2px;
    background: #ffc850;
    pointer-events: none;
    z-index: 4;
  }
  .ticks {
    position: relative;
    block-size: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.72);
  }
  .ticks span {
    position: absolute;
    top: 2px;
    transform: translateX(-50%);
  }
  :global([dir='rtl']) .ticks span {
    transform: translateX(50%);
  }
  .chips {
    overflow-x: auto;
  }
  .chips :global(.ui-chip-group) {
    flex-wrap: nowrap;
  }
  .chips :global(.ui-chip) {
    flex-shrink: 0;
  }
</style>
