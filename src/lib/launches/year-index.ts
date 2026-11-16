/**
 * Launch counts per calendar year, with the launch providers of each year: the one small file
 * (`static/data/launches-years.json`) that lets the era strip of /missions/launches show the
 * count of every era while the page holds a single manifest (one decade, or the upcoming list).
 * Written by `scripts/fetch-launches.ts` next to the manifests; a unit test compares the file
 * with the manifests so it cannot go stale. Relative imports only: the script runs under tsx.
 */
import { EPOCH_BANDS, epochForYear } from '../epoch-bands';
import type { FleetEpoch } from '../../types/fleet';

export interface YearIndex {
  version: 1;
  /** year → count and provider name (as in the manifests' `agency_name`) → count */
  years: Record<string, { n: number; agencies: Record<string, number> }>;
}

export function buildYearIndex(entries: { net: string; agency_name: string }[]): YearIndex {
  const years: YearIndex['years'] = {};
  for (const e of entries) {
    const y = e.net.slice(0, 4);
    const row = (years[y] ??= { n: 0, agencies: {} });
    row.n += 1;
    row.agencies[e.agency_name] = (row.agencies[e.agency_name] ?? 0) + 1;
  }
  const sorted: YearIndex['years'] = {};
  for (const y of Object.keys(years).sort()) {
    const row = years[y];
    const agencies: Record<string, number> = {};
    for (const [a, n] of Object.entries(row.agencies).sort(
      (p, q) => q[1] - p[1] || p[0].localeCompare(q[0]),
    ))
      agencies[a] = n;
    sorted[y] = { n: row.n, agencies };
  }
  return { version: 1, years: sorted };
}

/** Launches per era (the era of a year is `epochForYear`, the rule /missions uses). */
export function countsByEra(index: YearIndex): Map<FleetEpoch, number> {
  const out = new Map<FleetEpoch, number>();
  for (const [y, row] of Object.entries(index.years)) {
    const ep = epochForYear(Number(y));
    if (ep) out.set(ep, (out.get(ep) ?? 0) + row.n);
  }
  return out;
}

/** Launches of each provider per era: the provider name is the manifest's `agency_name`. */
export function providersByEra(index: YearIndex): Map<FleetEpoch, Map<string, number>> {
  const out = new Map<FleetEpoch, Map<string, number>>();
  for (const [y, row] of Object.entries(index.years)) {
    const ep = epochForYear(Number(y));
    if (!ep) continue;
    const m = out.get(ep) ?? new Map<string, number>();
    for (const [a, n] of Object.entries(row.agencies)) m.set(a, (m.get(a) ?? 0) + n);
    out.set(ep, m);
  }
  return out;
}

/** The decades (`1970-1979`, …) whose years meet an era's band. */
export function decadesOfEra(era: FleetEpoch, decades: readonly string[]): string[] {
  const band = EPOCH_BANDS.find((b) => b.id === era);
  if (!band) return [];
  return decades.filter((d) => {
    const [from, to] = d.split('-').map(Number);
    return from <= band.yearEnd && to >= band.yearStart;
  });
}

/** An era needs the upcoming list when its band reaches the present year. */
export function eraReachesUpcoming(era: FleetEpoch, year: number): boolean {
  const band = EPOCH_BANDS.find((b) => b.id === era);
  return !!band && band.yearEnd >= year;
}
