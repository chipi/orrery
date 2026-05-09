/**
 * Unit tests for the pure-math helpers in orbit-overlays.ts. The
 * THREE.Group-returning helpers (buildSoIRing, buildGravityArrow,
 * buildArrowTipLabel, buildCoastLine, buildMicrogravityAxes) are
 * exercised by e2e tests against the actual scenes — here we test
 * the math: log scaling, gravity acceleration, conic classification.
 */
import { describe, it, expect } from 'vitest';
import {
  SOI_KM,
  soiRadiusInScene,
  logScaleLength,
  gravityAccel,
  BODY_MASS_KG,
  classifyConic,
} from './orbit-overlays';

describe('SOI radii', () => {
  it('matches the known canonical sphere-of-influence values (within 5%)', () => {
    // Earth ≈ 924,000 km, Mars ≈ 577,000 km, Moon ≈ 66,100 km.
    // toBeCloseTo's `digits=-N` argument means within 5 × 10^(N+1) units;
    // here -3 → ±5000 km, plenty of slack against published values.
    expect(SOI_KM.earth).toBeCloseTo(924_000, -3);
    expect(SOI_KM.mars).toBeCloseTo(577_000, -3);
    expect(SOI_KM.moon).toBeCloseTo(66_100, -3);
  });

  it('soiRadiusInScene scales to the supplied AU→scene factor', () => {
    const scale = 80; // /fly's SCALE_3D
    // Earth SoI in AU = 924_000 / 149_597_870.7 ≈ 0.00618 AU.
    const expectedScene = (924_000 / 149_597_870.7) * scale;
    expect(soiRadiusInScene('earth', scale)).toBeCloseTo(expectedScene, 3);
  });
});

describe('logScaleLength', () => {
  it('returns minLen for non-positive forces', () => {
    expect(logScaleLength(0)).toBe(0.05);
    expect(logScaleLength(-1)).toBe(0.05);
  });

  it('clamps below refMin and above refMax to the bounds', () => {
    expect(logScaleLength(1e-10)).toBe(0.05);
    expect(logScaleLength(1e6)).toBe(0.6);
  });

  it('returns midpoint length for the geometric mean of the reference range', () => {
    // refMin = 1e-6, refMax = 1e2 → log mid = (-6 + 2)/2 = -2 → F = 0.01
    const mid = logScaleLength(0.01);
    expect(mid).toBeGreaterThan(0.05);
    expect(mid).toBeLessThan(0.6);
    expect(mid).toBeCloseTo(0.05 + 0.5 * (0.6 - 0.05), 3);
  });
});

describe('gravityAccel', () => {
  it('matches Earth surface gravity at the equatorial radius (~9.81 m/s²)', () => {
    // Earth radius ≈ 6378 km.
    const g = gravityAccel(BODY_MASS_KG.earth, 6378);
    expect(g).toBeCloseTo(9.8, 1);
  });

  it('matches the lunar surface gravity (~1.62 m/s²)', () => {
    // Moon radius ≈ 1737 km.
    const g = gravityAccel(BODY_MASS_KG.moon, 1737);
    expect(g).toBeCloseTo(1.62, 1);
  });

  it('matches the Martian surface gravity (~3.71 m/s²)', () => {
    // Mars radius ≈ 3389 km.
    const g = gravityAccel(BODY_MASS_KG.mars, 3389);
    expect(g).toBeCloseTo(3.71, 1);
  });

  it('returns 0 for zero / negative distance', () => {
    expect(gravityAccel(BODY_MASS_KG.earth, 0)).toBe(0);
    expect(gravityAccel(BODY_MASS_KG.earth, -100)).toBe(0);
  });

  it('falls off as 1/r²', () => {
    const g1 = gravityAccel(BODY_MASS_KG.earth, 6378);
    const g2 = gravityAccel(BODY_MASS_KG.earth, 6378 * 2);
    expect(g2).toBeCloseTo(g1 / 4, 4);
  });
});

describe('classifyConic — orbital-energy classification', () => {
  // Helper: AU & day units (μ_sun ≈ 4π²/365.25²)
  // For a circular orbit at 1 AU, v_circ = √(μ/r).
  const MU = (4 * Math.PI * Math.PI) / (365.25 * 365.25);
  const vCircAt = (r: number) => Math.sqrt(MU / r);

  it('classifies an Earth-like circular orbit as a circle', () => {
    const r = { x: 1, y: 0, z: 0 };
    const v = { x: 0, y: vCircAt(1), z: 0 };
    const result = classifyConic(r, v);
    expect(result.shape).toBe('circle');
    expect(result.e).toBeLessThan(0.01);
  });

  it('classifies a moderately eccentric orbit as an ellipse', () => {
    // Lower the velocity so the orbit becomes an ellipse.
    const r = { x: 1, y: 0, z: 0 };
    const v = { x: 0, y: vCircAt(1) * 0.85, z: 0 };
    const result = classifyConic(r, v);
    expect(result.shape).toBe('ellipse');
    expect(result.e).toBeGreaterThan(0.01);
    expect(result.e).toBeLessThan(1);
  });

  it('classifies an exact escape velocity as parabolic (within tolerance)', () => {
    const r = { x: 1, y: 0, z: 0 };
    const vEsc = Math.sqrt(2) * vCircAt(1); // escape velocity at 1 AU
    const v = { x: 0, y: vEsc, z: 0 };
    const result = classifyConic(r, v);
    expect(result.shape).toBe('parabola');
  });

  it('classifies an above-escape velocity as a hyperbola', () => {
    const r = { x: 1, y: 0, z: 0 };
    const vEsc = Math.sqrt(2) * vCircAt(1);
    const v = { x: 0, y: vEsc * 1.5, z: 0 };
    const result = classifyConic(r, v);
    expect(result.shape).toBe('hyperbola');
    expect(result.e).toBeGreaterThan(1);
    expect(result.epsilon).toBeGreaterThan(0);
  });

  it('returns a sensible semi-major axis for elliptical orbits', () => {
    // At 1 AU with v < v_circ, the orbit's semi-major axis stays > 0.
    const r = { x: 1, y: 0, z: 0 };
    const v = { x: 0, y: vCircAt(1) * 0.9, z: 0 };
    const result = classifyConic(r, v);
    expect(result.a).toBeGreaterThan(0);
    expect(result.epsilon).toBeLessThan(0);
  });
});
