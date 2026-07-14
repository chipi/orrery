/**
 * the-body-in-the-dark essay ("The Body in the Dark") — diagram SKETCHES (blend basis).
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-body-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'the-body-in-the-dark');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18', LINE = '#7fb0e0', ACC = '#cfe3fb', FAINT = 'rgba(127,176,224,0.14)', WHITE = '#ffffff', GOLD = '#ffd27f';
const W = 1600, H = 900;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
// simple astronaut figure
const figure = (cx, cy, s = 1, col = ACC) =>
  `<g transform="translate(${cx},${cy}) scale(${s})" fill="none" stroke="${col}" stroke-width="3">
     <circle cx="0" cy="-90" r="34"/>
     <path d="M -40 -50 Q 0 -60 40 -50 L 34 60 Q 0 72 -34 60 Z"/>
     <line x1="-40" y1="-40" x2="-78" y2="30"/><line x1="40" y1="-40" x2="78" y2="30"/>
     <line x1="-20" y1="66" x2="-30" y2="150"/><line x1="20" y1="66" x2="30" y2="150"/>
   </g>`;
const stars = (() => { let s = '', seed = 419; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++) s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s; })();

const diagrams = {
  // Hero — the human as the fragile payload the whole enterprise carries.
  'fragile-payload': frame(`
    ${stars}
    ${label(80, 90, 'THE PART THAT CANNOT BE RE-SPECCED', 30, 'start', LINE)}
    ${label(80, 128, 'every other system serves one fragile, degrading cargo', 20)}
    ${figure(780, 400, 1.25, ACC)}
    ${[
      ['THE MIND — isolation, confinement', 1010, 320, GOLD, 900, 310],
      ['EYES — vision flattens (SANS)', 1010, 380, LINE, 812, 340],
      ['IMMUNE SYSTEM — weakened', 1010, 440, LINE, 820, 430],
      ['BONE — lost, ~1% a month', 560, 380, GOLD, 720, 400],
      ['MUSCLE — wastes away', 540, 460, LINE, 700, 470],
      ['BLOOD — shifts to the head', 540, 540, LINE, 740, 470],
    ].map(([t, tx, ty, col, ax, ay]) =>
      `<line x1="${ax}" y1="${ay}" x2="${tx < 780 ? tx + 250 : tx - 10}" y2="${ty - 5}" stroke="${FAINT}" stroke-width="1.4"/>` +
      label(tx, ty, t, 15, tx < 780 ? 'end' : 'start', col)
    ).join('')}
    ${label(780, 760, 'the traveller is the payload — and the payload is biology', 18, 'middle', LINE)}
  `),

  // The invisible weather — radiation you cannot practically shield.
  'radiation-weather': frame(`
    ${stars}
    ${label(80, 90, 'THE ONE YOU CANNOT SHIELD', 30, 'start', LINE)}
    ${label(80, 128, 'beyond Earth’s magnetic field, radiation is the hardest wall of all', 20)}
    ${dot(230, 300, 40, GOLD)} ${label(230, 250, 'THE SUN', 14, 'middle')}
    ${label(1180, 250, 'the galaxy', 14, 'middle')}
    <g stroke="${GOLD}" stroke-width="1.6" opacity="0.85">${[420,460,500].map(y=>`<line x1="270" y1="330" x2="760" y2="${y}"/>`).join('')}</g>
    ${label(430, 400, 'solar particle storms', 14, 'middle', GOLD)}
    <g stroke="${LINE}" stroke-width="1.6" opacity="0.7">${[430,470,510].map(y=>`<line x1="1140" y1="300" x2="760" y2="${y}"/>`).join('')}</g>
    ${label(1010, 560, 'galactic cosmic rays', 14, 'middle', LINE)}
    <rect x="740" y="400" width="120" height="120" rx="10" fill="rgba(127,176,224,0.14)" stroke="${ACC}" stroke-width="2"/>
    ${label(800, 466, 'crew', 14, 'middle')}
    ${label(800, 610, 'shielding heavy enough to stop it', 16, 'middle')}
    ${label(800, 636, 'is too heavy to fly', 16, 'middle', '#e08a6a')}
    ${label(800, 800, 'a dose measured over years, with no wall light enough to hide behind', 18, 'middle', LINE)}
  `),

  // The body forgets gravity — the microgravity toll.
  'microgravity-toll': frame(`
    ${stars}
    ${label(80, 90, 'THE BODY FORGETS GRAVITY', 30, 'start', LINE)}
    ${label(80, 128, 'in free fall, a body optimised for 1g quietly comes apart', 20)}
    ${figure(420, 420, 1.35, ACC)}
    ${[
      ['FLUID shifts upward → puffy face, flat eyeballs (SANS)', 700, 320, GOLD],
      ['BONE loss ≈ 1–1.5% every month', 700, 400, LINE],
      ['MUSCLE atrophies without load', 700, 470, LINE],
      ['HEART + vessels deteriorate', 700, 540, LINE],
    ].map(([t, x, y, col]) => `${dot(x - 20, y - 6, 5, col)} ${label(x, y, t, 17, 'start', col)}`).join('')}
    ${label(800, 720, 'two hours of exercise a day only slows the losses — it does not stop them', 18, 'middle', LINE)}
  `),

  // What we know because someone stayed — the endurance record.
  'the-record': frame(`
    ${stars}
    ${label(80, 90, 'WHAT WE KNOW BECAUSE SOMEONE STAYED', 30, 'start', LINE)}
    ${label(80, 128, 'the data exists only because people lived up there — and it is global', 20)}
    ${[
      ['POLYAKOV · Mir (USSR/Russia)', '437 days — the record', 300, 1180, GOLD],
      ['KELLY · ISS (USA, Twins Study)', '340 days', 400, 940, LINE],
      ['ISS standard rotation', '~180 days', 500, 560, ACC],
      ['Tiangong crews (China)', '~180 days', 600, 560, ACC],
    ].map(([name, val, y, w, col]) =>
      `<rect x="440" y="${y - 26}" width="${w}" height="34" rx="6" fill="rgba(127,176,224,0.16)" stroke="${col}" stroke-width="2"/>` +
      label(430, y - 2, name, 16, 'end', col) +
      label(440 + Number(w) + 16, y - 2, val, 15, 'start', col)
    ).join('')}
    ${label(800, 760, 'every number here is a person who volunteered to be the experiment', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'body sketches');
