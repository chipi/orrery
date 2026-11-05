import { describe, expect, it } from 'vitest';
import { globeUv, tintFromMean } from './globe-tint';

describe('globeUv', () => {
  it('maps lon 0 to the middle of the map and lon 90 to three quarters', () => {
    expect(globeUv(0, 0)).toEqual([0.5, 0.5]);
    expect(globeUv(0, 90)[0]).toBeCloseTo(0.75, 10);
    expect(globeUv(0, -90)[0]).toBeCloseTo(0.25, 10);
  });
  it('wraps longitudes past ±180 and puts the north pole on the top row', () => {
    expect(globeUv(0, 270)[0]).toBeCloseTo(globeUv(0, -90)[0], 10);
    expect(globeUv(90, 0)[1]).toBe(0);
    expect(globeUv(-90, 0)[1]).toBe(1);
  });
});

describe('tintFromMean', () => {
  it('turns the mean grey into the globe colour', () => {
    const [r, g, b] = tintFromMean([0.8, 0.4, 0.2], 0.5);
    expect(r * 0.5).toBeCloseTo(0.8, 10);
    expect(g * 0.5).toBeCloseTo(0.4, 10);
    expect(b * 0.5).toBeCloseTo(0.2, 10);
    expect(r).toBeCloseTo(1.6, 10);
  });
  it('caps the multiplier at 2 and guards a near-black mean', () => {
    expect(tintFromMean([1, 1, 1], 0.01)).toEqual([2, 2, 2]);
  });
});
