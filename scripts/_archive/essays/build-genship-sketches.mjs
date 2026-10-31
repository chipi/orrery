/**
 * generational-starships essay ("The Ship Becomes a World") — diagram SKETCHES (blend basis).
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-genship-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'generational-starships');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  FAINT = 'rgba(127,176,224,0.14)',
  WHITE = '#ffffff',
  GOLD = '#ffd27f';
const W = 1600,
  H = 900;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const stars = (() => {
  let s = '',
    seed = 631;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 90; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Hero — the ship as a self-contained world.
  'the-ship-as-world': frame(`
    ${stars}
    ${label(80, 90, 'THE SHIP BECOMES A WORLD', 30, 'start', LINE)}
    ${label(80, 128, 'if we cannot go fast, we go slow — and carry a civilisation, not a crew', 20)}
    <g transform="translate(500,470)">
      <ellipse cx="0" cy="0" rx="380" ry="150" fill="rgba(127,176,224,0.08)" stroke="${LINE}" stroke-width="2.5"/>
      <ellipse cx="-380" cy="0" rx="34" ry="150" fill="none" stroke="${ACC}" stroke-width="2"/>
      <ellipse cx="380" cy="0" rx="34" ry="150" fill="none" stroke="${ACC}" stroke-width="2"/>
      <line x1="-380" y1="-150" x2="380" y2="-150" stroke="${FAINT}" stroke-width="1.4"/>
      <line x1="-380" y1="150" x2="380" y2="150" stroke="${FAINT}" stroke-width="1.4"/>
      <path d="M -300 60 Q -150 20 0 55 T 300 50" fill="none" stroke="rgba(255,210,127,0.5)" stroke-width="2"/>
      ${label(0, 40, 'fields · rivers · a sky of lamps', 15, 'middle', GOLD)}
    </g>
    ${label(500, 700, 'the people who arrive are the descendants of the people who left', 18, 'middle', LINE)}
  `),

  // A closed world — the ecology that must never fail.
  'closed-loop': frame(`
    ${stars}
    ${label(80, 90, 'NOTHING IN, NOTHING OUT', 30, 'start', LINE)}
    ${label(80, 128, 'a sealed ecology that has to run, unbroken, for centuries', 20)}
    <g fill="none" stroke="${LINE}" stroke-width="2.5"><circle cx="780" cy="460" r="200"/></g>
    ${[
      ['PLANTS', 780, 250, GOLD],
      ['OXYGEN', 990, 470, ACC],
      ['CREW', 780, 680, ACC],
      ['CO₂ + WASTE', 570, 470, ACC],
    ]
      .map(
        ([t, x, y, col]) =>
          `${dot(x, y, 9, col)} ${label(x, y + (y < 460 ? -18 : 34), t, 17, 'middle', col)}`,
      )
      .join('')}
    <g stroke="${GOLD}" stroke-width="2" fill="none">
      <path d="M 830 300 A 200 200 0 0 1 960 410"/><polygon points="960,410 944,404 956,392" fill="${GOLD}"/>
      <path d="M 960 540 A 200 200 0 0 1 840 640"/><polygon points="840,640 856,632 844,624" fill="${GOLD}"/>
      <path d="M 720 640 A 200 200 0 0 1 600 530"/><polygon points="600,530 616,536 604,548" fill="${GOLD}"/>
      <path d="M 600 400 A 200 200 0 0 1 730 300"/><polygon points="730,300 714,306 726,318" fill="${GOLD}"/>
    </g>
    ${label(1230, 420, 'water recycled', 15, 'start')}
    ${label(1230, 452, 'food grown', 15, 'start')}
    ${label(1230, 484, 'no resupply, ever', 15, 'start', '#e08a6a')}
    ${label(780, 800, 'Biosphere 2 could not hold its own oxygen for two years', 18, 'middle', LINE)}
  `),

  // The crew is a population — a town, not a crew.
  'the-population': frame(`
    ${stars}
    ${label(80, 90, 'A TOWN, NOT A CREW', 30, 'start', LINE)}
    ${label(80, 128, 'the passengers are a population — and it has to stay genetically healthy for generations', 20)}
    ${(() => {
      let g = '';
      let seed = 7;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < 140; i++) {
        const x = 300 + (i % 20) * 50 + rnd() * 8;
        const y = 240 + Math.floor(i / 20) * 46 + rnd() * 8;
        g += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="5" fill="rgba(127,176,224,${(0.4 + rnd() * 0.5).toFixed(2)})"/>`;
      }
      return g;
    })()}
    ${label(1360, 300, '≈ 14,000 people', 20, 'end', GOLD)}
    ${label(1360, 330, 'the minimum for a healthy', 14, 'end')}
    ${label(1360, 352, 'gene pool over 150 years', 14, 'end')}
    ${label(780, 660, 'a society, with its own governance, culture — and drift, across dozens of generations', 17, 'middle')}
    ${label(780, 800, 'not a crew you train; a people you launch', 18, 'middle', LINE)}
  `),

  // Will they arrive first? — the wait calculation.
  'the-wait-calculation': frame(`
    ${stars}
    ${label(80, 90, 'THE PARADOX OF LEAVING', 30, 'start', LINE)}
    ${label(80, 128, 'is it ever rational to depart? — the “wait calculation”', 20)}
    <line x1="200" y1="720" x2="1440" y2="720" stroke="${FAINT}" stroke-width="1.6"/>
    ${dot(240, 620, 8, LINE)} ${label(240, 600, 'LAUNCH NOW', 14, 'start', LINE)}
    <path d="M 240 620 L 1300 480" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${label(900, 520, 'the slow ship', 15, 'start', LINE)}
    ${dot(620, 660, 8, GOLD)} ${label(620, 690, 'LAUNCH LATER', 14, 'start', GOLD)}
    <path d="M 620 660 L 1300 300" fill="none" stroke="${GOLD}" stroke-width="3" stroke-dasharray="9 7"/>
    ${label(1010, 380, 'a faster ship, launched centuries on', 15, 'start', GOLD)}
    ${dot(1300, 300, 10, GOLD)}
    ${label(1160, 250, 'arrives first', 15, 'middle', GOLD)}
    ${label(800, 800, 'set out too early and a later, faster ship overtakes you — so when do you go?', 18, 'middle', LINE)}
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
console.log('done:', Object.keys(diagrams).length, 'genship sketches');
