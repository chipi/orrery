import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildOrbiter, buildOrbiterOpenable, SHOWCASE, type RmsRig } from './winged';

const L0 = 37.237;
const SPAN0 = 23.79;

const doorBounds = (root: THREE.Object3D): THREE.Box3 => {
  root.updateMatrixWorld(true);
  const b = new THREE.Box3();
  root.traverse((o) => {
    if (o.name === 'bay-door') b.union(new THREE.Box3().setFromObject(o));
  });
  return b;
};
const leafOf = (g: THREE.Group, side: 'port' | 'starboard'): THREE.Group =>
  g.userData.bayLeaves[side];

describe('Shuttle orbiter with an opening payload bay', () => {
  const closedDefault = buildOrbiter({ variant: 'shuttle', length: L0, span: SPAN0 });
  const openable = buildOrbiterOpenable();

  it('leaves the default (registered) orbiter closed, with no bay API', () => {
    const reg = SHOWCASE['space-shuttle-orbiter'].build();
    expect(reg.userData.setBayDoors).toBeUndefined();
    expect(reg.userData.rms).toBeUndefined();
    const a = new THREE.Box3().setFromObject(reg);
    const b = new THREE.Box3().setFromObject(closedDefault);
    expect(a.min.distanceTo(b.min)).toBeLessThan(1e-6);
    expect(a.max.distanceTo(b.max)).toBeLessThan(1e-6);
  });

  it('closed (t = 0) has the same door and overall bounds as the default', () => {
    openable.userData.setBayDoors(0);
    const d0 = doorBounds(closedDefault);
    const d1 = doorBounds(openable);
    expect(d0.isEmpty()).toBe(false);
    expect(d1.min.distanceTo(d0.min)).toBeLessThan(0.05);
    expect(d1.max.distanceTo(d0.max)).toBeLessThan(0.05);
    closedDefault.updateMatrixWorld(true);
    const w0 = new THREE.Box3().setFromObject(closedDefault);
    const w1 = new THREE.Box3().setFromObject(openable);
    expect(w1.min.distanceTo(w0.min)).toBeLessThan(0.05);
    expect(w1.max.distanceTo(w0.max)).toBeLessThan(0.05);
  });

  it('opens both leaves past 90 degrees, outward, hinged at the sills', () => {
    openable.userData.setBayDoors(1);
    const port = leafOf(openable, 'port');
    const star = leafOf(openable, 'starboard');
    expect(Math.abs(port.rotation.y)).toBeGreaterThan(Math.PI / 2);
    expect(Math.abs(star.rotation.y)).toBeGreaterThan(Math.PI / 2);
    expect(Math.sign(port.rotation.y)).toBe(-Math.sign(star.rotation.y));
    // the open leaves lie outboard of the bay: no door geometry left over the sill
    const b = doorBounds(openable);
    openable.updateMatrixWorld(true);
    for (const [leaf, sgn] of [
      [port, 1],
      [star, -1],
    ] as const) {
      const lb = new THREE.Box3().setFromObject(leaf);
      expect(sgn > 0 ? lb.min.x : -lb.max.x).toBeGreaterThan(1.9);
    }
    expect(b.isEmpty()).toBe(false);
    openable.userData.setBayDoors(0);
  });

  it('carries the RMS: 6 joints in one chain, 15.2 m +/- 0.5 stowed, along the port sill', () => {
    const rms = openable.userData.rms as RmsRig;
    expect(rms.joints).toHaveLength(6);
    for (let i = 1; i < rms.joints.length; i++) {
      let anc: THREE.Object3D | null = rms.joints[i].parent;
      while (anc && anc !== rms.joints[i - 1]) anc = anc.parent;
      expect(anc).toBe(rms.joints[i - 1]);
    }
    openable.updateMatrixWorld(true);
    const sh = rms.shoulderYaw.getWorldPosition(new THREE.Vector3());
    const tip = rms.tip.getWorldPosition(new THREE.Vector3());
    expect(sh.distanceTo(tip)).toBeGreaterThan(14.7);
    expect(sh.distanceTo(tip)).toBeLessThan(15.7);
    expect(rms.lengthM).toBeCloseTo(15.2, 1);
    expect(sh.x).toBeGreaterThan(0); // port is +x
    expect(tip.x).toBeCloseTo(sh.x, 3); // stowed straight along the sill
    expect(sh.y).toBeGreaterThan(tip.y); // forward end to aft
  });

  it('poses: raising the shoulder lifts the tip out of the bay (toward -z)', () => {
    const rms = openable.userData.rms as RmsRig;
    openable.updateMatrixWorld(true);
    const z0 = rms.tip.getWorldPosition(new THREE.Vector3()).z;
    rms.shoulderPitch.rotation.x = Math.PI / 4;
    openable.updateMatrixWorld(true);
    expect(rms.tip.getWorldPosition(new THREE.Vector3()).z).toBeLessThan(z0 - 5);
    rms.shoulderPitch.rotation.x = 0;
  });
});
