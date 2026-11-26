/**
 * Flybys after a one-way mission's arrival event (Lucy after Eurybates, New
 * Horizons at Arrokoth, Parker's later perihelia and Venus assists, Giotto at
 * Grigg-Skjellerup). The outbound arc ends at the arrival, so there is no
 * trajectory under these events: the flyby cinema gives the ship a stylised
 * pass beside the body instead, and the epilogue waits until the window closes
 * (flyby review call 3).
 */

import { DEFAULT_FLYBY_SCHEDULE } from './flyby-shot-schedule';

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
 * position at a MET. `anchorMet` is the MET whose body position the pass is laid
 * beside: the ship's own MET for the live ship, the current MET for the shot's
 * samples, because the shot holds the body where it is now (Halley near perihelion
 * moves 2.4 scene units a day, and the 2-day lead put the frame beside empty space).
 */
export function postArrivalPass(
  bodyAt: (met: number) => { x: number; z: number },
  size: number,
  peakMet: number,
  met: number,
  anchorMet: number = met,
): { x: number; y: number; z: number } {
  const b = bodyAt(anchorMet);
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

/** Days after the peak the hero window closes (flyby-shot-schedule). */
const HERO_END_DAYS = DEFAULT_FLYBY_SCHEDULE.find((w) => w.kind === 'hero')?.to ?? 1.5;

/**
 * The ship after an arrival (orbit insertion, rendezvous), once the hero window has closed:
 * parked beside the body where it is now. The arc ends where the body was at the peak, and the
 * body moves on: Didymos ten days after Hera's rendezvous is 20 M km away, and the depart beat
 * framed the ship at the arc's end with the body a speck at the edge (review F5). Null before.
 */
export function parkedAfterArrival(
  bodyAt: (met: number) => { x: number; z: number },
  size: number,
  peakMet: number,
  nowMet: number,
): { x: number; y: number; z: number } | null {
  if (nowMet < peakMet + HERO_END_DAYS) return null;
  return postArrivalPass(bodyAt, size, peakMet, peakMet, nowMet);
}

/** Separation, in body radii, past which the stored arc does not pass the body. */
const ARC_MISS_RADII = 3;

/**
 * The stored arc misses the body at the peak (flyby review call 5): Keplerian arcs and
 * coarse trajectory files put the ship tens to hundreds of radii from it (Hayabusa and
 * Escapade at Earth, OSIRIS-REx at Bennu, Huygens), and the shot framed empty space.
 * Such a window flies the same pass as a flyby after the arrival.
 */
export function arcMissesBody(
  peakShip: { x: number; z: number } | null,
  bodyAtPeak: { x: number; z: number },
  size: number,
): boolean {
  if (!peakShip) return true;
  return Math.hypot(peakShip.x - bodyAtPeak.x, peakShip.z - bodyAtPeak.z) > ARC_MISS_RADII * size;
}
