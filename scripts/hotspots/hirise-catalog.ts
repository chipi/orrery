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
  // Projected image corner coordinates — used for actual footprint
  // containment test (point-in-polygon). LBL START_BYTE values are
  // 1-indexed; substring extraction here is 0-indexed (subtract 1).
  CORNER1_LATITUDE: { start: 732, len: 10 },
  CORNER1_LONGITUDE: { start: 743, len: 10 },
  CORNER2_LATITUDE: { start: 754, len: 10 },
  CORNER2_LONGITUDE: { start: 765, len: 10 },
  CORNER3_LATITUDE: { start: 776, len: 10 },
  CORNER3_LONGITUDE: { start: 787, len: 10 },
  CORNER4_LATITUDE: { start: 798, len: 10 },
  CORNER4_LONGITUDE: { start: 809, len: 10 },
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
  /**
   * 4 corner coordinates of the projected image footprint. Used to
   * test whether a given target lat/lon actually falls inside the
   * image (sub-spacecraft proximity alone is not enough — orbital
   * track passes within km of many sites without the 6-km-wide swath
   * covering them).
   */
  corners: Array<{ lat: number; lon: number }>;
}

export interface HiriseCandidatesInput {
  targetLat: number;
  targetLon: number;
  /**
   * Pre-filter great-circle distance in km from SUB_SPACECRAFT to
   * target. Default 50 — a coarse pre-filter to cheaply discard the
   * ~120k frames whose track is nowhere near the target. The actual
   * containment test is point-in-polygon against the 4 image corners
   * (see CORNER1-4_LATITUDE/LONGITUDE). 50 km comfortably covers
   * the worst-case ~15 km along-track sweep plus a margin for
   * cross-track offset.
   */
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
  const radiusKm = input.searchRadiusKm ?? 50;
  const candidates: Array<HiriseFrame & { distKm: number }> = [];

  const stream = createReadStream(INDEX_CACHE_PATH, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.length < COL.CORNER4_LONGITUDE.start + COL.CORNER4_LONGITUDE.len) continue;
    const frame = parseRow(line);
    if (!frame) continue;
    const distKm = greatCircleKm(
      input.targetLat,
      input.targetLon,
      frame.centerLat,
      frame.centerLon,
      MARS_RADIUS_KM,
    );
    // Coarse pre-filter: drop frames whose orbital track is nowhere near.
    if (distKm > radiusKm) continue;
    // Actual containment: target must fall inside the 4-corner footprint.
    if (!pointInFrame(input.targetLat, input.targetLon, frame.corners)) continue;
    candidates.push({ ...frame, distKm });
  }
  candidates.sort(
    (a, b) =>
      compositeScore(a, input.targetLat, input.targetLon) -
      compositeScore(b, input.targetLat, input.targetLon),
  );
  return candidates;
}

const MARS_RADIUS_KM = 3389.5;

function parseRow(line: string): HiriseFrame | null {
  const productIdRaw = extractField(line, COL.PRODUCT_ID);
  if (!productIdRaw) return null;
  const raw = productIdRaw.replace(/^"|"$/g, '').trim();
  if (!raw) return null;
  // Catalog IDs include the channel suffix (_RED, _COLOR, _IRB).
  // We only want _RED (full-coverage greyscale; COLOR/IRB are
  // centre-swath only, smaller footprint + larger files).
  if (!/_RED$/.test(raw)) return null;
  // Strip channel suffix so the URL builder gets the bare observation id.
  const productId = raw.replace(/_RED$/, '');
  if (!/^[A-Z]+_\d+_\d+$/.test(productId)) return null;
  const lat = parseFloat(extractField(line, COL.SUB_SPACECRAFT_LATITUDE));
  const lon = parseFloat(extractField(line, COL.SUB_SPACECRAFT_LONGITUDE));
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const mapScale = parseFloat(extractField(line, COL.MAP_SCALE));
  const incidenceAngle = parseFloat(extractField(line, COL.INCIDENCE_ANGLE));
  const imageLines = parseInt(extractField(line, COL.IMAGE_LINES), 10);
  const lineSamples = parseInt(extractField(line, COL.LINE_SAMPLES), 10);
  const startTime = extractField(line, COL.START_TIME).replace(/^"|"$/g, '').trim();
  const corners = [
    {
      lat: parseFloat(extractField(line, COL.CORNER1_LATITUDE)),
      lon: parseFloat(extractField(line, COL.CORNER1_LONGITUDE)),
    },
    {
      lat: parseFloat(extractField(line, COL.CORNER2_LATITUDE)),
      lon: parseFloat(extractField(line, COL.CORNER2_LONGITUDE)),
    },
    {
      lat: parseFloat(extractField(line, COL.CORNER3_LATITUDE)),
      lon: parseFloat(extractField(line, COL.CORNER3_LONGITUDE)),
    },
    {
      lat: parseFloat(extractField(line, COL.CORNER4_LATITUDE)),
      lon: parseFloat(extractField(line, COL.CORNER4_LONGITUDE)),
    },
  ];
  // Reject frames with any missing corner — can't do containment test.
  if (corners.some((c) => Number.isNaN(c.lat) || Number.isNaN(c.lon))) return null;
  return {
    productId,
    centerLat: lat,
    centerLon: lon,
    mapScale: Number.isNaN(mapScale) ? 99 : mapScale,
    incidenceAngle: Number.isNaN(incidenceAngle) ? 90 : incidenceAngle,
    startTime,
    imageLines: Number.isNaN(imageLines) ? 0 : imageLines,
    lineSamples: Number.isNaN(lineSamples) ? 0 : lineSamples,
    corners,
  };
}

/**
 * Point-in-polygon test for the target falling inside the image's
 * 4-corner footprint. Ray-casting algorithm; works on small enough
 * quadrilaterals that planet curvature is negligible (HiRISE frames
 * are at most ~25 km on a side, far below the threshold where great-
 * circle vs. plane geometry meaningfully diverges).
 *
 * Longitudes are normalised relative to the target before the test
 * to handle the 0°/360° wrap-around (a frame straddling the prime
 * meridian has corners like 358°, 2°, 5°, 359° — naive ray-casting
 * would reject the target at 0° even though it's inside).
 */
function pointInFrame(
  targetLat: number,
  targetLon: number,
  corners: Array<{ lat: number; lon: number }>,
): boolean {
  // Shift each corner's longitude into the (targetLon-180, targetLon+180] band.
  const normLon = (lon: number): number => {
    let d = lon - targetLon;
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    return targetLon + d;
  };
  const poly = corners.map((c) => ({ lat: c.lat, lon: normLon(c.lon) }));
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lon;
    const yi = poly[i].lat;
    const xj = poly[j].lon;
    const yj = poly[j].lat;
    const intersect =
      yi > targetLat !== yj > targetLat &&
      targetLon < ((xj - xi) * (targetLat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function extractField(line: string, col: { start: number; len: number }): string {
  return line.substring(col.start, col.start + col.len);
}

/**
 * Composite score for ranking candidates. Lower = better.
 *   - MAP_SCALE: primary — smaller m/px = higher resolution.
 *   - INCIDENCE_ANGLE deviation from 50°: penalty for too steep
 *     (flat lighting, no shadows) or too shallow (features lost in
 *     shadow).
 *   - CENTER_DISTANCE_KM: penalty for the target sitting near the
 *     edge of the image footprint. The corner-PIP test is necessary
 *     but not sufficient: HiRISE projected rasters may include
 *     no-data padding between the polygon boundary and the actual
 *     image data, so frames where the target lands near the polygon
 *     edge often produce mostly-black crops. Preferring frames
 *     where the target is centred drastically reduces this failure
 *     mode without needing to download + crop to find out.
 */
function compositeScore(frame: HiriseFrame, targetLat: number, targetLon: number): number {
  const scalePenalty = frame.mapScale; // 0.25-1.0 m/px range
  const incDelta = Math.abs(frame.incidenceAngle - 50); // 0-50° range
  const centroid = polygonCentroid(frame.corners);
  const centerKm = greatCircleKm(targetLat, targetLon, centroid.lat, centroid.lon, MARS_RADIUS_KM);
  // Frames are ~6×15-25 km. 1 km from centre is well within the
  // image; 10 km may be near the edge. Weight 0.1 scales km cleanly
  // into the same range as scalePenalty (0.25-1.0).
  return scalePenalty + incDelta * 0.02 + centerKm * 0.1;
}

/**
 * Centroid of a 4-corner polygon in lat/lon space. Normalises
 * longitudes to handle 0°/360° wrap-around (corners straddling the
 * prime meridian average correctly).
 */
function polygonCentroid(corners: Array<{ lat: number; lon: number }>): {
  lat: number;
  lon: number;
} {
  const refLon = corners[0].lon;
  const normLon = (lon: number): number => {
    let d = lon - refLon;
    while (d > 180) d -= 360;
    while (d <= -180) d += 360;
    return refLon + d;
  };
  const sumLat = corners.reduce((s, c) => s + c.lat, 0);
  const sumLon = corners.reduce((s, c) => s + normLon(c.lon), 0);
  return { lat: sumLat / corners.length, lon: sumLon / corners.length };
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
