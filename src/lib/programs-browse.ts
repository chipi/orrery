/**
 * /programs browse logic (UXD-048): the era a program sits in, and the counts the era strip and
 * the agency chips show. A program belongs to the era of its START YEAR, by the rule /missions
 * uses for a mission's year (`epochForYear`: the boundary year is the earlier era, where two bands
 * overlap by more than a year the later band wins). The program's own `epoch` field is an
 * editorial label that disagrees with its dates for 19 of 42 programs (JWST starts in 1996 and is
 * labelled ISS Assembly), so it is not what the tile's years describe.
 */
import { epochForYear } from './epoch-bands';
import { agencyDataColor } from './agencies';
import type { FleetEpoch } from '../types/fleet';
import type { ProgramIndexEntry, ProgramKind, ProgramStatus } from '../types/program';

export type ProgramSort = 'chrono-desc' | 'chrono-asc' | 'alpha';

export const programAgencies = (p: ProgramIndexEntry): string[] =>
  p.agencies && p.agencies.length > 0 ? p.agencies : [p.agency];

export function programEra(p: ProgramIndexEntry): FleetEpoch | null {
  return typeof p.start_year === 'number' ? epochForYear(p.start_year) : null;
}

export function programsByEra(programs: ProgramIndexEntry[]): Map<FleetEpoch, number> {
  const out = new Map<FleetEpoch, number>();
  for (const p of programs) {
    const ep = programEra(p);
    if (ep) out.set(ep, (out.get(ep) ?? 0) + 1);
  }
  return out;
}

export function programsByAgency(programs: ProgramIndexEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of programs)
    for (const a of new Set(programAgencies(p))) out.set(a, (out.get(a) ?? 0) + 1);
  return out;
}

/** Agency colours per era, the agency with most programs first (the dots of an era tile). */
export function agencyColorsByEra(programs: ProgramIndexEntry[]): Map<FleetEpoch, string[]> {
  const perEra = new Map<FleetEpoch, Map<string, number>>();
  for (const p of programs) {
    const ep = programEra(p);
    if (!ep) continue;
    const counts = perEra.get(ep) ?? new Map<string, number>();
    for (const a of new Set(programAgencies(p))) counts.set(a, (counts.get(a) ?? 0) + 1);
    perEra.set(ep, counts);
  }
  const out = new Map<FleetEpoch, string[]>();
  for (const [ep, counts] of perEra) {
    out.set(
      ep,
      [...counts.entries()]
        .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
        .map(([a]) => agencyDataColor(a))
        .filter((c): c is string => !!c),
    );
  }
  return out;
}

export interface ProgramFilters {
  epoch: FleetEpoch | 'ALL';
  agency: string;
  kind: ProgramKind | 'ALL';
  q: string;
}

export function sortPrograms(list: ProgramIndexEntry[], sort: ProgramSort): ProgramIndexEntry[] {
  const year = (p: ProgramIndexEntry) => p.start_year ?? 0;
  return list
    .slice()
    .sort((a, b) =>
      sort === 'alpha'
        ? a.name.localeCompare(b.name)
        : sort === 'chrono-asc'
          ? year(a) - year(b) || a.name.localeCompare(b.name)
          : year(b) - year(a) || a.name.localeCompare(b.name),
    );
}

/** `completed` shows as the Flown look; the other statuses keep their own. */
export const programStatusClass = (s: ProgramStatus): string =>
  s === 'COMPLETED' ? 'flown' : s.toLowerCase();
