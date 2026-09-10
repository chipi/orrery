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
 * AFTER any run: regenerate the consumed 1x1 variants (half-baked-tile trap):
 *   node scripts/hotspots/regenerate-tier3-variants.mjs static/images/hotspots/earth/<site>/*.jpg
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import {
  buildNaipProvenanceEntry,
  buildSentinel2ProvenanceEntry,
  upsertProvenanceEntries,
} from './provenance.ts';

/** The #546 scope: US pads only (open sub-meter imagery, zero licensing risk). */
const US_PAD_IDS = [
  'cape-canaveral-lc-36b',
  'cape-canaveral-slc-40',
  'cape-canaveral-slc-41',
  'lc-14',
  'lc-34',
  'lc-39a',
  'lc-39b',
  'lc-5',
  'starbase-orbital-a',
  'vandenberg-slc-4e',
];

const STAC_URL = 'https://earth-search.aws.element84.com/v1/search';
const NAIP_EXPORT =
  'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage';

const REGIONAL_CROP_PX = 1600; // 1600 px @ 10 m/px = 16 km — Moon/Mars regional extent
const DETAIL_WINDOW_M = 512; // half-km window around the pad
const DETAIL_SIZE_PX = 1024; // → ~0.5 m/px, at NAIP's native resolution

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

/** Latest low-cloud Sentinel-2 L2A scenes covering the pad. */
async function stacSearch(lat: number, lon: number): Promise<StacFeature[]> {
  const d = 0.05;
  const res = await fetch(STAC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      bbox: [lon - d, lat - d, lon + d, lat + d],
      query: { 'eo:cloud_cover': { lt: 8 } },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
      limit: 8,
    }),
  });
  if (!res.ok) throw new Error(`STAC search HTTP ${res.status}`);
  const body = (await res.json()) as { features: StacFeature[] };
  return body.features ?? [];
}

async function fetchRegional(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-regional.jpg`;
  const feats = await stacSearch(site.lat, site.lon);
  if (!feats.length) {
    console.log(`  ✗ ${site.id}: no low-cloud Sentinel-2 scene found`);
    return false;
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
      return true;
    } catch (err) {
      const tag = err instanceof CropError ? err.code : (err as Error).message;
      console.log(`    · ${f.id} → ${tag}, next candidate`);
    }
  }
  console.log(`  ✗ ${site.id}: every Sentinel-2 candidate failed`);
  return false;
}

async function fetchDetail(site: PadSite): Promise<boolean> {
  const outputPath = `static/images/hotspots/earth/${site.id}/tier2-detail.jpg`;
  // 512 m bbox in degrees around the pad (lon shrinks by cos(lat)).
  const dLat = DETAIL_WINDOW_M / 2 / 111_320;
  const dLon = DETAIL_WINDOW_M / 2 / (111_320 * Math.cos((site.lat * Math.PI) / 180));
  const bbox = [site.lon - dLon, site.lat - dLat, site.lon + dLon, site.lat + dLat].join(',');
  const url = `${NAIP_EXPORT}?bbox=${bbox}&bboxSR=4326&size=${DETAIL_SIZE_PX},${DETAIL_SIZE_PX}&format=jpg&f=image`;
  const res = await fetch(url);
  if (!res.ok) {
    console.log(`  ✗ ${site.id} detail: NAIP exportImage HTTP ${res.status}`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // exportImage returns a JSON error body with a 200 on some failures — a real
  // JPEG starts FF D8; anything else is a service error, fail honest.
  if (buf.length < 10_000 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    console.log(
      `  ✗ ${site.id} detail: response is not a plausible JPEG (${buf.length} bytes) — ${buf.slice(0, 80).toString('utf8')}`,
    );
    return false;
  }
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, buf);
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

async function main(): Promise<void> {
  const only = process.argv.slice(2);
  const pads = loadPads(only.length ? only.filter((id) => US_PAD_IDS.includes(id)) : US_PAD_IDS);
  console.log(`fetch-earth-pads: ${pads.length} pad(s)`);
  let ok = 0;
  for (const site of pads) {
    console.log(`\n${site.id} (${site.name}) @ ${site.lat}, ${site.lon}`);
    const r = await fetchRegional(site);
    const d = await fetchDetail(site);
    if (r && d) ok += 1;
  }
  console.log(`\nDONE ${ok}/${pads.length} pads fully fetched`);
  if (ok < pads.length) process.exitCode = 1;
}

void main();
