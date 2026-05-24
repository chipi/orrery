#!/usr/bin/env tsx
/**
 * Rebuild fleet-galleries.json + mission-galleries.json count manifests
 * from disk reality.
 *
 * Why this exists: `fetch-assets.ts` writes those manifests after each
 * fetch loop reflecting only entries touched during that run. If an
 * entry's images were added by a different pipeline (manual curation,
 * separate scraper) the manifest count silently lags actual disk
 * coverage. Symptom: `audit-gallery-counts.ts` flags an entry as
 * 0-image while `ls static/images/fleet-galleries/<id>/*.jpg` shows
 * three files.
 *
 * This script walks every gallery directory + counts non-variant JPEGs
 * (excludes the .1x1 / .4x3 / .16x9 vision-pipeline crops). Writes
 * the truthful integer-count map back to disk.
 *
 * Usage:
 *   npx tsx scripts/rebuild-gallery-manifests.ts            # both
 *   npx tsx scripts/rebuild-gallery-manifests.ts --check    # diff only, no write
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const FLEET_DIR = path.join('static', 'images', 'fleet-galleries');
const MISSION_DIR = path.join('static', 'images', 'missions');
const FLEET_MANIFEST = path.join('static', 'data', 'fleet-galleries.json');
const MISSION_MANIFEST = path.join('static', 'data', 'mission-galleries.json');

const VARIANT_SUFFIX = /\.(1x1|4x3|16x9)\.jpg$/i;

async function countJpegsInDir(dir: string): Promise<number> {
  const entries = await fs.readdir(dir).catch(() => []);
  return entries.filter((f) => f.endsWith('.jpg') && !VARIANT_SUFFIX.test(f)).length;
}

async function walkSegment(root: string): Promise<Record<string, number>> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  const map: Record<string, number> = {};
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const count = await countJpegsInDir(path.join(root, e.name));
    if (count > 0) map[e.name] = count;
  }
  return map;
}

async function loadCurrent(p: string): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf-8')) as Record<string, number>;
  } catch {
    return {};
  }
}

function diff(
  label: string,
  cur: Record<string, number>,
  fresh: Record<string, number>,
): string[] {
  const changes: string[] = [];
  const ids = new Set([...Object.keys(cur), ...Object.keys(fresh)]);
  for (const id of [...ids].sort()) {
    const c = cur[id] ?? 0;
    const f = fresh[id] ?? 0;
    if (c !== f) changes.push(`  ${id}: ${c} → ${f}`);
  }
  if (changes.length > 0) {
    console.log(`\n${label} (${changes.length} diff):`);
    for (const c of changes) console.log(c);
  } else {
    console.log(`${label}: in sync`);
  }
  return changes;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { check: { type: 'boolean' } },
    strict: true,
  });

  const [fleetFresh, missionFresh, fleetCur, missionCur] = await Promise.all([
    walkSegment(FLEET_DIR),
    walkSegment(MISSION_DIR),
    loadCurrent(FLEET_MANIFEST),
    loadCurrent(MISSION_MANIFEST),
  ]);

  const fleetDiffs = diff('fleet-galleries', fleetCur, fleetFresh);
  const missionDiffs = diff('mission-galleries', missionCur, missionFresh);

  if (values.check) {
    process.exit(fleetDiffs.length + missionDiffs.length > 0 ? 1 : 0);
  }

  await fs.writeFile(FLEET_MANIFEST, JSON.stringify(fleetFresh, null, 2) + '\n', 'utf-8');
  await fs.writeFile(MISSION_MANIFEST, JSON.stringify(missionFresh, null, 2) + '\n', 'utf-8');
  console.log(`\nWrote ${FLEET_MANIFEST} (${Object.keys(fleetFresh).length} entries)`);
  console.log(`Wrote ${MISSION_MANIFEST} (${Object.keys(missionFresh).length} entries)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
