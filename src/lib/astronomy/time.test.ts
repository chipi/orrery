import { describe, it, expect } from 'vitest';
import { julianDay, gmstRad, lstRad, meanObliquityRad, centuriesSinceJ2000 } from './time';

const R2D = 180 / Math.PI;
const J2000_JD = 2451545.0;

describe('astronomy/time', () => {
  it('julianDay + centuries anchor at J2000.0', () => {
    const jd = julianDay(new Date('2000-01-01T12:00:00Z'));
    expect(jd).toBeCloseTo(J2000_JD, 5);
    expect(centuriesSinceJ2000(jd)).toBeCloseTo(0, 6);
  });

  it('GMST at J2000.0 = 280.46061837° (the IAU series constant)', () => {
    expect(gmstRad(J2000_JD) * R2D).toBeCloseTo(280.4606, 2);
  });

  it('GMST advances ~360.9856°/day (one sidereal rotation + a bit)', () => {
    const a = (gmstRad(J2000_JD) * R2D + 360) % 360;
    const b = (gmstRad(J2000_JD + 1) * R2D + 360) % 360;
    let d = ((b - a) % 360) + 360;
    d %= 360;
    expect(d).toBeCloseTo(0.9856, 2);
  });

  it('LST = GMST + east longitude (mod 2π)', () => {
    const lonRad = (-74 * Math.PI) / 180;
    const expected = ((gmstRad(J2000_JD) + lonRad) % (2 * Math.PI)) + 2 * Math.PI;
    expect(lstRad(J2000_JD, lonRad)).toBeCloseTo(expected % (2 * Math.PI), 6);
  });

  it('mean obliquity at J2000.0 ≈ 23.4393°', () => {
    expect(meanObliquityRad(J2000_JD) * R2D).toBeCloseTo(23.4393, 3);
  });
});
