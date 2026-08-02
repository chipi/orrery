/**
 * Engine power-cycle diagram SKETCHES (PRD-032 Phase 2 diagrams) — the SVG
 * basis for the Wired-style Higgsfield art (docs/guides/diagram-art-style.md).
 * Each SVG is a precise, labelled schematic of one cycle in the house palette;
 * rasterized to PNG and fed to Higgsfield (nano_banana_pro) as the structural
 * reference, which restyles it while preserving geometry + labels.
 *
 * Run: node scripts/essays/build-cycle-diagram-sketches.mjs
 * Outputs: docs/wip/essay-diagram-sources/propulsion-cycles/{slug}.svg (+ .png)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'propulsion-cycles');
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
const label = (x, y, t, size = 20, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${t}</text>`;
const box = (x, y, w, h, fill = FAINT, stroke = LINE) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
const pipe = (d, stroke = ACC, sw = 3, dash = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const arrow = (x, y, dir = 'r', fill = ACC) => {
  const p =
    dir === 'r'
      ? `${x},${y} ${x - 14},${y - 8} ${x - 14},${y + 8}`
      : dir === 'l'
        ? `${x},${y} ${x + 14},${y - 8} ${x + 14},${y + 8}`
        : dir === 'd'
          ? `${x},${y} ${x - 8},${y - 14} ${x + 8},${y - 14}`
          : `${x},${y} ${x - 8},${y + 14} ${x + 8},${y + 14}`;
  return `<polygon points="${p}" fill="${fill}"/>`;
};
// tank with a cryo/fluid label
const tank = (x, y, t, fill = FAINT) =>
  `${box(x, y, 150, 90, fill)}${label(x + 75, y + 52, t, 20, 'middle', WHITE)}`;
// turbopump: two pump discs on a shaft driven by a turbine
const nozzleFlame = (x, y, col = GOLD) =>
  `<path d="M ${x} ${y - 40} L ${x + 90} ${y - 70} L ${x + 90} ${y + 70} L ${x} ${y + 40} Z" fill="${FAINT}" stroke="${LINE}" stroke-width="2.5"/>` +
  `<path d="M ${x + 90} ${y - 55} C ${x + 260} ${y - 40}, ${x + 260} ${y + 40}, ${x + 90} ${y + 55}" fill="rgba(255,210,127,0.16)" stroke="${col}" stroke-width="2"/>` +
  `${label(x + 175, y + 5, 'thrust →', 18, 'middle', col)}`;

const diagrams = {
  // ── GAS-GENERATOR — open cycle, dumps the turbine drive gas overboard ──
  'gas-generator-cycle': frame(`
    ${label(80, 84, 'THROW A LITTLE AWAY', 30, 'start', LINE)}
    ${label(80, 122, 'gas-generator cycle — a small side flame spins the pumps, then dumps overboard', 19)}
    ${tank(120, 200, 'FUEL')}
    ${tank(120, 330, 'OXIDISER')}
    <!-- feed lines to turbopump -->
    ${pipe('M 270 245 L 430 300', ACC, 3)}
    ${pipe('M 270 375 L 430 340', ACC, 3)}
    ${box(430, 275, 150, 110)} ${label(505, 320, 'TURBO', 18, 'middle')} ${label(505, 344, 'PUMP', 18, 'middle')}
    <!-- MAIN flow: pump -> chamber -> nozzle (thick, bright) -->
    ${pipe('M 580 330 L 760 330', WHITE, 5)} ${arrow(760, 330, 'r', WHITE)}
    ${box(760, 280, 150, 110, 'rgba(255,255,255,0.05)', WHITE)} ${label(835, 322, 'MAIN', 18, 'middle', WHITE)} ${label(835, 346, 'CHAMBER', 18, 'middle', WHITE)}
    ${nozzleFlame(910, 335)}
    ${label(670, 300, 'most of the propellant', 14, 'middle', WHITE)}
    <!-- SIDE branch: tap -> gas generator -> turbine -> OVERBOARD dump (thin, dashed) -->
    ${pipe('M 505 385 L 505 520', LINE, 2.5, '8 6')} ${arrow(505, 520, 'd', LINE)}
    ${box(430, 520, 150, 90, FAINT, GOLD)} ${label(505, 552, 'GAS', 16, 'middle', GOLD)} ${label(505, 574, 'GENERATOR', 16, 'middle', GOLD)}
    ${label(505, 632, 'fuel-rich (cool)', 13, 'middle')}
    ${pipe('M 430 565 C 340 565, 340 330, 430 330', LINE, 2.5, '8 6')} ${arrow(432, 330, 'r', LINE)}
    ${label(300, 470, 'drives the', 13, 'middle')} ${label(300, 490, 'turbine', 13, 'middle')}
    ${pipe('M 580 565 L 780 565', GOLD, 2.5, '8 6')} ${arrow(780, 565, 'r', GOLD)}
    ${label(880, 570, 'OVERBOARD DUMP', 18, 'middle', GOLD)}
    ${label(880, 596, 'the small Isp cost', 14, 'middle')}
    ${label(800, 800, 'open cycle — the turbine exhaust is thrown away. simple, robust, the most-flown design.', 18, 'middle', LINE)}
  `),

  // ── STAGED COMBUSTION — closed; drive gas is burned again in the chamber ──
  'staged-combustion-cycle': frame(`
    ${label(80, 84, 'WASTE NOTHING', 30, 'start', LINE)}
    ${label(80, 122, 'staged combustion — the pump drive gas is fed back and burned in the main chamber', 19)}
    ${tank(120, 200, 'FUEL')}
    ${tank(120, 330, 'OXIDISER')}
    ${pipe('M 270 245 L 420 300', ACC, 3)}
    ${pipe('M 270 375 L 420 340', ACC, 3)}
    ${box(420, 275, 150, 110)} ${label(495, 320, 'TURBO', 18, 'middle')} ${label(495, 344, 'PUMP', 18, 'middle')}
    <!-- preburner off the pump -->
    ${pipe('M 495 385 L 495 500', LINE, 3)} ${arrow(495, 500, 'd', LINE)}
    ${box(400, 500, 190, 95, FAINT, GOLD)} ${label(495, 535, 'PREBURNER', 17, 'middle', GOLD)} ${label(495, 565, 'fuel-rich / ox-rich', 13, 'middle')}
    <!-- turbine drive returns to pump -->
    ${pipe('M 400 545 C 320 545, 320 330, 420 330', LINE, 2.5, '8 6')} ${arrow(422, 330, 'r', LINE)}
    ${label(300, 450, 'spins the', 13, 'middle')} ${label(300, 470, 'turbine', 13, 'middle')}
    <!-- KEY: preburner exhaust routed INTO the main chamber (closed) -->
    ${pipe('M 590 547 C 760 547, 820 430, 830 392', WHITE, 5)} ${arrow(831, 392, 'u', WHITE)}
    ${label(720, 500, 'ALL flow → chamber', 16, 'middle', WHITE)} ${label(720, 522, '(nothing overboard)', 13, 'middle')}
    ${box(760, 280, 150, 110, 'rgba(255,255,255,0.05)', WHITE)} ${label(835, 322, 'MAIN', 18, 'middle', WHITE)} ${label(835, 346, 'CHAMBER', 18, 'middle', WHITE)}
    ${pipe('M 610 330 L 760 330', WHITE, 4)} ${arrow(760, 330, 'r', WHITE)}
    ${nozzleFlame(910, 335)}
    ${label(800, 800, 'closed cycle — nothing wasted. higher pressure, higher Isp, the hardest plumbing in engineering.', 18, 'middle', LINE)}
  `),

  // ── EXPANDER — closed; the fuel boils in the nozzle jacket and drives the pump ──
  'expander-cycle': frame(`
    ${label(80, 84, 'POWERED BY HEAT, NOT FIRE', 30, 'start', LINE)}
    ${label(80, 122, 'expander cycle — cryogenic fuel boils in the nozzle jacket and spins the pump', 19)}
    ${tank(120, 300, 'FUEL (LH₂)')}
    ${pipe('M 270 345 L 400 345', ACC, 3)} ${arrow(400, 345, 'r', ACC)}
    ${box(400, 300, 150, 100)} ${label(475, 340, 'TURBO', 18, 'middle')} ${label(475, 364, 'PUMP', 18, 'middle')}
    <!-- fuel routed through the nozzle cooling jacket (channels around the wall) -->
    ${pipe('M 550 350 L 760 350', ACC, 3)} ${arrow(760, 350, 'r', ACC)}
    <path d="M 760 300 L 900 270 L 900 430 L 760 400 Z" fill="${FAINT}" stroke="${LINE}" stroke-width="2.5"/>
    <g stroke="${GOLD}" stroke-width="1.6" opacity="0.85">
      <path d="M 772 312 L 888 292"/><path d="M 772 336 L 892 322"/><path d="M 772 360 L 892 352"/><path d="M 772 384 L 888 388"/>
    </g>
    ${label(830, 470, 'NOZZLE COOLING JACKET', 15, 'middle', GOLD)} ${label(830, 492, 'fuel soaks up the heat', 13, 'middle')}
    ${nozzleFlame(900, 350)}
    <!-- vaporised gas leaves the jacket, drives the turbine, then to the chamber -->
    ${pipe('M 830 270 C 830 170, 520 170, 500 300', GOLD, 3)} ${arrow(500, 300, 'd', GOLD)}
    ${label(660, 158, 'VAPORISED GAS drives the turbine →', 15, 'middle', GOLD)}
    ${box(300, 560, 260, 90, FAINT, WHITE)} ${label(430, 594, 'NO GAS GENERATOR', 16, 'middle', WHITE)} ${label(430, 620, 'NO PREBURNER', 16, 'middle', WHITE)}
    ${label(430, 690, 'the engine heat itself is the power source', 15, 'middle')}
    ${label(800, 800, 'closed, clean, restartable — but heat scales with area, so a big first stage is impossible.', 18, 'middle', LINE)}
  `),
};

for (const [slug, svg] of Object.entries(diagrams)) {
  const svgPath = path.join(OUT, `${slug}.svg`);
  fs.writeFileSync(svgPath, svg);
  await sharp(Buffer.from(svg))
    .resize(2048)
    .png()
    .toFile(path.join(OUT, `${slug}.png`));
  console.log('  ', slug);
}
console.log('done:', Object.keys(diagrams).length, 'cycle sketches →', OUT);
