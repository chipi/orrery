import { describe, it, expect } from 'vitest';
import { magnitudeToPointSize, selectVisibleStars, type ShellData } from './star-selection';
import type { StarBudget } from './budget';

describe('magnitudeToPointSize', () => {
  it('makes brighter stars larger', () => {
    expect(magnitudeToPointSize(-1)).toBeGreaterThan(magnitudeToPointSize(3));
    expect(magnitudeToPointSize(3)).toBeGreaterThan(magnitudeToPointSize(7));
  });

  it('clamps to a visible min and a non-blooming max', () => {
    expect(magnitudeToPointSize(-30)).toBeLessThanOrEqual(3.2);
    expect(magnitudeToPointSize(30)).toBeGreaterThanOrEqual(0.35);
  });
});

describe('selectVisibleStars', () => {
  // star tuple: [x, y, z, mag, ci]
  const shells: ShellData[] = [
    { stars: [[1, 0, 0, 2, 0.6]] }, // dist 1 pc, bright
    {
      stars: [
        [3, 0, 0, 5, 0.4], // dist 3 pc
        [0, 4, 0, 1, 1.2], // dist 4 pc, brightest
      ],
    },
    { stars: [[100, 0, 0, 0, 0.0]] }, // dist 100 pc — outside a small radius
  ];

  const budget = (over: Partial<StarBudget> = {}): StarBudget => ({
    maxPoints: 100,
    shellRadiusPc: 10,
    ...over,
  });

  it('excludes stars beyond the budget radius', () => {
    const out = selectVisibleStars(shells, budget({ shellRadiusPc: 10 }));
    expect(out.count).toBe(3); // the 100 pc star is dropped
  });

  it('packs positions/colors/sizes with 3/3/1 stride and matching length', () => {
    const out = selectVisibleStars(shells, budget());
    expect(out.positions).toHaveLength(out.count * 3);
    expect(out.colors).toHaveLength(out.count * 3);
    expect(out.sizes).toHaveLength(out.count);
  });

  it('orders brightest-first so the budget keeps the brightest stars', () => {
    // maxPoints 1 within radius 10 → only the brightest (mag 1) survives.
    const out = selectVisibleStars(shells, budget({ maxPoints: 1 }));
    expect(out.count).toBe(1);
    // Brightest star is at (0, 4, 0).
    expect([out.positions[0], out.positions[1], out.positions[2]]).toEqual([0, 4, 0]);
  });

  it('derives color from the B−V index (all channels finite, in 0..1)', () => {
    const out = selectVisibleStars(shells, budget());
    for (const c of out.colors) {
      expect(Number.isFinite(c)).toBe(true);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('handles an empty field', () => {
    const out = selectVisibleStars([], budget());
    expect(out.count).toBe(0);
    expect(out.positions).toHaveLength(0);
  });
});
