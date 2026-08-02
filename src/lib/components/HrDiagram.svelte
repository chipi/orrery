<!--
  HrDiagram — the /explore v2 property-space lens (Slice 7). A full-screen canvas
  overlay that re-projects the SAME real neighbourhood stars (their B–V colour +
  absolute magnitude, passed in from the point field) onto physical axes:
  temperature (x) vs luminosity (y). The stars animate in from a scatter to their
  chart positions — same data, re-plotted. Cinematic: soft glowing halos + crisp
  cores (the Milky-Way balance), elegant teal axes, region + Sun labels.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { bvToRgb } from '$lib/universe/bv-to-rgb';
  import { hrX, hrY, SPECTRAL_CLASSES, SUN_BV, SUN_ABSMAG } from '$lib/universe/property-space';
  import * as m from '$lib/paraglide/messages';

  type Star = { bv: number; absMag: number };
  type Props = { stars: Star[]; open: boolean; reducedMotion?: boolean; onClose: () => void };
  let { stars, open, reducedMotion = false, onClose }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;
  let startMs = 0;

  // Deterministic scatter origin per star (stable across frames).
  function hash(i: number): number {
    const s = Math.sin(i * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  }

  onMount(() => {
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    if (!open || !canvas || stars.length === 0) {
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
    const L = mob ? 54 : 120,
      R = W - (mob ? 22 : 60),
      T = mob ? 108 : 118,
      B = H - (mob ? 76 : 86);
    const cw = R - L,
      ch = B - T;
    const px = (bv: number) => L + hrX(bv) * cw;
    const py = (absMag: number) => T + hrY(absMag) * ch;

    // morph-in progress 0→1 (eased); reduced motion snaps to 1.
    const t = reducedMotion ? 1 : Math.min(1, (performance.now() - startMs) / 1300);
    const ease = t * t * (3 - 2 * t);

    // faint background depth
    ctx.globalCompositeOperation = 'lighter';
    const bg = ctx.createRadialGradient(px(0.9), py(6), 0, px(0.9), py(6), Math.max(cw, ch) * 0.72);
    bg.addColorStop(0, 'rgba(36,54,110,0.09)');
    bg.addColorStop(1, 'rgba(36,54,110,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // soft glow halos + crisp cores per star
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tx = px(s.bv);
      const ty = py(s.absMag);
      const ox = tx + (hash(i) - 0.5) * (mob ? 90 : 190);
      const oy = ty + (hash(i + 7.3) - 0.5) * (mob ? 90 : 190);
      const cx = ox + (tx - ox) * ease;
      const cy = oy + (ty - oy) * ease;
      const [r, g, b] = bvToRgb(s.bv);
      const bright = Math.max(0.3, 1.1 - hrY(s.absMag) * 1.0);
      const rad = (mob ? 4 : 6) * (0.7 + bright * 0.7);
      const gl = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const a = (0.36 * bright + 0.05) * ease;
      gl.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      gl.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.3})`);
      gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gl;
      ctx.fillRect(cx - rad - 2, cy - rad - 2, rad * 2 + 4, rad * 2 + 4);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tx = px(s.bv);
      const ty = py(s.absMag);
      const ox = tx + (hash(i) - 0.5) * (mob ? 90 : 190);
      const oy = ty + (hash(i + 7.3) - 0.5) * (mob ? 90 : 190);
      const cx = ox + (tx - ox) * ease;
      const cy = oy + (ty - oy) * ease;
      const [r, g, b] = bvToRgb(s.bv);
      ctx.fillStyle = `rgba(${Math.min(255, r + 30)},${Math.min(255, g + 30)},${Math.min(255, b + 30)},${ease})`;
      ctx.beginPath();
      ctx.arc(cx, cy, mob ? 1.0 : 1.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // chart labels fade in over the second half of the morph
    const labelA = Math.max(0, (ease - 0.4) / 0.6);
    ctx.globalAlpha = labelA;
    ctx.strokeStyle = 'rgba(78,205,196,0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, B);
    ctx.lineTo(R, B);
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `bold ${mob ? 10 : 13}px 'Space Mono', monospace`;
    ctx.fillStyle = 'rgba(205,214,235,0.85)';
    for (const c of SPECTRAL_CLASSES) ctx.fillText(c.label, px(c.bv), T - 9);
    ctx.font = `${mob ? 9 : 11}px 'Space Mono', monospace`;
    ctx.fillStyle = 'rgba(154,164,191,0.85)';
    ctx.fillText(m.explore_hr_temp(), (L + R) / 2, B + (mob ? 24 : 32));
    ctx.save();
    ctx.translate(mob ? 16 : 32, (T + B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(m.explore_hr_lum(), 0, 0);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.font = `${mob ? 9 : 12}px 'Space Mono', monospace`;
    ctx.fillStyle = 'rgba(255,205,160,0.8)';
    ctx.fillText(m.explore_hr_red_giants(), px(1.1) - (mob ? 18 : 30), py(-3.1));
    ctx.save();
    ctx.fillStyle = 'rgba(170,195,255,0.72)';
    ctx.textAlign = 'center';
    ctx.translate(px(-0.12), py(9.4));
    ctx.rotate(-0.62);
    ctx.fillText(m.explore_hr_main_sequence(), 0, 0);
    ctx.restore();
    ctx.fillStyle = 'rgba(200,215,255,0.72)';
    ctx.textAlign = 'center';
    ctx.fillText(m.explore_hr_white_dwarfs(), px(0.1), py(14));
    // the Sun
    const sx = px(SUN_BV);
    const sy = py(SUN_ABSMAG);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4ecdc4';
    ctx.textAlign = 'left';
    ctx.font = `bold ${mob ? 9 : 11}px 'Space Mono', monospace`;
    ctx.fillText(m.explore_hr_sun(), sx + 11, sy + 3);
    ctx.globalAlpha = 1;
  }
</script>

{#if open}
  <div class="hr-overlay">
    <canvas bind:this={canvas} aria-label={m.explore_hr_badge()}></canvas>
    <div class="hr-badge" role="note">{m.explore_hr_badge()}</div>
    <button type="button" class="hr-close" aria-label={m.explore_anon_dismiss()} onclick={onClose}
      >×</button
    >
  </div>
{/if}

<style>
  .hr-overlay {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    background: #04060d;
    animation: hr-fade 500ms ease-out;
  }
  .hr-close {
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
    pointer-events: auto; /* overlay is click-through; the close button is not */
  }
  .hr-close:hover {
    background: rgba(30, 40, 55, 0.8);
  }
  @keyframes hr-fade {
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
  .hr-badge {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #cdd4e6;
    background: rgba(10, 14, 26, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 20px;
    backdrop-filter: blur(4px);
  }
  @media (prefers-reduced-motion: reduce) {
    .hr-overlay {
      animation: none;
    }
  }
</style>
