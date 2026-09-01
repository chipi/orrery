<!--
  FlightMapCanvas — the capstone GRAND HERO: a data-driven scientific diagram of an entire
  mission, in the Lab's blueprint language. It plots the whole flight as one annotated
  trajectory (à la the NASA Apollo flight-plan chart / Nik Schulz "Destination Moon"): every
  event a numbered station at its place on the path, each carrying its REAL number (MET, Δv,
  speed) and the physics that governs it — then a per-phase FILMSTRIP of spacecraft
  configurations beneath, so the map is a showcase of how the flight works and why each phase
  matters, tying every lesson in the goal into one picture.

  Data (bodies, trajectory, events, filmstrip) comes from `flight-maps.ts`. Geometry is a
  schematic conic (distances compressed for legibility — stated on the honesty line); the
  annotations are honest, kernel-computed numbers. Canvas text is English (Lab hero convention).
-->
<script lang="ts">
  import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';
  import { prefersReducedMotion } from './hero-canvas';
  import { FIGURE_BG } from './figure-style';
  import type { FlightMap, FlightBody, IconKind } from './flight-maps';

  type Props = { flight: FlightMap; width?: number; height?: number };
  let { flight, width = 960, height = 600 }: Props = $props();
  const W = $derived(width);
  const H = $derived(height);
  const DPR = 2;
  const MAP_H = 452; // trajectory region; filmstrip below

  const TEAL_RGB = '78,205,196';
  const GOLD_RGB = '255,200,80';

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function sampleBezier(b: number[], n: number): [number, number][] {
    const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] = b;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y1;
      pts.push([x, y]);
    }
    return pts;
  }
  const pathPts = $derived(flight.beziers.flatMap((b) => sampleBezier(b, 64)));

  function background(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = FIGURE_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(78,205,196,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_H);
      ctx.stroke();
    }
    for (let y = 0; y <= MAP_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  function glow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    rgb: string,
    peak: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${peak})`);
    g.addColorStop(0.5, `rgba(${rgb},${peak * 0.3})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function body(ctx: CanvasRenderingContext2D, b: FlightBody): void {
    if (b.ring) {
      ctx.strokeStyle = 'rgba(78,205,196,0.32)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r * 2.2, b.r * 1.5, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    glow(ctx, b.x, b.y, b.r * 2.4, TEAL_RGB, 0.28);
    const g = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, 'rgba(120,215,235,0.9)');
    g.addColorStop(1, 'rgba(40,90,120,0.65)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.7)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(${TEAL_RGB},0.9)`;
    ctx.font = "600 11px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(b.label.toUpperCase(), b.x, b.y + b.r + 15);
  }

  // ─── Spacecraft-config line-icons for the filmstrip ────────────────────────────
  function flame(
    ctx: CanvasRenderingContext2D,
    cx: number,
    topY: number,
    w: number,
    h: number,
  ): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, topY, 0, topY + h);
    g.addColorStop(0, `rgba(${GOLD_RGB},0.95)`);
    g.addColorStop(1, `rgba(${GOLD_RGB},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY);
    ctx.lineTo(cx + w / 2, topY);
    ctx.lineTo(cx, topY + h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function csmShape(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    // cone (CM) + cylinder (SM), pointing up
    ctx.beginPath();
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx - 5, cy - 8);
    ctx.lineTo(cx + 5, cy - 8);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeRect(cx - 5, cy - 8, 10, 16);
  }
  function lmShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, legs: boolean): void {
    // ascent box on descent box + splayed legs
    ctx.strokeRect(cx - 4, cy - 12, 8, 7); // ascent
    ctx.strokeRect(cx - 7, cy - 5, 14, 8); // descent
    if (legs) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 6, cy + 3);
        ctx.lineTo(cx + s * 11, cy + 12);
        ctx.stroke();
      }
    }
  }
  function drawIcon(ctx: CanvasRenderingContext2D, kind: IconKind, cx: number, cy: number): void {
    ctx.save();
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.92)`;
    ctx.fillStyle = `rgba(${TEAL_RGB},0.92)`;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    switch (kind) {
      case 'stack-full': {
        // tall Saturn V: three tapering stacked bodies + nose + fins
        ctx.strokeRect(cx - 5, cy - 8, 10, 16);
        ctx.strokeRect(cx - 4, cy - 18, 8, 10);
        ctx.strokeRect(cx - 3, cy - 25, 6, 7);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 32);
        ctx.lineTo(cx - 3, cy - 25);
        ctx.lineTo(cx + 3, cy - 25);
        ctx.closePath();
        ctx.stroke();
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * 5, cy + 8);
          ctx.lineTo(cx + s * 9, cy + 8);
          ctx.lineTo(cx + s * 5, cy + 2);
          ctx.stroke();
        }
        break;
      }
      case 'stack-upper': {
        ctx.strokeRect(cx - 4, cy - 6, 8, 14);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx - 4, cy - 6);
        ctx.lineTo(cx + 4, cy - 6);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'burn-stage': {
        ctx.strokeRect(cx - 4, cy - 12, 8, 16);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 20);
        ctx.lineTo(cx - 4, cy - 12);
        ctx.lineTo(cx + 4, cy - 12);
        ctx.closePath();
        ctx.stroke();
        flame(ctx, cx, cy + 4, 8, 14);
        break;
      }
      case 'docked': {
        csmShape(ctx, cx - 6, cy);
        lmShape(ctx, cx + 9, cy, false);
        ctx.beginPath();
        ctx.moveTo(cx - 1, cy);
        ctx.lineTo(cx + 2, cy);
        ctx.stroke();
        break;
      }
      case 'docked-burn': {
        csmShape(ctx, cx - 6, cy);
        lmShape(ctx, cx + 9, cy, false);
        flame(ctx, cx - 6, cy + 8, 8, 12);
        break;
      }
      case 'lm-descend': {
        lmShape(ctx, cx, cy - 2, true);
        flame(ctx, cx, cy + 3, 9, 13);
        break;
      }
      case 'lm-surface': {
        lmShape(ctx, cx, cy - 2, true);
        ctx.strokeStyle = `rgba(${TEAL_RGB},0.5)`;
        ctx.beginPath();
        ctx.moveTo(cx - 16, cy + 13);
        ctx.lineTo(cx + 16, cy + 13);
        ctx.stroke();
        break;
      }
      case 'lm-ascend': {
        // ascent stage lifting off a left-behind descent stage
        ctx.strokeRect(cx - 4, cy - 14, 8, 7);
        flame(ctx, cx, cy - 7, 7, 10);
        ctx.strokeStyle = `rgba(${TEAL_RGB},0.45)`;
        ctx.strokeRect(cx - 6, cy + 6, 12, 6);
        break;
      }
      case 'csm-burn': {
        csmShape(ctx, cx, cy);
        flame(ctx, cx, cy + 8, 8, 13);
        break;
      }
      case 'capsule-entry': {
        // blunt capsule (heat-shield down) + plasma streaks trailing up
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 4);
        ctx.lineTo(cx + 8, cy + 4);
        ctx.lineTo(cx + 5, cy - 6);
        ctx.lineTo(cx - 5, cy - 6);
        ctx.closePath();
        ctx.stroke();
        ctx.strokeStyle = `rgba(${GOLD_RGB},0.7)`;
        for (const dx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy + 6);
          ctx.lineTo(cx + dx * 1.6, cy + 16);
          ctx.stroke();
        }
        break;
      }
      case 'capsule-chutes': {
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy + 10);
        ctx.lineTo(cx + 6, cy + 10);
        ctx.lineTo(cx + 4, cy + 3);
        ctx.lineTo(cx - 4, cy + 3);
        ctx.closePath();
        ctx.stroke();
        for (const dx of [-8, 0, 8]) {
          ctx.beginPath();
          ctx.arc(cx + dx, cy - 10, 5, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + dx - 5, cy - 10);
          ctx.lineTo(cx, cy + 3);
          ctx.moveTo(cx + dx + 5, cy - 10);
          ctx.lineTo(cx, cy + 3);
          ctx.stroke();
        }
        break;
      }
      case 'probe': {
        // bus + high-gain dish + two solar wings (a generic deep-space probe)
        ctx.strokeRect(cx - 4, cy - 4, 8, 9);
        ctx.beginPath();
        ctx.arc(cx, cy - 8, 5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy - 4);
        ctx.stroke();
        for (const s of [-1, 1]) {
          ctx.strokeRect(cx + s * 4 - (s < 0 ? 12 : 0), cy - 3, 12, 7);
        }
        break;
      }
      case 'probe-burn': {
        ctx.strokeRect(cx - 4, cy - 6, 8, 9);
        ctx.beginPath();
        ctx.arc(cx, cy - 10, 5, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        for (const s of [-1, 1]) {
          ctx.strokeRect(cx + s * 4 - (s < 0 ? 12 : 0), cy - 5, 12, 6);
        }
        flame(ctx, cx, cy + 3, 7, 11);
        break;
      }
      case 'aeroshell': {
        // blunt aeroshell (arc heat-shield + back-shell), entering
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 9, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 8.5, cy + 1);
        ctx.lineTo(cx, cy - 10);
        ctx.lineTo(cx + 8.5, cy + 1);
        ctx.stroke();
        ctx.strokeStyle = `rgba(${GOLD_RGB},0.7)`;
        for (const dx of [-6, 0, 6]) {
          ctx.beginPath();
          ctx.moveTo(cx + dx, cy + 3);
          ctx.lineTo(cx + dx * 1.5, cy + 13);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  function filmstrip(ctx: CanvasRenderingContext2D, progress: number): void {
    const y0 = MAP_H + 6;
    // divider
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.25)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, y0);
    ctx.lineTo(W - 16, y0);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${TEAL_RGB},0.6)`;
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillText('SPACECRAFT CONFIGURATION — PHASE BY PHASE', 16, y0 + 14);

    const cells = flight.film;
    const cellW = (W - 32) / cells.length;
    const iconY = y0 + 58;
    cells.forEach((c, i) => {
      const appear = Math.min(1, Math.max(0, (progress - 0.5 - i / (cells.length * 2)) * 6));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      const cx = 16 + cellW * (i + 0.5);
      // number chip
      ctx.fillStyle = `rgba(${TEAL_RGB},0.9)`;
      ctx.beginPath();
      ctx.arc(cx, y0 + 30, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#04040c';
      ctx.font = "700 8px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(String(c.n), cx, y0 + 33);
      // icon
      drawIcon(ctx, c.icon, cx, iconY);
      // caption (wrap to 2 lines on space if long)
      ctx.fillStyle = 'rgba(200,222,235,0.75)';
      ctx.font = "8px 'Space Mono', monospace";
      const words = c.caption.split(' ');
      if (words.length > 1 && c.caption.length > 9) {
        const mid = Math.ceil(words.length / 2);
        ctx.fillText(words.slice(0, mid).join(' '), cx, y0 + 92);
        ctx.fillText(words.slice(mid).join(' '), cx, y0 + 102);
      } else {
        ctx.fillText(c.caption, cx, y0 + 96);
      }
      // separator
      if (i < cells.length - 1) {
        ctx.strokeStyle = `rgba(${TEAL_RGB},0.12)`;
        ctx.beginPath();
        ctx.moveTo(16 + cellW * (i + 1), y0 + 22);
        ctx.lineTo(16 + cellW * (i + 1), y0 + 104);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
  }

  function orbitRing(
    ctx: CanvasRenderingContext2D,
    o: { cx: number; cy: number; r: number; label?: string },
  ): void {
    ctx.strokeStyle = 'rgba(78,205,196,0.14)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(o.cx, o.cy, o.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (o.label) {
      ctx.fillStyle = 'rgba(78,205,196,0.4)';
      ctx.font = "7px 'Space Mono', monospace";
      ctx.textAlign = 'left';
      ctx.fillText(o.label.toUpperCase(), o.cx + 3, o.cy - o.r + 9);
    }
  }

  function limbSurface(ctx: CanvasRenderingContext2D, l: NonNullable<FlightMap['limb']>): void {
    const topY = l.cy - l.r; // apex of the surface arc
    const atmoPx = l.atmoPx ?? 90;
    // atmosphere band above the surface
    const atmo = ctx.createLinearGradient(0, topY - atmoPx, 0, topY);
    atmo.addColorStop(0, 'rgba(78,205,196,0)');
    atmo.addColorStop(1, 'rgba(78,205,196,0.16)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(l.cx, l.cy, l.r + atmoPx, Math.PI, 2 * Math.PI);
    ctx.arc(l.cx, l.cy, l.r, 2 * Math.PI, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = atmo;
    ctx.fill();
    ctx.restore();
    if (l.atmoKm) {
      ctx.strokeStyle = 'rgba(78,205,196,0.28)';
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(l.cx, l.cy, l.r + atmoPx, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(78,205,196,0.5)';
      ctx.font = "7px 'Space Mono', monospace";
      ctx.textAlign = 'right';
      ctx.fillText(`— ${l.atmoKm} km (Kármán)`, W - 20, topY - atmoPx + 3);
    }
    // solid body below the surface
    const g = ctx.createLinearGradient(0, topY, 0, topY + 120);
    g.addColorStop(0, 'rgba(90,180,210,0.85)');
    g.addColorStop(1, 'rgba(30,70,100,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.cx, l.cy, l.r, Math.PI, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.6)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(l.cx, l.cy, l.r, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = `rgba(${TEAL_RGB},0.85)`;
    ctx.font = "600 11px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(l.label.toUpperCase(), 22, topY + 26);
  }

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    background(ctx);
    if (flight.limb) limbSurface(ctx, flight.limb);
    (flight.orbits ?? []).forEach((o) => orbitRing(ctx, o));
    flight.bodies.forEach((b) => body(ctx, b));

    // Trajectory: a teal science-line, drawn-in over progress, faint glow underlay.
    const upto = Math.max(2, Math.floor(pathPts.length * progress));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.28)`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < upto; i += 1) {
      const [x, y] = pathPts[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = `rgba(${TEAL_RGB},0.95)`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < upto; i += 1) {
      const [x, y] = pathPts[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Event stations + annotations.
    ctx.textBaseline = 'alphabetic';
    flight.events.forEach((e, idx) => {
      const appear = Math.min(1, Math.max(0, (progress - idx / (flight.events.length + 2)) * 5));
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      const [dx, dy] = e.dot;
      const [lx, ly] = e.at;
      const rgb = e.burn ? GOLD_RGB : TEAL_RGB;
      ctx.strokeStyle = `rgba(${rgb},0.45)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(lx, ly < dy ? ly + 2 : ly - 11);
      ctx.stroke();
      if (e.burn) glow(ctx, dx, dy, 11, GOLD_RGB, 0.85);
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#04040c';
      ctx.font = "700 8px 'Space Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(String(e.n), dx, dy + 2.9);
      const right = e.align === 'right';
      ctx.textAlign = right ? 'right' : 'left';
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.font = "700 10.5px 'Space Mono', monospace";
      ctx.fillText(e.name.toUpperCase(), lx, ly);
      ctx.fillStyle = 'rgba(200,222,235,0.72)';
      ctx.font = "9px 'Space Mono', monospace";
      ctx.fillText(`${e.met} · ${e.physics}`, lx, ly + 12);
    });
    ctx.globalAlpha = 1;

    // Title block (top-left).
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${TEAL_RGB},0.95)`;
    ctx.font = "700 17px 'Space Mono', monospace";
    ctx.fillText(flight.title, 22, 34);
    ctx.fillStyle = 'rgba(200,222,235,0.6)';
    ctx.font = "10px 'Space Mono', monospace";
    ctx.fillText(flight.subtitle, 22, 50);

    filmstrip(ctx, progress);

    // Honesty line (very bottom).
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(78,205,196,0.55)';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillText(flight.honesty, 22, H - 8);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void flight;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const animate = !hasAnimated && !prefersReducedMotion();
    hasAnimated = true;
    if (!animate) {
      draw(ctx, 1);
      return () => {};
    }
    let elapsed = 0;
    const dur = 3.0;
    const loop: AnimateLoop = createAnimateLoop({
      onFrame: ({ dt }) => {
        elapsed += dt;
        const p = Math.min(1, elapsed / dur);
        draw(ctx, p * p * (3 - 2 * p));
        if (p >= 1) loop.stop();
      },
    });
    loop.start();
    return () => loop.cleanup();
  });
</script>

<canvas
  bind:this={canvas}
  width={W * DPR}
  height={H * DPR}
  role="img"
  aria-label={flight.title}
  class="flightmap"
></canvas>

<style>
  .flightmap {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
    border-radius: 8px;
  }
</style>
