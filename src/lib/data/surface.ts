import { get } from './core';
import type { MoonSite } from '$types/moon-site';
import type { MarsSite, Traverse, RouteHirisePatch } from '$types/mars-site';

export async function moonSites(): Promise<MoonSite[]> {
  return get<MoonSite[]>('moon-sites.json');
}

/**
 * Surface-hotspot tier metadata sidecar (PRD-014 / RFC-017).
 * Lives at static/data/surface-hotspots.json; joins to moon-sites
 * + mars-sites by site id. Sites absent from the sidecar render
 * Tier 0 only (existing silhouette dispatcher) — backward compatible.
 * Returns an empty object on fetch failure so absent sidecar = all
 * sites at Tier 0, not a hard error.
 */
interface SurfaceHotspotsSidecar {
  version: number;
  generated_at: string;
  schema_doc?: string;
  entries: Record<
    string,
    {
      hotspot_tier_max?: 0 | 1 | 2 | 3;
      hotspot_model?: string;
      hotspot_tier2_source?: string;
      hotspot_tier2_regional_source?: string;
      hotspot_tier3_panorama?: string;
      hotspot_annotations?: import('$types/surface-site').HotspotAnnotation[];
      location_uncertainty_m?: number;
      showcase?: boolean;
      crashed?: boolean;
      // Panorama schema v2 (PRD-022 / ADR-074, #286). All optional;
      // sites without these fields fall back to legacy single-URL.
      panorama_metadata?: import('$types/surface-site').PanoramaMetadata;
      panorama_annotations?: import('$types/surface-site').PanoramaAnnotation[];
      panorama_set?: import('$types/surface-site').PanoramaSetEntry[];
      traverse_stop_link?: string;
    }
  >;
}

async function surfaceHotspotsSidecar(): Promise<SurfaceHotspotsSidecar['entries']> {
  const sidecar = await get<SurfaceHotspotsSidecar>('surface-hotspots.json').catch(() => null);
  return sidecar?.entries ?? {};
}

/**
 * Per-site, per-locale hotspot-metadata overlay (PRD-014 / RFC-017
 * §S6). Currently only carries `hotspot_annotations` translations
 * (annotation labels are user-visible; lat/lon offsets are technical
 * and don't translate). Sites without an overlay file fall back to
 * the default labels from surface-hotspots.json (typically English).
 */
async function hotspotMetadataOverlay(
  locale: string,
  siteId: string,
): Promise<Partial<{
  hotspot_annotations: import('$types/surface-site').HotspotAnnotation[];
}> | null> {
  return get<Partial<{ hotspot_annotations: import('$types/surface-site').HotspotAnnotation[] }>>(
    `i18n/${locale}/hotspot-metadata/${siteId}.json`,
  ).catch(() => null);
}

/**
 * Moon landing sites merged with their per-locale editorial overlay
 * (name, mission_type, site_name, crew, left, fact, capability), with
 * the surface-hotspots sidecar (tier metadata for the v0.7 Surface
 * Hotspots feature), AND with the per-locale hotspot-metadata overlay
 * (annotation labels per locale). Used by /moon.
 *
 * Merge order: base → editorial overlay → hotspot sidecar → hotspot
 * locale overlay. Later wins. The hotspot locale overlay only
 * carries translated annotation labels; if a site has no overlay
 * file for the current locale, falls back to en-US, then to the
 * sidecar default (which is English).
 */
export async function getMoonSites(locale = 'en-US'): Promise<MoonSite[]> {
  // baseList + hotspots run in parallel — both are single-fetch JSON
  // and they don't depend on each other.
  const [baseList, hotspots] = await Promise.all([moonSites(), surfaceHotspotsSidecar()]);
  // Per-site overlay merge — fan out across all 27 sites instead of
  // awaiting one at a time. Each iteration does up to four nested
  // fetches (locale overlay, en-US fallback, hotspot metadata, hotspot
  // metadata fallback) — under the old `for ... await` loop those
  // serialised across sites for a worst-case ~108 sequential network
  // roundtrips. With Promise.all the wall-clock drops to roughly
  // one slow site's depth (~4 sequential fetches) instead of N times
  // that. (2026-06-17 user report: "on /earth /moon /mars orbits and
  // items load after the planet, sometimes takes few seconds.")
  return Promise.all(
    baseList.map(async (s) => {
      const overlay = await get<Partial<MoonSite>>(`i18n/${locale}/moon-sites/${s.id}.json`).catch(
        () => null,
      );
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<Partial<MoonSite>>(`i18n/en-US/moon-sites/${s.id}.json`).catch(() => null));
      const localised = fallback ? { ...s, ...fallback } : s;
      const hotspot = hotspots[s.id];
      let withHotspot = hotspot ? { ...localised, ...hotspot } : localised;
      if (withHotspot.hotspot_annotations) {
        const hsOverlay =
          (await hotspotMetadataOverlay(locale, s.id)) ??
          (locale === 'en-US' ? null : await hotspotMetadataOverlay('en-US', s.id));
        if (hsOverlay?.hotspot_annotations) {
          withHotspot = {
            ...withHotspot,
            hotspot_annotations: mergeAnnotations(
              withHotspot.hotspot_annotations,
              hsOverlay.hotspot_annotations,
            ),
          };
        }
      }
      return withHotspot;
    }),
  );
}

/**
 * Merge translated annotation labels into the default annotations by
 * id. Annotations not present in the overlay keep their default
 * label. Annotations in the overlay but not in the default are
 * ignored (overlay can't introduce new annotations — they live in
 * the sidecar as the source of truth for ids + positions).
 */
function mergeAnnotations(
  defaults: import('$types/surface-site').HotspotAnnotation[],
  overlay: import('$types/surface-site').HotspotAnnotation[],
): import('$types/surface-site').HotspotAnnotation[] {
  const overlayById = new Map(overlay.map((o) => [o.id, o]));
  return defaults.map((d) => {
    const o = overlayById.get(d.id);
    if (!o) return d;
    return { ...d, ...o, lat_offset_m: d.lat_offset_m, lon_offset_m: d.lon_offset_m };
  });
}

/** Mars surface + orbital sites — base catalogue (PRD-009 / RFC-012). */
export async function marsSites(): Promise<MarsSite[]> {
  return get<MarsSite[]>('mars-sites.json');
}

/** Venus surface landing sites — the three Venera/Vega landers (RFC-034 §12).
 *  No per-site i18n overlays yet; loaded straight from the base catalogue. */
export async function getVenusSites(
  _locale = 'en-US',
): Promise<import('$types/surface-site').SurfaceSite[]> {
  return get<import('$types/surface-site').SurfaceSite[]>('venus-sites.json');
}

/**
 * Mars sites merged with their per-locale editorial overlay (name,
 * mission_type, site_name, fact, capability). Used by /mars.
 * Mirrors getMoonSites — the locale-merge pattern is body-agnostic.
 */
export async function getMarsSites(locale = 'en-US'): Promise<MarsSite[]> {
  // Parallel fan-out — see getMoonSites for the rationale. Same
  // structure: baseList + hotspots in parallel, then 27 per-site
  // overlay merges concurrently instead of sequentially.
  const [baseList, hotspots] = await Promise.all([marsSites(), surfaceHotspotsSidecar()]);
  return Promise.all(
    baseList.map(async (s) => {
      const overlay = await get<Partial<MarsSite>>(`i18n/${locale}/mars-sites/${s.id}.json`).catch(
        () => null,
      );
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<Partial<MarsSite>>(`i18n/en-US/mars-sites/${s.id}.json`).catch(() => null));
      const localised = fallback ? { ...s, ...fallback } : s;
      const hotspot = hotspots[s.id];
      let withHotspot = hotspot ? { ...localised, ...hotspot } : localised;
      if (withHotspot.hotspot_annotations) {
        const hsOverlay =
          (await hotspotMetadataOverlay(locale, s.id)) ??
          (locale === 'en-US' ? null : await hotspotMetadataOverlay('en-US', s.id));
        if (hsOverlay?.hotspot_annotations) {
          withHotspot = {
            ...withHotspot,
            hotspot_annotations: mergeAnnotations(
              withHotspot.hotspot_annotations,
              hsOverlay.hotspot_annotations,
            ),
          };
        }
      }
      return withHotspot;
    }),
  );
}

/** Mars rover traverse polylines (PRD-009 §what-comes-after). */
export async function getMarsTraverse(roverId: string): Promise<Traverse | null> {
  const t = await get<Traverse>(`mars-traverses/${roverId}.json`).catch(() => null);
  if (!t) return null;
  // Along-route HiRISE patches (#360) — optional sidecar manifest. Only fetched
  // when the traverse declares `has_route_patches`, so rovers without a sidecar
  // don't 404 on a file that was never generated.
  if (t.has_route_patches) {
    const rp = await get<{ patches: RouteHirisePatch[] }>(
      `mars-traverses/${roverId}.route-patches.json`,
    ).catch(() => null);
    if (rp?.patches?.length) t.route_patches = rp.patches;
  }
  return t;
}

/** Moon rover traverse polylines (#361 follow-on) — Lunokhod 1/2, Yutu,
 *  Yutu-2, Pragyan. Same shape + along-route patch sidecar as Mars. */
export async function getMoonTraverse(roverId: string): Promise<Traverse | null> {
  const t = await get<Traverse>(`moon-traverses/${roverId}.json`).catch(() => null);
  if (!t) return null;
  // Only apollo16/apollo17 have a route-patches sidecar; gate on the flag so the
  // other Moon traverses don't 404 (see getMarsTraverse).
  if (t.has_route_patches) {
    const rp = await get<{ patches: RouteHirisePatch[] }>(
      `moon-traverses/${roverId}.route-patches.json`,
    ).catch(() => null);
    if (rp?.patches?.length) t.route_patches = rp.patches;
  }
  return t;
}
