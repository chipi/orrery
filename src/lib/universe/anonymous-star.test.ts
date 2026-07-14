import { describe, it, expect } from 'vitest';
import { describeAnonymousStar, colorNameForKelvin } from './anonymous-star';

describe('colorNameForKelvin', () => {
  it('names the colour classes across the temperature range', () => {
    expect(colorNameForKelvin(30_000)).toBe('blue-white');
    expect(colorNameForKelvin(8_000)).toBe('white');
    expect(colorNameForKelvin(5_800)).toBe('yellow-white'); // ~Sun
    expect(colorNameForKelvin(5_000)).toBe('yellow');
    expect(colorNameForKelvin(4_000)).toBe('orange');
    expect(colorNameForKelvin(3_000)).toBe('red');
  });
});

describe('describeAnonymousStar', () => {
  it('computes distance as the parsec-space norm, in pc and ly', () => {
    const s = describeAnonymousStar(3, 4, 0, 5, 0.6);
    expect(s.distPc).toBeCloseTo(5, 6);
    expect(s.distLy).toBeCloseTo(5 * 3.2615638, 4);
  });

  it('passes magnitude through and derives a plausible temperature + colour', () => {
    const sun = describeAnonymousStar(0, 1, 0, 4.8, 0.656);
    expect(sun.mag).toBe(4.8);
    expect(sun.kelvin).toBeGreaterThan(5000);
    expect(sun.kelvin).toBeLessThan(6200);
    expect(sun.colorName).toMatch(/yellow/);
  });

  it('reads a hot blue star as blue-white and a cool one as red', () => {
    expect(describeAnonymousStar(1, 0, 0, 2, -0.3).colorName).toBe('blue-white');
    expect(describeAnonymousStar(1, 0, 0, 2, 1.8).colorName).toBe('red');
  });
});
