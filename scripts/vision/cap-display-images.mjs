#!/usr/bin/env node
/**
 * Slice 1b — cap served display images at 3840 px / q85 (RFC-030 D2, #383).
 *
 * The full-size hero/gallery/lightbox images ship at source resolution
 * (up to 6720 px / 7.5 MB) into a fit-to-viewport lightbox (no pinch-zoom),
 * and at wasteful JPEG quality. Cap the longest side at 3840 px (native 4K —
 * covers a 50" Google-TV lightbox) and re-encode q85 mozjpeg (visually
 * lossless at that scale). Non-destructive: the full-res original is preserved
 * in the git-LFS `masters/` store (Slice 1a), so any rung / WebP re-encode
 * regenerates losslessly.
 *
 * Excludes:
 *   - `hotspots/` — the zoomable 3D surface tier2/tier3 panoramas (RFC-030 D5).
 *   - `*.1x1/4x3/16x9` — thumbnail variants (Slice 0 already capped 1x1).
 *
 * Idempotent: an image already ≤3840 px AND reasonably sized is skipped.
 * Interim: superseded by the WebP `srcset` ladder (Slice 2/3); banks the
 * ~−312 MB now regardless of how the ladder work sequences.
 */
import { readdir, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'static/images';
const MAX_PX = 3840;
const QUALITY = 85;
// zoom-critical 3D tiers + downloadable art posters — keep full-res jpg.
const EXCLUDE_TOP = new Set(['hotspots', 'posters']);
const IS_THUMB = /\.(1x1|4x3|16x9)\./;
const IS_IMG = /\.(jpe?g|png|webp)$/i;

async function* walk(dir, top = '') {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const seg = top || e.name;
    if (e.isDirectory()) {
      if (EXCLUDE_TOP.has(e.name)) continue;
      yield* walk(full, seg);
    } else if (IS_IMG.test(e.name) && !IS_THUMB.test(e.name)) {
      yield full;
    }
  }
}

let capped = 0;
let recompressed = 0;
let skipped = 0;
let before = 0;
let after = 0;

for await (const file of walk(ROOT)) {
  const startBytes = (await stat(file)).size;
  const buf = await readFile(file);
  const meta = await sharp(buf).metadata();
  const long = Math.max(meta.width ?? 0, meta.height ?? 0);
  const ext = path.extname(file).toLowerCase();

  let pipe = sharp(buf);
  const needsResize = long > MAX_PX;
  if (needsResize) {
    pipe = pipe.resize({ width: MAX_PX, height: MAX_PX, fit: 'inside', withoutEnlargement: true });
  }
  if (ext === '.png') pipe = pipe.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipe = pipe.webp({ quality: QUALITY });
  else pipe = pipe.jpeg({ quality: QUALITY, mozjpeg: true });
  const out = await pipe.toBuffer();

  // Only rewrite when it actually shrinks (skip already-efficient files → less
  // churn, no needless double-compression of small images).
  if (out.length >= startBytes && !needsResize) {
    skipped += 1;
    continue;
  }
  await writeFile(file, out);
  before += startBytes;
  after += out.length;
  if (needsResize) capped += 1;
  else recompressed += 1;
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(
  `[cap-display] ${capped} resized(>3840px) + ${recompressed} recompressed(q85) · ${skipped} skipped\n` +
    `[cap-display] ${mb(before)} MB → ${mb(after)} MB (freed ${mb(before - after)} MB) · hotspots excluded`,
);
