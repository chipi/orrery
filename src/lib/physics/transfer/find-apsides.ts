/**
 * Find the periapsis (closest) + apoapsis (farthest) indices in a
 * trajectory point array, measured from a chosen centre.
 *
 * /fly draws two markers — periMarker + apoMarker — at the closest +
 * farthest waypoints along the outbound trajectory:
 *
 *  - Heliocentric trips (Mars / outer planets): centre = the Sun at
 *    the world origin. Apsides read as "where the spacecraft is
 *    closest to / farthest from the Sun" along the arc.
 *  - Cislunar trips: both endpoints are at ~1 AU from the Sun so
 *    Sun-relative apsides collapse to a single point. Measure
 *    Earth-relative instead — perigee = closest approach to Earth,
 *    apogee = farthest from Earth — which is the cislunar physicist's
 *    apsides anyway.
 *
 * Pure compute step — extracted from /fly's animate-loop scope. The
 * THREE.js marker mutations stay inline at the caller because they
 * need scene objects.
 */

import type { Vec2 } from './mission-arc';

export interface ApsidesIndices {
  /** Index of the point closest to (centreX, centreZ). */
  periIdx: number;
  /** Index of the point farthest from (centreX, centreZ). */
  apoIdx: number;
}

/**
 * Returns the per-index pair for the closest + farthest waypoints
 * from (centreX, centreZ), or `null` when the input has fewer than 3
 * points (a 2-point line has identical apsides at the endpoints and
 * the caller usually wants to skip the markers in that case).
 *
 * Ties go to the lowest index, matching the original animate-loop
 * closure's behaviour (`<` rather than `<=`).
 */
export function findApsidesIndices(
  points: ReadonlyArray<Vec2>,
  centreX: number,
  centreZ: number,
): ApsidesIndices | null {
  if (points.length < 3) return null;
  let minR2 = Infinity;
  let maxR2 = -Infinity;
  let periIdx = 0;
  let apoIdx = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = p.x - centreX;
    const dz = p.z - centreZ;
    const r2 = dx * dx + dz * dz;
    if (r2 < minR2) {
      minR2 = r2;
      periIdx = i;
    }
    if (r2 > maxR2) {
      maxR2 = r2;
      apoIdx = i;
    }
  }
  return { periIdx, apoIdx };
}
