/**
 * Flyby montage schedule + selector (#371).
 *
 * Maps a flyby's mission-elapsed time to the active camera SHOT, so the
 * scene plays each encounter as an edited sequence:
 *
 *   ESTABLISH ──cut── APPROACH ──cut── HERO (held) ──cut── DEPART
 *
 * Windows are expressed in sim-days RELATIVE TO the flyby peak (closest
 * approach at offset 0; negative = before). The hero window straddles the
 * peak and is where the existing peak-hold beat freezes sim time. Pure:
 * no Three.js, no clock — the caller passes the current MET offset.
 */

import type { ShotKind } from './flyby-shots';

export interface ShotWindow {
  kind: ShotKind;
  /** Inclusive start, sim-days relative to peak (negative = before peak). */
  from: number;
  /** Exclusive end, sim-days relative to peak. */
  to: number;
}

/**
 * Default flyby montage template. Tuned against the cinema windows the
 * scene already uses: the encounter cinema engages ~60 d before peak
 * (`FLYBY_APPROACH_DAYS`) and releases ~30 d after (`FLYBY_DEPART_DAYS`),
 * and the hero hold sits within ±`FLYBY_PEAK_DAYS` (4) of closest approach.
 *  - establish: the wide intro as the arc sweeps in
 *  - approach : the chase as the planet swells (ship can't be occluded)
 *  - hero     : the composed closest-approach climax (held)
 *  - depart   : the over-the-shoulder bookend
 */
export const DEFAULT_FLYBY_SCHEDULE: readonly ShotWindow[] = [
  { kind: 'establish', from: -60, to: -20 },
  { kind: 'approach', from: -20, to: -1.5 },
  // Hero is a SHORT beat (Marko 2026-06) — a narrow ±1.5 d window plus the
  // brief peak-hold freeze, then cut straight to the pulled-back depart so
  // we don't linger in the iconic angle.
  { kind: 'hero', from: -1.5, to: 1.5 },
  { kind: 'depart', from: 1.5, to: 30 },
];

/**
 * The active shot at a given MET offset (current MET − peak MET), or null
 * when the offset is outside the montage window (the scene uses its normal
 * cruise framing there). First matching window wins.
 */
export function selectShot(
  metOffsetDays: number,
  schedule: readonly ShotWindow[] = DEFAULT_FLYBY_SCHEDULE,
): ShotKind | null {
  for (const w of schedule) {
    if (metOffsetDays >= w.from && metOffsetDays < w.to) return w.kind;
  }
  return null;
}

/**
 * Progress 0→1 through the active shot's window at a MET offset (0 at the
 * window start, →1 at its end). Useful for gentle within-shot drift. Returns
 * 0 when outside the montage.
 */
export function shotProgress(
  metOffsetDays: number,
  schedule: readonly ShotWindow[] = DEFAULT_FLYBY_SCHEDULE,
): number {
  for (const w of schedule) {
    if (metOffsetDays >= w.from && metOffsetDays < w.to) {
      const span = w.to - w.from;
      return span > 0 ? (metOffsetDays - w.from) / span : 0;
    }
  }
  return 0;
}

/** True when the active shot kind differs from the previous frame's — the
 *  scene fires a cut (snap + optional fade) on this transition. */
export function isCut(prev: ShotKind | null, next: ShotKind | null): boolean {
  return prev !== next && next !== null;
}

// Flyby slow-motion. Around closest approach the ship whips around the
// planet at full sim-speed (a "buzz"); we drop the effective day/sec rate
// across the close passage so the gravity-assist swing is watchable, with
// soft ramps at the edges so the speed change isn't abrupt. The peak-hold
// freeze still sits at the exact peak — a brief pause inside the slow-mo.
export const FLYBY_SLOWMO_FROM_DAYS = -6;
export const FLYBY_SLOWMO_TO_DAYS = 18;
export const FLYBY_SLOWMO_RAMP_DAYS = 4;
/** Effective day/sec cap during the slow passage. */
export const FLYBY_SLOWMO_MAX_DPS = 3.5;

/**
 * Effective sim day/sec at a given MET offset from the flyby peak: the
 * normal `simSpeed` outside the close passage, eased down to (at most)
 * `FLYBY_SLOWMO_MAX_DPS` across it. Never speeds the sim UP (min with
 * simSpeed), so a user already crawling stays slow.
 */
export function flybySlowmoSpeed(metOffsetDays: number, simSpeed: number): number {
  if (metOffsetDays <= FLYBY_SLOWMO_FROM_DAYS || metOffsetDays >= FLYBY_SLOWMO_TO_DAYS) {
    return simSpeed;
  }
  let t = 1;
  if (metOffsetDays < FLYBY_SLOWMO_FROM_DAYS + FLYBY_SLOWMO_RAMP_DAYS) {
    t = (metOffsetDays - FLYBY_SLOWMO_FROM_DAYS) / FLYBY_SLOWMO_RAMP_DAYS;
  } else if (metOffsetDays > FLYBY_SLOWMO_TO_DAYS - FLYBY_SLOWMO_RAMP_DAYS) {
    t = (FLYBY_SLOWMO_TO_DAYS - metOffsetDays) / FLYBY_SLOWMO_RAMP_DAYS;
  }
  t = Math.max(0, Math.min(1, t));
  const slow = Math.min(simSpeed, FLYBY_SLOWMO_MAX_DPS);
  return simSpeed + (slow - simSpeed) * t;
}
