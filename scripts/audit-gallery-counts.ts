#!/usr/bin/env tsx
/**
 * scripts/audit-gallery-counts.ts
 *
 * Per v0.7.0 #PF (Step 2 of the v0.7 wrap-up plan).
 *
 * Walks the mission + fleet indexes and reports gallery image counts
 * per entry, flagging anything with fewer than `MIN_GALLERY` images.
 * Particularly useful for spotting non-NASA gaps so we can keep
 * agency coverage balanced (memory:
 * feedback_global_space_program_representation).
 *
 * Usage:
 *   npx tsx scripts/audit-gallery-counts.ts              # text report
 *   npx tsx scripts/audit-gallery-counts.ts --json       # JSON report
 *   npx tsx scripts/audit-gallery-counts.ts --non-nasa   # filter to non-NASA only
 *   npx tsx scripts/audit-gallery-counts.ts --threshold 5
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_ROOT = join('static', 'data');
const MIN_GALLERY_DEFAULT = 3;

interface IndexEntry {
  id: string;
  agency?: string;
  agencies?: string[];
  [k: string]: unknown;
}

interface AuditRow {
  segment: 'mission' | 'fleet';
  id: string;
  agency: string;
  count: number;
  flagged: boolean;
}

async function readJson<T>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

function pickAgency(e: IndexEntry): string {
  if (e.agency) return e.agency;
  if (e.agencies && e.agencies.length > 0) return e.agencies[0];
  return 'unknown';
}

function isNonNasa(agency: string): boolean {
  // "NASA / ESA", "Multi (NASA / ...)" still count as NASA-collab → exclude
  // from "non-NASA" filter. Pure non-NASA only.
  const a = agency.toLowerCase();
  if (a === 'nasa') return false;
  if (a.includes('nasa')) return false;
  return true;
}

async function audit(threshold: number): Promise<AuditRow[]> {
  const missions = await readJson<IndexEntry[]>(join(DATA_ROOT, 'missions', 'index.json'));
  const fleet = await readJson<IndexEntry[]>(join(DATA_ROOT, 'fleet', 'index.json'));
  // Both gallery manifests are { id: imageCount } integer maps.
  const missionGalleries = await readJson<Record<string, number>>(
    join(DATA_ROOT, 'mission-galleries.json'),
  );
  const fleetGalleries = await readJson<Record<string, number>>(
    join(DATA_ROOT, 'fleet-galleries.json'),
  );

  const rows: AuditRow[] = [];
  for (const m of missions) {
    const count = missionGalleries[m.id] ?? 0;
    rows.push({
      segment: 'mission',
      id: m.id,
      agency: pickAgency(m),
      count,
      flagged: count < threshold,
    });
  }
  for (const f of fleet) {
    const count = fleetGalleries[f.id] ?? 0;
    rows.push({
      segment: 'fleet',
      id: f.id,
      agency: pickAgency(f),
      count,
      flagged: count < threshold,
    });
  }
  return rows;
}

function printReport(rows: AuditRow[], threshold: number, nonNasaOnly: boolean): void {
  const filtered = nonNasaOnly ? rows.filter((r) => isNonNasa(r.agency)) : rows;
  const flagged = filtered.filter((r) => r.flagged);

  console.log(
    `\nGallery audit (threshold=${threshold}, ${nonNasaOnly ? 'non-NASA only' : 'all agencies'})`,
  );
  console.log('='.repeat(72));
  console.log(`  Total entries: ${filtered.length}`);
  console.log(`  Flagged (count < ${threshold}): ${flagged.length}`);

  if (flagged.length > 0) {
    console.log(`\nFlagged entries:`);
    const byAgency = new Map<string, AuditRow[]>();
    for (const r of flagged) {
      const list = byAgency.get(r.agency) ?? [];
      list.push(r);
      byAgency.set(r.agency, list);
    }
    const agencies = [...byAgency.keys()].sort();
    for (const agency of agencies) {
      const list = byAgency.get(agency)!;
      console.log(`\n  ${agency} (${list.length}):`);
      for (const r of list.sort((a, b) => a.count - b.count || a.id.localeCompare(b.id))) {
        console.log(`    [${r.segment}] ${r.id.padEnd(28)} ${r.count} img`);
      }
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const nonNasaOnly = args.includes('--non-nasa');
  const thresholdIdx = args.indexOf('--threshold');
  const threshold =
    thresholdIdx >= 0 ? Number.parseInt(args[thresholdIdx + 1], 10) : MIN_GALLERY_DEFAULT;

  const rows = await audit(threshold);

  if (json) {
    const filtered = nonNasaOnly ? rows.filter((r) => isNonNasa(r.agency)) : rows;
    console.log(JSON.stringify(filtered, null, 2));
  } else {
    printReport(rows, threshold, nonNasaOnly);
  }

  const flagged = (nonNasaOnly ? rows.filter((r) => isNonNasa(r.agency)) : rows).filter(
    (r) => r.flagged,
  );
  process.exit(flagged.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
