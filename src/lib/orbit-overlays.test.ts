// @vitest-environment jsdom
/**
 * Unit tests for orbit-overlays.ts. Original file split math-only tests
 * from the THREE.js builders; G3 (test-coverage gap-closure) adds
 * builder structure tests so the coverage report reflects what the
 * code actually does. The builders are also exercised end-to-end by
 * the /fly + /explore Playwright suites.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  SOI_KM,
  soiRadiusInScene,
  logScaleLength,
  gravityAccel,
  BODY_MASS_KG,
  classifyConic,
  buildSoIRing,
  buildGravityArrow,
  buildArrowTipLabel,
  buildCoastLine,
  integrateCoast,
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

// ─── G3 gap-closure: structural tests for the THREE.Group builders ───

describe('buildSoIRing', () => {
  it('returns a Group tagged with the soi layer key and named soi_<body>', () => {
    const g = buildSoIRing('earth', 30);
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.name).toBe('soi_earth');
    expect(g.userData.layerKey).toBe('soi');
  });

  it('hidden by default (toggled on by the lens-layer hook)', () => {
    expect(buildSoIRing('mars', 12).visible).toBe(false);
  });

  it('contains 2 meshes — wireframe sphere + equatorial ring', () => {
    const g = buildSoIRing('moon', 8);
    let meshCount = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) meshCount++;
    });
    expect(meshCount).toBe(2);
  });

  it('ring sits flat on the ecliptic (rotated π/2 around X)', () => {
    const g = buildSoIRing('earth', 5);
    const ring = g.children.find(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry,
    );
    expect(ring).toBeDefined();
    expect(ring!.rotation.x).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('buildGravityArrow', () => {
  it('returns an ArrowHelper named gravity_<label>', () => {
    const a = buildGravityArrow('earth');
    expect(a).toBeInstanceOf(THREE.ArrowHelper);
    expect(a.name).toBe('gravity_earth');
  });

  it('tags layerKey="gravity" and starts hidden', () => {
    const a = buildGravityArrow('sun');
    expect(a.userData.layerKey).toBe('gravity');
    expect(a.visible).toBe(false);
  });

  it('uses the requested color', () => {
    const a = buildGravityArrow('earth', 0xff0000);
    const lineMat = (a.line as THREE.Line).material as THREE.LineBasicMaterial;
    expect(lineMat.color.getHex()).toBe(0xff0000);
  });
});

describe('buildArrowTipLabel', () => {
  it('returns a Sprite with userData.tipLabel=true (canvas-backed text)', () => {
    const s = buildArrowTipLabel('3.2 km/s');
    expect(s).toBeInstanceOf(THREE.Sprite);
    expect(s.userData.tipLabel).toBe(true);
  });

  it('scales width by worldScale and height by aspect ratio', () => {
    const s = buildArrowTipLabel('test', '#ffffff', 8);
    expect(s.scale.x).toBeCloseTo(8, 5);
    // Canvas is 256 × 64 = 4:1, so height = 8 / 4 = 2.
    expect(s.scale.y).toBeCloseTo(2, 5);
  });
});

describe('buildCoastLine', () => {
  it('returns a Line named engine_off_coast tagged with the coast layer key', () => {
    const l = buildCoastLine();
    expect(l).toBeInstanceOf(THREE.Line);
    expect(l.name).toBe('engine_off_coast');
    expect(l.userData.layerKey).toBe('coast');
  });

  it('uses a LineDashedMaterial and starts hidden', () => {
    const l = buildCoastLine(0xc1440e);
    expect(l.material).toBeInstanceOf(THREE.LineDashedMaterial);
    expect((l.material as THREE.LineDashedMaterial).color.getHex()).toBe(0xc1440e);
    expect(l.visible).toBe(false);
  });
});

describe('integrateCoast', () => {
  it('returns (steps+1) × 3 floats — one position triplet per sample plus the seed', () => {
    const r0 = { x: 1, y: 0, z: 0 };
    const v0 = { x: 0, y: 6.28 / 365.25, z: 0 }; // ~circular at 1 AU
    const out = integrateCoast(r0, v0, 30, 100);
    expect(out).toBeInstanceOf(Float32Array);
    expect(out.length).toBe(101 * 3);
  });

  it('seeds out[0..2] with the initial position exactly', () => {
    const r0 = { x: 0.7, y: 0.3, z: -0.1 };
    const v0 = { x: 0, y: 0.01, z: 0 };
    const out = integrateCoast(r0, v0, 10, 20);
    expect(out[0]).toBeCloseTo(0.7, 6);
    expect(out[1]).toBeCloseTo(0.3, 6);
    expect(out[2]).toBeCloseTo(-0.1, 6);
  });

  it('Earth-like circular orbit returns to ~start after one year', () => {
    // Earth's mean orbital velocity in AU/day: 2π / 365.25 ≈ 0.0172
    const v = (2 * Math.PI) / 365.25;
    const r0 = { x: 1, y: 0, z: 0 };
    const v0 = { x: 0, y: v, z: 0 };
    const out = integrateCoast(r0, v0, 365.25, 365);
    const finalX = out[out.length - 3];
    const finalY = out[out.length - 2];
    // Semi-implicit Euler drifts a bit; within 5% of starting radius
    // after one full orbit is a healthy ballpark for visualisation use.
    const finalR = Math.sqrt(finalX * finalX + finalY * finalY);
    expect(finalR).toBeGreaterThan(0.9);
    expect(finalR).toBeLessThan(1.1);
  });
});

// Keep SOI_KM + BODY_MASS_KG reachable through imports for tsc.
void SOI_KM;
void BODY_MASS_KG;
