#!/usr/bin/env node
/**
 * sun-replace — targeted fix for sun/04 and sun/05 which were Atlas V
 * launch photos before this pipeline existed. Sources from NASA solar
 * observatories (SDO, SOHO) via Commons with strict pre-filter against
 * rockets / spacecraft, vision-judged with body-only prompt, picks
 * the top 2 by confidence, applies directly to disk.
 *
 * Self-contained (no review surface) — Marko can revert easily by
 * re-running bodies-apply, and the bar is high (strict prompt + manual
 * inspection of 2 slots is trivial).
 *
 * Run:
 *   node --max-old-space-size=4096 --env-file=.env scripts/sun-replace.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { judgeBodyImage, preFilterBodyCandidate } from './lib/vision-judge.mjs';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const PANEL_SIDECAR_PATH = 'static/data/panel-image-sources.json';

const QUERIES = [
  'Sun Solar Dynamics Observatory SDO full disk',
  'Sun SDO AIA ultraviolet',
  'Sun SOHO EIT corona',
  'Sun chromosphere H-alpha',
  'Sun true color photosphere',
];
const TARGET_SLOTS = ['04', '05'];

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
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.query?.search ?? [])
      .map((h) => h.title.replace(/^File:/, ''))
      .filter((f) => /\.(jpg|jpeg|png|tif|tiff)$/i.test(f));
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
    iiprop: 'size|extmetadata|url',
    origin: '*',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    const json = await res.json();
    const page = Object.values(json?.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info) return null;
    const meta = info.extmetadata ?? {};
    const strip = (s) => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
    return {
      size: info.size,
      license: (meta.LicenseShortName?.value ?? '').toLowerCase(),
      credit: strip(meta.Credit?.value ?? meta.Artist?.value ?? ''),
      title: strip(meta.ObjectName?.value ?? meta.ImageDescription?.value ?? filename),
    };
  } catch {
    return null;
  }
}

const commonsImageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}?width=1600`;
const commonsFilePageUrl = (f) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;

async function downloadAndProcess(imageUrl, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  const dir = 'static/images/sun';
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

async function main() {
  // 1. Gather candidates
  const seen = new Set();
  const candidates = [];
  for (const q of QUERIES) {
    const files = await commonsSearch(q);
    for (const f of files) {
      if (seen.has(f)) continue;
      seen.add(f);
      candidates.push({ file: f, query: q });
    }
    await sleep(300);
    if (candidates.length >= 30) break;
  }
  console.log(`Gathered ${candidates.length} candidates`);

  // 2. Pre-filter (kills any rocket/launch keyword)
  const filtered = candidates.filter((c) => !preFilterBodyCandidate({ url: c.file, title: c.file }).reject);
  console.log(`After pre-filter: ${filtered.length}`);

  // 3. Size-check + enrich
  const enriched = [];
  for (const c of filtered.slice(0, 25)) {
    const info = await commonsImageInfo(c.file);
    await sleep(300);
    if (!info || (info.size && (info.size < 100_000 || info.size > 25_000_000))) continue;
    enriched.push({ ...c, info });
  }
  console.log(`After size-filter: ${enriched.length}`);

  // 4. Vision-judge (strict body prompt)
  const judged = [];
  for (const c of enriched.slice(0, 15)) {
    const v = await judgeBodyImage({
      imageUrl: commonsImageUrl(c.file),
      bodyId: 'sun',
      subjectDescription: 'the Sun (solar disc / corona / surface — NOT spacecraft observing it)',
    });
    await sleep(120);
    judged.push({ ...c, vision: v });
    console.log(`  ${c.file.slice(0,70)} → ${v.verdict} c=${(v.confidence ?? 0).toFixed(2)}`);
  }

  const survivors = judged
    .filter((c) => c.vision.verdict === 'related' && (c.vision.confidence ?? 0) >= 0.9)
    .sort((a, b) => (b.vision.confidence ?? 0) - (a.vision.confidence ?? 0));
  console.log(`\nSurvivors: ${survivors.length}`);
  if (survivors.length < TARGET_SLOTS.length) {
    console.error(`Not enough survivors (need ${TARGET_SLOTS.length}, got ${survivors.length}). Aborting apply.`);
    process.exit(1);
  }

  // 5. Apply top N to TARGET_SLOTS, write sidecars.
  const panel = JSON.parse(readFileSync(PANEL_SIDECAR_PATH, 'utf8'));
  for (let i = 0; i < TARGET_SLOTS.length; i++) {
    const slot = TARGET_SLOTS[i];
    const winner = survivors[i];
    console.log(`\nApplying sun/${slot} ← ${winner.file}`);
    const bytes = await downloadAndProcess(commonsImageUrl(winner.file), slot);
    panel[`sun/${slot}`] = {
      commons_file: winner.file,
      commons_url: commonsFilePageUrl(winner.file),
      credit: winner.info.credit,
      license: winner.info.license,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      bodies_iteration: 'sun-replace-2026-06-21',
      query: winner.query,
      vision: { verdict: winner.vision.verdict, confidence: winner.vision.confidence },
    };
    console.log(`  ✓ ${(bytes / 1024).toFixed(0)}KB on disk`);
    await sleep(200);
  }
  writeFileSync(PANEL_SIDECAR_PATH, JSON.stringify(panel, null, 2) + '\n');
  console.log(`\n✓ wrote ${PANEL_SIDECAR_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
