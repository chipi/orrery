<!--
  LaunchWindowCanvas — the hero for the launch-window (synodic) figure. Two coplanar circular
  orbits round the Sun, the departure planet, the target at the REQUIRED lead angle for a Hohmann
  arrival, and the transfer half-ellipse. The synodic period (readout) is how often that geometry
  recurs — why launches have windows. English canvas copy, matching the other Lab heroes.
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

  type LW = Extract<FigureSpec, { kind: 'launch-window' }>;
  type Props = {
    figure: LW;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = 168;
  const cy = 162;
  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Launch window · ${provenanceText}`);

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  const TEAL = '78,205,196';
  const GOLD = '255,200,80';
  const departR = $derived(figure.departInner ? figure.innerDrawR : figure.outerDrawR);
  const arriveR = $derived(figure.departInner ? figure.outerDrawR : figure.innerDrawR);

  // angles (canvas y-down): depart at bottom (90° visual), CCW positive downward-left.
  const departAng = Math.PI / 2; // pointing down (bottom of orbit)
  const arriveAng = $derived(departAng - (figure.requiredPhaseDeg * Math.PI) / 180);
  const pos = (ang: number, r: number): [number, number] => [
    cx + r * Math.cos(ang),
    cy + r * Math.sin(ang),
  ];

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    // orbits
    ctx.strokeStyle = `rgba(${TEAL},0.25)`;
    ctx.lineWidth = 1;
    for (const r of [figure.innerDrawR, figure.outerDrawR]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Sun
    heroGlow(ctx, cx, cy, 22, GOLD, 0.7);
    ctx.fillStyle = `rgb(${GOLD})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    // transfer half-ellipse: periapsis at depart (bottom), apoapsis at arrival (top of arrive orbit)
    const A = (departR + arriveR) / 2;
    const B = Math.sqrt(departR * arriveR);
    const ecx = cx;
    const ecy = cy + departR - A; // ellipse centre on the vertical axis
    ctx.save();
    ctx.strokeStyle = `rgba(${TEAL},0.85)`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    // draw the right half (from bottom periapsis CCW to top apoapsis)
    const seg = Math.max(2, Math.floor(48 * progress));
    for (let i = 0; i <= seg; i += 1) {
      const th = Math.PI / 2 - (i / 48) * Math.PI; // 90°→ -90°
      const x = ecx + B * Math.cos(th);
      const y = ecy + A * Math.sin(th);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // phase-angle wedge between the two planet radii
    ctx.fillStyle = `rgba(${GOLD},0.14)`;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 34, departAng, arriveAng, true);
    ctx.closePath();
    ctx.fill();

    // arrival point (faint) at top of arrive orbit
    const [ax, ay] = pos(-Math.PI / 2, arriveR);
    ctx.strokeStyle = `rgba(${TEAL},0.5)`;
    ctx.beginPath();
    ctx.arc(ax, ay, 3, 0, Math.PI * 2);
    ctx.stroke();

    // planets
    const [dx, dy] = pos(departAng, departR);
    const [tx, ty] = pos(arriveAng, arriveR);
    heroGlow(ctx, dx, dy, 10, TEAL, 0.6);
    ctx.fillStyle = `rgb(${TEAL})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(${GOLD})`;
    ctx.beginPath();
    ctx.arc(tx, ty, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // labels
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${TEAL},0.9)`;
    ctx.fillText(t(figure.departLabelKey), dx, dy + 16);
    ctx.fillStyle = `rgba(${GOLD},0.95)`;
    ctx.fillText(t(figure.arriveLabelKey), tx, ty - 9);

    // readouts (right)
    ctx.textAlign = 'left';
    const rx = 330;
    ctx.fillStyle = `rgba(${TEAL},0.85)`;
    ctx.font = "700 10px 'Space Mono', monospace";
    ctx.fillText('LAUNCH WINDOW', rx, 90);
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(200,222,235,0.8)';
    ctx.fillText(`phase angle  ${figure.requiredPhaseDeg.toFixed(0)}°`, rx, 112);
    ctx.fillText(`synodic  ${figure.synodicDays.toFixed(0)} d`, rx, 128);
    ctx.fillText(`transfer  ${figure.transferDays.toFixed(0)} d`, rx, 144);
    ctx.fillStyle = `rgba(${GOLD},0.85)`;
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillText('a window opens', rx, 168);
    ctx.fillText(`every ${figure.synodicDays.toFixed(0)} days`, rx, 180);

    heroVignette(ctx, W / 2, H / 2);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 1.3 });
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
  class="lw-canvas"
></canvas>

<style>
  .lw-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
