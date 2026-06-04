#!/usr/bin/env node
/**
 * Fetch equirectangular surface textures for the 6 Uranus + Neptune
 * moons that currently render with fallback colours (#304 sub-slice
 * B). Wikimedia Commons hosts USGS-derived global mosaics from
 * Voyager 2's 1986 (Uranus) and 1989 (Neptune) flybys — mostly
 * southern-hemisphere coverage, missing terrain backfilled with
 * monochrome interpolation, but adequate as planet-sphere maps at
 * /explore's zoom level.
 *
 * Run from project root:  node scripts/fetch-satellite-textures.mjs
 */
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// `access` covers existence-check (no need for the sync variant).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXTURES_DIR = join(ROOT, 'static', 'textures');

const WIKIMEDIA_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// USGS Astrogeology hosts these via Wikimedia. Each file is a
// global equirectangular cylindrical projection.
const TEXTURES = {
  '2k_miranda.jpg': 'Miranda-Voyager2-equirectangular-global-mosaic.png',
  '2k_ariel.jpg': 'Ariel-Voyager2-equirectangular-global-mosaic.png',
  '2k_umbriel.jpg': 'Umbriel-Voyager2-equirectangular-global-mosaic.png',
  '2k_titania.jpg': 'Titania-Voyager2-equirectangular-global-mosaic.png',
  '2k_oberon.jpg': 'Oberon-Voyager2-equirectangular-global-mosaic.png',
  '2k_triton.jpg': 'Triton-Voyager2-cylindrical-mosaic.jpg',
};

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

let fetched = 0;
let skipped = 0;
let failed = 0;

for (const [target, source] of Object.entries(TEXTURES)) {
  const dest = join(TEXTURES_DIR, target);
  if (await fileExists(dest)) {
    console.log(`✓ ${target} (already exists, skipping)`);
    skipped++;
    continue;
  }
  try {
    process.stdout.write(`  fetching ${target} from ${source}…`);
    const url = `${WIKIMEDIA_BASE}/${encodeURIComponent(source)}?width=2048`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, buffer);
    process.stdout.write(` ${(buffer.length / 1024).toFixed(0)} KB ✓\n`);
    fetched++;
    await new Promise((r) => setTimeout(r, 1100));
  } catch (err) {
    process.stdout.write(` ✗ ${err.message}\n`);
    failed++;
  }
}

console.log(`\nFetched ${fetched}; skipped ${skipped}; failed ${failed}.`);
if (failed > 0) {
  console.log(
    'Failures fall back to the per-moon `fallbackColor` field — the moons still render, just without surface detail.',
  );
}
