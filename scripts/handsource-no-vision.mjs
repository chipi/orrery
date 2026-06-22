#!/usr/bin/env node
/**
 * handsource-no-vision — fourth pass for vostok-5/6, change-2, change4,
 * mars6. Bypasses vision-judge — for these mission-niches Commons has
 * mostly museum mockups / cosmonaut portraits / mission patches that
 * the strict mission prompt correctly rejects, but Marko's editorial
 * eye can pick the right one. Surfaces 3-5 candidates per target sorted
 * by file size descending.
 *
 * Pulls from BOTH Commons search + native-language Wikipedia
 * (ru / zh) for each target. Output: `hs4-*` proposals in the UI.
 *
 * Run: node --env-file=.env scripts/handsource-no-vision.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const KEEP_PER_TARGET = 5; // wider because no vision-judge filter
const MIN_BYTES = 40_000;
const MAX_BYTES = 25_000_000;

const TARGETS = [
  {
    surface: 'fleet-galleries', id: 'vostok-5', agency: 'Roscosmos',
    subject: 'Vostok 5 spacecraft / mission (Bykovsky 1963)',
    wikis: [['en', 'Vostok_5'], ['ru', 'Восток-5']],
    commons_queries: ['Vostok 5 spacecraft', 'Vostok 5 capsule'],
  },
  {
    surface: 'fleet-galleries', id: 'vostok-6', agency: 'Roscosmos',
    subject: 'Vostok 6 spacecraft / mission (Tereshkova 1963)',
    wikis: [['en', 'Vostok_6'], ['ru', 'Восток-6']],
    commons_queries: ['Vostok 6 spacecraft', 'Vostok 6 capsule Tereshkova'],
  },
  {
    surface: 'fleet-galleries', id: 'change-2', agency: 'CNSA',
    subject: "Chang'e 2 Chinese lunar orbiter (2010)",
    wikis: [['en', "Chang'e_2"], ['zh', '嫦娥二号']],
    commons_queries: ["Chang'e 2 spacecraft", 'Change 2 lunar orbiter'],
  },
  {
    surface: 'moon-sites', id: 'change4', agency: 'CNSA',
    subject: "Chang'e 4 farside landing / Yutu-2",
    wikis: [['en', "Chang'e_4"], ['zh', '嫦娥四号']],
    commons_queries: ["Chang'e 4 lander Yutu-2", "Chang'e 4 Von Karman"],
  },
  {
    surface: 'mars-sites', id: 'mars6', agency: 'Roscosmos',
    subject: 'Mars 6 Soviet lander (1973)',
    wikis: [['en', 'Mars_6'], ['ru', 'Марс-6']],
    commons_queries: ['Mars 6 Soviet lander', 'Mars programme 6'],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikiImages(lang, slug) {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query', format: 'json',
    titles: slug, prop: 'images', imlimit: '20', origin: '*',
  });
  try {
    const res = await fetch(`${base}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const j = await res.json();
    const page = Object.values(j?.query?.pages ?? {})[0];
    return (page?.images ?? [])
      .map((i) => i.title.replace(/^File:/, ''))
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .filter((f) => !/icon|flag|logo|symbol|coat[_\s-]of[_\s-]arms|\.svg/i.test(f));
  } catch { return []; }
}

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', list: 'search',
    srsearch: `${query} filetype:bitmap`, srnamespace: '6', srlimit: '20', origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const j = await res.json();
    return (j?.query?.search ?? [])
      .map((h) => h.title.replace(/^File:/, ''))
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
  } catch { return []; }
}

async function commonsImageInfo(filename) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', titles: `File:${filename}`,
    prop: 'imageinfo', iiprop: 'size|extmetadata', origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const page = Object.values((await res.json())?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata ?? {};
    const strip = (s) =>
      String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    return {
      size: info.size,
      license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
      credit: strip(meta.Credit?.value ?? meta.Artist?.value ?? ''),
    };
  } catch { return null; }
}

const commonsImageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const commonsFilePageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function processTarget(t) {
  const seen = new Set();
  const candidates = [];
  for (const [lang, slug] of t.wikis) {
    const files = await wikiImages(lang, slug);
    for (const f of files) {
      if (!seen.has(f)) { seen.add(f); candidates.push({ file: f, query: `${lang}.wiki/${slug}` }); }
    }
    await sleep(SCRAPE_THROTTLE_MS);
  }
  for (const q of t.commons_queries) {
    const files = await commonsSearch(q);
    for (const f of files) {
      if (!seen.has(f)) { seen.add(f); candidates.push({ file: f, query: `commons:${q}` }); }
    }
    await sleep(SCRAPE_THROTTLE_MS);
  }
  console.log(`  ${candidates.length} raw candidates`);

  // Enrich + size-filter all
  const enriched = [];
  for (const c of candidates) {
    const info = await commonsImageInfo(c.file);
    await sleep(SCRAPE_THROTTLE_MS);
    if (!info) continue;
    if (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES)) continue;
    enriched.push({ ...c, info });
  }
  console.log(`  ${enriched.length} after size-filter`);

  // Sort by size desc + take top KEEP_PER_TARGET
  enriched.sort((a, b) => (b.info.size ?? 0) - (a.info.size ?? 0));
  const picks = enriched.slice(0, KEEP_PER_TARGET);

  return picks.map((p, i) => ({
    proposal_id: `hs4-${t.surface}-${t.id}-${String(i + 1).padStart(2, '0')}`,
    agency: t.agency,
    surface: t.surface,
    missionId: t.id,
    slot: '01',
    query: p.query,
    currentSource: 'on-disk-weak',
    proposed: {
      tier: 1,
      source_type: 'wikimedia-commons',
      image_url: commonsImageUrl(p.file),
      source_url: commonsFilePageUrl(p.file),
      credit: p.info.credit,
      license: p.info.license,
      metadata: { commons_file: p.file, sourcing_round: 'no-vision' },
    },
    size_bytes: p.info.size,
    vision_v3: null,
    survivor: true,
    drop_reasons: [],
    notes: [`no-vision — ${t.subject}. Marko picks visually.`],
  }));
}

async function main() {
  const allProposals = [];
  for (const t of TARGETS) {
    console.log(`\n[${t.surface}/${t.id}]`);
    const props = await processTarget(t);
    console.log(`  → ${props.length} candidates surfaced`);
    allProposals.push(...props);
  }
  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = allProposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_no_vision_appended_at = new Date().toISOString();
  existing.stats.handsource_no_vision_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  console.log(`\n✓ appended ${newOnly.length} hs4-* proposals (no vision filter — Marko eyeball picks)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
