#!/usr/bin/env tsx
/**
 * Targeted-query gallery fill for entities the generic auto-query
 * couldn't reach 5 slots. The auto-query (scripts/fill-gallery-gaps.ts)
 * derives the search term from the entity id (`luna10` → "luna10"),
 * which misses Commons' canonical naming ("Luna 10" with a space).
 *
 * Every entity below was under-target after the 2026-06-14 fill pass.
 * The curated query targets each one's canonical Commons category /
 * mission designation. Same pHash guard as the auto-script: candidates
 * are checked against the entity's existing slots AND the global
 * corpus before landing.
 *
 * Run:
 *   npx tsx scripts/fill-curated-queries.ts --dry   # report only
 *   npx tsx scripts/fill-curated-queries.ts         # apply
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { computePhash, hammingDistance } from './lib/phash.ts';

const TARGET_SLOTS = 5;
const PHASH_DUPE_THRESHOLD = 4;
const PHASH_CACHE_PATH = 'static/data/image-phashes.json';
const REPORT_PATH = 'docs/provenance/fill-curated-queries-report.md';
const SURFACES: Record<string, string> = {
  missions: 'static/images/missions',
  'fleet-galleries': 'static/images/fleet-galleries',
  'moon-sites': 'static/images/moon-sites',
  'mars-sites': 'static/images/mars-sites',
  'earth-objects': 'static/images/earth-objects',
  'iss-modules': 'static/images/iss-modules',
};

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_DELAY_MS = 1100;

/** Curated `surface/id → search queries[]` — multiple queries per
 *  entity widen the candidate pool. Order matters: earlier queries
 *  exhaust first; later ones fill the remaining slots. */
const CURATED: Record<string, string[]> = {
  // ─── Soviet / Russian missions: Commons indexes by spelled-out
  //     designation, not the compact id we use ──────────────────────
  'missions/change1': ["Chang'e 1", 'Change-1 lunar orbiter', 'Chinese lunar program'],
  'missions/luna10': ['Luna 10', 'Luna-10 spacecraft', 'Soviet lunar orbiter'],
  'missions/luna16': ['Luna 16', 'Luna-16 spacecraft', 'Soviet sample return'],
  'missions/mars6': ['Mars 6', 'Mars-6 spacecraft', 'Soviet Mars probe'],
  'missions/starship-mars-crew': [
    'SpaceX Starship Mars',
    'Starship Earth Mars transit',
    'Starship interplanetary',
    'SpaceX Mars mission concept',
  ],
  'fleet-galleries/blue-moon-mk1': [
    'Blue Moon lander',
    'Blue Origin Moon lander',
    'BE-7 engine Blue Origin',
    'Blue Moon spacecraft',
  ],
  'fleet-galleries/change1': ["Chang'e 1", 'Change-1 lunar orbiter', 'Long March 3A lift-off'],
  'fleet-galleries/crew-dragon-iva': [
    'SpaceX Crew Dragon interior',
    'Dragon spacesuit',
    'Crew Dragon astronaut',
    'SpaceX IVA suit',
  ],
  'fleet-galleries/jiuquan-slc-43': [
    'Jiuquan Satellite Launch Center',
    'Jiuquan launch complex',
    'Long March 2F Jiuquan',
    'Shenzhou launch pad',
  ],
  'fleet-galleries/mars6': ['Mars 6', 'Mars-6 spacecraft', 'Soviet Mars program'],
  // Soyuz 11A511 — the first-gen Soyuz launcher (1966-1976). Commons indexes the
  // R-7 derivative by museum display + period launch; the modern Soyuz-U/FG/2 are
  // near-identical externally, so period + designation queries first, museum next.
  'fleet-galleries/soyuz': [
    'Soyuz 11A511',
    'Soyuz 7K-OK rocket',
    'Союз 11А511',
    'Soyuz rocket Baikonur 1967',
    'Soyuz launch vehicle museum',
  ],
  'fleet-galleries/progress-7k-tg': [
    'Progress 7K-TG',
    'Progress spacecraft Soyuz',
    'Progress 1 cargo',
    'Soviet Progress cargo ship',
  ],
  'fleet-galleries/tundra-sirius': [
    'Sirius XM satellite',
    'Tundra orbit',
    'Sirius FM satellite',
    'XM Radio satellite',
  ],
  'fleet-galleries/vikram-cy3': [
    'Vikram lander Chandrayaan-3',
    'Chandrayaan-3 lander',
    'ISRO Vikram',
    'Chandrayaan-3 Moon landing',
  ],
  'moon-sites/change2': [
    "Chang'e 2 lunar",
    'Change-2 spacecraft',
    'Chinese Moon orbiter',
    'Chinese lunar program',
  ],
  'moon-sites/change3': [
    "Chang'e 3 lunar",
    'Yutu rover',
    'Change-3 lander',
    'Chinese lunar lander',
  ],
  'moon-sites/luna16': ['Luna 16 lunar', 'Luna-16 spacecraft', 'Soviet Moon sample'],
  'mars-sites/mars3-orbiter': [
    'Mars 3 orbiter',
    'Mars-3 Soviet orbiter',
    'Mars 3 spacecraft Soviet',
  ],
  'mars-sites/mars6': ['Mars 6 lander', 'Mars-6 Soviet lander', 'Soviet Mars probe'],
  'earth-objects/change2': ["Chang'e 2 spacecraft", 'Change-2 satellite', 'Chinese lunar orbiter'],
  'earth-objects/tundra-molniya': [
    'Molniya orbit',
    'Molniya satellite',
    'Russian highly elliptical orbit',
    'Tundra orbit',
  ],
  // ─── Re-source after D's delete + renumber dropped these below 5 ──
  'missions/blue-moon-mk1': [
    'Blue Moon lander concept',
    'Blue Origin lunar lander',
    'BE-7 engine test',
  ],
  'fleet-galleries/taiyuan-lc-9': [
    'Taiyuan Satellite Launch Center',
    'Long March 6A launch',
    'Long March 4B Taiyuan',
    'Chinese launch site',
  ],
  'fleet-galleries/zhurong': [
    'Zhurong Mars rover',
    'Tianwen-1 rover',
    'Chinese Mars rover',
    'Zhurong selfie Mars',
  ],
  'earth-objects/gps': [
    'GPS Block IIR satellite',
    'GPS Block III satellite',
    'Global Positioning System Block IIIA',
    'Navstar GPS satellite',
  ],
  // Round 3 stragglers after cache-refresh-fix delete + renumber.
  'fleet-galleries/salyut-3': [
    'Salyut 3 station',
    'Almaz OPS-2',
    'Soviet military space station',
    'Almaz station model',
  ],
  // Round 4: iss-modules residuals from D's intra-entity cleanup.
  'iss-modules/unity': [
    'Unity Node 1 ISS',
    'Node 1 module ISS',
    'STS-88 Unity assembly',
    'Unity module International Space Station',
  ],
};

const dryRun = process.argv.includes('--dry');

interface PhashCache {
  computed_at: string;
  algorithm: 'phash-dct-8x8';
  phashes: Record<string, string>;
}

const cache: PhashCache = JSON.parse(readFileSync(PHASH_CACHE_PATH, 'utf-8')) as PhashCache;

interface CandidateResult {
  surface: string;
  id: string;
  currentSlots: number;
  queries: string[];
  totalHits: number;
  candidates: Array<{
    query: string;
    title: string;
    fetched: boolean;
    nearDupeOf?: string;
    accepted?: number;
  }>;
}

function isBaseJpg(name: string): boolean {
  return (
    name.endsWith('.jpg') &&
    !name.includes('.1x1.') &&
    !name.includes('.4x3.') &&
    !name.includes('.16x9.')
  );
}

function countSlots(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(isBaseJpg).sort();
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

function nearDupeIn(newHash: string, scope: Record<string, string>): string | null {
  for (const [path, h] of Object.entries(scope)) {
    if (hammingDistance(newHash, h) <= PHASH_DUPE_THRESHOLD) return path;
  }
  return null;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processEntity(key: string, queries: string[]): Promise<CandidateResult> {
  const [surface, id] = key.split('/');
  const dir = join(SURFACES[surface], id);
  const existing = countSlots(dir);
  const need = TARGET_SLOTS - existing.length;
  const result: CandidateResult = {
    surface,
    id,
    currentSlots: existing.length,
    queries,
    totalHits: 0,
    candidates: [],
  };
  if (need <= 0) return result;

  const localCache: Record<string, string> = {};
  for (const slot of existing) {
    const urlPath = `/images/${surface}/${id}/${slot}`;
    if (cache.phashes[urlPath]) localCache[urlPath] = cache.phashes[urlPath];
  }

  let nextSlot = 1;
  for (const slot of existing) {
    const n = parseInt(slot.slice(0, 2), 10);
    if (n >= nextSlot) nextSlot = n + 1;
  }

  let accepted = 0;
  const seenTitles = new Set<string>();

  for (const query of queries) {
    if (accepted >= need) break;
    const hits = await searchCommons(query, 15);
    result.totalHits += hits.length;
    for (const title of hits) {
      if (accepted >= need) break;
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);
      const cand: CandidateResult['candidates'][number] = { query, title, fetched: false };
      result.candidates.push(cand);

      const buf = await fetchCommons(title);
      await sleep(COMMONS_DELAY_MS);
      if (!buf) continue;
      cand.fetched = true;
      let baseJpg: Buffer;
      try {
        baseJpg = await sharp(buf).jpeg({ quality: 90 }).toBuffer();
      } catch {
        continue;
      }
      const hash = await computePhash(baseJpg);
      const localHit = nearDupeIn(hash, localCache);
      if (localHit) {
        cand.nearDupeOf = localHit;
        continue;
      }
      const globalHit = nearDupeIn(hash, cache.phashes);
      if (globalHit) {
        cand.nearDupeOf = globalHit;
        continue;
      }
      cand.accepted = nextSlot;

      if (!dryRun) {
        try {
          await mkdir(dir, { recursive: true });
          const slotName = String(nextSlot).padStart(2, '0') + '.jpg';
          const oneXoneName = String(nextSlot).padStart(2, '0') + '.1x1.jpg';
          await writeFile(join(dir, slotName), baseJpg);
          const meta = await sharp(baseJpg).metadata();
          const dim = Math.min(meta.width ?? 800, meta.height ?? 800);
          const oneXone = await sharp(baseJpg)
            .resize(dim, dim, { fit: 'cover', position: 'attention' })
            .jpeg({ quality: 88 })
            .toBuffer();
          await writeFile(join(dir, oneXoneName), oneXone);
          const urlPath = `/images/${surface}/${id}/${slotName}`;
          cache.phashes[urlPath] = hash;
          localCache[urlPath] = hash;
          accepted++;
          nextSlot++;
        } catch {
          // disk failure — leave gap for next pass
        }
      } else {
        accepted++;
        nextSlot++;
      }
    }
  }
  return result;
}

async function main(): Promise<void> {
  console.log(
    `fill-curated-queries — ${dryRun ? 'DRY' : 'APPLY'} (target ${TARGET_SLOTS}/gallery)`,
  );
  console.log(`pHash cache: ${Object.keys(cache.phashes).length} entries\n`);
  const all: CandidateResult[] = [];
  for (const [key, queries] of Object.entries(CURATED)) {
    const r = await processEntity(key, queries);
    all.push(r);
    const filled = r.candidates.filter((c) => c.accepted).length;
    const dupes = r.candidates.filter((c) => c.nearDupeOf).length;
    const marker = filled > 0 ? '+' : ' ';
    console.log(
      `  ${marker} ${key}: ${r.currentSlots} → ${r.currentSlots + filled}  ` +
        `(${r.totalHits} hits, ${filled} accepted, ${dupes} rejected as dupe)`,
    );
  }

  if (!dryRun) {
    cache.computed_at = new Date().toISOString();
    writeFileSync(PHASH_CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
  }

  // Report
  const lines: string[] = [
    '# fill-curated-queries report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${dryRun ? 'DRY-RUN (no files written)' : 'APPLY'}`,
    '',
    '## Summary',
    '',
  ];
  let totalAccepted = 0;
  let totalRejected = 0;
  for (const r of all) {
    const filled = r.candidates.filter((c) => c.accepted).length;
    const dupes = r.candidates.filter((c) => c.nearDupeOf).length;
    totalAccepted += filled;
    totalRejected += dupes;
    lines.push(
      `- **${r.surface}/${r.id}**: ${r.currentSlots} → ${r.currentSlots + filled} slots ` +
        `(${r.totalHits} hits across ${r.queries.length} queries, ${filled} accepted, ${dupes} pHash-rejected)`,
    );
  }
  lines.push('');
  lines.push(`**Total accepted:** ${totalAccepted}`);
  lines.push(`**Total pHash-rejected:** ${totalRejected}`);
  lines.push('');
  lines.push('## Per-entity detail');
  lines.push('');
  for (const r of all) {
    lines.push(`### ${r.surface}/${r.id}`);
    lines.push('');
    lines.push(`Queries: ${r.queries.map((q) => `"${q}"`).join(', ')}`);
    lines.push('');
    if (r.candidates.length === 0) {
      lines.push('_No candidates found._');
      lines.push('');
      continue;
    }
    for (const c of r.candidates) {
      const status = c.accepted
        ? `✓ accepted (slot ${String(c.accepted).padStart(2, '0')})`
        : c.nearDupeOf
          ? `✗ pHash-dupe of ${c.nearDupeOf}`
          : !c.fetched
            ? '✗ fetch failed'
            : '✗ skipped';
      lines.push(`  - [${c.query}] ${c.title} → ${status}`);
    }
    lines.push('');
  }
  writeFileSync(REPORT_PATH, lines.join('\n') + '\n');

  console.log(`\nTotal accepted: ${totalAccepted}   pHash-rejected: ${totalRejected}`);
  console.log(`Report: ${REPORT_PATH}`);
}

void main();
