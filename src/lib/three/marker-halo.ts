/**
 * Selection-halo factory for surface-map markers (#42).
 *
 * Both /moon and /mars build the same hidden-by-default ring mesh that
 * fades in when its parent marker is selected. Pre-extraction each
 * route inlined the identical 13-line factory inside its onMount.
 *
 * Returns a `THREE.Mesh` with `.visible = false` — the caller flips
 * visibility in its selection-styling pass.
 */
import * as THREE from 'three';

export function createMarkerHalo(color: string, radius: number): THREE.Mesh {
  const haloGeo = new THREE.RingGeometry(radius * 0.92, radius, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.visible = false;
  return halo;
}
