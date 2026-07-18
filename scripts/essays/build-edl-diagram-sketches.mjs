/**
 * 6 /science EDL + descent diagram SKETCHES (blend basis) for RFC-034 §12.
 * docs/guides/diagram-art-style.md. Run: node scripts/essays/build-edl-diagram-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/_science/{id}.svg (+ 2048px .png)
 *   entry-heating · terminal-velocity · skycrane ·
 *   ballistic-coefficient · aerobraking · propulsive-landing
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', '_science');
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
const line = (x1, y1, x2, y2, w = 2, stroke = LINE) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"/>`;
const arrow = (x1, y1, x2, y2, stroke = GOLD, w = 2.4) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 14;
  const p1 = [x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4)];
  const p2 = [x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4)];
  return `${line(x1, y1, x2, y2, w, stroke)}<polygon points="${x2},${y2} ${p1[0].toFixed(0)},${p1[1].toFixed(0)} ${p2[0].toFixed(0)},${p2[1].toFixed(0)}" fill="${stroke}"/>`;
};
const title = (t, sub) => `${label(80, 90, t, 28, 'start', LINE)}${label(80, 126, sub, 19)}`;
const stars = (() => {
  let s = '',
    seed = 991;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 70; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.2 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.5 + 0.15).toFixed(2)})"/>`;
  return s;
})();

const diagrams = {
  'entry-heating': frame(`
    ${stars}
    ${title('ENTRY HEATING — THE FIREBALL', 'compression, not friction: a shock wave superheats the air ahead of the vehicle')}
    <!-- bow shock arc + glowing gas + blunt heat shield + vehicle -->
    <path d="M 470 620 Q 800 480 1130 620" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <path d="M 520 600 Q 800 500 1080 600 L 1010 640 Q 800 560 590 640 Z" fill="rgba(255,210,127,0.18)" stroke="none"/>
    ${label(800, 470, 'BOW SHOCK — compressed gas → thousands of °C', 18, 'middle', GOLD)}
    <path d="M 660 700 Q 800 640 940 700 L 940 720 L 660 720 Z" fill="rgba(127,176,224,0.14)" stroke="${LINE}" stroke-width="2.4"/>
    ${label(800, 690, 'HEAT SHIELD', 16, 'middle', WHITE)}
    <rect x="720" y="720" width="160" height="90" rx="10" fill="rgba(127,176,224,0.10)" stroke="${LINE}" stroke-width="2"/>
    ${label(800, 775, 'spacecraft', 15, 'middle')}
    ${arrow(800, 250, 800, 440)}
    ${label(820, 330, 'velocity 5–11 km/s', 15, 'start', GOLD)}
    ${label(300, 660, 'peak HEATING', 16, 'middle', WHITE)}
    ${label(300, 686, 'high + thin air (∝ v³)', 14, 'middle')}
    ${label(1300, 660, 'peak DECELERATION', 16, 'middle', WHITE)}
    ${label(1300, 686, 'low + dense air', 14, 'middle')}
    ${label(800, 860, 'the blunt shield holds the shock OUT and ablates the heat away', 17, 'middle', LINE)}
  `),

  'terminal-velocity': frame(`
    ${stars}
    ${title('TERMINAL VELOCITY', 'when drag rises to balance weight, the fall stops speeding up')}
    <!-- parachute + payload + force balance -->
    <path d="M 360 300 Q 500 200 640 300 Q 570 300 500 330 Q 430 300 360 300 Z" fill="rgba(207,227,251,0.10)" stroke="${ACC}" stroke-width="2.4"/>
    ${line(400, 305, 490, 470, 1.4, ACC)}${line(600, 305, 510, 470, 1.4, ACC)}
    <rect x="470" y="470" width="60" height="60" rx="8" fill="rgba(127,176,224,0.12)" stroke="${LINE}" stroke-width="2"/>
    ${arrow(500, 470, 500, 300, LINE)}${label(520, 390, 'DRAG ∝ v²', 16, 'start', LINE)}
    ${arrow(500, 530, 500, 700, GOLD)}${label(520, 620, 'WEIGHT = m·g', 16, 'start', GOLD)}
    <!-- balance graph -->
    <g transform="translate(900,240)">
      ${line(0, 460, 560, 460, 2)}${line(0, 460, 0, 0, 2)}
      ${label(280, 500, 'speed →', 15, 'middle')}
      <text x="-30" y="230" font-size="15" fill="${ACC}" transform="rotate(-90 -30 230)" text-anchor="middle">force →</text>
      <path d="M 0 460 Q 300 460 520 40" fill="none" stroke="${LINE}" stroke-width="2.6"/>
      ${line(0, 250, 560, 250, 1.6, GOLD)}${label(560, 240, 'weight', 14, 'end', GOLD)}
      ${label(360, 120, 'drag', 14, 'middle', LINE)}
      <circle cx="356" cy="250" r="8" fill="${WHITE}"/>
      ${label(356, 300, 'TERMINAL', 14, 'middle', WHITE)}${label(356, 322, 'VELOCITY', 14, 'middle', WHITE)}
    </g>
    ${label(800, 850, 'a bigger parachute enlarges the drag area → the balance is struck at a softer speed', 17, 'middle', LINE)}
  `),

  skycrane: frame(`
    ${stars}
    ${title('THE SKY-CRANE', 'a rocket stage hovers and lowers the rover on tethers, then flies clear')}
    <!-- descent stage with 8 nozzles + tethers + rover + fly-away -->
    <g transform="translate(520,300)">
      <rect x="-120" y="0" width="240" height="70" rx="10" fill="rgba(127,176,224,0.12)" stroke="${LINE}" stroke-width="2.4"/>
      ${label(0, 42, 'DESCENT STAGE — 8 throttleable engines', 14, 'middle', WHITE)}
      ${[-90, -50, 50, 90].map((x) => `<path d="M ${x - 14} 70 L ${x + 14} 70 L ${x + 8} 110 L ${x - 8} 110 Z" fill="rgba(255,210,127,0.5)" stroke="${GOLD}" stroke-width="1.6"/><path d="M ${x} 112 L ${x - 10} 175 L ${x + 10} 175 Z" fill="rgba(255,210,127,0.28)"/>`).join('')}
      ${line(-70, 70, -40, 300, 1.4, ACC)}${line(70, 70, 40, 300, 1.4, ACC)}${line(0, 70, 0, 300, 1.4, ACC)}
      ${label(150, 190, 'tethers', 14, 'start', ACC)}
      <g transform="translate(-55,300)"><rect x="0" y="0" width="110" height="46" rx="6" fill="rgba(207,227,251,0.14)" stroke="${ACC}" stroke-width="2"/>${[15, 45, 75].map((x) => `<circle cx="${x}" cy="52" r="10" fill="none" stroke="${ACC}" stroke-width="2"/>`).join('')}</g>
      ${label(0, 400, 'rover lowered onto its wheels', 15, 'middle')}
    </g>
    ${line(300, 640, 1300, 640, 2, LINE)}${label(300, 665, 'MARS SURFACE', 14, 'start', LINE)}
    <g transform="translate(1150,300)" opacity="0.7">${arrow(0, 60, 120, -40, GOLD)}${label(70, 20, 'cut cords', 13, 'start', GOLD)}${label(70, 40, '+ fly away', 13, 'start', GOLD)}</g>
    ${label(800, 850, 'the rover IS the landing gear — no legs, no ramp, engines kept clear of the ground', 17, 'middle', LINE)}
  `),

  'ballistic-coefficient': frame(`
    ${stars}
    ${title('BALLISTIC COEFFICIENT   β = m ÷ (Cd·A)', 'the one number that sets how fast a vehicle falls through air')}
    <!-- two descents: low-beta (slow, high) vs high-beta (fast, deep) -->
    <g transform="translate(360,220)">
      <path d="M 90 40 Q 180 -20 270 40 Q 210 40 180 60 Q 150 40 90 40 Z" fill="rgba(207,227,251,0.10)" stroke="${ACC}" stroke-width="2"/>
      <rect x="160" y="150" width="40" height="40" fill="rgba(127,176,224,0.12)" stroke="${LINE}" stroke-width="2"/>
      ${line(120, 44, 176, 150, 1.2, ACC)}${line(250, 44, 200, 150, 1.2, ACC)}
      ${arrow(180, 220, 180, 430, LINE, 2)}
      ${label(180, 470, 'LOW β', 20, 'middle', WHITE)}
      ${label(180, 496, 'big chute, light', 14, 'middle')}
      ${label(180, 518, 'slow · decelerates high', 14, 'middle', LINE)}
    </g>
    <g transform="translate(1000,220)">
      <path d="M 150 60 L 210 60 L 200 96 L 160 96 Z" fill="rgba(127,176,224,0.16)" stroke="${LINE}" stroke-width="2"/>
      <rect x="168" y="40" width="24" height="24" fill="rgba(127,176,224,0.2)" stroke="${LINE}" stroke-width="1.6"/>
      ${arrow(180, 120, 180, 470, GOLD, 3.4)}
      ${label(180, 510, 'HIGH β', 20, 'middle', WHITE)}
      ${label(180, 536, 'heavy, compact', 14, 'middle')}
      ${label(180, 558, 'fast · deep · hot', 14, 'middle', GOLD)}
    </g>
    ${label(800, 840, 'terminal speed ∝ √β · peak-g + peak-heat rise with β — why heavy Mars landings are hard', 17, 'middle', LINE)}
  `),

  aerobraking: frame(`
    ${stars}
    ${title('AEROBRAKING', 'trim a wide capture orbit for almost no fuel — skim the air a little each pass')}
    <!-- planet + atmosphere + shrinking ellipses sharing periapsis -->
    <g transform="translate(520,470)">
      <circle cx="0" cy="0" r="120" fill="rgba(127,176,224,0.14)" stroke="${LINE}" stroke-width="2.4"/>
      <circle cx="0" cy="0" r="150" fill="none" stroke="${GOLD}" stroke-width="1.6" stroke-dasharray="4 6"/>
      ${label(0, 8, 'PLANET', 15, 'middle', WHITE)}
      ${label(190, -140, 'upper atmosphere', 14, 'start', GOLD)}
      <ellipse cx="230" cy="0" rx="360" ry="150" fill="none" stroke="${ACC}" stroke-width="2.4"/>
      <ellipse cx="180" cy="0" rx="300" ry="128" fill="none" stroke="${LINE}" stroke-width="1.8" stroke-dasharray="6 6"/>
      <ellipse cx="130" cy="0" rx="240" ry="108" fill="none" stroke="${LINE}" stroke-width="1.6" stroke-dasharray="4 8" opacity="0.8"/>
      <ellipse cx="60" cy="0" rx="170" ry="92" fill="none" stroke="${LINE}" stroke-width="1.4" stroke-dasharray="3 9" opacity="0.6"/>
      <circle cx="-150" cy="0" r="7" fill="${GOLD}"/>
      ${label(-165, -20, 'periapsis — grazes the air', 13, 'end', GOLD)}
    </g>
    ${label(1180, 300, 'capture ellipse (wide)', 15, 'start', ACC)}
    ${label(1180, 470, 'each dip lowers', 15, 'start', LINE)}
    ${label(1180, 494, 'the far side...', 15, 'start', LINE)}
    ${label(1180, 640, '→ circular science orbit', 15, 'start', WHITE)}
    ${label(800, 850, 'hundreds of passes over months — saves fuel often exceeding the spacecraft dry mass', 17, 'middle', LINE)}
  `),

  'propulsive-landing': frame(`
    ${stars}
    ${title('PROPULSIVE LANDING', 'no usable air — an engine cancels the descent speed directly')}
    <!-- lander with retro plume + descent-rate schedule -->
    <g transform="translate(430,300)">
      <rect x="-60" y="0" width="120" height="80" rx="10" fill="rgba(127,176,224,0.12)" stroke="${LINE}" stroke-width="2.4"/>
      ${[-40, 40].map((x) => `${line(x, 80, x - 18, 150, 2, ACC)}`).join('')}
      <path d="M -20 80 L 20 80 L 34 130 L -34 130 Z" fill="rgba(255,210,127,0.5)" stroke="${GOLD}" stroke-width="1.8"/>
      <path d="M 0 132 L -26 250 L 26 250 Z" fill="rgba(255,210,127,0.28)"/>
      ${label(0, 40, 'lander', 14, 'middle', WHITE)}
      ${arrow(0, 132, 0, 260, GOLD, 3)}
      ${label(120, 190, 'braking burn', 15, 'start', GOLD)}
    </g>
    ${line(300, 620, 780, 620, 2, LINE)}${label(300, 645, 'AIRLESS SURFACE', 14, 'start', LINE)}
    <!-- descent-rate schedule -->
    <g transform="translate(950,240)">
      ${line(0, 400, 520, 400, 2)}${line(0, 400, 0, 0, 2)}
      ${label(260, 440, 'time →', 15, 'middle')}
      <text x="-30" y="200" font-size="15" fill="${ACC}" transform="rotate(-90 -30 200)" text-anchor="middle">speed →</text>
      <path d="M 0 40 L 300 300 Q 420 380 520 385" fill="none" stroke="${LINE}" stroke-width="2.6"/>
      ${label(120, 130, 'high-thrust braking', 14, 'start', GOLD)}
      ${label(250, 335, 'throttled hover', 14, 'middle', WHITE)}
      <circle cx="520" cy="385" r="8" fill="${WHITE}"/>${label(506, 362, 'touchdown ≈ 0', 13, 'end', WHITE)}
    </g>
    ${label(800, 850, 'the only way down on the Moon — and how Starship lands on Mars after the heat shield', 17, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(2048).png().toFile(path.join(OUT, `${slug}.png`));
  console.log(`✓ ${slug}`);
}
console.log('done:', Object.keys(diagrams).length, 'EDL sketches');
