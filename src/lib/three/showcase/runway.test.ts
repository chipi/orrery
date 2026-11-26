import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRunway } from './runway';

describe('runway (W12)', () => {
  it('a concrete strip spans the runway from the threshold at the origin along +z', () => {
    const g = buildRunway({ surface: 'concrete', lengthM: 4572, widthM: 91 });
    const strip = g.getObjectByName('strip')!;
    const b = new THREE.Box3().setFromObject(strip);
    expect(b.min.z).toBeCloseTo(0, 3);
    expect(b.max.z).toBeCloseTo(4572, 3);
    expect(b.max.x - b.min.x).toBeCloseTo(91, 3);
    expect(b.max.y).toBeLessThan(0.05);
  });

  it('a lakebed runway is markings on the lake, no pavement', () => {
    const g = buildRunway({ surface: 'lakebed', lengthM: 8400, widthM: 90 });
    expect(g.getObjectByName('strip')).toBeUndefined();
    const marks: THREE.Mesh[] = [];
    g.traverse((o) => {
      if (o instanceof THREE.Mesh && (o.material as THREE.Material).name === 'marking')
        marks.push(o);
    });
    expect(marks.length).toBeGreaterThan(100);
    const b = new THREE.Box3();
    for (const m of marks) b.expandByObject(m);
    expect(b.min.z).toBeGreaterThanOrEqual(-0.01);
    expect(b.max.z).toBeLessThanOrEqual(8400.01);
    expect(Math.max(-b.min.x, b.max.x)).toBeLessThanOrEqual(45.01);
  });
});
