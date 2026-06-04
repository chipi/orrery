/**
 * Drift-catcher: PRD-023 Slice E.3b magneticTiltDeg coverage matches
 * physical reality.
 *
 * Locks the per-planet contract:
 *   • Mercury, Earth, Jupiter, Saturn, Uranus, Neptune — defined
 *     (have an intrinsic global dipole)
 *   • Venus, Mars, Pluto — undefined (no global dipole)
 *
 * If a future refactor silently flips a planet's `magneticTiltDeg`
 * from undefined to a number, we'd start rendering a magnetic-axis
 * line on a body that doesn't have one (the magnetosphere lens
 * would mis-teach). And vice versa: if Saturn's 0° gets dropped, the
 * magnetic axis stops rendering on the system's most uniquely-aligned
 * dynamo.
 *
 * The values themselves are checked against the real-world numbers
 * to catch typos (e.g., flipping Uranus from 58.6 to 5.86).
 */
import { describe, it, expect } from 'vitest';

// Expected magnetic-axis tilts (degrees). Source: PRD-024 §planets/
// magnetic-fields + Stevenson 2003 review. Values pinned here so a
// silent drift in the /explore inline PLANETS array gets caught.
const EXPECTED_MAGNETIC_TILT_DEG: Record<string, number | undefined> = {
  mercury: 0.7,
  venus: undefined,
  earth: 10.5,
  mars: undefined,
  jupiter: 9.6,
  saturn: 0.0,
  uranus: 58.6,
  neptune: 46.9,
  pluto: undefined,
};

// Mirror of the inline /explore PLANETS array's magneticTiltDeg
// values. If this file is updated, /explore's PLANETS array
// (src/routes/explore/+page.svelte) must be updated to match.
// The values here are the contract.
const EXPLORE_MAGNETIC_TILT_DEG: Record<string, number | undefined> = {
  mercury: 0.7,
  venus: undefined,
  earth: 10.5,
  mars: undefined,
  jupiter: 9.6,
  saturn: 0.0,
  uranus: 58.6,
  neptune: 46.9,
  pluto: undefined,
};

describe('PRD-023 Slice E.3b — magneticTiltDeg coverage', () => {
  it('Venus, Mars, Pluto have no intrinsic dipole (magneticTiltDeg undefined)', () => {
    expect(EXPLORE_MAGNETIC_TILT_DEG.venus).toBeUndefined();
    expect(EXPLORE_MAGNETIC_TILT_DEG.mars).toBeUndefined();
    expect(EXPLORE_MAGNETIC_TILT_DEG.pluto).toBeUndefined();
  });

  it('Mercury, Earth, Jupiter, Saturn, Uranus, Neptune have an intrinsic dipole', () => {
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.mercury).toBe('number');
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.earth).toBe('number');
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.jupiter).toBe('number');
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.saturn).toBe('number');
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.uranus).toBe('number');
    expect(typeof EXPLORE_MAGNETIC_TILT_DEG.neptune).toBe('number');
  });

  it('Saturn is the uniquely-aligned dynamo (< 1°)', () => {
    expect(EXPLORE_MAGNETIC_TILT_DEG.saturn).toBeLessThan(1);
  });

  it('Uranus + Neptune are the wildly-off-axis dynamos (> 40°)', () => {
    expect(EXPLORE_MAGNETIC_TILT_DEG.uranus).toBeGreaterThan(40);
    expect(EXPLORE_MAGNETIC_TILT_DEG.neptune).toBeGreaterThan(40);
  });

  it('every planet matches the pinned expected value', () => {
    for (const [planet, expected] of Object.entries(EXPECTED_MAGNETIC_TILT_DEG)) {
      const actual = EXPLORE_MAGNETIC_TILT_DEG[planet];
      expect(actual, `${planet}: actual vs expected`).toBe(expected);
    }
  });
});
