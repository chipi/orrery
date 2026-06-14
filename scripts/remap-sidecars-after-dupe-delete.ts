#!/usr/bin/env tsx
/**
 * After scripts/delete-intra-entity-dupes.ts deletes + renumbers the
 * intra-entity dupe slots on disk, the per-surface sidecar manifests
 * (mission-image-sources / fleet-image-sources / panel-image-sources)
 * are out of sync — they still describe the pre-delete slot indices.
 * Slot N's sidecar entry now describes whatever WAS at slot M (some
 * M > N that got renamed down by the renumber).
 *
 * This script applies the same delete + renumber map to all 3
 * sidecars so each post-renumber slot's sidecar entry matches what's
 * on disk at that slot.
 *
 *   npx tsx scripts/remap-sidecars-after-dupe-delete.ts
 *
 * Idempotent: running twice is a no-op (the pairs already correspond
 * to the post-renumber state).
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Pair {
  surface: string;
  id: string;
  keepSlot: number;
  deleteSlot: number;
}

// Same list as delete-intra-entity-dupes.ts. Keep in sync.
const PAIRS: Pair[] = [
  { surface: 'earth-objects', id: 'gps', keepSlot: 1, deleteSlot: 2 },
  { surface: 'fleet-galleries', id: 'clementine', keepSlot: 1, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'columbia', keepSlot: 1, deleteSlot: 5 },
  { surface: 'fleet-galleries', id: 'energia', keepSlot: 2, deleteSlot: 3 },
  { surface: 'fleet-galleries', id: 'hayabusa-2', keepSlot: 2, deleteSlot: 3 },
  { surface: 'fleet-galleries', id: 'lunokhod-1', keepSlot: 3, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'phobos-2', keepSlot: 2, deleteSlot: 3 },
  { surface: 'fleet-galleries', id: 'r-7-vostok', keepSlot: 3, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'salyut-1', keepSlot: 3, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'salyut-3', keepSlot: 1, deleteSlot: 3 },
  { surface: 'fleet-galleries', id: 'salyut-6', keepSlot: 2, deleteSlot: 5 },
  { surface: 'fleet-galleries', id: 'salyut-6', keepSlot: 3, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'soyuz-tm', keepSlot: 3, deleteSlot: 4 },
  {
    surface: 'fleet-galleries',
    id: 'space-shuttle-orbiter',
    keepSlot: 2,
    deleteSlot: 3,
  },
  { surface: 'fleet-galleries', id: 'taiyuan-lc-9', keepSlot: 1, deleteSlot: 2 },
  { surface: 'fleet-galleries', id: 'zhurong', keepSlot: 1, deleteSlot: 2 },
  { surface: 'missions', id: 'blue-moon-mk1', keepSlot: 2, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'euclid', keepSlot: 2, deleteSlot: 4 },
  { surface: 'fleet-galleries', id: 'mars2-orbiter', keepSlot: 1, deleteSlot: 2 },
  { surface: 'fleet-galleries', id: 'vikram-cy3', keepSlot: 1, deleteSlot: 2 },
  { surface: 'fleet-galleries', id: 'vostok', keepSlot: 1, deleteSlot: 4 },
  { surface: 'iss-modules', id: 'unity', keepSlot: 1, deleteSlot: 3 },
  { surface: 'mars-sites', id: 'mars3', keepSlot: 3, deleteSlot: 5 },
  { surface: 'missions', id: 'mars3', keepSlot: 3, deleteSlot: 5 },
  {
    surface: 'fleet-galleries',
    id: 'apollo-csm-block-ii',
    keepSlot: 1,
    deleteSlot: 5,
  },
  { surface: 'fleet-galleries', id: 'atlas-lv-3b', keepSlot: 2, deleteSlot: 3 },
  { surface: 'fleet-galleries', id: 'skylab', keepSlot: 2, deleteSlot: 5 },
  { surface: 'missions', id: 'apollo16', keepSlot: 2, deleteSlot: 3 },
];

/** For an entity, compute the renumber map { oldSlot → newSlot }
 *  assuming up to 5 pre-existing slots [1..5] minus the deleted slots,
 *  then sequentially re-numbered. Deleted slots map to null (drop). */
function buildRenumberMap(deletedSlots: Set<number>): Map<number, number | null> {
  const map = new Map<number, number | null>();
  let newIdx = 1;
  for (let old = 1; old <= 5; old++) {
    if (deletedSlots.has(old)) {
      map.set(old, null);
    } else {
      map.set(old, newIdx);
      newIdx++;
    }
  }
  return map;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function loadJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, obj: Record<string, unknown>): void {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
}

function remapSidecar(
  sidecar: Record<string, unknown>,
  keyFor: (id: string, slot: number) => string,
  entities: Map<string, Set<number>>,
): { kept: number; deleted: number; renamed: number } {
  let kept = 0;
  let deleted = 0;
  let renamed = 0;
  const updated: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sidecar)) updated[k] = v;
  for (const [entityId, deletedSlots] of entities) {
    const map = buildRenumberMap(deletedSlots);
    // First snapshot original entries so renumber doesn't trample.
    const originals: Record<number, unknown> = {};
    for (let s = 1; s <= 5; s++) {
      const key = keyFor(entityId, s);
      if (key in updated) originals[s] = updated[key];
    }
    // Wipe original slots so we can re-write.
    for (let s = 1; s <= 5; s++) {
      const key = keyFor(entityId, s);
      if (key in updated) delete updated[key];
    }
    // Re-key.
    for (const [oldStr, newSlot] of map) {
      const oldSlot = Number(oldStr);
      if (newSlot == null) {
        if (oldSlot in originals) deleted++;
        continue;
      }
      if (!(oldSlot in originals)) continue;
      updated[keyFor(entityId, newSlot)] = originals[oldSlot];
      if (oldSlot === newSlot) kept++;
      else renamed++;
    }
  }
  // Apply.
  for (const k of Object.keys(sidecar)) delete sidecar[k];
  for (const [k, v] of Object.entries(updated)) sidecar[k] = v;
  return { kept, deleted, renamed };
}

function main(): void {
  // Group pairs by sidecar destination + entity id.
  const missionEntities = new Map<string, Set<number>>();
  const fleetEntities = new Map<string, Set<number>>();
  const panelEntities = new Map<string, Set<number>>();
  const issEntities = new Map<string, Set<number>>(); // iss-modules also panel-shaped? No, iss-modules uses tiangong sidecar code path — not in panel.

  for (const p of PAIRS) {
    const set = (target: Map<string, Set<number>>, key: string) => {
      if (!target.has(key)) target.set(key, new Set());
      target.get(key)!.add(p.deleteSlot);
    };
    if (p.surface === 'missions') set(missionEntities, p.id);
    else if (p.surface === 'fleet-galleries') set(fleetEntities, p.id);
    else if (
      p.surface === 'moon-sites' ||
      p.surface === 'mars-sites' ||
      p.surface === 'earth-objects'
    )
      set(panelEntities, `${p.surface}/${p.id}`);
    else if (p.surface === 'iss-modules') set(issEntities, p.id);
  }

  console.log('remap-sidecars-after-dupe-delete:');

  // Mission sidecar (mission-image-sources.json) — key shape: `<id>/<slot>` no ext.
  const missionSidecar = loadJson<Record<string, unknown>>(
    'static/data/mission-image-sources.json',
    {},
  );
  const missionStats = remapSidecar(
    missionSidecar,
    (id, slot) => `${id}/${pad(slot)}`,
    missionEntities,
  );
  writeJson('static/data/mission-image-sources.json', missionSidecar);
  console.log(
    `  mission-image-sources: ${missionStats.kept} kept, ${missionStats.renamed} renumbered, ${missionStats.deleted} dropped`,
  );

  // Fleet sidecar — key shape: `<id>/<slot>.jpg`.
  const fleetSidecar = loadJson<Record<string, unknown>>(
    'static/data/fleet-image-sources.json',
    {},
  );
  const fleetStats = remapSidecar(
    fleetSidecar,
    (id, slot) => `${id}/${pad(slot)}.jpg`,
    fleetEntities,
  );
  writeJson('static/data/fleet-image-sources.json', fleetSidecar);
  console.log(
    `  fleet-image-sources: ${fleetStats.kept} kept, ${fleetStats.renamed} renumbered, ${fleetStats.deleted} dropped`,
  );

  // Panel sidecar — key shape: `<surface>/<id>/<slot>` no ext.
  const panelSidecar = loadJson<Record<string, unknown>>(
    'static/data/panel-image-sources.json',
    {},
  );
  const panelStats = remapSidecar(
    panelSidecar,
    (surfaceId, slot) => `${surfaceId}/${pad(slot)}`,
    panelEntities,
  );
  writeJson('static/data/panel-image-sources.json', panelSidecar);
  console.log(
    `  panel-image-sources: ${panelStats.kept} kept, ${panelStats.renamed} renumbered, ${panelStats.deleted} dropped`,
  );
}

main();
