import { describe, expect, it } from 'vitest';
import { computeTierScale } from './tier-scale';

describe('computeTierScale', () => {
  it('returns 1.0 at the overview distance (camR ≥ 60)', () => {
    expect(computeTierScale(60)).toBe(1);
    expect(computeTierScale(100)).toBe(1);
    expect(computeTierScale(1000)).toBe(1);
  });

  it('returns 0.2 at the closest zoom (camR ≤ 30.6)', () => {
    expect(computeTierScale(30.6)).toBe(0.2);
    expect(computeTierScale(30.2)).toBe(0.2);
    expect(computeTierScale(0)).toBe(0.2);
  });

  it('linearly interpolates between minR and maxR', () => {
    // Midpoint (45.3) should land roughly halfway between 0.2 and 1.0.
    const mid = computeTierScale(45.3);
    expect(mid).toBeGreaterThan(0.55);
    expect(mid).toBeLessThan(0.65);
  });

  it('produces a monotonic non-decreasing curve as camR grows', () => {
    const samples = [30.6, 35, 40, 45, 50, 55, 60].map(computeTierScale);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });
});
