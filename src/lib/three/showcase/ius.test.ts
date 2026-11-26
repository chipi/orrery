import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildIusStack, IUS_DIAMETER_M, IUS_LENGTH_M } from './ius';
import { buildOrbiterOpenable } from './winged';

const boundsOf = (o: THREE.Object3D, frame: THREE.Object3D): THREE.Box3 => {
  frame.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert();
  const b = new THREE.Box3();
  o.traverse((m) => {
    if (m instanceof THREE.Mesh && m.visible) {
      m.geometry.computeBoundingBox();
      b.union(m.geometry.boundingBox!.clone().applyMatrix4(inv.clone().multiply(m.matrixWorld)));
    }
  });
  return b;
};

describe('IUS on its tilt table (W10)', () => {
  it('is 17 ft by 9.25 ft (STS-34 press kit)', () => {
    expect(IUS_LENGTH_M).toBeCloseTo(5.18, 2);
    expect(IUS_DIAMETER_M).toBeCloseTo(2.82, 2);
    const s = buildIusStack();
    const b = boundsOf(s.userData.stack, s);
    expect(b.max.y).toBeCloseTo(IUS_LENGTH_M, 2);
    expect(b.max.x - b.min.x).toBeCloseTo(IUS_DIAMETER_M, 1);
  });

  it('tilts its forward end out of the bay (-z) about the aft pivot', () => {
    const s = buildIusStack();
    s.userData.setTilt(58);
    const b = boundsOf(s.userData.stack, s);
    const tip = IUS_LENGTH_M;
    expect(b.min.z).toBeLessThan(-tip * Math.sin((58 * Math.PI) / 180) + 0.1);
    expect(b.max.y).toBeLessThan(tip * Math.cos((58 * Math.PI) / 180) + IUS_DIAMETER_M);
    s.userData.setTilt(0);
    expect(boundsOf(s.userData.stack, s).min.z).toBeGreaterThan(-IUS_DIAMETER_M / 2 - 0.01);
  });

  it('stacks the PAM-S and the payload above the IUS', () => {
    const payload = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    payload.geometry.translate(0, 0.5, 0);
    const s = buildIusStack({ payload, pamS: true });
    expect(s.userData.pamS).toBeDefined();
    expect(s.userData.exits.pamS).toBeGreaterThan(s.userData.exits.stage2);
    expect(boundsOf(payload, s).min.y).toBeGreaterThan(IUS_LENGTH_M + 1.5);
    expect(buildIusStack().userData.pamS).toBeUndefined();
  });

  it('fits the orbiter bay at the bay mount, stowed below the door line', () => {
    const orb = buildOrbiterOpenable();
    const mount = orb.userData.bayMount as THREE.Object3D;
    expect(mount).toBeInstanceOf(THREE.Object3D);
    const s = buildIusStack();
    mount.add(s);
    orb.updateMatrixWorld(true);
    const b = boundsOf(s.userData.stack, orb);
    const bay = boundsOf(orb.getObjectByName('bay-interior')!, orb);
    expect(b.min.y).toBeGreaterThan(bay.min.y - 0.5);
    expect(b.max.y).toBeLessThan(bay.max.y);
    expect(b.min.x).toBeGreaterThan(bay.min.x);
    expect(b.max.x).toBeLessThan(bay.max.x);
  });
});
