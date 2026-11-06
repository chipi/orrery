#!/usr/bin/env tsx
/**
 * Mission blueprints (#641), Earth–Moon missions: the reference sheet for a crewed lunar landing.
 * Same dashboard as blueprint-plan-view.ts — the hero view centre-top, supporting panels on the
 * sides and along the bottom.
 *
 *   npx tsx scripts/anatomy/blueprint-cislunar-view.ts <mission> <out.png>
 *
 * Hero: the free-return figure-eight in the rotating Earth–Moon frame (Moon held still), the way
 * Apollo's planners drew it. It is SCHEMATIC: distances along the Earth–Moon line are true (Earth
 * perigee at the parking-orbit radius, the far turn at the perilune altitude behind the Moon),
 * the width of the eight is not. The site's 3D flight model (cislunar-geometry.ts) is a chain of
 * Keplerian arcs that does not reproduce the three-body figure-eight, so it is not used here.
 *
 * Detail: the first lunar orbit at true scale against the Moon, from the mission's sourced
 * numbers (flight.events: perilune × apolune after LOI).
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { R_EARTH_KM, R_MOON_KM, A_MOON_KM } from '../../src/lib/orbital/cislunar/cislunar-geometry';

interface Cfg {
  file: string;
  bottom: string;
  detail: string;
  /** Orbit after lunar orbit insertion, km above the surface (perilune, apolune). */
  loiOrbitKm: [number, number];
}
const MISSIONS: Record<string, Cfg> = {
  // 113 × 313 km: our apollo11.json LOI event (Apollo 11 Mission Report, MSC-00171).
  apollo11: {
    file: 'static/data/missions/moon/apollo11.json',
    bottom: 'J. TRANQUILITY BASE · THE MOONWALK',
    detail: 'E. LUNAR ORBIT · TRUE SCALE',
    loiOrbitKm: [113, 313],
  },
};
const [id, out] = process.argv.slice(2);
const cfg = MISSIONS[id ?? ''];
if (!cfg || !out) {
  console.error(`usage: blueprint-cislunar-view.ts <${Object.keys(MISSIONS).join('|')}> <out.png>`);
  process.exit(2);
}
const json = JSON.parse(readFileSync(cfg.file, 'utf8'));
const parkingKm: number = json.flight?.cislunar_profile?.parking_orbit?.altitude_km ?? 185;
const periseleneKm: number = json.flight?.cislunar_profile?.lunar_arrival?.periselene_km ?? 110;

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
  { t: 'F. FREE RETURN', x: W - SIDE, y: 900, w: SIDE, h: 440 },
  { t: 'H. EQUATIONS', x: W - SIDE, y: 1340, w: SIDE, h: H - BOTTOM - 1340 },
  { t: 'I. MISSION BRIEF · TITLE BLOCK', x: W - SIDE, y: H - BOTTOM, w: SIDE, h: BOTTOM },
  { t: cfg.detail, x: SIDE, y: H - BOTTOM, w: MID / 2, h: BOTTOM },
  { t: cfg.bottom, x: SIDE + MID / 2, y: H - BOTTOM, w: MID / 2, h: BOTTOM },
];
const A = { x: SIDE, y: 0, w: MID, h: H - BOTTOM };
type P = { x: number; y: number };
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt = (pts: P[]) => pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');

// Figure-eight, km along the Earth–Moon line: x runs from the perigee behind Earth (−rP) to the
// far turn behind the Moon (D + rL); y = h·sin 2s crosses the line midway. s ∈ [0, π] is the
// outbound leg, [π, 2π] the return.
const rP = R_EARTH_KM + parkingKm;
const rL = R_MOON_KM + periseleneKm;
const xMin = -rP;
const xMax = A_MOON_KM + rL;
const h = 0.16 * A_MOON_KM;
const eight = (s: number): P => ({
  x: xMin + ((xMax - xMin) * (1 - Math.cos(s))) / 2,
  y: h * Math.sin(2 * s),
});
const k = (A.w - 420) / (xMax - xMin);
const cx = A.x + 210 - xMin * k;
const cy = A.y + A.h / 2 + 40;
const toMain = (q: P): P => ({ x: cx + q.x * k, y: cy - q.y * k });
const outbound = Array.from({ length: 301 }, (_, i) => toMain(eight((Math.PI * i) / 300)));
const back = Array.from({ length: 301 }, (_, i) => toMain(eight(Math.PI + (Math.PI * i) / 300)));
const E = toMain({ x: 0, y: 0 });
const M = toMain({ x: A_MOON_KM, y: 0 });

const g: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#14205c"/>`,
  `<g fill="none" stroke="#e8eeff" stroke-width="3">`,
  ...[...PANELS, A].map(
    (p) => `<rect x="${p.x + 14}" y="${p.y + 14}" width="${p.w - 28}" height="${p.h - 28}"/>`,
  ),
  `<line x1="${E.x}" y1="${E.y}" x2="${M.x}" y2="${M.y}" stroke-width="2" stroke-dasharray="14 10"/>`,
  `<polyline points="${fmt(outbound)}" stroke-width="8"/>`,
  `<polyline points="${fmt(back)}" stroke-width="8" stroke-dasharray="30 14"/>`,
  `</g>`,
  `<circle cx="${E.x}" cy="${E.y}" r="34" fill="#e8eeff"/>`,
  `<circle cx="${M.x}" cy="${M.y}" r="16" fill="#e8eeff"/>`,
];

// Detail: Moon and the post-LOI ellipse, true scale.
const D = PANELS.find((p) => p.t === cfg.detail)!;
const [peri, apo] = cfg.loiOrbitKm.map((v) => R_MOON_KM + v) as [number, number];
const a = (peri + apo) / 2;
const c = a - peri;
const b = Math.sqrt(a * a - c * c);
const kd = (D.h - 220) / (2 * b);
const dc = { x: D.x + D.w / 2 + c * kd, y: D.y + 120 + (D.h - 150) / 2 };
g.push(
  `<circle cx="${dc.x}" cy="${dc.y}" r="${R_MOON_KM * kd}" fill="none" stroke="#e8eeff" stroke-width="3"/>`,
);
g.push(
  `<ellipse cx="${dc.x - c * kd}" cy="${dc.y}" rx="${a * kd}" ry="${b * kd}" fill="none" stroke="#e8eeff" stroke-width="4"/>`,
);

g.push(`<g font-family="sans-serif" font-size="40" fill="#e8eeff">`);
for (const p of PANELS) g.push(`<text x="${p.x + 40}" y="${p.y + 70}">${esc(p.t)}</text>`);
g.push(`<text x="${A.x + 40}" y="${A.y + 70}">A. MAIN VIEW — EARTH TO THE MOON AND BACK</text>`);
g.push(
  `<text x="${E.x - 70}" y="${E.y + 100}">EARTH</text><text x="${M.x - 60}" y="${M.y + 90}">MOON</text>`,
);
g.push(`<text x="${(E.x + M.x) / 2 - 140}" y="${E.y + 70}">384,400 KM</text>`);
g.push(
  `<text x="${A.x + 40}" y="${A.y + A.h - 50}" font-size="30">ROTATING EARTH–MOON FRAME · SCHEMATIC WIDTH</text>`,
);
g.push(
  `<text x="${D.x + 40}" y="${D.y + D.h - 40}" font-size="28">${cfg.loiOrbitKm[0]} × ${cfg.loiOrbitKm[1]} KM AFTER LOI · MOON R ${R_MOON_KM} KM</text>`,
);
g.push(`</g></svg>`);

await sharp(Buffer.from(g.join('\n')))
  .png()
  .toFile(out);
console.log(
  `parking ${parkingKm} km, perilune ${periseleneKm} km, LOI orbit ${cfg.loiOrbitKm.join(' × ')} km; wrote ${out}`,
);
