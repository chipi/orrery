import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildNewGlennBooster, setNewGlennBoosterPose } from './showcase/new-glenn-booster';

const box = (g: THREE.Object3D) => {
  g.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(g);
};
const foot = (g: THREE.Object3D, i: number) =>
  g.getObjectByName(`foot-${i}`)!.getWorldPosition(new THREE.Vector3());

describe('New Glenn booster', () => {
  const g = buildNewGlennBooster();

  it('is about 57.5 m tall, bells on y = 0', () => {
    const b = box(g);
    expect(b.max.y).toBeGreaterThan(55.5);
    expect(b.max.y).toBeLessThan(59.5);
    expect(b.min.y).toBeCloseTo(0, 1);
  });

  it('has 7 engines, 4 fins, 6 legs, 2 strakes, 4 RCS nozzles', () => {
    for (let i = 0; i < 7; i++) expect(g.getObjectByName(`engine-${i}`)).toBeTruthy();
    expect(g.getObjectByName('engine-7')).toBeUndefined();
    for (let i = 0; i < 4; i++) expect(g.getObjectByName(`fin-${i}`)).toBeTruthy();
    expect(g.getObjectByName('fin-4')).toBeUndefined();
    for (let i = 0; i < 6; i++) expect(g.getObjectByName(`leg-${i}`)).toBeTruthy();
    expect(g.getObjectByName('leg-6')).toBeUndefined();
    for (let i = 0; i < 2; i++) expect(g.getObjectByName(`strake-${i}`)).toBeTruthy();
    expect(g.getObjectByName('strake-2')).toBeUndefined();
    for (let i = 0; i < 4; i++) expect(g.getObjectByName(`rcs-${i}`)).toBeTruthy();
  });

  it('stowed, everything stays within the 7 m body + 1 m', () => {
    setNewGlennBoosterPose(g, { fins: 0, legs: 0 });
    const b = box(g);
    expect(b.max.x - b.min.x).toBeGreaterThan(6.8);
    expect(b.max.x - b.min.x).toBeLessThanOrEqual(7 + 1);
    expect(b.max.z - b.min.z).toBeLessThanOrEqual(7 + 1);
  });

  it('deployed legs put the feet below the bells and outside the body', () => {
    setNewGlennBoosterPose(g, { fins: 1, legs: 1 });
    for (let i = 0; i < 6; i++) {
      const f = foot(g, i);
      expect(f.y).toBeLessThan(0);
      expect(Math.hypot(f.x, f.z)).toBeGreaterThan(3.5 + 2);
    }
  });

  it('pose is pure', () => {
    setNewGlennBoosterPose(g, { fins: 0.5, legs: 0.5 });
    const a = foot(g, 1).clone();
    setNewGlennBoosterPose(g, { fins: 1, legs: 1 });
    setNewGlennBoosterPose(g, { fins: 0.5, legs: 0.5 });
    expect(foot(g, 1).distanceTo(a)).toBeLessThan(1e-9);
  });
});
