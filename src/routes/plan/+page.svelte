<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import LambertWorker from '../../workers/lambert.worker?worker';
  import type { LambertGrid, LambertProgress, LambertRequest } from '../../workers/lambert.worker';
  import { dvToRGB, dayToLongDate, dayToShortDate } from '$lib/porkchop';

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

  let worker: Worker | undefined;
  let nextId = 1;
  let currentId = 0;

  // ─── Plot geometry ───────────────────────────────────────────────
  // Margins reserve room for axis labels (left = TOF, bottom = dep date).
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
    // Drop messages from a previous (cancelled) request.
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
  // We build the heatmap into an offscreen ImageData at GRID_W × GRID_H
  // and paint it via drawImage, scaled by the canvas's actual plot area.
  // This stays sharp at HiDPI without computing per-pixel.
  let heatBitmap: ImageBitmap | null = null;

  async function buildHeatmapBitmap() {
    if (!grid) return;
    const img = new ImageData(GRID_W, GRID_H);
    for (let j = 0; j < GRID_H; j++) {
      // Flip Y so high-TOF cells render at the top of the plot.
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

    // Heatmap
    if (heatBitmap) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(heatBitmap, ML, MT, PW, PH);
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ML + 0.5, MT + 0.5, PW - 1, PH - 1);

    // Selected / hovered cell crosshair
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
    if (selected) {
      drawCellHighlight(selected, '#fff', 2);
    }

    // Axes
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = "9px 'Space Mono', monospace";

    // X axis (departure date)
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
    ctx.fillText('DEPARTURE WINDOW · 2026 — 2030', ML + PW / 2, MT + PH + 26);

    // Y axis (TOF)
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const t = i / yTicks;
      const y = MT + t * PH;
      // top of plot = max TOF
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
    ctx.fillText('TIME OF FLIGHT (DAYS)', 0, 0);
    ctx.restore();

    // Title
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PORKCHOP · EARTH → MARS · ∆v km/s', ML, 6);
  }

  // ─── Pointer hit-test → grid cell ────────────────────────────────
  function cellFromPointer(clientX: number, clientY: number): { i: number; j: number } | null {
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
    // Flip y because top of plot = high TOF.
    const jVisual = Math.floor((y / PH) * GRID_H);
    const j = Math.min(GRID_H - 1, Math.max(0, GRID_H - 1 - jVisual));
    return { i, j };
  }

  function onPointerMove(e: PointerEvent) {
    if (!grid) return;
    hoverCell = cellFromPointer(e.clientX, e.clientY);
    drawPlot();
  }
  function onPointerLeave() {
    hoverCell = null;
    drawPlot();
  }
  function onClick(e: MouseEvent) {
    if (!grid) return;
    const cell = cellFromPointer(e.clientX, e.clientY);
    if (cell) {
      selected = cell;
      drawPlot();
    }
  }

  // ─── Selected cell readout (lightweight; right panel + FLY in 3a-8) ──
  type Readout = { dep: string; tof: number; arr: string; dv: number };
  let readout: Readout | null = $derived.by(() => {
    if (!selected || !grid) return null;
    const i = selected.i;
    const j = selected.j;
    return {
      dep: dayToLongDate(depDays[i]),
      tof: arrDays[j],
      arr: dayToLongDate(depDays[i] + arrDays[j]),
      dv: grid[j][i],
    };
  });

  onMount(() => {
    worker = new LambertWorker();
    worker.addEventListener('message', onWorkerMessage);
    startCompute();

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

  // Rebuild bitmap whenever the grid changes; redraw on bitmap availability.
  $effect(() => {
    if (grid) {
      void buildHeatmapBitmap().then(() => drawPlot());
    }
  });
</script>

<svelte:head><title>Mission Configurator · Orrery</title></svelte:head>

<div class="plan">
  <canvas
    bind:this={canvas}
    onpointermove={onPointerMove}
    onpointerleave={onPointerLeave}
    onclick={onClick}
    aria-label="Earth–Mars porkchop plot"
  ></canvas>

  {#if computing}
    <div class="loading" role="status" aria-live="polite">
      <div class="loading-title">COMPUTING LAMBERT SOLUTIONS</div>
      <div class="loading-bar">
        <div class="loading-fill" style:width="{progress * 100}%"></div>
      </div>
      <div class="loading-pct">{Math.round(progress * 100)}%</div>
    </div>
  {/if}

  {#if readout}
    <div class="readout">
      <div class="readout-row">
        <span class="readout-label">DEPARTURE</span>
        <span class="readout-value">{readout.dep}</span>
      </div>
      <div class="readout-row">
        <span class="readout-label">ARRIVAL</span>
        <span class="readout-value">{readout.arr}</span>
      </div>
      <div class="readout-row">
        <span class="readout-label">TRANSIT</span>
        <span class="readout-value">{readout.tof.toFixed(0)} days</span>
      </div>
      <div class="readout-row">
        <span class="readout-label">∆V</span>
        <span class="readout-value strong">{readout.dv.toFixed(2)} km/s</span>
      </div>
      <div class="readout-hint">Pick a cell. Right panel + FLY land in 3a-8.</div>
    </div>
  {/if}
</div>

<style>
  .plan {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
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

  /* Lightweight readout — full right panel + vehicle UX in 3a-8. */
  .readout {
    position: absolute;
    right: 16px;
    top: 16px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 12px 14px;
    min-width: 220px;
    backdrop-filter: blur(6px);
    z-index: 5;
  }
  .readout-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
  }
  .readout-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.35);
  }
  .readout-value {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
  }
  .readout-value.strong {
    color: #4ecdc4;
    font-weight: 700;
  }
  .readout-hint {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    margin-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 8px;
  }
</style>
