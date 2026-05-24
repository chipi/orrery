/**
 * Continuous sun-tracking for solar-array meshes (#57).
 *
 * Walks the scene graph rooted at `root` and rotates any object whose
 * `userData.tracksSun === true` around `userData.sadaAxis` ('x' | 'y' |
 * 'z') with `userData.baseRotation` as the offset. Used by /iss and
 * /tiangong's stations — both carried this 8-line traversal verbatim.
 *
 * Animation rate: 0.026 rad/sec → ~one full revolution every ~4 minutes
 * (visual approximation of the SADA tracking the Sun across each orbit).
 *
 * Usage in the per-frame loop:
 *   tickSunTrackingArrays(station, t);
 *
 * Where `t = performance.now() / 1000`.
 */
import type * as THREE from 'three';

type Axis = 'x' | 'y' | 'z';

interface SunTrackingUserData {
  tracksSun?: boolean;
  sadaAxis?: Axis;
  baseRotation?: number;
}

/**
 * @param root  Object3D whose descendants are scanned (e.g. station group)
 * @param t     wall-clock time in seconds
 * @param rate  rotation rate in rad/sec (default 0.026 = ~4 min/rev)
 */
export function tickSunTrackingArrays(root: THREE.Object3D, t: number, rate: number = 0.026): void {
  const sunPhase = t * rate;
  root.traverse((obj) => {
    const data = obj.userData as SunTrackingUserData;
    if (data.tracksSun) {
      const axis = (data.sadaAxis ?? 'y') as Axis;
      const base = data.baseRotation ?? 0;
      obj.rotation[axis] = base + sunPhase;
    }
  });
}
