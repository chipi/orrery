/**
 * Earth-centric conic classifier — same energy / angular-momentum
 * math as the heliocentric `classifyConic` in $lib/orbit-overlays,
 * but with μ_earth in km³/s² for cislunar trajectories.
 *
 * Extracted from /fly/+page.svelte during W9 (#279). Used by the
 * Conic Section panel when a Moon mission is active; the
 * heliocentric path keeps using `classifyConic`.
 */

/** Standard gravitational parameter for Earth (μ⊕), km³/s². */
const MU_EARTH_KM3_S2 = 398_600.4418;

export type ConicShape = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';

export interface ConicState {
  shape: ConicShape;
  /** Semi-major axis (km). Infinity at the parabolic limit. */
  a: number;
  /** Eccentricity (dimensionless). */
  e: number;
  /** Specific orbital energy, ε = v²/2 − μ/r (km²/s²). */
  epsilon: number;
}

export interface Vec3Km {
  x: number;
  y: number;
  z: number;
}

/**
 * Classify the Earth-centred orbit through (r, v).
 *
 * - shape is 'parabola' inside a small fractional band of ε=0 so
 *   the panel doesn't flicker between hyperbolic and elliptic on
 *   noise near the parabolic transition.
 * - 'circle' is e < 0.001 (the porkchop-driven arcs hover around
 *   e ≈ 0.05 even at LEO, so 1e-3 is a comfortable "round enough").
 */
export function classifyConicEarth(r: Vec3Km, v: Vec3Km): ConicState {
  const rMag = Math.hypot(r.x, r.y, r.z);
  const vMag2 = v.x * v.x + v.y * v.y + v.z * v.z;
  const epsilon = vMag2 / 2 - MU_EARTH_KM3_S2 / rMag;
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  const hz = r.x * v.y - r.y * v.x;
  const h2 = hx * hx + hy * hy + hz * hz;
  const eSquared = 1 + (2 * epsilon * h2) / (MU_EARTH_KM3_S2 * MU_EARTH_KM3_S2);
  const e = Math.sqrt(Math.max(0, eSquared));
  const a = epsilon !== 0 ? -MU_EARTH_KM3_S2 / (2 * epsilon) : Infinity;
  const refScale = MU_EARTH_KM3_S2 / rMag;
  let shape: ConicShape;
  if (Math.abs(epsilon) < 0.005 * refScale) shape = 'parabola';
  else if (epsilon > 0) shape = 'hyperbola';
  else if (e < 0.001) shape = 'circle';
  else shape = 'ellipse';
  return { shape, a, e, epsilon };
}
