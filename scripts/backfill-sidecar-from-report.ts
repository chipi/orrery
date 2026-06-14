#!/usr/bin/env tsx
/**
 * Parse docs/provenance/fill-curated-queries-report.md and write
 * Commons title → slot mappings into the relevant per-surface sidecar
 * JSON files so the next build-image-provenance run can attribute each
 * newly-sourced image to its actual Commons file (real title + uploader
 * + license) instead of falling through to walker-fallback with a
 * generic per-surface agency default.
 *
 * Touches three sidecars:
 *   - static/data/mission-image-sources.json   (missions/<id>/<slot>)
 *   - static/data/fleet-image-sources.json     (<id>/<slot>.jpg, commons-shape)
 *   - static/data/panel-image-sources.json     (<surface>/<id>/<slot>)
 *
 * One-off: the fill-curated-queries.ts script writes the report at
 * apply time. Run this once after each curated fill to flush the
 * report's title→slot rows into the sidecars.
 *
 *   npx tsx scripts/backfill-sidecar-from-report.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';

const REPORT_PATH = 'docs/provenance/fill-curated-queries-report.md';

interface AcceptedRow {
  surface: string;
  id: string;
  slot: number;
  query: string;
  title: string; // already stripped of "File:" prefix
}

function parseReport(): AcceptedRow[] {
  const text = readFileSync(REPORT_PATH, 'utf-8');
  const rows: AcceptedRow[] = [];
  // Section headers look like "### missions/luna16"; rows look like
  // "  - [Luna 16] File:Luna 16 landing on moon.jpg → ✓ accepted (slot 02)"
  let currentEntity: { surface: string; id: string } | null = null;
  for (const line of text.split('\n')) {
    const header = /^### ([\w-]+)\/([\w-]+)\s*$/.exec(line);
    if (header) {
      currentEntity = { surface: header[1], id: header[2] };
      continue;
    }
    if (!currentEntity) continue;
    const accept = /^\s*-\s+\[(.+?)\]\s+(.+?)\s+→\s+✓\s+accepted\s+\(slot\s+(\d+)\)\s*$/.exec(line);
    if (!accept) continue;
    const [, query, rawTitle, slotStr] = accept;
    const title = rawTitle.replace(/^File:/, '');
    rows.push({
      surface: currentEntity.surface,
      id: currentEntity.id,
      slot: parseInt(slotStr, 10),
      query,
      title,
    });
  }
  return rows;
}

/** Look up the entity's agency from its catalog. Mirrors the walker-
 *  fallback lookup in build-image-provenance.ts so backfilled credits
 *  match what the walker would have assigned. */
function loadEntityAgency(): Map<string, string> {
  const m = new Map<string, string>();
  const safe = <T>(path: string, fallback: T): T => {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch {
      return fallback;
    }
  };
  // Mission catalog — already proper-case.
  const missions = safe<Array<{ id: string; agency?: string }>>(
    'static/data/missions/index.json',
    [],
  );
  for (const x of missions) if (x.id && x.agency) m.set(`missions/${x.id}`, x.agency);
  // Fleet — use existing sidecar's credit/agency.
  const fleet = safe<Record<string, { agency?: string; credit?: string }>>(
    'static/data/fleet-image-sources.json',
    {},
  );
  const HUMAN: Record<string, string> = {
    NASA: 'NASA',
    ROSCOSMOS: 'Roscosmos',
    ESA: 'ESA',
    JAXA: 'JAXA',
    CNSA: 'CNSA',
    CMSA: 'CMSA',
    ISRO: 'ISRO',
    SPACEX: 'SpaceX',
    BLUE_ORIGIN: 'Blue Origin',
    BOEING: 'Boeing',
    NORTHROP_GRUMMAN: 'Northrop Grumman',
    ULA: 'United Launch Alliance',
    ISPACE: 'ispace',
    INTUITIVE_MACHINES: 'Intuitive Machines',
    SPACEIL: 'SpaceIL',
    MULTI: 'Multi-agency',
    UAESA: 'MBRSC (UAE Space Agency)',
  };
  for (const [relPath, src] of Object.entries(fleet)) {
    const id = relPath.split('/')[0];
    const key = `fleet-galleries/${id}`;
    if (m.has(key)) continue;
    const a = src.credit ?? (src.agency ? (HUMAN[src.agency] ?? src.agency) : null);
    if (a) m.set(key, a);
  }
  // Earth objects — first of agencies[].
  const eo = safe<Array<{ id: string; agencies?: string[] }>>('static/data/earth-objects.json', []);
  for (const o of eo) if (o.id && o.agencies?.[0]) m.set(`earth-objects/${o.id}`, o.agencies[0]);
  // Moon/mars sites.
  for (const [surface, path] of [
    ['moon-sites', 'static/data/moon-sites.json'],
    ['mars-sites', 'static/data/mars-sites.json'],
  ] as const) {
    const arr = safe<Array<{ id: string; agency?: string }>>(path, []);
    for (const x of arr)
      if (x.id && x.agency) m.set(`${surface}/${x.id}`, HUMAN[x.agency] ?? x.agency);
  }
  return m;
}

interface SidecarRow {
  commons_file: string;
  commons_url: string;
  credit: string;
  license: string;
  fetched_at: string;
}

function buildRow(title: string, credit: string, fetchedAt: string): SidecarRow {
  const enc = encodeURIComponent(title);
  return {
    commons_file: title,
    commons_url: `https://commons.wikimedia.org/wiki/File:${enc}`,
    credit,
    license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
    fetched_at: fetchedAt,
  };
}

function main(): void {
  const rows = parseReport();
  console.log(`Parsed ${rows.length} accepted rows from ${REPORT_PATH}`);
  if (rows.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }
  const agencyMap = loadEntityAgency();
  const surfaceDefault: Record<string, string> = {
    missions: 'NASA',
    'fleet-galleries': 'NASA',
    'moon-sites': 'NASA',
    'mars-sites': 'NASA',
    'earth-objects': 'NASA',
  };
  const now = new Date().toISOString();

  // Load existing sidecars.
  const loadJson = <T>(path: string, fallback: T): T => {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch {
      return fallback;
    }
  };
  const missionSidecar = loadJson<Record<string, SidecarRow>>(
    'static/data/mission-image-sources.json',
    {},
  );
  const fleetSidecar = loadJson<Record<string, Record<string, unknown>>>(
    'static/data/fleet-image-sources.json',
    {},
  );
  const panelSidecar = loadJson<Record<string, SidecarRow>>(
    'static/data/panel-image-sources.json',
    {},
  );

  let missionAdded = 0;
  let fleetAdded = 0;
  let panelAdded = 0;

  for (const row of rows) {
    const credit =
      agencyMap.get(`${row.surface}/${row.id}`) ?? surfaceDefault[row.surface] ?? 'NASA';
    const slot = String(row.slot).padStart(2, '0');
    const sidecarRow = buildRow(row.title, credit, now);

    if (row.surface === 'missions') {
      const key = `${row.id}/${slot}`;
      if (!(key in missionSidecar)) {
        missionSidecar[key] = sidecarRow;
        missionAdded++;
      }
    } else if (row.surface === 'fleet-galleries') {
      const key = `${row.id}/${slot}.jpg`;
      if (!(key in fleetSidecar)) {
        fleetSidecar[key] = sidecarRow as unknown as Record<string, unknown>;
        fleetAdded++;
      }
    } else {
      // moon-sites / mars-sites / earth-objects
      const key = `${row.surface}/${row.id}/${slot}`;
      if (!(key in panelSidecar)) {
        panelSidecar[key] = sidecarRow;
        panelAdded++;
      }
    }
  }

  // Write back (keys sorted for deterministic diff).
  const sortedWrite = (path: string, obj: Record<string, unknown>): void => {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
    writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
  };
  sortedWrite('static/data/mission-image-sources.json', missionSidecar);
  sortedWrite('static/data/fleet-image-sources.json', fleetSidecar);
  sortedWrite('static/data/panel-image-sources.json', panelSidecar);

  console.log(`Added ${missionAdded} mission, ${fleetAdded} fleet, ${panelAdded} panel rows.`);
  console.log('Re-run build-image-provenance to pick them up.');
}

main();
