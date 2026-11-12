import { describe, it, expect } from 'vitest';
import {
  IAU_CONSTELLATIONS,
  ZODIAC_CONSTELLATIONS,
  constellationName,
  isZodiacConstellation,
} from './iau-constellations';

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

describe('ZODIAC_CONSTELLATIONS', () => {
  it('is the thirteen the ecliptic crosses, all official codes', () => {
    expect(ZODIAC_CONSTELLATIONS.size).toBe(13);
    for (const c of ZODIAC_CONSTELLATIONS) expect(IAU_CONSTELLATIONS[c]).toBeTruthy();
    expect(IAU_CONSTELLATIONS.Oph).toBe('Ophiuchus');
  });

  it('isZodiacConstellation: Scorpius yes, Orion and nullish no', () => {
    expect(isZodiacConstellation('Sco')).toBe(true);
    expect(isZodiacConstellation('Ori')).toBe(false);
    expect(isZodiacConstellation(null)).toBe(false);
  });
});
