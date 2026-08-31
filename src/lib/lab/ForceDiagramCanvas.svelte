<!--
  ForceDiagramCanvas — the canvas "hero" for the force-diagram figure (v0.9 phase 2). Lifts the
  free-body diagram behind launch-a-rocket (thrust vs weight) and the lander goals. The body
  glows at the centre; each force vector grows out on draw-in with an additive glow + arrowhead.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel, fidelityStyle, TEAL } from './figure-style';
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

  type ForceDiagram = Extract<FigureSpec, { kind: 'force-diagram' }>;
  type Props = {
    figure: ForceDiagram;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = W / 2;
  const cy = H / 2 - 8;
  const BODY_R = 20;
  const ARROW = 88; // px for the largest force

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Force diagram · ${provenanceText}`);

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, cy);

    const maxMag = Math.max(...figure.vectors.map((v) => v.magN), 1);
    // All vectors carry the figure's fidelity-register colour (faithful to the SVG original);
    // direction is geometry, not colour — so a horizontal force isn't mis-coloured as "thrust".
    const fs = fidelityStyle(figure.provenance.fidelity);
    const rgb =
      fs.stroke === TEAL ? '78,205,196' : fs.stroke === '#ffc850' ? '255,200,80' : '193,68,14';

    ctx.lineCap = 'round';
    ctx.textAlign = 'center';
    ctx.font = "8px 'Space Mono', monospace";
    for (const v of figure.vectors) {
      const len = (v.magN / maxMag) * ARROW * progress;
      const dx = v.dir.x * len;
      const dy = -v.dir.y * len; // SVG/canvas y is down; data y is up
      const x2 = cx + dx;
      const y2 = cy + dy;

      // glow underlay
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${rgb},0.3)`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      // shaft
      ctx.strokeStyle = fs.stroke;
      ctx.globalAlpha = fs.opacity;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // arrowhead
      if (len > 6) {
        const ang = Math.atan2(dy, dx);
        const hl = 9;
        const ha = 0.42;
        ctx.fillStyle = fs.stroke;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hl * Math.cos(ang - ha), y2 - hl * Math.sin(ang - ha));
        ctx.lineTo(x2 - hl * Math.cos(ang + ha), y2 - hl * Math.sin(ang + ha));
        ctx.closePath();
        ctx.fill();
      }

      // label placed just beyond the tip, ALONG the vector direction (works for any angle).
      const mag = Math.hypot(dx, dy) || 1;
      const off = 16;
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress - 0.5) / 0.5));
      ctx.fillStyle = `rgba(${rgb},0.95)`;
      ctx.fillText(t(v.labelKey), x2 + (dx / mag) * off, y2 + (dy / mag) * off + 3);
      ctx.globalAlpha = 1;
    }

    // Body glyph — glowing core.
    heroGlow(ctx, cx, cy, BODY_R * 1.8, '210,225,255', 0.28);
    ctx.fillStyle = '#0b0f1c';
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, BODY_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(78,205,196,0.9)';
    ctx.fillText(t(figure.bodyLabelKey), cx, cy + 3);

    heroVignette(ctx, cx, cy);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 0.9 });
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
  class="fd-canvas"
></canvas>

<style>
  .fd-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
