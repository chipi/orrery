/**
 * The EDL arrival facts a lander's mission JSON records (`flight.arrival.{entry_velocity_km_s,
 * edl_system, edl_duration_s, touchdown_velocity_ms}`), derived from its descent profile —
 * the profile stays the single source of truth (RFC-034 §12 · D7). Shared by
 * `scripts/backfill-descent-arrival.ts` (writes them) and descent-arrival.test.ts (fails
 * when a mission's copy has drifted from its profile).
 */

import {
  expandDescentProfile,
  type RawDescentProfile,
  type ArchetypeName,
} from './descent-profile-registry';
import { integrateDescent } from './descent-physics';
import type { EDLSystemKind } from '$types/mission';

export const EDL_SYSTEM: Record<ArchetypeName, EDLSystemKind> = {
  LUNAR_POWERED: 'powered',
  LUNA_DIRECT_IMPACT: 'direct_impact',
  MARS_PARACHUTE_RETRO: 'parachute_retro',
  MARS_AIRBAG: 'airbag',
  MARS_SKYCRANE: 'skycrane',
  MARS_PROPULSIVE: 'powered',
  VENUS_AEROSHELL: 'aeroshell',
  ASTEROID_TOUCH_AND_GO: 'touch_and_go',
  COMET_HARPOON: 'harpoon',
  TITAN_PARACHUTE: 'aeroshell',
  JUPITER_PROBE: 'atmospheric_probe',
  // Earth capsule re-entry is a parachute descent (some — Soyuz/Shenzhou — fire soft-landing
  // retro); 'parachute_retro' is the closest EDL bucket. Earth missions are not backfilled.
  EARTH_CAPSULE_REENTRY: 'parachute_retro',
};

/** Bodies whose landers carry the derived arrival fields. */
export const ARRIVAL_BODIES = ['moon', 'mars', 'venus'] as const;

/**
 * The mission JSON (relative to the repo root) whose `flight.arrival` records a profile's
 * EDL facts, or null. Only a descent AT the destination counts: Apollo 8's profile is its
 * Earth re-entry, not its arrival at the Moon, so its arrival block carries none of them.
 */
export function arrivalMissionPath(
  id: string,
  raw: RawDescentProfile,
  exists: (relPath: string) => boolean,
): string | null {
  const body = ARRIVAL_BODIES.find((b) => b === raw.body);
  if (!body) return null;
  const p = `static/data/missions/${body}/${id}.json`;
  return exists(p) ? p : null;
}

export interface DerivedArrival {
  entry_velocity_km_s: number;
  edl_system: EDLSystemKind;
  edl_duration_s: number;
  touchdown_velocity_ms: number;
}

/** The arrival fields a profile implies, rounded as the mission JSON stores them. */
export function deriveArrival(raw: RawDescentProfile): DerivedArrival {
  const summary = integrateDescent(expandDescentProfile(raw));
  return {
    entry_velocity_km_s: Number((raw.entryState.velocityMs / 1000).toFixed(3)),
    edl_system: EDL_SYSTEM[raw.archetype],
    edl_duration_s: Math.round(summary.totalDurationS),
    touchdown_velocity_ms: Number(summary.touchdownVelocityMs.toFixed(2)),
  };
}
