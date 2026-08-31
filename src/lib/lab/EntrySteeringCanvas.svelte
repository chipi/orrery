<!--
  EntrySteeringCanvas — the canvas "hero" for the entry-steering figure (v0.9 phase 2, systems).
  Two things: (1) the corridor-width comparison — the survivable entry-angle band for a ballistic
  capsule (narrow) vs a lifting, bank-steered one (wide) — the payoff of the ballistic
  entry-corridor lesson; and (2) the representative lifting-entry trajectory (altitude × speed)
  the bank controller flies to capture. Verdict-coloured when the chosen entry is lost.
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

  type EntrySteering = Extract<FigureSpec, { kind: 'entry-steering' }>;
  type Props = {
    figure: EntrySteering;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  // Corridor bar occupies the top strip; the trajectory plot the rest.
  const barY = 48;
  const barH = 12;
  const PAD = { left: 40, right: 14, top: 70, bottom: 28 };
  const px0 = PAD.left;
  const px1 = W - PAD.right;
  const py0 = PAD.top;
  const py1 = H - PAD.bottom;
  const A_LO = 3;
  const A_HI = 9;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Entry steering · ${provenanceText}`);

  const rgb = $derived(figure.captured ? '78,205,196' : '210,70,50');

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    // ── Corridor comparison (top) — survivable entry-angle band, ballistic vs lifting ──
    const aToX = (a: number): number => px0 + ((a - A_LO) / (A_HI - A_LO)) * (px1 - px0);
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(78,205,196,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('survivable entry angle', px0, barY - 14);
    // axis ticks
    ctx.fillStyle = 'rgba(78,205,196,0.4)';
    ctx.textAlign = 'center';
    for (let a = A_LO; a <= A_HI; a += 1) {
      ctx.fillText(`${a}°`, aToX(a), barY + barH + 26);
      ctx.strokeStyle = 'rgba(78,205,196,0.12)';
      ctx.beginPath();
      ctx.moveTo(aToX(a), barY);
      ctx.lineTo(aToX(a), barY + barH + 15);
      ctx.stroke();
    }
    // ballistic band (row 1) + lifting band (row 2)
    const rev = Math.min(1, progress * 1.4);
    const drawBand = (y: number, lo: number, hi: number, col: string, label: string): void => {
      if (hi > lo) {
        ctx.fillStyle = `rgba(${col},0.85)`;
        ctx.fillRect(aToX(lo), y, (aToX(hi) - aToX(lo)) * rev, barH);
      }
      ctx.fillStyle = `rgba(${col},0.9)`;
      ctx.textAlign = 'right';
      ctx.fillText(label, px0 - 3, y + barH - 2);
    };
    drawBand(barY, figure.ballShallowDeg, figure.ballSteepDeg, '200,180,120', 'ballistic');
    drawBand(barY + barH + 2, figure.liftShallowDeg, figure.liftSteepDeg, '78,205,196', 'lifting');
    // chosen entry angle marker
    const mx = aToX(figure.entryAngleDeg);
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, barY - 4);
    ctx.lineTo(mx, barY + barH * 2 + 4);
    ctx.stroke();

    // ── Trajectory plot (altitude × speed) ──
    const traj = figure.trajectory;
    if (traj.length > 1) {
      const maxSpd = Math.max(...traj.map((p) => p.speedKms), 11) * 1.03;
      const maxAlt = Math.max(...traj.map((p) => p.altKm), 122) * 1.03;
      const xToPx = (s: number): number => px0 + (s / maxSpd) * (px1 - px0);
      const yToPx = (al: number): number => py1 - (al / maxAlt) * (py1 - py0);
      // ground + entry-interface refs
      ctx.strokeStyle = 'rgba(120,235,225,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px0, py1);
      ctx.lineTo(px1, py1);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,235,225,0.5)';
      ctx.textAlign = 'left';
      ctx.fillText('surface', px0 + 2, py1 - 3);

      const upto = Math.max(2, Math.floor(traj.length * progress));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${rgb},0.3)`;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < upto; i += 1) {
        const p = traj[i];
        if (i === 0) ctx.moveTo(xToPx(p.speedKms), yToPx(p.altKm));
        else ctx.lineTo(xToPx(p.speedKms), yToPx(p.altKm));
      }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < upto; i += 1) {
        const p = traj[i];
        if (i === 0) ctx.moveTo(xToPx(p.speedKms), yToPx(p.altKm));
        else ctx.lineTo(xToPx(p.speedKms), yToPx(p.altKm));
      }
      ctx.stroke();
      const head = traj[Math.min(upto, traj.length) - 1];
      heroGlow(ctx, xToPx(head.speedKms), yToPx(head.altKm), 9, rgb, 0.6);

      ctx.fillStyle = 'rgba(78,205,196,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(`speed → ${maxSpd.toFixed(0)} km/s`, (px0 + px1) / 2, py1 + 14);
      ctx.save();
      ctx.translate(11, (py0 + py1) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('altitude (km)', 0, 0);
      ctx.restore();
    }

    // Readouts.
    ctx.textAlign = 'left';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(120,235,225,0.85)';
    ctx.fillText(`L/D ${figure.liftToDrag.toFixed(2)}`, px0 + 4, py0 + 4);
    ctx.fillText(`peak ${figure.peakGeeAtEntry.toFixed(1)} g`, px0 + 4, py0 + 15);

    // Verdict — the corridor-widening headline.
    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgb(78,205,196)';
    const factor =
      figure.ballWidthDeg > 0 ? (figure.liftWidthDeg / figure.ballWidthDeg).toFixed(1) : '∞';
    ctx.fillText(
      `lift widens the corridor: ${figure.liftWidthDeg.toFixed(2)}° vs ${figure.ballWidthDeg.toFixed(2)}° ballistic (${factor}×)`,
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
  class="es-canvas"
></canvas>

<style>
  .es-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
