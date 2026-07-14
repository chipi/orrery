/**
 * Data client — fetch + cache + locale-overlay merge per ADR-006, ADR-017.
 *
 * Files are served from /data/ at runtime (static/data/ on disk; SvelteKit
 * copies static/ to build/ root). When SvelteKit's base path is set (e.g.
 * /orrery for GitHub Pages), URLs are prefixed automatically via $app/paths.
 */

import { base } from '$app/paths';
import { assetOrigin, localeBundleOrigin } from './asset-url';
import { loadHeroOverrides, applyHeroOverride } from '$lib/image-hero';
import type { Destination, Mission, MissionIndex } from '$types/mission';
import type { LocalizedPlanet, PlanetOverlay, PlanetsData } from '$types/planet';
import type { LocalizedSun, Sun, SunOverlay } from '$types/sun';
import type { LocalizedScenario, Scenario, ScenarioOverlay } from '$types/scenario';
import type { Rocket } from '$types/rocket';
import type { EarthObject } from '$types/earth-object';
import type { OrbitRegime } from '$types/orbit-regime';
import type { Program, ProgramBase, ProgramOverlay, ProgramIndexEntry } from '$types/program';
import type { Essay, EssayBase, EssayOverlay, EssayIndexEntry } from '$types/essay';
import type { MoonSite } from '$types/moon-site';
import type { MarsSite, Traverse, RouteHirisePatch } from '$types/mars-site';
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

// Per-locale i18n overlay bundles. The overlay system ships ~740 tiny JSON
// files per locale (~10,360 across 14 locales); fetching and precaching them
// individually is what stalls the service-worker install on mobile WebKit
// (the 0.6.3-stuck bug). They are built into one bundle per locale
// (scripts/build-i18n-bundles.mjs, served at /data/i18n/{locale}.json). We
// fetch a bundle once and index by each file path relative to the locale dir
// (e.g. "sun.json", "planets/mars.json", "science/orbits/vis-viva.json").
const i18nBundles = new Map<string, Promise<Record<string, unknown>>>();

function loadI18nBundle(locale: string, fetchFn: FetchLike): Promise<Record<string, unknown>> {
  let p = i18nBundles.get(locale);
  if (!p) {
    const url = `${localeBundleOrigin(locale)}/data/i18n/${locale}.json`;
    p = (async () => {
      const res = await fetchFn(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
      return (await res.json()) as Record<string, unknown>;
    })();
    // Drop the cached promise on failure so a missing bundle (e.g. `vite dev`
    // before a build emits it) retries and can fall back to per-file fetch.
    p.catch(() => i18nBundles.delete(locale));
    i18nBundles.set(locale, p);
  }
  return p;
}

async function get<T>(path: string, fetchFn: FetchLike = fetch): Promise<T> {
  // i18n overlays resolve from the per-locale bundle. A genuine miss (key
  // absent from a bundle that DID load) throws so callers en-US fallback
  // fires; a missing bundle (dev without a build) falls through to the
  // legacy per-file fetch below.
  const i18n = /^i18n\/([^/]+)\/(.+)$/.exec(path);
  if (i18n) {
    const [, locale, key] = i18n;
    let bundle: Record<string, unknown> | undefined;
    try {
      bundle = await loadI18nBundle(locale, fetchFn);
    } catch {
      bundle = undefined;
    }
    if (bundle) {
      if (!(key in bundle)) throw new Error(`i18n overlay not found: ${locale}/${key}`);
      return bundle[key] as T;
    }
  }

  const url = `${base}/data/${path}`;
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(url, data);
  return data;
}

export async function getMissionIndex(fetchFn: FetchLike = fetch): Promise<MissionIndex[]> {
  return get<MissionIndex[]>('missions/index.json', fetchFn);
}

export async function getMission(
  id: string,
  dest: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Mission | null> {
  const destLower = dest.toLowerCase();
  try {
    const baseRecord = await get<Mission>(`missions/${destLower}/${id}.json`, fetchFn);
    const overlay = await get<Partial<Mission>>(
      `i18n/${locale}/missions/${destLower}/${id}.json`,
      fetchFn,
    ).catch(() => ({}) as Partial<Mission>);
    const merged: Mission = { ...baseRecord, ...overlay };

    // Inject translated label / description into `flight.events[]` for
    // non-en-US locales (2026-06-22 — #358 micro-enhancement
    // "make sure they are translated in all languages"). The overlay
    // ships an editorial `events[]` array with shape `{met, label,
    // note}`; map it onto the structural `flight.events[]` by MET so
    // downstream consumers (milestone tooltip, PhaseMarkerLabel,
    // FlightDirectorBanner) get translated copy without their own
    // overlay-merge code. en-US is skipped to preserve the rich
    // base descriptions (the overlay is intentionally terser/curated
    // for the CAPCOM ticker; the tooltip wants the full prose).
    if (
      locale !== 'en-US' &&
      Array.isArray(overlay.events) &&
      Array.isArray(baseRecord.flight?.events)
    ) {
      const TOL = 0.05; // days
      const overlayEvents = overlay.events as Array<{
        met?: number;
        label?: string;
        note?: string;
      }>;
      const mergedEvents = baseRecord.flight.events.map((evt) => {
        if (evt.met_days == null) return evt;
        let ov = overlayEvents.find((o) => o.met === evt.met_days);
        if (!ov) ov = overlayEvents.find((o) => Math.abs((o.met ?? -1) - evt.met_days!) <= TOL);
        if (!ov) return evt;
        return {
          ...evt,
          label: ov.label ?? evt.label,
          description: ov.note ?? evt.description,
        };
      });
      merged.flight = { ...baseRecord.flight, events: mergedEvents };
    }
    return merged;
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

/**
 * Orbit-regime reference data for the orbit-ruler + regime panel
 * pattern (#354 /earth, #355 /moon, #356 /mars). Base JSON carries the
 * immutable numeric fields (altitude_km, color); per-locale overlays
 * under `i18n/<locale>/<bundle>/` add the story / residents / firsts /
 * science-cross-link.
 *
 * `bundle` is the on-disk slug for both the base file and the overlay
 * directory:
 *   - 'orbit-regimes'      → /earth (file: orbit-regimes.json)
 *   - 'orbit-regimes-moon' → /moon  (file: orbit-regimes-moon.json)
 *   - 'orbit-regimes-mars' → /mars  (file: orbit-regimes-mars.json)
 */
async function loadOrbitRegimes(bundle: string, locale: string): Promise<OrbitRegime[]> {
  const base = await get<OrbitRegime[]>(`${bundle}.json`);
  const merged: OrbitRegime[] = [];
  for (const r of base) {
    const overlay = await get<Partial<OrbitRegime>>(`i18n/${locale}/${bundle}/${r.id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<OrbitRegime>>(`i18n/en-US/${bundle}/${r.id}.json`).catch(() => null));
    merged.push(fallback ? { ...r, ...fallback } : r);
  }
  return merged;
}

export async function getOrbitRegimes(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes', locale);
}

export async function getOrbitRegimesMoon(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-moon', locale);
}

export async function getOrbitRegimesMars(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-mars', locale);
}

/** Heliocentric zones for /explore's scale ruler (#357). Same overlay
 *  shape as the surface-route regimes; the data file uses `distance_au`
 *  instead of `altitude_km` since /explore zones are heliocentric. */
export async function getOrbitRegimesExplore(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-explore', locale);
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
  // Along-route HiRISE patches (#360) — optional sidecar manifest. Absent
  // for rovers not yet sampled; the traverse still renders without it.
  const rp = await get<{ patches: RouteHirisePatch[] }>(
    `mars-traverses/${roverId}.route-patches.json`,
  ).catch(() => null);
  if (rp?.patches?.length) t.route_patches = rp.patches;
  return t;
}

/** Moon rover traverse polylines (#361 follow-on) — Lunokhod 1/2, Yutu,
 *  Yutu-2, Pragyan. Same shape + along-route patch sidecar as Mars. */
export async function getMoonTraverse(roverId: string): Promise<Traverse | null> {
  const t = await get<Traverse>(`moon-traverses/${roverId}.json`).catch(() => null);
  if (!t) return null;
  const rp = await get<{ patches: RouteHirisePatch[] }>(
    `moon-traverses/${roverId}.route-patches.json`,
  ).catch(() => null);
  if (rp?.patches?.length) t.route_patches = rp.patches;
  return t;
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
 * Base station-part records (id + launch_date etc., no locale overlays).
 *
 * The station assembly replay only needs each part's `id` and `launch_date`
 * to drive fly-in timing — never the localised prose. These skip the overlay
 * merge that `getIssModules` / `getTiangongModules` do, so the AR tabletop
 * assembly (#408) can resolve launch epochs without loading 30+ overlay files.
 */
export function getIssModulesBase(fetchFn: FetchLike = fetch): Promise<IssModuleBase[]> {
  return get<IssModuleBase[]>('iss-modules.json', fetchFn);
}
export function getIssVisitorsBase(fetchFn: FetchLike = fetch): Promise<IssModuleBase[]> {
  return get<IssModuleBase[]>('iss-visitors.json', fetchFn);
}
export function getTiangongModulesBase(fetchFn: FetchLike = fetch): Promise<TiangongModuleBase[]> {
  return get<TiangongModuleBase[]>('tiangong-modules.json', fetchFn);
}
export function getTiangongVisitorsBase(fetchFn: FetchLike = fetch): Promise<TiangongModuleBase[]> {
  return get<TiangongModuleBase[]>('tiangong-visitors.json', fetchFn);
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
    const gallery = Array.from(
      { length: count },
      (_, i) =>
        `${assetOrigin}/images/fleet-galleries/${id}/${String(i + 1).padStart(2, '0')}.webp`,
    );
    // Honour the fleet hero-override JSON so the panel hero (gallery[0])
    // matches the card cover served via pickHero('fleet', id). Without
    // this the audit-blessed slot reaches /fleet cards but the detail
    // panel still surfaces the unblessed slot 01.
    await loadHeroOverrides('fleet');
    return applyHeroOverride('fleet', id, gallery);
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
    const gallery = Array.from(
      { length: count },
      (_, i) =>
        `${assetOrigin}/images/missions/${missionId}/${String(i + 1).padStart(2, '0')}.webp`,
    );
    // Honour the mission hero-override JSON so the panel hero (gallery[0])
    // matches the card cover served via pickHero('missions', id). Without
    // this the audit-blessed slot reaches /missions cards but the detail
    // panel still surfaces the unblessed slot 01 (perseverance is the
    // canonical example — 01.jpg is a mis-sourced Curiosity photo).
    await loadHeroOverrides('missions');
    return applyHeroOverride('missions', missionId, gallery);
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
      (_, i) => `${assetOrigin}/images/${category}/${id}/${String(i + 1).padStart(2, '0')}.webp`,
    );
  } catch {
    return [];
  }
}

export async function getPlanetGallery(planetId: string): Promise<string[]> {
  const gallery = await getCategoryGallery('planets', 'planet-galleries.json', planetId);
  if (gallery.length === 0) return gallery;
  // Honour the planets hero-override JSON so the panel hero (gallery[0])
  // matches the card cover served via pickHero('planets', id). Mirrors
  // the fleet / missions pattern.
  const { loadHeroOverrides, applyHeroOverride } = await import('$lib/image-hero');
  await loadHeroOverrides('planets');
  return applyHeroOverride('planets', planetId, gallery);
}

export async function getSunGallery(): Promise<string[]> {
  // Sun is a single entity — use a flat count manifest.
  try {
    const data = await get<{ count: number }>('sun-gallery.json');
    const count = data.count ?? 0;
    if (count === 0) return [];
    return Array.from(
      { length: count },
      (_, i) => `${assetOrigin}/images/sun/${String(i + 1).padStart(2, '0')}.webp`,
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
  // Final step: respect the moon-sites hero override JSON (#5 Phase 5+)
  // so the audit-blessed slot becomes the gallery hero.
  const { loadHeroOverrides, applyHeroOverride } = await import('$lib/image-hero');
  await loadHeroOverrides('moon-sites');
  const reorder = (g: string[]) => applyHeroOverride('moon-sites', siteId, g);
  const own = await getCategoryGallery('moon-sites', 'moon-site-galleries.json', siteId);
  if (own.length > 0) return reorder(own);
  if (missionIdFallback) {
    const byMission = await getMissionGallery(missionIdFallback);
    if (byMission.length > 0) return reorder(byMission);
  }
  const bySite = await getMissionGallery(siteId);
  if (bySite.length > 0) return reorder(bySite);
  if (missionIdFallback) {
    for (const v of gallerySiteIdVariants(missionIdFallback)) {
      const g = await getFleetGallery(v);
      if (g.length > 0) return reorder(g);
    }
  }
  for (const v of gallerySiteIdVariants(siteId)) {
    const g = await getFleetGallery(v);
    if (g.length > 0) return reorder(g);
  }
  return [];
}

/**
 * /explore small-body panel (dwarfs, comets, interstellar). Manifest
 * `small-body-galleries.json` + `static/images/small-bodies/{id}/`
 * from `npm run fetch-assets`.
 */
export async function getSmallBodyGallery(bodyId: string): Promise<string[]> {
  const gallery = await getCategoryGallery('small-bodies', 'small-body-galleries.json', bodyId);
  if (gallery.length === 0) return gallery;
  // Honour the small-bodies hero-override JSON — mirrors the planets/fleet pattern.
  const { loadHeroOverrides, applyHeroOverride } = await import('$lib/image-hero');
  await loadHeroOverrides('small-bodies');
  return applyHeroOverride('small-bodies', bodyId, gallery);
}

/**
 * Per-locale small-body overlay (introduced 2026-06-21 for science_sections
 * but designed for future translations of description / note / library
 * labels too). Mirrors SatelliteI18n: optional fields override the base
 * small-bodies.json entry when present.
 *
 * Files at `static/data/i18n/<locale>/small-bodies/<id>.json`.
 */
export type SmallBodyI18n = {
  name?: string;
  description?: string;
  note?: string;
  mission_visits?: string[];
  library_labels?: Record<string, string>;
  science_sections?: import('$types/planet').ScienceSectionRef[];
};

export async function getSmallBodyI18n(
  locale: string,
  bodyId: string,
): Promise<SmallBodyI18n | null> {
  try {
    return await get<SmallBodyI18n>(`i18n/${locale}/small-bodies/${bodyId}.json`);
  } catch {
    return null;
  }
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
  /** Per-body curated science-card selection — merged from
   *  SatelliteI18n.science_sections in mergeOverlay. Optional;
   *  empty/absent means SatellitePanel renders no science cards
   *  (no panel-wide default for satellites — selection is per-moon). */
  science_sections?: import('$types/planet').ScienceSectionRef[];
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
  const gallery = await getCategoryGallery('satellites', 'satellite-galleries.json', satelliteId);
  if (gallery.length === 0) return gallery;
  // Honour the satellites hero-override JSON — mirrors the planets/fleet pattern.
  const { loadHeroOverrides, applyHeroOverride } = await import('$lib/image-hero');
  await loadHeroOverrides('satellites');
  return applyHeroOverride('satellites', satelliteId, gallery);
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
  /** Per-body curated science-card selection. Same shape as
   *  PlanetOverlay.science_sections — pointers into /science/<tab>/
   *  <section> with an optional `why` prefix per entry. Falls back
   *  to SatellitePanel's default list when absent. */
  science_sections?: import('$types/planet').ScienceSectionRef[];
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
  /** Per-belt curated science-card selection — merged from
   *  BeltI18n.science_sections in BeltPanel.mergeOverlay. Renders
   *  in the SCIENCE section at the bottom of OVERVIEW (belts have
   *  no TECHNICAL tab). */
  science_sections?: import('$types/planet').ScienceSectionRef[];
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
/** Kept as a re-export for any callers that still import the type
 *  (e.g. older overlay code); the field is no longer used now that
 *  the belt manifest is a flat {id: count} map matching other
 *  *-galleries.json shapes and captions are gone. */
export type BeltGallerySlot = { src: string; caption: string };

/** Belt gallery (asteroid + kuiper). Reads belt-galleries.json which
 *  was reshaped 2026-06-21 from { galleries: { asteroid: [{src,caption}] } }
 *  to a flat { asteroid: N, kuiper: N } count map matching the other
 *  gallery manifests. Images live under static/images/belts/<beltId>/ */
export async function getBeltGallery(beltId: string): Promise<string[]> {
  return getCategoryGallery('belts', 'belt-galleries.json', beltId);
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
  /** Per-belt curated science-card selection. Same pattern as
   *  PlanetOverlay.science_sections — pointers into /science/<tab>/
   *  <section> with an optional `why` prefix per entry. */
  science_sections?: import('$types/planet').ScienceSectionRef[];
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
 *
 * Hard-membership gate via site-stories/index.json (2026-06-15 user
 * note: console showed `[404] GET /data/site-stories/<id>.json` for
 * every launch site without an editorial story — wenchang-lc-101,
 * xichang-lc-2, taiyuan-lc-9, jiuquan-slc-43, etc.). The loader was
 * already null-tolerant (catch → null), so behaviour was correct;
 * the 404s were just dev-server console noise from the speculative
 * fetch. Now we probe a tiny build-time manifest of available IDs
 * first and skip the request entirely when the ID isn't present.
 */
async function getSiteStoryIndex(): Promise<Set<string>> {
  const idx = await get<{ ids: string[] }>('site-stories/index.json').catch(() => null);
  return new Set(idx?.ids ?? []);
}

export async function getSiteStory(
  siteId: string,
  locale: string = 'en-US',
): Promise<SiteStory | null> {
  const available = await getSiteStoryIndex();
  if (!available.has(siteId)) return null;
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
  // Mars hero overrides (#5 Phase 5+) — reorder so the audit-blessed
  // slot becomes first whenever a non-empty gallery is found.
  const { loadHeroOverrides, applyHeroOverride } = await import('$lib/image-hero');
  await loadHeroOverrides('mars-sites');
  const reorder = (g: string[]) => applyHeroOverride('mars-sites', siteId, g);
  // 1. Per-site override (preferred — currently empty manifest).
  const own = await getCategoryGallery('mars-sites', 'mars-site-galleries.json', siteId);
  if (own.length > 0) return reorder(own);
  // 2. Mission gallery by explicit mission_id, if set.
  if (missionIdFallback) {
    const byMission = await getMissionGallery(missionIdFallback);
    if (byMission.length > 0) return reorder(byMission);
  }
  // 3. Mission gallery by site id (site_id == mission_id case).
  const bySite = await getMissionGallery(siteId);
  if (bySite.length > 0) return reorder(bySite);
  // 4 + 5. Fleet gallery by mission_id and by every id-variant of
  // the site id (covers "luna16" vs "luna-16", "viking1-lander" vs
  // "viking-1" naming-convention drift).
  if (missionIdFallback) {
    for (const v of gallerySiteIdVariants(missionIdFallback)) {
      const g = await getFleetGallery(v);
      if (g.length > 0) return reorder(g);
    }
  }
  for (const v of gallerySiteIdVariants(siteId)) {
    const g = await getFleetGallery(v);
    if (g.length > 0) return reorder(g);
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
  'wikimedia-commons' | 'nasa-images-api' | 'direct-agency' | 'direct-other' | 'derived-mosaic';

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
  /**
   * Capturing spacecraft + instrument for orbital surface imagery (#360 /
   * credits). HiRISE + CTX both ride on Mars Reconnaissance Orbiter, LROC on
   * Lunar Reconnaissance Orbiter, etc. Lets /credits link the image back to
   * the actual satellite that took it. Optional — absent for ground/archival
   * imagery. `spacecraft_id` resolves to a /mars or /moon surface-orbiter id.
   */
  spacecraft_id?: string;
  spacecraft_name?: string;
  instrument?: string;
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
 * (e.g. "/images/missions/curiosity/01.webp"). Strips the SvelteKit
 * `base` prefix so panel callers can pass the same `src` they bind to
 * <img>. Returns null when the manifest is absent or the path is not
 * recorded — caller renders the fallback gallery footer.
 */
/**
 * Normalise an image URL to its provenance-index key. Strips the stream origin
 * (mobile `assetOrigin` is the full CDN URL, e.g.
 * `https://chipi.github.io/orrery/images/...`), then the `${base}` prefix, then
 * query/hash, and treats a missing leading slash as relative — so a served
 * `<img src>` resolves to the same key on web and mobile (RFC-030). Pure +
 * unit-tested; `basePath` is injectable for tests.
 */
export function normalizeImageKey(imagePath: string, basePath: string = base): string {
  let p = imagePath;
  p = p.replace(/^https?:\/\/[^/]+/, '');
  if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length);
  p = p.replace(/[?#].*$/, '');
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

export async function getImageProvenance(imagePath: string): Promise<ImageProvenanceEntry | null> {
  const manifest = await getImageProvenanceManifest();
  if (!manifest || !provenanceIndex) return null;
  return provenanceIndex.get(normalizeImageKey(imagePath)) ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// External audio-source provenance (#385) — third-party recordings under
// static/audio/atmosphere/ (the "atmosphere's voice" tiles). Parallel to
// image-provenance; distinct from the first-party TTS audio-provenance.
// ──────────────────────────────────────────────────────────────────────
export interface AudioSourceProvenanceEntry {
  id: string;
  path: string;
  body: 'moon' | 'mars' | 'earth';
  source_type: 'wikimedia-commons' | 'nasa-images-api' | 'direct-agency' | 'direct-other';
  title: string;
  author: string | null;
  agency: string;
  instrument: string | null;
  date_recorded: string | null;
  source_url: string;
  download_url: string | null;
  license_short: string;
  license_url: string | null;
  license_rationale: string;
  modifications: string[];
  duration_sec?: number;
  sha256: string;
  fetched_at: string;
}

export interface AudioSourceProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version?: string;
  commit_sha?: string | null;
  entries: AudioSourceProvenanceEntry[];
}

let audioSourceProvenanceManifest: AudioSourceProvenanceManifest | null = null;

export async function getAudioSourceProvenanceManifest(): Promise<AudioSourceProvenanceManifest | null> {
  if (audioSourceProvenanceManifest) return audioSourceProvenanceManifest;
  try {
    const m = await get<AudioSourceProvenanceManifest>('audio-source-provenance.json');
    audioSourceProvenanceManifest = m;
    return m;
  } catch {
    return null;
  }
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
    'original' | 'paraphrased-from' | 'quoted-from' | 'translated-from' | 'adapted-from';
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

// ─── Data & catalogues (PRD-030 / RFC-032 — public /credits data section) ──
// Curated provenance for the structured public datasets Orrery ingests (star
// catalogues, launch catalogues, …). Distinct from image-provenance (per-asset)
// and text-sources (editorial fragments).
export interface DataSourceEntry {
  id: string;
  name: string;
  catalog: string;
  version?: string;
  category: string;
  description: string;
  source_url: string;
  license_short: string;
  license_url: string;
  license_rationale: string;
  used_on: string[];
}

export interface DataSourcesManifest {
  schema_version: number;
  entries: DataSourceEntry[];
}

export async function getDataSources(): Promise<DataSourcesManifest> {
  return get<DataSourcesManifest>('data-sources.json');
}

// ─── Named stars (PRD-030 / RFC-032 — /explore v2 Slice 1) ─────────────────
// The curated ~60 stars that get a marker + label + Panel in the stellar
// neighborhood. Base record from HYG; per-locale editorial overlay (description,
// facts, library) merged via getNamedStarI18n.
export interface NamedStar {
  id: string;
  hip: number | null;
  proper: string;
  con: string | null;
  spect: string | null;
  dist_pc: number;
  mag: number;
  absmag: number;
  bv: number | null;
  x: number;
  y: number;
  z: number;
}

export interface NamedStarOverlay {
  /** Localized proper name (falls back to the base `proper`). */
  name?: string;
  /** One-line overview. */
  fact?: string;
  /** Longer editorial paragraph. */
  bio?: string;
  /** Cultural / navigational significance across traditions. */
  cultural?: string;
  /** Curated learn-more links (same shape as planets): { l: label, u: url, t: tier }. */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
  /** Optional curated real image (served WebP under /images/stars/); provenance
   *  lives in image-provenance.json keyed on the path. `kind` labels it honestly. */
  photo?: { src: string; kind: 'real' | 'artist' };
}

export type LocalizedNamedStar = NamedStar & NamedStarOverlay;

interface NamedStarsManifest {
  schema_version: number;
  count: number;
  stars: NamedStar[];
}

export async function getNamedStars(fetchFn: FetchLike = fetch): Promise<NamedStar[]> {
  const doc = await get<NamedStarsManifest>('universe/named-stars.json', fetchFn).catch(() => null);
  return doc?.stars ?? [];
}

export interface ConstellationLineEntry {
  con: string;
  vertices: number[];
}
let constellationLinesCache: Promise<ConstellationLineEntry[]> | null = null;
/** Constellation line segments (baked 3D positions), cached. */
export async function getConstellationLines(
  fetchFn: FetchLike = fetch,
): Promise<ConstellationLineEntry[]> {
  if (!constellationLinesCache) {
    constellationLinesCache = get<{ constellations: ConstellationLineEntry[] }>(
      'universe/constellation-lines.json',
      fetchFn,
    )
      .then((doc) => doc.constellations ?? [])
      .catch(() => []);
  }
  return constellationLinesCache;
}

export async function getNamedStarI18n(
  locale: string,
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<NamedStarOverlay | null> {
  const overlay = await get<NamedStarOverlay>(
    `i18n/${locale}/universe/named-stars/${id}.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<NamedStarOverlay>(`i18n/en-US/universe/named-stars/${id}.json`, fetchFn).catch(
    () => null,
  );
}

// ─── Exoplanet systems (PRD-030 / RFC-032 — /explore v2 Slice 2) ───────────
// Host stars with known planets, on real Keplerian elements (NASA Exoplanet
// Archive). Drives the BodyScene mini-orreries. Hosts already in the named-star
// catalog reuse their HYG xyz; iconic hosts are placed from ra/dec/distance.
export interface ExoplanetPlanet {
  id: string;
  letter: string;
  name: string;
  period_days: number;
  a_au: number;
  e: number;
  radius_earth: number | null;
  mass_earth: number | null;
  disc_year: number | null;
  disc_method: string | null;
}
export interface ExoplanetSystem {
  hostId: string;
  hip: number | null;
  star: {
    name: string;
    spect: string;
    dist_pc: number;
    bv: number | null;
    con: string | null;
    x: number;
    y: number;
    z: number;
    iconic: boolean;
  };
  planets: ExoplanetPlanet[];
}
interface ExoplanetSystemsManifest {
  schema_version: number;
  count: number;
  planet_count: number;
  systems: ExoplanetSystem[];
}

let exoplanetSystemsCache: Promise<ExoplanetSystem[]> | null = null;
/** All exoplanet host systems (cached). */
export async function getExoplanetSystems(fetchFn: FetchLike = fetch): Promise<ExoplanetSystem[]> {
  if (!exoplanetSystemsCache) {
    exoplanetSystemsCache = get<ExoplanetSystemsManifest>(
      'universe/exoplanet-systems.json',
      fetchFn,
    )
      .then((doc) => doc.systems ?? [])
      .catch(() => []);
  }
  return exoplanetSystemsCache;
}
/** The exoplanet system for a given host id, or null. */
export async function getExoplanetSystem(
  hostId: string,
  fetchFn: FetchLike = fetch,
): Promise<ExoplanetSystem | null> {
  const systems = await getExoplanetSystems(fetchFn);
  return systems.find((s) => s.hostId === hostId) ?? null;
}

// Per-planet editorial overlay (Slice 2) — a "why this world matters" note that
// leans into the planet's science + its sci-fi / news / cultural fame. Keyed by
// planet id under i18n-src/<locale>/universe/exoplanets/<id>.json.
export interface ExoplanetOverlay {
  /** One-line hook. */
  fact?: string;
  /** Longer editorial paragraph (science + cultural/sci-fi/news significance). */
  bio?: string;
  /** Curated learn-more links: { l: label, u: url, t: tier }. */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
}

export async function getExoplanetI18n(
  locale: string,
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<ExoplanetOverlay | null> {
  const overlay = await get<ExoplanetOverlay>(
    `i18n/${locale}/universe/exoplanets/${id}.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ExoplanetOverlay>(`i18n/en-US/universe/exoplanets/${id}.json`, fetchFn).catch(
    () => null,
  );
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
  // 2026-06-06 reorder — read the encyclopedia like a book.
  // Setup → bodies → motion → engineering → presence → looking → history.
  // Planets used to sit at #11 (just before reading-list) which inverted
  // the natural "what is the solar system → how does it move → how do we
  // travel through it" reading flow; promoted to #2 so the reader meets
  // the subject before learning the mechanics.
  'scales-time', // 1. Units, frames, dimensions of the solar system
  'planets', // 2. The bodies in it (PRD-024)
  'orbits', // 3. How those bodies move (Kepler, e, i)
  'transfers', // 4. How to move between them (Hohmann, Lambert, ∆v)
  'porkchop', // 5. When to launch — transfer + time tradeoff
  'propulsion', // 6. What engines move you
  'mission-phases', // 7. The operational arc (launch → TLI → cruise → EDL)
  'space-stations', // 8. Sustained presence at LEO
  'life-in-space', // 9. Human physiology in microgravity
  'observation', // 10. Looking outward (telescopes, optical / radio / IR)
  'history', // 11. What's been done, when, by whom
  // v0.6.3 — curated companion lists, anchored at the bottom of the rail
  // so the encyclopedia tabs read as a coherent block above them and
  // these read as "see also" affordances. (Issues #128 + #129.)
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

/** Program (PRD-029) — base record + editorial overlay, merged like a science
 * section. Overlay falls back to en-US per ADR-017. */
export async function getProgram(
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Program | null> {
  try {
    const baseRecord = await get<ProgramBase>(`programs/${id}.json`, fetchFn);
    const overlay = await get<ProgramOverlay>(`i18n/${locale}/programs/${id}.json`, fetchFn).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ProgramOverlay>(`i18n/en-US/programs/${id}.json`, fetchFn).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getProgramIndex(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<ProgramIndexEntry[]> {
  const base = await get<ProgramIndexEntry[]>('programs/index.json', fetchFn);
  if (locale === 'en-US') return base;
  // Card name + tagline come from the per-locale program overlays (same
  // source the detail pages use), so the index localizes fully.
  return Promise.all(
    base.map(async (entry) => {
      const overlay = await get<{ name?: string; tagline?: string }>(
        `i18n/${locale}/programs/${entry.id}.json`,
        fetchFn,
      ).catch(() => null);
      if (!overlay) return entry;
      return {
        ...entry,
        name: overlay.name ?? entry.name,
        tagline: overlay.tagline ?? entry.tagline,
      };
    }),
  );
}

// ─── The Long View (essays) ──────────────────────────────────────────────
// Same base+overlay pattern as programs: base record carries structure +
// metadata; the per-locale overlay carries the prose (title, dek, body).

export async function getEssay(
  slug: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<Essay | null> {
  try {
    const baseRecord = await get<EssayBase>(`essays/${slug}.json`, fetchFn);
    const overlay = await get<EssayOverlay>(`i18n/${locale}/essays/${slug}.json`, fetchFn).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<EssayOverlay>(`i18n/en-US/essays/${slug}.json`, fetchFn).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getEssayIndex(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<EssayIndexEntry[]> {
  const base = await get<EssayIndexEntry[]>('essays/index.json', fetchFn);
  return Promise.all(
    base.map(async (entry) => {
      const overlay =
        (await get<{ title?: string; dek?: string }>(
          `i18n/${locale}/essays/${entry.slug}.json`,
          fetchFn,
        ).catch(() => null)) ??
        (locale === 'en-US'
          ? null
          : await get<{ title?: string; dek?: string }>(
              `i18n/en-US/essays/${entry.slug}.json`,
              fetchFn,
            ).catch(() => null));
      return overlay ? { ...entry, title: overlay.title, dek: overlay.dek } : entry;
    }),
  );
}

/**
 * Insignia/patch map (PRD-029) — `{ "mission:apollo11": "/images/badges/...webp" }`.
 * Keyed `${kind}:${id}` for kind ∈ {program, mission, fleet}. Browse grids gate
 * their badge <img> on this so a page with 250 fleet cards fires zero 404s for
 * the ones we haven't sourced a badge for yet. Built by scripts/fetch-badges.ts.
 */
export async function getBadges(fetchFn: FetchLike = fetch): Promise<Record<string, string>> {
  try {
    return await get<Record<string, string>>('badges.json', fetchFn);
  } catch {
    return {};
  }
}

/** Provenance rows for the sourced insignia (one per served badge webp).
 * Consumed by the /patches gallery for per-badge credit + licence. */
export interface BadgeProvenance {
  path: string;
  source_type: string;
  title: string;
  author: string;
  agency: string;
  source_url: string;
  image_url: string;
  license_short: string;
  license_url: string | null;
  artifact?: string;
}
export async function getBadgeProvenance(fetchFn: FetchLike = fetch): Promise<BadgeProvenance[]> {
  try {
    return await get<BadgeProvenance[]>('badge-provenance.json', fetchFn);
  } catch {
    return [];
  }
}

/** The public sourcing-debt ledger — content we could not source under the
 * licensing bar. Rendered on /sourcing; appended by hand as new walls appear. */
export interface SourcingGap {
  id: string;
  area: string;
  subjects: string[];
  want: string;
  wall: string;
  checked: string[];
  rejected?: string[];
  resolution: string;
  status: 'wall' | 'partial' | 'resolved';
  date: string;
}
export interface SourcingGaps {
  schema_version: number;
  note: string;
  gaps: SourcingGap[];
}
export async function getSourcingGaps(
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<SourcingGaps | null> {
  const overlay = await get<SourcingGaps>(`i18n/${locale}/sourcing/gaps.json`, fetchFn).catch(
    () => null,
  );
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<SourcingGaps>('i18n/en-US/sourcing/gaps.json', fetchFn).catch(() => null);
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
  i18nBundles.clear();
  provenanceManifest = null;
  provenanceIndex = null;
}
