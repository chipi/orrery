import { describe, it, expect } from 'vitest';
import { locationModel, rotationVelocityKms } from './location';
import { MU_EARTH_KM3_S2, MU_MOON_KM3_S2 } from './constants';

describe('locationModel', () => {
  it('Earth: g ≈ 9.807, R = 6371 km, measured µ, equatorial rotation ≈ 0.465 km/s', () => {
    const earth = locationModel('earth')!;
    expect(earth.gMs2).toBeCloseTo(9.807, 2);
    expect(earth.rKm).toBeCloseTo(6371, 0);
    expect(earth.muKm3s2).toBe(MU_EARTH_KM3_S2); // measured override, not derived
    expect(earth.equatorialRotationKms).toBeCloseTo(0.465, 2);
  });

  it('Moon: measured µ, rotation is a tiny head-start (tidally locked, ~27 days)', () => {
    const moon = locationModel('moon')!;
    expect(moon.muKm3s2).toBe(MU_MOON_KM3_S2);
    expect(moon.equatorialRotationKms).toBeLessThan(0.01);
  });

  it('Mars: µ derives as g·R² (no measured override) and is positive', () => {
    const mars = locationModel('mars')!;
    expect(mars.muKm3s2).toBeGreaterThan(0);
    // Mars µ ≈ 42,828 km³/s²; g·R² approximation lands within a few %.
    expect(mars.muKm3s2).toBeGreaterThan(38_000);
    expect(mars.muKm3s2).toBeLessThan(48_000);
    expect(mars.equatorialRotationKms).toBeGreaterThan(0.2); // ~24.6 h day
  });

  it('Mercury has a real (tiny) rotation head-start — not silently zero (review MAJOR-1)', () => {
    const m = locationModel('mercury')!;
    expect(m.equatorialRotationKms).toBeGreaterThan(0);
    expect(m.equatorialRotationKms).toBeLessThan(0.02); // ~58.6-day spin → ~0.003 km/s
  });

  it('Venus spin is retrograde — the boost is NEGATIVE, not a fake eastward gain (review MAJOR-2)', () => {
    const v = locationModel('venus')!;
    expect(v.equatorialRotationKms).toBeLessThan(0);
  });

  it('an unknown body resolves to undefined (caller fails honest)', () => {
    expect(locationModel('not-a-body')).toBeUndefined();
  });
});

describe('rotationVelocityKms — the launch-site head start (cos latitude)', () => {
  it('is maximal at the equator and zero at the poles', () => {
    const earth = locationModel('earth')!;
    expect(rotationVelocityKms(earth, 0)).toBeCloseTo(earth.equatorialRotationKms, 9);
    expect(rotationVelocityKms(earth, 90)).toBeCloseTo(0, 9);
  });

  it('Kourou (~5°) keeps almost all the boost; Baikonur (~46°) loses ~⅓', () => {
    const earth = locationModel('earth')!;
    const kourou = rotationVelocityKms(earth, 5.2);
    const baikonur = rotationVelocityKms(earth, 45.9);
    expect(kourou).toBeGreaterThan(0.46); // near-equatorial → ~max
    expect(baikonur).toBeLessThan(kourou);
    expect(baikonur / earth.equatorialRotationKms).toBeCloseTo(Math.cos((45.9 * Math.PI) / 180), 6);
  });
});
