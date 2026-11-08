/**
 * Heliocentric state of a body on the mean-element model, and the velocity vectors at both ends
 * of a Lambert transfer — shared by the porkchop grids (planets and moons).
 *
 * Positions are in the ecliptic plane, AU; velocities AU/yr (the grids' units, µ = MU_SUN).
 * `bodyHelioXY` is the same model as `mission-arc.destinationPos` (x/z → [x, y]).
 */
import { eccentricAnomaly } from '../ephemeris/kepler';
import { inclinedOrbitXY, type InclinedOrbit } from './inclined-orbit';

export interface HelioBody {
  a: number;
  a0: number;
  meanMotionRadPerDay: number;
  e?: number;
  varpi?: number;
  orbit?: InclinedOrbit;
}

/** Position (AU) on `day` (days from J2000). Mean longitude L = a0 + n·day; mean anomaly
 *  M = L − ϖ → Kepler → true anomaly ν, at ecliptic longitude ν + ϖ (S2). e = 0 reduces
 *  exactly to [a·cos L, a·sin L]. */
export function bodyHelioXY(day: number, body: HelioBody): [number, number] {
  const e = body.e ?? 0;
  if (body.orbit) return inclinedOrbitXY(day, body.a, e, body.meanMotionRadPerDay, body.orbit);
  const L = body.a0 + body.meanMotionRadPerDay * day;
  if (e === 0) return [body.a * Math.cos(L), body.a * Math.sin(L)];
  const varpi = body.varpi ?? 0;
  const E = eccentricAnomaly(L - varpi, e);
  const r = body.a * (1 - e * Math.cos(E));
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  return [r * Math.cos(nu + varpi), r * Math.sin(nu + varpi)];
}

/** Velocity (AU/yr) on `day`: central difference of `bodyHelioXY` over ±0.01 day — exact to
 *  ~1e-6 relative for every body the model places, eccentric or inclined. */
export function bodyHelioVelXY(day: number, body: HelioBody): [number, number] {
  const h = 0.01;
  const a = bodyHelioXY(day - h, body);
  const b = bodyHelioXY(day + h, body);
  const perYr = 365.25 / (2 * h);
  return [(b[0] - a[0]) * perYr, (b[1] - a[1]) * perYr];
}

/** Velocity vectors at r1 and r2 of the prograde conic with semi-latus rectum p through them
 *  (Lagrange f/g coefficients; the transfer angle is taken counter-clockwise, 0–2π). Null when
 *  the two points are (anti)parallel and g vanishes. */
export function lambertEndVelocities(
  r1: [number, number],
  r2: [number, number],
  p: number,
  mu: number,
): { v1: [number, number]; v2: [number, number] } | null {
  const r1m = Math.hypot(r1[0], r1[1]);
  const r2m = Math.hypot(r2[0], r2[1]);
  let dth = Math.atan2(r1[0] * r2[1] - r1[1] * r2[0], r1[0] * r2[0] + r1[1] * r2[1]);
  if (dth < 0) dth += 2 * Math.PI;
  const c = Math.cos(dth);
  const g = (r1m * r2m * Math.sin(dth)) / Math.sqrt(mu * p);
  if (!isFinite(g) || Math.abs(g) < 1e-9) return null;
  const f = 1 - (r2m / p) * (1 - c);
  const gdot = 1 - (r1m / p) * (1 - c);
  return {
    v1: [(r2[0] - f * r1[0]) / g, (r2[1] - f * r1[1]) / g],
    v2: [(gdot * r2[0] - r1[0]) / g, (gdot * r2[1] - r1[1]) / g],
  };
}
