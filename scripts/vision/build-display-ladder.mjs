#!/usr/bin/env node
/**
 * Slice 2 — derive the WebP display ladder (RFC-030 D1/D2, ADR-080, #383).
 *
 * For each non-hotspot source image, emit a responsive size ladder as WebP:
 *   NN-1280.webp  NN-2048.webp  NN-3072.webp
 * next to the served base. The DOM `<img srcset>` (Slice 3) picks the rung the
 * client's viewport needs — phone → 1280, desktop → 2048, 4K Google-TV → 3072.
 *
 * Derives from `masters/` (full-res originals, git-LFS) so each rung is a single
 * downscale from source, not a re-encode of the capped derivative — best quality
 * at every size. `withoutEnlargement` never upscales a smaller master.
 *
 * Excludes `hotspots/` (zoom-critical 3D tiers, RFC-030 D5) and the thumbnail
 * variants (`.1x1` handled by crop-variants, Slice 0).
 *
 * Requires masters smudged: `git lfs pull -I 'masters/**'`. Idempotent — skips
 * a rung that already exists unless --force.
 */
import { readdir, mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MASTERS = 'masters';
const SERVED = 'static/images';
const RUNGS = [1280, 2048, 3072];
const QUALITY = 80;
const EXCLUDE_TOP = new Set(['hotspots']);
const IS_THUMB = /\.(1x1|4x3|16x9)\./;
const IS_IMG = /\.(jpe?g|png|webp)$/i;
const FORCE = process.argv.includes('--force');

async function* walk(dir, top = '') {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!top && EXCLUDE_TOP.has(e.name)) continue;
      yield* walk(full, top || e.name);
    } else if (IS_IMG.test(e.name) && !IS_THUMB.test(e.name)) {
      yield full;
    }
  }
}

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

let rungs = 0;
let sources = 0;
let skipped = 0;
let bytes = 0;

const first = readFileSync;
{
  // Guard: masters must be smudged (real bytes, not LFS pointer stubs).
  let sample;
  for await (const f of walk(MASTERS)) {
    sample = f;
    break;
  }
  if (
    !sample ||
    first(sample).subarray(0, 40).toString('utf8').startsWith('version https://git-lfs')
  ) {
    console.error("[ladder] masters/ not smudged — run `git lfs pull -I 'masters/**'` first.");
    process.exit(1);
  }
}

for await (const master of walk(MASTERS)) {
  const rel = path.relative(MASTERS, master); // e.g. missions/curiosity/01.jpg
  const stem = rel.replace(/\.[^.]+$/, ''); // missions/curiosity/01
  sources += 1;
  const buf = readFileSync(master);
  const meta = await sharp(buf).metadata();
  const srcLong = Math.max(meta.width ?? 0, meta.height ?? 0);
  for (const w of RUNGS) {
    // Skip a rung that would just upscale (source already ≤ this rung and a
    // smaller rung already covers it) — but always emit at least the rung
    // nearest the source so every image has a top rung.
    const out = path.join(SERVED, `${stem}-${w}.webp`);
    if (!FORCE && (await exists(out))) {
      skipped += 1;
      continue;
    }
    // Don't emit rungs far above the source (no upscale); keep the one that
    // matches the source's own resolution as the top.
    if (w > srcLong && RUNGS.some((r) => r < w && r >= srcLong)) continue;
    await mkdir(path.dirname(out), { recursive: true });
    const data = await sharp(buf)
      .resize({ width: w, height: w, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    await writeFile(out, data);
    rungs += 1;
    bytes += data.length;
  }
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
console.log(
  `[ladder] ${sources} sources → ${rungs} WebP rungs written (${mb(bytes)} MB) · ${skipped} skipped · hotspots excluded`,
);
