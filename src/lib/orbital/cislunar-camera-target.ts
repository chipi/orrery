/**
 * Compute the cislunar auto-zoom camera target — distance + look-at
 * point — for the active trajectory phase. Five branches:
 *
 *   1. Near Moon (distance < threshold) OR Moon-local phase
 *      (lunar_orbit / spiral_lunar / descent / ascent / lunar_flyby)
 *      → close-up on the Moon at LUNAR_CLOSEUP_DISTANCE
 *   2. Earth-localised phase (parking / spiral_earth / reentry)
 *      → close-up on Earth at EARTH_CLOSEUP_DISTANCE
 *   3. tli_coast → wide framing, target pans from Earth side toward
 *      Moon side over phaseProgress 0→1
 *   4. tei_coast → wide framing, target pans from Moon side back
 *      toward Earth side over phaseProgress 0→1 (inverted)
 *   5. Anything else → wide framing centred on Earth (caller default)
 *
 * Also returns a sub-phase string with a '_near_moon' suffix when
 * the proximity boundary is crossed inside a non-Moon-local phase —
 * the suffix tells the caller's phase-changed detector to re-arm the
 * lerp so the camera glides into the closer framing.
 *
 * Pure compute. Caller owns the actual mutations (autoZoomTargetR
 * assignment, autoZoomTargetCenter.set, lastAutoZoomPhase comparison
 * + autoZoomActive flip).
 */

import type { CislunarPhase } from '$lib/cislunar-geometry';

export const LUNAR_PHASE_TYPES = new Set<string>([
  'lunar_orbit',
  'spiral_lunar',
  'descent',
  'ascent',
  'lunar_flyby',
]);

export const EARTH_PHASE_TYPES = new Set<string>(['parking', 'spiral_earth', 'reentry']);

export interface CislunarCameraTargetInputs {
  /** The phase the spacecraft is currently in. */
  phase: CislunarPhase;
  /** [0, 1] progress through the active phase. */
  phaseProgress: number;
  /** Whether the spacecraft is inside the Moon-proximity boundary
   *  (caller computes via Hypot(scenePos − moonPos) < threshold). */
  isNearMoon: boolean;
  /** The Moon's current scene-space xz position. */
  moonInScene: { x: number; z: number };
  /** Distance multipliers (caller controls the absolute values so the
   *  helper stays independent of /fly's SCALE_CISLUNAR). */
  wideDistance: number;
  lunarCloseupDistance: number;
  earthCloseupDistance: number;
}

export interface CislunarCameraTarget {
  /** Camera distance from the look-at point. */
  targetR: number;
  /** Look-at point xz in scene space. (y always 0 — cislunar is 2D
   *  in the camera-target plane.) */
  centerX: number;
  centerZ: number;
  /** Sub-phase string with optional '_near_moon' suffix. Caller
   *  compares to its last sub-phase to detect transitions. */
  subPhase: string;
}

export function computeCislunarCameraTarget(
  inputs: CislunarCameraTargetInputs,
): CislunarCameraTarget {
  const { phase, phaseProgress, isNearMoon, moonInScene } = inputs;
  const subPhase = isNearMoon ? phase.type + '_near_moon' : phase.type;

  if (isNearMoon || LUNAR_PHASE_TYPES.has(phase.type)) {
    return {
      targetR: inputs.lunarCloseupDistance,
      centerX: moonInScene.x,
      centerZ: moonInScene.z,
      subPhase,
    };
  }
  if (EARTH_PHASE_TYPES.has(phase.type)) {
    return {
      targetR: inputs.earthCloseupDistance,
      centerX: 0,
      centerZ: 0,
      subPhase,
    };
  }
  if (phase.type === 'tli_coast') {
    // Translunar coast — wide-view target pans from Earth side (start)
    // toward Moon side (end) over phaseProgress 0→1. 0.7 multiplier so
    // the target stops short of the Moon, leaving the Moon in frame
    // rather than centred.
    return {
      targetR: inputs.wideDistance,
      centerX: moonInScene.x * phaseProgress * 0.7,
      centerZ: moonInScene.z * phaseProgress * 0.7,
      subPhase,
    };
  }
  if (phase.type === 'tei_coast') {
    // Return coast — target pans from Moon side (start) back toward
    // Earth side (end). Same 0.7 multiplier, inverted progress.
    const t = 1 - phaseProgress;
    return {
      targetR: inputs.wideDistance,
      centerX: moonInScene.x * t * 0.7,
      centerZ: moonInScene.z * t * 0.7,
      subPhase,
    };
  }
  // Fallback — wide framing centred on Earth.
  return {
    targetR: inputs.wideDistance,
    centerX: 0,
    centerZ: 0,
    subPhase,
  };
}
