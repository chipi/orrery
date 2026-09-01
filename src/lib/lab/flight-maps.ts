/**
 * Flight maps — the data behind the capstone/milestone GRAND HERO (FlightMapCanvas). Each map is a
 * data-driven scientific diagram of one whole mission: the trajectory as hand-authored schematic
 * conic geometry (distances compressed for legibility — the honesty line says so), annotated with
 * the REAL event sequence, MET, and Δv, plus a per-phase filmstrip of spacecraft configurations.
 *
 * Speeds/Δv that the Physics Lab can COMPUTE are derived here from the same kernel the lessons use
 * (see `deriveApollo`), so the map never disagrees with the cards; MET + historical burn values
 * come from the flight record (not computable). Canvas text is English, matching every other Lab
 * hero (the hardcoded-copy convention — keeps the grand hero contextual with the notebook).
 */
import { MU_EARTH_KM3_S2, MU_SUN_KM3_S2 } from '$lib/physics/util/constants';
import { circularVelocityKms, visVivaKms, escapeVelocityKms } from '$lib/physics/mechanics/orbits';

/** A body drawn on the map (Earth, Moon, …). Position is canvas-space; r is draw radius. */
export type FlightBody = { x: number; y: number; r: number; label: string; ring?: boolean };

/** A numbered event station on the trajectory, with its real number + the physics that governs it. */
export type FlightEvent = {
  n: number;
  dot: [number, number]; // station dot on the path
  at: [number, number]; // text-block anchor
  align?: 'left' | 'right';
  name: string;
  met: string; // mission elapsed time, "T+hh:mm"
  physics: string; // the why/how — the headline number + its mechanism
  burn?: boolean; // an engine event (gold)
};

/** A spacecraft-configuration icon kind, drawn in the filmstrip. */
export type IconKind =
  | 'stack-full'
  | 'stack-upper'
  | 'burn-stage'
  | 'docked'
  | 'docked-burn'
  | 'lm-descend'
  | 'lm-surface'
  | 'lm-ascend'
  | 'csm-burn'
  | 'capsule-entry'
  | 'capsule-chutes'
  | 'probe'
  | 'probe-burn'
  | 'aeroshell';

/** A faint heliocentric orbit ring (drawn around a shared centre, e.g. the Sun). */
export type OrbitRing = { cx: number; cy: number; r: number; label?: string };

/** A planetary limb — a large disc below the frame acts as the surface, with an atmosphere band
 *  (for ascent/entry profiles drawn against the horizon rather than a space trajectory). */
export type Limb = {
  cx: number;
  cy: number;
  r: number;
  atmoKm?: number;
  atmoPx?: number;
  label: string;
};

/** One filmstrip cell — a config line-icon + caption, aligned by number to a trajectory station. */
export type FilmCell = { n: number; icon: IconKind; caption: string };

export type FlightMap = {
  title: string;
  subtitle: string;
  bodies: FlightBody[];
  /** optional planetary limb (ascent/entry profiles) — a horizon + atmosphere band. */
  limb?: Limb;
  /** optional faint heliocentric orbit rings (interplanetary maps) — drawn under the trajectory. */
  orbits?: OrbitRing[];
  /** trajectory as flat cubic beziers [x0,y0,c1x,c1y,c2x,c2y,x1,y1], drawn in order. */
  beziers: number[][];
  events: FlightEvent[];
  film: FilmCell[];
  honesty: string;
};

// ─── Kernel-derived headline numbers (honest, consistent with the lessons) ────────
// Only the physically-computable speeds are derived; MET + mid-course/ascent Δv are flight record.
function deriveApollo(): {
  leoKms: number;
  tliDvKms: number;
  entryKms: number;
} {
  const Re = 6371; // km
  const rLeo = Re + 185; // km — Apollo parking orbit
  const leo = circularVelocityKms(rLeo, MU_EARTH_KM3_S2); // circular LEO, km/s
  // Trans-lunar injection: perigee speed of the 185 km × ~384,400 km transfer ellipse, minus LEO.
  const rApo = Re + 384400; // km — lunar distance
  const aTli = (rLeo + rApo) / 2;
  const tliPerigee = visVivaKms(rLeo, aTli, MU_EARTH_KM3_S2); // km/s
  const tliDv = tliPerigee - leo;
  // Return: the ~11 km/s Earth-atmosphere interface speed is fixed by lunar-distance fall — the
  // perigee speed of the same class of ellipse (record value 10.8–11.0 km/s; keep the flown 11.0).
  return { leoKms: leo, tliDvKms: tliDv, entryKms: 11.0 };
}
const A = deriveApollo();
const f1 = (v: number): string => v.toFixed(1);
const f2 = (v: number): string => v.toFixed(2);

const apolloRoundTrip: FlightMap = {
  title: 'APOLLO: THERE AND BACK',
  subtitle: 'Earth → Moon → Earth · a lunar-landing mission profile · 8 days',
  bodies: [
    { x: 175, y: 305, r: 30, label: 'Earth' },
    { x: 778, y: 130, r: 16, label: 'Moon', ring: true },
  ],
  beziers: [
    [203, 282, 380, 120, 600, 95, 758, 150], // outbound (translunar)
    [760, 155, 600, 300, 380, 375, 200, 330], // return (transearth)
  ],
  events: [
    {
      n: 1,
      dot: [163, 332],
      at: [34, 360],
      name: 'Liftoff',
      met: 'T+00:00',
      physics: 'Saturn V · 0→' + f1(A.leoKms) + ' km/s',
    },
    {
      n: 2,
      dot: [203, 282],
      at: [46, 246],
      name: 'Earth orbit',
      met: 'T+00:12',
      physics: 'LEO ' + f2(A.leoKms) + ' km/s (ascent)',
    },
    {
      n: 3,
      dot: [257, 237],
      at: [232, 200],
      name: 'Trans-lunar injection',
      met: 'T+02:44',
      physics: '+' + f2(A.tliDvKms) + ' km/s · Lambert',
      burn: true,
    },
    {
      n: 4,
      dot: [458, 141],
      at: [396, 104],
      name: 'Midcourse correction',
      met: 'T+27:00',
      physics: 'few m/s trim',
    },
    {
      n: 5,
      dot: [709, 132],
      at: [566, 74],
      name: 'Lunar orbit insertion',
      met: 'T+75:50',
      physics: '−0.9 km/s → 1.6 km/s',
      burn: true,
    },
    {
      n: 6,
      dot: [797, 148],
      at: [812, 150],
      name: 'Powered descent',
      met: 'T+101:36',
      physics: 'throttle nulls v',
      burn: true,
    },
    {
      n: 7,
      dot: [801, 140],
      at: [812, 173],
      name: 'Touchdown',
      met: 'T+102:45',
      physics: '<3 m/s',
    },
    {
      n: 8,
      dot: [806, 106],
      at: [812, 96],
      name: 'Lunar ascent',
      met: 'T+124:22',
      physics: '+1.8 km/s',
      burn: true,
    },
    {
      n: 9,
      dot: [710, 196],
      at: [724, 234],
      name: 'Trans-earth injection',
      met: 'T+135:24',
      physics: '+1.0 km/s home',
      burn: true,
    },
    {
      n: 10,
      dot: [255, 340],
      at: [286, 388],
      name: 'Entry interface',
      met: 'T+195:03',
      physics: f1(A.entryKms) + ' km/s · lift ½-g corridor',
      burn: true,
    },
    {
      n: 11,
      dot: [188, 338],
      at: [70, 400],
      name: 'Splashdown',
      met: 'T+195:18',
      physics: 'Pacific · 0 km/s',
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'Saturn V' },
    { n: 2, icon: 'stack-upper', caption: 'S-IVB + payload' },
    { n: 3, icon: 'burn-stage', caption: 'TLI burn' },
    { n: 4, icon: 'docked', caption: 'CSM + LM' },
    { n: 5, icon: 'docked-burn', caption: 'LOI burn' },
    { n: 6, icon: 'lm-descend', caption: 'LM descent' },
    { n: 7, icon: 'lm-surface', caption: 'on the Moon' },
    { n: 8, icon: 'lm-ascend', caption: 'LM ascent' },
    { n: 9, icon: 'csm-burn', caption: 'TEI burn' },
    { n: 10, icon: 'capsule-entry', caption: 'CM entry' },
    { n: 11, icon: 'capsule-chutes', caption: 'splashdown' },
  ],
  honesty:
    'Schematic conic — distances compressed for legibility. Speeds computed from the mission kernel (vis-viva); MET + burn Δv from the Apollo 11 flight record.',
};

// ─── Get to Mars — heliocentric Hohmann transfer (Earth → Mars) ──────────────────
function deriveMars(): { tmiDvKms: number; arrivalVinfKms: number; tofDays: number } {
  const AU = 149_597_870.7; // km
  const rE = AU;
  const rM = 1.523679 * AU; // Mars semi-major axis
  const aT = (rE + rM) / 2; // transfer ellipse
  const vE = circularVelocityKms(rE, MU_SUN_KM3_S2);
  const vPeri = visVivaKms(rE, aT, MU_SUN_KM3_S2);
  const vApo = visVivaKms(rM, aT, MU_SUN_KM3_S2);
  const vM = circularVelocityKms(rM, MU_SUN_KM3_S2);
  const tofS = Math.PI * Math.sqrt(aT ** 3 / MU_SUN_KM3_S2);
  return { tmiDvKms: vPeri - vE, arrivalVinfKms: vM - vApo, tofDays: tofS / 86400 };
}
const M = deriveMars();

const getToMars: FlightMap = {
  title: 'GET TO MARS',
  subtitle: 'Earth → Mars · a Hohmann transfer · ' + M.tofDays.toFixed(0) + ' days',
  bodies: [
    { x: 250, y: 250, r: 17, label: 'Sun' },
    { x: 250, y: 350, r: 11, label: 'Earth' },
    { x: 250, y: 85, r: 9, label: 'Mars' },
  ],
  orbits: [
    { cx: 250, cy: 250, r: 100, label: 'Earth orbit' },
    { cx: 250, cy: 250, r: 165, label: 'Mars orbit' },
  ],
  beziers: [
    [250, 350, 470, 345, 520, 250, 495, 150],
    [495, 150, 475, 95, 360, 85, 250, 85],
  ],
  events: [
    {
      n: 1,
      dot: [250, 350],
      at: [300, 392],
      name: 'Launch',
      met: 'L+0',
      physics: 'Earth escape (C3)',
    },
    {
      n: 2,
      dot: [330, 348],
      at: [330, 330],
      name: 'Trans-Mars injection',
      met: 'L+0',
      physics: '+' + f2(M.tmiDvKms) + ' km/s helio',
      burn: true,
    },
    {
      n: 3,
      dot: [512, 232],
      at: [540, 236],
      name: 'Heliocentric cruise',
      met: 'L+' + (M.tofDays / 2).toFixed(0) + ' d',
      physics: 'vis-viva coast',
    },
    {
      n: 4,
      dot: [470, 120],
      at: [500, 96],
      name: 'Deep-space maneuver',
      met: 'L+' + (M.tofDays * 0.8).toFixed(0) + ' d',
      physics: 'few m/s trim',
    },
    {
      n: 5,
      dot: [352, 86],
      at: [372, 60],
      name: 'Mars arrival',
      met: 'L+' + M.tofDays.toFixed(0) + ' d',
      physics: 'v∞ ' + f2(M.arrivalVinfKms) + ' km/s',
    },
    {
      n: 6,
      dot: [258, 78],
      at: [70, 96],
      name: 'Orbit insertion',
      met: 'L+' + M.tofDays.toFixed(0) + ' d',
      physics: 'capture → areo-orbit',
      burn: true,
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'launcher' },
    { n: 2, icon: 'burn-stage', caption: 'TMI burn' },
    { n: 3, icon: 'probe', caption: 'cruise' },
    { n: 4, icon: 'probe-burn', caption: 'trim burn' },
    { n: 5, icon: 'probe', caption: 'approach' },
    { n: 6, icon: 'probe-burn', caption: 'capture' },
  ],
  honesty:
    'Schematic Hohmann geometry — not to scale. Δv, v∞ and duration computed from the mission kernel (vis-viva, heliocentric).',
};

// ─── Leave the solar system — the Voyager grand tour (gravity-assist chain) ───────
const AU_KM = 149_597_870.7;
const solarEscape1Au = escapeVelocityKms(AU_KM, MU_SUN_KM3_S2); // ~42.1 km/s
const sun = { x: 110, y: 330 };
const leaveSolarSystem: FlightMap = {
  title: 'LEAVE THE SOLAR SYSTEM',
  subtitle: 'the Voyager 2 grand tour · four gravity assists · escape',
  bodies: [
    { x: sun.x, y: sun.y, r: 15, label: 'Sun' },
    { x: 152, y: 328, r: 6, label: 'Earth' },
    { x: 300, y: 250, r: 13, label: 'Jupiter' },
    { x: 460, y: 205, r: 11, label: 'Saturn', ring: true },
    { x: 610, y: 176, r: 9, label: 'Uranus' },
    { x: 760, y: 150, r: 9, label: 'Neptune' },
  ],
  orbits: [
    { cx: sun.x, cy: sun.y, r: 205 }, // Jupiter
    { cx: sun.x, cy: sun.y, r: 372 }, // Saturn
    { cx: sun.x, cy: sun.y, r: 523 }, // Uranus
    { cx: sun.x, cy: sun.y, r: 675 }, // Neptune
  ],
  beziers: [
    [152, 326, 210, 300, 255, 270, 300, 250], // Earth → Jupiter
    [300, 250, 360, 232, 410, 216, 460, 205], // Jupiter → Saturn (kink = assist)
    [460, 205, 510, 196, 562, 185, 610, 176], // Saturn → Uranus
    [610, 176, 660, 168, 712, 159, 760, 150], // Uranus → Neptune
    [760, 150, 820, 138, 880, 120, 936, 92], // Neptune → interstellar
  ],
  events: [
    {
      n: 1,
      dot: [152, 326],
      at: [40, 360],
      name: 'Launch',
      met: 'L+0',
      physics: 'escape ' + solarEscape1Au.toFixed(1) + ' km/s @1 AU needed',
    },
    {
      n: 2,
      dot: [300, 250],
      at: [244, 288],
      name: 'Jupiter flyby',
      met: 'L+2 yr',
      physics: 'assist ≤ 2·v∞ · bends path out',
      burn: true,
    },
    {
      n: 3,
      dot: [460, 205],
      at: [420, 246],
      name: 'Saturn flyby',
      met: 'L+4 yr',
      physics: 'free Δv, no fuel',
      burn: true,
    },
    {
      n: 4,
      dot: [610, 176],
      at: [566, 214],
      name: 'Uranus flyby',
      met: 'L+9 yr',
      physics: 'staircase up in speed',
      burn: true,
    },
    {
      n: 5,
      dot: [760, 150],
      at: [700, 196],
      name: 'Neptune flyby',
      met: 'L+12 yr',
      physics: 'final kick outward',
      burn: true,
    },
    {
      n: 6,
      dot: [900, 106],
      at: [788, 78],
      name: 'Interstellar',
      met: 'L+35 yr',
      physics: 'v > solar escape · past heliopause',
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'launcher' },
    { n: 2, icon: 'probe-burn', caption: 'injection' },
    { n: 3, icon: 'probe', caption: 'Jupiter flyby' },
    { n: 4, icon: 'probe', caption: 'Saturn flyby' },
    { n: 5, icon: 'probe', caption: 'Uranus flyby' },
    { n: 6, icon: 'probe', caption: 'Neptune · out' },
  ],
  honesty:
    'Schematic grand-tour geometry — not to scale, times approximate (Voyager 2 record). Solar-escape speed computed from the mission kernel (√2·v_circular).',
};

// ─── Plan a deep-space mission (Family C capstone) — Earth → Jupiter → escape ─────
// Shares the grand-tour geometry; the six stations mirror the capstone's six lesson steps
// (launch window · interplanetary leg · Oberth departure · gravity assist · assist chain · verdict).
const planAMission: FlightMap = {
  title: 'PLAN A DEEP-SPACE MISSION',
  subtitle: 'Earth → Jupiter → the outer planets → solar escape',
  bodies: leaveSolarSystem.bodies,
  orbits: leaveSolarSystem.orbits,
  beziers: leaveSolarSystem.beziers,
  events: [
    {
      n: 1,
      dot: [152, 326],
      at: [40, 360],
      name: 'Launch window',
      met: 'step 1',
      physics: 'when Earth & target align',
    },
    {
      n: 2,
      dot: [226, 288],
      at: [150, 322],
      name: 'Oberth departure',
      met: 'step 3',
      physics: 'burn deep in Earth’s well',
      burn: true,
    },
    {
      n: 3,
      dot: [300, 250],
      at: [250, 288],
      name: 'Jupiter · gravity assist',
      met: 'step 4',
      physics: 'free Δv ≤ 2·v∞',
      burn: true,
    },
    {
      n: 4,
      dot: [460, 205],
      at: [420, 246],
      name: 'Assist chain',
      met: 'step 5',
      physics: 'stack flybys for speed',
      burn: true,
    },
    {
      n: 5,
      dot: [760, 150],
      at: [700, 196],
      name: 'Neptune · last kick',
      met: 'step 5',
      physics: 'the staircase’s top step',
      burn: true,
    },
    {
      n: 6,
      dot: [900, 106],
      at: [788, 78],
      name: 'Escape verdict',
      met: 'step 6',
      physics: 'margin = capacity + assist − required',
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'launcher' },
    { n: 2, icon: 'burn-stage', caption: 'departure' },
    { n: 3, icon: 'probe', caption: 'Jupiter' },
    { n: 4, icon: 'probe', caption: 'Saturn' },
    { n: 5, icon: 'probe', caption: 'Neptune' },
    { n: 6, icon: 'probe', caption: 'escape' },
  ],
  honesty:
    'Schematic grand-tour geometry — not to scale. The six stations map to the capstone’s six lessons; Δv relations are the patched-conic ideals the lessons compute.',
};

// ─── Reach orbit — the ascent profile (altitude vs downrange over Earth's limb) ───
const reachOrbit: FlightMap = {
  title: 'REACH ORBIT',
  subtitle: 'the ascent — a gravity turn from the pad to low Earth orbit',
  bodies: [],
  limb: { cx: 480, cy: 1650, r: 1400, atmoKm: 100, atmoPx: 95, label: 'Earth' },
  beziers: [
    [150, 250, 205, 205, 250, 182, 322, 168], // vertical climb → pitch program
    [322, 168, 470, 150, 700, 112, 900, 98], // gravity turn to horizontal (orbit)
  ],
  events: [
    {
      n: 1,
      dot: [150, 250],
      at: [40, 226],
      name: 'Liftoff',
      met: 'T+00:00',
      physics: 'full thrust, vertical',
    },
    {
      n: 2,
      dot: [262, 186],
      at: [212, 150],
      name: 'Max-Q',
      met: 'T+01:10',
      physics: 'peak dynamic pressure',
      burn: true,
    },
    {
      n: 3,
      dot: [430, 154],
      at: [392, 122],
      name: 'Stage separation',
      met: 'T+02:40',
      physics: 'first stage spent',
      burn: true,
    },
    {
      n: 4,
      dot: [660, 116],
      at: [612, 92],
      name: 'Upper-stage burn',
      met: 'T+03:00',
      physics: 'vacuum thrust · PEG',
      burn: true,
    },
    {
      n: 5,
      dot: [900, 98],
      at: [740, 72],
      name: 'Orbit insertion',
      met: 'T+08:30',
      physics: f2(A.leoKms) + ' km/s · LEO',
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'liftoff' },
    { n: 2, icon: 'stack-full', caption: 'max-Q' },
    { n: 3, icon: 'stack-upper', caption: 'stage sep' },
    { n: 4, icon: 'burn-stage', caption: 'upper burn' },
    { n: 5, icon: 'probe', caption: 'in orbit' },
  ],
  honesty:
    'Schematic gravity-turn profile — altitude exaggerated over downrange for legibility. Orbital speed computed from the mission kernel (√(µ/r)).',
};

// ─── Reach the Moon — one-way Earth → lunar orbit (translunar transfer) ───────────
const reachTheMoon: FlightMap = {
  title: 'REACH THE MOON',
  subtitle: 'Earth → lunar orbit · a trans-lunar transfer · 3 days',
  bodies: [
    { x: 200, y: 300, r: 30, label: 'Earth' },
    { x: 770, y: 150, r: 17, label: 'Moon', ring: true },
  ],
  beziers: [[230, 276, 400, 130, 640, 105, 748, 165]],
  events: [
    {
      n: 1,
      dot: [190, 331],
      at: [50, 360],
      name: 'Liftoff',
      met: 'T+00:00',
      physics: 'Earth escape ladder',
    },
    {
      n: 2,
      dot: [230, 276],
      at: [70, 244],
      name: 'Earth orbit',
      met: 'T+00:12',
      physics: 'LEO ' + f2(A.leoKms) + ' km/s',
    },
    {
      n: 3,
      dot: [286, 228],
      at: [258, 192],
      name: 'Trans-lunar injection',
      met: 'T+02:44',
      physics: '+' + f2(A.tliDvKms) + ' km/s · Lambert',
      burn: true,
    },
    {
      n: 4,
      dot: [520, 132],
      at: [452, 100],
      name: 'Cislunar coast',
      met: 'T+2.5 d',
      physics: 'vis-viva to lunar distance',
    },
    {
      n: 5,
      dot: [724, 150],
      at: [618, 210],
      name: 'Lunar orbit insertion',
      met: 'T+3 d',
      physics: '−0.9 km/s → 1.6 km/s',
      burn: true,
    },
    {
      n: 6,
      dot: [772, 168],
      at: [800, 176],
      name: 'Lunar orbit',
      met: 'T+3 d',
      physics: 'circular @ 110 km',
    },
  ],
  film: [
    { n: 1, icon: 'stack-full', caption: 'launcher' },
    { n: 2, icon: 'stack-upper', caption: 'in LEO' },
    { n: 3, icon: 'burn-stage', caption: 'TLI burn' },
    { n: 4, icon: 'probe', caption: 'coast' },
    { n: 5, icon: 'probe-burn', caption: 'LOI burn' },
    { n: 6, icon: 'probe', caption: 'lunar orbit' },
  ],
  honesty:
    'Schematic conic — distances compressed for legibility. LEO speed + TLI Δv computed from the mission kernel (vis-viva).',
};

export const FLIGHT_MAPS: Record<string, FlightMap> = {
  'apollo-round-trip': apolloRoundTrip,
  'get-to-mars': getToMars,
  'leave-the-solar-system': leaveSolarSystem,
  'plan-a-mission': planAMission,
  'reach-orbit': reachOrbit,
  'reach-the-moon': reachTheMoon,
};

export function getFlightMap(goalId: string): FlightMap | null {
  return FLIGHT_MAPS[goalId] ?? null;
}
