/**
 * Importance-tier algorithm for the Launches Calendar
 * (PRD-020 M4 / RFC-023 §5).
 *
 * Pure function: heuristic + curated override. Operator overrides win
 * over heuristic in both directions (featured → T1; demoted → T4).
 */

import { isBeyondLeo, isConstellationBatch } from './beyond-leo.js';
import type { RawLaunchEntry } from './types.js';

export type Tier = 'T1' | 'T2' | 'T3' | 'T4';

export type TierReason =
  | 'featured-override'
  | 'demoted-override'
  | 'crewed'
  | 'interplanetary'
  | 'lunar'
  | 'cislunar'
  | 'heliocentric'
  | 'mars'
  | 'venus'
  | 'moon'
  | 'first-flight-vehicle'
  | 'first-flight-pad'
  | 'reusable-milestone'
  | 'agency-debut'
  | 'routine-constellation'
  | 'standard';

export type CurationOverride = {
  launch_id: string;
  reason: string;
  editorial_note?: string;
};

export type CurationFile = {
  version: 1;
  featured: CurationOverride[];
  demoted: CurationOverride[];
};

export type TierResult = {
  tier: Tier;
  tier_reason: TierReason;
  editorial_note: string | null;
};

export type FirstFlightInfo = { earliestNet: string; count: number };

export type TierContext = {
  /**
   * Map of `rocket_family` → { earliest ISO date, total count of entries }.
   * Keyed by family (not config_id) because GCAT historic doesn't expose
   * config_id — without the family key, every upcoming launch of an
   * established vehicle gets falsely tagged as a first flight.
   * First-flight detection still requires count ≥ 2 (single-observation
   * configs are ambiguous).
   */
  firstFlightByConfig: Map<string, FirstFlightInfo>;
  /**
   * Mission-type marker for crewed launches. Heuristic: mission_type
   * contains "Human" or "Crewed", or mission_name contains "crew" /
   * specific operator-program markers.
   */
  isCrewed?: (entry: RawLaunchEntry) => boolean;
};

const CREW_PROGRAM_PATTERNS = [
  /\bCrew[\s-]?\d+\b/i,
  /\bSoyuz MS-\d+\b/i,
  /\bShenzhou\b/i,
  /\bApollo\b/i,
  /\bGemini\b/i,
  /\bMercury\b/i,
  /\bArtemis\b/i,
  /\bStarliner\b/i,
  /\bDragon\s+(CRS-)?Endeavour\b/i,
];

export function defaultIsCrewed(entry: RawLaunchEntry): boolean {
  const t = entry.mission_type?.toLowerCase() ?? '';
  if (t.includes('human') || t.includes('crew')) return true;
  const m = entry.mission_name ?? '';
  return CREW_PROGRAM_PATTERNS.some((rx) => rx.test(m));
}

/**
 * Detect "first orbital flight" of a rocket config by checking whether
 * the current entry is the earliest one for its config_id in the
 * combined manifest.
 */
function isFirstFlightVehicle(entry: RawLaunchEntry, ctx: TierContext): boolean {
  if (!entry.rocket_family) return false;
  const info = ctx.firstFlightByConfig.get(entry.rocket_family);
  if (!info) return false;
  if (info.count < 2) return false;
  return info.earliestNet === entry.net;
}

/**
 * Compute tier + reason for one launch entry. Pure function.
 *
 * Order (first match wins):
 *   1. featured override → T1
 *   2. demoted override → T4
 *   3. crewed → T1
 *   4. beyond-LEO orbit → T1 (with specific reason where detectable)
 *   5. first-flight-vehicle → T1
 *   6. routine LEO comsat constellation → T4
 *   7. default → T3
 */
export function computeTier(
  entry: RawLaunchEntry,
  curation: CurationFile,
  ctx: TierContext,
): TierResult {
  const featured = curation.featured.find((f) => f.launch_id === entry.id);
  if (featured) {
    return {
      tier: 'T1',
      tier_reason: 'featured-override',
      editorial_note: featured.editorial_note ?? null,
    };
  }
  const demoted = curation.demoted.find((d) => d.launch_id === entry.id);
  if (demoted) {
    return { tier: 'T4', tier_reason: 'demoted-override', editorial_note: null };
  }

  const isCrewed = (ctx.isCrewed ?? defaultIsCrewed)(entry);
  if (isCrewed) {
    return { tier: 'T1', tier_reason: 'crewed', editorial_note: null };
  }

  if (isBeyondLeo(entry.orbit_abbrev)) {
    const abbrev = (entry.orbit_abbrev ?? '').toUpperCase();
    const reason: TierReason =
      abbrev === 'LUNAR' || abbrev === 'LO' || abbrev === 'MOON'
        ? 'lunar'
        : abbrev === 'CISLUNAR'
          ? 'cislunar'
          : abbrev === 'MARS'
            ? 'mars'
            : abbrev === 'VENUS'
              ? 'venus'
              : abbrev === 'HCO' || abbrev === 'SOL' || abbrev === 'HELIOCENTRIC'
                ? 'heliocentric'
                : 'interplanetary';
    return { tier: 'T1', tier_reason: reason, editorial_note: null };
  }

  if (isFirstFlightVehicle(entry, ctx)) {
    return { tier: 'T1', tier_reason: 'first-flight-vehicle', editorial_note: null };
  }

  if (isConstellationBatch(entry.mission_name)) {
    return { tier: 'T4', tier_reason: 'routine-constellation', editorial_note: null };
  }

  return { tier: 'T3', tier_reason: 'standard', editorial_note: null };
}

/**
 * Build the first-flight-by-config map from a list of entries. Lowest
 * `net` ISO timestamp wins per `rocket_config_id`.
 */
export function buildFirstFlightMap(entries: RawLaunchEntry[]): Map<string, FirstFlightInfo> {
  const map = new Map<string, FirstFlightInfo>();
  for (const e of entries) {
    if (!e.rocket_family) continue;
    const prev = map.get(e.rocket_family);
    if (!prev) {
      map.set(e.rocket_family, { earliestNet: e.net, count: 1 });
    } else {
      map.set(e.rocket_family, {
        earliestNet: e.net < prev.earliestNet ? e.net : prev.earliestNet,
        count: prev.count + 1,
      });
    }
  }
  return map;
}
