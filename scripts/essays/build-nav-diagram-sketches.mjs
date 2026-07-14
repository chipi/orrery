/**
 * Navigation essay — diagram SKETCHES (the SVG basis for the Wired-style
 * Higgsfield art). Each SVG is a precise, labelled compositional sketch in the
 * essay's palette (deep navy / cyan / white). We rasterize to PNG and feed each
 * as the structural reference to Higgsfield (nano_banana_pro), which restyles
 * it into "world as art" while preserving the geometry + labels.
 *
 * Run: node scripts/essays/build-nav-diagram-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/navigation/{slug}.svg (+ .png)
 * (Kept out of the shipped static/ tree — these are the Higgsfield input
 * sketches, not the final art; the restyled .webp live under static/images/.)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'navigation');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18';
const LINE = '#7fb0e0';
const ACC = '#cfe3fb';
const FAINT = 'rgba(127,176,224,0.14)';
const WHITE = '#ffffff';
const W = 1600;
const H = 900;

const frame = (
  inner,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g font-family="monospace" fill="${ACC}">${inner}</g>
</svg>`;

const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;

const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

// star field (deterministic, no RNG)
const stars = (() => {
  let s = '';
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 90; i++) {
    const x = Math.round(rnd() * W);
    const y = Math.round(rnd() * H);
    const r = rnd() * 1.4 + 0.3;
    s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  }
  return s;
})();

const diagrams = {
  // D1 — dead reckoning: a curving path from a known start, small accumulating
  // push-vectors, a widening drift cone, and a star-sighting that resets it.
  'dead-reckoning': frame(`
    ${stars}
    ${label(80, 90, 'DEAD RECKONING — THE HONEST COUNT', 30, 'start', LINE)}
    ${label(80, 128, 'know the start · add every push · the guess slowly drifts', 20)}
    <!-- drift cone -->
    <path d="M 240 620 L 1180 300 L 1180 560 Z" fill="${FAINT}"/>
    <!-- the flown path -->
    <path d="M 240 620 C 520 600, 760 500, 1180 430" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="10 8"/>
    ${dot(240, 620, 9, ACC)}
    ${label(200, 665, 'KNOWN START', 18)}
    <!-- accumulating push vectors -->
    <g stroke="${WHITE}" stroke-width="2.5">
      <line x1="400" y1="612" x2="452" y2="590"/><polygon points="452,590 440,588 448,600" fill="${WHITE}"/>
      <line x1="620" y1="560" x2="672" y2="540"/><polygon points="672,540 660,538 668,550" fill="${WHITE}"/>
      <line x1="860" y1="486" x2="912" y2="470"/><polygon points="912,470 900,468 908,480" fill="${WHITE}"/>
    </g>
    ${label(560, 700, 'each burn, each nudge — integrated', 18)}
    ${dot(1180, 430, 9, WHITE)}
    ${label(1000, 410, 'RUNNING GUESS', 18)}
    <!-- star sighting resets the drift -->
    <g transform="translate(1300,220)">
      <circle cx="0" cy="0" r="60" fill="none" stroke="${LINE}" stroke-width="2"/>
      <line x1="-60" y1="0" x2="60" y2="0" stroke="${LINE}" stroke-width="1.2"/>
      <line x1="0" y1="-60" x2="0" y2="60" stroke="${LINE}" stroke-width="1.2"/>
      <polygon points="18,-20 21,-8 33,-8 23,0 27,12 18,4 9,12 13,0 3,-8 15,-8" fill="${WHITE}"/>
      ${label(0, 100, 'SEXTANT / STAR FIX', 18, 'middle')}
      ${label(0, 124, 'resets the drift to zero', 16, 'middle')}
    </g>
  `),

  // D2 — the Deep Space Network: Earth with 3 dishes 120° apart, ranging +
  // Doppler out to a distant probe; the speed-of-light lag named.
  'deep-space-network': frame(`
    ${stars}
    ${label(80, 90, 'THE GROUND DOES THE FLYING', 30, 'start', LINE)}
    ${label(80, 128, 'three dishes, 120° apart — one always sees into deep space', 20)}
    <!-- Earth -->
    <circle cx="360" cy="480" r="120" fill="none" stroke="${LINE}" stroke-width="2.5"/>
    <circle cx="360" cy="480" r="120" fill="rgba(127,176,224,0.06)"/>
    ${label(360, 640, 'EARTH', 20, 'middle')}
    <!-- 3 dish stations -->
    <g fill="${WHITE}">
      <circle cx="360" cy="360" r="8"/><circle cx="464" cy="540" r="8"/><circle cx="256" cy="540" r="8"/>
    </g>
    ${label(360, 340, 'DSN', 15, 'middle', LINE)}
    <!-- beams to probe -->
    <g stroke="${LINE}" stroke-width="2" stroke-dasharray="4 10">
      <line x1="470" y1="400" x2="1320" y2="300"/>
      <line x1="470" y1="480" x2="1320" y2="330"/>
    </g>
    ${dot(1330, 315, 8, WHITE)}
    ${label(1330, 285, 'PROBE', 18, 'middle')}
    <!-- the two measured quantities -->
    ${label(720, 470, 'RANGE  →  round-trip light-time × c  (distance, ±metres)', 19, 'start', ACC)}
    ${label(720, 512, 'DOPPLER  →  radio frequency shift  (speed, ±mm/s)', 19, 'start', ACC)}
    <!-- lag -->
    ${label(720, 700, 'the one adversary: the speed of light', 20, 'start', LINE)}
    ${label(720, 732, 'Mars ≈ 3–22 min one way · Pluto ≈ 4.5 hours', 18)}
  `),

  // D3 — reference frame + star tracker: a craft matching a star pattern to an
  // onboard catalogue against the fixed J2000 grid; gyros carry between fixes.
  'reference-frame': frame(`
    ${stars}
    ${label(80, 90, 'WHICH WAY IS UP', 30, 'start', LINE)}
    ${label(80, 128, 'the sky never moves — measure yourself against it', 20)}
    <!-- J2000 grid sphere -->
    <g stroke="${FAINT}" stroke-width="1.4" fill="none">
      <circle cx="800" cy="480" r="300"/>
      <ellipse cx="800" cy="480" rx="300" ry="90"/>
      <ellipse cx="800" cy="480" rx="120" ry="300"/>
      <ellipse cx="800" cy="480" rx="220" ry="300"/>
    </g>
    ${label(800, 210, 'J2000 REFERENCE FRAME', 18, 'middle', LINE)}
    <!-- spacecraft at centre -->
    ${dot(800, 480, 10, WHITE)}
    <g stroke="${WHITE}" stroke-width="2">
      <line x1="800" y1="480" x2="900" y2="480"/><line x1="800" y1="480" x2="800" y2="380"/><line x1="800" y1="480" x2="730" y2="550"/>
    </g>
    ${label(820, 520, 'gyro axes', 15)}
    <!-- star-tracker cone to a constellation -->
    <path d="M 800 480 L 1180 250 L 1250 360 Z" fill="rgba(127,176,224,0.10)" stroke="${LINE}" stroke-width="1.5"/>
    <g fill="${WHITE}">
      <circle cx="1150" cy="300" r="4"/><circle cx="1200" cy="290" r="5"/><circle cx="1180" cy="330" r="3"/><circle cx="1230" cy="330" r="4"/>
    </g>
    <g stroke="${ACC}" stroke-width="1"><line x1="1150" y1="300" x2="1200" y2="290"/><line x1="1200" y1="290" x2="1230" y2="330"/><line x1="1230" y1="330" x2="1180" y2="330"/></g>
    ${label(1120, 400, 'STAR TRACKER', 18, 'middle')}
    ${label(1120, 424, 'match pattern → catalogue', 15, 'middle')}
    ${label(360, 700, 'between fixes the gyros carry the count;', 18)}
    ${label(360, 728, 'each clean star-fix resets the drift', 18)}
  `),

  // D4 — transfer + gravity assist: a Hohmann arc to Mars, and the Grand-Tour
  // slingshot chain past the giant planets.
  'gravity-assist': frame(`
    ${stars}
    ${label(80, 90, 'AIMING AT A MOVING PLANET', 30, 'start', LINE)}
    ${label(80, 128, 'fly the cheapest arc · steal a planet&#39;s motion for free', 20)}
    <!-- Sun -->
    ${dot(430, 500, 16, '#ffd27f')}
    ${label(430, 545, 'SUN', 16, 'middle')}
    <!-- orbits -->
    <g fill="none" stroke="${FAINT}" stroke-width="1.4">
      <circle cx="430" cy="500" r="90"/><circle cx="430" cy="500" r="170"/>
    </g>
    <!-- Hohmann transfer arc Earth->Mars -->
    <path d="M 520 500 A 130 130 0 0 1 430 330" fill="none" stroke="${LINE}" stroke-width="3" stroke-dasharray="10 8"/>
    ${dot(520, 500, 7, WHITE)} ${label(520, 528, 'EARTH', 14, 'middle')}
    ${dot(430, 330, 7, '#e08a6a')} ${label(430, 315, 'MARS', 14, 'middle')}
    ${label(300, 400, 'HOHMANN', 15, 'middle', ACC)}
    ${label(300, 422, 'TRANSFER', 15, 'middle', ACC)}
    <!-- gravity-assist slingshot chain -->
    <g>
      <path d="M 760 640 Q 940 560 980 470 T 1180 360 T 1360 250" fill="none" stroke="${WHITE}" stroke-width="3"/>
      ${dot(940, 560, 12, '#d9a066')} ${label(940, 600, 'JUPITER', 14, 'middle')}
      ${dot(1120, 400, 10, '#e6c66a')} ${label(1120, 440, 'SATURN', 14, 'middle')}
      ${dot(1280, 300, 8, '#8fd0d6')} ${label(1300, 300, 'URANUS · NEPTUNE', 14, 'start')}
    </g>
    ${label(760, 690, 'GRAND TOUR — each swing-by flings it faster, for free', 18, 'start', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  const svgPath = path.join(OUT, `${slug}.svg`);
  const pngPath = path.join(OUT, `${slug}.png`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(pngPath);
  console.log(`✓ ${slug} → ${svgPath} + ${pngPath}`);
}
console.log('done:', Object.keys(diagrams).length, 'sketches');
