import { describe, it, expect } from 'vitest';
import { poweredDescentDvKms } from './descent';

describe('poweredDescentDvKms', () => {
  it('Moon landing from low orbit ≈ Apollo-class descent Δv (~1.9 km/s)', () => {
    // Low lunar orbit ~1.68 km/s, g_moon 1.62 m/s², ~2-min braking burn.
    const dv = poweredDescentDvKms(1.68, 1.62, 120);
    expect(dv).toBeCloseTo(1.87, 1);
  });

  it('is the sum of the orbital speed cancelled and the gravity loss', () => {
    expect(poweredDescentDvKms(1.5, 1.62, 100)).toBeCloseTo(1.5 + (1.62 * 100) / 1000, 9);
  });

  it('a zero-length burn costs only the orbital speed', () => {
    expect(poweredDescentDvKms(1.68, 1.62, 0)).toBe(1.68);
  });

  it('stronger gravity costs more (Earth vs Moon, same burn)', () => {
    expect(poweredDescentDvKms(7.8, 9.81, 120)).toBeGreaterThan(
      poweredDescentDvKms(7.8, 1.62, 120),
    );
  });
});
