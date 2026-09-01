<!--
  EntryRangeCanvas — the canvas "hero" for the entry-range-control figure (v0.9, systems). The
  range-control FOOTPRINT: the band of landing ranges the capsule can reach (lift-down short + high-g
  → lift-up far + low-g), the peak-g each range costs (the trade), the operator's target, and the
  bank the computer solved to hit it. Verdict-coloured amber when the target is out of the footprint.
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

  type EntryRange = Extract<FigureSpec, { kind: 'entry-range' }>;
  type Props = {
    figure: EntryRange;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const PAD = { left: 44, right: 16, top: 40, bottom: 40 };
  const px0 = PAD.left;
  const px1 = W - PAD.right;
  const py0 = PAD.top;
  const py1 = H - PAD.bottom;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Range control · ${provenanceText}`);

  const rgb = $derived(figure.reachable ? '78,205,196' : '232,162,74');

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const fp = figure.footprint;
    if (fp.length < 2) {
      heroVignette(ctx, W / 2, H / 2);
      drawHonestyLine(ctx, provenanceText, assumptionsText);
      return;
    }
    // Range axis spans the footprint (+ the target if it sits outside), with a small margin.
    const rLo = Math.min(figure.footLoKm, figure.targetKm) * 0.97;
    const rHi = Math.max(figure.footHiKm, figure.targetKm) * 1.03;
    const gMax = Math.max(...fp.map((p) => p.peakG), figure.solvedPeakG, 12) * 1.05;
    const xOf = (r: number): number => px0 + ((r - rLo) / (rHi - rLo)) * (px1 - px0);
    const yOf = (g: number): number => py1 - (g / gMax) * (py1 - py0);

    // Reachable band on the baseline (footLo → footHi).
    ctx.fillStyle = 'rgba(78,205,196,0.10)';
    ctx.fillRect(xOf(figure.footLoKm), py0, xOf(figure.footHiKm) - xOf(figure.footLoKm), py1 - py0);

    // Range axis + ticks.
    ctx.strokeStyle = 'rgba(120,235,225,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, py1);
    ctx.lineTo(px1, py1);
    ctx.stroke();
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(78,205,196,0.45)';
    ctx.textAlign = 'center';
    const tickStep = 500;
    for (let r = Math.ceil(rLo / tickStep) * tickStep; r <= rHi; r += tickStep) {
      ctx.fillText(`${r}`, xOf(r), py1 + 12);
    }
    ctx.fillText('downrange (km)', (px0 + px1) / 2, H - 16);
    // g axis label.
    ctx.save();
    ctx.translate(13, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('peak-g', 0, 0);
    ctx.restore();

    // The footprint trade curve: peak-g vs range, drawn-in over `progress`, filled beneath.
    const upto = Math.max(2, Math.floor(fp.length * progress));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xOf(fp[0].rangeKm), py1);
    for (let i = 0; i < upto; i += 1) ctx.lineTo(xOf(fp[i].rangeKm), yOf(fp[i].peakG));
    ctx.lineTo(xOf(fp[Math.min(upto, fp.length) - 1].rangeKm), py1);
    ctx.closePath();
    const grad = ctx.createLinearGradient(px0, 0, px1, 0);
    grad.addColorStop(0, 'rgba(210,70,50,0.28)'); // short range = high g (red)
    grad.addColorStop(1, 'rgba(78,205,196,0.20)'); // long range = low g (cyan)
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
    // The curve line on top.
    ctx.strokeStyle = 'rgba(120,235,225,0.9)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < upto; i += 1) {
      const x = xOf(fp[i].rangeKm);
      const y = yOf(fp[i].peakG);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Target range: a vertical guide.
    const tx = xOf(figure.targetKm);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(tx, py0);
    ctx.lineTo(tx, py1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('target', tx, py0 - 4);

    // The solved landing point (where the computer put it) — glowing.
    const sx = xOf(figure.solvedRangeKm);
    const sy = yOf(figure.solvedPeakG);
    heroGlow(ctx, sx, sy, 10, rgb, 0.7);
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Readouts (top-left): the solved bank + L/D.
    ctx.textAlign = 'left';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(120,235,225,0.85)';
    ctx.fillText(`L/D ${figure.liftToDrag.toFixed(2)}`, px0 + 4, py0 + 4);
    ctx.fillText(`bank ${figure.bankDeg.toFixed(0)}°`, px0 + 4, py0 + 15);

    // Verdict headline.
    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = `rgb(${rgb})`;
    const msg = figure.reachable
      ? `steered to ${figure.solvedRangeKm.toFixed(0)} km at ${figure.solvedPeakG.toFixed(1)} g`
      : `target out of footprint → clamped to ${figure.solvedRangeKm.toFixed(0)} km`;
    ctx.fillText(msg, W / 2, py0 - 20);

    heroVignette(ctx, W / 2, H / 2);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 1.4 });
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
  class="er-canvas"
></canvas>

<style>
  .er-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
