/**
 * Predict the spacecraft's position at an arbitrary MET by
 * linearly-interpolating a precomputed trajectory point array.
 *
 * /fly stores the heliocentric trajectory as a `Vec2[]` (xz + optional
 * y for the +y-lifted flyby waypoints) at uniform fraction-of-arc
 * spacing. To sample at MET=t we:
 *
 *   1. Convert `t` to a fraction-of-arc in [0, 1] by dividing by the
 *      arrival MET.
 *   2. Multiply by `(points.length - 1)` to get a float index into
 *      the array.
 *   3. Linearly interpolate between the floor + ceil samples.
 *
 * Returns `null` for degenerate inputs (empty/single-point trajectory
 * or non-positive arrival). Callers use the null to fall through to a
 * cruise-distance fallback in the cinema block.
 *
 * Pure form — extracted from /fly's animate-loop scope. The original
 * closure took the same arguments and had no further dependencies, so
 * the lift is a verbatim move + a few tests.
 */

import type { Vec2 } from '$lib/mission-arc';

export interface ShipScenePos {
  x: number;
  y: number;
  z: number;
}

export function predictShipPosAtMet(
  points: ReadonlyArray<Vec2>,
  targetMet: number,
  arrivalMet: number,
): ShipScenePos | null {
  if (points.length < 2 || !(arrivalMet > 0)) return null;
  const fraction = Math.max(0, Math.min(1, targetMet / arrivalMet));
  const indexFloat = fraction * (points.length - 1);
  const i = Math.floor(indexFloat);
  const t = indexFloat - i;
  const a = points[i];
  const b = points[Math.min(i + 1, points.length - 1)];
  const ay = a.y ?? 0;
  const by = b.y ?? 0;
  return {
    x: a.x + (b.x - a.x) * t,
    y: ay + (by - ay) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
