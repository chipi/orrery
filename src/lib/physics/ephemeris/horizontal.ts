/**
 * Coordinate pipeline for the sky-pointing AR mode (#393): geocentric ecliptic
 * → equatorial (RA/Dec) → horizontal (altitude/azimuth) for an observer at
 * lat/lon at a given time. Azimuth is measured from true North, clockwise
 * (N=0°, E=90°, S=180°, W=270°) so it maps straight onto ARKit's
 * gravity-and-heading world frame. Includes the topocentric parallax-in-
 * altitude correction (≈0.95° for the Moon, negligible for planets).
 */
import { centuriesSinceJ2000, lstRad, meanObliquityRad } from './time';
import type { Vec3 } from './planets';

// Equatorial radius (WGS-84), AU — for the topocentric parallax-in-altitude term.
// Equatorial (not the 6371 km mean radius the /fly globe render uses) because
// parallax is largest for an observer on the equatorial bulge; the ≈7 km
// difference is itself ≈0.06% of the ≈0.95° lunar parallax, but equatorial is
// the correct choice here (M5 nit — the 6371 vs 6378 split is intentional).
const EARTH_RADIUS_AU = 6378.137 / 149_597_870.7;

// IAU general precession in longitude, linear term (arcsec per Julian century).
// The equinox regresses ~50.29″/yr along the ecliptic, so a fixed direction's
// ecliptic longitude grows by this rate. Used to bring the J2000-referenced
// planet/Sun ecliptic vectors onto the equinox OF DATE before the of-date
// obliquity + of-date sidereal-time steps consume them (M1). The quadratic term
// (+1.11″·T²) is ≈0.07″ by 2050 — far below phone-pointing resolution — so the
// linear term alone suffices.
const GENERAL_PRECESSION_ARCSEC_PER_CENTURY = 5028.796;

/**
 * Precess a J2000 ecliptic rectangular vector to the ecliptic/equinox OF DATE by
 * rotating it about the ecliptic pole (+z) through the accumulated general
 * precession in longitude (M1). At 2026 this is ≈0.36°, growing ≈0.014°/yr —
 * small, but the dominant frame error once obliquity + sidereal time are already
 * of-date. Bodies whose source model is ALREADY ecliptic-of-date (the Schlyter
 * Moon) must NOT be passed through this — they are correct as-is.
 */
export function precessEclipticJ2000ToDate(vec: Vec3, jd: number): Vec3 {
  const theta =
    ((GENERAL_PRECESSION_ARCSEC_PER_CENTURY * centuriesSinceJ2000(jd)) / 3600) * (Math.PI / 180);
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return { x: vec.x * c - vec.y * s, y: vec.x * s + vec.y * c, z: vec.z };
}

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

/**
 * Precess a J2000 **equatorial** rectangular vector to the mean equator + equinox
 * OF DATE — the star/constellation analogue of `precessEclipticJ2000ToDate` (M1).
 * The HYG catalogue is J2000 equatorial, so its directions carry the same ~0.36°
 * (2026) framing error against the of-date sidereal time that the planets did.
 *
 * Uses the IAU 1976 rigorous precession angles ζ_A, z_A, θ_A (Meeus §21) and
 * the standard rotation P = R₃(−z)·R₂(θ)·R₃(−ζ), applied in rectangular form so
 * it works on a direction vector of any magnitude. Ecliptic precession can't be
 * reused here — these coordinates are equatorial, not ecliptic.
 */
export function precessEquatorialJ2000ToDate(vec: Vec3, jd: number): Vec3 {
  const T = centuriesSinceJ2000(jd);
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * ARCSEC_TO_RAD;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * ARCSEC_TO_RAD;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * ARCSEC_TO_RAD;
  const cZeta = Math.cos(zeta);
  const sZeta = Math.sin(zeta);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);
  const cTheta = Math.cos(theta);
  const sTheta = Math.sin(theta);
  // Rows of P (J2000 → date), Meeus 21.4 rectangular form.
  const xx = cZeta * cTheta * cZ - sZeta * sZ;
  const xy = -sZeta * cTheta * cZ - cZeta * sZ;
  const xz = -sTheta * cZ;
  const yx = cZeta * cTheta * sZ + sZeta * cZ;
  const yy = -sZeta * cTheta * sZ + cZeta * cZ;
  const yz = -sTheta * sZ;
  const zx = cZeta * sTheta;
  const zy = -sZeta * sTheta;
  const zz = cTheta;
  return {
    x: xx * vec.x + xy * vec.y + xz * vec.z,
    y: yx * vec.x + yy * vec.y + yz * vec.z,
    z: zx * vec.x + zy * vec.y + zz * vec.z,
  };
}

export interface Equatorial {
  raRad: number;
  decRad: number;
  distanceAu: number;
}

export interface Horizontal {
  /** Altitude above the horizon, radians (negative = below horizon). */
  altRad: number;
  /** Azimuth from true North, clockwise, radians in [0, 2π). */
  azRad: number;
  altitudeDeg: number;
  azimuthDeg: number;
}

/** Geocentric ecliptic rectangular (AU) → equatorial RA/Dec at Julian Day jd. */
export function eclipticToEquatorial(vec: Vec3, jd: number): Equatorial {
  const eps = meanObliquityRad(jd);
  const ce = Math.cos(eps);
  const se = Math.sin(eps);
  const xq = vec.x;
  const yq = vec.y * ce - vec.z * se;
  const zq = vec.y * se + vec.z * ce;
  return {
    raRad: Math.atan2(yq, xq),
    decRad: Math.atan2(zq, Math.hypot(xq, yq)),
    distanceAu: Math.hypot(vec.x, vec.y, vec.z),
  };
}

/**
 * Equatorial (RA/Dec) → horizontal (alt/az) for an observer at latRad/lonRad
 * (east longitude positive) at Julian Day jd. Applies topocentric parallax in
 * altitude using the body's distance.
 */
export function equatorialToHorizontal(
  eq: Equatorial,
  jd: number,
  latRad: number,
  lonRad: number,
): Horizontal {
  const H = lstRad(jd, lonRad) - eq.raRad; // local hour angle
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinDec = Math.sin(eq.decRad);
  const cosDec = Math.cos(eq.decRad);

  let alt = Math.asin(sinLat * sinDec + cosLat * cosDec * Math.cos(H));
  // Azimuth from South (Meeus), positive west → convert to from-North clockwise.
  const aSouth = Math.atan2(Math.sin(H), Math.cos(H) * sinLat - Math.tan(eq.decRad) * cosLat);
  let az = aSouth + Math.PI;

  // Topocentric parallax in altitude: the surface observer sees the body lower
  // than the geocentre does. π = horizontal parallax. (~0.95° Moon, ~arcsec planets.)
  if (eq.distanceAu > 0) {
    const parallax = Math.asin(Math.min(1, EARTH_RADIUS_AU / eq.distanceAu));
    alt -= parallax * Math.cos(alt);
  }

  az = ((az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return {
    altRad: alt,
    azRad: az,
    altitudeDeg: (alt * 180) / Math.PI,
    azimuthDeg: (az * 180) / Math.PI,
  };
}
