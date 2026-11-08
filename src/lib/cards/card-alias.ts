/**
 * Canonical-card alias helpers, split out of card-spec.ts so a panel can answer
 * "does this entry alias a mission card?" without loading the card resolvers,
 * CollectibleCard and their messages (~13 KB br — they load on demand, see
 * lazy-card.ts). card-spec.ts re-exports these.
 */
import type { MissionIndex } from '$types/mission';

/**
 * True when a fleet entry shares its id with a mission — the same real thing
 * on two surfaces (Perseverance the rover IS Perseverance the mission; 47
 * craft overlap this way). The mission card is canonical for those: it has
 * the richer spec set (launch, ΔV, transit, trajectory figure) and one
 * collectible per real thing keeps the collection honest. Panels alias to
 * the mission card; the generator + share stubs skip the fleet duplicate.
 */
export function fleetAliasesMission(fleetId: string, missionIndex: MissionIndex[]): boolean {
  return fleetAliasMissionId(fleetId, missionIndex) !== null;
}

/** Fleet↔mission ids drift on dashes ('change-4' vs 'change4' — 11 real
 *  duplicates shipped before this normalisation). Compare dash-stripped;
 *  returns the MISSION's real id (the canonical card owner) or null. */
const normalizeCardId = (id: string) => id.replace(/-/g, '');
export function fleetAliasMissionId(fleetId: string, missionIndex: MissionIndex[]): string | null {
  const n = normalizeCardId(fleetId);
  return missionIndex.find((mi) => normalizeCardId(mi.id) === n)?.id ?? null;
}

/**
 * The mission whose card a moon/mars site shows: `mission_id` first, id parity
 * second (same rule the panels' crossSite lookup uses). 45 of 54 moon/mars sites
 * alias a mission and show the canonical mission card; only the remaining 9
 * without a mission record get their own site card.
 */
export function siteAliasMissionId(
  site: { id: string; mission_id?: string },
  missionIndex: MissionIndex[],
): string | null {
  if (site.mission_id && missionIndex.some((mi) => mi.id === site.mission_id))
    return site.mission_id;
  if (missionIndex.some((mi) => mi.id === site.id)) return site.id;
  return null;
}
