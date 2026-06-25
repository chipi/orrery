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
    if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Points) {
      o.geometry?.dispose();
      // Dispose the textures held in each material's map slots BEFORE the
      // material itself — `material.dispose()` frees the material program
      // but NOT its bound textures, so skipping this leaks the texture's
      // GPU memory. This is the load-bearing fix for the multi-GB surface
      // leak (#363): rebuildMarkers / route-patch + traverse teardown /
      // tier eviction all route through here, and the recent regional +
      // route-HiRISE imagery layers bind large textures to these materials.
      if (Array.isArray(o.material)) {
        o.material.forEach((mat) => {
          disposeMaterialTextures(mat);
          mat.dispose();
        });
      } else if (o.material) {
        disposeMaterialTextures(o.material);
        o.material.dispose();
      }
    }
  });
}

/**
 * Common texture-map slots across Three.js material types (GH #271).
 * Extended on 2026-05-29 to cover every map the /fly /earth /explore
 * /iss /tiangong scenes touch, after /explore was found to be the
 * only route truly leaking — its inline cleanup disposed emissiveMap
 * + normalMap which the original disposeScene helper did not. Listing
 * here as a single source of truth so future material additions land
 * once. Absent slots are no-ops (optional chaining), so over-listing
 * is cheap; under-listing leaks GPU memory.
 */
const TEXTURE_SLOTS = [
  'map',
  'emissiveMap',
  'normalMap',
  'bumpMap',
  'displacementMap',
  'roughnessMap',
  'metalnessMap',
  'specularMap',
  'envMap',
  'alphaMap',
  'aoMap',
  'lightMap',
  'matcap',
  'gradientMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
] as const;

function disposeMaterialTextures(mat: THREE.Material): void {
  // Materials carry textures under known property names; we read each
  // slot as a possibly-undefined Texture and dispose if present. Avoids
  // an `as any` by going through Record<string, unknown>.
  const bag = mat as unknown as Record<string, THREE.Texture | null | undefined>;
  for (const slot of TEXTURE_SLOTS) {
    bag[slot]?.dispose();
  }
}

/**
 * Full-scene teardown for route unmount paths (#42, GH #271).
 *
 * Walks every Mesh / Line / Points in the scene, disposes geometry +
 * materials + any texture maps in the standard slot set. Used by /moon
 * /fly /earth /explore /iss /tiangong cleanup blocks. /mars keeps its
 * own per-marker disposal in cleanup because it tracks disposable
 * handles explicitly; everyone else walks the whole scene to catch
 * lazily-built meshes that aren't tracked separately.
 */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((mat) => {
          disposeMaterialTextures(mat);
          mat.dispose();
        });
      } else if (obj.material) {
        disposeMaterialTextures(obj.material);
        (obj.material as THREE.Material).dispose();
      }
    }
  });
}
