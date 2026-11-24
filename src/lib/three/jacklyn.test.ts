import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildJacklyn } from './showcase/jacklyn';

describe('buildJacklyn', () => {
  const ship = buildJacklyn();
  ship.updateWorldMatrix(true, true);
  const deck = new THREE.Box3().setFromObject(ship.getObjectByName('deck')!);

  it('has the sourced 115.9 x 45.7 m size with the deck top at y = 0', () => {
    const s = deck.getSize(new THREE.Vector3());
    expect(Math.abs(s.x - 115.9)).toBeLessThanOrEqual(2);
    expect(Math.abs(s.z - 45.7)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(deck.max.y)).toBeLessThanOrEqual(0.1);
  });

  it('has a landing mark and an ROV', () => {
    expect(ship.getObjectByName('landing-mark')).toBeInstanceOf(THREE.Mesh);
    expect(ship.getObjectByName('rov')).toBeTruthy();
  });

  it('is unpowered: no thruster pods', () => {
    const names: string[] = [];
    ship.traverse((o) => names.push(o.name));
    expect(names.some((n) => n.startsWith('thruster-'))).toBe(false);
  });
});
