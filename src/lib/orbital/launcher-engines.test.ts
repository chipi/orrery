import { describe, it, expect } from 'vitest';
import { LAUNCHER_ENGINES, getLauncherEngines, LAUNCHER_ENGINE_IDS } from './launcher-engines';

// The engine spec is the single source of truth for the launcher models' engine
// clusters + the launcher detail UI. Guard its internal consistency so a typo in
// a count can't silently render the wrong number of nozzles.
describe('LAUNCHER_ENGINES', () => {
  it('covers every launcher id with at least one stage', () => {
    expect(LAUNCHER_ENGINE_IDS.length).toBeGreaterThanOrEqual(21);
    for (const [id, spec] of Object.entries(LAUNCHER_ENGINES)) {
      expect(spec.stages.length, `${id} has stages`).toBeGreaterThan(0);
      expect(spec.name, `${id} has a name`).toBeTruthy();
      expect(spec.agency, `${id} has an agency`).toBeTruthy();
      expect(spec.sources.length, `${id} cites a source`).toBeGreaterThan(0);
    }
  });

  it('keeps mainNozzles === engineCount × nozzlesPerEngine for every stage', () => {
    for (const [id, spec] of Object.entries(LAUNCHER_ENGINES)) {
      for (const s of spec.stages) {
        expect(s.mainNozzles, `${id} / ${s.stage}`).toBe(s.engineCount * s.nozzlesPerEngine);
        expect(s.mainNozzles, `${id} / ${s.stage} > 0`).toBeGreaterThan(0);
      }
    }
  });

  it('pins the known multi-nozzle-per-engine signatures', () => {
    // Falcon 9 octaweb = 9 Merlins.
    expect(getLauncherEngines('falcon-9')!.stages[0].mainNozzles).toBe(9);
    // Saturn V S-IC = 5 F-1.
    expect(getLauncherEngines('saturn-v')!.stages[0].mainNozzles).toBe(5);
    // Atlas V RD-180 = one engine, two nozzles.
    const rd180 = getLauncherEngines('atlas-v')!.stages.find((s) => s.engine === 'RD-180')!;
    expect(rd180.mainNozzles).toBe(2);
    // Soyuz strap-ons = 4 RD-107, four chambers each = 16.
    expect(getLauncherEngines('soyuz')!.stages[0].mainNozzles).toBe(16);
  });

  it('returns null for an unknown id', () => {
    expect(getLauncherEngines('not-a-rocket')).toBeNull();
    expect(getLauncherEngines(undefined)).toBeNull();
  });
});
