#!/usr/bin/env node
/**
 * Base-4K texture downscale for the Capacitor mobile build (ADR-079 D3).
 *
 * Four bodies use a 4K-class texture as their ONLY (base) surface map, with no
 * 2K sibling to fall back to: io, titan, enceladus, pluto. They can't be pruned
 * like the LOD-upgrade 4K textures (prune-streamed-assets.mjs) — a scene that
 * loads `4k_io.jpg` would 404. Instead we shrink them IN PLACE in build/: same
 * filename (no code/provenance change), fewer pixels + tighter JPEG so a phone
 * ships ~2K-class quality instead of 4K-class.
 *
 * `withoutEnlargement` guards the odd case (4k_pluto is already 1920×1080) so
 * we never upscale — those are only re-encoded tighter. Runs AFTER
 * prune-streamed-assets.mjs in `build:mobile`. NO-OP unless MOBILE=1.
 */
import sharp from 'sharp';
import { rename, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BUILD = path.resolve(process.cwd(), 'build');
const MAX_WIDTH = 2048; // 2K equirect width; heights follow the source ratio
const JPEG_QUALITY = 82; // mozjpeg — visually lossless at phone DPI

const BASE_4K_TEXTURES = [
  'textures/4k_io.jpg',
  'textures/4k_titan.jpg',
  'textures/4k_enceladus.jpg',
  'textures/4k_pluto.jpg',
];

if (process.env.MOBILE !== '1') {
  console.log('[downscale-base] MOBILE != 1 — skipping (browser build untouched).');
  process.exit(0);
}

const mb = (b) => (b / 1024 / 1024).toFixed(1);
let before = 0;
let after = 0;

for (const rel of BASE_4K_TEXTURES) {
  const file = path.join(BUILD, rel);
  if (!existsSync(file)) continue; // idempotent — skip if already pruned/absent
  const startBytes = (await stat(file)).size;
  const tmp = `${file}.tmp`;
  await sharp(file)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(tmp);
  await rename(tmp, file);
  const endBytes = (await stat(file)).size;
  before += startBytes;
  after += endBytes;
  console.log(
    `[downscale-base] ${rel.replace('textures/', '').padEnd(20)} ${mb(startBytes)} MB → ${mb(endBytes)} MB`,
  );
}

console.log(
  `[downscale-base] ${BASE_4K_TEXTURES.length} base textures · ${mb(before)} MB → ${mb(after)} MB ` +
    `(freed ${mb(before - after)} MB)`,
);
