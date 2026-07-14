/**
 * new-propulsion essay ("The Exits We've Always Known") — diagram SKETCHES.
 * Same palette + pipeline as build-delta-v-sketches.mjs (docs/guides/diagram-art-style.md).
 * Run: node scripts/essays/build-propulsion-sketches.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'new-propulsion');
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
  let seed = 67;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 80; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.3 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  // The slow push — ion drive's feeble thrust wins the long race.
  'ion-drive': frame(`
    ${stars}
    ${label(80, 90, 'THE SLOW PUSH WINS THE LONG RACE', 30, 'start', LINE)}
    ${label(80, 128, 'ion drive — a breath of thrust, held for years', 20)}
    <g stroke="${FAINT}" stroke-width="1.4"><line x1="240" y1="700" x2="1400" y2="700"/><line x1="240" y1="700" x2="240" y2="220"/></g>
    ${label(150, 460, 'SPEED', 16, 'middle')}
    ${label(1320, 740, 'time →', 16, 'middle')}
    <!-- chemical: big jump then flat -->
    <path d="M 240 700 L 300 360 L 1400 300" fill="none" stroke="${WHITE}" stroke-width="3" stroke-dasharray="9 7"/>
    ${label(1120, 288, 'CHEMICAL — one shove, then coast', 16, 'start', WHITE)}
    <!-- ion: slow linear climb crossing above -->
    <path d="M 240 700 C 600 660, 1000 470, 1400 230" fill="none" stroke="${LINE}" stroke-width="3"/>
    ${label(1160, 235, 'ION — gentle, relentless', 16, 'start', LINE)}
    ${dot(1030, 372, 9, GOLD)} ${label(1030, 352, 'it passes chemical, and never looks back', 15, 'middle', GOLD)}
    ${label(760, 780, 'a gram of push, never switched off, beats a giant shove that ends', 18, 'middle', LINE)}
  `),

  // Without propellant — a solar sail rides sunlight, carries no fuel.
  'solar-sail': frame(`
    ${stars}
    ${label(80, 90, 'THE ONLY FREE PUSH', 30, 'start', LINE)}
    ${label(80, 128, 'a solar sail rides the pressure of sunlight — and carries no fuel', 20)}
    ${dot(230, 460, 46, GOLD)} ${label(230, 540, 'THE SUN', 15, 'middle')}
    <g stroke="${GOLD}" stroke-width="1.8" opacity="0.8">
      <line x1="290" y1="430" x2="820" y2="330"/><line x1="290" y1="450" x2="820" y2="420"/>
      <line x1="290" y1="475" x2="820" y2="520"/><line x1="290" y1="495" x2="820" y2="610"/>
    </g>
    ${label(540, 300, 'photons — a constant, gentle pressure', 15, 'middle', GOLD)}
    <g transform="translate(900,470) rotate(20)"><rect x="-10" y="-170" width="20" height="340" fill="rgba(207,227,251,0.18)" stroke="${ACC}" stroke-width="2"/><line x1="0" y1="-170" x2="0" y2="170" stroke="${ACC}" stroke-width="1"/></g>
    ${dot(905, 470, 6, WHITE)}
    <g stroke="${LINE}" stroke-width="3"><line x1="960" y1="470" x2="1120" y2="470"/><polygon points="1120,470 1104,462 1104,478" fill="${LINE}"/></g>
    ${label(1140, 474, 'thrust', 16, 'start')}
    ${label(1150, 560, 'NO PROPELLANT', 20, 'start', LINE)}
    ${label(1150, 590, 'accelerates as long as the light falls', 15, 'start')}
    ${label(760, 800, 'no tank to run dry — only the slow, endless lean of light', 18, 'middle', LINE)}
  `),

  // The heat of the nucleus — a reactor doubles the exhaust velocity.
  'nuclear-thermal': frame(`
    ${stars}
    ${label(80, 90, 'THE HEAT OF THE NUCLEUS', 30, 'start', LINE)}
    ${label(80, 128, 'nuclear-thermal — a reactor heats hydrogen far past any flame', 20)}
    <rect x="300" y="380" width="180" height="160" rx="10" fill="rgba(255,210,127,0.14)" stroke="${GOLD}" stroke-width="2.5"/>
    ${label(390, 350, 'REACTOR', 16, 'middle', GOLD)}
    <g stroke="${GOLD}" stroke-width="1.4"><circle cx="390" cy="460" r="20"/><circle cx="390" cy="460" r="34"/></g>
    ${label(180, 460, 'liquid H₂ →', 16, 'middle')}
    <line x1="240" y1="460" x2="300" y2="460" stroke="${ACC}" stroke-width="2"/>
    <path d="M 480 420 L 700 400 L 700 520 L 480 500 Z" fill="rgba(127,176,224,0.14)" stroke="${LINE}" stroke-width="2"/>
    ${label(590, 470, 'nozzle', 13, 'middle')}
    <g stroke="${GOLD}" stroke-width="3"><line x1="700" y1="460" x2="1080" y2="460"/><polygon points="1080,460 1058,450 1058,470" fill="${GOLD}"/></g>
    ${label(900, 435, 'exhaust ≈ 2× chemical', 17, 'middle', GOLD)}
    ${label(1120, 464, 'twice the push per kilo', 16, 'start')}
    ${label(760, 760, 'no burning — just fierce heat, and hydrogen thrown out hard', 18, 'middle', LINE)}
  `),

  // Where the exits lead — the efficiency (Isp) ladder.
  'isp-ladder': frame(`
    ${stars}
    ${label(80, 90, 'HOW HARD EACH ENGINE THROWS', 30, 'start', LINE)}
    ${label(80, 128, 'efficiency (specific impulse) — seconds; higher means less fuel for the same push', 20)}
    ${[
      ['CHEMICAL', 'the century-old ceiling', '≈ 450 s', 300, 300, WHITE],
      ['NUCLEAR-THERMAL', 'heat, not flame', '≈ 900 s', 400, 560, LINE],
      ['ION DRIVE', 'the slow push', '≈ 3,000+ s', 500, 900, LINE],
      ['SOLAR SAIL', 'no propellant at all', '∞', 600, 1200, GOLD],
    ]
      .map(
        ([name, note, val, y, w, col]) =>
          `<rect x="360" y="${y - 26}" width="${w}" height="34" rx="6" fill="rgba(127,176,224,0.16)" stroke="${col}" stroke-width="2"/>` +
          `${label(350, y - 2, name, 18, 'end', col)}` +
          `${label(372, y - 2, note, 13, 'start', 'rgba(207,227,251,0.7)')}` +
          `${label(360 + Number(w) + 20, y - 2, val, 17, 'start', col)}`
      )
      .join('')}
    ${label(760, 780, 'the exits were all sketched before the first satellite flew', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'propulsion sketches');
