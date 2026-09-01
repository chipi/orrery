/**
 * Schematic diagrams for the 6 new Physics-Lab-derived /science articles (#32).
 * House style: docs/guides/diagram-art-style.md (deterministic in-palette sketch).
 * Run: node scripts/essays/build-lab-systems-science-sketches.mjs
 * Outputs BOTH the source .svg and the shipped .webp to static/diagrams/science/
 *   lifting-entry · skip-entry · entry-footprint · ascent-guidance · escape-velocity · synodic-period
 * (schematic quality — the polished Higgsfield pass is a later follow-up.)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'static', 'diagrams', 'science');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  WHITE = '#ffffff',
  GOLD = '#ffd27f',
  WARN = '#e08a6a';
const W = 1600,
  H = 900;

const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${esc(t)}</text>`;
const dot = (x, y, r = 7, fill = WHITE) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const arrow = (x1, y1, x2, y2, col = LINE, w = 2.5) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const a = 14;
  const bx = x2 - a * Math.cos(ang - 0.4),
    by = y2 - a * Math.sin(ang - 0.4);
  const cx = x2 - a * Math.cos(ang + 0.4),
    cy = y2 - a * Math.sin(ang + 0.4);
  return `<g stroke="${col}" stroke-width="${w}" fill="${col}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><polygon points="${x2},${y2} ${bx.toFixed(0)},${by.toFixed(0)} ${cx.toFixed(0)},${cy.toFixed(0)}"/></g>`;
};
const stars = (() => {
  let s = '',
    seed = 421;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 70; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.2 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();
const head = (t, sub) => `${label(80, 88, t, 28, 'start', LINE)}${label(80, 124, sub, 18)}`;

const diagrams = {
  'lifting-entry': frame(`
    ${stars}
    ${head('LIFTING ENTRY — STEERING WITH BANK', 'a capsule offsets its centre of mass to fly with a little lift; rolling aims it')}
    <!-- capsule cross-section (left) with offset CG + lift vector -->
    <g transform="translate(360,470)">
      <path d="M -70 -78 L 70 -78 L 46 6 L -46 6 Z" fill="rgba(207,227,251,0.10)" stroke="${ACC}" stroke-width="2.4"/>
      <path d="M -46 6 Q 0 70 46 6 Z" fill="rgba(255,210,127,0.18)" stroke="${GOLD}" stroke-width="2.6"/>
      ${dot(14, -20, 6, WARN)} ${label(26, -16, 'CG (offset)', 13, 'start', WARN)}
      ${label(0, 96, 'HEAT SHIELD', 13, 'middle', GOLD)}
      ${arrow(0, -8, -74, -70, GOLD, 3)}
      ${label(-96, -78, 'LIFT', 15, 'end', GOLD)}
      ${arrow(0, -8, 6, -108, LINE, 2.2)}
      ${label(18, -104, 'velocity', 13, 'start')}
    </g>
    ${label(360, 300, 'L/D ≈ 0.3 — small, but not zero', 15, 'middle')}
    <!-- roll dial -->
    <g transform="translate(360,690)">
      <circle r="52" fill="none" stroke="${LINE}" stroke-width="1.6" opacity="0.7"/>
      ${arrow(0, 0, 0, -50, GOLD, 2.4)}
      ${arrow(0, 0, 40, -30, ACC, 2)}
      ${label(0, 78, 'BANK ANGLE φ — the one control', 13, 'middle')}
    </g>
    <!-- Earth limb + corridor (right) -->
    <path d="M 780 1080 A 1200 1200 0 0 1 1720 720" fill="rgba(127,176,224,0.06)" stroke="${LINE}" stroke-width="2.2"/>
    ${label(1500, 900, 'EARTH', 16, 'middle', LINE)}
    <path d="M 760 470 A 1400 1400 0 0 1 1560 420" fill="none" stroke="${ACC}" stroke-width="1.2" stroke-dasharray="7 8" opacity="0.7"/>
    ${label(800, 452, 'ENTRY INTERFACE', 14, 'start', ACC)}
    ${dot(900, 486, 8, WHITE)}
    <!-- lift-up: float, far, low-g -->
    <path d="M 900 486 Q 1180 470 1470 690" fill="none" stroke="${GOLD}" stroke-width="3.2"/>
    ${arrow(1420, 640, 1472, 692, GOLD, 3)}
    ${label(1120, 500, 'LIFT-UP → stretch the glide,', 15, 'start', GOLD)}
    ${label(1120, 524, 'low peak-g, land far', 14, 'start', GOLD)}
    <!-- lift-down: steep, short, high-g -->
    <path d="M 900 486 Q 980 640 1030 850" fill="none" stroke="${WARN}" stroke-width="2.8"/>
    ${label(940, 720, 'LIFT-DOWN', 15, 'start', WARN)}
    ${label(940, 744, 'steepen, high peak-g,', 13, 'start', WARN)}
    ${label(940, 764, 'land short', 13, 'start', WARN)}
    ${label(1220, 866, 'lift widens the survivable corridor 3–5× vs a ballistic plunge', 17, 'middle', LINE)}
  `),

  'skip-entry': frame(`
    ${stars}
    ${head('SKIP ENTRY — SURFING BACK OUT', 'above orbital speed, one dip is too hot: skip out, coast, re-enter — two gentle bites')}
    <!-- Earth limb bottom -->
    <path d="M -100 1120 A 1500 1500 0 0 1 1780 880" fill="rgba(127,176,224,0.06)" stroke="${LINE}" stroke-width="2.2"/>
    ${label(1420, 980, 'EARTH', 16, 'middle', LINE)}
    <!-- entry-interface / sensible-atmosphere line -->
    <path d="M 120 620 A 1700 1700 0 0 1 1560 520" fill="none" stroke="${ACC}" stroke-width="1.2" stroke-dasharray="7 9" opacity="0.7"/>
    ${label(160, 604, 'SENSIBLE ATMOSPHERE  (~105 km)', 15, 'start', ACC)}
    <!-- incoming super-circular -->
    ${arrow(150, 300, 300, 470, GOLD, 3)}
    ${label(150, 290, 'lunar return ≈ 11 km/s (super-circular)', 15, 'start', GOLD)}
    <!-- first dip: into atmosphere, bleed energy -->
    <path d="M 300 470 Q 470 700 660 660" fill="none" stroke="${GOLD}" stroke-width="3.4"/>
    ${label(430, 730, 'FIRST ENTRY — lift-up bleeds energy', 15, 'middle', GOLD)}
    <!-- skip out: climbs back above the line -->
    <path d="M 660 660 Q 840 470 1060 360" fill="none" stroke="${GOLD}" stroke-width="3.4"/>
    ${label(760, 430, 'SKIP OUT', 15, 'start', GOLD)}
    <!-- exo coast (dashed, above the line) -->
    <path d="M 1060 360 Q 1210 330 1330 420" fill="none" stroke="${ACC}" stroke-width="2.2" stroke-dasharray="10 8"/>
    ${label(1195, 320, 'EXO-ATMOSPHERIC COAST — energy conserved, no drag', 14, 'middle')}
    <!-- second entry -->
    <path d="M 1330 420 Q 1420 560 1430 780" fill="none" stroke="${GOLD}" stroke-width="3.2"/>
    ${arrow(1428, 720, 1430, 782, GOLD, 3)}
    ${label(1440, 640, 'SECOND ENTRY', 15, 'start', GOLD)}
    ${label(1440, 664, '→ final descent', 13, 'start')}
    ${dot(300, 470, 7, WHITE)} ${dot(660, 660, 7, WHITE)} ${dot(1330, 420, 7, WHITE)}
    ${label(800, 872, 'lower peak-g + peak heating · thousands of km more range · Zond · Chang’e 5 · Orion', 16, 'middle', LINE)}
  `),

  'entry-footprint': frame(`
    ${stars}
    ${head('THE LANDING FOOTPRINT', 'lift gives a reachable AREA on the ground — far targets cost low g, near targets high g')}
    <!-- ground baseline -->
    <line x1="140" y1="720" x2="1480" y2="720" stroke="${LINE}" stroke-width="2"/>
    ${label(150, 748, 'GROUND TRACK  (downrange →)', 14, 'start')}
    <!-- entry point up-left -->
    ${dot(300, 250, 9, WHITE)} ${label(300, 228, 'entry interface', 14, 'middle')}
    <!-- lift-up long/low-g trajectory -->
    <path d="M 300 250 Q 760 360 1240 720" fill="none" stroke="${GOLD}" stroke-width="3.2"/>
    ${arrow(1200, 660, 1242, 720, GOLD, 3)}
    ${label(820, 400, 'LIFT-UP → far edge, LOW peak-g', 15, 'start', GOLD)}
    <!-- lift-down short/high-g trajectory -->
    <path d="M 300 250 Q 430 500 560 720" fill="none" stroke="${WARN}" stroke-width="3"/>
    ${arrow(540, 660, 560, 720, WARN, 3)}
    ${label(360, 560, 'LIFT-DOWN', 15, 'start', WARN)}
    ${label(360, 584, 'near edge, HIGH g', 13, 'start', WARN)}
    <!-- the footprint teardrop on the ground -->
    <path d="M 560 720 Q 800 686 1240 720 Q 900 758 560 720 Z" fill="rgba(255,210,127,0.10)" stroke="${GOLD}" stroke-width="2" stroke-dasharray="6 6"/>
    ${label(900, 704, 'FOOTPRINT — reachable band', 14, 'middle', GOLD)}
    <!-- crossrange arrows -->
    ${arrow(900, 720, 900, 660, ACC, 1.8)} ${arrow(900, 720, 900, 780, ACC, 1.8)}
    ${label(920, 664, 'crossrange (bank sideways)', 13, 'start')}
    <!-- target -->
    ${dot(1020, 720, 8, WHITE)}
    <g stroke="${WHITE}" stroke-width="2"><line x1="1006" y1="720" x2="1034" y2="720"/><line x1="1020" y1="706" x2="1020" y2="734"/></g>
    ${label(1020, 806, 'TARGET — guidance solves the bank schedule to land here', 15, 'middle')}
    ${label(810, 872, 'outside the footprint → unreachable; guidance clamps to the nearest edge', 16, 'middle', LINE)}
  `),

  'ascent-guidance': frame(`
    ${stars}
    ${head('ASCENT GUIDANCE — OPEN-LOOP → PEG', 'a fixed pitch program through the air; a closed-loop solver to the exact orbit above it')}
    <!-- ground + pad -->
    <line x1="140" y1="800" x2="900" y2="800" stroke="${LINE}" stroke-width="2"/>
    ${label(150, 828, 'PAD', 14, 'start')}
    <!-- atmosphere band -->
    <rect x="140" y="560" width="1320" height="240" fill="rgba(127,176,224,0.05)"/>
    <line x1="140" y1="560" x2="1460" y2="560" stroke="${ACC}" stroke-width="1.2" stroke-dasharray="7 9" opacity="0.7"/>
    ${label(150, 545, 'TOP OF SENSIBLE ATMOSPHERE', 14, 'start', ACC)}
    <!-- ascent arc: vertical → gravity turn → pitch over to horizontal -->
    <path d="M 240 800 Q 260 640 360 560 Q 620 380 1120 300 Q 1280 288 1380 300" fill="none" stroke="${GOLD}" stroke-width="3.4"/>
    ${arrow(1330, 296, 1382, 300, GOLD, 3)}
    <!-- open-loop segment marker (in atmosphere) -->
    ${dot(240, 800, 7, WHITE)} ${label(300, 720, 'liftoff + pitch-over kick', 13, 'start')}
    ${label(300, 630, 'OPEN-LOOP pitch program', 15, 'start')}
    ${label(300, 654, '(gravity turn, α ≈ 0, low loads)', 13, 'start')}
    <!-- closed-loop segment (above atmosphere) -->
    ${dot(360, 560, 7, WARN)} ${label(420, 540, 'handover', 13, 'start', WARN)}
    ${label(700, 430, 'CLOSED-LOOP PEG', 16, 'start', GOLD)}
    ${label(700, 456, 're-solve steering to cutoff every second', 14, 'start')}
    ${label(700, 480, '(linear-tangent law + time-to-go)', 13, 'start')}
    <!-- cutoff condition -->
    ${dot(1380, 300, 8, WHITE)}
    ${label(1362, 258, 'CUTOFF — horizontal,', 14, 'end', GOLD)}
    ${label(1362, 282, 'orbital speed 7.8 km/s', 14, 'end', GOLD)}
    ${label(810, 872, 'a per-second boundary-value problem — why spaceflight needed the onboard computer', 16, 'middle', LINE)}
  `),

  'escape-velocity': frame(`
    ${stars}
    ${head('ESCAPE VELOCITY — THREE FATES', 'kinetic energy vs the gravity well: fall back, break even, or leave forever')}
    <!-- planet -->
    <circle cx="420" cy="500" r="70" fill="rgba(75,156,211,0.25)" stroke="${LINE}" stroke-width="2.4"/>
    ${label(420, 610, 'PLANET  (μ, radius r)', 15, 'middle', LINE)}
    ${dot(490, 452, 7, WHITE)} ${label(505, 440, 'launch point', 13, 'start')}
    <!-- below escape: bound ellipse (falls back) -->
    <path d="M 490 452 Q 780 250 900 470 Q 960 640 640 700 Q 470 690 470 560" fill="none" stroke="${WARN}" stroke-width="2.6"/>
    ${label(910, 470, '< v_esc → bound ELLIPSE (falls back)', 15, 'start', WARN)}
    <!-- at escape: parabola -->
    <path d="M 490 452 Q 900 180 1480 220" fill="none" stroke="${GOLD}" stroke-width="3.4"/>
    ${arrow(1420, 224, 1482, 219, GOLD, 3)}
    ${label(1120, 190, '= v_esc → PARABOLA (just escapes)', 15, 'start', GOLD)}
    <!-- above escape: hyperbola -->
    <path d="M 490 452 Q 820 470 1480 400" fill="none" stroke="${ACC}" stroke-width="2.8" stroke-dasharray="2 0"/>
    ${arrow(1420, 405, 1482, 400, ACC, 2.8)}
    ${label(1150, 452, '> v_esc → HYPERBOLA (leaves with v∞)', 15, 'start')}
    <!-- formula block -->
    ${label(150, 760, 'v_esc = √(2μ / r) = √2 × v_circular', 22, 'start', GOLD)}
    ${label(150, 800, 'Earth surface 11.2 km/s  ·  Moon 2.4  ·  Mars 5.0  ·  Sun @ 1 AU 42.1 km/s', 16, 'start')}
    ${label(810, 872, 'gravity reaches to infinity — escape means slowing to zero only at infinite distance', 16, 'middle', LINE)}
  `),

  'synodic-period': frame(`
    ${stars}
    ${head('SYNODIC PERIOD — THE LAUNCH-WINDOW CLOCK', 'the target must lead by a set angle so it meets the transfer ellipse at arrival')}
    <!-- Sun -->
    <circle cx="560" cy="500" r="26" fill="${GOLD}"/>
    ${label(560, 556, 'SUN', 14, 'middle', GOLD)}
    <!-- Earth orbit (inner) + Mars orbit (outer) -->
    <circle cx="560" cy="500" r="150" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.4"/>
    <circle cx="560" cy="500" r="260" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.4"/>
    ${label(560, 328, 'Earth orbit', 13, 'middle')}
    ${label(560, 228, 'Mars orbit', 13, 'middle', WARN)}
    <!-- Earth at departure (bottom of inner) -->
    ${dot(560, 650, 10, '#4b9cd3')} ${label(560, 682, 'EARTH — departure', 14, 'middle', LINE)}
    <!-- Mars at required lead angle ahead (~44 deg from departure radius) -->
    ${dot(747, 686, 10, WARN)} ${label(770, 700, 'MARS at launch (leads by ≈ 44°)', 14, 'start', WARN)}
    <!-- arrival point (top of outer) -->
    ${dot(560, 240, 7, WHITE)} ${label(560, 210, 'rendezvous — Mars arrives here', 13, 'middle')}
    <!-- phase-angle wedge -->
    <path d="M 560 500 L 560 650 A 150 150 0 0 0 690 575 Z" fill="rgba(255,210,127,0.14)"/>
    ${label(645, 640, 'phase angle', 12, 'start', GOLD)}
    <!-- transfer ellipse: Earth(bottom,inner) to arrival(top,outer) -->
    <path d="M 560 650 Q 980 500 560 240" fill="none" stroke="${ACC}" stroke-width="2.6" stroke-dasharray="9 7"/>
    ${label(880, 500, 'transfer ellipse (~259 d)', 14, 'start')}
    <!-- formula block -->
    ${label(1120, 760, '1/S = |1/T₁ − 1/T₂|', 22, 'start', GOLD)}
    ${label(1120, 800, 'Earth–Mars S ≈ 780 d (~26 mo)', 16, 'start')}
    ${label(810, 872, 'the alignment recurs every synodic period — which is why a launch window is periodic', 16, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg))
    .resize(1600)
    .webp({ quality: 88 })
    .toFile(path.join(OUT, `${slug}.webp`));
  console.log(`✓ ${slug} → svg + webp`);
}
console.log('done:', Object.keys(diagrams).length, 'lab-systems science diagrams');
