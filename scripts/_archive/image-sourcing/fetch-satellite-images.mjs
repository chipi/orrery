#!/usr/bin/env node
/**
 * Fetch hero images for the 16 natural satellites surfaced on
 * /explore (#304 sub-slice A). Curated Wikimedia Commons file
 * names — chosen to be the most recognisable canonical NASA
 * portrait per body (Voyager 2 / Galileo / Cassini / New Horizons
 * imagery). One image per moon today; gallery expansion is a
 * follow-up that fetches secondary scenes through the same script.
 *
 * Run from project root:  node scripts/fetch-satellite-images.mjs
 */
import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SATELLITES_DIR = join(ROOT, 'static', 'images', 'satellites');
const GALLERIES_JSON = join(ROOT, 'static', 'data', 'satellite-galleries.json');
const PROVENANCE_JSON = join(ROOT, 'static', 'data', 'image-provenance.json');

const WIKIMEDIA_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// Curated canonical hero image per moon. Wikimedia filename →
// captured by NASA / Voyager / Galileo / Cassini / New Horizons.
const HERO_IMAGES = {
  moon: {
    file: 'FullMoon2010.jpg',
    title: 'File:FullMoon2010.jpg',
    author: 'Gregory H. Revera',
    license: 'CC-BY-SA-3.0',
  },
  phobos: {
    file: 'Phobos_colour_2008.jpg',
    title: 'File:Phobos_colour_2008.jpg',
    author: 'NASA/JPL-Caltech/University of Arizona',
    license: 'PD-NASA',
  },
  deimos: {
    file: 'Deimos-MRO.jpg',
    title: 'File:Deimos-MRO.jpg',
    author: 'NASA/JPL-Caltech/University of Arizona',
    license: 'PD-NASA',
  },
  io: {
    file: 'Io_highest_resolution_true_color.jpg',
    title: 'File:Io_highest_resolution_true_color.jpg',
    author: 'NASA/JPL/USGS',
    license: 'PD-NASA',
  },
  europa: {
    file: 'Europa-moon-with-margins.jpg',
    title: 'File:Europa-moon-with-margins.jpg',
    author: 'NASA/JPL-Caltech/SETI Institute',
    license: 'PD-NASA',
  },
  ganymede: {
    file: 'Ganymede_g1_true-edit1.jpg',
    title: 'File:Ganymede_g1_true-edit1.jpg',
    author: 'NASA/JPL/DLR',
    license: 'PD-NASA',
  },
  callisto: {
    file: 'Callisto.jpg',
    title: 'File:Callisto.jpg',
    author: 'NASA/JPL/DLR',
    license: 'PD-NASA',
  },
  titan: {
    file: 'Titan_in_true_color.jpg',
    title: 'File:Titan_in_true_color.jpg',
    author: 'NASA/JPL-Caltech/Space Science Institute',
    license: 'PD-NASA',
  },
  enceladus: {
    file: 'PIA17202_-_Approaching_Enceladus.jpg',
    title: 'File:PIA17202 - Approaching Enceladus.jpg',
    author: 'NASA/JPL-Caltech/Space Science Institute',
    license: 'PD-NASA',
  },
  miranda: {
    file: 'Miranda.jpg',
    title: 'File:Miranda.jpg',
    author: 'NASA/JPL',
    license: 'PD-NASA',
  },
  ariel: {
    file: 'Ariel_(moon).jpg',
    title: 'File:Ariel (moon).jpg',
    author: 'NASA/JPL',
    license: 'PD-NASA',
  },
  umbriel: {
    file: 'Umbriel_(moon).jpg',
    title: 'File:Umbriel (moon).jpg',
    author: 'NASA/JPL',
    license: 'PD-NASA',
  },
  titania: {
    file: 'Titania_(moon)_color_cropped.jpg',
    title: 'File:Titania (moon) color cropped.jpg',
    author: 'NASA/JPL',
    license: 'PD-NASA',
  },
  oberon: {
    file: 'Voyager_2_picture_of_Oberon.jpg',
    title: 'File:Voyager 2 picture of Oberon.jpg',
    author: 'NASA/JPL',
    license: 'PD-NASA',
  },
  triton: {
    file: 'Triton_moon_mosaic_Voyager_2_(large).jpg',
    title: 'File:Triton moon mosaic Voyager 2 (large).jpg',
    author: 'NASA/JPL/USGS',
    license: 'PD-NASA',
  },
  charon: {
    file: 'Charon_in_True_Color_-_High-Res.jpg',
    title: 'File:Charon in True Color - High-Res.jpg',
    author: 'NASA/JHUAPL/SwRI',
    license: 'PD-NASA',
  },
};

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadFromWikimedia(filename, dest) {
  const url = `${WIKIMEDIA_BASE}/${encodeURIComponent(filename)}?width=1200`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
  return buffer.length;
}

const galleries = JSON.parse(await readFile(GALLERIES_JSON, 'utf-8'));
const provenance = JSON.parse(await readFile(PROVENANCE_JSON, 'utf-8'));
provenance.entries = provenance.entries ?? [];

let fetched = 0;
let skipped = 0;

for (const [satId, meta] of Object.entries(HERO_IMAGES)) {
  const dir = join(SATELLITES_DIR, satId);
  await mkdir(dir, { recursive: true });
  const dest = join(dir, '01.jpg');
  const relPath = `/images/satellites/${satId}/01.jpg`;

  if (await fileExists(dest)) {
    console.log(`✓ ${satId}/01.jpg (already exists, skipping)`);
    skipped++;
    continue;
  }

  try {
    process.stdout.write(`  fetching ${satId}/01.jpg from ${meta.file}…`);
    const bytes = await downloadFromWikimedia(meta.file, dest);
    process.stdout.write(` ${(bytes / 1024).toFixed(0)} KB ✓\n`);
    fetched++;

    // Append provenance row.
    provenance.entries.push({
      id: `sat_${satId}_01`,
      path: relPath,
      source_type: 'wikimedia-commons',
      title: meta.title,
      author: meta.author,
      agency: 'NASA',
      source_url: `https://commons.wikimedia.org/wiki/${meta.title.replace(/ /g, '_')}`,
      image_url: `${WIKIMEDIA_BASE}/${encodeURIComponent(meta.file)}`,
      license_short: meta.license,
      license_url:
        meta.license === 'PD-NASA'
          ? 'https://www.nasa.gov/nasa-brand-center/images-and-media/'
          : 'https://creativecommons.org/licenses/by-sa/3.0/',
      license_rationale:
        meta.license === 'PD-NASA'
          ? 'NASA-produced media is generally not copyrighted (17 U.S.C. §105). Use is permitted.'
          : 'CC-BY-SA license requires attribution + share-alike.',
      modifications: ['downloaded-via-special-filepath'],
      fetched_at: new Date().toISOString(),
    });

    // Bump gallery count.
    galleries[satId] = (galleries[satId] ?? 0) + 1;

    // Wikimedia rate limit ≈ 1 req/sec for anonymous bulk.
    await new Promise((r) => setTimeout(r, 1100));
  } catch (err) {
    process.stdout.write(` ✗ ${err.message}\n`);
  }
}

await writeFile(GALLERIES_JSON, JSON.stringify(galleries, null, 2) + '\n');
await writeFile(PROVENANCE_JSON, JSON.stringify(provenance, null, 2) + '\n');

console.log(`\nFetched ${fetched} new images; skipped ${skipped} existing.`);
console.log(`Updated manifests: satellite-galleries.json, image-provenance.json.`);
