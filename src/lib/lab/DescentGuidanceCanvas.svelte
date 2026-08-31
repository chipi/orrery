<!--
  DescentGuidanceCanvas — the canvas "hero" for the descent-guidance figure (v0.9 phase 2,
  systems). The landing computer's phase portrait: altitude (up) vs speed (right). The dashed
  SCHEDULE line is the target the controller tracks (v = gain·altitude, easing to a crawl at the
  surface); the solid curve is the actual descent throttling to match it. A soft landing meets the
  ground near zero speed (teal); a fast arrival stays right of the schedule and hits hard (red).
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

  type DescentGuidance = Extract<FigureSpec, { kind: 'descent-guidance' }>;
  type Props = {
    figure: DescentGuidance;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const PAD = { left: 40, right: 16, top: 18, bottom: 28 };
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
  const ariaLabel = $derived(
    ariaLabelKey ? t(ariaLabelKey) : `Descent guidance · ${provenanceText}`,
  );

  const soft = $derived(figure.landedSoft);
  const rgb = $derived(soft ? '78,205,196' : '210,70,50');

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const smp = figure.samples;
    if (smp.length < 2) return;
    const maxAlt = Math.max(...smp.map((s) => s.altKm), 0.1);
    const maxSpd =
      Math.max(...smp.map((s) => s.speedMs), figure.scheduleGain * maxAlt * 1000, 10) * 1.05;
    const xToPx = (spd: number): number => px0 + (spd / maxSpd) * (px1 - px0);
    const yToPx = (alt: number): number => py1 - (alt / maxAlt) * (py1 - py0);

    // Ground.
    ctx.strokeStyle = 'rgba(120,235,225,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, py1);
    ctx.lineTo(px1, py1);
    ctx.stroke();
    ctx.fillStyle = 'rgba(120,235,225,0.5)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText('surface', px0 + 2, py1 - 3);

    // The schedule line the controller tracks: v = gain·altitude (dashed gold).
    ctx.strokeStyle = 'rgba(255,200,80,0.55)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xToPx(figure.terminalMs), yToPx(0));
    ctx.lineTo(xToPx(figure.scheduleGain * maxAlt * 1000), yToPx(maxAlt));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,200,80,0.75)';
    ctx.textAlign = 'right';
    ctx.fillText('target schedule (v = gain·h)', px1 - 2, yToPx(maxAlt) + 10);

    // Actual descent, revealed top→ground.
    const upto = Math.max(2, Math.floor(smp.length * progress));
    ctx.lineCap = 'round';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${rgb},0.32)`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < upto; i += 1) {
      const p = smp[i];
      const x = xToPx(p.speedMs);
      const y = yToPx(p.altKm);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < upto; i += 1) {
      const p = smp[i];
      const x = xToPx(p.speedMs);
      const y = yToPx(p.altKm);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Lander head + touchdown marker.
    const head = smp[Math.min(upto, smp.length) - 1];
    heroGlow(ctx, xToPx(head.speedMs), yToPx(head.altKm), 9, rgb, 0.6);
    if (progress > 0.95) {
      const td = smp[smp.length - 1];
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.beginPath();
      ctx.arc(xToPx(td.speedMs), yToPx(0), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Axes.
    ctx.fillStyle = 'rgba(78,205,196,0.55)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(`speed → ${maxSpd.toFixed(0)} m/s`, (px0 + px1) / 2, py1 + 14);
    ctx.save();
    ctx.translate(11, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`altitude (km) → ${maxAlt.toFixed(1)}`, 0, 0);
    ctx.restore();

    // Readouts.
    ctx.textAlign = 'left';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(120,235,225,0.85)';
    ctx.fillText(`${t(figure.bodyLabelKey)}`, px0 + 4, py0 + 2);
    ctx.fillText(`peak ${figure.peakDecelG.toFixed(1)} g`, px0 + 4, py0 + 13);
    ctx.fillText(`Δv ${figure.dvUsedMs.toFixed(0)} m/s`, px0 + 4, py0 + 24);

    // Verdict.
    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fillText(
      soft
        ? `SOFT LANDING — touchdown ${figure.touchdownMs.toFixed(1)} m/s`
        : `CRASH — hit at ${figure.touchdownMs.toFixed(0)} m/s`,
      W / 2,
      H - 30,
    );

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
  class="pd-canvas"
></canvas>

<style>
  .pd-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
