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
  body: Exclude<PlanetId, 'mercury' | 'pluto'> | keyof typeof SMALL;
  utc: string;
  /** Full turns around the Sun on the leg INTO this event, beyond the direct angle between the
   *  two positions (Rosetta's one-year Earth-to-Earth orbit: 1). The single-revolution Lambert
   *  solver cannot represent those; the leg is then a Kepler ellipse fitted by `multiRevLeg`. */
  revs?: number;
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
      if (err < best.err) best = { err, e, wp };
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
  /** After the last event: 'escape' runs the path on, dashed; 'orbit' ends it there. */
  end?: 'escape' | 'orbit';
  /** Title of the wide bottom-centre panel (its right half when there is a detail). */
  bottom?: string;
  /** A true-scale detail of the inner cruise, out to `maxAu`. */
  detail?: { title: string; maxAu: number };
  /** Small-body orbits drawn dashed (the target comet). */
  smallOrbits?: (keyof typeof SMALL)[];
}
const MISSIONS: Record<string, Mission> = {
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
  { t: 'F. GRAVITY ASSIST', x: W - SIDE, y: 900, w: SIDE, h: 440 },
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
    if (m.end === 'orbit')
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
    const out = Math.atan2(q.y - c.y, q.x - c.x);
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
  'sqrt',
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
  `wrote ${out} (${W}x${H}); plan view ${A.w}x${A.h}, distance ∝ √r${DET ? `; detail true scale to ${m.detail!.maxAu} AU` : ''}`,
);
