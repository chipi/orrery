import { describe, it, expect } from 'vitest';
import { poweredDescentDvKms } from './descent';

describe('poweredDescentDvKms — Δv = v_orbit·TWR/(TWR−1)', () => {
  it('TWR 3 costs 1.5× the orbital speed (gravity loss = v/(TWR−1))', () => {
    expect(poweredDescentDvKms(1.63, 3)).toBeCloseTo(1.63 * 1.5, 6);
  });

  it('a high-thrust lander is nearly loss-free (Δv → v_orbit)', () => {
    const dv = poweredDescentDvKms(1.63, 20);
    expect(dv).toBeGreaterThan(1.63);
    expect(dv).toBeLessThan(1.63 * 1.06);
  });

  it('TWR ≤ 1 can never stop the fall → Infinity (you crash)', () => {
    expect(poweredDescentDvKms(1.63, 1)).toBe(Infinity);
    expect(poweredDescentDvKms(1.63, 0.5)).toBe(Infinity);
  });

  it('lower TWR costs more Δv (more gravity loss)', () => {
    expect(poweredDescentDvKms(1.63, 1.5)).toBeGreaterThan(poweredDescentDvKms(1.63, 5));
  });
});
