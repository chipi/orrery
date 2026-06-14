#!/usr/bin/env tsx
/**
 * Delete + renumber pre-existing intra-entity pHash near-dupes
 * surfaced by validate-image-phash-dupes when run without the
 * 2026-06-14 baseline allowlist.
 *
 * Each pair below was sourced before pHash dedup existed — two slots
 * in the same gallery show the same photo. Keep the lower-numbered
 * canonical slot, delete the higher copy + its .1x1 variant, then
 * renumber the surviving slots to be sequential (so gap-leaving
 * doesn't propagate downstream).
 *
 * After this script runs, the affected entities will be under the
 * 5-slot target. Run scripts/fill-gallery-gaps.ts to top up via the
 * source-time pHash-guarded pipeline (which won't re-introduce the
 * same dupe since the surviving canonical slot's pHash is now in
 * the cache).
 *
 *   npx tsx scripts/delete-intra-entity-dupes.ts --dry  # report only
 *   npx tsx scripts/delete-intra-entity-dupes.ts        # apply
 */
import { existsSync, readdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

interface Pair {
  surface: string;
  id: string;
  keepSlot: number;
  deleteSlot: number;
  reason: string;
}

/** Intra-entity pairs from validate-image-phash-dupes 2026-06-14
 *  baseline. Sorted to delete the higher-numbered slot in each pair. */
const PAIRS: Pair[] = [
  { surface: 'earth-objects', id: 'gps', keepSlot: 1, deleteSlot: 2, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'clementine', keepSlot: 1, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'columbia', keepSlot: 1, deleteSlot: 5, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'energia', keepSlot: 2, deleteSlot: 3, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'hayabusa-2', keepSlot: 2, deleteSlot: 3, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'lunokhod-1', keepSlot: 3, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'phobos-2', keepSlot: 2, deleteSlot: 3, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'r-7-vostok', keepSlot: 3, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'salyut-1', keepSlot: 3, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'salyut-3', keepSlot: 1, deleteSlot: 3, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'salyut-6', keepSlot: 2, deleteSlot: 5, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'salyut-6', keepSlot: 3, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'soyuz-tm', keepSlot: 3, deleteSlot: 4, reason: 'd=0' },
  {
    surface: 'fleet-galleries',
    id: 'space-shuttle-orbiter',
    keepSlot: 2,
    deleteSlot: 3,
    reason: 'd=0',
  },
  { surface: 'fleet-galleries', id: 'taiyuan-lc-9', keepSlot: 1, deleteSlot: 2, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'zhurong', keepSlot: 1, deleteSlot: 2, reason: 'd=0' },
  { surface: 'missions', id: 'blue-moon-mk1', keepSlot: 2, deleteSlot: 4, reason: 'd=0' },
  { surface: 'fleet-galleries', id: 'euclid', keepSlot: 2, deleteSlot: 4, reason: 'd=2' },
  { surface: 'fleet-galleries', id: 'mars2-orbiter', keepSlot: 1, deleteSlot: 2, reason: 'd=2' },
  { surface: 'fleet-galleries', id: 'vikram-cy3', keepSlot: 1, deleteSlot: 2, reason: 'd=2' },
  { surface: 'fleet-galleries', id: 'vostok', keepSlot: 1, deleteSlot: 4, reason: 'd=2' },
  { surface: 'iss-modules', id: 'unity', keepSlot: 1, deleteSlot: 3, reason: 'd=2' },
  { surface: 'mars-sites', id: 'mars3', keepSlot: 3, deleteSlot: 5, reason: 'd=2' },
  { surface: 'missions', id: 'mars3', keepSlot: 3, deleteSlot: 5, reason: 'd=2' },
  {
    surface: 'fleet-galleries',
    id: 'apollo-csm-block-ii',
    keepSlot: 1,
    deleteSlot: 5,
    reason: 'd=4',
  },
  { surface: 'fleet-galleries', id: 'atlas-lv-3b', keepSlot: 2, deleteSlot: 3, reason: 'd=6' },
  { surface: 'fleet-galleries', id: 'skylab', keepSlot: 2, deleteSlot: 5, reason: 'd=6' },
  { surface: 'missions', id: 'apollo16', keepSlot: 2, deleteSlot: 3, reason: 'd=6' },
];

const SURFACE_ROOTS: Record<string, string> = {
  missions: 'static/images/missions',
  'fleet-galleries': 'static/images/fleet-galleries',
  'moon-sites': 'static/images/moon-sites',
  'mars-sites': 'static/images/mars-sites',
  'earth-objects': 'static/images/earth-objects',
  'iss-modules': 'static/images/iss-modules',
  'tiangong-modules': 'static/images/tiangong-modules',
};

const dryRun = process.argv.includes('--dry');

function slotName(n: number, suffix = ''): string {
  return `${String(n).padStart(2, '0')}${suffix}.jpg`;
}

function listBaseSlots(dir: string): number[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{2}\.jpg$/.test(f))
    .map((f) => parseInt(f.slice(0, 2), 10))
    .sort((a, b) => a - b);
}

interface EntityResult {
  surface: string;
  id: string;
  deletedSlots: number[];
  renumbers: Array<{ from: number; to: number }>;
  finalCount: number;
}

function processEntity(surface: string, id: string, deleteSlots: Set<number>): EntityResult {
  const root = SURFACE_ROOTS[surface];
  const dir = join(root, id);
  const result: EntityResult = {
    surface,
    id,
    deletedSlots: [...deleteSlots].sort((a, b) => a - b),
    renumbers: [],
    finalCount: 0,
  };

  // Delete the duplicate slot + its 1x1 variant.
  for (const slot of deleteSlots) {
    for (const suffix of ['', '.1x1']) {
      const p = join(dir, slotName(slot, suffix));
      if (existsSync(p) && !dryRun) unlinkSync(p);
    }
  }

  // Recompute surviving slot list + renumber to be sequential.
  const surviving = listBaseSlots(dir);
  for (let i = 0; i < surviving.length; i++) {
    const from = surviving[i];
    const to = i + 1;
    if (from === to) continue;
    for (const suffix of ['', '.1x1']) {
      const fromPath = join(dir, slotName(from, suffix));
      const toPath = join(dir, slotName(to, suffix));
      if (existsSync(fromPath) && !dryRun) renameSync(fromPath, toPath);
    }
    result.renumbers.push({ from, to });
  }
  result.finalCount = surviving.length;
  return result;
}

function main(): void {
  // Group pairs by (surface, id) so we can delete all dupes in an
  // entity before renumbering it.
  const byEntity = new Map<string, Set<number>>();
  for (const p of PAIRS) {
    const key = `${p.surface}/${p.id}`;
    if (!byEntity.has(key)) byEntity.set(key, new Set());
    byEntity.get(key)!.add(p.deleteSlot);
  }

  console.log(`delete-intra-entity-dupes — ${dryRun ? 'DRY' : 'APPLY'}`);
  console.log(`Affecting ${byEntity.size} entities, ${PAIRS.length} pairs\n`);

  const results: EntityResult[] = [];
  for (const [key, deleteSlots] of byEntity) {
    const [surface, id] = key.split('/');
    const r = processEntity(surface, id, deleteSlots);
    results.push(r);
    const delStr = r.deletedSlots.map((n) => String(n).padStart(2, '0')).join(', ');
    const renumStr =
      r.renumbers.length === 0
        ? 'no renumbers needed'
        : r.renumbers
            .map((m) => `${String(m.from).padStart(2, '0')}→${String(m.to).padStart(2, '0')}`)
            .join(', ');
    console.log(`  ${key} — deleted [${delStr}], ${renumStr}, final ${r.finalCount} slot(s)`);
  }

  const underTarget = results.filter((r) => r.finalCount < 5);
  if (underTarget.length > 0) {
    console.log(
      `\n⚠ ${underTarget.length} entities below 5-slot target — run fill scripts to top up:`,
    );
    for (const r of underTarget) {
      console.log(`    ${r.surface}/${r.id} (${r.finalCount})`);
    }
  } else {
    console.log('\n✓ All affected entities still at 5+ slots.');
  }
}

main();
