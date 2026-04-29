<script lang="ts">
  import { onMount } from 'svelte';
  import { getEarthObjects } from '$lib/data';
  import { altToVis } from '$lib/scale';
  import type { EarthObject } from '$types/earth-object';
  import Panel from '$lib/components/Panel.svelte';
  import * as m from '$lib/paraglide/messages';

  let canvas: HTMLCanvasElement | undefined = $state();
  let objects: EarthObject[] = $state([]);
  let loadFailed = $state(false);
  let selected: EarthObject | null = $state(null);
  let panelOpen = $state(false);

  // World-space (canvas) positions for hit-testing.
  const objectPos = new Map<string, { x: number; y: number; r: number }>();

  // Regime palette (matches P05 + UXS-005 tokens). Labels go through
  // Paraglide so future locales translate the regime acronyms.
  const REGIMES: Record<string, { color: string; bg: string; label: string }> = {
    LEO: { color: '#4ecdc4', bg: 'rgba(78,205,196,0.06)', label: m.earth_regime_leo() },
    MEO: { color: '#7b9cff', bg: 'rgba(68,102,255,0.05)', label: m.earth_regime_meo() },
    GEO: { color: '#ffc850', bg: 'rgba(255,200,80,0.06)', label: m.earth_regime_geo() },
    HEO: { color: '#ff8c3c', bg: 'rgba(255,140,60,0.05)', label: m.earth_regime_heo() },
    MOON: { color: '#aaaacc', bg: 'rgba(170,170,200,0.04)', label: m.earth_regime_moon() },
    L2: { color: '#ffd700', bg: 'rgba(255,215,0,0.05)', label: m.earth_regime_l2() },
  };

  function onCanvasClick(e: MouseEvent) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    let best: { id: string; d: number } | null = null;
    for (const [id, pos] of objectPos.entries()) {
      const d = Math.hypot(cx - pos.x, cy - pos.y);
      // Hit pad expands to 22 px so visual 4–6 px dots remain tappable
      // on touch (CLAUDE.md mobile-first: invisible expanded hit area).
      const hitR = Math.max(pos.r * 4, 22);
      if (d < hitR && (!best || d < best.d)) best = { id, d };
    }
    if (best) {
      const obj = objects.find((o) => o.id === best!.id);
      if (obj) {
        selected = obj;
        panelOpen = true;
      }
    }
  }

  function draw() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, cssW, cssH);

    const earthCx = cssW / 2;
    const earthCy = cssH - 40;
    const EARTH_VIS = 38;

    objectPos.clear();

    // Stars
    for (let i = 0; i < 100; i++) {
      const sx = (i * 137.5 * 31 + i * 71) % cssW;
      const sy = (i * 137.5 * 17 + i * 53) % cssH;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
      ctx.fill();
    }

    // Earth at the bottom
    const eg = ctx.createRadialGradient(
      earthCx - EARTH_VIS * 0.3,
      earthCy - EARTH_VIS * 0.3,
      EARTH_VIS * 0.1,
      earthCx,
      earthCy,
      EARTH_VIS,
    );
    eg.addColorStop(0, '#6ab8e8');
    eg.addColorStop(1, '#0d3050');
    ctx.beginPath();
    ctx.arc(earthCx, earthCy, EARTH_VIS, 0, Math.PI * 2);
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.font = "9px 'Space Mono',monospace";
    ctx.fillStyle = 'rgba(75,156,211,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText(m.earth_label(), earthCx, earthCy + EARTH_VIS + 14);

    // Right-side rotated axis label
    ctx.save();
    ctx.translate(cssW - 14, cssH / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = "8px 'Space Mono',monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.textAlign = 'center';
    ctx.fillText(m.earth_axis_label(), 0, 0);
    ctx.restore();

    // Regime bands — derived from data per regime min/max altitude.
    const regimeBounds = new Map<string, { min: number; max: number }>();
    for (const obj of objects) {
      const a = obj.altitude_km ?? obj.earth_distance_km;
      const r = obj.regime;
      const b = regimeBounds.get(r);
      if (!b) regimeBounds.set(r, { min: a, max: a });
      else regimeBounds.set(r, { min: Math.min(b.min, a), max: Math.max(b.max, a) });
    }
    for (const [regime, b] of regimeBounds.entries()) {
      const visMin = altToVis(b.min);
      const visMax = altToVis(b.max);
      const yMin = earthCy - visMin;
      const yMax = earthCy - visMax;
      const palette = REGIMES[regime];
      if (!palette) continue;
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, yMax - 14, cssW, yMin - yMax + 28);
      ctx.font = "bold 8px 'Space Mono',monospace";
      ctx.fillStyle = palette.color;
      ctx.textAlign = 'right';
      ctx.fillText(palette.label, cssW - 32, (yMin + yMax) / 2);
    }

    // Object dots
    for (const obj of objects) {
      const alt = obj.altitude_km ?? obj.earth_distance_km;
      const vis = altToVis(alt);
      const x = earthCx;
      const y = earthCy - vis;
      const palette = REGIMES[obj.regime];
      const dotR = 4 + Math.min(2, Math.log10(Math.max(1, obj.count)));
      const isSel = selected?.id === obj.id;

      // Glow
      const gl = ctx.createRadialGradient(x, y, 0, x, y, dotR * 4);
      gl.addColorStop(0, obj.color + '88');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(x, y, dotR * 4, 0, Math.PI * 2);
      ctx.fillStyle = gl;
      ctx.fill();

      // Selection ring
      if (isSel) {
        ctx.beginPath();
        ctx.arc(x, y, dotR + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Dot
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();

      // Label
      ctx.font = "9px 'Space Mono',monospace";
      ctx.fillStyle = palette ? palette.color + 'cc' : 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(obj.short ?? obj.name ?? obj.id, x + dotR + 6, y + 3);

      objectPos.set(obj.id, { x, y, r: dotR });
    }
  }

  // /earth is a static log-scale diagram — nothing time-dependent.
  // Post-v1.0 audit caught a 60 fps rAF loop wasting CPU + battery
  // on every frame even though the canvas never changes between
  // frames. Render is now event-driven: once after data loads, on
  // window resize, on selection change.
  function scheduleDraw() {
    requestAnimationFrame(draw);
  }

  onMount(() => {
    getEarthObjects()
      .then((list) => {
        objects = list;
        scheduleDraw();
      })
      .catch((err) => {
        console.error('Failed to load earth objects:', err);
        loadFailed = true;
      });
    scheduleDraw(); // first frame for the empty/Earth-only paint
    const onResize = scheduleDraw;
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  // Redraw on selection change so the white selection ring updates
  // without polling.
  $effect(() => {
    void selected;
    scheduleDraw();
  });
</script>

<svelte:head><title>Earth Orbit · Orrery</title></svelte:head>

<div class="earth">
  <canvas bind:this={canvas} onclick={onCanvasClick} aria-label={m.earth_canvas_label()}></canvas>

  {#if loadFailed}
    <div class="load-banner" role="alert">{m.earth_load_failed()}</div>
  {/if}

  <Panel
    open={panelOpen}
    title={selected?.name ?? selected?.short ?? selected?.id ?? ''}
    onClose={() => (panelOpen = false)}
  >
    {#if selected}
      <div class="head">
        <div class="agency-row">
          <span class="agency-badge" style:background-color={selected.color}>
            {selected.agencies.join(' · ')}
          </span>
          <span class="status status-{selected.status.toLowerCase()}">{selected.status}</span>
        </div>
        <h1 class="name">{selected.name ?? selected.id}</h1>
      </div>

      <div class="grid">
        <div class="cell">
          <div class="cell-label">{m.earth_panel_alt()}</div>
          <div class="cell-value">
            {m.earth_alt_km({
              value: (selected.altitude_km ?? selected.earth_distance_km).toLocaleString('en-US'),
            })}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_period()}</div>
          <div class="cell-value">
            {selected.period_min
              ? m.earth_period_min({ value: selected.period_min.toFixed(0) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_inclination()}</div>
          <div class="cell-value">
            {selected.inclination !== undefined
              ? m.earth_inclination_deg({ value: selected.inclination.toFixed(1) })
              : '—'}
          </div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_launched()}</div>
          <div class="cell-value">{selected.launched}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_count()}</div>
          <div class="cell-value">{selected.count}</div>
        </div>
        <div class="cell">
          <div class="cell-label">{m.earth_panel_crew()}</div>
          <div class="cell-value">{selected.crew}</div>
        </div>
      </div>

      {#if selected.scale_fact}
        <div class="scale-fact" style:--accent={selected.color}>
          {selected.scale_fact}
        </div>
      {/if}

      {#if selected.description}
        <p class="editorial">{selected.description}</p>
      {/if}

      {#if selected.credit}
        <div class="credit">{selected.credit}</div>
      {/if}
    {/if}
  </Panel>
</div>

<style>
  .earth {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow: hidden;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: pointer;
    touch-action: none;
  }
  .load-banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: rgba(193, 68, 14, 0.2);
    border: 1px solid rgba(193, 68, 14, 0.5);
    color: #ffc850;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    border-radius: 4px;
    z-index: 40;
  }
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .agency-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .agency-badge,
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
  }
  .agency-badge {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .status {
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-retired {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 14px;
  }
  .cell {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 6px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.25);
    margin-bottom: 3px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
    font-weight: 700;
  }
  .scale-fact {
    margin: 0 0 14px;
    padding: 10px 12px;
    border-left: 3px solid var(--accent, #4466ff);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 2px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.5;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
    margin: 0 0 14px;
  }
  .credit {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    color: rgba(255, 255, 255, 0.25);
    line-height: 1.6;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
  }
</style>
