/**
 * Multi-source merge (PRD-020 / RFC-023 §4.3).
 *
 * Given a list of (source, RawLaunchEntry) contributions sorted by
 * provider priority, produce a single manifest entry per stable
 * Orrery-internal id with a full `provenance_chain` recording every
 * source's contribution + role.
 *
 * Rules:
 *  1. First-seen-wins for primary fields. Higher-priority source
 *     claims fields it provides; subsequent providers only fill
 *     remaining null/undefined values.
 *  2. Subsequent providers that fill fields get `role: 'augmented-with'`.
 *     A provider whose values are entirely dominated still appears in
 *     the chain with `role: 'confirmed-via'` to give credit + show
 *     transparency on the per-row chip.
 *  3. Pure function — no fs, no network. Caller wires fetched_at via
 *     `RawLaunchEntry.source_observed_at`.
 */

import type { LaunchProvenanceLink, RawLaunchEntry } from './types.js';

export type SourceContribution = {
  source_name: string;
  default_role: 'primary' | 'fallback-primary';
  entries: RawLaunchEntry[];
};

export type MergedEntry = {
  /** All RawLaunchEntry fields, with first-seen-wins-then-augment merge applied. */
  entry: RawLaunchEntry;
  provenance_chain: LaunchProvenanceLink[];
  /** When two providers disagreed on a primary field, the second-place value + source. */
  disagreements: Array<{
    field: keyof RawLaunchEntry;
    winning_source: string;
    losing_source: string;
    winning_value: unknown;
    losing_value: unknown;
  }>;
};

/**
 * Merge contributions for a single stable id into one entry.
 * `contributions` must be ordered by provider priority (ascending — i.e.
 * highest priority / lowest number first).
 */
export function mergeContributions(
  id: string,
  contributions: Array<{
    source_name: string;
    default_role: 'primary' | 'fallback-primary';
    entry: RawLaunchEntry;
  }>,
): MergedEntry {
  if (contributions.length === 0) {
    throw new Error(`mergeContributions(${id}): empty contributions list`);
  }
  const [first, ...rest] = contributions;
  const merged: RawLaunchEntry = { ...first.entry };
  const chain: LaunchProvenanceLink[] = [
    {
      source: first.source_name,
      source_url: first.entry.source_url,
      fetched_at: first.entry.source_observed_at,
      role: first.default_role,
    },
  ];
  const disagreements: MergedEntry['disagreements'] = [];

  for (const c of rest) {
    let contributedAny = false;
    for (const key of Object.keys(c.entry) as Array<keyof RawLaunchEntry>) {
      const winning = merged[key];
      const incoming = c.entry[key];
      const winningIsEmpty = winning === undefined || winning === null || winning === '';
      const incomingIsEmpty = incoming === undefined || incoming === null || incoming === '';
      if (incomingIsEmpty) continue;
      if (winningIsEmpty) {
        (merged as Record<string, unknown>)[key as string] = incoming;
        contributedAny = true;
        continue;
      }
      // Both providers have a value. Record disagreement only when
      // they differ AND the field is one we surface (skip source_* book-keeping).
      if (
        key === 'source_name' ||
        key === 'source_observed_at' ||
        key === 'source_url' ||
        key === 'id'
      ) {
        continue;
      }
      if (JSON.stringify(winning) !== JSON.stringify(incoming)) {
        disagreements.push({
          field: key,
          winning_source: chain[0].source, // first-seen-wins reports first contributor
          losing_source: c.source_name,
          winning_value: winning,
          losing_value: incoming,
        });
      }
    }
    chain.push({
      source: c.source_name,
      source_url: c.entry.source_url,
      fetched_at: c.entry.source_observed_at,
      role: contributedAny ? 'augmented-with' : 'confirmed-via',
    });
  }

  // Stamp the merged entry's id to the canonical value (defensive — all
  // contributions should already share it).
  merged.id = id;
  // Keep source_observed_at from the highest-priority provider for the
  // "this row was last fetched at" semantics. source_name no longer
  // single-valued post-merge; rely on provenance_chain.
  return { entry: merged, provenance_chain: chain, disagreements };
}

/**
 * Group RawLaunchEntry contributions across providers by stable id, then
 * merge each group. Returns the merged entries map keyed by stable id.
 *
 * `contributions` MUST be ordered by provider priority (ascending).
 */
export function mergeAllContributions(contributions: SourceContribution[]): {
  merged: Record<string, MergedEntry>;
  collisionCounter: Record<string, number>;
} {
  // Phase 1: bucket every (source, entry) by entry.id.
  const buckets = new Map<
    string,
    Array<{
      source_name: string;
      default_role: 'primary' | 'fallback-primary';
      entry: RawLaunchEntry;
    }>
  >();
  for (const c of contributions) {
    for (const e of c.entries) {
      const list = buckets.get(e.id) ?? [];
      list.push({ source_name: c.source_name, default_role: c.default_role, entry: e });
      buckets.set(e.id, list);
    }
  }

  // Phase 2: merge per bucket. The bucket's contributions already arrive
  // in priority order because we iterate `contributions` priority-ordered
  // and push in iteration order — preserved by Map.
  const merged: Record<string, MergedEntry> = {};
  const collisionCounter: Record<string, number> = {};
  for (const [id, bucket] of buckets) {
    // Within a single source, the same stable id arriving twice means a
    // genuine same-day same-vehicle same-mission collision. Append
    // -2, -3 suffix.
    const bySource = new Map<string, typeof bucket>();
    for (const item of bucket) {
      const list = bySource.get(item.source_name) ?? [];
      list.push(item);
      bySource.set(item.source_name, list);
    }
    let maxDupes = 0;
    for (const list of bySource.values()) {
      if (list.length > maxDupes) maxDupes = list.length;
    }
    if (maxDupes === 1) {
      merged[id] = mergeContributions(id, bucket);
    } else {
      collisionCounter[id] = maxDupes;
      // Spread duplicates across counter-suffixed ids. Take the first of
      // each source for the first id; subsequent same-source duplicates
      // become `-2`, `-3`.
      const heads = bucket.filter((_, i) => {
        const sourceName = bucket[i].source_name;
        return bySource.get(sourceName)![0] === bucket[i];
      });
      merged[id] = mergeContributions(id, heads);
      for (let n = 2; n <= maxDupes; n++) {
        const nthBucket: typeof bucket = [];
        for (const [src, list] of bySource) {
          if (list[n - 1]) {
            const dup = { ...list[n - 1], entry: { ...list[n - 1].entry, id: `${id}-${n}` } };
            nthBucket.push(dup);
            void src;
          }
        }
        if (nthBucket.length > 0) {
          merged[`${id}-${n}`] = mergeContributions(`${id}-${n}`, nthBucket);
        }
      }
    }
  }
  return { merged, collisionCounter };
}
