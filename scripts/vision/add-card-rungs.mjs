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
 * else 01.
 *
 * Add-only and guarded, NOT a ladder regen (build-display-ladder.mjs):
 * - derives from masters/ (full-res, git-LFS; refuses LFS pointer stubs), same
 *   WebP quality as the ladder; a hero with no master derives from its served base
 *   `<stem>.webp` (the ladder's top rung — ample for a 640 px card);
 * - writes `<stem>-<actual width>.webp` only when that file does not exist, and only
 *   for widths below the stem's current smallest rung;
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

function sourceFor(stem) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(MASTERS, `${stem}.${ext}`);
    if (existsSync(p)) return p;
  }
  const served = path.join(SERVED, `${stem}.webp`);
  return existsSync(served) ? served : null;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
let written = 0;
let bytes = 0;
let skippedExisting = 0;
const missing = [];
const noLadder = [];

for (const [surface, dir] of Object.entries(SURFACES)) {
  const root = path.join(SERVED, dir);
  if (!existsSync(root)) continue;
  const ov = overrides(surface);
  for (const e of await readdir(root, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const slot = (ov[e.name]?.slot ?? '01.jpg').replace(/\.[^.]+$/, '');
    const stem = `${dir}/${e.name}/${slot}`;
    const key = `/images/${stem}`;
    const widths = manifest[key];
    if (!widths?.length) {
      noLadder.push(stem);
      continue;
    }
    const master = sourceFor(stem);
    if (!master) {
      missing.push(stem);
      continue;
    }
    const buf = readFileSync(master);
    if (buf.subarray(0, 40).toString('utf8').startsWith('version https://git-lfs')) {
      console.error(
        `[card-rungs] ${master} is an LFS pointer — run \`git lfs pull -I 'masters/**'\`.`,
      );
      process.exit(1);
    }
    const smallest = widths[0];
    const added = [];
    for (const target of CARD_WIDTHS) {
      if (target >= smallest) continue;
      const data = await sharp(buf)
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      const w = (await sharp(data).metadata()).width ?? target;
      if (w >= smallest || widths.includes(w) || added.includes(w)) continue;
      const out = path.join(SERVED, `${stem}-${w}.webp`);
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
}

if (!DRY) await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `[card-rungs] ${DRY ? 'DRY RUN · ' : ''}${written} rungs ${DRY ? 'would be ' : ''}written (${(bytes / 1024 / 1024).toFixed(1)} MB) · ${skippedExisting} already existed · ` +
    `${noLadder.length} heroes without a ladder entry · ${missing.length} without any source`,
);
if (noLadder.length)
  console.log(`  no ladder: ${noLadder.slice(0, 8).join(', ')}${noLadder.length > 8 ? ', …' : ''}`);
if (missing.length)
  console.log(`  no source: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ', …' : ''}`);
