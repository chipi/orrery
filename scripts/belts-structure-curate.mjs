#!/usr/bin/env node
/**
 * belts-structure-curate — re-source belt galleries focused on the
 * BELT STRUCTURE itself, not individual member portraits.
 *
 * Round-1 (belts-curate.mjs) sourced individual bodies — Vesta, Pallas,
 * Eros etc. — but those already have their own panels in small-bodies
 * and Marko wants the belt panel to show the belt-as-a-region:
 *   • NASA / ESA artist concepts of the disc structure
 *   • Hubble wide-field shots of asteroid trails through a star field
 *   • Top-down / oblique diagrams of belt position in the solar system
 *
 * Strict filter: REJECT any filename containing a known single-body
 * name (vesta / pallas / ceres / eros / itokawa / bennu / hygiea /
 * pluto / eris / haumea / makemake / sedna / arrokoth / charon / etc.)
 * — those belong in their own surface, not on the belt panel.
 *
 * No vision-judge — title filter does the work; Marko reviews in app.
 *
 * Run:
 *   node --env-file=.env scripts/belts-structure-curate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const PANEL_SIDECAR_PATH = 'static/data/panel-image-sources.json';

const BELTS = {
  asteroid: [
    'asteroid belt artist concept',
    'asteroid belt diagram solar system',
    'main belt asteroids artwork',
    'asteroid belt panoramic',
    'asteroid field artist impression',
  ],
  kuiper: [
    'Kuiper Belt artist concept',
    'Kuiper Belt diagram outer solar system',
    'trans-Neptunian region artwork',
    'Kuiper Belt structure',
    'scattered disc objects artist',
  ],
};

// Single-body names to REJECT (these belong on their own surface).
const REJECT_BODY_TOKENS = [
  'vesta',
  'pallas',
  'ceres',
  'eros',
  'itokawa',
  'bennu',
  'ryugu',
  'hygiea',
  'lutetia',
  'mathilde',
  'gaspra',
  'ida',
  'psyche',
  'pluto',
  'eris',
  'haumea',
  'makemake',
  'sedna',
  'arrokoth',
  'charon',
  'ganymede',
  'callisto',
  'europa',
  'io',
  'titan',
  'enceladus',
  'triton',
  'oumuamua',
  // also reject obvious mission-hardware tokens just in case
  'rover',
  'lander',
  'orbiter',
  'spacecraft',
  'launch',
  'rocket',
];

const KEEP_PER_BELT = 6; // 5–7 range; 6 is a clean grid layout
const MIN_BYTES = 50_000; // lower bar — artist concepts can be smaller
const MAX_BYTES = 25_000_000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: `${query} filetype:bitmap`,
    srnamespace: '6',
    srlimit: '30',
    origin: '*',
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
      if (res.status === 429 || res.status === 503) {
        await sleep(2000);
        continue;
      }
      if (!res.ok) return [];
      const j = await res.json();
      return (j?.query?.search ?? [])
        .map((h) => h.title.replace(/^File:/, ''))
        .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));
    } catch {
      return [];
    }
  }
  return [];
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

function bodyFilterReject(filename) {
  const lower = filename.toLowerCase();
  for (const tok of REJECT_BODY_TOKENS) {
    if (lower.includes(tok)) return tok;
  }
  return null;
}

async function downloadAndProcess(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);
  const meta = await sharp(baseBuf).metadata();
  const side = Math.min(meta.width, meta.height);
  await sharp(baseBuf)
    .extract({
      left: Math.round((meta.width - side) / 2),
      top: Math.round((meta.height - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 80 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
  return baseBuf.length;
}

async function processBelt(beltId, queries) {
  console.log(`\n=== ${beltId} belt ===`);
  // Gather candidates from all queries, dedup by file
  const seen = new Set();
  const candidates = [];
  for (const q of queries) {
    const files = await commonsSearch(q);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      const rejected = bodyFilterReject(f);
      if (rejected) {
        // silent skip — these are body portraits, not belt views
        continue;
      }
      candidates.push({ file: f, query: q });
    }
    await sleep(300);
  }
  console.log(`  ${candidates.length} candidates after body-name filter`);

  // Enrich with size/credit; drop tiny or oversize
  const enriched = [];
  for (const c of candidates.slice(0, 20)) {
    const info = await commonsImageInfo(c.file);
    await sleep(250);
    if (!info || (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES))) continue;
    enriched.push({ ...c, info });
  }
  console.log(`  ${enriched.length} enriched (size ok)`);

  // Take the first KEEP_PER_BELT — Marko reviews quality in /explore
  const picks = enriched.slice(0, KEEP_PER_BELT);
  return picks;
}

async function main() {
  const panel = JSON.parse(readFileSync(PANEL_SIDECAR_PATH, 'utf8'));
  for (const [beltId, queries] of Object.entries(BELTS)) {
    const picks = await processBelt(beltId, queries);
    let applied = 0;
    for (let i = 0; i < picks.length; i++) {
      const slot = String(i + 1).padStart(2, '0');
      const p = picks[i];
      try {
        const bytes = await downloadAndProcess(
          imageUrl(p.file),
          `static/images/belts/${beltId}`,
          slot,
        );
        panel[`belts/${beltId}/${slot}`] = {
          commons_file: p.file,
          commons_url: sourceUrl(p.file),
          credit: p.info.credit,
          license: p.info.license,
          fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
          bodies_iteration: 'belts-structure-curate-2026-06-21',
          query: p.query,
        };
        console.log(`   ✓ ${slot} ← ${p.file.slice(0, 70)} (${(bytes / 1024).toFixed(0)}KB)`);
        applied++;
        await sleep(300);
      } catch (e) {
        console.log(`   ✗ ${slot}: ${e.message}`);
      }
    }
    console.log(`  ${beltId}: ${applied}/${picks.length} applied`);
  }
  writeFileSync(PANEL_SIDECAR_PATH, JSON.stringify(panel, null, 2) + '\n');
  console.log('\n✓ wrote panel-image-sources.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
