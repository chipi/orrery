<!--
  Launch-director debug view — the Page tab of /dev/launch-director?debug=1 (same idea as
  FlybyDebugViewer on /fly). Draws what $lib/orbital/launch-director-debug-plot.ts computes:
  a SIDE chart of the ascent path (downrange vs altitude, each shot's stretch coloured, the
  active shot bold, the vehicle marker) and a RIG chart (top-down, vehicle at the centre,
  one camera dot + look arrow per shot at its midpoint, the live camera with a trail), plus
  a readout: shot, time, camera pos/target, framing fill, light pick, seed.
-->
<script lang="ts">
  import {
    fitTransform,
    boundsOf,
    type LiveReadout,
    type PlotModel,
    type Pt,
  } from '$lib/orbital/launch-director-debug-plot';

  interface Props {
    model: PlotModel;
    live: LiveReadout | null;
    /** Live camera trail in the rig frame (vehicle lengths: x downrange, y across). */
    trail: Pt[];
    /** Vehicle position on the path (km). */
    vehicle: Pt | null;
    light: string;
    cover: string;
    opening: string;
    seed: number;
  }
  let { model, live, trail, vehicle, light, cover, opening, seed }: Props = $props();

  const W = 322;
  const SIDE_H = 150;
  const RIG_H = 190;
  const COLORS: Record<string, string> = {
    opening: '#889fe7',
    kept: '#7aa2d6',
    pool: '#9a8fe0',
    beat: '#e0a060',
  };
  const shotColor = (i: number): string => {
    const s = model.shots[i];
    const hue = (i * 47) % 360;
    return s.kind === 'beat' ? COLORS.beat : `hsl(${hue} 55% 62%)`;
  };

  let canvas = $state<HTMLCanvasElement>();

  function arrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dx: number,
    dy: number,
    len: number,
    color: string,
  ): void {
    const m = Math.hypot(dx, dy) || 1;
    const ex = x + (dx / m) * len;
    const ey = y + (dy / m) * len;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const a = Math.atan2(ey - y, ex - x);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 5 * Math.cos(a - 0.45), ey - 5 * Math.sin(a - 0.45));
    ctx.lineTo(ex - 5 * Math.cos(a + 0.45), ey - 5 * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = (SIDE_H + RIG_H) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, SIDE_H + RIG_H);
    ctx.font = '10px system-ui, sans-serif';
    const active = live?.shotIndex ?? -1;

    // ── side: downrange vs altitude (km), pad at the origin
    const sb = boundsOf([...model.path, { x: 0, y: 0 }], 0.08);
    const st = fitTransform(sb, W, SIDE_H, 12);
    ctx.fillStyle = '#9aa6d0';
    ctx.fillText('SIDE  downrange (km) / altitude (km)', 6, 11);
    ctx.strokeStyle = 'rgba(150,160,200,0.25)';
    ctx.beginPath();
    const g0 = st.apply({ x: sb.minX, y: 0 });
    const g1 = st.apply({ x: sb.maxX, y: 0 });
    ctx.moveTo(g0.x, g0.y);
    ctx.lineTo(g1.x, g1.y);
    ctx.stroke();
    model.shots.forEach((sh, i) => {
      ctx.strokeStyle = shotColor(i);
      ctx.lineWidth = i === active ? 4 : 2;
      ctx.globalAlpha = active < 0 || i === active ? 1 : 0.55;
      ctx.beginPath();
      sh.path.forEach((p, k) => {
        const q = st.apply(p);
        if (k === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    const pad = st.apply({ x: 0, y: 0 });
    ctx.fillStyle = '#e0e6f5';
    ctx.fillRect(pad.x - 3, pad.y - 3, 6, 6);
    ctx.fillText('pad', pad.x + 6, pad.y - 2);
    if (vehicle) {
      const v = st.apply(vehicle);
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── rig: top-down, vehicle at the centre, units = vehicle lengths
    const R = model.rigRadius;
    const rt = fitTransform({ minX: -R, maxX: R, minY: -R, maxY: R }, W, RIG_H, 14, true);
    const oy = SIDE_H;
    const at = (p: Pt): Pt => {
      const q = rt.apply(p);
      return { x: q.x, y: q.y + oy };
    };
    ctx.fillStyle = '#9aa6d0';
    ctx.fillText('RIG  camera per shot (vehicle lengths): x downrange, y across', 6, oy + 11);
    ctx.strokeStyle = 'rgba(150,160,200,0.25)';
    for (const r of [1, 2, 4, 8, 16]) {
      if (r > R) break;
      const c = at({ x: 0, y: 0 });
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * rt.sx, 0, Math.PI * 2);
      ctx.stroke();
    }
    const c0 = at({ x: 0, y: 0 });
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(c0.x, c0.y, 4, 0, Math.PI * 2);
    ctx.fill();
    model.shots.forEach((sh, i) => {
      const p = at({ x: sh.mid.dx, y: sh.mid.dz });
      const col = shotColor(i);
      ctx.globalAlpha = active < 0 || i === active ? 1 : 0.5;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, i === active ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      arrow(ctx, p.x, p.y, sh.mid.lx, -sh.mid.lz, 16, col);
      if (i === active) ctx.fillText(sh.id, p.x + 7, p.y - 4);
    });
    ctx.globalAlpha = 1;
    if (trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      trail.forEach((p, k) => {
        const q = at(p);
        if (k === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      });
      ctx.stroke();
    }
    if (live) {
      const p = at({ x: live.rel.dx, y: live.rel.dz });
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.rect(p.x - 4, p.y - 4, 8, 8);
      ctx.fill();
      arrow(ctx, p.x, p.y, live.rel.lx, -live.rel.lz, 22, '#ffffff');
      ctx.fillText('LIVE CAM', p.x + 8, p.y + 12);
    }
  });

  const f = (x: number, d = 2): string => x.toFixed(d);
</script>

<div class="ld">
  <canvas bind:this={canvas} style="width:{W}px;height:{SIDE_H + RIG_H}px" aria-hidden="true"
  ></canvas>
  {#if live}
    <dl class="read">
      <dt>shot</dt>
      <dd>{live.shot} ({live.shotIndex + 1}/{model.shots.length})</dd>
      <dt>t</dt>
      <dd>{f(live.t, 1)} s</dd>
      <dt>cam</dt>
      <dd>{live.camPos.map((v) => f(v)).join(', ')}</dd>
      <dt>target</dt>
      <dd>{live.camTarget.map((v) => f(v)).join(', ')}</dd>
      <dt>rel</dt>
      <dd>{f(live.rel.dist)} L, elev {f(live.rel.elevDeg, 0)}°, fov {f(live.rel.fov, 0)}°</dd>
      <dt>fill</dt>
      <dd>{f(live.fillPct, 0)} % of frame height</dd>
      <dt>light</dt>
      <dd>{light} / {cover}, opening {opening}</dd>
      <dt>seed</dt>
      <dd>{seed}</dd>
    </dl>
  {/if}
</div>

<style>
  .ld {
    font:
      11px/1.4 system-ui,
      sans-serif;
    color: #dde6f5;
  }
  canvas {
    display: block;
    background: #06070f;
    border: 1px solid #2a3150;
  }
  .read {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 1px 8px;
    margin: 6px 0 0;
  }
  dt {
    color: #889fe7;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
</style>
