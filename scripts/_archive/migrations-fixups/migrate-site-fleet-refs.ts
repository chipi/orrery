#!/usr/bin/env tsx
/**
 * One-shot migration: adds `fleet_refs: [{id, role}]` to each entry in
 * `static/data/moon-sites.json`, `mars-sites.json`, `earth-objects.json`
 * per RFC-016 v0.2 OQ-16 (cross-route bidirectional linking — Phase K
 * of Issue #59).
 *
 * Run once:
 *   tsx scripts/migrate-site-fleet-refs.ts
 *
 * Re-runnable: existing fleet_refs are REPLACED with the curated mapping
 * below. Only fleet IDs that exist in fleet/index.json are emitted;
 * unknowns are skipped silently.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_INDEX = join(ROOT, 'static/data/fleet/index.json');

type Role = 'launcher' | 'spacecraft' | 'payload' | 'station';
type FleetRef = { id: string; role: Role };

/** Maps moon-site id → fleet refs. */
const MOON_REFS: Record<string, FleetRef[]> = {
  luna9: [{ id: 'luna-9', role: 'spacecraft' }],
  luna17: [{ id: 'lunokhod-1', role: 'spacecraft' }],
  luna24: [{ id: 'luna-16', role: 'spacecraft' }],
  apollo11: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
  ],
  apollo12: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
  ],
  apollo14: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
  ],
  apollo15: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
    { id: 'lrv-apollo', role: 'payload' },
  ],
  apollo16: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
    { id: 'lrv-apollo', role: 'payload' },
  ],
  apollo17: [
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
    { id: 'lrv-apollo', role: 'payload' },
  ],
  change3: [
    { id: 'change-3', role: 'spacecraft' },
    { id: 'yutu', role: 'payload' },
  ],
  change4: [
    { id: 'change-4', role: 'spacecraft' },
    { id: 'yutu-2', role: 'payload' },
  ],
  change5: [{ id: 'change-5', role: 'spacecraft' }],
  change6: [{ id: 'change-5', role: 'spacecraft' }], // Chang'e 6 hardware ≈ Chang'e 5 class
  chandrayaan3: [
    { id: 'vikram-cy3', role: 'spacecraft' },
    { id: 'pragyan', role: 'payload' },
  ],
  slim: [{ id: 'slim', role: 'spacecraft' }],
  artemis3: [{ id: 'orion', role: 'spacecraft' }],
  // Orbiters (most don't have fleet entries; only those that do)
  change2: [{ id: 'change-2', role: 'spacecraft' }],
};

/** Maps mars-site id → fleet refs. */
const MARS_REFS: Record<string, FleetRef[]> = {
  mars2: [{ id: 'mars-2', role: 'spacecraft' }],
  mars3: [{ id: 'mars-3', role: 'spacecraft' }],
  'viking1-lander': [{ id: 'viking-1', role: 'spacecraft' }],
  'viking2-lander': [{ id: 'viking-1', role: 'spacecraft' }], // Viking-2 hardware ≡ Viking-1 entry
  'mars-pathfinder': [{ id: 'sojourner', role: 'payload' }],
  spirit: [{ id: 'spirit', role: 'spacecraft' }],
  opportunity: [{ id: 'opportunity', role: 'spacecraft' }],
  phoenix: [{ id: 'phoenix', role: 'spacecraft' }],
  curiosity: [{ id: 'curiosity', role: 'spacecraft' }],
  schiaparelli: [{ id: 'schiaparelli', role: 'spacecraft' }],
  insight: [{ id: 'insight', role: 'spacecraft' }],
  perseverance: [{ id: 'perseverance', role: 'spacecraft' }],
  zhurong: [{ id: 'zhurong', role: 'spacecraft' }],
  // Orbiters
  mariner9: [{ id: 'mariner-9', role: 'spacecraft' }],
  'mars-express': [{ id: 'mars-express', role: 'spacecraft' }],
  mro: [{ id: 'mro', role: 'spacecraft' }],
  mangalyaan: [{ id: 'mangalyaan', role: 'spacecraft' }],
};

/**
 * Maps earth-object id → fleet refs. Note that the earth-objects entry
 * `galileo` is the European GNSS constellation, NOT the Jupiter orbiter
 * `galileo` in fleet — intentionally not cross-linked.
 */
const EARTH_REFS: Record<string, FleetRef[]> = {
  iss: [{ id: 'iss', role: 'station' }],
  tiangong: [{ id: 'tiangong', role: 'station' }],
  hubble: [{ id: 'hubble', role: 'spacecraft' }],
  chandra: [{ id: 'chandra', role: 'spacecraft' }],
  xmm: [{ id: 'xmm-newton', role: 'spacecraft' }],
  jwst: [{ id: 'jwst', role: 'spacecraft' }],
  gaia: [{ id: 'gaia', role: 'spacecraft' }],
  change2: [{ id: 'change-2', role: 'spacecraft' }],
};

type IndexEntry = { id: string };
type SiteObject = { id: string; fleet_refs?: FleetRef[]; [k: string]: unknown };

async function migrateFile(
  path: string,
  curated: Record<string, FleetRef[]>,
  validFleetIds: Set<string>,
  label: string,
): Promise<void> {
  const records = JSON.parse(await readFile(path, 'utf-8')) as SiteObject[];
  let updated = 0;
  for (const rec of records) {
    const refs = curated[rec.id];
    if (refs === undefined) {
      // Not in curation — strip stale fleet_refs if any
      if ('fleet_refs' in rec) {
        delete rec.fleet_refs;
        updated += 1;
      }
      continue;
    }
    const validRefs = refs.filter((r) => validFleetIds.has(r.id));
    if (validRefs.length === 0) {
      if ('fleet_refs' in rec) {
        delete rec.fleet_refs;
        updated += 1;
      }
      continue;
    }
    rec.fleet_refs = validRefs;
    updated += 1;
  }
  await writeFile(path, JSON.stringify(records, null, 2) + '\n', 'utf-8');
  console.log(`  ${label}: ${updated}/${records.length} entries updated`);
}

async function main() {
  const fleetIndex = JSON.parse(await readFile(FLEET_INDEX, 'utf-8')) as IndexEntry[];
  const validFleetIds = new Set(fleetIndex.map((r) => r.id));

  await migrateFile(
    join(ROOT, 'static/data/moon-sites.json'),
    MOON_REFS,
    validFleetIds,
    'moon-sites',
  );
  await migrateFile(
    join(ROOT, 'static/data/mars-sites.json'),
    MARS_REFS,
    validFleetIds,
    'mars-sites',
  );
  await migrateFile(
    join(ROOT, 'static/data/earth-objects.json'),
    EARTH_REFS,
    validFleetIds,
    'earth-objects',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
