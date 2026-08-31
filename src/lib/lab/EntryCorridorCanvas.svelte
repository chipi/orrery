<!--
  EntryCorridorCanvas — the canvas "hero" for the entry-corridor figure (v0.9 phase 2, M-return).
  A re-entry side-view (the entry ray hitting the atmosphere: skips off if too shallow, digs in
  if too steep) over a quantitative angle band that shades the skip / corridor / over-g zones and
  marks the chosen angle. When the corridor closes (fast lunar return, ballistic), there is no
  green band — the honest "you need a lifting entry" verdict.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel } from './figure-style';
  import {
    HERO_W as W,
    HERO_H as H,
    HERO_DPR as DPR,
    heroBackground,
    heroVignette,
    heroGlow,
    drawHonestyLine,
    heroDrawIn,
  } from './hero-canvas';

  type EntryCorridor = Extract<FigureSpec, { kind: 'entry-corridor' }>;
  type Props = {
    figure: EntryCorridor;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Entry corridor · ${provenanceText}`);

  const TEAL = '78,205,196';
  const ORANGE = '255,170,70';
  const RED = '210,70,50';

  const hasCorridor = $derived(figure.skipBoundaryDeg < figure.gLimitBoundaryDeg);
  const verdict = $derived(
    figure.entryDeg < figure.skipBoundaryDeg
      ? 'skip'
      : figure.entryDeg > figure.gLimitBoundaryDeg
        ? 'overg'
        : 'ok',
  );

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    // ── Side view: the entry ray meeting the atmosphere ──────────────────────
    const atmY = 70; // atmosphere-top line
    const surfY = 150; // surface line
    const originX = 60;
    ctx.strokeStyle = 'rgba(120,235,225,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); // atmosphere top (dashed)
    ctx.setLineDash([5, 4]);
    ctx.moveTo(20, atmY);
    ctx.lineTo(W - 20, atmY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(120,235,225,0.5)'; // surface
    ctx.beginPath();
    ctx.moveTo(20, surfY);
    ctx.lineTo(W - 20, surfY);
    ctx.stroke();
    // faint atmosphere fill
    ctx.fillStyle = 'rgba(78,205,196,0.05)';
    ctx.fillRect(20, atmY, W - 40, surfY - atmY);
    ctx.fillStyle = 'rgba(120,235,225,0.5)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('atmosphere', 24, atmY - 4);
    ctx.fillText('surface', 24, surfY + 10);

    // Entry ray hits the atmosphere top at the chosen angle below horizontal.
    const g = (figure.entryDeg * Math.PI) / 180;
    const hitX = originX + 150;
    const rayLen = 150 * progress;
    const rx0 = hitX - rayLen * Math.cos(g);
    const ry0 = atmY - rayLen * Math.sin(g);
    const rgb = verdict === 'ok' ? TEAL : verdict === 'skip' ? ORANGE : RED;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${rgb},0.35)`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.lineTo(hitX, atmY);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.lineTo(hitX, atmY);
    ctx.stroke();

    if (progress > 0.55) {
      const tail = (progress - 0.55) / 0.45;
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (verdict === 'skip') {
        // grazes the top and skips back out
        const ex = hitX + 130 * tail * Math.cos(g * 0.6);
        const ey = atmY - 130 * tail * Math.sin(g * 0.6);
        ctx.moveTo(hitX, atmY);
        ctx.quadraticCurveTo(hitX + 40, atmY + 14, ex, ey);
      } else {
        // digs in toward the surface (steeper for over-g)
        const dg = verdict === 'overg' ? g * 1.15 : g;
        const depth = Math.min(surfY - atmY, 120 * tail * Math.sin(dg) + 6);
        ctx.moveTo(hitX, atmY);
        ctx.lineTo(hitX + depth / Math.tan(Math.max(0.15, dg)), atmY + depth);
      }
      ctx.stroke();
    }
    heroGlow(ctx, hitX, atmY, 8, rgb, 0.6);

    // ── Angle band: skip | corridor | over-g ─────────────────────────────────
    const bandY = 210;
    const bandH = 22;
    const bx0 = 40;
    const bx1 = W - 40;
    const maxA = Math.ceil(
      Math.max(figure.entryDeg, figure.gLimitBoundaryDeg, figure.skipBoundaryDeg, 8) + 1,
    );
    const aToX = (a: number): number => bx0 + (a / maxA) * (bx1 - bx0);
    const skipX = aToX(Math.max(0, figure.skipBoundaryDeg));
    const gX = aToX(Math.min(maxA, figure.gLimitBoundaryDeg));

    // skip zone (0..skip) orange; corridor (skip..g) green if any; over-g (g..max) red.
    ctx.fillStyle = `rgba(${ORANGE},0.28)`;
    ctx.fillRect(bx0, bandY, Math.max(0, skipX - bx0), bandH);
    ctx.fillStyle = `rgba(${RED},0.28)`;
    ctx.fillRect(gX, bandY, Math.max(0, bx1 - gX), bandH);
    if (hasCorridor) {
      ctx.fillStyle = `rgba(${TEAL},0.34)`;
      ctx.fillRect(skipX, bandY, gX - skipX, bandH);
    } else {
      // the boundaries crossed — the closed corridor is a red overlap band.
      ctx.fillStyle = `rgba(${RED},0.42)`;
      ctx.fillRect(gX, bandY, skipX - gX, bandH);
    }
    ctx.strokeStyle = 'rgba(120,235,225,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0, bandY, bx1 - bx0, bandH);

    // chosen-angle marker
    const mxc = Math.min(bx1, Math.max(bx0, aToX(figure.entryDeg)));
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mxc, bandY - 6);
    ctx.lineTo(mxc, bandY + bandH + 6);
    ctx.stroke();

    // band ticks
    ctx.fillStyle = 'rgba(120,235,225,0.5)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    for (let a = 0; a <= maxA; a += Math.ceil(maxA / 6))
      ctx.fillText(`${a}°`, aToX(a), bandY + bandH + 16);
    ctx.textAlign = 'left';
    ctx.fillText('flight-path angle', bx0, bandY - 12);

    // ── Readouts + verdict ───────────────────────────────────────────────────
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(120,235,225,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText(`perigee ${figure.perigeeAltKm.toFixed(0)} km`, W - 24, bandY - 24);
    ctx.fillText(`peak ${figure.peakGeeAtEntry.toFixed(1)} g`, W - 24, bandY - 12);

    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    const msg = !hasCorridor
      ? 'no ballistic corridor — lifting entry required'
      : verdict === 'skip'
        ? 'too shallow → skips back out'
        : verdict === 'overg'
          ? 'too steep → over-g / burn-up'
          : `in corridor (${(figure.gLimitBoundaryDeg - figure.skipBoundaryDeg).toFixed(1)}° wide)`;
    ctx.fillStyle = verdict === 'ok' && hasCorridor ? `rgb(${TEAL})` : `rgb(${RED})`;
    ctx.fillText(msg, W / 2, H - 30);

    heroVignette(ctx, W / 2, H / 2);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 1.1 });
    hasAnimated = true;
    return cleanup;
  });
</script>

<canvas
  bind:this={canvas}
  width={W * DPR}
  height={H * DPR}
  role="img"
  aria-label={ariaLabel}
  class="ec-canvas"
></canvas>

<style>
  .ec-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
