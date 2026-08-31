/**
 * Shared chrome for the Lab's canvas "hero" figures (v0.9 renderer phase 2). Each hero
 * (transfer-ellipse, moon-phase, force-diagram, dv-waterfall) is a thin Svelte component
 * that owns its data drawing; this module owns everything they share — the fixed geometry,
 * the lit bench background + vignette, the always-visible honesty line, the smoothstep, and
 * the reduced-motion-aware draw-in loop. Pure canvas 2D; no Svelte, no DOM lookups.
 */
import { createAnimateLoop, type AnimateLoop } from '$lib/three/animate-loop';

export const HERO_W = 480;
export const HERO_H = 320;
export const HERO_DPR = 2; // fixed internal upscale — crisp at the notebook's figure widths

/** Cubic smoothstep, for eased draw-ins. */
export const smooth = (x: number): number => x * x * (3 - 2 * x);

/** Does the user prefer reduced motion? (SSR-safe.) */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** The lit lab-bench background — a dark radial so the centre feels lit. */
export function heroBackground(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const bg = ctx.createRadialGradient(cx * 0.86, cy * 0.8, 20, cx, cy, HERO_W * 0.7);
  bg.addColorStop(0, '#0b0f1c');
  bg.addColorStop(0.55, '#070810');
  bg.addColorStop(1, '#030307');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, HERO_W, HERO_H);
}

/** Edge vignette — drawn over the figure, under the honesty line. */
export function heroVignette(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const vig = ctx.createRadialGradient(cx, cy, HERO_H * 0.36, cx, cy, HERO_H * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, HERO_W, HERO_H);
}

/** An additive radial glow blob (Sun, planet, mark) — uses 'lighter' compositing. */
export function heroGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  rgb: string,
  peak = 0.5,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${peak})`);
  g.addColorStop(0.5, `rgba(${rgb},${peak * 0.28})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The always-visible trust line — provenance + assumptions, bottom-left. */
export function drawHonestyLine(
  ctx: CanvasRenderingContext2D,
  provenanceText: string,
  assumptionsText: string,
): void {
  // Shared chrome drawn after arbitrary body drawing — reset text state defensively so the
  // trust line renders identically across every hero (a body draw may have left 'middle').
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "7px 'Space Mono', monospace";
  ctx.fillStyle = 'rgba(78,205,196,0.6)';
  ctx.fillText(provenanceText, 8, HERO_H - 16);
  if (assumptionsText) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(assumptionsText, 8, HERO_H - 6);
  }
}

/**
 * Run a smoothstep draw-in of `draw(progress)` over `duration` seconds, or draw the final
 * frame instantly when reduced motion / already-animated. Returns a cleanup fn for $effect.
 * `draw` receives eased progress in [0,1].
 */
export function heroDrawIn(
  ctx: CanvasRenderingContext2D,
  draw: (progress: number) => void,
  opts: { duration?: number; animate: boolean } = { animate: true },
): () => void {
  ctx.setTransform(HERO_DPR, 0, 0, HERO_DPR, 0, 0);
  if (!opts.animate || prefersReducedMotion()) {
    draw(1);
    return () => {};
  }
  const duration = opts.duration ?? 1.25;
  let elapsedT = 0;
  const loop: AnimateLoop = createAnimateLoop({
    onFrame: ({ dt }) => {
      elapsedT += dt;
      const p = Math.min(1, elapsedT / duration);
      draw(smooth(p));
      if (p >= 1) loop.stop();
    },
  });
  loop.start();
  return () => loop.cleanup();
}
