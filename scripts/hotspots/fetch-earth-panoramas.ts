/**
 * Earth launch-pad Tier-3 panoramas (#546 phase 3) — every OPEN-LICENSED
 * ground/aerial panorama the 2026-09-10 sourcing scout confirmed, padded to
 * 4096×2048 equirectangular via panorama-padder.ts (the /moon//mars flow).
 *
 * Sources are Wikimedia Commons / agency files (CC0 / CC-BY-SA / GODL-India /
 * PD) — fetched via Special:FilePath, cached in
 * .image-cache/hotspots/panoramas/earth/ so re-pads are offline.
 *
 * The azimuth/elevation numbers are AUTHORED estimates (the implied-vFOV
 * formula only holds for clean cylindrical sources — stitched/aerial shots
 * are tuned by eye; see the operator-review loop). Honest captions carry the
 * non-ideal viewpoints (aerial, distant) — single-frame-with-honest-caption
 * beats graceful-absent.
 *
 * Run: env -u NODE_OPTIONS ~/.nvm/versions/node/v20.20.2/bin/node --import tsx \
 *        scripts/hotspots/fetch-earth-panoramas.ts [siteId ...]
 */
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { padToEquirectangular, type MarsColourPalette } from './panorama-padder.ts';
import { upsertProvenanceEntries, type ProvenanceEntry } from './provenance.ts';

const CACHE_DIR = '.image-cache/hotspots/panoramas/earth';
const OUTPUT_BASE = 'static/images/hotspots/earth';

interface EarthPanoramaConfig {
  siteId: string;
  /** Commons file name (Special:FilePath resolves it). */
  commonsFile: string;
  commonsPage: string;
  /** Horizontal angular COVERAGE of the photo in degrees (≈ aspect × vFOV),
   *  not a compass direction — the padder maps it to strip width. */
  srcAzimuthDeg: number;
  srcElevationTopDeg: number;
  srcElevationBottomDeg: number;
  author: string;
  licenseShort: string;
  licenseUrl: string;
  licenseRationale: string;
  /** Honest one-line description incl. viewpoint caveats (aerial/distant). */
  caption: string;
  palette?: Partial<MarsColourPalette>;
}

const CONFIGS: EarthPanoramaConfig[] = [
  {
    // The scout's star find: CC0, ground-level from atop the Soyuz structure.
    siteId: 'baikonur-31-6',
    commonsFile: 'Baikonur_Cosmodrome_Site_31.JPG',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:Baikonur_Cosmodrome_Site_31.JPG',
    srcAzimuthDeg: 200,
    srcElevationTopDeg: 30,
    srcElevationBottomDeg: 36,
    author: 'Paulsday86 (Wikimedia Commons)',
    licenseShort: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    licenseRationale:
      'Uploader released the panorama under CC0 1.0 (public-domain dedication) on Wikimedia Commons.',
    caption:
      'Baikonur Site 31/6 from the top of the Soyuz service structure (2014) — the Zenit facility on the horizon.',
  },
  {
    siteId: 'vandenberg-slc-4e',
    commonsFile: 'SLC-4E.jpg',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:SLC-4E.jpg',
    srcAzimuthDeg: 110,
    srcElevationTopDeg: 16,
    srcElevationBottomDeg: 40,
    author: 'SpacecoasterVBG (Wikimedia Commons)',
    licenseShort: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    licenseRationale:
      'Published on Wikimedia Commons under CC BY-SA 4.0 — reuse with attribution and share-alike. The padded equirectangular derivative served here is itself licensed CC BY-SA 4.0 (the ShareAlike adapter’s license); modifications are listed in this entry.',
    caption:
      'Vandenberg SLC-4E and SLC-4W from the air (2015) — an aerial view, not a ground-level panorama.',
  },
  {
    siteId: 'sriharikota-slp',
    commonsFile: 'SDSC_panoroma_before_PSLVC61.webp',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:SDSC_panoroma_before_PSLVC61.webp',
    srcAzimuthDeg: 130,
    srcElevationTopDeg: 34,
    srcElevationBottomDeg: 40,
    author: 'ISRO (Indian Space Research Organisation)',
    licenseShort: 'GODL-India',
    licenseUrl: 'https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf',
    licenseRationale:
      'ISRO material published under the Government Open Data License – India: worldwide royalty-free reuse including commercial, with attribution.',
    caption:
      'Satish Dhawan Space Centre, Sriharikota — PSLV-C61 in transit from the Vehicle Integration Facility to the First Launch Pad (2025).',
  },
  {
    siteId: 'wenchang-lc-101',
    commonsFile: 'Wenchang_Space_Launch_Site_01.jpg',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:Wenchang_Space_Launch_Site_01.jpg',
    srcAzimuthDeg: 190,
    srcElevationTopDeg: 21,
    srcElevationBottomDeg: 20,
    author: 'Shujianyang (Wikimedia Commons)',
    licenseShort: 'CC-BY-SA-4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    licenseRationale:
      'Published on Wikimedia Commons under CC BY-SA 4.0 — reuse with attribution and share-alike. The padded equirectangular derivative served here is itself licensed CC BY-SA 4.0 (the ShareAlike adapter’s license); modifications are listed in this entry.',
    caption:
      'Wenchang launch site across Qishui Bay (2022) — the LC-101 towers seen from the beach, a distant shoreline view.',
  },
  {
    siteId: 'jiuquan-slc-43',
    commonsFile: 'Jiuquan_Satellite_Launch_Center_main_launch_tower.JPG',
    commonsPage:
      'https://commons.wikimedia.org/wiki/File:Jiuquan_Satellite_Launch_Center_main_launch_tower.JPG',
    srcAzimuthDeg: 150,
    srcElevationTopDeg: 25,
    srcElevationBottomDeg: 24,
    author: 'AAxanderr (Wikimedia Commons)',
    licenseShort: 'PD-self',
    licenseUrl: 'https://commons.wikimedia.org/wiki/Template:PD-self',
    licenseRationale:
      'Uploader released the work into the public domain on Wikimedia Commons (PD-self).',
    caption:
      'Jiuquan Satellite Launch Center main tower from a distance (2005) — a low-resolution panoramic strip.',
  },
  {
    siteId: 'baikonur-1-5',
    commonsFile: 'Baikonur-banner.jpg',
    commonsPage: 'https://commons.wikimedia.org/wiki/File:Baikonur-banner.jpg',
    srcAzimuthDeg: 160,
    srcElevationTopDeg: 12,
    srcElevationBottomDeg: 11,
    author: 'NASA / Bill Ingalls',
    licenseShort: 'PD-NASA',
    licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    licenseRationale:
      'NASA media (Bill Ingalls, 2008) — U.S. Government work, not subject to copyright (17 U.S.C. §105).',
    caption:
      "Gagarin's Start before the Soyuz TMA-13 rollout (2008) — a very low-resolution banner crop.",
  },
];

function buildEarthPanoramaProvenance(cfg: EarthPanoramaConfig, outPath: string): ProvenanceEntry {
  const provenancePath = outPath.replace(/^static/, '');
  const id = createHash('sha256').update(provenancePath).digest('hex').slice(0, 16);
  return {
    id,
    path: provenancePath,
    source_type: 'wikimedia-commons',
    title: `${cfg.caption}`,
    author: cfg.author,
    agency: cfg.author.includes('NASA')
      ? 'NASA'
      : cfg.author.includes('ISRO')
        ? 'ISRO'
        : 'Wikimedia Commons',
    source_url: cfg.commonsPage,
    image_url: `https://commons.wikimedia.org/wiki/Special:FilePath/${cfg.commonsFile}`,
    license_short: cfg.licenseShort,
    license_url: cfg.licenseUrl,
    license_rationale: cfg.licenseRationale,
    modifications: [
      `padded-to-4096x2048-equirect-az${cfg.srcAzimuthDeg}`,
      'sky-and-ground-fill-synthetic',
      'jpeg',
    ],
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: new Date().toISOString(),
  };
}

async function ensureCachedSource(cfg: EarthPanoramaConfig): Promise<string> {
  const cached = path.join(CACHE_DIR, cfg.commonsFile);
  if (existsSync(cached)) return cached;
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(cfg.commonsFile)}`;
  // Commons 429s the default node UA; identify per their bot policy + back off.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5000 * attempt));
    res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'OrrerySurfaceHotspots/1.0 (https://orrery.day; image sourcing)' },
    });
    if (res.status !== 429) break;
  }
  if (!res || !res.ok) throw new Error(`Commons fetch HTTP ${res?.status} for ${cfg.commonsFile}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20_000)
    throw new Error(`Suspiciously small file (${buf.length} B) — not the image?`);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  // tmp + rename so a killed run can't leave a truncated cache file that
  // existsSync() would trust on the next run (same pattern as
  // gdal-crop.ts ensureLocalRaster).
  await fs.writeFile(`${cached}.tmp`, buf);
  await fs.rename(`${cached}.tmp`, cached);
  return cached;
}

/** Mean RGB of a horizontal edge strip (top or bottom ~4% of the image). */
async function edgeColour(
  source: Buffer,
  edge: 'top' | 'bottom',
): Promise<[number, number, number]> {
  const meta = await sharp(source).metadata();
  const h = Math.max(2, Math.round((meta.height ?? 100) * 0.04));
  const top = edge === 'top' ? 0 : (meta.height ?? h) - h;
  const { data } = await sharp(source)
    .extract({ left: 0, top, width: meta.width ?? 1, height: h })
    .resize(1, 1, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return [data[0], data[1], data[2]];
}

/** Palette derived from the photo's own edges so the synthetic fill blends:
 *  horizon sky = top-edge colour, zenith = the same deepened, ground =
 *  bottom-edge colour, gap = their midpoint. */
async function derivePalette(source: Buffer): Promise<MarsColourPalette> {
  const skyEdge = await edgeColour(source, 'top');
  const groundEdge = await edgeColour(source, 'bottom');
  const zenith = skyEdge.map((c) => Math.round(c * 0.62)) as [number, number, number];
  const gap = skyEdge.map((c, i) => Math.round((c + groundEdge[i]) / 2)) as [
    number,
    number,
    number,
  ];
  return { skyHorizon: skyEdge, skyZenith: zenith, regolith: groundEdge, azimuthGap: gap };
}

async function processOne(cfg: EarthPanoramaConfig): Promise<boolean> {
  const outPath = path.join(OUTPUT_BASE, cfg.siteId, 'tier3-pan.jpg');
  try {
    const sourcePath = await ensureCachedSource(cfg);
    let sourceBytes: Buffer = await fs.readFile(sourcePath);
    // The padder consumes JPEG/PNG; convert webp sources first.
    if (cfg.commonsFile.endsWith('.webp')) {
      sourceBytes = await sharp(sourceBytes).jpeg({ quality: 95 }).toBuffer();
    }
    const derived = await derivePalette(sourceBytes);
    const padded = await padToEquirectangular({
      source: sourceBytes,
      srcAzimuthDeg: cfg.srcAzimuthDeg,
      srcElevationTopDeg: cfg.srcElevationTopDeg,
      srcElevationBottomDeg: cfg.srcElevationBottomDeg,
      palette: { ...derived, ...(cfg.palette ?? {}) },
    });
    // The padder left-aligns the photo strip (texture x = 0..coverage), and
    // the tier-3 skybox default view (yaw 0) faces texture azimuth 270°
    // (measured in-app 2026-09-10; the inside-out sphere mirrors the map,
    // x = 270 − yaw). Roll the equirect so the strip is centred at 270° and
    // STAND AT SITE opens on the photo centre.
    const rollPx = Math.round(((270 - cfg.srcAzimuthDeg / 2) / 360) * 4096);
    const rolled = await (async () => {
      // Out-of-range coverage (≤ 0 or so wide the roll wraps) → skip the
      // roll rather than hand sharp a non-positive extract width.
      if (rollPx <= 0 || rollPx >= 4096) return padded;
      const img = sharp(padded);
      const { width = 4096, height = 2048 } = await img.metadata();
      const left = await sharp(padded)
        .extract({ left: 0, top: 0, width: width - rollPx, height })
        .toBuffer();
      const right = await sharp(padded)
        .extract({ left: width - rollPx, top: 0, width: rollPx, height })
        .toBuffer();
      return sharp({ create: { width, height, channels: 3, background: '#000' } })
        .composite([
          { input: right, left: 0, top: 0 },
          { input: left, left: rollPx, top: 0 },
        ])
        .jpeg({ quality: 88 })
        .toBuffer();
    })();
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, rolled);
    await upsertProvenanceEntries([buildEarthPanoramaProvenance(cfg, outPath)]);
    console.log(`  ✓ ${cfg.siteId}: ${(rolled.length / 1024).toFixed(0)} KB → ${outPath}`);
    return true;
  } catch (e) {
    console.log(`  ✗ ${cfg.siteId}: ${(e as Error).message}`);
    return false;
  }
}

async function main(): Promise<void> {
  const only = process.argv.slice(2);
  const configs = only.length ? CONFIGS.filter((c) => only.includes(c.siteId)) : CONFIGS;
  console.log(`fetch-earth-panoramas: ${configs.length} site(s)`);
  let ok = 0;
  for (const cfg of configs) if (await processOne(cfg)) ok += 1;
  console.log(`DONE ${ok}/${configs.length}`);
  if (ok < configs.length) process.exitCode = 1;
}

void main();
