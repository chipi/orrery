/**
 * Orbit-abbrev allowlist for the "beyond LEO" tier heuristic
 * (RFC-023 §5.3). Captured as a constant so audits can review the cut.
 */

export const BEYOND_LEO_ORBITS: ReadonlySet<string> = new Set([
  'GTO',
  'GEO',
  'MEO',
  'HEO',
  'TLI',
  'TMI',
  'L1',
  'L2',
  'L4',
  'L5',
  'HCO',
  'SOL',
  'LO', // lunar orbit
  'MARS',
  'MOON',
  'VENUS',
  'JUPITER',
  'SATURN',
  'KUIPER',
  'INTERPLANETARY',
  'ESCAPE',
  'LUNAR',
  'CISLUNAR',
  'HELIOCENTRIC',
]);

export function isBeyondLeo(abbrev: string | undefined | null): boolean {
  if (!abbrev) return false;
  return BEYOND_LEO_ORBITS.has(abbrev.toUpperCase());
}

/**
 * Detect "routine LEO comsat constellation batches" — Starlink, OneWeb,
 * Kuiper, Qianfan / Guowang etc. Used to demote T4 routine launches
 * from the FEATURED queue.
 */
const CONSTELLATION_PATTERNS = [
  /\bStarlink\b/i,
  /\bOneWeb\b/i,
  /\bKuiper\b/i,
  /\bQianfan\b/i,
  /\bGuowang\b/i,
  /\b千帆\b/,
];

export function isConstellationBatch(missionName: string | undefined): boolean {
  if (!missionName) return false;
  return CONSTELLATION_PATTERNS.some((rx) => rx.test(missionName));
}
