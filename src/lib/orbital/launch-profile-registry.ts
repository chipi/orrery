/**
 * Launch-profile registry (RFC-033 §6 · epic #412 · Track A).
 *
 * Resolves a mission's launch vehicle → its ascent LaunchProfile, keyed on the
 * `fleet_refs` entry with `role: "launcher"`. Flagship profiles are hand-authored;
 * the shipped JSON library + generic fallback (RFC-033 S3/S7) grow from here.
 */

import { FALCON9_SAMPLE } from './ascent-profiles';
import type { LaunchProfile } from './ascent-physics';

/** Flagship profiles by launcher id (matches fleet_refs / fleet ids). */
const PROFILES: Record<string, LaunchProfile> = {
  'falcon-9': FALCON9_SAMPLE,
};

/** The ascent profile for a launcher id, or null when none is modelled yet. */
export function getLaunchProfile(launcherId: string | undefined | null): LaunchProfile | null {
  if (!launcherId) return null;
  return PROFILES[launcherId] ?? null;
}

interface FleetRef {
  id: string;
  role?: string;
}

/** The launcher id from a mission's fleet_refs (role === 'launcher'), if any. */
export function missionLauncherId(fleetRefs: FleetRef[] | undefined): string | undefined {
  return fleetRefs?.find((r) => r.role === 'launcher')?.id;
}

/** True when a mission's launcher has a modelled ascent profile. */
export function hasLaunchProfile(fleetRefs: FleetRef[] | undefined): boolean {
  return getLaunchProfile(missionLauncherId(fleetRefs)) != null;
}
