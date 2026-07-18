/**
 * The injection-burn resolver (RFC-034 §3.1) names the kick/upper stage that
 * leaves parking orbit + the burn type + Δv, or returns null for LEO-direct /
 * unmodelled launchers so the seam beat is gracefully absent. Fixtures mirror
 * real mission data (apollo11, dart, juno, dawn, a no-launcher case).
 */
import { describe, it, expect } from 'vitest';
import { resolveInjectionBurn, injectionBurnType, injectionBurnLabel } from './injection-burn';

describe('injectionBurnType + label', () => {
  it('maps destination → burn type', () => {
    expect(injectionBurnType('MOON')).toBe('TLI');
    expect(injectionBurnType('MARS')).toBe('TMI');
    expect(injectionBurnType('JUPITER')).toBe('INJECTION');
    expect(injectionBurnType('VENUS')).toBe('INJECTION');
    expect(injectionBurnType(undefined)).toBe('INJECTION');
  });

  it('labels each burn type honestly', () => {
    expect(injectionBurnLabel('TLI')).toBe('TRANS-LUNAR INJECTION');
    expect(injectionBurnLabel('TMI')).toBe('TRANS-MARS INJECTION');
    expect(injectionBurnLabel('INJECTION')).toBe('ORBITAL INJECTION');
  });
});

describe('resolveInjectionBurn', () => {
  it('uses the authored vehicle_stage + Δv (Apollo 11 · Saturn V S-IVB · TLI)', () => {
    const b = resolveInjectionBurn('saturn-v', 'Saturn V S-IVB (third stage)', 3.05, 'MOON');
    expect(b).toEqual({
      stageName: 'Saturn V S-IVB (third stage)',
      dvKms: 3.05,
      burnType: 'TLI',
    });
  });

  it('uses the authored stage for a Mars mission (Falcon 9 S2 · TMI)', () => {
    const b = resolveInjectionBurn('falcon-9', 'Falcon 9 Block 5 second stage', 3.4, 'MARS');
    expect(b?.stageName).toBe('Falcon 9 Block 5 second stage');
    expect(b?.dvKms).toBe(3.4);
    expect(b?.burnType).toBe('TMI');
  });

  it('falls back to the launcher default stage when none authored (Juno · Atlas V → Centaur)', () => {
    const b = resolveInjectionBurn('atlas-v', undefined, undefined, 'JUPITER');
    expect(b?.stageName).toBe('Centaur upper stage');
    expect(b?.dvKms).toBeNull();
    expect(b?.burnType).toBe('INJECTION');
  });

  it('resolves from the launcher default even with no vehicle_stage (Dawn · Delta II)', () => {
    const b = resolveInjectionBurn('delta-ii', undefined, undefined, 'CERES');
    expect(b?.stageName).toBe('Delta II second stage');
    expect(b?.burnType).toBe('INJECTION');
  });

  it('returns null when there is no launcher (no kick stage to show)', () => {
    expect(resolveInjectionBurn(undefined, undefined, undefined, 'MARS')).toBeNull();
  });

  it('returns null for a LEO-direct / unmodelled launcher (no default, no authored stage)', () => {
    // titan-ii-glv (Gemini) + vostok-k fly direct to LEO — not in the map.
    expect(resolveInjectionBurn('titan-ii-glv', undefined, undefined, 'EARTH')).toBeNull();
    expect(resolveInjectionBurn('vostok-k', undefined, undefined, 'EARTH')).toBeNull();
  });
});
