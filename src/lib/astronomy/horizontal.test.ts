import { describe, it, expect } from 'vitest';
import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  precessEclipticJ2000ToDate,
  precessEquatorialJ2000ToDate,
} from './horizontal';
import { lstRad, meanObliquityRad } from './time';

const J2000 = 2451545.0;

const D2R = Math.PI / 180;
const radec2xyz = (raDeg: number, decDeg: number) => {
  const ra = raDeg * D2R;
  const de = decDeg * D2R;
  return { x: Math.cos(de) * Math.cos(ra), y: Math.cos(de) * Math.sin(ra), z: Math.sin(de) };
};
const xyz2radec = (v: { x: number; y: number; z: number }) => ({
  raDeg: ((Math.atan2(v.y, v.x) * 180) / Math.PI + 360) % 360,
  decDeg: (Math.asin(v.z / Math.hypot(v.x, v.y, v.z)) * 180) / Math.PI,
});

describe('precessEclipticJ2000ToDate (M1)', () => {
  it('is the identity at the J2000 epoch (no accumulated precession)', () => {
    const v = precessEclipticJ2000ToDate({ x: 0.4, y: -0.7, z: 0.05 }, J2000);
    expect(v.x).toBeCloseTo(0.4, 12);
    expect(v.y).toBeCloseTo(-0.7, 12);
    expect(v.z).toBe(0.05);
  });

  it('rotates ecliptic longitude by ≈0.363° in 2026 (the ~0.36° error it corrects)', () => {
    const jd2026 = J2000 + 26 * 365.25; // ~2026-01-01
    const v = precessEclipticJ2000ToDate({ x: 1, y: 0, z: 0 }, jd2026);
    const lonRad = Math.atan2(v.y, v.x);
    const lonDeg = (lonRad * 180) / Math.PI;
    // 5028.796″/century × 0.26 century = 1307.5″ = 0.3632°
    expect(lonDeg).toBeCloseTo(0.3632, 3);
  });

  it('grows ≈0.014°/yr (general precession rate 50.29″/yr)', () => {
    const lonAt = (jd: number) => {
      const v = precessEclipticJ2000ToDate({ x: 1, y: 0, z: 0 }, jd);
      return (Math.atan2(v.y, v.x) * 180) / Math.PI;
    };
    expect(lonAt(J2000 + 365.25) - lonAt(J2000)).toBeCloseTo(0.01397, 4);
  });

  it('is a pure rotation about the ecliptic pole — preserves |v| and the z component', () => {
    const jd = J2000 + 30 * 365.25;
    const src = { x: 0.3, y: 0.6, z: -0.2 };
    const v = precessEclipticJ2000ToDate(src, jd);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(Math.hypot(src.x, src.y, src.z), 12);
    expect(v.z).toBe(src.z);
  });

  it('advances longitude in the correct (eastward, prograde) sense', () => {
    const jd = J2000 + 50 * 365.25;
    const v = precessEclipticJ2000ToDate({ x: 1, y: 0, z: 0 }, jd);
    expect(v.y).toBeGreaterThan(0); // +x rotates toward +y ⇒ longitude increases
  });
});

describe('precessEquatorialJ2000ToDate (M1 — stars)', () => {
  it('is the identity at the J2000 epoch', () => {
    const v = precessEquatorialJ2000ToDate(radec2xyz(45, 20), J2000);
    const { raDeg, decDeg } = xyz2radec(v);
    expect(raDeg).toBeCloseTo(45, 6);
    expect(decDeg).toBeCloseTo(20, 6);
  });

  it('is a pure rotation — preserves the vector magnitude', () => {
    const src = radec2xyz(120, -35);
    const v = precessEquatorialJ2000ToDate(src, J2000 + 30 * 365.25);
    expect(Math.hypot(v.x, v.y, v.z)).toBeCloseTo(1, 12);
  });

  it('matches Meeus ex. 21.b (θ Persei J2000 → 2028) to arcsecond precision', () => {
    // Meeus's published result includes proper motion; precession alone lands
    // within a few arcsec of it (the residual IS θ Persei's proper motion).
    const ra0 = (2 + 44 / 60 + 11.986 / 3600) * 15;
    const de0 = 49 + 13 / 60 + 42.48 / 3600;
    const v = precessEquatorialJ2000ToDate(radec2xyz(ra0, de0), 2462088.69);
    const { raDeg, decDeg } = xyz2radec(v);
    // Meeus final: α 2h46m11.331s = 41.5472°, δ +49°20'54.54" = 49.3485°.
    expect(raDeg).toBeCloseTo(41.5472, 1);
    expect(decDeg).toBeCloseTo(49.3485, 1);
  });

  it('shifts a J2000 equinox-direction star by ≈0.33° over 26 yr (the corrected residual)', () => {
    const v = precessEquatorialJ2000ToDate(radec2xyz(0, 0), J2000 + 26 * 365.25);
    const { raDeg } = xyz2radec(v);
    expect(raDeg).toBeGreaterThan(0.25);
    expect(raDeg).toBeLessThan(0.42);
  });
});

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
