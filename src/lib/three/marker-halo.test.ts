import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMarkerHalo } from './marker-halo';

function bbox(obj: THREE.BufferGeometry): THREE.Box3 {
  obj.computeBoundingBox();
  return obj.boundingBox!;
}

describe('createMarkerHalo (point marker)', () => {
  it('is a hidden thin ring between 0.92r and r in the given colour', () => {
    const halo = createMarkerHalo('#ff0000', 2) as THREE.Mesh;
    expect(halo).toBeInstanceOf(THREE.Mesh);
    expect(halo.visible).toBe(false);
    const geo = halo.geometry as THREE.RingGeometry;
    expect(geo.parameters.innerRadius).toBeCloseTo(1.84, 10);
    expect(geo.parameters.outerRadius).toBe(2);
    const mat = halo.material as THREE.MeshBasicMaterial;
    expect(mat.color.getHexString()).toBe('ff0000');
    expect(mat.opacity).toBe(0.9);
    expect(mat.depthWrite).toBe(false);
  });

  it('stays upright unless lay is set', () => {
    const halo = createMarkerHalo('#fff', 1);
    expect(halo.rotation.x).toBe(0);
    expect(halo.position.y).toBe(0);
  });

  it('lay:true rotates flat and lifts 0.02 above the ground', () => {
    const halo = createMarkerHalo('#fff', 1, { lay: true });
    expect(halo.rotation.x).toBeCloseTo(-Math.PI / 2, 10);
    expect(halo.position.y).toBe(0.02);
    expect(halo.visible).toBe(false);
  });
});

describe('createMarkerHalo (region reticle)', () => {
  it('builds fill + corner brackets + crosshair, hidden', () => {
    const halo = createMarkerHalo('#00ff00', 1, { aspect: 2 });
    expect(halo).toBeInstanceOf(THREE.Group);
    expect(halo.visible).toBe(false);
    const [fill, brackets, cross] = halo.children;
    expect(fill).toBeInstanceOf(THREE.Mesh);
    expect(brackets).toBeInstanceOf(THREE.LineSegments);
    expect(cross).toBeInstanceOf(THREE.LineSegments);
    expect(halo.children).toHaveLength(3);
  });

  it('preserves the reference circle area and honours the aspect ratio', () => {
    const r = 1.5;
    for (const aspect of [0.5, 1, 2.5]) {
      const halo = createMarkerHalo('#fff', r, { aspect });
      const fill = halo.children[0] as THREE.Mesh;
      const size = bbox(fill.geometry).getSize(new THREE.Vector3());
      expect(size.x / size.y).toBeCloseTo(aspect, 5);
      expect(size.x * size.y).toBeCloseTo(Math.PI * r * r, 5);
    }
  });

  it('puts 8 bracket segments on the rectangle corners, arms 15% of the short side', () => {
    const halo = createMarkerHalo('#fff', 1, { aspect: 2 });
    const brackets = halo.children[1] as THREE.LineSegments;
    const pos = brackets.geometry.getAttribute('position');
    expect(pos.count).toBe(16);
    const fill = halo.children[0] as THREE.Mesh;
    const size = bbox(fill.geometry).getSize(new THREE.Vector3());
    const box = bbox(brackets.geometry);
    expect(box.max.x).toBeCloseTo(size.x / 2, 6);
    expect(box.min.y).toBeCloseTo(-size.y / 2, 6);
    // first segment: bottom-left corner running right by 0.15 * shorter side
    const arm = Math.min(size.x, size.y) * 0.15;
    expect(pos.getX(1) - pos.getX(0)).toBeCloseTo(arm, 6);
    expect(pos.getX(0)).toBeCloseTo(-size.x / 2, 6);
    expect(pos.getY(0)).toBeCloseTo(-size.y / 2, 6);
  });

  it('crosshair is centred with arms 4% of the short side', () => {
    const halo = createMarkerHalo('#fff', 1, { aspect: 1 });
    const cross = halo.children[2] as THREE.LineSegments;
    const box = bbox(cross.geometry);
    const side = Math.sqrt(Math.PI); // r=1, aspect=1 → square of area π
    expect(box.max.x).toBeCloseTo(side * 0.04, 8);
    expect(box.min.x).toBeCloseTo(-side * 0.04, 8);
    expect(box.max.y).toBeCloseTo(side * 0.04, 8);
  });

  it('lay:true applies to the reticle group too', () => {
    const halo = createMarkerHalo('#fff', 1, { aspect: 1, lay: true });
    expect(halo.rotation.x).toBeCloseTo(-Math.PI / 2, 10);
    expect(halo.position.y).toBe(0.02);
  });

  it('tints fill and lines with the colour at their documented opacities', () => {
    const halo = createMarkerHalo('#336699', 1, { aspect: 1 });
    const [fill, brackets, cross] = halo.children as THREE.Mesh[];
    const m = (o: THREE.Object3D) => (o as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(m(fill).color.getHexString()).toBe('336699');
    expect(m(fill).opacity).toBe(0.04);
    expect(m(brackets).opacity).toBe(0.92);
    expect(m(cross).opacity).toBe(0.55);
  });
});
