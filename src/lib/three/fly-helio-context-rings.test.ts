import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { addContextPlanetRings } from './fly-helio-scene';

// A grand-tour flyby of Saturn (Voyager 1 and 2, Pioneer 11) draws the context planet, not the
// destination mesh, so the rings must hang on the context Saturn too.
describe('context planets carry their rings', () => {
  it('gives the context Saturn a ring group and leaves the others bare', () => {
    const meshes = new Map<string, THREE.Mesh>(
      ['jupiter', 'saturn', 'uranus'].map((id) => [
        id,
        new THREE.Mesh(new THREE.SphereGeometry(1)),
      ]),
    );
    addContextPlanetRings(meshes);
    expect(meshes.get('saturn')!.children.some((c) => c instanceof THREE.Group)).toBe(true);
    expect(meshes.get('jupiter')!.children).toHaveLength(0);
    expect(meshes.get('uranus')!.children).toHaveLength(0);
  });
});
