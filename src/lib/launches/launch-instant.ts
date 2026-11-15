/**
 * The real launch instant and pad of a mission, for the launch's lighting (G3): the Sun at
 * the pad at the actual launch time. Reads the launches dataset (launches-historic/<decade>)
 * for the mission's time of day and the fleet launch-site entry for the pad's coordinates.
 * Null when there is no time of day (a Plan flight, a date-only mission): the light is then
 * seeded.
 */

import { findLaunchEntry, type LaunchEntryLike, type LaunchInstant } from '$lib/orbital/launch-sun';

const DECADES: [number, number, string][] = [
  [1957, 1969, '1957-1969'],
  [1970, 1979, '1970-1979'],
  [1980, 1989, '1980-1989'],
  [1990, 1999, '1990-1999'],
  [2000, 2009, '2000-2009'],
  [2010, 2019, '2010-2019'],
  [2020, 2026, '2020-2026'],
];

export interface LaunchInstantQuery {
  missionId?: string;
  /** The mission's `departure_date` (YYYY-MM-DD). */
  departureDate?: string;
  launcherId?: string;
  /** A launch-site fleet ref of the mission, when it has one. */
  launchSiteRef?: string;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string): Promise<T | null> {
  try {
    const res = await fetchFn(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function padCoords(
  fetchFn: typeof fetch,
  base: string,
  siteRef: string | null | undefined,
): Promise<{ lat: number; lon: number } | null> {
  if (!siteRef) return null;
  const j = await fetchJson<{ lat?: number; lon?: number }>(
    fetchFn,
    `${base}/data/fleet/launch-site/${siteRef}.json`,
  );
  return j && typeof j.lat === 'number' && typeof j.lon === 'number'
    ? { lat: j.lat, lon: j.lon }
    : null;
}

/**
 * The launch instant, or null. The pad is, in order: the mission's own launch-site fleet ref,
 * the launches entry's launch-site ref, else `profileSite` (the launch profile's site).
 */
export async function resolveLaunchInstant(
  q: LaunchInstantQuery,
  profileSite: { lat: number; lon: number } | undefined,
  fetchFn: typeof fetch = fetch,
  base = '',
): Promise<LaunchInstant | null> {
  if (!q.missionId || q.missionId.startsWith('plan-')) return null;
  const year = q.departureDate ? Number(q.departureDate.slice(0, 4)) : NaN;
  const files = Number.isFinite(year)
    ? DECADES.filter(([a, b]) => year >= a && year <= b)
    : DECADES;
  for (const [, , name] of files) {
    const j = await fetchJson<{ entries?: Record<string, LaunchEntryLike> }>(
      fetchFn,
      `${base}/data/launches-historic/${name}.json`,
    );
    if (!j?.entries) continue;
    const e = findLaunchEntry(Object.values(j.entries), q);
    if (!e) continue;
    const utcMs = Date.parse(e.net ?? '');
    if (!Number.isFinite(utcMs)) return null;
    const pad =
      (await padCoords(fetchFn, base, q.launchSiteRef)) ??
      (await padCoords(fetchFn, base, e.orrery_launch_site_ref)) ??
      profileSite;
    return pad ? { utcMs, latDeg: pad.lat, lonDeg: pad.lon } : null;
  }
  return null;
}
