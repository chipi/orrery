<!--
  MoonPhaseCanvas — the canvas "hero" for the moon-phase disc (v0.9 phase 2, G8). The SVG
  version drew a flat two-tone disc; this one glows: a soft halo, limb-darkened sunlit lune,
  faint earthshine on the dark side, and a crisp terminator. The lune geometry reuses the
  exact verified `moonPath` (SVG path data → Path2D), so the phase is pixel-faithful.
-->
<script lang="ts">
  import type { FigureSpec } from '$lib/physics/spec';
  import { fidelityLabel } from './figure-style';
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

  type MoonPhase = Extract<FigureSpec, { kind: 'moon-phase' }>;
  type Props = {
    figure: MoonPhase;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = W / 2;
  const cy = (H - 40) / 2 + 4;
  const R = Math.min(W, H - 80) / 2 - 8;
  const k = $derived(Math.max(0, Math.min(1, figure.illuminatedFraction)));

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((key) => t(key)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Moon phase · ${provenanceText}`);

  // Same terminator geometry as the verified SVG renderer (two arcs → SVG path data).
  function moonPath(k2: number, litRight: boolean): string {
    const rx = Math.abs(R * (1 - 2 * k2));
    const limbSweep = litRight ? 1 : 0;
    const termSweep = litRight ? (k2 < 0.5 ? 0 : 1) : k2 < 0.5 ? 1 : 0;
    return `M ${cx} ${cy - R} A ${R} ${R} 0 0 ${limbSweep} ${cx} ${cy + R} A ${rx} ${R} 0 0 ${termSweep} ${cx} ${cy - R} Z`;
  }

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, cy);

    // Soft halo around the disc.
    heroGlow(ctx, cx, cy, R * 1.9, '210,225,255', 0.16);

    // Dark disc + faint limb.
    ctx.fillStyle = '#0b0f1c';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    // Earthshine — the dark side is dimly lit by Earth's glow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const earth = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    earth.addColorStop(0, 'rgba(60,80,130,0.10)');
    earth.addColorStop(1, 'rgba(40,55,95,0.03)');
    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // The sunlit lune, grown to `progress` of its final illuminated fraction (the disc
    // "fills with light" on draw-in). Limb-darkened: brighter toward the sunlit limb.
    const kk = k * progress;
    if (kk > 0.001) {
      const litRight = figure.waxing;
      const sunX = litRight ? cx + R * 0.5 : cx - R * 0.5;
      const grad = ctx.createRadialGradient(sunX, cy - R * 0.25, R * 0.2, cx, cy, R * 1.15);
      grad.addColorStop(0, '#fdfdf6');
      grad.addColorStop(0.7, '#e8e8e0');
      grad.addColorStop(1, '#b8bcc8');
      ctx.save();
      ctx.fillStyle = grad;
      if (kk > 0.995) {
        // Full moon — the two-arc lune degenerates (terminator coincides with the limb),
        // so fill the whole disc directly rather than a self-coincident path.
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fill(new Path2D(moonPath(kk, litRight)));
      }
      ctx.restore();
    }

    // Crisp limb ring.
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    // Phase name + percent.
    ctx.textAlign = 'center';
    ctx.font = "10px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(232,232,232,0.9)';
    ctx.fillText(`${t(figure.phaseLabelKey)} · ${Math.round(k * 100)}%`, cx, cy + R + 22);

    heroVignette(ctx, cx, cy);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 1 });
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
  class="mp-canvas"
></canvas>

<style>
  .mp-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
