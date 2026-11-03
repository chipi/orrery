<!--
  FleetLineup — the /fleet true-scale line-up (launchers, or capsules and spacecraft). Loads the
  category's full fleet records for their sizes, then three.js and the stage on demand, so /fleet's
  own bundle stays three-free. The canvas is pinned to the visible width inside a horizontally
  scrolling track; labels, ticks and the height ruler are HTML laid out from the stage's metres.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getFleet } from '$lib/data';
  import type { FleetIndexEntry } from '$types/fleet';
  import type { LineupKind } from '$lib/three/lineup/lineup-kind';
  import type { LineupStage, LineupSlot } from '$lib/three/lineup/lineup-scene';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    kind: LineupKind;
    /** The page's index entries (localised names), all categories. */
    entries: FleetIndexEntry[];
    locale: string;
    focusId?: string | null;
    onOpen: (id: string) => void;
  }
  let { kind, entries, locale, focusId = null, onOpen }: Props = $props();

  let scroller: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let stage = $state<LineupStage | null>(null);
  let slots = $state<LineupSlot[]>([]);
  let missing = $state<{ id: string; reason: string }[]>([]);
  let pxPerM = $state(1);
  let leftM = $state(0);
  let viewW = $state(0);
  let viewH = $state(0);
  let hoverId = $state<string | null>(null);
  let failed = $state(false);

  type LandmarkId = 'liberty' | 'eiffel' | 'conquerors' | 'pagoda' | 'bus';
  const LAUNCHER_LANDMARKS: LandmarkId[] = ['liberty', 'conquerors', 'pagoda'];
  const LANDMARK_NAME: Record<LandmarkId, () => string> = {
    liberty: m.fleet_lineup_landmark_liberty,
    eiffel: m.fleet_lineup_landmark_eiffel,
    conquerors: m.fleet_lineup_landmark_conquerors,
    pagoda: m.fleet_lineup_landmark_pagoda,
    bus: m.fleet_lineup_landmark_bus,
  };
  const nameOf = (id: string) =>
    id.startsWith('landmark:')
      ? LANDMARK_NAME[id.slice(9) as LandmarkId]()
      : (entries.find((e) => e.id === id)?.name ?? id);
  const fmtM = (v: number) =>
    m.unit_m_value({
      value: new Intl.NumberFormat(locale, { maximumFractionDigits: v < 10 ? 2 : 1 }).format(v),
    });
  /** Room on the left for the height ruler, px. */
  const PAD = 64;

  const rowStartM = $derived(slots.length ? slots[0].xM - slots[0].widthM / 2 : 0);
  const trackW = $derived(stage ? (stage.rowLengthM - rowStartM) * pxPerM + PAD + viewW * 0.15 : 0);
  const tickStep = $derived(kind === 'launchers' ? 10 : 1);
  const ticks = $derived(
    stage
      ? Array.from({ length: Math.floor(stage.topM / tickStep) + 1 }, (_, i) => i * tickStep)
      : [],
  );
  const groundPx = $derived(stage ? viewH - stage.topM * 0.06 * pxPerM : viewH);

  function xPx(xM: number) {
    return (xM - rowStartM) * pxPerM + PAD;
  }

  onMount(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      try {
        const [
          { buildLineupCatalog, LINEUP_CATEGORIES },
          { createLineupStage },
          { buildScaleFigure, SCALE_FIGURE_HEIGHT_M },
        ] = await Promise.all([
          import('$lib/three/lineup/lineup-catalog'),
          import('$lib/three/lineup/lineup-scene'),
          import('$lib/three/lineup/scale-figures'),
        ]);
        const cats = LINEUP_CATEGORIES[kind];
        const records = await Promise.all(
          entries
            .filter((e) => cats.includes(e.category))
            .map((e) => getFleet(e.id, e.category, locale)),
        );
        if (disposed) return;
        const catalog = buildLineupCatalog(
          kind,
          records.filter((r): r is NonNullable<typeof r> => r != null),
        );
        missing = catalog.missing;
        const topM = Math.max(...catalog.items.map((i) => i.heightM), 1);
        // Landmarks from around the world stand among the craft at their own heights; the row
        // closes with the Eiffel Tower (taller than the frame: it runs out of the top) or a bus.
        const landmark = (id: LandmarkId, capped = false) => ({
          id: `landmark:${id}`,
          build: () => buildScaleFigure(id),
          heightM: SCALE_FIGURE_HEIGHT_M[id],
          landmark: true,
          capped,
        });
        const among = kind === 'launchers' ? LAUNCHER_LANDMARKS.map((id) => landmark(id)) : [];
        const row = [...catalog.items, ...among].sort((a, b) => b.heightM - a.heightM);
        row.push(kind === 'launchers' ? landmark('eiffel', true) : landmark('bus'));
        const s = createLineupStage(canvas, row, {
          gapM: topM * (kind === 'launchers' ? 0.24 : 0.5),
          personEvery: kind === 'launchers' ? 3 : 1,
        });
        stage = s;
        slots = s.layout;
        const fit = () => {
          viewW = scroller.clientWidth;
          viewH = scroller.clientHeight - 56;
          s.resize(viewW, viewH);
          pxPerM = s.pxPerM();
          onScroll();
        };
        ro = new ResizeObserver(fit);
        ro.observe(scroller);
        fit();
        if (focusId) {
          const f = slots.find((sl) => sl.id === focusId);
          if (f) scroller.scrollLeft = Math.max(0, xPx(f.xM) - viewW / 2);
        }
      } catch (err) {
        console.error('fleet line-up failed', err);
        failed = true;
      }
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      stage?.dispose();
    };
  });

  function onScroll() {
    if (!stage) return;
    leftM = rowStartM + (scroller.scrollLeft - PAD) / pxPerM;
    stage.setScrollM(leftM);
  }

  function pointer(e: PointerEvent) {
    if (!stage) return;
    const r = canvas.getBoundingClientRect();
    const id = stage.pick(e.clientX - r.left, e.clientY - r.top);
    if (id !== hoverId) {
      hoverId = id;
      stage.setHover(id);
    }
  }

  function leave() {
    hoverId = null;
    stage?.setHover(null);
  }

  function click(e: MouseEvent) {
    if (!stage) return;
    const r = canvas.getBoundingClientRect();
    const id = stage.pick(e.clientX - r.left, e.clientY - r.top);
    if (id) onOpen(id);
  }

  // A vertical wheel scrolls the row sideways, so a mouse user can move along it.
  function wheel(e: WheelEvent) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scroller.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }
</script>

<section
  class="lineup"
  aria-label={kind === 'launchers'
    ? m.fleet_lineup_launchers_aria()
    : m.fleet_lineup_spacecraft_aria()}
>
  {#if failed}
    <p class="status">{m.fleet_load_failed()}</p>
  {/if}
  <div class="scroller" bind:this={scroller} onscroll={onScroll} onwheel={wheel}>
    <div class="track" style="width:{trackW}px">
      <canvas
        bind:this={canvas}
        style="width:{viewW}px"
        class:hovering={hoverId != null}
        onpointermove={pointer}
        onpointerleave={leave}
        onclick={click}
        aria-hidden="true"
      ></canvas>
      {#each slots as s (s.id)}
        {#if s.landmark}
          <span class="label landmark" style="left:{xPx(s.xM)}px; top:{groundPx + 6}px">
            <span class="name">{nameOf(s.id)}</span>
            <span class="h">{fmtM(s.heightM)}</span>
          </span>
          {#if s.capped}
            <span class="capped" style="left:{xPx(s.xM)}px">↑ {fmtM(s.heightM)}</span>
          {/if}
        {:else}
          <button
            type="button"
            class="label"
            class:active={hoverId === s.id || focusId === s.id}
            style="left:{xPx(s.xM)}px; top:{groundPx + 6}px"
            onclick={() => onOpen(s.id)}
            onfocus={() => stage?.setHover(s.id)}
            onblur={leave}
          >
            <span class="name">{nameOf(s.id)}</span>
            {#if s.part}<span class="part">{m.fleet_lineup_part_capsule()}</span>{/if}
            <span class="h">{fmtM(s.heightM)}</span>
          </button>
        {/if}
      {/each}
    </div>
  </div>
  {#if stage}
    <div class="ruler" aria-hidden="true">
      {#each ticks as t (t)}
        <span class="tick" style="top:{groundPx - t * pxPerM}px">{t === 0 ? '' : fmtM(t)}</span>
      {/each}
    </div>
    <p class="legend">{m.fleet_lineup_legend({ height: fmtM(1.75) })}</p>
  {/if}
  {#if missing.some((x) => x.reason === 'no-model')}
    <p class="missing">
      {m.fleet_lineup_no_model()}
      {missing
        .filter((x) => x.reason === 'no-model')
        .map((x) => nameOf(x.id))
        .join(', ')}
    </p>
  {/if}
</section>

<style>
  .lineup {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: radial-gradient(120% 90% at 30% 0%, #2b3a55 0%, #161c28 55%, #0e121a 100%);
    color: #e6ecf5;
  }
  .scroller {
    height: min(72vh, 760px);
    min-height: 360px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
  }
  .track {
    position: relative;
    height: 100%;
  }
  canvas {
    position: sticky;
    left: 0;
    top: 0;
    display: block;
    width: 100%;
    max-width: 100vw;
    height: calc(100% - 56px);
    cursor: default;
  }
  canvas.hovering {
    cursor: pointer;
  }
  .label {
    position: absolute;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    width: max-content;
    max-width: 124px;
    padding: 2px 6px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.72rem;
    line-height: 1.15;
    text-align: center;
    cursor: pointer;
  }
  .label.landmark {
    cursor: default;
    opacity: 0.7;
    font-style: italic;
  }
  .capped {
    position: absolute;
    top: 6px;
    transform: translateX(-50%);
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(14, 18, 26, 0.7);
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }
  .label .part {
    font-size: 0.66rem;
    opacity: 0.75;
    font-style: italic;
  }
  .label .h {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
  .label.active,
  .label:hover,
  .label:focus-visible {
    background: rgba(120, 160, 230, 0.22);
  }
  .ruler {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 56px;
    width: 52px;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(14, 18, 26, 0.85), rgba(14, 18, 26, 0));
  }
  .tick {
    position: absolute;
    left: 6px;
    transform: translateY(-50%);
    font-size: 0.66rem;
    opacity: 0.65;
    font-variant-numeric: tabular-nums;
    border-bottom: 1px solid rgba(230, 236, 245, 0.25);
  }
  .legend {
    position: absolute;
    right: 12px;
    top: 8px;
    margin: 0;
    font-size: 0.72rem;
    opacity: 0.7;
  }
  .missing {
    margin: 0;
    padding: 8px 14px 12px;
    font-size: 0.75rem;
    opacity: 0.7;
  }
  .status {
    padding: 12px;
  }
</style>
