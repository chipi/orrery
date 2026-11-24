import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildLandGround, buildLandingZone1 } from './landing-zone-1';

describe('buildLandingZone1', () => {
  const lz = buildLandingZone1();
  lz.updateWorldMatrix(true, true);

  it('has the sourced 86 m circular pad with its top at y = 0', () => {
    const b = new THREE.Box3().setFromObject(lz.getObjectByName('pad')!);
    const s = b.getSize(new THREE.Vector3());
    expect(Math.abs(s.x - 86)).toBeLessThanOrEqual(1);
    expect(Math.abs(s.z - 86)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.max.y)).toBeLessThanOrEqual(0.01);
  });

  it('has a landing mark, an X and an apron under the pad top', () => {
    expect(lz.getObjectByName('landing-mark')).toBeInstanceOf(THREE.Mesh);
    expect(lz.getObjectByName('landing-x')).toBeTruthy();
    expect(new THREE.Box3().setFromObject(lz.getObjectByName('apron')!).max.y).toBeLessThan(0);
  });

  it('puts the ground below the apron', () => {
    expect(buildLandGround(4000).position.y).toBeLessThan(-0.1);
  });
});
