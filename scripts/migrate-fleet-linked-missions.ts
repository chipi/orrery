#!/usr/bin/env tsx
/**
 * One-shot migration: populates `linked_missions: [...]` on every fleet
 * entry by deriving the reverse pointer from `mission.fleet_refs`.
 *
 * For each mission with `fleet_refs: [{id: "saturn-v", role: "launcher"}, ...]`,
 * the corresponding fleet entry (`fleet/launcher/saturn-v.json`) gets that
 * mission's id added to its `linked_missions` array.
 *
 * Sources of truth:
 *   - `static/data/missions/{dest}/{id}.json::fleet_refs` (curated forward
 *     pointer, authored in scripts/migrate-mission-fleet-refs.ts)
 *   - this script derives the reverse pointer mechanically, so the two
 *     stay in sync by construction.
 *
 * Run after `migrate-mission-fleet-refs.ts`:
 *   tsx scripts/migrate-fleet-linked-missions.ts
 *
 * Re-running is safe: existing `linked_missions` are REPLACED with the
 * fresh derivation. The bidirectional validator in validate-data.ts then
 * confirms symmetric integrity.
 */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_DIR = join(ROOT, 'static/data/fleet');
const MISSIONS_DIR = join(ROOT, 'static/data/missions');

type FleetRef = { id: string; role: 'launcher' | 'spacecraft' | 'payload' | 'station' };
type Mission = { id: string; fleet_refs?: FleetRef[] };
type IndexEntry = { id: string; category: string };

async function main() {
  // Build fleet_id → category map from index
  const indexJson = JSON.parse(
    await readFile(join(FLEET_DIR, 'index.json'), 'utf-8'),
  ) as IndexEntry[];
  const fleetCategoryById = new Map(indexJson.map((r) => [r.id, r.category]));

  // Walk all missions, build fleet_id → [mission_ids] map (sorted by mission year if possible)
  const reverseMap = new Map<string, string[]>();
  const missionFiles: string[] = [];
  for (const entry of await readdir(MISSIONS_DIR)) {
    if (entry === 'index.json') continue;
    const subdir = join(MISSIONS_DIR, entry);
    const s = await stat(subdir).catch(() => null);
    if (!s?.isDirectory()) continue;
    for (const f of await readdir(subdir)) {
      if (f.endsWith('.json')) missionFiles.push(join(subdir, f));
    }
  }

  // Read missions in chronological order via the index for stable output
  const indexMissions = JSON.parse(
    await readFile(join(MISSIONS_DIR, 'index.json'), 'utf-8'),
  ) as Array<{ id: string; year: number }>;
  indexMissions.sort((a, b) => a.year - b.year);
  const orderedIds = new Map(indexMissions.map((m, i) => [m.id, i]));

  for (const path of missionFiles) {
    const mission = JSON.parse(await readFile(path, 'utf-8')) as Mission;
    if (!mission.fleet_refs) continue;
    for (const ref of mission.fleet_refs) {
      const list = reverseMap.get(ref.id) ?? [];
      list.push(mission.id);
      reverseMap.set(ref.id, list);
    }
  }

  // Sort each list by mission chronology
  for (const list of reverseMap.values()) {
    list.sort((a, b) => (orderedIds.get(a) ?? 0) - (orderedIds.get(b) ?? 0));
  }

  // Update each affected fleet entry
  let written = 0;
  let cleared = 0;
  for (const [fleetId, missions] of reverseMap.entries()) {
    const category = fleetCategoryById.get(fleetId);
    if (!category) {
      console.warn(
        `  ⚠ unknown fleet id ${fleetId} referenced by missions ${missions.join(', ')}`,
      );
      continue;
    }
    const path = join(FLEET_DIR, category, `${fleetId}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    entry.linked_missions = missions;
    await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    written += 1;
  }

  // Clear stale linked_missions on fleet entries that have no mission refs
  for (const [fleetId, category] of fleetCategoryById.entries()) {
    if (reverseMap.has(fleetId)) continue;
    const path = join(FLEET_DIR, category, `${fleetId}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    if (Array.isArray(entry.linked_missions) && (entry.linked_missions as unknown[]).length > 0) {
      delete entry.linked_missions;
      await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      cleared += 1;
    }
  }

  console.log(
    `populated linked_missions on ${written} fleet entries, cleared ${cleared} stale lists`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
