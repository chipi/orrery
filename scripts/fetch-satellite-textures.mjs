#!/usr/bin/env node
/**
 * Fetch equirectangular surface texture for Triton (#304 sub-slice B
 * + #303 follow-up). USGS Astrogeology hosts the only true global
 * cylindrical mosaic of Triton from Voyager 2's 1989 flyby.
 *
 * Uranus moons (Miranda, Ariel, Umbriel, Titania, Oberon) intentionally
 * stay on the per-moon `fallbackColor` rendering — Voyager 2's 1986
 * flyby only imaged southern hemispheres and no modern mission has
 * produced global maps. JWST + Hubble can detect the moons but not
 * resolve their surfaces into equirectangular projections. This is a
 * data limitation, not a missing-asset bug; the colored spheres are
 * the honest stand-in until a dedicated Uranus mission (NRC Decadal
 * Survey 2023 top priority) maps them.
 *
 * Run from project root:  node scripts/fetch-satellite-textures.mjs
 */
import { writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEXTURES_DIR = join(ROOT, 'static', 'textures');

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// USGS Astrogeology direct-download URLs. Each file is a global
// equirectangular cylindrical projection.
const TEXTURES = {
  // Triton — USGS catalog id: triton_voyager_2_global_color_mosaic_600m.
  // 1024-px JPG (the high-res TIFF is 287 MB; the 1024 sample is the
  // right scale for /explore at Triton's `sizeUnits: 1.6` rendering).
  '2k_triton.jpg':
    'https://astrogeology.usgs.gov/ckan/dataset/445b4c39-e87a-4e4d-88a8-e48d8e755c5c/resource/de0ba9f1-303e-4e5f-a99a-3201fba9a764/download/triton_voyager2_clrmosaic_1024.jpg',
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

for (const [target, url] of Object.entries(TEXTURES)) {
  const dest = join(TEXTURES_DIR, target);
  if (await fileExists(dest)) {
    console.log(`✓ ${target} (already exists, skipping)`);
    skipped++;
    continue;
  }
  try {
    process.stdout.write(`  fetching ${target}…`);
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
