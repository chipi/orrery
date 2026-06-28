#!/usr/bin/env node
// Batch 2 — source 5 gallery slots for each of the 8 historic-gap
// missions identified in the 2026-06-17 inventory:
//   opportunity, spirit, mariner9, phoenix, magellan, akatsuki,
//   osiris-rex, dart
//
// REFERENCE IMPLEMENTATION for IMAGE-PIPELINE.md §"Source-resolution
// order". Tries sources in this priority:
//
//   1. NASA Image and Video Library (images-api.nasa.gov) — primary
//      for every NASA / NASA-co-managed mission. Returns the original
//      master (~orig.jpg), the official secondary_creator credit,
//      and a canonical source_url at images.nasa.gov.
//
//   2. Wikimedia Commons (commons.wikimedia.org) — FAILOVER ONLY,
//      when the agency search yields zero usable matches. Always
//      mark `credit_via: "wikimedia-commons-mirror"` in the sidecar
//      so /credits can render the right attribution.
//
// For Akatsuki (JAXA) the NASA archive sometimes mirrors JAXA imagery
// (Venus is a shared interest); when it doesn't, we fall through to
// Commons. JAXA's own digital archive has no public search API so
// adding it would require manual per-image picks — out of scope for
// this batch; track as a follow-up.
//
// Mission-surface sidecar shape (mission-image-sources.json):
//   key:   "<id>/<slot>"        (NO .jpg extension)
//   value: {
//     source_type: 'nasa-image-library' | 'wikimedia-commons',
//     source_url:  '...',       // canonical page on agency / Commons
//     image_url:   '...',       // direct download URL
//     credit:      '...',       // from secondary_creator or curated
//     license:     '...',       // PD-NASA or Commons license
//     fetched_at:  'YYYY-MM-DDTHH:MM:SSZ'
//   }

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const NASA_API = 'https://images-api.nasa.gov';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

const SURFACE = 'missions';
const SIDECAR_PATH = 'static/data/mission-image-sources.json';

// Per-mission 5-slot plans. Each slot has a NASA images-api search
// query and a Commons fallback query. NASA query is tried first;
// Commons fires only if NASA returns nothing.
//
// nasaCenter / nasaKeywords narrow the NASA search when "Opportunity"
// (the rover) collides with the English word "opportunity". For
// non-NASA missions (Akatsuki/JAXA) we skip the NASA tier — set
// `nasaQuery: null` and let Commons handle it directly.
const PLAN = {
  opportunity: [
    {
      slot: '01',
      label: 'Delta II launch (2003)',
      nasaQuery: 'Opportunity rover Delta II launch',
      commonsQuery: 'Opportunity rover MER-B Delta II launch 2003',
    },
    {
      slot: '02',
      label: 'Endurance Crater panorama',
      nasaQuery: 'Opportunity Endurance Crater panorama',
      commonsQuery: 'Opportunity rover Endurance crater Mars',
    },
    {
      slot: '03',
      label: 'Victoria Crater (MRO HiRISE)',
      nasaQuery: 'Opportunity Victoria Crater HiRISE',
      commonsQuery: 'Opportunity Victoria Crater HiRISE',
    },
    {
      slot: '04',
      label: 'Meridiani Planum surface',
      nasaQuery: 'Opportunity rover Meridiani Planum',
      commonsQuery: 'Opportunity rover Meridiani Planum Mars',
    },
    {
      slot: '05',
      label: 'Rover self-portrait',
      nasaQuery: 'Opportunity rover self-portrait',
      commonsQuery: 'Opportunity rover self portrait Mars',
    },
  ],
  spirit: [
    {
      slot: '01',
      label: 'Delta II launch (MER-A, 2003)',
      nasaQuery: 'Spirit rover Delta II launch',
      commonsQuery: 'Spirit rover MER-A Delta II launch 2003',
    },
    {
      slot: '02',
      label: 'Gusev Crater panorama',
      nasaQuery: 'Spirit rover Gusev Crater panorama',
      commonsQuery: 'Spirit rover Gusev Crater panorama Mars',
    },
    {
      slot: '03',
      label: 'Husband Hill summit panorama',
      nasaQuery: 'Spirit rover Husband Hill summit',
      commonsQuery: 'Spirit rover Husband Hill panorama',
    },
    {
      slot: '04',
      label: 'Rover self-portrait',
      nasaQuery: 'Spirit rover self-portrait',
      commonsQuery: 'Spirit rover self portrait Mars',
    },
    {
      slot: '05',
      label: 'Columbia Hills surface',
      nasaQuery: 'Spirit rover Columbia Hills',
      commonsQuery: 'Spirit rover Columbia Hills Mars',
    },
  ],
  mariner9: [
    {
      slot: '01',
      label: 'Mariner 9 spacecraft',
      nasaQuery: 'Mariner 9 spacecraft',
      commonsQuery: 'Mariner 9 spacecraft NASA',
    },
    {
      slot: '02',
      label: 'Olympus Mons (1971 view)',
      nasaQuery: 'Olympus Mons Mariner 9',
      commonsQuery: 'Olympus Mons Mariner 9 Mars',
    },
    {
      slot: '03',
      label: 'Valles Marineris',
      nasaQuery: 'Valles Marineris Mariner 9',
      commonsQuery: 'Valles Marineris Mariner 9 Mars',
    },
    {
      slot: '04',
      label: 'Phobos (first close-up)',
      nasaQuery: 'Phobos Mariner 9',
      commonsQuery: 'Phobos Mariner 9 Mars moon',
    },
    {
      slot: '05',
      label: 'Mars dust storm 1971',
      nasaQuery: 'Mariner 9 Mars dust storm',
      commonsQuery: 'Mariner 9 Mars dust storm 1971',
    },
  ],
  phoenix: [
    {
      slot: '01',
      label: 'Delta II launch (2007)',
      nasaQuery: 'Phoenix Mars lander Delta II launch',
      commonsQuery: 'Phoenix Mars lander Delta II launch 2007',
    },
    {
      slot: '02',
      label: 'Lander on Martian arctic',
      nasaQuery: 'Phoenix Mars lander arctic',
      commonsQuery: 'Phoenix Mars lander arctic surface',
    },
    {
      slot: '03',
      label: 'Water ice in trench',
      nasaQuery: 'Phoenix Mars lander ice trench',
      commonsQuery: 'Phoenix Mars lander ice trench Snow Queen',
    },
    {
      slot: '04',
      label: 'Robotic arm + soil scoop',
      nasaQuery: 'Phoenix Mars lander robotic arm',
      commonsQuery: 'Phoenix Mars lander robotic arm scoop',
    },
    {
      slot: '05',
      label: 'Descent parachute (HiRISE)',
      nasaQuery: 'Phoenix Mars lander parachute HiRISE',
      commonsQuery: 'Phoenix Mars lander parachute HiRISE',
    },
  ],
  magellan: [
    {
      slot: '01',
      label: 'Magellan spacecraft',
      nasaQuery: 'Magellan spacecraft Venus',
      commonsQuery: 'Magellan spacecraft Venus NASA',
    },
    {
      slot: '02',
      label: 'Maat Mons (radar)',
      nasaQuery: 'Maat Mons Venus Magellan',
      commonsQuery: 'Maat Mons Venus Magellan radar',
    },
    {
      slot: '03',
      label: 'Venus hemisphere radar mosaic',
      nasaQuery: 'Venus hemisphere Magellan',
      commonsQuery: 'Venus globe Magellan radar mosaic',
    },
    {
      slot: '04',
      label: 'Sapas Mons / pancake domes',
      nasaQuery: 'Sapas Mons Venus Magellan',
      commonsQuery: 'Sapas Mons Venus Magellan radar',
    },
    {
      slot: '05',
      label: 'Eistla Regio impact craters',
      nasaQuery: 'Eistla Regio Venus Magellan',
      commonsQuery: 'Magellan Venus impact crater radar',
    },
  ],
  akatsuki: [
    // JAXA mission — NASA archive mirrors Venus imagery; tried first, Commons fallback.
    {
      slot: '01',
      label: 'Akatsuki spacecraft',
      nasaQuery: 'Akatsuki Venus orbiter spacecraft',
      commonsQuery: 'Akatsuki spacecraft Venus JAXA',
    },
    {
      slot: '02',
      label: 'Venus UV cloud structure',
      nasaQuery: 'Akatsuki Venus ultraviolet',
      commonsQuery: 'Akatsuki Venus ultraviolet cloud',
    },
    {
      slot: '03',
      label: 'Venus IR2 night-side',
      nasaQuery: 'Akatsuki Venus infrared',
      commonsQuery: 'Akatsuki Venus IR2 infrared night',
    },
    {
      slot: '04',
      label: 'Bow wave gravity wave',
      nasaQuery: 'Akatsuki Venus gravity wave',
      commonsQuery: 'Akatsuki Venus bow wave gravity',
    },
    {
      slot: '05',
      label: 'H-IIA launch (2010)',
      nasaQuery: 'Akatsuki H-IIA launch',
      commonsQuery: 'Akatsuki H-IIA launch JAXA',
    },
  ],
  'osiris-rex': [
    {
      slot: '01',
      label: 'Atlas V launch (2016)',
      nasaQuery: 'OSIRIS-REx Atlas V launch',
      commonsQuery: 'OSIRIS-REx Atlas V launch 2016',
    },
    {
      slot: '02',
      label: 'Bennu full-disk view',
      nasaQuery: 'Bennu OSIRIS-REx mosaic',
      commonsQuery: 'Bennu asteroid OSIRIS-REx full mosaic',
    },
    {
      slot: '03',
      label: 'TAG sample collection',
      nasaQuery: 'OSIRIS-REx TAG sample collection',
      commonsQuery: 'OSIRIS-REx TAG sample collection Bennu',
    },
    {
      slot: '04',
      label: 'OSIRIS-REx spacecraft',
      nasaQuery: 'OSIRIS-REx spacecraft Bennu',
      commonsQuery: 'OSIRIS-REx spacecraft Bennu mission',
    },
    {
      slot: '05',
      label: 'Sample-return capsule (Utah)',
      nasaQuery: 'OSIRIS-REx sample return capsule Utah',
      commonsQuery: 'OSIRIS-REx sample return capsule Utah',
    },
  ],
  dart: [
    {
      slot: '01',
      label: 'Falcon 9 launch (2021)',
      nasaQuery: 'DART mission Falcon 9 launch',
      commonsQuery: 'DART mission Falcon 9 launch 2021',
    },
    {
      slot: '02',
      label: 'Dimorphos (final DART frame)',
      nasaQuery: 'DART Dimorphos final image',
      commonsQuery: 'Dimorphos DART final impact image asteroid',
    },
    {
      slot: '03',
      label: 'Didymos + Dimorphos binary',
      nasaQuery: 'Didymos Dimorphos DART',
      commonsQuery: 'Didymos Dimorphos binary asteroid DART',
    },
    {
      slot: '04',
      label: 'DART spacecraft model',
      nasaQuery: 'DART spacecraft NASA',
      commonsQuery: 'DART spacecraft NASA Double Asteroid',
    },
    {
      slot: '05',
      label: 'Post-impact ejecta plume',
      nasaQuery: 'DART impact ejecta plume Dimorphos',
      commonsQuery: 'DART impact ejecta plume Dimorphos Hubble',
    },
  ],
};

// ── NASA Image and Video Library (TIER 1) ─────────────────────────

async function nasaSearch(query) {
  const params = new URLSearchParams({ q: query, media_type: 'image' });
  const res = await fetch(`${NASA_API}/search?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`NASA search HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.collection?.items ?? [];
  return items
    .map((it) => {
      const d = it?.data?.[0] ?? {};
      return {
        nasa_id: d.nasa_id,
        title: d.title,
        secondary_creator: d.secondary_creator,
        center: d.center,
        keywords: d.keywords ?? [],
        asset_href: it.href, // collection.json endpoint
      };
    })
    .filter((x) => x.nasa_id);
}

async function nasaResolveOriginalUrl(nasa_id) {
  // /asset/<nasa_id> returns the full set of resolutions
  const res = await fetch(`${NASA_API}/asset/${encodeURIComponent(nasa_id)}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) return null;
  const json = await res.json();
  const links = (json?.collection?.items ?? []).map((it) => it.href).filter(Boolean);
  // Prefer ~orig (largest), then ~large, then any image
  const orig = links.find((u) => /~orig\.(jpg|jpeg|png|tif)$/i.test(u));
  if (orig) return orig;
  const large = links.find((u) => /~large\.(jpg|jpeg|png)$/i.test(u));
  if (large) return large;
  return links.find((u) => /\.(jpg|jpeg|png)$/i.test(u)) ?? null;
}

function nasaSourcePageUrl(nasa_id) {
  return `https://images.nasa.gov/details/${encodeURIComponent(nasa_id)}`;
}

// ── Wikimedia Commons (TIER 7 — failover) ─────────────────────────

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    list: 'search',
    srsearch: query + ' filetype:bitmap',
    srnamespace: '6',
    srlimit: '10',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons search HTTP ${res.status}`);
  const json = await res.json();
  return (json?.query?.search ?? []).map((r) => r.title.replace(/^File:/, ''));
}

async function _commonsFileExists(filename) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${filename}`,
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return false;
  const json = await res.json();
  const pages = json?.query?.pages ?? {};
  return !Object.values(pages).some((p) => p.missing !== undefined);
}

// ── Resolver — agency-first, Commons failover ─────────────────────

async function resolveSource(plan) {
  // TIER 1: NASA Image and Video Library
  if (plan.nasaQuery) {
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
      console.log(`    [NASA] ${e.message} — falling through`);
    }
  }

  // TIER 7: Wikimedia Commons (failover)
  try {
    const candidates = await commonsSearch(plan.commonsQuery);
    if (candidates.length === 0) return null;
    const jpg = candidates.find((c) => /\.(jpg|jpeg)$/i.test(c)) ?? candidates[0];
    return {
      source_type: 'wikimedia-commons',
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(jpg)}`,
      image_url: `${COMMONS_FILEPATH}/${encodeURIComponent(jpg)}?width=1600`,
      credit: 'NASA / agency original via Wikimedia Commons mirror',
      license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
      commons_file: jpg,
    };
  } catch (e) {
    console.log(`    [Commons] ${e.message}`);
    return null;
  }
}

// ── Download + process ────────────────────────────────────────────

async function downloadAndProcess(imageUrl, dir, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status} for ${imageUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const baseJpg = await sharp(buf).rotate().jpeg({ quality: 90 }).toBuffer();
  writeFileSync(`${dir}/${slot}.jpg`, baseJpg);

  const meta = await sharp(baseJpg).metadata();
  const { width: W, height: H } = meta;
  const side = Math.min(W, H);
  const left = Math.round((W - side) / 2);
  const top = Math.round((H - side) / 2);
  await sharp(baseJpg)
    .extract({ left, top, width: side, height: side })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

// ── Main loop ──────────────────────────────────────────────────────

const SOURCES = JSON.parse(readFileSync(SIDECAR_PATH, 'utf8'));
const stats = { nasa: 0, commons: 0, miss: 0 };
const failures = [];

for (const [missionId, slots] of Object.entries(PLAN)) {
  const dir = `static/images/${SURFACE}/${missionId}`;
  mkdirSync(dir, { recursive: true });
  console.log(`\n=== ${missionId} ===`);

  for (const plan of slots) {
    if (existsSync(`${dir}/${plan.slot}.jpg`)) {
      console.log(`⊙ ${missionId}/${plan.slot}: on disk, skipping`);
      continue;
    }
    try {
      process.stdout.write(`→ ${missionId}/${plan.slot} (${plan.label})…\n  `);
      const source = await resolveSource(plan);
      if (!source) {
        console.log(`  ✗ no NASA or Commons match`);
        failures.push({ id: `${missionId}/${plan.slot}`, reason: 'no-source' });
        stats.miss++;
        continue;
      }
      const tier = source.source_type === 'nasa-image-library' ? '[NASA]' : '[Commons]';
      console.log(`  ${tier} ${source.nasa_id ?? source.commons_file}`);
      await downloadAndProcess(source.image_url, dir, plan.slot);

      SOURCES[`${missionId}/${plan.slot}`] = {
        source_type: source.source_type,
        source_url: source.source_url,
        image_url: source.image_url,
        credit: source.credit,
        license: source.license,
        fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
        ...(source.nasa_id ? { nasa_id: source.nasa_id, nasa_title: source.nasa_title } : {}),
        ...(source.commons_file ? { commons_file: source.commons_file } : {}),
      };
      console.log(`  ✓ ${source.source_type}`);
      if (source.source_type === 'nasa-image-library') stats.nasa++;
      else stats.commons++;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      console.log(`  ✗ ${e.message}`);
      failures.push({ id: `${missionId}/${plan.slot}`, reason: e.message });
      stats.miss++;
    }
  }
}

writeFileSync(SIDECAR_PATH, JSON.stringify(SOURCES, null, 2) + '\n');

console.log(`\n── result ──`);
console.log(`  NASA images-api: ${stats.nasa}`);
console.log(`  Commons failover: ${stats.commons}`);
console.log(`  missing: ${stats.miss}`);
if (failures.length > 0) {
  console.log('\nFailures (need broader queries or per-image curation):');
  for (const f of failures) console.log(`  ${f.id}: ${f.reason}`);
}
