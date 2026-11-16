import type { Destination } from '$types/mission';
import {
  isMoonMissionDest,
  type DestinationId,
  type MoonMissionDestId,
} from '$lib/physics/transfer/lambert-grid.constants';
import { MOONS } from '$lib/moon-transfer.constants';
import { isPlanDestination } from './destinations';

/**
 * Where a /plan selection flies on /fly (`?dest=<plan id>`). Every plan destination resolves:
 * the geocentric Moon keeps its cislunar flight; a planet, dwarf planet or asteroid flies its
 * own heliocentric arc; one of the nine planetary moons (ADR-086) flies its HOST planet's arc
 * (its porkchop rides the host's departure and TOF axes) with the moon named as the target.
 */
export type PlanFlightDestination =
  | { kind: 'moon'; missionDest: 'MOON' }
  | {
      kind: 'planet';
      dest: DestinationId;
      missionDest: Destination;
      /** Set when the plan destination is a planetary moon: the arc is the host's. */
      targetMoon?: MoonMissionDestId;
    };

export function resolvePlanFlightDestination(id: string): PlanFlightDestination | null {
  const key = id.toLowerCase();
  if (!isPlanDestination(key)) return null;
  if (key === 'moon') return { kind: 'moon', missionDest: 'MOON' };
  if (isMoonMissionDest(key as MoonMissionDestId)) {
    const host = MOONS.find((m) => m.id === key)!.host;
    return {
      kind: 'planet',
      dest: host,
      missionDest: host.toUpperCase() as Destination,
      targetMoon: key as MoonMissionDestId,
    };
  }
  return {
    kind: 'planet',
    dest: key as DestinationId,
    missionDest: key.toUpperCase() as Destination,
  };
}

/** The flight title for a planetary-moon plan: the moon is the target, the host the route. */
export function moonFlightName(moon: MoonMissionDestId, type: 'LANDING' | 'FLYBY'): string {
  const host = MOONS.find((m) => m.id === moon)!.host;
  return `EARTH → ${moon.toUpperCase()} via ${host.toUpperCase()} · ${type}`;
}

/** The default payload line: the generic spacecraft the ascent draws, at the mass it integrates. */
export function genericPayloadLine(label: string, payloadKg: number): string {
  return `${label} · ${Math.round(payloadKg)} kg`;
}
