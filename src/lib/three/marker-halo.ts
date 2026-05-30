/**
 * Selection-halo factory for surface-map markers (#42, ADR-061).
 *
 * Both /moon and /mars build the same hidden-by-default outline that
 * fades in when its parent marker is selected. Default orientation is
 * upright (in XY plane) — suitable for orbiter dots. Surface markers
 * want the outline flat against the ground, slightly above the surface
 * to avoid z-fighting with the patch beneath — pass `lay: true`.
 *
 * Geometry depends on whether the marker represents a region:
 *   - Default (point hotspot, no region_bounds): thin circular ring.
 *   - With `aspect` (rectangular region per region_bounds): thin
 *     rectangular outline drawn as 4 line segments. Per ADR-061,
 *     the selection halo IS the region's bounding rectangle — no
 *     separate decoupled blue ring as on the legacy implementation
 *     (image 13 of the pre-redesign moon mockups).
 *
 * Returns a `THREE.Object3D` (parent type of both Mesh and LineSegments)
 * with `.visible = false`. Caller flips visibility in its selection-
 * styling pass.
 */
import * as THREE from 'three';

export interface MarkerHaloOptions {
  /** Lay flat against the ground (rotate -π/2 around X, +0.02 in Y). */
  lay?: boolean;
  /**
   * Aspect ratio (width / height) of the region this halo outlines.
   * Provided when the site has `region_bounds`; same value as computed
   * by `aspectFromRegion()` in `hotspot-surface-patch.ts`. When omitted
   * or ≈ 1, halo renders as a circular ring (legacy behaviour).
   */
  aspect?: number;
}

export function createMarkerHalo(
  color: string,
  radius: number,
  opts: MarkerHaloOptions = {},
): THREE.Object3D {
  const { lay = false, aspect } = opts;
  let halo: THREE.Object3D;
  if (aspect != null && Math.abs(aspect - 1) >= 0.01) {
    // Rectangular bounding outline (4 line segments around the rect).
    // Width × height preserves the circle's area while matching the
    // requested aspect — same area-preserving math as the patch geometry.
    const diameter = radius * 2;
    const circleArea = (Math.PI / 4) * diameter * diameter;
    const height = Math.sqrt(circleArea / aspect);
    const width = aspect * height;
    const w2 = width / 2;
    const h2 = height / 2;
    // 8 vertices forming 4 line segments along the rect perimeter.
    const verts = new Float32Array([
      -w2,
      -h2,
      0,
      w2,
      -h2,
      0,
      w2,
      -h2,
      0,
      w2,
      h2,
      0,
      w2,
      h2,
      0,
      -w2,
      h2,
      0,
      -w2,
      h2,
      0,
      -w2,
      -h2,
      0,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
    halo = new THREE.LineSegments(geo, mat);
  } else {
    const haloGeo = new THREE.RingGeometry(radius * 0.92, radius, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    halo = new THREE.Mesh(haloGeo, haloMat);
  }
  halo.visible = false;
  if (lay) {
    halo.position.y = 0.02;
    halo.rotation.x = -Math.PI / 2;
  }
  return halo;
}
