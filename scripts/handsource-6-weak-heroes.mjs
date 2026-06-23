#!/usr/bin/env node
/**
 * handsource-6-weak-heroes — focused candidate pass for the 6 fleet
 * entries with sub-30KB hero images flagged by audit-fleet-weak-
 * heroes.mjs (2026-06-23 release-prep review).
 *
 * Same Commons-search + vision-judge pattern as
 * handsource-fleet-and-sites.mjs, but scoped to exactly these 6.
 * Proposals appear in /dev/slice-a-review under hs-* ids.
 *
 * Run: set -a; source .env; set +a; node --env-file=.env scripts/handsource-6-weak-heroes.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_PER_TARGET = 3;
const MIN_BYTES = 80_000;
const MAX_BYTES = 25_000_000;

const TARGETS = [
  {
    id: 'beresheet',
    agency: 'SpaceIL',
    subject: 'Beresheet — Israeli lunar lander (2019, SpaceIL)',
    queries: ['Beresheet lunar lander SpaceIL', 'Beresheet spacecraft'],
  },
  {
    id: 'salyut-5',
    agency: 'Roscosmos',
    subject: 'Salyut 5 Soviet military space station (Almaz programme, 1976-1977)',
    queries: ['Salyut 5 space station', 'Almaz OPS Soviet military station'],
  },
  {
    id: 'juno',
    agency: 'NASA',
    subject: 'NASA Juno spacecraft in polar orbit around Jupiter',
    queries: ['Juno spacecraft NASA Jupiter', 'Juno probe Jupiter polar orbit'],
  },
  {
    id: 'mars6',
    agency: 'Roscosmos',
    subject: 'Mars 6 Soviet Mars lander (1973) — first atmospheric data from Mars',
    queries: ['Mars 6 Soviet spacecraft 1973', 'Mars programme 6 lander', 'Марс-6'],
  },
  {
    id: 'sbirs-heo',
    agency: 'NASA',
    subject: 'SBIRS HEO missile-warning satellite (USSF / formerly USAF)',
    queries: ['SBIRS HEO satellite', 'Space-Based Infrared System satellite'],
  },
  {
    id: 'viking-1',
    agency: 'NASA',
    subject: 'Viking 1 spacecraft (1975) — first successful Mars lander + orbiter',
    queries: ['Viking 1 spacecraft NASA', 'Viking 1 Mars lander orbiter'],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '15',
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
const sourceUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function processTarget(t, budget) {
  const seen = new Set();
  const candidates = [];
  for (const q of t.queries) {
    const files = await commonsSearch(q);
    await sleep(SCRAPE_THROTTLE_MS);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
  }
  const proposals = [];
  let kept = 0;
  for (const c of candidates) {
    if (kept >= KEEP_PER_TARGET) break;
    if (budget.calls >= budget.cap) break;
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info) continue;
    if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) continue;
    const v = await judgeImage({
      imageUrl: imageUrl(c.file),
      missionId: t.id,
      agency: t.agency,
      subjectDescription: t.subject,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    if (v.verdict !== 'related' || (v.confidence ?? 0) < 0.8) continue;
    proposals.push({
      proposal_id: `hs6-fleet-galleries-${t.id}-${String(kept + 1).padStart(2, '0')}`,
      agency: t.agency,
      surface: 'fleet-galleries',
      missionId: t.id,
      slot: '01',
      query: c.query,
      currentSource: 'on-disk-weak-sub30kb',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: imageUrl(c.file),
        source_url: sourceUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: { commons_file: c.file, sourcing_round: '6-weak-heroes-2026-06-23' },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`6-weak-heroes — ${t.subject}`],
    });
    kept++;
  }
  return { target: t, proposals, candidateCount: candidates.length };
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '150', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const allProposals = [];
  for (const t of TARGETS) {
    console.log(`\n[${t.id}]`);
    const r = await processTarget(t, budget);
    console.log(`  ${r.candidateCount} candidates → ${r.proposals.length} survivors`);
    allProposals.push(...r.proposals);
  }
  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = allProposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_6_weak_appended_at = new Date().toISOString();
  existing.stats.handsource_6_weak_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hs6-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
