/**
 * Flybys after a one-way mission's arrival event (Lucy after Eurybates, New
 * Horizons at Arrokoth, Parker's later perihelia and Venus assists, Giotto at
 * Grigg-Skjellerup). The outbound arc ends at the arrival, so there is no
 * trajectory under these events: the flyby cinema gives the ship a stylised
 * pass beside the body instead, and the epilogue waits until the window closes
 * (flyby review call 3).
 */

const EPS_DAYS = 1e-6;

export function isPostArrivalEvent(met: number, transitDays: number, oneWay: boolean): boolean {
  return oneWay && met > transitDays + EPS_DAYS;
}

/** Closest approach, in body radii from the centre. */
const PASS_RADII = 2;
/** Relative speed of the pass, in body radii per day. */
const PASS_SPEED_RADII = 0.6;

/**
 * Scene position of the ship at `met` on a straight pass beside the body:
 * closest at `peakMet`, PASS_RADII radii out on the body's sunward side (the camera
 * sits on the ship's side, so it sees the lit face) and a little above the plane,
 * moving the way the body moves across the Sun line. `bodyAt` is the body's scene
 * position at a MET.
 */
export function postArrivalPass(
  bodyAt: (met: number) => { x: number; z: number },
  size: number,
  peakMet: number,
  met: number,
): { x: number; y: number; z: number } {
  const b = bodyAt(met);
  const b0 = bodyAt(peakMet);
  const b1 = bodyAt(peakMet + 1);
  const r = Math.hypot(b0.x, b0.z) || 1;
  const out = { x: b0.x / r, z: b0.z / r };
  // Along the body's motion across the Sun line, so the pass never cuts through the offset.
  const mx = b1.x - b0.x;
  const mz = b1.z - b0.z;
  const along = -out.z * mx + out.x * mz;
  const sgn = along < 0 ? -1 : 1;
  const dx = -out.z * sgn;
  const dz = out.x * sgn;
  const t = (met - peakMet) * PASS_SPEED_RADII * size;
  const off = PASS_RADII * size * 0.94;
  return {
    x: b.x - out.x * off + dx * t,
    y: PASS_RADII * size * 0.34,
    z: b.z - out.z * off + dz * t,
  };
}
