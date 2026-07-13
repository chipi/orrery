import { describe, it, expect } from 'vitest';
import { skyPosition, skyDirectionENU, SKY_BODIES } from './index';

// Validation anchors from standard references. Tolerances are generous (~0.5–1°)
// because we omit nutation/aberration and use low-precision series — still far
// finer than a hand-held phone points.

describe('astronomy — reference anchors', () => {
  it('Sun sits at ~18.76h RA / −23° Dec at the J2000.0 epoch', () => {
    const s = skyPosition('sun', new Date('2000-01-01T12:00:00Z'), 0, 0);
    expect(s.raHours).toBeCloseTo(18.76, 0); // within ~0.5h
    expect(s.decDeg).toBeCloseTo(-23.0, 0); // within ~0.5°
  });

  it('Sun declination swings to the solstices', () => {
    const jun = skyPosition('sun', new Date('2000-06-21T12:00:00Z'), 0, 0);
    const dec = skyPosition('sun', new Date('2000-12-21T12:00:00Z'), 0, 0);
    expect(jun.decDeg).toBeGreaterThan(23.0);
    expect(dec.decDeg).toBeLessThan(-23.0);
  });

  it('Venus matches Meeus ex. 13.b (USNO, 1987-04-10 19:21 UT)', () => {
    // Meeus: az 68.03° from South (westward) → 248.03° from North; alt 15.12°.
    const v = skyPosition('venus', new Date('1987-04-10T19:21:00Z'), 38.92139, -77.06556);
    expect(v.azimuthDeg).toBeCloseTo(248.0, 0); // within ~0.5°
    expect(v.altitudeDeg).toBeCloseTo(15.12, 0);
  });

  it('Moon distance is ~0.0024–0.0027 AU (≈356k–407k km)', () => {
    const m = skyPosition('moon', new Date('2024-01-01T00:00:00Z'), 52, 5);
    expect(m.distanceAu).toBeGreaterThan(0.0023);
    expect(m.distanceAu).toBeLessThan(0.0028);
  });
});

describe('astronomy — invariants', () => {
  it('every body yields finite alt/az in range', () => {
    const d = new Date('2026-07-13T21:00:00Z');
    for (const b of SKY_BODIES) {
      const p = skyPosition(b, d, 40, -74);
      expect(Number.isFinite(p.altitudeDeg)).toBe(true);
      expect(p.azimuthDeg).toBeGreaterThanOrEqual(0);
      expect(p.azimuthDeg).toBeLessThan(360);
      expect(p.altitudeDeg).toBeGreaterThanOrEqual(-90);
      expect(p.altitudeDeg).toBeLessThanOrEqual(90);
    }
  });

  it('ENU direction is a unit vector with the right up-sign', () => {
    const zenith = skyDirectionENU({ altRad: Math.PI / 2, azRad: 0 });
    expect(zenith[1]).toBeCloseTo(1, 5); // straight up
    const north = skyDirectionENU({ altRad: 0, azRad: 0 });
    expect(north[2]).toBeCloseTo(-1, 5); // North = −z
    const east = skyDirectionENU({ altRad: 0, azRad: Math.PI / 2 });
    expect(east[0]).toBeCloseTo(1, 5); // East = +x
  });
});
