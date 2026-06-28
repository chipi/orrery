#!/usr/bin/env node
/**
 * copy-mission-to-fleet — apply Marko's "reuse mission photos as fleet
 * shortcut" pattern (2026-06-23 review-session). For entries where the
 * fleet imagery is bad but a `static/images/missions/<id>/` folder
 * already carries reviewed photos, mirror the mission files into the
 * fleet folder + copy the sidecar entries + flag for the byte-dupe
 * allowlist sweep.
 *
 * Args: <fleet-id-1> [<fleet-id-2> ...]
 *
 * Run: node scripts/copy-mission-to-fleet.mjs akatsuki dart
 */
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';
const MISSION_SIDECAR = 'static/data/mission-image-sources.json';

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('usage: node scripts/copy-mission-to-fleet.mjs <fleet-id> [<fleet-id> ...]');
  process.exit(1);
}

const fleet = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));
const mission = JSON.parse(readFileSync(MISSION_SIDECAR, 'utf8'));

function fmtKB(n) {
  return (n / 1024).toFixed(0) + 'KB';
}

for (const id of ids) {
  const missionDir = `static/images/missions/${id}`;
  const fleetDir = `static/images/fleet-galleries/${id}`;
  if (!existsSync(missionDir)) {
    console.log(`✗ ${id}: missions/${id} doesn't exist — skipping`);
    continue;
  }
  if (!existsSync(fleetDir)) {
    console.log(`✗ ${id}: fleet-galleries/${id} doesn't exist — skipping`);
    continue;
  }
  console.log(`\n[${id}]`);
  let copied = 0;
  for (const f of readdirSync(missionDir)) {
    if (!f.endsWith('.jpg')) continue;
    const src = `${missionDir}/${f}`;
    const dst = `${fleetDir}/${f}`;
    const srcSize = statSync(src).size;
    const dstSize = existsSync(dst) ? statSync(dst).size : 0;
    copyFileSync(src, dst);
    console.log(`  ${f.padEnd(14)} ${fmtKB(dstSize)} → ${fmtKB(srcSize)}`);
    copied++;
    // Mirror the sidecar entry (mission credit → fleet credit)
    const mKey = `${id}/${f}`;
    if (mission[mKey]) {
      fleet[`${id}/${f}`] = {
        ...mission[mKey],
        copied_from: `missions/${id}/${f}`,
        copied_at: new Date().toISOString().slice(0, 19) + 'Z',
        copy_reason: '2026-06-23 review-session — mission-folder reuse shortcut',
      };
    }
  }
  console.log(`  ${copied} files copied`);
}

writeFileSync(FLEET_SIDECAR, JSON.stringify(fleet, null, 2) + '\n');
console.log(
  '\n✓ sidecar updated. Note: cross-surface byte-dupes will need ALLOWLIST_AUTHORIZED in next commit.',
);
