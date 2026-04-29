/**
 * Data client — fetch + cache + locale-overlay merge per ADR-006, ADR-017.
 *
 * Files are served from /data/ at runtime (static/data/ on disk; SvelteKit
 * copies static/ to build/ root). When SvelteKit's base path is set (e.g.
 * /orrery for GitHub Pages), URLs are prefixed automatically via $app/paths.
 */

import { base } from '$app/paths';
import type { Mission, MissionIndex } from '$types/mission';
import type { LocalizedPlanet, PlanetOverlay, PlanetsData } from '$types/planet';
import type { LocalizedSun, Sun, SunOverlay } from '$types/sun';
import type { Rocket } from '$types/rocket';
import type { EarthObject } from '$types/earth-object';
import type { MoonSite } from '$types/moon-site';

const cache = new Map<string, unknown>();

async function get<T>(path: string): Promise<T> {
  const url = `${base}/data/${path}`;
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url);
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
  dest?: 'MARS' | 'MOON';
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

export async function earthObjects(): Promise<EarthObject[]> {
  return get<EarthObject[]>('earth-objects.json');
}

export async function moonSites(): Promise<MoonSite[]> {
  return get<MoonSite[]>('moon-sites.json');
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

/** Internal: clear the in-memory fetch cache. Test-only — not for app use. */
export function __resetCache(): void {
  cache.clear();
}
