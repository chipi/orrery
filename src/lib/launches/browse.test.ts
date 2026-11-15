import { describe, expect, it } from 'vitest';
import {
  launchEra,
  launchSources,
  listMode,
  mergeEntries,
  providerCounts,
  providerOf,
  sortLaunches,
} from './browse';
import type { LaunchEntry } from './manifest';

const entry = (o: Partial<LaunchEntry>): LaunchEntry => ({
  id: 'x',
  net: '2026-03-15T12:00:00.000Z',
  net_precision: 'minute',
  status: { code: 'SUCCESS', label: 'Success' },
  name: 'X',
  agency_name: 'SpaceX',
  rocket_config_name: 'Falcon 9',
  rocket_family: 'Falcon 9',
  orrery_launcher_ref: null,
  tier: 'T3',
  tier_reason: '',
  editorial_note: null,
  provenance_chain: [],
  fetched_at: '2026-01-01T00:00:00.000Z',
  ...o,
});

describe('launchSources', () => {
  it('with no era: the upcoming list, or the chosen decade (the page as it was)', () => {
    expect(launchSources('ALL', 'upcoming', '2020-2026', 2026)).toEqual(['upcoming']);
    expect(launchSources('ALL', 'historic', '1970-1979', 2026)).toEqual(['1970-1979']);
  });
  it('with an era: the decades it spans, and the upcoming list when it runs to the present', () => {
    expect(launchSources('first-steps', 'upcoming', '2020-2026', 2026)).toEqual(['1957-1969']);
    expect(launchSources('shuttle-and-mir', 'upcoming', '2020-2026', 2026)).toEqual([
      '1980-1989',
      '1990-1999',
    ]);
    expect(launchSources('lunar-return', 'historic', '1970-1979', 2026)).toEqual([
      '2020-2026',
      'upcoming',
    ]);
    expect(launchSources('mars-era', 'historic', '1970-1979', 2026)).toEqual(['upcoming']);
  });
});

describe('listMode', () => {
  it('is the mode without an era; with one it says what the list holds', () => {
    expect(listMode('ALL', 'upcoming', 2026)).toBe('upcoming');
    expect(listMode('ALL', 'historic', 2026)).toBe('historic');
    expect(listMode('lunar-era', 'upcoming', 2026)).toBe('historic');
    expect(listMode('lunar-return', 'upcoming', 2026)).toBe('mixed');
    expect(listMode('mars-era', 'historic', 2026)).toBe('upcoming');
  });
});

describe('launchEra', () => {
  it('buckets by the launch year, the boundary year in the earlier era', () => {
    expect(launchEra(entry({ net: '1961-04-12T06:07:00Z' }))).toBe('first-steps');
    expect(launchEra(entry({ net: '1962-02-20T14:47:00Z' }))).toBe('space-race');
    expect(launchEra(entry({ net: '2031-01-01T00:00:00Z' }))).toBe('mars-era');
  });
});

describe('providers', () => {
  it('names a provider by its registry short name, in the manifest spelling otherwise', () => {
    expect(
      providerOf(entry({ agency_name: 'National Aeronautics and Space Administration' })),
    ).toBe('NASA');
    expect(providerOf(entry({ agency_name: 'RVSN' }))).toBe('RVSN');
  });
  it('counts two spellings of one agency as one chip', () => {
    const counts = providerCounts([
      entry({ agency_name: 'NASA' }),
      entry({ agency_name: 'National Aeronautics and Space Administration' }),
      entry({ agency_name: 'RVSN' }),
    ]);
    expect(counts.get('NASA')).toBe(2);
    expect(counts.get('RVSN')).toBe(1);
  });
});

describe('mergeEntries', () => {
  it('counts a launch that sits in two manifests once', () => {
    const a = entry({ id: 'a' });
    const merged = mergeEntries([{ entries: { a } }, { entries: { a, b: entry({ id: 'b' }) } }]);
    expect(merged.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });
});

describe('sortLaunches', () => {
  const list = [
    entry({ id: 'b', net: '2026-05-01T00:00:00Z', rocket_config_name: 'Zeta' }),
    entry({ id: 'a', net: '2026-03-01T00:00:00Z', rocket_config_name: 'Beta' }),
    entry({ id: 'c', net: '2026-04-01T00:00:00Z', rocket_config_name: 'Alpha' }),
  ];
  const label = (e: LaunchEntry) => e.rocket_config_name;
  it('oldest first (soonest first for the upcoming list)', () => {
    expect(sortLaunches(list, 'chrono-asc', label).map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });
  it('newest first', () => {
    expect(sortLaunches(list, 'chrono-desc', label).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('by vehicle name', () => {
    expect(sortLaunches(list, 'alpha', label).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });
});
