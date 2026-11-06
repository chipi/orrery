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
 * drawn ∝ √r so the inner legs stay readable; every angle is true. The image model then redraws
 * the sheet by hand in the blueprint style and must keep this geometry.
 */
import sharp from 'sharp';
import { heliocentric, julianDay, type PlanetId } from '../../src/lib/physics/ephemeris';
import { lambertLeg } from '../lib/conic-leg';

interface Event {
  label: string;
  body: Exclude<PlanetId, 'mercury' | 'venus' | 'mars' | 'pluto'> | 'earth';
  utc: string;
}
const MISSIONS: Record<string, { events: Event[]; orbits: PlanetId[] }> = {
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
const BOTTOM = 560;
const PANELS = [
  { t: 'B. LAUNCH VEHICLE', x: 0, y: 0, w: SIDE, h: 1100 },
  { t: 'C. LAUNCH SEQUENCE', x: 0, y: 1100, w: SIDE, h: 676 },
  { t: 'G. ENCOUNTER TABLE', x: 0, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: 'D. SPACECRAFT', x: W - SIDE, y: 0, w: SIDE, h: 900 },
  { t: 'F. GRAVITY ASSIST', x: W - SIDE, y: 900, w: SIDE, h: 440 },
  { t: 'H. EQUATIONS', x: W - SIDE, y: 1340, w: SIDE, h: 436 },
  { t: 'I. NOTES · TITLE BLOCK', x: W - SIDE, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: 'E. SIDE ELEVATION', x: SIDE, y: H - BOTTOM, w: W - 2 * SIDE, h: BOTTOM },
];
const A = { x: SIDE, y: 0, w: W - 2 * SIDE, h: H - BOTTOM };
const cx = A.x + A.w / 2;
const cy = A.y + A.h / 2 + 20;
const R = Math.min(A.w, A.h) / 2 - 70;
const rMax = Math.sqrt(MEAN_AU.neptune!);
const toPx = (x: number, y: number) => {
  const r = Math.hypot(x, y);
  const s = (Math.sqrt(r) / rMax) * R;
  const a = Math.atan2(y, x);
  // ecliptic x → right, y → up (seen from ecliptic north: counter-clockwise on screen)
  return { x: cx + s * Math.cos(a), y: cy - s * Math.sin(a) };
};

const pos = m.events.map((e) => {
  const p = heliocentric(e.body as PlanetId, julianDay(new Date(e.utc)));
  return { ...e, p, jd: julianDay(new Date(e.utc)) };
});

// Cruise legs as sampled Lambert conics. conic-leg works in the x–z plane: map ecliptic y → z.
const path: { x: number; y: number }[] = [];
for (let i = 0; i < pos.length - 1; i++) {
  const a = pos[i]!;
  const b = pos[i + 1]!;
  const tof = b.jd - a.jd;
  const leg = lambertLeg({ x: a.p.x, z: a.p.y }, { x: b.p.x, z: b.p.y }, tof, 5e-3);
  if (!leg) throw new Error(`no Lambert leg ${a.label} → ${b.label}`);
  for (let k = 0; k <= 200; k++) {
    const q = leg((tof * k) / 200);
    path.push(toPx(q.x, q.z));
  }
}
// After the last encounter: continue along the last leg's direction to the panel edge.
const last = path.at(-1)!;
const prev = path.at(-6)!;
const ux = last.x - prev.x;
const uy = last.y - prev.y;
const ul = Math.hypot(ux, uy);
const exit = { x: last.x + (ux / ul) * 260, y: last.y + (uy / ul) * 260 };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#14205c"/>`,
  `<g fill="none" stroke="#e8eeff" stroke-width="3">`,
  ...PANELS.map(
    (p) => `<rect x="${p.x + 14}" y="${p.y + 14}" width="${p.w - 28}" height="${p.h - 28}"/>`,
  ),
  `<rect x="${A.x + 14}" y="${A.y + 14}" width="${A.w - 28}" height="${A.h - 28}"/>`,
  ...m.orbits.map(
    (o) =>
      `<circle cx="${cx}" cy="${cy}" r="${(Math.sqrt(MEAN_AU[o]!) / rMax) * R}" stroke-width="2"/>`,
  ),
  `<line x1="${cx}" y1="${cy}" x2="${cx + R + 40}" y2="${cy}" stroke-width="2" stroke-dasharray="14 10"/>`,
  `<polyline points="${path.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}" stroke-width="9"/>`,
  `<line x1="${last.x}" y1="${last.y}" x2="${exit.x}" y2="${exit.y}" stroke-width="9" stroke-dasharray="26 14"/>`,
  `</g>`,
  `<circle cx="${cx}" cy="${cy}" r="26" fill="#e8eeff"/>`,
  `<g font-family="sans-serif" font-size="40" fill="#e8eeff">`,
  ...PANELS.map((p) => `<text x="${p.x + 40}" y="${p.y + 70}">${esc(p.t)}</text>`),
  `<text x="${A.x + 40}" y="${A.y + 70}">A. MAIN VIEW — PLAN VIEW OF THE ECLIPTIC</text>`,
  `<text x="${cx + R + 50}" y="${cy + 14}">♈ 0°</text>`,
  ...pos.map((e) => {
    const q = toPx(e.p.x, e.p.y);
    const lon = (((Math.atan2(e.p.y, e.p.x) * 180) / Math.PI + 360) % 360).toFixed(0);
    return `<circle cx="${q.x}" cy="${q.y}" r="${e.body === 'earth' ? 14 : 24}" fill="#e8eeff"/><text x="${q.x + 34}" y="${q.y - 30}">${esc(e.label)} · λ ${lon}°</text>`;
  }),
  `</g></svg>`,
].join('\n');

await sharp(Buffer.from(svg)).png().toFile(out);
for (const e of pos) {
  const lon = (((Math.atan2(e.p.y, e.p.x) * 180) / Math.PI + 360) % 360).toFixed(1);
  console.log(
    `${e.label.padEnd(16)} ${e.utc}  λ ${lon}°  r ${Math.hypot(e.p.x, e.p.y).toFixed(2)} AU`,
  );
}
console.log(`wrote ${out} (${W}x${H}); plan view ${A.w}x${A.h}, distance ∝ √r`);
