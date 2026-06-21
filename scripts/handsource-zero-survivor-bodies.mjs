#!/usr/bin/env node
/**
 * handsource-zero-survivor-bodies — targeted re-source for the 4 bodies
 * that got 0 vision-judge survivors during the bodies-salvage run:
 * eris, haumea, makemake, oumuamua. Makemake is skipped (current slots
 * are already excellent ESO artist concepts).
 *
 * Vision-judge rejected these because the bodies are too distant to
 * photograph as anything but pixel-blobs, and the only good visualisations
 * are artist concepts (which the strict body prompt rejects by default).
 * For these specific bodies, artist concepts are the canonical imagery —
 * skipping vision-judge and using a title-filter pre-check instead.
 *
 * Plan:
 *   eris/01 + 02      ← canonical artist concepts (current = branded posters)
 *   haumea/01 + 02    ← clean artist + canonical Hubble image
 *   haumea hero       → slot 03 (the existing great artist concept)
 *   oumuamua/02       ← canonical ESO Oumuamua artist impression (no orbital labels)
 *
 * Run: node --env-file=.env scripts/handsource-zero-survivor-bodies.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Tokens that indicate branded posters / size-comparisons / data
// charts — the exact category of imagery vision-judge would (correctly)
// reject. Filter on filename before fetch.
const REJECT_TOKENS = [
  'compari', 'infograph', 'branded', 'wallpaper', 'chart',
  'magnitude', 'lightcurve', 'spectrum', 'plot', 'graph',
  'logo', 'poster', 'banner', 'cover',
];

// Per (body, slot), a list of candidate Commons search queries in
// priority order. First search returning at least one acceptable
// candidate wins.
const TARGETS = [
  { body: 'eris', slot: '01',
    queries: ['Eris dwarf planet artist', 'Eris and Dysnomia artist'] },
  { body: 'eris', slot: '02',
    queries: ['Eris dwarf planet Hubble', 'Eris and Dysnomia Hubble'] },
  { body: 'haumea', slot: '01',
    queries: ['Haumea artist impression', 'Haumea dwarf planet'] },
  { body: 'haumea', slot: '02',
    queries: ['Haumea ring artist', 'Haumea ring 2017'] },
  { body: 'oumuamua', slot: '02',
    queries: ['Oumuamua artist eso1820', 'Oumuamua interstellar object'] },
];

const MIN_BYTES = 80_000;
const MAX_BYTES = 20_000_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', list: 'search',
    srsearch: `${query} filetype:bitmap`, srnamespace: '6', srlimit: '30', origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];
  const j = await res.json();
  return (j?.query?.search ?? [])
    .map((h) => h.title.replace(/^File:/, ''))
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
}

async function commonsImageInfo(filename) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', titles: `File:${filename}`,
    prop: 'imageinfo', iiprop: 'size|extmetadata', origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const page = Object.values((await res.json())?.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  return {
    size: info.size,
    license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
    credit: strip(meta.Credit?.value ?? meta.Artist?.value ?? ''),
  };
}

function fileTitleAcceptable(filename) {
  const lower = filename.toLowerCase();
  // reject filenames containing ANY of the bad tokens
  for (const tok of REJECT_TOKENS) {
    if (lower.includes(tok)) return false;
  }
  // also reject filenames with the body name ALL CAPS surrounded by
  // hyphens / spaces — that's branded-poster naming
  if (/(?:^|[\s_-])(ERIS|HAUMEA|MAKEMAKE|OUMUAMUA)(?:[\s_-]|$)/.test(filename)) return false;
  return true;
}

const imageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const sourceUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function downloadAndProcess(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);
  const meta = await sharp(baseBuf).metadata();
  const side = Math.min(meta.width, meta.height);
  await sharp(baseBuf)
    .extract({
      left: Math.round((meta.width - side) / 2),
      top: Math.round((meta.height - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 80 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
  return baseBuf.length;
}

async function findBest(queries) {
  for (const q of queries) {
    const files = await commonsSearch(q);
    await sleep(300);
    for (const f of files) {
      if (!fileTitleAcceptable(f)) continue;
      const info = await commonsImageInfo(f);
      await sleep(250);
      if (!info) continue;
      if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) continue;
      return { file: f, info, query: q };
    }
  }
  return null;
}

async function main() {
  const panelPath = 'static/data/panel-image-sources.json';
  const panel = JSON.parse(readFileSync(panelPath, 'utf8'));
  const heroOverridesPath = 'static/data/small-bodies-hero-overrides.json';
  const heroOverrides = JSON.parse(readFileSync(heroOverridesPath, 'utf8'));

  for (const t of TARGETS) {
    console.log(`\n=== small-bodies/${t.body}/${t.slot} ===`);
    const pick = await findBest(t.queries);
    if (!pick) {
      console.log(`  ✗ no acceptable candidate from ${t.queries.length} queries`);
      continue;
    }
    try {
      const dir = `static/images/small-bodies/${t.body}`;
      const bytes = await downloadAndProcess(imageUrl(pick.file), dir, t.slot);
      panel[`small-bodies/${t.body}/${t.slot}`] = {
        commons_file: pick.file,
        commons_url: sourceUrl(pick.file),
        credit: pick.info.credit,
        license: pick.info.license,
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
        bodies_iteration: 'handsource-zero-survivor-2026-06-21',
        query: pick.query,
      };
      console.log(`  ✓ ${pick.file.slice(0, 70)} (${(bytes / 1024).toFixed(0)}KB)`);
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
    }
  }

  // Haumea hero override → slot 03 (the existing great artist-concept
  // with both moons; slots 01 + 02 are the freshly-sourced ones).
  heroOverrides.overrides ??= {};
  heroOverrides.overrides.haumea = {
    slot: '03.jpg',
    reason: 'slot 03 is the canonical artist concept of the elongated body with both moons (Hi\'iaka + Namaka); slots 01-02 are supplementary handsource picks',
    approved_at: '2026-06-21',
  };

  writeFileSync(panelPath, JSON.stringify(panel, null, 2) + '\n');
  writeFileSync(heroOverridesPath, JSON.stringify(heroOverrides, null, 2) + '\n');
  console.log('\n✓ wrote panel-image-sources.json + small-bodies-hero-overrides.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
