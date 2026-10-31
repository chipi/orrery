/**
 * comms essay — diagram SKETCHES (SVG basis for the Higgsfield "blend" art).
 * Same palette + pipeline as build-delta-v-sketches.mjs (see docs/guides/diagram-art-style.md).
 * Run: node scripts/essays/build-comms-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/comms/{slug}.svg (+ .png)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'comms');
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
const dish = (x, y, s = 1, fill = LINE) =>
  `<g transform="translate(${x},${y}) scale(${s})" stroke="${fill}" stroke-width="2.5" fill="none"><path d="M -22 0 A 22 22 0 0 1 22 0" /><line x1="0" y1="0" x2="0" y2="18"/><line x1="-12" y1="18" x2="12" y2="18"/></g>`;
const stars = (() => {
  let s = '';
  let seed = 23;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // Three complexes ~120° apart — one dish always faces the target as Earth turns.
  coverage: frame(`
    ${stars}
    ${label(80, 90, 'ONE DISH ALWAYS FACING THE SKY', 30, 'start', LINE)}
    ${label(80, 128, 'three complexes ~120° apart — Earth turns, the call never drops', 20)}
    <circle cx="740" cy="500" r="200" fill="rgba(127,176,224,0.08)" stroke="${LINE}" stroke-width="2"/>
    <g stroke="${FAINT}" stroke-width="1.2"><line x1="740" y1="300" x2="740" y2="700"/><line x1="540" y1="500" x2="940" y2="500"/></g>
    ${dish(740, 300, 1.6, GOLD)} ${label(740, 268, 'GOLDSTONE (USA)', 16, 'middle')}
    ${dish(913, 600, 1.6, LINE)} ${label(1000, 640, 'CANBERRA (AUS)', 16, 'start')}
    ${dish(567, 600, 1.6, LINE)} ${label(480, 640, 'MADRID (ESP)', 16, 'end')}
    ${label(740, 520, '~120°', 16, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5" stroke-dasharray="8 6"><line x1="740" y1="282" x2="1300" y2="180"/></g>
    ${dot(1310, 178, 8, GOLD)} ${label(1330, 182, 'the target', 16, 'start', GOLD)}
    ${label(740, 780, 'continuous coverage of the entire deep sky, all day, every day', 18, 'middle', LINE)}
  `),

  // Link budget — 22 W spread by inverse-square down to ~10^-18 W, caught by a 70 m ear.
  'link-budget': frame(`
    ${stars}
    ${label(80, 90, 'A WHISPER, AND THE INVERSE-SQUARE CRUELTY', 30, 'start', LINE)}
    ${label(80, 128, 'a spacecraft transmits on ~20 watts — a household bulb is 3×', 20)}
    ${dot(230, 470, 10, GOLD)} ${label(230, 430, '~20 W OUT', 16, 'middle', GOLD)}
    ${label(230, 452, 'a refrigerator bulb', 13, 'middle')}
    <g fill="none" stroke="${LINE}" stroke-width="1.8" opacity="0.85">
      <path d="M 250 470 L 1180 300"/><path d="M 250 470 L 1180 640"/>
      <path d="M 620 470 A 190 190 0 0 1 620 470" />
    </g>
    <g stroke="${FAINT}" stroke-width="1.4"><path d="M 640 350 A 150 150 0 0 0 640 590"/><path d="M 900 320 A 210 210 0 0 0 900 620"/></g>
    ${label(560, 720, 'power falls as 1 / distance²', 18, 'middle')}
    <g transform="translate(1230,470)">${dish(0, 0, 3.4, ACC)}</g>
    ${label(1250, 360, '70-m DISH', 16, 'middle')}
    ${label(1250, 384, 'the ear', 13, 'middle')}
    ${label(1250, 640, 'RECEIVED ≈ 10⁻¹⁸ W', 18, 'middle', GOLD)}
    ${label(1250, 664, 'a billionth of a billionth', 13, 'middle')}
    ${label(740, 800, 'the marvel is not the shout — it is the listening', 18, 'middle', LINE)}
  `),

  // Light-time ladder — you cannot steer live, only send and wait.
  'light-time': frame(`
    ${stars}
    ${label(80, 90, 'THE CONVERSATION RUNS ON DELAY', 30, 'start', LINE)}
    ${label(80, 128, 'round-trip light-time — send, then wait for the echo', 20)}
    <line x1="300" y1="220" x2="300" y2="760" stroke="${FAINT}" stroke-width="1.6"/>
    ${[
      ['MOON', '≈ 2.6 seconds', 250],
      ['MARS', '≈ 6–44 minutes', 350],
      ['JUPITER', '≈ 1.4 hours', 450],
      ['SATURN', '≈ 2.6 hours', 550],
      ['VOYAGER 1', '≈ 45 hours', 660],
    ]
      .map(
        ([b, t, y]) =>
          `${dot(300, y, 7, y === 660 ? GOLD : WHITE)} ${label(330, y - 4, b, 20, 'start', y === 660 ? GOLD : ACC)} ${label(330, y + 22, t, 16)}`,
      )
      .join('')}
    ${label(760, 800, 'you do not fly the craft — you write it a letter and hope', 18, 'middle', LINE)}
  `),

  // The turn toward light — radio wide beam vs laser pencil beam, far more bits.
  optical: frame(`
    ${stars}
    ${label(80, 90, 'THE TURN TOWARD LIGHT', 30, 'start', LINE)}
    ${label(80, 128, 'optical comms — a tighter beam carries far more of the story', 20)}
    ${dot(230, 320, 8, LINE)} ${label(230, 288, 'RADIO', 18, 'middle', LINE)}
    <path d="M 250 320 L 1200 210 L 1200 430 Z" fill="rgba(127,176,224,0.10)" stroke="${LINE}" stroke-width="1.6"/>
    ${label(1210, 320, 'wide beam · fewer bits', 16, 'start')}
    ${dot(230, 620, 8, GOLD)} ${label(230, 588, 'LASER (DSOC)', 18, 'middle', GOLD)}
    <path d="M 250 620 L 1200 596 L 1200 644 Z" fill="rgba(255,210,127,0.16)" stroke="${GOLD}" stroke-width="1.6"/>
    ${label(1210, 624, 'pencil beam · 10–100× the data', 16, 'start', GOLD)}
    ${label(760, 770, 'Psyche beamed HD video from 30 million km on a beam of light', 18, 'middle', LINE)}
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
console.log('done:', Object.keys(diagrams).length, 'comms sketches');
