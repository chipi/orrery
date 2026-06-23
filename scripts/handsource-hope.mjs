#!/usr/bin/env node
/**
 * handsource-hope — targeted re-source for the Hope (Emirates Mars
 * Mission) fleet entry. Earlier pass returned only Mars-atmosphere
 * shots — Marko 2026-06-23: "just got images of planets that hope
 * would survey. I need actual hope mission/vehicle/whatever specific
 * images, concept is fine".
 *
 * Tighter query set: spacecraft, mission patch, factory shots, artist
 * concepts. Wikipedia infobox + Commons category. Vision threshold
 * stays at 0.65 — Hope concept art is editorially-acceptable per
 * Marko's note.
 *
 * Run: set -a; source .env; set +a; node scripts/handsource-hope.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { judgeImage } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const SCRAPE_THROTTLE_MS = 300;
const VISION_THROTTLE_MS = 120;
const KEEP_TOTAL = 12;
const MIN_BYTES = 60_000;
const MAX_BYTES = 25_000_000;
const VISION_MIN_CONF = 0.65;

const QUERIES = [
  'Hope Mars Mission spacecraft',
  'Emirates Mars Mission probe',
  'Al Amal probe UAE',
  'Hope Mars Mission artist concept',
  'Hope probe assembly cleanroom',
  'Emirates Mars Mission MBRSC',
  'Hope Mars launch H-IIA Tanegashima',
  'Hope EMM mission patch',
  'Hope Mars probe rendering',
  'UAE Mars Mission spacecraft engineering',
];

const SUBJECT =
  'Hope (Al Amal) — UAE Emirates Mars Mission orbiter spacecraft. Includes: the actual probe hardware (factory, cleanroom, engineering shots), artist concept renderings showing the spacecraft body + solar panels + dish, mission patches/insignia, launch on H-IIA from Tanegashima. EXCLUDES generic Mars planet photos that Hope studies but is not the subject of.';

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

async function wikipediaImages(slug) {
  const base = 'https://en.wikipedia.org/w/api.php';
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: slug,
    prop: 'images',
    imlimit: '25',
    origin: '*',
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

async function main() {
  const cap = parseInt(process.env.VISION_BUDGET_CALLS || '120', 10);
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
  // Wikipedia infobox fallback
  for (const slug of ['Emirates_Mars_Mission', 'Hope_(spacecraft)']) {
    const files = await wikipediaImages(slug);
    await sleep(SCRAPE_THROTTLE_MS);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: `wikipedia:${slug}` });
    }
  }
  console.log(`Found ${candidates.length} raw candidates`);

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
      missionId: 'hope',
      agency: 'UAESA',
      subjectDescription: SUBJECT,
    });
    budget.calls++;
    await sleep(VISION_THROTTLE_MS);
    if (v.verdict !== 'related' || (v.confidence ?? 0) < VISION_MIN_CONF) continue;
    const slot = String((kept % 5) + 1).padStart(2, '0');
    proposals.push({
      proposal_id: `hsho-fleet-galleries-hope-${String(kept + 1).padStart(2, '0')}`,
      agency: 'UAESA',
      surface: 'fleet-galleries',
      missionId: 'hope',
      slot,
      query: c.query,
      currentSource: 'on-disk-planet-not-spacecraft',
      proposed: {
        tier: 1,
        source_type: 'wikimedia-commons',
        image_url: imageUrl(c.file),
        source_url: sourceUrl(c.file),
        credit: info.credit,
        license: info.license,
        metadata: { commons_file: c.file, sourcing_round: 'hope-spacecraft-only-2026-06-23' },
      },
      size_bytes: info.size,
      vision_v3: v,
      survivor: true,
      drop_reasons: [],
      notes: ['hope re-source — spacecraft only, concepts acceptable'],
    });
    kept++;
  }
  console.log(`Kept ${proposals.length} survivors`);

  const path = 'static/data/slice-a-salvage-result.json';
  const existing = JSON.parse(readFileSync(path, 'utf8'));
  const existingIds = new Set(existing.proposals.map((p) => p.proposal_id));
  const newOnly = proposals.filter((p) => !existingIds.has(p.proposal_id));
  existing.proposals.push(...newOnly);
  existing.stats = existing.stats ?? {};
  existing.stats.handsource_hope_appended_at = new Date().toISOString();
  existing.stats.handsource_hope_added = newOnly.length;
  writeFileSync(path, JSON.stringify(existing, null, 2));
  const dur = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n✓ appended ${newOnly.length} hsho-* proposals in ${dur}s`);
  console.log(`  ${budget.calls}/${cap} vision calls (~$${(budget.calls * 0.0004).toFixed(3)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
