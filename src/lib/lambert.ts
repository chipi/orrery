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
 * Lagrange-Gauss TOF as a function of semi-major axis.
 * Exported primarily for round-trip testing — the inverse of
 * `solveLambert`. Production code should not normally need it.
 *
 * `highPath` selects the branch on the same geometry:
 *  - false (default): the LOW/short path — α as computed. Covers TOF from the
 *    parabolic floor up to the minimum-energy ellipse (a = s/2, α = π), and is
 *    monotonically DECREASING in a. This is the original behaviour; the value
 *    is byte-identical to the pre-branch solver for every heliocentric grid.
 *  - true: the HIGH path — α → 2π − α. Covers TOF from minimum-energy upward
 *    (slow / phasing transfers), monotonically INCREASING in a. Needed for the
 *    geocentric Earth→Moon grid's long TOF band (ADR-085): beyond ~5 d the
 *    minimum-energy ceiling, the only feasible transfer is the high path.
 */
export function lambertTOF(
  a: number,
  s: number,
  c: number,
  mu: number,
  highPath: boolean = false,
): number {
  if (a <= s / 2 + 1e-9) return 1e9;
  const sinAlpha = Math.sqrt(Math.min(1, s / (2 * a)));
  const sinBeta = Math.sqrt(Math.max(0, (s - c) / (2 * a)));
  const alpha = highPath ? 2 * Math.PI - 2 * Math.asin(sinAlpha) : 2 * Math.asin(sinAlpha);
  const beta = 2 * Math.asin(sinBeta);
  return Math.sqrt((a * a * a) / mu) * (alpha - Math.sin(alpha) - (beta - Math.sin(beta)));
}

/**
 * Solve Lambert's problem (short way) by bisection on the transfer
 * semi-major axis. Returns null if the transfer is not feasible
 * (TOF below parabolic minimum, or outside the bisection bounds).
 *
 * Units are set by the caller and must be self-consistent across all
 * four numeric args: the heliocentric grids use AU + years + µ(AU³/yr²);
 * the geocentric Earth→Moon grid (ADR-085) uses km + seconds + µ(km³/s²).
 * The solver is µ-agnostic but NOT scale-agnostic — the bisection ceiling
 * `aMax` is the one bound that must grow with the transfer scale (an
 * Earth–Moon transfer needs a ≈ 1.8–3.5×10⁵ km, far above the AU-scale
 * default). Pass a larger `aMax` for non-heliocentric transfers.
 *
 * @param r1 position vector at departure (AU or km)
 * @param r2 position vector at arrival (same units as r1)
 * @param tof time of flight (years or seconds, matching µ)
 * @param mu gravitational parameter (AU³/yr² ≈ 4π² for the Sun; km³/s² for Earth)
 * @param aMax bisection ceiling on the transfer semi-major axis (same units as r1); default AU-scale
 * @param opts `highPath: true` solves the slow/phasing HIGH branch (α → 2π − α),
 *   for TOF beyond the minimum-energy ceiling. Default (omitted / false) is the
 *   original LOW-branch solve — byte-identical for every existing caller.
 */
export function solveLambert(
  r1: readonly [number, number],
  r2: readonly [number, number],
  tof: number,
  mu: number,
  aMax: number = 200.0,
  opts: { highPath?: boolean } = {},
): LambertResult | null {
  const highPath = opts.highPath ?? false;
  const r1mag = Math.hypot(r1[0], r1[1]);
  const r2mag = Math.hypot(r2[0], r2[1]);
  const c = Math.hypot(r2[0] - r1[0], r2[1] - r1[1]);
  const s = (r1mag + r2mag + c) / 2;

  // Parabolic TOF — no solution faster than this is achievable.
  const tParabolic = ((Math.pow(s, 1.5) - Math.pow(Math.abs(s - c), 1.5)) * Math.sqrt(2 / mu)) / 3;
  if (tof < tParabolic * 0.98) return null;

  let aLo = s / 2 + 1e-6;
  let aHi = aMax;

  if (!highPath) {
    // LOW branch: lambertTOF is monotonically DECREASING in a.
    if (lambertTOF(aLo, s, c, mu) < tof) return null;
    if (lambertTOF(aHi, s, c, mu) > tof) return null;
    for (let i = 0; i < 52; i++) {
      const aMid = (aLo + aHi) / 2;
      if (lambertTOF(aMid, s, c, mu) > tof) aLo = aMid;
      else aHi = aMid;
    }
  } else {
    // HIGH branch: lambertTOF(..., true) is monotonically INCREASING in a
    // (min-energy TOF at a = s/2, →∞ as a grows). tof below the min-energy
    // floor belongs to the low branch; tof above aMax's reach is unsolvable.
    if (lambertTOF(aLo, s, c, mu, true) > tof) return null;
    if (lambertTOF(aHi, s, c, mu, true) < tof) return null;
    for (let i = 0; i < 52; i++) {
      const aMid = (aLo + aHi) / 2;
      if (lambertTOF(aMid, s, c, mu, true) < tof) aLo = aMid;
      else aHi = aMid;
    }
  }
  const a = (aLo + aHi) / 2;
  if (!isFinite(a) || a <= 0) return null;

  // Vis-viva for heliocentric speeds at the two endpoints.
  const v1 = Math.sqrt(Math.max(0, mu * (2 / r1mag - 1 / a)));
  const v2 = Math.sqrt(Math.max(0, mu * (2 / r2mag - 1 / a)));

  return { a, v1, v2 };
}
