import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import {
  fetchLrocPatch,
  LrocFetchError,
  resolveLrocUrl,
  type LrocFetchResult,
} from './lroc-fetch.ts';

/**
 * Moon Tier 2a (regional LROC NAC layer) fetch orchestrator.
 *
 * Companion to fetch-moon.ts (the LROC NAC detail orchestrator) — same
 * sidecar-driven shape, same crop pipeline, but the output is a wider
 * 3072² crop (~15 km × 15 km at LROC NAC ROI _5M.IMG's 5 m/px native)
 * filed under `hotspot_tier2_regional_source`. The detail orchestrator
 * still writes the 2048² (~10 km) `hotspot_tier2_source` patch.
 *
 * Rationale: at flat-patch entry zoom the screen shows ~1.5 km of
 * ground. As the user wheels-out toward the sphere transition the
 * regional layer must cover the visible viewport at every zoom step,
 * otherwise the surrounding canvas goes black. The existing 1–5 km
 * region_bounds rectangles inherited from moon-sites.json were too
 * tight for this. Marko's 2026-06-07 ask: "fill with detail patch and
 * delicately expand ctx to cover 4-8 times around so that there is no
 * blank on any screen — when I say expand I don't mean stretch, I mean
 * more imagery." This script provides the additional imagery.
 *
 * Same source URL as the detail fetcher — there is no separate LROC
 * WAC product table; the wider crop reads more of the same NAC ROI
 * mosaic. For sites with no curated NAC ROI (luna16/luna17/luna21/
 * change3/change5/slim) the script logs NO_CURATED_PRODUCT and skips;
 * the operator iterates on lroc-products.ts the same way as for the
 * detail fetcher.
 *
 * Per site:
 *   1. Look up `hotspot_tier2_regional_source` from surface-hotspots.json.
 *      Moon sites without this field are skipped.
 *   2. Resolve LROC NAC ROI source URL via lroc-products.ts curated
 *      map (or sidecar's `hotspot_tier2_force_product_url`).
 *   3. HEAD-check, then GDAL crop 3072² at native 5 m/px (~15 km).
 *   4. Output: static/images/hotspots/moon/<site>/tier2-regional.jpg
 */

const SIDECAR_PATH = path.join('static', 'data', 'surface-hotspots.json');
const MOON_SITES_PATH = path.join('static', 'data', 'moon-sites.json');

/** Polite pause between successive sites that touched the network. */
const POLITE_PAUSE_MS = 30_000;

/** Crop window size in source pixels — 3072 × 5 m/px ≈ 15.4 km. */
const REGIONAL_CROP_SIZE = 3072;

interface SurfaceHotspotsSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_regional_source?: string;
      hotspot_tier2_force_product_id?: string;
      hotspot_tier2_force_product_url?: string;
      location_uncertainty_m?: number;
    }
  >;
}

interface MoonSite {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

export interface FetchMoonRegionalInput {
  /** Process only this site id (e.g. 'apollo11'). */
  onlySite?: string;
  /** Skip sites whose output patch is already on disk. */
  missingOnly?: boolean;
  /** Log what would happen without fetching. */
  dryRun?: boolean;
}

export interface FetchMoonRegionalOutput {
  fetched: LrocFetchResult[];
  skipped: Array<{ siteId: string; reason: string }>;
  failed: Array<{ siteId: string; error: string }>;
}

export async function fetchMoonRegionalHotspots(
  input: FetchMoonRegionalInput = {},
): Promise<FetchMoonRegionalOutput> {
  const sidecar = JSON.parse(await fs.readFile(SIDECAR_PATH, 'utf-8')) as SurfaceHotspotsSidecar;
  const moonSites = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as MoonSite[];
  const moonById = new Map(moonSites.filter((s) => s.kind !== 'orbiter').map((s) => [s.id, s]));

  const moonHotspots = Object.entries(sidecar.entries)
    .filter(([id, e]) => {
      if (input.onlySite && id !== input.onlySite) return false;
      if (!e.hotspot_tier2_regional_source) return false;
      if (!e.hotspot_tier2_regional_source.includes('/moon/')) return false;
      if (input.missingOnly && !input.onlySite) {
        if (existsSync(`static${e.hotspot_tier2_regional_source}`)) return false;
      }
      return true;
    })
    .map(([id, e]) => ({ id, ...e }));

  const fetched: LrocFetchResult[] = [];
  const skipped: Array<{ siteId: string; reason: string }> = [];
  const failed: Array<{ siteId: string; error: string }> = [];

  for (let i = 0; i < moonHotspots.length; i++) {
    const hotspot = moonHotspots[i];
    const site = moonById.get(hotspot.id);
    if (!site || site.lat == null || site.lon == null) {
      skipped.push({ siteId: hotspot.id, reason: 'no lat/lon in moon-sites.json' });
      continue;
    }

    const outputPath = `static${hotspot.hotspot_tier2_regional_source}`;
    if (input.dryRun) {
      try {
        const { productId, sourceUrl } = resolveLrocUrl(
          hotspot.id,
          hotspot.hotspot_tier2_force_product_url,
        );
        skipped.push({
          siteId: hotspot.id,
          reason: `dry-run: would fetch ${productId} from ${sourceUrl} → ${outputPath} (cropSize ${REGIONAL_CROP_SIZE})`,
        });
      } catch (err) {
        const msg =
          err instanceof LrocFetchError ? `${err.code}: ${err.message}` : (err as Error).message;
        failed.push({ siteId: hotspot.id, error: `dry-run URL resolve failed — ${msg}` });
      }
      continue;
    }

    let didNetwork = false;
    try {
      const result = await fetchLrocPatch({
        siteId: hotspot.id,
        targetLat: site.lat,
        targetLon: site.lon,
        outputPath,
        overrideUrl: hotspot.hotspot_tier2_force_product_url,
        cropSize: REGIONAL_CROP_SIZE,
      });
      fetched.push(result);
      didNetwork = true;
    } catch (err) {
      if (err instanceof LrocFetchError) {
        failed.push({ siteId: hotspot.id, error: `${err.code}: ${err.message}` });
      } else {
        failed.push({ siteId: hotspot.id, error: (err as Error).message });
      }
      didNetwork = err instanceof LrocFetchError && err.code !== 'NO_CURATED_PRODUCT';
    }

    const isLast = i === moonHotspots.length - 1;
    if (didNetwork && !isLast && !input.dryRun) {
      console.log(`  · pausing ${POLITE_PAUSE_MS / 1000}s before next site (politeness)`);
      await new Promise((r) => setTimeout(r, POLITE_PAUSE_MS));
    }
  }

  return { fetched, skipped, failed };
}
