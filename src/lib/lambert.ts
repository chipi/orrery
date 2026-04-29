/**
 * Lagrange-Gauss short-way Lambert solver.
 *
 * Pure orbital mechanics: given two heliocentric position vectors and a
 * time-of-flight, find the Keplerian transfer orbit connecting them.
 * Returns the transfer's semi-major axis and the heliocentric velocity
 * magnitudes at each end. The caller computes ∆v by comparing to the
 * source/target body's orbital velocity.
 *
 * Called only from the Lambert worker (ADR-008). Never invoke from the
 * main thread — for 11,200-cell porkchops this blocks UI for seconds.
 *
 * Ported faithfully from P02 prototype (Lagrange-Gauss formulation,
 * 52-iteration bisection on semi-major axis). MU is in natural units
 * (AU³/yr²); times in years; positions in AU.
 */

export interface LambertResult {
  /** Transfer ellipse semi-major axis (AU) */
  a: number;
  /** Heliocentric speed at r1 (AU/yr) */
  v1: number;
  /** Heliocentric speed at r2 (AU/yr) */
  v2: number;
}

/**
 * Lagrange-Gauss short-way TOF as a function of semi-major axis.
 * Exported primarily for round-trip testing — the inverse of
 * `solveLambert`. Production code should not normally need it.
 */
export function lambertTOF(a: number, s: number, c: number, mu: number): number {
  if (a <= s / 2 + 1e-9) return 1e9;
  const sinAlpha = Math.sqrt(Math.min(1, s / (2 * a)));
  const sinBeta = Math.sqrt(Math.max(0, (s - c) / (2 * a)));
  const alpha = 2 * Math.asin(sinAlpha);
  const beta = 2 * Math.asin(sinBeta);
  return Math.sqrt((a * a * a) / mu) * (alpha - Math.sin(alpha) - (beta - Math.sin(beta)));
}

/**
 * Solve Lambert's problem (short way) by bisection on the transfer
 * semi-major axis. Returns null if the transfer is not feasible
 * (TOF below parabolic minimum, or outside the bisection bounds).
 *
 * @param r1 heliocentric position vector at departure (AU)
 * @param r2 heliocentric position vector at arrival (AU)
 * @param tof time of flight (years)
 * @param mu heliocentric gravitational parameter (AU³/yr²; ≈ 4π² for the Sun)
 */
export function solveLambert(
  r1: readonly [number, number],
  r2: readonly [number, number],
  tof: number,
  mu: number,
): LambertResult | null {
  const r1mag = Math.hypot(r1[0], r1[1]);
  const r2mag = Math.hypot(r2[0], r2[1]);
  const c = Math.hypot(r2[0] - r1[0], r2[1] - r1[1]);
  const s = (r1mag + r2mag + c) / 2;

  // Parabolic TOF — no solution faster than this is achievable.
  const tParabolic = ((Math.pow(s, 1.5) - Math.pow(Math.abs(s - c), 1.5)) * Math.sqrt(2 / mu)) / 3;
  if (tof < tParabolic * 0.98) return null;

  let aLo = s / 2 + 1e-6;
  let aHi = 200.0;

  // Out-of-bounds checks: lambertTOF is monotonically decreasing in a.
  if (lambertTOF(aLo, s, c, mu) < tof) return null;
  if (lambertTOF(aHi, s, c, mu) > tof) return null;

  for (let i = 0; i < 52; i++) {
    const aMid = (aLo + aHi) / 2;
    if (lambertTOF(aMid, s, c, mu) > tof) aLo = aMid;
    else aHi = aMid;
  }
  const a = (aLo + aHi) / 2;
  if (!isFinite(a) || a <= 0) return null;

  // Vis-viva for heliocentric speeds at the two endpoints.
  const v1 = Math.sqrt(Math.max(0, mu * (2 / r1mag - 1 / a)));
  const v2 = Math.sqrt(Math.max(0, mu * (2 / r2mag - 1 / a)));

  return { a, v1, v2 };
}
