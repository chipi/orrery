/**
 * Earth launch-pad Tier-2 imagery (#546) — the /moon//mars progressive-zoom
 * ladder for the 10 US pads on /earth?mode=surface. Two layers per pad:
 *
 *   REGIONAL — Copernicus Sentinel-2 L2A true-colour (10 m/px), discovered via
 *     the Earth Search STAC API and window-cropped straight from the public
 *     AWS COG bucket via gdal `/vsicurl` (no full-file downloads — the exact
 *     Kaguya flow, fetch-moon-kaguya-regional.ts). 3200 px @ 10 m = 32 km,
 *     so multi-pad complexes (Kourou pads spread 10 km) stay inside sharp
 *     imagery around the pad (widened from 16 km 2026-11-09). The default
 *     path is the EOX cloudless mosaic of the same Sentinel-2 data.
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
 * Run (repo Node 22 via mise + gdal-async, like every hotspots script):
 *   env -u NODE_OPTIONS mise exec -- node --import tsx \
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
import { execFileSync } from 'node:child_process';
import gdal from 'gdal-async';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import {
  buildEoxCloudlessProvenanceEntry,
  buildGsiProvenanceEntry,
  buildLinzProvenanceEntry,
  buildIgnProvenanceEntry,
  buildNaipProvenanceEntry,
  buildSentinel2ProvenanceEntry,
  upsertProvenanceEntries,
} from './provenance.ts';

/**
 * Per-pad DETAIL strategy (#546 phase 2 — all 26 pads):
 *   naip        — USGS NAIP exportImage (~0.5 m/px, PD-USGov). US pads.
 *   ign-wms     — IGN Géoplateforme WMS BD ORTHO (Licence Ouverte, attribution).
 *                 Over Kourou it serves only 10–20 m imagery (re-probed 2026-10-22),
 *                 so the Kourou pads use s2-fallback; kept for metropolitan France.
 *   gsi-tiles   — GSI Japan seamlessphoto XYZ tiles (GSI terms, attribution).
 *                 Covers Tanegashima. Probed 2026-09-10, real imagery.
 *   linz        — LINZ NZ aerial imagery COGs (CC BY 4.0), 0.1 m survey read
 *                 down to ~0.25 m/px. Rocket Lab LC-1 (Mahia).
 *   eox         — no open sub-meter source: a 2.56 km crop of the EOX Sentinel-2
 *                 cloudless mosaic (10 m, CC BY-NC-SA 4.0 — Orrery is
 *                 non-commercial). Cloud-free, unlike a single scene; replaced
 *                 s2-fallback on 2026-11-04 (seven pads had cloud in the detail).
 *   s2-fallback — (kept for --regional s2) no open sub-meter source: a TIGHTER
 *                 Sentinel-2 crop stands in as the detail patch — the Moon
 *                 Kaguya-failover doctrine (softer but real, never the wrong
 *                 subject), disclosed in provenance.
 */
type DetailStrategy = 'naip' | 'ign-wms' | 'gsi-tiles' | 'linz' | 'eox' | 's2-fallback';
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
  'cape-canaveral-lc-17': 'naip',
  'wallops-lc-0': 'naip',
  // Vandenberg SFB — NAIP has no coverage there (identify returns NoData, a
  // 512 m export is all black; probed 2026-10-23). Sentinel-2 fallback instead.
  'vandenberg-slc-4e': 'eox',
  // French Guiana — IGN's WMS serves only 10–20 m imagery over Kourou (every
  // ortho layer probed 2026-10-22, incl. BD ORTHO and the dated layers), so a
  // 512 m IGN window was 10 m pixels upscaled. Sentinel-2 fallback instead.
  'kourou-ela-2': 'eox',
  'kourou-ela-3': 'eox',
  'kourou-ela-4': 'eox',
  'kourou-els': 'eox',
  'kourou-zlv': 'eox',
  // Japan — GSI seamlessphoto
  'tanegashima-yoshinobu': 'gsi-tiles',
  uchinoura: 'gsi-tiles',
  // Kazakhstan / Russia / China / India — no open sub-meter source
  'baikonur-1-5': 'eox',
  'baikonur-200': 'eox',
  'baikonur-31-6': 'eox',
  'plesetsk-41-1': 'eox',
  'plesetsk-43': 'eox',
  'jiuquan-slc-43': 'eox',
  'taiyuan-lc-9': 'eox',
  'wenchang-lc-101': 'eox',
  'xichang-lc-2': 'eox',
  'xichang-lc-3': 'eox',
  'sriharikota-slp': 'eox',
  'baikonur-81': 'eox',
  'vostochny-1s': 'eox',
  'wenchang-lc-201': 'eox',
  // Pads beyond the big programmes — Sentinel-2 only.
  'rocket-lab-lc-1': 'linz',
  'naro-space-center': 'eox',
  sohae: 'eox',
  'semnan-imam-khomeini': 'eox',
  palmachim: 'eox',
  woomera: 'eox',
  hammaguir: 'eox',
  'san-marco': 'eox',
  alcantara: 'eox',
};
const ALL_PAD_IDS = Object.keys(PAD_STRATEGY);

const STAC_URL = 'https://earth-search.aws.element84.com/v1/search';
const NAIP_EXPORT =
  'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage';
const IGN_WMS = 'https://data.geopf.fr/wms-r/wms';
const GSI_TILES = 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto';

const REGIONAL_CROP_PX = 3200; // 3200 px @ 10 m/px = 32 km, pad-centred (matches hotspot_tier2_regional_ground_m)
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
const EOX_WMS = 'https://tiles.maps.eox.at/wms';
const EOX_YEAR = 2025;
const EOX_LAYER = `s2cloudless-${EOX_YEAR}`;
const EOX_DETAIL_PX = 512; // 2.56 km of 10 m data, shown as the patch (×2, like s2-fallback)
/** LINZ aerial surveys per pad (nz-imagery bucket, NZTM 2193 COGs, CC BY 4.0). */
const LINZ_SURVEY: Record<string, string> = {
  'rocket-lab-lc-1': 'hawkes-bay/hawkes-bay-coast_2024_0.1m',
};
const LINZ_BUCKET = 'https://nz-imagery.s3-ap-southeast-2.amazonaws.com';
/** The survey's licensor and producer, from its STAC collection providers. */
const LINZ_CREDIT: Record<string, string> = {
  'rocket-lab-lc-1': "Hawke's Bay Regional Council (licensor) · SKYCAN (producer)",
};

interface StacFeature {
  id: string;
  properties: { datetime: string; 'eo:cloud_cover'?: number };
  assets?: Record<string, { href?: string }>;
  /** Set when the regional came from a same-day mosaic (pad near a tile
   *  corner); the s2-fallback detail crops the same mosaic. */
  mosaicPath?: string;
  mosaicIds?: string[];
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
        limit: 24,
      }),
    });
    if (!res.ok) throw new Error(`STAC search HTTP ${res.status}`);
    const body = (await res.json()) as { features: StacFeature[] };
    if (body.features?.length) return body.features;
  }
  return [];
}

/** A scene's footprint can cover the window while its data does not: the
 *  swath edge leaves a black nodata wedge (Sohae, LC-39B), and a NAIP export
 *  outside coverage comes back all black (Vandenberg). Refuse such a crop. */
const MAX_NODATA_FRACTION = 0.01;
async function nodataFraction(file: string): Promise<number> {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(file)
    .resize(200, 200, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let black = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] + data[i + 1] + data[i + 2] < 12) black++;
  }
  return black / (info.width * info.height);
}
async function assertCovered(file: string): Promise<void> {
  const f = await nodataFraction(file);
  if (f > MAX_NODATA_FRACTION) throw new Error(`NODATA ${(f * 100).toFixed(1)}%`);
}
async function coveredOrLog(file: string, label: string): Promise<boolean> {
  try {
    await assertCovered(file);
    return true;
  } catch (err) {
    console.log(`  ✗ ${label}: ${(err as Error).message}`);
    return false;
  }
}

/** Returns the winning scene so the s2-fallback detail can reuse it. */
async function fetchRegional(site: PadSite): Promise<StacFeature | null> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-regional.jpg`;
  const feats = await stacSearch(site.lat, site.lon);
  if (!feats.length) {
    console.log(`  ✗ ${site.id}: no low-cloud Sentinel-2 scene found`);
    return null;
  }
  for (const f of feats.slice(0, 16)) {
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
        requireCentered: true,
      });
      await assertCovered(outputPath);
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
  // No single tile holds a centred window: the pad sits near a tile edge or
  // corner (Baikonur, Wenchang). Mosaic the same-day tiles of one UTM zone —
  // same CRS, so a VRT needs no reprojection — and crop that.
  const groups = new Map<string, StacFeature[]>();
  for (const f of feats) {
    const zone = f.id.split('_')[1]?.slice(0, 2);
    const key = `${f.properties.datetime.slice(0, 10)}-${zone}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  for (const [key, group] of groups) {
    const hrefs = group
      .map((f) => f.assets?.visual?.href)
      .filter((h): h is string => !!h && h.endsWith('.tif'));
    if (hrefs.length < 2) continue;
    const vrt = `/vsimem/${site.id}-${key}.vrt`;
    try {
      const ds = await gdal.buildVRTAsync(
        vrt,
        hrefs.map((h) => `/vsicurl/${h}`),
        ['-srcnodata', '0', '-vrtnodata', '0'],
      );
      ds.close();
      const result = await cropRemoteRasterToLatLon({
        localRasterPath: vrt,
        targetLat: site.lat,
        targetLon: site.lon,
        outputPath,
        cropSize: REGIONAL_CROP_PX,
        jpegQuality: 88,
        requireCentered: true,
      });
      await assertCovered(outputPath);
      const ids = group.map((f) => f.id);
      const prov = buildSentinel2ProvenanceEntry({
        outputPath,
        sourceUrl: hrefs[0],
        productId: ids.join(' + '),
        siteId: site.id,
        siteName: site.name,
        centerLat: site.lat,
        centerLon: site.lon,
        cropSize: REGIONAL_CROP_PX,
        sceneDate: group[0].properties.datetime,
      });
      prov.modifications.push(`mosaicked-${hrefs.length}-same-day-tiles`);
      await upsertProvenanceEntries([prov]);
      console.log(
        `  ✓ ${site.id} regional: mosaic of ${ids.join(', ')} @ ${result.resolutionMPerPx.toFixed(1)} m/px → ${outputPath}`,
      );
      return { ...group[0], mosaicPath: vrt, mosaicIds: ids };
    } catch (err) {
      const tag = err instanceof CropError ? err.code : (err as Error).message;
      console.log(`    · mosaic ${key} → ${tag}, next`);
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
  if (!(await coveredOrLog(outputPath, `${site.id} detail (NAIP)`))) return false;
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
  if (!(await coveredOrLog(outputPath, `${site.id} detail (IGN)`))) return false;
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
  if (!(await coveredOrLog(outputPath, `${site.id} detail (GSI)`))) return false;
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
      localRasterPath: scene.mosaicPath ?? `/vsicurl/${href}`,
      targetLat: site.lat,
      targetLon: site.lon,
      outputPath: tmpPath,
      cropSize: S2_FALLBACK_WINDOW_M / 10, // 10 m/px source pixels
      jpegQuality: 92,
      requireCentered: true,
    });
    const up = await sharp(tmpPath).resize(512, 512).jpeg({ quality: 88 }).toBuffer();
    writeFileSync(outputPath, up);
    (await import('node:fs')).unlinkSync(tmpPath);
    await assertCovered(outputPath);
  } catch (err) {
    const tag = err instanceof CropError ? err.code : (err as Error).message;
    console.log(`  ✗ ${site.id} detail (s2-fallback): ${tag}`);
    return false;
  }
  const prov = buildSentinel2ProvenanceEntry({
    outputPath,
    sourceUrl: href,
    productId: scene.mosaicIds?.join(' + ') ?? scene.id,
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

/** EOX Sentinel-2 cloudless WMS GetMap over a square window of ground. */
function eoxUrl(site: PadSite, windowM: number, px: number): string {
  const { dLat, dLon } = bboxDeg(site, windowM);
  const bbox = [site.lon - dLon, site.lat - dLat, site.lon + dLon, site.lat + dLat].join(',');
  return `${EOX_WMS}?service=WMS&version=1.1.1&request=GetMap&layers=${EOX_LAYER}&styles=&srs=EPSG:4326&bbox=${bbox}&width=${px}&height=${px}&format=image/jpeg`;
}

async function fetchEox(
  site: PadSite,
  tier: 'regional' | 'detail',
  windowM: number,
  px: number,
): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-${tier}.jpg`;
  const url = eoxUrl(site, windowM, px);
  let buf: Buffer | null = null;
  for (let attempt = 1; attempt <= 3 && !buf; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
      else console.log(`  … ${site.id} ${tier}: EOX HTTP ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.log(`  … ${site.id} ${tier}: EOX ${(err as Error).message} (attempt ${attempt})`);
    }
  }
  if (!buf || !writeJpeg(outputPath, buf, `${site.id} ${tier} (EOX)`)) return false;
  if (!(await coveredOrLog(outputPath, `${site.id} ${tier} (EOX)`))) return false;
  await upsertProvenanceEntries([
    buildEoxCloudlessProvenanceEntry({
      outputPath,
      sourceUrl: url,
      year: EOX_YEAR,
      siteName: site.name,
      centerLat: site.lat,
      centerLon: site.lon,
      windowM,
      sizePx: px,
      layer: tier === 'regional' ? 'regional patch' : 'detail patch',
    }),
  ]);
  console.log(`  ✓ ${site.id} ${tier}: EOX cloudless ${EOX_YEAR} ${windowM} m → ${px} px`);
  return true;
}

interface LinzItem {
  href: string;
  bbox: number[];
}
/** A cached file's bytes, or null when it is not there (read, not exists-then-read). */
function readCache(file: string): Buffer | null {
  try {
    return readFileSync(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}
/** Write a cache file only if no other run created it first (exclusive create). */
function writeCache(file: string, data: string | Buffer): void {
  mkdirSync(path.dirname(file), { recursive: true });
  try {
    writeFileSync(file, data, { flag: 'wx' });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
}

/** Footprints of a LINZ survey's COG tiles, fetched once and cached. */
async function linzItems(survey: string): Promise<LinzItem[]> {
  const cache = `.image-cache/linz/${survey.replace(/\//g, '__')}.json`;
  const cached = readCache(cache);
  if (cached) return JSON.parse(cached.toString('utf8'));
  const base = `${LINZ_BUCKET}/${survey}/rgb/2193/`;
  const col = (await (await fetch(`${base}collection.json`)).json()) as {
    links: { rel: string; href: string }[];
  };
  const hrefs = col.links
    .filter((l) => l.rel === 'item')
    .map((l) => base + l.href.replace(/^\.\//, ''));
  const out: LinzItem[] = [];
  for (let i = 0; i < hrefs.length; i += 32) {
    const batch = await Promise.all(
      hrefs.slice(i, i + 32).map(async (h) => {
        const it = (await (await fetch(h)).json()) as {
          bbox: number[];
          assets: Record<string, { href: string }>;
        };
        const a = Object.values(it.assets).find(
          (x) => x.href.endsWith('.tiff') || x.href.endsWith('.tif'),
        );
        return a ? { href: new URL(a.href, h).toString(), bbox: it.bbox } : null;
      }),
    );
    for (const b of batch) if (b) out.push(b);
  }
  writeCache(cache, JSON.stringify(out));
  return out;
}

/** GeoTIFF origin (NZTM metres) + pixel size of a LINZ tile, from its tags.
 *  The tiles are WebP-compressed, which the bundled GDAL cannot open (no WEBP
 *  codec), so libtiff's tiffinfo reads the tags and sharp (libvips) decodes. */
function linzGeo(file: string): { x0: number; y0: number; px: number } {
  const info = execFileSync('tiffinfo', [file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const scale = /Tag 33550: ([\d.]+),/.exec(info);
  const tie = /Tag 33922: [\d.]+,[\d.]+,[\d.]+,([\d.]+),([\d.]+),/.exec(info);
  if (!scale || !tie) throw new Error(`${file}: no GeoTIFF tiepoint / pixel scale`);
  return { x0: Number(tie[1]), y0: Number(tie[2]), px: Number(scale[1]) };
}

/** LINZ aerial: download the survey tiles over the window (cached), place them
 *  on one NZTM canvas, bring it to 0.25 m/px, turn it by the local grid
 *  convergence so true north is up, and cut the pad's square window. */
async function fetchDetailLinz(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  const survey = LINZ_SURVEY[site.id];
  const { dLat, dLon } = bboxDeg(site, DETAIL_WINDOW_M);
  const w = [site.lon - dLon, site.lat - dLat, site.lon + dLon, site.lat + dLat];
  const hits = (await linzItems(survey)).filter(
    (it) => it.bbox[0] < w[2] && it.bbox[2] > w[0] && it.bbox[1] < w[3] && it.bbox[3] > w[1],
  );
  if (!hits.length) {
    console.log(`  ✗ ${site.id} detail: no LINZ tile in ${survey} covers the pad`);
    return false;
  }
  const sharp = (await import('sharp')).default;
  const geo = gdal.SpatialReference.fromEPSG(4326);
  const nztm = gdal.SpatialReference.fromEPSG(2193);
  const ct = new gdal.CoordinateTransformation(geo, nztm);
  // GDAL 3 authority axis order: EPSG:4326 is (lat, lon) and EPSG:2193 is
  // (northing, easting) — both swapped from x/y.
  const toNztm = (lat: number, lon: number) => {
    const p = geo.EPSGTreatsAsLatLong() ? ct.transformPoint(lat, lon) : ct.transformPoint(lon, lat);
    return nztm.EPSGTreatsAsNorthingEasting() ? { e: p.y, n: p.x } : { e: p.x, n: p.y };
  };
  const c = toNztm(site.lat, site.lon);
  const north = toNztm(site.lat + 0.001, site.lon);
  // Grid convergence: how far true north leans from grid north here.
  const convergenceDeg = (Math.atan2(north.e - c.e, north.n - c.n) * 180) / Math.PI;
  const half =
    (DETAIL_WINDOW_M / 2) *
      (Math.abs(Math.cos((convergenceDeg * Math.PI) / 180)) +
        Math.abs(Math.sin((convergenceDeg * Math.PI) / 180))) +
    20;
  const SRC_PX = 0.1;
  const size = Math.ceil((2 * half) / SRC_PX);
  const left0 = c.e - half;
  const top0 = c.n + half;
  const comps: { input: Buffer; left: number; top: number }[] = [];
  for (const h of hits) {
    const file = `.image-cache/linz/${path.basename(h.href)}`;
    if (!readCache(file)) {
      const res = await fetch(h.href);
      if (!res.ok) throw new Error(`LINZ ${h.href}: HTTP ${res.status}`);
      writeCache(file, Buffer.from(await res.arrayBuffer()));
    }
    const g = linzGeo(file);
    if (Math.abs(g.px - SRC_PX) > 1e-6)
      throw new Error(`${file}: pixel ${g.px} m, expected ${SRC_PX}`);
    const meta = await sharp(file).metadata();
    // Overlap of this tile with the canvas, in tile pixels.
    const tx = Math.round((left0 - g.x0) / SRC_PX);
    const ty = Math.round((g.y0 - top0) / SRC_PX);
    const sx = Math.max(0, tx);
    const sy = Math.max(0, ty);
    const ex = Math.min(meta.width!, tx + size);
    const ey = Math.min(meta.height!, ty + size);
    if (ex <= sx || ey <= sy) continue;
    const piece = await sharp(file)
      .extract({ left: sx, top: sy, width: ex - sx, height: ey - sy })
      .removeAlpha()
      .raw()
      .toBuffer();
    comps.push({
      input: await sharp(piece, { raw: { width: ex - sx, height: ey - sy, channels: 3 } })
        .png()
        .toBuffer(),
      left: sx - tx,
      top: sy - ty,
    });
  }
  const outScale = DETAIL_WINDOW_M / DETAIL_SIZE_PX; // 0.25 m/px
  const scaled = Math.round((size * SRC_PX) / outScale);
  const canvas = await sharp({
    create: { width: size, height: size, channels: 3, background: '#000' },
  })
    .composite(comps)
    .png()
    .toBuffer();
  const turned = await sharp(
    await sharp(canvas).resize(scaled, scaled, { kernel: 'lanczos3' }).png().toBuffer(),
  )
    .rotate(-convergenceDeg, { background: '#000' })
    .png()
    .toBuffer();
  const tm = await sharp(turned).metadata();
  const jpg = await sharp(turned)
    .extract({
      left: Math.round((tm.width! - DETAIL_SIZE_PX) / 2),
      top: Math.round((tm.height! - DETAIL_SIZE_PX) / 2),
      width: DETAIL_SIZE_PX,
      height: DETAIL_SIZE_PX,
    })
    .jpeg({ quality: 88 })
    .toBuffer();
  if (!writeJpeg(outputPath, jpg, `${site.id} detail (LINZ)`)) return false;
  if (!(await coveredOrLog(outputPath, `${site.id} detail (LINZ)`))) return false;
  await upsertProvenanceEntries([
    buildLinzProvenanceEntry({
      outputPath,
      sourceUrl: hits[0].href,
      survey,
      siteName: site.name,
      centerLat: site.lat,
      centerLon: site.lon,
      windowM: DETAIL_WINDOW_M,
      sizePx: DETAIL_SIZE_PX,
      credit: LINZ_CREDIT[site.id],
    }),
  ]);
  console.log(
    `  ✓ ${site.id} detail: LINZ ${survey} (${hits.length} tiles, convergence ${convergenceDeg.toFixed(2)}°) ${DETAIL_WINDOW_M} m → ${DETAIL_SIZE_PX} px`,
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
  // --regional-only: re-fetch only the regional (the 2026-11-09 16 km → 32 km
  // widening) and leave the approved detail layers untouched.
  const regionalOnly = argv.includes('--regional-only');
  // Regional source: the EOX cloudless mosaic by default (no clouds, one
  // consistent look); --regional s2 re-picks a single Sentinel-2 scene.
  const regionalS2 = argv.includes('--regional') && argv[argv.indexOf('--regional') + 1] === 's2';
  const only = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--regional');
  const ids = only.length ? only.filter((id) => ALL_PAD_IDS.includes(id)) : ALL_PAD_IDS;
  const pads = loadPads(ids);
  console.log(
    `fetch-earth-pads: ${pads.length} pad(s)${detailOnly ? ' [detail-only]' : ''}${regionalOnly ? ' [regional-only]' : ''}`,
  );
  let ok = 0;
  for (const site of pads) {
    const strategy = PAD_STRATEGY[site.id];
    console.log(`\n${site.id} (${site.name}) @ ${site.lat}, ${site.lon} [${strategy}]`);
    if (detailOnly && strategy === 's2-fallback') {
      console.log(`  ✗ ${site.id}: --detail-only cannot re-derive an s2-fallback detail`);
      continue;
    }
    let regionalOk = detailOnly;
    let scene: StacFeature | null = null;
    if (!detailOnly) {
      if (regionalS2 || strategy === 's2-fallback') {
        scene = await fetchRegional(site);
        regionalOk = scene != null;
      } else regionalOk = await fetchEox(site, 'regional', REGIONAL_CROP_PX * 10, REGIONAL_CROP_PX);
    }
    let d = regionalOnly;
    if (regionalOnly) {
      // detail left as is
    } else if (strategy === 'naip') d = await fetchDetailNaip(site);
    else if (strategy === 'ign-wms') d = await fetchDetailIgn(site);
    else if (strategy === 'gsi-tiles') d = await fetchDetailGsi(site);
    else if (strategy === 'linz') d = await fetchDetailLinz(site);
    else if (strategy === 'eox')
      d = await fetchEox(site, 'detail', S2_FALLBACK_WINDOW_M, EOX_DETAIL_PX);
    else if (scene) d = await fetchDetailS2Fallback(site, scene);
    else console.log(`  ✗ ${site.id} detail: no regional scene to fall back to`);
    if (regionalOk && d) ok += 1;
  }
  console.log(`\nDONE ${ok}/${pads.length} pads fully fetched`);
  if (ok < pads.length) process.exitCode = 1;
}

void main();
