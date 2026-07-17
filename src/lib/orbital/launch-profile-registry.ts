/**
 * Launch-profile registry (RFC-033 §6 · epic #412 · Track A).
 *
 * Resolves a mission's launch vehicle → its ascent LaunchProfile, keyed on the
 * `fleet_refs` entry with `role: "launcher"`. Flagship profiles ship as JSON
 * under static/data/launch-profiles/<id>.json and are fetched + shape-validated
 * on demand. The generic 2-stage fallback (RFC-033 S7) grows from here.
 */

import type { LaunchProfile } from './ascent-physics';

/** Launcher ids that have a shipped profile — the synchronous gate. */
const KNOWN_PROFILE_IDS = new Set<string>(['falcon-9']);

interface FleetRef {
  id: string;
  role?: string;
}

/** The launcher id from a mission's fleet_refs (role === 'launcher'), if any. */
export function missionLauncherId(fleetRefs: FleetRef[] | undefined): string | undefined {
  return fleetRefs?.find((r) => r.role === 'launcher')?.id;
}

/** True (synchronously) when a mission's launcher has a shipped ascent profile. */
export function hasLaunchProfile(fleetRefs: FleetRef[] | undefined): boolean {
  const id = missionLauncherId(fleetRefs);
  return id != null && KNOWN_PROFILE_IDS.has(id);
}

/** Minimal fail-closed shape check for a loaded profile. */
function isValidProfile(d: unknown): d is LaunchProfile {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.payloadKg === 'number' &&
    Array.isArray(p.stages) &&
    p.stages.length > 0 &&
    Array.isArray(p.pitchProgram)
  );
}

/**
 * Fetch + validate the ascent profile for a launcher id. Returns null when the
 * launcher has no profile, the fetch fails, or the JSON is malformed (fail-closed).
 * `baseUrl` is the SvelteKit base path; `fetchFn` lets callers pass the load fetch.
 */
export async function loadLaunchProfile(
  launcherId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<LaunchProfile | null> {
  if (!launcherId || !KNOWN_PROFILE_IDS.has(launcherId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/launch-profiles/${launcherId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isValidProfile(data) ? data : null;
  } catch {
    return null;
  }
}
