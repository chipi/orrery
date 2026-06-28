#!/usr/bin/env node
/**
 * handsource-try-harder — second pass on the 6 zero-survivor entries
 * from handsource-fleet-and-sites:
 *   fleet: baikonur-200, vostok-5, vostok-6, change-2, mars6
 *   sites: change4
 *
 * Three new tactics on top of the round-1 approach:
 *   1. Wikipedia infobox-image fallback — for any mission with an EN
 *      Wikipedia article, the article's lead image is the
 *      editorially-chosen canonical visualisation. Almost always CC
 *      and resolves via Commons under the hood.
 *   2. Broader query variants — English + Cyrillic / Pinyin / Chinese
 *      transliterations + alternate mission names.
 *   3. Relaxed thresholds — MIN_BYTES 40KB (was 100KB; these missions
 *      have inherently lower-res canonical imagery), vision conf 0.75
 *      (was 0.85; allow more lenient mission-match for niche subjects).
 *
 * Output: `hs2-*` proposals appended to slice-a-salvage-result.json.
 *
 * Run: node --env-file=.env scripts/handsource-try-harder.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_PER_TARGET = 2;
const MIN_BYTES = 40_000; // relaxed from 100KB
const MAX_BYTES = 25_000_000;
const VISION_MIN_CONF = 0.75; // relaxed from 0.85

const TARGETS = [
  {
    surface: 'fleet-galleries',
    id: 'baikonur-200',
    agency: 'Roscosmos',
    subject: 'Baikonur Cosmodrome Site 200 launch complex (Proton-K / Proton-M launches)',
    wiki: 'Baikonur_Cosmodrome_Site_200',
    queries: [
      'Baikonur Cosmodrome Site 200',
      'Baikonur Pad 200 Proton',
      'LC-200 Baikonur Proton launch',
      'Площадка 200 Байконур',
    ],
  },
  {
    surface: 'fleet-galleries',
    id: 'vostok-5',
    agency: 'Roscosmos',
    subject: 'Vostok 5 spacecraft (Valery Bykovsky 1963)',
    wiki: 'Vostok_5',
    queries: [
      'Vostok 5 spacecraft',
      'Bykovsky Vostok 1963',
      'Vostok 5 Bykovsky',
      'Восток-5 космический корабль',
    ],
  },
  {
    surface: 'fleet-galleries',
    id: 'vostok-6',
    agency: 'Roscosmos',
    subject: 'Vostok 6 spacecraft (Valentina Tereshkova 1963 — first woman in space)',
    wiki: 'Vostok_6',
    queries: [
      'Vostok 6 spacecraft',
      'Tereshkova Vostok 1963',
      'Vostok 6 Tereshkova',
      'Восток-6 космический корабль',
    ],
  },
  {
    surface: 'fleet-galleries',
    id: 'change-2',
    agency: 'CNSA',
    subject: "Chang'e 2 Chinese lunar orbiter (2010)",
    wiki: 'Chang%27e_2',
    queries: [
      "Chang'e 2 lunar orbiter CNSA",
      'Change 2 spacecraft',
      '嫦娥二号',
      'Chang-e 2 lunar probe',
    ],
  },
  {
    surface: 'moon-sites',
    id: 'change4',
    agency: 'CNSA',
    subject: "Chang'e 4 farside landing / Yutu-2 rover at Von Karman crater",
    wiki: 'Chang%27e_4',
    queries: [
      "Chang'e 4 lander Von Karman",
      'Yutu-2 rover farside lunar',
      '嫦娥四号 着陆',
      'Chang-e 4 farside Moon',
    ],
  },
  {
    surface: 'mars-sites',
    id: 'mars6',
    agency: 'Roscosmos',
    subject: 'Mars 6 Soviet lander (1973) — first to transmit during Mars atmospheric descent',
    wiki: 'Mars_6',
    queries: [
      'Mars 6 Soviet lander 1973',
      'Mars programme 6 spacecraft',
      'Марс-6 космический аппарат',
      'Mars-6 USSR Mars probe',
    ],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikipediaLeadImage(slug) {
  try {
    const res = await fetch(`${WIKI_API}/${slug}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const j = await res.json();
    const url = j?.originalimage?.source ?? j?.thumbnail?.source ?? null;
    if (!url) return null;
    // Extract Commons filename if upload.wikimedia.org pattern
    const m = url.match(/\/(?:thumb\/)?[a-f0-9]\/[a-f0-9]{2}\/([^/?]+)/);
    return { url, filename: m ? decodeURIComponent(m[1]) : null };
  } catch {
    return null;
  }
}

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

const commonsImageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const commonsFilePageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function processTarget(t, budget) {
  const candidates = [];
  const seen = new Set();

  // Tactic 1: Wikipedia infobox image (highest priority)
  if (t.wiki) {
    const wp = await wikipediaLeadImage(t.wiki);
    if (wp && wp.filename) {
      if (!seen.has(wp.filename)) {
        seen.add(wp.filename);
        candidates.push({ file: wp.filename, query: `wikipedia:${t.wiki}` });
      }
    }
    await sleep(SCRAPE_THROTTLE_MS);
  }

  // Tactic 2: Commons searches across all query variants
  for (const q of t.queries) {
    const files = await commonsSearch(q);
    await sleep(SCRAPE_THROTTLE_MS);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
  }

  console.log(
    `  ${candidates.length} candidates (incl wiki: ${candidates[0]?.query?.startsWith('wikipedia:') ? 'Y' : 'N'})`,
  );

  const proposals = [];
  let kept = 0;
  for (const c of candidates) {
    if (kept >= KEEP_PER_TARGET) break;
    if (budget.calls >= budget.cap) break;
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info) continue;
    if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) {
      // surface the why for the log
      // console.log(`   size-skip ${c.file.slice(0,50)} ${(info.size/1024).toFixed(0)}KB`);
      continue;
    }
    const v = await judgeImage({
      imageUrl: commonsImageUrl(c.file),
      missionId: t.id,
      agency: t.agency,
      subjectDescription: t.subject,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    if (v.verdict !== 'related' || (v.confidence ?? 0) < VISION_MIN_CONF) continue;
    proposals.push({
      proposal_id: `hs2-${t.surface}-${t.id}-${String(kept + 1).padStart(2, '0')}`,
      agency: t.agency,
      surface: t.surface,
      missionId: t.id,
      slot: '01',
      query: c.query,
      currentSource: 'on-disk-weak',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: commonsImageUrl(c.file),
        source_url: commonsFilePageUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: { commons_file: c.file, sourcing_round: 'try-harder' },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`try-harder — ${t.subject}`],
    });
    kept++;
  }
  return { target: t, proposals, candidateCount: candidates.length };
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '200', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const allProposals = [];
  for (const t of TARGETS) {
    console.log(`\n[${t.surface}/${t.id}]`);
    const r = await processTarget(t, budget);
    console.log(`  ${r.proposals.length} survivors`);
    allProposals.push(...r.proposals);
  }
  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = allProposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_try_harder_appended_at = new Date().toISOString();
  existing.stats.handsource_try_harder_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hs2-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
