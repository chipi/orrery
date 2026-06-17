#!/usr/bin/env node
// Slice B apply — actually swap the 5 Commons sidecar entries flagged
// by slice-b-dryrun.mjs for v2-resolved upgrades. Downloads the new
// image, replaces base + 1x1, rewrites the sidecar entry.
//
// Per Marko 2026-06-17: option #3 (apply blind, clean up in #73
// global curation pass) — bad picks (Smithsonian returning tangential
// artifacts for non-NASA missions) accepted as honest gap for now.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import sharp from 'sharp';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const TARGETS = [
  {
    mission: 'hayabusa',
    slot: '02',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Itokawa asteroid Hayabusa close-up',
  },
  {
    mission: 'hayabusa',
    slot: '03',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'Hayabusa spacecraft asteroid sample-return',
  },
  {
    mission: 'hayabusa',
    slot: '05',
    agency: 'JAXA / NASA',
    surface: 'fleet-galleries',
    query: 'M-V rocket launch JAXA Hayabusa',
  },
  {
    mission: 'solar-orbiter',
    slot: '03',
    agency: 'ESA / NASA',
    surface: 'fleet-galleries',
    query: 'Solar Orbiter EUI ultraviolet Sun corona',
  },
  {
    mission: 'dart',
    slot: '02',
    agency: 'NASA / JHU APL',
    surface: 'missions',
    query: 'DART Dimorphos final image before impact',
  },
];

async function downloadAndProcess(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const base = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, base);
  const meta = await sharp(base).metadata();
  const side = Math.min(meta.width, meta.height);
  await sharp(base)
    .extract({
      left: Math.round((meta.width - side) / 2),
      top: Math.round((meta.height - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

const FLEET = JSON.parse(readFileSync('static/data/fleet-image-sources.json', 'utf8'));
const MISSION = JSON.parse(readFileSync('static/data/mission-image-sources.json', 'utf8'));

const stats = {};
for (const t of TARGETS) {
  const dir = `static/images/${t.surface}/${t.mission}`;
  mkdirSync(dir, { recursive: true });
  console.log(`\n→ ${t.mission}/${t.slot} (${t.agency})`);
  const resolved = await resolveAgencyImage({
    mission: t.mission,
    slot: t.slot,
    agency: t.agency,
    query: t.query,
  });
  if (!resolved) {
    console.log('  ✗ no source');
    stats.miss = (stats.miss ?? 0) + 1;
    continue;
  }
  console.log(
    `  [tier ${resolved.tier}] ${resolved.source_type} — ${resolved.image_url.slice(0, 70)}`,
  );
  try {
    // Remove old files first
    if (existsSync(`${dir}/${t.slot}.jpg`)) rmSync(`${dir}/${t.slot}.jpg`);
    if (existsSync(`${dir}/${t.slot}.1x1.jpg`)) rmSync(`${dir}/${t.slot}.1x1.jpg`);
    await downloadAndProcess(resolved.image_url, dir, t.slot);
    const entry = {
      source_type: resolved.source_type,
      source_url: resolved.source_url,
      image_url: resolved.image_url,
      credit: resolved.credit,
      license: resolved.license,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      tier: resolved.tier,
      ...resolved.metadata,
    };
    if (t.surface === 'fleet-galleries') {
      FLEET[`${t.mission}/${t.slot}.jpg`] = entry;
    } else {
      MISSION[`${t.mission}/${t.slot}`] = entry;
    }
    stats[resolved.source_type] = (stats[resolved.source_type] ?? 0) + 1;
    console.log('  ✓ applied');
    await new Promise((r) => setTimeout(r, 800));
  } catch (e) {
    console.log(`  ✗ ${e.message}`);
    stats.err = (stats.err ?? 0) + 1;
  }
}

writeFileSync('static/data/fleet-image-sources.json', JSON.stringify(FLEET, null, 2) + '\n');
writeFileSync('static/data/mission-image-sources.json', JSON.stringify(MISSION, null, 2) + '\n');

console.log('\n── apply result ──');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
