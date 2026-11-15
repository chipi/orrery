<!--
  Option B: a time-proportional dot ruler. One dot per mission (agency colour), row-packed on a
  1957-2040 axis; era segments under the dots (two lanes where eras overlap); era names under
  the segments in as many rows as they need to not touch. Under 560 px the names move to the
  chip carousel the strip has today.
-->
<script lang="ts">
  import type { FleetEpoch } from '$types/fleet';
  import { EPOCH_BANDS, AXIS_MIN, AXIS_MAX } from '$lib/epoch-bands';
  import { epochLabel } from '$lib/epoch-label';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';
  import { epochForYear } from '$lib/epoch-bands';
  import {
    bandLanes,
    packDots,
    placeLabels,
    PROPOSED_PALETTE,
    leadAgency,
    type MissionLite,
  } from './proto';

  type Props = {
    countByEpoch: Map<FleetEpoch, number>;
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
    missions: MissionLite[];
  };
  let { countByEpoch, selected, onSelect, missions }: Props = $props();

  let width = $state(0);
  let widths: number[] = $state(EPOCH_BANDS.map(() => 0));
  const wide = $derived(width >= 560);
  const range = AXIS_MAX - AXIS_MIN;
  const DOT = $derived(width >= 1000 ? 8 : width >= 560 ? 7 : 6);
  const GAP = 1;

  const packed = $derived(
    width > 0
      ? packDots(
          missions,
          { width, min: AXIS_MIN, max: AXIS_MAX, size: DOT, gap: GAP },
          (m) => PROPOSED_PALETTE[leadAgency(m.agency)] ?? '#888888',
        )
      : { dots: [], rows: 0 },
  );
  const lanes = bandLanes(EPOCH_BANDS);
  const px = (year: number) => ((year - AXIS_MIN) / range) * width;
  const labelPlace = $derived(
    placeLabels(
      EPOCH_BANDS.map((b, i) => ({ x: px(b.yearStart), w: widths[i] })),
      8,
    ),
  );
  const years = (b: (typeof EPOCH_BANDS)[number]) =>
    `${b.yearStart}–${b.id === 'mars-era' ? '∞' : b.yearEnd}`;
  const toggle = (id: FleetEpoch) => onSelect(selected === id ? 'ALL' : id);
</script>

<section class="strip" data-strip="B" bind:clientWidth={width}>
  <div class="dots" style:block-size="{packed.rows * (DOT + GAP) + 2}px" aria-hidden="true">
    {#each packed.dots as d (d.id)}
      <i
        class="d"
        class:dim={selected !== 'ALL' && epochForYear(d.year) !== selected}
        style:inset-inline-start="{d.x}px"
        style:inset-block-end="{d.row * (DOT + GAP)}px"
        style:inline-size="{DOT}px"
        style:block-size="{DOT}px"
        style:background={d.color}
        title={d.id}
      ></i>
    {/each}
  </div>
  <div class="segs" style:block-size="{lanes.some((l) => l > 0) ? 22 : 12}px">
    {#each EPOCH_BANDS as b, i (b.id)}
      <button
        type="button"
        class="seg"
        class:on={selected === b.id}
        style:inset-inline-start="{px(b.yearStart)}px"
        style:inline-size="{Math.max(3, px(b.yearEnd) - px(b.yearStart))}px"
        style:inset-block-start="{lanes[i] * 11}px"
        style:--tone={b.color}
        aria-label="{epochLabel(b.id)} ({years(b)}), {countByEpoch.get(b.id) ?? 0}"
        onclick={() => toggle(b.id)}
      ></button>
    {/each}
  </div>
  {#if wide}
    <div class="names" style:block-size="{labelPlace.count * 30 + 4}px">
      {#each EPOCH_BANDS as b, i (b.id)}
        <button
          type="button"
          class="name"
          class:on={selected === b.id}
          style:inset-inline-start="{Math.min(px(b.yearStart), Math.max(0, width - widths[i]))}px"
          style:inset-block-start="{labelPlace.rows[i] * 30}px"
          style:--tone={b.color}
          bind:clientWidth={widths[i]}
          onclick={() => toggle(b.id)}
        >
          <span class="n" data-era-label>{epochLabel(b.id)}</span>
          <span class="m" data-era-label
            ><bdi dir="ltr">{years(b)}</bdi> · {countByEpoch.get(b.id) ?? 0}</span
          >
        </button>
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
  .dots {
    position: relative;
  }
  .d {
    position: absolute;
    border-radius: 50%;
    opacity: 0.95;
  }
  .d.dim {
    opacity: 0.18;
  }
  .segs {
    position: relative;
    margin-top: 6px;
  }
  .seg {
    position: absolute;
    block-size: 8px;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: var(--tone);
    opacity: 0.55;
    cursor: pointer;
    outline-offset: 2px;
  }
  .seg:hover,
  .seg.on {
    opacity: 1;
  }
  .seg:focus-visible {
    outline: 2px solid var(--color-focus);
  }
  .names {
    position: relative;
    margin-top: 6px;
  }
  .name {
    position: absolute;
    display: block;
    padding: 0 0 0 6px;
    background: none;
    border: 0;
    border-inline-start: 2px solid var(--tone);
    color: var(--color-chip-text);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 13px;
    text-align: start;
    white-space: nowrap;
    cursor: pointer;
  }
  .name:hover,
  .name.on {
    color: var(--color-text);
  }
  .name:focus-visible {
    outline: 2px solid var(--color-focus);
  }
  .n {
    display: block;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .m {
    display: block;
    color: var(--color-text-dim);
  }
  .chips {
    margin-top: 8px;
    overflow-x: auto;
  }
  .chips :global(.ui-chip-group) {
    flex-wrap: nowrap;
  }
  .chips :global(.ui-chip) {
    flex-shrink: 0;
  }
</style>
