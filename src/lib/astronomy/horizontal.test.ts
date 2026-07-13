import { describe, it, expect } from 'vitest';
import { eclipticToEquatorial, equatorialToHorizontal } from './horizontal';
import { lstRad, meanObliquityRad } from './time';

const J2000 = 2451545.0;

describe('eclipticToEquatorial', () => {
  it('vernal equinox (ecliptic +x) maps to RA 0, Dec 0', () => {
    const e = eclipticToEquatorial({ x: 1, y: 0, z: 0 }, J2000);
    expect(e.raRad).toBeCloseTo(0, 9);
    expect(e.decRad).toBeCloseTo(0, 9);
    expect(e.distanceAu).toBeCloseTo(1, 9);
  });

  it('summer-solstice direction (ecliptic +y) → RA 90°, Dec = +obliquity', () => {
    const eps = meanObliquityRad(J2000); // ~23.44°
    const e = eclipticToEquatorial({ x: 0, y: 1, z: 0 }, J2000);
    expect(e.raRad).toBeCloseTo(Math.PI / 2, 9);
    expect(e.decRad).toBeCloseTo(eps, 9);
  });

  it('ecliptic north pole (+z) sits at Dec = 90° − obliquity', () => {
    const eps = meanObliquityRad(J2000);
    const e = eclipticToEquatorial({ x: 0, y: 0, z: 1 }, J2000);
    expect(e.decRad).toBeCloseTo(Math.PI / 2 - eps, 9);
  });

  it('distanceAu is the vector magnitude', () => {
    const e = eclipticToEquatorial({ x: 3, y: 0, z: 4 }, J2000);
    expect(e.distanceAu).toBeCloseTo(5, 9);
  });
});

describe('equatorialToHorizontal', () => {
  // Pick a concrete epoch/observer, then place bodies on the local meridian by
  // setting RA = local sidereal time (hour angle H = 0) — the culmination case,
  // which has closed-form altitude/azimuth independent of the sidereal clock.
  const jd = 2460000.3;
  const lon = 0.4;
  const lat = 0.6;
  const lst = lstRad(jd, lon);
  const FAR = 1e6; // AU → parallax negligible

  it('a meridian body at the observer’s declination is at the zenith', () => {
    const h = equatorialToHorizontal({ raRad: lst, decRad: lat, distanceAu: FAR }, jd, lat, lon);
    expect(h.altRad).toBeCloseTo(Math.PI / 2, 4);
  });

  it('an equatorial body on the meridian culminates due south at alt = 90° − lat', () => {
    const h = equatorialToHorizontal({ raRad: lst, decRad: 0, distanceAu: FAR }, jd, lat, lon);
    expect(h.altRad).toBeCloseTo(Math.PI / 2 - lat, 4);
    expect(h.azRad).toBeCloseTo(Math.PI, 4); // due South (from-North, clockwise)
  });

  it('normalises azimuth to [0, 2π) and keeps altitude within ±90°', () => {
    const h = equatorialToHorizontal({ raRad: 1.2, decRad: -0.3, distanceAu: FAR }, jd, lat, lon);
    expect(h.azRad).toBeGreaterThanOrEqual(0);
    expect(h.azRad).toBeLessThan(2 * Math.PI);
    expect(Math.abs(h.altRad)).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
    expect(h.azimuthDeg).toBeCloseTo((h.azRad * 180) / Math.PI, 9);
  });

  it('topocentric parallax lowers a nearby body’s altitude vs the geocentric view', () => {
    const far = equatorialToHorizontal({ raRad: lst, decRad: 0, distanceAu: FAR }, jd, lat, lon);
    // ~Moon distance (384 400 km) in AU — parallax ≈ 0.95°.
    const near = equatorialToHorizontal(
      { raRad: lst, decRad: 0, distanceAu: 0.002569 },
      jd,
      lat,
      lon,
    );
    expect(near.altRad).toBeLessThan(far.altRad);
    // ~0.5° at this altitude (parallax·cos(alt)) — a real shift, not float noise.
    expect(far.altRad - near.altRad).toBeGreaterThan(0.008);
  });
});
