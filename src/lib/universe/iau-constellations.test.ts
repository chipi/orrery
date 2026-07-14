import { describe, it, expect } from 'vitest';
import { IAU_CONSTELLATIONS, constellationName } from './iau-constellations';

describe('IAU_CONSTELLATIONS', () => {
  it('has all 88 official constellations', () => {
    expect(Object.keys(IAU_CONSTELLATIONS)).toHaveLength(88);
  });
});

describe('constellationName', () => {
  it('resolves known codes to English names', () => {
    expect(constellationName('CMa')).toBe('Canis Major');
    expect(constellationName('Ori')).toBe('Orion');
    expect(constellationName('Cru')).toBe('Crux');
  });

  it('falls back to the code for an unknown one and empty for nullish', () => {
    expect(constellationName('Xyz')).toBe('Xyz');
    expect(constellationName(null)).toBe('');
    expect(constellationName(undefined)).toBe('');
  });
});
