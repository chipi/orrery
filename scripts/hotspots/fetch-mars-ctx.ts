import { existsSync, readFileSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import { ensureCtxMosaicTile, tileNameForLatLon, tileUrlForName } from './ctx-mosaic.ts';

/**
 * Mars Tier 2a (regional CTX layer) fetch orchestrator.
 *
 * Companion to fetch-mars.ts (the HiRISE detail orchestrator) — same
 * sidecar-driven shape, same crop pipeline, but the source is the
 * Murray Lab Global CTX Mosaic V01 (5 m/px, equirectangular, already
 * blended seamlessly across the whole planet).
 *
 * Per site:
 *   1. Look up `hotspot_tier2_regional_source` from surface-hotspots.json.
 *      Sites without this field are skipped (graceful — they'll
 *      still render the existing HiRISE detail layer).
 *   2. Resolve the Murray Lab tile containing (site.lat, site.lon)
 *      via `tileNameForLatLon`, download + extract via
 *      `ensureCtxMosaicTile` (cached on disk; one tile typically
 *      covers multiple landers in the same 4°×4° quadrant).
 *   3. Crop a 3072×3072 patch centred on (lat, lon) via the existing
 *      `cropRemoteRasterToLatLon(localRasterPath=...)` path. At
 *      5 m/px that's ~15.4 km × 15.4 km of ground — landing-zone
 *      regional context (Gale Crater rim, Jezero delta, etc.). Widened
 *      from 2048² (10 km) per Marko's 2026-06-07 ask: the flat-patch
 *      regional layer was leaving black margin on wide screens at the
 *      zoom-out edge of the view.
 *   4. Output: static/images/hotspots/mars/<site>/tier2-ctx.jpg
 *
 * No catalog query needed — the Murray Lab mosaic is one stitched
 * source; the only auto-selection question is "which 4°×4° tile",
 * which is deterministic from lat/lon. No operator overrides needed
 * either (no "pick the best image" decision — there's one image).
 */

interface SurfaceHotspotsSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_regional_source?: string;
      location_uncertainty_m?: number;
    }
  >;
}

interface MarsSite {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

const SIDECAR_PATH = path.join('static', 'data', 'surface-hotspots.json');
const MARS_SITES_PATH = path.join('static', 'data', 'mars-sites.json');
const TRAVERSE_DIR = path.join('static', 'data', 'mars-traverses');
const MARS_RADIUS_M = 3389500;

function gcMetres(a: [number, number], b: [number, number]): number {
  const mPerDeg = (Math.PI / 180) * MARS_RADIUS_M;
  const dLat = (b[0] - a[0]) * mPerDeg;
  const dLon = (b[1] - a[1]) * mPerDeg * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/**
 * Crop centre for a rover's regional CTX (#360): the arc-length MIDPOINT of
 * its traverse, so the 15.4 km context patch frames the whole drive instead
 * of just the landing zone at one end. Falls back to the landing coordinate
 * when the rover has no traverse file.
 */
function cropCentre(roverId: string, lat: number, lon: number): { lat: number; lon: number } {
  const p = path.join(TRAVERSE_DIR, `${roverId}.json`);
  if (!existsSync(p)) return { lat, lon };
  const tr = JSON.parse(readFileSync(p, 'utf8')) as { points?: [number, number][] };
  const pts = tr.points;
  if (!pts || pts.length < 2) return { lat, lon };
  const seg = pts.slice(1).map((b, i) => gcMetres(pts[i], b));
  const half = seg.reduce((s, d) => s + d, 0) / 2;
  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= half) {
      const t = seg[i] === 0 ? 0 : (half - acc) / seg[i];
      return {
        lat: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        lon: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
      };
    }
    acc += seg[i];
  }
  return { lat, lon };
}

export interface MarsCtxFetchResult {
  siteId: string;
  tileName: string;
  sourceUrl: string;
  outputPath: string;
  cropMeta: {
    pixelX: number;
    pixelY: number;
    projection: string;
    resolutionMPerPx: number;
    bytes: number;
  };
}

export interface FetchMarsCtxHotspotsInput {
  /** Process only this site id. Optional. */
  onlySite?: string;
  /** Skip sites whose CTX patch is already on disk. */
  missingOnly?: boolean;
  /** Dry-run: log what would happen but don't fetch. */
  dryRun?: boolean;
}

export interface FetchMarsCtxHotspotsOutput {
  fetched: MarsCtxFetchResult[];
  skipped: Array<{ siteId: string; reason: string }>;
  failed: Array<{ siteId: string; error: string }>;
}

const POLITE_PAUSE_MS = 60_000;

export async function fetchMarsCtxHotspots(
  input: FetchMarsCtxHotspotsInput = {},
): Promise<FetchMarsCtxHotspotsOutput> {
  const sidecar = JSON.parse(await fs.readFile(SIDECAR_PATH, 'utf-8')) as SurfaceHotspotsSidecar;
  const marsSites = JSON.parse(await fs.readFile(MARS_SITES_PATH, 'utf-8')) as MarsSite[];
  const marsById = new Map(marsSites.filter((s) => s.kind !== 'orbiter').map((s) => [s.id, s]));

  const ctxHotspots = Object.entries(sidecar.entries)
    .filter(([id, e]) => {
      if (input.onlySite && id !== input.onlySite) return false;
      if (!e.hotspot_tier2_regional_source) return false;
      if (!e.hotspot_tier2_regional_source.includes('/mars/')) return false;
      if (input.missingOnly && !input.onlySite) {
        if (existsSync(`static${e.hotspot_tier2_regional_source}`)) return false;
      }
      return true;
    })
    .map(([id, e]) => ({ id, ...e }));

  const fetched: MarsCtxFetchResult[] = [];
  const skipped: Array<{ siteId: string; reason: string }> = [];
  const failed: Array<{ siteId: string; error: string }> = [];

  for (let i = 0; i < ctxHotspots.length; i++) {
    const hotspot = ctxHotspots[i];
    const site = marsById.get(hotspot.id);
    if (!site || site.lat == null || site.lon == null) {
      skipped.push({ siteId: hotspot.id, reason: 'no lat/lon in mars-sites.json' });
      continue;
    }
    let didNetwork = false;
    try {
      const result = await fetchOneCtx(hotspot, site as Required<MarsSite>, input);
      if (result === null) {
        skipped.push({ siteId: hotspot.id, reason: 'dry-run' });
      } else {
        fetched.push(result);
        didNetwork = true;
      }
    } catch (err) {
      failed.push({ siteId: hotspot.id, error: (err as Error).message });
      didNetwork = true;
    }
    const isLast = i === ctxHotspots.length - 1;
    if (didNetwork && !isLast && !input.dryRun) {
      console.log(
        `  · pausing ${POLITE_PAUSE_MS / 1000}s before next site (Murray Lab politeness)`,
      );
      await new Promise((r) => setTimeout(r, POLITE_PAUSE_MS));
    }
  }

  return { fetched, skipped, failed };
}

async function fetchOneCtx(
  hotspot: { id: string; hotspot_tier2_regional_source?: string },
  site: Required<MarsSite>,
  input: FetchMarsCtxHotspotsInput,
): Promise<MarsCtxFetchResult | null> {
  // #360: centre the regional CTX on the rover's traverse midpoint (not the
  // landing site) so the whole drive fits in the 15.4 km context patch.
  const centre = cropCentre(hotspot.id, site.lat, site.lon);
  const tileName = tileNameForLatLon(centre.lat, centre.lon);
  const sourceUrl = tileUrlForName(tileName);
  const outputPath = `static${hotspot.hotspot_tier2_regional_source}`;
  if (input.dryRun) {
    console.log(`  · ${hotspot.id} dry-run → tile ${tileName} → ${outputPath}`);
    return null;
  }
  const localTilePath = await ensureCtxMosaicTile(centre.lat, centre.lon);
  try {
    const crop = await cropRemoteRasterToLatLon({
      localRasterPath: localTilePath,
      targetLat: centre.lat,
      targetLon: centre.lon,
      outputPath,
      cropSize: 3072,
      jpegQuality: 88,
    });
    return {
      siteId: hotspot.id,
      tileName,
      sourceUrl,
      outputPath,
      cropMeta: {
        pixelX: crop.sourcePixelX,
        pixelY: crop.sourcePixelY,
        projection: crop.sourceProjection,
        resolutionMPerPx: crop.resolutionMPerPx,
        bytes: crop.outputBytes,
      },
    };
  } catch (err) {
    if (err instanceof CropError) {
      console.log(`  · ${hotspot.id} CTX crop rejected — ${err.code}: ${err.message}`);
    }
    throw err;
  }
}
