import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildPfsSubsatellite, PFS_BOOM_M } from './pfs-subsatellite';

describe('Apollo 15/16 Particles and Fields Subsatellite', () => {
  it('is a 78 cm hexagonal prism, 36 cm across opposite corners', () => {
    const g = buildPfsSubsatellite({ deployed: false });
    g.updateMatrixWorld(true);
    const body = new THREE.Box3().setFromObject(g.getObjectByName('pfs-body')!, true);
    expect(body.max.y - body.min.y).toBeCloseTo(0.78, 2);
    // across the corners (x runs through two opposite corners)
    const across = body.max.x - body.min.x;
    expect(across).toBeGreaterThanOrEqual(0.36 - 1e-3);
    expect(across).toBeLessThan(0.38); // the panel frames' square ends poke past the corners
    expect(g.userData.massKg).toBe(36.3);
  });

  it('carries three 1.5 m booms, a magnetometer on the first and tip masses on the others', () => {
    const g = buildPfsSubsatellite();
    g.updateMatrixWorld(true);
    for (let i = 0; i < 3; i++) {
      const arm = g.getObjectByName(`boom-${i}-arm`)!;
      expect(arm, `boom-${i}`).toBeDefined();
      const tip = new THREE.Vector3();
      (i === 0
        ? arm.getObjectByName('magnetometer')!
        : arm.getObjectByName(`tip-mass-${i}`)!
      ).getWorldPosition(tip);
      const hinge = g.getObjectByName(`boom-${i}`)!.getWorldPosition(new THREE.Vector3());
      // deployed: radial in the end-platform plane, 1.5 m long
      expect(Math.abs(tip.y - hinge.y - 0.03)).toBeLessThan(1e-6);
      expect(Math.hypot(tip.x - hinge.x, tip.z - hinge.z)).toBeCloseTo(PFS_BOOM_M, 3);
    }
  });

  it('folds the booms down the body and out again', () => {
    const g = buildPfsSubsatellite({ deployed: false });
    g.updateMatrixWorld(true);
    const stowed = new THREE.Box3().setFromObject(g);
    expect(Math.max(stowed.max.x - stowed.min.x, stowed.max.z - stowed.min.z)).toBeLessThan(0.6);
    (g.userData.setDeploy as (u: number) => void)(1);
    g.updateMatrixWorld(true);
    const out = new THREE.Box3().setFromObject(g);
    expect(out.max.x - out.min.x).toBeGreaterThan(2.5);
  });

  it('has the spin-up cylinder and the S-band antenna on the end opposite the booms', () => {
    const g = buildPfsSubsatellite();
    expect(g.getObjectByName('spin-up-cylinder')!.position.y).toBeLessThan(0);
    expect(g.getObjectByName('s-band-antenna')).toBeDefined();
  });
});
