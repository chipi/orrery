import { describe, expect, it } from 'vitest';
import { PLANETS, realStartAngle } from './explore-scene';

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const YEAR_MS = 365.25 * 86_400_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

describe('realStartAngle', () => {
  it('is the J2000 mean longitude at the J2000 epoch', () => {
    expect(realStartAngle('earth', 1, J2000_MS)).toBeCloseTo(rad(100.46), 10);
    expect(realStartAngle('mars', 1.8808, J2000_MS)).toBeCloseTo(rad(355.43), 10);
  });

  it('advances 360° per orbital period and wraps into [0, 2π)', () => {
    const earth = PLANETS.find((p) => p.id === 'earth')!;
    const half = realStartAngle('earth', earth.period, J2000_MS + (earth.period * YEAR_MS) / 2)!;
    expect(half).toBeCloseTo(rad(280.46), 6);
    const before = realStartAngle('earth', earth.period, J2000_MS - YEAR_MS * 10)!;
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThan(2 * Math.PI);
  });

  it('is undefined for a body without a J2000 entry', () => {
    expect(realStartAngle('ceres', 4.6, J2000_MS)).toBeUndefined();
  });

  it('is deterministic for a given epoch, independent of the wall clock', () => {
    const epoch = Date.UTC(2026, 3, 25, 12);
    expect(realStartAngle('venus', 0.615, epoch)).toBe(realStartAngle('venus', 0.615, epoch));
  });
});
