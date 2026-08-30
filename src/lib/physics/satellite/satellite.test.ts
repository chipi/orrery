import { describe, it, expect } from 'vitest';
import { parseTle } from './tle';
import { propagate, semiMajorAxisKm } from './propagate';
import { lookAngle, observerEci } from './look-angles';
import { stationTle, stationLookAngle, nextPass, STATION_IDS } from './index';
import { julianDay } from '../ephemeris/time';

const RE = 6378.137;

describe('satellite — TLE parsing', () => {
  it('parses the ISS element set', () => {
    const t = stationTle('iss');
    expect(t.noradId).toBe(25544);
    expect((t.inclRad * 180) / Math.PI).toBeCloseTo(51.64, 1);
    expect(t.revsPerDay).toBeCloseTo(15.5, 1);
    expect(t.eccentricity).toBeGreaterThan(0);
    expect(t.eccentricity).toBeLessThan(0.01);
  });
});

describe('satellite — orbit sanity', () => {
  it('ISS semi-major axis → ~400 km altitude', () => {
    const a = semiMajorAxisKm(stationTle('iss'));
    expect(a - RE).toBeGreaterThan(300);
    expect(a - RE).toBeLessThan(600);
  });

  it('altitude stays roughly constant while propagating (low eccentricity)', () => {
    const t = stationTle('iss');
    const alts: number[] = [];
    for (let m = 0; m <= 90; m += 10) {
      const p = propagate(t, t.epochJd + m / 1440);
      alts.push(Math.hypot(p.x, p.y, p.z) - RE);
    }
    const min = Math.min(...alts);
    const max = Math.max(...alts);
    expect(min).toBeGreaterThan(300);
    expect(max).toBeLessThan(600);
    expect(max - min).toBeLessThan(60); // near-circular
  });

  it('returns near its start position after one orbital period', () => {
    const t = stationTle('iss');
    const periodMin = 1440 / t.revsPerDay;
    const p0 = propagate(t, t.epochJd);
    const p1 = propagate(t, t.epochJd + periodMin / 1440);
    const d = Math.hypot(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    expect(d).toBeLessThan(200); // km — J2 drift over one orbit is small
  });
});

describe('satellite — look angles', () => {
  it('yields finite alt/az/range in range for both stations', () => {
    const date = new Date('2024-10-06T20:00:00Z');
    for (const id of STATION_IDS) {
      const la = stationLookAngle(id, date, 40, -74);
      expect(Number.isFinite(la.altitudeDeg)).toBe(true);
      expect(la.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(la.azimuthDeg).toBeLessThan(360);
      expect(la.altitudeDeg).toBeGreaterThanOrEqual(-90);
      expect(la.altitudeDeg).toBeLessThanOrEqual(90);
      expect(la.rangeKm).toBeGreaterThan(300); // ≥ orbit altitude
      expect(la.rangeKm).toBeLessThan(15000);
    }
  });

  it('is above the horizon at some point over a day near its ground track', () => {
    const t = stationTle('iss');
    let seenAbove = false;
    const start = new Date('2024-10-06T00:00:00Z').getTime();
    for (let m = 0; m < 1440 && !seenAbove; m += 1) {
      const jd = julianDay(new Date(start + m * 60_000));
      const la = lookAngle(propagate(t, jd), jd, (40 * Math.PI) / 180, (-74 * Math.PI) / 180);
      if (la.aboveHorizon) seenAbove = true;
    }
    expect(seenAbove).toBe(true);
  });
});

describe('satellite — TLE parse + epoch rollover', () => {
  const L2 = '2 25544  51.6000 000.0000 0006000 000.0000 000.0000 15.50000000 00001';
  it('resolves 2-digit years across the 1957 pivot + parses core fields', () => {
    const t98 = parseTle('1 25544U 98067A   98324.00000000  .0 0 0 0 9', L2);
    const t24 = parseTle('1 25544U 98067A   24001.00000000  .0 0 0 0 9', L2);
    const year = (jd: number) => new Date((jd - 2440587.5) * 86_400_000).getUTCFullYear();
    expect(year(t98.epochJd)).toBe(1998);
    expect(year(t24.epochJd)).toBe(2024);
    expect(t24.noradId).toBe(25544);
    expect((t24.inclRad * 180) / Math.PI).toBeCloseTo(51.6, 1);
    expect(t24.eccentricity).toBeCloseTo(0.0006, 4);
    expect(t24.revsPerDay).toBeCloseTo(15.5, 2);
  });
});

describe('satellite — no-pass case', () => {
  it('returns null when nothing clears an implausibly high elevation gate', () => {
    const pass = nextPass('iss', new Date('2024-10-06T00:00:00Z'), 40, -74, {
      hoursAhead: 3,
      minMaxAltDeg: 89.9,
    });
    expect(pass).toBeNull();
  });
});

describe('satellite — pass prediction', () => {
  it('finds a plausible next pass (start < culmination < end, maxAlt ≥ gate)', () => {
    const pass = nextPass('iss', new Date('2024-10-06T00:00:00Z'), 40, -74, {
      hoursAhead: 48,
      minMaxAltDeg: 10,
    });
    expect(pass).not.toBeNull();
    if (pass) {
      expect(pass.start.getTime()).toBeLessThan(pass.culmination.getTime());
      expect(pass.culmination.getTime()).toBeLessThan(pass.end.getTime());
      expect(pass.maxAltitudeDeg).toBeGreaterThanOrEqual(10);
      expect(typeof pass.visible).toBe('boolean');
    }
  });
});

describe('observerEci (WGS84 geodetic model)', () => {
  const jd = 2460000.5;
  const mag = (lat: number, alt = 0) => {
    const v = observerEci(jd, lat, 0, alt);
    return Math.hypot(v.x, v.y, v.z);
  };

  it('equatorial radius at the equator', () => {
    expect(mag(0)).toBeCloseTo(6378.137, 3);
  });

  it('polar radius at the pole (flattening, NOT the equatorial radius)', () => {
    // WGS84 polar radius b = a(1−f) ≈ 6356.752 km — a spherical model would
    // wrongly give 6378.137 here (the ~21 km error the fix removes).
    expect(mag(Math.PI / 2)).toBeCloseTo(6356.752, 2);
    expect(mag(Math.PI / 2)).toBeLessThan(6378.137 - 20);
  });

  it('adds altitude above the ellipsoid', () => {
    expect(mag(0, 100)).toBeCloseTo(6478.137, 3); // equator + 100 km
  });
});
