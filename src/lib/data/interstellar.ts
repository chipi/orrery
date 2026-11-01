/**
 * #410 — interstellar-craft message data for the /explore MessagePanel.
 *
 * Composes the existing iconic-trajectory JSON (status: current distance,
 * interstellar-since, heading) with the culture-door catalogue (the message
 * each craft carries — Voyager Golden Record, Pioneer Plaque). No new craft
 * data file: the trajectory JSON the PATHS layer already fetches is the single
 * source; #410 only added `agency` / `culture_object_id` / `heading` fields to
 * it. The signal light-time is derived, not stored.
 */

import { get, type FetchLike } from './core';
import { getCultureDoors, type LocalizedCultureDoor } from './universe';
import type { IconicTrajectoryData } from '$lib/three/iconic-trajectory';
import { localizeTrajectory, type IconicTrajectoryOverlay } from '$lib/trajectory-overlay';

/** Missions that ship `static/data/trajectories/<id>.json` (the orbiter `-tour`
 *  files are extra layers of these and not listed). Callers check it before
 *  fetching: /fly used to request the file for every mission and got a 404 for
 *  each one without it. interstellar.test.ts keeps it equal to the files. */
export const TRAJECTORY_IDS = [
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
  'new-horizons',
  'galileo',
  'juno',
  'cassini',
  'dawn',
  'rosetta',
  'vega-1',
  'vega-2',
  'venera-13',
  'giotto',
  'hayabusa2',
  'juice',
  'bepicolombo',
  'ulysses',
] as const;
const TRAJECTORY_ID_SET: ReadonlySet<string> = new Set(TRAJECTORY_IDS);
export const hasTrajectory = (id: string): boolean => TRAJECTORY_ID_SET.has(id);

/** A trajectory with its locale overlay applied (display text only; see
 *  localizeTrajectory). Null when the trajectory is missing. */
export async function getTrajectory(
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<IconicTrajectoryData | null> {
  const traj = await get<IconicTrajectoryData>(`trajectories/${id}.json`, fetchFn).catch(
    () => null,
  );
  if (!traj || locale === 'en-US') return traj;
  const overlay = await get<IconicTrajectoryOverlay>(
    `i18n/${locale}/trajectories/${id}.json`,
    fetchFn,
  ).catch(() => null);
  return localizeTrajectory(traj, overlay);
}

/** 1 AU expressed in light-hours (149,597,870.7 km ÷ c). */
const AU_IN_LIGHT_HOURS = 0.138612;

export interface InterstellarCraft {
  id: string;
  name: string;
  agency: string;
  missionId: string;
  /** ISO launch date (from the trajectory's first "Launch" waypoint). */
  launchDate: string | null;
  currentDistanceAu: number;
  currentDistanceLabel: string;
  interstellarSinceLabel?: string;
  heading?: { star: string | null; constellation: string };
  /** One-way light-time from the Sun, derived from the current distance (B). */
  signalLightHours: number;
  /** The message(s) this craft carries, localized. Empty when it carries none. */
  doors: LocalizedCultureDoor[];
}

/**
 * Load the message-panel record for one interstellar craft by its trajectory id
 * (voyager-1/-2, pioneer-10/-11, new-horizons). Returns null if the trajectory
 * is missing or isn't an interstellar-bound craft.
 */
export async function getInterstellarCraft(
  id: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<InterstellarCraft | null> {
  const traj = await getTrajectory(id, locale, fetchFn);
  if (!traj || !traj.category?.includes('interstellar-bound')) return null;

  const launchWaypoint = traj.waypoints?.find((w) => w.label === 'Launch') ?? traj.waypoints?.[0];
  const doors = traj.culture_object_id
    ? await getCultureDoors(traj.culture_object_id, locale, fetchFn)
    : [];

  return {
    id: traj.id,
    name: traj.name,
    agency: traj.agency ?? 'NASA',
    missionId: traj.mission_id,
    launchDate: launchWaypoint?.date ?? null,
    currentDistanceAu: traj.current_distance_au,
    currentDistanceLabel: traj.current_distance_label,
    interstellarSinceLabel: traj.interstellar_since_label,
    heading: traj.heading
      ? { star: traj.heading.star, constellation: traj.heading.constellation }
      : undefined,
    signalLightHours: traj.current_distance_au * AU_IN_LIGHT_HOURS,
    doors,
  };
}
