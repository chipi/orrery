#!/usr/bin/env node
/**
 * handsource-native-wiki — third pass for the 5 still-empty entries
 * after handsource-try-harder. Uses LANGUAGE-NATIVE Wikipedia
 * editions whose editors curate the canonical visualisation for
 * Soviet / Chinese missions better than the EN article does.
 *
 *   ru.wikipedia.org → vostok-5 (Восток-5), vostok-6 (Восток-6),
 *                      mars6 (Марс-6)
 *   zh.wikipedia.org → change-2 (嫦娥二号), change4 (嫦娥四号)
 *
 * Same KEEP + relaxed-threshold logic as try-harder. Appends as
 * `hs3-*` proposals.
 *
 * Run: node --env-file=.env scripts/handsource-native-wiki.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_PER_TARGET = 2;
const MIN_BYTES = 40_000;
const MAX_BYTES = 25_000_000;
const VISION_MIN_CONF = 0.7; // very relaxed for niche subjects

// `wiki` entries are [language, slug] pairs. Multiple → try all.
const TARGETS = [
  {
    surface: 'fleet-galleries',
    id: 'vostok-5',
    agency: 'Roscosmos',
    subject: 'Vostok 5 spacecraft (Valery Bykovsky 1963)',
    wikis: [
      ['en', 'Vostok_5'],
      ['ru', 'Восток-5'],
    ],
  },
  {
    surface: 'fleet-galleries',
    id: 'vostok-6',
    agency: 'Roscosmos',
    subject: 'Vostok 6 spacecraft (Valentina Tereshkova 1963)',
    wikis: [
      ['en', 'Vostok_6'],
      ['ru', 'Восток-6'],
    ],
  },
  {
    surface: 'fleet-galleries',
    id: 'change-2',
    agency: 'CNSA',
    subject: "Chang'e 2 Chinese lunar orbiter (2010)",
    wikis: [
      ['en', "Chang'e_2"],
      ['zh', '嫦娥二号'],
    ],
  },
  {
    surface: 'moon-sites',
    id: 'change4',
    agency: 'CNSA',
    subject: "Chang'e 4 farside landing / Yutu-2 rover",
    wikis: [
      ['en', "Chang'e_4"],
      ['zh', '嫦娥四号'],
    ],
  },
  {
    surface: 'mars-sites',
    id: 'mars6',
    agency: 'Roscosmos',
    subject: 'Mars 6 Soviet lander (1973)',
    wikis: [
      ['en', 'Mars_6'],
      ['ru', 'Марс-6'],
    ],
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wikipediaLeadImageFiles(lang, slug) {
  // Use the action=query images endpoint (lists ALL images on the page,
  // not just the lead). For niche subjects the lead may not be the
  // best fit; collecting all images + filtering gives more candidates.
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: slug,
    prop: 'images',
    imlimit: '20',
    origin: '*',
  });
  try {
    const res = await fetch(`${base}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const j = await res.json();
    const page = Object.values(j?.query?.pages ?? {})[0];
    const images = page?.images ?? [];
    return images
      .map((img) => img.title.replace(/^File:/, ''))
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .filter((f) => !/icon|flag|logo|stub|symbol|coat[_\s-]of[_\s-]arms/i.test(f));
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
  const seen = new Set();
  const candidates = [];
  for (const [lang, slug] of t.wikis) {
    const files = await wikipediaLeadImageFiles(lang, slug);
    console.log(`  ${lang}.wiki/${slug}: ${files.length} image files`);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: `${lang}.wikipedia.org:${slug}` });
    }
    await sleep(SCRAPE_THROTTLE_MS);
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
      imageUrl: commonsImageUrl(c.file),
      missionId: t.id,
      agency: t.agency,
      subjectDescription: t.subject,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    if (v.verdict !== 'related' || (v.confidence ?? 0) < VISION_MIN_CONF) continue;
    proposals.push({
      proposal_id: `hs3-${t.surface}-${t.id}-${String(kept + 1).padStart(2, '0')}`,
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
        metadata: { commons_file: c.file, sourcing_round: 'native-wiki' },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`native-wiki — ${t.subject}`],
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
    console.log(`\n[${t.surface}/${t.id}]`);
    const r = await processTarget(t, budget);
    console.log(`  → ${r.proposals.length} survivors`);
    allProposals.push(...r.proposals);
  }
  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = allProposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_native_wiki_appended_at = new Date().toISOString();
  existing.stats.handsource_native_wiki_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hs3-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
