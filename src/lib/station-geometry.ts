/**
 * Station-agnostic geometry helpers shared across `/iss` (ADR-040 / ADR-041)
 * and `/tiangong` (ADR-048 / ADR-049). Pure Three.js — no domain knowledge.
 *
 * Picking convention (ADR-041 + ADR-049): pickable meshes carry
 * `userData.stationPickable === true` plus `userData.moduleId === <id>`;
 * structural geometry carries `userData.stationPickable === false` so the
 * raycaster walk-up filters it out.
 */
import * as THREE from 'three';

export function setShadowFlags(obj: THREE.Object3D): void {
  obj.castShadow = true;
  obj.receiveShadow = true;
}

export function cylinderBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8, 1), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function makeWingPair(
  parent: THREE.Group,
  span: number,
  depth: number,
  color: number,
): void {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.55,
  });
  for (const sign of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.01, depth), mat);
    wing.position.set(sign * (span / 2 + 0.04), 0, 0);
    setShadowFlags(wing);
    parent.add(wing);
  }
}
