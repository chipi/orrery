/**
 * reusable-launchers essay ("Keep the Rocket") — diagram SKETCHES.
 * Same palette + pipeline as build-delta-v-sketches.mjs (docs/guides/diagram-art-style.md).
 * Run: node scripts/essays/build-reuse-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'reusable-launchers');
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
  let seed = 41;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // The accountant's problem — throw the machine away every flight.
  'expendable-cost': frame(`
    ${stars}
    ${label(80, 90, 'THE MACHINE YOU FLY ONCE', 30, 'start', LINE)}
    ${label(80, 128, 'for sixty years, the most expensive object of a mission — discarded', 20)}
    <g transform="translate(300,240)">
      <rect x="0" y="0" width="60" height="300" rx="8" fill="rgba(127,176,224,0.18)" stroke="${LINE}" stroke-width="2"/>
      <polygon points="0,0 60,0 30,-50" fill="${LINE}"/>
      ${label(30, 340, 'BUILT', 16, 'middle')}
    </g>
    ${label(430, 380, '→  fly once  →', 22, 'middle', GOLD)}
    <g stroke="${FAINT}" stroke-width="1.6"><path d="M 620 300 Q 800 240 980 360 T 1340 420"/></g>
    <path d="M 1120 560 q 40 -30 80 0 q 40 30 80 0 q 40 -30 80 0" fill="none" stroke="${LINE}" stroke-width="2"/>
    ${label(1230, 520, 'the sea', 15, 'middle')}
    <g transform="translate(1190,470) rotate(35)"><rect x="0" y="0" width="26" height="120" rx="4" fill="rgba(127,176,224,0.14)" stroke="${LINE}" stroke-width="1.6"/></g>
    ${label(760, 720, 'imagine scrapping a jetliner after a single flight — that was the business', 18, 'middle', LINE)}
  `),

  // The simplest trick — fly the booster back and land it.
  'landing-profile': frame(`
    ${stars}
    ${label(80, 90, 'THE SIMPLEST POSSIBLE TRICK', 30, 'start', LINE)}
    ${label(80, 128, 'fly the booster back down and set it on its legs', 20)}
    <line x1="200" y1="760" x2="1500" y2="760" stroke="${FAINT}" stroke-width="1.6"/>
    <path d="M 260 760 C 400 300, 560 200, 700 260" fill="none" stroke="${LINE}" stroke-width="3"/>
    <path d="M 700 260 C 840 320, 900 520, 1180 720" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="10 8"/>
    ${dot(260, 758, 8, WHITE)} ${label(240, 740, 'LAUNCH', 15, 'end')}
    ${dot(700, 260, 8, ACC)} ${label(716, 250, 'STAGE SEP + BOOSTBACK BURN', 15, 'start')}
    ${dot(940, 500, 6, GOLD)} ${label(960, 500, 'ENTRY BURN', 15, 'start', GOLD)}
    ${dot(1180, 720, 8, GOLD)} ${label(1180, 700, 'LANDING BURN', 15, 'middle', GOLD)}
    <g transform="translate(1160,724)"><rect x="0" y="0" width="40" height="8" rx="2" fill="${LINE}"/></g>
    ${label(1180, 752, 'TOUCHDOWN', 14, 'middle')}
    ${label(780, 815, 'the same booster is inspected, refuelled, and flown again', 18, 'middle', LINE)}
  `),

  // Catching it with the tower — no legs, arms close on the booster.
  'tower-catch': frame(`
    ${stars}
    ${label(80, 90, 'CATCHING IT WITH THE TOWER', 30, 'start', LINE)}
    ${label(80, 128, 'let the launch tower catch the booster — carry no landing legs at all', 20)}
    <line x1="740" y1="760" x2="740" y2="230" stroke="${LINE}" stroke-width="4"/>
    <line x1="700" y1="760" x2="780" y2="760" stroke="${LINE}" stroke-width="4"/>
    <g stroke="${GOLD}" stroke-width="4">
      <line x1="740" y1="360" x2="620" y2="330"/>
      <line x1="740" y1="360" x2="860" y2="330"/>
    </g>
    ${label(560, 320, 'ARMS', 15, 'end', GOLD)}
    <g transform="translate(690,360)"><rect x="0" y="0" width="100" height="230" rx="14" fill="rgba(127,176,224,0.16)" stroke="${ACC}" stroke-width="2.5"/><polygon points="0,0 100,0 50,-46" fill="${ACC}"/></g>
    <g stroke="${GOLD}" stroke-width="2" stroke-dasharray="6 6"><path d="M 740 150 L 740 320"/></g>
    ${label(1050, 420, 'no legs → less mass', 18, 'start')}
    ${label(1050, 452, 'flown, caught, restacked', 15, 'start')}
    ${label(760, 720, 'first clean catch: October 2024 — a 70-metre stage plucked from the sky', 18, 'middle', LINE)}
  `),

  // What reuse changes — cost per kilo to orbit collapses.
  'cost-curve': frame(`
    ${stars}
    ${label(80, 90, 'WHAT REUSE ACTUALLY CHANGES', 30, 'start', LINE)}
    ${label(80, 128, 'the price of a kilogram to orbit — the number that gates everything', 20)}
    <g stroke="${FAINT}" stroke-width="1.4"><line x1="240" y1="700" x2="1400" y2="700"/><line x1="240" y1="700" x2="240" y2="220"/></g>
    ${label(150, 460, 'COST / kg', 16, 'middle')}
    ${label(1300, 740, 'over time →', 16, 'middle')}
    ${dot(360, 280, 9, WHITE)} ${label(380, 274, 'SHUTTLE ≈ $54,000 / kg', 17, 'start')}
    ${dot(820, 560, 9, LINE)} ${label(840, 554, 'FALCON 9 (reused) ≈ $2,700 / kg', 17, 'start', LINE)}
    ${dot(1240, 660, 9, GOLD)} ${label(1240, 636, 'STARSHIP — goal: a fraction of that', 16, 'middle', GOLD)}
    <path d="M 360 280 C 560 470, 700 540, 820 560 C 1000 590, 1140 640, 1240 660" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${label(780, 780, 'drop the price 20-fold and missions that were unthinkable become schedule', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'reuse sketches');
