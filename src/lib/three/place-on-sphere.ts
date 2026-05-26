/**
 * Anchor a group on a sphere surface with local +Y pointing radially
 * outward (#42).
 *
 * Both /moon and /mars surface-marker rebuilders run the same 4-line
 * pose computation: position = unit·radius, then orient so the
 * marker's local +Y matches the surface normal at that point — keeps
 * cone-style lander silhouettes standing up.
 *
 * Caller passes the lat/lon-projected unit vector and the body radius.
 */
import * as THREE from 'three';

const UP_Y = /*@__PURE__*/ new THREE.Vector3(0, 1, 0);

export function placeOnSphereTangent(
  group: THREE.Object3D,
  unit: { x: number; y: number; z: number },
  radius: number,
): void {
  group.position.set(unit.x * radius, unit.y * radius, unit.z * radius);
  const up = new THREE.Vector3(unit.x, unit.y, unit.z);
  group.quaternion.setFromUnitVectors(UP_Y, up);
}
