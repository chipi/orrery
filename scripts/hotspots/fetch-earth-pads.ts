/**
 * Earth launch-pad Tier-2 imagery (#546) — the /moon//mars progressive-zoom
 * ladder for the 10 US pads on /earth?mode=surface. Two layers per pad:
 *
 *   REGIONAL — Copernicus Sentinel-2 L2A true-colour (10 m/px), discovered via
 *     the Earth Search STAC API and window-cropped straight from the public
 *     AWS COG bucket via gdal `/vsicurl` (no full-file downloads — the exact
 *     Kaguya flow, fetch-moon-kaguya-regional.ts). 1600 px @ 10 m = 16 km,
 *     matching the Moon/Mars regional extent.
 *   DETAIL — USGS NAIP aerial (~0.6 m/px native) via the National Map
 *     ImageServer exportImage endpoint: the server crops + reprojects the
 *     requested bbox itself, so no raster plumbing is needed. 1024 px over a
 *     512 m window ≈ 0.5 m/px.
 *
 * Output: static/images/hotspots/earth/<site>/tier2-regional.jpg + tier2-detail.jpg
 * Both writes self-credit provenance (buildSentinel2ProvenanceEntry /
 * buildNaipProvenanceEntry → upsertProvenanceEntries) — surgical upserts, never
 * a whole-file regenerate (AGENTS.md LFS-stub trap).
 *
 * Run (Node 20 + gdal-async, like every hotspots script):
 *   env -u NODE_OPTIONS ~/.nvm/versions/node/v20.20.2/bin/node --import tsx \
 *     scripts/hotspots/fetch-earth-pads.ts [siteId ...]
 *
 * AFTER any run: regenerate the consumed 1x1 variants (half-baked-tile trap).
 * Pass ONLY the base masters — a bare *.jpg glob re-feeds existing .1x1.jpg
 * variants and mints stray .1x1.1x1.jpg files (2026-09-10 cleanup):
 *   node scripts/hotspots/regenerate-tier3-variants.mjs \
 *     static/images/hotspots/earth/<site>/tier2-{detail,regional}.jpg
 *
 * ADDING A NEW PAD also needs a surface-hotspots.json sidecar entry with,
 * besides the tier2 source/ground_m fields, **region_bounds** (a lat/lon box
 * ~ hotspot_tier2_ground_m around the pad) + region_kind 'roi_quad' — the
 * SurfaceScene flat-patch trigger is gated on region_bounds != null, so
 * without it "Zoom to detail" flies the camera but the true-scale ground
 * view never engages (the 2026-09-10 all-pads bug).
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import {
  buildGsiProvenanceEntry,
  buildIgnProvenanceEntry,
  buildNaipProvenanceEntry,
  buildSentinel2ProvenanceEntry,
  upsertProvenanceEntries,
} from './provenance.ts';

/**
 * Per-pad DETAIL strategy (#546 phase 2 — all 26 pads):
 *   naip        — USGS NAIP exportImage (~0.5 m/px, PD-USGov). US pads.
 *   ign-wms     — IGN Géoplateforme WMS BD ORTHO (Licence Ouverte, attribution).
 *                 Covers French Guiana → Kourou. Probed 2026-09-10, real imagery.
 *   gsi-tiles   — GSI Japan seamlessphoto XYZ tiles (GSI terms, attribution).
 *                 Covers Tanegashima. Probed 2026-09-10, real imagery.
 *   s2-fallback — no open sub-meter source (KZ / RU / CN / IN): a TIGHTER
 *                 Sentinel-2 crop stands in as the detail patch — the Moon
 *                 Kaguya-failover doctrine (softer but real, never the wrong
 *                 subject), disclosed in provenance.
 */
type DetailStrategy = 'naip' | 'ign-wms' | 'gsi-tiles' | 's2-fallback';
const PAD_STRATEGY: Record<string, DetailStrategy> = {
  // US — NAIP
  'cape-canaveral-lc-36b': 'naip',
  'cape-canaveral-slc-40': 'naip',
  'cape-canaveral-slc-41': 'naip',
  'lc-14': 'naip',
  'lc-34': 'naip',
  'lc-39a': 'naip',
  'lc-39b': 'naip',
  'lc-5': 'naip',
  'starbase-orbital-a': 'naip',
  'vandenberg-slc-4e': 'naip',
  // French Guiana — IGN open ortho
  'kourou-ela-2': 'ign-wms',
  'kourou-ela-3': 'ign-wms',
  'kourou-ela-4': 'ign-wms',
  // Japan — GSI seamlessphoto
  'tanegashima-yoshinobu': 'gsi-tiles',
  // Kazakhstan / Russia / China / India — no open sub-meter source
  'baikonur-1-5': 's2-fallback',
  'baikonur-200': 's2-fallback',
  'baikonur-31-6': 's2-fallback',
  'gagarins-start': 's2-fallback',
  'plesetsk-41-1': 's2-fallback',
  'plesetsk-43': 's2-fallback',
  'jiuquan-slc-43': 's2-fallback',
  'taiyuan-lc-9': 's2-fallback',
  'wenchang-lc-101': 's2-fallback',
  'xichang-lc-2': 's2-fallback',
  'xichang-lc-3': 's2-fallback',
  'sriharikota-slp': 's2-fallback',
};
const ALL_PAD_IDS = Object.keys(PAD_STRATEGY);

const STAC_URL = 'https://earth-search.aws.element84.com/v1/search';
const NAIP_EXPORT =
  'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage';
const IGN_WMS = 'https://data.geopf.fr/wms-r/wms';
const GSI_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto';

const REGIONAL_CROP_PX = 1600; // 1600 px @ 10 m/px = 16 km — Moon/Mars regional extent
const DETAIL_WINDOW_M = 512; // half-km window around the pad
// 2048 → ~0.25 m/px requested; NAIP (down to ~0.3 m/px) and IGN BD ORTHO
// (0.2 m/px) genuinely carry it. Was 1024 (~0.5 m/px) — at deep zoom the
// magnified patch read soft (2026-09-11 operator feedback).
const DETAIL_SIZE_PX = 2048;
// GSI z18 tiles bottom out ~0.5-0.6 m/px — upscaling the stitch past 1024
// adds bytes, not detail. Keep Tanegashima at its native-ish output.
const GSI_OUT_PX = 1024;
const S2_FALLBACK_WINDOW_M = 2560; // 256 px @ 10 m — the honest coarse detail window
const GSI_ZOOM = 18; // ~0.5 m/px at Tanegashima's latitude

interface StacFeature {
  id: string;
  properties: { datetime: string; 'eo:cloud_cover'?: number };
  assets?: Record<string, { href?: string }>;
}

interface PadSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

function loadPads(filterIds: string[]): PadSite[] {
  const dir = 'static/data/fleet/launch-site';
  return filterIds.map((id) => {
    const d = JSON.parse(readFileSync(path.join(dir, `${id}.json`), 'utf8')) as {
      id: string;
      name: string;
      lat: number;
      lon: number;
    };
    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon)) {
      throw new Error(`${id}: launch-site entry has no finite lat/lon`);
    }
    return { id: d.id, name: d.name, lat: d.lat, lon: d.lon };
  });
}

/** Latest low-cloud Sentinel-2 L2A scenes covering the pad. Cloud-cover ladder
 *  (8 → 20 → 40%) so persistently-cloudy sites (tropical Kourou/Sriharikota)
 *  still resolve a usable scene instead of failing outright. */
async function stacSearch(lat: number, lon: number): Promise<StacFeature[]> {
  const d = 0.05;
  for (const maxCloud of [8, 20, 40]) {
    const res = await fetch(STAC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collections: ['sentinel-2-l2a'],
        bbox: [lon - d, lat - d, lon + d, lat + d],
        query: { 'eo:cloud_cover': { lt: maxCloud } },
        sortby: [{ field: 'properties.datetime', direction: 'desc' }],
        limit: 8,
      }),
    });
    if (!res.ok) throw new Error(`STAC search HTTP ${res.status}`);
    const body = (await res.json()) as { features: StacFeature[] };
    if (body.features?.length) return body.features;
  }
  return [];
}

/** Returns the winning scene so the s2-fallback detail can reuse it. */
async function fetchRegional(site: PadSite): Promise<StacFeature | null> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-regional.jpg`;
  const feats = await stacSearch(site.lat, site.lon);
  if (!feats.length) {
    console.log(`  ✗ ${site.id}: no low-cloud Sentinel-2 scene found`);
    return null;
  }
  for (const f of feats.slice(0, 6)) {
    const href = f.assets?.visual?.href;
    if (!href || !href.endsWith('.tif')) continue;
    try {
      const result = await cropRemoteRasterToLatLon({
        localRasterPath: `/vsicurl/${href}`,
        targetLat: site.lat,
        targetLon: site.lon,
        outputPath,
        cropSize: REGIONAL_CROP_PX,
        jpegQuality: 88,
      });
      await upsertProvenanceEntries([
        buildSentinel2ProvenanceEntry({
          outputPath,
          sourceUrl: href,
          productId: f.id,
          siteId: site.id,
          siteName: site.name,
          centerLat: site.lat,
          centerLon: site.lon,
          cropSize: REGIONAL_CROP_PX,
          sceneDate: f.properties.datetime,
        }),
      ]);
      console.log(
        `  ✓ ${site.id} regional: ${f.id} (cloud ${f.properties['eo:cloud_cover']?.toFixed(1)}%) @ ${result.resolutionMPerPx.toFixed(1)} m/px → ${outputPath}`,
      );
      return f;
    } catch (err) {
      const tag = err instanceof CropError ? err.code : (err as Error).message;
      console.log(`    · ${f.id} → ${tag}, next candidate`);
    }
  }
  console.log(`  ✗ ${site.id}: every Sentinel-2 candidate failed`);
  return null;
}

/** Shared bbox math: half-window in degrees around the pad. */
function bboxDeg(site: PadSite, windowM: number): { dLat: number; dLon: number } {
  return {
    dLat: windowM / 2 / 111_320,
    dLon: windowM / 2 / (111_320 * Math.cos((site.lat * Math.PI) / 180)),
  };
}

/** Validate + write a fetched JPEG buffer, failing honest on service-error bodies. */
function writeJpeg(outputPath: string, buf: Buffer, label: string): boolean {
  if (buf.length < 10_000 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    console.log(
      `  ✗ ${label}: response is not a plausible JPEG (${buf.length} bytes) — ${buf.slice(0, 80).toString('utf8')}`,
    );
    return false;
  }
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buf);
  return true;
}

async function fetchDetailNaip(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  const { dLat, dLon } = bboxDeg(site, DETAIL_WINDOW_M);
  const bbox = [site.lon - dLon, site.lat - dLat, site.lon + dLon, site.lat + dLat].join(',');
  const url = `${NAIP_EXPORT}?bbox=${bbox}&bboxSR=4326&size=${DETAIL_SIZE_PX},${DETAIL_SIZE_PX}&format=jpg&f=image`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  ✗ ${site.id} detail: NAIP exportImage HTTP ${res.status}`);
    return false;
  }
  if (!writeJpeg(outputPath, Buffer.from(await res.arrayBuffer()), `${site.id} detail`))
    return false;
  await upsertProvenanceEntries([
    buildNaipProvenanceEntry({
      outputPath,
      sourceUrl: url,
      siteId: site.id,
      siteName: site.name,
      centerLat: site.lat,
      centerLon: site.lon,
      windowM: DETAIL_WINDOW_M,
      sizePx: DETAIL_SIZE_PX,
    }),
  ]);
  console.log(`  ✓ ${site.id} detail: NAIP ${DETAIL_WINDOW_M} m @ ~0.5 m/px → ${outputPath}`);
  return true;
}

/** IGN Géoplateforme WMS GetMap — BD ORTHO under the Etalab open licence.
 *  WMS 1.3.0 + EPSG:4326 means the BBOX axis order is LAT,LON. */
async function fetchDetailIgn(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  const { dLat, dLon } = bboxDeg(site, DETAIL_WINDOW_M);
  const bbox = [site.lat - dLat, site.lon - dLon, site.lat + dLat, site.lon + dLon].join(',');
  const url =
    `${IGN_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ORTHOIMAGERY.ORTHOPHOTOS` +
    `&STYLES=&CRS=EPSG:4326&BBOX=${bbox}&WIDTH=${DETAIL_SIZE_PX}&HEIGHT=${DETAIL_SIZE_PX}&FORMAT=image/jpeg`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  ✗ ${site.id} detail: IGN WMS HTTP ${res.status}`);
    return false;
  }
  if (!writeJpeg(outputPath, Buffer.from(await res.arrayBuffer()), `${site.id} detail`))
    return false;
  await upsertProvenanceEntries([
    buildIgnProvenanceEntry({
      outputPath,
      sourceUrl: url,
      siteId: site.id,
      siteName: site.name,
      centerLat: site.lat,
      centerLon: site.lon,
      windowM: DETAIL_WINDOW_M,
      sizePx: DETAIL_SIZE_PX,
    }),
  ]);
  console.log(`  ✓ ${site.id} detail: IGN ortho ${DETAIL_WINDOW_M} m → ${outputPath}`);
  return true;
}

/** GSI Japan seamlessphoto XYZ tiles — stitch the z18 grid covering the
 *  window, crop to the exact bbox, resize to DETAIL_SIZE_PX. */
async function fetchDetailGsi(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  const sharp = (await import('sharp')).default;
  const z = GSI_ZOOM;
  const n = 2 ** z;
  // Web-mercator tile coords (fractional) of the window corners.
  const xOf = (lon: number): number => ((lon + 180) / 360) * n;
  const yOf = (lat: number): number =>
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  const { dLat, dLon } = bboxDeg(site, DETAIL_WINDOW_M);
  const x0 = xOf(site.lon - dLon);
  const x1 = xOf(site.lon + dLon);
  const y0 = yOf(site.lat + dLat); // north edge → smaller y
  const y1 = yOf(site.lat - dLat);
  const tx0 = Math.floor(x0);
  const tx1 = Math.floor(x1);
  const ty0 = Math.floor(y0);
  const ty1 = Math.floor(y1);
  const cols = tx1 - tx0 + 1;
  const rows = ty1 - ty0 + 1;
  const tiles: { input: Buffer; left: number; top: number }[] = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const res = await fetch(`${GSI_TILES}/${z}/${tx}/${ty}.jpg`);
      if (!res.ok) {
        console.log(`  ✗ ${site.id} detail: GSI tile ${z}/${tx}/${ty} HTTP ${res.status}`);
        return false;
      }
      tiles.push({
        input: Buffer.from(await res.arrayBuffer()),
        left: (tx - tx0) * 256,
        top: (ty - ty0) * 256,
      });
    }
  }
  const mosaic = sharp({
    create: { width: cols * 256, height: rows * 256, channels: 3, background: '#000' },
  }).composite(tiles);
  // Crop the exact window out of the stitched grid.
  const left = Math.round((x0 - tx0) * 256);
  const top = Math.round((y0 - ty0) * 256);
  const width = Math.round((x1 - x0) * 256);
  const height = Math.round((y1 - y0) * 256);
  const out = await mosaic
    .jpeg()
    .toBuffer()
    .then((b) =>
      sharp(b)
        .extract({ left, top, width, height })
        .resize(GSI_OUT_PX, GSI_OUT_PX)
        .jpeg({ quality: 88 })
        .toBuffer(),
    );
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, out);
  await upsertProvenanceEntries([
    buildGsiProvenanceEntry({
      outputPath,
      sourceUrl: `${GSI_TILES}/${z}/${Math.floor(xOf(site.lon))}/${Math.floor(yOf(site.lat))}.jpg`,
      siteId: site.id,
      siteName: site.name,
      centerLat: site.lat,
      centerLon: site.lon,
      windowM: DETAIL_WINDOW_M,
      zoom: z,
    }),
  ]);
  console.log(
    `  ✓ ${site.id} detail: GSI seamlessphoto z${z} ${DETAIL_WINDOW_M} m → ${outputPath}`,
  );
  return true;
}

/** No open sub-meter source: a TIGHTER crop of the SAME Sentinel-2 scene the
 *  regional used stands in as detail — the Moon Kaguya-failover doctrine
 *  (softer but real, never the wrong subject). 2560 m window at 10 m/px,
 *  upscaled ×2 for the patch renderer; disclosed in provenance. */
async function fetchDetailS2Fallback(site: PadSite, scene: StacFeature): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  const sharp = (await import('sharp')).default;
  const href = scene.assets?.visual?.href;
  if (!href) return false;
  try {
    const tmpPath = `${outputPath}.tmp.jpg`;
    await cropRemoteRasterToLatLon({
      localRasterPath: `/vsicurl/${href}`,
      targetLat: site.lat,
      targetLon: site.lon,
      outputPath: tmpPath,
      cropSize: S2_FALLBACK_WINDOW_M / 10, // 10 m/px source pixels
      jpegQuality: 92,
    });
    const up = await sharp(tmpPath).resize(512, 512).jpeg({ quality: 88 }).toBuffer();
    writeFileSync(outputPath, up);
    (await import('node:fs')).unlinkSync(tmpPath);
  } catch (err) {
    const tag = err instanceof CropError ? err.code : (err as Error).message;
    console.log(`  ✗ ${site.id} detail (s2-fallback): ${tag}`);
    return false;
  }
  const prov = buildSentinel2ProvenanceEntry({
    outputPath,
    sourceUrl: href,
    productId: scene.id,
    siteId: site.id,
    siteName: site.name,
    centerLat: site.lat,
    centerLon: site.lon,
    cropSize: S2_FALLBACK_WINDOW_M / 10,
    sceneDate: scene.properties.datetime,
  });
  // Disclose the coarse stand-in honestly (no open sub-meter source here).
  prov.modifications.push('upscaled-256-to-512', 'coarse-detail-fallback-no-open-submeter-source');
  await upsertProvenanceEntries([prov]);
  console.log(
    `  ✓ ${site.id} detail: Sentinel-2 fallback ${S2_FALLBACK_WINDOW_M} m @ 10 m/px → ${outputPath}`,
  );
  return true;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  // --detail-only: re-fetch the detail layer without touching the regional —
  // a regional re-run re-picks the latest low-cloud Sentinel-2 scene, which
  // would silently swap operator-APPROVED imagery. Not valid for s2-fallback
  // pads (their detail reuses the regional's winning scene).
  const detailOnly = argv.includes('--detail-only');
  const only = argv.filter((a) => !a.startsWith('--'));
  const ids = only.length ? only.filter((id) => ALL_PAD_IDS.includes(id)) : ALL_PAD_IDS;
  const pads = loadPads(ids);
  console.log(`fetch-earth-pads: ${pads.length} pad(s)${detailOnly ? ' [detail-only]' : ''}`);
  let ok = 0;
  for (const site of pads) {
    const strategy = PAD_STRATEGY[site.id];
    console.log(`\n${site.id} (${site.name}) @ ${site.lat}, ${site.lon} [${strategy}]`);
    if (detailOnly && strategy === 's2-fallback') {
      console.log(`  ✗ ${site.id}: --detail-only cannot re-derive an s2-fallback detail`);
      continue;
    }
    const scene = detailOnly ? null : await fetchRegional(site);
    let d = false;
    if (strategy === 'naip') d = await fetchDetailNaip(site);
    else if (strategy === 'ign-wms') d = await fetchDetailIgn(site);
    else if (strategy === 'gsi-tiles') d = await fetchDetailGsi(site);
    else if (scene) d = await fetchDetailS2Fallback(site, scene);
    else console.log(`  ✗ ${site.id} detail: no regional scene to fall back to`);
    if ((detailOnly || scene) && d) ok += 1;
  }
  console.log(`\nDONE ${ok}/${pads.length} pads fully fetched`);
  if (ok < pads.length) process.exitCode = 1;
}

void main();
