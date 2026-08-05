<!--
  MassPeriodChart — the /explore v2 property-space sibling (Slice 7, Part 4). While
  inside an exoplanet system, this overlays the classic discovery-space plot: every
  known planet in our catalogue re-projected onto a log–log mass (y) vs orbital
  period (x) plane. The active system's planets light up + connect, so you see where
  THIS system sits among all the others — and next to Earth, Jupiter, Saturn.
-->
<script lang="ts">
  import {
    mpX,
    mpY,
    MP_PERIOD_LOG_MIN,
    MP_PERIOD_LOG_MAX,
    MP_MASS_LOG_MIN,
    MP_MASS_LOG_MAX,
    SOLAR_REFERENCES,
  } from '$lib/universe/property-space';
  import * as m from '$lib/paraglide/messages';
  import { createAnimateLoop } from '$lib/three/animate-loop';

  type Planet = { name: string; periodDays: number; massEarth: number; hostId: string };
  type Props = {
    planets: Planet[];
    activeHostId: string | null;
    open: boolean;
    reducedMotion?: boolean;
    onClose?: () => void;
  };
  let { planets, activeHostId, open, reducedMotion = false, onClose }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let startMs = 0;

  $effect(() => {
    if (!open || !canvas) return;
    startMs = performance.now();
    const loop = createAnimateLoop({ onFrame: () => render(), reducedMotion: () => false });
    loop.start();
    return () => loop.cleanup();
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
    const L = mob ? 48 : 110;
    const R = W - (mob ? 20 : 60);
    const T = mob ? 118 : 128;
    const B = H - (mob ? 74 : 84);
    const cw = R - L;
    const ch = B - T;
    const px = (p: number) => L + mpX(p) * cw;
    const py = (mass: number) => T + mpY(mass) * ch;

    const t = reducedMotion ? 1 : Math.min(1, (performance.now() - startMs) / 1200);
    const ease = t * t * (3 - 2 * t);

    // ── decade grid + axis ticks ───────────────────────────────────────────
    ctx.strokeStyle = 'rgba(120,150,200,0.12)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(150,164,196,0.7)';
    ctx.font = `${mob ? 8 : 10}px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    for (let e = Math.ceil(MP_PERIOD_LOG_MIN); e <= Math.floor(MP_PERIOD_LOG_MAX); e++) {
      const x = px(Math.pow(10, e));
      ctx.beginPath();
      ctx.moveTo(x, T);
      ctx.lineTo(x, B);
      ctx.stroke();
      const days = Math.pow(10, e);
      ctx.fillText(`${days}`, x, B + (mob ? 14 : 18));
    }
    ctx.textAlign = 'right';
    for (let e = Math.ceil(MP_MASS_LOG_MIN); e <= Math.floor(MP_MASS_LOG_MAX); e++) {
      const y = py(Math.pow(10, e));
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(R, y);
      ctx.stroke();
      const me = Math.pow(10, e);
      ctx.fillText(`${me}`, L - 6, y + 3);
    }
    // axis frame
    ctx.strokeStyle = 'rgba(120,190,235,0.3)';
    ctx.beginPath();
    ctx.moveTo(L, T);
    ctx.lineTo(L, B);
    ctx.lineTo(R, B);
    ctx.stroke();
    // axis titles
    ctx.fillStyle = 'rgba(170,182,210,0.85)';
    ctx.font = `${mob ? 9 : 11}px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(m.explore_mp_period(), (L + R) / 2, B + (mob ? 30 : 40));
    ctx.save();
    ctx.translate(mob ? 12 : 26, (T + B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(m.explore_mp_mass(), 0, 0);
    ctx.restore();

    // ── all catalogue planets (faint) ──────────────────────────────────────
    const dotA = Math.max(0, (ease - 0.1) / 0.9);
    for (const pl of planets) {
      if (pl.hostId === activeHostId) continue;
      const x = px(pl.periodDays);
      const y = py(pl.massEarth);
      ctx.fillStyle = `rgba(150,180,220,${0.32 * dotA})`;
      ctx.beginPath();
      ctx.arc(x, y, mob ? 2 : 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── solar-system anchors (ringed + labelled) ───────────────────────────
    ctx.font = `${mob ? 8 : 10}px 'Space Mono', monospace`;
    ctx.textAlign = 'left';
    for (const ref of SOLAR_REFERENCES) {
      const x = px(ref.periodDays);
      const y = py(ref.massEarth);
      ctx.strokeStyle = `rgba(255,214,150,${0.75 * dotA})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, mob ? 4 : 5.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,224,176,${0.85 * dotA})`;
      ctx.fillText(ref.label, x + (mob ? 7 : 9), y + 3);
    }

    // ── the active system: bright, connected, labelled ─────────────────────
    const active = planets
      .filter((pl) => pl.hostId === activeHostId)
      .sort((a, b) => a.periodDays - b.periodDays);
    if (active.length > 1) {
      ctx.strokeStyle = `rgba(120,230,255,${0.5 * ease})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      active.forEach((pl, i) => {
        const x = px(pl.periodDays);
        const y = py(pl.massEarth);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.font = `bold ${mob ? 9 : 11}px 'Space Mono', monospace`;
    for (const pl of active) {
      const x = px(pl.periodDays);
      const y = py(pl.massEarth);
      ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(x, y, 0, x, y, mob ? 8 : 11);
      gl.addColorStop(0, `rgba(120,230,255,${0.5 * ease})`);
      gl.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(x - 11, y - 11, 22, 22);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(210,245,255,${ease})`;
      ctx.beginPath();
      ctx.arc(x, y, mob ? 2.6 : 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(224,246,255,${ease})`;
      ctx.fillText(pl.name, x + (mob ? 6 : 8), y - (mob ? 6 : 8));
    }
  }
</script>

{#if open}
  <div class="mp-overlay">
    <canvas bind:this={canvas} aria-label={m.explore_mp_title()}></canvas>
    <div class="mp-head" role="note">
      <div class="mp-title">{m.explore_mp_title()}</div>
      <div class="mp-note">{m.explore_mp_note()}</div>
    </div>
    <button type="button" class="mp-close" aria-label={m.explore_anon_dismiss()} onclick={onClose}
      >×</button
    >
  </div>
{/if}

<style>
  .mp-overlay {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: none;
    background: #04060d;
    animation: mp-fade 500ms ease-out;
  }
  @keyframes mp-fade {
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
  .mp-close {
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
  .mp-close:hover {
    background: rgba(30, 40, 55, 0.8);
  }
  .mp-head {
    position: absolute;
    top: 74px;
    left: 50%;
    transform: translateX(-50%);
    max-width: min(90vw, 480px);
    text-align: center;
  }
  .mp-title {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #a7e6ff;
  }
  .mp-note {
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.4;
    color: rgba(200, 214, 235, 0.72);
  }
  @media (prefers-reduced-motion: reduce) {
    .mp-overlay {
      animation: none;
    }
  }
</style>
