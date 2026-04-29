import { describe, it, expect } from 'vitest';
import { auToPx, altToVis } from './scale';

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

describe('altToVis', () => {
  it('returns 38 px at 0 km altitude (ground baseline)', () => {
    expect(altToVis(0)).toBe(38);
  });

  it('places ISS (408 km) above ground but below GEO', () => {
    const iss = altToVis(408);
    const geo = altToVis(35786);
    expect(iss).toBeGreaterThan(38);
    expect(iss).toBeLessThan(geo);
  });

  it('JWST at L2 (1.5M km) maps significantly higher than the Moon (~384400 km)', () => {
    const moon = altToVis(384400);
    const jwst = altToVis(1500000);
    expect(jwst).toBeGreaterThan(moon);
    expect(jwst - moon).toBeGreaterThan(20); // at least 20 px separation
  });

  it('is monotonically increasing', () => {
    let prev = altToVis(100);
    for (const a of [400, 20000, 35786, 384400, 1500000]) {
      const next = altToVis(a);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
  });
});
