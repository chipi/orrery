#!/usr/bin/env tsx
/**
 * Mission blueprints (#641), out-of-ecliptic missions (Ulysses): the reference sheet whose hero is
 * the SIDE view — the ecliptic edge-on as a horizontal line, the Sun at the centre, the spacecraft's
 * orbit climbing over the Sun's poles. Same dashboard as blueprint-plan-view.ts.
 *
 *   npx tsx scripts/anatomy/blueprint-polar-view.ts <mission> <out.png>
 *
 * Geometry, all from sourced facts: the Earth → Jupiter leg is the prograde Lambert conic between
 * the two real positions (site ephemeris, scripts/lib/conic-leg.ts). The flyby happened at the
 * post-Jupiter orbit's aphelion (Jupiter was 5.4 AU out; the published aphelion is 5.40 AU), so
 * that orbit's major axis is the Sun–Jupiter line, it lies tilted `inclDeg` about that line, has
 * the published perihelion, and heads south first (the first polar pass was over the south pole).
 * View: from the side, perpendicular to the Sun–Jupiter line; x = distance along it, y = height
 * above the ecliptic, both true scale in AU. The plan-view detail shows the same flight from above.
 */
import sharp from 'sharp';
import { heliocentric, julianDay } from '../../src/lib/physics/ephemeris';
import { lambertLeg } from '../lib/conic-leg';

const MISSIONS: Record<
  string,
  {
    launch: string;
    flyby: string;
    inclDeg: number;
    periAu: number;
    apoAu: number;
    marks: { label: string; E: number }[];
  }
> = {
  // Wikipedia "Ulysses (spacecraft)": launch 6 Oct 1990, Jupiter 8 Feb 1992, i 79.11°, q 1.35 AU, Q 5.40 AU.
  ulysses: {
    launch: '1990-10-06T11:47:16Z',
    flyby: '1992-02-08T12:02:00Z',
    inclDeg: 79.11,
    periAu: 1.35,
    apoAu: 5.4,
  },
};
const [id, out] = process.argv.slice(2);
const m = MISSIONS[id ?? ''];
if (!m || !out) {
  console.error(`usage: blueprint-polar-view.ts <${Object.keys(MISSIONS).join('|')}> <out.png>`);
  process.exit(2);
}

type V = { x: number; y: number; z: number };
const jdL = julianDay(new Date(m.launch));
const jdJ = julianDay(new Date(m.flyby));
const earth = heliocentric('earth', jdL);
const jup = heliocentric('jupiter', jdJ);
const rJ = Math.hypot(jup.x, jup.y);
const u = { x: jup.x / rJ, y: jup.y / rJ, z: 0 }; // Sun → Jupiter, in the ecliptic
const t = { x: -u.y, y: u.x, z: 0 }; // prograde in-ecliptic direction at Jupiter
const inc = (m.inclDeg * Math.PI) / 180;
// q̂ chosen so that just after aphelion the orbit goes south.
const q = { x: Math.cos(inc) * t.x, y: Math.cos(inc) * t.y, z: Math.sin(inc) };
const a = (m.periAu + m.apoAu) / 2;
const e = (m.apoAu - m.periAu) / (m.apoAu + m.periAu);
const b = a * Math.sqrt(1 - e * e);
/** Post-Jupiter orbit at eccentric anomaly E: perihelion direction is −û. */
const orbit = (E: number): V => {
  const px = a * (Math.cos(E) - e);
  const py = b * Math.sin(E);
  return { x: -px * u.x + py * q.x, y: -px * u.y + py * q.y, z: py * q.z };
};
const leg = lambertLeg({ x: earth.x, z: earth.y }, { x: jup.x, z: jup.y }, jdJ - jdL, 5e-3);
if (!leg) throw new Error('no Lambert leg Earth → Jupiter');
const cruise: V[] = Array.from({ length: 301 }, (_, k) => {
  const p = leg(((jdJ - jdL) * k) / 300);
  return { x: p.x, y: p.z, z: 0 };
});
const ring: V[] = Array.from({ length: 721 }, (_, k) => orbit((2 * Math.PI * k) / 720));
const along = (v: V) => v.x * u.x + v.y * u.y;
// The polar passes are where the orbit reaches its highest ecliptic latitude, south and north.
const lat = (E: number) => {
  const v = orbit(E);
  return (Math.asin(v.z / Math.hypot(v.x, v.y, v.z)) * 180) / Math.PI;
};
const scan = Array.from({ length: 3601 }, (_, i) => (2 * Math.PI * i) / 3600);
const Es = scan.reduce((best, E) => (lat(E) < lat(best) ? E : best), 0);
const En = scan.reduce((best, E) => (lat(E) > lat(best) ? E : best), 0);
const marks = [
  { label: `SOUTH POLAR PASS · ${Math.abs(lat(Es)).toFixed(0)}°S`, E: Es },
  { label: `PERIHELION ${m.periAu} AU`, E: 0 },
  { label: `NORTH POLAR PASS · ${lat(En).toFixed(0)}°N`, E: En },
];

const W = 3504;
const H = 2336;
const SIDE = 720;
const BOTTOM = 700;
const MID = W - 2 * SIDE;
const PANELS = [
  { t: 'B. LAUNCH VEHICLE', x: 0, y: 0, w: SIDE, h: 1100 },
  { t: 'C. LAUNCH SEQUENCE', x: 0, y: 1100, w: SIDE, h: H - BOTTOM - 1100 },
  { t: 'G. EVENT TABLE', x: 0, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: 'D. SPACECRAFT', x: W - SIDE, y: 0, w: SIDE, h: 900 },
  { t: 'F. GRAVITY ASSIST · PLANE CHANGE', x: W - SIDE, y: 900, w: SIDE, h: 440 },
  { t: 'H. EQUATIONS', x: W - SIDE, y: 1340, w: SIDE, h: H - BOTTOM - 1340 },
  { t: 'I. MISSION BRIEF · TITLE BLOCK', x: W - SIDE, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: 'E. PLAN VIEW · FROM ABOVE THE ECLIPTIC', x: SIDE, y: H - BOTTOM, w: MID / 2, h: BOTTOM },
  {
    t: 'J. THE SUN’S POLES · WHAT ULYSSES SAW',
    x: SIDE + MID / 2,
    y: H - BOTTOM,
    w: MID / 2,
    h: BOTTOM,
  },
];
const A = { x: SIDE, y: 0, w: MID, h: H - BOTTOM };
type P = { x: number; y: number };
const fmt = (pts: P[]) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Side view fit: x from −5.6 to +5.6 AU along û, y from the orbit's lowest to highest z.
const zs = ring.map((v) => v.z);
const k = Math.min((A.w - 260) / 11.6, (A.h - 260) / (Math.max(...zs) - Math.min(...zs) + 0.6));
const c = {
  x: A.x + A.w / 2,
  y: A.y + 130 + (A.h - 220) / 2 - ((Math.max(...zs) + Math.min(...zs)) / 2) * k,
};
const side = (v: V): P => ({ x: c.x + along(v) * k, y: c.y - v.z * k });
// Plan view fit in the detail panel: everything within 5.6 AU of the Sun, true scale.
const D = PANELS[7]!;
const kd = (D.h - 190) / 11.6;
const dc = { x: D.x + D.w / 2, y: D.y + 110 + (D.h - 150) / 2 };
const plan = (v: V): P => ({ x: dc.x + v.x * kd, y: dc.y - v.y * kd });
const circle = (cc: P, r: number) =>
  `<circle cx="${cc.x}" cy="${cc.y}" r="${r}" fill="none" stroke="#e8eeff" stroke-width="2"/>`;

const g: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#14205c"/>`,
  `<g fill="none" stroke="#e8eeff" stroke-width="3">`,
  ...[...PANELS, A].map(
    (p) => `<rect x="${p.x + 14}" y="${p.y + 14}" width="${p.w - 28}" height="${p.h - 28}"/>`,
  ),
  // Ecliptic edge-on, and the planets' orbits as segments on it.
  `<line x1="${c.x - 5.6 * k}" y1="${c.y}" x2="${c.x + 5.6 * k}" y2="${c.y}" stroke-width="2" stroke-dasharray="14 10"/>`,
  `<line x1="${c.x - k}" y1="${c.y}" x2="${c.x + k}" y2="${c.y}" stroke-width="6"/>`,
  `<polyline points="${fmt(cruise.map(side))}" stroke-width="5" stroke-dasharray="20 10"/>`,
  `<polyline points="${fmt(ring.map(side))}" stroke-width="8"/>`,
  // Plan view: Earth and Jupiter orbits, the cruise, the polar orbit seen from above (thin ellipse).
  circle(plan({ x: 0, y: 0, z: 0 }), kd),
  circle(plan({ x: 0, y: 0, z: 0 }), 5.2 * kd),
  `<polyline points="${fmt(cruise.map(plan))}" stroke-width="4" stroke-dasharray="14 8"/>`,
  `<polyline points="${fmt(ring.map(plan))}" stroke-width="4"/>`,
  `</g>`,
  `<circle cx="${c.x}" cy="${c.y}" r="26" fill="#e8eeff"/>`,
  `<circle cx="${side(jup).x}" cy="${side(jup).y}" r="22" fill="#e8eeff"/>`,
  `<circle cx="${dc.x}" cy="${dc.y}" r="12" fill="#e8eeff"/>`,
  `<circle cx="${plan(jup).x}" cy="${plan(jup).y}" r="12" fill="#e8eeff"/>`,
  `<circle cx="${plan(earth).x}" cy="${plan(earth).y}" r="8" fill="#e8eeff"/>`,
  `<g font-family="sans-serif" font-size="40" fill="#e8eeff">`,
  ...PANELS.map((p) => `<text x="${p.x + 40}" y="${p.y + 70}">${esc(p.t)}</text>`),
  `<text x="${A.x + 40}" y="${A.y + 70}">A. MAIN VIEW — SIDE VIEW OF THE ECLIPTIC (TRUE SCALE)</text>`,
  `<text x="${c.x - 40}" y="${c.y + 70}">SUN</text>`,
  `<text x="${side(jup).x - 90}" y="${side(jup).y + 70}">JUPITER</text>`,
  `<text x="${c.x + 5.6 * k - 300}" y="${c.y - 20}" font-size="30">ECLIPTIC PLANE</text>`,
  ...marks.map((mk) => {
    const p = side(orbit(mk.E));
    return `<circle cx="${p.x}" cy="${p.y}" r="14" fill="#e8eeff"/><text x="${mk.E === 0 ? p.x - 30 : p.x + 30}" y="${mk.E === 0 ? p.y + 60 : p.y + 12}" text-anchor="${mk.E === 0 ? 'end' : 'start'}">${esc(mk.label)}</text>`;
  }),
  `</g></svg>`,
];
await sharp(Buffer.from(g.join('\n')))
  .png()
  .toFile(out);
console.log(
  `Jupiter at ${rJ.toFixed(2)} AU (published aphelion ${m.apoAu} AU); a ${a.toFixed(3)} AU, e ${e.toFixed(3)}, period ${(Math.pow(a, 1.5) * 365.25).toFixed(0)} d; ${marks.map((mk) => `${mk.label} at E ${mk.E.toFixed(2)}`).join('; ')}; wrote ${out}`,
);
