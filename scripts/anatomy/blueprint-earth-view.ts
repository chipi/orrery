/**
 * Reference sheet for an Earth-orbit mission blueprint (Sputnik 1, Vostok 1, Apollo–Soyuz): the same
 * panel grid as blueprint-plan-view.ts, with a ground track on a world map as the hero and the
 * orbit drawn to true scale around Earth below it.
 *
 *   npx tsx scripts/anatomy/blueprint-earth-view.ts <mission> <out.png>
 *
 * The track is a circular-orbit approximation (period and inclination from the sources, Earth's
 * rotation from GMST, J2 nodal drift), started over the launch site at an effective time: good for
 * where the track runs, not for navigation. The coastlines are traced from the site's own Earth
 * day map (static/textures/2k_earth_daymap.jpg, equirectangular). The image model redraws the
 * sheet by hand and must keep this geometry.
 */
import sharp from 'sharp';

const RAD = Math.PI / 180;
const RE = 6378.137; // km
const J2 = 1.08263e-3;
const MU = 398600.4418; // km³/s²

interface Mark {
  label: string;
  utc: string;
  /** Put the label left of the dot (default right). */
  left?: boolean;
}
interface Site {
  label: string;
  lat: number;
  lon: number;
  /** Label below the square instead of above it. */
  below?: boolean;
  left?: boolean;
}
interface Mission {
  /** Launch site, the inclination and the period of the orbit (minutes). */
  site: Site;
  inc: number;
  periodMin: number;
  perigeeKm: number;
  apogeeKm: number;
  /** UTC when an orbiting object would be over the launch site, heading north-east. */
  t0: string;
  /** Track window, UTC. */
  from: string;
  to: string;
  marks: Mark[];
  /** Extra places shown on the map (another launch site, a landing site). */
  places?: Site[];
  /** Titles of the mission-specific panels. */
  f: string;
  e2: string;
  g: string;
}

const MISSIONS: Record<string, Mission> = {
  // Wikipedia "Sputnik 1": launch 19:28:34 UTC from Site 1/5; 65.1°, 96.2 min, 215 × 939 km.
  sputnik1: {
    site: { label: 'BAIKONUR · SITE 1', lat: 45.92, lon: 63.34 },
    inc: 65.1,
    periodMin: 96.2,
    perigeeKm: 215,
    apogeeKm: 939,
    t0: '1957-10-04T19:33:30Z',
    from: '1957-10-04T19:33:30Z',
    to: '1957-10-04T21:09:42Z',
    marks: [{ label: 'ORBIT 1 COMPLETE', utc: '1957-10-04T21:09:42Z' }],
    f: 'F. THE SIGNAL',
    e2: 'E2. INSIDE THE SPHERE',
    g: 'G. TIMELINE',
  },
  // Wikipedia "Vostok 1": launch 06:07 UTC; 64.95°, 89.1 min, 181 × 327 km; retrofire 07:25 over
  // west Africa; landing 08:05 near Engels (51.4° N, 46.1° E).
  'vostok-1': {
    site: { label: 'BAIKONUR · SITE 1', lat: 45.92, lon: 63.34, below: true },
    inc: 64.95,
    periodMin: 89.1,
    perigeeKm: 181,
    apogeeKm: 327,
    t0: '1961-04-12T06:12:00Z',
    from: '1961-04-12T06:12:00Z',
    // The descent falls short of the orbit: the track stops where it passes Engels (128 km off).
    to: '1961-04-12T07:43:00Z',
    marks: [{ label: 'RETROFIRE 07:25', utc: '1961-04-12T07:25:00Z' }],
    places: [{ label: 'LANDING · ENGELS · 08:05', lat: 51.4, lon: 46.1, left: true }],
    f: 'F. REENTRY AND LANDING',
    e2: 'E2. VOSTOK 3KA · THE CAPSULE',
    g: 'G. TIMELINE · 12 APRIL 1961 (UTC)',
  },
  // Wikipedia "Apollo–Soyuz": Soyuz 19 12:20 UTC from Site 1/5, Apollo 19:50 UTC from LC-39B;
  // 51.8°, 217–231 km. The track shows the Soyuz orbit plane as Apollo launched into it.
  'apollo-soyuz': {
    site: { label: 'BAIKONUR · SOYUZ 19', lat: 45.92, lon: 63.34 },
    inc: 51.8,
    periodMin: 88.8,
    perigeeKm: 217,
    apogeeKm: 231,
    t0: '1975-07-15T12:28:00Z',
    from: '1975-07-15T19:10:00Z',
    to: '1975-07-15T20:38:48Z',
    marks: [],
    places: [{ label: 'KENNEDY · APOLLO', lat: 28.63, lon: -80.62 }],
    f: 'F. RENDEZVOUS AND DOCKING',
    e2: 'E2. THE DOCKING MODULE',
    g: 'G. TIMELINE · JULY 1975 (UTC)',
  },
};

const [id, out] = process.argv.slice(2);
const m = MISSIONS[id ?? ''];
if (!m || !out) {
  console.error(`usage: blueprint-earth-view.ts <${Object.keys(MISSIONS).join('|')}> <out.png>`);
  process.exit(2);
}

const jd = (utc: string) => Date.parse(utc) / 86400000 + 2440587.5;
const gmst = (j: number) =>
  (((280.46061837 + 360.98564736629 * (j - 2451545.0)) % 360) + 360) % 360;
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

// Orbit plane from the launch site at t0, heading north-east (ascending).
const inc = m.inc * RAD;
const n = 360 / (m.periodMin * 60); // deg/s
const a = (RE * 2 + m.perigeeKm + m.apogeeKm) / 2;
const nodeRate = (-1.5 * Math.sqrt(MU / a ** 3) * J2 * (RE / a) ** 2 * Math.cos(inc)) / RAD; // deg/s
const u0 = Math.asin(Math.sin(m.site.lat * RAD) / Math.sin(inc));
const alpha0 = m.site.lon + gmst(jd(m.t0));
const node0 = alpha0 - Math.atan2(Math.cos(inc) * Math.sin(u0), Math.cos(u0)) / RAD;
function subpoint(utc: string | number) {
  const j = typeof utc === 'number' ? utc : jd(utc);
  const dt = (j - jd(m.t0)) * 86400;
  const u = u0 + n * dt * RAD;
  const lat = Math.asin(Math.sin(inc) * Math.sin(u)) / RAD;
  const alpha = node0 + nodeRate * dt + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) / RAD;
  return { lat, lon: wrap(alpha - gmst(j)) };
}
const greatCircleKm = (p: { lat: number; lon: number }, q: { lat: number; lon: number }) =>
  RE *
  Math.acos(
    Math.min(
      1,
      Math.sin(p.lat * RAD) * Math.sin(q.lat * RAD) +
        Math.cos(p.lat * RAD) * Math.cos(q.lat * RAD) * Math.cos((p.lon - q.lon) * RAD),
    ),
  );

// Layout: map hero top centre, the true-scale orbit and a mission panel below it.
const W = 3504;
const H = 2336;
const SIDE = 720;
const MID = W - 2 * SIDE;
const AH = 1250;
const A = { x: SIDE, y: 0, w: MID, h: AH };
const PANELS = [
  { t: 'B. LAUNCH VEHICLE', x: 0, y: 0, w: SIDE, h: 1000 },
  { t: 'C. LAUNCH SEQUENCE', x: 0, y: 1000, w: SIDE, h: 700 },
  { t: m.g, x: 0, y: 1700, w: SIDE, h: H - 1700 },
  { t: 'D. SPACECRAFT', x: W - SIDE, y: 0, w: SIDE, h: 860 },
  { t: m.f, x: W - SIDE, y: 860, w: SIDE, h: 470 },
  { t: 'H. EQUATIONS', x: W - SIDE, y: 1330, w: SIDE, h: 430 },
  { t: 'I. MISSION BRIEF · TITLE BLOCK', x: W - SIDE, y: 1760, w: SIDE, h: H - 1760 },
  { t: 'E1. THE ORBIT TO TRUE SCALE', x: SIDE, y: AH, w: MID / 2, h: H - AH },
  { t: m.e2, x: SIDE + MID / 2, y: AH, w: MID / 2, h: H - AH },
];

// Map rectangle inside A (equirectangular, 2:1).
const MW = 1960;
const MH = 980;
const MX = A.x + (A.w - MW) / 2;
const MY = A.y + 130;
const px = (lat: number, lon: number) => ({
  x: MX + ((lon + 180) / 360) * MW,
  y: MY + ((90 - lat) / 180) * MH,
});

// Coastlines: land/water from the day map, the mask's edge drawn white.
const TEX = 'static/textures/2k_earth_daymap.jpg';
const { data: tex, info } = await sharp(TEX)
  .resize(MW, MH)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const land = new Uint8Array(MW * MH);
for (let i = 0; i < MW * MH; i++) {
  const r = tex[i * 3]!;
  const g = tex[i * 3 + 1]!;
  const b = tex[i * 3 + 2]!;
  const water = b > r * 1.25 && b >= g * 0.95 && r + g + b < 360;
  land[i] = water ? 0 : 1;
}
// Majority smoothing so specks of shallow water or cloud do not draw.
const smooth = new Uint8Array(MW * MH);
for (let y = 0; y < MH; y++)
  for (let x = 0; x < MW; x++) {
    let s = 0;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const yy = Math.min(MH - 1, Math.max(0, y + dy));
        const xx = (x + dx + MW) % MW;
        s += land[yy * MW + xx]!;
      }
    smooth[y * MW + x] = s >= 13 ? 1 : 0;
  }
const edge = Buffer.alloc(MW * MH * 4);
for (let y = 1; y < MH - 1; y++)
  for (let x = 0; x < MW; x++) {
    const v = smooth[y * MW + x]!;
    const e = v !== smooth[y * MW + ((x + 1) % MW)] || v !== smooth[(y + 1) * MW + x] ? 255 : 0;
    const o = (y * MW + x) * 4;
    edge[o] = 232;
    edge[o + 1] = 238;
    edge[o + 2] = 255;
    edge[o + 3] = e;
  }
void info;
const coast = await sharp(edge, { raw: { width: MW, height: MH, channels: 4 } })
  .png()
  .toBuffer();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const g: string[] = [];
// Graticule every 30°, equator heavier.
g.push(`<g stroke="#e8eeff" fill="none">`);
for (let lon = -180; lon <= 180; lon += 30) {
  const p = px(0, lon);
  g.push(
    `<line x1="${p.x}" y1="${MY}" x2="${p.x}" y2="${MY + MH}" stroke-width="1.2" stroke-dasharray="6 8"/>`,
  );
}
for (let lat = -60; lat <= 60; lat += 30) {
  const p = px(lat, 0);
  g.push(
    `<line x1="${MX}" y1="${p.y}" x2="${MX + MW}" y2="${p.y}" stroke-width="${lat === 0 ? 2.4 : 1.2}" ${lat === 0 ? '' : 'stroke-dasharray="6 8"'}/>`,
  );
}
g.push(`<rect x="${MX}" y="${MY}" width="${MW}" height="${MH}" stroke-width="3"/>`);
// Track, split where it wraps the antimeridian.
const j1 = jd(m.from);
const j2 = jd(m.to);
const runs: { x: number; y: number }[][] = [[]];
let prev: number | null = null;
for (let k = 0; k <= 800; k++) {
  const s = subpoint(j1 + ((j2 - j1) * k) / 800);
  if (prev !== null && Math.abs(s.lon - prev) > 180) runs.push([]);
  runs.at(-1)!.push(px(s.lat, s.lon));
  prev = s.lon;
}
for (const r of runs)
  if (r.length > 1)
    g.push(
      `<polyline points="${r.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}" stroke-width="9"/>`,
    );
g.push(`</g>`);
// Sites, places and marks.
g.push(`<g font-family="sans-serif" font-size="34" fill="#e8eeff">`);
for (const s of [m.site, ...(m.places ?? [])]) {
  const p = px(s.lat, s.lon);
  g.push(`<rect x="${p.x - 12}" y="${p.y - 12}" width="24" height="24" fill="#e8eeff"/>`);
  g.push(
    `<text x="${s.left ? p.x - 22 : p.x + 22}" y="${s.below ? p.y + 50 : p.y - 18}" text-anchor="${s.left ? 'end' : 'start'}">${esc(s.label)}</text>`,
  );
}
for (const mk of m.marks) {
  const s = subpoint(mk.utc);
  const p = px(s.lat, s.lon);
  g.push(`<circle cx="${p.x}" cy="${p.y}" r="15" fill="#e8eeff"/>`);
  g.push(
    `<text x="${mk.left ? p.x - 26 : p.x + 26}" y="${p.y + 44}" text-anchor="${mk.left ? 'end' : 'start'}">${esc(mk.label)}</text>`,
  );
}
const startP = px(subpoint(m.from).lat, subpoint(m.from).lon);
g.push(
  `<circle cx="${startP.x}" cy="${startP.y}" r="10" fill="none" stroke="#e8eeff" stroke-width="4"/>`,
);
g.push(`</g>`);

// E1: Earth and the orbit to true scale (perigee left, apogee right).
const E1 = PANELS.find((p) => p.t.startsWith('E1'))!;
const cx = E1.x + E1.w / 2;
const cy = E1.y + E1.h / 2 + 40;
const k = (Math.min(E1.w, E1.h) / 2 - 110) / (RE + m.apogeeKm);
const rp = (RE + m.perigeeKm) * k;
const ra = (RE + m.apogeeKm) * k;
const sa = (rp + ra) / 2;
const sb = Math.sqrt(rp * ra);
g.push(`<g stroke="#e8eeff" fill="none">`);
g.push(`<circle cx="${cx}" cy="${cy}" r="${RE * k}" stroke-width="3"/>`);
g.push(
  `<circle cx="${cx}" cy="${cy}" r="${(RE + 100) * k}" stroke-width="1.5" stroke-dasharray="6 8"/>`,
);
g.push(`<ellipse cx="${cx + (ra - rp) / 2}" cy="${cy}" rx="${sa}" ry="${sb}" stroke-width="6"/>`);
g.push(
  `<line x1="${cx - rp}" y1="${cy}" x2="${cx + ra}" y2="${cy}" stroke-width="1.5" stroke-dasharray="10 8"/>`,
);
g.push(`</g><g font-family="sans-serif" font-size="30" fill="#e8eeff">`);
g.push(`<text x="${cx - rp + 24}" y="${cy - 24}">PERIGEE ${m.perigeeKm} KM</text>`);
g.push(`<text x="${cx + ra - 24}" y="${cy - 24}" text-anchor="end">APOGEE ${m.apogeeKm} KM</text>`);
g.push(`<text x="${cx}" y="${cy + 8}" text-anchor="middle">EARTH · R 6,378 KM</text>`);
g.push(`<text x="${cx}" y="${cy + RE * k + 70}" text-anchor="middle">DASHED: 100 KM</text>`);
g.push(`</g>`);

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  `<rect width="${W}" height="${H}" fill="#14205c"/>`,
  `<g fill="none" stroke="#e8eeff" stroke-width="3">`,
  ...[...PANELS, A].map(
    (p) => `<rect x="${p.x + 14}" y="${p.y + 14}" width="${p.w - 28}" height="${p.h - 28}"/>`,
  ),
  `</g>`,
  ...g,
  `<g font-family="sans-serif" font-size="40" fill="#e8eeff">`,
  ...PANELS.map((p) => `<text x="${p.x + 40}" y="${p.y + 70}">${esc(p.t)}</text>`),
  `<text x="${A.x + 40}" y="${A.y + 70}">A. MAIN VIEW — GROUND TRACK</text>`,
  `</g></svg>`,
].join('\n');

const base = await sharp(Buffer.from(svg)).png().toBuffer();
await sharp(base)
  .composite([{ input: coast, left: Math.round(MX), top: Math.round(MY) }])
  .png()
  .toFile(out);

for (const mk of m.marks) {
  const s = subpoint(mk.utc);
  console.log(`${mk.label.padEnd(20)} ${mk.utc}  ${s.lat.toFixed(1)}°, ${s.lon.toFixed(1)}°`);
}
for (const pl of m.places ?? []) {
  let best = { d: Infinity, t: '' };
  for (let j = j1; j <= j2; j += 1 / 1440) {
    const d = greatCircleKm(subpoint(j), pl);
    if (d < best.d)
      best = { d, t: new Date((j - 2440587.5) * 86400000).toISOString().slice(11, 16) };
  }
  console.log(`closest track pass to ${pl.label}: ${best.d.toFixed(0)} km at ${best.t} UTC`);
}
console.log(
  `wrote ${out} (${W}x${H}); i ${m.inc}°, ${m.periodMin} min, node drift ${(nodeRate * 86400).toFixed(2)}°/day`,
);
