/**
 * Keplerian two-body orbital mechanics.
 * Constants from IAU. See CLAUDE.md §physics and TA.md §contracts/orbital-constants.
 */

/** Heliocentric gravitational parameter, AU³/yr². */
export const MU_SUN = 4 * Math.PI ** 2;

/** km per AU (IAU 2012). */
export const AU_TO_KM = 149597870.7;

/** Light-minutes per AU. */
export const AU_TO_LMIN = 8.317;

/** km/s per AU/yr. */
export const AUPYR_TO_KMS = 4.7404;

export interface Position {
  /** Heliocentric x in AU. */
  x: number;
  /** Heliocentric y in AU. */
  y: number;
  /** Heliocentric distance in AU. */
  r: number;
}

/**
 * Position on a Keplerian orbit at time t (days from J2000).
 *
 * Approximation: mean longitude advances linearly (no eccentric anomaly solve).
 * Accurate to first order; sufficient for visual orrery use.
 *
 * @param a  semi-major axis (AU)
 * @param e  eccentricity
 * @param L0 mean longitude at J2000 epoch (radians)
 * @param T  orbital period (days)
 * @param t  time since J2000 (days)
 */
export function keplerPos(a: number, e: number, L0: number, T: number, t: number): Position {
  const nu = L0 + ((2 * Math.PI) / T) * t;
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  return { x: Math.cos(nu) * r, y: Math.sin(nu) * r, r };
}

/**
 * Vis-viva equation: orbital velocity at radius r on an orbit of semi-major axis a.
 *
 * @param a semi-major axis (AU)
 * @param r distance from focus (AU)
 * @returns velocity (km/s)
 */
export function visViva(a: number, r: number): number {
  return Math.sqrt(MU_SUN * (2 / r - 1 / a)) * AUPYR_TO_KMS;
}
