/**
 * delta-v essay — diagram SKETCHES (SVG basis for the Higgsfield "Wired" art).
 * Same palette + pipeline as build-nav-diagram-sketches.mjs.
 * Run: node scripts/essays/build-delta-v-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/delta-v/{slug}.svg (+ .png)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'delta-v');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18';
const LINE = '#7fb0e0';
const ACC = '#cfe3fb';
const FAINT = 'rgba(127,176,224,0.14)';
const WHITE = '#ffffff';
const GOLD = '#ffd27f';
const W = 1600;
const H = 900;

const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const stars = (() => {
  let s = '';
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Hero: the rocket is a fuel tank — 85% propellant / 11% structure / 4% payload.
  budget: frame(`
    ${stars}
    ${label(80, 90, 'THE WHOLE ROCKET IS A FUEL TANK', 30, 'start', LINE)}
    ${label(80, 128, 'Saturn V by mass — the payload is the sliver at the top', 20)}
    <!-- vertical stack bar -->
    <g transform="translate(360,180)">
      <rect x="0" y="0" width="180" height="30" fill="${GOLD}"/>
      ${label(210, 22, 'PAYLOAD  ~4%', 20)}
      <rect x="0" y="30" width="180" height="70" fill="${LINE}"/>
      ${label(210, 72, 'STRUCTURE + ENGINES  ~11%', 20)}
      <rect x="0" y="100" width="180" height="500" fill="rgba(127,176,224,0.22)" stroke="${LINE}" stroke-width="1.5"/>
      ${label(210, 360, 'PROPELLANT  ~85%', 22, 'start', ACC)}
      ${label(210, 392, 'burned just to move the top 15%', 18)}
    </g>
    ${label(80, 780, '∆v = the only budget that matters — and it opens once, at launch', 20, 'start', LINE)}
  `),

  // The rocket-equation wall — propellant mass fraction vs ∆v, two engines.
  'rocket-equation': frame(`
    ${stars}
    ${label(80, 90, 'THE TYRANNY OF THE ROCKET EQUATION', 30, 'start', LINE)}
    ${label(80, 128, '∆v = Isp · g₀ · ln(m₀ / mf)   —   ln is the villain', 20)}
    <!-- axes -->
    <g stroke="${FAINT}" stroke-width="1.4">
      <line x1="220" y1="720" x2="1400" y2="720"/>
      <line x1="220" y1="720" x2="220" y2="220"/>
    </g>
    ${label(1300, 760, '∆v  (km/s)', 18, 'middle')}
    ${label(120, 460, 'PROPELLANT', 16, 'middle')}
    ${label(120, 486, 'FRACTION', 16, 'middle')}
    <!-- two curves bending up to a wall (1.0) -->
    <path d="M 220 700 C 520 660, 760 560, 980 380 C 1120 270, 1200 245, 1300 240" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${label(1310, 250, 'Isp 450 s (H₂/O₂)', 16, 'start', LINE)}
    <path d="M 220 700 C 440 620, 640 470, 820 340 C 940 262, 1030 245, 1180 240" fill="none" stroke="${WHITE}" stroke-width="3" stroke-dasharray="9 7"/>
    ${label(700, 300, 'Isp 310 s (kerosene/O₂)', 16, 'start', WHITE)}
    <line x1="220" y1="240" x2="1400" y2="240" stroke="rgba(255,120,120,0.5)" stroke-width="1.4" stroke-dasharray="6 6"/>
    ${label(1390, 228, '100% — the wall you can never cross', 16, 'end', '#ff9a9a')}
    ${label(360, 700, 'each extra km/s costs exponentially more mass', 18)}
  `),

  // Hohmann transfer — the cheapest arc, two burns, a long coast.
  'hohmann-transfer': frame(`
    ${stars}
    ${label(80, 90, 'THE CHEAPEST ARC, NOT THE STRAIGHT LINE', 30, 'start', LINE)}
    ${label(80, 128, 'a Hohmann transfer — two burns, then 259 days of free coasting', 20)}
    ${dot(800, 480, 16, GOLD)} ${label(800, 522, 'SUN', 16, 'middle')}
    <g fill="none" stroke="${FAINT}" stroke-width="1.4">
      <circle cx="800" cy="480" r="150"/><circle cx="800" cy="480" r="290"/>
    </g>
    ${dot(950, 480, 8, WHITE)} ${label(985, 484, 'EARTH', 15, 'start')}
    ${dot(510, 480, 8, '#e08a6a')} ${label(475, 484, 'MARS', 15, 'end')}
    <!-- transfer ellipse (peri at Earth 950, apo at Mars 510) -->
    <ellipse cx="730" cy="480" rx="220" ry="205" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="10 8"/>
    <g stroke="${WHITE}" stroke-width="2.5">
      <line x1="950" y1="480" x2="1010" y2="480"/><polygon points="1010,480 998,474 998,486" fill="${WHITE}"/>
      <line x1="510" y1="480" x2="450" y2="480"/><polygon points="450,480 462,474 462,486" fill="${WHITE}"/>
    </g>
    ${label(1030, 480, '∆v₁ ≈ 3.6 km/s  (leave Earth)', 17, 'start')}
    ${label(430, 480, '∆v₂ ≈ 2.1 km/s', 17, 'end')}
    ${label(430, 505, '(catch Mars)', 15, 'end')}
    ${label(730, 720, 'total ≈ 5.6 km/s — every decimal paid in tonnes of propellant', 18, 'middle', LINE)}
  `),

  // The Oberth effect — a burn deep in the well buys more energy.
  'oberth-effect': frame(`
    ${stars}
    ${label(80, 90, 'BURN LOW, GAIN MORE', 30, 'start', LINE)}
    ${label(80, 128, 'the Oberth effect — the same burn is worth more deep in a gravity well', 20)}
    ${dot(560, 480, 60, '#4a6a9a')} ${label(560, 480, '', 0)}
    ${label(560, 560, 'PLANET', 15, 'middle')}
    <ellipse cx="820" cy="480" rx="440" ry="230" fill="none" stroke="${FAINT}" stroke-width="1.6"/>
    <!-- periapsis (near planet, fast) -->
    ${dot(380, 480, 8, WHITE)}
    <g stroke="${WHITE}" stroke-width="3"><line x1="380" y1="480" x2="300" y2="480"/><polygon points="300,480 314,472 314,488" fill="${WHITE}"/></g>
    ${label(360, 435, 'PERIAPSIS — moving fastest', 16, 'middle')}
    <rect x="250" y="600" width="230" height="34" fill="${LINE}"/>
    ${label(250, 662, 'energy gained: LARGE', 16)}
    <!-- apoapsis (far, slow) -->
    ${dot(1260, 480, 8, WHITE)}
    <g stroke="${ACC}" stroke-width="3"><line x1="1260" y1="480" x2="1340" y2="480"/><polygon points="1340,480 1326,472 1326,488" fill="${ACC}"/></g>
    ${label(1260, 435, 'APOAPSIS — moving slowest', 16, 'middle')}
    <rect x="1150" y="600" width="80" height="34" fill="rgba(207,227,251,0.5)"/>
    ${label(1150, 662, 'energy gained: small', 16)}
    ${label(800, 780, 'same fuel, same burn — the fast end buys far more speed', 18, 'middle', LINE)}
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
console.log('done:', Object.keys(diagrams).length, 'delta-v sketches');
