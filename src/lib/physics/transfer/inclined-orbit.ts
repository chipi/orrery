import { eccentricAnomaly } from '../ephemeris/kepler';

/** Full osculating elements for a body the in-plane (a0, ϖ) model can't place: a retrograde
 *  orbit runs clockwise in the ecliptic and its perihelion direction is not Ω + ω. Angles in
 *  rad, tpDay in sim days (days from 2000-01-01). */
export interface InclinedOrbit {
  node: number;
  argPeri: number;
  incl: number;
  tpDay: number;
}

/** Heliocentric ecliptic position (AU) projected on the ecliptic plane: x toward longitude 0,
 *  y toward 90° (the scene's z). */
export function inclinedOrbitXY(
  day: number,
  a: number,
  e: number,
  meanMotionRadPerDay: number,
  o: InclinedOrbit,
): [number, number] {
  const E = eccentricAnomaly(meanMotionRadPerDay * (day - o.tpDay), e);
  const r = a * (1 - e * Math.cos(E));
  const nu = Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
  const u = o.argPeri + nu;
  const cosI = Math.cos(o.incl);
  return [
    r * (Math.cos(o.node) * Math.cos(u) - Math.sin(o.node) * Math.sin(u) * cosI),
    r * (Math.sin(o.node) * Math.cos(u) + Math.cos(o.node) * Math.sin(u) * cosI),
  ];
}
