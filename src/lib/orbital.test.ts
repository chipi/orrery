import { describe, it, expect } from 'vitest';
import { visViva, keplerPos, MU_SUN, AU_TO_KM, AU_TO_LMIN, AUPYR_TO_KMS } from './orbital';
import planetsData from '$data/planets.json';

describe('visViva', () => {
  it('Earth at 1 AU ≈ 29.78 km/s', () => {
    expect(visViva(1.0, 1.0)).toBeCloseTo(29.78, 1);
  });

  it('Mars at 1.524 AU ≈ 24.13 km/s', () => {
    expect(visViva(1.524, 1.524)).toBeCloseTo(24.13, 1);
  });

  it('Hohmann transfer perihelion (a=1.262, r=1.0) ≈ 32.73 km/s', () => {
    expect(visViva(1.262, 1.0)).toBeCloseTo(32.73, 1);
  });
});

describe('keplerPos', () => {
  it('circular orbit (e=0) gives r = a at any anomaly', () => {
    const p = keplerPos(1.0, 0, 0, 365, 91); // quarter orbit
    expect(p.r).toBeCloseTo(1.0, 6);
  });

  it('perihelion (nu=0) gives r = a(1-e) for Mars', () => {
    // L0=0, t=0 → nu=0 → r = a(1-e²)/(1+e) = a(1-e)
    const p = keplerPos(1.524, 0.093, 0, 686.97, 0);
    expect(p.r).toBeCloseTo(1.524 * (1 - 0.093), 5);
  });

  it('aphelion (nu=π) gives r = a(1+e) for Mars', () => {
    // L0=π, t=0 → nu=π → r = a(1-e²)/(1-e) = a(1+e)
    const p = keplerPos(1.524, 0.093, Math.PI, 686.97, 0);
    expect(p.r).toBeCloseTo(1.524 * (1 + 0.093), 5);
  });

  it('returned x,y satisfy x² + y² = r²', () => {
    const p = keplerPos(1.524, 0.093, 1.5, 686.97, 100);
    expect(Math.sqrt(p.x ** 2 + p.y ** 2)).toBeCloseTo(p.r, 10);
  });
});

describe('orbital constants match data/planets.json', () => {
  it('MU_SUN matches planets.json constants.mu_sun', () => {
    expect(MU_SUN).toBeCloseTo(planetsData.constants.mu_sun, 10);
  });
  it('AU_TO_KM matches planets.json constants.au_to_km', () => {
    expect(AU_TO_KM).toBe(planetsData.constants.au_to_km);
  });
  it('AU_TO_LMIN matches planets.json constants.au_to_lmin', () => {
    expect(AU_TO_LMIN).toBe(planetsData.constants.au_to_lmin);
  });
  it('AUPYR_TO_KMS matches planets.json constants.aupyr_to_kms', () => {
    expect(AUPYR_TO_KMS).toBe(planetsData.constants.aupyr_to_kms);
  });
});
