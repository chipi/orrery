import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  daysBetween,
  greatCircleKm,
  solRampColor,
  solTickIndices,
  solTickSpacing,
  traversePathKm,
} from './surface-traverses';

describe('sol ramp + ticks (#641)', () => {
  it('ramps teal → white → amber and clamps outside [0, 1]', () => {
    expect(solRampColor(0).getHexString(THREE.SRGBColorSpace)).toBe('2dd4bf');
    expect(solRampColor(1).getHexString(THREE.SRGBColorSpace)).toBe('fbbf24');
    expect(solRampColor(0.5).getHexString(THREE.SRGBColorSpace)).toBe('e2f0ec');
    expect(solRampColor(-3).getHexString(THREE.SRGBColorSpace)).toBe('2dd4bf');
    expect(solRampColor(7).getHexString(THREE.SRGBColorSpace)).toBe('fbbf24');
  });

  it('spaces ticks by mission length', () => {
    expect(solTickSpacing(347)).toEqual({ minor: 25, major: 100 });
    expect(solTickSpacing(2210)).toEqual({ minor: 100, major: 500 });
    expect(solTickSpacing(5111)).toEqual({ minor: 250, major: 1000 });
  });

  it('puts each tick at the first point reached on or after its sol', () => {
    expect(solTickIndices([1, 20, 26, 26, 60, 80], 25)).toEqual([
      { sol: 25, i: 2 },
      { sol: 50, i: 4 },
      { sol: 75, i: 5 },
    ]);
  });

  it('one tick per crossing when a point jumps several intervals', () => {
    // sol 1 → 120 in one drive: only the 25 boundary is ticked there, then 125.
    expect(solTickIndices([1, 120, 130], 25)).toEqual([
      { sol: 25, i: 1 },
      { sol: 125, i: 2 },
    ]);
  });

  it('never ticks the landing point and tolerates short input', () => {
    expect(solTickIndices([50, 60], 25)).toEqual([]);
    expect(solTickIndices([3], 25)).toEqual([]);
    expect(solTickIndices([1, 2], 0)).toEqual([]);
  });
});

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
