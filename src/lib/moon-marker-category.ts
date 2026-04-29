/**
 * Categorise a moon-site `mission_type` string into one of five marker
 * archetypes for the /moon 3D + 2D views.
 *
 * Mission-type strings come from the locale overlay — observed values:
 *   "CREWED LANDER · FLOWN"
 *   "CREWED LANDER · PLANNED"
 *   "CREWED LANDER · ROVER · FLOWN"
 *   "FAR-SIDE LANDER · ROVER · ACTIVE"
 *   "FAR-SIDE SAMPLE RETURN · FLOWN"
 *   "LANDER · ROVER · FLOWN"
 *   "ORBITER · ACTIVE"
 *   "ORBITER · FLOWN"
 *   "PRECISION LANDER · ACTIVE"
 *   "ROVER · FLOWN"
 *   "SAMPLE RETURN · FLOWN"
 *   "UNCREWED LANDER · FLOWN"
 *
 * Priority: a multi-tag mission (e.g. Apollo 17 "CREWED LANDER · ROVER")
 * is shown by its most distinctive role — crewed beats rover beats lander.
 */
export type MoonMarkerCategory = 'crewed' | 'sample-return' | 'rover' | 'orbiter' | 'lander';

export function categoriseMoonMarker(missionType: string | undefined): MoonMarkerCategory {
  if (!missionType) return 'lander';
  const t = missionType.toUpperCase();
  // Word-boundary check on CREWED so "UNCREWED" doesn't false-match.
  if (/\bCREWED\b/.test(t)) return 'crewed';
  if (t.includes('SAMPLE RETURN')) return 'sample-return';
  if (t.includes('ROVER')) return 'rover';
  if (t.includes('ORBITER')) return 'orbiter';
  return 'lander';
}
