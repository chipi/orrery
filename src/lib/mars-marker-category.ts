/**
 * Mars surface-marker category lookup. Mirrors `moon-marker-category.ts`.
 *
 * The /mars 3D scene picks a silhouette per surface site. When a site
 * has a dedicated hand-authored builder (Viking, Pathfinder, MER, MSL-
 * class, Phoenix-class, Mars 2/3/6 Soviet petals, Beagle 2, Schiaparelli)
 * the builder wins. Otherwise we fall back to a category-based generic
 * silhouette derived from the `mission_type` string.
 */

export type MarsMarkerCategory = 'rover' | 'lander' | 'soviet-petal';

/** Derive a marker category from a mission_type free-text string and
 *  the site's agency. Soviet-petal hardware (the Mars 2/3/6 spherical
 *  capsule with four splayed petals) is a distinctive silhouette tied
 *  to the agency rather than the type label. */
export function categoriseMarsMarker(
  missionType: string | undefined,
  agency: string | undefined,
): MarsMarkerCategory {
  if (agency === 'ROSCOSMOS') return 'soviet-petal';
  const t = (missionType ?? '').toLowerCase();
  if (t.includes('rover')) return 'rover';
  return 'lander';
}
