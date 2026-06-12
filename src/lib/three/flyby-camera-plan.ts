/**
 * Pure math for the /fly iconic-shot camera plan. Given a flyby
 * context (planet pos, ship trajectory samples, peak day, current sim
 * day), returns the camera position + orientation that produces the
 * "Cassini mission-art" hero composition: spacecraft as foreground at
 * 3/4 angle, planet looming behind, never with the ship occluded.
 *
 * This module is consumed by BOTH the 3D scene (real-time render) and
 * the 2D Canvas debug viewer (`$lib/components/FlybyDebugViewer.svelte`).
 * The same input → same output, so we can SEE the math in the 2D
 * viewer and trust the 3D scene will compose the same way.
 *
 * No Three.js. No DOM. Pure functions over plain data. Easy to test.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrajectorySample {
  /** Mission-elapsed time (days since launch). */
  met: number;
  /** Scene-space position (AU × SCALE_3D, with +y offset for flybys). */
  pos: Vec3;
}

export type PlanetId = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

/**
 * Per-planet camera tuning. Adjust here to change the iconic
 * composition for a specific planet without touching the math.
 * Saturn-OI has its own override layer (camera.up roll) handled
 * outside this module.
 */
export interface PlanetComposition {
  /** Camera distance from ship, expressed as a multiple of the
   *  planet's scene-render radius. Bigger = ship smaller in frame. */
  camRMultiplier: number;
  /** Rotation off the "behind-ship-along-reverse-velocity" axis. 0 =
   *  dead-behind ship; π/6 (30°) = 3/4 over-shoulder; π/3 (60°) =
   *  full side profile. Sign chosen so positive rotates CCW in xz. */
  sideAngleRad: number;
  /** Camera pitch from zenith. 0 = directly above ship looking down;
   *  π/2 = camera at ship's altitude looking horizontally; values
   *  >π/2 mean the camera is below the ship (rare). Cassini-art is
   *  typically 1.0–1.3 rad (27–47° above orbital plane). */
  pitchRad: number;
  /** Days before peak to FREEZE the iconic moment. Closest approach
   *  itself is at peak; at peak the ship is essentially inside the
   *  planet's render volume, so we freeze a few days early when the
   *  ship is visibly separated. */
  iconicLeadDays: number;
}

export const PLANET_COMPOSITION: Record<PlanetId, PlanetComposition> = {
  mercury: { camRMultiplier: 4, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 2 },
  venus: { camRMultiplier: 4, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 2 },
  earth: { camRMultiplier: 3.2, sideAngleRad: Math.PI / 6, pitchRad: 1.0, iconicLeadDays: 2 },
  mars: { camRMultiplier: 4, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 2 },
  jupiter: { camRMultiplier: 5, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 3 },
  saturn: { camRMultiplier: 5, sideAngleRad: Math.PI / 6, pitchRad: 1.25, iconicLeadDays: 4 },
  uranus: { camRMultiplier: 4.5, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 2 },
  neptune: { camRMultiplier: 4.5, sideAngleRad: Math.PI / 6, pitchRad: 1.1, iconicLeadDays: 2 },
};

export interface FlybyContext {
  planetId: PlanetId;
  /** Planet's scene-space xz position at peak day. */
  planetPos: { x: number; z: number };
  /** Planet's scene-space render radius (visual sphere radius). */
  planetRadius: number;
  /** Ship's predicted scene-space position at a given met. The math
   *  layer calls this to sample positions; the caller provides the
   *  interpolation strategy (linear, spline, etc.). */
  shipPosAtMet: (met: number) => Vec3 | null;
  /** Peak day (closest approach) in mission-elapsed time. */
  peakMet: number;
  /** Optional override for the per-planet composition. Useful for
   *  testing tuning changes without editing PLANET_COMPOSITION. */
  composition?: PlanetComposition;
}

export interface IconicShotPlan {
  /** Time we freeze on (peakMet − iconicLeadDays). */
  iconicMet: number;
  /** Ship's predicted position at the iconic moment. */
  shipPos: Vec3;
  /** Ship's velocity direction in xz plane (unit vector). The camera
   *  is positioned at a rotation off the REVERSE of this. */
  shipVelocityXZ: { x: number; z: number };
  /** Computed camera position in scene space. The render pipeline
   *  places the camera here and lookAt's cameraTarget. */
  cameraPos: Vec3;
  /** Where the camera looks. For the iconic shot this is the ship's
   *  position (so the ship sits at frame center). */
  cameraTarget: Vec3;
  /** Effective composition used (defaults from PLANET_COMPOSITION or
   *  the override). Returned so the viewer can label which values
   *  produced this frame. */
  composition: PlanetComposition;
}

/**
 * Plan the iconic-shot camera state for a flyby.
 *
 * Algorithm:
 *  1. Resolve composition (per-planet defaults or override)
 *  2. Compute iconic moment = peakMet − iconicLeadDays
 *  3. Sample ship position at iconic moment + 1 day before for velocity
 *  4. Compute ship velocity direction in xz plane (orbital tangent)
 *  5. Compute "behind ship" reference direction = −velocity in xz
 *  6. Rotate by sideAngleRad in xz plane (around y) to get camera direction
 *  7. Camera distance = planet_radius × camRMultiplier
 *  8. Camera position = ship + camR × (sin(pitch)·camDir.x, cos(pitch), sin(pitch)·camDir.z)
 *  9. cameraTarget = ship position
 *
 * The pitch is interpreted from-zenith: pitch=0 → directly above ship
 * (cos=1, all weight on y); pitch=π/2 → at ship's altitude looking
 * horizontally (cos=0, all weight in xz). Cassini-art is typically
 * 1.0–1.3 rad (33° below straight-up → camera at 33° below zenith =
 * 57° above horizontal).
 */
export function planFlybyShot(ctx: FlybyContext): IconicShotPlan | null {
  const composition = ctx.composition ?? PLANET_COMPOSITION[ctx.planetId];
  const iconicMet = Math.max(0, ctx.peakMet - composition.iconicLeadDays);
  const shipPos = ctx.shipPosAtMet(iconicMet);
  if (!shipPos) return null;
  // Sample 1 day before for velocity estimate.
  const shipPrev = ctx.shipPosAtMet(Math.max(0, iconicMet - 1));
  if (!shipPrev) return null;
  const velX = shipPos.x - shipPrev.x;
  const velZ = shipPos.z - shipPrev.z;
  const velMag = Math.hypot(velX, velZ);
  if (velMag < 1e-6) {
    return null;
  }
  const velXUnit = velX / velMag;
  const velZUnit = velZ / velMag;
  // Behind-ship direction = -velocity (unit).
  const behindX = -velXUnit;
  const behindZ = -velZUnit;
  // Rotate by sideAngleRad in xz plane (CCW around +y).
  const cs = Math.cos(composition.sideAngleRad);
  const sn = Math.sin(composition.sideAngleRad);
  const camDirX = behindX * cs - behindZ * sn;
  const camDirZ = behindX * sn + behindZ * cs;
  // Camera distance scales with planet's render radius.
  const camR = ctx.planetRadius * composition.camRMultiplier;
  // Camera position relative to ship target:
  //   xz: camR × sin(pitch) × (camDirX, camDirZ)
  //   y : camR × cos(pitch)
  const sinPitch = Math.sin(composition.pitchRad);
  const cosPitch = Math.cos(composition.pitchRad);
  const cameraPos: Vec3 = {
    x: shipPos.x + camR * sinPitch * camDirX,
    y: shipPos.y + camR * cosPitch,
    z: shipPos.z + camR * sinPitch * camDirZ,
  };
  return {
    iconicMet,
    shipPos,
    shipVelocityXZ: { x: velXUnit, z: velZUnit },
    cameraPos,
    cameraTarget: shipPos,
    composition,
  };
}

/**
 * Helper for the 2D debug viewer — compute the "behind-ship" reference
 * direction and the camera direction at the side angle, so we can draw
 * both as guide arrows in the chart. Same math as inside planFlybyShot
 * but exposed for visualization.
 */
export function flybyCameraGuides(
  velocityXZ: { x: number; z: number },
  sideAngleRad: number,
): {
  behind: { x: number; z: number };
  cameraDir: { x: number; z: number };
} {
  const mag = Math.hypot(velocityXZ.x, velocityXZ.z);
  if (mag < 1e-6) {
    return { behind: { x: 0, z: 0 }, cameraDir: { x: 0, z: 0 } };
  }
  const vx = velocityXZ.x / mag;
  const vz = velocityXZ.z / mag;
  const behindX = -vx;
  const behindZ = -vz;
  const cs = Math.cos(sideAngleRad);
  const sn = Math.sin(sideAngleRad);
  return {
    behind: { x: behindX, z: behindZ },
    cameraDir: {
      x: behindX * cs - behindZ * sn,
      z: behindX * sn + behindZ * cs,
    },
  };
}
