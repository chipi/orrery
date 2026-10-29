/**
 * asteroid-mining essay ("The Wrong Treasure") — diagram SKETCHES (blend basis).
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-asteroid-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'asteroid-mining');
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
const rock = (cx, cy, r, fill = 'rgba(127,176,224,0.16)', stroke = LINE) => {
  let seed = cx + cy;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let pts = '';
  for (let a = 0; a < 360; a += 30) {
    const rr = r * (0.78 + rnd() * 0.3);
    const rad = (a * Math.PI) / 180;
    pts += `${(cx + rr * Math.cos(rad)).toFixed(0)},${(cy + rr * Math.sin(rad)).toFixed(0)} `;
  }
  return `<polygon points="${pts.trim()}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
};
const stars = (() => {
  let s = '',
    seed = 313;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Hero — the myth of the trillion-dollar asteroid, corrected.
  'wrong-treasure': frame(`
    ${stars}
    ${label(80, 90, 'THE POINT WAS NEVER THE GOLD', 30, 'start', LINE)}
    ${label(80, 128, 'the “quintillion-dollar asteroid” headline is economically illiterate', 20)}
    ${rock(430, 430, 130, 'rgba(255,210,127,0.18)', GOLD)}
    ${label(430, 300, '$10,000,000,000,000,000,000 ?', 18, 'middle', GOLD)}
    <g stroke="#e08a6a" stroke-width="5"><line x1="300" y1="300" x2="560" y2="560"/><line x1="560" y1="300" x2="300" y2="560"/></g>
    ${label(820, 380, 'deliver it to Earth →', 18, 'start')}
    ${label(840, 410, 'the market collapses', 16, 'start', '#e08a6a')}
    ${label(820, 480, 'haul it down the well →', 18, 'start')}
    ${label(840, 510, 'delivery eats the value', 16, 'start', '#e08a6a')}
    ${label(800, 700, 'the value is not the substance — it is where the substance already is', 18, 'middle', LINE)}
  `),

  // The gravity well is the enemy — position, not substance.
  'the-well': frame(`
    ${stars}
    ${label(80, 90, 'THE GRAVITY WELL IS THE ENEMY', 30, 'start', LINE)}
    ${label(80, 128, 'everything launched from Earth pays a fortune just to climb out', 20)}
    <path d="M 180 300 C 500 300, 640 720, 800 720 C 960 720, 1100 300, 1420 300" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${dot(800, 700, 22, '#4a6a9a')} ${label(800, 745, 'EARTH', 15, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="800" y1="690" x2="800" y2="330"/><polygon points="800,330 792,348 808,348" fill="${GOLD}"/></g>
    ${label(830, 420, 'every kilogram costs', 16, 'start', GOLD)}
    ${label(830, 446, 'a fortune in delta-v', 16, 'start')}
    ${rock(1260, 250, 44)} ${label(1260, 190, 'asteroid — already above the well', 14, 'middle')}
    ${label(800, 810, 'a litre of water in orbit is worth more than a litre of gold on the ground', 18, 'middle', LINE)}
  `),

  // Water is the ore.
  'water-is-the-ore': frame(`
    ${stars}
    ${label(80, 90, 'WATER IS THE ORE', 30, 'start', LINE)}
    ${label(80, 128, 'the prize is not metal to sell — it is fuel and air you never had to lift', 20)}
    ${rock(340, 470, 130, 'rgba(127,176,224,0.16)', LINE)} ${label(340, 470, 'H₂O', 22, 'middle', ACC)}
    ${label(340, 630, 'carbonaceous rock', 15, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="480" y1="470" x2="640" y2="470"/><polygon points="640,470 624,462 624,478" fill="${GOLD}"/></g>
    ${label(560, 445, 'split', 14, 'middle')}
    ${[
      ['H₂ + O₂', 'PROPELLANT', 300],
      ['O₂', 'AIR', 400],
      ['H₂O', 'WATER', 500],
      ['bulk rock', 'SHIELDING', 600],
    ]
      .map(
        ([a, b, y]) =>
          `${dot(700, y, 5, GOLD)} ${label(720, y - 2, a, 18, 'start', GOLD)} ${label(920, y - 2, '→  ' + b, 16, 'start')}`,
      )
      .join('')}
    ${label(800, 780, 'a fuel depot that is already in the sky, not a vault to be raided', 18, 'middle', LINE)}
  `),

  // We have already touched them — the three sample returns.
  'the-recon': frame(`
    ${stars}
    ${label(80, 90, 'WE HAVE ALREADY TOUCHED THEM', 30, 'start', LINE)}
    ${label(80, 128, 'three robotic sample returns — and what they found', 20)}
    ${[
      ['HAYABUSA', 'Itokawa · 2010', 'first asteroid sample', 300, GOLD],
      ['HAYABUSA2', 'Ryugu · 2020', 'water-bearing clay', 780, LINE],
      ['OSIRIS-REx', 'Bennu · 2023', 'organics + rubble', 1260, ACC],
    ]
      .map(
        ([probe, body, found, x, col]) =>
          `${rock(x, 430, 70, 'rgba(127,176,224,0.14)', col)}` +
          `${label(x, 300, probe, 18, 'middle', col)}` +
          `${label(x, 540, body, 15, 'middle')}` +
          `${label(x, 566, found, 14, 'middle', 'rgba(207,227,251,0.75)')}`,
      )
      .join('')}
    ${label(800, 720, 'rubble piles of water-bearing rock — not solid mountains of metal', 18, 'middle', LINE)}
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
console.log('done:', Object.keys(diagrams).length, 'asteroid sketches');
