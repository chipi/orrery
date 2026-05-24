/**
 * Display-string formatters for surface sites (#42).
 *
 * Pure functions over SurfaceSite shape. /moon and /mars previously
 * carried identical implementations.
 */
import type { SurfaceSite } from '$types/surface-site';

/**
 * Compact mission-context tagline for the info card's second line.
 *
 *   "Apollo 11 crewed lander · landed 1969-07-20"
 *   "Mars Science Laboratory rover · landed 2012-08-06"
 *
 * Returns empty string when the site has neither mission_type nor
 * landing_date — caller can hide the line.
 */
export function missionContextFor(
  site: Pick<SurfaceSite, 'mission_type' | 'landing_date'>,
): string {
  const bits: string[] = [];
  if (site.mission_type) bits.push(site.mission_type);
  if (site.landing_date) bits.push(`landed ${site.landing_date}`);
  return bits.join(' · ') || '';
}
