/**
 * Keplerian two-body orbital mechanics.
 * Constants from IAU. See CLAUDE.md §physics and TA.md §contracts/orbital-constants.
 */

import { eccentricAnomaly } from '../ephemeris/kepler';

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
 * `L0 + n·t` is the **mean longitude** L, not the true anomaly. Phasing the
 * conic by L directly puts perihelion at ecliptic longitude 0 for every body
 * (S2). Instead take the mean anomaly M = L − ϖ (ϖ = longitude of perihelion),
 * solve Kepler's equation for the eccentric anomaly E, then r = a(1 − e·cos E)
 * and the true anomaly ν, positioning the body at ecliptic longitude ν + ϖ. For
 * a circular orbit (e = 0) this reduces exactly to [a·cos L, a·sin L].
 *
 * @param a     semi-major axis (AU)
 * @param e     eccentricity
 * @param L0    mean longitude at J2000 epoch (radians)
 * @param T     orbital period (days)
 * @param t     time since J2000 (days)
 * @param varpi longitude of perihelion ϖ at J2000 (radians); default 0
 */
export function keplerPos(
  a: number,
  e: number,
  L0: number,
  T: number,
  t: number,
  varpi = 0,
): Position {
  const L = L0 + ((2 * Math.PI) / T) * t;
  if (e === 0) return { x: Math.cos(L) * a, y: Math.sin(L) * a, r: a };
  const E = eccentricAnomaly(L - varpi, e);
  const r = a * (1 - e * Math.cos(E));
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  const theta = nu + varpi;
  return { x: Math.cos(theta) * r, y: Math.sin(theta) * r, r };
}

// Vis-viva lived here as an AU/yr-locked helper, but it was test-only dead code —
// the learning kernel uses the general `mechanics/orbits.visVivaKms` (µ passed in),
// and the /fly sim computes its own inline in `transfer/mission-arc.ts`. Removed to
// leave one canonical vis-viva per consumer (M2 MINOR-1). See orbits.ts head note.
