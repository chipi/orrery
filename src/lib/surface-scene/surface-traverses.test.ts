import { describe, expect, it } from 'vitest';
import { daysBetween, greatCircleKm, traversePathKm } from './surface-traverses';

const MARS_KM = 3389.5;

describe('greatCircleKm', () => {
  it('is zero for identical points', () => {
    expect(greatCircleKm([10, 20], [10, 20], MARS_KM)).toBe(0);
  });

  it('measures a quarter of the equator as pi/2 * R', () => {
    expect(greatCircleKm([0, 0], [0, 90], MARS_KM)).toBeCloseTo((Math.PI / 2) * MARS_KM, 6);
  });

  it('measures pole to pole as pi * R', () => {
    expect(greatCircleKm([90, 0], [-90, 0], MARS_KM)).toBeCloseTo(Math.PI * MARS_KM, 6);
  });

  it('scales linearly with the body radius', () => {
    const a = greatCircleKm([5, 5], [6, 7], 1000);
    const b = greatCircleKm([5, 5], [6, 7], 2000);
    expect(b).toBeCloseTo(a * 2, 10);
  });
});

describe('traversePathKm', () => {
  it('is zero for fewer than two points', () => {
    expect(traversePathKm([], MARS_KM)).toBe(0);
    expect(traversePathKm([[1, 2]], MARS_KM)).toBe(0);
  });

  it('sums segment lengths', () => {
    const pts: Array<[number, number]> = [
      [0, 0],
      [0, 45],
      [0, 90],
    ];
    expect(traversePathKm(pts, MARS_KM)).toBeCloseTo(greatCircleKm([0, 0], [0, 90], MARS_KM), 6);
  });
});

describe('daysBetween', () => {
  it('counts whole days', () => {
    expect(daysBetween('2021-02-18', '2021-02-28')).toBe(10);
    expect(daysBetween('2021-02-18T00:00:00Z', '2021-02-18T23:59:59Z')).toBe(0);
  });

  it('returns 0 for reversed or unparsable dates', () => {
    expect(daysBetween('2021-03-01', '2021-02-01')).toBe(0);
    expect(daysBetween('not-a-date', '2021-02-01')).toBe(0);
  });
});
