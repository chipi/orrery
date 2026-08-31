<!--
  SkyChartCanvas — the canvas "hero" for the sky-chart figure (v0.9 phase 2, G7 "observe the
  sky"). A dusk sky-dome: the Sun on the horizon (west for an evening star, east for a morning
  star) and the planet its elongation ε along the dome. Honest schematic — the arc IS the
  Sun-separation ε and the SIDE of the sky is real; it does not claim an exact altitude (the
  ecliptic tilt makes the true altitude ≤ ε), which the label states. Inner planets get the
  dashed cap arc at their maximum elongation.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel } from './figure-style';
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

  type SkyChart = Extract<FigureSpec, { kind: 'sky-chart' }>;
  type Props = {
    figure: SkyChart;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const horizonY = H * 0.72;
  const cx = W / 2;
  const R = Math.min(W * 0.42, horizonY - 18);

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Sky chart · ${provenanceText}`);

  const planetColor = $derived.by(() => {
    const id = figure.planetLabelKey.split('.').pop() ?? '';
    return BODY_PALETTE[id]?.bright ?? '#dfe7ff';
  });
  const planetGlow = $derived.by(() => {
    const id = figure.planetLabelKey.split('.').pop() ?? '';
    return BODY_PALETTE[id]?.glowRGB ?? '200,210,255';
  });

  // Dome angle a: 0 = west horizon (left), 90 = zenith, 180 = east horizon (right).
  const domePt = (aDeg: number): { x: number; y: number } => {
    const a = (aDeg * Math.PI) / 180;
    return { x: cx - R * Math.cos(a), y: horizonY - R * Math.sin(a) };
  };

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, horizonY);

    // Dusk sky gradient inside the dome.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, horizonY, R, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const sky = ctx.createLinearGradient(0, horizonY - R, 0, horizonY);
    sky.addColorStop(0, '#060a1a');
    sky.addColorStop(0.7, '#1a1730');
    sky.addColorStop(1, '#3a2536');
    ctx.fillStyle = sky;
    ctx.fillRect(cx - R, horizonY - R, R * 2, R);
    ctx.restore();

    // Dome edge + horizon.
    ctx.strokeStyle = 'rgba(78,205,196,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, horizonY, R, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,235,225,0.4)';
    ctx.beginPath();
    ctx.moveTo(cx - R, horizonY);
    ctx.lineTo(cx + R, horizonY);
    ctx.stroke();

    // Compass hints.
    ctx.fillStyle = 'rgba(120,235,225,0.55)';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('W', cx - R + 8, horizonY - 5);
    ctx.fillText('E', cx + R - 8, horizonY - 5);

    const eps = figure.elongationDeg;
    const eastern = figure.eastern;
    // Sun on the horizon; planet ε up the dome on the same side of the sky.
    const sunA = eastern ? 0 : 180; // evening → Sun in the west; morning → Sun in the east
    const shownEps = eps * progress;
    const planetShownA = eastern ? shownEps : 180 - shownEps;

    // Inner-planet cap arc — the wall the elongation can never pass.
    if (figure.maxElongationDeg !== undefined) {
      const capA = eastern ? figure.maxElongationDeg : 180 - figure.maxElongationDeg;
      const cap = domePt(capA);
      ctx.strokeStyle = 'rgba(255,200,80,0.5)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - (eastern ? R : -R) * Math.cos(0), horizonY); // from the Sun's horizon point
      ctx.lineTo(cap.x, cap.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,200,80,0.7)';
      ctx.fillText(`max ${figure.maxElongationDeg.toFixed(0)}°`, cap.x, cap.y - 6);
    }

    // Elongation arc traced along the dome from Sun to planet — the "this far apart in the sky"
    // separation. domePt(a) sits at canvas angle (180 + a)°.
    ctx.strokeStyle = 'rgba(120,235,225,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const arcR = R * 0.9;
    const a0 = ((180 + sunA) * Math.PI) / 180;
    const a1 = ((180 + planetShownA) * Math.PI) / 180;
    ctx.arc(cx, horizonY, arcR, Math.min(a0, a1), Math.max(a0, a1));
    ctx.stroke();

    // Sun on the horizon.
    const sun = domePt(sunA);
    heroGlow(ctx, sun.x, sun.y, 26, '255,200,80', 0.6);
    ctx.fillStyle = '#fff2c8';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Planet.
    const pl = domePt(planetShownA);
    heroGlow(ctx, pl.x, pl.y, 12, planetGlow, 0.7);
    ctx.fillStyle = planetColor;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // ε label at the planet.
    if (progress > 0.6) {
      ctx.fillStyle = 'rgba(120,235,225,0.9)';
      ctx.textAlign = eastern ? 'left' : 'right';
      ctx.fillText(`${eps.toFixed(0)}°`, pl.x + (eastern ? 8 : -8), pl.y);
    }

    // Caption.
    ctx.textAlign = 'center';
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(232,235,255,0.9)';
    const star = eastern ? 'evening star (E of Sun)' : 'morning star (W of Sun)';
    ctx.fillText(`${t(figure.planetLabelKey)} · ${eps.toFixed(1)}° · ${star}`, cx, horizonY + 20);

    heroVignette(ctx, cx, horizonY);
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
  class="sc-canvas"
></canvas>

<style>
  .sc-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
