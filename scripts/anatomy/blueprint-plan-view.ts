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
import { heliocentric, julianDay, type PlanetId } from '../../src/lib/physics/ephemeris';
import { lambertLeg } from '../lib/conic-leg';

interface Event {
  label: string;
  body: Exclude<PlanetId, 'mercury' | 'pluto'>;
  utc: string;
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
}
const MISSIONS: Record<string, Mission> = {
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
  { t: 'I. NOTES · TITLE BLOCK', x: W - SIDE, y: H - BOTTOM, w: SIDE, h: BOTTOM },
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
  return { ...e, p: heliocentric(e.body as PlanetId, jd), jd };
});

// Cruise legs as sampled Lambert conics, in AU. conic-leg works in the x–z plane: ecliptic y → z.
const path: P[] = [];
for (let i = 0; i < pos.length - 1; i++) {
  const a = pos[i]!;
  const b = pos[i + 1]!;
  const tof = b.jd - a.jd;
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
    if (!quiet.has(i))
      g.push(
        `<text x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(e.label)} · λ ${lonOf(e.p)}°</text>`,
      );
  });
  g.push('</g>');
  return g.join('\n');
}

const mainP = projector(
  { x: A.x + A.w / 2, y: A.y + A.h / 2 + 20 },
  Math.min(A.w, A.h) / 2 - 90,
  Math.max(...m.orbits.map((o) => MEAN_AU[o]!)),
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
