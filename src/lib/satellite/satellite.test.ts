import { describe, it, expect } from 'vitest';
import { propagate, semiMajorAxisKm } from './propagate';
import { lookAngle } from './look-angles';
import { stationTle, stationLookAngle, nextPass, STATION_IDS } from './index';
import { julianDay } from '../astronomy/time';

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
