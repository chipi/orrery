/**
 * The real launch instant and pad of a mission (G3): the launch's lighting takes the Sun at the
 * pad at the actual launch time, and the launch dossier names that pad. Reads the launches
 * dataset (launches-historic/<decade>) for the mission's entry (time of day, launch-site ref)
 * and the fleet launch-site entry for the pad's name and coordinates.
 *
 * Pad priority, for the sun and for the displayed name alike: the mission's own launch-site
 * fleet ref, else the launches entry's launch-site ref, else the launch profile's site. Time:
 * null when there is no time of day (a Plan flight, a date-only mission): the light is seeded.
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

export interface LaunchPad {
  /** The displayed site name (the fleet launch-site entry's, else the profile's). */
  name?: string;
  lat: number;
  lon: number;
}

export interface LaunchContext {
  instant: LaunchInstant | null;
  pad: LaunchPad | null;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string): Promise<T | null> {
  try {
    const res = await fetchFn(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

async function fleetPad(
  fetchFn: typeof fetch,
  base: string,
  siteRef: string | null | undefined,
): Promise<LaunchPad | null> {
  if (!siteRef) return null;
  const j = await fetchJson<{ name?: string; lat?: number; lon?: number }>(
    fetchFn,
    `${base}/data/fleet/launch-site/${siteRef}.json`,
  );
  return j && typeof j.lat === 'number' && typeof j.lon === 'number'
    ? { name: j.name, lat: j.lat, lon: j.lon }
    : null;
}

/**
 * The pad and the launch instant of a mission. `profileSite` (the launch profile's site) is the
 * last resort for the pad and the only pad of a Plan flight.
 */
export async function resolveLaunchContext(
  q: LaunchInstantQuery,
  profileSite: { lat: number; lon: number; name?: string } | undefined,
  fetchFn: typeof fetch = fetch,
  base = '',
): Promise<LaunchContext> {
  const fallback: LaunchPad | null = profileSite ? { ...profileSite } : null;
  if (!q.missionId || q.missionId.startsWith('plan-')) return { instant: null, pad: fallback };

  const year = q.departureDate ? Number(q.departureDate.slice(0, 4)) : NaN;
  const files = Number.isFinite(year)
    ? DECADES.filter(([a, b]) => year >= a && year <= b)
    : DECADES;
  let entry: LaunchEntryLike | null = null;
  for (const [, , name] of files) {
    const j = await fetchJson<{ entries?: Record<string, LaunchEntryLike> }>(
      fetchFn,
      `${base}/data/launches-historic/${name}.json`,
    );
    if (!j?.entries) continue;
    entry = findLaunchEntry(Object.values(j.entries), q, true);
    if (entry) break;
  }
  const pad =
    (await fleetPad(fetchFn, base, q.launchSiteRef)) ??
    (await fleetPad(fetchFn, base, entry?.orrery_launch_site_ref)) ??
    fallback;
  const hasTime = entry && (entry.net_precision === 'minute' || entry.net_precision === 'second');
  const utcMs = hasTime ? Date.parse(entry?.net ?? '') : NaN;
  return {
    instant: pad && Number.isFinite(utcMs) ? { utcMs, latDeg: pad.lat, lonDeg: pad.lon } : null,
    pad,
  };
}

/** The launch instant, or null. See {@link resolveLaunchContext}. */
export async function resolveLaunchInstant(
  q: LaunchInstantQuery,
  profileSite: { lat: number; lon: number } | undefined,
  fetchFn: typeof fetch = fetch,
  base = '',
): Promise<LaunchInstant | null> {
  return (await resolveLaunchContext(q, profileSite, fetchFn, base)).instant;
}
