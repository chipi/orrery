// Tour progress math (PRD-016 §S7 / RFC-019 §11.1).
//
// Pure functions over the active tour sequence. Take a `lookupDuration`
// closure rather than importing the registry directly — keeps the module
// trivially unit-testable without spinning up the reactive registry, and
// matches the singleton-injection pattern used elsewhere in src/lib.

export type DurationLookup = (episodeId: string) => number | undefined;

function sumDurations(ids: string[], lookup: DurationLookup): number {
  let total = 0;
  for (const id of ids) {
    const d = lookup(id);
    if (Number.isFinite(d) && (d as number) > 0) total += d as number;
  }
  return total;
}

export function tourTotalSec(sequence: string[], lookup: DurationLookup): number {
  return sumDurations(sequence, lookup);
}

export function tourElapsedSec(
  sequence: string[],
  index: number,
  positionSec: number,
  lookup: DurationLookup,
): number {
  if (sequence.length === 0) return 0;
  const safeIdx = Math.max(0, Math.min(index, sequence.length - 1));
  const prior = sumDurations(sequence.slice(0, safeIdx), lookup);
  const pos = Number.isFinite(positionSec) && positionSec > 0 ? positionSec : 0;
  return prior + pos;
}

export function tourRemainingSec(
  sequence: string[],
  index: number,
  positionSec: number,
  lookup: DurationLookup,
): number {
  const total = tourTotalSec(sequence, lookup);
  const elapsed = tourElapsedSec(sequence, index, positionSec, lookup);
  return Math.max(0, total - elapsed);
}
