#!/usr/bin/env node
// Slice /explore apply — for each ship_at_apply=true proposal in
// slice-explore-dryrun.json:
//   1. Download the esahubble.org image
//   2. sharp re-encode (jpeg q80, max 1600px width)
//   3. Overwrite static/images/<surface>/<bodyId>/01.jpg + .1x1.jpg
//   4. Update static/data/panel-image-sources.json (new sidecar
//      consumed by build-image-provenance's buildPanelEntries walker)
//
// The walker change (next edit to scripts/build-image-provenance.ts)
// reads panel-image-sources.json and emits an esahubble-attributed
// provenance entry for any (rootDir/<id>/01.jpg) that has an override.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

process.loadEnvFile?.();

const DRY_RUN = process.argv.includes('--dry-run');
const dryrun = JSON.parse(readFileSync('static/data/slice-explore-dryrun.json', 'utf8'));

const SIDECAR_PATH = 'static/data/panel-esahubble-sources.json';
const sidecar = existsSync(SIDECAR_PATH) ? JSON.parse(readFileSync(SIDECAR_PATH, 'utf8')) : {};

async function downloadAndProcess(imageUrl, dir, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
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

let applied = 0, skipped = 0, errors = 0;
for (const p of dryrun.proposals) {
  if (!p.proposed) {
    skipped++;
    continue;
  }
  if (p.ship_at_apply === false) {
    skipped++;
    continue;
  }
  const dir = `static/images/${p.surface}/${p.bodyId}`;
  const slotKey = `${p.surface}/${p.bodyId}/${p.slot}`;
  if (DRY_RUN) {
    console.log(`  [dry] ${slotKey} ← ${p.proposed.metadata?.hubble_id ?? '?'}`);
    applied++;
    continue;
  }
  try {
    await downloadAndProcess(p.proposed.image_url, dir, p.slot);
    sidecar[slotKey] = {
      source_type: 'esahubble',
      source_url: p.proposed.source_url,
      image_url: p.proposed.image_url,
      credit: p.proposed.credit,
      license: p.proposed.license,
      hubble_id: p.proposed.metadata?.hubble_id ?? null,
      hubble_title: p.proposed.metadata?.hubble_title ?? null,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      slice: 'slice-explore-2026-06-17',
      vision: p.vision ? { verdict: p.vision.verdict, confidence: p.vision.confidence } : null,
    };
    console.log(`  ✓ ${slotKey} ← ${p.proposed.metadata?.hubble_id}`);
    applied++;
    await new Promise((r) => setTimeout(r, 300));
  } catch (e) {
    console.log(`  ✗ ${slotKey}: ${e.message}`);
    errors++;
  }
}

if (!DRY_RUN) writeFileSync(SIDECAR_PATH, JSON.stringify(sidecar, null, 2) + '\n');
console.log(`\n── /explore apply ──`);
console.log(`  applied: ${applied}  skipped: ${skipped}  errors: ${errors}`);
if (DRY_RUN) console.log('  (DRY RUN — no disk writes)');
else console.log('  Next: extend buildPanelEntries → rebuild provenance → validate-data');
