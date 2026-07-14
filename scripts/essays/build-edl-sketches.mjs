/**
 * seven-minutes essay ("The Seven Minutes") — EDL diagram SKETCHES.
 * Same palette + pipeline as build-delta-v-sketches.mjs (docs/guides/diagram-art-style.md).
 * Run: node scripts/essays/build-edl-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'seven-minutes');
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
  let seed = 89;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // The atmosphere problem — turn speed into heat without dying of it.
  'entry-heat': frame(`
    ${stars}
    ${label(80, 90, 'ALL THAT SPEED HAS TO GO SOMEWHERE', 30, 'start', LINE)}
    ${label(80, 128, 'entry — a spacecraft arrives moving faster than a bullet, and the air turns it to fire', 20)}
    <path d="M 1360 240 Q 1500 320 1560 500" fill="none" stroke="${FAINT}" stroke-width="2"/>
    ${label(1420, 300, 'top of', 15, 'middle')} ${label(1420, 322, 'atmosphere', 15, 'middle')}
    <!-- capsule -->
    <g transform="translate(560,470) rotate(-25)">
      <path d="M -60 -70 L 60 -70 L 20 40 A 60 60 0 0 1 -20 40 Z" fill="rgba(127,176,224,0.16)" stroke="${ACC}" stroke-width="2.5"/>
      <path d="M -20 40 A 60 60 0 0 0 20 40" fill="${GOLD}" opacity="0.9"/>
    </g>
    <!-- plasma sheath -->
    <g stroke="${GOLD}" stroke-width="2" opacity="0.85">
      <path d="M 640 520 q 120 40 260 30"/><path d="M 650 560 q 140 60 300 60"/><path d="M 660 480 q 120 20 250 0"/>
    </g>
    ${label(980, 560, 'plasma — hotter than the Sun’s surface', 16, 'start', GOLD)}
    ${label(470, 610, 'HEAT SHIELD takes the fire', 16, 'middle')}
    ${label(300, 300, '~20,000 km/h', 22, 'start', WHITE)}
    ${label(300, 330, 'converted to heat, on purpose', 15, 'start')}
    ${label(760, 800, 'you do not slow down gently — you burn the speed off', 18, 'middle', LINE)}
  `),

  // Why the same answer never works twice — atmosphere sets the method.
  'edl-toolkit': frame(`
    ${stars}
    ${label(80, 90, 'THE SAME ANSWER NEVER WORKS TWICE', 30, 'start', LINE)}
    ${label(80, 128, 'how much air a world has decides how you are allowed to land', 20)}
    ${[
      ['MOON', 'no air', 'rockets, all the way down', 300, 8],
      ['MARS', 'a wisp of air', 'shield + chute + rockets', 620, 30],
      ['EARTH', 'thick air', 'shield + parachute', 940, 80],
      ['TITAN', 'thick + cold', 'just a parachute, and patience', 1260, 100],
    ]
      .map(([w, air, method, x, bar]) => {
        const h = Number(bar);
        return (
          `${dot(x, 300, 34, 'rgba(127,176,224,0.18)')}` +
          `${label(x, 240, w, 20, 'middle', LINE)}` +
          `<rect x="${x - 40}" y="${400 - h}" width="80" height="${h}" fill="rgba(207,227,251,0.28)" stroke="${ACC}" stroke-width="1.4"/>` +
          `${label(x, 440, air, 15, 'middle')}` +
          `${label(x, 520, method, 14, 'middle', ACC)}`
        );
      })
      .join('')}
    ${label(760, 620, 'thin air → carry your own brakes;  thick air → let the sky do the work', 18, 'middle')}
    ${label(760, 800, 'every arrival is a different physics problem, solved from scratch', 18, 'middle', LINE)}
  `),

  // The worlds that do not forgive — the Mars seven-minute sequence.
  'mars-edl': frame(`
    ${stars}
    ${label(80, 90, 'SEVEN MINUTES, AND NOBODY DRIVING', 30, 'start', LINE)}
    ${label(80, 128, 'Mars — too thin to parachute down, too thick to ignore', 20)}
    <path d="M 200 240 C 500 320, 900 560, 1300 740" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${[
      ['ENTRY  ~20,000 km/h', 210, 250, WHITE],
      ['PEAK HEATING', 470, 350, GOLD],
      ['SUPERSONIC PARACHUTE', 720, 470, ACC],
      ['HEAT-SHIELD SEP', 900, 560, ACC],
      ['POWERED DESCENT', 1080, 650, ACC],
      ['SKY CRANE → TOUCHDOWN', 1280, 745, GOLD],
    ]
      .map(([t, x, y, col]) => `${dot(x, y, 7, col)} ${label(x + 16, y + 4, t, 15, 'start', col)}`)
      .join('')}
    ${label(300, 700, 'total: about seven minutes', 18, 'start', GOLD)}
    ${label(300, 728, 'each step must fire on time, alone', 15, 'start')}
  `),

  // The part you cannot test — the light-lag blackout.
  blackout: frame(`
    ${stars}
    ${dot(300, 460, 60, GOLD)} ${label(300, 550, 'EARTH', 15, 'middle')}
    ${label(80, 90, 'IT IS OVER BEFORE WE KNOW IT BEGAN', 30, 'start', LINE)}
    ${label(80, 128, 'Mars is light-minutes away — farther than the whole landing lasts', 20)}
    <g stroke="${FAINT}" stroke-width="1.6" stroke-dasharray="8 8"><line x1="360" y1="460" x2="1200" y2="460"/></g>
    ${dot(1240, 460, 34, '#e08a6a')} ${label(1240, 530, 'MARS', 15, 'middle')}
    ${label(780, 430, 'radio: 3–22 light-MINUTES each way', 17, 'middle')}
    <g stroke="${GOLD}" stroke-width="2.5"><line x1="1206" y1="460" x2="1120" y2="460"/><polygon points="1120,460 1134,452 1134,468" fill="${GOLD}"/></g>
    ${label(1120, 610, 'the 7-minute landing fits *inside* the lag', 16, 'middle', GOLD)}
    ${label(1120, 636, 'the craft is entirely on its own', 15, 'middle')}
    ${label(780, 740, 'by the time Earth hears “entering the atmosphere,” it is already down —', 18, 'middle', LINE)}
    ${label(780, 768, 'safe or dead, decided minutes ago', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'edl sketches');
