import * as THREE from 'three';
import { A_MOON_KM, moonEciPos } from '$lib/orbital/cislunar/cislunar-geometry';
import { BODY_MASS_KG, gravityAccel, logScaleLength } from '$lib/orbit-overlays';
import {
  buildFdPhaseMarkerScreens,
  buildMilestoneScreens,
  buildPhaseMarkerScreens,
  makeProjectorFactory,
} from '$lib/fly/fly-frame-projections';
import type { PhaseMarkerRenderState } from '$lib/fly/fly-frame-projections';
import { buildFlyDebugFrameSnapshot } from '$lib/orbital/fly-debug-frame';
import { buildTubeFromPoints } from '$lib/three/glow-line';
import {
  BURN_TABLE,
  BURN_WINDOW_DAYS_DEFAULT,
  burnExhaustDir,
  findActiveBurn,
} from '$lib/fly/fly-frame-burn';
import {
  CISLUNAR_REBUILD_THRESHOLD,
  CISLUNAR_TUBE_BOUNDS,
  HELIO_REBUILD_THRESHOLD,
  HELIO_TUBE_BOUNDS,
  shouldRebuildTube,
  trajectoryTubeRadius,
} from '$lib/three/trajectory-tube';
import { classifyConicEarth } from '$lib/fly-conics-earth';
import { defaultEventLabel } from '$lib/fly-event-labels';
import {
  destinationPos,
  earthPos,
  marsPos,
  spacecraftHeading,
  spacecraftPos,
} from '$lib/orbital/mission-arc';
import type { Vec2 } from '$lib/orbital/mission-arc';
import {
  eciKmToCanvas2dPx,
  helioAuToCanvas2dPx,
} from '$lib/orbital/cislunar/cislunar-screen-projection';
import { flybySlowmoSpeed } from '$lib/orbital/flyby-shot-schedule';
import { flyVelocitySon } from '$lib/sensory/sonify/fly-velocity';
import { gyro } from '$lib/sensory/device-orientation';
import { integrateEarthCoastPreview, sampleForwardArc } from '$lib/fly/fly-frame-coast';
import { isLayerOn } from '$lib/science-layers';
import { markerStateFor } from '$lib/orbital/cislunar/cislunar-marker-reveal';
import { moonHelioPos } from '$lib/fly-moon-arc';
import { parseFlybyMetFromSubPhase } from '$lib/fly-cinematic-beats';
import { R_EARTH_AU, R_MARS_AU } from '$lib/lambert-grid.constants';
import { runCinematicFrame } from '$lib/fly-cinematic-frame';
import { SCALE_3D } from '$lib/fly-scene-constants';
import { sensory } from '$lib/sensory/state.svelte';
import { sepSlowmoFactor } from '$lib/orbital/ascent-cameras';

/**
 * `/fly` per-frame runner (RFC-036 WS-B/1b — scene-host teardown).
 *
 * The ~1,940-line `onFrame` body + the 2D-fallback `draw2d` renderer, extracted
 * VERBATIM from the fly/+page.svelte onMount closure. The frame reads AND writes ~37
 * component `$state` vars the template binds to — a module can't touch component
 * `$state`, so they thread through `bridge` (a getter/setter accessor object built in
 * the page; `bridge.simDay` handles both read and write). All the scene refs (scene,
 * cameras, meshes, flyCam, the reactive-overlay handles, the updaters, canvas) pass by
 * reference via `refs`. Byte-identical to the inline code.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function createFlyFrameRunner(bridge: any, refs: any) {
  const {
    scene,
    camera,
    renderer,
    cislunarScene,
    cislunarCamera,
    flyCam,
    helioHandles,
    helioReactive,
    cine,
    outLine,
    retLine,
    scSprite,
    plumeMesh,
    plumeMat,
    earthMesh,
    marsMesh,
    moonMesh,
    earthSoI,
    marsSoI,
    moonSoI,
    gravArrowEarth,
    gravArrowSun,
    velocityArrow,
    centripetalArrow,
    coastLine,
    moonOrbitRing,
    depMarker,
    arrMarker,
    retMarker,
    depLabelSprite,
    arrLabelSprite,
    retLabelSprite,
    sunCore,
    sunGlow,
    earthOrbitLine,
    cislunarMoonMeshRef,
    cislunarMoonFrameGroupRef,
    cislunarPhaseLines,
    cisCoastLine,
    cisGravEarthArrow,
    cisGravMoonArrow,
    cisVelocityArrow,
    cisCentripetalArrow,
    cisPeriMarker,
    cisApoMarker,
    helioMission,
    baseFov,
    frameMonitor,
    quality,
    FD_STAGES,
    flyUpdaters,
    dispatchPhase,
    startDescent,
    FLYBY_OVERRIDES,
    FLYBY_PEAK_DAYS,
    SCALE_CISLUNAR,
  } = refs;
  let lastTime = performance.now();
  // Wall-clock seconds accumulator that drives decorative moon orbits.
  // Advances at real dt (NOT dt × simSpeed) and only while the sim is
  // actually playing — see the gated increment in onFrame. Decoupling
  // moon motion from simSpeed stops the strobe at high speeds (Phobos's
  // 0.32 d period at 7 d/s was ~22 rev/s); gating it on the same
  // play/freeze predicate as simDay keeps the moons held still during
  // the peak-hold hero beat so the composed frame stays composed.
  let moonDriftSec = 0;
  // Latest heliocentric spacecraft world position — fed to the
  // cinematic-tier BokehPass focus uniform from the animate loop.
  // Null while the helio frame branch hasn't computed it yet (e.g.
  // during the cislunar phase).
  let scLastWorld: THREE.Vector3 | null = null;
  const c2 = bridge.canvas2d;
  const _maybeCtx = c2.getContext('2d');
  if (!_maybeCtx) throw new Error('2D context unavailable');
  const ctx2: CanvasRenderingContext2D = _maybeCtx;

  // 2D cislunar auto-zoom state — mirrors the 3D autoZoom* logic.
  // When the active phase is lunar (orbit, spiral_lunar, descent, …),
  // the canvas zooms in on the Moon's current position. On Earth-side
  // phases it zooms back to the wide Earth-Moon view. Lerp each
  // frame toward the target so the transition reads as a camera move.
  let cis2dScale = 1;
  let cis2dTargetScale = 1;
  let cis2dCenterX = 0;
  let cis2dCenterZ = 0;
  let cis2dTargetCenterX = 0;
  let cis2dTargetCenterZ = 0;
  const CIS2D_WIDE_SCALE = 1;
  const CIS2D_CLOSEUP_SCALE = 8;

  function draw2d() {
    if (c2.width !== c2.clientWidth || c2.height !== c2.clientHeight) {
      c2.width = c2.clientWidth;
      c2.height = c2.clientHeight;
    }
    const W = c2.width;
    const H = c2.height;
    if (W === 0 || H === 0) return;

    ctx2.fillStyle = '#04040c';
    ctx2.fillRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const BASE_SCALE_2D = Math.min(W, H) / 4;
    // Moon-mode 2D mirrors 3D camera: origin is live Earth (so the
    // Earth+Moon system stays centred as Earth orbits the Sun) and
    // the scale is zoomed 6× so the 0.15 AU Moon offset reads as
    // ~90 px instead of ~30 px. Mars-mode keeps Sun-centred origin
    // at canvas centre and the original scale.
    const originAU = bridge.isMoonMission ? earthPos(bridge.simDay) : { x: 0, z: 0 };
    const SCALE_2D = bridge.isMoonMission ? BASE_SCALE_2D * 6 : BASE_SCALE_2D;
    const ptX = (au: number) => cx + (au - originAU.x) * SCALE_2D;
    const ptZ = (au: number) => cy + (au - originAU.z) * SCALE_2D;

    for (let i = 0; i < 150; i++) {
      const sx = (i * 137.5 * 31 + i * 71) % W;
      const sy = (i * 137.5 * 17 + i * 53) % H;
      ctx2.beginPath();
      ctx2.arc(sx, sy, i % 8 === 0 ? 1.2 : 0.5, 0, Math.PI * 2);
      ctx2.fillStyle = `rgba(210,215,255,${0.06 + (i % 5) * 0.04})`;
      ctx2.fill();
    }

    // Earth + Mars orbits + Sun (Mars-bound only — Moon-mode is
    // Earth-centered; rings + Sun would be misleading reference
    // points for a cislunar transit).
    if (!bridge.isMoonMission) {
      ctx2.beginPath();
      ctx2.arc(cx, cy, R_EARTH_AU * SCALE_2D, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(75,156,211,0.35)';
      ctx2.lineWidth = 1;
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(cx, cy, R_MARS_AU * SCALE_2D, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(193,68,14,0.35)';
      ctx2.lineWidth = 1;
      ctx2.stroke();

      const sg = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 30);
      sg.addColorStop(0, 'rgba(255,228,130,0.4)');
      sg.addColorStop(1, 'rgba(255,120,0,0)');
      ctx2.beginPath();
      ctx2.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx2.fillStyle = sg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx2.fillStyle = '#fff8e7';
      ctx2.fill();
    }

    // Past/future split — past solid, future dashed at low opacity.
    function drawSplit(pts: Vec2[], t: number, past: string, future: string) {
      if (pts.length < 2) return;
      const split = Math.max(0, Math.min(pts.length - 1, Math.floor(t * (pts.length - 1))));
      if (split > 0) {
        ctx2.beginPath();
        ctx2.moveTo(ptX(pts[0].x), ptZ(pts[0].z));
        for (let i = 1; i <= split; i++) {
          ctx2.lineTo(ptX(pts[i].x), ptZ(pts[i].z));
        }
        ctx2.strokeStyle = past;
        ctx2.lineWidth = 2;
        ctx2.setLineDash([]);
        ctx2.stroke();
      }
      ctx2.beginPath();
      ctx2.moveTo(ptX(pts[split].x), ptZ(pts[split].z));
      for (let i = split + 1; i < pts.length; i++) {
        ctx2.lineTo(ptX(pts[i].x), ptZ(pts[i].z));
      }
      ctx2.strokeStyle = future;
      ctx2.lineWidth = 1.5;
      ctx2.setLineDash([4, 6]);
      ctx2.stroke();
      ctx2.setLineDash([]);
    }

    const sc = spacecraftPos(bridge.simDay, bridge.arcTimeline, bridge.outPts, bridge.retPts);
    const useCislunar2D =
      bridge.isMoonMission &&
      bridge.cislunarTrajectory != null &&
      bridge.cislunarTrajectory.phases.length > 0;

    if (useCislunar2D && bridge.cislunarTrajectory) {
      // ADR-058: 2D Moon-mission view rendered from the cislunar
      // trajectory (ECI km), mirroring the 3D cislunar scene. Earth
      // at canvas centre, Moon orbit ring at scale, phase-coloured
      // trajectory lines with the lunar-phase moon-frame offset
      // applied so orbit + descent track the moving Moon.
      const BASE_CIS_SCALE = (Math.min(W, H) * 0.4) / A_MOON_KM;
      const moonRef = moonEciPos(bridge.arcTimeline.flyby_day);
      const moonNow = moonEciPos(bridge.simDay);
      const moonDeltaX = moonNow.x - moonRef.x;
      const moonDeltaZ = moonNow.z - moonRef.z;

      // Auto-zoom: lerp scale + centre toward target based on whether
      // the active phase is lunar-local. Closeup scale × CIS2D_CLOSEUP_SCALE,
      // centre tracks Moon. Wide stays at base scale + Earth centre.
      const LUNAR_LOCAL_2D = new Set([
        'lunar_orbit',
        'spiral_lunar',
        'lunar_flyby',
        'descent',
        'ascent',
      ]);
      const metDaysForZoom = bridge.simDay - bridge.arcTimeline.dep_day;
      let activePhaseForZoom = bridge.cislunarTrajectory.phases[0];
      for (const p of bridge.cislunarTrajectory.phases) {
        if (metDaysForZoom >= p.start_met_days && metDaysForZoom <= p.end_met_days) {
          activePhaseForZoom = p;
          break;
        }
      }
      if (LUNAR_LOCAL_2D.has(activePhaseForZoom.type)) {
        cis2dTargetScale = CIS2D_CLOSEUP_SCALE;
        cis2dTargetCenterX = moonNow.x;
        cis2dTargetCenterZ = moonNow.z;
      } else {
        cis2dTargetScale = CIS2D_WIDE_SCALE;
        cis2dTargetCenterX = 0;
        cis2dTargetCenterZ = 0;
      }
      // 0.04 ≈ 1.25 s transition at 60 fps (matches 3D zoom feel).
      const LERP = 0.04;
      cis2dScale += (cis2dTargetScale - cis2dScale) * LERP;
      cis2dCenterX += (cis2dTargetCenterX - cis2dCenterX) * LERP;
      cis2dCenterZ += (cis2dTargetCenterZ - cis2dCenterZ) * LERP;

      const SCALE_CIS_2D = BASE_CIS_SCALE * cis2dScale;
      const cisX = (km: number) => cx + (km - cis2dCenterX) * SCALE_CIS_2D;
      const cisZ = (km: number) => cy + (km - cis2dCenterZ) * SCALE_CIS_2D;

      // Moon orbit ring (centred on Earth).
      ctx2.beginPath();
      ctx2.arc(cx, cy, A_MOON_KM * SCALE_CIS_2D, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(170,170,204,0.25)';
      ctx2.lineWidth = 0.6;
      ctx2.stroke();

      const PHASE_COLORS_2D: Record<string, string> = {
        parking: '#4b9cd3',
        tli_coast: '#ffd166',
        lunar_orbit: '#c77dff',
        lunar_flyby: '#ff9933',
        descent: '#ef476f',
        ascent: '#ef476f',
        tei_coast: '#06d6a0',
        reentry: '#ef476f',
        spiral_earth: '#4b9cd3',
        spiral_lunar: '#c77dff',
      };

      // Render each phase. Lunar-frame phases (orbit, descent, etc.)
      // get the (currentMoon - moonAtFlyby) offset so they track Moon.
      for (const phase of bridge.cislunarTrajectory.phases) {
        if (phase.points.length < 2) continue;
        const lunarLocal = LUNAR_LOCAL_2D.has(phase.type);
        const ox = lunarLocal ? moonDeltaX : 0;
        const oz = lunarLocal ? moonDeltaZ : 0;
        ctx2.beginPath();
        ctx2.moveTo(cisX(phase.points[0].x + ox), cisZ(phase.points[0].z + oz));
        for (let i = 1; i < phase.points.length; i++) {
          ctx2.lineTo(cisX(phase.points[i].x + ox), cisZ(phase.points[i].z + oz));
        }
        ctx2.strokeStyle = PHASE_COLORS_2D[phase.type] ?? '#ffffff';
        ctx2.lineWidth = 1.6;
        ctx2.stroke();
      }

      // Earth at origin.
      const eg = ctx2.createRadialGradient(cx, cy, 0, cx, cy, 12);
      eg.addColorStop(0, 'rgba(75,156,211,0.55)');
      eg.addColorStop(1, 'rgba(75,156,211,0)');
      ctx2.beginPath();
      ctx2.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx2.fillStyle = eg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#4b9cd3';
      ctx2.fill();
      ctx2.font = "bold 9px 'Space Mono', monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2.textAlign = 'left';
      ctx2.fillText('EARTH', cx + 9, cy + 3);

      // Moon at current position.
      const mx = cisX(moonNow.x);
      const my = cisZ(moonNow.z);
      const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 8);
      mg.addColorStop(0, 'rgba(220,220,220,0.5)');
      mg.addColorStop(1, 'rgba(220,220,220,0)');
      ctx2.beginPath();
      ctx2.arc(mx, my, 8, 0, Math.PI * 2);
      ctx2.fillStyle = mg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(mx, my, 3.5, 0, Math.PI * 2);
      ctx2.fillStyle = '#dddddd';
      ctx2.fill();
      ctx2.fillText('MOON', mx + 7, my + 3);

      // Spacecraft sprite at its cislunar-trajectory position. Walk
      // the phase list using MET to find current absolute position,
      // applying the same lunar-frame offset for lunar phases.
      const metDays = bridge.simDay - bridge.arcTimeline.dep_day;
      let active = bridge.cislunarTrajectory.phases[0];
      for (const p of bridge.cislunarTrajectory.phases) {
        if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
          active = p;
          break;
        }
      }
      const span = active.end_met_days - active.start_met_days;
      const tt = span > 0 ? Math.max(0, Math.min(1, (metDays - active.start_met_days) / span)) : 0;
      const last = active.points.length - 1;
      const f = tt * last;
      const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
      const frac = f - i;
      const a = active.points[i];
      const b = active.points[i + 1] ?? a;
      const lunarLocal = LUNAR_LOCAL_2D.has(active.type);
      const ox = lunarLocal ? moonDeltaX : 0;
      const oz = lunarLocal ? moonDeltaZ : 0;
      const sx = cisX(a.x + (b.x - a.x) * frac + ox);
      const sy = cisZ(a.z + (b.z - a.z) * frac + oz);
      // Red filled circle matching the 3D sprite glyph.
      const scGlow = ctx2.createRadialGradient(sx, sy, 0, sx, sy, 10);
      scGlow.addColorStop(0, 'rgba(255,58,76,0.45)');
      scGlow.addColorStop(1, 'rgba(255,58,76,0)');
      ctx2.beginPath();
      ctx2.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx2.fillStyle = scGlow;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx2.fillStyle = 'rgba(20,8,12,0.9)';
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx2.fillStyle = '#ff3a4c';
      ctx2.fill();

      return;
    }

    drawSplit(bridge.outPts, Math.min(1, sc.progress / 0.5), '#4466ff', 'rgba(68,102,255,0.2)');
    drawSplit(
      bridge.retPts,
      Math.max(0, (sc.progress - 0.5) / 0.5),
      '#9966ff',
      'rgba(153,102,255,0.2)',
    );

    // Bodies at simDay. Moon-mode: heliocentric like Mars but
    // viewport-centred on live Earth (originAU above). Live Earth +
    // Moon discs and the launch / arrival anchor rings are all
    // drawn through ptX/ptZ so they share the same coordinate frame
    // as the trajectory tube.
    if (bridge.isMoonMission) {
      const eLive = earthPos(bridge.simDay);
      const mLive = moonHelioPos(bridge.simDay);
      const eAnchor = bridge.outPts.length > 0 ? bridge.outPts[0] : eLive;
      const mAnchor = bridge.outPts.length > 0 ? bridge.outPts[bridge.outPts.length - 1] : mLive;
      // LAUNCH anchor ring (where Earth was at depDay).
      ctx2.beginPath();
      ctx2.arc(ptX(eAnchor.x), ptZ(eAnchor.z), 14, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(75,156,211,0.7)';
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.font = "bold 9px 'Space Mono', monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2.textAlign = 'left';
      ctx2.fillText('LAUNCH', ptX(eAnchor.x) + 18, ptZ(eAnchor.z) + 3);
      // ARRIVAL anchor ring (where Moon will be at arrDay).
      ctx2.beginPath();
      ctx2.arc(ptX(mAnchor.x), ptZ(mAnchor.z), 13, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(220,220,220,0.7)';
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2.fillText('ARRIVAL', ptX(mAnchor.x) + 16, ptZ(mAnchor.z) + 3);
      // Live Earth — halo + disc.
      const ex = ptX(eLive.x);
      const ey = ptZ(eLive.z);
      const eg = ctx2.createRadialGradient(ex, ey, 0, ex, ey, 14);
      eg.addColorStop(0, 'rgba(75,156,211,0.6)');
      eg.addColorStop(1, 'rgba(75,156,211,0)');
      ctx2.beginPath();
      ctx2.arc(ex, ey, 14, 0, Math.PI * 2);
      ctx2.fillStyle = eg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(ex, ey, 6, 0, Math.PI * 2);
      ctx2.fillStyle = '#4b9cd3';
      ctx2.fill();
      ctx2.fillText('EARTH', ex + 11, ey + 3);
      // Live Moon — halo + disc.
      const mx = ptX(mLive.x);
      const my = ptZ(mLive.z);
      const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 10);
      mg.addColorStop(0, 'rgba(220,220,220,0.5)');
      mg.addColorStop(1, 'rgba(220,220,220,0)');
      ctx2.beginPath();
      ctx2.arc(mx, my, 10, 0, Math.PI * 2);
      ctx2.fillStyle = mg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(mx, my, 4, 0, Math.PI * 2);
      ctx2.fillStyle = '#dddddd';
      ctx2.fill();
      ctx2.fillText('MOON', mx + 9, my + 3);
    } else {
      // Mars-bound: live Earth + Mars orbit the Sun as the spacecraft
      // flies; the launch / arrival anchors stay pinned to outPts[0]
      // and outPts[N-1]. Two pieces of state to read separately so
      // the user can watch Mars travel toward the ARRIVAL ring as the
      // rocket transits.
      const eLive = earthPos(bridge.simDay);
      const mLive = marsPos(bridge.simDay);
      const eAnchor = bridge.outPts.length > 0 ? bridge.outPts[0] : eLive;
      const mAnchor = bridge.outPts.length > 0 ? bridge.outPts[bridge.outPts.length - 1] : mLive;
      const ex = ptX(eLive.x);
      const ey = ptZ(eLive.z);
      const mx = ptX(mLive.x);
      const my = ptZ(mLive.z);
      const eAx = ptX(eAnchor.x);
      const eAy = ptZ(eAnchor.z);
      const mAx = ptX(mAnchor.x);
      const mAy = ptZ(mAnchor.z);
      // LAUNCH anchor ring (where Earth was at depDay).
      ctx2.beginPath();
      ctx2.arc(eAx, eAy, 12, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(75,156,211,0.7)';
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.font = "bold 9px 'Space Mono', monospace";
      ctx2.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2.textAlign = 'left';
      ctx2.fillText('LAUNCH', eAx + 16, eAy + 3);
      // ARRIVAL anchor ring (where the arc terminates).
      ctx2.beginPath();
      ctx2.arc(mAx, mAy, 11, 0, Math.PI * 2);
      ctx2.strokeStyle = 'rgba(193,68,14,0.7)';
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2.fillText('ARRIVAL', mAx + 14, mAy + 3);
      // Live Earth — halo + disc.
      const eg = ctx2.createRadialGradient(ex, ey, 0, ex, ey, 14);
      eg.addColorStop(0, 'rgba(75,156,211,0.6)');
      eg.addColorStop(1, 'rgba(75,156,211,0)');
      ctx2.beginPath();
      ctx2.arc(ex, ey, 14, 0, Math.PI * 2);
      ctx2.fillStyle = eg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#4b9cd3';
      ctx2.fill();
      ctx2.fillText('EARTH', ex + 9, ey + 3);
      // Live Mars — halo + disc.
      const mg = ctx2.createRadialGradient(mx, my, 0, mx, my, 12);
      mg.addColorStop(0, 'rgba(193,68,14,0.6)');
      mg.addColorStop(1, 'rgba(193,68,14,0)');
      ctx2.beginPath();
      ctx2.arc(mx, my, 12, 0, Math.PI * 2);
      ctx2.fillStyle = mg;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.arc(mx, my, 4, 0, Math.PI * 2);
      ctx2.fillStyle = '#c1440e';
      ctx2.fill();
      ctx2.fillText('MARS', mx + 9, my + 3);
    }

    // Spacecraft glyph — gold chevron sitting at sc.pos. The
    // heading rotation is preserved so the glyph points along the
    // direction of travel (eye reads "moving" from a glance), but
    // the shape is small enough (~6 px) that any heading drift
    // doesn't drag it off the arc visually. Matches the 3D sprite.
    const heading = spacecraftHeading(
      bridge.simDay,
      bridge.arcTimeline,
      bridge.outPts,
      bridge.retPts,
    );
    const sx = ptX(sc.pos.x);
    const sy = ptZ(sc.pos.z);
    ctx2.save();
    ctx2.translate(sx, sy);
    ctx2.rotate(Math.atan2(heading.z, heading.x));
    // Halo
    const sg = ctx2.createRadialGradient(0, 0, 0, 0, 0, 10);
    sg.addColorStop(0, 'rgba(255,200,80,0.35)');
    sg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx2.beginPath();
    ctx2.arc(0, 0, 10, 0, Math.PI * 2);
    ctx2.fillStyle = sg;
    ctx2.fill();
    // Chevron ▶
    ctx2.beginPath();
    ctx2.moveTo(6, 0);
    ctx2.lineTo(-4, 4);
    ctx2.lineTo(-2, 0);
    ctx2.lineTo(-4, -4);
    ctx2.closePath();
    ctx2.fillStyle = '#ffc850';
    ctx2.fill();
    ctx2.restore();

    // Flyby ring — anchored to the arc's flyby waypoint instead of
    // Mars's heliocentric position so the ring always sits on the
    // arc the spacecraft is flying. Same indexing the 3D side uses.
    if (sc.progress >= 0.45 && sc.progress <= 0.55 && bridge.outPts.length > 0) {
      const flybyIdx = Math.floor(0.95 * (bridge.outPts.length - 1));
      const fp = bridge.outPts[flybyIdx];
      const pulse = 0.5 + 0.5 * Math.sin(bridge.simDay * 0.5);
      ctx2.beginPath();
      ctx2.arc(cx + fp.x * SCALE_2D, cy + fp.z * SCALE_2D, 14 + pulse * 3, 0, Math.PI * 2);
      ctx2.strokeStyle = `rgba(255,200,80,${0.5 + pulse * 0.3})`;
      ctx2.lineWidth = 1.5;
      ctx2.stroke();
    }

    // GH #107 — phase marker projection (2D view). Same shape as
    // the 3D path above; markers render as HTML overlays positioned
    // by eciKmToCanvas2dPx output (Moon) or helioAuToCanvas2dPx
    // (Mars/outer-system). Skipped only when the mission has neither.
    if (bridge.hasPhaseMarkers) {
      const view2d = {
        canvasWidth: W,
        canvasHeight: H,
        baseScale2dPerAu: BASE_SCALE_2D,
      };
      const simMet = bridge.simDay - bridge.mission.timeline.dep_day;
      const next: PhaseMarkerRenderState[] = [];
      // Moon path: ECI km → Earth-centred canvas pixels.
      if (bridge.isMoonMission) {
        for (const mk of bridge.phaseMarkers) {
          next.push({
            event: mk.event,
            scienceRef: mk.scienceRef,
            screen: eciKmToCanvas2dPx(mk.posKm, view2d),
            reveal: markerStateFor(mk.event.met_days ?? 0, simMet, {
              reducedMotion: bridge.reducedMotion,
            }),
            eventLabel: defaultEventLabel(mk.event.type),
          });
        }
      }
      // Mars / outer-system path: heliocentric AU → Sun-centred canvas pixels.
      if (!bridge.isMoonMission) {
        for (const mk of bridge.interplanetaryPhaseMarkers) {
          next.push({
            event: mk.event,
            scienceRef: mk.scienceRef,
            screen: helioAuToCanvas2dPx(mk.posAu, view2d),
            reveal: markerStateFor(mk.event.met_days ?? 0, simMet, {
              reducedMotion: bridge.reducedMotion,
            }),
            eventLabel: defaultEventLabel(mk.event.type),
          });
        }
      }
      bridge.phaseMarkerScreens = next;
    } else if (bridge.phaseMarkerScreens.length > 0) {
      bridge.phaseMarkerScreens = [];
    }
  }
  function frame() {
    const now = performance.now();
    // Feed the runtime adaptive frame monitor — fires onStruggle if
    // the rolling-window average frame time stays over budget. The
    // monitor itself is non-blocking and drops backgrounded-tab dt
    // samples (>500 ms) so a tab-switch doesn't trip the toast.
    frameMonitor.tick();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    // Polish-wave-3 cinematic-beat dispatch — single pure call into
    // $lib/fly-cinematic-frame.runCinematicFrame. Handles cruise-hold
    // arming (W3.7), cut overlay (W3.6), peak-hold arm + afterglow
    // window (W3.1 + W3.2), finale opacities (W3.4), and returns
    // the freeze predicate that gates simDay advance + drives the
    // chrome-suppression class (W3.5). Same dispatcher is driven by
    // the test harness in #325 — prod + tests can't drift on call order.
    const currentFrameFlybyMet = parseFlybyMetFromSubPhase(flyCam.lastHelioSubPhase);
    // Earth's longer 4 s hold is selected by looking at the active
    // event's label here — kept inline because it's mission-data-shape
    // dependent and not worth lifting into the helper.
    const activeFlybyEvtForHold = bridge.mission.flight?.events?.find(
      (e: { met_days?: number }) => e.met_days === currentFrameFlybyMet,
    );
    const isEarthHold = (activeFlybyEvtForHold?.label ?? '').toLowerCase().includes('earth');
    const cineOut = runCinematicFrame(
      cine,
      {
        simDay: bridge.simDay,
        depDay: bridge.arcTimeline.dep_day,
        reducedMotion: bridge.reducedMotion,
        isDrag: bridge.isDrag,
        isMoonMission: bridge.isMoonMission,
        currentFrameFlybyMet,
        isEarthFlyby: isEarthHold,
        cruiseHoldTriggerSimDay: bridge.cruiseHoldTriggerSimDay,
        flybyPeakDays: FLYBY_PEAK_DAYS,
      },
      now,
    );
    bridge.cutBlackOpacity = cineOut.cutBlackOpacity;
    bridge.inCinematicHeldBeat = cineOut.isCinematicFreeze;
    bridge.finaleCaptionOpacity = cineOut.finaleCaptionOpacity;
    bridge.finaleBlackOpacity = cineOut.finaleBlackOpacity;
    const isCinematicFreeze = cineOut.isCinematicFreeze;

    // No freeze-frames in the montage (#371): the classic camera
    // freezes the iconic peak-hold AND the afterglow zoom-out. The
    // montage's slow-mo swing + cuts + moving catapult carry the beat
    // entirely, so a freeze-frame just broke the flow (Marko 2026-06).
    // Drop BOTH flyby freezes — sim keeps moving (slow-mo) through the
    // whole encounter. (Finale / cruise-hold / launch-dwell are not
    // active during a flyby window, so this only affects the flyby.)
    let cinematicFreeze = isCinematicFreeze;
    if (flyCam.montageEnabled && currentFrameFlybyMet != null) {
      cinematicFreeze = false;
    }
    // Master clock — ascent phase: advance the launch MET (LaunchScene is
    // clock-driven, externalClock=true). At the seam LaunchScene's own loop
    // fires the orbit-reached warp → onComplete flips showLaunch off.
    if (bridge.showLaunch && bridge.isPlaying) {
      // Slow-mo beat (item 3): ease the clock down through staging / fairing /
      // payload separation so each reads instead of blitzing past at ×N.
      const slow = sepSlowmoFactor(bridge.launchT, bridge.launchSepTimes);
      bridge.launchT = Math.min(
        bridge.launchDurationS,
        bridge.launchT + dt * bridge.launchSpeed * slow,
      );
    }
    // Master clock — descent phase: advance the EDL time (DescentScene is
    // clock-driven, externalClock=true). At touchdown DescentScene's own
    // loop fires the surface handoff → handleTouchdown navigates away.
    if (bridge.showDescent && bridge.isPlaying) {
      // Earth re-entry: the 1-DOF shallow-corridor model yields a long path
      // (100+ min) that isn't watchable at a real-time multiplier, so compress
      // it to a fixed ~30s wall-time play (scaled by the speed pills) — the HUD
      // clock still ticks the honest MET. Planetary EDL keeps its real-time ×.
      const earthReentry = bridge.descentProfile?.body === 'earth';
      const rate = earthReentry
        ? (bridge.descentDurationS / 30) * (bridge.descentSpeed / 3)
        : bridge.descentSpeed;
      // Slow-mo beat (item 3): ease down through each EDL money shot —
      // chute, heat-shield/backshell sep, skycrane, retro, touchdown. The
      // window scales with duration so the heavily-compressed Earth re-entry
      // (100+ min → 30 s wall) still gets a visible beat, not a 3-s blip.
      const win = Math.max(3.2, bridge.descentDurationS * 0.015);
      const slow = sepSlowmoFactor(bridge.descentT, bridge.descentSepTimes, win);
      bridge.descentT = Math.min(bridge.descentDurationS, bridge.descentT + dt * rate * slow);
    }
    // Master clock — coast phase (Tier-1 Earth-orbit): advance the on-orbit
    // days across a fixed ~22s wall-time play (the REV/date counters carry the
    // real scale via the hybrid rule), then cross to re-entry at the deorbit seam.
    if (bridge.showCoast && bridge.isPlaying && bridge.coastDurationDays > 0) {
      const COAST_PLAY_S = 22;
      bridge.coastMetDays = Math.min(
        bridge.coastDurationDays,
        bridge.coastMetDays + dt * (bridge.coastDurationDays / COAST_PLAY_S),
      );
      if (bridge.coastMetDays >= bridge.coastDurationDays && bridge.descentProfile) {
        // Cross to re-entry only once the descent profile has finished its
        // async load — otherwise hold at the final coast frame (coastMetDays
        // is clamped, so this branch retries each frame) rather than blanking
        // to an empty scene at the deorbit seam. startDescent() dispatches the
        // coast→descent transition (showCoast falls to false via the reducer).
        startDescent();
      }
    }
    if (
      bridge.isPlaying &&
      now >= bridge.launchDwellUntil &&
      !cinematicFreeze &&
      !bridge.showLaunch &&
      !bridge.showDescent &&
      !bridge.showCoast &&
      !bridge.earthCoast
    ) {
      // Flyby slow-motion (#371): around closest approach, ease the
      // effective sim rate down so the gravity-assist swing is
      // watchable instead of a buzz. Only when the montage is on and a
      // flyby is active; the peak-hold freeze still punctuates the peak.
      let effectiveSpeed = bridge.simSpeed;
      if (flyCam.montageEnabled && currentFrameFlybyMet != null) {
        effectiveSpeed = flybySlowmoSpeed(
          bridge.simDay - (bridge.arcTimeline.dep_day + currentFrameFlybyMet),
          bridge.simSpeed,
        );
      }
      bridge.simDay += dt * effectiveSpeed;
      // At arrival, a landing mission enters the descent act instead of
      // looping the cruise — closing the flight circle (RFC-034 §9).
      if (bridge.descentProfile && bridge.simDay >= bridge.arcTimeline.arr_day) {
        bridge.simDay = bridge.arcTimeline.arr_day;
        dispatchPhase({ type: 'startDescent' });
        bridge.descentT = 0;
      } else if (bridge.simDay > bridge.arcTimeline.arr_day + 30) {
        bridge.simDay = bridge.arcTimeline.dep_day;
      }
      // Moon orbits advance in real wall-clock time, decoupled from
      // simSpeed, so they read as a calm drift at any play speed
      // instead of strobing. Frozen alongside simDay during holds.
      moonDriftSec += dt;
    }
    // Cinematic cruise motion — three subtle, slow oscillations
    // layered on top of each other so the camera never feels static
    // during long cruise spans (Voyager 2's ~12-year cruise is
    // ~60 wall-clock minutes at 90× simSpeed; the cruise phase
    // can't be a held shot). All skipped under reduced-motion,
    // while the user is dragging, during a sub-phase lerp, and
    // during Moon-mode.
    // - Azimuthal drift: slow horizontal orbit around the target.
    // - Zoom breathing: flyCam.camR oscillates ±15 % over a 90-second wall-
    //   clock cycle — gentle "in / out" motion.
    // - Tilt drift: flyCam.camP oscillates ±0.10 rad over a 180-second
    //   cycle — adds elevation parallax.
    // Polish-wave-3 Fix A — sim-speed factor scales every flyCam.camT arc
    // rotation + the cruise zoom/tilt lerps. Same problem as the
    // main lerp/track block: the rotations were tuned for 7 d/s.
    // At 30 d/s an entire Cassini Jupiter→Saturn cruise takes ~43
    // wall-clock seconds; the 0.05 rad/s cruise rotation = 2.15 rad
    // total = ~123° of azimuth swing. The cinematic motion was
    // designed for slow play; at high speeds the rotations get
    // overwhelmed by the world racing past. Scaling them keeps the
    // visual cadence consistent with the simulation speed.
    const simSpeedFactor = Math.max(1, bridge.simSpeed / 7);
    if (
      !bridge.isMoonMission &&
      !bridge.reducedMotion &&
      !bridge.isDrag &&
      !flyCam.helioAutoZoomActive &&
      (flyCam.lastHelioSubPhase === 'cruise-out' || flyCam.lastHelioSubPhase === 'cruise-back')
    ) {
      flyCam.camT += 0.05 * dt * simSpeedFactor;
      const t = now * 0.001; // seconds
      // Zoom breathing — modulate around the steady-state cruise
      // target radius. flyCam.helioAutoZoomTargetR holds the cruise-wide
      // value; we add a sinusoid on top so flyCam.camR breathes.
      const ZOOM_AMP = flyCam.helioAutoZoomTargetR * 0.15;
      const zoomOsc = Math.sin((t * (Math.PI * 2)) / 90) * ZOOM_AMP;
      flyCam.camR += (flyCam.helioAutoZoomTargetR + zoomOsc - flyCam.camR) * 0.005 * simSpeedFactor;
      // Tilt drift — modulate flyCam.camP around cruise default.
      const TILT_AMP = 0.1;
      const tiltOsc = Math.sin((t * (Math.PI * 2)) / 180) * TILT_AMP;
      flyCam.camP += (flyCam.HELIO_CRUISE_P + tiltOsc - flyCam.camP) * 0.005 * simSpeedFactor;
    }
    // #82 epilogue — slow azimuthal rotation around the Sun so the
    // tableau visibly rotates while the audience reads the trajectory
    // arc. 0.04 rad/s × dt × simSpeedFactor keeps the rotation
    // cinematic at all sim speeds (though sim is paused in arrived
    // state, so simSpeedFactor=1 effectively).
    if (!bridge.isMoonMission && !bridge.reducedMotion && !bridge.isDrag && bridge.epilogueActive) {
      flyCam.camT += 0.04 * dt;
    }
    // #86 — same slow azimuthal rotation during the opening's wide
    // phase. Halts once the camera starts lerping to Earth closeup
    // so the composition settles into prelaunch.
    if (!bridge.isMoonMission && !bridge.reducedMotion && !bridge.isDrag && bridge.openingActive) {
      const elapsedO =
        bridge.openingStartedAt > 0 ? performance.now() - bridge.openingStartedAt : 0;
      if (elapsedO < bridge.openingDurationMs - 1000) {
        flyCam.camT += 0.04 * dt;
      }
    }
    // Approach sweep — slow azimuthal arc around the ship-dest
    // midpoint during the final outbound leg. Paired with the
    // wide → close framing lerp (see updateHelioAutoZoomTargets
    // 'approach' branch), this gives the audience the choreographed
    // "zoom out, zoom in, rotate, follow ship, come to planet"
    // sequence the user asked for at the Saturn arrival.
    if (
      !bridge.isMoonMission &&
      !bridge.reducedMotion &&
      !bridge.isDrag &&
      !flyCam.helioAutoZoomActive &&
      flyCam.lastHelioSubPhase === 'approach'
    ) {
      // 0.08 rad/s — a touch faster than cruise (0.05) so the
      // rotation is visibly an "arc around the destination", not
      // just the slow cruise breathing.
      flyCam.camT += 0.08 * dt * simSpeedFactor;
    }
    // Flyby cinema sweep — slow azimuthal orbit + gentle pitch tilt
    // around the body during a flyby sub-phase. Borrows from the
    // NASA mission-art reference set (Cassini-Saturn, Juno-Jupiter,
    // Galileo-Jupiter): the body holds frame while the camera arcs
    // around it, giving the moment a "hero shot" feel instead of a
    // static planet-centered lookup. Skipped under reduced-motion,
    // while the user is dragging, and during the initial sub-phase
    // lerp so the camera settles before the sweep starts.
    // Polish-wave-3 W3.1 — peak-hold arming + re-arm reset.
    // Runs EVERY frame (not gated on flyby sub-phase OR on
    // !flyCam.helioAutoZoomActive) so:
    //   1. The reset fires when the user scrubs out of a held
    //      flyby into launch / cruise / arrived states — otherwise
    //      cine.peakHoldArmedForFlybyMet stays stale and re-jumping to
    //      the same flyby never re-arms.
    //   2. The ARM fires the instant we're inside the ±0.5 sim-day
    //      window of a flyby moment — even if the cinematic lerp
    //      hasn't converged yet. Gating arming on !flyCam.helioAutoZoomActive
    //      meant the camera kept lerping right through the held
    //      window when the previous framing was far from the new
    //      cinema target (e.g. scrubbing from launch wide R=50 to a
    //      flyby R=13).
    //
    // The peak-hold arm step (W3.1) + afterglow window setup (W3.2)
    // now fires inside runCinematicFrame at the top of the frame —
    // see the cineOut block above. currentFrameFlybyMet is still in
    // scope from there for the parallax-orbit gate below.
    if (
      !bridge.isMoonMission &&
      !bridge.reducedMotion &&
      !bridge.isDrag &&
      !flyCam.helioAutoZoomActive &&
      flyCam.lastHelioSubPhase?.startsWith('flyby-')
    ) {
      // Parallax orbit — camera arcs around the body during the
      // flyby cinema. Default 0.05 rad/s during approach + depart;
      // boosted 3× during the FLYBY_PEAK_DAYS window (closest-
      // approach beat). The boost creates the "camera moves while
      // the ship holds" cinematic — the camera-disagree principle
      // (shot-language guide P6). Without it the flyby reads as
      // static.
      const flybyMetActive = currentFrameFlybyMet;
      const inPeak =
        flybyMetActive != null &&
        Math.abs(bridge.simDay - (bridge.arcTimeline.dep_day + flybyMetActive)) < FLYBY_PEAK_DAYS;
      // Arming was hoisted to the frame-top block (runs every frame
      // so it fires even mid-lerp). Here we only honour the active
      // cine.peakHoldUntil window to suppress the parallax arc rotation +
      // pitch breathing — during the hold and the afterglow the
      // camera should hold entirely still / pure-dolly, not arc.
      if (!isCinematicFreeze) {
        if (flyCam.helioFlybyDesiredCamT !== null) {
          // Anti-occlusion lerp — pull flyCam.camT toward the perpendicular
          // azimuth so the planet doesn't sit between the camera and
          // the spacecraft. Shortest-arc delta so the swing never
          // takes the long way around. Faster lerp during peak so
          // the iconic frame settles by the hold instant. Layer a
          // small idle oscillation on top so the camera still has
          // motion (camera-disagree principle) without re-introducing
          // the free-spin occlusion bug.
          const TAU = Math.PI * 2;
          let delta = (((flyCam.helioFlybyDesiredCamT - flyCam.camT) % TAU) + TAU) % TAU;
          if (delta > Math.PI) delta -= TAU;
          // Bumped 4× over the original — the choreography's
          // desiredCamT moves ~0.55 rad/sec during the pan window,
          // and at the old 0.025/0.06 rates the steady-state lag was
          // ~21°, leaving the camera still converging WHEN the ship
          // hit peak (user-reported "ship goes through planet, then
          // scene pauses, THEN camera rotates"). At 0.10 normal /
          // 0.25 peak, steady-state lag drops below 5° so the
          // camera arrives at the iconic frame well before peak and
          // just holds.
          const lerpRate = inPeak ? 0.25 : 0.1;
          flyCam.camT += delta * lerpRate * dt * simSpeedFactor * 60;
          // Small ±0.02 rad oscillation (~1.1°) over a 12 s cycle so
          // the camera breathes even after it settles into framing.
          const oscPhase = (now * 0.001 * (Math.PI * 2)) / 12;
          flyCam.camT += Math.cos(oscPhase) * 0.0008 * dt * 60;
        } else {
          // Fix A — scale by simSpeed for consistent visual cadence at
          // high speeds (same reason the cruise/approach arcs scale).
          flyCam.camT += (inPeak ? 0.15 : 0.05) * dt * simSpeedFactor;
        }
        // Gentle pitch breathing around the approach tilt, ±0.05 rad
        // over a 30-second cycle — adds parallax without making the
        // ecliptic plane swing too far.
        const t = now * 0.001;
        const TILT_AMP = 0.05;
        const tiltOsc = Math.sin((t * (Math.PI * 2)) / 30) * TILT_AMP;
        flyCam.camP += (flyCam.HELIO_APPROACH_P + tiltOsc - flyCam.camP) * 0.008;
      }
    }
    // Re-aim the helio camera each frame so the sub-phase auto-zoom
    // lerps (depart → cruise → approach → arrival) actually advance —
    // updateHelioAutoZoomTargets needs to be re-sampled with the
    // live spacecraft + planet positions and the lerp inside flyCam.updateCam
    // has to run per-frame to converge. Moon-mode additionally needs
    // the per-frame Earth-Moon-midpoint re-aim baked into flyCam.updateCam.
    // Gyro tilt-to-look (RFC-020 §6) — a bounded offset layered on the
    // cinematic camera; consumed every frame, applied when not dragging.
    // On this director-driven route it reads as subtle parallax.
    const gy = gyro.consume();
    if (!bridge.isDrag && !bridge.touchActive) {
      flyCam.camT += gy.dAz;
      flyCam.camP = Math.max(0.08, Math.min(Math.PI * 0.48, flyCam.camP + gy.dEl));
    }
    // Feed the velocity-tone sonification (RFC-020 §3). Finite-difference the
    // planned arc 0.5d ahead → AU/day → km/s. Only when AUDIO is active.
    if (sensory.active('audio')) {
      const p0 = spacecraftPos(bridge.simDay, bridge.arcTimeline, bridge.outPts, bridge.retPts).pos;
      const p1 = spacecraftPos(
        bridge.simDay + 0.5,
        bridge.arcTimeline,
        bridge.outPts,
        bridge.retPts,
      ).pos;
      const auPerDay = Math.hypot(p1.x - p0.x, p1.z - p0.z) / 0.5;
      flyVelocitySon.update((auPerDay * 1.495978707e8) / 86400);
    }
    flyCam.updateCam();
    // Montage override (#371) — when a flyby shot is active, snap the
    // real camera onto it AFTER the normal pipeline ran (Marko's
    // "override final transform"). Cuts between shots are the frame
    // discontinuity at window boundaries — no transition needed. We
    // also sync the spherical state (flyCam.camR/flyCam.camP/flyCam.camT/flyCam.camTarget) to the
    // shot so leaving the montage hands back to the cruise lerp without
    // a jump, and restore the base FOV when no shot is active.
    if (!bridge.isMoonMission && flyCam.montageShotFrame) {
      const f = flyCam.montageShotFrame;
      // CUT vs glide: a shot-kind change snaps (hard cut); within a
      // shot we ease toward the frame so the chase/depart track the
      // ship smoothly instead of jittering at trajectory waypoints.
      const isCut = flyCam.montageShotKind !== bridge.lastMontageShotKind;
      bridge.lastMontageShotKind = flyCam.montageShotKind;
      const ease = isCut ? 1 : 0.22;
      flyCam.camTarget.x += (f.lookAt.x - flyCam.camTarget.x) * ease;
      flyCam.camTarget.y += (f.lookAt.y - flyCam.camTarget.y) * ease;
      flyCam.camTarget.z += (f.lookAt.z - flyCam.camTarget.z) * ease;
      const npx = camera.position.x + (f.position.x - camera.position.x) * ease;
      const npy = camera.position.y + (f.position.y - camera.position.y) * ease;
      const npz = camera.position.z + (f.position.z - camera.position.z) * ease;
      camera.position.set(npx, npy, npz);
      // Sync spherical state from the (eased) transform so leaving the
      // montage hands back to the cruise lerp without a jump.
      const ox = npx - flyCam.camTarget.x;
      const oy = npy - flyCam.camTarget.y;
      const oz = npz - flyCam.camTarget.z;
      const rr = Math.hypot(ox, oy, oz);
      if (rr > 1e-6) {
        flyCam.camR = rr;
        flyCam.camP = Math.acos(Math.max(-1, Math.min(1, oy / rr)));
        flyCam.camT = Math.atan2(ox, oz);
      }
      if (f.rollRad) {
        camera.up.set(Math.sin(f.rollRad), Math.cos(f.rollRad), 0);
      } else {
        camera.up.set(0, 1, 0);
      }
      camera.lookAt(flyCam.camTarget.x, flyCam.camTarget.y, flyCam.camTarget.z);
      if (Math.abs(camera.fov - f.fovDeg) > 0.01) {
        camera.fov = f.fovDeg;
        camera.updateProjectionMatrix();
      }
    } else if (Math.abs(camera.fov - baseFov) > 0.01) {
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    }
    // Mirror the live scene camera into $state for the debug plot
    // (DEV only — see debugCamWorld). Lets the 2D viewer trace the
    // camera's actual motion as the ship flies.
    if (import.meta.env.DEV) {
      bridge.debugCamWorld = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      bridge.debugCamTargetWorld = {
        x: flyCam.camTarget.x,
        y: flyCam.camTarget.y,
        z: flyCam.camTarget.z,
      };
      if (bridge.debugMontageShot !== flyCam.montageShotKind)
        bridge.debugMontageShot = flyCam.montageShotKind;
    }

    // Moon-mode rendering: heliocentric, same framing as Mars.
    // Sun + Earth orbit visible in the background; Earth at its
    // live heliocentric position; Moon orbits Earth at the
    // exaggerated MOON_FLY_RADIUS_AU (real Earth-Moon distance is
    // sub-pixel at this scale). The cislunar arc runs from
    // Earth-at-dep to Moon-at-arr in heliocentric AU. Mars + Mars
    // orbit hidden so the scene focuses on Earth+Moon.
    if (bridge.isMoonMission) {
      marsMesh.visible = false;
      sunCore.visible = true;
      sunGlow.visible = true;
      earthOrbitLine.visible = true;
      helioHandles.setDestinationOrbitVisible(false);
      moonMesh.visible = true;
      const ePos = earthPos(bridge.simDay);
      const mPos = moonHelioPos(bridge.simDay);
      earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      moonMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);
      // Track Moon's orbit ring to Earth's heliocentric position so
      // it stays centred on Earth as both drift around the Sun.
      if (moonOrbitRing && moonOrbitRing.visible) {
        moonOrbitRing.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      }
    } else {
      marsMesh.visible = true;
      sunCore.visible = true;
      // Sun glow halo dominates the frame during the iconic-photo
      // flyby cinema (the 20u additive halo overpowers a planet
      // that fills only ~6u in radius), so hide it while a flyby
      // sub-phase is active. Restored once cruise resumes.
      sunGlow.visible = !flyCam.lastHelioSubPhase?.startsWith('flyby-');
      earthOrbitLine.visible = true;
      helioHandles.setDestinationOrbitVisible(true);
      moonMesh.visible = false;
      if (moonOrbitRing) moonOrbitRing.visible = false;
      // Earth + Mars orbit the Sun in real time as the spacecraft
      // flies. The fixed convergence points (where Earth was at
      // launch and where Mars will be at arrival) are marked by
      // the persistent LAUNCH / ARRIVAL anchor rings, which stay
      // pinned to outPts[0] and outPts[N-1] in the marker $effect.
      // Separating "live planet body" from "mission anchor" lets
      // the user watch Mars travel along its orbit toward the
      // arrival ring as the spacecraft transits.
      const ePos = earthPos(bridge.simDay);
      // Destination position uses the active mission's target body,
      // not always Mars. Jupiter / Saturn / Neptune / Pluto / Ceres
      // missions now render their actual target instead of a
      // confusing Mars stand-in. Reads currentDestMeshId so a
      // secondary-flyby swap (NH at Arrokoth post-Pluto) positions
      // the destinationMesh at the swapped body's heliocentric
      // location, not the mission's primary.
      const mPos = destinationPos(bridge.simDay, bridge.currentDestMeshId);
      earthMesh.position.set(ePos.x * SCALE_3D, 0, ePos.z * SCALE_3D);
      marsMesh.position.set(mPos.x * SCALE_3D, 0, mPos.z * SCALE_3D);
      // Earth's Hill sphere + L1/L2 track Earth's per-frame position.
      helioHandles.updateHillSphereForBody('earth', ePos.x * SCALE_3D, ePos.z * SCALE_3D);
      helioHandles.updateMagnetosphereForBody('earth', ePos.x * SCALE_3D, ePos.z * SCALE_3D);
      helioHandles.updateMoonsForParent(
        'earth',
        ePos.x * SCALE_3D,
        ePos.z * SCALE_3D,
        moonDriftSec,
      );
      // Context planets — per-frame position updates for any non-
      // active planet rendered for grand-tour context. Each mesh
      // tracks its heliocentric position at simDay so the user
      // sees Venus where Venus was when Cassini did its flybys,
      // Jupiter where it was when Voyager 2 swung past, etc.
      for (const [planetId, mesh] of helioHandles.contextPlanets) {
        if (!mesh.visible) continue;
        const p = destinationPos(bridge.simDay, planetId);
        mesh.position.set(p.x * SCALE_3D, 0, p.z * SCALE_3D);
        // Hill sphere + Lagrange overlays follow the planet; they
        // hide via setHillSpheresVisible / setLagrangePointsVisible
        // when the lens layer is off, so this update is cheap when
        // unused (just position writes — no geometry rebuild).
        helioHandles.updateHillSphereForBody(planetId, p.x * SCALE_3D, p.z * SCALE_3D);
        helioHandles.updateMagnetosphereForBody(planetId, p.x * SCALE_3D, p.z * SCALE_3D);
        helioHandles.updateMoonsForParent(planetId, p.x * SCALE_3D, p.z * SCALE_3D, moonDriftSec);
      }
      // Active destination also gets moon updates so Jupiter/Saturn
      // missions (Cassini, Juno, Voyager) show their moons at the
      // destination they're rendering live.
      helioHandles.updateMoonsForParent(
        bridge.activeDestination,
        mPos.x * SCALE_3D,
        mPos.z * SCALE_3D,
        moonDriftSec,
      );
      // Active destination — its Hill sphere lives in the same
      // entries map, keyed by planet id.
      helioHandles.updateHillSphereForBody(
        bridge.activeDestination,
        mPos.x * SCALE_3D,
        mPos.z * SCALE_3D,
      );
      helioHandles.updateMagnetosphereForBody(
        bridge.activeDestination,
        mPos.x * SCALE_3D,
        mPos.z * SCALE_3D,
      );
    }

    const sc = spacecraftPos(bridge.simDay, bridge.arcTimeline, bridge.outPts, bridge.retPts);
    // Sprite glyph sits at sc.pos. No lookAt — sprites face the
    // camera by construction so the glyph is always centred on the
    // arc regardless of curvature.
    scSprite.position.set(sc.pos.x * SCALE_3D, (sc.pos.y ?? 0) * SCALE_3D, sc.pos.z * SCALE_3D);
    // Per-mission 3D model rides the same position. Visibility +
    // arrival-hide handled by the same code path that owns scSprite
    // a few lines below; here we only update the transform.
    if (helioMission.scModel) {
      helioMission.scModel.position.copy(scSprite.position);
    }
    // During flyby cinema the camera is tight on the planet (flyCam.camR =
    // 2.4 × body radius). The default 4×4 sprite + 3.0 model scale
    // are sized for cruise — at flyby they swamp the planet and
    // look 'cartoonish'. Scale down so the ship reads as a
    // foreground accent against the body, matching the NASA mission-
    // art compositions. Outside the cinema window the ship goes
    // back to its cruise scale.
    // Cinema also offsets the ship TOWARD the camera so the 3D
    // model sits geometrically in front of the planet body — the
    // hero-shot composition from the NASA mission-art reference
    // set (Cassini-Saturn, Juno-Jupiter): ship as foreground accent,
    // planet limb behind. Without this offset, even with the +y
    // waypoint anchor, the camera-elevation angle could still put
    // the model behind the planet's z-range and the planet's
    // opaque MeshPhongMaterial occludes it.
    if (flyCam.lastHelioSubPhase?.startsWith('flyby-')) {
      // Push the ship toward the camera by the flyby body's radius
      // — enough to clear the planet's front face. activeFlybyMet
      // + flybyId tracked via __flyDebug; use the body's PLANET_SIZE
      // for the offset magnitude. Stays inside the cinema target
      // sphere (flyCam.camR = 2.4·r), so the ship doesn't fly off-frame.
      const flybyDbg = window.__flyDebug;
      const bodyR = flybyDbg?.flybySize ?? 2.5;
      const overrideCamR = FLYBY_OVERRIDES[flybyDbg?.flybyId ?? '']?.toCameraR ?? 1.4;
      // The toward-camera offset is ONLY for the tight HERO composition
      // (where the planet's opaque mesh would otherwise occlude the
      // ship). In the montage's moving/wide shots (approach=chase,
      // depart=catapult) the ship is un-occluded by construction, and
      // the far, orbiting camera makes the offset DIRECTION swing frame
      // to frame → the ship wobbles. Skip it there; the ship rides its
      // true trajectory position. (#371)
      const montageNonHero =
        flyCam.montageEnabled &&
        flyCam.montageShotKind != null &&
        flyCam.montageShotKind !== 'hero';
      const camToShip = new THREE.Vector3().subVectors(camera.position, scSprite.position);
      const dist = camToShip.length();
      if (dist > 0.01 && !montageNonHero) {
        camToShip.multiplyScalar((bodyR * overrideCamR) / dist);
        scSprite.position.add(camToShip);
        if (helioMission.scModel) helioMission.scModel.position.copy(scSprite.position);
      }
      // Scale the ship to read as a foreground hero without
      // swamping the body. Each flyby tunes its own scale via
      // FLYBY_OVERRIDES below (Saturn arrival keeps its smaller
      // ship-on-rings look, Jupiter takes a closer-in scale, etc.)
      // — the variation matches the NASA reference set, which
      // doesn't use a single universal composition.
      const overrides = FLYBY_OVERRIDES[flybyDbg?.flybyId ?? ''] ?? {
        spriteScale: 1.8,
        modelScale: 1.3,
        toCameraR: 1.4,
      };
      scSprite.scale.set(overrides.spriteScale, overrides.spriteScale, 1);
      if (helioMission.scModel) helioMission.scModel.scale.setScalar(overrides.modelScale);
      // Boom orientation: rotate the 3D model so its iconic-front
      // axis faces (roughly) the camera and the long magnetometer
      // boom angles AWAY from the planet's limb. Each builder model
      // ships with its own default axes — Cassini's HGA dish faces
      // +X, magnetometer boom extends along -Y. lookAt(camera)
      // orients the model's -Z toward the camera; rotating around
      // local Y by +π/2 brings +X (dish) to that direction. Then
      // an additional tilt around local Z lifts the boom off the
      // planet-ship-camera plane so it reads as a graceful sweep
      // across the frame instead of running through the planet.
      if (helioMission.scModel) {
        helioMission.scModel.lookAt(camera.position);
        helioMission.scModel.rotateY(Math.PI / 2);
        helioMission.scModel.rotateZ(-0.35); // 20° tilt so the boom angles up-left
      }
    } else {
      scSprite.scale.set(2.5, 2.5, 1);
      if (helioMission.scModel) {
        helioMission.scModel.scale.setScalar(1.5);
        // Cruise: reset to identity orientation so the model rides
        // along the trajectory without the cinema-specific tilt.
        helioMission.scModel.rotation.set(0, 0, 0);
      }
    }

    // Phase-based visibility: LAUNCH + ARRIVAL anchor rings both stay
    // visible from pre-launch through the entire flight so the user
    // can always see where the mission started and where it's going;
    // both hide on arrival together with the trajectory line so the
    // scene "freezes" to just the planets continuing their orbits.
    // Spacecraft sprite also hides on arrival.
    const phaseNow = sc.phase;
    const afterArrival = phaseNow === 'arrived';
    // First-frame arrival snap. Pre-polish-wave-2 the camera spent
    // ~10 s of wall-clock LERPing from the cruise-out wide frame
    // toward the arrived target — user feedback "after arrival
    // milestone is not optimal, mostly empty space in camera; last
    // 10 s are really good but before that is not." The lerp is the
    // last 10 s catching up. Snap once on the phase transition so
    // the user lands directly on the parked-in-orbit composition.
    if (phaseNow === 'arrived' && !cine.arrivalSnapped) {
      bridge.camSnapUntil = performance.now() + 1500;
      cine.arrivalSnapped = true;
      // W3.4 — kick off the end-of-mission locked-off finale on
      // one-way helio missions (round-trip endings at Earth and
      // moon-missions are handled differently and stay out of the
      // finale path). Starts AFTER the 1.5 s arrival snap so the
      // parked-in-orbit composition is in frame before the lock.
      // Finale lock (MISSION END caption + 12 s Saturn closeup hold +
      // black fade) was removed per Marko — the epilogue tableau
      // already carries an end-of-mission caption ("MISSION FLIGHT
      // PATH · <mission>") and stacking two title beats reads as
      // redundant. We now go straight from arrival → epilogue: the
      // arrived-branch's epilogueActive trigger below is the only
      // end-of-mission camera mode. inMissionFinale stays false so
      // none of the finale-caption / finale-black / Saturn-closeup-
      // hold UI ever fires.
      const isOneWayHelioEnd = !bridge.isMoonMission && bridge.retPts.length < 2;
      if (isOneWayHelioEnd && bridge.epilogueStartedAt === 0) {
        bridge.epilogueStartedAt = performance.now();
        bridge.epilogueActive = true;
      }
    }
    // Re-arm the snap when the user scrubs back out of arrived so a
    // subsequent re-entry into arrived triggers the snap again.
    if (phaseNow !== 'arrived' && cine.lastSeenPhase === 'arrived') {
      cine.arrivalSnapped = false;
      // Re-arm the finale too. User scrubbed back into the mission;
      // next re-entry into arrived should fire a fresh finale.
      cine.finaleStartedAt = 0;
      bridge.inMissionFinale = false;
      bridge.finaleCaptionOpacity = 0;
      bridge.finaleBlackOpacity = 0;
      // #82 — clear the epilogue tableau so re-entering arrived
      // gets a fresh finale + epilogue sequence.
      bridge.epilogueStartedAt = 0;
      bridge.epilogueActive = false;
      bridge.epilogueCaptionOpacity = 0;
    }
    cine.lastSeenPhase = phaseNow;
    // W3.4 — finale opacities (caption + black) are computed by
    // runCinematicFrame at the top of the frame and already written
    // to finaleCaptionOpacity / finaleBlackOpacity. Here we only
    // handle the post-settle transition into the #82 epilogue
    // tableau — wide top-down system view + slow rotation + the
    // full mission trajectory visible.
    if (cineOut.finaleSettled) {
      bridge.inMissionFinale = false;
      if (bridge.epilogueStartedAt === 0) {
        bridge.epilogueStartedAt = performance.now();
        bridge.epilogueActive = true;
      }
    }
    // #82 — epilogue tableau. Once active, fade the finale-black
    // overlay BACK OUT to 0 over 1.5 s, lerp the camera to a wide
    // Sun-centred top-down composition, slowly rotate the system
    // around flyCam.camT, and surface a "MISSION FLIGHT PATH · <name>"
    // caption. The full out-line / dep+arr markers remain visible
    // (see the helio-trajectory visibility block below). Stays
    // until the user scrubs out (resetCinematicForMissionSwap or
    // the phase-leaves-arrived reset wipe it).
    if (bridge.epilogueActive && bridge.epilogueStartedAt > 0) {
      const elapsedE = performance.now() - bridge.epilogueStartedAt;
      // Black fade-out 1 → 0 across the first 1.5 s
      if (elapsedE < 1500) {
        bridge.finaleBlackOpacity = Math.max(0, 1 - elapsedE / 1500);
      } else {
        bridge.finaleBlackOpacity = 0;
      }
      // Caption fade-in 0 → 1 across t=1500 → 2500
      if (elapsedE >= 1500) {
        bridge.epilogueCaptionOpacity = Math.min(1, (elapsedE - 1500) / 1000);
      }
    }
    // #86 opening — title (mission name + agency + years), context
    // (story + stats), fleet asset cards fade in sequentially over
    // ~5.5 s while the camera holds at the wide top-down system view.
    // Then everything fades out 7.5 → 9.5 s and the camera lerps to
    // the prelaunch Earth-closeup composition for the 4 s W3.3
    // launch dwell. At 13.5 s the launch ring fires.
    if (bridge.openingActive && bridge.openingStartedAt > 0) {
      const elapsedO = performance.now() - bridge.openingStartedAt;
      // Faster fade-out per user feedback — 2000 ms → 1000 ms so the
      // scene reveals more crisply as the title overlays clear. The
      // camera lerp gate (in updateHelioAutoZoomTargets 'opening'
      // branch) uses the same fadeOutAt so the wide → Earth-closeup
      // transition aligns with the visual fade.
      const fadeOutAt = bridge.openingDurationMs - 1000;
      const endAt = bridge.openingDurationMs;
      // Title fade-in 0 → 1 across 0 → 1000 ms, fade-out 1000 ms
      if (elapsedO < 1000) {
        bridge.openingTitleOpacity = elapsedO / 1000;
      } else if (elapsedO < fadeOutAt) {
        bridge.openingTitleOpacity = 1;
      } else if (elapsedO < endAt) {
        bridge.openingTitleOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
      } else {
        bridge.openingTitleOpacity = 0;
      }
      // Context fade-in 1500 → 3000 ms
      if (elapsedO < 1500) {
        bridge.openingContextOpacity = 0;
      } else if (elapsedO < 3000) {
        bridge.openingContextOpacity = (elapsedO - 1500) / 1500;
      } else if (elapsedO < fadeOutAt) {
        bridge.openingContextOpacity = 1;
      } else if (elapsedO < endAt) {
        bridge.openingContextOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
      } else {
        bridge.openingContextOpacity = 0;
      }
      // Fleet asset cards fade-in 3000 → 5000 ms
      if (elapsedO < 3000) {
        bridge.openingFleetOpacity = 0;
      } else if (elapsedO < 5000) {
        bridge.openingFleetOpacity = (elapsedO - 3000) / 2000;
      } else if (elapsedO < fadeOutAt) {
        bridge.openingFleetOpacity = 1;
      } else if (elapsedO < endAt) {
        bridge.openingFleetOpacity = Math.max(0, 1 - (elapsedO - fadeOutAt) / 1000);
      } else {
        bridge.openingFleetOpacity = 0;
      }
      // End opening at adaptive endAt
      if (elapsedO >= endAt) {
        dispatchPhase({ type: 'openingComplete' });
        bridge.openingTitleOpacity = 0;
        bridge.openingContextOpacity = 0;
        bridge.openingFleetOpacity = 0;
      }
    }
    // The LAUNCH / ARRIVAL anchor rings + their date sprites are
    // sized for the wide cruise framing. At any closeup sub-phase
    // (helio flyby cinema, helio prelaunch / approach / depart,
    // cislunar Moon / Earth phase closeups, Mars rover landing,
    // any mission's tight camera moment) the rings + dates loom
    // huge and dominate the body+ship hero composition — "the
    // date is bigger than Saturn." Always ugly when zoomed in.
    // Show only when the auto-camera is in a wide cruise framing.
    const wideHelio =
      flyCam.lastHelioSubPhase === 'cruise-out' ||
      flyCam.lastHelioSubPhase === 'cruise-back' ||
      flyCam.lastHelioSubPhase === null;
    // Cislunar wide = not in a closeup phase. flyCam.lastAutoZoomPhase is
    // normally a phase-type string (e.g., "tli_coast",
    // "lunar_orbit_near_moon") — non-null for the whole mission.
    // The "wide" phases (cruise + the translunar coasts) leave
    // flyCam.autoZoomTargetR at flyCam.WIDE_DISTANCE; the close-up phases
    // (LUNAR_PHASE_TYPES + EARTH_PHASE_TYPES + the proximity
    // sentinel "_near_moon" suffix) pull the camera tight. Test
    // the target distance directly: if the camera is still aiming
    // at the wide framing, the rings are safe to show.
    const wideCislunar = flyCam.autoZoomTargetR >= flyCam.WIDE_DISTANCE * 0.9;
    const wideEnoughForAnchors = bridge.isMoonMission ? wideCislunar : wideHelio;
    const showAnchors = !afterArrival && wideEnoughForAnchors;
    if (depMarker) depMarker.visible = showAnchors;
    if (depLabelSprite) depLabelSprite.visible = showAnchors;
    if (arrMarker) arrMarker.visible = showAnchors;
    if (arrLabelSprite) arrLabelSprite.visible = showAnchors;
    const showRet = showAnchors && bridge.retPts.length >= 2;
    if (retMarker) retMarker.visible = showRet;
    if (retLabelSprite) retLabelSprite.visible = showRet;
    // #82 — keep the full trajectory visible during the epilogue
    // tableau (the whole point is to show the "where the mission
    // went" arc as a static visual). Hide during flyby cinema so
    // the iconic frozen frame isn't cluttered with the trajectory
    // chord — same rule as the phase-marker label hiding. Marko:
    // "when we zoom in also hide blue line as we hid the
    // milestone marker."
    const inFlybyCinemaForLines = flyCam.lastHelioSubPhase?.startsWith('flyby-') ?? false;
    if (outLine)
      outLine.visible = (!afterArrival || bridge.epilogueActive) && !inFlybyCinemaForLines;
    if (retLine)
      retLine.visible =
        (!afterArrival || bridge.epilogueActive) &&
        bridge.retPts.length >= 2 &&
        !inFlybyCinemaForLines;
    // When a per-mission 3D model is present, it becomes the primary
    // glyph and the generic sprite hides entirely (no duplication).
    // Otherwise the sprite remains the glyph.
    //
    // Pre-polish-wave-2 this hid both the model and sprite the
    // moment phase === 'arrived'. User feedback: "at end spaceship
    // disappears and we said we want it parked in orbit, not gone."
    // Keep the ship visible at arrival so the final frame reads as
    // "spacecraft is now in orbit" (Cassini at Saturn) or "returned
    // home" (round-trip at Earth) instead of "ship gone."
    if (helioMission.scModel) {
      scSprite.visible = false;
      helioMission.scModel.visible = true;
    } else {
      scSprite.visible = true;
    }

    // Freeze playback on arrival — the planets should stop where they
    // are when the mission completes, not keep orbiting indefinitely.
    // Manually pressing play again or scrubbing the timeline still
    // works; this just stops the auto-advance loop.
    if (afterArrival && bridge.isPlaying) {
      bridge.isPlaying = false;
    }

    // ─── Science Layers — per-frame overlay updates ──────────────
    // Position SoI rings at Earth + Mars (or Earth + Moon in cislunar
    // mode) and refresh gravity arrows on the spacecraft. Hidden
    // layers don't bypass this work but their geometry is invisible
    // — cheap.
    // sc.pos.y is non-zero at intermediate flyby waypoints (polish-
    // wave-2 spline +y offset so the path passes ABOVE the planet
    // instead of through it). Hard-coding y=0 here meant the science-
    // layer arrows (gravity to Sun + Earth, velocity tangent,
    // centripetal) sat on the ecliptic plane while the spacecraft
    // sprite + model floated above, with the offset growing
    // visible at the peak of each intermediate flyby. Same bug
    // as the FD-diamond y=0 projection; matching fix.
    const scWorld = new THREE.Vector3(
      sc.pos.x * SCALE_3D,
      (sc.pos.y ?? 0) * SCALE_3D,
      sc.pos.z * SCALE_3D,
    );
    // Stash the latest helio ship position for the cinematic-tier
    // Bokeh DoF focus uniform — set in the post-render branch below.
    scLastWorld = scWorld;

    // Fix B (ship-in-frame safety net) was reverted in commit
    // 5a4… — it fought the cinematic LERP (both nudged flyCam.camTarget
    // each frame in opposite directions) AND compounded flyCam.camR ×1.2
    // every frame the ship was off-screen, which caused the camera
    // to zoom out unboundedly during the post-Jupiter cruise. Fix A
    // alone (sim-speed-aware lerp + arc rotation, see flyCam.updateCam
    // closure) covers the original "all black" symptom; if edge
    // cases remain, a non-conflicting safety net would need to
    // operate on the camera lerp target, not the live flyCam.camTarget.

    const earthWorld = earthMesh.position;
    const marsWorld = marsMesh.position;

    // Keep Mars / Moon SoI visibility in sync with isMoonMission on
    // every mission swap (cheap; just two boolean assignments). The
    // layer-on flag itself comes from the onLayerChange subscription.
    // marsSoI is also gated on activeDestination === 'mars' so it
    // doesn't render at the wrong scale for outer-planet missions.
    marsSoI.visible =
      helioReactive.soiLayerOn && !bridge.isMoonMission && bridge.activeDestination === 'mars';
    moonSoI.visible = helioReactive.soiLayerOn && bridge.isMoonMission;
    if (earthSoI.visible) earthSoI.position.copy(earthWorld);
    if (marsSoI.visible) marsSoI.position.copy(marsWorld);
    if (moonSoI.visible) moonSoI.position.copy(moonMesh.position);

    // Coast preview: walk FORWARD along outPts from the current
    // spacecraft position to the arc terminus. Previously this drew
    // a Keplerian conic projected from current (r, v) — physically
    // correct as "what happens with no further help", but for grand-
    // tour missions (Cassini, Voyager) the conic diverges hard from
    // the multi-waypoint spline because the spline ASSUMES the
    // future gravity assists land. The conic doesn't model them, so
    // the predicted line looped around the Sun while the actual
    // trajectory bent outward at each flyby — visually contradicting
    // the rendered tube. Forward-walking outPts shows the same
    // planned path the spacecraft is committed to.
    if (coastLine.visible && bridge.outPts.length >= 2) {
      const total = bridge.arcTimeline.arr_day - bridge.arcTimeline.dep_day;
      const t =
        total > 0
          ? Math.max(0, Math.min(1, (bridge.simDay - bridge.arcTimeline.dep_day) / total))
          : 0;
      // Forward-arc sampler extracted to $lib/fly/fly-frame-coast (WS-B/B4).
      const scenePositions = sampleForwardArc(bridge.outPts, t, SCALE_3D);
      const geom = coastLine.geometry as THREE.BufferGeometry;
      geom.setAttribute('position', new THREE.BufferAttribute(scenePositions, 3));
      geom.attributes.position.needsUpdate = true;
      geom.computeBoundingSphere();
      coastLine.computeLineDistances();
    }

    if (gravArrowEarth.visible || gravArrowSun.visible) {
      // Distances in km between spacecraft and source bodies. The
      // /fly scene unit is SCALE_3D × AU, so convert: scene → AU →
      // km.
      const auPerScene = 1 / SCALE_3D;
      const dEarthScene = scWorld.distanceTo(earthWorld);
      const dEarthKm = dEarthScene * auPerScene * 149_597_870.7;
      const dSunKm = scWorld.length() * auPerScene * 149_597_870.7;

      // Gravity acceleration (m/s²) — same units as physics; log
      // scale collapses the wide dynamic range into visible arrows.
      const aEarth = gravityAccel(BODY_MASS_KG.earth, dEarthKm);
      const aSun = gravityAccel(BODY_MASS_KG.sun, dSunKm);

      // Earth arrow: anchor at spacecraft, point toward Earth.
      gravArrowEarth.position.copy(scWorld);
      const dirEarth = new THREE.Vector3().subVectors(earthWorld, scWorld).normalize();
      gravArrowEarth.setDirection(dirEarth);
      gravArrowEarth.setLength(
        logScaleLength(aEarth, 1.5, 18, 1e-6, 10),
        0.7, // head length
        0.4, // head width
      );

      // Sun arrow: anchor at spacecraft, point toward Sun (origin).
      gravArrowSun.position.copy(scWorld);
      const dirSun = new THREE.Vector3()
        .subVectors(new THREE.Vector3(0, 0, 0), scWorld)
        .normalize();
      gravArrowSun.setDirection(dirSun);
      gravArrowSun.setLength(logScaleLength(aSun, 1.5, 18, 1e-6, 10), 0.7, 0.4);
    }

    // Velocity tangent on spacecraft: finite-difference of next-frame
    // position from the arc geometry, normalized + scaled by current
    // heliocentric speed.
    if (velocityArrow.visible || centripetalArrow.visible) {
      const sc1 = spacecraftPos(
        bridge.simDay + 0.5,
        bridge.arcTimeline,
        bridge.outPts,
        bridge.retPts,
      ).pos;
      const dx = (sc1.x - sc.pos.x) * SCALE_3D;
      const dz = (sc1.z - sc.pos.z) * SCALE_3D;
      const dirMag = Math.hypot(dx, dz);
      if (velocityArrow.visible && dirMag > 0.0001) {
        velocityArrow.position.copy(scWorld);
        const tangent = new THREE.Vector3(dx / dirMag, 0, dz / dirMag);
        velocityArrow.setDirection(tangent);
        // Scale arrow length by heliocentric speed (km/s) — typical
        // 25-35 km/s on the cruise. 0.4 unit per km/s gives ~12-14
        // unit arrows that read clearly.
        const vLen = Math.min(20, Math.max(4, bridge.heliocentricKms * 0.4));
        velocityArrow.setLength(vLen, 0.7, 0.4);
      }
      if (centripetalArrow.visible) {
        centripetalArrow.position.copy(scWorld);
        // Centripetal acceleration on a Keplerian arc points toward
        // the central body — for a heliocentric arc that's the Sun.
        // Same direction as the gravity-from-Sun arrow.
        const dirSun = new THREE.Vector3()
          .subVectors(new THREE.Vector3(0, 0, 0), scWorld)
          .normalize();
        centripetalArrow.setDirection(dirSun);
        // Length proxy via Sun-gravity acceleration so the arrow
        // size mirrors the curvature of the trajectory at this r.
        const aSun2 = gravityAccel(BODY_MASS_KG.sun, scWorld.length() * (149_597_870.7 / SCALE_3D));
        centripetalArrow.setLength(logScaleLength(aSun2, 1.2, 14, 1e-6, 10), 0.7, 0.4);
      }
    }

    // #1 Engine plume — directed cone at the spacecraft during burn
    // events. Hidden when no burn is active. Per-event-type config:
    //   - launch: exhaust toward Earth (outward thrust)
    //   - tli_or_tmi: exhaust retrograde (prograde acceleration)
    //   - tcm: small retrograde
    //   - edl_or_oi: exhaust prograde (retrograde deceleration)
    // Opacity ramps in/out across ±BURN_WINDOW_DAYS.
    if (!bridge.isMoonMission && bridge.mission.flight?.events) {
      // Burn selection + exhaust-direction math extracted to
      // $lib/fly/fly-frame-burn (WS-B/B4) — byte-identical. The plume-mesh
      // application (position / lookAt / scale / opacity) stays here.
      const activeBurn = findActiveBurn(
        bridge.mission.flight.events,
        bridge.simDay - bridge.arcTimeline.dep_day,
      );
      if (activeBurn) {
        const cfg = BURN_TABLE[activeBurn.type];
        // Sample next-frame position for velocity vector
        const sc1 = spacecraftPos(
          bridge.simDay + 0.5,
          bridge.arcTimeline,
          bridge.outPts,
          bridge.retPts,
        ).pos;
        const vx = (sc1.x - sc.pos.x) * SCALE_3D;
        const vz = (sc1.z - sc.pos.z) * SCALE_3D;
        const { exDx, exDz } = burnExhaustDir(cfg.mode, vx, vz, earthMesh.position, scWorld);
        plumeMesh.position.copy(scWorld);
        plumeMesh.lookAt(scWorld.x + exDx, scWorld.y, scWorld.z + exDz);
        plumeMesh.scale.setScalar(cfg.scale);
        // Opacity: peak at event time, fade linearly across the
        // per-event window (launch's wider window gives a sustained
        // dramatic plume).
        const winOpacity = cfg.windowDays ?? BURN_WINDOW_DAYS_DEFAULT;
        const opacity = 0.85 * Math.max(0, 1 - activeBurn.daysFromEvent / winOpacity);
        plumeMat.uniforms.uOpacity.value = opacity;
        plumeMesh.visible = opacity > 0.02;
      } else {
        plumeMesh.visible = false;
      }
    } else {
      plumeMesh.visible = false;
    }

    // v0.6.3 #228: single source of truth for bright/dim split. The
    // sprite sits at sc.pos = lerpPoint(pts, fraction). Each tube
    // vertex carries aT = i/(N-1) (same parameterization). The
    // fragment shader paints vT < uProgress bright, else dim — and
    // since per-vertex interpolation of vT crosses uProgress at
    // exactly the same world position that lerpPoint(pts, uProgress)
    // returns, the boundary lands on the sprite by construction.
    // No vertex mutation, no drawRange, no two-tube alignment dance.
    //
    // sc.progress goes 0 → 0.5 across outbound and 0.5 → 1 across
    // return, so outFraction maps [0, 0.5] → [0, 1] for outbound
    // and retFraction maps [0.5, 1] → [0, 1] for return.
    const outFraction = Math.min(1, sc.progress * 2);
    const retFraction = Math.max(0, (sc.progress - 0.5) * 2);
    if (outLine) {
      const mat = outLine.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = outFraction;
    }
    if (retLine) {
      const mat = retLine.material as THREE.ShaderMaterial;
      mat.uniforms.uProgress.value = retFraction;
    }

    // marsArr / earthRet are recomputed per-frame from the live
    // arcTimeline so these markers track per-mission launch windows.
    // Moon-mode uses Earth-centred fake-AU coords so a heliocentric
    // marsArr / earthRet would render the rings off in heliocentric
    // space (visible because the camera is also looking at origin).
    // Hide them entirely for Moon missions — Earth + Moon meshes
    // already mark the start/end of the cislunar trajectory.
    if (bridge.view === '3d' && bridge.container) {
      // Per-frame cislunar updates.
      const moonPos = moonEciPos(bridge.simDay);
      if (cislunarMoonMeshRef) {
        cislunarMoonMeshRef.position.set(
          moonPos.x * SCALE_CISLUNAR,
          moonPos.y * SCALE_CISLUNAR,
          moonPos.z * SCALE_CISLUNAR,
        );
      }
      // Drive the moon-frame group offset = (currentMoon - moonAtFlyby)
      // so lunar-phase lines (orbit, descent, etc.) ride with the Moon
      // mesh instead of staying anchored where the Moon was at
      // flyby_day. Same delta used for the spacecraft sprite in
      // updateCislunarSpacecraft.
      if (cislunarMoonFrameGroupRef) {
        const moonRefPos = moonEciPos(bridge.arcTimeline.flyby_day);
        cislunarMoonFrameGroupRef.position.set(
          (moonPos.x - moonRefPos.x) * SCALE_CISLUNAR,
          (moonPos.y - moonRefPos.y) * SCALE_CISLUNAR,
          (moonPos.z - moonRefPos.z) * SCALE_CISLUNAR,
        );
      }
      const metDays = bridge.simDay - bridge.arcTimeline.dep_day;
      flyUpdaters?.cislunar.updateSpacecraft(bridge.cislunarTrajectory, metDays);
      flyUpdaters?.cislunar.updateLineProgress(bridge.cislunarTrajectory, metDays);

      // ─── Cislunar science-layer per-frame updates ─────────────────
      // Drive only the visible overlays so the math is skipped when
      // the user has the layer off. All arrows / markers / coast
      // need the spacecraft's current absolute ECI position + a
      // finite-difference velocity, so the head of this block does
      // both regardless of which layer is on.
      const conicsLayerOn = isLayerOn('conics');
      const anyCislunarLayerOn =
        cisGravEarthArrow.visible ||
        cisGravMoonArrow.visible ||
        cisVelocityArrow.visible ||
        cisCentripetalArrow.visible ||
        cisPeriMarker.visible ||
        cisCoastLine.visible ||
        conicsLayerOn;
      if (
        anyCislunarLayerOn &&
        bridge.cislunarTrajectory &&
        bridge.cislunarTrajectory.phases.length > 0
      ) {
        // Walk phases to find current absolute position + velocity
        // (finite-diff at +0.05 days). For lunar-frame phases the
        // points are stored Moon-relative, so add (currentMoon -
        // moonAtFlyby) to bring them into absolute ECI.
        const LUNAR_LOCAL_LAYERS = new Set([
          'lunar_orbit',
          'spiral_lunar',
          'lunar_flyby',
          'descent',
          'ascent',
        ]);
        const moonRefForLayers = moonEciPos(bridge.arcTimeline.flyby_day);
        const cisPosAt = (metT: number): { x: number; y: number; z: number; phaseType: string } => {
          const traj = bridge.cislunarTrajectory!;
          let active = traj.phases[0];
          for (const p of traj.phases) {
            if (metT >= p.start_met_days && metT <= p.end_met_days) {
              active = p;
              break;
            }
          }
          const span = active.end_met_days - active.start_met_days;
          const t = span > 0 ? Math.max(0, Math.min(1, (metT - active.start_met_days) / span)) : 0;
          const last = active.points.length - 1;
          const f = t * last;
          const i = Math.min(last - 1, Math.max(0, Math.floor(f)));
          const frac = f - i;
          const a = active.points[i];
          const b = active.points[i + 1] ?? a;
          let x = a.x + (b.x - a.x) * frac;
          let y = a.y + (b.y - a.y) * frac;
          let z = a.z + (b.z - a.z) * frac;
          if (LUNAR_LOCAL_LAYERS.has(active.type)) {
            const moonAtT = moonEciPos(bridge.arcTimeline.dep_day + metT);
            x += moonAtT.x - moonRefForLayers.x;
            y += moonAtT.y - moonRefForLayers.y;
            z += moonAtT.z - moonRefForLayers.z;
          }
          return { x, y, z, phaseType: active.type };
        };

        const p0 = cisPosAt(metDays);
        const p1 = cisPosAt(metDays + 0.05);
        const dt_sec = 0.05 * 86400; // days → seconds
        const vx = (p1.x - p0.x) / dt_sec; // km/s
        const vz = (p1.z - p0.z) / dt_sec;
        const vy = (p1.y - p0.y) / dt_sec;
        const speedKms = Math.hypot(vx, vy, vz);
        const isLunarPhase = LUNAR_LOCAL_LAYERS.has(p0.phaseType);

        // Spacecraft scene position (for anchoring arrows).
        const scScene = new THREE.Vector3(
          p0.x * SCALE_CISLUNAR,
          p0.y * SCALE_CISLUNAR,
          p0.z * SCALE_CISLUNAR,
        );

        // Earth / Moon positions in scene units.
        const earthScene = new THREE.Vector3(0, 0, 0);
        const moonAtNowAbs = moonEciPos(bridge.simDay);
        const moonScene = new THREE.Vector3(
          moonAtNowAbs.x * SCALE_CISLUNAR,
          moonAtNowAbs.y * SCALE_CISLUNAR,
          moonAtNowAbs.z * SCALE_CISLUNAR,
        );

        // Gravity arrows — Earth + Moon.
        if (cisGravEarthArrow.visible) {
          const dEarthKm = Math.hypot(p0.x, p0.y, p0.z);
          const aEarth = gravityAccel(BODY_MASS_KG.earth, dEarthKm);
          cisGravEarthArrow.position.copy(scScene);
          cisGravEarthArrow.setDirection(
            new THREE.Vector3().subVectors(earthScene, scScene).normalize(),
          );
          cisGravEarthArrow.setLength(
            Math.max(0.5, Math.min(5, logScaleLength(aEarth, 0.5, 5, 1e-6, 10))),
            0.18,
            0.1,
          );
        }
        if (cisGravMoonArrow.visible) {
          const dMoonKm = Math.hypot(
            p0.x - moonAtNowAbs.x,
            p0.y - moonAtNowAbs.y,
            p0.z - moonAtNowAbs.z,
          );
          const aMoon = gravityAccel(BODY_MASS_KG.moon, dMoonKm);
          cisGravMoonArrow.position.copy(scScene);
          cisGravMoonArrow.setDirection(
            new THREE.Vector3().subVectors(moonScene, scScene).normalize(),
          );
          cisGravMoonArrow.setLength(
            Math.max(0.5, Math.min(5, logScaleLength(aMoon, 0.5, 5, 1e-6, 10))),
            0.18,
            0.1,
          );
        }

        // Velocity tangent — proportional to speed.
        if (cisVelocityArrow.visible && speedKms > 1e-6) {
          const dirMag = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
          cisVelocityArrow.position.copy(scScene);
          cisVelocityArrow.setDirection(
            new THREE.Vector3(
              (p1.x - p0.x) / dirMag,
              (p1.y - p0.y) / dirMag,
              (p1.z - p0.z) / dirMag,
            ),
          );
          // 1 km/s → ~0.4u in cislunar scale (matches heliocentric ratio).
          const vLen = Math.max(0.4, Math.min(5, speedKms * 0.4));
          cisVelocityArrow.setLength(vLen, 0.18, 0.1);
        }

        // Centripetal — toward dominant body (Moon if in lunar phase,
        // else Earth).
        if (cisCentripetalArrow.visible) {
          const target = isLunarPhase ? moonScene : earthScene;
          const dir = new THREE.Vector3().subVectors(target, scScene).normalize();
          cisCentripetalArrow.position.copy(scScene);
          cisCentripetalArrow.setDirection(dir);
          const dKm = isLunarPhase
            ? Math.hypot(p0.x - moonAtNowAbs.x, p0.y - moonAtNowAbs.y, p0.z - moonAtNowAbs.z)
            : Math.hypot(p0.x, p0.y, p0.z);
          const accel = gravityAccel(isLunarPhase ? BODY_MASS_KG.moon : BODY_MASS_KG.earth, dKm);
          cisCentripetalArrow.setLength(
            Math.max(0.4, Math.min(5, logScaleLength(accel, 0.4, 5, 1e-6, 10))),
            0.18,
            0.1,
          );
        }

        // Apsides — scan current phase's points for min/max distance
        // from the dominant body. Earth-frame phases use Earth as
        // centre, lunar-frame use Moon.
        if (cisPeriMarker.visible || cisApoMarker.visible) {
          let activePhase = bridge.cislunarTrajectory.phases[0];
          for (const p of bridge.cislunarTrajectory.phases) {
            if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
              activePhase = p;
              break;
            }
          }
          const lunarFrame = LUNAR_LOCAL_LAYERS.has(activePhase.type);
          const cx = lunarFrame ? moonRefForLayers.x : 0;
          const cy = lunarFrame ? moonRefForLayers.y : 0;
          const cz = lunarFrame ? moonRefForLayers.z : 0;
          let minR2 = Infinity;
          let maxR2 = -Infinity;
          let minI = 0;
          let maxI = 0;
          for (let i = 0; i < activePhase.points.length; i++) {
            const p = activePhase.points[i];
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dz = p.z - cz;
            const r2 = dx * dx + dy * dy + dz * dz;
            if (r2 < minR2) {
              minR2 = r2;
              minI = i;
            }
            if (r2 > maxR2) {
              maxR2 = r2;
              maxI = i;
            }
          }
          const peri = activePhase.points[minI];
          const apo = activePhase.points[maxI];
          // Lunar-frame points need the moonFrameGroup offset to land
          // in absolute scene coords.
          let dx0 = 0;
          let dy0 = 0;
          let dz0 = 0;
          if (lunarFrame) {
            dx0 = moonAtNowAbs.x - moonRefForLayers.x;
            dy0 = moonAtNowAbs.y - moonRefForLayers.y;
            dz0 = moonAtNowAbs.z - moonRefForLayers.z;
          }
          cisPeriMarker.position.set(
            (peri.x + dx0) * SCALE_CISLUNAR,
            (peri.y + dy0) * SCALE_CISLUNAR,
            (peri.z + dz0) * SCALE_CISLUNAR,
          );
          cisApoMarker.position.set(
            (apo.x + dx0) * SCALE_CISLUNAR,
            (apo.y + dy0) * SCALE_CISLUNAR,
            (apo.z + dz0) * SCALE_CISLUNAR,
          );
        }

        // Coast preview — integrate forward from (p0, v) under Earth
        // gravity for N seconds, dropping points each step. Tier 1
        // simplification: ignores Moon gravity (acceptable outside
        // lunar SoI).
        if (cisCoastLine.visible) {
          // Two-body Euler integrator extracted to $lib/fly/fly-frame-coast
          // (WS-B/B4) — byte-identical.
          const verts = integrateEarthCoastPreview(
            { x: p0.x, y: p0.y, z: p0.z },
            { x: vx, y: vy, z: vz },
            SCALE_CISLUNAR,
          );
          cisCoastLine.geometry.dispose();
          cisCoastLine.geometry = new THREE.BufferGeometry();
          cisCoastLine.geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
          cisCoastLine.computeLineDistances();
        }

        // Conics — classify the spacecraft's Earth-centric (r, v).
        // Cislunar trajectories are Earth-bound ellipses for the
        // outbound/return coasts and Moon-bound for lunar phases;
        // here we always classify with Earth as the central body
        // since that's what the conic panel labels.
        if (conicsLayerOn) {
          bridge.conicStateCislunar = classifyConicEarth(
            { x: p0.x, y: p0.y, z: p0.z },
            { x: vx, y: vy, z: vz },
          );
        } else {
          bridge.conicStateCislunar = null;
        }
      } else if (bridge.isMoonMission) {
        // Clear cached cislunar conic when all layers off so the
        // panel doesn't keep showing a stale Earth-centric state.
        bridge.conicStateCislunar = null;
      }

      // Cislunar camera tracks the moving Moon target each frame so
      // the Earth-Moon system stays framed as it drifts. User mouse
      // input modifies flyCam.cislunarCamR/P/T independently.
      flyCam.updateCislunarCam();

      // #83 — constant on-screen line thickness. Tube geometry is
      // built with a world-space radius so it reads as the right
      // pixel width at the wide cruise framing (flyCam.camR ~ 500) but
      // balloons to "fat sausage" at flyby-close (flyCam.camR ~ 24). Scale
      // the radius proportional to flyCam.camR each frame so the line stays
      // at a constant apparent thickness. Throttled — only rebuild
      // geometry when the desired radius drifts > 0.05 from current
      // (so static frames + held beats don't spend CPU rebuilding
      // identical geometry).
      if (
        !bridge.isMoonMission &&
        outLine &&
        retLine &&
        bridge.outPts.length >= 2 &&
        flyUpdaters?.helio.rebuildTubeGeometry
      ) {
        const tubeUd = outLine.geometry.userData as { tubeRadius?: number };
        const desiredRadius = trajectoryTubeRadius(flyCam.camR, HELIO_TUBE_BOUNDS);
        const currentRadius = tubeUd.tubeRadius ?? 0.175;
        if (shouldRebuildTube(desiredRadius, currentRadius, HELIO_REBUILD_THRESHOLD)) {
          outLine.geometry.dispose();
          outLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(bridge.outPts, desiredRadius);
          (outLine.geometry.userData as { tubeRadius?: number }).tubeRadius = desiredRadius;
          if (retLine && bridge.retPts.length >= 2) {
            retLine.geometry.dispose();
            retLine.geometry = flyUpdaters.helio.rebuildTubeGeometry(
              bridge.retPts,
              desiredRadius * 0.85,
            );
            (retLine.geometry.userData as { tubeRadius?: number }).tubeRadius =
              desiredRadius * 0.85;
          }
        }
      }

      // #83 (cislunar/earth) — the SAME constant-on-screen-thickness rule as
      // the helio block above, which is gated `!isMoonMission` and so never
      // touched the moon/earth tubes. Without this the cislunar phase lines
      // kept their fixed 0.16 world radius and ballooned to fat sausages on
      // zoom-in (the regression re-flagged). Rebuild each visible tube so its
      // radius tracks flyCam.cislunarCamR → identical thin look at every zoom.
      if (bridge.viewMode === 'cislunar' && cislunarPhaseLines.size) {
        const cisDesired = trajectoryTubeRadius(flyCam.cislunarCamR, CISLUNAR_TUBE_BOUNDS);
        for (const line of cislunarPhaseLines.values()) {
          if (!line.visible) continue;
          const ud = line.userData as { srcPts?: THREE.Vector3[]; tubeRadius?: number };
          if (!ud.srcPts || ud.srcPts.length < 2) continue;
          if (shouldRebuildTube(cisDesired, ud.tubeRadius ?? 0.16, CISLUNAR_REBUILD_THRESHOLD)) {
            line.geometry.dispose();
            line.geometry = buildTubeFromPoints(ud.srcPts, cisDesired);
            ud.tubeRadius = cisDesired;
          }
        }
      }

      if (bridge.viewMode === 'cislunar') {
        // Cislunar mode bypasses the helio composer + bloom pipeline —
        // the Earth-Moon system framing is sized for diagrammatic
        // clarity, not cinematic bloom, and the close-Earth-orbit
        // sprites would smear under bloom. Direct render is correct.
        renderer.render(cislunarScene, cislunarCamera);
      } else if (quality.postEnabled) {
        // Bokeh DoF focus tracking — wave 2/3 punch #6. When the
        // cinematic-tier composer included a BokehPass, point the
        // focal plane at the spacecraft each frame so the ship stays
        // crisp while the Sun, planets, and starfield throw a soft
        // photographic bokeh. Distance is camera→scWorld in scene
        // units; BokehPass interprets it as world-space depth.
        if (helioHandles.bokehPass && scLastWorld) {
          const focusDist = camera.position.distanceTo(scLastWorld);
          (helioHandles.bokehPass.uniforms as Record<string, { value: number }>).focus.value =
            focusDist;
        }
        // Sun lens flare ghost-position update — cinematic only. The
        // helper recomputes sprite world positions from the Sun's
        // current screen-space projection so the ghosts trail through
        // the screen center each frame, like an anamorphic anim flare.
        helioHandles.sunLensFlare?.update(camera);
        // Helio (medium+): route through the EffectComposer so
        // RenderPass + UnrealBloomPass (Sun halo, ship rim glow,
        // engine plume sprites when present) compose on top of the
        // base scene.
        helioHandles.composer.render();
      } else {
        // Helio (minimal / low): direct render, no post stack.
        // The user gets a working scene at the cost of the
        // cinematic glow — see the Settings panel to opt back in.
        renderer.render(scene, camera);
      }
      // Frame-end debug write. Captures state every frame
      // independent of whether a flyby cinema is active — the
      // mid-update __flyDebug write inside updateHelioAutoZoomTargets
      // only runs when activeFlybyMet !== null, leaving subPhase /
      // simDay / arming state stale at the most recent flyby across
      // launch / cruise / arrived. This frame-end write fixes the
      // verification path.
      //
      // Audit recommendation #2 — production builds skip the write
      // entirely (Vite removes the dead branch at build time). Tests
      // + dev work still see the full state. No prod overhead from a
      // hot-path window assignment 60× / second.
      if (import.meta.env.DEV) {
        // Builder lives in $lib/orbital/fly-debug-frame — DEV-vs-prod
        // tree-shake stays on this side of the call.
        window.__flyDebugFrame = buildFlyDebugFrameSnapshot({
          simDay: bridge.simDay,
          lastHelioSubPhase: flyCam.lastHelioSubPhase,
          peakHoldArmedForFlybyMet: cine.peakHoldArmedForFlybyMet,
          peakHoldUntil: cine.peakHoldUntil,
          cruiseHoldUntil: cine.cruiseHoldUntil,
          cruiseHoldFired: cine.cruiseHoldFired,
          cruiseHoldTriggerSimDay: bridge.cruiseHoldTriggerSimDay,
          cutStartedAt: cine.cutStartedAt,
          cutBlackOpacity: bridge.cutBlackOpacity,
          finaleStartedAt: cine.finaleStartedAt,
          inMissionFinale: bridge.inMissionFinale,
          finaleCaptionOpacity: bridge.finaleCaptionOpacity,
          finaleBlackOpacity: bridge.finaleBlackOpacity,
          camR: flyCam.camR,
          camTarget: { x: flyCam.camTarget.x, z: flyCam.camTarget.z },
          now: performance.now(),
        });
      }
      // HUD-overlay projections (phase markers / FD stages / milestones) —
      // the projection assembly is extracted to $lib/fly/fly-frame-projections
      // (WS-B/B4), byte-identical. Each builder returns the render array or null
      // (guard failed → clear the $state). The shared projector factory + the
      // $state assignment/clear semantics stay here.
      const factory = makeProjectorFactory(bridge.container);
      const pmScreens = buildPhaseMarkerScreens({
        hasPhaseMarkers: bridge.hasPhaseMarkers,
        container: bridge.container,
        factory,
        viewMode: bridge.viewMode,
        phaseMarkers: bridge.phaseMarkers,
        interplanetaryPhaseMarkers: bridge.interplanetaryPhaseMarkers,
        cislunarCamera,
        camera,
        simMet: bridge.simDay - bridge.mission.timeline.dep_day,
        reducedMotion: bridge.reducedMotion,
      });
      if (pmScreens) bridge.phaseMarkerScreens = pmScreens;
      else if (bridge.phaseMarkerScreens.length > 0) bridge.phaseMarkerScreens = [];

      const fdScreens = buildFdPhaseMarkerScreens({
        viewMode: bridge.viewMode,
        outPts: bridge.outPts,
        retPts: bridge.retPts,
        container: bridge.container,
        factory,
        camera,
        stages: FD_STAGES,
        scPhase: sc.phase,
        scProgress: sc.progress,
      });
      if (fdScreens) bridge.fdPhaseMarkerScreens = fdScreens;
      else if (bridge.fdPhaseMarkerScreens.length > 0) bridge.fdPhaseMarkerScreens = [];

      const msScreens = buildMilestoneScreens({
        viewMode: bridge.viewMode,
        container: bridge.container,
        factory,
        camera,
        mission: bridge.mission,
        simDay: bridge.simDay,
        arcTimeline: bridge.arcTimeline,
        outPts: bridge.outPts,
        retPts: bridge.retPts,
      });
      if (msScreens) bridge.milestoneScreens = msScreens;
      else if (bridge.milestoneScreens.length > 0) bridge.milestoneScreens = [];
    } else draw2d();
  }

  return { frame };
}
