<!--
  FigureRenderer — SVG renderer for FigureSpec (S2a #509).
  Handles: curve · force-diagram · dv-waterfall · unknown-kind fallback.
  The honesty line (fidelity · module + assumptions) is always visible.

  Props:
    figure      — FigureSpec from a FormulaResult
    t           — i18n resolver injected by the Lab route (paraglide-free here
                  because the Lab message keys don't exist yet at S2a)
    ariaLabelKey — optional; resolved via t(); falls back to an honest default

  Design tokens: UXS-015 §"The figure language" + docs/prototypes/lab/focus.html
-->
<script lang="ts">
  import type { FigureSpec, Vec2 } from '$lib/physics/spec';
  import {
    fidelityStyle,
    fidelityLabel,
    FIGURE_BG,
    TEAL,
    GOLD,
    MARS,
    GRID,
    GRID_STEP,
  } from './figure-style';

  type Props = {
    figure: FigureSpec;
    t: (key: string) => string;
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
    `${fidelityLabel(figure.provenance.fidelity)} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map(t).join(' · ') : '',
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

  // ─── Force-diagram helpers ──────────────────────────────────────────────────
  const BODY_CX = W / 2;
  const BODY_CY = H / 2 - 10; // slightly above center to leave room for honesty line
  const BODY_R = 18;
  const ARROW_SCALE = 80; // px per unit magN (normalized to max)

  function forceDiagramVectors(fig: Extract<FigureSpec, { kind: 'force-diagram' }>) {
    const maxMag = Math.max(...fig.vectors.map((v) => v.magN), 1);
    return fig.vectors.map((v) => {
      const len = (v.magN / maxMag) * ARROW_SCALE;
      // dir is a unit vector in data space; y-axis is inverted in SVG
      const dx = v.dir.x * len;
      const dy = -v.dir.y * len; // flip y
      const x2 = BODY_CX + dx;
      const y2 = BODY_CY + dy;
      // Arrow head
      const angle = Math.atan2(dy, dx);
      const headLen = 8;
      const headAngle = 0.4; // radians
      const hx1 = x2 - headLen * Math.cos(angle - headAngle);
      const hy1 = y2 - headLen * Math.sin(angle - headAngle);
      const hx2 = x2 - headLen * Math.cos(angle + headAngle);
      const hy2 = y2 - headLen * Math.sin(angle + headAngle);
      return { v, x2, y2, hx1, hy1, hx2, hy2, dx, dy };
    });
  }

  // ─── Waterfall helpers ──────────────────────────────────────────────────────
  const WF_LEFT = 100; // px — label column width
  const WF_RIGHT = W - 24;
  const WF_BAR_H = 22;
  const WF_GAP = 8;
  const WF_TOP = 20;

  function waterfallBars(fig: Extract<FigureSpec, { kind: 'dv-waterfall' }>) {
    const maxDv = Math.max(...fig.segments.map((s) => s.dv), 1);
    const availW = WF_RIGHT - WF_LEFT - 8;
    return fig.segments.map((seg, i) => {
      const barW = Math.max(2, (seg.dv / maxDv) * availW);
      const y = WF_TOP + i * (WF_BAR_H + WF_GAP);
      return { seg, barW, y };
    });
  }
</script>

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
        <polyline
          points={pts}
          fill="none"
          stroke={fs.stroke}
          stroke-width="1.5"
          stroke-dasharray={fs.dasharray === 'none' ? undefined : fs.dasharray}
          opacity={fs.opacity}
          class={fs.registerClass}
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
  {:else if figure.kind === 'force-diagram'}
    {@const vectors = forceDiagramVectors(figure)}

    <!-- Body glyph -->
    <circle
      cx={BODY_CX}
      cy={BODY_CY}
      r={BODY_R}
      fill={FIGURE_BG}
      stroke={TEAL}
      stroke-width="1.5"
    />
    <text x={BODY_CX} y={BODY_CY + 4} class="body-label" text-anchor="middle">
      {t(figure.bodyLabelKey)}
    </text>

    <!-- Force vectors -->
    {#each vectors as { v, x2, y2, hx1, hy1, hx2, hy2 } (v.labelKey)}
      {@const fs = fidelityStyle(figure.provenance.fidelity)}
      <!-- Shaft: from body edge toward tip -->
      {@const angle = Math.atan2(y2 - BODY_CY, x2 - BODY_CX)}
      {@const startX = BODY_CX + BODY_R * Math.cos(angle)}
      {@const startY = BODY_CY + BODY_R * Math.sin(angle)}
      <line
        x1={startX}
        y1={startY}
        {x2}
        {y2}
        stroke={fs.stroke}
        stroke-width="2"
        stroke-dasharray={fs.dasharray === 'none' ? undefined : fs.dasharray}
        opacity={fs.opacity}
        class={fs.registerClass}
      />
      <!-- Arrowhead -->
      <polyline
        points="{hx1.toFixed(2)},{hy1.toFixed(2)} {x2.toFixed(2)},{y2.toFixed(2)} {hx2.toFixed(
          2,
        )},{hy2.toFixed(2)}"
        fill="none"
        stroke={fs.stroke}
        stroke-width="2"
        opacity={fs.opacity}
      />
      <!-- Label -->
      <text
        x={(x2 + (x2 - BODY_CX) * 0.18).toFixed(2)}
        y={(y2 + (y2 - BODY_CY) * 0.18 - 4).toFixed(2)}
        class="vector-label">{t(v.labelKey)}</text
      >
    {/each}
  {:else if figure.kind === 'dv-waterfall'}
    {@const bars = waterfallBars(figure)}

    {#each bars as { seg, barW, y } (seg.labelKey)}
      {@const fill = seg.kind === 'gain' ? TEAL : MARS}
      <rect x={WF_LEFT} {y} width={barW} height={WF_BAR_H} {fill} opacity="0.85" />
      <!-- Segment label -->
      <text x={WF_LEFT - 6} y={y + WF_BAR_H / 2 + 4} class="wf-label" text-anchor="end">
        {t(seg.labelKey)}
      </text>
      <!-- dv value -->
      <text x={WF_LEFT + barW + 6} y={y + WF_BAR_H / 2 + 4} class="wf-value">
        {seg.dv.toFixed(1)}
      </text>
    {/each}
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

  .mark-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: #ffc850;
  }

  .body-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    fill: rgba(78, 205, 196, 0.85);
    letter-spacing: 0.5px;
  }

  .vector-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(255, 255, 255, 0.75);
  }

  .wf-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(255, 255, 255, 0.65);
  }

  .wf-value {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    fill: rgba(255, 255, 255, 0.55);
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
