/**
 * The descent's camera director (operator 2026-11-23: "operate the camera more here as on
 * launch … more angles … big frames, rotate around, over and under, zoom in/out").
 *
 * A shot list cut on the descent's own beats (entry flip, chute, heat-shield and backshell
 * separation, sky crane, touchdown) and filled between them with varied shots, each a pure
 * function of trajectory time so a scrub shows exactly what play shows. Poses are relative to
 * the craft (at the origin, +y up, the surface at y = −altKm), sized from the subject's radius
 * so a 7 m LM and a 50 m parachute both fill the frame as the shot intends.
 */
import { fnv1a32, mulberry32 } from './ascent-director';

export type DescentShotKind =
  | 'wide' // big frame: the craft small over the horizon
  | 'orbit' // a fast arc around the craft
  | 'under' // from below, looking up the plume or the lines
  | 'over' // from above, the surface beneath
  | 'pushIn' // zoom from wide to close
  | 'pullOut' // zoom from close to wide
  | 'belly' // Starship's belly-flop, side-on and close so the flaps and RCS puffs read
  | 'flipOrbit' // a close orbit through Starship's landing flip
  | 'legs' // from below and the side, up into an open backshell where the legs swing out
  | 'close' // tight on the hardware
  | 'ground'; // a tracking telephoto from the surface (the last seconds, touchdown)

export interface DescentShot {
  kind: DescentShotKind;
  t0: number;
  t1: number;
  /** Azimuth the shot starts from (rad), and the direction it sweeps (±1). */
  az: number;
  dir: 1 | -1;
}

/** What to frame, relative to the craft's origin (scene units). `core`: the craft itself;
 *  `whole`: everything worth keeping in a wide frame (a chute, a departing CSM). */
export interface DescentSubject {
  core: { cy: number; r: number };
  whole: { cy: number; r: number };
  /** A capsule under its main chute: the shot stays on the capsule, off the canopy. */
  capsule?: boolean;
  /** An establishing opening for a big-body descent: the first `s` s are a wide shot of the craft
   *  small over its landing region, easing into the cut shots. */
  openingS?: number;
  /** An Earth capsule's chute still opening: side-on, the whole chute and capsule in frame. */
  opening?: boolean;
}

export interface DescentPose {
  pos: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** Beats that start their own shot, and the shot that suits each. */
const BEAT_SHOT: Record<string, DescentShotKind> = {
  entry_flip: 'close',
  parachute_deploy: 'under',
  heatshield_sep: 'orbit',
  backshell_sep: 'pullOut',
  retro_ignition: 'under',
  skycrane_lower: 'close',
  airbag_deploy: 'orbit',
  bridle_lower: 'under',
  bridle_cut: 'pullOut',
  leg_deploy: 'legs',
  constant_descent: 'close',
  landing_flip: 'orbit',
  // Apollo's gates: the pitchover read from the side, the final descent pushed in on.
  high_gate: 'orbit',
  low_gate: 'pushIn',
  // Vostok: the hatch blows, the seat goes out, then the cosmonaut parts from it.
  eject: 'orbit',
  seat_sep: 'close',
  apex_cover_jettison: 'close',
};
const FILL: DescentShotKind[] = ['wide', 'orbit', 'under', 'over', 'pushIn', 'pullOut', 'close'];
/** The lit side: azimuths near this keep the sun behind the camera. */
const LIT_AZ = 0.6;
/** The last seconds before touchdown are filmed from the ground. */
export const GROUND_SHOT_S = 18;

/**
 * The shot list for a descent `duration` s long with its beats at `events` (trajectory time).
 * Gaps between beats are cut into shots of about `duration / 26` s (12–30 s).
 */
export function buildDescentShots(
  duration: number,
  events: { type: string; t: number }[],
  seedKey: string,
): DescentShot[] {
  const r = mulberry32(fnv1a32(`descent:${seedKey}`));
  const touchdown = events.find((e) => e.type === 'touchdown')?.t ?? duration;
  const groundT = Math.max(0, touchdown - GROUND_SHOT_S);
  const anchors = events
    .filter((e) => BEAT_SHOT[e.type] && e.t > 0 && e.t < groundT - 4)
    .sort((a, b) => a.t - b.t);
  const len = Math.min(30, Math.max(12, duration / 26));
  const shots: DescentShot[] = [];
  let dir: 1 | -1 = r() < 0.5 ? 1 : -1;
  const push = (kind: DescentShotKind, t0: number, t1: number): void => {
    dir = (dir === 1 ? -1 : 1) as 1 | -1;
    shots.push({ kind, t0, t1, az: LIT_AZ + (r() * 2 - 1) * 1.1, dir });
  };
  const fill = (a: number, b: number, first?: DescentShotKind): void => {
    const n = Math.max(1, Math.round((b - a) / len));
    for (let i = 0; i < n; i++) {
      let kind = i === 0 && first ? first : FILL[Math.floor(r() * FILL.length)];
      const prev = shots[shots.length - 1]?.kind;
      if (kind === prev) kind = FILL[(FILL.indexOf(kind) + 1 + Math.floor(r() * 3)) % FILL.length];
      push(kind, a + ((b - a) * i) / n, a + ((b - a) * (i + 1)) / n);
    }
  };
  let t = 0;
  let first: DescentShotKind | undefined = 'pushIn';
  for (const e of anchors) {
    if (e.t - t > 3) fill(t, e.t, first);
    else if (shots.length) shots[shots.length - 1].t1 = e.t;
    first = BEAT_SHOT[e.type];
    t = e.t;
  }
  if (groundT - t > 3) fill(t, groundT, first);
  else if (shots.length) shots[shots.length - 1].t1 = groundT;
  // An airbag ball keeps the ground shot through its bounces and roll, to rest; then a close
  // shot while its petals open.
  const rest = events.find((e) => e.type === 'at_rest')?.t ?? touchdown;
  push('ground', groundT, rest);
  const petals = events.find((e) => e.type === 'petals_open' || e.type === 'arrays_open')?.t;
  let settled = rest;
  if (petals != null && petals >= rest) {
    push('close', rest, petals + 8);
    settled = petals + 8;
  }
  // After touchdown: a slow orbit of the landed craft.
  push('orbit', settled, Infinity);
  const flipT = events.find((e) => e.type === 'landing_flip')?.t;
  return flipT != null && flipT > 4 ? starshipShots(shots, flipT) : shots;
}

/** Starship: one close side-on shot for the belly-flop, a close orbit through the flip, then the
 *  rest of the list. */
function starshipShots(shots: DescentShot[], flipT: number): DescentShot[] {
  const FLIP_S = 9;
  const rest = shots
    .filter((s) => s.t1 > flipT + FLIP_S)
    .map((s) => ({
      ...s,
      t0: Math.max(s.t0, flipT + FLIP_S),
      // The landing burn stays close: a wide pull-back shrinks the ship to a speck.
      kind: s.kind === 'ground' || !Number.isFinite(s.t1) ? s.kind : ('close' as DescentShotKind),
    }));
  return [
    { kind: 'belly', t0: 0, t1: flipT, az: 0.95, dir: 1 },
    { kind: 'flipOrbit', t0: flipT, t1: flipT + FLIP_S, az: 0.2, dir: 1 },
    ...rest,
  ];
}

export function shotAt(shots: DescentShot[], t: number): DescentShot {
  for (let i = shots.length - 1; i >= 0; i--) if (t >= shots[i].t0) return shots[i];
  return shots[0];
}

const smooth = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const DEG = Math.PI / 180;

/**
 * The camera at trajectory time `t`. `altKm`: the craft's height above the surface (scene
 * units); `aspect`: width / height, so a phone's narrow frame still fits the subject.
 */
export function descentPoseAt(
  shots: DescentShot[],
  t: number,
  subject: DescentSubject,
  altKm: number,
  aspect: number,
): DescentPose {
  const base = shotPoseAt(shots, t, subject, altKm, aspect);
  const openS = subject.openingS ?? 0;
  if (openS <= 0 || t >= openS || shots[0]?.kind === 'belly') return base;
  // The landing region below the craft fills the frame; the craft is a speck at its top. The
  // eased blend into the cut shot is a pure function of t, so a scrub is exact.
  const R = altKm * 0.55 + subject.whole.r * 3;
  const ty = lerp(subject.core.cy, -altKm, 0.5);
  const el = 14 * DEG;
  const az = LIT_AZ + 0.5;
  const fov = 40;
  const d = R / (0.5 * Math.tan((fov * DEG) / 2) * Math.min(1, aspect));
  const wide: DescentPose = {
    pos: [
      Math.sin(az) * Math.cos(el) * d,
      Math.max(ty + Math.sin(el) * d, -altKm + subject.core.r * 0.15),
      Math.cos(az) * Math.cos(el) * d,
    ],
    target: [0, ty, 0],
    fov,
  };
  const u = smooth(t / openS);
  const mix = (a: number[], b: number[]): [number, number, number] => [
    lerp(a[0], b[0], u),
    lerp(a[1], b[1], u),
    lerp(a[2], b[2], u),
  ];
  return {
    pos: mix(wide.pos, base.pos),
    target: mix(wide.target, base.target),
    fov: lerp(wide.fov, base.fov, u),
  };
}

function shotPoseAt(
  shots: DescentShot[],
  t: number,
  subject: DescentSubject,
  altKm: number,
  aspect: number,
): DescentPose {
  const sh = shotAt(shots, t);
  // The open-ended landed shot circles slowly at a fixed height.
  const open = !Number.isFinite(sh.t1);
  const p = open ? 0.5 : smooth((t - sh.t0) / (sh.t1 - sh.t0));
  const drift = open ? (t - sh.t0) * 0.03 : 0;
  const halfTan = (fov: number): number => Math.tan((fov * DEG) / 2) * Math.min(1, aspect);
  /** Distance at which radius `r` fills `fill` of the frame's smaller dimension. */
  const distFor = (r: number, fill: number, fov: number): number => r / (fill * halfTan(fov));
  const floor = -altKm + subject.core.r * 0.15; // never below the ground

  if (sh.kind === 'ground') {
    // Fixed on the surface, a few craft-lengths off, tracking the craft with a long lens.
    const d = subject.core.r * 9;
    const x = Math.sin(sh.az) * d;
    const z = Math.cos(sh.az) * d;
    const pos: [number, number, number] = [x, floor + subject.core.r * 0.25, z];
    const target: [number, number, number] = [0, subject.core.cy, 0];
    const range = Math.hypot(x, target[1] - pos[1], z);
    const fov = Math.min(55, Math.max(6, (2 * Math.atan(subject.core.r / (0.4 * range))) / DEG));
    return { pos, target, fov: fov / Math.min(1, Math.max(0.5, aspect)) ** 0.5 };
  }

  type Frame = { fill: number; el: number; az: number; fov: number; who: 'core' | 'whole' };
  const a0 = sh.az + sh.dir * drift;
  const sw = sh.dir;
  let f: Frame;
  switch (sh.kind) {
    case 'wide':
      f = { fill: 0.16, el: lerp(6, 11, p), az: a0 + sw * 0.35 * p, fov: 40, who: 'whole' };
      break;
    case 'orbit':
      f = { fill: 0.42, el: lerp(10, 22, p), az: a0 + sw * 2.0 * p, fov: 42, who: 'whole' };
      break;
    case 'under':
      f = subject.opening
        ? { fill: 0.34, el: lerp(6, 14, p), az: a0 + sw * 0.7 * p, fov: 46, who: 'core' }
        : subject.capsule
          ? { fill: 0.62, el: lerp(4, 12, p), az: a0 + sw * 0.7 * p, fov: 46, who: 'core' }
          : { fill: 0.32, el: lerp(-58, -38, p), az: a0 + sw * 0.7 * p, fov: 58, who: 'core' };
      break;
    case 'over':
      f = { fill: 0.34, el: lerp(68, 48, p), az: a0 + sw * 0.6 * p, fov: 46, who: 'whole' };
      break;
    case 'pushIn':
      f = {
        fill: lerp(0.24, 0.6, p),
        el: lerp(14, 6, p),
        az: a0 + sw * 0.3 * p,
        fov: 40,
        who: 'whole',
      };
      break;
    case 'pullOut':
      f = {
        fill: lerp(0.65, 0.13, p),
        el: lerp(4, 16, p),
        az: a0 + sw * 0.4 * p,
        fov: 40,
        who: 'whole',
      };
      break;
    case 'legs':
      f = { fill: 0.7, el: lerp(-24, -12, p), az: a0 + sw * 0.9 * p, fov: 44, who: 'core' };
      break;
    case 'belly':
      // The ship lies along X: seen from +Z, a touch above, it spans the frame.
      f = { fill: 0.95, el: lerp(20, 28, p), az: a0 + sw * 0.15 * p, fov: 36, who: 'core' };
      break;
    case 'flipOrbit':
      f = { fill: 0.6, el: lerp(8, 20, p), az: a0 + sw * 1.6 * p, fov: 36, who: 'core' };
      break;
    default: // close
      f = { fill: 0.85, el: lerp(2, 9, p), az: a0 + sw * 0.5 * p, fov: 32, who: 'core' };
  }
  const subj = subject[f.who];
  const d = distFor(subj.r, f.fill, f.fov);
  // From below the craft looks up the lines toward the canopy: aim a little above the craft.
  const ty =
    sh.kind === 'under' && !subject.capsule && !subject.opening
      ? lerp(subject.core.cy, subject.whole.cy, 0.5)
      : subj.cy;
  const el = f.el * DEG;
  let y = ty + Math.sin(el) * d;
  // Near the ground a shot from below becomes one from just above the surface.
  y = Math.max(y, floor);
  return {
    pos: [Math.sin(f.az) * Math.cos(el) * d, y, Math.cos(f.az) * Math.cos(el) * d],
    target: [0, ty, 0],
    fov: f.fov,
  };
}
