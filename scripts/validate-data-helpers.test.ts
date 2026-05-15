import { describe, it, expect } from 'vitest';
import {
  isWaived,
  findBidirectionalFleetMissionDrift,
  findBidirectionalFleetSiteDrift,
  findProvenanceFailures,
  type LicenseWaiver,
  type FleetEntryMinimal,
  type FleetRef,
  type ProvenanceRow,
  type SiteType,
} from './validate-data-helpers.js';

// ─── isWaived ────────────────────────────────────────────────────────

describe('isWaived (ADR-047 license waiver matching)', () => {
  it('returns false when waivers is empty', () => {
    expect(isWaived([], 'restricted-permission', '/images/foo.jpg')).toBe(false);
  });

  it('returns false when waiver matches license but not path', () => {
    const waivers: LicenseWaiver[] = [
      { license_short: 'restricted-permission', scope: '/images/bar.jpg' },
    ];
    expect(isWaived(waivers, 'restricted-permission', '/images/foo.jpg')).toBe(false);
  });

  it('returns false when waiver matches path but not license', () => {
    const waivers: LicenseWaiver[] = [{ license_short: 'CC-BY', scope: '/images/foo.jpg' }];
    expect(isWaived(waivers, 'restricted-permission', '/images/foo.jpg')).toBe(false);
  });

  it("returns true on scope: 'all'", () => {
    const waivers: LicenseWaiver[] = [{ license_short: 'airandspacehistory', scope: 'all' }];
    expect(isWaived(waivers, 'airandspacehistory', '/images/soyuz/01.jpg')).toBe(true);
    expect(isWaived(waivers, 'airandspacehistory', '/images/anything/else.jpg')).toBe(true);
  });

  it('returns true on exact path match', () => {
    const waivers: LicenseWaiver[] = [
      { license_short: 'partner-permission', scope: '/images/fleet-galleries/saturn-v/01.jpg' },
    ];
    expect(isWaived(waivers, 'partner-permission', '/images/fleet-galleries/saturn-v/01.jpg')).toBe(
      true,
    );
  });

  it('returns true on glob-prefix match (scope ending in /*)', () => {
    const waivers: LicenseWaiver[] = [
      { license_short: 'partner-permission', scope: '/images/fleet-galleries/saturn-v/*' },
    ];
    expect(isWaived(waivers, 'partner-permission', '/images/fleet-galleries/saturn-v/01.jpg')).toBe(
      true,
    );
    expect(isWaived(waivers, 'partner-permission', '/images/fleet-galleries/saturn-v/02.jpg')).toBe(
      true,
    );
    // Sibling directory must NOT match.
    expect(
      isWaived(waivers, 'partner-permission', '/images/fleet-galleries/saturn-1b/01.jpg'),
    ).toBe(false);
  });

  it("does not treat 'all' as a prefix — it is an exact sentinel", () => {
    const waivers: LicenseWaiver[] = [{ license_short: 'foo', scope: 'all' }];
    // 'all' applies to any path with the same license; that's already covered.
    // But a waiver with scope: 'alligator/*' must NOT bleed into 'all' semantics.
    const waivers2: LicenseWaiver[] = [{ license_short: 'foo', scope: 'alligator/*' }];
    expect(isWaived(waivers2, 'foo', '/images/foo.jpg')).toBe(false);
    // Real 'all' still works:
    expect(isWaived(waivers, 'foo', '/images/foo.jpg')).toBe(true);
  });

  it('honours multiple waivers and short-circuits on the first match', () => {
    const waivers: LicenseWaiver[] = [
      { license_short: 'a', scope: '/x.jpg' },
      { license_short: 'b', scope: 'all' },
      { license_short: 'c', scope: '/y.jpg' },
    ];
    expect(isWaived(waivers, 'b', '/anything.jpg')).toBe(true);
    expect(isWaived(waivers, 'a', '/x.jpg')).toBe(true);
    expect(isWaived(waivers, 'c', '/y.jpg')).toBe(true);
    expect(isWaived(waivers, 'c', '/x.jpg')).toBe(false);
  });
});

// ─── findBidirectionalFleetMissionDrift (ADR-052 mission link) ───────

describe('findBidirectionalFleetMissionDrift (ADR-052 / RFC-016 OQ-2)', () => {
  const baseEntry = (
    overrides: Partial<FleetEntryMinimal> & { id: string },
  ): FleetEntryMinimal => ({
    id: overrides.id,
    category: 'launcher',
    ...overrides,
  });

  it('returns empty errors when corpus is clean (symmetric refs)', () => {
    const fleet: FleetEntryMinimal[] = [
      baseEntry({ id: 'saturn-v', linked_missions: ['apollo11'] }),
    ];
    const missionFleetRefs = new Map<string, FleetRef[]>([
      ['apollo11', [{ id: 'saturn-v', role: 'launcher' }]],
    ]);
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toEqual([]);
  });

  it('Check 1: surfaces fleet → missing mission', () => {
    const fleet = [baseEntry({ id: 'saturn-v', linked_missions: ['ghost-mission'] })];
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs: new Map(),
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      kind: 'fleet-linked-mission-unresolved',
      fleet_id: 'saturn-v',
      fleet_category: 'launcher',
      missing_mission_id: 'ghost-mission',
    });
  });

  it('Check 1: emits one error per dangling mission id (preserves count)', () => {
    const fleet = [baseEntry({ id: 'saturn-v', linked_missions: ['a', 'b', 'c'] })];
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs: new Map(),
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => 'missing_mission_id' in e && e.missing_mission_id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('Check 2: surfaces mission → ghost fleet ref', () => {
    const fleet: FleetEntryMinimal[] = [];
    const missionFleetRefs = new Map<string, FleetRef[]>([
      ['apollo11', [{ id: 'ghost-fleet', role: 'launcher' }]],
    ]);
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      kind: 'mission-fleet-ref-unresolved',
      mission_id: 'apollo11',
      fleet_id: 'ghost-fleet',
      role: 'launcher',
    });
  });

  it('Check 3: surfaces SYMMETRY drift — mission references fleet but fleet does not list mission', () => {
    // The critical ADR-052 invariant.
    const fleet = [baseEntry({ id: 'saturn-v', linked_missions: [] })]; // No reverse pointer
    const missionFleetRefs = new Map<string, FleetRef[]>([
      ['apollo11', [{ id: 'saturn-v', role: 'launcher' }]],
    ]);
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      kind: 'bidirectional-drift-mission',
      mission_id: 'apollo11',
      fleet_id: 'saturn-v',
      role: 'launcher',
    });
  });

  it('Check 3: does not double-report when ref is also unresolved (Check 2 short-circuits)', () => {
    // If fleet entry doesn't exist at all, only Check 2 fires — not Check 3.
    const missionFleetRefs = new Map<string, FleetRef[]>([
      ['apollo11', [{ id: 'ghost-fleet', role: 'launcher' }]],
    ]);
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs,
      fleetEntries: [],
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('mission-fleet-ref-unresolved');
  });

  it('handles missions referencing multiple fleet roles correctly', () => {
    // Apollo 11 should reference saturn-v (launcher) + apollo-csm + apollo-lm + a7l
    const fleet: FleetEntryMinimal[] = [
      baseEntry({ id: 'saturn-v', linked_missions: ['apollo11'] }),
      baseEntry({ id: 'apollo-csm', category: 'crewed-spacecraft', linked_missions: ['apollo11'] }),
      baseEntry({ id: 'apollo-lm', category: 'lander', linked_missions: ['apollo11'] }),
      // a7l is missing the reverse pointer — drift
      baseEntry({ id: 'a7l', category: 'space-suit', linked_missions: [] }),
    ];
    const missionFleetRefs = new Map<string, FleetRef[]>([
      [
        'apollo11',
        [
          { id: 'saturn-v', role: 'launcher' },
          { id: 'apollo-csm', role: 'spacecraft' },
          { id: 'apollo-lm', role: 'spacecraft' },
          { id: 'a7l', role: 'spacecraft' },
        ],
      ],
    ]);
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(['apollo11']),
      missionFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      kind: 'bidirectional-drift-mission',
      fleet_id: 'a7l',
    });
  });

  it('ignores fleet entries with no linked_missions field', () => {
    const fleet = [baseEntry({ id: 'iss', category: 'station' })]; // no linked_missions
    const errors = findBidirectionalFleetMissionDrift({
      missionIds: new Set(),
      missionFleetRefs: new Map(),
      fleetEntries: fleet,
    });
    expect(errors).toEqual([]);
  });
});

// ─── findBidirectionalFleetSiteDrift (ADR-052 site link) ─────────────

describe('findBidirectionalFleetSiteDrift (ADR-052 / RFC-016 OQ-16)', () => {
  it('returns empty errors when corpus is clean (symmetric refs)', () => {
    const fleet: FleetEntryMinimal[] = [
      {
        id: 'apollo-lm',
        category: 'lander',
        linked_sites: [{ type: 'moon', site_id: 'tranquillity-base' }],
      },
    ];
    const siteFleetRefs = new Map<string, Array<{ type: SiteType; refs: FleetRef[] }>>([
      ['tranquillity-base', [{ type: 'moon', refs: [{ id: 'apollo-lm', role: 'spacecraft' }] }]],
    ]);
    const siteIdsByType = new Map<SiteType, Set<string>>([
      ['moon', new Set(['tranquillity-base'])],
    ]);
    const errors = findBidirectionalFleetSiteDrift({
      siteIdsByType,
      siteFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toEqual([]);
  });

  it('Check 1: surfaces fleet → missing site', () => {
    const fleet: FleetEntryMinimal[] = [
      {
        id: 'apollo-lm',
        category: 'lander',
        linked_sites: [{ type: 'moon', site_id: 'ghost-site' }],
      },
    ];
    const errors = findBidirectionalFleetSiteDrift({
      siteIdsByType: new Map([['moon', new Set<string>()]]),
      siteFleetRefs: new Map(),
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      kind: 'fleet-linked-site-unresolved',
      site_type: 'moon',
      site_id: 'ghost-site',
    });
  });

  it('Check 3: surfaces SYMMETRY drift — site references fleet but fleet does not list site', () => {
    const fleet: FleetEntryMinimal[] = [{ id: 'apollo-lm', category: 'lander', linked_sites: [] }];
    const siteFleetRefs = new Map<string, Array<{ type: SiteType; refs: FleetRef[] }>>([
      ['tranquillity-base', [{ type: 'moon', refs: [{ id: 'apollo-lm', role: 'spacecraft' }] }]],
    ]);
    const errors = findBidirectionalFleetSiteDrift({
      siteIdsByType: new Map([['moon', new Set(['tranquillity-base'])]]),
      siteFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toEqual({
      kind: 'bidirectional-drift-site',
      site_type: 'moon',
      site_id: 'tranquillity-base',
      fleet_id: 'apollo-lm',
      role: 'spacecraft',
    });
  });

  it('respects (type, site_id) keying — same id across moon/mars/earth-object scopes', () => {
    // Hypothetical: an earth-object id collides with a moon site id.
    // The drift check must scope correctly — a fleet reference to the
    // wrong type must NOT silently satisfy a reference of the right type.
    const fleet: FleetEntryMinimal[] = [
      {
        id: 'duplicate-id-vehicle',
        category: 'orbiter',
        linked_sites: [{ type: 'earth-object', site_id: 'duplicate-id' }],
      },
    ];
    const siteFleetRefs = new Map<string, Array<{ type: SiteType; refs: FleetRef[] }>>([
      // The moon site references the fleet, but the fleet only acknowledges
      // the earth-object site. That's drift.
      [
        'duplicate-id',
        [
          {
            type: 'moon',
            refs: [{ id: 'duplicate-id-vehicle', role: 'spacecraft' }],
          },
        ],
      ],
    ]);
    const errors = findBidirectionalFleetSiteDrift({
      siteIdsByType: new Map<SiteType, Set<string>>([
        ['moon', new Set(['duplicate-id'])],
        ['earth-object', new Set(['duplicate-id'])],
      ]),
      siteFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].kind).toBe('bidirectional-drift-site');
    if (errors[0].kind === 'bidirectional-drift-site') {
      expect(errors[0].site_type).toBe('moon');
    }
  });

  it('surfaces both Check 2 (unresolved fleet) and Check 1 (unresolved site) in same run', () => {
    const fleet: FleetEntryMinimal[] = [
      {
        id: 'apollo-lm',
        category: 'lander',
        linked_sites: [{ type: 'moon', site_id: 'ghost-site' }],
      },
    ];
    const siteFleetRefs = new Map<string, Array<{ type: SiteType; refs: FleetRef[] }>>([
      ['tranquillity-base', [{ type: 'moon', refs: [{ id: 'ghost-fleet', role: 'spacecraft' }] }]],
    ]);
    const errors = findBidirectionalFleetSiteDrift({
      siteIdsByType: new Map([['moon', new Set(['tranquillity-base'])]]),
      siteFleetRefs,
      fleetEntries: fleet,
    });
    expect(errors).toHaveLength(2);
    const kinds = errors.map((e) => e.kind).sort();
    expect(kinds).toEqual(['fleet-linked-site-unresolved', 'site-fleet-ref-unresolved']);
  });
});

// ─── findProvenanceFailures (ADR-047 image-provenance integrity) ────

describe('findProvenanceFailures (ADR-047 Milestone C)', () => {
  const isAllowed = (lic: string) => ['CC-BY', 'PD-USGov-NASA', 'CC-BY-SA'].includes(lic);
  const existsOnDisk = () => true; // assume all paths exist for clean tests

  it('returns empty failures for a clean manifest', () => {
    const entries: ProvenanceRow[] = [
      { path: '/images/a.jpg', license_short: 'CC-BY' },
      { path: '/images/b.jpg', license_short: 'PD-USGov-NASA' },
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk,
    });
    expect(failures).toEqual([]);
  });

  it('flags duplicate paths', () => {
    const entries: ProvenanceRow[] = [
      { path: '/images/a.jpg', license_short: 'CC-BY' },
      { path: '/images/a.jpg', license_short: 'CC-BY' },
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk,
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({ kind: 'duplicate-path', path: '/images/a.jpg' });
  });

  it('flags disallowed license when no waiver applies', () => {
    const entries: ProvenanceRow[] = [
      { path: '/images/x.jpg', license_short: 'restricted-permission' },
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk,
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toEqual({
      kind: 'license-not-allowed',
      path: '/images/x.jpg',
      license_short: 'restricted-permission',
    });
  });

  it('allows disallowed license when covered by a waiver', () => {
    const entries: ProvenanceRow[] = [
      { path: '/images/airandspacehistory/soyuz-1.jpg', license_short: 'partner-permission' },
    ];
    const waivers: LicenseWaiver[] = [
      { license_short: 'partner-permission', scope: '/images/airandspacehistory/*' },
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers,
      isAllowed,
      existsOnDisk,
    });
    expect(failures).toEqual([]);
  });

  it('flags missing on-disk file', () => {
    const entries: ProvenanceRow[] = [{ path: '/images/ghost.jpg', license_short: 'CC-BY' }];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk: () => false,
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      kind: 'missing-file',
      path: '/images/ghost.jpg',
      on_disk_path: 'static/images/ghost.jpg',
    });
  });

  it('handles paths without leading slash gracefully', () => {
    const entries: ProvenanceRow[] = [
      { path: 'images/no-leading-slash.jpg', license_short: 'CC-BY' },
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk: (p) => p === 'static/images/no-leading-slash.jpg',
    });
    expect(failures).toEqual([]);
  });

  it('surfaces all three failure kinds in one pass and preserves order', () => {
    // The provenance check is non-aborting — every failure surfaces so
    // operators can fix them in one round-trip.
    const entries: ProvenanceRow[] = [
      { path: '/images/dup.jpg', license_short: 'CC-BY' },
      { path: '/images/dup.jpg', license_short: 'CC-BY' }, // duplicate
      { path: '/images/bad.jpg', license_short: 'restricted-permission' }, // license fails + may also miss on disk
    ];
    const failures = findProvenanceFailures({
      entries,
      waivers: [],
      isAllowed,
      existsOnDisk: (p) => !p.includes('bad.jpg'), // bad.jpg is also missing on disk
    });
    // dup.jpg duplicate + bad.jpg license + bad.jpg missing-file = 3
    expect(failures).toHaveLength(3);
    const kinds = failures.map((f) => f.kind);
    expect(kinds).toContain('duplicate-path');
    expect(kinds).toContain('license-not-allowed');
    expect(kinds).toContain('missing-file');
  });
});
