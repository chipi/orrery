<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import LambertWorker from '../../workers/lambert.worker?worker';
  import type { LambertGrid, LambertProgress, LambertRequest } from '$lib/lambert-grid';
  import { dvToRGB, dvToCss, dayToLongDate, dayToShortDate } from '$lib/porkchop';
  import { getRockets } from '$lib/data';
  import type { Rocket } from '$types/rocket';
  import * as m from '$lib/paraglide/messages';

  // ─── Grid contract (matches Issue #3 / RFC-003) ──────────────────
  const DEP_RANGE: [number, number] = [0, 1460]; // 4 years from epoch (Jan 1 2026)
  const TOF_RANGE: [number, number] = [80, 520]; // 80 → 520 days
  const STEPS: [number, number] = [112, 100]; // 112 dep × 100 tof — 11,200 cells
  const [GRID_W, GRID_H] = STEPS;

  // ─── State ───────────────────────────────────────────────────────
  let canvas: HTMLCanvasElement | undefined = $state();
  let progress = $state(0);
  let computing = $state(true);
  let grid: number[][] | null = $state(null);
  let depDays: number[] = $state([]);
  let arrDays: number[] = $state([]);
  let selected = $state<{ i: number; j: number } | null>(null);
  let hoverCell = $state<{ i: number; j: number } | null>(null);

  // RFC-006 Option C magnifier (mobile)
  let mag = $state<{ x: number; y: number; i: number; j: number } | null>(null);
  const MAG_RADIUS = 70; // px
  const MAG_GRID = 5; // 5×5 cell region

  let rocketList: Rocket[] = $state([]);
  let selectedRocketId = $state<string | null>(null);
  let explainerOpen = $state(false);

  let worker: Worker | undefined;
  let nextId = 1;
  let currentId = 0;

  // ─── Plot geometry ───────────────────────────────────────────────
  const ML = 64;
  const MR = 18;
  const MT = 24;
  const MB = 44;

  function startCompute() {
    if (!worker) return;
    currentId = nextId++;
    progress = 0;
    computing = true;
    grid = null;
    selected = null;
    const req: LambertRequest = {
      id: currentId,
      depRange: DEP_RANGE,
      arrRange: TOF_RANGE,
      steps: STEPS,
    };
    worker.postMessage(req);
  }

  function onWorkerMessage(e: MessageEvent<LambertProgress | LambertGrid>) {
    const msg = e.data;
    if (msg.id !== currentId) return;
    if ('grid' in msg) {
      grid = msg.grid;
      depDays = msg.depDays;
      arrDays = msg.arrDays;
      computing = false;
      progress = 1;
      drawPlot();
    } else {
      progress = msg.progress;
    }
  }

  // ─── Heatmap rendering ───────────────────────────────────────────
  let heatBitmap: ImageBitmap | null = null;

  async function buildHeatmapBitmap() {
    if (!grid) return;
    const img = new ImageData(GRID_W, GRID_H);
    for (let j = 0; j < GRID_H; j++) {
      const srcRow = grid[GRID_H - 1 - j];
      for (let i = 0; i < GRID_W; i++) {
        const dv = srcRow[i];
        const [r, g, b] = dvToRGB(dv);
        const idx = (j * GRID_W + i) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    if (heatBitmap) heatBitmap.close();
    heatBitmap = await createImageBitmap(img);
  }

  function drawPlot() {
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, cssW, cssH);

    const PW = cssW - ML - MR;
    const PH = cssH - MT - MB;
    if (PW <= 0 || PH <= 0) return;

    if (heatBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(heatBitmap, ML, MT, PW, PH);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ML + 0.5, MT + 0.5, PW - 1, PH - 1);

    const cellW = PW / GRID_W;
    const cellH = PH / GRID_H;
    const drawCellHighlight = (
      cell: { i: number; j: number },
      stroke: string,
      lineWidth: number,
    ) => {
      const cx = ML + cell.i * cellW;
      const cy = MT + (GRID_H - 1 - cell.j) * cellH;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(cx, cy, cellW, cellH);
    };
    if (hoverCell && (!selected || hoverCell.i !== selected.i || hoverCell.j !== selected.j)) {
      drawCellHighlight(hoverCell, 'rgba(255,255,255,0.45)', 1);
    }
    if (selected) drawCellHighlight(selected, '#fff', 2);

    // Axes
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const t = i / xTicks;
      const x = ML + t * PW;
      const d = DEP_RANGE[0] + t * (DEP_RANGE[1] - DEP_RANGE[0]);
      ctx.beginPath();
      ctx.moveTo(x, MT + PH);
      ctx.lineTo(x, MT + PH + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.fillText(dayToShortDate(d), x, MT + PH + 8);
    }
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(m.plan_axis_departure_window(), ML + PW / 2, MT + PH + 26);

    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const t = i / yTicks;
      const y = MT + t * PH;
      const tof = TOF_RANGE[1] - t * (TOF_RANGE[1] - TOF_RANGE[0]);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(ML - 4, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
      ctx.fillText(`${tof.toFixed(0)} d`, ML - 7, y);
    }
    ctx.save();
    ctx.translate(14, MT + PH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(m.plan_axis_tof_label(), 0, 0);
    ctx.restore();

    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(m.plan_plot_title(), ML, 6);
  }

  // ─── Pointer hit-test → grid cell ────────────────────────────────
  function cellFromCanvas(clientX: number, clientY: number): { i: number; j: number } | null {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const PW = cssW - ML - MR;
    const PH = cssH - MT - MB;
    const x = clientX - rect.left - ML;
    const y = clientY - rect.top - MT;
    if (x < 0 || y < 0 || x > PW || y > PH) return null;
    const i = Math.min(GRID_W - 1, Math.max(0, Math.floor((x / PW) * GRID_W)));
    const jVisual = Math.floor((y / PH) * GRID_H);
    const j = Math.min(GRID_H - 1, Math.max(0, GRID_H - 1 - jVisual));
    return { i, j };
  }

  // ─── Desktop pointer events ──────────────────────────────────────
  function onPointerMove(e: PointerEvent) {
    if (!grid) return;
    if (e.pointerType === 'touch') return; // Touch handled separately
    hoverCell = cellFromCanvas(e.clientX, e.clientY);
    drawPlot();
  }
  function onPointerLeave() {
    hoverCell = null;
    drawPlot();
  }
  function onClick(e: MouseEvent) {
    if (!grid) return;
    const cell = cellFromCanvas(e.clientX, e.clientY);
    if (cell) {
      selected = cell;
      drawPlot();
    }
  }

  // ─── Touch events — RFC-006 Option C magnifier ────────────────────
  // Touch & hold opens a magnifier bubble showing 5×5 cells centred on
  // the touch point at large scale. Slide to navigate, lift to select
  // the centre cell.
  function updateMagFromTouch(t: Touch) {
    if (!canvas || !grid) return;
    const rect = canvas.getBoundingClientRect();
    const cell = cellFromCanvas(t.clientX, t.clientY);
    if (!cell) {
      mag = null;
      return;
    }
    mag = {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top,
      i: cell.i,
      j: cell.j,
    };
  }
  function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1 || !grid) return;
    e.preventDefault();
    updateMagFromTouch(e.touches[0]);
  }
  function onTouchMove(e: TouchEvent) {
    if (e.touches.length !== 1 || !grid) return;
    e.preventDefault();
    updateMagFromTouch(e.touches[0]);
  }
  function onTouchEnd(e: TouchEvent) {
    if (!grid) return;
    e.preventDefault();
    if (mag) {
      selected = { i: mag.i, j: mag.j };
      mag = null;
      drawPlot();
    }
  }

  // ─── Selected cell readout ───────────────────────────────────────
  type Readout = { dep: string; tof: number; arr: string; dv: number };
  let readout: Readout | null = $derived.by(() => {
    if (!selected || !grid) return null;
    return {
      dep: dayToLongDate(depDays[selected.i]),
      tof: arrDays[selected.j],
      arr: dayToLongDate(depDays[selected.i] + arrDays[selected.j]),
      dv: grid[selected.j][selected.i],
    };
  });

  // ─── Vehicle selection + Δv budget ───────────────────────────────
  let selectedRocket = $derived(rocketList.find((r) => r.id === selectedRocketId) ?? null);
  let dvBudget = $derived(selectedRocket?.delta_v_capability_km_s ?? 0);
  let dvDeficit = $derived(readout && dvBudget ? readout.dv - dvBudget : 0);
  let viable = $derived(readout !== null && dvBudget > 0 && dvDeficit <= 0);

  function flyMission() {
    if (!viable) return;
    goto(`${base}/fly`);
  }

  // ─── Magnifier render (separate canvas overlay) ──────────────────
  let magCanvas: HTMLCanvasElement | undefined = $state();

  function drawMag() {
    if (!magCanvas || !mag || !grid) return;
    const ctx = magCanvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const sz = MAG_RADIUS * 2;
    magCanvas.width = Math.floor(sz * dpr);
    magCanvas.height = Math.floor(sz * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, sz, sz);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(MAG_RADIUS, MAG_RADIUS, MAG_RADIUS, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, sz, sz);

    const halfWindow = Math.floor(MAG_GRID / 2);
    const cellSize = sz / MAG_GRID;
    for (let dy = -halfWindow; dy <= halfWindow; dy++) {
      for (let dx = -halfWindow; dx <= halfWindow; dx++) {
        const i = mag.i + dx;
        const j = mag.j - dy; // Flip so dy positive = visually up
        if (i < 0 || i >= GRID_W || j < 0 || j >= GRID_H) continue;
        const dv = grid[j][i];
        ctx.fillStyle = dvToCss(dv);
        ctx.fillRect(
          (dx + halfWindow) * cellSize,
          (dy + halfWindow) * cellSize,
          cellSize + 1,
          cellSize + 1,
        );
      }
    }

    // Centre crosshair (the cell that will be selected on lift)
    const cx = MAG_RADIUS;
    const cy = MAG_RADIUS;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - cellSize / 2, cy - cellSize / 2, cellSize, cellSize);

    ctx.restore();

    // Outer ring
    ctx.strokeStyle = 'rgba(68,102,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MAG_RADIUS, MAG_RADIUS, MAG_RADIUS - 1, 0, Math.PI * 2);
    ctx.stroke();

    // Δv label inside the magnifier
    const dv = grid[mag.j][mag.i];
    ctx.font = "bold 11px 'Space Mono', monospace";
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${dv.toFixed(1)} km/s`, MAG_RADIUS, sz - 10);
  }

  $effect(() => {
    if (mag) drawMag();
  });

  $effect(() => {
    if (grid) {
      void buildHeatmapBitmap().then(() => drawPlot());
    }
  });

  onMount(() => {
    // Order matters: attach the message listener before any postMessage
    // so we can't miss a response. (Workers actually run async so a
    // message can't physically arrive before the synchronous addListener
    // line, but explicit ordering documents the intent.)
    worker = new LambertWorker();
    worker.addEventListener('message', onWorkerMessage);
    startCompute();

    getRockets().then((list) => {
      rocketList = list;
      // Default to a vehicle that can actually reach Mars (Falcon Heavy, SLS, Starship).
      const mars = list.find((r) => r.payload_to_mars_kg > 0);
      selectedRocketId = mars?.id ?? list[0]?.id ?? null;
    });

    const onResize = () => drawPlot();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    if (worker) {
      worker.removeEventListener('message', onWorkerMessage);
      worker.terminate();
      worker = undefined;
    }
    if (heatBitmap) heatBitmap.close();
  });
</script>

<svelte:head><title>Mission Configurator · Orrery</title></svelte:head>

<div class="plan">
  <div class="plot-area">
    <canvas
      class="porkchop"
      bind:this={canvas}
      onpointermove={onPointerMove}
      onpointerleave={onPointerLeave}
      onclick={onClick}
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
      ontouchcancel={onTouchEnd}
      aria-label={m.plan_canvas_label()}
    ></canvas>

    {#if mag}
      <canvas
        class="magnifier"
        bind:this={magCanvas}
        style:left="{mag.x - MAG_RADIUS}px"
        style:top="{mag.y - MAG_RADIUS - 90}px"
        style:width="{MAG_RADIUS * 2}px"
        style:height="{MAG_RADIUS * 2}px"
        aria-hidden="true"
      ></canvas>
    {/if}

    {#if computing}
      <div class="loading" role="status" aria-live="polite">
        <div class="loading-title">{m.plan_loading_title()}</div>
        <div class="loading-bar">
          <div class="loading-fill" style:width="{progress * 100}%"></div>
        </div>
        <div class="loading-pct">{Math.round(progress * 100)}%</div>
      </div>
    {/if}
  </div>

  <aside class="right-panel" aria-label={m.plan_panel_label()}>
    <!-- Educational primer: collapsed by default; toggle reveals a short
         what/how/legend block. Sits at the top of the panel so it's
         visible whether or not the user has clicked a cell yet. -->
    <button
      type="button"
      class="explainer-toggle"
      onclick={() => (explainerOpen = !explainerOpen)}
      aria-expanded={explainerOpen}
    >
      <span class="explainer-icon" aria-hidden="true">{explainerOpen ? '×' : 'ⓘ'}</span>
      {explainerOpen ? m.plan_explainer_close() : m.plan_explainer_toggle()}
    </button>
    {#if explainerOpen}
      <section class="explainer">
        <h3>{m.plan_explainer_title()}</h3>
        <p class="explainer-intro">{m.plan_explainer_intro()}</p>
        <dl class="explainer-list">
          <dt>{m.plan_explainer_x_axis()}</dt>
          <dd>{m.plan_explainer_x_desc()}</dd>
          <dt>{m.plan_explainer_y_axis()}</dt>
          <dd>{m.plan_explainer_y_desc()}</dd>
          <dt>{m.plan_explainer_color()}</dt>
          <dd>
            {m.plan_explainer_color_desc()}
            <div class="color-bar" aria-hidden="true">
              <span class="cb-stop teal"></span>
              <span class="cb-stop blue"></span>
              <span class="cb-stop yellow"></span>
              <span class="cb-stop orange"></span>
              <span class="cb-stop red"></span>
            </div>
            <div class="color-bar-labels" aria-hidden="true">
              <span>3</span><span>5</span><span>7</span><span>9</span><span>11+ km/s</span>
            </div>
          </dd>
          <dt>{m.plan_explainer_how_to()}</dt>
          <dd>{m.plan_explainer_how_to_desc()}</dd>
        </dl>
      </section>
    {/if}

    {#if !readout}
      <div class="empty">
        <div class="empty-title">{m.plan_empty_title()}</div>
        <p class="empty-hint">{m.plan_empty_hint_desktop()}</p>
        <p class="empty-hint">{m.plan_empty_hint_mobile()}</p>
      </div>
    {:else}
      <div class="row">
        <span class="label">{m.plan_label_departure()}</span>
        <span class="value">{readout.dep}</span>
      </div>
      <div class="row">
        <span class="label">{m.plan_label_arrival()}</span>
        <span class="value">{readout.arr}</span>
      </div>
      <div class="row">
        <span class="label">{m.plan_label_transit()}</span>
        <span class="value">{m.plan_transit_days({ count: readout.tof.toFixed(0) })}</span>
      </div>
      <div class="row strong">
        <span class="label">{m.plan_label_dv_required()}</span>
        <span class="value">{readout.dv.toFixed(2)} km/s</span>
      </div>

      <div class="divider"></div>

      <label class="vehicle">
        <span class="label">{m.plan_label_vehicle()}</span>
        <select bind:value={selectedRocketId}>
          {#each rocketList as r (r.id)}
            <option value={r.id}>
              {r.name ?? r.id} — {r.delta_v_capability_km_s.toFixed(1)} km/s
            </option>
          {/each}
        </select>
      </label>

      {#if selectedRocket}
        <!-- Rocket reference photo (Wikimedia Commons, fetched at build).
             onerror hides cleanly if a particular vehicle has no image
             (e.g., Ariane 6 — pre-launch coverage gap as of 2026). -->
        <figure class="rocket-photo">
          <img
            src="{base}/images/rockets/{selectedRocket.id}.jpg"
            alt="{selectedRocket.name ?? selectedRocket.id} reference photo"
            loading="lazy"
            onerror={(e) => {
              const fig = (e.currentTarget as HTMLImageElement).closest('figure');
              if (fig) fig.style.display = 'none';
            }}
          />
        </figure>

        <div class="row">
          <span class="label">{m.plan_label_vehicle_dv()}</span>
          <span class="value">{dvBudget.toFixed(2)} km/s</span>
        </div>

        <div class="budget" class:viable class:deficit={!viable}>
          <div
            class="budget-fill"
            style:width="{Math.min(100, (readout.dv / Math.max(dvBudget, readout.dv)) * 100)}%"
          ></div>
          <div class="budget-label">
            {#if viable}
              {m.plan_budget_margin({ value: (dvBudget - readout.dv).toFixed(2) })}
            {:else}
              {m.plan_budget_deficit({ value: dvDeficit.toFixed(2) })}
            {/if}
          </div>
        </div>
      {/if}

      <button class="fly" type="button" disabled={!viable} onclick={flyMission}>
        {m.plan_fly_button()}
      </button>
    {/if}
  </aside>
</div>

<style>
  .plan {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    display: grid;
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .plan {
      grid-template-columns: 1fr 314px;
    }
  }
  @media (max-width: 767px) {
    .plan {
      grid-template-rows: 1fr auto;
    }
  }

  .plot-area {
    position: relative;
    overflow: hidden;
  }

  .porkchop {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    touch-action: none;
  }

  .magnifier {
    position: absolute;
    pointer-events: none;
    border-radius: 50%;
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    z-index: 5;
  }

  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(4, 4, 12, 0.95);
    z-index: 10;
  }
  .loading-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.5);
  }
  .loading-bar {
    width: 280px;
    height: 2px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    margin-top: 16px;
    overflow: hidden;
  }
  .loading-fill {
    height: 100%;
    background: #4466ff;
    border-radius: 2px;
    transition: width 0.1s;
  }
  .loading-pct {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 8px;
    letter-spacing: 2px;
  }

  .right-panel {
    background: rgba(8, 10, 22, 0.95);
    border-left: 1px solid var(--color-border);
    padding: 18px 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
  }

  .explainer-toggle {
    align-self: flex-start;
    min-height: 44px;
    padding: 8px 14px;
    background: rgba(68, 102, 255, 0.08);
    border: 1px solid rgba(68, 102, 255, 0.35);
    color: rgba(255, 255, 255, 0.85);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    font-weight: 700;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .explainer-toggle:hover,
  .explainer-toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(68, 102, 255, 0.18);
    outline: none;
  }
  .explainer-icon {
    font-size: 14px;
    opacity: 0.85;
  }

  .explainer {
    padding: 14px 14px 12px;
    background: rgba(68, 102, 255, 0.04);
    border: 1px solid rgba(68, 102, 255, 0.25);
    border-radius: 4px;
    margin-bottom: 8px;
  }
  .explainer h3 {
    margin: 0 0 8px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #4466ff;
    font-weight: 700;
  }
  .explainer-intro {
    margin: 0 0 10px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1.45;
  }
  .explainer-list {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .explainer-list dt {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    font-weight: 700;
    margin-bottom: 1px;
  }
  .explainer-list dd {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
  }

  .color-bar {
    display: flex;
    height: 8px;
    margin: 6px 0 2px;
    border-radius: 2px;
    overflow: hidden;
  }
  .color-bar .cb-stop {
    flex: 1;
    height: 100%;
  }
  .color-bar .teal {
    background: #4ecdc4;
  }
  .color-bar .blue {
    background: #4466ff;
  }
  .color-bar .yellow {
    background: #ffc850;
  }
  .color-bar .orange {
    background: #ff8c3c;
  }
  .color-bar .red {
    background: #c1440e;
  }
  .color-bar-labels {
    display: flex;
    justify-content: space-between;
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
  }
  @media (max-width: 767px) {
    .right-panel {
      border-left: none;
      border-top: 1px solid var(--color-border);
      max-height: 50vh;
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .empty-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 16px;
    letter-spacing: 3px;
    color: var(--color-text);
  }
  .empty-hint {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    margin: 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
  }
  .row.strong .value {
    color: #4ecdc4;
    font-weight: 700;
    font-size: 13px;
  }
  .label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.35);
  }
  .value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
  }

  .divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 6px 0;
  }

  .vehicle {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .vehicle select {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: var(--color-text);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
  }
  .vehicle select:focus-visible {
    outline: 1px solid #4466ff;
    outline-offset: 2px;
  }

  .rocket-photo {
    margin: 0;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
    aspect-ratio: 16 / 9;
  }
  .rocket-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .budget {
    position: relative;
    height: 24px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    margin-top: 4px;
  }
  .budget-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: linear-gradient(to right, #4ecdc4, #4ecdc488);
    transition: width 200ms;
  }
  .budget.deficit .budget-fill {
    background: linear-gradient(to right, #c1440e, #c1440e88);
  }
  .budget-label {
    position: relative;
    z-index: 1;
    text-align: center;
    line-height: 24px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .fly {
    margin-top: 8px;
    width: 100%;
    min-height: 48px;
    padding: 12px;
    background: #1a33bb;
    border: 1px solid rgba(68, 102, 255, 0.55);
    border-radius: 4px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 3px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms;
  }
  .fly:hover:not(:disabled),
  .fly:focus-visible:not(:disabled) {
    background: #2244dd;
    border-color: #4466ff;
    outline: none;
  }
  .fly:disabled {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.25);
    cursor: not-allowed;
  }
</style>
