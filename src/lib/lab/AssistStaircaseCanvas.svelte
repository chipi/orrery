<!--
  AssistStaircaseCanvas — the hero for the gravity-assist-chain figure. The cumulative-Δv
  staircase: one step per flyby (each ≤ 2·v∞), climbing to the upper-bound total a tour like
  Voyager 2 can bank. Honest framing: this is a ceiling, not a scalar sum you actually get.
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

  type AS = Extract<FigureSpec, { kind: 'assist-staircase' }>;
  type Props = {
    figure: AS;
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
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Assist chain · ${provenanceText}`);

  const TEAL = '78,205,196';
  const GOLD = '255,200,80';
  const PAD = { left: 46, right: 96, top: 44, bottom: 40 };
  const px0 = PAD.left;
  const px1 = W - PAD.right;
  const py0 = PAD.top;
  const py1 = H - PAD.bottom;

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const n = figure.steps.length;
    const yMax = figure.totalKms * 1.1 || 1;
    const xOf = (i: number): number => px0 + (i / n) * (px1 - px0);
    const yOf = (v: number): number => py1 - (v / yMax) * (py1 - py0);

    // axes
    ctx.strokeStyle = `rgba(${TEAL},0.35)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px0, py0);
    ctx.lineTo(px0, py1);
    ctx.lineTo(px1, py1);
    ctx.stroke();
    ctx.fillStyle = `rgba(${TEAL},0.5)`;
    ctx.font = "7px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('flyby', (px0 + px1) / 2, H - 16);
    ctx.save();
    ctx.translate(13, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('cumulative Δv (km/s)', 0, 0);
    ctx.restore();

    // staircase (drawn-in)
    const shown = Math.max(1, Math.floor(n * progress + 0.001));
    ctx.strokeStyle = `rgba(${TEAL},0.95)`;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(0));
    for (let i = 0; i < shown; i += 1) {
      const s = figure.steps[i];
      ctx.lineTo(xOf(s.n - 1), yOf(s.cumKms)); // rise
      ctx.lineTo(xOf(s.n), yOf(s.cumKms)); // run
    }
    ctx.stroke();

    // step dots + x labels
    ctx.textAlign = 'center';
    for (let i = 0; i < shown; i += 1) {
      const s = figure.steps[i];
      const x = xOf(s.n);
      const y = yOf(s.cumKms);
      heroGlow(ctx, x, y, 8, GOLD, 0.7);
      ctx.fillStyle = `rgb(${GOLD})`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${TEAL},0.5)`;
      ctx.font = "7px 'Space Mono', monospace";
      ctx.fillText(String(s.n), x, py1 + 12);
    }

    // readouts
    ctx.textAlign = 'left';
    const rx = px1 + 10;
    ctx.fillStyle = `rgba(${TEAL},0.85)`;
    ctx.font = "700 9px 'Space Mono', monospace";
    ctx.fillText('ASSIST CHAIN', rx, 60);
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(200,222,235,0.8)';
    ctx.fillText(`${n} flybys`, rx, 78);
    ctx.fillText(`${figure.perFlybyKms.toFixed(0)} km/s`, rx, 90);
    ctx.fillText('each (max)', rx, 100);
    ctx.fillStyle = `rgba(${GOLD},0.9)`;
    ctx.font = "700 10px 'Space Mono', monospace";
    ctx.fillText(`≤ ${figure.totalKms.toFixed(0)}`, rx, 122);
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(200,222,235,0.6)';
    ctx.fillText('km/s total', rx, 134);
    ctx.fillText('upper bound', rx, 150);

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
  class="as-canvas"
></canvas>

<style>
  .as-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
