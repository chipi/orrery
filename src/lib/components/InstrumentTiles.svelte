<script lang="ts">
  /**
   * Instrument tiles B/C/D (#385) — the smaller diagrams beneath the
   * hero atmosphere-voice waveform on the surface Tactical Scan:
   *   B — rotation dial: a hand sweeping at the body's spin rate
   *   C — gravity drop-test: a ball whose jump height scales with 1/g
   *   D — air & heat: a temperature gauge + log-pressure bar
   *
   * One canvas, three cells, one rAF; coloured from the body palette.
   * Decorative (the exact numbers live in the scan rows) → aria-hidden.
   * Honours prefers-reduced-motion (static frame).
   */
  import { onMount } from 'svelte';
  import { BODY_PALETTE } from '$lib/planet-stats';
  import type { PlanetStats } from '$lib/planet-stats';
  import * as m from '$lib/paraglide/messages';

  let {
    bodyKey,
    stats,
    rotationHours = null,
  }: { bodyKey: string; stats: PlanetStats | null; rotationHours?: number | null } = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);

  onMount(() => {
    if (!canvas || !stats) return;
    const el = canvas;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const s = stats;
    const pal = BODY_PALETTE[bodyKey] ?? BODY_PALETTE.earth;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const glow = (a: number) => `rgba(${pal.glowRGB},${a})`;

    // Derived instrument params.
    const rotSec =
      rotationHours != null ? Math.min(45, Math.max(3.5, Math.abs(rotationHours) / 4)) : null;
    const rotLabel =
      rotationHours == null
        ? '—'
        : Math.abs(rotationHours) < 48
          ? `${Math.abs(rotationHours).toFixed(1)} h`
          : `${(Math.abs(rotationHours) / 24).toFixed(1)} d`;
    const gPeak = Math.min(0.92, Math.max(0.18, 0.34 / Math.max(0.05, s.surfaceGravityG)));
    const tFrac = Math.min(1, Math.max(0, (s.surfaceTempK - 90) / (320 - 90)));
    const pBar = s.atmoBar <= 0 ? 0 : Math.min(1, Math.max(0, (Math.log10(s.atmoBar) + 3) / 3));
    const pLabel =
      s.atmoBar === 0
        ? m.tile_pressure_vacuum()
        : s.atmoBar < 0.01
          ? `${(s.atmoBar * 1000).toFixed(0)} mbar`
          : s.atmoBar < 10
            ? `${s.atmoBar.toFixed(1)} bar`
            : `${s.atmoBar.toFixed(0)} bar`;

    const sizeToParent = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 58;
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeToParent();
    const ro = new ResizeObserver(sizeToParent);
    ro.observe(el);

    const label = (text: string, cx: number, y: number, color: string, size = 7) => {
      ctx.fillStyle = color;
      ctx.font = `${size}px "Space Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, y);
    };

    // ── Cell B: rotation dial ────────────────────────────────────
    const cellRotation = (x0: number, cw: number, h: number, t: number) => {
      const cx = x0 + cw / 2;
      const cy = h * 0.46;
      const r = Math.min(cw, h) * 0.26;
      label('SPIN', cx, 9, glow(0.65), 6);
      ctx.strokeStyle = glow(0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // top tick
      ctx.strokeStyle = glow(0.5);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy - r + 3);
      ctx.stroke();
      // hand
      const ang = -Math.PI / 2 + (rotSec ? (t / rotSec) * Math.PI * 2 : 0);
      ctx.save();
      ctx.shadowColor = glow(0.9);
      ctx.shadowBlur = 5;
      ctx.strokeStyle = pal.bright;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * r * 0.82, cy + Math.sin(ang) * r * 0.82);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = pal.core;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      label(rotLabel, cx, h - 3, 'rgba(255,255,255,0.7)', 7);
    };

    // ── Cell C: gravity drop-test ────────────────────────────────
    const cellGravity = (x0: number, cw: number, h: number, t: number) => {
      const cx = x0 + cw / 2;
      const floor = h * 0.78;
      const top = 15;
      label('GRAV', cx, 9, glow(0.65), 6);
      ctx.strokeStyle = glow(0.25);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - cw * 0.28, floor);
      ctx.lineTo(cx + cw * 0.28, floor);
      ctx.stroke();
      // projectile loop: parabola 0→peak→0 over PERIOD
      const PERIOD = 2.2;
      const ph = (t % PERIOD) / PERIOD;
      const hgt = 4 * ph * (1 - ph); // 0..1 arc
      const y = floor - hgt * gPeak * (floor - top);
      ctx.save();
      ctx.shadowColor = glow(0.9);
      ctx.shadowBlur = 6;
      ctx.fillStyle = pal.bright;
      ctx.beginPath();
      ctx.arc(cx, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(`${s.surfaceGravityG.toFixed(2)} g`, cx, h - 3, 'rgba(255,255,255,0.7)', 7);
    };

    // ── Cell D: air & heat ───────────────────────────────────────
    const cellAir = (x0: number, cw: number, h: number) => {
      const cx = x0 + cw / 2;
      const bx = x0 + cw * 0.16;
      const bw = cw * 0.68;
      label('AIR', cx, 9, glow(0.65), 6);
      // temperature gradient bar
      const ty = h * 0.36;
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, 'rgba(90,150,255,0.85)');
      grad.addColorStop(0.5, 'rgba(220,220,220,0.7)');
      grad.addColorStop(1, 'rgba(255,110,60,0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, ty, bw, 4);
      // temp marker
      const mx = bx + tFrac * bw;
      ctx.fillStyle = pal.core;
      ctx.beginPath();
      ctx.moveTo(mx, ty - 3);
      ctx.lineTo(mx - 2.5, ty - 0.5);
      ctx.lineTo(mx + 2.5, ty - 0.5);
      ctx.closePath();
      ctx.fill();
      // pressure bar (log)
      const py = h * 0.56;
      ctx.strokeStyle = glow(0.25);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, py);
      ctx.lineTo(bx + bw, py);
      ctx.stroke();
      ctx.strokeStyle = pal.bright;
      ctx.beginPath();
      ctx.moveTo(bx, py);
      ctx.lineTo(bx + Math.max(2, pBar * bw), py);
      ctx.stroke();
      label(`${s.surfaceTempK} K · ${pLabel}`, cx, h - 3, 'rgba(255,255,255,0.7)', 7);
    };

    const draw = (t: number) => {
      const w = el.clientWidth || 300;
      const h = el.clientHeight || 58;
      ctx.clearRect(0, 0, w, h);
      const cw = w / 3;
      // separators
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (const gx of [cw, cw * 2]) {
        ctx.beginPath();
        ctx.moveTo(gx, 6);
        ctx.lineTo(gx, h - 12);
        ctx.stroke();
      }
      cellRotation(0, cw, h, t);
      cellGravity(cw, cw, h, t);
      cellAir(cw * 2, cw, h);
    };

    let raf = 0;
    let disposed = false;
    if (reduce) {
      draw(0.55);
    } else {
      const start = performance.now();
      const loop = () => {
        if (disposed) return;
        draw((performance.now() - start) / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  });
</script>

{#if stats}
  <div class="tiles" aria-hidden="true">
    <canvas bind:this={canvas} class="tiles-canvas"></canvas>
  </div>
{/if}

<style>
  .tiles {
    margin: 0 0 8px;
    padding: 2px 3px;
    background: rgba(4, 8, 14, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  .tiles-canvas {
    display: block;
    width: 100%;
    height: 58px;
  }
</style>
