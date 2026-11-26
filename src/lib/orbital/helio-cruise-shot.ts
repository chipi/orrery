/**
 * The craft-led interplanetary cruise shot (flyby review call 9, 2026-11-26). The cruise held the
 * whole inner system, so it read as a map with no craft. Through the cruise the camera now sits a
 * few units behind the craft, looking past it at the body it flies to: the craft in the
 * foreground, low and to the left, the destination ahead in the distance. The frame runner sizes
 * the craft to the frame as the flyby hero does. The wide frame keeps the departure and the
 * approach; the shot cuts in and out, as the cislunar coast's does (cislunar-craft-shot.ts).
 *
 * Scene units are the helio scene's (1 AU = SCALE_3D units). Pure: a scrub lands on the frame play
 * shows.
 */
import type { P3 } from './cislunar-craft-shot';

export interface CruiseShot {
  pos: P3;
  look: P3;
  fovDeg: number;
}

/** Camera distance behind the craft, scene units: close enough that the craft fills its share of
 *  the frame at any destination, far enough to stay clear of the drawn model. */
export const CRUISE_SHOT_BACK = 8;
const CRUISE_SHOT_FOV = 40;
/** Camera offset up and to the right, as a fraction of `back`: the craft sits low and left. */
const CRAFT_LOW = 0.16;
const CRAFT_LEFT = 0.22;
/** No cruise shot within this many `back` lengths of the body ahead: the approach frame takes it. */
const NEAR_TARGET_BACKS = 6;

export function cruiseCraftShot(craft: P3, target: P3): CruiseShot | null {
  let fx = target.x - craft.x;
  let fy = target.y - craft.y;
  let fz = target.z - craft.z;
  const f = Math.hypot(fx, fy, fz);
  if (f < NEAR_TARGET_BACKS * CRUISE_SHOT_BACK) return null;
  fx /= f;
  fy /= f;
  fz /= f;
  // side = forward × up(0,1,0); up' = side × forward
  let sx = -fz;
  let sz = fx;
  const s = Math.hypot(sx, sz) || 1;
  sx /= s;
  sz /= s;
  const ux = -sz * fy;
  const uy = sz * fx - sx * fz;
  const uz = sx * fy;
  const back = CRUISE_SHOT_BACK;
  const up = CRAFT_LOW * back;
  const right = CRAFT_LEFT * back;
  return {
    pos: {
      x: craft.x - fx * back + ux * up + sx * right,
      y: craft.y - fy * back + uy * up,
      z: craft.z - fz * back + uz * up + sz * right,
    },
    look: target,
    fovDeg: CRUISE_SHOT_FOV,
  };
}
