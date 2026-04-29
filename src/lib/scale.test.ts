import { describe, it, expect } from 'vitest';
import { auToPx, altToOrbitRadius } from './scale';

describe('auToPx', () => {
  it('returns exact lookup value at Earth (1 AU)', () => {
    expect(auToPx(1.0)).toBe(113);
  });

  it('returns exact lookup value at Mars (1.524 AU)', () => {
    expect(auToPx(1.524)).toBe(155);
  });

  it('interpolates linearly between lookup points', () => {
    // Halfway between Mercury (0.387, 52) and Venus (0.723, 83): ~0.555 → ~67.5
    const p = auToPx(0.555);
    expect(p).toBeGreaterThan(52);
    expect(p).toBeLessThan(83);
  });

  it('clamps to 512 px beyond the lookup table (e.g., 200 AU)', () => {
    expect(auToPx(200)).toBe(512);
  });

  it('is monotonically non-decreasing', () => {
    let prev = auToPx(0);
    for (const a of [0.5, 1.0, 1.5, 5, 10, 30, 100]) {
      const next = auToPx(a);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});

describe('altToOrbitRadius', () => {
  it('returns 8.5 (Earth radius + 0.5 surface gap) at 0 km', () => {
    expect(altToOrbitRadius(0)).toBeCloseTo(8.5, 6);
  });

  it('places ISS (408 km) just above Earth surface (8.5)', () => {
    const iss = altToOrbitRadius(408);
    expect(iss).toBeGreaterThan(8.5);
    expect(iss).toBeLessThan(12);
  });

  it('places GEO (35786 km) inside the inner camera frame (under 25u)', () => {
    const geo = altToOrbitRadius(35786);
    expect(geo).toBeGreaterThan(18);
    expect(geo).toBeLessThan(25);
  });

  it('places Moon (~384400 km) farther out than GEO', () => {
    const geo = altToOrbitRadius(35786);
    const moon = altToOrbitRadius(384400);
    expect(moon).toBeGreaterThan(geo);
  });

  it('JWST at L2 (1.5M km) farther out than Moon', () => {
    const moon = altToOrbitRadius(384400);
    const jwst = altToOrbitRadius(1500000);
    expect(jwst).toBeGreaterThan(moon);
  });

  it('is monotonically increasing', () => {
    let prev = altToOrbitRadius(0);
    for (const a of [408, 20000, 35786, 384400, 1500000]) {
      const next = altToOrbitRadius(a);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });

  it('preserves LEO < MEO < GEO < HEO < MOON < L2 ordering', () => {
    const r = [
      altToOrbitRadius(408), // LEO
      altToOrbitRadius(20180), // MEO
      altToOrbitRadius(35786), // GEO
      altToOrbitRadius(133000), // HEO
      altToOrbitRadius(384400), // MOON
      altToOrbitRadius(1500000), // L2
    ];
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
  });
});
