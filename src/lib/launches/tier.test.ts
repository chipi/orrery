import { describe, expect, it } from 'vitest';
import { buildFirstFlightIds, computeTier, defaultIsCrewed } from './tier.js';
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
const noFirstFlight = { firstFlightIds: new Set<string>() };

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
    const r = computeTier(base({ mission_type: 'Human Spaceflight' }), curation, noFirstFlight);
    expect(r.tier_reason).toBe('featured-override');
  });
});

describe('computeTier — heuristic', () => {
  it('crewed mission → T1 / crewed', () => {
    const r = computeTier(base({ mission_name: 'Crew-12' }), emptyCuration, noFirstFlight);
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('crewed');
  });

  it('lunar orbit → T1 / lunar', () => {
    const r = computeTier(base({ orbit_abbrev: 'LO' }), emptyCuration, noFirstFlight);
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('lunar');
  });

  it('GTO → T1 / interplanetary (bucket)', () => {
    const r = computeTier(base({ orbit_abbrev: 'GTO' }), emptyCuration, noFirstFlight);
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('interplanetary');
  });

  it('Mars destination → T1 / mars', () => {
    const r = computeTier(base({ orbit_abbrev: 'MARS' }), emptyCuration, noFirstFlight);
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

  it('first-flight-vehicle when the entry is in firstFlightIds', () => {
    const e = base({ id: 'starship-1', rocket_family: 'Starship', orbit_abbrev: 'LEO' });
    const r = computeTier(e, emptyCuration, { firstFlightIds: new Set(['starship-1']) });
    expect(r.tier).toBe('T1');
    expect(r.tier_reason).toBe('first-flight-vehicle');
  });

  it('beyond-LEO outranks first-flight', () => {
    const e = base({ id: 'm', orbit_abbrev: 'MARS' });
    const r = computeTier(e, emptyCuration, { firstFlightIds: new Set(['m']) });
    expect(r.tier_reason).toBe('mars');
  });
});

describe('buildFirstFlightIds — upcoming (source launch counts)', () => {
  const upcoming = (over: Partial<RawLaunchEntry>) =>
    base({ source_name: 'll2', orbit_abbrev: 'LEO', ...over });

  it('flags the earliest pending launch of a configuration with 0 prior launches', () => {
    const ids = buildFirstFlightIds([
      upcoming({
        id: 'neutron-2',
        rocket_config_id: '9',
        rocket_config_prior_launches: 0,
        net: '2027-03-01T00:00:00.000Z',
      }),
      upcoming({
        id: 'neutron-1',
        rocket_config_id: '9',
        rocket_config_prior_launches: 0,
        net: '2026-12-31T00:00:00.000Z',
      }),
    ]);
    expect([...ids]).toEqual(['neutron-1']);
  });

  it('never flags a configuration that has already flown, whatever the family names say', () => {
    const ids = buildFirstFlightIds([
      upcoming({
        id: 'bandwagon-5',
        rocket_family: 'Falcon 9',
        rocket_config_id: '164',
        rocket_config_prior_launches: 637,
      }),
    ]);
    expect(ids.size).toBe(0);
  });

  it('does not flag without a launch count (source did not say)', () => {
    const ids = buildFirstFlightIds([upcoming({ id: 'a', rocket_config_id: '1' })]);
    expect(ids.size).toBe(0);
  });

  it('flags only one of several maiden-flight candidates sharing the earliest date', () => {
    const net = '2026-12-31T00:00:00.000Z';
    const ids = buildFirstFlightIds([
      upcoming({ id: 'alpha-a', rocket_config_id: '7', rocket_config_prior_launches: 0, net }),
      upcoming({ id: 'alpha-b', rocket_config_id: '7', rocket_config_prior_launches: 0, net }),
    ]);
    expect([...ids]).toEqual(['alpha-a']);
  });

  it('does not let a historic GCAT family make an upcoming launch a first flight', () => {
    const ids = buildFirstFlightIds([
      base({
        id: 'g1',
        source_name: 'gcat',
        rocket_family: 'Soyuz 2.1b',
        net: '2006-12-27T00:00:00.000Z',
      }),
      upcoming({
        id: 'u1',
        rocket_family: 'Soyuz 2.1b',
        rocket_config_id: '30',
        rocket_config_prior_launches: 80,
      }),
    ]);
    expect(ids.has('u1')).toBe(false);
  });
});

describe('buildFirstFlightIds — historic (GCAT)', () => {
  const gcat = (over: Partial<RawLaunchEntry>) => base({ source_name: 'gcat', ...over });

  it('flags the earliest GCAT launch of a family with at least two GCAT launches', () => {
    const ids = buildFirstFlightIds([
      gcat({ id: 'f9-2', rocket_family: 'Falcon 9', net: '2010-12-08T15:43:00.000Z' }),
      gcat({ id: 'f9-1', rocket_family: 'Falcon 9', net: '2010-06-04T18:45:00.000Z' }),
    ]);
    expect([...ids]).toEqual(['f9-1']);
  });

  it('does NOT flag a family with a single GCAT launch (ambiguous)', () => {
    const ids = buildFirstFlightIds([gcat({ id: 'rare', rocket_family: 'Rare Rocket' })]);
    expect(ids.size).toBe(0);
  });

  it('skips entries with no rocket_family', () => {
    const ids = buildFirstFlightIds([
      gcat({ id: 'a', rocket_family: '' }),
      gcat({ id: 'b', rocket_family: '' }),
    ]);
    expect(ids.size).toBe(0);
  });
});

describe('buildFirstFlightIds — curated first_flight_configs (#603)', () => {
  const ll2 = (over: Partial<RawLaunchEntry>) => base({ source_name: 'll2', ...over });

  it("flags the earliest launch of a curated config the counts can't see", () => {
    // Long March 10: LL2 counts the family, so the config-count rule stays silent.
    const entries = [
      ll2({
        id: 'lm10-2',
        rocket_config_id: '536',
        rocket_config_prior_launches: 1, // family count stands in for the generic config
        rocket_config_own_launches: 0,
        net: '2028-06-01T00:00:00.000Z',
      }),
      ll2({
        id: 'lm10-1',
        rocket_config_id: '536',
        rocket_config_prior_launches: 1,
        rocket_config_own_launches: 0,
        net: '2027-12-31T00:00:00.000Z',
      }),
    ];
    expect(buildFirstFlightIds(entries).size).toBe(0);
    expect([...buildFirstFlightIds(entries, ['536'])]).toEqual(['lm10-1']);
  });

  it('flags nothing for a config that is not curated (Vulcan/H3 look the same in the data)', () => {
    const ids = buildFirstFlightIds(
      [
        ll2({
          id: 'vulcan-5',
          rocket_config_id: '200',
          rocket_config_own_launches: 0,
          net: '2026-11-01T00:00:00.000Z',
        }),
      ],
      ['536'],
    );
    expect(ids.size).toBe(0);
  });

  it('stops flagging once the config has flown: its second launch is not a first flight', () => {
    // The maiden flight has left LL2's upcoming feed (GCAT's copy carries no
    // config id); what remains is the next launch, and LL2 now counts 1.
    const ids = buildFirstFlightIds(
      [
        ll2({
          id: 'lm10-second',
          rocket_config_id: '536',
          rocket_config_own_launches: 1,
          net: '2028-03-01T00:00:00.000Z',
        }),
      ],
      ['536'],
    );
    expect(ids.size).toBe(0);
  });

  it('does not flag a curated config when the source gives no own count', () => {
    const ids = buildFirstFlightIds(
      [ll2({ id: 'x', rocket_config_id: '536', net: '2027-12-31T00:00:00.000Z' })],
      ['536'],
    );
    expect(ids.size).toBe(0);
  });
});
