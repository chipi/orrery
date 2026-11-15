<!--
  /dev/missions-era — slice E3 phase 1 prototypes (docs/wip/2026-11-15-E3-prototypes.md).
  ?view=now | A | B | C | filter | palette   (default: an index of the views)
  Real data: static/data/missions/index.json. Dev only; the text on this route stays English.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import type { FleetEpoch } from '$types/fleet';
  import { epochForYear } from '$lib/epoch-bands';
  import EpochTimelineStrip from '$lib/components/EpochTimelineStrip.svelte';
  import StripA from './StripA.svelte';
  import StripB from './StripB.svelte';
  import StripC from './StripC.svelte';
  import PaletteSheet from './PaletteSheet.svelte';
  import FilterSheet from './FilterSheet.svelte';
  import type { MissionLite } from './proto';

  const view = $derived(page.url.searchParams.get('view') ?? 'index');
  const titles: Record<string, string> = {
    now: 'Today: the current strip, real component',
    A: 'Option A: nine equal tiles with a count bar',
    B: 'Option B: time-proportional dot ruler with era names',
    C: 'Option C: the proportional axis, repaired',
    filter: 'Agency filter with colour dots',
    palette: 'Agency palette',
  };

  let missions: MissionLite[] = $state([]);
  let selected: FleetEpoch | 'ALL' = $state('ALL');

  $effect(() => {
    fetch(`${base}/data/missions/index.json`)
      .then((r) => r.json())
      .then((j: MissionLite[]) => (missions = j));
  });

  const countByEpoch = $derived.by(() => {
    const map = new Map<FleetEpoch, number>();
    for (const m of missions) {
      const ep = epochForYear(m.year);
      if (ep) map.set(ep, (map.get(ep) ?? 0) + 1);
    }
    return map;
  });
  const onSelect = (v: FleetEpoch | 'ALL') => (selected = v);
  const sel = $derived(page.url.searchParams.get('sel'));
  $effect(() => {
    if (sel) selected = sel as FleetEpoch;
  });
</script>

<div class="proto entity-browse-page" data-view={view} data-ready={missions.length > 0}>
  <p class="hd">
    /dev/missions-era · <b>{titles[view] ?? 'views'}</b> · {missions.length} missions
  </p>
  {#if missions.length > 0}
    {#if view === 'now'}
      <EpochTimelineStrip {countByEpoch} {selected} {onSelect} />
    {:else if view === 'A'}
      <StripA {countByEpoch} {selected} {onSelect} />
    {:else if view === 'B'}
      <StripB {countByEpoch} {selected} {onSelect} {missions} />
    {:else if view === 'C'}
      <StripC {countByEpoch} {selected} {onSelect} />
    {:else if view === 'filter'}
      <FilterSheet {missions} />
    {:else if view === 'palette'}
      <PaletteSheet {missions} />
    {:else}
      <ul>
        {#each Object.entries(titles) as [k, t] (k)}
          <li><a href="?view={k}">{k}</a> {t}</li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .proto {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .hd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-dim);
    margin: 0 0 10px;
  }
</style>
