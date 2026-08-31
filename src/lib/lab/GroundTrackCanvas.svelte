<!--
  GroundTrackCanvas — the canvas "hero" for the ground-track figure (v0.9 phase 2, G9 "catch
  the ISS"). Draws the successive orbits as glowing sine tracks on an equirectangular graticule
  that marches west each lap. No continents: the longitudes are relative, so the honest content
  is the track SHAPE (sine capped at ±inclination), the westward march, and the ±inclination
  reach lines — not a geographic position. Longitude wraps to [-180,180] at the map seam.
-->
<script lang="ts">
  import type { FigureSpec, Vec2 } from '$lib/physics/spec';
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

  type GroundTrack = Extract<FigureSpec, { kind: 'ground-track' }>;
  type Props = {
    figure: GroundTrack;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const PAD = { left: 30, right: 12, top: 12, bottom: 30 };
  const x0 = PAD.left;
  const x1 = W - PAD.right;
  const y0 = PAD.top;
  const y1 = H - PAD.bottom;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Ground track · ${provenanceText}`);

  const lonToX = (lon: number): number => x0 + ((lon + 180) / 360) * (x1 - x0);
  const latToY = (lat: number): number => y0 + ((90 - lat) / 180) * (y1 - y0);
  const wrapLon = (lon: number): number => ((((lon + 180) % 360) + 360) % 360) - 180;

  // Draw one track as wrapped polylines, revealing up to `frac` of its points.
  function strokeTrack(ctx: CanvasRenderingContext2D, pts: Vec2[], frac: number): void {
    const n = Math.max(2, Math.floor(pts.length * frac));
    ctx.beginPath();
    let started = false;
    let prevX = 0;
    for (let i = 0; i < n; i += 1) {
      const lon = wrapLon(pts[i].x);
      const px = lonToX(lon);
      const py = latToY(pts[i].y);
      if (started && Math.abs(px - prevX) > (x1 - x0) / 2) started = false; // seam crossing → break
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      prevX = px;
    }
    ctx.stroke();
  }

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    // Map panel.
    ctx.fillStyle = 'rgba(10,20,32,0.55)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // Graticule — lon every 60°, lat every 30°.
    ctx.strokeStyle = 'rgba(78,205,196,0.12)';
    ctx.lineWidth = 1;
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(78,205,196,0.4)';
    ctx.textAlign = 'center';
    for (let lon = -180; lon <= 180; lon += 60) {
      const px = lonToX(lon);
      ctx.beginPath();
      ctx.moveTo(px, y0);
      ctx.lineTo(px, y1);
      ctx.stroke();
      ctx.fillText(`${lon}°`, px, y1 + 10);
    }
    ctx.textAlign = 'right';
    for (let lat = -90; lat <= 90; lat += 30) {
      const py = latToY(lat);
      ctx.beginPath();
      ctx.moveTo(x0, py);
      ctx.lineTo(x1, py);
      ctx.stroke();
      ctx.fillText(`${lat}°`, x0 - 4, py + 3);
    }

    // Equator emphasized.
    ctx.strokeStyle = 'rgba(78,205,196,0.3)';
    ctx.beginPath();
    ctx.moveTo(x0, latToY(0));
    ctx.lineTo(x1, latToY(0));
    ctx.stroke();

    // ±inclination reach lines — the latitude cap the orbit can touch.
    ctx.strokeStyle = 'rgba(255,200,80,0.4)';
    ctx.setLineDash([4, 4]);
    for (const lat of [figure.inclinationDeg, -figure.inclinationDeg]) {
      ctx.beginPath();
      ctx.moveTo(x0, latToY(lat));
      ctx.lineTo(x1, latToY(lat));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Tracks — orbit 0 brightest (this pass), later orbits fainter (the march). Clipped to map.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    ctx.lineCap = 'round';
    figure.tracks.forEach((pts, i) => {
      const alpha = i === 0 ? 1 : i === 1 ? 0.55 : 0.32;
      // glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(78,205,196,${0.28 * alpha})`;
      ctx.lineWidth = 5;
      strokeTrack(ctx, pts, progress);
      ctx.restore();
      // crisp
      ctx.strokeStyle = `rgba(120,235,225,${alpha})`;
      ctx.lineWidth = i === 0 ? 2 : 1.3;
      strokeTrack(ctx, pts, progress);
    });
    ctx.restore();

    // Satellite dot riding the head of orbit 0.
    const head = figure.tracks[0];
    if (head && head.length > 1) {
      const idx = Math.min(head.length - 1, Math.max(1, Math.floor(head.length * progress) - 1));
      const sx = lonToX(wrapLon(head[idx].x));
      const sy = latToY(head[idx].y);
      heroGlow(ctx, sx, sy, 9, '120,235,225', 0.6);
      ctx.fillStyle = '#eafffb';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Readouts.
    ctx.textAlign = 'left';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = GOLD;
    ctx.fillText(`incl ${figure.inclinationDeg.toFixed(1)}°`, x0 + 4, y0 + 12);
    ctx.fillStyle = 'rgba(120,235,225,0.9)';
    ctx.fillText(`west drift ${figure.shiftDeg.toFixed(1)}°/orbit`, x0 + 4, y0 + 23);

    // The longitude axis is RELATIVE, not geographic (the zero is arbitrary) — say so, so the
    // −180…180 ticks aren't read as Greenwich-referenced coordinates.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(78,205,196,0.5)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillText('relative longitude (arbitrary zero) · latitude', (x0 + x1) / 2, y1 + 22);

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
  class="gt-canvas"
></canvas>

<style>
  .gt-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
