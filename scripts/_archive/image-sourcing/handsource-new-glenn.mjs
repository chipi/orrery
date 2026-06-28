#!/usr/bin/env node
/**
 * handsource-new-glenn — full re-source for the New Glenn fleet entry
 * (2026-06-23 Marko: "new glenn does not have any single good image,
 * all non-space images, complete re-source required").
 *
 * Pulls fresh candidates from Wikimedia Commons via several targeted
 * queries (debut NG-1 launch Jan 2025, second-stage on-pad, factory).
 * Loose vision-judge threshold (0.7) since rocket photos are visually
 * unambiguous. Surfaces 5+ candidates per slot in /dev/slice-a-review
 * under `hsng-*` proposal ids.
 *
 * Run: set -a; source .env; set +a; node scripts/handsource-new-glenn.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_TOTAL = 10; // generous — Marko picks the best 5 in review
const MIN_BYTES = 80_000;
const MAX_BYTES = 25_000_000;
const VISION_MIN_CONF = 0.7;

const QUERIES = [
  'New Glenn rocket Blue Origin',
  'New Glenn NG-1 launch January 2025',
  'New Glenn BE-4 engines',
  'New Glenn rocket pad LC-36',
  'New Glenn first stage Cape Canaveral',
  'Blue Origin New Glenn rollout',
];

const SUBJECT =
  'New Glenn heavy-lift rocket by Blue Origin (BE-4 engines, debut NG-1 launch January 2025 from LC-36, reusable first stage)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '20',
    origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const j = await res.json();
    return (j?.query?.search ?? [])
      .map((h) => h.title.replace(/^File:/, ''))
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
  } catch {
    return [];
  }
}

async function commonsImageInfo(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${filename}`,
    prop: 'imageinfo',
    iiprop: 'size|extmetadata',
    origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const page = Object.values((await res.json())?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata ?? {};
    const strip = (s) =>
      String(s)
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
    return {
      size: info.size,
      license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
      credit: strip(meta.Credit?.value ?? meta.Artist?.value ?? ''),
    };
  } catch {
    return null;
  }
}

const imageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const sourceUrl = (f) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '80', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();

  const seen = new Set();
  const candidates = [];
  for (const q of QUERIES) {
    const files = await commonsSearch(q);
    await sleep(SCRAPE_THROTTLE_MS);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
  }
  console.log(`Found ${candidates.length} raw candidates across ${QUERIES.length} queries`);

  const proposals = [];
  let kept = 0;
  for (const c of candidates) {
    if (kept >= KEEP_TOTAL) break;
    if (budget.calls >= budget.cap) break;
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info) continue;
    if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) continue;
    const v = await judgeImage({
      imageUrl: imageUrl(c.file),
      missionId: 'new-glenn',
      agency: 'Blue Origin',
      subjectDescription: SUBJECT,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    if (v.verdict !== 'related' || (v.confidence ?? 0) < VISION_MIN_CONF) continue;
    // Round-robin across slots 01..05 so the review surface paints one
    // candidate per slot first, then loops back for spares.
    const slot = String((kept % 5) + 1).padStart(2, '0');
    proposals.push({
      proposal_id: `hsng-fleet-galleries-new-glenn-${String(kept + 1).padStart(2, '0')}`,
      agency: 'Blue Origin',
      surface: 'fleet-galleries',
      missionId: 'new-glenn',
      slot,
      query: c.query,
      currentSource: 'on-disk-non-space',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: imageUrl(c.file),
        source_url: sourceUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: {
          commons_file: c.file,
          sourcing_round: 'new-glenn-full-resource-2026-06-23',
        },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`new-glenn full re-source — ${SUBJECT}`],
    });
    kept++;
  }
  console.log(`Kept ${proposals.length} survivors after vision-judge`);

  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = proposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_new_glenn_appended_at = new Date().toISOString();
  existing.stats.handsource_new_glenn_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hsng-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
