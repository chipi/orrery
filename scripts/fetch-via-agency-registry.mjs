#!/usr/bin/env node
// Re-source missions via the agency-archive registry (#58) — proves
// the resolver works end-to-end and replaces the Commons-fallback
// entries from the batch-2 pass with their JAXA / ESA / JHU APL
// originals.
//
// Reads the agency from missions/index.json (or hard-coded here for
// the queued missions). Resolver picks the right tier:
//   akatsuki        → JAXA primary → curated URLs from jaxa.json
//   dart            → NASA + JHU APL → NASA images-api for hits,
//                     JHU APL scrape (when implemented) for hardware
//   solar-orbiter   → ESA + NASA → ESA Multimedia / esahubble
//   hayabusa        → JAXA primary (waiting on URL verification)
//   hayabusa1       → alias of hayabusa
//
// Targets only slots we want to RE-source — existing files are
// deleted before fetch so the new agency-tier pick lands cleanly.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import sharp from 'sharp';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const MISSION_SIDECAR = 'static/data/mission-image-sources.json';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';

// Targets: (mission, slot, agency, query, surface, replace_existing)
const TARGETS = [
  // === Akatsuki (JAXA primary) — already landed, kept for re-runnability ===
  // (existsSync check skips on re-run)

  // === Hayabusa fleet entries via NASA archive — JAXA site unreachable ===
  // NASA mirrors Itokawa imagery from Hayabusa; honest fallback when
  // hayabusa.isas.jaxa.jp doesn't respond. JAXA stays the primary
  // attribution on the credit chain.
  {
    mission: 'hayabusa',
    slot: '02',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Itokawa asteroid Hayabusa',
    replace: false,
  },
  {
    mission: 'hayabusa',
    slot: '03',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Hayabusa spacecraft Itokawa asteroid',
    replace: false,
  },
  {
    mission: 'hayabusa',
    slot: '04',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Hayabusa sample return capsule Australia',
    replace: false,
  },
  {
    mission: 'hayabusa',
    slot: '05',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Hayabusa M-V launch Uchinoura',
    replace: false,
  },

  // === Solar Orbiter (ESA + NASA partner) — NASA images-api ===
  // ESA Multimedia set URL is 404; NASA archive mirrors Solar Orbiter
  // imagery (joint mission). ESA stays on credit chain.
  {
    mission: 'solar-orbiter',
    slot: '02',
    agency: 'ESA / NASA',
    surface: 'fleet-galleries',
    query: 'Solar Orbiter spacecraft Sun',
    replace: false,
  },
  {
    mission: 'solar-orbiter',
    slot: '03',
    agency: 'ESA / NASA',
    surface: 'fleet-galleries',
    query: 'Solar Orbiter EUI ultraviolet Sun',
    replace: false,
  },
  {
    mission: 'solar-orbiter',
    slot: '04',
    agency: 'ESA / NASA',
    surface: 'fleet-galleries',
    query: 'Solar Orbiter Mercury transit',
    replace: false,
  },
  {
    mission: 'solar-orbiter',
    slot: '05',
    agency: 'ESA / NASA',
    surface: 'fleet-galleries',
    query: 'Solar Orbiter launch Atlas V',
    replace: false,
  },

  // === DART (NASA / JHU APL) — re-source via NASA images-api ===
  // JHU APL gallery times out on every WebFetch attempt; NASA archive
  // has all DART hardware + impact imagery. Replace the 3 Commons
  // entries from batch-2 (dart/02, dart/04 already done with NASA in
  // fixup; dart/05 was Commons).
  {
    mission: 'dart',
    slot: '05',
    agency: 'NASA / JHU APL',
    surface: 'missions',
    query: 'DART asteroid impact plume Hubble',
    replace: true,
  },
];

async function downloadAndProcess(imageUrl, dir, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status} for ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, baseJpg);
  const meta = await sharp(baseJpg).metadata();
  const { width: W, height: H } = meta;
  const side = Math.min(W, H);
  await sharp(baseJpg)
    .extract({
      left: Math.round((W - side) / 2),
      top: Math.round((H - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

const MISSION_SOURCES = JSON.parse(readFileSync(MISSION_SIDECAR, 'utf8'));
const FLEET_SOURCES = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));

const stats = {};
for (const t of TARGETS) {
  const dir = `static/images/${t.surface}/${t.mission}`;
  mkdirSync(dir, { recursive: true });
  if (t.replace && existsSync(`${dir}/${t.slot}.jpg`)) {
    rmSync(`${dir}/${t.slot}.jpg`);
    if (existsSync(`${dir}/${t.slot}.1x1.jpg`)) rmSync(`${dir}/${t.slot}.1x1.jpg`);
  }
  process.stdout.write(`→ ${t.mission}/${t.slot} (${t.agency})\n  `);
  const source = await resolveAgencyImage({
    mission: t.mission,
    slot: t.slot,
    agency: t.agency,
    query: t.query,
  });
  if (!source) {
    console.log(`  ✗ no source from any tier`);
    stats[`miss_${t.agency}`] = (stats[`miss_${t.agency}`] ?? 0) + 1;
    continue;
  }
  console.log(`  [${source.source_type}] ${source.image_url.slice(0, 80)}`);
  try {
    await downloadAndProcess(source.image_url, dir, t.slot);
    const entry = {
      source_type: source.source_type,
      source_url: source.source_url,
      image_url: source.image_url,
      credit: source.credit,
      license: source.license,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      ...source.metadata,
    };
    if (t.surface === 'fleet-galleries') {
      FLEET_SOURCES[`${t.mission}/${t.slot}.jpg`] = entry;
    } else {
      MISSION_SOURCES[`${t.mission}/${t.slot}`] = entry;
    }
    stats[source.source_type] = (stats[source.source_type] ?? 0) + 1;
    console.log(`  ✓`);
    await new Promise((r) => setTimeout(r, 1000));
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    stats[`err_${t.agency}`] = (stats[`err_${t.agency}`] ?? 0) + 1;
  }
}

writeFileSync(MISSION_SIDECAR, JSON.stringify(MISSION_SOURCES, null, 2) + '\n');
writeFileSync(FLEET_SIDECAR, JSON.stringify(FLEET_SOURCES, null, 2) + '\n');

console.log('\n── result ──');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
