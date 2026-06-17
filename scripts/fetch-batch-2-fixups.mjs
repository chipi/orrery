#!/usr/bin/env node
// Fix-up pass for the 6 batch-2 slots that missed or got bad picks:
//   mariner9/04 (Phobos)        — no match on original run
//   akatsuki/04 (bow wave)      — no match
//   akatsuki/05 (H-IIA launch)  — no match
//   dart/04 (DART spacecraft)   — dupe of dart/03 (both PIA25329)
//   osiris-rex/02 (Bennu disk)  — pulled a TIFF 3D-model render
//   osiris-rex/03 (TAG sample)  — pulled a GIF animation
//
// Same resolver chain as fetch-batch-2-mission-images.mjs (NASA first,
// Commons failover); broader queries + explicit `prefer` filename
// hints when we know the PIA / Commons file we want.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const NASA_API = 'https://images-api.nasa.gov';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const SURFACE = 'missions';
const SIDECAR_PATH = 'static/data/mission-image-sources.json';

const SLOTS = [
  {
    id: 'mariner9/04',
    label: 'Phobos (first close-up)',
    nasaQuery: 'Phobos Mars Mariner 9 1971',
    commonsQuery: 'Phobos Mars Mariner 9',
  },
  {
    id: 'akatsuki/04',
    label: 'Venus polar vortex (Akatsuki LIR)',
    nasaQuery: null,
    commonsQuery: 'Akatsuki Venus polar vortex',
  },
  {
    id: 'akatsuki/05',
    label: 'H-IIA F17 launch (Akatsuki, 2010)',
    nasaQuery: null,
    commonsQuery: 'H-IIA F17 launch Tanegashima',
  },
  {
    id: 'dart/04',
    label: 'DART spacecraft (hardware portrait)',
    nasaQuery: 'DART spacecraft hardware assembled',
    commonsQuery: 'DART NASA spacecraft assembly',
  },
  {
    id: 'osiris-rex/02',
    label: 'Bennu mosaic (full disk, real photo)',
    nasaQuery: 'Bennu OSIRIS-REx PolyCam mosaic',
    commonsQuery: 'Bennu asteroid PolyCam mosaic',
    preferCommonsFile: '101955_Bennu.jpg',
  },
  {
    id: 'osiris-rex/03',
    label: 'TAG event (sample arm contact)',
    nasaQuery: 'OSIRIS-REx TAG arm Bennu sample',
    commonsQuery: 'OSIRIS-REx SamCam TAG Bennu',
  },
];

// ── NASA ──────────────────────────────────────────────────────────
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

// ── Commons ───────────────────────────────────────────────────────
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

async function commonsFileExists(filename) {
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

async function resolveSource(plan) {
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
      console.log(`    [NASA] ${e.message}`);
    }
  }

  // Commons failover — only accept real photographic formats this round.
  try {
    let pick;
    if (plan.preferCommonsFile && (await commonsFileExists(plan.preferCommonsFile))) {
      pick = plan.preferCommonsFile;
    } else {
      const candidates = await commonsSearch(plan.commonsQuery);
      // Strict: prefer .jpg/.jpeg over .png; reject .tiff/.tif/.gif/.svg.
      pick =
        candidates.find((c) => /\.(jpg|jpeg)$/i.test(c)) ??
        candidates.find((c) => /\.png$/i.test(c)) ??
        null;
    }
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
    .extract({
      left: Math.round((W - side) / 2),
      top: Math.round((H - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 90 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
}

const SOURCES = JSON.parse(readFileSync(SIDECAR_PATH, 'utf8'));
const stats = { nasa: 0, commons: 0, miss: 0 };
for (const plan of SLOTS) {
  const [missionId, slot] = plan.id.split('/');
  const dir = `static/images/${SURFACE}/${missionId}`;
  mkdirSync(dir, { recursive: true });
  console.log(`\n→ ${plan.id} (${plan.label})`);
  const source = await resolveSource(plan);
  if (!source) {
    console.log(`  ✗ no source — needs manual pick`);
    stats.miss++;
    continue;
  }
  const tag = source.source_type === 'nasa-image-library' ? '[NASA]' : '[Commons]';
  console.log(`  ${tag} ${source.nasa_id ?? source.commons_file}`);
  try {
    await downloadAndProcess(source.image_url, dir, slot);
    SOURCES[plan.id] = {
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
    stats.miss++;
  }
}

writeFileSync(SIDECAR_PATH, JSON.stringify(SOURCES, null, 2) + '\n');
console.log(`\n── fixup result ──`);
console.log(`  NASA: ${stats.nasa}  Commons: ${stats.commons}  miss: ${stats.miss}`);
