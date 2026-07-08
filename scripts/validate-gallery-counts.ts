#!/usr/bin/env tsx
/**
 * Count-manifest sync detective.
 *
 * fleet-galleries.json + mission-galleries.json are <id → slot-count>
 * maps that the gallery loaders in src/lib/data.ts use to enumerate
 * gallery slot URLs (`Array.from({length: count}, i => `${id}/0${i+1}.jpg`)`).
 * If the manifest count drifts from disk reality (e.g. a delete pass
 * didn't sync the count, or sourcing wrote slots the manifest doesn't
 * know about), every drift produces either:
 *   - a 404 on the gallery panel (manifest > disk: loader requests a
 *     slot that doesn't exist), or
 *   - silently-hidden images (manifest < disk: loader stops short of
 *     the highest on-disk slot).
 *
 * 2026-06-14 sourcing rounds surfaced 79 fleet + 27 mission stale
 * counts; this gate stops the same drift from recurring.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface CountManifest {
  [id: string]: number;
}

const TARGETS = [
  {
    name: 'fleet-galleries',
    manifestPath: 'static/data/fleet-galleries.json',
    imagesDir: 'static/images/fleet-galleries',
  },
  {
    name: 'mission-galleries',
    manifestPath: 'static/data/mission-galleries.json',
    imagesDir: 'static/images/missions',
  },
];

function countBaseSlots(dir: string): number {
  if (!existsSync(dir)) return 0;
  // Display slots ship as WebP only now (RFC-030 / ADR-080): NN.webp base
  // (excludes the NN-<width>.webp responsive rungs).
  return readdirSync(dir).filter((f) => /^\d{2}\.webp$/.test(f)).length;
}

function main(): void {
  console.log('Gallery count-manifest sync check…');
  let totalDrift = 0;
  const driftEntries: Array<{ target: string; id: string; manifest: number; disk: number }> = [];

  for (const target of TARGETS) {
    const manifest = JSON.parse(readFileSync(target.manifestPath, 'utf-8')) as CountManifest;
    for (const [id, manifestCount] of Object.entries(manifest)) {
      const diskCount = countBaseSlots(join(target.imagesDir, id));
      if (manifestCount !== diskCount) {
        driftEntries.push({ target: target.name, id, manifest: manifestCount, disk: diskCount });
        totalDrift++;
      }
    }
  }

  if (totalDrift === 0) {
    console.log('  ✓ all gallery counts match disk');
    return;
  }

  console.error(`  ✘ ${totalDrift} count-manifest mismatch(es):`);
  console.error('');
  for (const d of driftEntries) {
    console.error(`    ${d.target}/${d.id}: manifest=${d.manifest} disk=${d.disk}`);
  }
  console.error('');
  console.error(
    'Fix: update the manifest to match disk (preferred), or restore the\n' +
      'missing on-disk slots if they were lost. The count IS the contract\n' +
      'the gallery loader uses to enumerate slots — drift produces 404s.',
  );
  process.exit(1);
}

main();
