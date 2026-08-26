import { describe, it, expect } from 'vitest';
import { equatorialXyzToSkyDir } from './celestial-sky';

// The AR render frame is ENU: [East, Up, −North] (a unit vector). The celestial
// POLE is the ideal deterministic check: it sits on Earth's rotation axis, so its
// horizontal position is independent of time (jd) and longitude — the north
// celestial pole is due north at an altitude equal to the observer's latitude.
const DEG = Math.PI / 180;
const JD = 2451545; // J2000 — value is irrelevant for the pole, any jd works.

describe('equatorialXyzToSkyDir — data direction → observer sky', () => {
  it('returns a unit vector', () => {
    const [e, u, n] = equatorialXyzToSkyDir(0.3, -0.8, 0.5, JD, 40 * DEG, -74 * DEG);
    expect(Math.hypot(e, u, n)).toBeCloseTo(1, 6);
  });

  it('the North Celestial Pole sits due north at altitude = latitude', () => {
    for (const latDeg of [0, 30, 45, 60, 90]) {
      const [east, up, negNorth] = equatorialXyzToSkyDir(0, 0, 1, JD, latDeg * DEG, 0);
      // alt = latitude  →  up = sin(lat)
      expect(up).toBeCloseTo(Math.sin(latDeg * DEG), 5);
      // due north  →  no east component; −north = −cos(lat)
      expect(east).toBeCloseTo(0, 5);
      expect(negNorth).toBeCloseTo(-Math.cos(latDeg * DEG), 5);
    }
  });

  it('the pole magnitude/frame the data was baked at is irrelevant (normalised)', () => {
    // Same direction scaled by the ~700 pc display radius the figures use.
    const unit = equatorialXyzToSkyDir(0, 0, 1, JD, 45 * DEG, 0);
    const scaled = equatorialXyzToSkyDir(0, 0, 700, JD, 45 * DEG, 0);
    for (let i = 0; i < 3; i++) expect(scaled[i]).toBeCloseTo(unit[i], 6);
  });

  it('the South Celestial Pole is below the horizon for a northern observer', () => {
    const [, up] = equatorialXyzToSkyDir(0, 0, -1, JD, 45 * DEG, 0); // dec = −90
    expect(up).toBeCloseTo(-Math.sin(45 * DEG), 5); // alt = −latitude
    expect(up).toBeLessThan(0);
  });

  it('is time/longitude-independent at the pole (on the rotation axis)', () => {
    const a = equatorialXyzToSkyDir(0, 0, 1, 2451545, 50 * DEG, 10 * DEG);
    const b = equatorialXyzToSkyDir(0, 0, 1, 2460000, 50 * DEG, -120 * DEG);
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 6);
  });
});
