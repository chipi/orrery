/**
 * Flyby montage shot-rig library (#371).
 *
 * A flyby plays as a short EDITED SEQUENCE of distinct camera shots that
 * the scene CUTS between on beats — the cinematic grammar of real space
 * animation (Wernquist's Cassini Grand Finale, NASA mission-art) — rather
 * than one continuously-repositioning camera. Each shot here is a pure
 * function of the flyby geometry returning a `ShotFrame` (camera position
 * + look-at + optional fov/roll). The scene adopts the active shot's
 * transform; the schedule + selector (separate module) decides which shot
 * is active at a given MET.
 *
 * Why shots instead of one clever camera: each shot is simple and
 * purpose-built, so constraints that fight inside a single composed angle
 * (ship off the limb, planet dominant, ship not occluded, all at once)
 * are satisfied trivially per-shot — the CHASE shot is locked behind the
 * ship, so the ship can never be occluded; the HERO shot is the composed
 * planet-dominant frame; ESTABLISH is wide; DEPART is the reverse.
 *
 * No Three.js. No DOM. Pure functions over plain data — same testability
 * contract as flyby-camera-plan.ts, which produces the HERO shot.
 */

import {
  planFlybyShot,
  type PlanetComposition,
  type PlanetId,
  type Vec3,
} from './flyby-camera-plan';

export type ShotKind = 'establish' | 'approach' | 'hero' | 'depart';

export interface ShotFrame {
  /** Camera world position (scene units). */
  position: Vec3;
  /** Camera look-at target (scene units). */
  lookAt: Vec3;
  /** Vertical FOV in degrees (Three.js default 50). Per-shot so the wide
   *  establishing shot can breathe and the hero shot stays tight. */
  fovDeg: number;
  /** Camera roll in radians (e.g. Saturn ring-plane lean). Default 0. */
  rollRad: number;
}

export interface FlybyShotContext {
  planetId: PlanetId;
  /** Planet scene-space xz (at the flyby peak — the body barely moves
   *  over the encounter window). */
  planetPos: { x: number; z: number };
  /** Planet scene render radius. */
  planetRadius: number;
  /** Ship scene-space position sampler (xyz at a MET, or null). */
  shipPosAtMet: (met: number) => Vec3 | null;
  /** Closest-approach MET — the HERO shot composes around this. */
  peakMet: number;
  /** MET to render the moving shots (approach/establish/depart) at — the
   *  live sim MET. The HERO shot ignores this (it holds the iconic frame). */
  met: number;
  /** Optional composition override forwarded to the hero shot (e.g. the
   *  arrival composition for orbit-insertion events). */
  heroComposition?: PlanetComposition;
  /** Optional spatial lead forwarded to the hero shot. */
  heroSeparationRadii?: number;
}

// Per-shot camera distance (× planet radius) + pitch above the orbital
// plane. Establishing is wide + high; approach/depart are mid + low for
// the over-the-shoulder read; hero distance is owned by PLANET_COMPOSITION.
const ESTABLISH_DIST_MULT = 14;
const ESTABLISH_PITCH = 0.6;
const ESTABLISH_FOV = 55;
const APPROACH_DIST_MULT = 5;
const APPROACH_PITCH = 0.32;
// Depart is a pulled-back CATAPULT shot: it frames the planet AND the
// departing ship together (distance scales with their separation) and
// views the encounter off the trajectory plane so the gravity-assist
// curve reads. Floor distance keeps it sane right after peak.
const DEPART_MIN_DIST_MULT = 6;
const DEPART_PITCH = 0.5;
const DEPART_FOV = 55;
const DEPART_FRAME_MARGIN = 1.4;
const DEFAULT_FOV = 50;

interface Kinematics {
  pos: Vec3;
  /** Unit heliocentric approach direction in xz (ship's motion). */
  approachX: number;
  approachZ: number;
}

/** Ship position + motion direction at a MET. Direction is sampled over a
 *  MULTI-DAY baseline (not 1 day) so it reads as a stable "approach
 *  corridor" instead of jerking at every trajectory waypoint — near a
 *  flyby the spline curves sharply and a 1-day tangent whips the chase
 *  camera around. Falls back to shorter baselines (then forward) so a
 *  clamped/degenerate sample still yields a usable direction. */
function shipKinematics(ctx: FlybyShotContext, atMet: number): Kinematics | null {
  const pos = ctx.shipPosAtMet(atMet);
  if (!pos) return null;
  for (const back of [6, 4, 2, 1]) {
    const prev = ctx.shipPosAtMet(Math.max(0, atMet - back));
    if (!prev) continue;
    const vx = pos.x - prev.x;
    const vz = pos.z - prev.z;
    const m = Math.hypot(vx, vz);
    if (m > 1e-6) return { pos, approachX: vx / m, approachZ: vz / m };
  }
  // Forward fallback (event at the arc start): direction toward a later sample.
  for (const fwd of [2, 4, 6]) {
    const next = ctx.shipPosAtMet(atMet + fwd);
    if (!next) continue;
    const vx = next.x - pos.x;
    const vz = next.z - pos.z;
    const m = Math.hypot(vx, vz);
    if (m > 1e-6) return { pos, approachX: vx / m, approachZ: vz / m };
  }
  return null;
}

/** HERO — the composed planet-dominant frame (flyby-camera-plan), held at
 *  the iconic moment. Returns null when the trajectory can't compose it. */
export function heroShot(ctx: FlybyShotContext): ShotFrame | null {
  const plan = planFlybyShot({
    planetId: ctx.planetId,
    planetPos: ctx.planetPos,
    planetRadius: ctx.planetRadius,
    shipPosAtMet: ctx.shipPosAtMet,
    peakMet: ctx.peakMet,
    composition: ctx.heroComposition,
    iconicSeparationRadii: ctx.heroSeparationRadii,
  });
  if (!plan) return null;
  const rollRad = ctx.planetId === 'saturn' ? (17 * Math.PI) / 180 : 0;
  return { position: plan.cameraPos, lookAt: plan.cameraTarget, fovDeg: DEFAULT_FOV, rollRad };
}

/** APPROACH / CHASE — camera locked BEHIND the ship along its velocity,
 *  looking ahead toward the planet. The ship rides the foreground and the
 *  planet swells ahead; the ship can NEVER be occluded by construction. */
export function approachShot(ctx: FlybyShotContext): ShotFrame | null {
  const k = shipKinematics(ctx, ctx.met);
  if (!k) return null;
  const dist = ctx.planetRadius * APPROACH_DIST_MULT;
  const cp = Math.cos(APPROACH_PITCH);
  const sp = Math.sin(APPROACH_PITCH);
  return {
    position: {
      x: k.pos.x - k.approachX * dist * cp,
      y: k.pos.y + dist * sp,
      z: k.pos.z - k.approachZ * dist * cp,
    },
    // Look ahead — weighted 60% toward the planet so it's the destination
    // of the gaze while the ship stays a foreground anchor.
    lookAt: {
      x: k.pos.x + (ctx.planetPos.x - k.pos.x) * 0.6,
      y: k.pos.y * 0.4,
      z: k.pos.z + (ctx.planetPos.z - k.pos.z) * 0.6,
    },
    fovDeg: DEFAULT_FOV,
    rollRad: 0,
  };
}

/** ESTABLISH — wide + high, far back along the approach, looking at the
 *  planet so the trajectory arc sweeping in reads as geography. */
export function establishShot(ctx: FlybyShotContext): ShotFrame | null {
  const k = shipKinematics(ctx, ctx.met);
  if (!k) return null;
  const dist = ctx.planetRadius * ESTABLISH_DIST_MULT;
  const cp = Math.cos(ESTABLISH_PITCH);
  const sp = Math.sin(ESTABLISH_PITCH);
  return {
    position: {
      x: k.pos.x - k.approachX * dist * cp,
      y: k.pos.y + dist * sp,
      z: k.pos.z - k.approachZ * dist * cp,
    },
    lookAt: { x: ctx.planetPos.x, y: 0, z: ctx.planetPos.z },
    fovDeg: ESTABLISH_FOV,
    rollRad: 0,
  };
}

/** DEPART — the CATAPULT shot. Frames the planet AND the departing ship
 *  TOGETHER and pulls back as they separate so both stay in frame, viewed
 *  off the trajectory plane (perpendicular + elevated) so the gravity-
 *  assist curve reads. Replaces the old too-close "chase the ship away"
 *  depart where both actors ran out of frame. Look-at is the pair's
 *  midpoint — fine here because the camera is WIDE, so the midpoint's
 *  drift is gentle in-frame (the close midpoint-look was what jerked). */
export function departShot(ctx: FlybyShotContext): ShotFrame | null {
  const k = shipKinematics(ctx, ctx.met);
  if (!k) return null;
  const sx = k.pos.x - ctx.planetPos.x;
  const sz = k.pos.z - ctx.planetPos.z;
  const sep = Math.hypot(sx, sz);
  // Frame both: the pair's half-extent (half their separation + the planet
  // disc) must fit the vertical FOV, with margin. Distance grows with the
  // separation → the camera pulls back as the ship slingshots away.
  const halfExtent = sep / 2 + ctx.planetRadius * 1.5;
  const fitDist = (halfExtent / Math.tan((DEPART_FOV * Math.PI) / 360)) * DEPART_FRAME_MARGIN;
  const camDist = Math.max(ctx.planetRadius * DEPART_MIN_DIST_MULT, fitDist);
  // View axis perpendicular to the planet→ship line (so the curve is seen
  // broadside, not edge-on) + elevation for the catapult read.
  const u = sep > 1e-6 ? { x: -sz / sep, z: sx / sep } : { x: 1, z: 0 };
  const cp = Math.cos(DEPART_PITCH);
  const sp = Math.sin(DEPART_PITCH);
  const cx = (k.pos.x + ctx.planetPos.x) / 2;
  const cy = k.pos.y / 2;
  const cz = (k.pos.z + ctx.planetPos.z) / 2;
  return {
    position: {
      x: cx + u.x * camDist * cp,
      y: cy + camDist * sp,
      z: cz + u.z * camDist * cp,
    },
    lookAt: { x: cx, y: cy, z: cz },
    fovDeg: DEPART_FOV,
    rollRad: 0,
  };
}

/** Dispatch a shot kind to its rig. Returns null when the shot can't be
 *  composed (degenerate trajectory) — the caller cuts to the next shot or
 *  falls back to cruise framing. */
export function composeShot(kind: ShotKind, ctx: FlybyShotContext): ShotFrame | null {
  switch (kind) {
    case 'establish':
      return establishShot(ctx);
    case 'approach':
      return approachShot(ctx);
    case 'hero':
      return heroShot(ctx);
    case 'depart':
      return departShot(ctx);
  }
}
