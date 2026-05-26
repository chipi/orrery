/**
 * Selection-halo factory for surface-map markers (#42).
 *
 * Both /moon and /mars build the same hidden-by-default ring mesh that
 * fades in when its parent marker is selected. Default orientation is
 * upright (ring in XY plane) — suitable for orbiter dots where the
 * halo travels with the spacecraft. Surface markers want the ring
 * flat against the ground, slightly above the surface to avoid
 * z-fighting with the patch beneath — pass `lay: true`.
 *
 * Returns a `THREE.Mesh` with `.visible = false` — the caller flips
 * visibility in its selection-styling pass.
 */
import * as THREE from 'three';

export function createMarkerHalo(
  color: string,
  radius: number,
  { lay = false }: { lay?: boolean } = {},
): THREE.Mesh {
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
  if (lay) {
    halo.position.y = 0.02;
    halo.rotation.x = -Math.PI / 2;
  }
  return halo;
}
