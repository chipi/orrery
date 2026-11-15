/**
 * /missions/launches browse logic (UXD-048): which manifests an era needs, which launches an era
 * holds, the order, and the provider chips. The page holds one manifest at a time (the upcoming
 * list or one decade); choosing an era loads the decades it spans (and the upcoming list when the
 * era runs into the present) and keeps the launches of that era's years.
 */
import { epochForYear } from '../epoch-bands';
import { agencyShortName } from '../agencies';
import { ALL_DECADES, type LaunchEntry } from './manifest';
import { decadesOfEra, eraReachesUpcoming } from './year-index';
import type { FleetEpoch } from '../../types/fleet';

export type LaunchMode = 'upcoming' | 'historic';
export type LaunchSort = 'chrono-asc' | 'chrono-desc' | 'alpha';

/** The manifests to load: `upcoming`, or a decade such as `1970-1979`. */
export function launchSources(
  epoch: FleetEpoch | 'ALL',
  mode: LaunchMode,
  decade: string,
  year: number,
): string[] {
  if (epoch === 'ALL') return [mode === 'upcoming' ? 'upcoming' : decade];
  return [
    ...decadesOfEra(epoch, ALL_DECADES),
    ...(eraReachesUpcoming(epoch, year) ? ['upcoming'] : []),
  ];
}

/** What a list holds: only upcoming launches, only flown ones, or both (an era that runs to the present). */
export function listMode(
  epoch: FleetEpoch | 'ALL',
  mode: LaunchMode,
  year: number,
): LaunchMode | 'mixed' {
  if (epoch === 'ALL') return mode;
  const sources = launchSources(epoch, mode, ALL_DECADES[0], year);
  const upcoming = sources.includes('upcoming');
  return upcoming && sources.length > 1 ? 'mixed' : upcoming ? 'upcoming' : 'historic';
}

export const launchYear = (e: LaunchEntry): number => Number(e.net.slice(0, 4));
export const launchEra = (e: LaunchEntry): FleetEpoch | null => epochForYear(launchYear(e));

/** One chip per provider by its short name; a name outside the registry stays as the data has it. */
export const providerOf = (e: LaunchEntry): string => agencyShortName(e.agency_name);

export function providerCounts(entries: LaunchEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) out.set(providerOf(e), (out.get(providerOf(e)) ?? 0) + 1);
  return out;
}

/** Merge manifests into one list: the same id twice (a launch in two files) counts once. */
export function mergeEntries(manifests: { entries: Record<string, LaunchEntry> }[]): LaunchEntry[] {
  const byId = new Map<string, LaunchEntry>();
  for (const m of manifests) for (const [id, e] of Object.entries(m.entries)) byId.set(id, e);
  return [...byId.values()];
}

export function sortLaunches(
  list: LaunchEntry[],
  sort: LaunchSort,
  label: (e: LaunchEntry) => string,
): LaunchEntry[] {
  return list
    .slice()
    .sort((a, b) =>
      sort === 'alpha'
        ? label(a).localeCompare(label(b)) || a.net.localeCompare(b.net)
        : sort === 'chrono-desc'
          ? b.net.localeCompare(a.net) || a.id.localeCompare(b.id)
          : a.net.localeCompare(b.net) || a.id.localeCompare(b.id),
    );
}
