#!/usr/bin/env tsx
/**
 * Walker-fallback title backfill — Commons API replay.
 *
 * fill-gallery-gaps.ts writes images to disk + updates the pHash cache,
 * but never persists the Commons file title that produced each slot.
 * Downstream, build-image-provenance.ts falls back to the disk-walker
 * code path, which assigns a generic title ("Uncurated panel image —
 * surface/id") instead of the real Commons file.
 *
 * This script closes the gap. For each entity whose disk files were
 * written by fill-gallery-gaps and don't have a sidecar entry yet:
 *   1. Re-run the same Commons search the fill script used
 *   2. Fetch each hit, compute pHash, match against the entity's on-disk
 *      slot pHashes (d=0 is a sure match — same bytes through the same
 *      re-encoder produce the same hash)
 *   3. For each matched slot, write a sidecar entry routed to the right
 *      manifest (mission/fleet/panel) so the next provenance rebuild
 *      surfaces the real Commons filename + uploader/license.
 *
 * Cost: ~700 Commons fetches at 1.1s rate-limit = ~13 minutes wall-clock.
 * Run once after the initial fill; subsequent fills write the sidecar
 * directly (see the matching update in fill-gallery-gaps.ts).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { computePhash } from './lib/phash.ts';

const SURFACES: Record<string, string> = {
  missions: 'static/images/missions',
  'fleet-galleries': 'static/images/fleet-galleries',
  'moon-sites': 'static/images/moon-sites',
  'mars-sites': 'static/images/mars-sites',
  'earth-objects': 'static/images/earth-objects',
};
const PHASH_CACHE_PATH = 'static/data/image-phashes.json';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_DELAY_MS = 1100;
const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

interface PhashCache {
  phashes: Record<string, string>;
}
const cache: PhashCache = JSON.parse(readFileSync(PHASH_CACHE_PATH, 'utf-8')) as PhashCache;

// Same query derivation as fill-gallery-gaps.ts
function queryFor(surface: string, id: string): string {
  const base = id.replace(/-/g, ' ');
  if (surface === 'earth-objects') return `${base} satellite`;
  if (surface === 'moon-sites') return `${base} lunar`;
  if (surface === 'mars-sites') return `${base} mars`;
  return base;
}

async function searchCommons(query: string, limit: number): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '6',
    srlimit: String(limit),
    format: 'json',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return [];
    interface SearchHit {
      title: string;
    }
    interface SearchResponse {
      query?: { search?: SearchHit[] };
    }
    const data = (await res.json()) as SearchResponse;
    return (data.query?.search ?? [])
      .map((h) => h.title)
      .filter((t: string) => /\.(jpe?g|png)$/i.test(t));
  } catch {
    return [];
  }
}

async function fetchCommons(title: string): Promise<Buffer | null> {
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(title.replace(/^File:/, ''))}?width=1600`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function listEntities(surface: string): string[] {
  const root = SURFACES[surface];
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((d) => {
    try {
      return readdirSync(`${root}/${d}`).some((f) => /^\d{2}\.jpg$/.test(f));
    } catch {
      return false;
    }
  });
}

function loadAgencyMap(): Map<string, string> {
  const m = new Map<string, string>();
  const safe = <T>(path: string, fallback: T): T => {
    try {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    } catch {
      return fallback;
    }
  };
  const missions = safe<Array<{ id: string; agency?: string }>>(
    'static/data/missions/index.json',
    [],
  );
  for (const x of missions) if (x.id && x.agency) m.set(`missions/${x.id}`, x.agency);
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
    SPACEIL: 'SpaceIL',
    ISPACE: 'ispace',
    UAESA: 'MBRSC (UAE Space Agency)',
  };
  const fleet = safe<Record<string, { agency?: string; credit?: string }>>(
    'static/data/fleet-image-sources.json',
    {},
  );
  for (const [relPath, src] of Object.entries(fleet)) {
    const id = relPath.split('/')[0];
    const key = `fleet-galleries/${id}`;
    if (m.has(key)) continue;
    const a = src.credit ?? (src.agency ? (HUMAN[src.agency] ?? src.agency) : null);
    if (a) m.set(key, a);
  }
  const eo = safe<Array<{ id: string; agencies?: string[] }>>('static/data/earth-objects.json', []);
  for (const o of eo) if (o.id && o.agencies?.[0]) m.set(`earth-objects/${o.id}`, o.agencies[0]);
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

const SURFACE_AGENCY_DEFAULT: Record<string, string> = {
  missions: 'NASA',
  'fleet-galleries': 'NASA',
  'moon-sites': 'NASA',
  'mars-sites': 'NASA',
  'earth-objects': 'NASA',
};

interface MatchResult {
  entity: string;
  surface: string;
  matched: Array<{ slot: number; title: string }>;
  unmatched: number[];
}

async function processEntity(
  surface: string,
  id: string,
  existingSidecars: { mission: Set<string>; fleet: Set<string>; panel: Set<string> },
  now: string,
  agencyMap: Map<string, string>,
): Promise<MatchResult> {
  const dir = `${SURFACES[surface]}/${id}`;
  // Disk slots → expected pHash from cache
  const diskSlots: Map<number, string> = new Map();
  for (const f of readdirSync(dir)) {
    const m = /^(\d{2})\.jpg$/.exec(f);
    if (!m) continue;
    const slot = parseInt(m[1], 10);
    const urlPath = `/images/${surface}/${id}/${f}`;
    const hash = cache.phashes[urlPath];
    if (!hash) continue;
    // Skip slots already covered by an existing sidecar entry.
    const key =
      surface === 'missions'
        ? `${id}/${m[1]}`
        : surface === 'fleet-galleries'
          ? `${id}/${m[1]}.jpg`
          : `${surface}/${id}/${m[1]}`;
    const sidecarSet =
      surface === 'missions'
        ? existingSidecars.mission
        : surface === 'fleet-galleries'
          ? existingSidecars.fleet
          : existingSidecars.panel;
    if (sidecarSet.has(key)) continue;
    diskSlots.set(slot, hash);
  }

  const result: MatchResult = {
    entity: `${surface}/${id}`,
    surface,
    matched: [],
    unmatched: [],
  };
  if (diskSlots.size === 0) return result;

  const credit = agencyMap.get(`${surface}/${id}`) ?? SURFACE_AGENCY_DEFAULT[surface] ?? 'NASA';
  const query = queryFor(surface, id);
  // Same search limit ramp the original script used.
  const limit = Math.min(20, 5 + diskSlots.size * 3);
  const hits = await searchCommons(query, limit);

  // We need write access to the sidecars in main(), so accumulate matches here.
  // Match each hit against unmatched disk slots; once a slot has a match,
  // remove it so subsequent hits can't claim it.
  for (const title of hits) {
    if (diskSlots.size === 0) break;
    const buf = await fetchCommons(title);
    await sleep(COMMONS_DELAY_MS);
    if (!buf) continue;
    let jpg: Buffer;
    try {
      jpg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
    } catch {
      continue;
    }
    const candHash = await computePhash(jpg);
    for (const [slot, slotHash] of diskSlots) {
      if (candHash === slotHash) {
        result.matched.push({ slot, title });
        diskSlots.delete(slot);
        break;
      }
    }
  }
  for (const slot of diskSlots.keys()) result.unmatched.push(slot);
  void credit; // returned via matched; main writes
  void now;
  return result;
}

async function main(): Promise<void> {
  const onlySurface = process.argv.find((a) => a.startsWith('--surface='))?.split('=')[1];
  const dryRun = process.argv.includes('--dry');
  console.log(
    `backfill-walker-fallback-titles — ${dryRun ? 'DRY' : 'APPLY'}${onlySurface ? ` (surface=${onlySurface})` : ''}`,
  );

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
  const existing = {
    mission: new Set(Object.keys(missionSidecar)),
    fleet: new Set(Object.keys(fleetSidecar)),
    panel: new Set(Object.keys(panelSidecar)),
  };

  const agencyMap = loadAgencyMap();
  const now = new Date().toISOString();

  const surfaces = onlySurface ? [onlySurface] : Object.keys(SURFACES);
  let totalMatched = 0;
  let totalUnmatched = 0;

  for (const surface of surfaces) {
    if (!SURFACES[surface]) continue;
    const entities = listEntities(surface);
    console.log(`\n# ${surface} (${entities.length} entities)`);
    for (const id of entities) {
      const r = await processEntity(surface, id, existing, now, agencyMap);
      const matchedSlots = r.matched.length;
      if (matchedSlots === 0 && r.unmatched.length === 0) continue; // fully covered
      totalMatched += matchedSlots;
      totalUnmatched += r.unmatched.length;
      console.log(`  ${r.entity}: matched ${matchedSlots}, unmatched ${r.unmatched.length}`);
      if (matchedSlots > 0 && !dryRun) {
        const credit = agencyMap.get(r.entity) ?? SURFACE_AGENCY_DEFAULT[surface] ?? 'NASA';
        for (const { slot, title } of r.matched) {
          const slotStr = String(slot).padStart(2, '0');
          const enc = encodeURIComponent(title.replace(/^File:/, ''));
          const row: SidecarRow = {
            commons_file: title.replace(/^File:/, ''),
            commons_url: `https://commons.wikimedia.org/wiki/File:${enc}`,
            credit,
            license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
            fetched_at: now,
          };
          if (surface === 'missions') {
            missionSidecar[`${id}/${slotStr}`] = row;
            existing.mission.add(`${id}/${slotStr}`);
          } else if (surface === 'fleet-galleries') {
            fleetSidecar[`${id}/${slotStr}.jpg`] = row as unknown as Record<string, unknown>;
            existing.fleet.add(`${id}/${slotStr}.jpg`);
          } else {
            panelSidecar[`${surface}/${id}/${slotStr}`] = row;
            existing.panel.add(`${surface}/${id}/${slotStr}`);
          }
        }
      }
    }
  }

  if (!dryRun) {
    const sortedWrite = (path: string, obj: Record<string, unknown>): void => {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(obj).sort()) sorted[k] = obj[k];
      writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
    };
    sortedWrite('static/data/mission-image-sources.json', missionSidecar);
    sortedWrite('static/data/fleet-image-sources.json', fleetSidecar);
    sortedWrite('static/data/panel-image-sources.json', panelSidecar);
  }

  console.log(`\n${dryRun ? 'Would match' : 'Matched'}: ${totalMatched} slots`);
  console.log(`Unmatched: ${totalUnmatched} slots (search didn't surface the Commons file)`);
}

void main();
