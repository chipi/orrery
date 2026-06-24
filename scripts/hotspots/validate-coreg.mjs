/**
 * Validate that a Mars site's HiRISE detail crop is CO-REGISTERED with
 * its CTX regional crop (#309 / #15). Both are north-up map-projected
 * crops centred on the same lat/lon, but at very different scales:
 *   - HiRISE detail: 2048 px × source_res (0.25–0.5 m/px) ≈ 512–1024 m
 *   - CTX regional:  3072 px × 5 m/px ≈ 15.36 km
 * So the HiRISE patch corresponds to just the CENTRAL ~512 m of the CTX
 * crop (~102 CTX px). The earlier harness wrongly compared HiRISE to the
 * CTX central 65 % (~10 km) — a 20× scale mismatch that made every site
 * look broken. This crops the CTX to the HiRISE's TRUE ground extent,
 * resamples both to a common grid, and runs a gradient (Sobel) NCC with
 * a small translation (±georef tolerance) + rotation search. A real
 * co-registered pair peaks at near-zero offset with NCC well above the
 * non-co-registered floor (~0.05).
 *
 * Run (Node 20 for gdal-async):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/hotspots/validate-coreg.mjs <site>
 */
import sharp from 'sharp';
import gdal from 'gdal-async';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const SITE = process.argv[2];
if (!SITE) {
  console.error('usage: validate-coreg.mjs <site>');
  process.exit(1);
}
const ROOT = process.cwd();
const HIRISE = path.join(ROOT, `static/images/hotspots/mars/${SITE}/tier2-hirise.jpg`);
const CTX = path.join(ROOT, `static/images/hotspots/mars/${SITE}/tier2-ctx.jpg`);
const RAW = path.join(ROOT, '.image-cache/hotspots/raw');
const N = 384; // common comparison grid
const CTX_RES = 5; // Murray Lab Global CTX Mosaic, m/px

/** Recover the HiRISE source resolution (m/px) from the cached raster
 *  named by the provenance source_url, falling back to 0.25. */
function hiriseRes() {
  try {
    const prov = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'static/data/image-provenance.json'), 'utf8'),
    );
    const flat = [];
    (function walk(o) {
      if (o && typeof o === 'object') {
        if (o.path) flat.push(o);
        for (const v of Object.values(o)) walk(v);
      }
    })(prov);
    const e = flat.find((o) => o.path === `/images/hotspots/mars/${SITE}/tier2-hirise.jpg`);
    if (e?.source_url?.includes('hirise')) {
      const ext = path.extname(new URL(e.source_url).pathname) || '.bin';
      const h = createHash('sha256').update(e.source_url).digest('hex').slice(0, 16);
      const cp = path.join(RAW, `${h}${ext}`);
      if (fs.existsSync(cp)) {
        return Math.abs(gdal.open(cp).geoTransform[1]);
      }
    }
  } catch (err) {
    console.warn('  (res lookup failed, assuming 0.25 m/px):', err.message);
  }
  return 0.25;
}

async function grayFloat(buf, w, h) {
  const { data } = await sharp(buf)
    .resize(w, h, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Float32Array.from(data);
}

function sobel(g, w, h) {
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        g[i - w - 1] + 2 * g[i - 1] + g[i + w - 1] - g[i - w + 1] - 2 * g[i + 1] - g[i + w + 1];
      const gy =
        g[i - w - 1] + 2 * g[i - w] + g[i - w + 1] - g[i + w - 1] - 2 * g[i + w] - g[i + w + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

/** NCC over a circular centre mask, with integer translation (dx,dy). */
function nccShift(a, b, w, h, dx, dy) {
  const cx = w / 2,
    cy = h / 2,
    r2 = (w * 0.4) ** 2;
  let sa = 0,
    sb = 0,
    n = 0;
  const idx = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const xb = x + dx,
        yb = y + dy;
      if (xb < 0 || xb >= w || yb < 0 || yb >= h) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r2) continue;
      const ia = y * w + x,
        ib = yb * w + xb;
      idx.push([ia, ib]);
      sa += a[ia];
      sb += b[ib];
      n++;
    }
  if (n < 50) return -1;
  const ma = sa / n,
    mb = sb / n;
  let num = 0,
    da = 0,
    db = 0;
  for (const [ia, ib] of idx) {
    const va = a[ia] - ma,
      vb = b[ib] - mb;
    num += va * vb;
    da += va * va;
    db += vb * vb;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

async function rotateGray(buf, deg, w, h) {
  const out = await sharp(buf)
    .resize(w, h, { fit: 'fill' })
    .rotate(deg, { background: { r: 128, g: 128, b: 128 } })
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .greyscale()
    .raw()
    .toBuffer();
  return Float32Array.from(out);
}

async function main() {
  if (!fs.existsSync(HIRISE) || !fs.existsSync(CTX)) {
    console.error(`missing crop(s) for ${SITE}`);
    process.exit(1);
  }
  const res = hiriseRes();
  const hiriseGroundM = 2048 * res;
  const ctxMeta = await sharp(CTX).metadata();
  const ctxGroundM = ctxMeta.width * CTX_RES;
  const ctxCenterPx = Math.round((hiriseGroundM / ctxGroundM) * ctxMeta.width);
  console.log(`${SITE}: HiRISE res=${res} m/px → ground=${hiriseGroundM.toFixed(0)} m`);
  console.log(
    `  CTX ${ctxMeta.width}px → ground=${(ctxGroundM / 1000).toFixed(1)} km; central window=${ctxCenterPx}px`,
  );

  // Extract the CTX central window matching the HiRISE ground extent.
  const left = Math.round((ctxMeta.width - ctxCenterPx) / 2);
  const top = Math.round((ctxMeta.height - ctxCenterPx) / 2);
  const ctxCrop = await sharp(CTX)
    .extract({ left, top, width: ctxCenterPx, height: ctxCenterPx })
    .toBuffer();

  const ctxG = sobel(await grayFloat(ctxCrop, N, N), N, N);
  // Translation search bound: ±georef tolerance (~tens of m) in grid px.
  const maxShift = Math.round((80 / hiriseGroundM) * N); // ~±80 m
  let best = { ncc: -1, dx: 0, dy: 0, rot: 0 };
  for (const rot of [-6, -4, -2, 0, 2, 4, 6]) {
    const hiG = sobel(await rotateGray(await sharp(HIRISE).toBuffer(), rot, N, N), N, N);
    for (let dy = -maxShift; dy <= maxShift; dy += 2)
      for (let dx = -maxShift; dx <= maxShift; dx += 2) {
        const ncc = nccShift(ctxG, hiG, N, N, dx, dy);
        if (ncc > best.ncc) best = { ncc, dx, dy, rot };
      }
  }
  const offsetM = Math.hypot(best.dx, best.dy) * (hiriseGroundM / N);
  console.log(
    `  best NCC=${best.ncc.toFixed(3)} @ dx=${best.dx} dy=${best.dy} (≈${offsetM.toFixed(0)} m) rot=${best.rot}°`,
  );
  const verdict = best.ncc >= 0.18 ? 'CO-REGISTERED ✓' : best.ncc >= 0.1 ? 'WEAK ~' : 'MISMATCH ✗';
  console.log(`  verdict: ${verdict}`);
}

main();
