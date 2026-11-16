import { describe, expect, it } from 'vitest';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';
import { planetName } from './format';
import { PLANET_SIZES, planetDiameterKm } from './planet-sizes';

const LOCALES = [
  'en-US',
  'es',
  'fr',
  'de',
  'pt-BR',
  'it',
  'nl',
  'sr-Cyrl',
  'zh-CN',
  'ja',
  'ko',
  'hi',
  'ar',
  'ru',
] as const;
const NON_LATIN = ['sr-Cyrl', 'zh-CN', 'ja', 'ko', 'hi', 'ar', 'ru'] as const;

describe('PLANET_SIZES', () => {
  it('lists the eight planets, biggest to smallest', () => {
    expect(PLANET_SIZES.map((p) => p.id)).toEqual([
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'earth',
      'venus',
      'mars',
      'mercury',
    ]);
    const radii = PLANET_SIZES.map((p) => p.r);
    expect(radii).toEqual([...radii].sort((a, b) => b - a));
  });

  it('prints the diameter, twice the mean radius', () => {
    const earth = PLANET_SIZES.find((p) => p.id === 'earth')!;
    expect(planetDiameterKm(earth)).toBe(12742);
  });

  it('takes every diameter from planet-stats, the number the planet panel prints', () => {
    for (const p of PLANET_SIZES) {
      expect(planetDiameterKm(p), p.id).toBe(PLANET_STATS[p.id].diameterKm);
    }
    const km = (id: string) => planetDiameterKm(PLANET_SIZES.find((p) => p.id === id)!);
    expect([km('mars'), km('jupiter'), km('saturn')]).toEqual([6779, 139820, 116460]);
  });

  it('keeps every planet name to 9 letters, the most a legend cell holds on one line', () => {
    for (const locale of LOCALES) {
      for (const p of PLANET_SIZES) {
        expect([...planetName(p.id, p.id, locale)].length, `${locale} ${p.id}`).toBeLessThanOrEqual(
          9,
        );
      }
    }
  });
});

describe('planetName', () => {
  it('has a name for every planet in all 14 locales, never the id fallback', () => {
    for (const locale of LOCALES) {
      for (const p of PLANET_SIZES) {
        const name = planetName(p.id, p.id, locale);
        expect(name, `${locale} ${p.id}`).not.toBe(p.id);
        expect(name.trim().length, `${locale} ${p.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('is not English in the non-Latin locales, nor for Earth and Mercury in the Latin ones', () => {
    for (const locale of LOCALES.filter((l) => l !== 'en-US')) {
      const english = (id: string) => planetName(id, id, 'en-US');
      const ids = (NON_LATIN as readonly string[]).includes(locale)
        ? PLANET_SIZES.map((p) => p.id)
        : ['earth', 'mercury'];
      for (const id of ids) {
        expect(planetName(id, id, locale), `${locale} ${id}`).not.toBe(english(id));
      }
    }
  });

  it('keeps the fallback for an id without a message', () => {
    expect(planetName('pluto', 'Pluto')).toBe('Pluto');
  });
});
