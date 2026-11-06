#!/usr/bin/env tsx
/**
 * Mission blueprints (#641): the reference layout a blueprint is drawn over — a dashboard sheet
 * whose large centre-top panel is the heliocentric plan view computed from real data, with empty,
 * titled panels down both sides and along the bottom for the supporting drawings.
 *
 *   npx tsx scripts/anatomy/blueprint-plan-view.ts <mission> <out.png>
 *
 * Plan view: planet orbits as circles at their mean distance; Earth at launch and each planet at
 * its encounter placed at its J2000 heliocentric ecliptic longitude from the site's JPL
 * Keplerian-elements ephemeris; each cruise leg the prograde Lambert conic between those
 * positions over the real time of flight (scripts/lib/conic-leg.ts). Distance from the Sun is
 * drawn ∝ √r so the inner legs stay readable; every angle is true. A mission whose inner loops
 * the √r map crams (Cassini's Venus–Venus–Earth) gets a true-scale detail panel bottom left of
 * centre, and its inner events are labelled only there. The image model then redraws the sheet
 * by hand in the blueprint style and must keep this geometry.
 */
import sharp from 'sharp';
import {
  heliocentric,
  julianDay,
  orbitalPlanePosition,
  type PlanetId,
} from '../../src/lib/physics/ephemeris';
import { lambertLeg } from '../lib/conic-leg';

/** Osculating heliocentric ecliptic J2000 elements (JPL SBDB): a AU, angles degrees, epoch JD. */
interface Elements {
  a: number;
  e: number;
  i: number;
  om: number;
  w: number;
  ma: number;
  epoch: number;
}
// JPL Small-Body Database (ssd-api.jpl.nasa.gov/sbdb.api, full precision), fetched 2026-11-06.
// Two-body propagation from these epochs: ample for a schematic map, not for navigation.
const SMALL: Record<string, Elements> = {
  pluto: {
    a: 39.58862938517124,
    e: 0.2518378778576892,
    i: 17.14771140999114,
    om: 110.2923840543057,
    w: 113.7090015158565,
    ma: 38.68366347318184,
    epoch: 2457588.5,
  },
  arrokoth: {
    a: 44.05257835991367,
    e: 0.03555717645015258,
    i: 2.450613924655929,
    om: 159.0377267890618,
    w: 188.8507463365642,
    ma: 310.9839309924138,
    epoch: 2461200.5,
  },
  '67p': {
    a: 3.462249490129549,
    e: 0.6409081308996354,
    i: 7.040294937543767,
    om: 50.13557377155012,
    w: 12.79824970228189,
    ma: 8.859927425218402,
    epoch: 2457305.5,
  },
  steins: {
    a: 2.363141776987294,
    e: 0.1467867767199327,
    i: 9.9247485385748,
    om: 55.2936189517901,
    w: 251.4371219667194,
    ma: 275.4028858220599,
    epoch: 2461200.5,
  },
  gaspra: {
    a: 2.209978353670737,
    e: 0.1737374595425464,
    i: 4.10465496946464,
    om: 252.9672913251979,
    w: 130.0037637381037,
    ma: 112.9508716440696,
    epoch: 2461200.5,
  },
  ida: {
    a: 2.863348031699649,
    e: 0.04610962795708528,
    i: 1.130363094271507,
    om: 323.5366609419851,
    w: 113.2571826848795,
    ma: 49.64769088009876,
    epoch: 2461200.5,
  },
  vesta: {
    a: 2.361365965127599,
    e: 0.09020374382834395,
    i: 7.143925545058711,
    om: 103.701293265032,
    w: 151.4686478221564,
    ma: 81.19015607686903,
    epoch: 2461200.5,
  },
  ceres: {
    a: 2.765552595034094,
    e: 0.07969229514816586,
    i: 10.58802780183462,
    om: 80.24862682043221,
    w: 73.29421453021587,
    ma: 274.4193463761342,
    epoch: 2461200.5,
  },
  ryugu: {
    a: 1.190918932702464,
    e: 0.1910730046480051,
    i: 5.866442486408568,
    om: 251.2897123995624,
    w: 211.608993811871,
    ma: 62.34067409463987,
    epoch: 2461200.5,
  },
  // Comets: JPL Horizons osculating elements at the encounter (heliocentric ecliptic J2000), since
  // their SBDB epochs are decades away and Jupiter perturbs 26P.
  halley: {
    a: 17.941213,
    e: 0.9672762506864229,
    i: 162.2422022915186,
    om: 58.86005707648156,
    w: 111.8656357419195,
    ma: 0.4220442836528230,
    epoch: 2446503.5,
  },
  'grigg-skjellerup': {
    a: 2.963356,
    e: 0.6643367486402151,
    i: 21.09881617864237,
    om: 213.3403034674752,
    w: 359.2648773182634,
    ma: 357.6548990928559,
    epoch: 2448813.5,
  },
  lutetia: {
    a: 2.434430742712361,
    e: 0.1647703512177245,
    i: 3.064452891064415,
    om: 80.83855721319993,
    w: 249.8802780888828,
    ma: 298.7726414605465,
    epoch: 2461200.5,
  },
};
const RAD = Math.PI / 180;
/** Heliocentric ecliptic position (AU) of a small body at JD, from its elements. */
function smallBody(el: Elements, jd: number) {
  const n = 0.9856076686 / Math.pow(el.a, 1.5); // deg/day
  const q = orbitalPlanePosition(el.a, el.e, (el.ma + n * (jd - el.epoch)) * RAD);
  const [w, i, om] = [el.w * RAD, el.i * RAD, el.om * RAD];
  const x1 = q.x * Math.cos(w) - q.y * Math.sin(w);
  const y1 = q.x * Math.sin(w) + q.y * Math.cos(w);
  const y2 = y1 * Math.cos(i);
  return {
    x: x1 * Math.cos(om) - y2 * Math.sin(om),
    y: x1 * Math.sin(om) + y2 * Math.cos(om),
    z: y1 * Math.sin(i),
  };
}

interface Event {
  label: string;
  body: Exclude<PlanetId, 'pluto'> | keyof typeof SMALL;
  utc: string;
  /** Full turns around the Sun on the leg INTO this event, beyond the direct angle between the
   *  two positions (Rosetta's one-year Earth-to-Earth orbit: 1). The single-revolution Lambert
   *  solver cannot represent those; the leg is then a Kepler ellipse fitted by `multiRevLeg`. */
  revs?: number;
  /** Put the label beside the dot instead of away from the Sun (a dot at a panel edge). */
  tag?: 'left' | 'right';
  /** The leg INTO this event rides along the same body's orbit (Dawn in orbit around Vesta). */
  ride?: boolean;
  /** The leg INTO this event was flown on ion thrust: no conic fits it, so it is drawn as a
   *  spiral with the radius changing evenly with angle (plus `revs` full turns). Schematic. */
  spiral?: boolean;
}

/**
 * A prograde Kepler ellipse from (r1, θ1) sweeping `revs` full turns plus the direct angle to
 * (r2, θ2) in `tof` days. The semi-major axis follows from the mean angular rate (the period is
 * the flight time over the turns swept); the eccentricity and perihelion direction are searched
 * so the ellipse passes through both radii. Sampled by angle, which is all a plan view needs.
 */
function multiRevLeg(r1: number, t1: number, r2: number, t2: number, revs: number, tof: number) {
  let d = t2 - t1;
  d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sweep = 2 * Math.PI * revs + d;
  const period = (tof * 2 * Math.PI) / sweep;
  const a = Math.pow(period / 365.25, 2 / 3);
  let best = { err: Infinity, e: 0, wp: 0 };
  for (let ie = 0; ie <= 400; ie++) {
    const e = (ie / 400) * 0.6;
    const p = a * (1 - e * e);
    for (let iw = 0; iw < 720; iw++) {
      const wp = (iw / 720) * 2 * Math.PI;
      const ra = p / (1 + e * Math.cos(t1 - wp));
      const rb = p / (1 + e * Math.cos(t1 + sweep - wp));
      const err = Math.abs(ra - r1) + Math.abs(rb - r2);
      // Many ellipses of this period pass both points; the least eccentric that fits is the
      // physical one (JUICE's Earth → Venus leg otherwise dipped to 0.37 AU).
      const fits = err < 0.01;
      const bestFits = best.err < 0.01;
      if (fits ? !bestFits || e < best.e : !bestFits && err < best.err) best = { err, e, wp };
    }
  }
  const p = a * (1 - best.e * best.e);
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k <= 600; k++) {
    const t = t1 + (sweep * k) / 600;
    const r = p / (1 + best.e * Math.cos(t - best.wp));
    pts.push({ x: r * Math.cos(t), y: r * Math.sin(t) });
  }
  return { pts, a, e: best.e, err: best.err, q: a * (1 - best.e), Q: a * (1 + best.e) };
}
interface Mission {
  events: Event[];
  orbits: PlanetId[];
  /** After the last event: 'escape' runs the path on, dashed; 'orbit' ends it there; 'stop'
   *  draws nothing (a slow escape that curves away, which a straight line would misstate). */
  end?: 'escape' | 'orbit' | 'stop';
  /** Title of the wide bottom-centre panel (its right half when there is a detail). */
  bottom?: string;
  /** A true-scale detail of the inner cruise, out to `maxAu`. */
  detail?: { title: string; maxAu: number };
  /** Small-body orbits drawn dashed (the target comet). */
  smallOrbits?: (keyof typeof SMALL)[];
  /** Main-view distance law: √r (default) spreads the outer planets; linear suits a mission
   *  that stays near 1 AU. */
  scale?: 'sqrt' | 'linear';
  /** Title of the right-hand panel F when the mission has no gravity assist. */
  f?: string;
}
const MISSIONS: Record<string, Mission> = {
  // Wikipedia "Jupiter Icy Moons Explorer": launch 12:14:36 UTC; flyby times UTC; Earth 3 and
  // Jupiter arrival are planned (Earth 3 date only, Jupiter as in our data).
  juice: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2023-04-14T12:14:36Z' },
      { label: 'MOON + EARTH', body: 'earth', utc: '2024-08-20T21:57:00Z', revs: 1 },
      { label: 'VENUS', body: 'venus', utc: '2025-08-31T05:28:00Z', revs: 1 },
      { label: 'EARTH 2', body: 'earth', utc: '2026-09-28T11:45:00Z' },
      { label: 'EARTH 3', body: 'earth', utc: '2029-01-18T12:00:00Z', revs: 1 },
      { label: 'JUPITER · ARRIVAL', body: 'jupiter', utc: '2031-07-21T12:00:00Z', tag: 'right' },
    ],
    orbits: ['venus', 'earth', 'mars', 'jupiter'],
    end: 'orbit',
    bottom: 'J. AT JUPITER · INTO ORBIT AROUND GANYMEDE',
    detail: { title: 'E. INNER CRUISE · TRUE SCALE', maxAu: 2.2 },
  },
  // Wikipedia "Pioneer 10": launch 01:49 UTC; Jupiter closest approach 3 Dec 1973 (noon).
  'pioneer-10': {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1972-03-03T01:49:00Z' },
      { label: 'JUPITER', body: 'jupiter', utc: '1973-12-03T12:00:00Z' },
    ],
    orbits: ['earth', 'mars', 'jupiter', 'saturn'],
    end: 'stop',
    bottom: 'E. AT JUPITER · 132,252 KM',
  },
  // Wikipedia "Giotto (spacecraft)": launch 11:23 UTC; encounter and flyby dates (Halley at 00:00).
  giotto: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1985-07-02T11:23:00Z' },
      { label: 'HALLEY', body: 'halley', utc: '1986-03-14T00:00:00Z' },
      { label: 'EARTH · FLYBY', body: 'earth', utc: '1990-07-02T12:00:00Z', revs: 5 },
      { label: 'GRIGG–SKJELLERUP', body: 'grigg-skjellerup', utc: '1992-07-10T12:00:00Z', revs: 1, tag: 'right' },
    ],
    orbits: ['venus', 'earth', 'mars'],
    scale: 'linear',
    end: 'orbit',
    bottom: 'E. AT HALLEY · 596 KM FROM THE NUCLEUS',
  },
  // Wikipedia "BepiColombo": launch 01:45 UTC; flyby dates (noon); insertion planned 21 Nov 2026.
  // The loops between Mercury flybys are resonant orbits we have no data for: drawn along Mercury's.
  bepicolombo: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2018-10-20T01:45:00Z' },
      { label: 'EARTH · FLYBY', body: 'earth', utc: '2020-04-10T12:00:00Z', revs: 1 },
      { label: 'VENUS 1', body: 'venus', utc: '2020-10-15T12:00:00Z' },
      { label: 'VENUS 2', body: 'venus', utc: '2021-08-10T12:00:00Z', revs: 1 },
      { label: 'MERCURY 1', body: 'mercury', utc: '2021-10-01T12:00:00Z' },
      { label: 'MERCURY 6', body: 'mercury', utc: '2025-01-08T12:00:00Z', ride: true, tag: 'right' },
    ],
    orbits: ['mercury', 'venus', 'earth', 'mars'],
    scale: 'linear',
    end: 'orbit',
    bottom: 'E. AT MERCURY · TWO ORBITERS',
  },
  // Wikipedia "Juno (spacecraft)": launch 16:25 UTC, Jupiter arrival 03:53 UTC; Earth flyby (noon).
  juno: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2011-08-05T16:25:00Z' },
      { label: 'EARTH · FLYBY', body: 'earth', utc: '2013-10-09T12:00:00Z', revs: 1 },
      { label: 'JUPITER · ORBIT INSERTION', body: 'jupiter', utc: '2016-07-05T03:53:00Z', tag: 'right' },
    ],
    orbits: ['earth', 'mars', 'jupiter'],
    end: 'orbit',
    bottom: 'E. AT JUPITER · OVER THE POLES',
  },
  // Wikipedia "Hayabusa2": launch 04:22:04 UTC, capsule release 05:30 UTC; other dates (noon).
  hayabusa2: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2014-12-03T04:22:04Z', tag: 'left' },
      { label: 'SWING-BY', body: 'earth', utc: '2015-12-03T12:00:00Z', revs: 1 },
      { label: 'RYUGU · ARRIVAL', body: 'ryugu', utc: '2018-06-27T12:00:00Z', revs: 2 },
      { label: 'RYUGU · DEPARTURE', body: 'ryugu', utc: '2019-11-13T12:00:00Z', ride: true },
      { label: 'CAPSULE RETURN', body: 'earth', utc: '2020-12-05T05:30:00Z', spiral: true },
    ],
    orbits: ['venus', 'earth', 'mars'],
    smallOrbits: ['ryugu'],
    scale: 'linear',
    bottom: 'E. AT RYUGU · TOUCH AND GO',
  },
  // Wikipedia "Dawn (spacecraft)": launch 11:34 UTC; flyby, arrival and departure dates (noon).
  dawn: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2007-09-27T11:34:00Z' },
      { label: 'MARS', body: 'mars', utc: '2009-02-17T12:00:00Z', tag: 'left' },
      { label: 'VESTA · ARRIVAL', body: 'vesta', utc: '2011-07-16T12:00:00Z', revs: 1, spiral: true },
      { label: 'VESTA · DEPARTURE', body: 'vesta', utc: '2012-09-05T12:00:00Z', ride: true },
      { label: 'CERES · ARRIVAL', body: 'ceres', utc: '2015-03-06T12:00:00Z', spiral: true },
    ],
    orbits: ['earth', 'mars', 'jupiter'],
    smallOrbits: ['vesta', 'ceres'],
    end: 'orbit',
    bottom: 'E. TWO WORLDS · VESTA AND CERES',
  },
  // Wikipedia "Galileo project": launch 16:53:40 UTC, probe entry 22:04 UTC; flyby dates (noon).
  galileo: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1989-10-18T16:53:40Z' },
      { label: 'VENUS', body: 'venus', utc: '1990-02-10T12:00:00Z' },
      { label: 'EARTH 1', body: 'earth', utc: '1990-12-08T12:00:00Z' },
      { label: 'GASPRA', body: 'gaspra', utc: '1991-10-29T12:00:00Z', tag: 'right' },
      { label: 'EARTH 2', body: 'earth', utc: '1992-12-08T12:00:00Z' },
      { label: 'IDA', body: 'ida', utc: '1993-08-28T12:00:00Z', tag: 'right' },
      { label: 'JUPITER · ARRIVAL', body: 'jupiter', utc: '1995-12-07T22:04:00Z', tag: 'right' },
    ],
    orbits: ['venus', 'earth', 'mars', 'jupiter'],
    end: 'orbit',
    bottom: 'J. AT JUPITER · PROBE ENTRY 7 DEC 1995',
    detail: { title: 'E. INNER CRUISE · TRUE SCALE', maxAu: 3.0 },
  },
  // Wikipedia "Venera 13": launch 06:04 UTC, lander touchdown 03:57:21 UTC.
  'venera-13': {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1981-10-30T06:04:00Z' },
      { label: 'VENUS · LANDING', body: 'venus', utc: '1982-03-01T03:57:21Z' },
    ],
    orbits: ['venus', 'earth', 'mars'],
    end: 'orbit',
    bottom: 'E. DESCENT AND LANDING · 1 MARCH 1982',
    f: 'F. ENTRY AND DESCENT PROFILE',
  },
  // Wikipedia "New Horizons": launch 19:00 UTC, Pluto 11:49:57 UTC, Arrokoth 05:33 UTC.
  'new-horizons': {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2006-01-19T19:00:00Z' },
      { label: 'JUPITER', body: 'jupiter', utc: '2007-02-28T05:43:00Z' },
      { label: 'PLUTO', body: 'pluto', utc: '2015-07-14T11:49:57Z' },
      { label: 'ARROKOTH', body: 'arrokoth', utc: '2019-01-01T05:33:00Z' },
    ],
    orbits: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'],
    smallOrbits: ['pluto', 'arrokoth'],
    bottom: 'E. AT PLUTO · 14 JULY 2015',
  },
  // ESA + Wikipedia "Rosetta (spacecraft)": launch 07:17:51 UTC; flyby and arrival dates.
  rosetta: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '2004-03-02T07:17:51Z' },
      { label: 'EARTH 1', body: 'earth', utc: '2005-03-04T12:00:00Z', revs: 1 },
      { label: 'MARS', body: 'mars', utc: '2007-02-25T12:00:00Z', revs: 1 },
      { label: 'EARTH 2', body: 'earth', utc: '2007-11-13T12:00:00Z' },
      { label: 'ŠTEINS', body: 'steins', utc: '2008-09-05T12:00:00Z' },
      { label: 'EARTH 3', body: 'earth', utc: '2009-11-13T12:00:00Z' },
      { label: 'LUTETIA', body: 'lutetia', utc: '2010-07-10T12:00:00Z' },
      { label: '67P · ARRIVAL', body: '67p', utc: '2014-08-06T12:00:00Z' },
    ],
    orbits: ['earth', 'mars', 'jupiter'],
    smallOrbits: ['67p'],
    end: 'orbit',
    bottom: 'J. AT THE COMET · PHILAE LANDING',
    detail: { title: 'E. INNER CRUISE · TRUE SCALE', maxAu: 2.8 },
  },
  // Wikipedia "Cassini–Huygens": flyby dates; launch, Earth flyby and SOI times UTC.
  cassini: {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1997-10-15T08:43:00Z' },
      { label: 'VENUS 1', body: 'venus', utc: '1998-04-26T12:00:00Z' },
      { label: 'VENUS 2', body: 'venus', utc: '1999-06-24T12:00:00Z' },
      { label: 'EARTH', body: 'earth', utc: '1999-08-18T03:28:00Z' },
      { label: 'JUPITER', body: 'jupiter', utc: '2000-12-30T12:00:00Z' },
      { label: 'SATURN · ORBIT INSERTION', body: 'saturn', utc: '2004-07-01T02:48:00Z' },
    ],
    orbits: ['venus', 'earth', 'jupiter', 'saturn'],
    end: 'orbit',
    bottom: 'J. SATURN ARRIVAL · HUYGENS TO TITAN',
    detail: { title: 'E. INNER CRUISE · TRUE SCALE', maxAu: 1.75 },
  },
  // Wikipedia "Voyager 2": encounter times UTC.
  'voyager-2': {
    events: [
      { label: 'EARTH · LAUNCH', body: 'earth', utc: '1977-08-20T14:29:00Z' },
      { label: 'JUPITER', body: 'jupiter', utc: '1979-07-09T22:29:00Z' },
      { label: 'SATURN', body: 'saturn', utc: '1981-08-26T03:24:00Z' },
      { label: 'URANUS', body: 'uranus', utc: '1986-01-24T17:59:00Z' },
      { label: 'NEPTUNE', body: 'neptune', utc: '1989-08-25T03:56:00Z' },
    ],
    orbits: ['earth', 'jupiter', 'saturn', 'uranus', 'neptune'],
  },
};
const MEAN_AU: Partial<Record<PlanetId, number>> = {
  mercury: 0.387,
  venus: 0.723,
  mars: 1.524,
  earth: 1,
  jupiter: 5.2,
  saturn: 9.58,
  uranus: 19.2,
  neptune: 30.1,
};

const [id, out] = process.argv.slice(2);
const m = MISSIONS[id ?? ''];
if (!m || !out) {
  console.error(`usage: blueprint-plan-view.ts <${Object.keys(MISSIONS).join('|')}> <out.png>`);
  process.exit(2);
}

// Sheet 3504 x 2336 (the 4K 3:2 render size). Dashboard: centre-top plan view, side columns,
// bottom strip.
const W = 3504;
const H = 2336;
const SIDE = 720;
const BOTTOM = m.detail ? 700 : 560;
const MID = W - 2 * SIDE;
const DET = m.detail ? { x: SIDE, y: H - BOTTOM, w: MID / 2, h: BOTTOM } : null;
const PANELS = [
  { t: 'B. LAUNCH VEHICLE', x: 0, y: 0, w: SIDE, h: 1100 },
  { t: 'C. LAUNCH SEQUENCE', x: 0, y: 1100, w: SIDE, h: H - BOTTOM - 1100 },
  { t: 'G. ENCOUNTER TABLE', x: 0, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: 'D. SPACECRAFT', x: W - SIDE, y: 0, w: SIDE, h: 900 },
  { t: m.f ?? 'F. GRAVITY ASSIST', x: W - SIDE, y: 900, w: SIDE, h: 440 },
  { t: 'H. EQUATIONS', x: W - SIDE, y: 1340, w: SIDE, h: H - BOTTOM - 1340 },
  { t: 'I. MISSION BRIEF · TITLE BLOCK', x: W - SIDE, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  ...(DET
    ? [
        { t: m.detail!.title, ...DET },
        {
          t: m.bottom ?? 'E. SIDE ELEVATION',
          x: SIDE + MID / 2,
          y: H - BOTTOM,
          w: MID / 2,
          h: BOTTOM,
        },
      ]
    : [{ t: m.bottom ?? 'E. SIDE ELEVATION', x: SIDE, y: H - BOTTOM, w: MID, h: BOTTOM }]),
];
const A = { x: SIDE, y: 0, w: MID, h: H - BOTTOM };

type P = { x: number; y: number };
/** Projects ecliptic AU onto one panel: centre, pixels at rMaxAu, and the radial law. */
function projector(c: P, Rpx: number, rMaxAu: number, law: 'sqrt' | 'linear') {
  const r = (au: number) => (law === 'sqrt' ? Math.sqrt(au / rMaxAu) : au / rMaxAu) * Rpx;
  return {
    c,
    Rpx,
    r,
    // ecliptic x → right, y → up (seen from ecliptic north: counter-clockwise on screen)
    pt: (x: number, y: number): P => {
      const s = r(Math.hypot(x, y));
      const a = Math.atan2(y, x);
      return { x: c.x + s * Math.cos(a), y: c.y - s * Math.sin(a) };
    },
  };
}
type Proj = ReturnType<typeof projector>;

const pos = m.events.map((e) => {
  const jd = julianDay(new Date(e.utc));
  const p = e.body in SMALL ? smallBody(SMALL[e.body]!, jd) : heliocentric(e.body as PlanetId, jd);
  return { ...e, p, jd };
});

// Cruise legs as sampled Lambert conics, in AU. conic-leg works in the x–z plane: ecliptic y → z.
const path: P[] = [];
for (let i = 0; i < pos.length - 1; i++) {
  const a = pos[i]!;
  const b = pos[i + 1]!;
  const tof = b.jd - a.jd;
  if (b.ride) {
    for (let k = 0; k <= 300; k++) {
      const jd = a.jd + (tof * k) / 300;
      const q = b.body in SMALL ? smallBody(SMALL[b.body]!, jd) : heliocentric(b.body as PlanetId, jd);
      path.push({ x: q.x, y: q.y });
    }
    continue;
  }
  if (b.spiral) {
    const r1 = Math.hypot(a.p.x, a.p.y);
    const r2 = Math.hypot(b.p.x, b.p.y);
    const t1 = Math.atan2(a.p.y, a.p.x);
    let d = Math.atan2(b.p.y, b.p.x) - t1;
    d = ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sweep = 2 * Math.PI * (b.revs ?? 0) + d;
    for (let k = 0; k <= 600; k++) {
      const u = k / 600;
      const r = r1 + (r2 - r1) * u;
      path.push({ x: r * Math.cos(t1 + sweep * u), y: r * Math.sin(t1 + sweep * u) });
    }
    continue;
  }
  if (b.revs) {
    const leg = multiRevLeg(
      Math.hypot(a.p.x, a.p.y),
      Math.atan2(a.p.y, a.p.x),
      Math.hypot(b.p.x, b.p.y),
      Math.atan2(b.p.y, b.p.x),
      b.revs,
      tof,
    );
    console.log(
      `${a.label} → ${b.label}: ${b.revs} extra turn(s), a ${leg.a.toFixed(2)} AU, e ${leg.e.toFixed(3)}, ${leg.q.toFixed(2)}–${leg.Q.toFixed(2)} AU, fit error ${leg.err.toFixed(3)} AU`,
    );
    path.push(...leg.pts);
    continue;
  }
  const leg = lambertLeg({ x: a.p.x, z: a.p.y }, { x: b.p.x, z: b.p.y }, tof, 5e-3);
  if (!leg) throw new Error(`no Lambert leg ${a.label} → ${b.label}`);
  for (let k = 0; k <= 300; k++) {
    const q = leg((tof * k) / 300);
    path.push({ x: q.x, y: q.z });
  }
}
const lonOf = (p: P) => (((Math.atan2(p.y, p.x) * 180) / Math.PI + 360) % 360).toFixed(0);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (pts: P[]) => pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

/** One plan view: orbits, path (cut at `clip` AU), equinox line, events (unlabelled in `quiet`). */
function planView(pr: Proj, orbits: PlanetId[], clip: number, quiet: Set<number>, fs: number) {
  const { c, Rpx } = pr;
  // Split the path where it leaves the clip radius, so a cut path never jumps across the panel.
  const runs: P[][] = [[]];
  for (const q of path) {
    if (Math.hypot(q.x, q.y) <= clip) runs.at(-1)!.push(pr.pt(q.x, q.y));
    else if (runs.at(-1)!.length) runs.push([]);
  }
  const g: string[] = [`<g fill="none" stroke="#e8eeff" stroke-width="3">`];
  for (const o of orbits)
    g.push(`<circle cx="${c.x}" cy="${c.y}" r="${pr.r(MEAN_AU[o]!)}" stroke-width="2"/>`);
  // Target small bodies: their orbit as a dashed ellipse (true shape, sampled from the elements).
  for (const s of m.smallOrbits ?? []) {
    const el = SMALL[s]!;
    const period = 365.25 * Math.pow(el.a, 1.5);
    // Split where the orbit leaves the clip radius, so the visible arcs never join across.
    const arcs: P[][] = [[]];
    for (let k = 0; k <= 360; k++) {
      const q = smallBody(el, el.epoch + (period * k) / 360);
      if (Math.hypot(q.x, q.y) <= clip) arcs.at(-1)!.push(pr.pt(q.x, q.y));
      else if (arcs.at(-1)!.length) arcs.push([]);
    }
    for (const arc of arcs)
      if (arc.length > 1)
        g.push(`<polyline points="${fmt(arc)}" stroke-width="2" stroke-dasharray="10 8"/>`);
  }
  g.push(
    `<line x1="${c.x}" y1="${c.y}" x2="${c.x + Rpx + 30}" y2="${c.y}" stroke-width="2" stroke-dasharray="14 10"/>`,
  );
  for (const run of runs)
    if (run.length > 1)
      g.push(`<polyline points="${fmt(run)}" stroke-width="${fs > 30 ? 9 : 6}"/>`);
  if (clip === Infinity) {
    const end = runs.at(-1)!;
    const last = end.at(-1)!;
    const pv = end.at(-8)!;
    if (m.end === 'stop') {
      // nothing past the last event
    } else if (m.end === 'orbit')
      g.push(
        `<circle cx="${last.x}" cy="${last.y}" r="46" stroke-width="4" stroke-dasharray="10 8"/>`,
      );
    else {
      const u = Math.hypot(last.x - pv.x, last.y - pv.y);
      const ex = last.x + ((last.x - pv.x) / u) * 260;
      const ey = last.y + ((last.y - pv.y) / u) * 260;
      g.push(
        `<line x1="${last.x}" y1="${last.y}" x2="${ex}" y2="${ey}" stroke-width="9" stroke-dasharray="26 14"/>`,
      );
    }
  }
  g.push(`</g><circle cx="${c.x}" cy="${c.y}" r="${fs > 30 ? 26 : 16}" fill="#e8eeff"/>`);
  g.push(
    `<g font-family="sans-serif" font-size="${fs}" fill="#e8eeff"><text x="${c.x + Rpx + 36}" y="${c.y + fs / 3}">♈ 0°</text>`,
  );
  // Events drawn at the same spot (Rosetta's launch and Earth 1; Earth 2 and 3) share one label.
  const shown = pos.flatMap((e, i) =>
    Math.hypot(e.p.x, e.p.y) <= clip && !quiet.has(i) ? [{ i, q: pr.pt(e.p.x, e.p.y) }] : [],
  );
  const labelOf = new Map<number, string>();
  for (const s of shown) {
    const host = shown.find(
      (o) => o.i < s.i && Math.hypot(o.q.x - s.q.x, o.q.y - s.q.y) < fs * 1.2,
    );
    const text = `${pos[s.i]!.label} · λ ${lonOf(pos[s.i]!.p)}°`;
    if (host) labelOf.set(host.i, `${labelOf.get(host.i)} / ${text}`);
    else labelOf.set(s.i, text);
  }
  pos.forEach((e, i) => {
    if (Math.hypot(e.p.x, e.p.y) > clip) return;
    const q = pr.pt(e.p.x, e.p.y);
    g.push(
      `<circle cx="${q.x}" cy="${q.y}" r="${e.body === 'earth' ? fs / 3 : fs / 1.8}" fill="#e8eeff"/>`,
    );
    // Labels point away from the Sun, so neighbouring events on one orbit do not collide.
    const out = e.tag === 'right' ? 0 : e.tag === 'left' ? Math.PI : Math.atan2(q.y - c.y, q.x - c.x);
    const lx = q.x + Math.cos(out) * fs * 1.4;
    const ly = q.y + Math.sin(out) * fs * 1.4 + fs / 3;
    const anchor = Math.cos(out) < -0.2 ? 'end' : Math.cos(out) > 0.2 ? 'start' : 'middle';
    if (labelOf.has(i))
      g.push(`<text x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(labelOf.get(i)!)}</text>`);
  });
  g.push('</g>');
  return g.join('\n');
}

const mainP = projector(
  { x: A.x + A.w / 2, y: A.y + A.h / 2 + 20 },
  Math.min(A.w, A.h) / 2 - 90,
  Math.max(
    ...m.orbits.map((o) => MEAN_AU[o]!),
    ...(m.smallOrbits ?? []).map((s) => SMALL[s]!.a * (1 + SMALL[s]!.e)),
  ),
  m.scale ?? 'sqrt',
);
const inner = new Set(
  m.detail ? pos.flatMap((e, i) => (Math.hypot(e.p.x, e.p.y) <= m.detail!.maxAu ? [i] : [])) : [],
);
const parts = [planView(mainP, m.orbits, Infinity, inner, 40)];
if (DET) {
  // Fit the inner path and the inner orbits' circles to the panel (true scale, Sun off-centre).
  const maxAu = m.detail!.maxAu;
  const inPts = path.filter((q) => Math.hypot(q.x, q.y) <= maxAu);
  const ro = Math.max(...m.orbits.map((o) => MEAN_AU[o]!).filter((r) => r <= maxAu));
  const xs = [...inPts.map((q) => q.x), -ro, ro];
  const ys = [...inPts.map((q) => q.y), -ro, ro];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((DET.w - 160) / (x1 - x0), (DET.h - 190) / (y1 - y0));
  const sun = {
    x: DET.x + DET.w / 2 - ((x0 + x1) / 2) * k,
    y: DET.y + 110 + (DET.h - 150) / 2 + ((y0 + y1) / 2) * k,
  };
  const dP = projector(sun, maxAu * k, maxAu, 'linear');
  const innerOrbits = m.orbits.filter((o) => MEAN_AU[o]! <= m.detail!.maxAu);
  parts.push(planView(dP, innerOrbits, m.detail!.maxAu, new Set(), 28));
  parts.push(
    `<text x="${mainP.c.x - 230}" y="${mainP.c.y + mainP.r(m.detail!.maxAu) + 70}" font-family="sans-serif" font-size="34" fill="#e8eeff">INNER LOOPS: SEE ${esc(m.detail!.title.split('.')[0]!)}</text>`,
  );
}

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#14205c"/>`,
  `<g fill="none" stroke="#e8eeff" stroke-width="3">`,
  ...[...PANELS, A].map(
    (p) => `<rect x="${p.x + 14}" y="${p.y + 14}" width="${p.w - 28}" height="${p.h - 28}"/>`,
  ),
  `</g>`,
  ...parts,
  `<g font-family="sans-serif" font-size="40" fill="#e8eeff">`,
  ...PANELS.map((p) => `<text x="${p.x + 40}" y="${p.y + 70}">${esc(p.t)}</text>`),
  `<text x="${A.x + 40}" y="${A.y + 70}">A. MAIN VIEW — PLAN VIEW OF THE ECLIPTIC</text>`,
  `</g></svg>`,
].join('\n');

await sharp(Buffer.from(svg)).png().toFile(out);
for (const e of pos)
  console.log(
    `${e.label.padEnd(26)} ${e.utc}  λ ${lonOf(e.p)}°  r ${Math.hypot(e.p.x, e.p.y).toFixed(2)} AU`,
  );
console.log(
  `wrote ${out} (${W}x${H}); plan view ${A.w}x${A.h}, distance ∝ ${m.scale === 'linear' ? 'r' : '√r'}${DET ? `; detail true scale to ${m.detail!.maxAu} AU` : ''}`,
);
