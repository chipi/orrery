#!/usr/bin/env node
// ⚠ DEPRECATED AS A TEMPLATE (2026-06-17). Commons-only resolver
//   skips the codified agency-first source order (ADR-046, see
//   scripts/IMAGE-PIPELINE.md §"Source-resolution order"). New
//   fetch scripts must copy from scripts/fetch-batch-2-mission-images.mjs
//   instead — it tries NASA images-api.nasa.gov first and falls
//   back to Commons only when the agency archive misses.
//
//   This file is kept for reference (it sourced the Phase-22 zero-
//   image entities), but do NOT use its pattern for new batches.
//
// Source hero images for the 7 zero-image entities catalogued in
// docs/provenance/image-sourcing-inventory.md (#342 Phase 22).
//
// Pattern: Wikimedia Commons search API → resolve candidate filename
// → Special:FilePath download → sharp re-encode + 1x1 crop.
//
// Post-#5 image-pipeline v2: base + 1x1 ONLY. 4x3/16x9 are dead code
// per AGENTS.md § Image pipeline.
//
// For mission/fleet pairs of the same physical asset (Parker, Lucy,
// Solar Orbiter, Europa Clipper, Psyche, Hayabusa) we source once
// into the canonical surface and link from the secondary via the
// runtime gallery loader's cross-surface fallback (no byte
// duplication on disk per Marko 2026-06-15).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

// Per-entity sourcing plan. One row per physical entity; `surface`
// names the canonical home (cross-surface fallback handles the
// mission/fleet pair). `searchQuery` drives the Wikimedia search;
// preferredFile is an explicit override if we want a specific file.
const PLAN = [
  {
    entity: 'pluto',
    surface: 'planets',
    agency: 'NASA',
    credit: 'NASA / JHU APL / SwRI — New Horizons',
    searchQuery: 'Pluto in true color New Horizons',
    preferredFile: 'Nh-pluto-in-true-color_2x_JPEG.jpg',
  },
  {
    entity: 'hayabusa',
    surface: 'fleet-galleries',
    agency: 'JAXA',
    credit: 'JAXA — Hayabusa mission archive',
    searchQuery: 'Hayabusa spacecraft asteroid Itokawa',
    preferredFile: 'Hayabusa_Spacecraft.jpg',
  },
  {
    entity: 'solar-orbiter',
    surface: 'fleet-galleries',
    agency: 'ESA',
    credit: 'ESA / NASA — Solar Orbiter mission',
    searchQuery: 'Solar Orbiter spacecraft Sun',
    preferredFile: 'Solar_Orbiter_spacecraft_model.png',
  },
  {
    entity: 'parker-solar-probe',
    surface: 'fleet-galleries',
    agency: 'NASA / JHU APL',
    credit: 'NASA / Johns Hopkins APL — Parker Solar Probe',
    searchQuery: 'Parker Solar Probe spacecraft',
    preferredFile: 'Parker_Solar_Probe_spacecraft_model.png',
  },
  {
    entity: 'lucy',
    surface: 'fleet-galleries',
    agency: 'NASA',
    credit: 'NASA / Goddard / SwRI — Lucy mission',
    searchQuery: 'Lucy spacecraft NASA asteroid',
    preferredFile: 'Lucy_spacecraft.jpg',
  },
  {
    entity: 'psyche-spacecraft',
    surface: 'fleet-galleries',
    agency: 'NASA / JPL',
    credit: 'NASA / JPL-Caltech / ASU — Psyche mission',
    searchQuery: 'Psyche spacecraft NASA asteroid',
    preferredFile: 'Psyche_spacecraft.jpg',
  },
  {
    entity: 'europa-clipper',
    surface: 'fleet-galleries',
    agency: 'NASA / JPL',
    credit: 'NASA / JPL-Caltech — Europa Clipper',
    searchQuery: 'Europa Clipper spacecraft',
    preferredFile: 'Europa_Clipper_spacecraft_model.png',
  },
];

// ── Wikimedia helpers ──────────────────────────────────────────────

async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query + ' filetype:bitmap',
    srnamespace: '6', // File: namespace
    srlimit: '10',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const json = await res.json();
  return (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
}

async function fileExists(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${filename}`,
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return false;
  const json = await res.json();
  const pages = json?.query?.pages ?? {};
  return !Object.values(pages).some((p) => p.missing !== undefined);
}

async function resolveFilename(plan) {
  if (plan.preferredFile && (await fileExists(plan.preferredFile))) {
    return plan.preferredFile;
  }
  const candidates = await searchCommons(plan.searchQuery);
  if (candidates.length === 0) return null;
  // Prefer JPG/JPEG over PNG (smaller, better photo)
  const jpg = candidates.find((c) => /\.(jpg|jpeg)$/i.test(c));
  return jpg ?? candidates[0];
}

// ── Image processing ──────────────────────────────────────────────

async function downloadAndProcess(filename, dir, slot) {
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(filename)}?width=1600`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status} for ${filename}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Base JPEG (re-encode to normalise quality + strip EXIF)
  const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, baseJpg);

  // 1x1 centre crop (v2 pipeline: only 1x1 variant; 4x3/16x9 dropped)
  const meta = await sharp(baseJpg).metadata();
  const { width: W, height: H } = meta;
  const side = Math.min(W, H);
  const left = Math.round((W - side) / 2);
  const top = Math.round((H - side) / 2);
  await sharp(baseJpg)
    .extract({ left, top, width: side, height: side })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

// ── Main ──────────────────────────────────────────────────────────

const SLOT = '01';
const FLEET_SIDECAR_PATH = 'static/data/fleet-image-sources.json';
const PANEL_SIDECAR_PATH = 'static/data/panel-image-sources.json';
const FLEET_SOURCES = JSON.parse(readFileSync(FLEET_SIDECAR_PATH, 'utf8'));
const PANEL_SOURCES = JSON.parse(readFileSync(PANEL_SIDECAR_PATH, 'utf8'));

let ok = 0;
let fail = 0;
const failures = [];

for (const plan of PLAN) {
  const dir = `static/images/${plan.surface}/${plan.entity}`;
  mkdirSync(dir, { recursive: true });

  if (existsSync(`${dir}/${SLOT}.jpg`)) {
    console.log(`⊙ ${plan.entity}: already has ${SLOT}.jpg, skipping`);
    continue;
  }

  try {
    process.stdout.write(`→ ${plan.entity} (${plan.surface})…  `);
    const filename = await resolveFilename(plan);
    if (!filename) {
      console.log(`✗ no Wikimedia match for "${plan.searchQuery}"`);
      failures.push({ entity: plan.entity, reason: 'no-search-result' });
      fail++;
      continue;
    }
    process.stdout.write(`${filename}  `);
    await downloadAndProcess(filename, dir, SLOT);

    // Sidecar entry — pattern differs per surface (AGENTS.md § Image
    // pipeline § Sidecar surface routing):
    //   fleet-galleries → fleet-image-sources.json, key: <id>/<slot>.jpg
    //   planets         → panel-image-sources.json, key: planets/<id>/<slot> (no ext)
    if (plan.surface === 'fleet-galleries') {
      FLEET_SOURCES[`${plan.entity}/${SLOT}.jpg`] = {
        agency: plan.agency,
        sourceUrl: `${COMMONS_FILEPATH}/${encodeURIComponent(filename)}`,
        commons_file: filename,
        commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
        credit: plan.credit,
        license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      };
    } else if (plan.surface === 'planets') {
      PANEL_SOURCES[`planets/${plan.entity}/${SLOT}`] = {
        agency: plan.agency,
        sourceUrl: `${COMMONS_FILEPATH}/${encodeURIComponent(filename)}`,
        commons_file: filename,
        commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`,
        credit: plan.credit,
        license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      };
    }
    console.log('✓');
    ok++;
    await new Promise((r) => setTimeout(r, 1500)); // be polite to Commons
  } catch (e) {
    console.log(`✗ ${e.message}`);
    failures.push({ entity: plan.entity, reason: e.message });
    fail++;
  }
}

writeFileSync(FLEET_SIDECAR_PATH, JSON.stringify(FLEET_SOURCES, null, 2) + '\n');
writeFileSync(PANEL_SIDECAR_PATH, JSON.stringify(PANEL_SOURCES, null, 2) + '\n');

console.log(`\nresult: ${ok} sourced, ${fail} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.entity}: ${f.reason}`);
}
