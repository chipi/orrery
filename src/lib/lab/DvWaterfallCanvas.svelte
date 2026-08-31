<!--
  DvWaterfallCanvas — the canvas "hero" for the dv-waterfall figure (v0.9 phase 2). Lifts the
  Δv ledger the escape / oberth / M-return / reach-orbit verdicts share. Gain bars glow teal,
  cost bars glow mars; each grows to length on draw-in, its Δv value riding the tip.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel, TEAL, MARS } from './figure-style';
  import {
    HERO_W as W,
    HERO_H as H,
    HERO_DPR as DPR,
    heroBackground,
    heroVignette,
    drawHonestyLine,
    heroDrawIn,
  } from './hero-canvas';

  type DvWaterfall = Extract<FigureSpec, { kind: 'dv-waterfall' }>;
  type Props = {
    figure: DvWaterfall;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const LEFT = 116; // label column
  const VALUE_GUTTER = 64; // room for the "NN.NN km/s" value past the bar tip
  const RIGHT = W - 26 - VALUE_GUTTER;
  const TOP = 34;
  const BAR_H = 20;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Δv waterfall · ${provenanceText}`);

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const segs = figure.segments;
    const maxDv = Math.max(...segs.map((s) => s.dv), 1);
    const availW = RIGHT - LEFT;
    const gap = 8;
    const rowH = BAR_H + gap;

    // Baseline the bars grow from.
    ctx.strokeStyle = 'rgba(78,205,196,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT, TOP - 6);
    ctx.lineTo(LEFT, TOP + segs.length * rowH - gap + 4);
    ctx.stroke();

    ctx.textBaseline = 'middle';
    segs.forEach((seg, i) => {
      const y = TOP + i * rowH;
      const full = Math.max(2, (seg.dv / maxDv) * availW);
      const barW = full * progress;
      const rgb = seg.kind === 'gain' ? '78,205,196' : '193,68,14';
      const solid = seg.kind === 'gain' ? TEAL : MARS;

      // glow underlay
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${rgb},0.28)`;
      ctx.fillRect(LEFT - 2, y - 3, barW + 4, BAR_H + 6);
      ctx.restore();

      // bar with a left→right sheen
      const grad = ctx.createLinearGradient(LEFT, 0, LEFT + full, 0);
      grad.addColorStop(0, `rgba(${rgb},0.95)`);
      grad.addColorStop(1, `rgba(${rgb},0.55)`);
      ctx.fillStyle = grad;
      ctx.fillRect(LEFT, y, barW, BAR_H);

      // label (right-aligned in the column)
      ctx.textAlign = 'right';
      ctx.font = "8px 'Space Mono', monospace";
      ctx.fillStyle = 'rgba(220,235,235,0.82)';
      ctx.fillText(t(seg.labelKey), LEFT - 8, y + BAR_H / 2);

      // Δv value at the bar tip
      ctx.textAlign = 'left';
      ctx.fillStyle = solid;
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress - 0.6) / 0.4));
      ctx.fillText(`${seg.dv.toFixed(2)} km/s`, LEFT + barW + 6, y + BAR_H / 2);
      ctx.globalAlpha = 1;
    });

    heroVignette(ctx, W / 2, H / 2);
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
  class="wf-canvas"
></canvas>

<style>
  .wf-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
