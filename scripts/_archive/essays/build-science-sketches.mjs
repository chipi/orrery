/**
 * 5 new /science diagram SKETCHES (blend basis) — the concepts with no essay diagram to reuse.
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-science-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/_science/{id}.svg (+ .png)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', '_science');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  WHITE = '#ffffff',
  GOLD = '#ffd27f';
const W = 1600,
  H = 900;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const grain = (cx, cy, r) => {
  let seed = cx * 3 + cy;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let pts = '';
  for (let a = 0; a < 360; a += 45) {
    const rr = r * (0.6 + rnd() * 0.7);
    const rad = (a * Math.PI) / 180;
    pts += `${(cx + rr * Math.cos(rad)).toFixed(0)},${(cy + rr * Math.sin(rad)).toFixed(0)} `;
  }
  return `<polygon points="${pts.trim()}" fill="rgba(127,176,224,0.14)" stroke="${LINE}" stroke-width="1.4"/>`;
};
const stars = (() => {
  let s = '',
    seed = 991;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 70; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.2 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  regolith: frame(`
    ${stars}
    ${label(80, 90, 'REGOLITH — THE DUST OF AIRLESS WORLDS', 28, 'start', LINE)}
    ${label(80, 126, 'ground by billions of years of impacts, never rounded by wind or water', 19)}
    <g stroke="${GOLD}" stroke-width="2"><line x1="300" y1="200" x2="360" y2="330"/><polygon points="360,330 344,320 350,338" fill="${GOLD}"/><line x1="600" y1="190" x2="560" y2="330"/><polygon points="560,330 570,314 576,332" fill="${GOLD}"/></g>
    ${label(450, 200, 'micrometeorite “gardening”', 15, 'middle', GOLD)}
    <rect x="220" y="360" width="760" height="240" fill="rgba(127,176,224,0.06)" stroke="${LINE}" stroke-width="1.6"/>
    ${(() => {
      let g = '';
      let seed = 5;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < 60; i++) g += grain(250 + rnd() * 700, 385 + rnd() * 190, 8 + rnd() * 14);
      return g;
    })()}
    ${label(600, 640, 'metres to tens of metres deep', 15, 'middle')}
    <g transform="translate(1180,430)">${grain(0, 0, 90)}${label(0, 130, 'one grain: sharp,', 15, 'middle')}${label(0, 156, 'angular, glassy', 15, 'middle')}${label(0, 200, 'electrostatically', 14, 'middle', GOLD)}${label(0, 222, 'charged → it clings', 14, 'middle', GOLD)}</g>
    ${label(600, 760, 'a hazard to suits and seals — and a resource for shielding and ISRU', 17, 'middle', LINE)}
  `),

  'lunar-ice': frame(`
    ${stars}
    ${label(80, 90, 'LUNAR ICE — WATER IN THE PERMANENT DARK', 28, 'start', LINE)}
    ${label(80, 126, 'crater floors near the poles that the Sun has never touched', 19)}
    ${dot(160, 300, 44, GOLD)} ${label(160, 250, 'THE SUN', 14, 'middle')}
    <g stroke="${GOLD}" stroke-width="1.6" opacity="0.85">${[300, 320, 340].map((y) => `<line x1="210" y1="${y}" x2="700" y2="${y + 120}"/>`).join('')}</g>
    <path d="M 620 560 L 760 420 L 820 420 L 900 470 L 980 420 L 1120 560 Z" fill="rgba(127,176,224,0.10)" stroke="${LINE}" stroke-width="2"/>
    ${label(1250, 470, 'sunlit rim', 14, 'end')}
    <path d="M 820 490 q 40 20 80 0 q 40 -20 60 5" fill="none" stroke="${ACC}" stroke-width="3"/>
    ${label(890, 560, 'WATER ICE', 16, 'middle', ACC)}
    ${label(890, 586, 'permanently shadowed · below −170°C', 13, 'middle')}
    ${label(890, 700, 'hydrogen + oxygen: propellant · air · water · shielding', 16, 'middle', GOLD)}
    ${label(600, 780, 'the reason the new Moon race turned from the equator to the poles', 17, 'middle', LINE)}
  `),

  'fusion-propulsion': frame(`
    ${stars}
    ${label(80, 90, 'FUSION PROPULSION — THE STAR WE CANNOT YET LIGHT', 28, 'start', LINE)}
    ${label(80, 126, 'fuse light nuclei for enormous energy per kilogram', 19)}
    ${dot(340, 400, 16, LINE)} ${label(340, 360, 'deuterium', 13, 'middle')}
    ${dot(340, 470, 16, LINE)} ${label(340, 510, 'helium-3', 13, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="380" y1="400" x2="470" y2="435"/><line x1="380" y1="470" x2="470" y2="435"/></g>
    ${dot(500, 435, 26, GOLD)} ${label(500, 400, 'fusion', 14, 'middle', GOLD)}
    <g stroke="${GOLD}" stroke-width="3"><line x1="530" y1="435" x2="1080" y2="435"/><polygon points="1080,435 1058,425 1058,445" fill="${GOLD}"/></g>
    ${label(820, 405, 'exhaust — Isp in the tens of thousands', 16, 'middle', GOLD)}
    ${label(1180, 300, 'Project Daedalus:', 15, 'start')}
    ${label(1180, 328, '~12% of light speed', 15, 'start', LINE)}
    ${label(600, 640, 'THE WALL: no reactor has yet produced net energy — even on Earth', 18, 'middle', '#e08a6a')}
    ${label(600, 770, 'a physically sound idea with no working hardware', 17, 'middle', LINE)}
  `),

  'antimatter-propulsion': frame(`
    ${stars}
    ${label(80, 90, 'ANTIMATTER — THE PERFECT FUEL WE CANNOT MAKE', 28, 'start', LINE)}
    ${label(80, 126, 'matter meets antimatter and 100% of the mass becomes energy', 19)}
    ${dot(400, 430, 20, LINE)} ${label(400, 390, 'matter', 14, 'middle')}
    ${dot(520, 430, 20, GOLD)} ${label(520, 390, 'antimatter', 14, 'middle', GOLD)}
    <g stroke="${GOLD}" stroke-width="1.8">${[0, 45, 90, 135, 180, 225, 270, 315]
      .map((a) => {
        const r = (a * Math.PI) / 180;
        return `<line x1="460" y1="430" x2="${(460 + 90 * Math.cos(r)).toFixed(0)}" y2="${(430 + 90 * Math.sin(r)).toFixed(0)}"/>`;
      })
      .join('')}</g>
    ${label(460, 560, 'total annihilation → pure energy', 16, 'middle', GOLD)}
    ${label(1180, 350, 'THE WALLS', 18, 'end', '#e08a6a')}
    ${label(1180, 400, 'make it: a few nanograms a year, at colossal cost', 15, 'end')}
    ${label(1180, 432, 'store it: must never touch matter — magnetic traps only', 15, 'end')}
    ${label(600, 780, 'the ultimate propellant on paper, effectively impossible to fuel', 17, 'middle', LINE)}
  `),

  'laser-sail': frame(`
    ${stars}
    ${label(80, 90, 'LASER SAILS — PUSHING A PROBE WITH A BEAM FROM HOME', 28, 'start', LINE)}
    ${label(80, 126, 'the craft carries no fuel — all the energy stays on the ground', 19)}
    <g transform="translate(230,470)"><rect x="-14" y="-70" width="20" height="30" fill="rgba(127,176,224,0.18)" stroke="${LINE}" stroke-width="2"/><polygon points="-40,60 40,60 0,-60" fill="rgba(255,210,127,0.14)" stroke="${GOLD}" stroke-width="2"/></g>
    ${label(230, 590, 'ground laser array', 15, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5" opacity="0.9"><line x1="270" y1="460" x2="1080" y2="440"/><line x1="270" y1="480" x2="1080" y2="500"/></g>
    <g transform="translate(1120,470) rotate(15)"><rect x="-6" y="-90" width="12" height="180" fill="rgba(207,227,251,0.2)" stroke="${ACC}" stroke-width="2"/></g>
    ${dot(1122, 470, 5, WHITE)} ${label(1180, 474, 'gram-scale sail + chip', 15, 'start')}
    ${label(760, 380, '~100-gigawatt beam → ~20% of light speed', 16, 'middle', GOLD)}
    ${label(1180, 560, 'Breakthrough Starshot:', 15, 'start')}
    ${label(1180, 588, 'a 20-year flyby — no brakes', 15, 'start', '#e08a6a')}
    ${label(600, 780, 'the most studied, least impossible interstellar concept', 17, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg))
    .resize(2048)
    .png()
    .toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'science sketches');
