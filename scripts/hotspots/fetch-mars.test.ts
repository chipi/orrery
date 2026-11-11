import { describe, expect, it } from 'vitest';
import { productFrameTarget } from './fetch-mars.ts';

describe('productFrameTarget', () => {
  it('is the site point when no shift is recorded', () => {
    expect(productFrameTarget(18.44486, 77.45173)).toEqual({ lat: 18.44486, lon: 77.45173 });
  });

  it('cuts the HiRISE crop at the site point minus the CTX-frame shift (Perseverance 205 m N, 15 m W)', () => {
    const t = productFrameTarget(18.44486, 77.45173, { north: 205, east: -15 });
    expect(t.lat).toBeCloseTo(18.44139, 4);
    expect(t.lon).toBeCloseTo(77.452, 4);
  });

  it('moves the target south for a northward shift and west for an eastward one', () => {
    const t = productFrameTarget(-4.58894, 137.44022, { north: 145, east: 30 });
    expect(t.lat).toBeLessThan(-4.58894);
    expect(t.lon).toBeLessThan(137.44022);
  });
});
