<!--
  ForceDiagramCanvas — the canvas "hero" for the force-diagram figure (v0.9 phase 2). Lifts the
  free-body diagram behind launch-a-rocket (thrust vs weight) and the lander goals. The body
  glows at the centre; each force vector grows out on draw-in with an additive glow + arrowhead.
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

  type ForceDiagram = Extract<FigureSpec, { kind: 'force-diagram' }>;
  type Props = {
    figure: ForceDiagram;
    t: (key: string, params?: Record<string, string | number>) => string;
    ariaLabelKey?: string;
  };
  let { figure, t, ariaLabelKey }: Props = $props();

  const cx = W / 2;
  const cy = H / 2 - 8;
  const BODY_R = 18;
  const ARROW = 78; // px for the largest force
  const LANE = 26; // side-by-side separation for collinear forces (FB1a legibility)
  // Distinct hue per force so vectors read apart from each other AND from the body
  // (operator FB1a: "forces different colours than bodies, do not overlap"). Direction
  // is still geometry; colour now distinguishes WHICH force, not fidelity. Colour is
  // keyed by the force's IDENTITY (labelKey), never its array position — weight is the
  // same hue on every figure; an unknown force hashes into the palette.
  const FORCE_PALETTE = ['#4ecdc4', '#ffc850', '#ff7a6b', '#8ab4ff', '#9be07a', '#c88bff'];
  const FORCE_COLORS: Record<string, string> = {
    'lab.vec.thrust': '#4ecdc4',
    'lab.vec.weight': '#ffc850',
    'lab.vec.applied-force': '#8ab4ff',
  };
  function forceColor(labelKey: string): string {
    const fixed = FORCE_COLORS[labelKey];
    if (fixed) return fixed;
    let h = 0;
    for (let i = 0; i < labelKey.length; i += 1) h = (h * 31 + labelKey.charCodeAt(i)) >>> 0;
    return FORCE_PALETTE[h % FORCE_PALETTE.length];
  }
  function hexRgb(hex: string): string {
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  }

  const provenanceText = $derived(
    `${t('lab.fidelity.' + fidelityLabel(figure.provenance.fidelity))} · ${figure.provenance.module}`,
  );
  const assumptionsText = $derived(
    figure.assumptions.length > 0 ? figure.assumptions.map((k) => t(k)).join(' · ') : '',
  );
  const ariaLabel = $derived(ariaLabelKey ? t(ariaLabelKey) : `Force diagram · ${provenanceText}`);

  let canvas = $state<HTMLCanvasElement | null>(null);
  let hasAnimated = false;

  function draw(ctx: CanvasRenderingContext2D, progress: number): void {
    heroBackground(ctx, cx, cy);

    const maxMag = Math.max(...figure.vectors.map((v) => v.magN), 1);

    // Body FIRST (behind the vectors), in a NEUTRAL colour so the coloured forces read
    // against it (FB1a). It's the thing the forces act on, not another vector.
    heroGlow(ctx, cx, cy, BODY_R * 1.8, '210,225,255', 0.22);
    ctx.fillStyle = '#0b0f1c';
    ctx.strokeStyle = '#c8d2e6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, BODY_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = "8px 'Space Mono', monospace";
    ctx.fillStyle = 'rgba(200,210,230,0.9)';
    ctx.fillText(t(figure.bodyLabelKey), cx, cy + 3);

    // Fan ONLY forces that share a direction (two upward forces sit side-by-side); a
    // unique-direction force stays centred on the body (FB1a — the common thrust/weight
    // pair reads as a clean vertical axis, not shifted off-centre).
    const dirKey = (vv: (typeof figure.vectors)[number]) =>
      `${Math.round(vv.dir.x * 100)},${Math.round(vv.dir.y * 100)}`;
    const groups = new Map<string, number[]>();
    figure.vectors.forEach((vv, idx) => {
      const k = dirKey(vv);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(idx);
    });

    ctx.lineCap = 'round';
    figure.vectors.forEach((v, i) => {
      const color = forceColor(v.labelKey);
      const rgb = hexRgb(color);
      const len = (v.magN / maxMag) * ARROW * progress;
      // canvas dir (y flips): data y is up, canvas y is down.
      const dcx = v.dir.x;
      const dcy = -v.dir.y;
      // Start OUTSIDE the body along the force direction (never pierce it), and fan
      // same-direction forces apart along the perpendicular so they sit next to each other.
      const perpX = -dcy;
      const perpY = dcx;
      const grp = groups.get(dirKey(v))!;
      const lane = (grp.indexOf(i) - (grp.length - 1) / 2) * LANE;
      const ox = cx + dcx * (BODY_R + 4) + perpX * lane;
      const oy = cy + dcy * (BODY_R + 4) + perpY * lane;
      const x2 = ox + dcx * len;
      const y2 = oy + dcy * len;

      // glow underlay (this force's own hue)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${rgb},0.28)`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      // shaft
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // arrowhead
      if (len > 6) {
        const ang = Math.atan2(y2 - oy, x2 - ox);
        const hl = 10;
        const ha = 0.42;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - hl * Math.cos(ang - ha), y2 - hl * Math.sin(ang - ha));
        ctx.lineTo(x2 - hl * Math.cos(ang + ha), y2 - hl * Math.sin(ang + ha));
        ctx.closePath();
        ctx.fill();
      }

      // label beyond the tip along the vector, with a dark halo so it never gets lost
      // against a vector or the body (FB1a: labels not overlapped, bigger margin).
      const off = 20;
      const lx = x2 + dcx * off;
      const ly = y2 + dcy * off + 3;
      ctx.globalAlpha = Math.max(0, Math.min(1, (progress - 0.5) / 0.5));
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4,4,12,0.9)';
      ctx.strokeText(t(v.labelKey), lx, ly);
      ctx.fillStyle = color;
      ctx.fillText(t(v.labelKey), lx, ly);
      ctx.globalAlpha = 1;
    });

    heroVignette(ctx, cx, cy);
    drawHonestyLine(ctx, provenanceText, assumptionsText);
  }

  $effect(() => {
    const el = canvas;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    void figure;
    const cleanup = heroDrawIn(ctx, (p) => draw(ctx, p), { animate: !hasAnimated, duration: 0.9 });
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
  class="fd-canvas"
></canvas>

<style>
  .fd-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #04040c;
  }
</style>
