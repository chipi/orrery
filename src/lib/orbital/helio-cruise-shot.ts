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
import { ARRIVAL_SMALL_BODY_RADIUS } from './flyby-camera-plan';
import type { ShotKind } from './flyby-shots';

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

export function cruiseCraftShot(
  craft: P3,
  target: P3,
  nearTargetBacks = NEAR_TARGET_BACKS,
  aspect = 1,
): CruiseShot | null {
  let fx = target.x - craft.x;
  let fy = target.y - craft.y;
  let fz = target.z - craft.z;
  const f = Math.hypot(fx, fy, fz);
  if (f < nearTargetBacks * CRUISE_SHOT_BACK || f === 0) return null;
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
  // A tall phone frame keeps the height and loses most of the width (phone-framing.ts): the craft
  // drawn at its hero share then reached past the left edge. Move it in with the width.
  const right = CRAFT_LEFT * back * Math.min(1, aspect * aspect);
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

/**
 * A comet or asteroid the craft passes (Giotto at Halley, Galileo at Gaspra) closes at tens of
 * km/s: ten days out it is 0.4 AU away, where the planet rigs, sized in body radii, frame empty
 * space and a craft too small to see (flyby review, 2026-11-26). Its approach and depart are the
 * craft-led shot instead: the craft in the foreground, the body ahead, then receding behind it.
 * Planets, arrivals (the craft stays at the body) and the establish and hero beats keep the
 * montage rigs: null.
 */
export function smallBodyPassShot(
  kind: ShotKind,
  craft: P3,
  body: P3,
  bodyRadius: number,
  arrival: boolean,
  aspect = 1,
): CruiseShot | null {
  if (arrival || bodyRadius >= ARRIVAL_SMALL_BODY_RADIUS) return null;
  if (kind !== 'approach' && kind !== 'depart') return null;
  return cruiseCraftShot(craft, body, 0, aspect);
}
