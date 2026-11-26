import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { isRockBody, rockAxes, rockGeometry } from './fly-rock';

describe('fly-rock', () => {
  it('keeps a unit-sphere volume and the published long axis', () => {
    const [a, b, c] = rockAxes('eros');
    expect(a * b * c).toBeCloseTo(1, 6);
    expect(a / b).toBeCloseTo(34.4 / 11.2, 6);
  });

  it('is the same rock on every build of one id, and another rock for another id', () => {
    const p = (id: string) => Array.from(rockGeometry(id).attributes.position.array.slice(0, 30));
    expect(p('gaspra')).toEqual(p('gaspra'));
    expect(p('gaspra')).not.toEqual(p('ida'));
  });

  it('stays about the size of a unit sphere along its axes', () => {
    const box = new THREE.Box3().setFromBufferAttribute(
      rockGeometry('itokawa').attributes.position as THREE.BufferAttribute,
    );
    const [a, , c] = rockAxes('itokawa');
    expect(box.max.x).toBeGreaterThan(a * 0.8);
    expect(box.max.x).toBeLessThan(a * 1.3);
    expect(box.max.z).toBeLessThan(c * 1.3);
  });

  it('draws small bodies as rocks and keeps planets and dwarf planets round', () => {
    expect(isRockBody('didymos')).toBe(true);
    expect(isRockBody('patroclus')).toBe(true);
    for (const id of ['mars', 'jupiter', 'ceres', 'pluto']) expect(isRockBody(id)).toBe(false);
  });
});
