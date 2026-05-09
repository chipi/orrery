#!/usr/bin/env tsx
/**
 * One-shot migration: adds the `fleet_refs: [{id, role}]` array to every
 * mission base file under `static/data/missions/{dest}/{id}.json` per
 * RFC-016 v0.2 OQ-2 (corrected). Bidirectional cross-reference between
 * /missions and /fleet (Phase E of Issue #59).
 *
 * Run once:
 *   tsx scripts/migrate-mission-fleet-refs.ts
 *
 * Re-runnable: existing fleet_refs are REPLACED with the curated mapping
 * below (which is the single source of truth). Only fleet IDs that exist
 * in fleet/index.json are emitted; unknowns are skipped silently.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_INDEX = join(ROOT, 'static/data/fleet/index.json');
const MISSIONS_DIR = join(ROOT, 'static/data/missions');

type Role = 'launcher' | 'spacecraft' | 'payload' | 'station';
type FleetRef = { id: string; role: Role };

/**
 * Curated mapping from mission ID to fleet refs. Reflects what hardware
 * (launcher + spacecraft + payload) carried each mission. Missions whose
 * launcher / spacecraft are not in the curated /fleet inventory are
 * intentionally omitted (e.g., Atlas-Agena, Proton-K, Delta II — all
 * candidate v0.7 fleet expansion items).
 */
const CURATED: Record<string, FleetRef[]> = {
  mariner4: [{ id: 'mariner-4', role: 'spacecraft' }],
  luna9: [{ id: 'luna-9', role: 'spacecraft' }],
  apollo11: [
    { id: 'saturn-v', role: 'launcher' },
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
  ],
  luna17: [{ id: 'lunokhod-1', role: 'spacecraft' }],
  mars3: [{ id: 'mars-3', role: 'spacecraft' }],
  apollo17: [
    { id: 'saturn-v', role: 'launcher' },
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
    { id: 'apollo-lm', role: 'spacecraft' },
    { id: 'lrv-apollo', role: 'payload' },
  ],
  viking1: [{ id: 'viking-1', role: 'spacecraft' }],
  luna24: [{ id: 'luna-16', role: 'spacecraft' }],
  'voyager-2': [{ id: 'voyager-2', role: 'spacecraft' }],
  galileo: [
    { id: 'space-shuttle-stack', role: 'launcher' },
    { id: 'space-shuttle-orbiter', role: 'spacecraft' },
    { id: 'galileo', role: 'payload' },
  ],
  clementine: [],
  'mars-pathfinder': [{ id: 'sojourner', role: 'payload' }],
  'mars-express': [{ id: 'mars-express', role: 'spacecraft' }],
  'new-horizons': [{ id: 'atlas-v', role: 'launcher' }],
  dawn: [],
  chandrayaan1: [],
  lro: [{ id: 'atlas-v', role: 'launcher' }],
  curiosity: [
    { id: 'atlas-v', role: 'launcher' },
    { id: 'curiosity', role: 'spacecraft' },
  ],
  mangalyaan: [{ id: 'mangalyaan', role: 'spacecraft' }],
  maven: [{ id: 'atlas-v', role: 'launcher' }],
  change4: [
    { id: 'change-4', role: 'spacecraft' },
    { id: 'yutu-2', role: 'payload' },
  ],
  insight: [
    { id: 'atlas-v', role: 'launcher' },
    { id: 'insight', role: 'spacecraft' },
  ],
  'inspiration-mars': [],
  change5: [
    { id: 'long-march-5', role: 'launcher' },
    { id: 'change-5', role: 'spacecraft' },
  ],
  'hope-probe': [{ id: 'h-iia', role: 'launcher' }],
  perseverance: [
    { id: 'atlas-v', role: 'launcher' },
    { id: 'perseverance', role: 'spacecraft' },
  ],
  tianwen1: [
    { id: 'long-march-5', role: 'launcher' },
    { id: 'zhurong', role: 'spacecraft' },
  ],
  chandrayaan3: [
    { id: 'lvm3', role: 'launcher' },
    { id: 'vikram-cy3', role: 'spacecraft' },
    { id: 'pragyan', role: 'payload' },
  ],
  change6: [{ id: 'long-march-5', role: 'launcher' }],
  slim: [
    { id: 'h-iia', role: 'launcher' },
    { id: 'slim', role: 'spacecraft' },
  ],
  'blue-moon-mk1': [],
  artemis2: [
    { id: 'sls-block-1', role: 'launcher' },
    { id: 'orion', role: 'spacecraft' },
  ],
  mmx: [{ id: 'h3', role: 'launcher' }],
  'starship-demo': [],
  artemis3: [
    { id: 'sls-block-1', role: 'launcher' },
    { id: 'orion', role: 'spacecraft' },
  ],
  'starship-mars-crew': [],
};

type IndexEntry = { id: string };

async function main() {
  const fleetIndex = JSON.parse(await readFile(FLEET_INDEX, 'utf-8')) as IndexEntry[];
  const validFleetIds = new Set(fleetIndex.map((r) => r.id));

  // Find every mission file
  const { readdir, stat } = await import('node:fs/promises');
  const missionFiles: Array<{ id: string; path: string }> = [];
  for (const entry of await readdir(MISSIONS_DIR)) {
    if (entry === 'index.json') continue;
    const subdir = join(MISSIONS_DIR, entry);
    const s = await stat(subdir).catch(() => null);
    if (!s?.isDirectory()) continue;
    for (const f of await readdir(subdir)) {
      if (!f.endsWith('.json')) continue;
      missionFiles.push({ id: f.replace(/\.json$/, ''), path: join(subdir, f) });
    }
  }

  let written = 0;
  let skipped = 0;
  let unknown = 0;
  const danglingIds = new Set<string>();

  for (const { id, path } of missionFiles) {
    const mission = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    const refs = CURATED[id];

    if (refs === undefined) {
      console.warn(`  ⚠ no curated fleet_refs for mission ${id}`);
      unknown += 1;
      continue;
    }

    // Filter to valid fleet IDs only
    const validRefs = refs.filter((r) => {
      if (validFleetIds.has(r.id)) return true;
      danglingIds.add(r.id);
      return false;
    });

    if (validRefs.length === 0) {
      // No fleet refs for this mission — strip the field if it exists
      if ('fleet_refs' in mission) {
        delete mission.fleet_refs;
        await writeFile(path, JSON.stringify(mission, null, 2) + '\n', 'utf-8');
        written += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    // Insert fleet_refs after flight_data_quality (if present) or before flight (if present)
    // or at the end. We rebuild the object to preserve insertion order.
    const out: Record<string, unknown> = {};
    let inserted = false;
    for (const [k, v] of Object.entries(mission)) {
      if (k === 'fleet_refs') continue; // skip stale value
      out[k] = v;
      if (!inserted && k === 'flight_data_quality') {
        out.fleet_refs = validRefs;
        inserted = true;
      }
    }
    if (!inserted) {
      out.fleet_refs = validRefs;
    }

    await writeFile(path, JSON.stringify(out, null, 2) + '\n', 'utf-8');
    written += 1;
  }

  console.log(
    `migrated ${written} missions, skipped ${skipped} (already empty), unknown ${unknown} (no curation)`,
  );
  if (danglingIds.size > 0) {
    console.warn(
      `  ⚠ skipped ${danglingIds.size} fleet IDs not in fleet/index.json: ${[...danglingIds].join(', ')}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
