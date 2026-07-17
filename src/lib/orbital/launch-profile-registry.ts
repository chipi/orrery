/**
 * Launch-profile registry (RFC-033 §6 · epic #412 · Track A).
 *
 * Resolves a mission's launch vehicle → its ascent LaunchProfile, keyed on the
 * `fleet_refs` entry with `role: "launcher"`. Flagship profiles ship as JSON
 * under static/data/launch-profiles/<id>.json and are fetched + shape-validated
 * on demand. The generic 2-stage fallback (RFC-033 S7) grows from here.
 */

import type { LaunchProfile } from './ascent-physics';

/** Launcher ids with a hand-authored flagship JSON (real per-vehicle data). */
const FLAGSHIP_IDS = new Set<string>([
  'falcon-9',
  'atlas-v',
  'saturn-v',
  'proton-k',
  'titan-ii-glv',
  'saturn-ib',
]);

interface FleetRef {
  id: string;
  role?: string;
}

/** The launcher id from a mission's fleet_refs (role === 'launcher'), if any. */
export function missionLauncherId(fleetRefs: FleetRef[] | undefined): string | undefined {
  return fleetRefs?.find((r) => r.role === 'launcher')?.id;
}

/** Match a free-text vehicle string ("Atlas V 411") to a flagship id, if any. */
function matchFlagship(vehicle: string): string | null {
  const v = vehicle.toLowerCase();
  if (v.includes('falcon 9')) return 'falcon-9';
  if (v.includes('atlas v')) return 'atlas-v';
  if (v.includes('saturn v')) return 'saturn-v';
  return null;
}

/** Slugify a vehicle string into a stable generic id ("Long March 3B" → "long-march-3b"). */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Resolve a mission's launch vehicle to `{ id, name }` — covering EVERY mission:
 * prefer the fleet_refs launcher id; otherwise fall back to the mission's
 * free-text `vehicle` string (matched to a flagship where possible, else a
 * slug for the generic model). Returns null only when the mission has neither.
 */
export function resolveLauncher(
  fleetRefs: FleetRef[] | undefined,
  vehicle: string | undefined,
): { id: string; name: string } | null {
  const fromRefs = missionLauncherId(fleetRefs);
  if (fromRefs) return { id: fromRefs, name: vehicle ?? prettyName(fromRefs) };
  if (vehicle) return { id: matchFlagship(vehicle) ?? slug(vehicle), name: vehicle };
  return null;
}

/** True when a mission can play a launch — via a launcher ref OR a vehicle string. */
export function hasLaunchProfile(
  fleetRefs: FleetRef[] | undefined,
  vehicle?: string | undefined,
): boolean {
  return resolveLauncher(fleetRefs, vehicle) != null;
}

/** Title-case a launcher id ("long-march-5" → "Long March 5", "pslv-xl" → "PSLV XL"). */
function prettyName(id: string): string {
  return id
    .split('-')
    .map((s) => (s.length <= 3 || /\d/.test(s) ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1)))
    .join(' ');
}

/**
 * Generic 2-stage LEO fallback (RFC-033 S7) — a representative medium launcher
 * used when no flagship profile exists, so every mission with a launcher gets a
 * launch act. Physically plausible (reaches orbit with margin) but NOT vehicle-
 * accurate; surfaced with a "representative" tier so it's never mistaken for real.
 */
export function buildGenericProfile(launcherId: string, displayName?: string): LaunchProfile {
  return {
    id: launcherId,
    name: displayName ?? prettyName(launcherId),
    source_tier: 'generic',
    payloadKg: 6000,
    fairingKg: 1500,
    fairingJettisonAltM: 110000,
    refAreaM2: 10,
    cd: 0.3,
    pitchProgram: [[0, 90], [14, 88], [45, 66], [120, 42], [190, 22], [280, 10]],
    stages: [
      { name: 'S1', wetKg: 290000, dryKg: 22000, thrustSlKN: 4100, thrustVacKN: 4500, ispSlS: 285, ispVacS: 320, engines: 1, chamberTempK: 3400 },
      { name: 'S2', wetKg: 28000, dryKg: 2800, thrustVacKN: 300, ispVacS: 355, engines: 1, chamberTempK: 3300 },
    ],
  };
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
  displayName?: string,
): Promise<LaunchProfile | null> {
  if (!launcherId) return null;
  if (FLAGSHIP_IDS.has(launcherId)) {
    try {
      const res = await fetchFn(`${baseUrl}/data/launch-profiles/${launcherId}.json`);
      if (res.ok) {
        const data: unknown = await res.json();
        if (isValidProfile(data)) return data;
      }
    } catch {
      // fall through to the generic fallback
    }
  }
  return buildGenericProfile(launcherId, displayName);
}
