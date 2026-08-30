import { describe, it, expect } from 'vitest';
import {
  AU_TO_KM,
  SEC_PER_JULIAN_YEAR,
  AUPYR_TO_KMS,
  MU_SUN_AU3_YR2,
  MU_SUN_KM3_S2,
  MU_EARTH_M3_S2,
  MU_EARTH_KM3_S2,
  MU_MOON_KM3_S2,
  G0,
} from './constants';
// The scattered definitions the canonical home must agree with (D10 hazard):
import { MU_SUN as MU_SUN_ORBITAL, AU_TO_KM as AU_ORBITAL } from '$lib/physics/transfer/orbital';
import { MU_SUN as MU_SUN_LAMBERT } from '$lib/physics/transfer/lambert-grid.constants';
import {
  MU_EARTH as MU_EARTH_GEO,
  MU_MOON as MU_MOON_GEO,
  AU_TO_KM as AU_GEO,
} from '$lib/physics/transfer/lambert-geocentric-grid.constants';
import { G0 as G0_ASCENT } from '$lib/physics/ascent/ascent-physics-constants';
import { G0 as G0_DESCENT } from '$lib/physics/descent/descent-physics-constants';
import { MU_EARTH_M3_S2 as MU_EARTH_ASCENT } from '$lib/physics/ascent/ascent-physics-constants';
import { gmstRad } from '$lib/physics/ephemeris/time';
import { julianDay } from '$lib/physics/ephemeris';
import { gmstRadians } from '$lib/physics/ephemeris/earth-sidereal';

/**
 * D10 (Fable-5 S1 holistic m1): µ constants were defined in DIFFERENT units in
 * several places, and two GMST impls could silently diverge. This test proves
 * every representation is consistent by VALUE+UNIT — so a future edit that drifts
 * one copy fails CI instead of producing a wrong number.
 */
describe('D10 · constants agree by value + unit', () => {
  it('MU_EARTH: m³/s² == km³/s² × 1e9', () => {
    expect(MU_EARTH_M3_S2).toBeCloseTo(MU_EARTH_KM3_S2 * 1e9, -6); // exact to float
  });

  it('MU_SUN: 4π² AU³/yr² == the IAU km³/s² value, converted', () => {
    const converted = (MU_SUN_KM3_S2 * SEC_PER_JULIAN_YEAR ** 2) / AU_TO_KM ** 3;
    expect(converted / MU_SUN_AU3_YR2).toBeCloseTo(1, 3); // agree to ~1e-3
  });

  it('AUPYR_TO_KMS == AU_TO_KM / seconds-per-year', () => {
    expect(AUPYR_TO_KMS / (AU_TO_KM / SEC_PER_JULIAN_YEAR)).toBeCloseTo(1, 3);
  });

  it('the scattered copies match the canonical home', () => {
    expect(MU_SUN_ORBITAL).toBe(MU_SUN_AU3_YR2); // orbital.ts (AU³/yr²)
    expect(AU_ORBITAL).toBe(AU_TO_KM); // orbital.ts AU_TO_KM
    expect(MU_EARTH_ASCENT).toBe(MU_EARTH_M3_S2); // ascent-physics-constants (m³/s²)
    expect(MU_EARTH_GEO).toBe(MU_EARTH_KM3_S2); // lambert-geocentric (km³/s²)
    expect(MU_MOON_GEO).toBe(MU_MOON_KM3_S2); // lambert-geocentric (km³/s²)
    expect(AU_GEO).toBe(AU_TO_KM); // lambert-geocentric AU_TO_KM (S2 holistic MAJOR-4)
    expect(G0_ASCENT).toBe(G0); // ascent-physics-constants G0
    expect(G0_DESCENT).toBe(G0); // descent-physics-constants G0 (a 2nd copy)
    // planets.json's mu_sun is in Gaussian AU³/yr² (= 4π²), NOT km-family — the
    // agreement test revealed the actual unit (the S1 review's "km-family" label
    // was wrong). It's a 3rd copy of MU_SUN_AU3_YR2, a duplication (not unit) hazard.
    expect(MU_SUN_LAMBERT).toBeCloseTo(MU_SUN_AU3_YR2, 5);
  });

  it('the two GMST impls agree (JD-based == Date-based)', () => {
    const d = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));
    const a = gmstRad(julianDay(d));
    const b = gmstRadians(d);
    // compare on the circle (both in [0, 2π))
    const diff = Math.abs(((a - b + Math.PI) % (2 * Math.PI)) - Math.PI);
    expect(diff).toBeLessThan(1e-6);
  });
});
