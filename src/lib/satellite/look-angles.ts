/**
 * Topocentric look angles for a satellite (#404): where it appears in the
 * observer's sky. Unlike distant Solar-System bodies, a 400 km target is
 * dominated by the observer's offset from Earth's centre, so this does the full
 * topocentric transform (satellite ECI − observer ECI → local SEZ → alt/az).
 */
import { gmstRad } from '../astronomy/time';
import type { EciVec } from './propagate';

const RE = 6378.137; // km (spherical Earth; ellipsoid/altitude refinement later)
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

/** Observer geocentric ECI position (km) at Julian Day jd. */
export function observerEci(jd: number, latRad: number, lonRad: number): EciVec {
  const lst = gmstRad(jd) + lonRad;
  return {
    x: RE * Math.cos(latRad) * Math.cos(lst),
    y: RE * Math.cos(latRad) * Math.sin(lst),
    z: RE * Math.sin(latRad),
  };
}

/** Look angle from an observer to a satellite ECI position at Julian Day jd. */
export function lookAngle(satEci: EciVec, jd: number, latRad: number, lonRad: number): LookAngle {
  const lst = gmstRad(jd) + lonRad;
  const obs = observerEci(jd, latRad, lonRad);
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
