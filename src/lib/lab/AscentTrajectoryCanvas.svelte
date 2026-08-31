<!--
  AscentTrajectoryCanvas — the canvas "hero" for the ascent-trajectory figure (v0.9 phase 2,
  reach-orbit). The real gravity-turn from the kernel's ascent integrator: the flight path
  (downrange × altitude) coloured by active stage, the mission beats (liftoff, Max-Q, staging,
  MECO/SECO, orbit), the Kármán line + target-orbit reference, and the Δv loss ledger
  (gravity + drag + steering) that is the whole reason orbit costs ~9.4 km/s. Verdict-coloured
  when the stack falls short of orbit.
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

  type AscentTraj = Extract<FigureSpec, { kind: 'ascent-trajectory' }>;
  type Props = {
    figure: AscentTraj;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const PAD = { left: 34, right: 14, top: 40, bottom: 26 };
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
    ariaLabelKey ? t(ariaLabelKey) : `Ascent trajectory · ${provenanceText}`,
  );

  const stageColor = (stage: number): string =>
    stage <= 0 ? '255,150,60' : stage === 1 ? '78,205,196' : '150,170,200';

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const pts = figure.points;
    if (pts.length < 2) return;
    const maxX = Math.max(...pts.map((p) => p.x), 10);
    const maxY = Math.max(...pts.map((p) => p.y), figure.orbitAltKm, 100) * 1.08;
    const xToPx = (x: number): number => px0 + (x / maxX) * (px1 - px0);
    const yToPx = (y: number): number => py1 - (y / maxY) * (py1 - py0);

    // Kármán line (100 km) + target-orbit reference.
    for (const [alt, label, rgb] of [
      [100, 'Kármán 100 km', '120,235,225'],
      [figure.orbitAltKm, `target ${figure.orbitAltKm.toFixed(0)} km`, '255,200,80'],
    ] as [number, string, string][]) {
      const y = yToPx(alt);
      ctx.strokeStyle = `rgba(${rgb},0.3)`;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px0, y);
      ctx.lineTo(px1, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(${rgb},0.6)`;
      ctx.font = "7px 'Space Mono', monospace";
      ctx.textAlign = 'right';
      ctx.fillText(label, px1 - 2, y - 3);
    }

    // Earth surface baseline.
    ctx.strokeStyle = 'rgba(120,235,225,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, py1);
    ctx.lineTo(px1, py1);
    ctx.stroke();

    // Flight path — revealed to `progress`, coloured by active stage, with a glow.
    const upto = Math.max(1, Math.floor(pts.length * progress));
    for (let i = 1; i < upto; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      const rgb = stageColor(b.stage);
      ctx.strokeStyle = `rgb(${rgb})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xToPx(a.x), yToPx(a.y));
      ctx.lineTo(xToPx(b.x), yToPx(b.y));
      ctx.stroke();
    }
    // leading dot
    const head = pts[Math.min(upto, pts.length - 1)];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(
      xToPx(head.x),
      yToPx(head.y),
      0,
      xToPx(head.x),
      yToPx(head.y),
      9,
    );
    g.addColorStop(0, `rgba(${stageColor(head.stage)},0.7)`);
    g.addColorStop(1, `rgba(${stageColor(head.stage)},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(xToPx(head.x), yToPx(head.y), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Event beats.
    if (progress > 0.85) {
      ctx.font = "7px 'Space Mono', monospace";
      for (const ev of figure.events) {
        const ex = xToPx(ev.x);
        const ey = yToPx(ev.y);
        ctx.fillStyle = 'rgba(230,255,251,0.9)';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fill();
        const label = ev.type.replace(/_/g, '-');
        ctx.fillStyle = 'rgba(200,215,225,0.75)';
        ctx.textAlign = ev.x > maxX * 0.7 ? 'right' : 'left';
        ctx.fillText(label, ex + (ev.x > maxX * 0.7 ? -5 : 5), ey - 4);
      }
    }

    // Axis ticks.
    ctx.fillStyle = 'rgba(78,205,196,0.55)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(`downrange → ${maxX.toFixed(0)} km`, (px0 + px1) / 2, py1 + 14);
    ctx.save();
    ctx.translate(10, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('altitude (km)', 0, 0);
    ctx.restore();

    // ── Loss ledger (top) — orbital speed + the three taxes = ideal Δv ──
    const orbit = figure.targetSpeedKms;
    const segs: [string, number, string][] = [
      ['orbit', orbit, '78,205,196'],
      ['gravity', figure.losses.gravityKms, '255,150,60'],
      ['drag', figure.losses.dragKms, '210,70,50'],
      ['steer', figure.losses.steeringKms, '255,200,80'],
    ];
    const total = segs.reduce((a, s) => a + s[1], 0);
    let lx = px0;
    const lw = px1 - px0;
    const ly = 12;
    for (const [lab, v, rgb] of segs) {
      const w = (v / total) * lw * Math.min(1, progress * 1.2);
      ctx.fillStyle = `rgba(${rgb},0.85)`;
      ctx.fillRect(lx, ly, Math.max(0, w), 8);
      if (w > 22) {
        ctx.fillStyle = '#06121a';
        ctx.font = "6.5px 'Space Mono', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(lab, lx + 2, ly + 6);
      }
      lx += w;
    }
    ctx.fillStyle = 'rgba(230,255,251,0.9)';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(
      `Δv needed ${total.toFixed(2)} km/s = ${orbit.toFixed(1)} orbit + ${(figure.losses.gravityKms + figure.losses.dragKms + figure.losses.steeringKms).toFixed(2)} losses`,
      px0,
      ly - 3,
    );

    // Verdict.
    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = figure.reachedOrbit ? 'rgb(78,205,196)' : 'rgb(210,70,50)';
    ctx.fillText(
      figure.reachedOrbit
        ? `IN ORBIT — ${figure.finalSpeedKms.toFixed(2)} km/s at ${figure.orbitAltKm.toFixed(0)} km`
        : `FELL SHORT — only ${figure.finalSpeedKms.toFixed(2)} of ${figure.targetSpeedKms.toFixed(2)} km/s`,
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
  class="at-canvas"
></canvas>

<style>
  .at-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
