/**
 * Body gravity helper for the mechanics domain (S2b). Converts a PLANET_STATS
 * surfaceGravityG multiplier into SI m/s² using the canonical G0 from the
 * ascent module — the ONE home for that constant (RFC-037 A01.1).
 *
 * Micro-g worlds (P5 · #529) resolve through the descent kernel's μ/R tables
 * instead — they are deliberately NOT PLANET_STATS rows (that record drives
 * the /explore planet dossiers; asteroids don't belong there), but every
 * body-kind field id must still resolve here (index.test MAJOR-3 gate).
 */
import { G0 } from '$lib/physics/ascent/ascent-physics-constants';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';
import { MU_BODY_M3_S2, R_BODY_M } from '$lib/physics/descent/descent-physics-constants';
import type { DescentBody } from '$lib/physics/descent/descent-physics';

/**
 * Surface gravitational acceleration for `bodyId` in m/s².
 * Throws if the body is in neither PLANET_STATS nor the descent body table.
 */
export function bodyGravityMs2(bodyId: string): number {
  const stats = PLANET_STATS[bodyId];
  if (stats) return stats.surfaceGravityG * G0;
  if (bodyId in MU_BODY_M3_S2) {
    const id = bodyId as DescentBody;
    return MU_BODY_M3_S2[id] / (R_BODY_M[id] * R_BODY_M[id]);
  }
  throw new Error(`Unknown body: ${bodyId}`);
}
