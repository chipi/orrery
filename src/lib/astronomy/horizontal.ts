/**
 * Coordinate pipeline for the sky-pointing AR mode (#393): geocentric ecliptic
 * → equatorial (RA/Dec) → horizontal (altitude/azimuth) for an observer at
 * lat/lon at a given time. Azimuth is measured from true North, clockwise
 * (N=0°, E=90°, S=180°, W=270°) so it maps straight onto ARKit's
 * gravity-and-heading world frame. Includes the topocentric parallax-in-
 * altitude correction (≈0.95° for the Moon, negligible for planets).
 */
import { lstRad, meanObliquityRad } from './time';
import type { Vec3 } from './planets';

const EARTH_RADIUS_AU = 6378.137 / 149_597_870.7;

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
