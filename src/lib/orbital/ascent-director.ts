/**
 * Launch camera DIRECTOR (G3 review prototype — dev-only, not wired into /fly).
 *
 * Turns a launch's flight events into a timeline of shots (event → shot → move →
 * duration → easing) picked from pools by a seeded generator: the same launch
 * replays the same, different launches differ. Also draws a seeded "conditions"
 * pick (cloud cover + light colour) and an opening from a pool (today's long-lens
 * `tower_clear` is one option).
 *
 * Pure, no DOM / Three.js: a plan is plain data (JSON-serialisable), and
 * `directedPoseAt` is a pure function of (plan, t, vehicle state), so scrubbing
 * gives the same frame as playing. Poses are in the same km scene frame as
 * ascent-cameras.ts; the kept shots (pad, tower_clear, fairing, separation,
 * orbit) delegate to `composeShot`.
 *
 * Doc: docs/wip/2026-11-14-slice-G3-brief.md §4.
 */

import {
  bodyAngleFromVerticalRad,
  type AscentEvent,
  type AscentState,
} from '$lib/physics/ascent/ascent-physics';
import {
  composeShot,
  NO_TUNE,
  PAYLOAD_SEP_HOLD_S,
  type AscentShotName,
  type CameraPose,
} from './ascent-cameras';
import {
  compassToSceneAz,
  lightFromSunElevation,
  sunAt,
  type LaunchInstant,
  type SunPosition,
} from './launch-sun';

// ─── Seeding ────────────────────────────────────────────────────────────────

export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type ShotFamily =
  | 'padOrbit'
  | 'ground'
  | 'overhead'
  | 'lookdown'
  | 'threeQuarter'
  | 'lowAngle'
  | 'side'
  | 'wide'
  | 'limb'
  | 'orbitPan'
  | 'push'
  | 'squeeze'
  | 'sepPush'
  | 'peel'
  | 'fairing'
  | 'separation'
  | 'orbitHold';

export type ShotKind = 'opening' | 'pool' | 'beat' | 'kept';
export type Ease = 'smooth' | 'linear' | 'out';
export type OpeningId = 'tower_clear' | 'pad_wide' | 'overhead_drop' | 'pad_dusk';

/** Keyframes [progress 0→1, value]; eased between neighbours. */
export type KF = [number, number][];

/** Camera moves as channels around a look-at point on the body axis.
 *  az/el in degrees (camera relative to the target: az 0 = +z side, el above the
 *  horizon), dist in vehicle lengths, fov in degrees, look in vehicle lengths up
 *  the body axis from the base. */
export interface Channels {
  az: KF;
  el: KF;
  dist: KF;
  fov: KF;
  look: KF;
  /** Target share of the frame height the vehicle (base to nose) fills. When set, the
   *  camera distance is solved to hold it, so framing does not depend on elevation,
   *  attitude or field of view; `dist` is only the starting guess. */
  fill?: KF;
}

export interface DirectedShot {
  id: string;
  family: ShotFamily;
  kind: ShotKind;
  tStart: number;
  tEnd: number;
  /** The flight event this shot is built around (a beat), if any. */
  event?: string;
  side: 1 | -1;
  ease: Ease;
  /** Flight seconds the pose eases from the previous shot (0 = hard cut). */
  blendInS: number;
  fast: boolean;
  /** Delegates to composeShot (today's shot of that name). */
  kept?: AscentShotName;
  /** Vehicle-relative channels (absent for kept shots). */
  ch?: Channels;
  /** World-fixed camera (vehicle lengths; z is mirrored by `side`) instead of dist/az/el. */
  anchor?: { x: number; y: number; z: number };
  /** Window was lengthened to absorb a too-short neighbouring gap. */
  extended?: boolean;
  minS?: number;
  maxS?: number;
}

export type LightId = 'midday' | 'golden' | 'dusk' | 'night';
export type CoverId = 'clear' | 'scattered' | 'deck' | 'heavy';

export interface LaunchConditions {
  light: LightId;
  cover: CoverId;
  /** Sun elevation at the pad (deg; negative = below the horizon). */
  sunElevDeg: number;
  /** Sun azimuth (deg, 0 = +x downrange, 90 = +z camera side). */
  sunAzDeg: number;
  /** Cloud coverage threshold 0 (none) … 1 (solid). */
  coverage: number;
  /** Cloud-deck altitude (km). */
  deckAltKm: number;
  cloudSeed: number;
  /** 0 = stratus sheets, 1 = cumulus clusters (the deck mixes both by region). */
  cloudType: number;
  padSmoke: boolean;
}

export interface DirectorPlan {
  seed: number;
  opening: OpeningId;
  conditions: LaunchConditions;
  shots: DirectedShot[];
  reducedMotion: boolean;
}

export interface DirectorInputs {
  vehicleId: string;
  missionId?: string;
  /** Review override: replaces the vehicle/mission seed. */
  seed?: number;
  events: AscentEvent[];
  maxQt: number;
  duration: number;
  payloadSepT?: number;
  endT?: number;
  /** Altitude (km) at flight time t — picks shots that need a ground patch or a limb. */
  altAt: (t: number) => number;
  hasBoosters?: boolean;
  /** LaunchProfile.payloadInBay: no payload-separation shot. */
  payloadInBay?: boolean;
  /** Playback speed the plan is authored for (default 5); sub-shots shorter than 3 s of screen time merge. */
  speed?: number;
  reducedMotion?: boolean;
  /** Review overrides. */
  force?: { opening?: OpeningId; light?: LightId; cover?: CoverId };
  /** The real launch instant and pad (a real mission with a time of day): the light comes from
   *  the Sun there. Absent for a Plan flight or a date-only mission: the light is seeded. */
  launch?: LaunchInstant;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const OPENING_END = 22; // flight s: same as TOWER_CLEAR_END in ascent-cameras
const PAD_END = 3;
const MAXQ_PRE = 3;
const MAXQ_POST = 5;
const STAGING_PRE = 3;
const STAGING_POST = 6.5;
const FAIRING_HOLD = 6.5;
const BLEND_S = 4;
const OPENING_BLEND_S = 6;
const SMALLEST_PIECE_S = 10;

/** Approximate camera views of the kept shots (deg), for the 30-degree rule. */
const KEPT_VIEW: Record<string, View> = {
  pad: { az0: -40, az1: 29, el0: 0, el1: 5 },
  tower_clear: { az0: -23, az1: -23, el0: -4, el1: -18 },
  fairing: { az0: 20, az1: 38, el0: 7, el1: 7 },
  separation: { az0: -19, az1: -35, el0: 16, el1: 16 },
  orbit: { az0: -21, az1: -34, el0: 23, el1: 23 },
};

interface View {
  az0: number;
  az1: number;
  el0: number;
  el1: number;
}

// ─── Moves ──────────────────────────────────────────────────────────────────

const lin = (a: number, b: number): KF => [
  [0, a],
  [1, b],
];
const J = (r: Rng, v: number, pct: number): number => v * (1 + (r() * 2 - 1) * pct);
const JD = (r: Rng, v: number, d: number): number => v + (r() * 2 - 1) * d;
/** Azimuth endpoints: a start on `side`, a sweep of about `amt` degrees in a random direction. */
const sweep = (r: Rng, side: number, base: number, amt: number): KF => {
  const a0 = side * JD(r, base, 8);
  const dir = r() < 0.5 ? -1 : 1;
  return lin(a0, a0 + dir * J(r, amt, 0.3));
};

interface ShotDef {
  id: string;
  family: ShotFamily;
  altMin: number;
  altMax: number;
  minS: number;
  maxS: number;
  fast: boolean;
  weight: number;
  ease: Ease;
  build: (r: Rng, side: 1 | -1) => Channels;
}

/** The shot pool (flight phases are told apart by the altitude band each entry needs). */
const POOL: ShotDef[] = [
  {
    // Example 2: from above and behind the nose, ground and plume below.
    id: 'lookdown_chase',
    family: 'lookdown',
    altMin: 0,
    altMax: 10,
    minS: 14,
    maxS: 40,
    fast: false,
    weight: 1,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 30, 25),
      el: lin(JD(r, 62, 4), JD(r, 46, 4)),
      dist: lin(J(r, 2.4, 0.1), J(r, 3.4, 0.1)),
      fov: lin(J(r, 52, 0.05), J(r, 40, 0.05)),
      look: lin(1.0, 0.7),
    }),
  },
  {
    // Example 1: straight above the stack, dropping in.
    id: 'overhead_drop',
    family: 'overhead',
    altMin: 0,
    altMax: 8,
    minS: 14,
    maxS: 36,
    fast: false,
    weight: 1,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 40, 18),
      el: lin(JD(r, 80, 3), JD(r, 66, 3)),
      dist: lin(J(r, 3.8, 0.1), J(r, 2.8, 0.1)),
      fov: lin(J(r, 50, 0.05), J(r, 40, 0.05)),
      look: lin(0.6, 0.5),
    }),
  },
  {
    // Example 4: close three-quarter, a little above, haze and ground behind.
    id: 'threeq_low',
    family: 'threeQuarter',
    altMin: 0,
    altMax: 25,
    minS: 14,
    maxS: 45,
    fast: false,
    weight: 1,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 38, 40),
      el: lin(JD(r, 10, 3), JD(r, 16, 3)),
      dist: lin(J(r, 2.6, 0.1), J(r, 3.4, 0.1)),
      fov: lin(J(r, 38, 0.05), J(r, 34, 0.05)),
      look: lin(0.5, 0.5),
    }),
  },
  {
    // A crane: from low beside the stack up to a high three-quarter.
    id: 'crane_low',
    family: 'lowAngle',
    altMin: 0,
    altMax: 30,
    minS: 14,
    maxS: 40,
    fast: false,
    weight: 1,
    ease: 'smooth',
    build: (r, s) => ({
      az: lin(s * JD(r, 50, 8), s * JD(r, 30, 8)),
      el: lin(JD(r, -6, 2), JD(r, 22, 3)),
      dist: lin(J(r, 3.4, 0.1), J(r, 3.0, 0.1)),
      fov: lin(J(r, 46, 0.05), J(r, 36, 0.05)),
      look: lin(0.5, 0.55),
    }),
  },
  {
    id: 'side_track',
    family: 'side',
    altMin: 0,
    altMax: 1e9,
    minS: 14,
    maxS: 120,
    fast: false,
    weight: 0.8,
    ease: 'linear',
    build: (r, s) => ({
      az: sweep(r, s, 14, 25),
      el: lin(JD(r, 3, 1.5), JD(r, 5, 1.5)),
      dist: lin(J(r, 4.0, 0.1), J(r, 5.0, 0.1)),
      fov: lin(J(r, 40, 0.04), J(r, 38, 0.04)),
      look: lin(0.5, 0.5),
    }),
  },
  {
    // A fast push: zoom plus dolly in. Never twice in a row.
    id: 'push_in',
    family: 'push',
    altMin: 0,
    altMax: 1e9,
    minS: 10,
    maxS: 22,
    fast: true,
    weight: 1.2,
    ease: 'out',
    build: (r, s) => ({
      az: sweep(r, s, 40, 12),
      el: lin(JD(r, 8, 2), JD(r, 12, 2)),
      dist: lin(J(r, 4.6, 0.08), J(r, 2.5, 0.08)),
      fov: lin(J(r, 42, 0.04), J(r, 30, 0.06)),
      look: lin(0.5, 0.55),
    }),
  },
  {
    // Example 3: three-quarter from beside and above, the deck below.
    id: 'threeq_high',
    family: 'threeQuarter',
    altMin: 5,
    altMax: 80,
    minS: 14,
    maxS: 110,
    fast: false,
    weight: 1.1,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 50, 40),
      el: lin(JD(r, 20, 3), JD(r, 28, 3)),
      dist: lin(J(r, 2.4, 0.1), J(r, 3.0, 0.1)),
      fov: lin(J(r, 36, 0.04), J(r, 34, 0.04)),
      look: lin(0.55, 0.55),
    }),
  },
  {
    // Example 7: below the vehicle, looking up, the limb and the sun behind.
    id: 'lowangle_hero',
    family: 'lowAngle',
    altMin: 12,
    altMax: 1e9,
    minS: 30,
    maxS: 100,
    fast: false,
    weight: 1.1,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 35, 25),
      el: lin(JD(r, -8, 2), JD(r, -15, 3)),
      dist: lin(J(r, 3.0, 0.1), J(r, 3.6, 0.1)),
      fov: lin(J(r, 34, 0.04), J(r, 32, 0.04)),
      look: lin(0.6, 0.6),
    }),
  },
  {
    // Example 9: distant, the trail in frame.
    id: 'wide_trail',
    family: 'wide',
    altMin: 12,
    altMax: 1e9,
    minS: 40,
    maxS: 110,
    fast: false,
    weight: 1,
    ease: 'linear',
    build: (r, s) => ({
      az: sweep(r, s, 58, 14),
      el: lin(JD(r, 5, 2), JD(r, 9, 2)),
      dist: lin(J(r, 10, 0.1), J(r, 13, 0.1)),
      fov: lin(J(r, 26, 0.05), J(r, 24, 0.05)),
      look: lin(0.1, 0.1),
    }),
  },
  {
    id: 'orbit_pan',
    family: 'orbitPan',
    altMin: 40,
    altMax: 1e9,
    minS: 50,
    maxS: 140,
    fast: false,
    weight: 1,
    ease: 'smooth',
    build: (r) => ({
      az: r() < 0.5 ? lin(JD(r, 14, 5), JD(r, 72, 6)) : lin(JD(r, 72, 6), JD(r, 14, 5)),
      el: lin(JD(r, 14, 3), JD(r, 18, 3)),
      dist: lin(J(r, 4.2, 0.1), J(r, 3.4, 0.1)),
      fov: lin(J(r, 40, 0.04), J(r, 36, 0.04)),
      look: lin(0.5, 0.5),
    }),
  },
  {
    // Looking down on the stack with the Earth below.
    id: 'lookdown_high',
    family: 'lookdown',
    altMin: 12,
    altMax: 160,
    minS: 14,
    maxS: 80,
    fast: false,
    weight: 0.9,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 32, 22),
      el: lin(JD(r, 50, 4), JD(r, 58, 4)),
      dist: lin(J(r, 3.2, 0.1), J(r, 2.6, 0.1)),
      fov: lin(J(r, 42, 0.04), J(r, 38, 0.04)),
      look: lin(0.7, 0.6),
    }),
  },
  {
    // Example 8: close three-quarter from above, the cloud-textured Earth filling the frame.
    id: 'threeq_limb',
    family: 'limb',
    altMin: 50,
    altMax: 1e9,
    minS: 40,
    maxS: 110,
    fast: false,
    weight: 1.3,
    ease: 'smooth',
    build: (r, s) => ({
      az: sweep(r, s, 45, 28),
      el: lin(JD(r, 30, 3), JD(r, 38, 3)),
      dist: lin(J(r, 2.2, 0.08), J(r, 2.9, 0.08)),
      fov: lin(J(r, 38, 0.04), J(r, 34, 0.04)),
      look: lin(0.5, 0.5),
    }),
  },
];

/** Per-vehicle signature weights (the brief's per-vehicle override map). */
const SIGNATURE: Record<
  string,
  { opening?: Partial<Record<OpeningId, number>>; pool?: Record<string, number> }
> = {
  'space-shuttle-stack': {
    opening: { pad_wide: 3, pad_dusk: 2 },
    pool: { lowangle_hero: 1.5, threeq_high: 1.5 },
  },
  'sls-block-1': {
    opening: { overhead_drop: 2.5 },
    pool: { lookdown_chase: 2.5, overhead_drop: 2.5, threeq_high: 1.5, lookdown_high: 1.4 },
  },
  'falcon-9': { pool: { lowangle_hero: 2, wide_trail: 1.8, push_in: 1.3 } },
  'atlas-v': { pool: { wide_trail: 1.5, threeq_low: 1.5 } },
};

const OPENING_WEIGHTS: Record<OpeningId, number> = {
  tower_clear: 1,
  pad_wide: 1,
  overhead_drop: 0.8,
  pad_dusk: 0.8,
};

// ─── Easing and channel evaluation ──────────────────────────────────────────

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (x: number): number => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** Quintic smootherstep: zero velocity AND zero acceleration at both ends of a blend. */
const smoother = (x: number): number => {
  const c = clamp01(x);
  return c * c * c * (c * (c * 6 - 15) + 10);
};
const applyEase = (e: Ease, x: number): number => {
  const c = clamp01(x);
  if (e === 'linear') return c;
  if (e === 'out') return 1 - (1 - c) * (1 - c);
  return smooth(c);
};

export function evalKf(kf: KF, p: number, ease: Ease): number {
  if (p <= kf[0][0]) return kf[0][1];
  for (let i = 1; i < kf.length; i++) {
    if (p <= kf[i][0]) {
      const [p0, v0] = kf[i - 1];
      const [p1, v1] = kf[i];
      return v0 + (v1 - v0) * applyEase(ease, (p - p0) / (p1 - p0));
    }
  }
  return kf[kf.length - 1][1];
}

/** Vehicle share of the frame height per pool shot (start, end). Examples fill 40 to 70 %;
 *  wide_trail is the one deliberate small shot and still keeps the vehicle readable. */
const FILL: Record<string, [number, number]> = {
  lookdown_chase: [0.6, 0.6],
  overhead_drop: [0.55, 0.6],
  threeq_low: [0.6, 0.7],
  crane_low: [0.55, 0.62],
  side_track: [0.5, 0.55],
  push_in: [0.35, 0.7],
  threeq_high: [0.7, 0.7],
  lowangle_hero: [0.62, 0.66],
  wide_trail: [0.3, 0.3],
  orbit_pan: [0.5, 0.6],
  lookdown_high: [0.6, 0.6],
  threeq_limb: [0.68, 0.72],
};

function withFill(ch: Channels, f: [number, number] | undefined, r: Rng): Channels {
  if (f) ch.fill = lin(J(r, f[0], 0.06), J(r, f[1], 0.06));
  return ch;
}

// ─── Beat shots ─────────────────────────────────────────────────────────────

const maxqSqueeze = (r: Rng, s: 1 | -1): Channels => ({
  az: lin(s * JD(r, 40, 6), s * JD(r, 55, 6)),
  el: lin(JD(r, 6, 2), JD(r, 9, 2)),
  dist: lin(J(r, 3.4, 0.05), J(r, 3.0, 0.05)),
  // push in, hold across the middle, release: p = 0.5 sits inside the hold
  fov: [
    [0, 40],
    [0.38, 26],
    [0.6, 26],
    [1, 44],
  ],
  look: lin(0.35, 0.85),
  fill: [
    [0, 0.45],
    [0.38, 0.75],
    [0.6, 0.75],
    [1, 0.5],
  ],
});

const sepPushIn = (r: Rng, s: 1 | -1): Channels => {
  const a0 = s * JD(r, 35, 6);
  return {
    az: lin(a0, a0 + s * 20),
    el: lin(JD(r, 8, 2), JD(r, 10, 2)),
    dist: [
      [0, 3.4],
      [0.4, 2.9],
      [1, 3.5],
    ],
    fov: [
      [0, 40],
      [0.3, 30],
      [0.52, 30],
      [1, 42],
    ],
    look: lin(0.2, 0.25),
    fill: [
      [0, 0.45],
      [0.3, 0.7],
      [0.52, 0.7],
      [1, 0.5],
    ],
  };
};

const boosterPeel = (r: Rng, s: 1 | -1): Channels => ({
  az: lin(s * JD(r, 75, 6), s * JD(r, 62, 6)),
  el: lin(JD(r, -4, 2), JD(r, 2, 2)),
  dist: lin(J(r, 2.8, 0.06), J(r, 3.2, 0.06)),
  fov: [
    [0, 38],
    [0.3, 34],
    [0.52, 34],
    [1, 38],
  ],
  look: lin(0.2, 0.3),
  fill: [
    [0, 0.5],
    [0.3, 0.62],
    [0.52, 0.62],
    [1, 0.5],
  ],
});

// ─── Views (for the 30-degree rule) ─────────────────────────────────────────

export function viewOf(sh: DirectedShot): View {
  if (sh.kept) return KEPT_VIEW[sh.kept];
  if (sh.anchor) {
    const a = sh.anchor;
    const z = a.z * sh.side;
    const az = (Math.atan2(a.x, z) * 180) / Math.PI;
    const el = (Math.atan2(a.y - 0.5, Math.hypot(a.x, z)) * 180) / Math.PI;
    return { az0: az, az1: az, el0: el, el1: el };
  }
  const c = sh.ch!;
  return {
    az0: worldAz(c.az[0][1], sh.side),
    az1: worldAz(c.az[c.az.length - 1][1], sh.side),
    el0: c.el[0][1],
    el1: c.el[c.el.length - 1][1],
  };
}

/** Azimuth channels are "degrees behind the side view" (0 = abeam, 90 = straight behind the
 *  tail); `side` mirrors the camera across the flight plane. World azimuth: atan2(x, z). */
function worldAz(az: number, side: number): number {
  const a = az * D2R;
  return (Math.atan2(-Math.sin(a), side * Math.cos(a)) * 180) / Math.PI;
}

/** Keep every azimuth keyframe in the rear half (5 to 88 degrees behind abeam): the camera
 *  never looks at the nose head-on, where the stack foreshortens to a dot. */
function behind(ch: Channels): Channels {
  ch.az = ch.az.map(([p, v]) => [p, Math.min(60, Math.max(5, Math.abs(v)))] as [number, number]);
  return ch;
}

const wrap180 = (d: number): number => {
  let x = ((d + 180) % 360) - 180;
  if (x < -180) x += 360;
  return x;
};

/** The 30-degree rule between two consecutive shots: the cut changes the azimuth by at
 *  least 30 degrees or the elevation by at least 20. */
export function farEnough(prev: View, next: View): boolean {
  return Math.abs(wrap180(next.az0 - prev.az1)) >= 30 || Math.abs(next.el0 - prev.el1) >= 20;
}

/** Shift a built shot's azimuth so it starts 60 degrees from where the previous one ended. */
function repairAz(sh: DirectedShot, prev: View, r: Rng): void {
  if (!sh.ch) return;
  const side0 = sh.side;
  const orig = sh.ch.az.map(([p, v]) => [p, v] as [number, number]);
  const flips: (1 | -1)[] =
    r() < 0.5 ? [side0, side0 === 1 ? -1 : 1] : [side0 === 1 ? -1 : 1, side0];
  for (const sd of flips) {
    for (const delta of [0, 35, -35, 60, -60, 80]) {
      sh.side = sd;
      sh.ch.az = orig.map(
        ([p, v]) => [p, Math.min(60, Math.max(5, v + delta))] as [number, number],
      );
      if (farEnough(prev, viewOf(sh))) return;
    }
  }
}

// ─── Conditions ─────────────────────────────────────────────────────────────

function pickWeighted<T>(r: Rng, items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

/**
 * The seeded conditions. `realSun` (the Sun at the pad at the real launch instant) decides the
 * LIGHT pick and the sun's elevation and azimuth when it is given and no light is forced; the
 * clouds and smoke stay seeded. Without it (a Plan flight, a mission with a date but no time
 * of day) the light is rolled as before; the draws are consumed identically either way so the
 * clouds do not change with the light source.
 */
export function pickConditions(
  r: Rng,
  force?: { light?: LightId; cover?: CoverId },
  padSmokeBias = false,
  realSun?: SunPosition | null,
): LaunchConditions {
  const rolledLight =
    force?.light ??
    pickWeighted<LightId>(r, [
      ['midday', 0.4],
      ['golden', 0.3],
      ['dusk', 0.2],
      ['night', 0.1],
    ]);
  const cover =
    force?.cover ??
    pickWeighted<CoverId>(r, [
      ['clear', 0.25],
      ['scattered', 0.35],
      ['deck', 0.25],
      ['heavy', 0.15],
    ]);
  const elev: Record<LightId, [number, number]> = {
    midday: [50, 72],
    golden: [5, 13],
    dusk: [-4, -1],
    night: [-28, -18],
  };
  const cov: Record<CoverId, [number, number]> = {
    clear: [0.04, 0.12],
    scattered: [0.34, 0.5],
    deck: [0.62, 0.74],
    heavy: [0.9, 0.97],
  };
  const [e0, e1] = elev[rolledLight];
  const [c0, c1] = cov[cover];
  const rolledElev = e0 + r() * (e1 - e0);
  const rolledAz = r() * 360;
  const real = realSun && !force?.light ? realSun : null;
  const light = real ? lightFromSunElevation(real.elevDeg) : rolledLight;
  return {
    light,
    cover,
    sunElevDeg: real ? real.elevDeg : rolledElev,
    sunAzDeg: real ? compassToSceneAz(real.azDeg) : rolledAz,
    coverage: c0 + r() * (c1 - c0),
    deckAltKm: 1.8 + r() * 3.2,
    cloudSeed: Math.floor(r() * 1000),
    padSmoke: padSmokeBias || r() < 0.4,
    cloudType: r(),
  };
}

// ─── Plan builder ───────────────────────────────────────────────────────────

export function buildDirectorPlan(inp: DirectorInputs): DirectorPlan {
  const seedKey = inp.seed != null ? `seed:${inp.seed}` : `${inp.vehicleId}|${inp.missionId ?? ''}`;
  const seed = fnv1a32(seedKey);
  const r = mulberry32(seed);
  const reduced = inp.reducedMotion === true;
  const speed = inp.speed ?? 5;
  // The pools are authored for x5; above that, sub-shots shorter than 3 s of screen time merge.
  const minPiece = speed > 5 ? 3 * speed : 0;
  const sig = SIGNATURE[inp.vehicleId];

  const tOf = (type: AscentEvent['type']): number | undefined =>
    inp.events.find((e) => e.type === type)?.t;
  const end = Math.max(inp.duration, inp.endT ?? 0);
  const seco = Math.min(end, tOf('seco') ?? inp.duration);
  const sepT = inp.payloadSepT != null && inp.payloadSepT > seco ? inp.payloadSepT : seco;
  const sepEnd = sepT + PAYLOAD_SEP_HOLD_S;
  const maxQ = Math.max(OPENING_END + 1, inp.maxQt || inp.duration * 0.2);
  const fairingT = tOf('fairing_jettison');

  const shots: DirectedShot[] = [];
  const last = (): DirectedShot | undefined => shots[shots.length - 1];
  const side = (): 1 | -1 => (r() < 0.5 ? -1 : 1);

  // A blend is a camera move the viewer watches: about 1.3 s of SCREEN time whatever the speed
  // (4 flight s at x5 is 0.8 s, and at x10 only 0.4 s, which read as a whip).
  const blendFor = (s: number, span: number): number =>
    reduced ? 0 : Math.min((s * 1.6 * speed) / 5, Math.max(0, span * 0.5));

  // ── Opening: a seeded pool; today's is one option ───────────────────────
  // The real Sun at the pad when the real launch instant is known (else null: seeded light).
  const realSun = inp.launch ? sunAt(inp.launch.utcMs, inp.launch.latDeg, inp.launch.lonDeg) : null;
  const realLight = realSun ? lightFromSunElevation(realSun.elevDeg) : null;
  const rolledOpening: OpeningId =
    inp.force?.opening ??
    pickWeighted<OpeningId>(
      r,
      (Object.keys(OPENING_WEIGHTS) as OpeningId[]).map((id) => [
        id,
        OPENING_WEIGHTS[id] * (sig?.opening?.[id] ?? 1),
      ]),
    );
  // The dusk opening is a dusk look: a real daylight launch takes the plain pad-level wide.
  const opening: OpeningId =
    !inp.force?.opening &&
    rolledOpening === 'pad_dusk' &&
    realLight &&
    realLight !== 'dusk' &&
    realLight !== 'night'
      ? 'pad_wide'
      : rolledOpening;
  const openEnd = Math.min(OPENING_END, seco);
  const oSide = side();
  const base = (
    o: Partial<DirectedShot> & Pick<DirectedShot, 'id' | 'family' | 'tStart' | 'tEnd'>,
  ): DirectedShot => ({
    kind: 'opening',
    side: oSide,
    ease: 'smooth',
    blendInS: 0,
    fast: false,
    ...o,
  });
  if (opening === 'tower_clear') {
    const padEnd = Math.min(PAD_END, openEnd);
    shots.push(
      base({ id: 'pad', family: 'padOrbit', tStart: 0, tEnd: padEnd, kept: 'pad', kind: 'kept' }),
    );
    if (openEnd > padEnd)
      shots.push(
        base({
          id: 'tower_clear',
          family: 'ground',
          tStart: padEnd,
          tEnd: openEnd,
          kept: 'tower_clear',
          kind: 'kept',
        }),
      );
  } else if (opening === 'pad_wide') {
    shots.push(
      base({
        id: 'pad_wide',
        family: 'ground',
        tStart: 0,
        tEnd: openEnd,
        // Pad level, close, tilted up so the stretched ground photo is out of frame; the
        // smoke rolls across the bottom (example 5).
        anchor: { x: -0.25, y: 0.1, z: 1.3 },
        ch: {
          az: lin(0, 0),
          el: lin(0, 0),
          dist: lin(1, 1),
          fov: lin(64, 46),
          look: lin(1.0, 0.75),
        },
      }),
    );
  } else if (opening === 'overhead_drop') {
    shots.push(
      base({
        id: 'overhead_drop_open',
        family: 'overhead',
        tStart: 0,
        tEnd: openEnd,
        // Above and behind the nose from the first frame, the pad and the plume below.
        ch: {
          az: lin(25, 50),
          el: lin(70, 58),
          dist: lin(1.6, 2.2),
          fov: lin(60, 46),
          look: lin(0.8, 0.9),
          fill: lin(0.6, 0.55),
        },
      }),
    );
  } else {
    shots.push(
      base({
        id: 'pad_dusk',
        family: 'ground',
        tStart: 0,
        tEnd: openEnd,
        anchor: { x: -0.4, y: 0.08, z: 1.7 },
        ch: {
          az: lin(0, 0),
          el: lin(0, 0),
          dist: lin(1, 1),
          fov: lin(60, 44),
          look: lin(0.95, 0.7),
        },
      }),
    );
  }
  const conditions = pickConditions(
    r,
    {
      light: inp.force?.light ?? (opening === 'pad_dusk' && !realSun ? 'dusk' : undefined),
      cover: inp.force?.cover,
    },
    opening === 'pad_wide' || opening === 'pad_dusk' || opening === 'overhead_drop',
    realSun,
  );

  // ── Filling a range with pool pieces ────────────────────────────────────
  const prevView = (): View | null => {
    const l = last();
    return l ? viewOf(l) : null;
  };

  function fill(a: number, b: number, firstBlend: number): void {
    let cursor = a;
    while (b - cursor > 1e-6) {
      const R = b - cursor;
      const prev = last();
      const eligible = (def: ShotDef): boolean => {
        const effMin = Math.max(def.minS, minPiece);
        const alt = inp.altAt(cursor + Math.min(R, effMin) / 2);
        return effMin <= R && alt >= def.altMin && alt <= def.altMax;
      };
      const prevPool = prev && prev.kind === 'pool' ? prev : null;
      const sets: ShotDef[][] = [];
      const all = POOL.filter(eligible);
      // A shot that played in the last three windows is not drawn again while others fit.
      const recent = new Set(shots.slice(-3).map((x) => x.id));
      const strict = all.filter(
        (d) => d.id !== prev?.id && d.family !== prev?.family && !(d.fast && prevPool?.fast),
      );
      sets.push(strict.filter((d) => !recent.has(d.id)));
      sets.push(strict);
      sets.push(all.filter((d) => d.id !== prev?.id && !(d.fast && prevPool?.fast)));
      sets.push(all.filter((d) => d.id !== prev?.id));
      const cands = sets.find((x) => x.length > 0);
      if (!cands) {
        // Nothing fits (a gap shorter than the shortest piece): the previous shot absorbs it.
        if (prev) {
          prev.tEnd = b;
          prev.extended = true;
        }
        return;
      }
      const def = pickWeighted(
        r,
        cands.map((d) => [d, d.weight * (sig?.pool?.[d.id] ?? 1)] as [ShotDef, number]),
      );
      // At a fast playback speed a piece must still last 3 s of screen time, so the
      // authored [minS, maxS] stretches to that floor.
      const effMax = Math.max(def.maxS, minPiece);
      const effMin = Math.min(effMax, Math.max(def.minS, minPiece));
      let d: number;
      if (R <= effMax) d = R;
      else {
        d = effMin + r() * (effMax - effMin);
        const tail = Math.max(SMALLEST_PIECE_S, minPiece);
        if (R - d < tail) d = Math.min(effMax, Math.max(effMin, R - tail));
      }
      const s = side();
      const shot: DirectedShot = {
        id: def.id,
        family: def.family,
        kind: 'pool',
        tStart: cursor,
        tEnd: cursor + d,
        side: s,
        ease: def.ease,
        blendInS: 0,
        fast: def.fast,
        ch: behind(withFill(def.build(r, s), FILL[def.id], r)),
        minS: effMin,
        maxS: effMax,
      };
      const pv = prevView();
      if (pv && !farEnough(pv, viewOf(shot))) repairAz(shot, pv, r);
      shot.blendInS = blendFor(cursor === a ? firstBlend : BLEND_S, shot.tEnd - shot.tStart);
      shots.push(shot);
      cursor += d;
    }
  }

  function pushBeat(
    id: string,
    family: ShotFamily,
    tStart: number,
    tEnd: number,
    event: string,
    build: (r: Rng, s: 1 | -1) => Channels,
  ): void {
    const s = side();
    const shot: DirectedShot = {
      id,
      family,
      kind: 'beat',
      tStart,
      tEnd,
      event,
      side: s,
      ease: 'smooth',
      blendInS: 0,
      fast: false,
      ch: behind(build(r, s)),
    };
    const pv = prevView();
    if (pv && !farEnough(pv, viewOf(shot))) repairAz(shot, pv, r);
    shots.push(shot);
  }

  function pushKept(
    name: AscentShotName,
    family: ShotFamily,
    tStart: number,
    tEnd: number,
    event: string | undefined,
    blendS: number,
  ): void {
    shots.push({
      id: name,
      family,
      kind: 'kept',
      tStart,
      tEnd,
      event,
      side: 1,
      ease: 'smooth',
      blendInS: blendFor(blendS, tEnd - tStart),
      fast: false,
      kept: name,
    });
  }

  // ── Climb, then the Max-Q squeeze ───────────────────────────────────────
  let cursor = openEnd;
  const beats = [
    ...inp.events
      .filter((e) => e.type === 'staging')
      .map((e) => ({ kind: 'staging' as const, t: e.t })),
    ...(fairingT != null ? [{ kind: 'fairing' as const, t: fairingT }] : []),
  ]
    .filter((b) => b.t > maxQ + 1 && b.t < seco)
    .sort((a, b) => a.t - b.t);

  if (maxQ < seco - 6 && cursor < maxQ) {
    let sqStart = maxQ - MAXQ_PRE;
    if (sqStart - cursor < 6) sqStart = cursor;
    const firstBeatStart = beats.length ? beats[0].t - STAGING_PRE : seco;
    const sqEnd = Math.min(maxQ + MAXQ_POST, firstBeatStart, seco);
    if (sqEnd - sqStart >= 4) {
      if (sqStart > cursor) fill(cursor, sqStart, OPENING_BLEND_S);
      pushBeat('maxq_squeeze', 'squeeze', sqStart, sqEnd, 'max_q', maxqSqueeze);
      cursor = sqEnd;
    }
  }

  // ── Flight beats and the stretches between them ─────────────────────────
  let firstStaging = true;
  for (const b of beats) {
    if (b.t <= cursor + 1) continue;
    const pre = b.kind === 'fairing' ? 0 : STAGING_PRE;
    const bStart = Math.max(cursor, b.t - pre);
    const hold = b.kind === 'fairing' ? FAIRING_HOLD : STAGING_POST;
    const bEnd = Math.min(b.t + hold, seco);
    if (bEnd - bStart < 2) continue;
    if (bStart - cursor > 0) fill(cursor, bStart, cursor === openEnd ? OPENING_BLEND_S : BLEND_S);
    if (b.kind === 'fairing') {
      pushKept('fairing', 'fairing', bStart, bEnd, 'fairing_jettison', 0);
    } else {
      const wantPeel = firstStaging && inp.hasBoosters === true;
      const prevFam = last()?.family;
      const peel = wantPeel ? prevFam !== 'peel' : prevFam === 'sepPush';
      if (peel) pushBeat('booster_peel', 'peel', bStart, bEnd, 'staging', boosterPeel);
      else pushBeat('sep_pushin', 'sepPush', bStart, bEnd, 'staging', sepPushIn);
      firstStaging = false;
    }
    cursor = bEnd;
  }
  if (seco - cursor > 0) fill(cursor, seco, cursor === openEnd ? OPENING_BLEND_S : BLEND_S);

  // ── Orbit and separation: kept ──────────────────────────────────────────
  if (inp.payloadInBay) {
    // The payload stays in the bay (Shuttle): no separation shot, the orbiter alone in orbit.
    if (end > seco) pushKept('orbit', 'orbitHold', seco, end, 'seco', 0);
  } else {
    if (sepT > seco) pushKept('orbit', 'orbitHold', seco, sepT, 'seco', 0);
    pushKept('separation', 'separation', sepT, sepEnd, 'payload_sep', 0);
    if (end > sepEnd) pushKept('orbit', 'orbitHold', sepEnd, end, undefined, OPENING_BLEND_S);
  }

  return {
    seed,
    opening,
    conditions,
    shots: shots.filter((s) => s.tEnd > s.tStart),
    reducedMotion: reduced,
  };
}

// ─── Pose ───────────────────────────────────────────────────────────────────

/** Earth's surface speed at the equator (km/s). */
const EQUATOR_SPEED_KMS = 0.4651;
/** The drawn pad tower is 1.18 vehicle lengths (1.416 km) tall; the body stays vertical until
 *  its base is above it, plus a margin. */
export const TOWER_CLEAR_ALT_KM = 1.416 + 0.1;
const TILT_BLEND_KM = 3;

/**
 * The state as the GROUND sees it. The physics reports downrange as the inertial arc, so
 * the launch site's rotation speed (0.41 km/s at the Cape) shows as the vehicle sliding
 * ~4 km sideways in the first 10 s while it climbs 0.2 km. Subtracting the pad's speed makes
 * the first seconds a vertical rise. Dev-rig only: the physics, the HUD and /fly stay inertial.
 */
export function groundRelative(s: AscentState, latDeg: number): AscentState {
  const v = EQUATOR_SPEED_KMS * Math.cos(latDeg * D2R);
  const t = Math.max(0, s.t);
  // The pad's speed is subtracted for the whole flight: fading it out made the ground path
  // swing sideways at 15-35 s while the body still pointed up (a visible crab).
  const downrangeKm = s.downrangeKm - v * t;

  // Attitude. The physics tilts the body as soon as it has horizontal speed (the pad's own
  // 0.4 km/s counts). Drawn: vertical until the base clears the pad tower, then a quintic
  // blend to the ground-relative flight path (no crab), and from 40 s a second quintic blend
  // to the physics attitude, which the path and the thrust agree with by then.
  const tilt = bodyAngleFromVerticalRad(s);
  const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
  const path = Math.atan2(Math.max(0, horiz - v), Math.max(1e-6, s.velUpKms));
  const w1 = smoother((s.altKm - TOWER_CLEAR_ALT_KM) / TILT_BLEND_KM);
  const w2 = smoother((t - 40) / 30);
  const target = path * (1 - w2) + tilt * w2;
  const fromVertical = w1 * target;
  return { ...s, downrangeKm, attitudeRad: Math.PI / 2 - fromVertical };
}

export function shotIndexAt(shots: DirectedShot[], t: number): number {
  if (shots.length === 0 || t <= shots[0].tStart) return 0;
  for (let i = 0; i < shots.length; i++) {
    if (t >= shots[i].tStart && t < shots[i].tEnd) return i;
  }
  return shots.length - 1;
}

const D2R = Math.PI / 180;
/** Framing knob: the examples fill 60 to 70 % of the frame; the brief's distances gave about 30 %. */
const CLOSE = 0.72;

const ASPECT = 16 / 9;

/**
 * The share of the frame height the vehicle's base-to-nose segment spans as seen from
 * `pose` (screen-space length over frame height; 16:9). Large when close or when the stack
 * lies across the view, small when far or when it points at the camera.
 */
export function vehicleFill(pose: CameraPose, s: AscentState, vehLen: number): number {
  const fv = bodyAngleFromVerticalRad(s);
  const bx = s.downrangeKm;
  const by = s.altKm;
  const nx = bx + Math.sin(fv) * vehLen;
  const ny = by + Math.cos(fv) * vehLen;
  // camera basis
  let fx = pose.tx - pose.px;
  let fy = pose.ty - pose.py;
  let fz = pose.tz - pose.pz;
  const fl = Math.hypot(fx, fy, fz) || 1;
  fx /= fl;
  fy /= fl;
  fz /= fl;
  // right = f x up(0,1,0)
  let rx = -fz;
  const ry = 0;
  let rz = fx;
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl;
  rz /= rl;
  // up = r x f
  const ux = ry * fz - rz * fy;
  const uy = rz * fx - rx * fz;
  const uz = rx * fy - ry * fx;
  const th = Math.tan((pose.fov * D2R) / 2);
  const proj = (x: number, y: number, z: number): [number, number] | null => {
    const vx = x - pose.px;
    const vy = y - pose.py;
    const vz = z - pose.pz;
    const depth = vx * fx + vy * fy + vz * fz;
    if (depth < 1e-3) return null;
    return [
      ((vx * rx + vy * ry + vz * rz) / (depth * th)) * (1 / ASPECT),
      (vx * ux + vy * uy + vz * uz) / (depth * th),
    ];
  };
  const a = proj(bx, by, 0);
  const b = proj(nx, ny, 0);
  if (!a || !b) return 10;
  // NDC spans 2 per axis, x already divided by the aspect: length in frame heights
  return Math.hypot((a[0] - b[0]) * ASPECT, a[1] - b[1]) / 2;
}

function channelPose(
  sh: DirectedShot,
  s: AscentState,
  vehLen: number,
  p: number,
  reduced: boolean,
): CameraPose {
  const ch = sh.ch!;
  const ev = (kf: KF): number => evalKf(kf, p, sh.ease);
  const fv = bodyAngleFromVerticalRad(s);
  const look = ev(ch.look) * vehLen;
  const tx = s.downrangeKm + Math.sin(fv) * look;
  const ty = s.altKm + Math.cos(fv) * look;
  let px: number;
  let py: number;
  let pz: number;
  if (sh.anchor) {
    // The camera stands on the pad, then slides along with the stack (the physics drifts
    // downrange from the first seconds) so it stays in frame.
    px = sh.anchor.x * vehLen + s.downrangeKm * smooth((p - 0.08) / 0.3);
    py = sh.anchor.y * vehLen;
    pz = sh.anchor.z * vehLen * sh.side;
  } else {
    let d = ev(ch.dist) * vehLen * CLOSE;
    const el = ev(ch.el) * D2R;
    const az = ev(ch.az) * D2R;
    const at = (dd: number): [number, number, number] => [
      tx - dd * Math.cos(el) * Math.sin(az),
      ty + dd * Math.sin(el),
      sh.side * dd * Math.cos(el) * Math.cos(az),
    ];
    if (ch.fill) {
      const want = ev(ch.fill);
      const fov = ev(ch.fov);
      for (let i = 0; i < 4; i++) {
        const [cx, cy, cz] = at(d);
        const got = vehicleFill({ px: cx, py: cy, pz: cz, tx, ty, tz: 0, fov }, s, vehLen);
        d = Math.min(16 * vehLen, Math.max(1.1 * vehLen, (d * got) / want));
      }
    }
    [px, py, pz] = at(d);
  }
  if (!reduced) {
    const wob = vehLen * 0.025;
    px += Math.sin(s.t * 0.7) * wob;
    py += Math.cos(s.t * 0.9) * wob;
  }
  return { px, py: Math.max(py, 0.015), pz, tx, ty, tz: 0, fov: ev(ch.fov) };
}

function shotPose(
  sh: DirectedShot,
  s: AscentState,
  vehLen: number,
  p: number,
  focus: { x: number; y: number; z?: number } | null | undefined,
  reduced: boolean,
): CameraPose {
  if (sh.kept) {
    // No handheld wobble under reduced motion: composeShot keys it on s.t, so freeze the clock.
    const st = reduced ? { ...s, t: 0 } : s;
    return composeShot(sh.kept, st, vehLen, p, NO_TUNE, focus);
  }
  return channelPose(sh, s, vehLen, p, reduced);
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function blendPoses(a: CameraPose, b: CameraPose, u: number): CameraPose {
  return {
    px: lerp(a.px, b.px, u),
    py: lerp(a.py, b.py, u),
    pz: lerp(a.pz, b.pz, u),
    tx: lerp(a.tx, b.tx, u),
    ty: lerp(a.ty, b.ty, u),
    tz: lerp(a.tz, b.tz, u),
    fov: lerp(a.fov, b.fov, u),
  };
}

export interface DirectedPose {
  pose: CameraPose;
  index: number;
  progress: number;
  /** 0 = just cut/blend-started, 1 = settled in the shot. */
  blend: number;
}

/**
 * The camera at flight time `t`. Pure: the same (plan, t, state) gives the same pose, so a
 * scrub equals a play. Reduced motion: each shot holds its midpoint pose, hard cuts only.
 */
export function directedPoseAt(
  plan: DirectorPlan,
  t: number,
  s: AscentState,
  vehLen: number,
  focus?: { x: number; y: number; z?: number } | null,
): DirectedPose {
  const reduced = plan.reducedMotion;
  const i = shotIndexAt(plan.shots, t);
  const sh = plan.shots[i];
  const span = sh.tEnd - sh.tStart;
  const progress = span > 0 ? clamp01((t - sh.tStart) / span) : 0;
  const p = reduced ? 0.5 : progress;
  let pose = shotPose(sh, s, vehLen, p, focus, reduced);
  let blend = 1;
  if (!reduced && sh.blendInS > 0 && i > 0) {
    const u = (t - sh.tStart) / sh.blendInS;
    if (u < 1) {
      blend = smoother(u);
      const prev = shotPose(plan.shots[i - 1], s, vehLen, 1, focus, reduced);
      pose = blendPoses(prev, pose, blend);
    }
  }
  return { pose, index: i, progress, blend };
}

/** The shot list as text for the review UI and logs. */
export function describePlan(plan: DirectorPlan): string[] {
  return plan.shots.map(
    (s) =>
      `${s.tStart.toFixed(0).padStart(4)}-${s.tEnd.toFixed(0).padEnd(4)} ${s.id} [${s.family}${
        s.blendInS > 0 ? ` blend ${s.blendInS.toFixed(1)}s` : s.tStart > 0 ? ' cut' : ''
      }]`,
  );
}
