<!--
  2D Canvas top-down chart that visualizes the iconic-shot camera plan
  produced by $lib/three/flyby-camera-plan.ts. Side-panel content for
  /fly's DebugPanel. Lets us SEE the math (planet, trajectory, ship
  position + velocity arrow, camera position + view-direction arrow,
  side-angle marker) before applying it to the 3D scene.

  Inputs (props):
    - planetId        : which planet to compose for (drives PLANET_COMPOSITION
                        defaults)
    - planetPos       : planet's scene-space xz position
    - planetRadius    : planet render radius
    - shipPosAtMet    : trajectory sampler (called per scrub)
    - peakMet         : closest-approach time
    - scrubDayOffset  : offset from peak (e.g. -10 = ship 10 days pre-peak)

  Internally renders a top-down xz view (y axis = up out of screen).
  Rendering uses Canvas2D — keep it simple. Each redraw is a single
  pass: clear → axes → planet → trajectory → ship+arrow → camera+arrow
  → side-angle marker → labels.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    planFlybyShot,
    flybyCameraGuides,
    PLANET_COMPOSITION,
    type FlybyContext,
    type PlanetId,
  } from '$lib/three/flyby-camera-plan';

  interface Props {
    planetId: PlanetId;
    planetPos: { x: number; z: number };
    planetRadius: number;
    shipPosAtMet: (met: number) => { x: number; y: number; z: number } | null;
    peakMet: number;
  }

  let {
    planetId = 'venus',
    planetPos = { x: 0, z: 0 },
    planetRadius = 2.5,
    shipPosAtMet,
    peakMet = 100,
  }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let scrubDayOffset = $state(-2);
  let selectedPlanet = $state<PlanetId>(planetId);

  // Reactive composition — defaults from PLANET_COMPOSITION for the
  // selected planet. Adjustable knobs UI-side so we can tweak in 2D.
  let camRMultOverride = $state(PLANET_COMPOSITION[planetId].camRMultiplier);
  let sideAngleDegOverride = $state((PLANET_COMPOSITION[planetId].sideAngleRad * 180) / Math.PI);
  let pitchDegOverride = $state(((PLANET_COMPOSITION[planetId].pitchRad * 180) / Math.PI) * 0.999); // avoid float quirk

  $effect(() => {
    // When planet selection changes, reset overrides to that planet's defaults.
    const c = PLANET_COMPOSITION[selectedPlanet];
    camRMultOverride = c.camRMultiplier;
    sideAngleDegOverride = (c.sideAngleRad * 180) / Math.PI;
    pitchDegOverride = (c.pitchRad * 180) / Math.PI;
  });

  // Build the FlybyContext for the chart.
  function buildCtx(): FlybyContext {
    return {
      planetId: selectedPlanet,
      planetPos,
      planetRadius,
      shipPosAtMet,
      peakMet,
      composition: {
        camRMultiplier: camRMultOverride,
        sideAngleRad: (sideAngleDegOverride * Math.PI) / 180,
        pitchRad: (pitchDegOverride * Math.PI) / 180,
        iconicLeadDays: -scrubDayOffset, // scrub maps to lead-days for live preview
      },
    };
  }

  // Sample N trajectory points across ±60 days around peak for the curve.
  function sampleTrajectory() {
    const out: Array<{ met: number; x: number; z: number }> = [];
    for (let d = -60; d <= 60; d += 1) {
      const met = peakMet + d;
      const p = shipPosAtMet(met);
      if (p) out.push({ met, x: p.x, z: p.z });
    }
    return out;
  }

  let plan = $derived(planFlybyShot(buildCtx()));
  let trajectory = $derived(sampleTrajectory());
  let canvasReady = $state(false);

  onMount(() => {
    canvasReady = true;
  });

  $effect(() => {
    if (!canvasReady || !canvas) return;
    redraw();
  });

  function redraw() {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Determine fit: include planet + trajectory + camera.
    const all: Array<{ x: number; z: number }> = [
      planetPos,
      ...trajectory.map((s) => ({ x: s.x, z: s.z })),
    ];
    if (plan) {
      all.push({ x: plan.shipPos.x, z: plan.shipPos.z });
      all.push({ x: plan.cameraPos.x, z: plan.cameraPos.z });
    }
    const padding = planetRadius * 2;
    const xs = all.map((p) => p.x);
    const zs = all.map((p) => p.z);
    const minX = Math.min(...xs) - padding;
    const maxX = Math.max(...xs) + padding;
    const minZ = Math.min(...zs) - padding;
    const maxZ = Math.max(...zs) + padding;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const margin = 16;
    const scale = Math.min((W - margin * 2) / spanX, (H - margin * 2) / spanZ);
    const project = (x: number, z: number) => ({
      px: margin + (x - minX) * scale,
      py: H - margin - (z - minZ) * scale,
    });

    // Background grid (every scene unit).
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.06)';
    ctx.lineWidth = 1;
    for (let gx = Math.ceil(minX); gx <= maxX; gx += 5) {
      const a = project(gx, minZ);
      const b = project(gx, maxZ);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }
    for (let gz = Math.ceil(minZ); gz <= maxZ; gz += 5) {
      const a = project(minX, gz);
      const b = project(maxX, gz);
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();
    }

    // Trajectory line.
    if (trajectory.length >= 2) {
      ctx.strokeStyle = 'rgba(94, 234, 212, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < trajectory.length; i++) {
        const { x, z } = trajectory[i];
        const p = project(x, z);
        if (i === 0) ctx.moveTo(p.px, p.py);
        else ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }

    // Planet circle.
    {
      const p = project(planetPos.x, planetPos.z);
      const r = planetRadius * scale;
      ctx.fillStyle = 'rgba(255, 200, 80, 0.18)';
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 200, 80, 0.95)';
      ctx.font = '9px monospace';
      ctx.fillText(selectedPlanet.toUpperCase(), p.px + r + 4, p.py - 4);
    }

    // Ship + velocity arrow.
    if (plan) {
      const sp = project(plan.shipPos.x, plan.shipPos.z);
      ctx.fillStyle = '#4ecdc4';
      ctx.beginPath();
      ctx.arc(sp.px, sp.py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220, 230, 245, 0.9)';
      ctx.font = '9px monospace';
      ctx.fillText(`SHIP MET${plan.iconicMet.toFixed(0)}`, sp.px + 6, sp.py - 6);

      // Velocity arrow (direction in xz).
      const VEL_ARROW_LEN = 24;
      const vx = plan.shipVelocityXZ.x * VEL_ARROW_LEN;
      const vz = plan.shipVelocityXZ.z * VEL_ARROW_LEN;
      ctx.strokeStyle = '#4ecdc4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sp.px, sp.py);
      ctx.lineTo(sp.px + vx, sp.py - vz);
      ctx.stroke();
      ctx.fillStyle = '#4ecdc4';
      ctx.font = '8px monospace';
      ctx.fillText('vel', sp.px + vx + 2, sp.py - vz);

      // Camera position + arrow back to ship (view direction).
      const cp = project(plan.cameraPos.x, plan.cameraPos.z);
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cp.px, cp.py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '9px monospace';
      ctx.fillText('CAM', cp.px + 7, cp.py - 4);
      // View line from camera to ship.
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cp.px, cp.py);
      ctx.lineTo(sp.px, sp.py);
      ctx.stroke();

      // Side-angle guide — draw the "behind ship" reference line for
      // visual comparison with the actual camera direction.
      const guides = flybyCameraGuides(
        plan.shipVelocityXZ,
        plan.composition.sideAngleRad,
      );
      const REF_LEN = 36;
      ctx.strokeStyle = 'rgba(180, 180, 220, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(sp.px, sp.py);
      ctx.lineTo(sp.px + guides.behind.x * REF_LEN, sp.py - guides.behind.z * REF_LEN);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(180, 180, 220, 0.6)';
      ctx.font = '8px monospace';
      ctx.fillText(
        'behind (-vel)',
        sp.px + guides.behind.x * REF_LEN + 2,
        sp.py - guides.behind.z * REF_LEN,
      );
    } else {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.font = '11px monospace';
      ctx.fillText('plan = null (check trajectory samples)', margin, margin + 12);
    }

    // Legend.
    ctx.fillStyle = 'rgba(220, 230, 245, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText(
      `iconic MET ${(peakMet + scrubDayOffset).toFixed(0)} · peak ${peakMet.toFixed(0)} · planet r ${planetRadius}`,
      margin,
      H - 6,
    );
  }
</script>

<div class="flyby-debug-viewer">
  <div class="controls">
    <div class="control-row">
      <label class="control-label">
        <span>Planet</span>
        <select bind:value={selectedPlanet}>
          {#each Object.keys(PLANET_COMPOSITION) as pid (pid)}
            <option value={pid}>{pid}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>Lead days ({scrubDayOffset})</span>
        <input type="range" min="-30" max="5" step="1" bind:value={scrubDayOffset} />
      </label>
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>camR × planet r ({camRMultOverride.toFixed(2)})</span>
        <input type="range" min="1.5" max="8" step="0.1" bind:value={camRMultOverride} />
      </label>
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>Side angle ({sideAngleDegOverride.toFixed(0)}°)</span>
        <input type="range" min="-90" max="90" step="5" bind:value={sideAngleDegOverride} />
      </label>
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>Pitch ({pitchDegOverride.toFixed(0)}°)</span>
        <input type="range" min="0" max="180" step="5" bind:value={pitchDegOverride} />
      </label>
    </div>
  </div>
  <canvas
    bind:this={canvas}
    width="320"
    height="320"
    data-testid="flyby-debug-canvas"
  ></canvas>
  {#if plan}
    <div class="readouts">
      <div>shipPos: ({plan.shipPos.x.toFixed(2)}, {plan.shipPos.y.toFixed(2)}, {plan.shipPos.z.toFixed(2)})</div>
      <div>vel xz: ({plan.shipVelocityXZ.x.toFixed(3)}, {plan.shipVelocityXZ.z.toFixed(3)})</div>
      <div>cameraPos: ({plan.cameraPos.x.toFixed(2)}, {plan.cameraPos.y.toFixed(2)}, {plan.cameraPos.z.toFixed(2)})</div>
    </div>
  {/if}
</div>

<style>
  .flyby-debug-viewer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .control-row {
    display: flex;
  }
  .control-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    font-size: 10px;
    color: rgba(220, 230, 245, 0.8);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .control-label input[type='range'] {
    width: 100%;
    accent-color: #4ecdc4;
  }
  .control-label select {
    background: rgba(8, 10, 22, 0.6);
    color: rgba(220, 230, 245, 0.95);
    border: 1px solid rgba(94, 234, 212, 0.4);
    font-family: inherit;
    font-size: 10px;
    padding: 2px 4px;
  }
  canvas {
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(94, 234, 212, 0.3);
    border-radius: 4px;
    width: 100%;
    max-width: 320px;
  }
  .readouts {
    font-size: 9px;
    color: rgba(220, 230, 245, 0.7);
    font-family: monospace;
    line-height: 1.5;
  }
</style>
