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

/**
 * Unit geographic-north tangent at (lat, lon) in the SAME world frame as
 * latLonToUnitSphere: pos = (cos·cos, sin, -cos·sin). The derivative w.r.t.
 * latitude points toward increasing latitude (true north) and is already
 * unit-length on the unit sphere.
 */
export function northTangent(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.sin(lat) * Math.cos(lon),
    Math.cos(lat),
    Math.sin(lat) * Math.sin(lon),
  );
}

/**
 * Azimuth (degrees) to spin a north-up surface patch about its surface
 * normal so its texture-north points to GEOGRAPHIC north on the globe
 * (#309). `quaternion` is the wrapper group's tangent pose from
 * placeOnSphereTangent. In the patch's local frame (after the builder's
 * rotateX(-90°)) texture-north is local -Z; we transform the world north
 * tangent into that local frame and return the rotateY angle that maps
 * -Z onto it: rotateY(θ) sends (0,0,-1) → (-sinθ, 0, -cosθ), so for a
 * local north (nx, ~0, nz) the solution is θ = atan2(-nx, -nz).
 */
export function azimuthToAlignNorth(
  latDeg: number,
  lonDeg: number,
  quaternion: THREE.Quaternion,
): number {
  const nLocal = northTangent(latDeg, lonDeg).applyQuaternion(quaternion.clone().invert());
  const theta = Math.atan2(-nLocal.x, -nLocal.z);
  return (theta * 180) / Math.PI;
}
