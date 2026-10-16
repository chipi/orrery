#!/usr/bin/env node
/**
 * Card rungs (#482): add small WebP rungs (320 / 640 px wide) for every image a
 * browse CARD shows, so a card's <img srcset> can stop at the size it is displayed.
 *
 * Measured 2026-10-16 on prod: card covers on /fleet and /missions display at
 * 172-264 CSS px (phone @3x ≈ 516 device px, tablet @2x ≈ 750, desktop ≈ 254,
 * TV @2x ≈ 508), but the ladder's smallest rung is 860 or 1280 px — and the cards
 * didn't use the ladder at all. The detail views (panels, lightbox) display large
 * enough that the existing rungs fit them, so only card heroes get the small rungs.
 *
 * Card hero = the image `pickHero()` resolves (src/lib/image-hero.ts): per surface
 * dir and entity, the override slot from static/data/<surface>-hero-overrides.json,
 * else 01. Card heroes get 320 + 640.
 *
 * `--all` also gives EVERY ladder entry a 320 rung: thumbnail grids show any image
 * at 96-330 device px (/credits: 2,277 thumbs = 572.5 MB after a full scroll;
 * /colophon 112 MB, measured 2026-10-16 on vite dev).
 *
 * `--extend=<dir>[,<dir>]` (paths under static/, e.g. `diagrams,images/lab`) brings
 * WebP bases that are NOT in the ladder into it: rungs 320 / 640 below the base's
 * width, derived from the base, and a manifest entry [rungs…, base width] keyed by
 * its served path (srcsetFor accepts /images/ and /diagrams/). The science diagrams
 * (1600 px) and lab goal art were outside the ladder entirely.
 *
 * Add-only and guarded, NOT a ladder regen (build-display-ladder.mjs):
 * - derives from masters/ (full-res, git-LFS; refuses LFS pointer stubs), same
 *   WebP quality as the ladder; a hero with no master derives from its served base
 *   `<stem>.webp` (the ladder's top rung — ample for a 640 px card);
 * - writes `<stem>-<actual width>.webp` only when that file does not exist, and only
 *   for widths the entry does not have yet, below its base (largest) width;
 * - merges the new widths into static/data/image-ladder.json without touching any
 *   other entry. `--dry-run` reports without writing.
 */
import { readdir, writeFile, access } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MASTERS = 'masters';
const SERVED = 'static/images';
const MANIFEST_PATH = 'static/data/image-ladder.json';
const CARD_WIDTHS = [320, 640];
const THUMB_WIDTHS = [320];
const ALL = process.argv.includes('--all');
const EXTEND = (
  process.argv.find((a) => a.startsWith('--extend='))?.slice('--extend='.length) ?? ''
)
  .split(',')
  .filter(Boolean);
const QUALITY = 80; // = build-display-ladder.mjs
const DRY = process.argv.includes('--dry-run');

// Mirrors SURFACE_TO_DIR in src/lib/image-hero.ts (surface → served dir).
const SURFACES = {
  missions: 'missions',
  fleet: 'fleet-galleries',
  'moon-sites': 'moon-sites',
  'mars-sites': 'mars-sites',
  'earth-objects': 'earth-objects',
  planets: 'planets',
  'small-bodies': 'small-bodies',
  satellites: 'satellites',
};

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

function overrides(surface) {
  const f = `static/data/${surface}-hero-overrides.json`;
  if (!existsSync(f)) return {};
  return JSON.parse(readFileSync(f, 'utf8')).overrides ?? {};
}

/** key = manifest key, e.g. `/images/missions/x/01` or `/diagrams/science/y`. */
function sourceFor(key) {
  if (key.startsWith('/images/')) {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      const p = path.join(MASTERS, `${key.slice('/images/'.length)}.${ext}`);
      if (existsSync(p)) return p;
    }
  }
  const served = path.join('static', `${key}.webp`);
  return existsSync(served) ? served : null;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
let written = 0;
let bytes = 0;
let skippedExisting = 0;
const missing = [];
const noLadder = [];

// manifest key → target widths. Heroes first so they keep 320 + 640. Heroes and
// --stems fill any missing target below the base width; --all only goes below the
// entry's smallest rung.
const jobs = new Map();
let belowSmallestOnly = new Set();
for (const [surface, dir] of Object.entries(SURFACES)) {
  const root = path.join(SERVED, dir);
  if (!existsSync(root)) continue;
  const ov = overrides(surface);
  for (const e of await readdir(root, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const slot = (ov[e.name]?.slot ?? '01.jpg').replace(/\.[^.]+$/, '');
    const stem = `${dir}/${e.name}/${slot}`;
    if (!manifest[`/images/${stem}`]?.length) noLadder.push(stem);
    else jobs.set(`/images/${stem}`, CARD_WIDTHS);
  }
}
// --stems=<stem>[,<stem>] (e.g. science-covers-v2/_science-landing-hero): 320 + 640 for
// one-off slots between the card and panel sizes (the /science banner, ~466 px).
for (const stem of (process.argv.find((x) => x.startsWith('--stems='))?.slice(8) ?? '')
  .split(',')
  .filter(Boolean)) {
  if (manifest[`/images/${stem}`]?.length) jobs.set(`/images/${stem}`, CARD_WIDTHS);
  else noLadder.push(stem);
}
if (ALL) {
  // Below-smallest only: an entry that already has a rung under 320 (narrow portrait
  // images) needs nothing more for a thumbnail.
  for (const key of Object.keys(manifest)) if (!jobs.has(key)) jobs.set(key, THUMB_WIDTHS);
  belowSmallestOnly = new Set(Object.keys(manifest).filter((k) => jobs.get(k) === THUMB_WIDTHS));
}

for (const [key, targets] of jobs) {
  const widths = manifest[key];
  const largest = widths[widths.length - 1];
  const ceiling = belowSmallestOnly.has(key) ? widths[0] : largest;
  if (targets.every((t) => t >= ceiling || widths.includes(t))) continue;
  const master = sourceFor(key);
  if (!master) {
    missing.push(key);
    continue;
  }
  const buf = readFileSync(master);
  if (buf.subarray(0, 40).toString('utf8').startsWith('version https://git-lfs')) {
    console.error(
      `[card-rungs] ${master} is an LFS pointer — run \`git lfs pull -I 'masters/**'\`.`,
    );
    process.exit(1);
  }
  const added = [];
  for (const target of targets) {
    if (target >= ceiling || widths.includes(target)) continue;
    const data = await sharp(buf)
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
    const w = (await sharp(data).metadata()).width ?? target;
    if (w >= ceiling || widths.includes(w) || added.includes(w)) continue;
    const out = path.join('static', `${key}-${w}.webp`);
    if (await exists(out)) {
      skippedExisting += 1;
      added.push(w);
      continue;
    }
    if (!DRY) await writeFile(out, data);
    written += 1;
    bytes += data.length;
    added.push(w);
  }
  if (added.length) manifest[key] = [...new Set([...added, ...widths])].sort((a, b) => a - b);
}

// --extend: WebP bases outside the ladder. A file that is a listed rung of an
// existing entry (`<stem>-<w>.webp`) is never treated as a base.
const rungFiles = new Set(
  Object.entries(manifest).flatMap(([k, ws]) => ws.slice(0, -1).map((w) => `${k}-${w}.webp`)),
);
async function* walkWebp(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walkWebp(full);
    else if (e.name.endsWith('.webp')) yield full;
  }
}
let extended = 0;
for (const dir of EXTEND) {
  for await (const file of walkWebp(path.join('static', dir))) {
    const served = '/' + path.relative('static', file).split(path.sep).join('/');
    const key = served.replace(/\.webp$/, '');
    if (manifest[key] || rungFiles.has(served)) continue;
    const buf = readFileSync(file);
    const baseW = (await sharp(buf).metadata()).width ?? 0;
    const widths = [];
    for (const target of THUMB_WIDTHS.concat(640)) {
      if (target >= baseW) continue;
      const data = await sharp(buf).resize({ width: target }).webp({ quality: QUALITY }).toBuffer();
      const w = (await sharp(data).metadata()).width ?? target;
      const out = `${file.replace(/\.webp$/, '')}-${w}.webp`;
      if (!(await exists(out))) {
        if (!DRY) await writeFile(out, data);
        written += 1;
        bytes += data.length;
      } else skippedExisting += 1;
      widths.push(w);
    }
    if (!widths.length) continue;
    manifest[key] = [...widths, baseW];
    extended += 1;
  }
}
if (EXTEND.length)
  console.log(
    `[card-rungs] --extend ${EXTEND.join(',')}: ${extended} bases brought into the ladder`,
  );

if (!DRY) await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `[card-rungs] ${DRY ? 'DRY RUN · ' : ''}${written} rungs ${DRY ? 'would be ' : ''}written (${(bytes / 1024 / 1024).toFixed(1)} MB) · ${skippedExisting} already existed · ` +
    `${noLadder.length} heroes without a ladder entry · ${missing.length} without any source`,
);
if (noLadder.length)
  console.log(`  no ladder: ${noLadder.slice(0, 8).join(', ')}${noLadder.length > 8 ? ', …' : ''}`);
if (missing.length)
  console.log(`  no source: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
