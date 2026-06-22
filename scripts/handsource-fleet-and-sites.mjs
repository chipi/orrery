#!/usr/bin/env node
/**
 * handsource-fleet-and-sites — combined sourcing pass for the gaps
 * surfaced by the audits:
 *   - 15 fleet entries with hero < 30KB
 *   - 7 site gaps from audit-site-imagery (HAND_SOURCE)
 *
 * Proposals appended to slice-a-salvage-result.json with `hs-` prefix
 * so they appear in /dev/slice-a-review?dataset=slice-a. Marko reviews;
 * slice-a-apply applies approved.
 *
 * Run: node --env-file=.env scripts/handsource-fleet-and-sites.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_PER_TARGET = 2;
const MIN_BYTES = 100_000;
const MAX_BYTES = 25_000_000;

const TARGETS = [
  { surface: 'fleet-galleries', id: 'tiangong', agency: 'CNSA',
    subject: 'Tiangong space station (Chinese modular station in low Earth orbit)',
    queries: ['Tiangong space station CMS', 'Tiangong Chinese modular station'] },
  { surface: 'fleet-galleries', id: 'atv', agency: 'ESA',
    subject: 'ESA Automated Transfer Vehicle (ATV) ISS resupply spacecraft',
    queries: ['ATV Automated Transfer Vehicle ESA', 'Jules Verne ATV'] },
  { surface: 'fleet-galleries', id: 'juno', agency: 'NASA',
    subject: 'NASA Juno spacecraft orbiting Jupiter',
    queries: ['Juno spacecraft NASA Jupiter', 'Juno probe Jupiter polar orbit'] },
  { surface: 'fleet-galleries', id: 'mars-polar-lander', agency: 'NASA',
    subject: 'Mars Polar Lander (1999) NASA spacecraft',
    queries: ['Mars Polar Lander NASA 1999', 'Mars Polar Lander spacecraft'] },
  { surface: 'fleet-galleries', id: 'opportunity', agency: 'NASA',
    subject: 'Opportunity Mars Exploration Rover (MER-B)',
    queries: ['Opportunity rover Mars MER-B', 'Opportunity Mars Exploration Rover NASA'] },
  { surface: 'fleet-galleries', id: 'baikonur-200', agency: 'Roscosmos',
    subject: 'Baikonur Cosmodrome Site 200 launch complex',
    queries: ['Baikonur Cosmodrome Site 200', 'Baikonur Pad 39 Proton'] },
  { surface: 'fleet-galleries', id: 'starliner', agency: 'Boeing',
    subject: 'Boeing CST-100 Starliner crew spacecraft',
    queries: ['Boeing Starliner CST-100', 'Starliner crew capsule'] },
  { surface: 'fleet-galleries', id: 'vostok-6', agency: 'Roscosmos',
    subject: 'Vostok 6 spacecraft (1963)',
    queries: ['Vostok 6 spacecraft', 'Vostok capsule Soviet'] },
  { surface: 'fleet-galleries', id: 'vostok-5', agency: 'Roscosmos',
    subject: 'Vostok 5 spacecraft (1963)',
    queries: ['Vostok 5 spacecraft', 'Vostok capsule Soviet'] },
  { surface: 'fleet-galleries', id: 'phobos-2', agency: 'Roscosmos',
    subject: 'Phobos 2 Soviet Mars mission spacecraft',
    queries: ['Phobos 2 spacecraft Soviet Mars', 'Phobos programme spacecraft'] },
  { surface: 'fleet-galleries', id: 'chandra', agency: 'NASA',
    subject: 'NASA Chandra X-ray Observatory satellite',
    queries: ['Chandra X-ray Observatory NASA', 'Chandra satellite STS-93'] },
  { surface: 'fleet-galleries', id: 'change-2', agency: 'CNSA',
    subject: "Chang'e 2 Chinese lunar orbiter",
    queries: ["Chang'e 2 spacecraft CNSA", 'Change 2 Chinese lunar probe'] },
  { surface: 'fleet-galleries', id: 'change-3', agency: 'CNSA',
    subject: "Chang'e 3 lunar lander with Yutu rover",
    queries: ["Chang'e 3 lander Yutu rover", 'Change 3 Chinese lunar lander'] },
  { surface: 'fleet-galleries', id: 'change-4', agency: 'CNSA',
    subject: "Chang'e 4 farside lunar lander mission",
    queries: ["Chang'e 4 farside lunar lander", 'Change 4 Yutu-2 rover'] },
  { surface: 'fleet-galleries', id: 'insight', agency: 'NASA',
    subject: 'InSight Mars lander',
    queries: ['InSight Mars lander NASA seismometer', 'InSight spacecraft Elysium Planitia'] },
  { surface: 'moon-sites', id: 'luna17', agency: 'Roscosmos',
    subject: 'Luna 17 / Lunokhod 1 (first lunar rover, 1970)',
    queries: ['Lunokhod 1 lunar rover', 'Luna 17 Soviet lunar mission'] },
  { surface: 'moon-sites', id: 'apollo16', agency: 'NASA',
    subject: 'Apollo 16 lunar landing site (Descartes Highlands, 1972)',
    queries: ['Apollo 16 Descartes Highlands LM', 'Apollo 16 surface Young Duke'] },
  { surface: 'moon-sites', id: 'change4', agency: 'CNSA',
    subject: "Chang'e 4 farside landing site / Yutu-2 rover",
    queries: ["Chang'e 4 Yutu-2 farside surface", "Chang'e 4 Von Karman crater"] },
  { surface: 'mars-sites', id: 'mars2', agency: 'Roscosmos',
    subject: 'Mars 2 Soviet lander (1971)',
    queries: ['Mars 2 spacecraft Soviet 1971', 'Mars 2 orbiter and lander'] },
  { surface: 'mars-sites', id: 'mars6', agency: 'Roscosmos',
    subject: 'Mars 6 Soviet lander (1973)',
    queries: ['Mars 6 Soviet lander 1973', 'Mars programme 6 spacecraft'] },
  { surface: 'mars-sites', id: 'phoenix', agency: 'NASA',
    subject: 'Phoenix Mars lander (2008) on the Martian surface',
    queries: ['Phoenix Mars lander NASA 2008', 'Phoenix Mars Scout lander surface'] },
  { surface: 'mars-sites', id: 'perseverance', agency: 'NASA',
    subject: 'Perseverance Mars rover at Jezero crater',
    queries: ['Perseverance rover Mars Jezero', 'Mars 2020 rover surface'] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    return {
      size: info.size,
      license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
      credit: strip(meta.Credit?.value ?? meta.Artist?.value ?? ''),
    };
  } catch { return null; }
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
    if (v.verdict !== 'related' || (v.confidence ?? 0) < 0.85) continue;
    proposals.push({
      proposal_id: `hs-${t.surface}-${t.id}-${String(kept + 1).padStart(2, '0')}`,
      agency: t.agency,
      surface: t.surface,
      missionId: t.id,
      slot: '01',
      query: c.query,
      currentSource: 'on-disk-weak',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: imageUrl(c.file),
        source_url: sourceUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: { commons_file: c.file },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`handsource — ${t.subject}`],
    });
    kept++;
  }
  return { target: t, proposals, candidateCount: candidates.length };
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '300', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const allProposals = [];
  for (const t of TARGETS) {
    console.log(`\n[${t.surface}/${t.id}]`);
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
  existing.stats.handsource_appended_at = new Date().toISOString();
  existing.stats.handsource_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
