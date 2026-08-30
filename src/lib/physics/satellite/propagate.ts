/**
 * LEO orbit propagation for the station AR modes (#404).
 *
 * v1 model: Keplerian orbit from the TLE mean elements + the dominant **J2
 * secular** drifts (nodal + apsidal precession, mean-anomaly rate) — accurate to
 * ~a few km for the ISS/Tiangong over hours-to-days from a fresh element set,
 * which is plenty to point a phone at. Full SGP4 (periodic + drag) is a precision
 * follow-up. Returns a geocentric ECI (TEME) position in km.
 */
import type { Tle } from './tle';
import { MU_EARTH_KM3_S2 as MU } from '../util/constants'; // D10: one home (was a private dup)

const RE = 6378.137; // km
const J2 = 0.00108262998905;

export interface EciVec {
  x: number;
  y: number;
  z: number;
}

/** Semi-major axis (km) implied by a TLE's mean motion. */
export function semiMajorAxisKm(tle: Tle): number {
  const nRadPerSec = tle.meanMotionRadPerMin / 60;
  return Math.cbrt(MU / (nRadPerSec * nRadPerSec));
}

function solveKepler(m: number, e: number): number {
  let ea = m;
  for (let i = 0; i < 10; i++) {
    const d = (ea - e * Math.sin(ea) - m) / (1 - e * Math.cos(ea));
    ea -= d;
    if (Math.abs(d) < 1e-10) break;
  }
  return ea;
}

/** Geocentric ECI (TEME) position of a satellite, km, at Julian Day `jd`. */
export function propagate(tle: Tle, jd: number): EciVec {
  const dtMin = (jd - tle.epochJd) * 1440;
  const n = tle.meanMotionRadPerMin; // rad/min
  const e = tle.eccentricity;
  const i = tle.inclRad;
  const a = semiMajorAxisKm(tle);

  // J2 secular rates (rad/min).
  const k = (1.5 * J2 * (RE / a) * (RE / a)) / ((1 - e * e) * (1 - e * e));
  const raanDot = -k * n * Math.cos(i);
  const argpDot = k * n * (2 - 2.5 * Math.sin(i) * Math.sin(i));
  const mDot = k * n * Math.sqrt(1 - e * e) * (1 - 1.5 * Math.sin(i) * Math.sin(i));

  const M = tle.meanAnomalyRad + (n + mDot) * dtMin;
  const raan = tle.raanRad + raanDot * dtMin;
  const argp = tle.argpRad + argpDot * dtMin;

  const E = solveKepler(M, e);
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  const r = a * (1 - e * Math.cos(E));
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  // Perifocal → ECI (Rz(Ω) Rx(i) Rz(ω)).
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const cw = Math.cos(argp);
  const sw = Math.sin(argp);

  const px = cO * cw - sO * sw * ci;
  const py = sO * cw + cO * sw * ci;
  const pz = sw * si;
  const qx = -cO * sw - sO * cw * ci;
  const qy = -sO * sw + cO * cw * ci;
  const qz = cw * si;

  return {
    x: xOrb * px + yOrb * qx,
    y: xOrb * py + yOrb * qy,
    z: xOrb * pz + yOrb * qz,
  };
}
