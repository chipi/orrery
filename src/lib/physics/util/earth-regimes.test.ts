import { describe, it, expect } from 'vitest';
import { deriveRegimeBounds } from './earth-regimes';
import type { EarthObject } from '$types/earth-object';

function obj(partial: Partial<EarthObject> & Pick<EarthObject, 'id' | 'regime'>): EarthObject {
  return {
    body: 'EARTH',
    earth_distance_km: 0,
    count: 1,
    color: '#000',
    agencies: [],
    launched: 2000,
    status: 'ACTIVE',
    crew: 0,
    credit: '',
    links: [],
    ...partial,
  } as EarthObject;
}

describe('deriveRegimeBounds', () => {
  it('returns an empty map for no objects', () => {
    expect(deriveRegimeBounds([]).size).toBe(0);
  });

  it('uses altitude_km when present', () => {
    const out = deriveRegimeBounds([
      obj({ id: 'a', regime: 'LEO', altitude_km: 408, earth_distance_km: 408 }),
    ]);
    expect(out.get('LEO')).toEqual({ min: 408, max: 408 });
  });

  it('falls back to earth_distance_km when altitude_km is absent', () => {
    const out = deriveRegimeBounds([obj({ id: 'a', regime: 'L2', earth_distance_km: 1500000 })]);
    expect(out.get('L2')).toEqual({ min: 1500000, max: 1500000 });
  });

  it('aggregates min/max within a regime', () => {
    const out = deriveRegimeBounds([
      obj({ id: 'a', regime: 'LEO', altitude_km: 408 }),
      obj({ id: 'b', regime: 'LEO', altitude_km: 550 }),
      obj({ id: 'c', regime: 'LEO', altitude_km: 320 }),
    ]);
    expect(out.get('LEO')).toEqual({ min: 320, max: 550 });
  });

  it('partitions by regime', () => {
    const out = deriveRegimeBounds([
      obj({ id: 'iss', regime: 'LEO', altitude_km: 408 }),
      obj({ id: 'gps', regime: 'MEO', altitude_km: 20200 }),
      obj({ id: 'sat', regime: 'GEO', altitude_km: 35786 }),
    ]);
    expect(out.size).toBe(3);
    expect(out.get('LEO')?.max).toBe(408);
    expect(out.get('MEO')?.max).toBe(20200);
    expect(out.get('GEO')?.max).toBe(35786);
  });
});
