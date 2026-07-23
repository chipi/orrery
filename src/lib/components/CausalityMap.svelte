<!--
  CausalityMap — the /explore v2 causality lens (Slice 7). A top-down light-horizon
  map centred on the Sun: concentric rings mark how far light emitted in a past epoch
  has travelled by now, and the SAME real nearby named stars are plotted at their true
  distance. The rings expand outward on open — you watch each epoch's light front sweep
  past the stars it has (and hasn't yet) reached. Drawn in 2-D because the neighbourhood
  camera sits inside the shells, where 3-D wireframe spheres read as an inside-out web.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { bvToRgb } from '$lib/universe/bv-to-rgb';
  import type { LightShell } from '$lib/universe/causality';
  import * as m from '$lib/paraglide/messages';

  type FieldStar = { x: number; z: number; bv: number };
  type NamedStar = { name: string; distPc: number; x: number; z: number; bv: number };
  type Props = {
    field: FieldStar[];
    named: NamedStar[];
    shells: LightShell[];
    maxPc?: number;
    open: boolean;
    reducedMotion?: boolean;
    onClose: () => void;
  };
  let { field, named, shells, maxPc = 92, open, reducedMotion = false, onClose }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;
  let startMs = 0;

  onMount(() => () => cancelAnimationFrame(raf));

  $effect(() => {
    if (!open || !canvas) {
      cancelAnimationFrame(raf);
      return;
    }
    startMs = performance.now();
    const draw = () => {
      render();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });

  function render(): void {
    const cv = canvas;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth;
    const H = cv.clientHeight;
    if (cv.width !== Math.floor(W * dpr) || cv.height !== Math.floor(H * dpr)) {
      cv.width = Math.floor(W * dpr);
      cv.height = Math.floor(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const mob = W < 700;
    const cx = W / 2;
    const cy = H / 2 + (mob ? 6 : 10);
    const Rpx = Math.min(W, H) * (mob ? 0.4 : 0.42);
    const sc = Rpx / maxPc; // px per parsec
    const pc = (d: number) => d * sc;

    // morph-in 0→1 (eased): light fronts sweep outward.
    const t = reducedMotion ? 1 : Math.min(1, (performance.now() - startMs) / 1700);
    const ease = t * t * (3 - 2 * t);

    // faint galactic-plane wash
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rpx * 1.05);
    bg.addColorStop(0, 'rgba(30,48,96,0.1)');
    bg.addColorStop(1, 'rgba(30,48,96,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // ── light-cone rings (expand outward on reveal) ─────────────────────────
    ctx.font = `${mob ? 9 : 11}px 'Space Mono', monospace`;
    shells.forEach((sh, i) => {
      // stagger: inner (recent) fronts appear first
      const local = Math.min(1, Math.max(0, (ease - i * 0.08) / (1 - i * 0.08)));
      if (local <= 0) return;
      const r = pc(sh.radius) * local;
      const a = 0.34 - i * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(99,230,219,${a})`;
      ctx.lineWidth = 1.25;
      ctx.stroke();
      // leading-edge glow
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140,245,236,${a * 0.5 * (1 - local * 0.6)})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      // ring label on the upper-right diagonal (clear of the centred header),
      // once the front is near its true radius
      if (local > 0.85) {
        ctx.globalAlpha = (local - 0.85) / 0.15;
        ctx.fillStyle = 'rgba(180,240,234,0.92)';
        ctx.textAlign = 'left';
        const la = -Math.PI * 0.32; // up-and-to-the-right
        ctx.fillText(
          `${sh.epoch} · ${Math.round(sh.ly)} ly`,
          cx + Math.cos(la) * r + 4,
          cy + Math.sin(la) * r - 4,
        );
        ctx.globalAlpha = 1;
      }
    });

    // ── the census: every star within the horizon, faint, coloured by B–V ───
    const starA = Math.max(0, (ease - 0.15) / 0.85);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of field) {
      const sx = cx + s.x * sc;
      const sy = cy + s.z * sc;
      const [r, g, b] = bvToRgb(s.bv);
      const rad = mob ? 2.8 : 3.6;
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
      gl.addColorStop(0, `rgba(${r},${g},${b},${0.72 * starA})`);
      gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gl;
      ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    // ── named stars: brighter marker; labels placed greedily (nearest first,
    //    skipping any that would collide) so the crowded centre stays readable ──
    const byDist = [...named].sort((p, q) => p.distPc - q.distPc);
    for (const s of named) {
      const sx = cx + s.x * sc;
      const sy = cy + s.z * sc;
      const [r, g, b] = bvToRgb(s.bv);
      ctx.globalCompositeOperation = 'lighter';
      const rad = mob ? 5 : 7;
      const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
      gl.addColorStop(0, `rgba(${r},${g},${b},${0.55 * starA})`);
      gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gl;
      ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},${starA})`;
      ctx.beginPath();
      ctx.arc(sx, sy, mob ? 1.6 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (starA > 0.5) {
      ctx.globalAlpha = (starA - 0.5) / 0.5;
      ctx.fillStyle = 'rgba(224,233,248,0.9)';
      ctx.font = `${mob ? 8 : 10}px 'Space Mono', monospace`;
      ctx.textAlign = 'left';
      const placed: Array<{ x: number; y: number }> = [];
      const maxLabels = mob ? 8 : 14;
      for (const s of byDist) {
        if (placed.length >= maxLabels) break;
        const sx = cx + s.x * sc + 5;
        const sy = cy + s.z * sc + 3;
        if (placed.some((p) => Math.abs(p.x - sx) < 62 && Math.abs(p.y - sy) < 12)) continue;
        ctx.fillText(s.name, sx, sy);
        placed.push({ x: sx, y: sy });
      }
      ctx.globalAlpha = 1;
    }

    // ── the Sun at the centre ───────────────────────────────────────────────
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
    sg.addColorStop(0, `rgba(255,236,180,${0.9 * ease})`);
    sg.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(cx - 10, cy - 10, 20, 20);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(255,244,214,${ease})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,236,190,${0.9 * ease})`;
    ctx.font = `bold ${mob ? 9 : 11}px 'Space Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(m.explore_hr_sun(), cx + 7, cy + 3);
  }
</script>

{#if open}
  <div class="cz-overlay">
    <canvas bind:this={canvas} aria-label={m.explore_causality_title()}></canvas>
    <div class="cz-head" role="note">
      <div class="cz-title">{m.explore_causality_title()}</div>
      <div class="cz-note">{m.explore_causality_note()}</div>
    </div>
    <button type="button" class="cz-close" aria-label={m.explore_anon_dismiss()} onclick={onClose}
      >×</button
    >
  </div>
{/if}

<style>
  .cz-overlay {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    background: #04060d;
    animation: cz-fade 500ms ease-out;
  }
  @keyframes cz-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .cz-head {
    position: absolute;
    top: 74px;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(90vw, 460px);
    text-align: center;
  }
  .cz-close {
    position: absolute;
    top: 74px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(10, 14, 22, 0.6);
    color: #eaf6ff;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    pointer-events: auto;
  }
  .cz-close:hover {
    background: rgba(30, 40, 55, 0.8);
  }
  .cz-title {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #b4f0ea;
  }
  .cz-note {
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.4;
    color: rgba(200, 214, 235, 0.72);
  }
  @media (prefers-reduced-motion: reduce) {
    .cz-overlay {
      animation: none;
    }
  }
</style>
