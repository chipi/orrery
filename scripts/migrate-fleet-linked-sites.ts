#!/usr/bin/env tsx
/**
 * One-shot migration: populates `linked_sites: [...]` on every fleet
 * entry by deriving the reverse pointer from `fleet_refs` on
 * moon-sites / mars-sites / earth-objects.
 *
 * For each site/object with `fleet_refs: [{id: "curiosity", role: "spacecraft"}, ...]`,
 * the corresponding fleet entry gets `linked_sites: [{type: "mars",
 * site_id: "curiosity"}, ...]` populated.
 *
 * Sources of truth:
 *   - moon-sites.json / mars-sites.json / earth-objects.json (curated
 *     forward pointers, authored in scripts/migrate-site-fleet-refs.ts)
 *   - this script derives reverse pointers; the bidirectional validator
 *     in validate-data.ts confirms symmetric integrity.
 *
 * Run after `migrate-site-fleet-refs.ts`:
 *   tsx scripts/migrate-fleet-linked-sites.ts
 *
 * Re-runnable: existing `linked_sites` are REPLACED with fresh derivation.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_DIR = join(ROOT, 'static/data/fleet');

type FleetRef = { id: string; role: 'launcher' | 'spacecraft' | 'payload' | 'station' };
type SiteRecord = { id: string; fleet_refs?: FleetRef[] };
type LinkedSite = { type: 'moon' | 'mars' | 'earth-object'; site_id: string };
type IndexEntry = { id: string; category: string };

async function readSites(path: string): Promise<SiteRecord[]> {
  return JSON.parse(await readFile(path, 'utf-8')) as SiteRecord[];
}

async function main() {
  const indexJson = JSON.parse(
    await readFile(join(FLEET_DIR, 'index.json'), 'utf-8'),
  ) as IndexEntry[];
  const fleetCategoryById = new Map(indexJson.map((r) => [r.id, r.category]));

  // Gather all source-of-truth fleet_refs from sites + objects, build
  // reverse map: fleet_id → [{type, site_id}].
  const reverseMap = new Map<string, LinkedSite[]>();

  const moonSites = await readSites(join(ROOT, 'static/data/moon-sites.json'));
  for (const site of moonSites) {
    if (!site.fleet_refs) continue;
    for (const ref of site.fleet_refs) {
      const list = reverseMap.get(ref.id) ?? [];
      list.push({ type: 'moon', site_id: site.id });
      reverseMap.set(ref.id, list);
    }
  }

  const marsSites = await readSites(join(ROOT, 'static/data/mars-sites.json'));
  for (const site of marsSites) {
    if (!site.fleet_refs) continue;
    for (const ref of site.fleet_refs) {
      const list = reverseMap.get(ref.id) ?? [];
      list.push({ type: 'mars', site_id: site.id });
      reverseMap.set(ref.id, list);
    }
  }

  const earthObjects = await readSites(join(ROOT, 'static/data/earth-objects.json'));
  for (const obj of earthObjects) {
    if (!obj.fleet_refs) continue;
    for (const ref of obj.fleet_refs) {
      const list = reverseMap.get(ref.id) ?? [];
      list.push({ type: 'earth-object', site_id: obj.id });
      reverseMap.set(ref.id, list);
    }
  }

  // Stable sort by (type, site_id) for diff-friendly output.
  const TYPE_ORDER = { moon: 0, mars: 1, 'earth-object': 2 } as const;
  for (const list of reverseMap.values()) {
    list.sort((a, b) => {
      const t = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
      return t !== 0 ? t : a.site_id.localeCompare(b.site_id);
    });
  }

  // Update each affected fleet entry
  let written = 0;
  let cleared = 0;
  for (const [fleetId, sites] of reverseMap.entries()) {
    const category = fleetCategoryById.get(fleetId);
    if (!category) {
      console.warn(`  ⚠ unknown fleet id ${fleetId} referenced by ${sites.length} sites`);
      continue;
    }
    const path = join(FLEET_DIR, category, `${fleetId}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    entry.linked_sites = sites;
    await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    written += 1;
  }

  // Strip stale linked_sites on fleet entries that have no incoming refs.
  for (const [fleetId, category] of fleetCategoryById.entries()) {
    if (reverseMap.has(fleetId)) continue;
    const path = join(FLEET_DIR, category, `${fleetId}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    if (Array.isArray(entry.linked_sites) && (entry.linked_sites as unknown[]).length > 0) {
      delete entry.linked_sites;
      await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
      cleared += 1;
    }
  }

  console.log(`populated linked_sites on ${written} fleet entries, cleared ${cleared} stale lists`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
