import type {
  DestinationId,
  MoonMissionDestId,
} from '$lib/physics/transfer/lambert-grid.constants';
import { MOONS } from '$lib/moon-transfer.constants';

/**
 * What the 2D canvas draws besides Earth, the origin (G-12a): the active destination only; for
 * a planetary-moon flight the host planet plus the named moon. A Sun-target mission keeps no
 * destination body (the scene's Mars is a stand-in there).
 */
export interface Draw2dTargets {
  /** Body whose orbit ring, live disc and label are drawn; null for a Sun-target mission. */
  bodyId: DestinationId | null;
  /** The named moon drawn on a short ring around the host. */
  moonId: MoonMissionDestId | null;
}

export function select2dTargets(
  activeDestination: DestinationId,
  targetMoon: MoonMissionDestId | null,
  sunTarget: boolean,
): Draw2dTargets {
  if (sunTarget) return { bodyId: null, moonId: null };
  if (targetMoon) {
    const host = MOONS.find((m) => m.id === targetMoon)?.host ?? activeDestination;
    return { bodyId: host, moonId: targetMoon };
  }
  return { bodyId: activeDestination, moonId: null };
}

/** Orbital period (days) of a destination moon, for its dot's phase on the short ring. */
export function moonPeriodDays(id: MoonMissionDestId): number {
  return MOONS.find((m) => m.id === id)!.periodDays;
}
