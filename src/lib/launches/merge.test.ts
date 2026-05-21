/**
 * Tests for the multi-source merge algorithm (PRD-020 / RFC-023 §4.3).
 */

import { describe, expect, it } from 'vitest';
import { mergeContributions, mergeAllContributions } from './merge.js';
import type { RawLaunchEntry } from './types.js';

const baseRaw = (overrides: Partial<RawLaunchEntry>): RawLaunchEntry => ({
  id: '2026-05-26-falcon-9-starlink-10-31',
  net: '2026-05-26T18:42:00.000Z',
  net_precision: 'minute',
  status: { code: 'GO', label: 'Go for Launch' },
  name: 'Falcon 9 Block 5 | Starlink Group 10-31',
  rocket_config_name: 'Falcon 9 Block 5',
  rocket_family: 'Falcon 9',
  agency_name: 'SpaceX',
  source_name: 'unknown',
  source_observed_at: '2026-05-19T14:30:00.000Z',
  ...overrides,
});

describe('mergeContributions', () => {
  it('keeps first-seen-wins on primary fields', () => {
    const fromSpx = baseRaw({
      source_name: 'spacex-direct',
      agency_name: 'SpaceX',
      pad_name: 'SLC-40',
    });
    const fromLl2 = baseRaw({
      source_name: 'll2',
      agency_name: 'SpaceX Commercial',
      pad_name: 'LC-40', // different value
      orbit_abbrev: 'LEO', // not provided by spacex contribution
    });
    const m = mergeContributions(fromSpx.id, [
      { source_name: 'spacex-direct', default_role: 'primary', entry: fromSpx },
      { source_name: 'll2', default_role: 'fallback-primary', entry: fromLl2 },
    ]);
    expect(m.entry.pad_name).toBe('SLC-40'); // first-seen-wins
    expect(m.entry.orbit_abbrev).toBe('LEO'); // augmented from ll2
  });

  it('records augmented-with role for contributions that fill new fields', () => {
    const fromSpx = baseRaw({
      source_name: 'spacex-direct',
      agency_name: 'SpaceX',
    });
    const fromLl2 = baseRaw({
      source_name: 'll2',
      agency_name: 'SpaceX',
      orbit_abbrev: 'LEO',
      orbit_name: 'Low Earth Orbit',
    });
    const m = mergeContributions(fromSpx.id, [
      { source_name: 'spacex-direct', default_role: 'primary', entry: fromSpx },
      { source_name: 'll2', default_role: 'fallback-primary', entry: fromLl2 },
    ]);
    expect(m.provenance_chain.map((p) => p.role)).toEqual(['primary', 'augmented-with']);
  });

  it('records confirmed-via role for contributions that add nothing new', () => {
    const fromSpx = baseRaw({
      source_name: 'spacex-direct',
      orbit_abbrev: 'LEO',
    });
    const fromLl2 = baseRaw({
      source_name: 'll2',
      orbit_abbrev: 'LEO',
    });
    const m = mergeContributions(fromSpx.id, [
      { source_name: 'spacex-direct', default_role: 'primary', entry: fromSpx },
      { source_name: 'll2', default_role: 'fallback-primary', entry: fromLl2 },
    ]);
    expect(m.provenance_chain.map((p) => p.role)).toEqual(['primary', 'confirmed-via']);
  });

  it('captures disagreements when two providers differ on a primary field', () => {
    const fromSpx = baseRaw({ source_name: 'spacex-direct', pad_name: 'SLC-40' });
    const fromLl2 = baseRaw({ source_name: 'll2', pad_name: 'LC-40' });
    const m = mergeContributions(fromSpx.id, [
      { source_name: 'spacex-direct', default_role: 'primary', entry: fromSpx },
      { source_name: 'll2', default_role: 'fallback-primary', entry: fromLl2 },
    ]);
    expect(m.disagreements).toHaveLength(1);
    expect(m.disagreements[0]).toMatchObject({
      field: 'pad_name',
      winning_source: 'spacex-direct',
      losing_source: 'll2',
      winning_value: 'SLC-40',
      losing_value: 'LC-40',
    });
  });

  it('throws on empty contributions', () => {
    expect(() => mergeContributions('x', [])).toThrow();
  });
});

describe('mergeAllContributions', () => {
  it('groups by stable id and merges per group', () => {
    const sputnik = baseRaw({
      id: '1957-10-04-sputnik-8k71ps-ps-1',
      net: '1957-10-04T19:28:34.000Z',
      rocket_family: 'Sputnik 8K71PS',
      source_name: 'gcat',
    });
    const apollo = baseRaw({
      id: '1969-07-16-saturn-v-apollo-cm-107',
      net: '1969-07-16T13:32:00.000Z',
      rocket_family: 'Saturn V',
      source_name: 'gcat',
    });
    const result = mergeAllContributions([
      { source_name: 'gcat', default_role: 'primary', entries: [sputnik, apollo] },
    ]);
    expect(Object.keys(result.merged).sort()).toEqual([
      '1957-10-04-sputnik-8k71ps-ps-1',
      '1969-07-16-saturn-v-apollo-cm-107',
    ]);
  });

  it('disambiguates same-day same-vehicle collisions with -2 suffix', () => {
    const collision1 = baseRaw({
      id: '2026-05-26-falcon-9-starlink',
      mission_name: 'Starlink batch A',
      source_name: 'll2',
    });
    const collision2 = baseRaw({
      id: '2026-05-26-falcon-9-starlink',
      mission_name: 'Starlink batch B',
      source_name: 'll2',
    });
    const result = mergeAllContributions([
      { source_name: 'll2', default_role: 'fallback-primary', entries: [collision1, collision2] },
    ]);
    expect(Object.keys(result.merged).sort()).toEqual([
      '2026-05-26-falcon-9-starlink',
      '2026-05-26-falcon-9-starlink-2',
    ]);
    expect(result.collisionCounter['2026-05-26-falcon-9-starlink']).toBe(2);
  });
});
