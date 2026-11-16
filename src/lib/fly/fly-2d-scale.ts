import type { Vec2 } from '$lib/physics/transfer/mission-arc';
import { orbitPath } from '$lib/physics/transfer/mission-arc';
import type { DestinationId } from '$lib/physics/transfer/lambert-grid.constants';

/** The 2D view never zooms in past a 1.5 AU fit, so a Venus trip does not blow up the Sun. */
export const FLY_2D_MIN_EXTENT_AU = 1.5;
/** The outermost point of the flight lands at this fraction of the shorter half-extent. */
export const FLY_2D_FIT_FRACTION = 0.85;
/** Time constant of the scale easing: 0.27 s settles 95 % of a change in about 0.8 s. */
export const FLY_2D_EASE_TAU_S = 0.27;

/** Farthest point from the Sun on a destination's orbit, in AU. */
export function destinationExtentAu(id: DestinationId): number {
  return orbitPath(id, 90).reduce((m, p) => Math.max(m, Math.hypot(p.x, p.z)), 0);
}

/** Farthest distance from the Sun over any number of point lists (the trajectory), in AU. */
export function pointsExtentAu(...lists: Vec2[][]): number {
  let max = 0;
  for (const pts of lists) for (const p of pts) max = Math.max(max, Math.hypot(p.x, p.z));
  return max;
}

/** Pixels per AU that puts `extentAu` (floored at 1.5 AU) at 85 % of the shorter half-extent. */
export function fitScale2d(extentAu: number, w: number, h: number): number {
  const extent = Math.max(extentAu, FLY_2D_MIN_EXTENT_AU);
  return (Math.min(w, h) / 2 / extent) * FLY_2D_FIT_FRACTION;
}

/** One easing step toward `target`; snaps when there is no current value yet. */
export function easeScale2d(current: number, target: number, dtSec: number): number {
  if (!(current > 0)) return target;
  const k = 1 - Math.exp(-Math.max(0, dtSec) / FLY_2D_EASE_TAU_S);
  return current + (target - current) * k;
}
