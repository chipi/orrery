/**
 * Touch camera maths for the Worlds' globe (operator 2026-11-23): a pinch keeps the ground under
 * the fingers, and a two-finger drag turns the globe so the ground follows them. The camera orbits
 * the body centre at distance camR looking at it; the surface is the sphere of radius
 * SURFACE_R (planetRadius, 30 on every body).
 */
import { SURFACE_R } from './surface-view-state';

/**
 * Central angle (rad) between the point straight under the camera and the ground point seen
 * along a ray `alpha` rad off the view axis, from distance `d`. Null when the ray misses the
 * sphere (past the horizon). Sine rule in the triangle centre · camera · ground point.
 */
export function groundAngle(alpha: number, d: number, r = SURFACE_R): number | null {
  const s = (d * Math.sin(alpha)) / r;
  if (s >= 1) return null;
  return Math.asin(s) - alpha;
}

/**
 * How far (rad of central angle) the camera turns toward a screen point `offsetPx` from the view
 * centre so that the ground under it stays under it while the distance changes d0 → d1. Positive
 * toward the point when zooming in. 0 when either ray misses the sphere.
 */
export function anchorTurn(
  offsetPx: number,
  halfHeightPx: number,
  halfFovV: number,
  d0: number,
  d1: number,
  r = SURFACE_R,
): number {
  if (offsetPx <= 0 || halfHeightPx <= 0) return 0;
  const alpha = Math.atan((offsetPx / halfHeightPx) * Math.tan(halfFovV));
  const a0 = groundAngle(alpha, d0, r);
  const a1 = groundAngle(alpha, d1, r);
  if (a0 == null || a1 == null) return 0;
  return a0 - a1;
}

/**
 * Central angle per screen pixel near the view centre: the turn that moves the ground one pixel.
 * A two-finger drag at this rate keeps the ground under the fingers; the old pan used the
 * distance from the centre (camR) where the height above the ground (camR - r) belongs, ~6x too
 * fast at a site.
 */
export function radPerPx(
  camR: number,
  halfHeightPx: number,
  halfFovV: number,
  r = SURFACE_R,
): number {
  if (halfHeightPx <= 0) return 0;
  return ((camR - r) * Math.tan(halfFovV)) / halfHeightPx / r;
}
