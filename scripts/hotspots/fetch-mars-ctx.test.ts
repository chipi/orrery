import { describe, expect, it } from 'vitest';
import { ctxShiftedCentre, eastWestSourcePx } from './fetch-mars-ctx.ts';

describe('eastWestSourcePx (Murray CTX tiles are 5 m N-S but 5 x cos(lat) m E-W)', () => {
  it('is the crop size at the equator', () => {
    expect(eastWestSourcePx(3072, 0)).toBe(3072);
  });

  it('widens the window by 1 / cos(lat)', () => {
    // Jezero 18.5 N: 3482 px of ground needs ~3672 source columns, not 3482.
    expect(eastWestSourcePx(3482, 18.496)).toBe(3672);
    // Viking 2 47.7 N: 49 % wider.
    expect(eastWestSourcePx(3072, 47.67)).toBe(4562);
  });

  it('is symmetric in hemisphere', () => {
    expect(eastWestSourcePx(3072, -45)).toBe(eastWestSourcePx(3072, 45));
  });
});

describe('ctxShiftedCentre', () => {
  it('is the centre when no shift is recorded', () => {
    expect(ctxShiftedCentre({ lat: 10, lon: 20 })).toEqual({ lat: 10, lon: 20 });
  });

  it('cuts the CTX north / east of the centre by the measured patch shift', () => {
    const c = ctxShiftedCentre({ lat: 47.66729, lon: 134.2809 }, { north: 285, east: 5 });
    expect(c.lat).toBeCloseTo(47.66729 + 285 / 59157.9, 5);
    expect(c.lon).toBeGreaterThan(134.2809);
  });
});
