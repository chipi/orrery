import { describe, it, expect } from 'vitest';
import {
  kpcToScene,
  galacticToScene,
  logSpiralRadius,
  logSpiralPoint,
  armStartAngle,
  makeRng,
  equatorialToGalactic,
  galacticPlanePin,
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

describe('equatorialToGalactic', () => {
  it('Cygnus X-1 (ra 299.59031, dec 35.20161) is at l 71.33, b 3.07', () => {
    const { l, b } = equatorialToGalactic(299.59031, 35.20161);
    expect(l).toBeCloseTo(71.33, 1);
    expect(b).toBeCloseTo(3.07, 1);
  });

  it('the Galactic Centre (ra 266.405, dec -28.936) is at l 0, b 0', () => {
    const { l, b } = equatorialToGalactic(266.405, -28.936);
    expect(Math.min(l, 360 - l)).toBeLessThan(0.1);
    expect(Math.abs(b)).toBeLessThan(0.1);
  });

  it('the north galactic pole is at b 90', () => {
    expect(equatorialToGalactic(192.85948, 27.12825).b).toBeCloseTo(90, 4);
  });
});

describe('galacticPlanePin', () => {
  const sun = { x: -3.457, z: 7.412 };

  it('l 0 lies on the Sun-centre line, at the given distance', () => {
    const p = galacticPlanePin(0, 0, 2, sun);
    const toCentre = Math.hypot(sun.x, sun.z);
    expect(Math.hypot(p.x - sun.x, p.z - sun.z)).toBeCloseTo(2, 6);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(toCentre - 2, 6);
  });

  it('Cygnus X-1 (l 71.33, b 3.07, 2.22 kpc) sits about 2.2 kpc from the Sun, on the Perseus side', () => {
    const p = galacticPlanePin(71.33, 3.07, 7241 / 3261.5636, sun);
    expect(Math.hypot(p.x - sun.x, p.z - sun.z)).toBeCloseTo(2.22, 1);
    // the schematic's Perseus label (-12.5, -3.5) is on the same side of the Sun-centre line
    const side = (q: { x: number; z: number }) => (q.x - sun.x) * -sun.z - (q.z - sun.z) * -sun.x;
    expect(Math.sign(side(p))).toBe(Math.sign(side({ x: -12.5, z: -3.5 })));
  });
});
