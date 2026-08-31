<!--
  CislunarEciCanvas — the canvas "hero" for the cislunar-eci figure (v0.9 phase 2, M2). The
  Earth→Moon trans-lunar transfer in the Earth-centred-inertial frame: Earth + LEO parking orbit,
  the Moon's orbit, and the minimum-energy Hohmann coast half-ellipse from LEO perigee (TLI) to
  the Moon at apogee (LOI). Shows the Moon's lead — where it was at departure vs where you meet
  it — because it travels ~59° during the ~5-day coast. TLI/LOI Δv from the kernel's geo-Lambert.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel, GOLD } from './figure-style';
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

  type CislunarEci = Extract<FigureSpec, { kind: 'cislunar-eci' }>;
  type Props = {
    figure: CislunarEci;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = W / 2;
  const cy = H / 2 + 6;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(
    ariaLabelKey ? t(ariaLabelKey) : `Cislunar transfer · ${provenanceText}`,
  );

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, cy);

    const rLeo = figure.leoRadiusKm;
    const moonDist = figure.moonDistanceKm;
    const s = (Math.min(W, H) / 2 - 30) / (moonDist * 1.12); // px per km

    // Transfer half-ellipse: perigee = LEO (bottom, near Earth), apogee = Moon (top).
    const a = (rLeo + moonDist) / 2;
    const c = a - rLeo;
    const b = Math.sqrt(rLeo * moonDist);
    const rot = -Math.PI / 2; // apogee (−x in the ellipse frame) → up
    const pt = (E: number): { x: number; y: number } => {
      const xc = a * Math.cos(E) - c;
      const yc = b * Math.sin(E);
      const xr = xc * Math.cos(rot) - yc * Math.sin(rot);
      const yr = xc * Math.sin(rot) + yc * Math.cos(rot);
      return { x: cx + xr * s, y: cy - yr * s };
    };

    // Moon's orbit.
    ctx.strokeStyle = 'rgba(120,235,225,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, moonDist * s, 0, Math.PI * 2);
    ctx.stroke();

    // Moon arrival (top) + departure (behind by its travel), with the travel arc.
    const arrAng = -Math.PI / 2; // up (canvas)
    const depAng = arrAng + (figure.moonTravelDeg * Math.PI) / 180; // it was clockwise-behind
    const moonR = moonDist * s;
    const arr = { x: cx + moonR * Math.cos(arrAng), y: cy + moonR * Math.sin(arrAng) };
    const dep = { x: cx + moonR * Math.cos(depAng), y: cy + moonR * Math.sin(depAng) };
    // travel arc
    ctx.strokeStyle = 'rgba(200,210,235,0.3)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, moonR, arrAng, depAng);
    ctx.stroke();
    ctx.setLineDash([]);
    // departure Moon (faint)
    ctx.fillStyle = 'rgba(180,190,210,0.4)';
    ctx.beginPath();
    ctx.arc(dep.x, dep.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,190,210,0.55)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('Moon at launch', dep.x, dep.y - 9);

    // Transfer coast, revealed perigee→apogee.
    const nSeg = 80;
    const upto = Math.max(1, Math.floor(nSeg * progress));
    const strokeArc = (): void => {
      ctx.beginPath();
      for (let i = 0; i <= upto; i += 1) {
        const p = pt((i / nSeg) * Math.PI);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
    };
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(78,205,196,0.35)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    strokeArc();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 2;
    strokeArc();
    ctx.stroke();

    // Earth + LEO parking ring.
    heroGlow(ctx, cx, cy, 22, '90,190,255', 0.34);
    ctx.fillStyle = '#3aa0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, figure.earthRadiusKm * s), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,235,225,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(7, rLeo * s), 0, Math.PI * 2);
    ctx.stroke();

    // TLI burn (perigee) + LOI (Moon arrival) markers.
    const peri = pt(0);
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(peri.x, peri.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,200,80,0.9)';
    ctx.fillText('TLI', peri.x + 6, peri.y + 3);

    // arrival Moon (bright) + LOI
    if (progress > 0.9) {
      heroGlow(ctx, arr.x, arr.y, 10, '210,225,255', 0.6);
      ctx.fillStyle = '#eef2ff';
      ctx.beginPath();
      ctx.arc(arr.x, arr.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,200,80,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('LOI', arr.x, arr.y - 11);
    }

    // Readouts.
    ctx.textAlign = 'left';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(120,235,225,0.85)';
    ctx.fillText(`TLI ${figure.tliKms.toFixed(2)} km/s`, 12, 20);
    ctx.fillText(`LOI ${figure.loiKms.toFixed(2)} km/s`, 12, 32);
    ctx.fillText(`coast ${figure.tofDays.toFixed(1)} d`, 12, 44);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,210,235,0.8)';
    ctx.fillText(`Moon leads ${figure.moonTravelDeg.toFixed(0)}°`, W - 12, 20);
    ctx.fillStyle = '#eafffb';
    ctx.fillText(`total ${(figure.tliKms + figure.loiKms).toFixed(2)} km/s`, W - 12, 32);

    heroVignette(ctx, cx, cy);
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
  class="ci-canvas"
></canvas>

<style>
  .ci-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
