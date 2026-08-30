/**
 * Body gravity helper for the mechanics domain (S2b). Converts a PLANET_STATS
 * surfaceGravityG multiplier into SI m/s² using the canonical G0 from the
 * ascent module — the ONE home for that constant (RFC-037 A01.1).
 */
import { G0 } from '$lib/physics/ascent/ascent-physics-constants';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';

/**
 * Surface gravitational acceleration for `bodyId` in m/s².
 * Throws if the body is not in PLANET_STATS.
 */
export function bodyGravityMs2(bodyId: string): number {
  const stats = PLANET_STATS[bodyId];
  if (!stats) throw new Error(`Unknown body: ${bodyId}`);
  return stats.surfaceGravityG * G0;
}
