/**
 * Standard Three.js mesh/line geometry + material disposal (#42).
 *
 * /mars had a local `disposeMesh` doing this; /moon inlined the same
 * walk in three places (orbital-marker teardown, surface-marker
 * teardown, traverse teardown). Pulled into one place so future tweaks
 * — handling Sprite material disposal, texture disposal, etc. —
 * land once.
 *
 * Walks the entire subtree; safe to call on the root group.
 */
import * as THREE from 'three';

export function disposeObject3d(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((mat) => mat.dispose());
      else o.material?.dispose();
    }
  });
}
