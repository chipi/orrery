<!--
  TransferEllipseCanvas — the canvas "hero" for the transfer-ellipse figure (v0.9 phase 2).
  The SVG FigureRenderer delegates here for kind === 'transfer-ellipse'. Borrows /science's
  additive glow + animated draw-in; keeps the fidelity-register stroke + the honesty line.
  Geometry (RS/cx/cy) matches the old SVG branch so the two agree.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityStyle, fidelityLabel, GOLD, TEAL } from './figure-style';
  import { BODY_PALETTE } from '$lib/body-palette';
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

  type TransferEllipse = Extract<FigureSpec, { kind: 'transfer-ellipse' }>;
  type Props = {
    figure: TransferEllipse;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const RS = 108;
  const cx = W / 2;
  const cy = H / 2 - 4;
  const px = (x: number): number => cx + x * RS;
  const py = (y: number): number => cy - y * RS;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(
    ariaLabelKey ? t(ariaLabelKey) : `Transfer ellipse · ${provenanceText}`,
  );

  // Gold Sun in the heliocentric frame; else the body's own palette (Earth/Mars/Moon).
  const primary = $derived.by(() => {
    if (figure.frame === 'heliocentric') return { core: '#fff6d8', glow: '255,200,80' };
    const id = figure.bodies[0]?.labelKey.split('.').pop() ?? '';
    const pal = BODY_PALETTE[id];
    return pal ? { core: pal.core, glow: pal.glowRGB } : { core: '#dffcfa', glow: '78,205,196' };
  });

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    const fs = fidelityStyle(figure.provenance.fidelity);
    heroBackground(ctx, cx, cy);

    // Start + target circular orbits (radii from the burn marks).
    ctx.strokeStyle = 'rgba(78,205,196,0.26)';
    ctx.lineWidth = 1;
    for (const mk of figure.marks) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.hypot(mk.at.x, mk.at.y) * RS, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Primary body — additive glow + solid core.
    const b0 = figure.bodies[0]?.at ?? { x: 0, y: 0 };
    const bx = px(b0.x);
    const by = py(b0.y);
    heroGlow(ctx, bx, by, 34, primary.glow);
    ctx.fillStyle = primary.core;
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fill();

    // Transfer arc drawn up to `progress`, with an additive glow underlay.
    const arc = figure.arc;
    if (arc.length > 1) {
      const upto = Math.max(1, Math.floor(progress * (arc.length - 1)));
      const drawArc = (): void => {
        ctx.beginPath();
        ctx.moveTo(px(arc[0].x), py(arc[0].y));
        for (let i = 1; i <= upto; i += 1) ctx.lineTo(px(arc[i].x), py(arc[i].y));
      };
      const arcGlowRGB =
        fs.stroke === TEAL ? '78,205,196' : fs.stroke === GOLD ? '255,200,80' : '193,68,14';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${arcGlowRGB},0.35)`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      if (fs.dasharray !== 'none') ctx.setLineDash(fs.dasharray.split(' ').map(Number));
      drawArc();
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = fs.stroke;
      ctx.globalAlpha = fs.opacity;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      if (fs.dasharray !== 'none') ctx.setLineDash(fs.dasharray.split(' ').map(Number));
      drawArc();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Burn points + labels — fade in as the arc completes.
    const markAlpha = Math.max(0, Math.min(1, (progress - 0.55) / 0.45));
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    for (const mk of figure.marks) {
      ctx.globalAlpha = markAlpha;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(px(mk.at.x), py(mk.at.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,200,80,0.92)';
      ctx.fillText(t(mk.labelKey), px(mk.at.x), py(mk.at.y) - 8);
    }
    ctx.globalAlpha = 1;

    if (figure.bodies[0]) {
      ctx.fillStyle = 'rgba(78,205,196,0.85)';
      ctx.fillText(t(figure.bodies[0].labelKey), bx, by + 18);
    }

    heroVignette(ctx, cx, cy);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure; // re-run on recompute
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated });
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
  class="te-canvas"
></canvas>

<style>
  .te-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
