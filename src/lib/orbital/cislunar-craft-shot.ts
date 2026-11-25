/**
 * The craft-led cislunar coast shot (W6, operator 2026-11-25). The coast used to hold the whole
 * Earth–Moon diagram, so it read as two dots and no craft. Through the middle of each coast the
 * camera now sits a few units behind the craft on a long lens, looking past it at the body it is
 * flying to (the Moon out, Earth home): the craft in the foreground, the body behind it, growing
 * as the coast closes. The diagram frame keeps the departure and the arrival; the shot cuts in
 * and out (a long lens cannot ease out of a wide one without a zoom).
 *
 * Scene units are the cislunar view's (1 unit = 10,000 km: the Moon's radius 0.17, Earth–Moon
 * 38); the craft model is drawn about 0.09 units long there. Pure: a scrub lands on the frame
 * play shows.
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}

export interface CraftShot {
  pos: P3;
  look: P3;
  /** Vertical field of view (deg), for a landscape frame. */
  fovDeg: number;
}

/** The coast's craft-led stretch, in phase progress: the diagram frame keeps each end. */
export const CRAFT_SHOT_FROM = 0.06;
export const CRAFT_SHOT_TO = 0.9;

/** Distance behind the craft × tan(half the lens): fixes the craft at ~a quarter of the frame. */
const FRAME_AT_CRAFT = 0.16;
/** The lens for a body of the Moon's radius (0.17 units); a bigger body takes a wider lens in
 *  proportion, so Earth on the way home reads at about the Moon's size on the way out. */
const MOON_TAN_HALF = 0.04;
const MOON_R = 0.17;
/** No craft-led frame within this many radii of the body it flies to. */
const NEAR_BODY_RADII = 8;
/** Where the craft sits, as a fraction of the half-frame: low and to the left of the body. */
const CRAFT_LOW = 0.4;
const CRAFT_LEFT = 0.45;

export function inCraftShot(progress: number): boolean {
  return progress >= CRAFT_SHOT_FROM && progress <= CRAFT_SHOT_TO;
}

/** A sphere the camera, backed off behind the craft, must stay clear of (the body left behind). */
export interface Clear {
  at: P3;
  r: number;
}

/** The shot, or null while the body left behind would sit between the camera and the craft, or
 *  the craft is close in to the body it flies to. */
export function craftLedCoastShot(
  craft: P3,
  body: P3,
  bodyR: number,
  leftBehind?: Clear,
): CraftShot | null {
  const tanHalf = MOON_TAN_HALF * (bodyR / MOON_R);
  const back = FRAME_AT_CRAFT / tanHalf;
  if (leftBehind) {
    const d = Math.hypot(
      craft.x - leftBehind.at.x,
      craft.y - leftBehind.at.y,
      craft.z - leftBehind.at.z,
    );
    if (d < back + 2 * leftBehind.r) return null;
  }
  let fx = body.x - craft.x;
  let fy = body.y - craft.y;
  let fz = body.z - craft.z;
  const f = Math.hypot(fx, fy, fz) || 1;
  // Close in, the body would swallow the long lens: the diagram frame takes the approach.
  if (f < NEAR_BODY_RADII * bodyR) return null;
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
  // Shifting the camera up and right puts the craft low and left of the frame's centre.
  const up = CRAFT_LOW * FRAME_AT_CRAFT;
  const right = CRAFT_LEFT * FRAME_AT_CRAFT;
  return {
    pos: {
      x: craft.x - fx * back + ux * up + sx * right,
      y: craft.y - fy * back + uy * up,
      z: craft.z - fz * back + uz * up + sz * right,
    },
    look: body,
    fovDeg: (2 * Math.atan(tanHalf) * 180) / Math.PI,
  };
}
