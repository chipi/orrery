import * as THREE from 'three';

/**
 * A cylinder strut that physically SPANS from point `a` to point `b` — length
 * = |b-a|, positioned at the midpoint, oriented along the a→b axis. Use this
 * for landing legs / braces so the rod actually connects the body to its
 * footpad instead of floating at a fixed rotation that misses the pad.
 */
export function strutBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  radialSegments = 8,
): THREE.Mesh {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, radialSegments),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}
