#!/usr/bin/env tsx
/**
 * Walk every gallery, identify entities with fewer than TARGET base
 * jpgs, and try to source additional images from Wikimedia Commons
 * via the search API. Each candidate is pHash-checked against the
 * entity's existing slots AND the global corpus before landing, so
 * the pipeline never introduces a near-duplicate.
 *
 * Run:
 *   npx tsx scripts/fill-gallery-gaps.ts --dry   # report only
 *   npx tsx scripts/fill-gallery-gaps.ts         # apply
 *
 * Outputs (apply mode):
 *   - new `<surface>/<id>/0X.jpg` + `0X.1x1.jpg` files for filled slots
 *   - updated `static/data/image-phashes.json` (cache)
 *   - `docs/provenance/fill-gallery-gaps-report.md`
 *
 * Skips entities whose existing slots already meet TARGET. Skips the
 * surface dirs that have no SOURCING_MAP coverage today (covered by
 * scripts/source-known-gaps.ts).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { computePhash, hammingDistance } from './lib/phash.ts';

const TARGET_SLOTS = 5;
import { resolveIdentity, resolveSubject } from './vision/subject.ts';
import { gatherFromSources, type SourceCandidate } from './lib/sources/index.ts';

// First-party landed images carry real credit/license inline (unlike Commons,
// whose attribution build-image-provenance re-fetches). We collect them here +
// write static/data/source-fetch-provenance.json, which build-image-provenance's
// buildSourceFetchEntries() overlays by path (fail-closed on non-allowlisted
// licenses) so /credits stays honest for ESA/SpaceX/NASA/Unsplash imagery.
const landedProvenance: Record<string, unknown>[] = [];
import { createAnthropicVisionProvider } from './vision/anthropic.ts';
import { resolveScoreFromCacheOrProvider } from './vision/cache.ts';

const SURFACES: Record<string, string> = {
  missions: 'static/images/missions',
  'fleet-galleries': 'static/images/fleet-galleries',
  'moon-sites': 'static/images/moon-sites',
  'mars-sites': 'static/images/mars-sites',
  'earth-objects': 'static/images/earth-objects',
};
const PHASH_DUPE_THRESHOLD = 4;
const PHASH_CACHE_PATH = 'static/data/image-phashes.json';
const REPORT_PATH = 'docs/provenance/fill-gallery-gaps-report.md';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_DELAY_MS = 1100;

const dryRun = process.argv.includes('--dry');
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : undefined;
}
const onlyId = argValue('--id') ?? argValue('--mission');

// Quality gate: fetched candidates are scored (subject-aware) and dropped if
// they're infographics/diagrams, people, off-subject, or low quality — so the
// re-fetch never re-introduces junk. Falls back to pHash-only if no API key.
const QUALITY_MIN = 5;
let _provider: ReturnType<typeof createAnthropicVisionProvider> | null = null;
let _providerFailed = false;
function visionProvider(): ReturnType<typeof createAnthropicVisionProvider> | null {
  if (!_provider && !_providerFailed) {
    try {
      _provider = createAnthropicVisionProvider();
    } catch {
      _providerFailed = true;
      console.warn('\u26a0 no ANTHROPIC_API_KEY \u2014 fetch quality-gate disabled (pHash only)');
    }
  }
  return _provider;
}

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
  query: string;
  searchHits: number;
  candidates: Array<{
    title: string;
    fetched: boolean;
    nearDupeOf?: string;
    rejectedByScore?: string;
    accepted?: number; // slot it would land at
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

/** Derive a Commons search query from the entity id. Best-effort:
 *  replace dashes with spaces. Hyphens-as-modifiers get the same
 *  treatment as separators, which is what we want for almost every
 *  case ("change6" → "change6", which is fine; "x-37b" → "x 37b",
 *  also fine). */
function queryFor(surface: string, id: string): string {
  const base = id.replace(/-/g, ' ');
  // Surface-specific suffix that nudges the search toward the right
  // kind of photo. For earth-objects we want satellite shots; for
  // moon/mars sites we want lander/surface; the others get no suffix
  // because the id usually carries the right semantics.
  if (surface === 'earth-objects') return `${base} satellite`;
  if (surface === 'moon-sites') return `${base} lunar`;
  if (surface === 'mars-sites') return `${base} mars`;
  if (surface === 'missions') {
    // Enrich with agency + target so a bare, keyword-poisoned id like "juice"
    // becomes "juice ESA jupiter spacecraft" — real imagery, not orange juice.
    const ident = resolveIdentity(id);
    return [base, ident?.agency, ident?.target, 'spacecraft'].filter(Boolean).join(' ');
  }
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
    const json = (await res.json()) as { query?: { search?: { title: string }[] } };
    const hits = json.query?.search ?? [];
    const out: string[] = [];
    for (const hit of hits) {
      const fileName = hit.title.replace(/^File:/, '');
      if (/\.(jpe?g|png|webp)$/i.test(fileName)) out.push(fileName);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchImageBytes(url: string): Promise<Buffer | null> {
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

async function processEntity(surface: string, id: string): Promise<CandidateResult> {
  const dir = join(SURFACES[surface], id);
  const existing = countSlots(dir);
  const need = TARGET_SLOTS - existing.length;
  const result: CandidateResult = {
    surface,
    id,
    currentSlots: existing.length,
    query: queryFor(surface, id),
    searchHits: 0,
    candidates: [],
  };
  if (need <= 0) return result;

  // The entity's existing pHashes — used to reject candidates that
  // would just re-render an existing slot.
  const localCache: Record<string, string> = {};
  for (const slot of existing) {
    const urlPath = `/images/${surface}/${id}/${slot}`;
    if (cache.phashes[urlPath]) localCache[urlPath] = cache.phashes[urlPath];
  }

  // First-party official sources for this entity's agency, tried BEFORE the
  // Commons keyword-search failover; each carries real credit + license.
  const agency = resolveIdentity(id)?.agency;
  const primary = await gatherFromSources({
    query: result.query,
    missionId: id,
    agency,
    name: id,
    limit: Math.max(need + 2, 4),
  });
  const commonsTitles = await searchCommons(result.query, Math.min(20, 5 + need * 3));
  result.searchHits = primary.length + commonsTitles.length;

  type Cand = { imageUrl: string; title: string; meta: SourceCandidate | null };
  const candidates: Cand[] = [
    ...primary.map((c) => ({ imageUrl: c.imageUrl, title: c.title, meta: c })),
    ...commonsTitles.map((t) => ({
      imageUrl: `${COMMONS_FILEPATH}/${encodeURIComponent(t)}?width=1600`,
      title: t,
      meta: null as SourceCandidate | null,
    })),
  ];

  // Pick the next available slot number (highest existing + 1).
  let nextSlot = 1;
  for (const slot of existing) {
    const n = parseInt(slot.slice(0, 2), 10);
    if (n >= nextSlot) nextSlot = n + 1;
  }

  let accepted = 0;
  for (const item of candidates) {
    if (accepted >= need) break;
    const cand: CandidateResult['candidates'][number] = { title: item.title, fetched: false };
    result.candidates.push(cand);

    const buf = await fetchImageBytes(item.imageUrl);
    await sleep(item.meta ? 250 : COMMONS_DELAY_MS);
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

    // Quality gate — score-and-reject infographics/diagrams, people,
    // off-subject, and low-quality BEFORE landing (0.7.3).
    const provider = visionProvider();
    if (provider) {
      const slotPath = `/images/${surface}/${id}/${String(nextSlot).padStart(2, '0')}.jpg`;
      const scored = await resolveScoreFromCacheOrProvider({
        imageBytes: baseJpg,
        imagePath: slotPath,
        contextHint: resolveSubject(slotPath, { id }),
        provider,
        denyListExamples: [],
      });
      // Fleet (hardware) galleries reject bare target / off-subject imagery;
      // MISSION galleries KEEP the mission's own science + flyby imagery (the
      // Moon, Earth, planets it photographed). mission = broad, fleet = craft only.
      const reject =
        scored.category === 'diagram'
          ? 'diagram/infographic'
          : scored.category === 'people'
            ? 'people'
            : scored.score < QUALITY_MIN
              ? `low-score-${scored.score}`
              : surface !== 'missions' && scored.subject_match === false
                ? 'off-subject'
                : null;
      if (reject) {
        cand.rejectedByScore = reject;
        console.log(
          `      \u2717 reject ${slotPath} \u2014 ${reject} (${scored.subject.slice(0, 40)})`,
        );
        continue;
      }
    }

    cand.accepted = nextSlot;

    if (!dryRun) {
      try {
        await mkdir(dir, { recursive: true });
        const slotName = String(nextSlot).padStart(2, '0') + '.jpg';
        const oneXoneName = String(nextSlot).padStart(2, '0') + '.1x1.jpg';
        const base = join(dir, slotName);
        const one = join(dir, oneXoneName);
        await writeFile(base, baseJpg);
        const meta = await sharp(baseJpg).metadata();
        const dim = Math.min(meta.width ?? 800, meta.height ?? 800);
        const oneXone = await sharp(baseJpg)
          .resize(dim, dim, { fit: 'cover', position: 'attention' })
          .jpeg({ quality: 88 })
          .toBuffer();
        await writeFile(one, oneXone);
        const urlPath = `/images/${surface}/${id}/${slotName}`;
        cache.phashes[urlPath] = hash;
        if (item.meta) {
          landedProvenance.push({
            path: urlPath,
            source_url: item.meta.sourceUrl,
            image_url: item.meta.imageUrl,
            title: item.meta.title,
            author: item.meta.author,
            license_short: item.meta.license_short,
            license_url: item.meta.license_url,
            source: item.meta.source,
          });
        }
        localCache[urlPath] = hash;
        accepted++;
        nextSlot++;
      } catch {
        cand.accepted = undefined;
      }
    } else {
      accepted++;
      nextSlot++;
    }
  }
  return result;
}

interface Summary {
  surface: string;
  totalEntities: number;
  underTarget: number;
  examined: number;
  acceptedCount: number;
  rejectedByDupe: number;
  fetchFailures: number;
  noSearchHits: number;
}

async function main(): Promise<void> {
  console.log(
    `fill-gallery-gaps — ${dryRun ? 'DRY RUN' : 'APPLY'} (target ${TARGET_SLOTS} slots/gallery)`,
  );
  console.log(`pHash cache: ${Object.keys(cache.phashes).length} entries\n`);

  const results: CandidateResult[] = [];
  const summaries: Record<string, Summary> = {};
  for (const surface of Object.keys(SURFACES)) {
    summaries[surface] = {
      surface,
      totalEntities: 0,
      underTarget: 0,
      examined: 0,
      acceptedCount: 0,
      rejectedByDupe: 0,
      fetchFailures: 0,
      noSearchHits: 0,
    };
  }

  for (const [surface, root] of Object.entries(SURFACES)) {
    if (!existsSync(root)) continue;
    const entities = readdirSync(root).filter((e) => {
      const d = join(root, e);
      try {
        return readdirSync(d).some(isBaseJpg);
      } catch {
        return false;
      }
    });
    summaries[surface].totalEntities = entities.length;
    for (const id of entities.sort()) {
      if (onlyId && id !== onlyId) continue;
      const r = await processEntity(surface, id);
      if (r.currentSlots >= TARGET_SLOTS) continue;
      summaries[surface].underTarget++;
      summaries[surface].examined++;
      if (r.searchHits === 0) summaries[surface].noSearchHits++;
      for (const c of r.candidates) {
        if (c.accepted) summaries[surface].acceptedCount++;
        else if (c.nearDupeOf) summaries[surface].rejectedByDupe++;
        else if (!c.fetched) summaries[surface].fetchFailures++;
      }
      results.push(r);
      const slotChange = r.candidates.filter((c) => c.accepted).length;
      const flag = slotChange > 0 ? '+' : ' ';
      console.log(
        `  ${flag} ${surface}/${id}: ${r.currentSlots} → ${r.currentSlots + slotChange}  ` +
          `(searched "${r.query}" → ${r.searchHits} hits, ${slotChange} accepted, ` +
          `${r.candidates.filter((c) => c.nearDupeOf).length} rejected as dupe)`,
      );
    }
  }

  // Persist cache + report on apply
  console.log('\nSummary:');
  for (const s of Object.values(summaries)) {
    console.log(
      `  ${s.surface.padEnd(18)} under-target ${s.underTarget.toString().padStart(3)}  ` +
        `accepted ${s.acceptedCount.toString().padStart(3)}  ` +
        `rejected ${s.rejectedByDupe.toString().padStart(3)}  ` +
        `fetch-fail ${s.fetchFailures.toString().padStart(3)}  ` +
        `no-hits ${s.noSearchHits.toString().padStart(3)}`,
    );
  }
  const totalAccepted = Object.values(summaries).reduce((a, b) => a + b.acceptedCount, 0);
  const totalRejected = Object.values(summaries).reduce((a, b) => a + b.rejectedByDupe, 0);
  console.log(`\nTotal accepted: ${totalAccepted}   pHash-rejected: ${totalRejected}`);

  if (!dryRun) {
    cache.computed_at = new Date().toISOString();
    cache.phashes = Object.fromEntries(
      Object.entries(cache.phashes).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(PHASH_CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
    console.log(`pHash cache updated: ${Object.keys(cache.phashes).length} entries`);

    // First-party provenance sidecar (real credit/license for landed non-Commons
    // images — build-image-provenance merges this so /credits stays honest).
    if (landedProvenance.length) {
      const SIDECAR = 'static/data/source-fetch-provenance.json';
      let existing: Record<string, unknown>[] = [];
      try {
        existing = JSON.parse(readFileSync(SIDECAR, 'utf-8')) as Record<string, unknown>[];
      } catch {
        /* new file */
      }
      const byPath = new Map(existing.map((e) => [e.path as string, e]));
      for (const e of landedProvenance) byPath.set(e.path as string, e);
      const merged = [...byPath.values()].sort((a, b) =>
        String(a.path).localeCompare(String(b.path)),
      );
      writeFileSync(SIDECAR, JSON.stringify(merged, null, 2) + '\n');
      console.log(`source-fetch provenance: +${landedProvenance.length} (${merged.length} total)`);
    }
  }

  // Write the report markdown
  const lines: string[] = [];
  lines.push('# fill-gallery-gaps — report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${dryRun ? '**DRY RUN — no files changed**' : 'apply'}`);
  lines.push(`Target: ${TARGET_SLOTS} slots per gallery`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(
    '| surface | under-target | accepted | rejected (dupe) | fetch failures | no search hits |',
  );
  lines.push('|---|---|---|---|---|---|');
  for (const s of Object.values(summaries)) {
    lines.push(
      `| ${s.surface} | ${s.underTarget} | ${s.acceptedCount} | ${s.rejectedByDupe} | ${s.fetchFailures} | ${s.noSearchHits} |`,
    );
  }
  lines.push('');
  lines.push('## Per-entity detail');
  lines.push('');
  lines.push('| surface/id | before | after | query | search-hits | accepted | rejected-dupe |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of results) {
    const slotChange = r.candidates.filter((c) => c.accepted).length;
    const dupes = r.candidates.filter((c) => c.nearDupeOf).length;
    lines.push(
      `| ${r.surface}/${r.id} | ${r.currentSlots} | ${r.currentSlots + slotChange} | ${r.query} | ${r.searchHits} | ${slotChange} | ${dupes} |`,
    );
  }
  writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
  console.log(`Report: ${REPORT_PATH}`);
}

void main();
