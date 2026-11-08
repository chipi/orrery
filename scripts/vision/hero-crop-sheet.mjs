#!/usr/bin/env node
/**
 * Hero crop review sheets: how each entity's hero image is cropped where the site shows it as a
 * cover, so a head, a spacecraft or a rocket's top cut off by the centred crop is caught by eye.
 *
 *   node scripts/vision/hero-crop-sheet.mjs --out <dir> [--surface fleet,missions …] [--only id,…]
 *        [--try "<surface>/<id>=<x>% <y>%" …] [--per 12]
 *
 * One row per hero: the whole image with both crop frames drawn on it, then the two crops as the
 * site renders them —
 *   CARD  2.5:1, the collectible card's hero band at its widest (it ranges ~1.6–2.6:1 with the
 *         text below it), with the card's bottom fade, under which the title sits;
 *   16:9  the browse-page cover (fleet, missions) and every explore panel hero.
 * The crop uses the entry's reviewed `position` from static/data/<surface>-hero-overrides.json
 * (CSS object-position, applied by src/lib/image-hero.ts heroPositionFor), else 50% 50%.
 * `--try` previews a candidate position for one hero without writing anything; record the chosen
 * one as `position` on the override entry (add the entry with the hero's own slot if it has none).
 *
 * Read-only: writes only the PNG sheets under --out.
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// surface → served dir (src/lib/image-hero.ts SURFACE_TO_DIR)
const SURFACES = {
  missions: 'missions',
  fleet: 'fleet-galleries',
  'moon-sites': 'moon-sites',
  'mars-sites': 'mars-sites',
  'earth-objects': 'earth-objects',
  planets: 'planets',
  'small-bodies': 'small-bodies',
  satellites: 'satellites',
  belts: 'belts',
  'iss-modules': 'iss-modules',
  'tiangong-modules': 'tiangong-modules',
};
const FRAMES = [
  { label: 'CARD', aspect: 2.5, color: '#ff4040', fade: true },
  { label: '16:9', aspect: 16 / 9, color: '#40a0ff', fade: false },
];

const args = process.argv.slice(2);
const opt = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const out = opt('out')[0];
if (!out) {
  console.error(
    'usage: node scripts/vision/hero-crop-sheet.mjs --out <dir> [--surface …] [--only …] [--try "<surface>/<id>=<x>% <y>%"]',
  );
  process.exit(2);
}
const surfaces = (opt('surface')[0]?.split(',') ?? Object.keys(SURFACES)).filter(Boolean);
for (const s of surfaces) if (!SURFACES[s]) throw new Error(`unknown surface ${s}`);
const only = new Set(
  opt('only')
    .flatMap((v) => v.split(','))
    .filter(Boolean),
);
const tries = new Map(
  opt('try').map((t) => {
    const m = t.match(/^([a-z-]+\/[a-z0-9_-]+)=(\d{1,3})% (\d{1,3})%$/);
    if (!m) throw new Error(`--try wants "<surface>/<id>=<x>% <y>%": ${t}`);
    return [m[1], [Number(m[2]) / 100, Number(m[3]) / 100]];
  }),
);
const per = Number(opt('per')[0] ?? 12);

/** [x, y] fractions from a "50% 22%" string. */
const parsePos = (p) =>
  p
    .match(/(\d+)% (\d+)%/)
    .slice(1, 3)
    .map((n) => Number(n) / 100);

/** The crop rectangle CSS object-fit: cover + object-position takes from a w×h image. */
function cropRect(w, h, aspect, [px, py]) {
  if (w / h > aspect) {
    const cw = Math.round(h * aspect);
    return { left: Math.round((w - cw) * px), top: 0, width: cw, height: h };
  }
  const ch = Math.round(w / aspect);
  return { left: 0, top: Math.round((h - ch) * py), width: w, height: ch };
}

const heroes = [];
for (const surface of surfaces) {
  const dir = SURFACES[surface];
  const ovPath = `static/data/${surface}-hero-overrides.json`;
  const ov = existsSync(ovPath) ? (JSON.parse(readFileSync(ovPath, 'utf8')).overrides ?? {}) : {};
  if (!existsSync(`static/images/${dir}`)) continue;
  for (const id of readdirSync(`static/images/${dir}`).sort()) {
    if (only.size && !only.has(id)) continue;
    const slot = (ov[id]?.slot ?? '01.jpg').slice(0, 2);
    const file = `static/images/${dir}/${id}/${slot}.webp`;
    if (!existsSync(file)) continue;
    const key = `${surface}/${id}`;
    const pos = tries.get(key) ?? (ov[id]?.position ? parsePos(ov[id].position) : [0.5, 0.5]);
    heroes.push({ key, slot, file, pos, tried: tries.has(key) });
  }
}
if (!heroes.length) {
  console.error('no heroes matched');
  process.exit(1);
}

const H = 220; // row image height
const LABEL = 22;
const svgText = (w, text, color = '#fff') =>
  Buffer.from(
    `<svg width="${w}" height="${LABEL}"><rect width="${w}" height="${LABEL}" fill="#000"/><text x="6" y="16" font-size="14" font-family="sans-serif" fill="${color}">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
  );

async function row(h) {
  const img = sharp(h.file);
  const { width: w, height: hh } = await img.metadata();
  const fullW = Math.round((w / hh) * H);
  const scale = fullW / w;
  const rects = FRAMES.map((f) => ({ ...f, r: cropRect(w, hh, f.aspect, h.pos) }));
  const outline = Buffer.from(
    `<svg width="${fullW}" height="${H}">${rects
      .map(
        ({ r, color }) =>
          `<rect x="${r.left * scale + 1}" y="${r.top * scale + 1}" width="${r.width * scale - 2}" height="${r.height * scale - 2}" fill="none" stroke="${color}" stroke-width="3"/>`,
      )
      .join('')}</svg>`,
  );
  const panels = [
    await sharp(h.file)
      .resize({ height: H })
      .composite([{ input: outline }])
      .png()
      .toBuffer(),
  ];
  for (const f of rects) {
    const cw = Math.round(H * f.aspect);
    let crop = sharp(h.file).extract(f.r).resize(cw, H);
    if (f.fade) {
      const fade = Buffer.from(
        `<svg width="${cw}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#05060a" stop-opacity="0"/><stop offset="0.96" stop-color="#05060a" stop-opacity="1"/></linearGradient></defs><rect width="${cw}" height="${H}" fill="url(#g)"/></svg>`,
      );
      crop = crop.composite([{ input: fade }]);
    }
    panels.push(await crop.png().toBuffer());
  }
  const widths = [fullW, ...rects.map((f) => Math.round(H * f.aspect))];
  const rowW = widths.reduce((a, b) => a + b, 0) + 8 * (widths.length - 1);
  const label = `${h.key}  ${h.slot}  pos ${Math.round(h.pos[0] * 100)}% ${Math.round(h.pos[1] * 100)}%${h.tried ? '  (TRY)' : ''}   red=CARD blue=16:9`;
  let x = 0;
  const comp = [{ input: svgText(rowW, label, h.tried ? '#ffd040' : '#fff'), left: 0, top: 0 }];
  panels.forEach((p, i) => {
    comp.push({ input: p, left: x, top: LABEL });
    x += widths[i] + 8;
  });
  return {
    w: rowW,
    buf: await sharp({
      create: { width: rowW, height: H + LABEL, channels: 3, background: '#222' },
    })
      .composite(comp)
      .png()
      .toBuffer(),
  };
}

mkdirSync(out, { recursive: true });
let n = 0;
for (let i = 0; i < heroes.length; i += per) {
  const rows = [];
  for (const h of heroes.slice(i, i + per)) rows.push(await row(h));
  const W = Math.max(...rows.map((r) => r.w));
  const sheet = join(out, `heroes-${String(++n).padStart(2, '0')}.png`);
  await sharp({
    create: { width: W, height: rows.length * (H + LABEL + 10), channels: 3, background: '#111' },
  })
    .composite(rows.map((r, k) => ({ input: r.buf, left: 0, top: k * (H + LABEL + 10) })))
    .png()
    .toFile(sheet);
}
console.log(`${heroes.length} heroes → ${n} sheet(s) in ${out}`);
