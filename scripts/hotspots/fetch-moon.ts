import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import {
  fetchLrocPatch,
  LrocFetchError,
  resolveLrocUrl,
  type LrocFetchResult,
} from './lroc-fetch.ts';

/**
 * Moon hotspots fetch orchestrator (PRD-014 / RFC-017 §S2, v0.7.x #PC).
 *
 * Mirrors scripts/hotspots/fetch-mars.ts in shape:
 *   - read surface-hotspots.json + moon-sites.json,
 *   - per-site loop with polite pause between network-touching sites,
 *   - skip / fetch / fail bookkeeping for caller-side reporting,
 *   - dry-run + missing-only + onlySite filters.
 *
 * Differences from the Mars orchestrator:
 *   - no candidate ranking: LROC NAC's curated-map approach gives one
 *     product per site (no catalog query). If that product fails, the
 *     site is skipped — operator iterates on lroc-products.ts and
 *     re-runs (vs Mars where the next candidate is tried).
 *   - the polite pause is shorter (30s vs Mars 90s): LROC PDS at
 *     pdsimage2.wr.usgs.gov has higher published throughput tolerance
 *     and our per-site download is one .IMG vs Mars's multi-candidate
 *     attempts.
 */

const SIDECAR_PATH = path.join('static', 'data', 'surface-hotspots.json');
const MOON_SITES_PATH = path.join('static', 'data', 'moon-sites.json');

/** Polite pause between successive sites that touched the network. */
const POLITE_PAUSE_MS = 30_000;

interface SurfaceHotspotsSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_source?: string;
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

export interface FetchMoonHotspotsInput {
  /** Process only this site id (e.g. 'apollo11'). */
  onlySite?: string;
  /** Skip sites whose output patch is already on disk. */
  missingOnly?: boolean;
  /** Log what would happen without fetching. */
  dryRun?: boolean;
}

export interface FetchMoonHotspotsOutput {
  fetched: LrocFetchResult[];
  skipped: Array<{ siteId: string; reason: string }>;
  failed: Array<{ siteId: string; error: string }>;
}

export async function fetchMoonHotspots(
  input: FetchMoonHotspotsInput = {},
): Promise<FetchMoonHotspotsOutput> {
  const sidecar = JSON.parse(await fs.readFile(SIDECAR_PATH, 'utf-8')) as SurfaceHotspotsSidecar;
  const moonSites = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as MoonSite[];
  const moonById = new Map(moonSites.filter((s) => s.kind !== 'orbiter').map((s) => [s.id, s]));

  const moonHotspots = Object.entries(sidecar.entries)
    .filter(([id, e]) => {
      if (input.onlySite && id !== input.onlySite) return false;
      if (!e.hotspot_tier2_source) return false;
      if (!e.hotspot_tier2_source.includes('/moon/')) return false;
      if (input.missingOnly && !input.onlySite) {
        if (existsSync(`static${e.hotspot_tier2_source}`)) return false;
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

    const outputPath = `static${hotspot.hotspot_tier2_source}`;
    if (input.dryRun) {
      // Resolve the URL without hitting the network so the operator
      // can see exactly what the real fetch would target — and catch
      // misconfigured curated entries (no fullUrl / no YYYYDDD) before
      // burning a polite-pause cycle in production.
      try {
        const { productId, sourceUrl } = resolveLrocUrl(
          hotspot.id,
          hotspot.hotspot_tier2_force_product_url,
        );
        skipped.push({
          siteId: hotspot.id,
          reason: `dry-run: would fetch ${productId} from ${sourceUrl} → ${outputPath}`,
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
