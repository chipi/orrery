/**
 * Launcher EXPLODED-CUTAWAY sketches — DATA-DRIVEN over every launcher in
 * launcher-engines.ts. Each SVG is the structural reference fed to Higgsfield
 * (nano_banana_pro, watercolor cutaway) per docs/guides/launcher-cutaway-style.md.
 *
 * Composition (frozen): assembled reference stack (true proportion) + human
 * silhouette (1.8 m) at left; the pieces exploded apart in two columns; every
 * stage a TALL SLENDER cut-open cylinder with the exact engine count at its
 * base; strap-on boosters + fairing/payload where the vehicle has them.
 *
 * Run: node scripts/essays/build-cutaway-sketches.mjs [id ...]
 * Outputs: docs/wip/essay-diagram-sources/launcher-cutaways/{id}.svg (+ .png)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { LAUNCHER_ENGINES } from '../../src/lib/physics/propulsion/launcher-engines.ts';
import { ENGINE_REGISTRY } from '../../src/lib/physics/propulsion/engine-registry.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', 'launcher-cutaways');
fs.mkdirSync(OUT, { recursive: true });

const BG = '#0a0e18';
const LINE = '#7fb0e0';
const ACC = '#cfe3fb';
const FAINT = 'rgba(127,176,224,0.13)';
const OXF = 'rgba(127,176,224,0.10)';
const FUELF = 'rgba(255,210,127,0.10)';
const SOLIDF = 'rgba(207,227,251,0.08)';
const WHITE = '#ffffff';
const GOLD = '#ffd27f';
const W = 1680;
const H = 1120;

// approx total heights (m) for the reference dimension line; default 50
const HEIGHTS = {
  'falcon-9': 70,
  'falcon-heavy': 70,
  saturn: 111,
  'saturn-v': 111,
  'saturn-ib': 68,
  'atlas-v': 58,
  'atlas-lv-3b': 29,
  'atlas-slv-3d': 36,
  'ariane-1': 50,
  'ariane-5': 53,
  'ariane-6': 63,
  'h-iia': 53,
  h3: 63,
  'long-march-2f': 62,
  'long-march-3b': 55,
  'long-march-5': 57,
  'long-march-7': 53,
  'delta-ii': 39,
  soyuz: 46,
  'soyuz-2': 46,
  'soyuz-fg': 50,
  'soyuz-u': 51,
  'proton-k': 57,
  'proton-m': 58,
  pslv: 44,
  'pslv-xl': 44,
  lvm3: 43,
  'm-v': 31,
  antares: 42,
  n1: 105,
  energia: 59,
  'new-glenn': 98,
  vulcan: 62,
  starship: 121,
  'sls-block-1': 98,
  'space-shuttle-stack': 56,
  'titan-ii-glv': 31,
  'vostok-k': 38,
  'voskhod-11a57': 44,
  'r-7-vostok': 38,
  'mercury-redstone': 25,
};

const lbl = (x, y, t, size = 20, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="0.6">${esc(t)}</text>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function propOf(des) {
  const e = ENGINE_REGISTRY.find((e) => e.designations.includes(des));
  return e?.propellant ?? null;
}
// split "LOX / RP-1" → {ox, fuel}; hypergolic/solid handled
function tanks(prop, engine) {
  if (/solid|srb|srm|s139|s200|psom|p230|rsrm/i.test(engine) || /solid/i.test(prop || ''))
    return { ox: 'SOLID', fuel: 'GRAIN', solid: true };
  if (!prop) return { ox: 'OX', fuel: 'FUEL' };
  const parts = prop.split('/').map((s) => s.trim());
  return { ox: parts[0] || 'OX', fuel: parts[1] || 'FUEL' };
}

// a tall slender stage cut open (upper ox tank + lower fuel tank) + engines
function stage(cx, top, w, h, t, nEng, er) {
  const x = cx - w / 2;
  const split = top + h * 0.44;
  const fill = t.solid ? SOLIDF : FUELF;
  const fstroke = t.solid ? ACC : GOLD;
  const xs =
    nEng <= 1
      ? [cx]
      : nEng === 5
        ? [cx, cx - 2.2 * er, cx + 2.2 * er, cx - 1.1 * er, cx + 1.1 * er]
        : Array.from(
            { length: Math.min(nEng, 9) },
            (_, i) => cx + (i - (Math.min(nEng, 9) - 1) / 2) * 2.1 * er,
          );
  const bells = t.solid
    ? ''
    : xs
        .map(
          (bx) =>
            `<path d="M ${bx - er * 0.55} ${top + h + 7} L ${bx + er * 0.55} ${top + h + 7} L ${bx + er} ${top + h + 7 + er * 1.5} L ${bx - er} ${top + h + 7 + er * 1.5} Z" fill="rgba(255,210,127,0.14)" stroke="${LINE}" stroke-width="1.5"/>`,
        )
        .join('');
  return (
    `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="12" fill="${FAINT}" stroke="${LINE}" stroke-width="2.5"/>` +
    `<rect x="${x + 6}" y="${top + 6}" width="${w - 12}" height="${split - top - 8}" rx="7" fill="${OXF}" stroke="${LINE}" stroke-width="1"/>` +
    `<rect x="${x + 6}" y="${split + 2}" width="${w - 12}" height="${top + h - split - 8}" rx="7" fill="${fill}" stroke="${fstroke}" stroke-width="1"/>` +
    lbl(cx, split - 11, t.ox, 15, 'middle', ACC) +
    lbl(cx, split + 28, t.fuel, 15, 'middle', fstroke) +
    bells
  );
}
const human = (x, baseY, h) => {
  const hd = h * 0.16;
  return (
    `<circle cx="${x}" cy="${baseY - h + hd}" r="${hd}" fill="${WHITE}"/>` +
    `<rect x="${x - h * 0.09}" y="${baseY - h + hd * 1.6}" width="${h * 0.18}" height="${h * 0.55}" rx="${h * 0.06}" fill="${WHITE}"/>` +
    `<line x1="${x - h * 0.05}" y1="${baseY - h * 0.28}" x2="${x - h * 0.09}" y2="${baseY}" stroke="${WHITE}" stroke-width="${h * 0.05}"/>` +
    `<line x1="${x + h * 0.05}" y1="${baseY - h * 0.28}" x2="${x + h * 0.09}" y2="${baseY}" stroke="${WHITE}" stroke-width="${h * 0.05}"/>`
  );
};

function buildSketch(id, spec) {
  const core = spec.stages.filter((s) => s.arrangement !== 'per-booster');
  const boosters = spec.stages.filter((s) => s.arrangement === 'per-booster');
  const height = HEIGHTS[id] ?? 50;

  // ── reference stack (left), true-ish proportion: lower stages bigger ──
  const RX = 150,
    BASE = 1000;
  const nCore = core.length;
  const segHeights = core.map((_, i) => 300 - i * (170 / Math.max(nCore, 1))); // taller at bottom
  const segWidths = core.map((_, i) => 70 - i * 8);
  const totalRef = segHeights.reduce((a, b) => a + b, 0) + 120; // + fairing
  const scaleRef = Math.min(1, 760 / totalRef);
  let ry = BASE;
  let ref = '';
  core.forEach((_, i) => {
    const hpx = segHeights[i] * scaleRef,
      wpx = segWidths[i];
    ref += `<rect x="${RX - wpx / 2}" y="${ry - hpx}" width="${wpx}" height="${hpx}" rx="6" fill="${FAINT}" stroke="${LINE}" stroke-width="1.5"/>`;
    ry -= hpx + 1;
  });
  // fairing cone on top of reference
  const fw = segWidths[nCore - 1] ?? 40;
  ref += `<polygon points="${RX - fw / 2},${ry} ${RX + fw / 2},${ry} ${RX},${ry - 70 * scaleRef}" fill="${FAINT}" stroke="${LINE}" stroke-width="1.5"/>`;
  ry -= 70 * scaleRef;
  // boosters as 2 side fins on the reference
  if (boosters.length) {
    const bh = segHeights[0] * scaleRef * 0.8;
    for (const sx of [-1, 1])
      ref += `<rect x="${RX + sx * (segWidths[0] / 2 + 6) - 7}" y="${BASE - bh}" width="14" height="${bh}" rx="5" fill="${FAINT}" stroke="${LINE}" stroke-width="1.3"/>`;
  }
  const stackTop = ry;
  ref += human(RX + segWidths[0] / 2 + 24, BASE, 12);
  ref += `<line x1="${RX - 62}" y1="${BASE}" x2="${RX - 62}" y2="${stackTop}" stroke="${ACC}" stroke-width="1"/>`;
  ref += lbl(RX - 68, (BASE + stackTop) / 2, `${height} m`, 17, 'end', WHITE);
  ref += lbl(RX + segWidths[0] / 2 + 40, BASE - 4, '1.8 m', 13, 'start', WHITE);
  ref += lbl(RX, BASE + 30, 'ASSEMBLED · TO SCALE', 15, 'middle', ACC);

  // ── exploded pieces ──
  // column 1 (x≈540): the lower/biggest core stages; column 2 (x≈1150): upper + boosters + fairing
  const col1 = [],
    col2 = [];
  core.forEach((s, i) => {
    const t = tanks(propOf(s.engine), s.engine);
    if (i === 0 || (nCore >= 3 && i === 1)) col1.push({ s, t });
    else col2.push({ s, t });
  });
  let exp = '';
  // column 1 — bottom-up: biggest stage lowest
  const CX1 = 540;
  const c1 = col1.slice().reverse(); // draw bottom (stage0) lowest
  let slot1 = [
    { top: 560, h: 420, w: 118 },
    { top: 170, h: 300, w: 108 },
  ];
  c1.forEach((it, k) => {
    const p = slot1[k] || { top: 170 - k * 250, h: 240, w: 100 };
    exp += stage(CX1, p.top, p.w, p.h, it.t, it.s.engineCount, Math.min(20, p.w / 4));
    exp += lbl(CX1 + p.w / 2 + 24, p.top + p.h / 2, `${it.s.stage}`, 20, 'start', WHITE);
    exp += lbl(
      CX1 + p.w / 2 + 24,
      p.top + p.h / 2 + 24,
      `${it.s.engineCount}× ${it.s.engine}`,
      14,
      'start',
      ACC,
    );
  });
  // column 2 — top-down: fairing/payload, upper stages, one booster
  const CX2 = 1150;
  let y2 = 175;
  // fairing + payload
  exp += `<polygon points="${CX2 - 34},${y2 + 70} ${CX2 + 34},${y2 + 70} ${CX2 + 18},${y2 + 20} ${CX2 - 18},${y2 + 20}" fill="${FAINT}" stroke="${WHITE}" stroke-width="2.5"/>`;
  exp += `<polygon points="${CX2 - 18},${y2 + 20} ${CX2 + 18},${y2 + 20} ${CX2},${y2 - 20} " fill="${FAINT}" stroke="${WHITE}" stroke-width="2.5"/>`;
  exp += `<rect x="${CX2 - 16}" y="${y2 + 30} " width="32" height="34" rx="4" fill="${OXF}" stroke="${GOLD}" stroke-width="1.3"/>`;
  exp += lbl(CX2 + 55, y2 + 30, 'FAIRING · PAYLOAD', 20, 'start', WHITE);
  exp += lbl(CX2 + 55, y2 + 54, 'the cargo, and the shell it rides in', 14, 'start');
  y2 += 130;
  col2.forEach((it) => {
    const h = 200,
      w = 82;
    exp += stage(CX2, y2, w, h, it.t, it.s.engineCount, 16);
    exp += lbl(CX2 + w / 2 + 24, y2 + h / 2, `${it.s.stage}`, 20, 'start', WHITE);
    exp += lbl(
      CX2 + w / 2 + 24,
      y2 + h / 2 + 24,
      `${it.s.engineCount}× ${it.s.engine}`,
      14,
      'start',
      ACC,
    );
    y2 += h + 90;
  });
  // one exploded booster (representative) if present
  if (boosters.length) {
    const b = boosters[0];
    const bt = tanks(propOf(b.engine), b.engine);
    const h = 230,
      w = 60;
    exp += stage(CX2, y2, w, h, bt, 1, 14);
    const total = b.engineCount || 1; // engineCount is already the fleet-wide total
    exp += lbl(
      CX2 + w / 2 + 24,
      y2 + h / 2,
      `STRAP-ON BOOSTER ×${b.boosterCount || 1}`,
      19,
      'start',
      WHITE,
    );
    exp += lbl(CX2 + w / 2 + 24, y2 + h / 2 + 24, `${total}× ${b.engine} total`, 14, 'start', ACC);
  }

  const title = `${spec.name.toUpperCase()} — EXPLODED`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">
  ${lbl(70, 70, title, 32, 'start', LINE)}
  ${lbl(70, 104, `broken into its stages — assembled reference at left, to human scale · ${spec.agency}`, 18)}
  ${ref}
  ${exp}
  ${lbl(840, 1075, 'each stage burns, sheds, and falls away — the rocket equation made physical', 18, 'middle', LINE)}
</g></svg>`;
}

const only = process.argv.slice(2);
const ids = only.length ? only : Object.keys(LAUNCHER_ENGINES);
let n = 0;
for (const id of ids) {
  const spec = LAUNCHER_ENGINES[id];
  if (!spec) {
    console.warn('  ? unknown launcher', id);
    continue;
  }
  const svg = buildSketch(id, spec);
  fs.writeFileSync(path.join(OUT, `${id}.svg`), svg);
  await sharp(Buffer.from(svg))
    .resize(1680)
    .png()
    .toFile(path.join(OUT, `${id}.png`));
  n++;
}
console.log(`done: ${n} launcher cutaway sketch(es) → ${OUT}`);
