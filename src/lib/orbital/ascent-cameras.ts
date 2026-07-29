/**
 * Scene 0 camera shot language (RFC-034 §7 · epic #412 · L-E). A launch
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
  | 'fairing'
  | 'chase'
  | 'separation'
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
const FAIRING_HOLD = 6.5; // matches FAIRING_SEP_S (item 4) — camera holds the reveal
/** Seconds the payload-separation shot holds after SECO before the orbit
 *  coast — also the scene's payload-sep animation duration (kept in sync). */
export const PAYLOAD_SEP_HOLD_S = 4;

/**
 * Deterministic 0→1 progress for a separation animation that begins at
 * `eventT` and completes `durationS` later. A pure function of the mission
 * time, so scrubbing the timeline back and forth is exact — 0 before the
 * event, ramps to 1, then stays 1. Returns 0 when the event never fired.
 */
export function sepProgress(t: number, eventT: number | undefined, durationS: number): number {
  if (eventT == null || durationS <= 0) return 0;
  return Math.min(1, Math.max(0, (t - eventT) / durationS));
}

/** Reference half-width (s) of the slow-motion window centred on a sep event. */
export const SEP_SLOWMO_WINDOW_S = 3.2;
/** Play-rate multiplier at the separation instant (22% of nominal). */
export const SEP_SLOWMO_MIN_FACTOR = 0.22;

/**
 * Cinematic "beat": a play-rate multiplier (SEP_SLOWMO_MIN_FACTOR…1) that eases
 * the clock into slow-motion as it passes each separation event, holds briefly
 * at the event, then ramps back to full rate — so booster staging / fairing
 * jettison / payload sep / heat-shield & backshell sep read as an *event*
 * instead of blitzing past at ×N.
 *
 * The beat is deliberately *asymmetric*: a quick slow-IN as the clock
 * approaches the event, a short flat HOLD straddling it (so the burst + drift
 * land), then a longer, lingering ramp-OUT — the classic "punch then savor"
 * shape rather than a symmetric dip.
 *
 * Pure + play-only: it scales the *advance*, never the scrubbed position, so
 * scrubbing stays exact. `eventTimes` are in the same time base as `t`.
 */
export function sepSlowmoFactor(
  t: number,
  eventTimes: (number | undefined)[],
  windowS = SEP_SLOWMO_WINDOW_S,
  minFactor = SEP_SLOWMO_MIN_FACTOR,
): number {
  // Nearest event, keeping the SIGNED offset (before vs after the event).
  let signed = Infinity;
  let abs = Infinity;
  for (const e of eventTimes) {
    if (e == null) continue;
    const s = t - e;
    const a = Math.abs(s);
    if (a < abs) {
      abs = a;
      signed = s;
    }
  }
  if (!Number.isFinite(abs)) return 1;

  const hold = windowS * 0.18; // flat full-slow zone straddling the event
  const inW = windowS * 0.8; // quick slow-in (before the event)
  const outW = windowS * 1.6; // lingering ramp-out (after the event) — savor
  if (abs <= hold) return minFactor;
  const span = signed < 0 ? inW : outW;
  if (abs >= span) return 1;
  const edge = (abs - hold) / (span - hold); // 0 at hold edge → 1 at full rate
  const eased = edge * edge * (3 - 2 * edge); // smoothstep
  return minFactor + (1 - minFactor) * eased;
}

/**
 * Build the ordered shot schedule from the ascent beats. Missing beats
 * (e.g. a single-stage vehicle with no staging) fall back to sensible
 * splits so the schedule always spans [0, duration] with no gaps.
 */
export function buildShotSchedule(inp: ScheduleInputs): ShotWindow[] {
  const tOf = (type: AscentEvent['type']): number | undefined =>
    inp.events.find((e) => e.type === type)?.t;

  const seco = tOf('seco') ?? inp.duration;
  const maxQ = Math.max(TOWER_CLEAR_END + 1, inp.maxQt || inp.duration * 0.2);
  // Payload separation holds briefly after SECO, then the serene orbit coast.
  const sepEnd = seco + PAYLOAD_SEP_HOLD_S;
  const fairing = tOf('fairing_jettison');

  // A dedicated camera beat for EVERY separation, not just the first: each
  // 'staging' event (strap-on jettison, the core drop/MECO, and each mid-stage
  // of a 3+-stage vehicle) plus fairing jettison, in time order. The
  // AscentCameraDebug plot renders this schedule, so every separation gets both
  // a camera cut AND a debug-window marker — previously only the first staging,
  // fairing, and SECO were beated, so the core drop + mid-stage sep were unmarked.
  const beats = [
    ...inp.events
      .filter((e) => e.type === 'staging')
      .map((e) => ({ name: 'staging' as const, t: e.t })),
    ...(fairing != null ? [{ name: 'fairing' as const, t: fairing }] : []),
  ]
    .filter((b) => b.t > maxQ && b.t < seco)
    .sort((a, b) => a.t - b.t);

  const windows: ShotWindow[] = [
    { name: 'pad', tStart: 0, tEnd: PAD_END },
    { name: 'tower_clear', tStart: PAD_END, tEnd: TOWER_CLEAR_END },
    { name: 'ascent', tStart: TOWER_CLEAR_END, tEnd: maxQ },
  ];
  // Fill Max-Q → SECO: the gap before the FIRST separation is the below-the-
  // rocket 'onboard_down'; later gaps are tracking 'chase' shots. `cursor` keeps
  // the schedule contiguous (each window starts where the previous ends).
  let cursor = maxQ;
  let firstGap = true;
  for (const b of beats) {
    if (b.t <= cursor) continue; // overlapping / out of order — preserve contiguity
    windows.push({ name: firstGap ? 'onboard_down' : 'chase', tStart: cursor, tEnd: b.t });
    firstGap = false;
    const hold = b.name === 'fairing' ? FAIRING_HOLD : STAGING_HOLD;
    const holdEnd = Math.min(b.t + hold, seco);
    windows.push({ name: b.name, tStart: b.t, tEnd: holdEnd });
    cursor = holdEnd;
  }
  if (seco > cursor) {
    windows.push({ name: firstGap ? 'onboard_down' : 'chase', tStart: cursor, tEnd: seco });
  }
  windows.push({ name: 'separation', tStart: seco, tEnd: sepEnd });
  windows.push({ name: 'orbit', tStart: sepEnd, tEnd: Math.max(sepEnd, inp.duration) });

  // Drop inverted/empty windows (can happen when beats bunch up on a
  // short or underpowered flight) so the selector never sees a gap.
  return windows.filter((w) => w.tEnd > w.tStart);
}

/** The active shot at time `t` — clamps to the first/last window. */
export function selectShot(schedule: ShotWindow[], t: number): AscentShotName {
  return activeShotAt(schedule, t).name;
}

/**
 * The active shot AND the camera's progress (0→1) through that shot's beat
 * window at time `t`. Progress drives the authored intra-shot motion
 * (orbit / dolly / push-in) so the camera is always moving — the director's-
 * cut steady-cam feel, cut hard between shots.
 */
export function activeShotAt(
  schedule: ShotWindow[],
  t: number,
): { name: AscentShotName; progress: number } {
  if (schedule.length === 0) return { name: 'ascent', progress: 0.5 };
  if (t <= schedule[0].tStart) return { name: schedule[0].name, progress: 0 };
  for (const w of schedule) {
    if (t >= w.tStart && t < w.tEnd) {
      const span = w.tEnd - w.tStart;
      return { name: w.name, progress: span > 0 ? (t - w.tStart) / span : 0 };
    }
  }
  return { name: schedule[schedule.length - 1].name, progress: 1 };
}

/** Smoothstep ease. */
const ease = (p: number): number => {
  const c = Math.min(1, Math.max(0, p));
  return c * c * (3 - 2 * c);
};

/** Live per-shot tuning knobs (dialled in the camera-debug sliders). */
export interface ShotTune {
  /** Scale the camera's distance from its look-at target. */
  distMul: number;
  /** Scale the camera's height above its look-at (on top of distMul). */
  heightMul: number;
  /** Add to the shot's field of view (deg). */
  fovAdd: number;
}
export const NO_TUNE: ShotTune = { distMul: 1, heightMul: 1, fovAdd: 0 };

/** A full tuning map (one entry per shot). */
export type AscentCameraTuning = Record<AscentShotName, ShotTune>;

/** A no-op default tuning map. */
export function defaultTuning(): AscentCameraTuning {
  const names: AscentShotName[] = [
    'pad',
    'tower_clear',
    'ascent',
    'onboard_down',
    'staging',
    'fairing',
    'chase',
    'separation',
    'orbit',
  ];
  const out = {} as AscentCameraTuning;
  for (const n of names) out[n] = { ...NO_TUNE };
  return out;
}

/**
 * Compose the camera pose for a shot from the current vehicle state and the
 * shot progress `p` (0→1 across the beat window). `p` drives authored motion
 * — a steady-cam orbit on the pad, a push-in on tower-clear, a dolly-out on
 * ascent, a slow push-in on staging, a long dolly-back on orbit — so every
 * shot is alive. `vehLen` scales offsets to the stylised model. A subtle
 * handheld drift (keyed on the mission time) is layered on top of all shots.
 */
export function composeShot(
  name: AscentShotName,
  s: AscentState,
  vehLen: number,
  p = 0.5,
  tune: ShotTune = NO_TUNE,
): CameraPose {
  const dr = s.downrangeKm;
  const alt = s.altKm;
  const e = ease(p);
  // Subtle handheld wobble — tiny, time-keyed, so a locked frame still breathes.
  const wob = vehLen * 0.04;
  const wx = Math.sin(s.t * 0.7) * wob;
  const wy = Math.cos(s.t * 0.9) * wob;

  let out: CameraPose;
  switch (name) {
    case 'pad': {
      // Steady-cam ORBIT around the vehicle — TIGHT so the rocket dominates.
      const ang = -0.7 + p * 1.2;
      const rad = vehLen * 2.4;
      out = pose(
        dr + Math.sin(ang) * rad,
        vehLen * (0.5 + 0.25 * p),
        Math.cos(ang) * rad,
        dr,
        alt + vehLen * 0.55,
        0,
        42,
      );
      break;
    }
    case 'tower_clear': {
      // PUSH-IN + crane up as it clears the tower — vehicle fills the frame.
      const rad = vehLen * (2.7 - 0.6 * e);
      out = pose(
        dr - rad * 0.5,
        alt + vehLen * (0.35 + 0.6 * e),
        rad,
        dr,
        alt + vehLen * 0.5,
        0,
        44,
      );
      break;
    }
    case 'ascent': {
      // THREE-QUARTER tracking arc locked to the VEHICLE (not altitude), so the
      // rocket stays hero-sized (~⅓ frame) while the curving Earth sweeps into
      // the lower background as it climbs. A slow orbital drift keeps it alive.
      const d = vehLen * (3.2 + 1.6 * e);
      const ang = -0.5 - p * 0.55;
      out = pose(
        dr + Math.sin(ang) * d,
        alt + d * 0.18,
        Math.cos(ang) * d,
        dr,
        alt + vehLen * 0.5,
        0,
        40,
      );
      break;
    }
    case 'onboard_down': {
      // High tracking arc from the OPPOSITE side to the ascent shot — the
      // vehicle stays hero-sized and centred while the Earth curves into the
      // lower frame. (Replaces the old strap-cam that framed empty sky with the
      // rocket stuck in a corner.)
      const d = vehLen * (3.2 + 1.4 * e);
      const ang = 0.7 - p * 0.5;
      out = pose(
        dr + Math.sin(ang) * d,
        alt + d * 0.16,
        Math.cos(ang) * d,
        dr,
        alt + vehLen * 0.5,
        0,
        42,
      );
      break;
    }
    case 'staging': {
      // Slow PUSH-IN on the booster separation (hero beat), then a slight pull.
      // Target the body-DOWN midpoint (where the spent booster drops) so the
      // separation reads regardless of the stack's attitude.
      const io = p < 0.6 ? ease(p / 0.6) : 1 - 0.25 * ease((p - 0.6) / 0.4);
      const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
      const fv = Math.atan2(horiz, s.velUpKms);
      const tx = dr - Math.sin(fv) * vehLen * 0.55;
      const ty = alt - Math.cos(fv) * vehLen * 0.55;
      const d = vehLen * (2.7 - 0.8 * io);
      out = pose(tx - d * 0.5, ty + vehLen * 0.75, d, tx, ty, 0, 38 - 3 * io);
      break;
    }
    case 'fairing': {
      // The clamshell fairing splitting off the top of the stack. The nose
      // sits ~1.3 units UP THE BODY axis — target that so the split reads
      // whatever the attitude; tight side framing with a gentle push-in.
      const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
      const fv = Math.atan2(horiz, s.velUpKms);
      const tx = dr + Math.sin(fv) * vehLen * 1.15;
      const ty = alt + Math.cos(fv) * vehLen * 1.15;
      const d = vehLen * (2.3 - 0.5 * e);
      const ang = 0.35 + p * 0.4;
      out = pose(tx + Math.sin(ang) * d, ty + vehLen * 0.3, Math.cos(ang) * d, tx, ty, 0, 44);
      break;
    }
    case 'chase': {
      // THE hero cruise shot: behind + above the upper stage, the rocket riding
      // the lower third with the curved Earth limb filling the frame. Locked to
      // the VEHICLE (not altitude) so the rocket stays hero-sized as space opens
      // up behind it; a slow orbital drift + gentle dolly keeps it cinematic.
      const d = vehLen * (3.4 + 1.8 * e);
      const ang = -0.42 - p * 0.32;
      out = pose(
        dr + Math.sin(ang) * d,
        alt + d * 0.4,
        Math.cos(ang) * d,
        dr,
        alt + vehLen * 0.7,
        0,
        38,
      );
      break;
    }
    case 'separation': {
      // TIGHT hero shot of the spacecraft springing free of the spent stage.
      // The payload/stage sit ~1 unit UP THE BODY axis from the origin, which
      // is world-downrange once the stack is horizontal at SECO — so target
      // that body-offset point (robust to attitude), framed close from the side.
      // At orbital insertion the stack is ~horizontal, so the payload leads
      // downrange (+x) and the spent stage trails behind — frame the GAP
      // between them (the vehicle origin) from the side + slightly above,
      // pulled back so BOTH bodies read as they drift apart, Earth limb below.
      const d = vehLen * (3.7 - 0.6 * e);
      const ang = -0.34 - p * 0.28;
      out = pose(
        dr + Math.sin(ang) * d,
        alt + d * 0.32,
        Math.cos(ang) * d,
        dr,
        alt + vehLen * 0.15,
        0,
        40,
      );
      break;
    }
    case 'orbit': {
      // Settled in orbit — the payload coasting above the curved limb, a slow
      // serene dolly-back. Locked to the VEHICLE (not altitude) so the craft
      // stays a visible hero glinting over the Earth, space opening up behind.
      const d = vehLen * (3.6 + 1.8 * e);
      const ang = -0.36 - p * 0.24;
      out = pose(
        dr + Math.sin(ang) * d,
        alt + d * 0.44,
        Math.cos(ang) * d,
        dr,
        alt + vehLen * 0.5,
        0,
        40,
      );
      break;
    }
  }
  // Live tuning — scale the offset from the look-at target + adjust fov.
  let ox = out.px - out.tx;
  let oy = out.py - out.ty;
  let oz = out.pz - out.tz;
  ox *= tune.distMul;
  oz *= tune.distMul;
  oy *= tune.distMul * tune.heightMul;
  out.px = out.tx + ox;
  out.py = out.ty + oy;
  out.pz = out.tz + oz;
  out.fov += tune.fovAdd;

  out.px += wx;
  out.py += wy;
  return out;
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
