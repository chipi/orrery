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

/**
 * Full-scene teardown for route unmount paths (#42).
 *
 * Walks every Mesh / Line / Points in the scene, disposes geometry +
 * materials + any texture maps. Used by /moon's cleanup block. /mars
 * keeps its own per-marker disposal in cleanup because it tracks
 * disposable handles explicitly; /moon walks the whole scene to catch
 * lazily-built hotspot meshes that aren't tracked separately.
 */
export function disposeScene(scene: THREE.Scene): void {
  const disposeMatTextures = (mat: THREE.Material) => {
    const m = mat as THREE.Material & { map?: THREE.Texture | null };
    m.map?.dispose();
  };
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => {
          disposeMatTextures(mat);
          mat.dispose();
        });
      } else if (obj.material) {
        disposeMatTextures(obj.material);
        (obj.material as THREE.Material).dispose();
      }
    }
  });
}
