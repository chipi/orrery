/**
 * Compute the spherical-coordinate camera frame for /fly's iconic-shot
 * cinema, given the v2 `planFlybyShot()` math output.
 *
 * /fly's scene-camera maths around `camTarget` use spherical coords
 * (R, P, T) where:
 *   camera_pos = camTarget + R × (sin(P)·sin(T),
 *                                 cos(P),
 *                                 sin(P)·cos(T))
 * `planFlybyShot()` returns (cameraPos, cameraTarget) as world Vec3s,
 * so we convert via the inverse projection. This helper IS that
 * inverse projection — pulled out of /fly's animate loop so the math
 * is unit-testable.
 *
 * Fallback path: when the trajectory sampler returns null (rare —
 * mostly happens at degenerate trajectory data near peakMet), we drop
 * onto cruise-distance framing around the spacecraft's current
 * position. Same composition the pre-v2 code used for that edge case;
 * keeps the camera somewhere visible instead of jumping to a NaN.
 */

import { planFlybyShot, type PlanetId, type PlanetComposition } from './flyby-camera-plan';

export interface ComputeIconicFrameInputs {
  /** Flyby planet identifier + scene-space render radius. */
  flybyPlanetId: PlanetId;
  flybyPlanetRadius: number;
  /** The planet's scene-space xz position. */
  planetScenePos: { x: number; z: number };
  /** Closest-approach MET. */
  peakMet: number;
  /** Caller-provided ship-position sampler (scene-space xyz at a given
   *  MET, or null when the sampler can't produce a value). */
  sampleShipScene: (met: number) => { x: number; y: number; z: number } | null;
  /** Fallback ship-position when `planFlybyShot` returns null. The
   *  helper writes this into the centerX/Z output so the camera stays
   *  on the ship instead of jumping. */
  fallbackShipPos: { x: number; z: number };
  /** Fallback pitch when `camDist` is degenerate (≈ zero). Driven by
   *  /fly's HELIO_APPROACH_P constant. */
  fallbackPitchRad: number;
  /** Adaptive spatial lead — forwarded to planFlybyShot. When set, the
   *  iconic moment is chosen so the ship clears this many planet-radii
   *  off the planet centre (orbiter-arrival fix). See planFlybyShot. */
  iconicSeparationRadii?: number;
  /** Composition override forwarded to planFlybyShot (the arrival
   *  composition uses this to widen camR + lower the side angle + add
   *  look-bias for orbit-insertion events). Omit for the per-planet
   *  default flyby composition. */
  composition?: PlanetComposition;
}

export interface IconicFrame {
  /** xyz position for the scene's camTarget vector. */
  centerX: number;
  centerY: number;
  centerZ: number;
  /** Spherical (R, P, T) camera coords around camTarget. */
  targetR: number;
  targetP: number;
  /** Desired camT azimuth, or null when the camera should keep its
   *  current azimuth (degenerate xz or null plan). */
  helioFlybyDesiredCamT: number | null;
  /** True when planFlybyShot produced a valid plan; false on fallback. */
  hasPlan: boolean;
}

/** Camera distance multiplier used by the fallback path. Matches the
 *  pre-v2 default for "we're in a flyby but can't compute the iconic
 *  shot" — close enough that the body fills frame, far enough that the
 *  ship sprite is visible against it. */
const FALLBACK_CAM_DIST_PER_PLANET_RADIUS = 3.5;

/** Below this offset magnitude the spherical-coord conversion's
 *  divide-by-zero shows up; fall back to the supplied pitch + drop the
 *  azimuth preference. */
const DEGENERATE_OFFSET_EPSILON = 1e-9;

/**
 * Pure compute step. Caller writes the returned fields onto the
 * animate-loop scope's camTarget / targetR / targetP / helioFlyby* vars.
 */
export function computeIconicFrame(inputs: ComputeIconicFrameInputs): IconicFrame {
  const plan = planFlybyShot({
    planetId: inputs.flybyPlanetId,
    planetPos: inputs.planetScenePos,
    planetRadius: inputs.flybyPlanetRadius,
    shipPosAtMet: inputs.sampleShipScene,
    peakMet: inputs.peakMet,
    iconicSeparationRadii: inputs.iconicSeparationRadii,
    composition: inputs.composition,
  });

  if (!plan) {
    // Trajectory sampler returned null — keep the camera around the
    // ship's current scene position with cruise-distance framing.
    return {
      centerX: inputs.fallbackShipPos.x,
      centerY: 0,
      centerZ: inputs.fallbackShipPos.z,
      targetR: inputs.flybyPlanetRadius * FALLBACK_CAM_DIST_PER_PLANET_RADIUS,
      targetP: inputs.fallbackPitchRad,
      helioFlybyDesiredCamT: null,
      hasPlan: false,
    };
  }

  const centerX = plan.cameraTarget.x;
  const centerY = plan.cameraTarget.y;
  const centerZ = plan.cameraTarget.z;

  // Convert plan.cameraPos → spherical (R, P, T) around plan.cameraTarget.
  // camera_pos = camTarget + R × (sin(P)·sin(T), cos(P), sin(P)·cos(T))
  const offsetX = plan.cameraPos.x - centerX;
  const offsetY = plan.cameraPos.y - centerY;
  const offsetZ = plan.cameraPos.z - centerZ;
  const camDist = Math.hypot(offsetX, offsetY, offsetZ);

  if (camDist < DEGENERATE_OFFSET_EPSILON) {
    // Plan landed on camera == target. Pick the fallback pitch and
    // skip the azimuth (caller keeps its current camT).
    return {
      centerX,
      centerY,
      centerZ,
      targetR: camDist,
      targetP: inputs.fallbackPitchRad,
      helioFlybyDesiredCamT: null,
      hasPlan: true,
    };
  }

  const cosP = Math.max(-1, Math.min(1, offsetY / camDist));
  const targetP = Math.acos(cosP);
  const helioFlybyDesiredCamT = Math.atan2(offsetX, offsetZ);

  return {
    centerX,
    centerY,
    centerZ,
    targetR: camDist,
    targetP,
    helioFlybyDesiredCamT,
    hasPlan: true,
  };
}
