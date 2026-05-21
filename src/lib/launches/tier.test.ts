import { describe, expect, it } from 'vitest';
import { buildFirstFlightMap, computeTier, defaultIsCrewed } from './tier.js';
import type { CurationFile } from './tier.js';
import type { RawLaunchEntry } from './types.js';

const base = (over: Partial<RawLaunchEntry> = {}): RawLaunchEntry => ({
  id: 'x',
  net: '2026-05-26T18:42:00.000Z',
  net_precision: 'minute',
  status: { code: 'GO', label: 'Go' },
  name: 'X',
  rocket_config_name: 'Falcon 9 Block 5',
  rocket_family: 'Falcon 9',
  rocket_config_id: 'falcon-9-block-5',
  agency_name: 'SpaceX',
  source_name: 'll2',
  source_observed_at: '2026-05-19T00:00:00.000Z',
  ...over,
});

const emptyCuration: CurationFile = { version: 1, featured: [], demoted: [] };
const noFirstFlight = {
  firstFlightByConfig: new Map<string, { earliestNet: string; count: number }>(),
};

describe('defaultIsCrewed', () => {
  it('detects mission_type=Human Spaceflight', () => {
    expect(defaultIsCrewed(base({ mission_type: 'Human Spaceflight' }))).toBe(true);
  });
  it('detects crew program mission names', () => {
    expect(defaultIsCrewed(base({ mission_name: 'Crew-12' }))).toBe(true);
    expect(defaultIsCrewed(base({ mission_name: 'Shenzhou 23' }))).toBe(true);
    expect(defaultIsCrewed(base({ mission_name: 'Artemis II' }))).toBe(true);
  });
  it('returns false for routine missions', () => {
    expect(defaultIsCrewed(base({ mission_name: 'Starlink Group 10-31' }))).toBe(false);
  });
});

describe('computeTier — overrides', () => {
  it('featured override → T1', () => {
    const curation: CurationFile = {
      version: 1,
      featured: [{ launch_id: 'x', reason: 'banger', editorial_note: 'great launch' }],
      demoted: [],
    };
    const r = computeTier(base(), curation, noFirstFlight);
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('featured-override');
    expect(r.editorial_note).toBe('great launch');
  });

  it('demoted override → T4', () => {
    const curation: CurationFile = {
      version: 1,
      featured: [],
      demoted: [{ launch_id: 'x', reason: 'routine' }],
    };
    const r = computeTier(base(), curation, noFirstFlight);
    expect(r.tier).toBe('T4');
    expect(r.tier_reason).toBe('demoted-override');
  });

  it('featured override wins over crewed heuristic', () => {
    const curation: CurationFile = {
      version: 1,
      featured: [{ launch_id: 'x', reason: 'featured' }],
      demoted: [],
    };
    const r = computeTier(
      base({ mission_type: 'Human Spaceflight' }),
      curation,
      noFirstFlight,
    );
    expect(r.tier_reason).toBe('featured-override');
  });
});

describe('computeTier — heuristic', () => {
  it('crewed mission → T1 / crewed', () => {
    const r = computeTier(
      base({ mission_name: 'Crew-12' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('crewed');
  });

  it('lunar orbit → T1 / lunar', () => {
    const r = computeTier(
      base({ orbit_abbrev: 'LO' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('lunar');
  });

  it('GTO → T1 / interplanetary (bucket)', () => {
    const r = computeTier(
      base({ orbit_abbrev: 'GTO' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('interplanetary');
  });

  it('Mars destination → T1 / mars', () => {
    const r = computeTier(
      base({ orbit_abbrev: 'MARS' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier_reason).toBe('mars');
  });

  it('Starlink batch in LEO → T4 / routine-constellation', () => {
    const r = computeTier(
      base({ orbit_abbrev: 'LEO', mission_name: 'Starlink Group 10-31' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier).toBe('T4');
    expect(r.tier_reason).toBe('routine-constellation');
  });

  it('LEO non-constellation → T3 / standard', () => {
    const r = computeTier(
      base({ orbit_abbrev: 'LEO', mission_name: 'CRS-31' }),
      emptyCuration,
      noFirstFlight,
    );
    expect(r.tier).toBe('T3');
    expect(r.tier_reason).toBe('standard');
  });

  it('first-flight-vehicle when entry net matches the earliest for its family AND count >= 2', () => {
    const e = base({ rocket_family: 'Starship', orbit_abbrev: 'LEO' });
    const ctx = {
      firstFlightByConfig: new Map([
        ['Starship', { earliestNet: e.net, count: 2 }],
      ]),
    };
    const r = computeTier(e, emptyCuration, ctx);
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('first-flight-vehicle');
  });

  it('does NOT tag first-flight when only one entry exists for the family (false-positive guard)', () => {
    const e = base({ rocket_family: 'Rare Rocket', orbit_abbrev: 'LEO' });
    const ctx = {
      firstFlightByConfig: new Map([
        ['Rare Rocket', { earliestNet: e.net, count: 1 }],
      ]),
    };
    const r = computeTier(e, emptyCuration, ctx);
    expect(r.tier).toBe('T3');
    expect(r.tier_reason).toBe('standard');
  });
});

describe('buildFirstFlightMap', () => {
  it('picks the earliest net per rocket_family', () => {
    const a = base({
      rocket_family: 'Falcon 9',
      net: '2010-06-04T18:45:00.000Z',
    });
    const b = base({
      rocket_family: 'Falcon 9',
      net: '2026-05-26T18:42:00.000Z',
    });
    const map = buildFirstFlightMap([a, b]);
    expect(map.get('Falcon 9')).toEqual({
      earliestNet: '2010-06-04T18:45:00.000Z',
      count: 2,
    });
  });

  it('skips entries with no rocket_family', () => {
    const a = base({ rocket_family: '' });
    const map = buildFirstFlightMap([a]);
    expect(map.size).toBe(0);
  });
});
