<!--
  2D Canvas top-down chart that visualizes the iconic-shot camera plan
  produced by $lib/orbital/flyby-camera-plan.ts. Side-panel content for
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
    classifyShot,
    PLANET_COMPOSITION,
    type FlybyContext,
    type PlanetId,
  } from '$lib/orbital/flyby-camera-plan';
  import { composeShot, type ShotKind } from '$lib/orbital/flyby-shots';

  // Representative MET offset (from peak) for each montage shot's camera
  // marker — mid-window of the default schedule.
  const MONTAGE_SHOTS: { kind: ShotKind; offset: number; color: string }[] = [
    { kind: 'establish', offset: -40, color: 'rgba(150,150,255,0.9)' },
    { kind: 'approach', offset: -11, color: 'rgba(120,220,160,0.9)' },
    { kind: 'hero', offset: 0, color: 'rgba(255,180,80,0.95)' },
    { kind: 'depart', offset: 6, color: 'rgba(255,120,200,0.9)' },
  ];

  interface Props {
    planetId: PlanetId;
    planetPos: { x: number; z: number };
    planetRadius: number;
    shipPosAtMet: (met: number) => { x: number; y: number; z: number } | null;
    peakMet: number;
    /** Live mission-elapsed time from the running sim (simDay − dep_day).
     *  Drives the LIVE ship marker so the 2D plot tracks the flight in
     *  real time instead of freezing at the iconic-composition moment. */
    liveMet?: number;
    /** Live scene-camera world position (scene units) — the REAL camera
     *  the user is looking through, mirrored from the animate loop. Drives
     *  the moving LIVE CAM marker + trail so the plot shows how the camera
     *  actually moves as the ship flies, not just the iconic target. */
    liveCameraPos?: { x: number; y: number; z: number } | null;
    /** Live scene-camera look-at target (scene units). */
    liveCameraTarget?: { x: number; y: number; z: number } | null;
    /** The montage shot currently active in the live scene (#371). */
    activeShot?: ShotKind | null;
  }

  let {
    planetId = 'venus',
    planetPos = { x: 0, z: 0 },
    planetRadius = 2.5,
    shipPosAtMet,
    peakMet = 100,
    liveMet = undefined,
    liveCameraPos = null,
    liveCameraTarget = null,
    activeShot = null,
  }: Props = $props();

  // Live ship position (current sim moment) for flight tracking. Distinct
  // from plan.shipPos, which is the static iconic-composition sample.
  let liveShip = $derived(liveMet != null ? shipPosAtMet(liveMet) : null);

  // Ring buffer of recent live-camera positions (scene xz) → motion trail
  // so the plot shows how the camera moves as the ship flies. Plain array,
  // mutated during redraw (not reactive). Reset via the clear button.
  let camTrail: Array<{ x: number; z: number }> = [];
  const CAM_TRAIL_MAX = 200;

  let canvas = $state<HTMLCanvasElement | null>(null);
  let frameCanvas = $state<HTMLCanvasElement | null>(null);
  let elevCanvas = $state<HTMLCanvasElement | null>(null);
  let scrubDayOffset = $state(-2);
  // Ship's visible 3D-model radius in scene units. The /fly Cassini
  // mesh + lander glyphs are ~0.3–0.6 units; 0.4 is a reasonable
  // default for the iconic-shot composition check. Adjustable.
  let shipVisibleRadius = $state(0.4);
  // svelte-ignore state_referenced_locally
  let selectedPlanet = $state<PlanetId>(planetId);

  // The four montage shot cameras, composed from the current geometry, so
  // the plot shows the whole rig layout (where each shot sits) + which is
  // live (activeShot).
  let montageFrames = $derived(
    MONTAGE_SHOTS.map((s) => ({
      kind: s.kind,
      color: s.color,
      frame: composeShot(s.kind, {
        planetId: selectedPlanet,
        planetPos,
        planetRadius,
        shipPosAtMet,
        peakMet,
        met: peakMet + s.offset,
      }),
    })),
  );

  // Reactive composition — defaults seeded from venus to satisfy the
  // Svelte 5 "initial-value-only" lint; the $effect below reseeds on
  // selectedPlanet change, so the actual live values track correctly.
  let camRMultOverride = $state(PLANET_COMPOSITION.venus.camRMultiplier);
  let sideAngleDegOverride = $state((PLANET_COMPOSITION.venus.sideAngleRad * 180) / Math.PI);
  let pitchDegOverride = $state((PLANET_COMPOSITION.venus.pitchRad * 180) / Math.PI);
  let targetBiasOverride = $state(PLANET_COMPOSITION.venus.targetBias);
  // Adaptive spatial lead — 0 = off (use the time lead from the Lead-days
  // slider); > 0 = pick the iconic moment so the ship clears this many
  // planet-radii off the disc. The orbiter-arrival fix; preview it here.
  let separationRadiiOverride = $state(0);

  $effect(() => {
    // When planet selection changes, reset overrides to that planet's defaults.
    const c = PLANET_COMPOSITION[selectedPlanet];
    camRMultOverride = c.camRMultiplier;
    sideAngleDegOverride = (c.sideAngleRad * 180) / Math.PI;
    pitchDegOverride = (c.pitchRad * 180) / Math.PI;
    targetBiasOverride = c.targetBias;
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
        targetBias: targetBiasOverride,
      },
      iconicSeparationRadii: separationRadiiOverride > 0 ? separationRadiiOverride : undefined,
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

  // Auto-solve — grid-search the composition space for the current
  // mission + planet, snap the sliders to the best ICONIC frame, and
  // report the score. Quality favours iconic frames with good ship/planet
  // separation and the planet filling ~30% of the half-FOV (dominant but
  // not containment-killed). Synchronous (~720 combos) — fine on click.
  let solveResult = $state('');
  function autoSolve() {
    const base = PLANET_COMPOSITION[selectedPlanet];
    type Best = {
      sep: number;
      cf: number;
      side: number;
      bias: number;
      lead: number;
      iconic: boolean;
      q: number;
    };
    let best: Best | null = null;
    for (const sep of [0, 1.8, 2.0, 2.2, 2.5]) {
      for (const cf of [1.0, 1.2, 1.4, 1.6]) {
        for (const side of [55, 65, 75, 85]) {
          for (const bias of [0, 0.2, 0.35]) {
            for (const lead of sep > 0 ? [1] : [1, 2, 3]) {
              const plan2 = planFlybyShot({
                planetId: selectedPlanet,
                planetPos,
                planetRadius,
                shipPosAtMet,
                peakMet,
                composition: {
                  camRMultiplier: base.camRMultiplier * cf,
                  sideAngleRad: (side * Math.PI) / 180,
                  pitchRad: base.pitchRad,
                  iconicLeadDays: lead,
                  targetBias: bias,
                },
                iconicSeparationRadii: sep > 0 ? sep : undefined,
              });
              if (!plan2) continue;
              const q = classifyShot(
                plan2,
                { x: planetPos.x, y: 0, z: planetPos.z },
                planetRadius,
                shipVisibleRadius,
              );
              const quality =
                (q.isIconic ? 1000 : 0) +
                Math.min(q.shipPlanetFrameSeparation, 0.6) * 100 -
                Math.abs(q.planetApparent - 0.3) * 150;
              if (!best || quality > best.q) {
                best = { sep, cf, side, bias, lead, iconic: q.isIconic, q: quality };
              }
            }
          }
        }
      }
    }
    if (!best) {
      solveResult = 'no plan (degenerate trajectory)';
      return;
    }
    camRMultOverride = base.camRMultiplier * best.cf;
    sideAngleDegOverride = best.side;
    targetBiasOverride = best.bias;
    separationRadiiOverride = best.sep;
    if (best.sep === 0) scrubDayOffset = -best.lead;
    solveResult = `${best.iconic ? 'ICONIC' : 'best (not iconic)'} · sep ${best.sep || 'off'} · camR×${best.cf} · side ${best.side}° · bias ${best.bias}`;
  }

  function copyComposition() {
    const sepNote =
      separationRadiiOverride > 0 ? `\n  iconicSeparationRadii: ${separationRadiiOverride},` : '';
    const snippet = `${selectedPlanet}: {
  camRMultiplier: ${camRMultOverride.toFixed(2)},
  sideAngleRad: (${sideAngleDegOverride.toFixed(0)} * Math.PI) / 180,
  pitchRad: (${pitchDegOverride.toFixed(0)} * Math.PI) / 180,
  iconicLeadDays: ${-scrubDayOffset},
  targetBias: ${targetBiasOverride.toFixed(2)},${sepNote}
},`;
    navigator.clipboard?.writeText(snippet);
    solveResult = 'copied composition to clipboard';
  }

  // Shot quality classifier — requires plan + planet pos as Vec3
  // (planetPos prop is xz only; assume y=0 for the planet which is
  // the convention everywhere else in /fly).
  let shotQuality = $derived.by(() => {
    if (!plan) return null;
    return classifyShot(
      plan,
      { x: planetPos.x, y: 0, z: planetPos.z },
      planetRadius,
      shipVisibleRadius,
    );
  });

  // Sunlit-flip status — mirrors the perp-vs-sun test inside planFlybyShot
  // (cos α < −0.7 → the camera is biased onto the lit hemisphere).
  let sunlitFlip = $derived.by(() => {
    if (!plan) return null;
    const sunDist = Math.hypot(planetPos.x, planetPos.z);
    if (sunDist < 1e-6) return null;
    const sx = -planetPos.x / sunDist;
    const sz = -planetPos.z / sunDist;
    const cosA = -plan.shipVelocityXZ.z * sx + plan.shipVelocityXZ.x * sz;
    return { cosAlpha: cosA, armed: cosA < -0.7 };
  });

  onMount(() => {
    canvasReady = true;
  });

  $effect(() => {
    if (!canvasReady || !canvas) return;
    redraw();
  });

  $effect(() => {
    if (!canvasReady || !frameCanvas) return;
    redrawFrame();
  });

  $effect(() => {
    if (!canvasReady || !elevCanvas) return;
    redrawElevation();
  });

  // Side elevation profile — horizontal distance-from-planet (x) vs height
  // above the orbital plane (y). Top-down hides the pitch; this shows it:
  // how high the camera + ship sit above the ecliptic. Planet on the
  // baseline (y = 0), ship + cameras plotted by their +y lift.
  function redrawElevation() {
    const ctx = elevCanvas?.getContext('2d');
    if (!ctx || !elevCanvas) return;
    const W = elevCanvas.width;
    const H = elevCanvas.height;
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, W, H);

    type Pt = { horiz: number; y: number; color: string; label: string; r: number };
    const horizOf = (x: number, z: number) => Math.hypot(x - planetPos.x, z - planetPos.z);
    const pts: Pt[] = [
      { horiz: 0, y: 0, color: 'rgba(255,200,80,0.9)', label: selectedPlanet, r: 7 },
    ];
    if (plan) {
      pts.push({
        horiz: horizOf(plan.shipPos.x, plan.shipPos.z),
        y: plan.shipPos.y,
        color: '#4ecdc4',
        label: 'ship',
        r: 4,
      });
      pts.push({
        horiz: horizOf(plan.cameraPos.x, plan.cameraPos.z),
        y: plan.cameraPos.y,
        color: 'rgba(255,100,100,0.9)',
        label: 'cam',
        r: 4,
      });
    }
    if (liveShip)
      pts.push({
        horiz: horizOf(liveShip.x, liveShip.z),
        y: liveShip.y,
        color: 'rgba(255,209,102,1)',
        label: '',
        r: 4,
      });
    if (liveCameraPos)
      pts.push({
        horiz: horizOf(liveCameraPos.x, liveCameraPos.z),
        y: liveCameraPos.y,
        color: 'rgba(150,215,255,1)',
        label: '',
        r: 4,
      });

    const margin = 14;
    const maxH = Math.max(1, ...pts.map((p) => p.horiz));
    const minY = Math.min(0, ...pts.map((p) => p.y));
    const maxY = Math.max(1, ...pts.map((p) => p.y));
    const spanY = Math.max(1, maxY - minY);
    const sx = (W - margin * 2) / maxH;
    const sy = (H - margin * 2) / spanY;
    const proj = (horiz: number, y: number) => ({
      px: margin + horiz * sx,
      py: H - margin - (y - minY) * sy,
    });

    // Orbital-plane baseline (y = 0).
    const base0 = proj(0, 0);
    ctx.strokeStyle = 'rgba(94,234,212,0.25)';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(margin, base0.py);
    ctx.lineTo(W - margin, base0.py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(94,234,212,0.5)';
    ctx.font = '8px monospace';
    ctx.fillText('orbital plane (y=0)', margin, base0.py - 3);

    for (const p of pts) {
      const pp = proj(p.horiz, p.y);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(pp.px, pp.py, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.label) {
        ctx.font = '8px monospace';
        ctx.fillText(p.label, pp.px + p.r + 2, pp.py + 3);
      }
    }
    ctx.strokeStyle = 'rgba(220,230,245,0.2)';
    ctx.strokeRect(0, 0, W, H);
  }

  function redraw() {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Determine fit: include planet + trajectory + camera.
    // Accumulate the live-camera motion trail (dedup by distance so we
    // don't pack identical points while paused).
    if (liveCameraPos) {
      const last = camTrail[camTrail.length - 1];
      if (!last || Math.hypot(last.x - liveCameraPos.x, last.z - liveCameraPos.z) > 0.4) {
        camTrail.push({ x: liveCameraPos.x, z: liveCameraPos.z });
        if (camTrail.length > CAM_TRAIL_MAX) camTrail.shift();
      }
    }

    const all: Array<{ x: number; z: number }> = [
      planetPos,
      ...trajectory.map((s) => ({ x: s.x, z: s.z })),
    ];
    if (plan) {
      all.push({ x: plan.shipPos.x, z: plan.shipPos.z });
      all.push({ x: plan.cameraPos.x, z: plan.cameraPos.z });
    }
    if (liveShip) all.push({ x: liveShip.x, z: liveShip.z });
    if (liveCameraPos) all.push({ x: liveCameraPos.x, z: liveCameraPos.z });
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

      // Sun direction + lit hemisphere. The Sun sits at the scene origin,
      // so the lit half of the planet faces −planetPos. Shading the lit
      // half + the Sun arrow shows WHY the iconic composer's sunlit-flip
      // fires (it biases the camera onto the lit limb when the perp axis
      // points deep into the night side).
      const sunDist = Math.hypot(planetPos.x, planetPos.z);
      if (sunDist > 1e-6) {
        const sx = -planetPos.x / sunDist;
        const sz = -planetPos.z / sunDist;
        // Screen-space sun direction (py flips z).
        const ang = Math.atan2(-sz, sx);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, ang - Math.PI / 2, ang + Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 244, 190, 0.22)';
        ctx.fill();
        ctx.restore();
        const ax = p.px + sx * (r + 22);
        const ay = p.py - sz * (r + 22);
        ctx.strokeStyle = 'rgba(255, 224, 130, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 224, 130, 1)';
        ctx.font = '11px monospace';
        ctx.fillText('☀', ax - 4, ay + 4);
      }
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
      ctx.fillText('CAM (iconic)', cp.px + 7, cp.py - 4);
      // View line from camera to ship.
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cp.px, cp.py);
      ctx.lineTo(sp.px, sp.py);
      ctx.stroke();

      // Side-angle guide — draw the "behind ship" reference line for
      // visual comparison with the actual camera direction.
      const guides = flybyCameraGuides(plan.shipVelocityXZ, plan.composition.sideAngleRad);
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

    // LIVE ship marker — tracks the running sim so the plot follows the
    // flight in real time (not a static iconic-moment image). Drawn last
    // so it sits on top; pulsing gold ring + MET readout.
    if (liveShip) {
      const lp = project(liveShip.x, liveShip.z);
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)';
      ctx.fillStyle = 'rgba(255, 209, 102, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lp.px, lp.py, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(lp.px, lp.py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '9px monospace';
      ctx.fillText(`LIVE MET${(liveMet ?? 0).toFixed(0)}`, lp.px + 9, lp.py + 3);
    }

    // LIVE camera motion trail — the real scene camera's path as the ship
    // flies (fades from tail to head). Shows the cruise drift → approach
    // arc → flyby parallax sweep the user actually sees.
    if (camTrail.length >= 2) {
      for (let i = 1; i < camTrail.length; i++) {
        const a = project(camTrail[i - 1].x, camTrail[i - 1].z);
        const b = project(camTrail[i].x, camTrail[i].z);
        const alpha = (i / camTrail.length) * 0.6;
        ctx.strokeStyle = `rgba(120, 200, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }
    // LIVE camera marker + view line to its look-at target.
    if (liveCameraPos) {
      const cp = project(liveCameraPos.x, liveCameraPos.z);
      if (liveCameraTarget) {
        const tp = project(liveCameraTarget.x, liveCameraTarget.z);
        ctx.strokeStyle = 'rgba(120, 200, 255, 0.45)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cp.px, cp.py);
        ctx.lineTo(tp.px, tp.py);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = 'rgba(150, 215, 255, 1)';
      ctx.strokeStyle = 'rgba(220, 240, 255, 1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cp.px, cp.py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(150, 215, 255, 1)';
      ctx.font = '9px monospace';
      ctx.fillText('CAM (live)', cp.px + 7, cp.py + 10);
    }

    // MONTAGE shot cameras (#371) — where each of the four rig shots sits.
    // The shot matching the live `activeShot` is drawn bright + ringed.
    for (const m of montageFrames) {
      if (!m.frame) continue;
      const cp = project(m.frame.position.x, m.frame.position.z);
      const isActive = m.kind === activeShot;
      ctx.fillStyle = m.color;
      ctx.globalAlpha = isActive ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(cp.px, cp.py, isActive ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = m.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cp.px, cp.py, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.font = '8px monospace';
      ctx.fillText(m.kind, cp.px + 6, cp.py + 3);
    }

    // Legend.
    ctx.fillStyle = 'rgba(220, 230, 245, 0.7)';
    ctx.font = '9px monospace';
    ctx.fillText(
      `iconic MET ${(peakMet + scrubDayOffset).toFixed(0)} · peak ${peakMet.toFixed(0)} · live shot: ${activeShot ?? '—'}`,
      margin,
      H - 6,
    );
  }

  // Mock-up of what the camera "sees" — projects ship + planet onto
  // a 16:9 frame using a 50° vertical FOV (Three.js default for /fly).
  // This is the iconic-shot validator: if ship is small foreground
  // accent + planet looms behind, the math is right.
  function redrawFrame() {
    const ctx = frameCanvas?.getContext('2d');
    if (!ctx || !frameCanvas) return;
    const W = frameCanvas.width;
    const H = frameCanvas.height;
    ctx.fillStyle = '#04040c';
    ctx.fillRect(0, 0, W, H);

    if (!plan || !shotQuality) {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.font = '11px monospace';
      ctx.fillText('no plan', 8, 16);
      return;
    }

    const fovDeg = 50;
    const tanHalfFov = Math.tan((fovDeg * Math.PI) / 360);
    const pxPerTanH = H / (2 * tanHalfFov);
    const toPx = (x: number, y: number) => ({
      px: W / 2 + x * pxPerTanH,
      py: H / 2 - y * pxPerTanH,
    });

    // Depth-sorted draw: farther first.
    const drawList: Array<{
      kind: 'planet' | 'ship';
      depth: number;
      x: number;
      y: number;
      r: number;
    }> = [];
    // Use shotQuality's already-computed depths/apparents — but we need x,y too.
    // Recompute via the projection by sampling once: easier to use the math here.
    // (Inlined to avoid re-importing projectToCameraFrame just for x,y.)
    const fxc = plan.cameraTarget.x - plan.cameraPos.x;
    const fyc = plan.cameraTarget.y - plan.cameraPos.y;
    const fzc = plan.cameraTarget.z - plan.cameraPos.z;
    const fMag = Math.hypot(fxc, fyc, fzc);
    if (fMag < 1e-9) return;
    const forwardX = fxc / fMag;
    const forwardY = fyc / fMag;
    const forwardZ = fzc / fMag;
    let rightX = -forwardZ;
    let rightZ = forwardX;
    const rMag = Math.hypot(rightX, rightZ);
    if (rMag > 1e-9) {
      rightX /= rMag;
      rightZ /= rMag;
    } else {
      rightX = 1;
      rightZ = 0;
    }
    const upX = -rightZ * forwardY;
    const upY = rightZ * forwardX - rightX * forwardZ;
    const upZ = rightX * forwardY;

    const project = (px: number, py: number, pz: number, worldR: number) => {
      const dx = px - plan.cameraPos.x;
      const dy = py - plan.cameraPos.y;
      const dz = pz - plan.cameraPos.z;
      const depth = dx * forwardX + dy * forwardY + dz * forwardZ;
      if (depth <= 0) return null;
      const x = (dx * rightX + dy * 0 + dz * rightZ) / depth;
      const y = (dx * upX + dy * upY + dz * upZ) / depth;
      return { x, y, depth, r: worldR / depth };
    };

    const shipP = project(plan.shipPos.x, plan.shipPos.y, plan.shipPos.z, shipVisibleRadius);
    const planetP = project(planetPos.x, 0, planetPos.z, planetRadius);
    if (planetP) drawList.push({ kind: 'planet', ...planetP });
    if (shipP) drawList.push({ kind: 'ship', ...shipP });
    drawList.sort((a, b) => b.depth - a.depth);

    for (const item of drawList) {
      const { px, py } = toPx(item.x, item.y);
      const rPx = item.r * pxPerTanH;
      if (item.kind === 'planet') {
        ctx.fillStyle = 'rgba(255, 200, 80, 0.85)';
        ctx.strokeStyle = 'rgba(255, 220, 130, 1)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(rPx, 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#4ecdc4';
        ctx.strokeStyle = 'rgba(220, 255, 250, 1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(rPx, 2), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // LIVE ship in the composed frame — projects the current sim ship
    // position through the iconic-composition camera, so you can watch
    // the ship cross the frame as the flight plays.
    if (liveShip) {
      const lp = project(liveShip.x, liveShip.y, liveShip.z, shipVisibleRadius);
      if (lp) {
        const { px, py } = toPx(lp.x, lp.y);
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.95)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(lp.r * pxPerTanH, 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Frame border + center crosshair.
    ctx.strokeStyle = 'rgba(220, 230, 245, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
    ctx.beginPath();
    ctx.moveTo(W / 2 - 8, H / 2);
    ctx.lineTo(W / 2 + 8, H / 2);
    ctx.moveTo(W / 2, H / 2 - 8);
    ctx.lineTo(W / 2, H / 2 + 8);
    ctx.stroke();

    // Verdict badge.
    const badge = shotQuality.isIconic ? 'ICONIC' : 'NOT ICONIC';
    const badgeColor = shotQuality.isIconic
      ? 'rgba(78, 205, 196, 0.95)'
      : 'rgba(255, 120, 120, 0.95)';
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 10px monospace';
    ctx.fillText(badge, 6, 14);
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
    <div class="control-row">
      <label class="control-label">
        <span>Look bias: 0=ship · 1=planet ({targetBiasOverride.toFixed(2)})</span>
        <input type="range" min="0" max="1" step="0.05" bind:value={targetBiasOverride} />
      </label>
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>
          Spatial lead ×r ({separationRadiiOverride === 0
            ? 'off'
            : separationRadiiOverride.toFixed(1)})
          {separationRadiiOverride > 0 ? '· overrides Lead-days' : ''}
        </span>
        <input type="range" min="0" max="6" step="0.25" bind:value={separationRadiiOverride} />
      </label>
    </div>
    <div class="control-row solve-row">
      <button class="solve-btn" onclick={autoSolve}>⚡ auto-solve</button>
      <button class="clear-btn" onclick={copyComposition}>copy composition</button>
    </div>
    {#if solveResult}
      <div class="solve-result">{solveResult}</div>
    {/if}
    <div class="control-row legend-row">
      <span class="key live-ship">● live ship</span>
      <span class="key live-cam">● cam (live)</span>
      <span class="key iconic-cam">● cam (iconic)</span>
      <button class="clear-btn" onclick={() => (camTrail = [])}>clear trail</button>
    </div>
  </div>
  <canvas bind:this={canvas} width="320" height="320" data-testid="flyby-debug-canvas"></canvas>
  <div class="frame-label">CAMERA FRAME (50° FOV, 16:9)</div>
  <canvas bind:this={frameCanvas} width="320" height="180" data-testid="flyby-frame-canvas"
  ></canvas>
  <div class="frame-label">ELEVATION — height above orbital plane</div>
  <canvas bind:this={elevCanvas} width="320" height="110" data-testid="flyby-elev-canvas"></canvas>
  {#if plan && shotQuality}
    <div class="readouts">
      <div>
        shipPos: ({plan.shipPos.x.toFixed(2)}, {plan.shipPos.y.toFixed(2)}, {plan.shipPos.z.toFixed(
          2,
        )})
      </div>
      <div>vel xz: ({plan.shipVelocityXZ.x.toFixed(3)}, {plan.shipVelocityXZ.z.toFixed(3)})</div>
      <div>
        cameraPos: ({plan.cameraPos.x.toFixed(2)}, {plan.cameraPos.y.toFixed(2)}, {plan.cameraPos.z.toFixed(
          2,
        )})
      </div>
      <div class="readout-divider"></div>
      <div>planetPos xz: ({planetPos.x.toFixed(2)}, {planetPos.z.toFixed(2)})</div>
      <div>
        ship↔planet: {Math.hypot(
          plan.shipPos.x - planetPos.x,
          plan.shipPos.y,
          plan.shipPos.z - planetPos.z,
        ).toFixed(2)}u ({(
          Math.hypot(plan.shipPos.x - planetPos.x, plan.shipPos.y, plan.shipPos.z - planetPos.z) /
          planetRadius
        ).toFixed(1)}·r)
      </div>
      <div>cam→ship: {shotQuality.shipDepth.toFixed(2)}u</div>
      <div>
        cam→planet: {shotQuality.planetDepth.toFixed(2)}u ({(
          shotQuality.planetDepth / planetRadius
        ).toFixed(1)}·r)
      </div>
      <div>
        frame ship↔planet: {(shotQuality.shipPlanetFrameSeparation * 100).toFixed(1)}% of FOV/2
      </div>
      <div>ship size: {(shotQuality.shipApparent * 100).toFixed(2)}% of FOV/2</div>
      <div>planet size: {(shotQuality.planetApparent * 100).toFixed(2)}% of FOV/2</div>
      <div>
        planet/ship ratio: {(
          shotQuality.planetApparent / Math.max(1e-9, shotQuality.shipApparent)
        ).toFixed(1)}×
      </div>
      <div class="readout-divider"></div>
      <div class:bad={shotQuality.shipBehindPlanet}>
        ship-behind-planet: {shotQuality.shipBehindPlanet ? '✗ FAIL' : '✓ ok'}
      </div>
      <div class:bad={shotQuality.shipInsidePlanetDisk}>
        ship-clear-of-disk: {shotQuality.shipInsidePlanetDisk ? '✗ overlapping' : '✓ ok'}
      </div>
      <div class:bad={shotQuality.shipOutOfFrame}>
        ship-in-frame: {shotQuality.shipOutOfFrame ? '✗ out' : '✓ ok'}
      </div>
      <div class:bad={shotQuality.planetTooSmall}>
        planet-dominates: {shotQuality.planetTooSmall ? '✗ too small' : '✓ ok'}
      </div>
      {#if shotQuality.planetTooTiny}
        <div class="bad">body-visible: ✗ too tiny</div>
      {/if}
      <div class:bad={shotQuality.shipTooTiny}>
        ship-visible: {shotQuality.shipTooTiny ? '✗ too tiny' : '✓ ok'}
      </div>
      {#if sunlitFlip}
        <div class="readout-divider"></div>
        <div>
          sunlit-flip: {sunlitFlip.armed ? '⟲ armed (lit-limb bias)' : 'off'} (cosα {sunlitFlip.cosAlpha.toFixed(
            2,
          )})
        </div>
      {/if}
    </div>
    <div class="control-row">
      <label class="control-label">
        <span>Ship visible radius ({shipVisibleRadius.toFixed(2)})</span>
        <input type="range" min="0.1" max="2" step="0.05" bind:value={shipVisibleRadius} />
      </label>
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
  .readouts .bad {
    color: rgba(255, 120, 120, 0.95);
  }
  .readout-divider {
    height: 1px;
    background: rgba(94, 234, 212, 0.15);
    margin: 4px 0;
  }
  .frame-label {
    font-size: 9px;
    color: rgba(94, 234, 212, 0.7);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .legend-row {
    gap: 10px;
    align-items: center;
    font-size: 9px;
    flex-wrap: wrap;
  }
  .key {
    letter-spacing: 0.5px;
  }
  .key.live-ship {
    color: rgba(255, 209, 102, 1);
  }
  .key.live-cam {
    color: rgba(150, 215, 255, 1);
  }
  .key.iconic-cam {
    color: rgba(255, 100, 100, 1);
  }
  .clear-btn {
    margin-left: auto;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(220, 230, 245, 0.8);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 9px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .solve-row {
    gap: 6px;
  }
  .solve-btn {
    background: rgba(94, 234, 212, 0.18);
    border: 1px solid #5eead4;
    color: #5eead4;
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 10px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }
  .solve-row .clear-btn {
    margin-left: 0;
  }
  .solve-result {
    font-size: 9px;
    color: rgba(94, 234, 212, 0.85);
    font-family: ui-monospace, monospace;
    padding: 2px 0;
  }
</style>
