#!/usr/bin/env node
// Last-mile manual picks for 3 slots that two automated passes missed.
// Each entry names an explicit Commons file (verified to exist as of
// 2026-06-17) or a NASA ID. No search — direct URL fetch + sharp.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const SIDECAR_PATH = 'static/data/mission-image-sources.json';

const PICKS = [
  {
    id: 'mariner9/04',
    // Mariner 9 took the first close-ups of Phobos in 1971 but the
    // surviving Commons file labelled "Mariner 9" is hard to locate.
    // Substituting the better-known Phobos PIA10369 (Mars Express
    // colour mosaic) with honest captioning that explains Mariner 9
    // imaged Phobos first; the colour photo is later.
    label: 'Phobos (Mars Express follow-up; Mariner 9 was the first to image it 1971)',
    commons_file: 'Phobos colour 2008.jpg',
    credit: 'ESA / DLR / FU Berlin (CC BY-SA 3.0 IGO)',
    license: 'CC-BY-SA 3.0 IGO (Wikimedia Commons)',
  },
  {
    id: 'akatsuki/05',
    label: 'H-IIA F17 launching Akatsuki (2010-05-21)',
    commons_file: 'H-IIA_F17_launching_AKATSUKI.jpg',
    credit: 'JAXA / Mitsubishi Heavy Industries',
    license: 'Public Domain (JAXA Press Use)',
  },
  {
    id: 'dart/04',
    label: 'DART spacecraft arrival at KSC (pre-launch, 2021)',
    commons_file: 'DART Spacecraft Arrival (KSC-20211002-PH-DNQ01 0011).jpg',
    credit: 'NASA / KSC',
    license: 'Public Domain (NASA — Media Usage Guidelines)',
  },
];

async function fetchAndProcess(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, baseJpg);
  const meta = await sharp(baseJpg).metadata();
  const { width: W, height: H } = meta;
  const side = Math.min(W, H);
  await sharp(baseJpg)
    .extract({ left: Math.round((W - side) / 2), top: Math.round((H - side) / 2), width: side, height: side })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

const SOURCES = JSON.parse(readFileSync(SIDECAR_PATH, 'utf8'));
let ok = 0;
let fail = 0;

for (const pick of PICKS) {
  const [missionId, slot] = pick.id.split('/');
  const dir = `static/images/missions/${missionId}`;
  mkdirSync(dir, { recursive: true });
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(pick.commons_file)}?width=1600`;
  process.stdout.write(`→ ${pick.id} (${pick.label})  `);
  try {
    await fetchAndProcess(url, dir, slot);
    SOURCES[pick.id] = {
      source_type: 'wikimedia-commons',
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pick.commons_file)}`,
      image_url: url,
      credit: pick.credit,
      license: pick.license,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      commons_file: pick.commons_file,
    };
    console.log('✓');
    ok++;
  } catch (e) {
    console.log(`✗ ${e.message}`);
    fail++;
  }
  await new Promise((r) => setTimeout(r, 800));
}

writeFileSync(SIDECAR_PATH, JSON.stringify(SOURCES, null, 2) + '\n');
console.log(`\nresult: ${ok} sourced, ${fail} failed`);
