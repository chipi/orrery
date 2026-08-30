import { describe, it, expect } from 'vitest';
import { circularVelocityKms, visVivaKms, orbitalPeriodS, hohmannTransfer } from './orbits';
import { MU_EARTH_KM3_S2, R_EARTH_KM, MOON_ORBIT_RADIUS_KM } from '../util/constants';

const LEO = R_EARTH_KM + 200; // 200 km altitude → 6571 km radius
const GEO = 42_164; // geostationary radius (km)

describe('orbits · circular velocity', () => {
  it('LEO circular speed ≈ 7.8 km/s', () => {
    expect(circularVelocityKms(LEO, MU_EARTH_KM3_S2)).toBeCloseTo(7.79, 1);
  });
  it('GEO circular speed ≈ 3.07 km/s', () => {
    expect(circularVelocityKms(GEO, MU_EARTH_KM3_S2)).toBeCloseTo(3.07, 1);
  });
});

describe('orbits · orbital period', () => {
  it('GEO period ≈ one sidereal day (86164 s)', () => {
    // GEO is defined by this — a strong cross-check that µ/units are right.
    expect(orbitalPeriodS(GEO, MU_EARTH_KM3_S2)).toBeCloseTo(86_164, -2);
  });
});

describe('orbits · vis-viva', () => {
  it('reduces to circular speed when r = a', () => {
    expect(visVivaKms(LEO, LEO, MU_EARTH_KM3_S2)).toBeCloseTo(
      circularVelocityKms(LEO, MU_EARTH_KM3_S2),
      9,
    );
  });
  it('is faster at periapsis than the circular speed there (elliptical transfer)', () => {
    const a = (LEO + GEO) / 2;
    expect(visVivaKms(LEO, a, MU_EARTH_KM3_S2)).toBeGreaterThan(
      circularVelocityKms(LEO, MU_EARTH_KM3_S2),
    );
  });
});

describe('orbits · Hohmann transfer', () => {
  it('LEO → GEO total Δv ≈ 3.9 km/s (textbook), two positive burns', () => {
    const h = hohmannTransfer(LEO, GEO, MU_EARTH_KM3_S2);
    expect(h.totalKms).toBeCloseTo(3.9, 1);
    expect(h.dv1Kms).toBeGreaterThan(0);
    expect(h.dv2Kms).toBeGreaterThan(0);
    expect(h.totalKms).toBeCloseTo(h.dv1Kms + h.dv2Kms, 9);
  });

  it('LEO → Moon: the departure burn is the ~3.1 km/s trans-lunar injection', () => {
    const h = hohmannTransfer(LEO, MOON_ORBIT_RADIUS_KM, MU_EARTH_KM3_S2);
    expect(h.dv1Kms).toBeCloseTo(3.1, 1);
  });

  it('LEO → Moon transfer time ≈ 5 days', () => {
    const h = hohmannTransfer(LEO, MOON_ORBIT_RADIUS_KM, MU_EARTH_KM3_S2);
    expect(h.tofS / 86_400).toBeCloseTo(5, 0);
  });
});
