/**
 * Layer-pyramid sketches for the two /science "how the surface imagery works"
 * sections (planets tab): moon-surface-imagery · mars-surface-imagery.
 * House style: docs/guides/diagram-art-style.md (deterministic in-palette sketch,
 * then the Higgsfield WIRED-blend pass with the sketch PNG as the reference).
 * Run: node scripts/essays/build-surface-imagery-science-sketches.mjs
 * Outputs:
 *   static/diagrams/science/<slug>.svg + .webp  (source + the schematic until the art lands)
 *   docs/wip/essay-diagram-sources/_surface-imagery-science/<slug>.png  (Higgsfield reference)
 * `--from-art`: once the Higgsfield art is in masters/diagrams/science/<slug>.png,
 * write the served 1600 px .webp from it instead (then
 * `node scripts/vision/add-card-rungs.mjs --extend=diagrams` for the 320/640 rungs).
 * The numbers are the ones the app shows in its imagery card (SurfaceScene tier
 * layers) and the route-patch / context-layer data; change them there first.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'static', 'diagrams', 'science');
const REF = path.join(ROOT, 'docs', 'wip', 'essay-diagram-sources', '_surface-imagery-science');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REF, { recursive: true });

const BG = '#0a0e18',
  LINE = '#7fb0e0',
  ACC = '#cfe3fb',
  GOLD = '#ffd27f';
const W = 1600,
  H = 900;

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const label = (x, y, t, size = 22, anchor = 'start', fill = ACC) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${fill}" letter-spacing="1">${esc(t)}</text>`;
const frame = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${BG}"/><g font-family="monospace" fill="${ACC}">${inner}</g></svg>`;
const stars = (() => {
  let s = '',
    seed = 977;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 50; i++)
    s += `<circle cx="${Math.round(rnd() * W)}" cy="${Math.round(rnd() * H)}" r="${(rnd() * 1.1 + 0.3).toFixed(2)}" fill="rgba(255,255,255,${(rnd() * 0.4 + 0.1).toFixed(2)})"/>`;
  return s;
})();

/**
 * Top (finest, smallest area) → bottom (coarsest, whole body). `zoom` is the
 * matching camera cue on the right-hand zoom axis.
 */
const PYRAMIDS = {
  'moon-surface-imagery': {
    title: 'THE MOON — SIX LAYERS OF IMAGERY',
    sub: 'six slices of the same place: finest on top, widest below; each fades in over the next as you zoom',
    layers: [
      { name: 'PANORAMA', what: 'astronaut + lander photos', zoom: 'on the ground' },
      { name: 'ROUTE TILES', what: 'LROC NAC · 0.5–2 m/px · 512 m tiles', zoom: '~500 m' },
      { name: 'DETAIL', what: 'LROC NAC mosaic · 5 m/px · 1–10 km', zoom: '~5 km' },
      { name: 'REGIONAL', what: 'Kaguya TC or LROC NAC · 5–10 m/px · 15–28 km', zoom: '~20 km' },
      { name: 'CONTEXT', what: 'LRO WAC mosaic · ~100 m/px · ~400 km', zoom: '~400 km' },
      { name: 'GLOBE', what: 'whole Moon · ~2.7 km/px (4K texture)', zoom: 'orbit view' },
    ],
  },
  'mars-surface-imagery': {
    title: 'MARS — SIX LAYERS OF IMAGERY',
    sub: 'six slices of the same place: finest on top, widest below; each fades in over the next as you zoom',
    layers: [
      { name: 'PANORAMA', what: 'rover + lander cameras', zoom: 'on the ground' },
      { name: 'ROUTE TILES', what: 'HiRISE · 0.25 m/px · 512 m tiles', zoom: '~500 m' },
      { name: 'DETAIL', what: 'HiRISE · 0.25 m/px · 512 m at the lander', zoom: '~500 m' },
      { name: 'REGIONAL', what: 'CTX mosaic · ~5 m/px · 15 km', zoom: '~15 km' },
      { name: 'CONTEXT', what: 'THEMIS day-IR mosaic · ~100 m/px · ~400 km', zoom: '~400 km' },
      { name: 'GLOBE', what: 'whole Mars · ~5 km/px (4K texture)', zoom: 'orbit view' },
    ],
  },
  'earth-surface-imagery': {
    title: 'EARTH — FIVE LAYERS OF IMAGERY',
    sub: 'five slices of the same place: finest on top, widest below; each fades in over the next as you zoom',
    layers: [
      { name: 'PANORAMA', what: 'a photograph taken on the pad', zoom: 'on the ground' },
      { name: 'DETAIL', what: 'aerial 0.1–0.6 m/px · or Sentinel-2 10 m', zoom: '~500 m' },
      { name: 'REGIONAL', what: 'Sentinel-2 cloudless · 10 m/px · 16 km', zoom: '~16 km' },
      { name: 'CONTEXT', what: 'Sentinel-2 cloudless · ~100 m/px · ~400 km', zoom: '~400 km' },
      { name: 'GLOBE', what: 'whole Earth · ~10 km/px (4K texture)', zoom: 'orbit view' },
    ],
  },
};

/**
 * An exploded stack of six flat slices floating one above the other, smallest
 * (finest) on top — isometric plates with a gap between them, a dashed line
 * through their centres (the one site they all show) and a zoom axis on the right.
 */
function pyramid({ title, sub, layers }) {
  const cx = 560;
  // top → bottom: half-widths and centre heights of each plate
  // Six-slice geometry; a shorter stack keeps the larger slices, lifted to
  // sit centred in the frame.
  const skip = 6 - layers.length;
  const lift = ([228, 316, 408, 506, 614, 738][skip] - 228) / 2;
  const half = [70, 105, 145, 190, 240, 295].slice(skip).map((h, i) => (i === 0 && skip ? 85 : h));
  const cy = [228, 316, 408, 506, 614, 738].slice(skip).map((y) => y - lift);
  const n = layers.length;
  const plate = (x, y, w, i) => {
    const h = w * 0.28;
    const t = 9;
    const edge = i === 0 ? GOLD : LINE;
    const fill = `rgba(127,176,224,${(0.06 + (5 - i) * 0.02).toFixed(3)})`;
    return (
      `<path d="M ${x - w} ${y} L ${x} ${y + h} L ${x + w} ${y} L ${x + w} ${y + t} L ${x} ${y + h + t} L ${x - w} ${y + t} Z" fill="rgba(10,14,24,0.9)" stroke="${edge}" stroke-width="1.5"/>` +
      `<path d="M ${x - w} ${y} L ${x} ${y - h} L ${x + w} ${y} L ${x} ${y + h} Z" fill="${fill}" stroke="${edge}" stroke-width="2.2"/>`
    );
  };
  let art = `<line x1="${cx}" y1="${cy[0] - 60}" x2="${cx}" y2="${cy[n - 1]}" stroke="rgba(255,210,127,0.55)" stroke-width="1.5" stroke-dasharray="5 7"/>`;
  // draw bottom first so the upper slices hover over the lower ones
  for (let i = n - 1; i >= 0; i--) art += plate(cx, cy[i], half[i], i);
  art += `<circle cx="${cx}" cy="${cy[0]}" r="5" fill="${GOLD}"/>`;
  let labels = '';
  layers.forEach((l, i) => {
    const x0 = cx + half[i] + 14;
    const lx = 950;
    labels += `<line x1="${x0}" y1="${cy[i]}" x2="${lx - 14}" y2="${cy[i]}" stroke="rgba(127,176,224,0.4)" stroke-width="1.2"/>`;
    labels += label(
      lx,
      cy[i] - 6,
      `${n - 1 - i} · ${l.name}`,
      22,
      'start',
      i === 0 ? GOLD : '#ffffff',
    );
    labels += label(lx, cy[i] + 22, l.what, 16, 'start');
    labels += `<circle cx="1420" cy="${cy[i]}" r="5" fill="${i === 0 ? GOLD : LINE}"/>`;
    labels += label(1436, cy[i] + 6, l.zoom, 15, 'start', LINE);
  });
  const axis = `<line x1="1420" y1="${cy[n - 1]}" x2="1420" y2="${cy[0] - 50}" stroke="${LINE}" stroke-width="2.2"/><polygon points="1420,${cy[0] - 68} 1411,${cy[0] - 46} 1429,${cy[0] - 46}" fill="${LINE}"/>${label(1420, cy[0] - 78, 'ZOOM IN', 18, 'middle', LINE)}`;
  return frame(`
    ${stars}
    ${label(80, 88, title, 30, 'start', LINE)}
    ${label(80, 126, sub, 18)}
    ${art}
    ${labels}
    ${axis}
  `);
}

if (process.argv.includes('--from-art')) {
  for (const slug of Object.keys(PYRAMIDS)) {
    const art = path.join(ROOT, 'masters', 'diagrams', 'science', `${slug}.png`);
    if (!fs.existsSync(art) || fs.statSync(art).size < 4096) {
      console.log(`· ${slug}: no Higgsfield art in masters/ yet`);
      continue;
    }
    await sharp(art)
      .resize(1600)
      .webp({ quality: 86 })
      .toFile(path.join(OUT, `${slug}.webp`));
    console.log(`✓ ${slug} → webp from the Higgsfield art`);
  }
  process.exit(0);
}

for (const [slug, spec] of Object.entries(PYRAMIDS)) {
  const svg = pyramid(spec);
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), svg);
  const buf = Buffer.from(svg);
  await sharp(buf)
    .resize(2048)
    .png()
    .toFile(path.join(REF, `${slug}.png`));
  // The schematic webp ships only until the Higgsfield art replaces it.
  if (!fs.existsSync(path.join(OUT, `${slug}.webp`)) || process.argv.includes('--webp')) {
    await sharp(buf)
      .resize(1600)
      .webp({ quality: 88 })
      .toFile(path.join(OUT, `${slug}.webp`));
  }
  console.log(`✓ ${slug} → svg + png ref${process.argv.includes('--webp') ? ' + webp' : ''}`);
}
