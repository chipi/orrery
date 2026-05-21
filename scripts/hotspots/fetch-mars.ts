import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import {
  findHiriseCandidates,
  hiriseProductIdToJP2Url,
  type HiriseFrame,
} from './hirise-catalog.ts';

/** Per-site cap on how many candidate frames we'll download + try.
 *  Empirically: 3 of 4 first-pass auto-pick winners landed on the
 *  5th candidate, so 5 was barely scraping by. 15 gives the long-
 *  tail cases (sparsely-imaged sites, or sites where many top-
 *  ranked frames have no-data padding at the target) more shots
 *  while keeping worst-case bandwidth bounded (~15 × ~700 MB =
 *  ~10 GB per site max). */
const MAX_CANDIDATES_PER_SITE = 15;
/** Polite pause between successive sites. UAHiRISE PDS doesn't
 *  publish rate limits but a hammering script is the kind of thing
 *  an ops team will throttle preemptively. 90 s gives the server a
 *  break and keeps us off any abuse radar. Skipped after the last
 *  site + after sites we skipped (cached / missing-only filter). */
const POLITE_PAUSE_MS = 90_000;

/**
 * Mars Tier B fetch orchestrator (PRD-014 / RFC-017 §S2, v0.7.x #PA).
 *
 * For each Mars hotspot configured in surface-hotspots.json:
 *   1. Resolve product ID via operator override (if set) or auto-
 *      pick from HiRISE RDR catalog.
 *   2. Build the deterministic UAHiRISE PDS download URL.
 *   3. Crop a 2048×2048 patch centred on the site's published
 *      lat/lon via the GDAL pipeline.
 *   4. Save to static/images/hotspots/mars/<site>/tier2-hirise.jpg.
 *   5. Return per-site metadata for provenance integration.
 *
 * Auto-pick search radius scales with the site's location_uncertainty_m
 * — Mars 3 (±10 km) gets a 12 km search; well-known landers (Curiosity,
 * Perseverance: ±50 m) get the default 5 km. Defensive against older
 * Soviet sites and crashed landers whose coordinates are imprecise.
 *
 * Operator override path: `hotspot_tier2_force_product_id` in
 * surface-hotspots.json — pinning a specific HiRISE product ID skips
 * the catalog query (use this when auto-pick is editorially wrong:
 * dust storm, bad lighting, target obscured, etc.).
 */

interface SurfaceHotspotsSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_source?: string;
      hotspot_tier2_force_product_id?: string;
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

export interface MarsHotspotFetchResult {
  siteId: string;
  productId: string;
  sourceUrl: string;
  outputPath: string;
  candidateCount: number;
  selectedFrame: HiriseFrame | null;
  cached: boolean;
  cropMeta: {
    pixelX: number;
    pixelY: number;
    projection: string;
    resolutionMPerPx: number;
    bytes: number;
  };
}

export interface FetchMarsHotspotsInput {
  /** Process only this site id, not all 13. Optional. */
  onlySite?: string;
  /** Skip the catalog query + use only operator overrides. */
  overrideOnly?: boolean;
  /** Skip sites whose output patch is already on disk — useful for
   *  incremental retry against the unresolved subset without
   *  re-downloading the proven-good ones. The single-site path
   *  (`onlySite`) bypasses this filter so the operator can force a
   *  rebuild of any specific site. */
  missingOnly?: boolean;
  /** Don't actually fetch — log what would happen. */
  dryRun?: boolean;
}

export interface FetchMarsHotspotsOutput {
  fetched: MarsHotspotFetchResult[];
  skipped: Array<{ siteId: string; reason: string }>;
  failed: Array<{ siteId: string; error: string }>;
}

export async function fetchMarsHotspots(
  input: FetchMarsHotspotsInput = {},
): Promise<FetchMarsHotspotsOutput> {
  const sidecar = JSON.parse(await fs.readFile(SIDECAR_PATH, 'utf-8')) as SurfaceHotspotsSidecar;
  const marsSites = JSON.parse(await fs.readFile(MARS_SITES_PATH, 'utf-8')) as MarsSite[];
  const marsById = new Map(marsSites.filter((s) => s.kind !== 'orbiter').map((s) => [s.id, s]));

  // Filter sidecar entries to Mars hotspots only (path under mars/).
  // `missingOnly` skips sites whose output patch already exists on
  // disk — but ONLY when the operator hasn't explicitly named a
  // single site (the --site flag is the force-rebuild path).
  const marsHotspots = Object.entries(sidecar.entries)
    .filter(([id, e]) => {
      if (input.onlySite && id !== input.onlySite) return false;
      if (!e.hotspot_tier2_source) return false;
      if (!e.hotspot_tier2_source.includes('/mars/')) return false;
      if (input.missingOnly && !input.onlySite) {
        if (existsSync(`static${e.hotspot_tier2_source}`)) return false;
      }
      return true;
    })
    .map(([id, e]) => ({ id, ...e }));

  const fetched: MarsHotspotFetchResult[] = [];
  const skipped: Array<{ siteId: string; reason: string }> = [];
  const failed: Array<{ siteId: string; error: string }> = [];

  for (let i = 0; i < marsHotspots.length; i++) {
    const hotspot = marsHotspots[i];
    const site = marsById.get(hotspot.id);
    if (!site || site.lat == null || site.lon == null) {
      skipped.push({ siteId: hotspot.id, reason: 'no lat/lon in mars-sites.json' });
      continue;
    }

    let didNetwork = false;
    try {
      const result = await fetchOne(hotspot, site as Required<MarsSite>, input);
      if (result === null) {
        skipped.push({ siteId: hotspot.id, reason: 'no candidate frame found' });
      } else if (input.dryRun) {
        skipped.push({
          siteId: hotspot.id,
          reason: `dry-run: would fetch ${result.productId} from ${result.sourceUrl}`,
        });
      } else {
        fetched.push(result);
        didNetwork = true;
      }
    } catch (err) {
      failed.push({ siteId: hotspot.id, error: (err as Error).message });
      // Anything thrown past fetchOne implies we hit the network
      // (cache misses for the override pin, or all candidates burned
      // through their downloads). Treat as needing the cool-down.
      didNetwork = true;
    }

    // Polite pause between sites — only when we actually touched the
    // network for this site and there's another site to go.
    const isLast = i === marsHotspots.length - 1;
    if (didNetwork && !isLast && !input.dryRun) {
      console.log(`  · pausing ${POLITE_PAUSE_MS / 1000}s before next site (politeness)`);
      await new Promise((r) => setTimeout(r, POLITE_PAUSE_MS));
    }
  }

  return { fetched, skipped, failed };
}

async function fetchOne(
  hotspot: {
    id: string;
    hotspot_tier2_source?: string;
    hotspot_tier2_force_product_id?: string;
    location_uncertainty_m?: number;
  },
  site: Required<MarsSite>,
  input: FetchMarsHotspotsInput,
): Promise<MarsHotspotFetchResult | null> {
  // Pre-filter radius: coarse cull of frames whose orbital track is
  // nowhere near. The actual containment test is point-in-polygon
  // against the 4 image corners (see hirise-catalog.findHiriseCandidates).
  // 100 km surfaces more PIP-passing frames for sparsely-imaged
  // sites (viking1-lander + mars-pathfinder had only 2 PIP-passing
  // frames each at the 50 km radius). The PIP test is the actual
  // geometric gate, so the wider pre-filter only adds false-positive
  // distance-filter hits, not false-positive PIP hits.
  const uncertaintyKm = (hotspot.location_uncertainty_m ?? 50) / 1000;
  const searchRadiusKm = Math.max(100, uncertaintyKm + 50);

  // Resolve candidate list. Operator override pins a single product
  // (skip catalog query). Otherwise rank by composite score and try
  // up to MAX_CANDIDATES_PER_SITE before giving up.
  const ranked: HiriseFrame[] = [];
  if (hotspot.hotspot_tier2_force_product_id) {
    ranked.push({
      productId: hotspot.hotspot_tier2_force_product_id,
      centerLat: site.lat,
      centerLon: site.lon,
      mapScale: 0,
      incidenceAngle: 50,
      startTime: '',
      imageLines: 0,
      lineSamples: 0,
      corners: [],
    });
  } else if (input.overrideOnly) {
    return null;
  } else {
    const candidates = await findHiriseCandidates({
      targetLat: site.lat,
      targetLon: site.lon,
      searchRadiusKm,
    });
    ranked.push(...candidates.slice(0, MAX_CANDIDATES_PER_SITE));
  }
  const candidateCount = ranked.length;
  if (ranked.length === 0) return null;

  // Output path mirrors the hotspot_tier2_source field in the sidecar.
  // sidecar uses provenance-style /images/... — prepend static/ for fs.
  const outputPath = `static${hotspot.hotspot_tier2_source}`;

  if (input.dryRun) {
    const top = ranked[0];
    return {
      siteId: hotspot.id,
      productId: top.productId,
      sourceUrl: hiriseProductIdToJP2Url(top.productId),
      outputPath,
      candidateCount,
      selectedFrame: top,
      cached: false,
      cropMeta: { pixelX: 0, pixelY: 0, projection: '', resolutionMPerPx: 0, bytes: 0 },
    };
  }

  // Try each candidate in rank order. The first one that produces a
  // crop with real image data wins. NO_DATA_AT_TARGET / CROP_MOSTLY_BLACK
  // / DOWNLOAD_FAILED on a candidate falls through to the next; any
  // other error propagates so the caller can flag it.
  const rejections: string[] = [];
  for (const candidate of ranked) {
    const sourceUrl = hiriseProductIdToJP2Url(candidate.productId);
    try {
      const crop = await cropRemoteRasterToLatLon({
        sourceUrl,
        targetLat: site.lat,
        targetLon: site.lon,
        outputPath,
        cropSize: 2048,
        jpegQuality: 88,
      });
      return {
        siteId: hotspot.id,
        productId: candidate.productId,
        sourceUrl,
        outputPath,
        candidateCount,
        selectedFrame: candidate,
        cached: false,
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
        rejections.push(`${candidate.productId}:${err.code}`);
        console.log(
          `  · ${hotspot.id} candidate ${candidate.productId} rejected — ${err.code}: ${err.message}`,
        );
        continue;
      }
      throw err;
    }
  }
  throw new Error(`All ${ranked.length} candidate(s) rejected: ${rejections.join(', ')}`);
}
