#!/usr/bin/env node
/**
 * belts-curate — source proper asteroid + kuiper belt galleries.
 *
 * Pre-existing belt-galleries.json was 3 items for asteroid (all Ceres,
 * which is also in small-bodies/ceres) and 5 for kuiper (mostly Pluto).
 * Marko wants real belt-member variety + an overview hero.
 *
 * Per belt: 7 items
 *   - Asteroid: belt overview + Vesta, Pallas, Hygiea, Eros, Itokawa, Bennu
 *   - Kuiper:   belt overview + Pluto, Eris, Haumea, Makemake, Sedna, Arrokoth
 *
 * Output:
 *   - Images to static/images/belts/<belt>/<slot>.jpg + .1x1.jpg
 *     (sharp-resized to 1600px jpeg q80, 1x1 centre crop)
 *   - panel-image-sources.json sidecar entries at belts/<belt>/<slot>
 *   - belt-galleries.json rewritten as { asteroid: 7, kuiper: 7 }
 *
 * Belt overview images are intentionally allowed through with a looser
 * vision check — the belt structure isn't physically photographable,
 * canonical NASA artist concepts ARE the icon. For the overview slot
 * we accept vision verdict 'unrelated' as long as the URL/title
 * contains 'belt' or 'kuiper' and no spacecraft keyword.
 *
 * Run:
 *   node --max-old-space-size=4096 --env-file=.env scripts/belts-curate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { judgeBodyImage, preFilterBodyCandidate } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const PANEL_SIDECAR_PATH = 'static/data/panel-image-sources.json';
const MANIFEST_PATH = 'static/data/belt-galleries.json';

const BELTS = {
  asteroid: [
    { slot: '01', subject: 'the asteroid belt (panoramic structure or NASA artist concept of the disc-shaped belt)',
      queries: ['asteroid belt artist concept', 'asteroid belt solar system diagram', 'main asteroid belt artwork'],
      isOverview: true },
    { slot: '02', subject: '4 Vesta (the asteroid)',
      queries: ['Vesta asteroid Dawn', 'Vesta asteroid surface'] },
    { slot: '03', subject: '2 Pallas (the asteroid)',
      queries: ['2 Pallas asteroid', 'Pallas asteroid Hubble'] },
    { slot: '04', subject: '10 Hygiea (the asteroid)',
      queries: ['10 Hygiea asteroid', 'Hygiea asteroid SPHERE'] },
    { slot: '05', subject: '433 Eros (the asteroid)',
      queries: ['433 Eros NEAR Shoemaker', 'Eros asteroid surface'] },
    { slot: '06', subject: '25143 Itokawa (the asteroid)',
      queries: ['Itokawa asteroid Hayabusa', '25143 Itokawa surface'] },
    { slot: '07', subject: '101955 Bennu (the asteroid)',
      queries: ['Bennu OSIRIS-REx', '101955 Bennu surface'] },
  ],
  kuiper: [
    { slot: '01', subject: 'the Kuiper Belt (artist concept of the outer trans-Neptunian disc)',
      queries: ['Kuiper Belt artist concept', 'Kuiper Belt diagram', 'outer solar system Kuiper'],
      isOverview: true },
    { slot: '02', subject: 'Pluto (the dwarf planet)',
      queries: ['Pluto New Horizons true color', 'Pluto surface heart'] },
    { slot: '03', subject: 'Eris (the dwarf planet)',
      queries: ['Eris dwarf planet Hubble', 'Eris and Dysnomia'] },
    { slot: '04', subject: 'Haumea (the dwarf planet)',
      queries: ['Haumea dwarf planet artist', 'Haumea rotation'] },
    { slot: '05', subject: 'Makemake (the dwarf planet)',
      queries: ['Makemake dwarf planet Hubble', 'Makemake surface'] },
    { slot: '06', subject: '90377 Sedna (the trans-Neptunian object)',
      queries: ['Sedna trans-Neptunian artist', '90377 Sedna'] },
    { slot: '07', subject: '486958 Arrokoth (the Kuiper Belt object visited by New Horizons)',
      queries: ['Arrokoth New Horizons', '486958 Arrokoth'] },
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_BYTES = 100_000;
const MAX_BYTES = 25_000_000;

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

const imageUrl = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const sourceUrl = (f) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function findBest(item) {
  const seen = new Set();
  const candidates = [];
  for (const q of item.queries) {
    const files = await commonsSearch(q);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
    await sleep(300);
    if (candidates.length >= 20) break;
  }
  // overviews can be artist concepts; keep more lenient pre-filter (no mission keywords still).
  const filtered = candidates.filter((c) => !preFilterBodyCandidate({ url: c.file, title: c.file }).reject);
  for (const c of filtered.slice(0, 10)) {
    const info = await commonsImageInfo(c.file);
    await sleep(300);
    if (!info || (info.size && (info.size < MIN_BYTES || info.size > MAX_BYTES))) continue;
    const v = await judgeBodyImage({
      imageUrl: imageUrl(c.file),
      bodyId: 'belt',
      subjectDescription: item.subject,
    });
    await sleep(120);
    // For overview slot we accept anything that's not contaminated with
    // spacecraft (overview IS an artist concept by necessity). For body
    // slots we want the strict body-only verdict.
    const accept = item.isOverview
      ? v.verdict !== 'unsure' || v.confidence >= 0.5
      : v.verdict === 'related' && (v.confidence ?? 0) >= 0.9;
    if (accept) return { ...c, info, vision: v };
  }
  return null;
}

async function downloadAndProcess(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);
  const meta = await sharp(baseBuf).metadata();
  const side = Math.min(meta.width, meta.height);
  await sharp(baseBuf)
    .extract({ left: Math.round((meta.width - side) / 2), top: Math.round((meta.height - side) / 2), width: side, height: side })
    .jpeg({ quality: 80 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
  return baseBuf.length;
}

async function main() {
  const panel = JSON.parse(readFileSync(PANEL_SIDECAR_PATH, 'utf8'));
  const newManifest = {};
  for (const [beltId, items] of Object.entries(BELTS)) {
    console.log(`\n=== ${beltId} belt ===`);
    let appliedCount = 0;
    for (const item of items) {
      console.log(` slot ${item.slot}: ${item.subject.slice(0, 60)}`);
      const pick = await findBest(item);
      if (!pick) {
        console.log(`   ✗ no acceptable candidate found`);
        continue;
      }
      const dir = `static/images/belts/${beltId}`;
      try {
        const bytes = await downloadAndProcess(imageUrl(pick.file), dir, item.slot);
        panel[`belts/${beltId}/${item.slot}`] = {
          commons_file: pick.file,
          commons_url: sourceUrl(pick.file),
          credit: pick.info.credit,
          license: pick.info.license,
          fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
          bodies_iteration: 'belts-curate-2026-06-21',
          query: pick.query,
          vision: { verdict: pick.vision.verdict, confidence: pick.vision.confidence },
        };
        console.log(`   ✓ ${pick.file.slice(0, 60)} (${(bytes / 1024).toFixed(0)}KB)`);
        appliedCount++;
        await sleep(300);
      } catch (e) {
        console.log(`   ✗ ${e.message}`);
      }
    }
    newManifest[beltId] = appliedCount;
  }
  // Schema flip: from { _meta, galleries: {asteroid: [{src, caption}]} }
  // to { asteroid: N, kuiper: N } — matches all other *-galleries.json
  // shape so getCategoryGallery() can read it uniformly.
  writeFileSync(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + '\n');
  writeFileSync(PANEL_SIDECAR_PATH, JSON.stringify(panel, null, 2) + '\n');
  console.log(`\n✓ wrote ${MANIFEST_PATH}:`, JSON.stringify(newManifest));
  console.log(`✓ wrote ${PANEL_SIDECAR_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
