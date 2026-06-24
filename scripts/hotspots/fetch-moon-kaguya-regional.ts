import { promises as fs } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import { buildKaguyaTcProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

/**
 * Moon Tier 2a (regional context layer) fetcher — Kaguya TC edition (#361).
 *
 * The /moon parity gap with /mars: Mars landers get a wide CTX-mosaic
 * regional patch (Murray Lab, 5 m/px) under each landing zone; most
 * /moon landers had only a tight detail crop, so the selection bracket
 * framed bare regolith and the surrounding canvas went blank when
 * zooming out. Mars solves this with a global CTX mosaic; the Moon has
 * no equivalent wired — but JAXA's SELENE (Kaguya) Terrain Camera
 * monoscopic observations are published as USGS Astrogeology ARD
 * cloud-optimized GeoTIFFs at ~6 m/px (CTX-class) with ~95 % global
 * coverage. This fetcher window-crops a ~16 km regional patch per site
 * directly from those COGs via GDAL /vsicurl/ (no full download).
 *
 * Source resolution path (per site):
 *   1. STAC bbox search on the monoscopic TC collection around the
 *      site's lat/lon (widening the window until candidates appear).
 *   2. Rank candidates whose footprint bbox contains the site, nearest
 *      footprint-centre first (most margin around the target).
 *   3. GDAL crop CROP_SIZE² centred on the site from the COG's `image`
 *      asset; fall through to the next candidate on NO_DATA/BLACK.
 *   4. Self-credit provenance (JAXA-OPEN, instrument "Kaguya TC").
 *
 * Output: static/images/hotspots/moon/<site>/tier2-regional.jpg
 *
 * Run (Node 20 + gdal-async):
 *   ~/.nvm/versions/node/v20.20.2/bin/node --import tsx \
 *     scripts/hotspots/fetch-moon-kaguya-regional.ts [siteId]
 */

const STAC_SEARCH = 'https://stac.astrogeology.usgs.gov/api/search';
// All three Kaguya TC observation collections — monoscopic coverage has
// gaps (luna9/luna16/luna17) that the stereoscopic + spectral-profiler
// support swaths fill. All are ~6-10 m/px TC COGs with the same `image`
// asset; provenance stays a generic "Kaguya TC" credit either way.
const COLLECTIONS = [
  'kaguya_terrain_camera_monoscopic_uncontrolled_observations',
  'kaguya_terrain_camera_stereoscopic_uncontrolled_observations',
  'kaguya_terrain_camera_spsupport_uncontrolled_observations',
].join(',');
/** ~6.2 m/px × 2560 ≈ 15.9 km — matches the Mars CTX regional footprint. */
const CROP_SIZE = 2560;
const MOON_SITES_PATH = path.join('static', 'data', 'moon-sites.json');

/** The 12 /moon landers that shipped detail-only (no regional layer). */
const SITES = [
  'luna9',
  'luna16',
  'luna17',
  'luna21',
  'luna24',
  'change3',
  'change4',
  'change5',
  'change6',
  'chandrayaan3',
  'slim',
  'beresheet',
];

interface StacFeature {
  id: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  assets: Record<string, { href?: string }>;
  properties?: Record<string, unknown>;
}

interface MoonSite {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

// /vsicurl tuning — skip the directory listing probe + cache ranges.
process.env.GDAL_DISABLE_READDIR_ON_OPEN ??= 'EMPTY_DIR';
process.env.CPL_VSIL_CURL_ALLOWED_EXTENSIONS ??= '.tif';
process.env.VSI_CACHE ??= 'TRUE';

async function stacSearch(lat: number, lon: number, halfDeg: number): Promise<StacFeature[]> {
  const bbox = [lon - halfDeg, lat - halfDeg, lon + halfDeg, lat + halfDeg].join(',');
  const url = `${STAC_SEARCH}?collections=${COLLECTIONS}&bbox=${bbox}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STAC search HTTP ${res.status} for bbox ${bbox}`);
  const json = (await res.json()) as { features?: StacFeature[] };
  return json.features ?? [];
}

/** Rank score (lower = better): candidates whose footprint bbox CONTAINS
 *  the site come first (ranked by margin = distance from footprint centre),
 *  then non-containing candidates by distance — TC monoscopic swaths are
 *  narrow strips, so the containing test is a hint, not a gate; GDAL's own
 *  no-data pre-crop check is the real filter. */
function rankScore(f: StacFeature, lat: number, lon: number): number {
  const [w, s, e, n] = f.bbox;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const dist = Math.hypot(lon - cx, lat - cy);
  const contains = lon >= w && lon <= e && lat >= s && lat <= n;
  return contains ? dist : dist + 1000;
}

async function fetchSite(siteId: string, lat: number, lon: number): Promise<boolean> {
  const outputPath = `static/images/hotspots/moon/${siteId}/tier2-regional.jpg`;

  let feats: StacFeature[] = [];
  for (const half of [0.3, 0.6, 1.0, 1.6, 2.5]) {
    const round = await stacSearch(lat, lon, half);
    // Accumulate across widening windows so a tight first window doesn't
    // lock us to a few strips; dedupe by id.
    const seen = new Set(feats.map((f) => f.id));
    feats = feats.concat(round.filter((f) => !seen.has(f.id)));
    if (feats.length >= 12) break;
  }
  const ranked = feats
    .map((f) => ({ f, sc: rankScore(f, lat, lon) }))
    .sort((a, b) => a.sc - b.sc);

  if (!ranked.length) {
    console.log(`  ✗ ${siteId}: no Kaguya TC observations returned by STAC`);
    return false;
  }

  let tried = 0;
  for (const { f } of ranked) {
    if (tried >= 12) break; // cap candidate attempts per site
    tried++;
    const href = f.assets?.image?.href;
    if (!href || !href.endsWith('.tif')) continue;
    try {
      const result = await cropRemoteRasterToLatLon({
        // /vsicurl → windowed COG read, no full-file download.
        localRasterPath: `/vsicurl/${href}`,
        targetLat: lat,
        targetLon: lon,
        outputPath,
        cropSize: CROP_SIZE,
        jpegQuality: 88,
      });
      const prov = buildKaguyaTcProvenanceEntry({
        outputPath,
        sourceUrl: href,
        productId: f.id,
        siteId,
        centerLat: lat,
        centerLon: lon,
        cropSize: CROP_SIZE,
      });
      await upsertProvenanceEntries([prov]);
      console.log(
        `  ✓ ${siteId}: ${f.id} @ ${result.resolutionMPerPx.toFixed(1)} m/px → ${outputPath} (${(result.outputBytes / 1024).toFixed(0)} KB)`,
      );
      return true;
    } catch (err) {
      if (err instanceof CropError) {
        console.log(`    · ${f.id} → ${err.code}, next candidate`);
        continue;
      }
      console.log(`    · ${f.id} → error: ${(err as Error).message}, next candidate`);
    }
  }
  console.log(`  ✗ ${siteId}: every candidate returned no usable data at the target`);
  return false;
}

async function main(): Promise<void> {
  const only = process.argv[2];
  const moon = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as MoonSite[] | { sites: MoonSite[] };
  const arr = Array.isArray(moon) ? moon : moon.sites;
  const byId = new Map(arr.map((s) => [s.id, s]));

  const todo = only ? [only] : SITES;
  const ok: string[] = [];
  const fail: string[] = [];

  for (const id of todo) {
    const site = byId.get(id);
    if (!site || site.lat == null || site.lon == null) {
      console.log(`  ✗ ${id}: no lat/lon in moon-sites.json`);
      fail.push(id);
      continue;
    }
    console.log(`▶ ${id} (${site.lat}, ${site.lon})`);
    const success = await fetchSite(id, site.lat, site.lon);
    (success ? ok : fail).push(id);
  }

  console.log(`\nDone. ok=${ok.length} [${ok.join(', ')}]  fail=${fail.length} [${fail.join(', ')}]`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
