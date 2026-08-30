/**
 * Mission catalogue `dest` ↔ on-disk folder (`missions/{dest}/`) and
 * heliocentric porkchop `DestinationId` for /fly arcs (ADR-028 / 3.0a-5).
 */

import type { Destination } from '$types/mission';
import type { DestinationId } from '$lib/physics/transfer/lambert-grid.constants';

/** Every allowed `Mission.dest` / `MissionIndex.dest` value. */
export const MISSION_CATALOG_DESTS: readonly Destination[] = [
  'EARTH',
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
  'COMET',
  'ASTEROID',
  'SUN',
  // GH #341 small-body destinations — see TA.md §body-wiring.
  'BENNU',
  'PSYCHE',
  'VESTA',
  'ARROKOTH',
  'ITOKAWA',
  'DIDYMOS',
  'DIMORPHOS',
  'DONALDJOHANSON',
  'EURYBATES',
  'POLYMELE',
  'LEUCUS',
  'ORUS',
  'PATROCLUS',
  'MENOETIUS',
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
    case 'EARTH':
      // Earth-orbit missions (Apollo 7/9, Mercury/Gemini/Skylab, Shuttle
      // LEO sorties, ISS expeditions) — like MOON, /fly's heliocentric
      // arc isn't the right view. The cislunar / Earth-centric mode
      // handles them (see src/lib/fly-mission-apply.ts where EARTH is
      // grouped with MOON for the cislunar branch).
      return null;
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
    case 'COMET':
    case 'ASTEROID':
      // No fixed heliocentric porkchop body — comet/asteroid targets
      // (67P, Halley, Ryugu, Itokawa, Steins, Lutetia, etc.) each have
      // their own ephemeris. /fly doesn't surface them; the iconic
      // PATHS trajectory in /explore is the only render path.
      return null;
    case 'SUN':
      // Solar polar / heliospheric missions (Ulysses, future Parker
      // Solar Probe scope) — /fly doesn't model them either; the
      // PATHS trajectory carries the visual story.
      return null;
    // GH #341 small-body destinations — each is a first-class
    // DestinationId in DESTINATIONS table (see lambert-grid.constants).
    case 'BENNU':
      return 'bennu';
    case 'PSYCHE':
      return 'psyche';
    case 'VESTA':
      return 'vesta';
    case 'ARROKOTH':
      return 'arrokoth';
    case 'ITOKAWA':
      return 'itokawa';
    case 'DIDYMOS':
      return 'didymos';
    case 'DIMORPHOS':
      return 'dimorphos';
    case 'DONALDJOHANSON':
      return 'donaldjohanson';
    case 'EURYBATES':
      return 'eurybates';
    case 'POLYMELE':
      return 'polymele';
    case 'LEUCUS':
      return 'leucus';
    case 'ORUS':
      return 'orus';
    case 'PATROCLUS':
      return 'patroclus';
    case 'MENOETIUS':
      return 'menoetius';
  }
}
