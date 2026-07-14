import { describe, it, expect } from 'vitest';
import { tierToStarBudget } from './budget';
import { ALL_TIERS } from '$lib/quality/quality-tier';

describe('tierToStarBudget', () => {
  it('defines a budget for every quality tier', () => {
    for (const tier of ALL_TIERS) {
      const b = tierToStarBudget(tier);
      expect(b.maxPoints).toBeGreaterThan(0);
      expect(b.shellRadiusPc).toBeGreaterThan(0);
    }
  });

  it('scales monotonically from minimal to cinematic', () => {
    const points = ALL_TIERS.map((t) => tierToStarBudget(t).maxPoints);
    const radii = ALL_TIERS.map((t) => tierToStarBudget(t).shellRadiusPc);
    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeGreaterThan(points[i - 1]);
      expect(radii[i]).toBeGreaterThan(radii[i - 1]);
    }
  });

  it('keeps the mobile floor modest and the desktop ceiling near the full catalogue', () => {
    expect(tierToStarBudget('minimal').maxPoints).toBeLessThanOrEqual(20_000);
    expect(tierToStarBudget('cinematic').maxPoints).toBeGreaterThanOrEqual(150_000);
  });
});
