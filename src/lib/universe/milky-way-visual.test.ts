import { describe, it, expect } from 'vitest';
import {
  kpcToScene,
  galacticToScene,
  logSpiralRadius,
  logSpiralPoint,
  armStartAngle,
  makeRng,
  MW_DISK_RADIUS_SCENE,
} from './milky-way-visual';

describe('kpcToScene', () => {
  it('maps the disk radius to the full scene radius', () => {
    expect(kpcToScene(16, 16)).toBeCloseTo(MW_DISK_RADIUS_SCENE, 6);
  });
  it('is linear and zero at the centre', () => {
    expect(kpcToScene(0, 16)).toBe(0);
    expect(kpcToScene(8, 16)).toBeCloseTo(MW_DISK_RADIUS_SCENE / 2, 6);
  });
});

describe('galacticToScene', () => {
  it('places Sag A* (origin) at the scene origin, flat (y=0)', () => {
    expect(galacticToScene(0, 0, 16)).toEqual([0, 0, 0]);
  });
  it('scales plane coords and keeps y = 0', () => {
    const [x, y, z] = galacticToScene(8, -8, 16);
    expect(x).toBeCloseTo(MW_DISK_RADIUS_SCENE / 2, 6);
    expect(z).toBeCloseTo(-MW_DISK_RADIUS_SCENE / 2, 6);
    expect(y).toBe(0);
  });
  it('keeps the Sun within the disk radius', () => {
    // Sun at ~8.178 kpc from a 16 kpc disk → about half-way out.
    const [x, , z] = galacticToScene(-3.457, 7.412, 16);
    const r = Math.hypot(x, z);
    expect(r).toBeLessThan(MW_DISK_RADIUS_SCENE);
    expect(r).toBeGreaterThan(MW_DISK_RADIUS_SCENE * 0.4);
  });
});

describe('logSpiral', () => {
  it('radius grows monotonically with theta', () => {
    expect(logSpiralRadius(10, 0.25, 0)).toBe(10);
    expect(logSpiralRadius(10, 0.25, 1)).toBeGreaterThan(logSpiralRadius(10, 0.25, 0.5));
  });
  it('logSpiralPoint sits on the radius at the offset angle', () => {
    const p = logSpiralPoint(10, 0.25, 0, 0);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(p.r, 6);
    expect(p.x).toBeCloseTo(10, 6); // theta+start=0 → +x axis
    expect(p.z).toBeCloseTo(0, 6);
  });
  it('armStartAngle spaces N arms evenly around the circle', () => {
    expect(armStartAngle(0, 4)).toBe(0);
    expect(armStartAngle(2, 4)).toBeCloseTo(Math.PI, 6);
  });
});

describe('makeRng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  it('produces values in [0,1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('different seeds diverge', () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
  });
});
