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

// All surfaces that ship a {id: count} gallery manifest. Adding body
// surfaces (planets / small-bodies / satellites) and the existing
// panel-like surfaces (earth-objects / moon-sites / mars-sites) so a
// single sync command catches every disk/manifest drift in one pass.
const SURFACES: Array<{ label: string; imageDir: string; manifest: string }> = [
  { label: 'fleet-galleries', imageDir: 'fleet-galleries', manifest: 'fleet-galleries.json' },
  { label: 'mission-galleries', imageDir: 'missions', manifest: 'mission-galleries.json' },
  { label: 'planet-galleries', imageDir: 'planets', manifest: 'planet-galleries.json' },
  { label: 'small-body-galleries', imageDir: 'small-bodies', manifest: 'small-body-galleries.json' },
  { label: 'satellite-galleries', imageDir: 'satellites', manifest: 'satellite-galleries.json' },
  { label: 'earth-object-galleries', imageDir: 'earth-objects', manifest: 'earth-object-galleries.json' },
  { label: 'moon-site-galleries', imageDir: 'moon-sites', manifest: 'moon-site-galleries.json' },
  { label: 'mars-site-galleries', imageDir: 'mars-sites', manifest: 'mars-site-galleries.json' },
  // Belts: 2026-06-21 — schema flipped from {galleries:{asteroid:[{src,caption}]}}
  // to flat {asteroid: N, kuiper: N} matching the other gallery manifests.
  // Walker counts disk files under static/images/belts/<beltId>/.
  { label: 'belt-galleries', imageDir: 'belts', manifest: 'belt-galleries.json' },
];

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

function diff(label: string, cur: Record<string, number>, fresh: Record<string, number>): string[] {
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

  const results = await Promise.all(
    SURFACES.map(async (s) => {
      const fresh = await walkSegment(path.join('static', 'images', s.imageDir));
      const cur = await loadCurrent(path.join('static', 'data', s.manifest));
      return { ...s, fresh, cur };
    }),
  );

  let totalDiffs = 0;
  for (const r of results) {
    totalDiffs += diff(r.label, r.cur, r.fresh).length;
  }

  if (values.check) {
    process.exit(totalDiffs > 0 ? 1 : 0);
  }

  for (const r of results) {
    await fs.writeFile(
      path.join('static', 'data', r.manifest),
      JSON.stringify(r.fresh, null, 2) + '\n',
      'utf-8',
    );
    console.log(`Wrote static/data/${r.manifest} (${Object.keys(r.fresh).length} entries)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
