<!--
  AssistTurnCanvas — the hero for the gravity-assist figure. The velocity triangle: the incoming
  v∞ and the outgoing v∞ (SAME speed in the planet frame) separated by the turn angle, with the
  heliocentric Δv the flyby banks drawn as the closing vector. The ceiling is 2·v∞ (a 180° turn).
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

  type AT = Extract<FigureSpec, { kind: 'assist-turn' }>;
  type Props = {
    figure: AT;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Gravity assist · ${provenanceText}`);

  const TEAL = '78,205,196';
  const GOLD = '255,200,80';
  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function arrow(
    ctx: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    rgb: string,
    w: number,
  ): void {
    ctx.strokeStyle = `rgb(${rgb})`;
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4));
    ctx.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const ox = 150;
    const oy = 220; // triangle origin
    const L = Math.min(150, figure.vInfKms * 15) * progress;
    const turn = (figure.turnDeg * Math.PI) / 180;

    // planet at the origin (the deflector)
    heroGlow(ctx, ox, oy, 16, TEAL, 0.4);
    const g = ctx.createRadialGradient(ox - 3, oy - 3, 1, ox, oy, 9);
    g.addColorStop(0, 'rgba(120,215,235,0.95)');
    g.addColorStop(1, 'rgba(40,90,120,0.7)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(ox, oy, 9, 0, Math.PI * 2);
    ctx.fill();

    // v_in (along +x) and v_out (deflected up by turn)
    const inTip: [number, number] = [ox + L, oy];
    const outTip: [number, number] = [ox + L * Math.cos(-turn), oy + L * Math.sin(-turn)];
    arrow(ctx, ox, oy, inTip[0], inTip[1], TEAL, 2);
    arrow(ctx, ox, oy, outTip[0], outTip[1], TEAL, 2);
    // Δv closing vector (in tip → out tip)
    arrow(ctx, inTip[0], inTip[1], outTip[0], outTip[1], GOLD, 2);

    // turn-angle arc
    ctx.strokeStyle = `rgba(${TEAL},0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, 30, -turn, 0);
    ctx.stroke();

    // labels
    ctx.font = "8px 'Space Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${TEAL},0.9)`;
    ctx.fillText('v∞ in', inTip[0] + 4, inTip[1] + 4);
    ctx.fillText('v∞ out', outTip[0] + 4, outTip[1]);
    ctx.fillStyle = `rgba(${GOLD},0.95)`;
    const mx = (inTip[0] + outTip[0]) / 2;
    const my = (inTip[1] + outTip[1]) / 2;
    ctx.fillText('Δv', mx + 6, my);

    // readouts (top-right)
    const rx = 320;
    ctx.fillStyle = `rgba(${TEAL},0.85)`;
    ctx.font = "700 10px 'Space Mono', monospace";
    ctx.fillText('GRAVITY ASSIST', rx, 54);
    ctx.font = "9px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(200,222,235,0.8)';
    ctx.fillText(`v∞     ${figure.vInfKms.toFixed(1)} km/s`, rx, 76);
    ctx.fillText(`turn   ${figure.turnDeg.toFixed(0)}°`, rx, 92);
    ctx.fillStyle = `rgba(${GOLD},0.9)`;
    ctx.fillText(`max Δv  ${figure.boostKms.toFixed(1)} km/s`, rx, 108);
    ctx.fillStyle = 'rgba(200,222,235,0.6)';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillText('= 2·v∞ at a 180° turn', rx, 122);
    ctx.fillText('free — no propellant', rx, 136);

    heroVignette(ctx, W / 2, H / 2);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 1.2 });
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
  class="at-canvas"
></canvas>

<style>
  .at-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
