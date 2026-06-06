/**
 * Data client — fetch + cache + locale-overlay merge per ADR-006, ADR-017.
 *
 * Files are served from /data/ at runtime (static/data/ on disk; SvelteKit
 * copies static/ to build/ root). When SvelteKit's base path is set (e.g.
 * /orrery for GitHub Pages), URLs are prefixed automatically via $app/paths.
 */

import { base } from '$app/paths';
import type { Destination, Mission, MissionIndex } from '$types/mission';
import type { LocalizedPlanet, PlanetOverlay, PlanetsData } from '$types/planet';
import type { LocalizedSun, Sun, SunOverlay } from '$types/sun';
import type { LocalizedScenario, Scenario, ScenarioOverlay } from '$types/scenario';
import type { Rocket } from '$types/rocket';
import type { EarthObject } from '$types/earth-object';
import type { MoonSite } from '$types/moon-site';
import type { MarsSite, Traverse } from '$types/mars-site';
import type { PorkchopGrid } from '$types/porkchop-grid';
import type { DestinationId } from '$lib/lambert-grid.constants';
import type { IssModule, IssModuleBase, IssModuleOverlay } from '$types/iss-module';
import type {
  TiangongModule,
  TiangongModuleBase,
  TiangongModuleOverlay,
} from '$types/tiangong-module';
import type {
  FleetCategory,
  FleetEntry,
  FleetEntryBase,
  FleetEntryOverlay,
  FleetIndexEntry,
} from '$types/fleet';
import type {
  ScienceLanding,
  ScienceSection,
  ScienceSectionBase,
  ScienceSectionOverlay,
  ScienceTabId,
  ScienceTabIntro,
} from '$types/science';

const cache = new Map<string, unknown>();

type FetchLike = typeof fetch;

async function get<T>(path: string, fetchFn: FetchLike = fetch): Promise<T> {
  const url = `${base}/data/${path}`;
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}

export async function getMissionIndex(): Promise<MissionIndex[]> {
  return get<MissionIndex[]>('missions/index.json');
}

export async function getMission(
  id: string,
  dest: string,
  locale = 'en-US',
): Promise<Mission | null> {
  const destLower = dest.toLowerCase();
  try {
    const baseRecord = await get<Mission>(`missions/${destLower}/${id}.json`);
    const overlay = await get<Partial<Mission>>(
      `i18n/${locale}/missions/${destLower}/${id}.json`,
    ).catch(() => ({}) as Partial<Mission>);
    return { ...baseRecord, ...overlay };
  } catch {
    return null;
  }
}

export interface MissionFilter {
  dest?: Destination;
  status?: 'ACTIVE' | 'FLOWN' | 'PLANNED';
  agency?: string;
}

export async function filterMissions(filters: MissionFilter = {}): Promise<MissionIndex[]> {
  const all = await getMissionIndex();
  return all.filter(
    (m) =>
      (!filters.dest || m.dest === filters.dest) &&
      (!filters.status || m.status === filters.status) &&
      (!filters.agency || m.agency === filters.agency),
  );
}

/**
 * Returns every mission with its locale overlay merged. Used by the
 * /missions library to render cards with the editorial fields (name,
 * type, first) without having to round-trip per-card.
 *
 * Fetches in parallel — 36 missions × ~2 KB each = ~72 KB total, well
 * within reason for a one-shot library load. The cache then services
 * any subsequent `getMission(id, dest)` call instantly.
 */
export async function getMissionsForLibrary(locale = 'en-US'): Promise<Mission[]> {
  const index = await getMissionIndex();
  const missions = await Promise.all(
    index.map(async (entry) => {
      const merged = await getMission(entry.id, entry.dest, locale);
      // Fall back to the index entry if the per-mission file is missing
      // for some reason — better an under-decorated card than a crash.
      return merged ?? ({ ...entry } as Mission);
    }),
  );
  return missions;
}

export async function planets(): Promise<PlanetsData> {
  return get<PlanetsData>('planets.json');
}

/**
 * Returns the 8 planets merged with their per-locale editorial overlay.
 * Order matches `planets.json` (Mercury → Neptune). The id is the
 * lowercase planet name and is used as the URL slug & overlay filename.
 *
 * If a locale overlay is missing, falls back to en-US. If en-US itself
 * is missing for any planet, a hard error is thrown — overlays are part
 * of the editorial contract, not optional decoration.
 */
export async function getPlanets(locale = 'en-US'): Promise<LocalizedPlanet[]> {
  const baseData = await planets();
  const merged: LocalizedPlanet[] = [];
  for (const p of baseData.planets) {
    const id = p.name.toLowerCase();
    const overlay = await get<PlanetOverlay>(`i18n/${locale}/planets/${id}.json`).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<PlanetOverlay>(`i18n/en-US/planets/${id}.json`).catch(() => null));
    if (!fallback) {
      throw new Error(`Missing planet overlay for ${id} (locale ${locale}, no en-US fallback)`);
    }
    merged.push({ ...p, ...fallback, id });
  }
  return merged;
}

export async function rockets(): Promise<Rocket[]> {
  return get<Rocket[]>('rockets.json');
}

/**
 * Rockets merged with their per-locale editorial overlay (name, type,
 * first, description). Fallback chain mirrors getPlanets / getMission.
 */
export async function getRockets(locale = 'en-US'): Promise<Rocket[]> {
  const baseList = await rockets();
  const merged: Rocket[] = [];
  for (const r of baseList) {
    const overlay = await get<Partial<Rocket>>(`i18n/${locale}/rockets/${r.id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<Rocket>>(`i18n/en-US/rockets/${r.id}.json`).catch(() => null));
    merged.push(fallback ? { ...r, ...fallback } : r);
  }
  return merged;
}

export async function earthObjects(): Promise<EarthObject[]> {
  return get<EarthObject[]>('earth-objects.json');
}

/**
 * Earth-orbit objects merged with their per-locale editorial overlay
 * (name, short, description, scale_fact). Used by /earth.
 */
export async function getEarthObjects(locale = 'en-US'): Promise<EarthObject[]> {
  const baseList = await earthObjects();
  const merged: EarthObject[] = [];
  for (const o of baseList) {
    const overlay = await get<Partial<EarthObject>>(
      `i18n/${locale}/earth-objects/${o.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<EarthObject>>(`i18n/en-US/earth-objects/${o.id}.json`).catch(
            () => null,
          ));
    merged.push(fallback ? { ...o, ...fallback } : o);
  }
  return merged;
}

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
  const baseList = await moonSites();
  const hotspots = await surfaceHotspotsSidecar();
  const merged: MoonSite[] = [];
  for (const s of baseList) {
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
    merged.push(withHotspot);
  }
  return merged;
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

/**
 * Mars sites merged with their per-locale editorial overlay (name,
 * mission_type, site_name, fact, capability). Used by /mars.
 * Mirrors getMoonSites — the locale-merge pattern is body-agnostic.
 */
export async function getMarsSites(locale = 'en-US'): Promise<MarsSite[]> {
  const baseList = await marsSites();
  const hotspots = await surfaceHotspotsSidecar();
  const merged: MarsSite[] = [];
  for (const s of baseList) {
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
    merged.push(withHotspot);
  }
  return merged;
}

/** Mars rover traverse polylines (PRD-009 §what-comes-after). */
export async function getMarsTraverse(roverId: string): Promise<Traverse | null> {
  return get<Traverse>(`mars-traverses/${roverId}.json`).catch(() => null);
}

/**
 * Returns the Sun's astrophysical figures merged with its locale
 * overlay. Falls back to en-US when a locale overlay is missing.
 */
export async function getSun(locale = 'en-US'): Promise<LocalizedSun> {
  const baseRecord = await get<Sun>('sun.json');
  const overlay = await get<SunOverlay>(`i18n/${locale}/sun.json`).catch(() => null);
  const fallback =
    overlay ??
    (locale === 'en-US' ? null : await get<SunOverlay>('i18n/en-US/sun.json').catch(() => null));
  if (!fallback) {
    throw new Error(`Missing Sun overlay (locale ${locale}, no en-US fallback)`);
  }
  return { ...baseRecord, ...fallback };
}

/**
 * Returns a synthesized teaching scenario merged with its locale
 * overlay. Scenarios live in `static/data/scenarios/` (not the
 * mission library) — see `src/types/scenario.ts` for the rationale.
 *
 * Returns null if the scenario id is unknown so callers can fall
 * back gracefully (the /fly route does this when ?mission=id points
 * at a real mission rather than a scenario).
 */
export async function getScenario(id: string, locale = 'en-US'): Promise<LocalizedScenario | null> {
  try {
    const baseRecord = await get<Scenario>(`scenarios/${id}.json`);
    const overlay = await get<ScenarioOverlay>(`i18n/${locale}/scenarios/${id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ScenarioOverlay>(`i18n/en-US/scenarios/${id}.json`).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * All ISS pressurised modules + Canadarm2 (PRD-010 / ADR-017). Base rows
 * from `iss-modules.json` merged with per-locale overlays; falls back to
 * en-US when a locale overlay is missing.
 */
export async function getIssModules(locale = 'en-US'): Promise<IssModule[]> {
  const list = await get<IssModuleBase[]>('iss-modules.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<IssModuleOverlay>(
        `i18n/${locale}/iss-modules/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<IssModuleOverlay>(`i18n/en-US/iss-modules/${baseRecord.id}.json`).catch(
              () => null,
            ));
      if (!fallback) {
        throw new Error(
          `Missing ISS overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getIssModule(id: string, locale = 'en-US'): Promise<IssModule | null> {
  try {
    const list = await get<IssModuleBase[]>('iss-modules.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<IssModuleOverlay>(
      `i18n/${locale}/iss-modules/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<IssModuleOverlay>(`i18n/en-US/iss-modules/${baseRecord.id}.json`).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * ISS module photo gallery URLs (manifest `iss-galleries.json`). Empty when
 * count is 0 — UI hides the GALLERY tab.
 */
export async function getIssModuleGallery(moduleId: string): Promise<string[]> {
  return getCategoryGallery('iss-modules', 'iss-galleries.json', moduleId);
}

/**
 * Visiting spacecraft currently or commonly docked at the ISS — Soyuz,
 * Progress, Dragon ×2, Cygnus, HTV-X. Same shape as IssModule so the
 * existing IssModulePanel renders them; separate file because they are
 * visitors, not station structure.
 */
export async function getIssVisitors(locale = 'en-US'): Promise<IssModule[]> {
  const list = await get<IssModuleBase[]>('iss-visitors.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<IssModuleOverlay>(
        `i18n/${locale}/iss-visitors/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<IssModuleOverlay>(`i18n/en-US/iss-visitors/${baseRecord.id}.json`).catch(
              () => null,
            ));
      if (!fallback) {
        throw new Error(
          `Missing ISS visitor overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getIssVisitor(id: string, locale = 'en-US'): Promise<IssModule | null> {
  try {
    const list = await get<IssModuleBase[]>('iss-visitors.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<IssModuleOverlay>(
      `i18n/${locale}/iss-visitors/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<IssModuleOverlay>(`i18n/en-US/iss-visitors/${baseRecord.id}.json`).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * Tiangong pressurised modules + Chinarm (PRD-011 / ADR-049). Mirrors
 * getIssModules: base records from `tiangong-modules.json` merged with
 * per-locale overlays; falls back to en-US when a locale overlay is missing.
 */
export async function getTiangongModules(locale = 'en-US'): Promise<TiangongModule[]> {
  const list = await get<TiangongModuleBase[]>('tiangong-modules.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<TiangongModuleOverlay>(
        `i18n/${locale}/tiangong-modules/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<TiangongModuleOverlay>(
              `i18n/en-US/tiangong-modules/${baseRecord.id}.json`,
            ).catch(() => null));
      if (!fallback) {
        throw new Error(
          `Missing Tiangong overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getTiangongModule(
  id: string,
  locale = 'en-US',
): Promise<TiangongModule | null> {
  try {
    const list = await get<TiangongModuleBase[]>('tiangong-modules.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<TiangongModuleOverlay>(
      `i18n/${locale}/tiangong-modules/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<TiangongModuleOverlay>(
            `i18n/en-US/tiangong-modules/${baseRecord.id}.json`,
          ).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getTiangongModuleGallery(moduleId: string): Promise<string[]> {
  return getCategoryGallery('tiangong-modules', 'tiangong-galleries.json', moduleId);
}

export async function getTiangongVisitors(locale = 'en-US'): Promise<TiangongModule[]> {
  const list = await get<TiangongModuleBase[]>('tiangong-visitors.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<TiangongModuleOverlay>(
        `i18n/${locale}/tiangong-visitors/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<TiangongModuleOverlay>(
              `i18n/en-US/tiangong-visitors/${baseRecord.id}.json`,
            ).catch(() => null));
      if (!fallback) {
        throw new Error(
          `Missing Tiangong visitor overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getTiangongVisitor(
  id: string,
  locale = 'en-US',
): Promise<TiangongModule | null> {
  try {
    const list = await get<TiangongModuleBase[]>('tiangong-visitors.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<TiangongModuleOverlay>(
      `i18n/${locale}/tiangong-visitors/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<TiangongModuleOverlay>(
            `i18n/en-US/tiangong-visitors/${baseRecord.id}.json`,
          ).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * Spaceflight Fleet — index records (PRD-012 v0.2 / RFC-016 v0.2).
 * Lightweight summary records used by the /fleet card grid.
 */
export async function getFleetIndex(): Promise<FleetIndexEntry[]> {
  return get<FleetIndexEntry[]>('fleet/index.json');
}

/**
 * Single fleet entry with locale-overlay merged. Returns null if either
 * the base record or both locale + en-US fallback overlays are missing.
 */
export async function getFleet(
  id: string,
  category: FleetCategory,
  locale = 'en-US',
): Promise<FleetEntry | null> {
  try {
    const baseRecord = await get<FleetEntryBase>(`fleet/${category}/${id}.json`);
    const overlay = await get<FleetEntryOverlay>(
      `i18n/${locale}/fleet/${category}/${id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<FleetEntryOverlay>(`i18n/en-US/fleet/${category}/${id}.json`).catch(
            () => null,
          ));
    // Phase A skeletons ship without overlays; merge what we have.
    return fallback ? { ...baseRecord, ...fallback } : baseRecord;
  } catch {
    return null;
  }
}

/**
 * All fleet entries in a single category, locale-merged. Used by the
 * filtered card grid when the user selects a CATEGORY chip.
 */
export async function getFleetByCategory(
  category: FleetCategory,
  locale = 'en-US',
): Promise<FleetEntry[]> {
  const index = await getFleetIndex();
  const ids = index.filter((r) => r.category === category).map((r) => r.id);
  const entries = await Promise.all(ids.map((id) => getFleet(id, category, locale)));
  return entries.filter((e): e is FleetEntry => e !== null);
}

/**
 * Fleet entry photo gallery URLs. Returns empty array when the entry
 * has no gallery yet — UI hides the GALLERY tab in that case. Manifest
 * `fleet-galleries.json` is generated by `fetch-assets.ts` in Phase D.
 */
export async function getFleetGallery(id: string): Promise<string[]> {
  try {
    const map = await get<Record<string, number>>('fleet-galleries.json').catch(() => null);
    if (!map) return [];
    const count = map[id] ?? 0;
    if (count === 0) return [];
    return Array.from(
      { length: count },
      (_, i) => `${base}/images/fleet-galleries/${id}/${String(i + 1).padStart(2, '0')}.jpg`,
    );
  } catch {
    return [];
  }
}

/**
 * Pre-computed porkchop grid for a destination (v0.1.6 / ADR-026).
 * Files live in static/data/porkchop/ and are generated at build time
 * by scripts/precompute-porkchops.ts. /plan loads them via this
 * function for instant first paint and full offline capability.
 */
export async function getPorkchopGrid(destinationId: DestinationId): Promise<PorkchopGrid | null> {
  try {
    return await get<PorkchopGrid>(`porkchop/earth-to-${destinationId}.json`);
  } catch {
    return null;
  }
}

/**
 * Mission photo gallery (v0.1.8). Returns the list of image URLs for
 * a mission's gallery tab. Manifest at
 * `static/data/mission-galleries.json` is generated at build by
 * `scripts/fetch-assets.ts` (NASA Images API + Wikimedia fallback).
 *
 * Returns an empty array when no gallery exists for the mission —
 * the UI hides the gallery tab in that case.
 */
export async function getMissionGallery(missionId: string): Promise<string[]> {
  try {
    const map = await get<Record<string, number>>('mission-galleries.json');
    const count = map[missionId] ?? 0;
    if (count === 0) return [];
    return Array.from(
      { length: count },
      (_, i) => `${base}/images/missions/${missionId}/${String(i + 1).padStart(2, '0')}.jpg`,
    );
  } catch {
    return [];
  }
}

/**
 * Generic photo-gallery loader (v0.1.10). Mirrors getMissionGallery
 * for planets, the sun, earth-objects, and moon-sites — every panel
 * with a GALLERY tab uses the same manifest pattern.
 *
 * @param category — "planets" | "earth-objects" | "moon-sites" | "small-bodies" (image folder root)
 * @param manifestFile — name of the per-category manifest JSON (e.g. "planet-galleries.json")
 * @param id — entity id (planet name lowercased, earth-object id, moon-site id)
 *
 * Returns an empty array when no images exist — the UI hides the
 * GALLERY tab in that case.
 */
async function getCategoryGallery(
  category: string,
  manifestFile: string,
  id: string,
): Promise<string[]> {
  try {
    const map = await get<Record<string, number>>(manifestFile);
    const count = map[id] ?? 0;
    if (count === 0) return [];
    return Array.from(
      { length: count },
      (_, i) => `${base}/images/${category}/${id}/${String(i + 1).padStart(2, '0')}.jpg`,
    );
  } catch {
    return [];
  }
}

export async function getPlanetGallery(planetId: string): Promise<string[]> {
  return getCategoryGallery('planets', 'planet-galleries.json', planetId);
}

export async function getSunGallery(): Promise<string[]> {
  // Sun is a single entity — use a flat count manifest.
  try {
    const data = await get<{ count: number }>('sun-gallery.json');
    const count = data.count ?? 0;
    if (count === 0) return [];
    return Array.from(
      { length: count },
      (_, i) => `${base}/images/sun/${String(i + 1).padStart(2, '0')}.jpg`,
    );
  } catch {
    return [];
  }
}

export async function getEarthObjectGallery(
  objectId: string,
  missionIdFallback?: string,
): Promise<string[]> {
  const own = await getCategoryGallery('earth-objects', 'earth-object-galleries.json', objectId);
  if (own.length > 0) return own;
  // Fallback: many earth-objects (LRO, Hubble, JWST, ISS, etc.) match
  // a mission id with an existing photo gallery. Use those photos so
  // every panel gets meaningful imagery without re-vendoring.
  const fallbackId = missionIdFallback ?? objectId;
  return getMissionGallery(fallbackId);
}

export async function getMoonSiteGallery(
  siteId: string,
  missionIdFallback?: string,
): Promise<string[]> {
  // Same fallback ladder as getMarsSiteGallery (#PE 2026-05-22) —
  // per-site override → mission-gallery (by mission_id then site id)
  // → fleet-gallery (by every id-variant). Captures the cases where
  // lunar surface missions (e.g. Surveyor-class, early Luna landers,
  // Chang'e 3/4) have images only in fleet-galleries.json under
  // dash-separated ids like "luna-16" while site ids use "luna16".
  const own = await getCategoryGallery('moon-sites', 'moon-site-galleries.json', siteId);
  if (own.length > 0) return own;
  if (missionIdFallback) {
    const byMission = await getMissionGallery(missionIdFallback);
    if (byMission.length > 0) return byMission;
  }
  const bySite = await getMissionGallery(siteId);
  if (bySite.length > 0) return bySite;
  if (missionIdFallback) {
    for (const v of gallerySiteIdVariants(missionIdFallback)) {
      const g = await getFleetGallery(v);
      if (g.length > 0) return g;
    }
  }
  for (const v of gallerySiteIdVariants(siteId)) {
    const g = await getFleetGallery(v);
    if (g.length > 0) return g;
  }
  return [];
}

/**
 * /explore small-body panel (dwarfs, comets, interstellar). Manifest
 * `small-body-galleries.json` + `static/images/small-bodies/{id}/`
 * from `npm run fetch-assets`.
 */
export async function getSmallBodyGallery(bodyId: string): Promise<string[]> {
  return getCategoryGallery('small-bodies', 'small-body-galleries.json', bodyId);
}

/**
 * /explore satellite panel (Moon + other natural satellites). GH
 * #304 Slice 2. Single JSON manifest containing all satellite
 * entries — fetched once, cached for subsequent panel opens. Gallery
 * + library tabs read from sibling manifest files added in Slices 4–5.
 */
export type SatelliteLibraryLink = {
  id: string;
  label: string;
  url: string;
  /** Tier ranks how prominently the link surfaces in the panel:
   *  - intro: first row, anchor link (Wikipedia / NASA overview)
   *  - core: second-tier, mission or science deep-dive
   *  - extra: third-tier, niche / interactive / video */
  tier: 'intro' | 'core' | 'extra';
  kind: 'wikipedia' | 'nasa' | 'mission' | 'video' | 'article';
};
export type SatelliteEntry = {
  id: string;
  name: string;
  parent_planet_id: string;
  parent_planet_name: string;
  radius_km: number;
  mass_kg: number;
  semi_major_axis_km: number;
  orbital_period_days: number;
  axial_tilt_deg?: number;
  discovered: string;
  mission_visits: string[];
  surface_composition?: string;
  description: string;
  wiki?: string;
  library?: SatelliteLibraryLink[];
};
export async function getSatellites(): Promise<SatelliteEntry[]> {
  try {
    const data = await get<{ satellites: SatelliteEntry[] }>('satellites.json');
    return data.satellites ?? [];
  } catch {
    return [];
  }
}
export async function getSatelliteGallery(satelliteId: string): Promise<string[]> {
  return getCategoryGallery('satellites', 'satellite-galleries.json', satelliteId);
}

/**
 * Per-locale satellite overlay (#304 Slice 6). Mirrors the
 * mission / science overlay pattern: each locale ships a
 * `static/data/i18n/<locale>/satellites/<id>.json` file with the
 * translatable fields (description, surface_composition,
 * mission_visits, library labels). The panel reads the English
 * base from satellites.json and overlays the locale-specific
 * strings; missing fields fall back to English. Empty overlay
 * files are valid — they just mean the satellite renders fully
 * in English until the wave23 translation batch lands.
 */
export type SatelliteI18n = {
  description?: string;
  surface_composition?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
};
export async function getSatelliteI18n(
  locale: string,
  satelliteId: string,
): Promise<SatelliteI18n | null> {
  try {
    return await get<SatelliteI18n>(`i18n/${locale}/satellites/${satelliteId}.json`);
  } catch {
    return null;
  }
}

/**
 * Population belt (v0.7.x — asteroid belt + Kuiper Belt). Surfaces via
 * the /explore BeltPanel. Belts are regions, not bodies — entries
 * carry inner/outer AU bounds, population estimates, total mass, the
 * largest known members, and a tiered library. Loaded once on first
 * panel-open and cached via the data layer's standard `get()` cache.
 */
export type BeltLibraryLink = {
  id: string;
  label: string;
  url: string;
  tier: 'intro' | 'core' | 'extra';
  kind: 'wikipedia' | 'nasa' | 'mission' | 'article';
};
export type BeltEntry = {
  id: string;
  name: string;
  kind: string;
  location: string;
  inner_au: number;
  outer_au: number;
  population_estimate: string;
  total_mass_relative: string;
  largest_members: string[];
  description: string;
  discovered: string;
  mission_visits: string[];
  library?: BeltLibraryLink[];
};
export async function getBelts(): Promise<BeltEntry[]> {
  try {
    const data = await get<{ belts: BeltEntry[] }>('belts.json');
    return data.belts ?? [];
  } catch {
    return [];
  }
}

/**
 * Belt gallery — curated NASA imagery presented as portraits of the
 * belt's largest catalogued members. Image paths reuse the existing
 * /images/small-bodies tree (Ceres for the Asteroid Belt; Pluto +
 * Eris + Haumea + Makemake for the Kuiper Belt) so the gallery
 * doubles as a tour of the belt's giants without duplicating assets.
 */
export type BeltGallerySlot = { src: string; caption: string };
export async function getBeltGallery(beltId: string): Promise<BeltGallerySlot[]> {
  try {
    const data = await get<{ galleries: Record<string, BeltGallerySlot[]> }>('belt-galleries.json');
    return data.galleries?.[beltId] ?? [];
  } catch {
    return [];
  }
}

/**
 * Per-locale belt overlay (v0.7.x — translation pipeline pattern
 * mirrors satellites). Each locale ships a
 * `static/data/i18n/<locale>/belts/<id>.json` file with translatable
 * fields. Missing fields fall back to the English base. Empty
 * overlay files are valid — the panel renders fully in English until
 * the wave23 batch lands.
 */
export type BeltI18n = {
  name?: string;
  kind?: string;
  location?: string;
  population_estimate?: string;
  total_mass_relative?: string;
  largest_members?: string[];
  description?: string;
  discovered?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
};
export async function getBeltI18n(locale: string, beltId: string): Promise<BeltI18n | null> {
  try {
    return await get<BeltI18n>(`i18n/${locale}/belts/${beltId}.json`);
  } catch {
    return null;
  }
}

/**
 * #PE path-B (rich multi-agency narrative gallery).
 *
 * A site-story is a hand-curated chapter-based photo set with
 * per-image captions + chapter grouping. Distinct from the existing
 * GALLERY tab (which is a 5-image thumbnail strip with no captions).
 *
 * Stories live under `static/data/site-stories/<siteId>.json`. The
 * file is missing for sites that don't have a story yet — caller
 * gets null and renders nothing (the STORY tab hides on those sites).
 *
 * Per-image attribution / license / source URL is resolved at render
 * time from the existing image-provenance.json — no duplication.
 */
export interface SiteStoryImage {
  src: string;
  caption: string;
  /** Optional chapter id. If omitted, defaults to the enclosing
   *  chapter's id. */
  chapter?: string;
}

export interface SiteStoryChapter {
  id: string;
  title: string;
  subtitle?: string;
  images: SiteStoryImage[];
}

export interface SiteStory {
  site: string;
  intro: string;
  chapters: SiteStoryChapter[];
}

/**
 * Per-locale overlay shape for SiteStory. Only fields that change
 * by language need to be present — image paths, chapter ids, and
 * any shared metadata stay in the base file. Captions are the
 * usual translation target; intros + subtitles next.
 */
interface SiteStoryOverlay {
  intro?: string;
  chapters?: Array<{
    id: string;
    title?: string;
    subtitle?: string;
    images?: Array<{ src: string; caption?: string }>;
  }>;
}

function mergeStoryOverlay(base: SiteStory, overlay: SiteStoryOverlay): SiteStory {
  const overlayChaptersById = new Map((overlay.chapters ?? []).map((c) => [c.id, c]));
  const overlayImagesByChapterSrc = new Map<string, string>();
  for (const c of overlay.chapters ?? []) {
    for (const img of c.images ?? []) {
      if (img.src && img.caption) overlayImagesByChapterSrc.set(`${c.id}::${img.src}`, img.caption);
    }
  }
  return {
    site: base.site,
    intro: overlay.intro ?? base.intro,
    chapters: base.chapters.map((c) => {
      const o = overlayChaptersById.get(c.id);
      return {
        ...c,
        title: o?.title ?? c.title,
        subtitle: o?.subtitle ?? c.subtitle,
        images: c.images.map((img) => {
          const caption = overlayImagesByChapterSrc.get(`${c.id}::${img.src}`);
          return caption ? { ...img, caption } : img;
        }),
      };
    }),
  };
}

/**
 * Site-story loader with per-locale overlay merge. Order:
 *   1. Base story at site-stories/<id>.json (English-authored)
 *   2. Locale overlay at i18n/<locale>/site-stories/<id>.json
 *   3. Locale fallback to en-US overlay if non-default locale
 *      has no overlay (matches the getMarsSites / getMoonSites
 *      pattern from src/lib/data.ts §moon-sites overlays).
 *
 * Overlays only need to carry the fields that differ — usually
 * intro + chapter subtitles + per-image captions. Image paths,
 * chapter ids, and overall structure stay shared. Missing overlay
 * → render the base story (English) gracefully.
 */
export async function getSiteStory(
  siteId: string,
  locale: string = 'en-US',
): Promise<SiteStory | null> {
  const base = await get<SiteStory>(`site-stories/${siteId}.json`).catch(() => null);
  if (!base) return null;
  if (locale === 'en-US') return base;
  const overlay = await get<SiteStoryOverlay>(`i18n/${locale}/site-stories/${siteId}.json`).catch(
    () => null,
  );
  if (overlay) return mergeStoryOverlay(base, overlay);
  // Fallback to en-US overlay if it exists (no-op today since en-US
  // captions are in the base; reserved for future English editorial
  // revisions that ship as an overlay).
  return base;
}

/**
 * Generate id-variants to probe across manifests with inconsistent
 * naming conventions. fleet-galleries.json was hand-curated with
 * dash-separated names ("viking-1", "luna-16"); mission-galleries
 * and site-id conventions tend toward no-dash ("viking1", "luna16",
 * with site ids sometimes carrying a "-lander" / "-orbiter" suffix).
 * Try every reasonable form so a single canonical-id callsite hits
 * whatever the manifests happen to have.
 *
 * Examples:
 *   viking1-lander → [viking1-lander, viking1, viking-1, viking-1-lander]
 *   luna16          → [luna16, luna-16]
 *   change5         → [change5, change-5]
 */
/**
 * Hand-curated aliases for cases where a site id and its gallery's
 * curated id are semantically related but not derivable by
 * normalization. Add cautiously — only when a real gallery exists
 * under a name that wouldn't be reached by the variant generator.
 */
const GALLERY_ID_ALIASES: Record<string, string> = {
  // Luna 21's surface mission was the Lunokhod 2 rover; the gallery
  // under fleet-galleries/lunokhod-2/ is the right surface imagery
  // for the luna21 site, but neither "luna21" nor "luna-21" derives
  // from "lunokhod-2" by id-variant rules.
  luna21: 'lunokhod-2',
};

function gallerySiteIdVariants(id: string): string[] {
  const variants = new Set<string>([id]);
  const stripped = id.replace(/-(lander|orbiter|rover)$/, '');
  if (stripped !== id) variants.add(stripped);
  // Insert a dash before trailing digits. "viking1" → "viking-1".
  for (const candidate of [id, stripped]) {
    const dashed = candidate.replace(/^([a-z]+)(\d+)$/, '$1-$2');
    if (dashed !== candidate) variants.add(dashed);
  }
  // Hand-curated alias (e.g. luna21 → lunokhod-2).
  if (GALLERY_ID_ALIASES[id]) variants.add(GALLERY_ID_ALIASES[id]);
  return Array.from(variants);
}

/**
 * Mars site gallery loader. Multi-tier fallback so /mars detail panels
 * surface SOMETHING from every available image manifest before falling
 * silent. Order: per-site override → mission-gallery (by mission_id
 * AND by site id) → fleet-gallery (by mission_id AND by site id),
 * with id-normalization at every fleet probe.
 *
 * Why all the steps: the existing image inventory is split across
 * three manifests (mars-site-galleries.json, mission-galleries.json,
 * fleet-galleries.json) due to historical capture pipelines. Some
 * Mars hotspot sites (spirit, opportunity, phoenix, schiaparelli,
 * zhurong) only have images in fleet-galleries.json; others
 * (curiosity, perseverance) are in mission-galleries.json. Walking
 * all lookups gives us coverage today without an asset
 * re-organization pass. #PE-mars (2026-05-22).
 */
export async function getMarsSiteGallery(
  siteId: string,
  missionIdFallback?: string,
): Promise<string[]> {
  // 1. Per-site override (preferred — currently empty manifest).
  const own = await getCategoryGallery('mars-sites', 'mars-site-galleries.json', siteId);
  if (own.length > 0) return own;
  // 2. Mission gallery by explicit mission_id, if set.
  if (missionIdFallback) {
    const byMission = await getMissionGallery(missionIdFallback);
    if (byMission.length > 0) return byMission;
  }
  // 3. Mission gallery by site id (site_id == mission_id case).
  const bySite = await getMissionGallery(siteId);
  if (bySite.length > 0) return bySite;
  // 4 + 5. Fleet gallery by mission_id and by every id-variant of
  // the site id (covers "luna16" vs "luna-16", "viking1-lander" vs
  // "viking-1" naming-convention drift).
  if (missionIdFallback) {
    for (const v of gallerySiteIdVariants(missionIdFallback)) {
      const g = await getFleetGallery(v);
      if (g.length > 0) return g;
    }
  }
  for (const v of gallerySiteIdVariants(siteId)) {
    const g = await getFleetGallery(v);
    if (g.length > 0) return g;
  }
  return [];
}

// ──────────────────────────────────────────────────────────────────────
// Image provenance (ADR-046 Milestone C)
//
// `static/data/image-provenance.json` is generated by
// `scripts/build-image-provenance.ts` and carries TASL + license data
// for every image under `static/images/`, `static/textures/`, and
// `static/logos/`. The data layer loads the manifest once and indexes
// it by served path so panels can render exact attribution beneath
// each thumbnail / inside the lightbox without an extra round-trip.
//
// The manifest may be absent (e.g. fresh checkout where the script
// hasn't run yet) — in that case the helpers return null and the UI
// falls back to the contextual gallery footer copy from Milestone A/B.
// ──────────────────────────────────────────────────────────────────────

export type ImageProvenanceSourceType =
  | 'wikimedia-commons'
  | 'nasa-images-api'
  | 'direct-agency'
  | 'direct-other';

export interface ImageProvenanceEntry {
  id: string;
  path: string;
  source_type: ImageProvenanceSourceType;
  title: string;
  author: string | null;
  agency: string;
  source_url: string;
  image_url: string | null;
  license_short: string;
  license_url: string | null;
  license_rationale: string;
  modifications: string[];
  revid: number | null;
  pageid: number | null;
  nasa_id: string | null;
  fetched_at: string;
}

export interface ImageProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: ImageProvenanceEntry[];
}

let provenanceIndex: Map<string, ImageProvenanceEntry> | null = null;
let provenanceManifest: ImageProvenanceManifest | null = null;

export async function getImageProvenanceManifest(): Promise<ImageProvenanceManifest | null> {
  if (provenanceManifest) return provenanceManifest;
  try {
    const m = await get<ImageProvenanceManifest>('image-provenance.json');
    provenanceManifest = m;
    provenanceIndex = new Map(m.entries.map((e) => [e.path, e]));
    return m;
  } catch {
    return null;
  }
}

/**
 * Returns the provenance entry for an image referenced by served path
 * (e.g. "/images/missions/curiosity/01.jpg"). Strips the SvelteKit
 * `base` prefix so panel callers can pass the same `src` they bind to
 * <img>. Returns null when the manifest is absent or the path is not
 * recorded — caller renders the fallback gallery footer.
 */
export async function getImageProvenance(imagePath: string): Promise<ImageProvenanceEntry | null> {
  const manifest = await getImageProvenanceManifest();
  if (!manifest || !provenanceIndex) return null;
  // Normalise: strip `${base}` prefix, strip query / hash, treat
  // missing leading slash as relative.
  let p = imagePath;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  p = p.replace(/[?#].*$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return provenanceIndex.get(p) ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// Source logos + text sources (ADR-046 Milestone D)
//
// Both manifests power /credits. Source logos render the masthead
// blocks; text sources render the editorial bill of materials.
// ──────────────────────────────────────────────────────────────────────

export interface SourceLogo {
  id: string;
  name: string;
  kind:
    | 'space-agency'
    | 'private-operator'
    | 'research-institute'
    | 'media-platform'
    | 'encyclopedic'
    | 'publisher';
  url: string;
  logo_path?: string;
  license_summary: string;
}

export interface SourceLogosManifest {
  schema_version: number;
  sources: SourceLogo[];
}

export interface TextSourceLocation {
  file: string;
  json_path?: string;
  i18n_key?: string;
}

export interface TextSourceEntry {
  id: string;
  location: TextSourceLocation;
  category:
    | 'mission'
    | 'planet'
    | 'sun'
    | 'small-body'
    | 'moon-site'
    | 'earth-object'
    | 'iss-module'
    | 'rocket'
    | 'ui'
    | 'credits';
  relationship:
    | 'original'
    | 'paraphrased-from'
    | 'quoted-from'
    | 'translated-from'
    | 'adapted-from';
  snippet?: string;
  source_url?: string;
  source_publisher?: string;
  source_author?: string;
  license_short: string;
  license_url?: string;
  license_rationale: string;
  translation_status?: 'human' | 'mt-with-review' | 'mt' | 'n/a';
  translation_reviewer?: string;
}

export interface TextSourcesManifest {
  schema_version: number;
  entries: TextSourceEntry[];
}

export async function getSourceLogos(): Promise<SourceLogosManifest> {
  return get<SourceLogosManifest>('source-logos.json');
}

export async function getTextSources(): Promise<TextSourcesManifest> {
  return get<TextSourcesManifest>('text-sources.json');
}

// ─── Audio provenance (PRD-016 §transparency / RFC-019 §5.4) ─────────────
// Mirrors the image-provenance pattern. Read by /credits to surface every
// audio asset's text-author + voice-provider attribution.

import type { Persona, ProviderName, TextAuthorship } from './audio-types';

export interface AudioProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
  provider: ProviderName;
  voice_id: string;
  tts_model: string;
  route?: string;
  context?: string;
  title?: string;
  duration_target_sec?: number;
  path_mp3: string;
  path_vtt: string;
  path_txt: string;
  chars: number;
  generated_at: string;
  text_authorship: TextAuthorship;
  text_author_model?: string;
}

export interface AudioProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: AudioProvenanceEntry[];
}

let audioProvenance: AudioProvenanceManifest | null = null;

export async function getAudioProvenanceManifest(): Promise<AudioProvenanceManifest | null> {
  if (audioProvenance) return audioProvenance;
  try {
    const m = await get<AudioProvenanceManifest>('audio/audio-provenance.json');
    audioProvenance = m;
    return m;
  } catch {
    return null;
  }
}

// ─── Episode sources sidecar (PRD-016 §S10 / RFC-019 §11.4) ──────────────
// Per-episode editorial citations, joined to audio-provenance by
// episode_id. Sidecar starts empty — populated incrementally per-
// episode as primary sources are identified for Claude-drafted scripts.

export type EpisodeSourceKind =
  | 'book-primary'
  | 'book-secondary'
  | 'agency-primary'
  | 'agency-secondary'
  | 'paper-primary'
  | 'interview'
  | 'documentary'
  | 'encyclopedia'
  | 'memoir';

export interface EpisodeSource {
  label: string;
  source_id: string;
  url?: string;
  kind: EpisodeSourceKind;
  language?: string;
  last_verified?: string;
}

export interface EpisodeSourcesEntry {
  episode_id: string;
  sources: EpisodeSource[];
}

export interface EpisodeSourcesManifest {
  schema_version: number;
  episodes: EpisodeSourcesEntry[];
}

let episodeSources: EpisodeSourcesManifest | null = null;

export async function getEpisodeSourcesManifest(): Promise<EpisodeSourcesManifest> {
  if (episodeSources) return episodeSources;
  try {
    const m = await get<EpisodeSourcesManifest>('audio/episode-sources.json');
    episodeSources = m;
    return m;
  } catch {
    return { schema_version: 1, episodes: [] };
  }
}

/**
 * /science encyclopedia (PRD-008 / ADR-034 / ADR-017). Each section is
 * a base JSON record at `science/[tab]/[id].json` merged with a locale
 * overlay at `i18n/[locale]/science/[tab]/[id].json`. Falls back to
 * en-US when the requested locale's overlay is missing.
 */
export const SCIENCE_TABS: readonly ScienceTabId[] = [
  'orbits',
  'transfers',
  'propulsion',
  'mission-phases',
  'scales-time',
  'porkchop',
  'space-stations',
  'history',
  'observation',
  'life-in-space',
  // PRD-024 — planet-level body science. Pairs with PRD-023's /explore
  // lens annotations + always-on overlays. Added 2026-06-03.
  'planets',
  // v0.6.3 — curated companion lists, anchored at the bottom of the
  // rail so the encyclopedia tabs read as a coherent block above them
  // and these read as "see also" affordances. (Issues #128 + #129.)
  'reading-list',
  'watch-list',
] as const;

export async function getScienceSection(
  tab: ScienceTabId,
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceSection | null> {
  try {
    const baseRecord = await get<ScienceSectionBase>(`science/${tab}/${id}.json`, fetchFn);
    const overlay = await get<ScienceSectionOverlay>(
      `i18n/${locale}/science/${tab}/${id}.json`,
      fetchFn,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ScienceSectionOverlay>(`i18n/en-US/science/${tab}/${id}.json`, fetchFn).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/** Editorial Space-101 narrative shown on the /science landing. Falls back
 * to en-US per ADR-017; returns null only if both the locale and en-US files
 * are missing (which would indicate a broken build, not a runtime condition). */
export async function getScienceLanding(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceLanding | null> {
  const overlay = await get<ScienceLanding>(`i18n/${locale}/science/_landing.json`, fetchFn).catch(
    () => null,
  );
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ScienceLanding>(`i18n/en-US/science/_landing.json`, fetchFn).catch(() => null);
}

/** Editorial 101 intro shown at the top of /science/[tab]. Falls back to
 * en-US per ADR-017; returns null if no intro file exists. */
export async function getScienceTabIntro(
  tab: ScienceTabId,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceTabIntro | null> {
  const overlay = await get<ScienceTabIntro>(
    `i18n/${locale}/science/${tab}/_intro.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ScienceTabIntro>(`i18n/en-US/science/${tab}/_intro.json`, fetchFn).catch(() => null);
}

export async function getScienceTab(
  tab: ScienceTabId,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ScienceSection[]> {
  const index = await get<{ ids: string[] }>(`science/${tab}/_index.json`, fetchFn).catch(() => ({
    ids: [] as string[],
  }));
  const sections = await Promise.all(
    index.ids.map((id) => getScienceSection(tab, id, locale, fetchFn)),
  );
  return sections.filter((s): s is ScienceSection => s !== null).sort((a, b) => a.order - b.order);
}

/** Internal: clear the in-memory fetch cache. Test-only — not for app use. */
export function __resetCache(): void {
  cache.clear();
  provenanceManifest = null;
  provenanceIndex = null;
}
