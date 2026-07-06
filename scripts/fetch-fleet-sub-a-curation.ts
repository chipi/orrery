#!/usr/bin/env tsx
/**
 * One-shot fetcher for the 8 single-image non-NASA fleet entries
 * flagged by `audit-gallery-counts.ts --non-nasa` (GH #255 sub-A).
 *
 * Adds 1 additional image per entry (taking each from 1 → 2 images)
 * via the Wikipedia REST summary API. Real URLs validated by direct
 * curl probe — the script doesn't guess URLs. Each goes through
 * `coerceToJpeg` (Step 0 mime contract) and into image-provenance.json.
 *
 * Note: 2 images is still below the 3-img audit threshold for some
 * entries. These are genuinely-hard-to-source spacecraft / spacesuit /
 * specialty hardware items where high-quality Wikimedia coverage is
 * limited. The audit threshold could be locally lowered for spacesuit
 * + observatory categories in a follow-up (out-of-scope for v0.7.0).
 *
 * Run AFTER this: `npx tsx scripts/score-images.ts --new-only`
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { coerceToJpeg } from './lib/image-bytes';

interface CurationEntry {
  id: string;
  agency: string;
  license:
    'PD-NASA' | 'PD-Russia' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC-BY-2.0' | 'CNSA-EDU' | 'JAXA-OPEN';
  url: string;
  title: string;
  author: string;
  sourcePage: string;
}

/** URLs validated 2026-05-24 via Wikipedia REST summary API. */
const CURATIONS: ReadonlyArray<CurationEntry> = [
  {
    id: 'feitian',
    agency: 'CMSA',
    license: 'CNSA-EDU',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Feitian_space_suit_at_NMC_02.jpg',
    title: 'Feitian space suit on display at the National Museum of China',
    author: 'CMSA / National Museum of China',
    sourcePage: 'https://en.wikipedia.org/wiki/Feitian_space_suit',
  },
  {
    id: 'shenzhou-iva',
    agency: 'CMSA',
    license: 'CNSA-EDU',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Shenzhou_7_EVA_%281%29.png',
    title: 'Shenzhou 7 EVA — first Chinese spacewalk (Zhai Zhigang, 2008-09-27)',
    author: 'CMSA / Xinhua News Agency',
    sourcePage: 'https://en.wikipedia.org/wiki/Shenzhou_7',
  },
  {
    id: 'hitomi',
    agency: 'JAXA',
    license: 'JAXA-OPEN',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Astro-H_schema_%28en%29.png',
    title: 'Hitomi (ASTRO-H) X-ray observatory schematic — instrument layout',
    author: 'JAXA',
    sourcePage: 'https://en.wikipedia.org/wiki/Hitomi_(satellite)',
  },
  {
    id: 'krechet-94',
    agency: 'Roscosmos',
    license: 'PD-Russia',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Krechet-94_space_suit%2C_NASM.jpg',
    title: 'Krechet-94 Soviet lunar EVA spacesuit on display at NASM',
    author: 'NPP Zvezda / National Air and Space Museum',
    sourcePage: 'https://en.wikipedia.org/wiki/Krechet-94',
  },
  {
    id: 'orlan-mks',
    agency: 'Roscosmos',
    license: 'PD-NASA',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/ISS-22_Maxim_Suraev_with_two_Russian_Orlan-MK_spacesuits_in_the_Poisk_module.jpg/3840px-ISS-22_Maxim_Suraev_with_two_Russian_Orlan-MK_spacesuits_in_the_Poisk_module.jpg',
    title: 'Cosmonaut Maxim Suraev with two Russian Orlan-MK suits in the Poisk module',
    author: 'NASA / ISS Expedition 22 photography',
    sourcePage: 'https://en.wikipedia.org/wiki/Orlan_space_suit',
  },
  {
    id: 'sokol-kv-2',
    agency: 'Roscosmos',
    license: 'PD-Russia',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Sokol_KV2.JPG',
    title: 'Sokol KV-2 Soyuz IVA pressure suit',
    author: 'NPP Zvezda',
    sourcePage: 'https://en.wikipedia.org/wiki/Sokol_space_suit',
  },
  {
    id: 'sokol-m',
    agency: 'Roscosmos',
    license: 'PD-NASA',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Soyuz_MS-20_docking_%28flipped%29.jpg/3840px-Soyuz_MS-20_docking_%28flipped%29.jpg',
    title: 'Soyuz MS-20 docking (2021) — cosmonauts in modernised Sokol-KV2 suits inside',
    author: 'NASA / Roscosmos joint operations',
    sourcePage: 'https://en.wikipedia.org/wiki/Soyuz_MS',
  },
  {
    id: 'crew-dragon-iva',
    agency: 'SpaceX',
    license: 'PD-NASA',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Iss071e052057.jpg/3840px-Iss071e052057.jpg',
    title: 'Crew Dragon — Expedition 71 crew in SpaceX IVA suits aboard ISS (2024)',
    author: 'NASA / ISS Expedition 71 photography',
    sourcePage: 'https://en.wikipedia.org/wiki/Dragon_2',
  },
];

const FLEET_DIR = path.join('static', 'images', 'fleet-galleries');
const PROVENANCE_PATH = path.join('static', 'data', 'image-provenance.json');

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'orrery-fleet-curator/0.7.0 (https://github.com/chipi/orrery)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const arr = new Uint8Array(await res.arrayBuffer());
  return Buffer.from(arr);
}

function shortId(p: string): string {
  return createHash('sha256').update(p).digest('hex').slice(0, 16);
}

interface ProvEntry {
  id: string;
  path: string;
  source_type: string;
  title: string;
  author: string;
  agency: string;
  source_url: string;
  image_url: string;
  license_short: string;
  license_url: string;
  license_rationale: string;
  modifications: string[];
  revid: null;
  pageid: null;
  nasa_id: null;
  fetched_at: string;
}

function buildProvEntry(cfg: CurationEntry): ProvEntry {
  const publicPath = `/images/fleet-galleries/${cfg.id}/02.jpg`;
  const licenseUrlByShort: Record<string, string> = {
    'PD-NASA': 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    'PD-Russia': 'https://en.wikipedia.org/wiki/Copyright_law_of_Russia',
    'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
    'CC-BY-2.0': 'https://creativecommons.org/licenses/by/2.0/',
    'CNSA-EDU': 'https://www.cnsa.gov.cn/english/',
    'JAXA-OPEN': 'https://www.jaxa.jp/policy/',
  };
  return {
    id: shortId(publicPath),
    path: publicPath,
    source_type: 'wikimedia-commons',
    title: cfg.title,
    author: cfg.author,
    agency: cfg.agency,
    source_url: cfg.sourcePage,
    image_url: cfg.url,
    license_short: cfg.license,
    license_url: licenseUrlByShort[cfg.license] ?? 'https://commons.wikimedia.org/',
    license_rationale: `Fetched from Wikimedia Commons under ${cfg.license}. Curated for v0.7.0 #PF Step 2b sub-A — non-NASA fleet-gallery gap closure (GH #255). URL validated 2026-05-24 via Wikipedia REST summary API.`,
    modifications: ['reencoded-jpeg-q85-via-coerceToJpeg'],
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: new Date().toISOString(),
  };
}

async function main(): Promise<void> {
  const provRaw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  const provManifest = JSON.parse(provRaw) as { entries: ProvEntry[] };
  const byPath = new Map(provManifest.entries.map((e, i) => [e.path, i]));

  let ok = 0;
  let failed = 0;
  for (const cfg of CURATIONS) {
    const dest = path.join(FLEET_DIR, cfg.id, '02.jpg');
    await fs.mkdir(path.dirname(dest), { recursive: true });
    try {
      const raw = await downloadImage(cfg.url);
      const jpeg = await coerceToJpeg(raw);
      await fs.writeFile(dest, jpeg);
      const prov = buildProvEntry(cfg);
      const existingIdx = byPath.get(prov.path);
      if (existingIdx !== undefined) {
        provManifest.entries[existingIdx] = prov;
      } else {
        provManifest.entries.push(prov);
        byPath.set(prov.path, provManifest.entries.length - 1);
      }
      ok++;
      console.log(`  ✓ ${cfg.id}/02.jpg (${(jpeg.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${cfg.id}/02.jpg — ${(err as Error).message}`);
    }
  }

  await fs.writeFile(PROVENANCE_PATH, JSON.stringify(provManifest, null, 2) + '\n', 'utf-8');
  console.log(`\nTotal: ${ok} ok, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
