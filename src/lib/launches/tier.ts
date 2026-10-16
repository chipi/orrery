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

/**
 * A rocket configuration whose earliest launch is its first flight even when
 * the source's counts say otherwise (LL2 can count a whole family's launches,
 * which hides a new variant). Keyed on the stable LL2 config id, not a
 * date-prefixed launch id, so a slipped date never orphans it (#603).
 */
export type FirstFlightConfig = {
  rocket_config_id: string;
  reason: string;
};

export type CurationFile = {
  version: 1;
  featured: CurationOverride[];
  demoted: CurationOverride[];
  first_flight_configs?: FirstFlightConfig[];
};

export type TierResult = {
  tier: Tier;
  tier_reason: TierReason;
  editorial_note: string | null;
};

export type TierContext = {
  /** Ids of first-flight entries, from `buildFirstFlightIds`. */
  firstFlightIds: Set<string>;
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

function isFirstFlightVehicle(entry: RawLaunchEntry, ctx: TierContext): boolean {
  return ctx.firstFlightIds.has(entry.id);
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

/** The earliest entry of a group; on a tie the first in input order (one maiden flight per group). */
function earliest(group: RawLaunchEntry[]): RawLaunchEntry {
  return group.reduce((best, e) => (e.net < best.net ? e : best));
}

function groupBy(
  entries: RawLaunchEntry[],
  key: (e: RawLaunchEntry) => string | undefined,
): Map<string, RawLaunchEntry[]> {
  const groups = new Map<string, RawLaunchEntry[]>();
  for (const e of entries) {
    const k = key(e);
    if (!k) continue;
    const group = groups.get(k);
    if (group) group.push(e);
    else groups.set(k, [e]);
  }
  return groups;
}

/**
 * Ids of the entries that are a vehicle's first flight. Pass every source's
 * entries BEFORE merging (stable ids carry through the merge). Two rules,
 * each reading one source's own data, never names matched across sources:
 *
 * - Upcoming: the source says how many launches the exact rocket
 *   configuration has already made (`rocket_config_prior_launches`, LL2's
 *   `total_launch_count`). Only a configuration with 0 qualifies, and only
 *   its earliest pending launch.
 * - Historic: GCAT's own record. The earliest GCAT launch of each
 *   `rocket_family`, when GCAT has at least two launches of it (a lone
 *   observation is ambiguous).
 *
 * - Curated: for each `curatedConfigIds` entry (launches-curation.json
 *   `first_flight_configs`), the earliest launch of that configuration.
 *   For vehicles the counts can't tell apart from long-flown ones (#603).
 *
 * Without one of these signals an entry is never a first flight. Mixing LL2
 * and GCAT family names (the old rule) flagged long-flown vehicles whenever
 * the names didn't line up or GCAT was missing (issue #566).
 */
export function buildFirstFlightIds(
  entries: RawLaunchEntry[],
  curatedConfigIds: Iterable<string> = [],
): Set<string> {
  const ids = new Set<string>();

  const curated = new Set(curatedConfigIds);
  const curatedGroups = groupBy(
    entries.filter((e) => e.rocket_config_id !== undefined && curated.has(e.rocket_config_id)),
    (e) => e.rocket_config_id,
  );
  for (const group of curatedGroups.values()) ids.add(earliest(group).id);

  const maidenConfigs = groupBy(
    entries.filter((e) => e.rocket_config_prior_launches === 0),
    (e) => e.rocket_config_id,
  );
  for (const group of maidenConfigs.values()) ids.add(earliest(group).id);

  const gcatFamilies = groupBy(
    entries.filter((e) => e.source_name === 'gcat'),
    (e) => e.rocket_family,
  );
  for (const group of gcatFamilies.values()) {
    if (group.length >= 2) ids.add(earliest(group).id);
  }

  return ids;
}
