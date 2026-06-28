#!/usr/bin/env node
/**
 * handsource-full-resource — full re-source for fleet entries Marko
 * flagged as "0 good photos, all need replacement" during the 2026-
 * 06-23 review session.
 *
 * Generalises handsource-new-glenn.mjs to a list of targets so adding
 * a new "complete re-source" entry is just appending to the TARGETS
 * array.
 *
 * Pulls fresh candidates from Wikimedia Commons via several targeted
 * queries per target. Loose vision-judge threshold (0.7) since
 * spacecraft photos are visually unambiguous. Surfaces ~10 candidates
 * per target in /dev/slice-a-review under `hsfr-*` proposal ids
 * (round-robin'd across slots 01..05 so each slot has multiple picks).
 *
 * Run: set -a; source .env; set +a; node scripts/handsource-full-resource.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_PER_TARGET = 10;
const MIN_BYTES = 80_000;
const MAX_BYTES = 25_000_000;
const VISION_MIN_CONF = 0.7;

const TARGETS = [
  {
    id: 'new-glenn',
    agency: 'Blue Origin',
    subject:
      'New Glenn heavy-lift rocket by Blue Origin (BE-4 engines, debut NG-1 launch January 2025 from LC-36, reusable first stage)',
    queries: [
      'New Glenn rocket Blue Origin',
      'New Glenn NG-1 launch January 2025',
      'New Glenn BE-4 engines',
      'New Glenn rocket pad LC-36',
      'New Glenn first stage Cape Canaveral',
      'Blue Origin New Glenn rollout',
    ],
  },
  {
    id: 'ariane-6',
    agency: 'ESA',
    subject:
      'Ariane 6 launch vehicle (ESA / ArianeGroup; debut flight July 2024 from Kourou; cryogenic Vulcain 2.1 main stage + Vinci upper-stage, 2-4 solid boosters)',
    queries: [
      'Ariane 6 rocket ESA',
      'Ariane 6 maiden flight 2024',
      'Ariane 6 Kourou launch pad',
      'Ariane 6 ELA-4 Guiana Space Centre',
      'Ariane 6 P120C solid booster',
      'Vulcain 2.1 Ariane 6 engine',
    ],
  },
  {
    id: 'vulcan',
    agency: 'NASA',
    subject:
      'Vulcan Centaur rocket (United Launch Alliance, ULA; BE-4 engines on the main stage + Centaur V cryogenic upper stage; debut Cert-1 launch January 2024 from SLC-41 Cape Canaveral)',
    queries: [
      'Vulcan Centaur rocket ULA',
      'Vulcan Centaur Cert-1 launch January 2024',
      'Vulcan rocket SLC-41 Cape Canaveral',
      'ULA Vulcan BE-4 engines',
      'Centaur V upper stage Vulcan',
      'Vulcan rocket Peregrine Astrobotic',
    ],
  },
  {
    id: 'starship',
    agency: 'SpaceX',
    subject:
      'SpaceX Starship — fully-reusable super-heavy launch vehicle (Super Heavy booster + Starship upper stage with Raptor engines; integrated flight tests from Boca Chica / Starbase Texas, 2023-2025)',
    queries: [
      'SpaceX Starship rocket',
      'SpaceX Starship integrated flight test',
      'Starship Super Heavy booster',
      'Starship Boca Chica launch',
      'SpaceX Starbase Texas',
      'Starship Raptor engines',
    ],
  },
  // DART handled via mission-folder reuse (scripts/copy-mission-to-fleet.mjs);
  // not queued here.
  {
    id: 'jwst',
    agency: 'NASA',
    subject:
      'James Webb Space Telescope (JWST) — NASA/ESA/CSA infrared observatory at Sun-Earth L2, 6.5 m segmented primary mirror under a 5-layer sunshield; launched 2021-12-25 on Ariane 5',
    queries: [
      'James Webb Space Telescope',
      'JWST spacecraft NASA',
      'JWST mirror unfolding',
      'James Webb deployment L2',
      'JWST sunshield deployment',
      'Webb telescope Ariane 5 launch',
    ],
  },
  {
    id: 'new-shepard',
    agency: 'Blue Origin',
    subject:
      'Blue Origin New Shepard — single-stage suborbital reusable rocket + crew capsule; vertical-takeoff / vertical-landing, BE-3 engine; West Texas launch site',
    queries: [
      'Blue Origin New Shepard rocket',
      'New Shepard launch West Texas',
      'New Shepard capsule landing',
      'New Shepard crew capsule',
      'BE-3 engine New Shepard',
    ],
  },
  {
    id: 'hope',
    agency: 'UAESA',
    subject:
      'Emirates Mars Mission Hope (Al Amal) — UAE Mars orbiter studying Martian atmosphere from a 20,000-43,000 km elliptical orbit; arrived Mars 2021-02-09',
    queries: [
      'Hope Mars Mission UAE',
      'Emirates Mars Mission spacecraft',
      'Al Amal probe Mars',
      'UAE Hope probe Mars orbit',
      'Hope Mars Mission MBRSC',
    ],
  },
  {
    id: 'solar-orbiter',
    agency: 'ESA',
    subject:
      'Solar Orbiter — ESA + NASA spacecraft studying the Sun + heliosphere from close-in highly inclined orbits (perihelion ~0.28 AU); launched 2020-02-10 by Atlas V',
    queries: [
      'Solar Orbiter spacecraft ESA',
      'Solar Orbiter mission Sun',
      'Solar Orbiter Atlas V launch',
      'Solar Orbiter heat shield',
      'ESA Solar Orbiter assembly',
    ],
  },
  {
    id: 'xichang-lc-3',
    agency: 'CNSA',
    subject:
      'Xichang Satellite Launch Center, Launch Complex 3 (LC-3) — CNSA Long March 3 series launch pad in Sichuan, China',
    queries: [
      'Xichang Satellite Launch Center',
      'Xichang LC-3 launch pad',
      'Long March 3 Xichang launch',
      '西昌卫星发射中心',
      'Xichang launch complex China',
    ],
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
  console.log(`  ${candidates.length} raw candidates`);
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
    if (v.verdict !== 'related' || (v.confidence ?? 0) < VISION_MIN_CONF) continue;
    const slot = String((kept % 5) + 1).padStart(2, '0');
    proposals.push({
      proposal_id: `hsfr-fleet-galleries-${t.id}-${String(kept + 1).padStart(2, '0')}`,
      agency: t.agency,
      surface: 'fleet-galleries',
      missionId: t.id,
      slot,
      query: c.query,
      currentSource: 'on-disk-non-space-or-irrelevant',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: imageUrl(c.file),
        source_url: sourceUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: {
          commons_file: c.file,
          sourcing_round: 'full-resource-2026-06-23',
        },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: [`full re-source — ${t.subject}`],
    });
    kept++;
  }
  return { target: t, proposals };
}

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '200', 10);
  const budget = { calls: 0, cap };
  const t0 = Date.now();
  const all = [];
  for (const t of TARGETS) {
    console.log(`\n[${t.id}]`);
    const r = await processTarget(t, budget);
    console.log(`  → ${r.proposals.length} survivors`);
    all.push(...r.proposals);
  }
  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = all.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_full_resource_appended_at = new Date().toISOString();
  existing.stats.handsource_full_resource_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hsfr-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
