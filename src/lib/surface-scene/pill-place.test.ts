import { describe, expect, it } from 'vitest';
import { pillLeft } from './pill-place';

describe('pillLeft', () => {
  it('sits right of the marker when it fits', () => {
    expect(pillLeft(100, 120, 390)).toBe(114);
  });
  it('flips left near the right edge', () => {
    expect(pillLeft(340, 120, 390)).toBe(340 - 14 - 120);
  });
  it('stays on screen when it fits neither side', () => {
    const x = pillLeft(195, 300, 390);
    expect(x).toBeGreaterThanOrEqual(8);
    expect(x + 300).toBeLessThanOrEqual(382);
  });
});
