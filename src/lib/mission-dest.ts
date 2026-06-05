/**
 * Mission catalogue `dest` ↔ on-disk folder (`missions/{dest}/`) and
 * heliocentric porkchop `DestinationId` for /fly arcs (ADR-028 / 3.0a-5).
 */

import type { Destination } from '$types/mission';
import type { DestinationId } from '$lib/lambert-grid.constants';

/** Every allowed `Mission.dest` / `MissionIndex.dest` value. */
export const MISSION_CATALOG_DESTS: readonly Destination[] = [
  'MARS',
  'MOON',
  'MERCURY',
  'VENUS',
  'JUPITER',
  'SATURN',
  'URANUS',
  'NEPTUNE',
  'PLUTO',
  'CERES',
] as const;

export function isMissionDestination(s: string): s is Destination {
  return (MISSION_CATALOG_DESTS as readonly string[]).includes(s);
}

/** Subdirectory names under `static/data/missions/` (lowercase). */
export function missionDestToDataFolder(dest: Destination): string {
  return dest.toLowerCase();
}

/**
 * Maps catalogue `dest` to heliocentric arc body for `transferEllipse` /
 * `destinationPos`. Moon missions use cislunar geometry elsewhere — null.
 */
export function missionDestToHeliocentricDestinationId(dest: Destination): DestinationId | null {
  switch (dest) {
    case 'MARS':
      return 'mars';
    case 'MOON':
      return null;
    case 'MERCURY':
      return 'mercury';
    case 'VENUS':
      return 'venus';
    case 'JUPITER':
      return 'jupiter';
    case 'SATURN':
      return 'saturn';
    case 'URANUS':
      return 'uranus';
    case 'NEPTUNE':
      return 'neptune';
    case 'PLUTO':
      return 'pluto';
    case 'CERES':
      return 'ceres';
  }
}
