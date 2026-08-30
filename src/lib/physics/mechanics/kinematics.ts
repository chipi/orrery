/**
 * Classical kinematics — free-fall and projectile motion (S2b · RFC-037 M1).
 * No drag; uniform gravity field assumed throughout.
 * Pure SI; no external imports.
 */

export interface FreeFallResult {
  /** Time to impact from rest at `heightM` (s). */
  timeS: number;
  /** Speed at impact in m/s (= v₀ + g·t, v₀=0). */
  impactMs: number;
}

/**
 * Time and speed for an object dropped from rest.
 * @param heightM  Drop height above impact surface (m)
 * @param gMs2     Local surface gravity (m/s²)
 */
export function freeFall(heightM: number, gMs2: number): FreeFallResult {
  const timeS = Math.sqrt((2 * heightM) / gMs2);
  const impactMs = Math.sqrt(2 * gMs2 * heightM);
  return { timeS, impactMs };
}

export interface ProjectileResult {
  /** Horizontal range (m). */
  rangeM: number;
  /** Peak height above launch (m). */
  maxHeightM: number;
  /** Total flight time (s). */
  flightTimeS: number;
}

/**
 * Projectile launched at `v0Ms` m/s at `angleDeg` above the horizontal on a
 * flat surface with no air resistance.
 *
 * range     = v₀² · sin(2θ) / g
 * maxHeight = v₀² · sin²θ / (2g)
 * T         = 2 · v₀ · sinθ / g
 */
export function projectile(v0Ms: number, angleDeg: number, gMs2: number): ProjectileResult {
  const theta = (angleDeg * Math.PI) / 180;
  const sinT = Math.sin(theta);
  const rangeM = (v0Ms * v0Ms * Math.sin(2 * theta)) / gMs2;
  const maxHeightM = (v0Ms * v0Ms * sinT * sinT) / (2 * gMs2);
  const flightTimeS = (2 * v0Ms * sinT) / gMs2;
  return { rangeM, maxHeightM, flightTimeS };
}
