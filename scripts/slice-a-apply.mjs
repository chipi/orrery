#!/usr/bin/env node
// Slice A apply — execute the dry-run + vision-pass decisions across
// all 12 agencies. For every proposal with `ship_at_apply: true`,
// download the image, sharp re-encode (jpeg q80, max 1600px), write
// base + 1x1 crop, and update the appropriate sidecar
// (mission-image-sources.json or fleet-image-sources.json).
//
// Skipped:
//   - proposal === null (resolver miss — current state preserved)
//   - ship_at_apply === false (vision-flagged — current state preserved)
//
// Usage:
//   node scripts/slice-a-apply.mjs              # apply all 12 agencies
//   node scripts/slice-a-apply.mjs --dry-run    # log what would happen, no writes
//   node scripts/slice-a-apply.mjs --agency=NASA --limit=10  # narrow scope

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { glob } from 'fs/promises';
import sharp from 'sharp';

process.loadEnvFile?.();

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), true];
  }),
);
const DRY_RUN = !!args['dry-run'];
const AGENCY_FILTER = args.agency;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;

// Load all agency dry-run files (or just one). Skip the legacy
// slice-a-1-dryrun.json (NASA-specific from earlier work) — it's
// superseded by slice-a-nasa-dryrun.json which has vision verdicts.
const dryrunFiles = [];
for await (const f of glob('static/data/slice-a-*-dryrun.json')) {
  if (f.endsWith('slice-a-1-dryrun.json')) continue; // legacy
  if (AGENCY_FILTER) {
    const slug = AGENCY_FILTER.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!f.endsWith(`slice-a-${slug}-dryrun.json`)) continue;
  }
  dryrunFiles.push(f);
}
console.log(
  `Loading ${dryrunFiles.length} dryrun file(s)${DRY_RUN ? ' (DRY RUN — no disk writes)' : ''}\n`,
);

// Read sidecars once; rewrite at end
const MISSION_SIDECAR = 'static/data/mission-image-sources.json';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';
const MISSION_SOURCES = JSON.parse(readFileSync(MISSION_SIDECAR, 'utf8'));
const FLEET_SOURCES = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));

// ── Image fetch + sharp encode ─────────────────────────────────────

async function downloadAndProcess(imageUrl, surfaceDir, missionId, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  // Decode → resize to max 1600px width → re-encode jpeg q80. Enforces
  // the workbox 8 MiB cap.
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const dir = `static/images/${surfaceDir}/${missionId}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);

  // 1x1 centre crop
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

// ── Per-agency apply ───────────────────────────────────────────────

const overallStats = {
  applied: 0,
  skipped_vision_flagged: 0,
  skipped_miss: 0,
  skipped_no_change: 0,
  errors: 0,
};
const errorList = [];

for (const file of dryrunFiles) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const agency = data.agency || file.match(/slice-a-([^-]+(?:-[^-]+)*)-dryrun/)?.[1] || '?';
  const agencyStats = {
    applied: 0,
    skipped_vision_flagged: 0,
    skipped_miss: 0,
    skipped_no_change: 0,
    errors: 0,
  };

  let processed = 0;
  for (const p of data.proposals) {
    if (processed >= LIMIT) break;

    // Skip rules
    if (!p.proposed) {
      agencyStats.skipped_miss++;
      overallStats.skipped_miss++;
      continue;
    }
    if (p.ship_at_apply === false) {
      agencyStats.skipped_vision_flagged++;
      overallStats.skipped_vision_flagged++;
      continue;
    }
    // If current source already matches proposed source_type AND it's tier 3
    // "no change", we still re-write to apply the gate's relevance verdict
    // (refresh attribution). Skip only if source_type identical and ship is false.
    // (No-op since ship_at_apply is the gate; here we just trust it.)

    processed++;

    const surfaceDir = p.surface; // 'missions' or 'fleet-galleries'
    const sidecarKey =
      surfaceDir === 'fleet-galleries'
        ? `${p.missionId}/${p.slot}.jpg`
        : `${p.missionId}/${p.slot}`;
    const sidecar = surfaceDir === 'fleet-galleries' ? FLEET_SOURCES : MISSION_SOURCES;

    if (DRY_RUN) {
      console.log(
        `  [dry] ${agency.padEnd(20)} ${p.missionId}/${p.slot} ← ${p.proposed.source_type} (vision=${p.vision?.verdict ?? 'n/a'})`,
      );
      agencyStats.applied++;
      overallStats.applied++;
      continue;
    }

    try {
      await downloadAndProcess(p.proposed.image_url, surfaceDir, p.missionId, p.slot);
      sidecar[sidecarKey] = {
        source_type: p.proposed.source_type,
        source_url: p.proposed.image_url,
        image_url: p.proposed.image_url,
        credit: p.proposed.credit,
        license: p.proposed.license,
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
        slice_a_iteration: 4,
        slice_a_query: p.query,
        ...(p.vision
          ? { vision: { verdict: p.vision.verdict, confidence: p.vision.confidence } }
          : {}),
      };
      agencyStats.applied++;
      overallStats.applied++;
      // Light throttle so we don't hammer the source CDNs
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.log(`  ✗ ${agency} ${p.missionId}/${p.slot}: ${e.message}`);
      errorList.push({ agency, mission: p.missionId, slot: p.slot, error: e.message });
      agencyStats.errors++;
      overallStats.errors++;
    }
  }

  console.log(
    `${agency.padEnd(20)} applied=${agencyStats.applied} skipped(miss=${agencyStats.skipped_miss},vision=${agencyStats.skipped_vision_flagged}) errors=${agencyStats.errors}`,
  );
}

if (!DRY_RUN) {
  writeFileSync(MISSION_SIDECAR, JSON.stringify(MISSION_SOURCES, null, 2) + '\n');
  writeFileSync(FLEET_SIDECAR, JSON.stringify(FLEET_SOURCES, null, 2) + '\n');
}

console.log('\n── Slice A apply result ──');
console.log(`  Applied:                     ${overallStats.applied}`);
console.log(`  Skipped (vision-flagged):    ${overallStats.skipped_vision_flagged}`);
console.log(`  Skipped (resolver miss):     ${overallStats.skipped_miss}`);
console.log(`  Errors:                      ${overallStats.errors}`);

if (errorList.length > 0) {
  console.log('\nErrors detail (first 10):');
  for (const e of errorList.slice(0, 10)) {
    console.log(`  ${e.agency} ${e.mission}/${e.slot}: ${e.error}`);
  }
}

if (DRY_RUN) console.log('\n(no disk writes — DRY RUN)');
else
  console.log(
    '\nNext: build-image-provenance.ts → validate-data → slice-f-audit.mjs → milestone 2 commit',
  );
