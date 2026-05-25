/**
 * Knock a Three.js subtree down to a semi-transparent state (#42).
 *
 * Used by /moon and /mars orbital-marker builders to "dim" non-ACTIVE
 * orbiters (decommissioned LRO/Clementine, etc.) — same factory
 * builds them at full opacity, the routes call this to drop the entire
 * spacecraft mesh's opacity in a single traverse.
 *
 * Mutates each Mesh's material in place. Skips non-Mesh objects and
 * Meshes whose material doesn't accept `opacity` / `transparent` (the
 * cast guard handles wireframe-only or depth-only materials safely).
 */
import * as THREE from 'three';

export function dimMaterials(obj: THREE.Object3D, opacity = 0.5): void {
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const mat = o.material as THREE.Material & {
      opacity?: number;
      transparent?: boolean;
    };
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = opacity;
  });
}
