<!--
  OrbitDiagramCanvas — the canvas "hero" for the orbit-shell figure (v0.9 phase 2, G10 "choose
  an orbit"). Draws the body TO SCALE with the satellite's orbit ring at the chosen altitude and
  a faint dashed reference ring at the stationary orbit (geostationary), so LEO visibly hugs the
  body while GEO sits far out — the spatial intuition a period-vs-altitude curve can't give.
  Period + speed ride as readouts, so it needs no extra i18n.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel, TEAL } from './figure-style';
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

  type OrbitFig = Extract<FigureSpec, { kind: 'orbit' }>;
  type Props = {
    figure: OrbitFig;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = W / 2;
  const cy = (H - 24) / 2;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Orbit diagram · ${provenanceText}`);

  const palette = $derived.by(() => {
    const id = figure.bodyLabelKey.split('.').pop() ?? '';
    return BODY_PALETTE[id] ?? { core: '#dffcfa', bright: '#7fe0ff', glowRGB: '90,190,255' };
  });

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, cy);

    const rBody = figure.bodyRadiusKm;
    const rOrbit = rBody + figure.altitudeKm;
    const rRef = figure.refAltitudeKm ? rBody + figure.refAltitudeKm : 0;
    const viewMaxKm = Math.max(rOrbit, rRef) * 1.14;
    const maxPx = Math.min(W, H - 40) / 2 - 6;
    const s = maxPx / viewMaxKm; // px per km
    const bodyPx = rBody * s;
    const orbitPx = rOrbit * s;
    const refPx = rRef * s;

    // Reference (stationary) ring — faint dashed.
    if (refPx > 0) {
      ctx.strokeStyle = 'rgba(255,200,80,0.34)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, refPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,200,80,0.7)';
      ctx.font = "7px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('stationary', cx, cy - refPx - 4);
    }

    // Satellite orbit ring — teal, with a glow, drawn as an arc growing to `progress`.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(78,205,196,0.28)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitPx, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitPx, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();

    // Body — glow + palette core, drawn to scale.
    heroGlow(ctx, cx, cy, bodyPx + 16, palette.glowRGB, 0.32);
    const grad = ctx.createRadialGradient(
      cx - bodyPx * 0.3,
      cy - bodyPx * 0.3,
      bodyPx * 0.1,
      cx,
      cy,
      bodyPx,
    );
    grad.addColorStop(0, palette.bright);
    grad.addColorStop(1, palette.core);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, bodyPx), 0, Math.PI * 2);
    ctx.fill();

    // Satellite dot riding the leading edge of the drawn arc.
    const ang = -Math.PI / 2 + Math.PI * 2 * progress;
    const sx = cx + orbitPx * Math.cos(ang);
    const sy = cy + orbitPx * Math.sin(ang);
    heroGlow(ctx, sx, sy, 10, '78,205,196', 0.6);
    ctx.fillStyle = '#eafffb';
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Body label under the body.
    ctx.fillStyle = 'rgba(78,205,196,0.85)';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(t(figure.bodyLabelKey), cx, cy + Math.max(3, bodyPx) + 12);

    // Readouts — altitude / period / speed, top-left (values, no i18n text).
    ctx.textAlign = 'left';
    ctx.font = "9px 'Space Mono', monospace";
    const lines = [
      `alt   ${Math.round(figure.altitudeKm).toLocaleString()} km`,
      `period ${figure.periodMin < 600 ? figure.periodMin.toFixed(0) + ' min' : (figure.periodMin / 60).toFixed(1) + ' h'}`,
      `speed ${figure.speedKms.toFixed(2)} km/s`,
    ];
    lines.forEach((ln, i) => {
      ctx.fillStyle = 'rgba(78,205,196,0.82)';
      ctx.fillText(ln, 12, 22 + i * 13);
    });

    heroVignette(ctx, cx, cy);
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
  class="ob-canvas"
></canvas>

<style>
  .ob-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
