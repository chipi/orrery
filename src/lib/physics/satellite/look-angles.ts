/**
 * Topocentric look angles for a satellite (#404): where it appears in the
 * observer's sky. Unlike distant Solar-System bodies, a 400 km target is
 * dominated by the observer's offset from Earth's centre, so this does the full
 * topocentric transform (satellite ECI − observer ECI → local SEZ → alt/az).
 */
import { gmstRad } from '../ephemeris/time';
import type { EciVec } from './propagate';

// WGS84 ellipsoid — geodetic observer model. Flattening matters near the poles
// (a spherical Earth mislocates the observer by up to ~21 km at 90° latitude,
// tilting close-satellite look-angles); altitude refines it further.
const WGS84_A = 6378.137; // equatorial radius, km
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_E2 = WGS84_F * (2 - WGS84_F); // first eccentricity squared
const DEG = 180 / Math.PI;

export interface LookAngle {
  /** Altitude above the horizon, radians (negative = below). */
  altRad: number;
  /** Azimuth from true North, clockwise, radians in [0, 2π). */
  azRad: number;
  altitudeDeg: number;
  azimuthDeg: number;
  /** Observer → satellite range, km. */
  rangeKm: number;
  aboveHorizon: boolean;
}

/**
 * Observer geocentric ECI position (km) at Julian Day jd, on the WGS84 ellipsoid.
 * `latRad` is GEODETIC latitude (what GPS / navigator.geolocation report);
 * `altKm` is height above the ellipsoid (default sea level).
 */
export function observerEci(jd: number, latRad: number, lonRad: number, altKm = 0): EciVec {
  const lst = gmstRad(jd) + lonRad;
  const sinLat = Math.sin(latRad);
  // Radius of curvature in the prime vertical + the equatorial/polar offsets.
  const n = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const rEq = (n + altKm) * Math.cos(latRad);
  return {
    x: rEq * Math.cos(lst),
    y: rEq * Math.sin(lst),
    z: (n * (1 - WGS84_E2) + altKm) * sinLat,
  };
}

/** Look angle from an observer to a satellite ECI position at Julian Day jd. */
export function lookAngle(
  satEci: EciVec,
  jd: number,
  latRad: number,
  lonRad: number,
  altKm = 0,
): LookAngle {
  const lst = gmstRad(jd) + lonRad;
  const obs = observerEci(jd, latRad, lonRad, altKm);
  const rx = satEci.x - obs.x;
  const ry = satEci.y - obs.y;
  const rz = satEci.z - obs.z;

  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLst = Math.sin(lst);
  const cosLst = Math.cos(lst);

  // ECI → topocentric SEZ (South, East, Zenith).
  const south = sinLat * cosLst * rx + sinLat * sinLst * ry - cosLat * rz;
  const east = -sinLst * rx + cosLst * ry;
  const zenith = cosLat * cosLst * rx + cosLat * sinLst * ry + sinLat * rz;

  const range = Math.hypot(rx, ry, rz);
  const alt = Math.asin(zenith / range);
  let az = Math.atan2(east, -south); // from North, clockwise
  az = ((az % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  return {
    altRad: alt,
    azRad: az,
    altitudeDeg: alt * DEG,
    azimuthDeg: az * DEG,
    rangeKm: range,
    aboveHorizon: alt > 0,
  };
}
