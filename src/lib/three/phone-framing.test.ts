import { describe, expect, it } from 'vitest';
import { portraitFit, portraitFov } from './phone-framing';

describe('phone framing', () => {
  it('leaves a landscape or square frame alone', () => {
    expect(portraitFit(16 / 9)).toBe(1);
    expect(portraitFit(1)).toBe(1);
    expect(portraitFov(45, 16 / 10)).toBe(45);
  });

  it('backs a tall frame off, less than the full 1/aspect', () => {
    const a = 390 / 844;
    expect(portraitFit(a)).toBeGreaterThan(1.5);
    expect(portraitFit(a)).toBeLessThan(1 / a);
  });

  it('widens the field of view by the same factor in tan(half-angle), capped', () => {
    const a = 390 / 844;
    const tan = (deg: number) => Math.tan((deg * Math.PI) / 360);
    expect(tan(portraitFov(40, a)) / tan(40)).toBeCloseTo(portraitFit(a), 6);
    expect(portraitFov(90, 0.3)).toBe(100);
  });
});
