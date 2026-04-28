/**
 * Data client — fetch + cache + locale-overlay merge per ADR-006, ADR-017.
 *
 * Files are served from /data/ at runtime (static/data/ on disk; SvelteKit
 * copies static/ to build/ root). When SvelteKit's base path is set (e.g.
 * /orrery for GitHub Pages), URLs are prefixed automatically via $app/paths.
 */

import { base } from '$app/paths';
import type { Mission, MissionIndex } from '$types/mission';
import type { PlanetsData } from '$types/planet';
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

export async function rockets(): Promise<Rocket[]> {
  return get<Rocket[]>('rockets.json');
}

export async function earthObjects(): Promise<EarthObject[]> {
  return get<EarthObject[]>('earth-objects.json');
}

export async function moonSites(): Promise<MoonSite[]> {
  return get<MoonSite[]>('moon-sites.json');
}

/** Internal: clear the in-memory fetch cache. Test-only — not for app use. */
export function __resetCache(): void {
  cache.clear();
}
