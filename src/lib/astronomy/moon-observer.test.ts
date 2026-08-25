import { describe, it, expect } from 'vitest';
import {
  moonPhase,
  moonLibration,
  opticalLibration,
  moonObserverView,
} from './moon-observer';
import { julianDay, centuriesSinceJ2000 } from './time';

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

describe('moonPhase — against known 2024 lunar-phase instants', () => {
  // Almanac phase times (UTC).
  const NEW = new Date('2024-01-11T11:57:00Z');
  const FIRST_Q = new Date('2024-01-18T03:52:00Z');
  const FULL = new Date('2024-01-25T17:54:00Z');
  const LAST_Q = new Date('2024-02-02T23:18:00Z');

  it('new moon is ~dark and named "new"', () => {
    const p = moonPhase(NEW);
    expect(p.illuminatedFraction).toBeLessThan(0.02);
    expect(p.phaseName).toBe('new');
  });

  it('first quarter is ~half lit, waxing', () => {
    const p = moonPhase(FIRST_Q);
    expect(p.illuminatedFraction).toBeGreaterThan(0.45);
    expect(p.illuminatedFraction).toBeLessThan(0.55);
    expect(p.waxing).toBe(true);
    expect(p.phaseName).toBe('first-quarter');
    expect(Math.abs(p.ageDeg - 90)).toBeLessThan(10);
  });

  it('full moon is ~fully lit and named "full"', () => {
    const p = moonPhase(FULL);
    expect(p.illuminatedFraction).toBeGreaterThan(0.99);
    expect(p.phaseName).toBe('full');
    expect(Math.abs(p.ageDeg - 180)).toBeLessThan(10);
  });

  it('last quarter is ~half lit, waning', () => {
    const p = moonPhase(LAST_Q);
    expect(p.illuminatedFraction).toBeGreaterThan(0.45);
    expect(p.illuminatedFraction).toBeLessThan(0.55);
    expect(p.waxing).toBe(false);
    expect(p.phaseName).toBe('last-quarter');
  });
});

describe('opticalLibration — Meeus example 53.a (1992 Apr 12, 0h TD)', () => {
  it('reproduces the optical sub-Earth point (~ −1.2°, +4.2°)', () => {
    // Feed Meeus's apparent λ/β with node + argument-of-latitude from the same
    // mean formulas moonLibration uses — so this tests the formula transcription
    // independent of which ephemeris supplies λ/β.
    const jd = 2448724.5; // 1992-04-12.0 TD
    const t = centuriesSinceJ2000(jd);
    const omega = norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t);
    const argLat = norm360(93.272095 + 483202.0175233 * t - 0.0036539 * t * t);
    const lib = opticalLibration(133.162655, -3.229126, omega, argLat);
    expect(lib.lonDeg).toBeCloseTo(-1.21, 0); // within ~0.5°
    expect(lib.latDeg).toBeCloseTo(4.19, 0);
  });
});

describe('moonLibration — physically bounded amplitude over a year', () => {
  it('stays within the optical envelope and actually swings through it', () => {
    let maxLon = 0;
    let maxLat = 0;
    const start = Date.UTC(2024, 0, 1);
    for (let day = 0; day < 366; day++) {
      const lib = moonLibration(new Date(start + day * 86_400_000));
      expect(Math.abs(lib.lonDeg)).toBeLessThan(9); // amplitude ~7.9°
      expect(Math.abs(lib.latDeg)).toBeLessThan(8); // amplitude ~6.9°
      maxLon = Math.max(maxLon, Math.abs(lib.lonDeg));
      maxLat = Math.max(maxLat, Math.abs(lib.latDeg));
    }
    // A units/sign bug would collapse the swing toward zero — assert it's real.
    expect(maxLon).toBeGreaterThan(5);
    expect(maxLat).toBeGreaterThan(5);
  });
});

describe('moonObserverView — the location effect', () => {
  const FULL = new Date('2024-01-25T17:54:00Z');

  it('reports altitude/aboveHorizon consistently', () => {
    const v = moonObserverView(FULL, 40, -74); // New York
    expect(v.aboveHorizon).toBe(v.altitudeDeg > 0);
    expect(v.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(v.azimuthDeg).toBeLessThan(360);
  });

  it('flips the sunlit-limb-vs-zenith orientation between far north and deep south', () => {
    // Same instant: a high-northern and a deep-southern observer see the Moon
    // rotated ~180° relative to their local vertical.
    const north = moonObserverView(FULL, 60, 0);
    const south = moonObserverView(FULL, -50, 0);
    // Signed angular separation of the two orientations, 0..180.
    const diff = Math.abs((((north.limbToZenithDeg - south.limbToZenithDeg) % 360) + 540) % 360 - 180);
    // Substantial — the disk is visibly rotated between the hemispheres, not the
    // same orientation. (Not exactly 180°: it depends on hour angle.)
    expect(diff).toBeGreaterThan(60);
  });
});
