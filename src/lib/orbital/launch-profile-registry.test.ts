import { describe, it, expect } from 'vitest';
import {
  missionLauncherId,
  resolveLauncher,
  hasLaunchProfile,
  buildGenericProfile,
  loadLaunchProfile,
  atlasVSrbCount,
} from './launch-profile-registry';
import { integrateAscent } from './ascent-physics';

describe('missionLauncherId', () => {
  it('returns the fleet_refs entry with role launcher', () => {
    expect(
      missionLauncherId([
        { id: 'dragon', role: 'payload' },
        { id: 'falcon-9', role: 'launcher' },
      ]),
    ).toBe('falcon-9');
  });

  it('returns undefined when there is no launcher ref', () => {
    expect(missionLauncherId(undefined)).toBeUndefined();
    expect(missionLauncherId([{ id: 'dragon', role: 'payload' }])).toBeUndefined();
  });
});

describe('resolveLauncher — fleet_refs precedence + vehicle fallback', () => {
  it('prefers the fleet_refs launcher id, labelled with the flown vehicle', () => {
    expect(resolveLauncher([{ id: 'saturn-v', role: 'launcher' }], 'Saturn V SA-506')).toEqual({
      id: 'saturn-v',
      name: 'Saturn V SA-506',
    });
  });

  it('falls back to the free-text vehicle string when no refs', () => {
    expect(resolveLauncher(undefined, 'Falcon 9 Block 5')).toEqual({
      id: 'falcon-9',
      name: 'Falcon 9 Block 5',
    });
  });

  it('slugs an unknown vehicle into a stable generic id', () => {
    expect(resolveLauncher(undefined, 'Long March 3B')).toEqual({
      id: 'long-march-3b',
      name: 'Long March 3B',
    });
  });

  it('returns null when the mission names neither a ref nor a vehicle', () => {
    expect(resolveLauncher(undefined, undefined)).toBeNull();
    expect(resolveLauncher([], undefined)).toBeNull();
  });
});

describe('matchFlagship — every flagship id reachable from free text (#6)', () => {
  // One representative free-text spelling per FLAGSHIP_IDS entry (all 11).
  const cases: [string, string][] = [
    ['Falcon 9 Block 5', 'falcon-9'],
    ['Atlas V 541', 'atlas-v'],
    ['Atlas LV-3B (Mercury-Atlas)', 'atlas-lv-3b'],
    ['Saturn V', 'saturn-v'],
    ['Saturn IB', 'saturn-ib'],
    ['Titan II GLV', 'titan-ii-glv'],
    ['Proton-K', 'proton-k'],
    ['Vostok-K', 'vostok-k'],
    ['Ariane 5 ECA', 'ariane-5'],
    ['H-IIA 202', 'h-iia'],
    ['Space Shuttle Columbia', 'space-shuttle-stack'],
  ];

  it.each(cases)('resolves %s → %s (not silently generic)', (vehicle, id) => {
    expect(resolveLauncher(undefined, vehicle)).toEqual({ id, name: vehicle });
  });

  it('does not confuse Atlas V with Atlas LV-3B', () => {
    expect(resolveLauncher(undefined, 'Atlas V 401')!.id).toBe('atlas-v');
    expect(resolveLauncher(undefined, 'Atlas LV-3B')!.id).toBe('atlas-lv-3b');
  });

  it('does not confuse Saturn V with Saturn IB', () => {
    expect(resolveLauncher(undefined, 'Saturn V')!.id).toBe('saturn-v');
    expect(resolveLauncher(undefined, 'Saturn IB')!.id).toBe('saturn-ib');
  });

  it('does not match Titan IIIE (Voyager/Viking) to the Gemini Titan II GLV', () => {
    expect(resolveLauncher(undefined, 'Titan II GLV (GT-3)')!.id).toBe('titan-ii-glv');
    // Titan IIIE / Centaur is a different, interplanetary booster — must NOT
    // resolve to the 2-stage Gemini launcher (it slugs to a generic profile).
    expect(resolveLauncher(undefined, 'Titan IIIE / Centaur')!.id).not.toBe('titan-ii-glv');
  });
});

describe('hasLaunchProfile', () => {
  it('true with a launcher ref or a vehicle string, false with neither', () => {
    expect(hasLaunchProfile([{ id: 'falcon-9', role: 'launcher' }])).toBe(true);
    expect(hasLaunchProfile(undefined, 'Some Rocket')).toBe(true);
    expect(hasLaunchProfile(undefined, undefined)).toBe(false);
  });
});

describe('buildGenericProfile', () => {
  const p = buildGenericProfile('long-march-3b', 'Long March 3B');

  it('is a representative generic tier with a plausible 2-stage shape', () => {
    expect(p.source_tier).toBe('generic');
    expect(p.name).toBe('Long March 3B');
    expect(p.stages).toHaveLength(2);
    expect(p.stages[0].wetKg).toBeGreaterThan(p.stages[0].dryKg);
  });

  it('title-cases the id when no display name is given', () => {
    expect(buildGenericProfile('long-march-5').name).toBe('Long March 5');
  });

  it('reaches orbit with margin — the generic model must be launchable', () => {
    expect(integrateAscent(p).reachedOrbit).toBe(true);
  });
});

describe('loadLaunchProfile — fail-closed loader', () => {
  const okJson = {
    id: 'falcon-9',
    name: 'Falcon 9',
    payloadKg: 15000,
    pitchProgram: [[0, 90]],
    stages: [{ name: 'S1', wetKg: 1, dryKg: 0 }],
  };
  const asFetch = (impl: (url: string) => Promise<unknown>): typeof fetch =>
    impl as unknown as typeof fetch;

  it('returns the fetched flagship JSON when valid', async () => {
    const p = await loadLaunchProfile(
      'falcon-9',
      asFetch(async () => ({ ok: true, json: async () => okJson })),
    );
    expect(p?.id).toBe('falcon-9');
  });

  it('overrides the display name when one is given', async () => {
    const p = await loadLaunchProfile(
      'falcon-9',
      asFetch(async () => ({ ok: true, json: async () => okJson })),
      '',
      'Falcon 9 (CRS-1)',
    );
    expect(p?.name).toBe('Falcon 9 (CRS-1)');
  });

  it('falls back to generic when the fetch is not ok', async () => {
    const p = await loadLaunchProfile(
      'falcon-9',
      asFetch(async () => ({ ok: false, json: async () => ({}) })),
    );
    expect(p?.source_tier).toBe('generic');
  });

  it('falls back to generic when the JSON is malformed (fail-closed)', async () => {
    const p = await loadLaunchProfile(
      'falcon-9',
      asFetch(async () => ({ ok: true, json: async () => ({ id: 'x' }) })),
    );
    expect(p?.source_tier).toBe('generic');
  });

  it('falls back to generic when the fetch throws', async () => {
    const p = await loadLaunchProfile(
      'falcon-9',
      asFetch(async () => {
        throw new Error('network');
      }),
    );
    expect(p?.source_tier).toBe('generic');
  });

  it('returns a generic profile for a non-flagship id without fetching', async () => {
    let fetched = false;
    const p = await loadLaunchProfile(
      'long-march-3b',
      asFetch(async () => {
        fetched = true;
        return { ok: true, json: async () => okJson };
      }),
    );
    expect(p?.source_tier).toBe('generic');
    expect(fetched).toBe(false);
  });

  it('returns null for a null/undefined launcher id', async () => {
    expect(await loadLaunchProfile(null)).toBeNull();
    expect(await loadLaunchProfile(undefined)).toBeNull();
  });
});

describe('atlasVSrbCount — variant middle digit → SRB count', () => {
  it('parses the SRB count from each Atlas V config code', () => {
    expect(atlasVSrbCount('Atlas V 401')).toBe(0);
    expect(atlasVSrbCount('Atlas V 411')).toBe(1);
    expect(atlasVSrbCount('Atlas V 541')).toBe(4);
    expect(atlasVSrbCount('Atlas V 551')).toBe(5);
    expect(atlasVSrbCount('Atlas V 501 (AV-034)')).toBe(0);
  });

  it('returns 0 for a name without a parseable config code', () => {
    expect(atlasVSrbCount('Atlas V')).toBe(0);
    expect(atlasVSrbCount(undefined)).toBe(0);
    expect(atlasVSrbCount('Falcon 9 Block 5')).toBe(0);
  });
});

describe('loadLaunchProfile — Atlas V variant SRBs (#412 follow-up)', () => {
  const atlasCore = {
    id: 'atlas-v',
    name: 'Atlas V 401',
    payloadKg: 9800,
    pitchProgram: [[0, 90]],
    stages: [
      { name: 'CCB', wetKg: 305000, dryKg: 21000, thrustSlKN: 3827, thrustVacKN: 4152 },
      { name: 'Centaur', wetKg: 23000, dryKg: 2247, thrustVacKN: 99 },
    ],
  };
  const asFetch = (impl: (url: string) => Promise<unknown>): typeof fetch =>
    impl as unknown as typeof fetch;
  const loadAtlas = (displayName?: string) =>
    loadLaunchProfile(
      'atlas-v',
      asFetch(async () => ({ ok: true, json: async () => atlasCore })),
      '',
      displayName,
    );

  it('attaches 5 AJ-60A boosters for an Atlas V 551', async () => {
    const p = await loadAtlas('Atlas V 551');
    expect(p?.boosters?.name).toBe('AJ-60A');
    expect(p?.boosters?.count).toBe(5);
    expect(p?.name).toBe('Atlas V 551');
  });

  it('attaches 4 for a 541 and 1 for a 411', async () => {
    expect((await loadAtlas('Atlas V 541'))?.boosters?.count).toBe(4);
    expect((await loadAtlas('Atlas V 411'))?.boosters?.count).toBe(1);
  });

  it('attaches NO boosters for the 401 base or a 501', async () => {
    expect((await loadAtlas('Atlas V 401'))?.boosters).toBeUndefined();
    expect((await loadAtlas('Atlas V 501 (AV-034)'))?.boosters).toBeUndefined();
  });

  it('the SRB-laden variant integrates to a valid ascent that reaches higher speed', async () => {
    const withSrb = await loadAtlas('Atlas V 551');
    const noSrb = await loadAtlas('Atlas V 401');
    const s551 = integrateAscent(withSrb!);
    const s401 = integrateAscent(noSrb!);
    // The 5-SRB stack lights ~8,440 kN extra at liftoff → higher liftoff TWR.
    expect(s551.states[0].twr).toBeGreaterThan(s401.states[0].twr);
    expect(s551.states.length).toBeGreaterThan(1);
  });
});
