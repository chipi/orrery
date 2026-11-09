/**
 * Register every along-route detail tile of a Mars rover against the regional CTX crop and report
 * how far each sits from where its lat/lon says (metres N / E, in the CTX frame, which is the frame
 * the site points and the traverse are in). Per-product HiRISE georeferences differ from the CTX
 * mosaic by up to ~70 m, so a tile cut at a lat/lon in its own product's frame can land off the
 * traverse. Gradient (Sobel) NCC of the tile, shrunk to the CTX's 5 m/px, against the CTX around
 * its position (±300 m, after a 1.5 px blur of both so 15-30 m terrain forms drive the match, not CTX noise), then refined at 2.5 m/px with a parabola fit. Read-only unless --apply.
 *
 * `--apply` moves the tile's lat/lon in `<rover>.route-patches.json` by the measured offset when it
 * is at least --min-m (default 25) and the NCC is at least --min-ncc (default 0.15); the images are
 * not touched. `--calib` also measures the site's `tier2-hirise.jpg` (cut at the site in the CTX
 * frame, so it should read ≈ 0 N 0 E) to prove the CTX centre arithmetic.
 *
 *   node --import tsx scripts/hotspots/coreg-route-tiles.mjs <perseverance|curiosity> [--calib] [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { cropCentre } from './fetch-mars-ctx.ts';

const args = process.argv.slice(2);
const rover = args[0];
const opt = (n, d) => (args.includes(`--${n}`) ? Number(args[args.indexOf(`--${n}`) + 1]) : d);
const BLUR = opt('blur', 1.5);
const RANGE = opt('range', 60);
const minM = opt('min-m', 25);
const minNcc = opt('min-ncc', 0.15);
if (!rover || rover.startsWith('--')) {
  console.error(
    'usage: coreg-route-tiles.mjs <rover> [--calib] [--apply] [--min-m 25] [--min-ncc 0.15]',
  );
  process.exit(2);
}

const M_PER_DEG = (Math.PI / 180) * 3396190;
const CTX_RES = 5;
const patchesPath = `static/data/mars-traverses/${rover}.route-patches.json`;
const doc = JSON.parse(readFileSync(patchesPath, 'utf8'));
const site = JSON.parse(readFileSync('static/data/mars-sites.json', 'utf8'));
const siteRow = (site.sites ?? site).find((s) => s.id === rover);
const centre = cropCentre(rover, siteRow.lat, siteRow.lon);
const ctxPath = `static/images/hotspots/mars/${rover}/tier2-ctx.jpg`;
const ctxMeta = await sharp(ctxPath).metadata();
const W = ctxMeta.width;
const H = ctxMeta.height;
console.log(`${rover}: CTX ${W}x${H} centred ${centre.lat.toFixed(5)} ${centre.lon.toFixed(5)}`);

const toPx = (lat, lon) => ({
  x: W / 2 + ((lon - centre.lon) * M_PER_DEG * Math.cos((centre.lat * Math.PI) / 180)) / CTX_RES,
  y: H / 2 - ((lat - centre.lat) * M_PER_DEG) / CTX_RES,
});

async function grey(input, w, h, blur = 0) {
  let p = sharp(input)
    .flatten({ background: '#808080' })
    .greyscale()
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' });
  if (blur >= 0.3) p = p.blur(blur);
  const { data, info } = await p
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { g: Float32Array.from(data), w: info.width, h: info.height };
}
function sobel({ g, w, h }) {
  const o = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1] - g[i - w + 1] - 2 * g[i + 1] - g[i + w + 1];
      const gy =
        g[i - w - 1] + 2 * g[i - w] + g[i - w + 1] - g[i + w - 1] - 2 * g[i + w] - g[i + w + 1];
      o[i] = Math.hypot(gx, gy);
    }
  return { g: o, w, h };
}
/** NCC of template t (n x n, circular mask) against image im at integer window origin (ox, oy). */
function nccAt(im, t, n, ox, oy) {
  const r2 = (n * 0.4) ** 2;
  const c = n / 2;
  let sa = 0;
  let sb = 0;
  let k = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if ((x - c) ** 2 + (y - c) ** 2 > r2) continue;
      sa += im.g[(oy + y) * im.w + ox + x];
      sb += t[y * n + x];
      k++;
    }
  const ma = sa / k;
  const mb = sb / k;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if ((x - c) ** 2 + (y - c) ** 2 > r2) continue;
      const a = im.g[(oy + y) * im.w + ox + x] - ma;
      const b = t[y * n + x] - mb;
      ab += a * b;
      aa += a * a;
      bb += b * b;
    }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}
function search(im, t, n, cx, cy, range, step = 1) {
  let best = { s: -1, dx: 0, dy: 0 };
  const grid = new Map();
  for (let dy = -range; dy <= range; dy += step)
    for (let dx = -range; dx <= range; dx += step) {
      const ox = Math.round(cx - n / 2) + dx;
      const oy = Math.round(cy - n / 2) + dy;
      if (ox < 0 || oy < 0 || ox + n > im.w || oy + n > im.h) continue;
      const s = nccAt(im, t, n, ox, oy);
      grid.set(`${dx},${dy}`, s);
      if (s > best.s) best = { s, dx, dy };
    }
  const par = (m, c, p) => (m + p - 2 * c ? (0.5 * (m - p)) / (m + p - 2 * c) : 0);
  const g = (dx, dy) => grid.get(`${dx},${dy}`) ?? best.s;
  const fx = par(g(best.dx - step, best.dy), best.s, g(best.dx + step, best.dy));
  const fy = par(g(best.dx, best.dy - step), best.s, g(best.dx, best.dy + step));
  return { ...best, fx: best.dx + fx * step, fy: best.dy + fy * step };
}

const ctxGrey = await grey(ctxPath, W, H, BLUR);
const ctxSobel = sobel(ctxGrey);

/** @returns {{n: number, e: number, ncc: number}} tile content offset from its lat/lon, metres. */
async function measure(imgPath, lat, lon, groundM) {
  const { x, y } = toPx(lat, lon);
  const n = Math.round(groundM / CTX_RES);
  const t5 = sobel(await grey(`static${imgPath}`, n, n, BLUR)).g;
  const coarse = search(ctxSobel, t5, n, x, y, RANGE);
  // refine at 2.5 m/px around the coarse peak
  const px0 = Math.round(x - n / 2) + coarse.dx - 6;
  const py0 = Math.round(y - n / 2) + coarse.dy - 6;
  const side = n + 12;
  if (px0 < 0 || py0 < 0 || px0 + side > W || py0 + side > H)
    return { n: NaN, e: NaN, ncc: coarse.s };
  const win = await sharp(ctxPath)
    .extract({ left: px0, top: py0, width: side, height: side })
    .toBuffer();
  const imF = sobel(await grey(win, side * 2, side * 2, BLUR * 2));
  const n2 = n * 2;
  const tF = sobel(await grey(`static${imgPath}`, n2, n2, BLUR * 2)).g;
  const fine = search(imF, tF, n2, side, side, 12);
  const foundX = px0 + (Math.round(side - n2 / 2) + fine.fx + n2 / 2) / 2;
  const foundY = py0 + (Math.round(side - n2 / 2) + fine.fy + n2 / 2) / 2;
  return { n: -(foundY - y) * CTX_RES, e: (foundX - x) * CTX_RES, ncc: fine.s };
}

const rows = [];
if (args.includes('--calib')) {
  const hi = siteRow;
  const m = await measure(`/images/hotspots/mars/${rover}/tier2-hirise.jpg`, hi.lat, hi.lon, 512);
  console.log(
    `CALIB tier2-hirise at site ${hi.lat} ${hi.lon}: ${m.n.toFixed(1)} N ${m.e.toFixed(1)} E ncc ${m.ncc.toFixed(2)}`,
  );
}
for (const p of doc.patches) {
  const m = await measure(p.image, p.lat, p.lon, p.ground_m ?? 512);
  rows.push({ p, ...m });
  console.log(
    `${p.id.padEnd(8)} ${p.product_id} ${m.n.toFixed(0).padStart(5)} N ${m.e.toFixed(0).padStart(5)} E ncc ${m.ncc.toFixed(2)}`,
  );
}
const ok = rows.filter((r) => Number.isFinite(r.n) && r.ncc >= minNcc);
const mags = ok.map((r) => Math.hypot(r.n, r.e)).sort((a, b) => a - b);
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : NaN);
console.log(
  `${rover}: ${ok.length}/${rows.length} tiles measured (ncc >= ${minNcc}); offset max ${mags.at(-1)?.toFixed(0)} m, median ${med(mags).toFixed(0)} m, ` +
    `${mags.filter((m) => m >= minM).length} at or above ${minM} m`,
);
if (args.includes('--apply')) {
  let moved = 0;
  for (const r of ok) {
    if (Math.hypot(r.n, r.e) < minM) continue;
    r.p.lat = Number((r.p.lat + r.n / M_PER_DEG).toFixed(6));
    r.p.lon = Number(
      (r.p.lon + r.e / (M_PER_DEG * Math.cos((r.p.lat * Math.PI) / 180))).toFixed(6),
    );
    moved++;
  }
  writeFileSync(patchesPath, JSON.stringify(doc, null, 2) + '\n');
  console.log(`${moved} tiles moved in ${patchesPath}`);
}
