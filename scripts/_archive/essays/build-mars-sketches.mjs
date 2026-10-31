/**
 * going-to-mars essay ("The Wall") — diagram SKETCHES (blend basis).
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-mars-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'going-to-mars');
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
    seed = 211;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Hero — the three walls Mars breaks on.
  'three-walls': frame(`
    ${stars}
    ${label(80, 90, 'THE WALL EVERY PLAN BREAKS ON', 30, 'start', LINE)}
    ${label(80, 128, 'Mars is not Apollo, further — it breaks on three things at once', 20)}
    ${[
      [
        'TIME',
        ['a window every ~26 months', '6–9 months each way', 'no abort back to Earth'],
        320,
        GOLD,
      ],
      [
        'MASS',
        ['everything, for years', 'no resupply, ever', 'make your own return fuel'],
        780,
        LINE,
      ],
      [
        'THE BODY',
        ['radiation with no shield', 'bone and muscle waste', 'a mind alone for years'],
        1240,
        ACC,
      ],
    ]
      .map(
        ([t, lines, x, col]) =>
          `<rect x="${x - 150}" y="220" width="300" height="380" rx="10" fill="rgba(127,176,224,0.06)" stroke="${col}" stroke-width="2"/>` +
          `${label(x, 285, t, 24, 'middle', col)}` +
          lines.map((l, i) => label(x, 350 + i * 54, l, 16, 'middle')).join(''),
      )
      .join('')}
    ${label(800, 700, 'clear one wall and the next two are still standing', 18, 'middle', LINE)}
  `),

  // You cannot leave when you want — the synodic window.
  'launch-window': frame(`
    ${stars}
    ${label(80, 90, 'YOU LEAVE ON THE UNIVERSE’S SCHEDULE', 30, 'start', LINE)}
    ${label(80, 128, 'the launch window opens only when the planets line up — every ~26 months', 20)}
    ${dot(760, 470, 20, GOLD)} ${label(760, 512, 'SUN', 15, 'middle')}
    <g fill="none" stroke="${FAINT}" stroke-width="1.4"><circle cx="760" cy="470" r="150"/><circle cx="760" cy="470" r="290"/></g>
    ${dot(910, 470, 8, '#6aa0d8')} ${label(930, 474, 'EARTH', 14, 'start')}
    ${dot(470, 470, 8, '#e08a6a')} ${label(450, 474, 'MARS', 14, 'end')}
    <ellipse cx="690" cy="470" rx="220" ry="205" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="10 8"/>
    ${label(690, 250, 'the ~6–9 month transfer arc', 15, 'middle', LINE)}
    ${label(1180, 400, 'miss the window →', 16, 'start')}
    ${label(1180, 428, 'wait two years', 16, 'start', GOLD)}
    ${label(1180, 520, 'once you go,', 16, 'start')}
    ${label(1180, 548, 'there is no turning back', 16, 'start', '#e08a6a')}
    ${label(760, 800, 'the trip that will not bend to a schedule or a budget', 18, 'middle', LINE)}
  `),

  // Everything for years — ISRU + the return-fuel problem.
  'isru-return': frame(`
    ${stars}
    ${label(80, 90, 'CARRY IT ALL, OR MAKE IT THERE', 30, 'start', LINE)}
    ${label(80, 128, 'hauling the return propellant from Earth is nearly impossible — so you make it on Mars', 20)}
    <path d="M 200 640 q 300 -40 600 0 t 600 0" fill="none" stroke="rgba(224,138,106,0.5)" stroke-width="2"/>
    ${label(320, 610, 'CO₂ atmosphere', 16, 'start')}
    <g transform="translate(700,470)"><rect x="0" y="0" width="90" height="120" rx="8" fill="rgba(127,176,224,0.16)" stroke="${ACC}" stroke-width="2"/><polygon points="0,0 90,0 45,-40" fill="${ACC}"/><line x1="30" y1="120" x2="10" y2="160" stroke="${ACC}" stroke-width="3"/><line x1="60" y1="120" x2="80" y2="160" stroke="${ACC}" stroke-width="3"/></g>
    ${label(745, 445, 'MOXIE', 15, 'middle', GOLD)}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="600" y1="560" x2="700" y2="540"/><polygon points="700,540 686,536 690,552" fill="${GOLD}"/></g>
    ${label(560, 590, 'CO₂ in', 14, 'end')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="790" y1="530" x2="900" y2="510"/><polygon points="900,510 886,508 888,524" fill="${GOLD}"/></g>
    ${label(920, 514, 'O₂ out → propellant + air', 16, 'start', GOLD)}
    ${label(800, 760, 'MOXIE made oxygen from Martian air — the first factory on another world', 18, 'middle', LINE)}
  `),

  // The body keeps the score — no magnetosphere, three years exposed.
  radiation: frame(`
    ${stars}
    ${label(80, 90, 'NO SHIELD, AND YEARS IN THE OPEN', 30, 'start', LINE)}
    ${label(80, 128, 'the one wall the mission cannot engineer around', 20)}
    ${dot(240, 460, 46, GOLD)} ${label(240, 540, 'THE SUN', 14, 'middle')}
    <g stroke="${GOLD}" stroke-width="1.6" opacity="0.8">${[420, 450, 480, 510].map((y) => `<line x1="290" y1="460" x2="1360" y2="${y}"/>`).join('')}</g>
    ${label(700, 400, 'galactic cosmic rays + solar particle storms', 15, 'middle', GOLD)}
    ${dot(760, 470, 34, '#6aa0d8')} <ellipse cx="760" cy="470" rx="70" ry="70" fill="none" stroke="${LINE}" stroke-width="2"/>
    ${label(760, 560, 'EARTH — a magnetic shield', 14, 'middle', LINE)}
    ${dot(1300, 480, 26, '#e08a6a')} ${label(1300, 540, 'MARS — none', 14, 'middle', '#e08a6a')}
    ${label(1300, 400, '≈ 300 mSv', 18, 'middle', WHITE)}
    ${label(1300, 424, 'on the transit alone', 13, 'middle')}
    ${label(800, 800, 'a three-year round trip is a dose no shielding you can lift will stop', 18, 'middle', LINE)}
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
console.log('done:', Object.keys(diagrams).length, 'mars sketches');
