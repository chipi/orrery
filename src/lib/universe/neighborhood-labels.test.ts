import { describe, expect, it } from 'vitest';
import { overlaps } from './scene-pins';

// Label declutter in the stellar neighborhood (2026-11-04: "Proxima Centauri", "Rigil
// Kentaurus" and "Sol" printed over each other at 375 px).
describe('neighborhood label overlap', () => {
  const sol = { l: -0.1, r: 0.1, b: 0.0, t: 0.05 };
  it('overlapping rectangles collide', () => {
    expect(overlaps(sol, { l: 0.05, r: 0.4, b: 0.02, t: 0.07 })).toBe(true);
  });
  it('rectangles side by side or one above the other do not', () => {
    expect(overlaps(sol, { l: 0.1, r: 0.4, b: 0.0, t: 0.05 })).toBe(false);
    expect(overlaps(sol, { l: -0.1, r: 0.1, b: 0.05, t: 0.1 })).toBe(false);
  });
});
