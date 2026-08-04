/**
 * Trajectory-tube thickness invariant (#83).
 *
 * A `TubeGeometry` trajectory line is built with a WORLD-space radius, so a
 * fixed radius reads FATTER the closer the camera gets ("fat sausage" on
 * zoom-in). To keep a CONSTANT on-screen thickness the radius must scale with
 * camera distance: apparent px ≈ radius / distance ≈ const. This one coefficient
 * drives BOTH the heliocentric and the cislunar/earth trajectory tubes so every
 * trajectory reads identically thin at every zoom.
 *
 * This lived as a bare local const in `fly/+page.svelte` and regressed once
 * (the compensation was gated `!isMoonMission`, so moon/earth tubes ballooned).
 * It is a pure function now, unit-tested, so the invariant can't silently rot:
 * NEVER hard-code a fixed tube radius for a trajectory — feed camera distance
 * through `trajectoryTubeRadius`.
 *
 * See memory: reference_fly_trajectory_line_thickness.
 */

/** Tube radius per unit of camera distance. The single knob for on-screen
 *  trajectory thickness across every /fly view. */
export const TRAJ_TUBE_RADIUS_PER_CAMDIST = 0.00225;

/** Clamp bounds for a tube radius. `min` differs per view (the cislunar system
 *  frames much closer than the heliocentric cruise, so it needs a thinner
 *  floor); `max` caps the fattest the line may get at the widest framing. */
export interface TubeRadiusBounds {
  min: number;
  max: number;
}

/** Heliocentric cruise framing (camR ~ hundreds of scene units). */
export const HELIO_TUBE_BOUNDS: TubeRadiusBounds = { min: 0.09, max: 0.8 };

/** Cislunar / earth-orbit framing (cislunarCamR ~ single digits when zoomed in). */
export const CISLUNAR_TUBE_BOUNDS: TubeRadiusBounds = { min: 0.015, max: 0.8 };

/**
 * The world-space tube radius that yields a constant on-screen thickness at the
 * given camera distance. Linear in distance (so apparent px is constant),
 * clamped to `bounds` at the extremes.
 */
export function trajectoryTubeRadius(camDist: number, bounds: TubeRadiusBounds): number {
  const raw = camDist * TRAJ_TUBE_RADIUS_PER_CAMDIST;
  return Math.max(bounds.min, Math.min(bounds.max, raw));
}

/**
 * Whether a tube should be rebuilt: only when the desired radius has drifted
 * from the current one by more than `threshold`. Rebuilding geometry every frame
 * is wasteful, so held/static frames skip it. A larger threshold = fewer
 * rebuilds but coarser thickness tracking.
 */
export function shouldRebuildTube(
  desiredRadius: number,
  currentRadius: number,
  threshold: number,
): boolean {
  return Math.abs(desiredRadius - currentRadius) > threshold;
}

/** Rebuild threshold for the heliocentric out/return tubes. */
export const HELIO_REBUILD_THRESHOLD = 0.05;

/** Rebuild threshold for the cislunar phase-line tubes (finer — they frame closer). */
export const CISLUNAR_REBUILD_THRESHOLD = 0.02;
