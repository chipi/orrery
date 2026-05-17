import { createReadStream, createWriteStream, existsSync, promises as fs } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import readline from 'node:readline';

/**
 * HiRISE RDR catalog query (PRD-014 / RFC-017 §S2, Tier B fetch
 * automation).
 *
 * UAHiRISE publishes a cumulative index of every Reduced Data
 * Record (RDR) product at
 *   https://hirise-pds.lpl.arizona.edu/PDS/INDEX/RDRCUMINDEX.TAB
 *   https://hirise-pds.lpl.arizona.edu/PDS/INDEX/RDRCUMINDEX.LBL
 *
 * The TAB is fixed-width PDS3 (~164 MB; ~120k records as of 2026).
 * The LBL documents byte offsets per column. We download the TAB
 * once, cache it locally at .image-cache/hirise/RDRCUMINDEX.TAB,
 * and stream-parse it to find products covering a target lat/lon.
 *
 * Selection heuristic (auto-pick the "best" frame at a target):
 *   1. Candidates within ~5 km of the target (HiRISE swath ≈ 6 km
 *      wide × ~12-25 km long; sub-spacecraft proximity is a good
 *      proxy for the target being inside the footprint).
 *   2. Sort by (a) MAP_SCALE ascending (smaller = higher res), then
 *      (b) INCIDENCE_ANGLE in a "best shadow" mid-range (30°-60°).
 *   3. Pick the top candidate.
 *
 * Operator override (per resolved decision in plan): if the auto-
 * picked frame is editorially wrong (e.g. dust storm, glare, poor
 * exposure), the operator can pin a specific product ID via
 * `hotspot_tier2_force_product_id` in surface-hotspots.json — the
 * caller checks that field and skips the catalog query.
 */

const INDEX_URL = 'https://hirise-pds.lpl.arizona.edu/PDS/INDEX/RDRCUMINDEX.TAB';
const INDEX_CACHE_DIR = path.join('.image-cache', 'hirise');
const INDEX_CACHE_PATH = path.join(INDEX_CACHE_DIR, 'RDRCUMINDEX.TAB');

/**
 * Column byte offsets from the RDRCUMINDEX.LBL schema (1-indexed in
 * the LBL but converted to 0-indexed substring extraction here).
 */
const COL = {
  PRODUCT_ID: { start: 117, len: 21 },
  IMAGE_LINES: { start: 437, len: 6 },
  LINE_SAMPLES: { start: 444, len: 6 },
  INCIDENCE_ANGLE: { start: 460, len: 7 },
  SUB_SOLAR_AZIMUTH: { start: 514, len: 10 },
  SUB_SPACECRAFT_LATITUDE: { start: 547, len: 10 },
  SUB_SPACECRAFT_LONGITUDE: { start: 558, len: 10 },
  MAP_SCALE: { start: 652, len: 5 },
  START_TIME: { start: 346, len: 24 },
} as const;

export interface HiriseFrame {
  productId: string;
  centerLat: number;
  centerLon: number;
  mapScale: number; // m/px
  incidenceAngle: number; // degrees
  startTime: string; // ISO
  imageLines: number;
  lineSamples: number;
}

export interface HiriseCandidatesInput {
  targetLat: number;
  targetLon: number;
  /** Max planetocentric great-circle distance in km. Default 5. */
  searchRadiusKm?: number;
}

/**
 * Download the RDR cumulative index once, cache it. ~164 MB; takes
 * a few minutes on a typical broadband connection. Idempotent —
 * skips download if the cache file already exists.
 *
 * Use cacheRefreshDays to age the cache; default is "never" (only
 * re-fetch if the file is missing). Pass a positive number to
 * trigger refresh after N days.
 */
export async function ensureHiriseIndex(opts: { cacheRefreshDays?: number } = {}): Promise<string> {
  await fs.mkdir(INDEX_CACHE_DIR, { recursive: true });
  if (existsSync(INDEX_CACHE_PATH)) {
    if (!opts.cacheRefreshDays || opts.cacheRefreshDays <= 0) {
      return INDEX_CACHE_PATH;
    }
    const stat = await fs.stat(INDEX_CACHE_PATH);
    const ageDays = (Date.now() - stat.mtimeMs) / 1000 / 86400;
    if (ageDays < opts.cacheRefreshDays) return INDEX_CACHE_PATH;
  }
  console.log(`Downloading HiRISE RDR cumulative index (~164 MB)…`);
  const res = await fetch(INDEX_URL);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download HiRISE index: HTTP ${res.status}`);
  }
  await pipeline(
    Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream),
    createWriteStream(INDEX_CACHE_PATH),
  );
  return INDEX_CACHE_PATH;
}

/**
 * Stream-parse the cached index and return frames near the target.
 * Filters by great-circle distance (planetocentric, Mars radius
 * 3389.5 km). Returns sorted candidates by composite score.
 */
export async function findHiriseCandidates(input: HiriseCandidatesInput): Promise<HiriseFrame[]> {
  await ensureHiriseIndex();
  const radiusKm = input.searchRadiusKm ?? 5;
  const candidates: Array<HiriseFrame & { distKm: number }> = [];

  const stream = createReadStream(INDEX_CACHE_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.length < COL.MAP_SCALE.start + COL.MAP_SCALE.len) continue;
    const frame = parseRow(line);
    if (!frame) continue;
    const distKm = greatCircleKm(
      input.targetLat,
      input.targetLon,
      frame.centerLat,
      frame.centerLon,
      MARS_RADIUS_KM,
    );
    if (distKm <= radiusKm) {
      candidates.push({ ...frame, distKm });
    }
  }
  candidates.sort((a, b) => compositeScore(a) - compositeScore(b));
  return candidates;
}

const MARS_RADIUS_KM = 3389.5;

function parseRow(line: string): HiriseFrame | null {
  const productIdRaw = extractField(line, COL.PRODUCT_ID);
  if (!productIdRaw) return null;
  const productId = productIdRaw.replace(/^"|"$/g, '').trim();
  if (!productId || !/^[A-Z]+_\d+_\d+/.test(productId)) return null;
  const lat = parseFloat(extractField(line, COL.SUB_SPACECRAFT_LATITUDE));
  const lon = parseFloat(extractField(line, COL.SUB_SPACECRAFT_LONGITUDE));
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const mapScale = parseFloat(extractField(line, COL.MAP_SCALE));
  const incidenceAngle = parseFloat(extractField(line, COL.INCIDENCE_ANGLE));
  const imageLines = parseInt(extractField(line, COL.IMAGE_LINES), 10);
  const lineSamples = parseInt(extractField(line, COL.LINE_SAMPLES), 10);
  const startTime = extractField(line, COL.START_TIME).replace(/^"|"$/g, '').trim();
  return {
    productId,
    centerLat: lat,
    centerLon: lon,
    mapScale: Number.isNaN(mapScale) ? 99 : mapScale,
    incidenceAngle: Number.isNaN(incidenceAngle) ? 90 : incidenceAngle,
    startTime,
    imageLines: Number.isNaN(imageLines) ? 0 : imageLines,
    lineSamples: Number.isNaN(lineSamples) ? 0 : lineSamples,
  };
}

function extractField(line: string, col: { start: number; len: number }): string {
  return line.substring(col.start, col.start + col.len);
}

/**
 * Composite score for ranking candidates. Lower = better.
 *   - MAP_SCALE: primary — smaller m/px = higher resolution.
 *   - INCIDENCE_ANGLE deviation from 50°: penalty for too steep
 *     (flat lighting, no shadows) or too shallow (dramatic shadows
 *     but features lost in shadow).
 */
function compositeScore(frame: HiriseFrame): number {
  const scalePenalty = frame.mapScale; // 0.25-1.0 m/px range
  const incDelta = Math.abs(frame.incidenceAngle - 50); // 0-50° range
  return scalePenalty + incDelta * 0.02;
}

/**
 * Great-circle distance on a sphere of given radius. Standard
 * haversine. Accepts degrees, returns km.
 */
function greatCircleKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  // Normalise longitudes to a common range to avoid wrap-around bugs.
  const dLat = toRad(lat2 - lat1);
  let dLon = toRad(lon2 - lon1);
  if (dLon > Math.PI) dLon -= 2 * Math.PI;
  if (dLon < -Math.PI) dLon += 2 * Math.PI;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

/**
 * Resolve a HiRISE RDR product ID to its PDS download URL for the
 * red-channel (single-band greyscale) JP2. Naming convention:
 *   ESP_<orbit>_<latitude>  →  /PDS/RDR/ESP/ORB_<orbit_bucket>/<id>/<id>_RED.JP2
 * where orbit_bucket is the orbit number rounded down to nearest 100.
 *
 * For COLOR composite (where available): swap _RED.JP2 → _COLOR.JP2.
 * For v0.7 we use the single-band red channel since it's smaller +
 * less likely to have colour-balance drift across the patch.
 */
export function hiriseProductIdToJP2Url(productId: string): string {
  const m = productId.match(/^([A-Z]+)_(\d+)_(\d+)$/);
  if (!m) throw new Error(`Invalid HiRISE product id: ${productId}`);
  const phase = m[1];
  const orbit = m[2];
  const orbitBucket = Math.floor(parseInt(orbit, 10) / 100) * 100;
  const bucketStr = `ORB_${pad(orbitBucket, 6)}_${pad(orbitBucket + 99, 6)}`;
  return `https://hirise-pds.lpl.arizona.edu/PDS/RDR/${phase}/${bucketStr}/${productId}/${productId}_RED.JP2`;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
