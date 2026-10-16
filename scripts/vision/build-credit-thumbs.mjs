#!/usr/bin/env node
/**
 * /credits thumbnails for images that have no WebP ladder (#482).
 *
 * /credits lists every credited image with a 64-96 CSS px square thumbnail. Ladder
 * images get a 320 px rung through responsive(); the rest — hotspot surface tiles
 * (deliberately outside the ladder: the 3D scenes load them as textures), textures,
 * deep-sky / launch-ground JPEGs, the .1x1 crops — were fetched full size: 303 MB
 * after a full scroll on vite dev (2026-10-16), 182 MB of it 272 hotspot tiles.
 *
 * For each such raster in image-provenance.json this writes a 192x192 WebP
 * (center-cropped, as the page shows it: object-fit: cover in a square; 192 =
 * 64 CSS px @3x and 96 @2x) to static/credit-thumbs/<path>.webp, and lists the
 * covered paths in static/data/credit-thumbs.json. Add-only: an existing thumb is
 * kept. `--dry-run` reports without writing.
 */
import { existsSync, linkSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const STATIC = 'static';
const OUT_DIR = 'static/credit-thumbs';
const LIST = 'static/data/credit-thumbs.json';
const SIZE = 192;
const QUALITY = 75;
const DRY = process.argv.includes('--dry-run');

const prov = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8'));
const entries = Array.isArray(prov) ? prov : prov.entries;

const covered = [];
let written = 0;
let bytes = 0;
let sourceBytes = 0;
const missing = [];
for (const { path: p } of entries) {
  if (!/\.(jpe?g|png|webp)$/i.test(p)) continue;
  if (ladder[p.replace(/\.[^.]+$/, '')]) continue; // responsive() serves a ladder rung
  const src = path.join(STATIC, p);
  if (!existsSync(src)) {
    missing.push(p);
    continue;
  }
  const out = path.join(OUT_DIR, p.replace(/\.[^.]+$/, '.webp'));
  covered.push(p);
  sourceBytes += readFileSync(src).length;
  // Skip work for thumbs that exist. This check only saves a render; it does
  // not guard the write (that is the link below).
  if (existsSync(out)) continue;
  const data = await sharp(src)
    .resize(SIZE, SIZE, { fit: 'cover' })
    .webp({ quality: QUALITY })
    .toBuffer();
  if (!DRY) {
    // Add-only and never partial: write a private temp file, then hard-link it
    // into place. link() fails with EEXIST rather than overwrite, and `out` only
    // ever appears complete, so a crash can't leave a 0-byte thumb that later
    // runs would keep.
    mkdirSync(path.dirname(out), { recursive: true });
    const tmp = `${out}.${process.pid}.tmp`;
    writeFileSync(tmp, data);
    try {
      linkSync(tmp, out);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      continue; // written concurrently by someone else: keep theirs
    } finally {
      rmSync(tmp, { force: true });
    }
  }
  written += 1;
  bytes += data.length;
}
covered.sort();
if (!DRY) writeFileSync(LIST, JSON.stringify(covered, null, 1) + '\n');
console.log(
  `[credit-thumbs] ${DRY ? 'DRY RUN · ' : ''}${covered.length} non-ladder rasters (${(sourceBytes / 1e6).toFixed(1)} MB as served) · ` +
    `${written} thumbs ${DRY ? 'would be ' : ''}written (${(bytes / 1e6).toFixed(1)} MB) · ${missing.length} listed but not on disk`,
);
if (missing.length)
  console.log(`  not on disk: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ', …' : ''}`);
