#!/usr/bin/env node
/**
 * One-time downsize of the committed .1x1 thumbnails (ADR-079 / #379).
 *
 * crop-variants.ts historically wrote the 1x1 crop at SOURCE resolution — a
 * 3000 px master → a 3000 px "thumbnail", up to 7 MB, ~653 MB across ~2.5k
 * files. The generator now caps at 512 px, but the already-committed crops
 * stay oversized. This migrates them in place: same crop (already focal-point
 * correct), just downsized to ≤512 px + q80 mozjpeg. Offline, no vision-API
 * cost, no manifest/phash impact (phash excludes .1x1; vision scores originals).
 *
 * Idempotent: a crop already ≤512 px AND ≤ SKIP_KB is left untouched, so
 * re-runs are no-ops and the git diff is limited to files that actually shrink.
 *
 * Usage: node scripts/vision/optimize-1x1-thumbnails.mjs [--dir static/images]
 */
import { readdir, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_PX = 512;
const QUALITY = 80;
const SKIP_KB = 55; // already-small crops (≤512px + ≤55KB) are left as-is
const ROOT = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : 'static/images';

const IS_1X1 = /\.1x1\.(jpe?g|png|webp)$/i;

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (IS_1X1.test(e.name)) yield full;
  }
}

let processed = 0;
let skipped = 0;
let before = 0;
let after = 0;
const overBudget = [];

for await (const file of walk(ROOT)) {
  const startBytes = (await stat(file)).size;
  const buf = await readFile(file);
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? 0;
  if (w <= MAX_PX && startBytes <= SKIP_KB * 1024) {
    skipped += 1;
    continue;
  }
  const ext = path.extname(file).toLowerCase();
  let pipe = sharp(buf).resize({
    width: MAX_PX,
    height: MAX_PX,
    fit: 'inside',
    withoutEnlargement: true,
  });
  if (ext === '.png') pipe = pipe.png({ compressionLevel: 9 });
  else if (ext === '.webp') pipe = pipe.webp({ quality: QUALITY });
  else pipe = pipe.jpeg({ quality: QUALITY, mozjpeg: true });
  const out = await pipe.toBuffer();
  await writeFile(file, out);
  processed += 1;
  before += startBytes;
  after += out.length;
  if (out.length > 50 * 1024) overBudget.push([file, out.length]);
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(
  `[optimize-1x1] ${processed} downsized · ${skipped} already small · ` +
    `${mb(before)} MB → ${mb(after)} MB (freed ${mb(before - after)} MB)`,
);
if (overBudget.length) {
  console.log(
    `[optimize-1x1] ${overBudget.length} still >50 KB (detailed images at 512px):\n` +
      overBudget
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([f, b]) => `    ${(b / 1024).toFixed(0)} KB  ${path.relative(ROOT, f)}`)
        .join('\n'),
  );
}
