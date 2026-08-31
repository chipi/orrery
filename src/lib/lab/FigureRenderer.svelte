<!--
  FigureRenderer — renderer for FigureSpec (S2a #509).
  Renders `curve` + the unknown-kind fallback here in SVG; delegates the four canvas
  "heroes" (transfer-ellipse · moon-phase · dv-waterfall · force-diagram, v0.9 phase 2).
  The honesty line (fidelity · module + assumptions) is always visible in every path.

  Props:
    figure      — FigureSpec from a FormulaResult
    t           — i18n resolver injected by the Lab route (paraglide-free here
                  because the Lab message keys don't exist yet at S2a)
    ariaLabelKey — optional; resolved via t(); falls back to an honest default

  Design tokens: UXS-015 §"The figure language" + docs/prototypes/lab/focus.html
-->
<script lang="ts">
  import type { FigureSpec, Vec2 } from '$lib/physics/spec';
  import TransferEllipseCanvas from './TransferEllipseCanvas.svelte';
  import MoonPhaseCanvas from './MoonPhaseCanvas.svelte';
  import DvWaterfallCanvas from './DvWaterfallCanvas.svelte';
  import ForceDiagramCanvas from './ForceDiagramCanvas.svelte';
  import OrbitDiagramCanvas from './OrbitDiagramCanvas.svelte';
  import {
    fidelityStyle,
    fidelityLabel,
    FIGURE_BG,
    TEAL,
    GOLD,
    GRID,
    GRID_STEP,
    AXIS_TICK,
    AXIS_GRIDLINE,
    niceTicks,
    fmtTick,
  } from './figure-style';
  // MARS/force-diagram/waterfall/moon-phase rendering moved to the canvas heroes
  // (TransferEllipse/MoonPhase/DvWaterfall/ForceDiagram); this file keeps curve + fallback.

  type Props = {
    figure: FigureSpec;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  // ─── Layout constants ───────────────────────────────────────────────────────
  const W = 480;
  const H = 320;
  const PAD = { top: 24, right: 16, bottom: 40, left: 52 };
  // Plot area (used only for curve)
  const plotW = $derived(W - PAD.left - PAD.right);
  const plotH = $derived(H - PAD.top - PAD.bottom);

  // ─── Honesty line ───────────────────────────────────────────────────────────
  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );

  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Physics figure · ${provenanceText}`);

  // ─── Curve helpers ──────────────────────────────────────────────────────────

  // Collect all points across all series for extent computation.
  function curveExtent(fig: Extract<FigureSpec, { kind: 'curve' }>) {
    let xMin = Infinity,
      xMax = -Infinity,
      yMin = Infinity,
      yMax = -Infinity;
    for (const s of fig.series) {
      for (const p of s.points) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
        if (p.y < yMin) yMin = p.y;
        if (p.y > yMax) yMax = p.y;
      }
    }
    // Guard against degenerate extents
    if (!isFinite(xMin)) {
      xMin = 0;
      xMax = 1;
    }
    if (!isFinite(yMin)) {
      yMin = 0;
      yMax = 1;
    }
    if (xMin === xMax) {
      xMin -= 0.5;
      xMax += 0.5;
    }
    if (yMin === yMax) {
      yMin -= 0.5;
      yMax += 0.5;
    }
    return { xMin, xMax, yMin, yMax };
  }

  function toLog(v: number, lo: number, hi: number, size: number): number {
    const logLo = Math.log10(Math.max(lo, 1e-10));
    const logHi = Math.log10(Math.max(hi, 1e-10));
    return ((Math.log10(Math.max(v, 1e-10)) - logLo) / (logHi - logLo)) * size;
  }

  function mapX(
    v: number,
    xMin: number,
    xMax: number,
    scale: 'linear' | 'log' | undefined,
  ): number {
    if (scale === 'log') return PAD.left + toLog(v, xMin, xMax, plotW);
    return PAD.left + ((v - xMin) / (xMax - xMin)) * plotW;
  }

  function mapY(
    v: number,
    yMin: number,
    yMax: number,
    scale: 'linear' | 'log' | undefined,
  ): number {
    if (scale === 'log') return PAD.top + plotH - toLog(v, yMin, yMax, plotH);
    return PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  }

  function pointsToPolyline(
    pts: Vec2[],
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number,
    xScale: 'linear' | 'log' | undefined,
    yScale: 'linear' | 'log' | undefined,
  ): string {
    return pts
      .map(
        (p) =>
          `${mapX(p.x, xMin, xMax, xScale).toFixed(2)},${mapY(p.y, yMin, yMax, yScale).toFixed(2)}`,
      )
      .join(' ');
  }
</script>

{#if figure.kind === 'transfer-ellipse'}
  <!-- Canvas "heroes" (v0.9 phase 2) — richer than SVG can be; curve + stubs stay SVG. -->
  <TransferEllipseCanvas {figure} {t} {ariaLabelKey} />
{:else if figure.kind === 'moon-phase'}
  <MoonPhaseCanvas {figure} {t} {ariaLabelKey} />
{:else if figure.kind === 'dv-waterfall'}
  <DvWaterfallCanvas {figure} {t} {ariaLabelKey} />
{:else if figure.kind === 'force-diagram'}
  <ForceDiagramCanvas {figure} {t} {ariaLabelKey} />
{:else if figure.kind === 'orbit'}
  <OrbitDiagramCanvas {figure} {t} {ariaLabelKey} />
{:else}
  <svg
    role="img"
    aria-label={ariaLabel}
    viewBox="0 0 {W} {H}"
    width="100%"
    class="figure-root"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Lab-bench background: graph paper (minor + major grid) + a soft radial
       bench-glow (center feels lit) + a vignette (edges fall off). Operator-
       approved 2026-08-29 — "makes you think lab, not void-black". -->
    <defs>
      <radialGradient id="fig-bg" cx="40%" cy="34%" r="95%">
        <stop offset="0%" stop-color="#0b0f1c" />
        <stop offset="52%" stop-color="#070810" />
        <stop offset="100%" stop-color="#030307" />
      </radialGradient>
      <radialGradient id="fig-benchglow" cx="42%" cy="40%" r="55%">
        <stop offset="0%" stop-color="rgba(78,205,196,0.06)" />
        <stop offset="100%" stop-color="rgba(78,205,196,0)" />
      </radialGradient>
      <radialGradient id="fig-vignette" cx="50%" cy="46%" r="72%">
        <stop offset="60%" stop-color="rgba(0,0,0,0)" />
        <stop offset="100%" stop-color="rgba(0,0,0,0.42)" />
      </radialGradient>
      <pattern id="fig-grid-minor" width="8" height="8" patternUnits="userSpaceOnUse">
        <path d="M8 0H0V8" fill="none" stroke="rgba(78,205,196,0.032)" stroke-width="1" />
      </pattern>
      <pattern
        id="fig-grid"
        x="0"
        y="0"
        width={GRID_STEP}
        height={GRID_STEP}
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="0" x2={GRID_STEP} y2="0" stroke={GRID} stroke-width="1" />
        <line x1="0" y1="0" x2="0" y2={GRID_STEP} stroke={GRID} stroke-width="1" />
      </pattern>
      <!-- Curve chrome (v0.9 lift): a soft glow for data strokes/marks + a fade for the
         area under the curve, so a plotted line reads as lit signal, not a flat stroke. -->
      <filter id="fig-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="fig-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(78,205,196,0.22)" />
        <stop offset="100%" stop-color="rgba(78,205,196,0)" />
      </linearGradient>
    </defs>
    <rect width={W} height={H} fill="url(#fig-bg)" />
    <rect width={W} height={H} fill="url(#fig-benchglow)" />
    <rect width={W} height={H} fill="url(#fig-grid-minor)" />
    <rect width={W} height={H} fill="url(#fig-grid)" />

    {#if figure.kind === 'curve'}
      {@const ext = curveExtent(figure)}
      {@const xSc = figure.x.scale}
      {@const ySc = figure.y.scale}
      {@const fs = fidelityStyle(figure.provenance.fidelity)}
      {@const xTicks = niceTicks(ext.xMin, ext.xMax, xSc)}
      {@const yTicks = niceTicks(ext.yMin, ext.yMax, ySc)}

      <!-- Data-aligned gridlines (one per tick value) — sit under the axes + series -->
      {#each xTicks as tx (tx)}
        {@const px = mapX(tx, ext.xMin, ext.xMax, xSc)}
        {#if px >= PAD.left - 0.5 && px <= PAD.left + plotW + 0.5}
          <line
            x1={px}
            y1={PAD.top}
            x2={px}
            y2={PAD.top + plotH}
            stroke={AXIS_GRIDLINE}
            stroke-width="1"
          />
          <line x1={px} y1={PAD.top + plotH} x2={px} y2={PAD.top + plotH + 4} stroke={AXIS_TICK} />
          <text x={px} y={PAD.top + plotH + 15} class="tick-label" text-anchor="middle"
            >{fmtTick(tx)}</text
          >
        {/if}
      {/each}
      {#each yTicks as ty (ty)}
        {@const py = mapY(ty, ext.yMin, ext.yMax, ySc)}
        {#if py >= PAD.top - 0.5 && py <= PAD.top + plotH + 0.5}
          <line
            x1={PAD.left}
            y1={py}
            x2={PAD.left + plotW}
            y2={py}
            stroke={AXIS_GRIDLINE}
            stroke-width="1"
          />
          <line x1={PAD.left - 4} y1={py} x2={PAD.left} y2={py} stroke={AXIS_TICK} />
          <text x={PAD.left - 7} y={py + 3} class="tick-label" text-anchor="end">{fmtTick(ty)}</text
          >
        {/if}
      {/each}

      <!-- Axes -->
      <!-- x-axis -->
      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={PAD.left + plotW}
        y2={PAD.top + plotH}
        stroke={TEAL}
        stroke-width="1"
        opacity="0.35"
      />
      <!-- y-axis -->
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={PAD.top + plotH}
        stroke={TEAL}
        stroke-width="1"
        opacity="0.35"
      />

      <!-- Axis labels -->
      <text x={PAD.left + plotW / 2} y={H - 6} class="axis-label" text-anchor="middle"
        >{t(figure.x.labelKey)}{figure.x.units ? ` (${figure.x.units})` : ''}</text
      >
      <text
        x={10}
        y={PAD.top + plotH / 2}
        class="axis-label"
        text-anchor="middle"
        transform="rotate(-90, 10, {PAD.top + plotH / 2})"
        >{t(figure.y.labelKey)}{figure.y.units ? ` (${figure.y.units})` : ''}</text
      >

      <!-- Series -->
      {#each figure.series as series, si (si)}
        {@const pts = pointsToPolyline(
          series.points,
          ext.xMin,
          ext.xMax,
          ext.yMin,
          ext.yMax,
          xSc,
          ySc,
        )}
        {#if pts}
          <!-- Area under the first (primary) computed series — a lit fade to the baseline,
             so the curve reads as signal. Skipped for dashed/dotted register lines. -->
          {#if si === 0 && fs.dasharray === 'none' && series.points.length > 1}
            {@const fx = mapX(series.points[0].x, ext.xMin, ext.xMax, xSc).toFixed(2)}
            {@const lx = mapX(
              series.points[series.points.length - 1].x,
              ext.xMin,
              ext.xMax,
              xSc,
            ).toFixed(2)}
            {@const base = (PAD.top + plotH).toFixed(2)}
            <polygon points={`${pts} ${lx},${base} ${fx},${base}`} fill="url(#fig-area)" />
          {/if}
          <polyline
            points={pts}
            fill="none"
            stroke={fs.stroke}
            stroke-width="1.5"
            stroke-dasharray={fs.dasharray === 'none' ? undefined : fs.dasharray}
            opacity={fs.opacity}
            class={fs.registerClass}
            filter="url(#fig-glow)"
          />
          {#if series.labelKey}
            <!-- Series label at last point -->
            {@const last = series.points[series.points.length - 1]}
            {#if last}
              <text
                x={mapX(last.x, ext.xMin, ext.xMax, xSc) + 4}
                y={mapY(last.y, ext.yMin, ext.yMax, ySc) - 4}
                class="series-label">{t(series.labelKey)}</text
              >
            {/if}
          {/if}
        {/if}
        <!-- Suppress unused var warning -->
        {#if si < 0}{/if}
      {/each}

      <!-- Marks (annotations) -->
      {#if figure.marks}
        {#each figure.marks as mark, mi (mi)}
          {@const cx = mapX(mark.at.x, ext.xMin, ext.xMax, xSc)}
          {@const cy = mapY(mark.at.y, ext.yMin, ext.yMax, ySc)}
          <circle {cx} {cy} r="4" fill={FIGURE_BG} stroke={GOLD} stroke-width="1.5" />
          <circle {cx} {cy} r="2" fill={GOLD} />
          <text x={cx + 6} y={cy - 4} class="mark-label">{t(mark.labelKey)}</text>
        {/each}
      {/if}
    {:else}
      <!-- Unknown-kind fallback: honest, never throws -->
      <rect
        x={PAD.left}
        y={PAD.top}
        width={plotW}
        height={H - PAD.top - 28}
        fill="rgba(255,255,255,0.03)"
        stroke={GOLD}
        stroke-width="1"
        stroke-dasharray="4 4"
      />
      <text x={W / 2} y={H / 2 - 10} class="fallback-label" text-anchor="middle">
        {t('lab.figure.unsupported')}
      </text>
      <text x={W / 2} y={H / 2 + 10} class="fallback-prov" text-anchor="middle">
        {provenanceText}
      </text>
    {/if}

    <!-- Vignette overlay — darkens the edges to focus the figure; drawn above the
       plot but below the honesty text so the trust line stays crisp. -->
    <rect width={W} height={H} fill="url(#fig-vignette)" pointer-events="none" />

    <!-- Honesty line — always visible, always at the bottom -->
    <text x={8} y={H - 16} class="honesty-prov">{provenanceText}</text>
    {#if assumptionsText}
      <text x={8} y={H - 6} class="honesty-assumptions" style="max-width:{W - 16}px">
        {assumptionsText}
      </text>
    {/if}
  </svg>
{/if}

<style>
  .figure-root {
    display: block;
    background: #04040c;
    font-family: 'Space Mono', monospace;
  }

  .axis-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    fill: rgba(78, 205, 196, 0.65);
    letter-spacing: 0.5px;
  }

  .series-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(78, 205, 196, 0.8);
  }

  .tick-label {
    font-family: 'Space Mono', monospace;
    font-size: 7.5px;
    fill: rgba(78, 205, 196, 0.55);
  }

  .mark-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: #ffc850;
  }

  .fallback-label {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    fill: #ffc850;
    letter-spacing: 2px;
  }

  .fallback-prov {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(255, 200, 80, 0.6);
  }

  /* Honesty line — always rendered, 8px Space Mono, matches ImageCredit convention */
  .honesty-prov {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(78, 205, 196, 0.5);
    letter-spacing: 0.5px;
  }

  .honesty-assumptions {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    fill: rgba(255, 200, 80, 0.4);
    letter-spacing: 0.3px;
  }
</style>
