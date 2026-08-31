<!--
  GuidanceTimelineCanvas — the canvas "hero" for the guidance-timeline figure (v0.9 phase 2,
  systems). The flight computer's commanded pitch γ over the burn: an OPEN-loop pre-planned
  pitch table in the atmosphere (orange) handing off to CLOSED-loop PEG (teal) above ~55 km,
  which LOFTS the arc — commanding the nose below the horizon (γ < 0) to trade altitude for
  speed. The horizon (γ=0) is emphasised; the sub-horizon loft is shaded; the handoff is marked.
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
    drawHonestyLine,
    heroDrawIn,
  } from './hero-canvas';

  type GuidanceTimeline = Extract<FigureSpec, { kind: 'guidance-timeline' }>;
  type Props = {
    figure: GuidanceTimeline;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const PAD = { left: 40, right: 14, top: 20, bottom: 30 };
  const px0 = PAD.left;
  const px1 = W - PAD.right;
  const py0 = PAD.top;
  const py1 = H - PAD.bottom;
  const OPEN = '255,150,60';
  const CLOSED = '78,205,196';

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(
    ariaLabelKey ? t(ariaLabelKey) : `Guidance timeline · ${provenanceText}`,
  );

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const smp = figure.samples;
    if (smp.length < 2) return;
    const maxT = figure.burnTimeS || Math.max(...smp.map((s) => s.t), 1);
    const yMin = Math.min(figure.minPitchDeg, -5) - 5;
    const yMax = 92;
    const xToPx = (tt: number): number => px0 + (tt / maxT) * (px1 - px0);
    const yToPx = (d: number): number => py1 - ((d - yMin) / (yMax - yMin)) * (py1 - py0);

    // Pitch gridlines + labels (90 up, 0 horizon, negatives lofted).
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'right';
    for (const d of [90, 45, 0, Math.round(yMin + 5)]) {
      if (d > yMax || d < yMin) continue;
      const y = yToPx(d);
      ctx.strokeStyle = d === 0 ? 'rgba(230,255,251,0.4)' : 'rgba(78,205,196,0.12)';
      ctx.lineWidth = d === 0 ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(px0, y);
      ctx.lineTo(px1, y);
      ctx.stroke();
      ctx.fillStyle = d === 0 ? 'rgba(230,255,251,0.7)' : 'rgba(78,205,196,0.5)';
      ctx.fillText(`${d}°`, px0 - 3, y + 3);
    }
    // horizon label
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(230,255,251,0.55)';
    ctx.fillText('horizon (γ=0)', px0 + 3, yToPx(0) - 3);

    // Sub-horizon loft shading (γ < 0 — the PEG trade).
    const zeroY = yToPx(0);
    ctx.fillStyle = 'rgba(255,150,60,0.06)';
    ctx.fillRect(px0, zeroY, px1 - px0, py1 - zeroY);

    // Handoff marker (open → closed).
    const hx = xToPx(figure.handoffTimeS);
    ctx.strokeStyle = 'rgba(230,255,251,0.35)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(hx, py0);
    ctx.lineTo(hx, py1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(230,255,251,0.65)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('computer takes over', hx, py0 + 9);

    // The commanded-pitch curve, revealed to `progress`, coloured by regime.
    const upto = Math.max(1, Math.floor(smp.length * progress));
    ctx.lineWidth = 2;
    for (let i = 1; i < upto; i += 1) {
      const a = smp[i - 1];
      const b = smp[i];
      const rgb = b.closedLoop ? CLOSED : OPEN;
      // glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${rgb},0.3)`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(xToPx(a.t), yToPx(a.pitchDeg));
      ctx.lineTo(xToPx(b.t), yToPx(b.pitchDeg));
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xToPx(a.t), yToPx(a.pitchDeg));
      ctx.lineTo(xToPx(b.t), yToPx(b.pitchDeg));
      ctx.stroke();
    }

    // Event beats along the curve.
    if (progress > 0.85) {
      ctx.font = "6.5px 'Space Mono', monospace";
      for (const ev of figure.events) {
        const ex = xToPx(ev.t);
        const ey = yToPx(ev.pitchDeg);
        ctx.fillStyle = 'rgba(230,255,251,0.85)';
        ctx.beginPath();
        ctx.arc(ex, ey, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,215,225,0.7)';
        ctx.textAlign = 'left';
        ctx.fillText(ev.type.replace(/_/g, '-'), ex + 4, ey + 8);
      }
    }

    // Legend + axis label.
    ctx.textAlign = 'left';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillStyle = `rgb(${OPEN})`;
    ctx.fillText('■ open-loop pitch table', px0, py0 + 2);
    ctx.fillStyle = `rgb(${CLOSED})`;
    ctx.fillText('■ closed-loop PEG', px0 + 118, py0 + 2);
    ctx.fillStyle = 'rgba(78,205,196,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(`time → ${maxT.toFixed(0)} s`, (px0 + px1) / 2, py1 + 14);
    ctx.save();
    ctx.translate(11, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('commanded pitch (° above horizon)', 0, 0);
    ctx.restore();

    // Verdict / readout.
    ctx.textAlign = 'center';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = figure.minPitchDeg < 0 ? `rgb(${CLOSED})` : 'rgba(230,255,251,0.85)';
    ctx.fillText(
      figure.minPitchDeg < 0
        ? `PEG lofts to ${figure.minPitchDeg.toFixed(0)}° below horizon — trading altitude for speed`
        : 'guidance holds above horizon',
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
  class="gd-canvas"
></canvas>

<style>
  .gd-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
