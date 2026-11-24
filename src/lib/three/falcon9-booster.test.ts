import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildFalcon9Booster, setFalcon9BoosterPose } from './showcase/falcon9-booster';

const box = (g: THREE.Object3D) => {
  g.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(g);
};
const foot = (g: THREE.Object3D, i: number) =>
  g.getObjectByName(`foot-${i}`)!.getWorldPosition(new THREE.Vector3());

describe('Falcon 9 booster', () => {
  const g = buildFalcon9Booster();

  it('is about 41 m tall, 3.7 m across, bells on y = 0', () => {
    const b = box(g);
    expect(b.max.y).toBeGreaterThan(39);
    expect(b.max.y).toBeLessThan(43.2);
    expect(b.min.y).toBeCloseTo(0, 1);
  });

  it('has 9 engines, 4 grid fins, 4 legs, 6 RCS nozzles', () => {
    for (let i = 0; i < 9; i++) expect(g.getObjectByName(`engine-${i}`)).toBeTruthy();
    expect(g.getObjectByName('engine-9')).toBeUndefined();
    for (let i = 0; i < 4; i++) {
      expect(g.getObjectByName(`grid-fin-${i}`)).toBeTruthy();
      expect(g.getObjectByName(`leg-${i}`)).toBeTruthy();
    }
    for (let i = 0; i < 6; i++) expect(g.getObjectByName(`rcs-${i}`)).toBeTruthy();
  });

  it('stowed, everything stays within the 3.7 m body + 1 m', () => {
    setFalcon9BoosterPose(g, { fins: 0, legs: 0 });
    const b = box(g);
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(3.7 + 1);
    expect(b.max.z - b.min.z).toBeLessThanOrEqual(3.7 + 1);
  });

  it('deployed legs span 18 m, pads below the hinge', () => {
    setFalcon9BoosterPose(g, { fins: 1, legs: 1 });
    const b = box(g);
    expect(b.max.x - b.min.x).toBeGreaterThan(16.5);
    expect(b.max.x - b.min.x).toBeLessThan(19.5);
    expect(foot(g, 0).distanceTo(foot(g, 2))).toBeGreaterThan(16.5);
    expect(foot(g, 0).distanceTo(foot(g, 2))).toBeLessThan(19.5);
    expect(foot(g, 0).y).toBeLessThan(0);
  });

  it('pose is pure', () => {
    setFalcon9BoosterPose(g, { fins: 0.5, legs: 0.5 });
    const a = foot(g, 1).clone();
    setFalcon9BoosterPose(g, { fins: 1, legs: 1 });
    setFalcon9BoosterPose(g, { fins: 0.5, legs: 0.5 });
    expect(foot(g, 1).distanceTo(a)).toBeLessThan(1e-9);
  });
});
