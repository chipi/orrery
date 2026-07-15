import { describe, it, expect } from 'vitest';
import {
  schwarzschildRadiusKm,
  photonSphereRadiusKm,
  shadowRadiusKm,
  timeDilationFactor,
  diskColor,
  framingFor,
} from './black-hole-visual';

describe('schwarzschildRadiusKm', () => {
  it('gives ~2.95 km for one solar mass', () => {
    expect(schwarzschildRadiusKm(1)).toBeCloseTo(2.95, 1);
  });
  it('scales linearly with mass', () => {
    expect(schwarzschildRadiusKm(10)).toBeCloseTo(10 * schwarzschildRadiusKm(1), 6);
  });
  it('gives ~1.27e7 km for Sagittarius A* (4.3M M☉)', () => {
    // 4.3e6 × 2.95 km ≈ 1.27e7 km
    expect(schwarzschildRadiusKm(4.3e6)).toBeGreaterThan(1.2e7);
    expect(schwarzschildRadiusKm(4.3e6)).toBeLessThan(1.3e7);
  });
});

describe('photonSphere + shadow', () => {
  it('photon sphere is 1.5 rs', () => {
    expect(photonSphereRadiusKm(10)).toBeCloseTo(15, 9);
  });
  it('shadow radius is √27/2 rs ≈ 2.598 rs', () => {
    expect(shadowRadiusKm(10) / 10).toBeCloseTo(2.598, 3);
  });
  it('shadow is larger than the photon sphere', () => {
    expect(shadowRadiusKm(10)).toBeGreaterThan(photonSphereRadiusKm(10));
  });
});

describe('timeDilationFactor', () => {
  it('is 0 at (or inside) the horizon', () => {
    expect(timeDilationFactor(10, 10)).toBe(0);
    expect(timeDilationFactor(5, 10)).toBe(0);
  });
  it('approaches 1 far from the hole', () => {
    expect(timeDilationFactor(1e6, 10)).toBeCloseTo(1, 4);
  });
  it('is √(1/2) at r = 2·rs', () => {
    expect(timeDilationFactor(20, 10)).toBeCloseTo(Math.SQRT1_2, 6);
  });
  it('is monotonic increasing with radius', () => {
    expect(timeDilationFactor(11, 10)).toBeLessThan(timeDilationFactor(50, 10));
  });
});

describe('diskColor', () => {
  it('returns rgb in [0,1] and clamps out-of-range t', () => {
    for (const t of [-1, 0, 0.3, 0.5, 0.9, 1, 2]) {
      const c = diskColor(t);
      expect(c).toHaveLength(3);
      for (const ch of c) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      }
    }
  });
  it('is near-white hot at the inner edge, amber at the outer', () => {
    const inner = diskColor(0);
    const outer = diskColor(1);
    expect(inner[2]).toBeGreaterThan(outer[2]); // blue channel drops → warmer
  });
});

describe('framingFor', () => {
  it('uses a bigger scale + upward shift on narrow screens', () => {
    const m = framingFor(390);
    expect(m.scale).toBeGreaterThan(1);
    expect(m.yOffset).toBeLessThan(0);
  });
  it('is unscaled + centred on desktop', () => {
    expect(framingFor(1440)).toEqual({ scale: 1.0, yOffset: 0.0 });
  });
});
