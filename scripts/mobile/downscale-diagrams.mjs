#!/usr/bin/env node
/**
 * /science diagram downscale for the Capacitor mobile build (RFC-034 §12 follow-up).
 *
 * The editorial `/science` diagrams (`diagrams/science/*.webp`) are authored at
 * 1600 px for crisp desktop display, and the same file serves mobile — a bucket
 * that grew to ~12 MB as the WIRED-blend set expanded (6 EDL + 25 redos in the
 * Phase-2 work). A phone doesn't need 1600 px art, so we shrink each diagram IN
 * PLACE in build/ (same filename — no code/manifest/provenance change) to a
 * 1000 px, tighter-WebP mobile rung. The browser build is untouched.
 *
 * Mirrors downscale-base-textures.mjs: runs AFTER prune-streamed-assets.mjs in
 * `build:mobile`, before the size-budget check. NO-OP unless MOBILE=1.
 */
import sharp from 'sharp';
import { readdir, rename, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BUILD = path.resolve(process.cwd(), 'build');
const DIAGRAM_DIR = path.join(BUILD, 'diagrams', 'science');
const MAX_WIDTH = 1000; // ample for the /science hero-diagram at phone DPI
const WEBP_QUALITY = 80;

if (process.env.MOBILE !== '1') {
  console.log('[downscale-diagrams] MOBILE != 1 — skipping (browser build untouched).');
  process.exit(0);
}
if (!existsSync(DIAGRAM_DIR)) {
  console.log('[downscale-diagrams] no diagrams/science in build/ — skipping.');
  process.exit(0);
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
let before = 0;
let after = 0;
let count = 0;

for (const f of await readdir(DIAGRAM_DIR)) {
  if (!f.endsWith('.webp')) continue;
  const file = path.join(DIAGRAM_DIR, f);
  const startBytes = (await stat(file)).size;
  const tmp = `${file}.tmp`;
  await sharp(file)
    .resize(MAX_WIDTH, null, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(tmp);
  const endBytes = (await stat(tmp)).size;
  // Only keep the downscaled version when it's actually smaller (idempotent).
  if (endBytes < startBytes) {
    await rename(tmp, file);
    before += startBytes;
    after += endBytes;
    count += 1;
  } else {
    const { unlink } = await import('node:fs/promises');
    await unlink(tmp);
  }
}

console.log(
  `[downscale-diagrams] ${count} diagrams · ${mb(before)} MB → ${mb(after)} MB (freed ${mb(before - after)} MB)`,
);
