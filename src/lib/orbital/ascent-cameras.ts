/**
 * Scene 0 camera shot language (RFC-033 §7 · epic #412 · L-E). A launch
 * is the most codified event in spaceflight: pad-wide → tower-clear →
 * tracking → onboard-looking-down → staging beauty → chase → orbit limb.
 * This module is the pure, testable analogue of the flyby montage
 * (flyby-shots.ts): a MET-keyed shot SCHEDULE, a selector, and a pure
 * pose composer per shot. Hard-cut between shots (cinematic); the pose
 * within a shot is a continuous function of the vehicle state, so it
 * moves smoothly.
 *
 * Poses are in the same km scene frame as ascent-scene.ts: the vehicle
 * is at (downrangeKm, altKm, 0); the launch site is the origin.
 */

import type { AscentEvent, AscentState } from './ascent-physics';

export type AscentShotName =
  | 'pad'
  | 'tower_clear'
  | 'ascent'
  | 'onboard_down'
  | 'staging'
  | 'chase'
  | 'orbit';

export interface ShotWindow {
  name: AscentShotName;
  tStart: number;
  tEnd: number;
}

export interface CameraPose {
  /** Camera position (km). */
  px: number;
  py: number;
  pz: number;
  /** Look-at target (km). */
  tx: number;
  ty: number;
  tz: number;
  /** Vertical field of view (deg). */
  fov: number;
}

export interface ScheduleInputs {
  events: AscentEvent[];
  /** Max-Q time (s) — tracked separately from events by the integrator. */
  maxQt: number;
  /** Total trajectory duration (s). */
  duration: number;
}

const TOWER_CLEAR_END = 12;
const PAD_END = 3;
const STAGING_HOLD = 5;

/**
 * Build the ordered shot schedule from the ascent beats. Missing beats
 * (e.g. a single-stage vehicle with no staging) fall back to sensible
 * splits so the schedule always spans [0, duration] with no gaps.
 */
export function buildShotSchedule(inp: ScheduleInputs): ShotWindow[] {
  const tOf = (type: AscentEvent['type']): number | undefined =>
    inp.events.find((e) => e.type === type)?.t;

  const staging = tOf('staging');
  const seco = tOf('seco') ?? inp.duration;
  const maxQ = Math.max(TOWER_CLEAR_END + 1, inp.maxQt || inp.duration * 0.2);
  // Onboard phase runs from Max-Q to staging (or, absent staging, to SECO).
  const onboardEnd = staging ?? seco;
  const stagingEnd = staging != null ? staging + STAGING_HOLD : onboardEnd;

  const raw: ShotWindow[] = [
    { name: 'pad', tStart: 0, tEnd: PAD_END },
    { name: 'tower_clear', tStart: PAD_END, tEnd: TOWER_CLEAR_END },
    { name: 'ascent', tStart: TOWER_CLEAR_END, tEnd: maxQ },
    { name: 'onboard_down', tStart: maxQ, tEnd: onboardEnd },
    ...(staging != null
      ? [{ name: 'staging' as const, tStart: staging, tEnd: stagingEnd }]
      : []),
    { name: 'chase', tStart: stagingEnd, tEnd: seco },
    { name: 'orbit', tStart: seco, tEnd: Math.max(seco, inp.duration) },
  ];

  // Drop inverted/empty windows (can happen when beats bunch up on a
  // short or underpowered flight) so the selector never sees a gap.
  return raw.filter((w) => w.tEnd > w.tStart);
}

/** The active shot at time `t` — clamps to the first/last window. */
export function selectShot(schedule: ShotWindow[], t: number): AscentShotName {
  if (schedule.length === 0) return 'ascent';
  if (t <= schedule[0].tStart) return schedule[0].name;
  for (const w of schedule) {
    if (t >= w.tStart && t < w.tEnd) return w.name;
  }
  return schedule[schedule.length - 1].name;
}

/**
 * Compose the camera pose for a shot from the current vehicle state.
 * `vehLen` is the rendered vehicle length (km) so offsets scale with the
 * stylised model. All shots keep the vehicle in frame; the wide shots
 * pull back with altitude to admit Earth curvature.
 */
export function composeShot(name: AscentShotName, s: AscentState, vehLen: number): CameraPose {
  const dr = s.downrangeKm;
  const alt = s.altKm;
  // Gentle altitude pull-back shared by the tracking shots.
  const back = Math.max(vehLen * 4.5, alt * 0.32 + vehLen * 3);

  switch (name) {
    case 'pad':
      // Low, wide, ground-level looking up at the vehicle on the pad.
      return pose(dr - vehLen * 2.4, vehLen * 0.5, vehLen * 4.2, dr, alt + vehLen * 1.1, 0, 42);
    case 'tower_clear':
      // Low tracking as it clears the tower — still looking up.
      return pose(dr - vehLen * 2.2, alt + vehLen * 0.6, vehLen * 4, dr, alt + vehLen * 0.7, 0, 44);
    case 'ascent':
      // Three-quarter tracking arc; Earth begins to enter frame.
      return pose(dr - back * 0.5, alt + back * 0.22, back, dr, alt, 0, 46);
    case 'onboard_down': {
      // Strap-cam near the nose looking DOWN the body at Earth falling
      // away — the body rides the near frame, Earth (limb higher up) below.
      return pose(dr + vehLen * 0.32, alt + vehLen * 0.85, vehLen * 0.6, dr, alt - vehLen * 3.2, 0, 60);
    }
    case 'staging':
      // Pulled-back, off-plane so the two parting stages read against Earth.
      return pose(dr - vehLen * 7, alt + vehLen * 2.4, vehLen * 9, dr, alt, 0, 40);
    case 'chase':
      // Behind + above the upper stage, Earth curve below.
      return pose(dr - back * 0.42, alt + back * 0.3, back * 0.9, dr + vehLen * 1.5, alt, 0, 46);
    case 'orbit':
      // Wide serene limb — engine dark, Earth filling the lower frame.
      return pose(dr - back * 0.5, alt + back * 0.28, back * 1.15, dr, alt - back * 0.1, 0, 48);
  }
}

function pose(
  px: number,
  py: number,
  pz: number,
  tx: number,
  ty: number,
  tz: number,
  fov: number,
): CameraPose {
  return { px, py, pz, tx, ty, tz, fov };
}
