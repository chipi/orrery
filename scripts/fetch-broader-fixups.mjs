#!/usr/bin/env node
// Tiny fix-up for the 1 broader-gap miss: parker-solar-probe/03
// (heat shield). NASA images-api came up empty for "heat shield"
// queries; using a verified Commons file for the TPS portrait.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';

const PICK = {
  key: 'parker-solar-probe/03.jpg',
  slot: '03',
  dir: 'static/images/fleet-galleries/parker-solar-probe',
  label: 'Parker Solar Probe thermal protection system (heat shield)',
  commons_file: 'Parker Solar Probe Gets Its Revolutionary Heat Shield.jpg',
  credit: 'NASA / Johns Hopkins APL',
  license: 'Public Domain (NASA — Media Usage Guidelines)',
};

const url = `${COMMONS_FILEPATH}/${encodeURIComponent(PICK.commons_file)}?width=1600`;
const res = await fetch(url, { headers: { 'User-Agent': UA } });
if (!res.ok) {
  console.log(`✗ HTTP ${res.status} for ${PICK.commons_file}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
mkdirSync(PICK.dir, { recursive: true });
writeFileSync(`${PICK.dir}/${PICK.slot}.jpg`, baseJpg);
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
  .toFile(`${PICK.dir}/${PICK.slot}.1x1.jpg`);

const FLEET = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));
FLEET[PICK.key] = {
  source_type: 'wikimedia-commons',
  source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(PICK.commons_file)}`,
  image_url: url,
  credit: PICK.credit,
  license: PICK.license,
  fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
  commons_file: PICK.commons_file,
};
writeFileSync(FLEET_SIDECAR, JSON.stringify(FLEET, null, 2) + '\n');
console.log(`✓ ${PICK.key}`);
