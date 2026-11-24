import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildDroneShip, buildSeaPlane } from './showcase/drone-ship';

describe('buildDroneShip', () => {
  const ship = buildDroneShip();
  ship.updateWorldMatrix(true, true);
  const deck = new THREE.Box3().setFromObject(ship.getObjectByName('deck')!);

  it('has the sourced 91 x 52 m deck with its top at y = 0', () => {
    const s = deck.getSize(new THREE.Vector3());
    expect(Math.abs(s.x - 91)).toBeLessThanOrEqual(2);
    expect(Math.abs(s.z - 52)).toBeLessThanOrEqual(2);
    expect(Math.abs(deck.max.y)).toBeLessThanOrEqual(0.1);
  });

  it('has 4 thruster pods and a landing mark', () => {
    for (let i = 0; i < 4; i++) expect(ship.getObjectByName(`thruster-${i}`)).toBeTruthy();
    expect(ship.getObjectByName('landing-mark')).toBeInstanceOf(THREE.Mesh);
  });
});

describe('buildSeaPlane', () => {
  it('builds without a DOM, below the deck', () => {
    const sea = buildSeaPlane(2000);
    expect(sea.position.y).toBeLessThan(-2);
  });
});
