import { describe, it, expect } from 'vitest';
import { keplerPos, MU_SUN, AU_TO_KM, AU_TO_LMIN, AUPYR_TO_KMS } from './orbital';
import { visVivaKms } from '../mechanics/orbits';
import { MU_SUN_KM3_S2 } from '../util/constants';
import planetsData from '$data/planets.json';

// Vis-viva now has ONE canonical implementation — `mechanics/orbits.visVivaKms`
// (µ passed in). These heliocentric reference checks moved here from the removed
// AU/yr `visViva` (M2 MINOR-1); the physics is identical, the units are explicit.
describe('visVivaKms — heliocentric reference values', () => {
  // Reference values from NASA Planetary Fact Sheets (2023):
  // - Earth mean orbital velocity: 29.78 km/s
  // - Mars mean orbital velocity: 24.13 km/s
  // https://nssdc.gsfc.nasa.gov/planetary/factsheet/
  // Hohmann perihelion velocity from Curtis "Orbital Mechanics for
  // Engineering Students" §6.2 — for the Earth → Mars Hohmann transfer
  // with a = (1 + 1.524)/2 = 1.262 AU, perihelion v ≈ 32.73 km/s.
  const au = (r: number): number => r * AU_TO_KM;
  it('Earth at 1 AU ≈ 29.78 km/s (NASA fact sheet)', () => {
    expect(visVivaKms(au(1.0), au(1.0), MU_SUN_KM3_S2)).toBeCloseTo(29.78, 1);
  });

  it('Mars at 1.524 AU ≈ 24.13 km/s (NASA fact sheet)', () => {
    expect(visVivaKms(au(1.524), au(1.524), MU_SUN_KM3_S2)).toBeCloseTo(24.13, 1);
  });

  it('Hohmann transfer perihelion (a=1.262, r=1.0) ≈ 32.73 km/s (Curtis §6.2)', () => {
    expect(visVivaKms(au(1.0), au(1.262), MU_SUN_KM3_S2)).toBeCloseTo(32.73, 1);
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

  // Edge cases flagged by the audit as missing coverage.
  it('high eccentricity (e=0.5) — perihelion / aphelion match a(1±e)', () => {
    expect(keplerPos(2.0, 0.5, 0, 1000, 0).r).toBeCloseTo(2.0 * 0.5, 6);
    expect(keplerPos(2.0, 0.5, Math.PI, 1000, 0).r).toBeCloseTo(2.0 * 1.5, 6);
  });

  it('cometary eccentricity (e=0.9) stays finite and physical', () => {
    const peri = keplerPos(10.0, 0.9, 0, 5000, 0);
    const aph = keplerPos(10.0, 0.9, Math.PI, 5000, 0);
    expect(peri.r).toBeCloseTo(10.0 * 0.1, 6);
    expect(aph.r).toBeCloseTo(10.0 * 1.9, 6);
    expect(Number.isFinite(peri.x)).toBe(true);
    expect(Number.isFinite(aph.x)).toBe(true);
  });

  it('time wraps modulo period: keplerPos(..., t) = keplerPos(..., t + T)', () => {
    const T = 686.97;
    const a = keplerPos(1.524, 0.093, 1.5, T, 100);
    const b = keplerPos(1.524, 0.093, 1.5, T, 100 + T);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
    expect(b.r).toBeCloseTo(a.r, 6);
  });

  it('two full periods later, position returns', () => {
    const T = 365.25;
    const a = keplerPos(1.0, 0.017, 1.753, T, 50);
    const b = keplerPos(1.0, 0.017, 1.753, T, 50 + 2 * T);
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(1e-9);
  });
});

describe('keplerPos — longitude of perihelion ϖ (S2)', () => {
  // The pre-S2 model phased the conic by mean longitude directly, pinning
  // perihelion at ecliptic longitude 0 for every body. With ϖ the perihelion
  // must sit at ϖ, and the body's date-anchored radius must match reality.
  it('perihelion (min r) occurs at ecliptic longitude ϖ, not at 0', () => {
    const a = 39.482,
      e = 0.2488,
      L0 = 4.17,
      T = 90560,
      varpi = 3.90956; // Pluto (J2000)
    let minR = Infinity,
      thetaAtMin = 0;
    for (let t = 0; t < T; t += T / 4000) {
      const p = keplerPos(a, e, L0, T, t, varpi);
      if (p.r < minR) {
        minR = p.r;
        thetaAtMin = Math.atan2(p.y, p.x);
      }
    }
    expect(minR).toBeCloseTo(a * (1 - e), 3); // perihelion distance a(1−e)
    const wrapped = (thetaAtMin + 2 * Math.PI) % (2 * Math.PI);
    expect(wrapped).toBeCloseTo(varpi, 2); // …located AT ϖ, not 0
  });

  it('with ϖ omitted (=0) perihelion falls at longitude 0 — the pre-S2 behaviour', () => {
    const a = 39.482,
      e = 0.2488,
      L0 = 4.17,
      T = 90560;
    let minR = Infinity,
      thetaAtMin = 0;
    for (let t = 0; t < T; t += T / 4000) {
      const p = keplerPos(a, e, L0, T, t); // no ϖ
      if (p.r < minR) {
        minR = p.r;
        thetaAtMin = Math.atan2(p.y, p.x);
      }
    }
    expect(Math.abs(thetaAtMin)).toBeLessThan(0.02); // perihelion at longitude 0
  });

  it("Pluto's date-anchored radius is physical (≈35–36 AU in 2026, moving out from 1989 perihelion)", () => {
    // J2000 = 2000-01-01; ~2026-01-01 ≈ day 9497. Pluto's real heliocentric
    // distance is ~35.6 AU then (perihelion 29.66 AU was 1989). The pre-S2
    // conic, with perihelion mis-placed at longitude 0, cannot reproduce this.
    const p = keplerPos(39.482, 0.2488, 4.17, 90560, 9497, 3.90956);
    expect(p.r).toBeGreaterThan(34);
    expect(p.r).toBeLessThan(37);
  });

  it('circular orbit ignores ϖ entirely (position identical with or without it)', () => {
    const withVarpi = keplerPos(1.524, 0, 5.1361, 686.98, 1234, 5.86529);
    const without = keplerPos(1.524, 0, 5.1361, 686.98, 1234);
    expect(withVarpi.x).toBe(without.x);
    expect(withVarpi.y).toBe(without.y);
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
