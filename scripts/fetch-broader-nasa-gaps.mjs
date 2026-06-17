#!/usr/bin/env node
// Broader-inventory pass: fill the 4 NASA missions found in the
// 2026-06-17 all-mission audit that have only 1 image each:
//   europa-clipper        (fleet) — needs slots 02-05
//   lucy                  (fleet) — needs slots 02-05
//   parker-solar-probe    (fleet) — needs slots 02-05
//   psyche-mission        (mission) — needs slots 02-05
//
// JAXA / ESA / JHU-APL primary missions (hayabusa, hayabusa1,
// solar-orbiter, akatsuki, dart partials) are intentionally NOT in
// this pass — they wait on the agency-archive registry (issue #58)
// so they get sourced through their own agency's primary, not Commons.
//
// Same resolver as fetch-batch-2-mission-images.mjs: NASA images-api
// tier 1, Commons failover. Two surfaces touched (fleet + missions)
// because each mission lives where its cataloging surface routes it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const NASA_API = 'https://images-api.nasa.gov';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';
const MISSION_SIDECAR = 'static/data/mission-image-sources.json';

// Per-mission plan. `surface` decides which sidecar + disk dir;
// fleet keys are `<id>/<slot>.jpg` (with ext), mission keys are
// `<id>/<slot>` (no ext) per the sidecar-routing rules.
const PLAN = [
  {
    id: 'europa-clipper',
    surface: 'fleet-galleries',
    slots: [
      { slot: '02', label: 'Falcon Heavy launch (2024)',     nasaQuery: 'Europa Clipper Falcon Heavy launch' },
      { slot: '03', label: 'Spacecraft + solar arrays',      nasaQuery: 'Europa Clipper spacecraft solar arrays' },
      { slot: '04', label: 'Europa flyby (concept)',         nasaQuery: 'Europa Clipper Europa flyby illustration' },
      { slot: '05', label: 'Instrument layout',              nasaQuery: 'Europa Clipper instruments' },
    ],
  },
  {
    id: 'lucy',
    surface: 'fleet-galleries',
    slots: [
      { slot: '02', label: 'Atlas V launch (2021)',          nasaQuery: 'Lucy spacecraft Atlas V launch 2021' },
      { slot: '03', label: 'Spacecraft + solar arrays',      nasaQuery: 'Lucy spacecraft solar arrays Trojan' },
      { slot: '04', label: 'Dinkinesh encounter (2023)',     nasaQuery: 'Lucy Dinkinesh asteroid' },
      { slot: '05', label: 'Donaldjohanson encounter (2024)',nasaQuery: 'Lucy Donaldjohanson asteroid' },
    ],
  },
  {
    id: 'parker-solar-probe',
    surface: 'fleet-galleries',
    slots: [
      { slot: '02', label: 'Delta IV Heavy launch (2018)',   nasaQuery: 'Parker Solar Probe Delta IV Heavy launch' },
      { slot: '03', label: 'Spacecraft heat shield',         nasaQuery: 'Parker Solar Probe heat shield TPS' },
      { slot: '04', label: 'Sun close approach (WISPR)',     nasaQuery: 'Parker Solar Probe WISPR Sun corona' },
      { slot: '05', label: 'Spacecraft assembly',            nasaQuery: 'Parker Solar Probe spacecraft assembly' },
    ],
  },
  {
    id: 'psyche-mission',
    surface: 'missions',
    slots: [
      { slot: '02', label: 'Falcon Heavy launch (2023)',     nasaQuery: 'Psyche spacecraft Falcon Heavy launch' },
      { slot: '03', label: 'Spacecraft + solar arrays',      nasaQuery: 'Psyche spacecraft solar arrays' },
      { slot: '04', label: 'Psyche asteroid (concept)',      nasaQuery: 'Psyche asteroid illustration metal' },
      { slot: '05', label: 'Hall thrusters / SEP',           nasaQuery: 'Psyche spacecraft Hall thruster' },
    ],
  },
];

// ── Resolvers (verbatim from fetch-batch-2-mission-images.mjs) ────

async function nasaSearch(query) {
  const params = new URLSearchParams({ q: query, media_type: 'image' });
  const res = await fetch(`${NASA_API}/search?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`NASA search HTTP ${res.status}`);
  const json = await res.json();
  return (json?.collection?.items ?? [])
    .map((it) => {
      const d = it?.data?.[0] ?? {};
      return {
        nasa_id: d.nasa_id,
        title: d.title,
        secondary_creator: d.secondary_creator,
        center: d.center,
      };
    })
    .filter((x) => x.nasa_id);
}

async function nasaResolveOriginalUrl(nasa_id) {
  const res = await fetch(`${NASA_API}/asset/${encodeURIComponent(nasa_id)}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const links = (json?.collection?.items ?? []).map((it) => it.href).filter(Boolean);
  return (
    links.find((u) => /~orig\.(jpg|jpeg|png|tif)$/i.test(u)) ??
    links.find((u) => /~large\.(jpg|jpeg|png)$/i.test(u)) ??
    links.find((u) => /\.(jpg|jpeg|png)$/i.test(u)) ??
    null
  );
}

function nasaSourcePageUrl(nasa_id) {
  return `https://images.nasa.gov/details/${encodeURIComponent(nasa_id)}`;
}

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query + ' filetype:bitmap',
    srnamespace: '6',
    srlimit: '15',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons search HTTP ${res.status}`);
  const json = await res.json();
  return (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
}

async function resolveSource(plan) {
  try {
    const hits = await nasaSearch(plan.nasaQuery);
    const usable = hits.find((h) => h.nasa_id && h.title);
    if (usable) {
      const imageUrl = await nasaResolveOriginalUrl(usable.nasa_id);
      if (imageUrl) {
        const credit =
          (usable.secondary_creator || '').trim() ||
          (usable.center ? `NASA / ${usable.center}` : 'NASA');
        return {
          source_type: 'nasa-image-library',
          source_url: nasaSourcePageUrl(usable.nasa_id),
          image_url: imageUrl,
          credit,
          license: 'Public Domain (NASA — Media Usage Guidelines)',
          nasa_id: usable.nasa_id,
          nasa_title: usable.title,
        };
      }
    }
  } catch (e) {
    console.log(`    [NASA] ${e.message}`);
  }

  // Commons failover — strict JPG/PNG only.
  try {
    const candidates = await commonsSearch(plan.nasaQuery);
    const pick =
      candidates.find((c) => /\.(jpg|jpeg)$/i.test(c)) ??
      candidates.find((c) => /\.png$/i.test(c)) ??
      null;
    if (!pick) return null;
    return {
      source_type: 'wikimedia-commons',
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(pick)}`,
      image_url: `${COMMONS_FILEPATH}/${encodeURIComponent(pick)}?width=1600`,
      credit: 'NASA / agency original via Wikimedia Commons mirror',
      license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
      commons_file: pick,
    };
  } catch (e) {
    console.log(`    [Commons] ${e.message}`);
    return null;
  }
}

async function downloadAndProcess(imageUrl, dir, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status} for ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, baseJpg);
  const meta = await sharp(baseJpg).metadata();
  const { width: W, height: H } = meta;
  const side = Math.min(W, H);
  await sharp(baseJpg)
    .extract({ left: Math.round((W - side) / 2), top: Math.round((H - side) / 2), width: side, height: side })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

// ── Main ──────────────────────────────────────────────────────────

const FLEET = JSON.parse(readFileSync(FLEET_SIDECAR, 'utf8'));
const MISSION = JSON.parse(readFileSync(MISSION_SIDECAR, 'utf8'));
const stats = { nasa: 0, commons: 0, miss: 0 };

for (const m of PLAN) {
  const dir = `static/images/${m.surface}/${m.id}`;
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${m.id} (${m.surface}) ===`);
  for (const slot of m.slots) {
    if (existsSync(`${dir}/${slot.slot}.jpg`)) {
      console.log(`⊙ ${m.id}/${slot.slot}: on disk, skipping`);
      continue;
    }
    process.stdout.write(`→ ${m.id}/${slot.slot} (${slot.label})\n  `);
    const source = await resolveSource(slot);
    if (!source) {
      console.log(`  ✗ no source`);
      stats.miss++;
      continue;
    }
    const tag = source.source_type === 'nasa-image-library' ? '[NASA]' : '[Commons]';
    console.log(`  ${tag} ${source.nasa_id ?? source.commons_file}`);
    try {
      await downloadAndProcess(source.image_url, dir, slot.slot);
      const entry = {
        source_type: source.source_type,
        source_url: source.source_url,
        image_url: source.image_url,
        credit: source.credit,
        license: source.license,
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
        ...(source.nasa_id ? { nasa_id: source.nasa_id, nasa_title: source.nasa_title } : {}),
        ...(source.commons_file ? { commons_file: source.commons_file } : {}),
      };
      if (m.surface === 'fleet-galleries') {
        FLEET[`${m.id}/${slot.slot}.jpg`] = entry;
      } else {
        MISSION[`${m.id}/${slot.slot}`] = entry;
      }
      if (source.source_type === 'nasa-image-library') stats.nasa++;
      else stats.commons++;
      console.log(`  ✓ ${source.source_type}`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
      stats.miss++;
    }
  }
}

writeFileSync(FLEET_SIDECAR, JSON.stringify(FLEET, null, 2) + '\n');
writeFileSync(MISSION_SIDECAR, JSON.stringify(MISSION, null, 2) + '\n');

console.log(`\n── broader-gap result ──`);
console.log(`  NASA: ${stats.nasa}  Commons: ${stats.commons}  miss: ${stats.miss}`);
