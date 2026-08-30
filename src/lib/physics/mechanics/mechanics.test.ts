import { describe, it, expect } from 'vitest';
import { fMaAccel, weightN, twr } from './dynamics';
import { freeFall, projectile } from './kinematics';
import { momentum } from './momentum';
import { bodyGravityMs2 } from './bodies';
import { G0 } from '$lib/physics/ascent/ascent-physics-constants';

const G_EARTH = G0; // 9.80665

describe('dynamics', () => {
  it('fMaAccel(100, 10) = 10 m/s²', () => {
    expect(fMaAccel(100, 10)).toBeCloseTo(10, 10);
  });

  it('weightN(100, 9.80665) = 980.665 N', () => {
    expect(weightN(100, G_EARTH)).toBeCloseTo(980.665, 3);
  });

  it('twr(1.5e7, 1e6, 9.80665) ≈ 1.5296', () => {
    // 15_000_000 / (1_000_000 * 9.80665) = 15 / 9.80665 ≈ 1.52961
    expect(twr(1.5e7, 1e6, G_EARTH)).toBeCloseTo(1.5296, 3);
  });
});

describe('kinematics', () => {
  it('freeFall(100, 9.80665): timeS ≈ 4.515 s, impactMs ≈ 44.29 m/s', () => {
    const r = freeFall(100, G_EARTH);
    expect(r.timeS).toBeCloseTo(4.515, 2);
    expect(r.impactMs).toBeCloseTo(44.29, 1);
  });

  it('projectile(100, 45, 9.80665): range ≈ 1019.7 m, maxH ≈ 254.9 m, T ≈ 14.42 s', () => {
    const r = projectile(100, 45, G_EARTH);
    expect(r.rangeM).toBeCloseTo(1019.7, 0);
    expect(r.maxHeightM).toBeCloseTo(254.9, 0);
    expect(r.flightTimeS).toBeCloseTo(14.42, 1);
  });

  it('projectile 0° → zero range and height', () => {
    const r = projectile(100, 0, G_EARTH);
    expect(r.rangeM).toBeCloseTo(0, 10);
    expect(r.maxHeightM).toBeCloseTo(0, 10);
    expect(r.flightTimeS).toBeCloseTo(0, 10);
  });
});

describe('momentum', () => {
  it('momentum(100, 10) = 1000 kg·m/s', () => {
    expect(momentum(100, 10)).toBe(1000);
  });
});

describe('bodies', () => {
  it('earth gravity = G0 (surfaceGravityG = 1.0)', () => {
    expect(bodyGravityMs2('earth')).toBeCloseTo(G0, 5);
  });

  it('moon gravity ≈ 1.618 m/s² (0.165 × G0)', () => {
    // 0.165 * 9.80665 = 1.61810
    expect(bodyGravityMs2('moon')).toBeCloseTo(0.165 * G0, 4);
  });

  it('weight of 100 kg on Moon ≈ 161.8 N', () => {
    expect(weightN(100, bodyGravityMs2('moon'))).toBeCloseTo(161.8, 0);
  });

  it('throws for an unknown body', () => {
    expect(() => bodyGravityMs2('plaid')).toThrow('Unknown body');
  });
});
