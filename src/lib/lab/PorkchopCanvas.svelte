<!--
  PorkchopCanvas — the canvas "hero" for the porkchop figure (v0.9 phase 2). The mission-design
  launch-window chart: departure date (x) × time-of-flight (y), each cell shaded by the total Δv
  the kernel's Lambert solver found for that transfer. The cool valleys are the launch windows;
  the marked cell is the single cheapest date-and-duration. Reveals the grid column-by-column
  as it "computes". Infeasible cells (no feasible transfer) render dark.
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
    drawHonestyLine,
    heroDrawIn,
  } from './hero-canvas';

  type Porkchop = Extract<FigureSpec, { kind: 'porkchop' }>;
  type Props = {
    figure: Porkchop;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const INFEASIBLE = 27.9; // ≥ this is the DV_FAILED sentinel
  const PAD = { left: 34, right: 66, top: 14, bottom: 28 };
  const px0 = PAD.left;
  const px1 = W - PAD.right;
  const py0 = PAD.top;
  const py1 = H - PAD.bottom;

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Porkchop plot · ${provenanceText}`);

  // Δv range + best cell (min feasible), derived from the grid.
  const stats = $derived.by(() => {
    let min = Infinity;
    let mi = 0;
    let mj = 0;
    figure.grid.forEach((row, j) =>
      row.forEach((dv, i) => {
        if (dv < INFEASIBLE && dv < min) {
          min = dv;
          mi = i;
          mj = j;
        }
      }),
    );
    return { min: Number.isFinite(min) ? min : 0, mi, mj };
  });

  // Δv → colour: teal (cheap) → gold → red (dear); span ~7 km/s above the minimum.
  function ramp(dv: number, min: number): string {
    if (dv >= INFEASIBLE) return 'rgb(14,18,28)';
    const s = Math.max(0, Math.min(1, (dv - min) / 7));
    const lerp = (a: number, b: number, x: number): number => Math.round(a + (b - a) * x);
    if (s < 0.5) {
      const x = s / 0.5;
      return `rgb(${lerp(78, 255, x)},${lerp(205, 200, x)},${lerp(196, 80, x)})`;
    }
    const x = (s - 0.5) / 0.5;
    return `rgb(${lerp(255, 210, x)},${lerp(200, 70, x)},${lerp(80, 50, x)})`;
  }

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, W / 2, H / 2);

    const nDep = figure.depDays.length;
    const nTof = figure.tofDays.length;
    if (nDep < 2 || nTof < 2) return;
    const cw = (px1 - px0) / nDep;
    const ch = (py1 - py0) / nTof;
    const { min, mi, mj } = stats;

    // Cells — reveal columns left→right.
    const cols = Math.max(1, Math.floor(nDep * progress));
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < nTof; j += 1) {
        ctx.fillStyle = ramp(figure.grid[j][i], min);
        // tof increases UP: row 0 (tofMin) at the bottom.
        ctx.fillRect(px0 + i * cw, py0 + (nTof - 1 - j) * ch, cw + 0.5, ch + 0.5);
      }
    }

    // Plot frame.
    ctx.strokeStyle = 'rgba(120,235,225,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px0, py0, px1 - px0, py1 - py0);

    // Best cell marker (once the reveal reaches it).
    if (progress > mi / nDep) {
      const bx = px0 + (mi + 0.5) * cw;
      const by = py0 + (nTof - 1 - mj + 0.5) * ch;
      ctx.strokeStyle = '#eafffb';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 10, by);
      ctx.lineTo(bx + 10, by);
      ctx.moveTo(bx, by - 10);
      ctx.lineTo(bx, by + 10);
      ctx.stroke();
    }

    // Axes labels.
    ctx.fillStyle = 'rgba(78,205,196,0.6)';
    ctx.font = "7.5px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('departure day →', (px0 + px1) / 2, py1 + 18);
    const depTicks = [figure.depDays[0], figure.depDays[nDep - 1]];
    ctx.fillText(`${depTicks[0].toFixed(0)}`, px0, py1 + 10);
    ctx.fillText(`${depTicks[1].toFixed(0)}`, px1, py1 + 10);
    ctx.save();
    ctx.translate(11, (py0 + py1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('time of flight (days) →', 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.fillText(`${figure.tofDays[nTof - 1].toFixed(0)}`, px0 - 3, py0 + 6);
    ctx.fillText(`${figure.tofDays[0].toFixed(0)}`, px0 - 3, py1);

    // Colour bar.
    const cbx = px1 + 14;
    const cbw = 10;
    for (let k = 0; k <= 40; k += 1) {
      const f = k / 40;
      ctx.fillStyle = ramp(min + f * 7, min);
      ctx.fillRect(cbx, py1 - f * (py1 - py0), cbw, (py1 - py0) / 40 + 1);
    }
    ctx.strokeStyle = 'rgba(120,235,225,0.3)';
    ctx.strokeRect(cbx, py0, cbw, py1 - py0);
    ctx.fillStyle = 'rgba(78,205,196,0.7)';
    ctx.textAlign = 'left';
    ctx.font = "7px 'Space Mono', monospace";
    ctx.fillText(`${min.toFixed(1)}`, cbx + cbw + 2, py1);
    ctx.fillText(`${(min + 7).toFixed(0)}+`, cbx + cbw + 2, py0 + 6);
    ctx.fillText('km/s', cbx + cbw + 2, (py0 + py1) / 2);

    // Readout: the best window.
    ctx.textAlign = 'center';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = '#eafffb';
    ctx.fillText(
      `best: ${min.toFixed(2)} km/s · leave day ${figure.depDays[mi].toFixed(0)} · ${figure.tofDays[mj].toFixed(0)}-day cruise`,
      W / 2,
      H - 30,
    );

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
  class="pc-canvas"
></canvas>

<style>
  .pc-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
