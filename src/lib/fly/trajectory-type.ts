/** The orbit / trajectory regime the /fly identity HUD names. */
export type TrajectoryType =
  | 'suborbital'
  | 'earth-orbit'
  | 'cislunar-free-return'
  | 'cislunar'
  | 'helio-flyby'
  | 'helio-free-return'
  | 'helio-hohmann'
  | 'helio-orbit';

const HELIO_FLYBY_DESTINATIONS = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);

/**
 * Earth-orbit flights (Vostok, Shenzhou, the Shuttle) fly in the Earth-centred scene too, but
 * never leave Earth orbit: they are not a cislunar transfer (plan A10). An Earth flight with no
 * coast entry (Sputnik 1, STS-107) is still one. Derived, not stored in the mission JSON, so
 * legacy mission files need no backfill.
 */
export function trajectoryType(o: {
  earthCoast: { suborbital?: boolean } | null;
  dest: string | undefined;
  isMoonMission: boolean;
  isFreeReturn: boolean;
  activeDestination: string;
}): TrajectoryType {
  if (o.earthCoast?.suborbital) return 'suborbital';
  if (o.earthCoast || o.dest?.toUpperCase() === 'EARTH') return 'earth-orbit';
  if (o.isMoonMission) return o.isFreeReturn ? 'cislunar-free-return' : 'cislunar';
  if (HELIO_FLYBY_DESTINATIONS.has(o.activeDestination)) return 'helio-flyby';
  // A Sun mission flies its own orbit round the Sun (Parker, Solar Orbiter, the Roadster), not a
  // transfer to a planet.
  if (o.dest?.toUpperCase() === 'SUN') return 'helio-orbit';
  return o.isFreeReturn ? 'helio-free-return' : 'helio-hohmann';
}
