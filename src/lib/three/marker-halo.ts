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
    // Region-bounds halo — surveyor's-reticle / camera-viewfinder
    // style: 4 corner brackets + faint centre crosshair + very
    // subtle fill. Replaces the previous full-perimeter rectangle
    // + 8% fill (image 21 / "halo is so ugly" feedback, 2026-06-03)
    // which read as a UI box and dominated the patch view. Corner
    // brackets are the canonical scientific-instrument overlay
    // (HiRISE / CTX product viewers, JPL targeting maps) — they
    // bound the region without painting a continuous edge that
    // competes with the patch texture inside.
    const diameter = radius * 2;
    const circleArea = (Math.PI / 4) * diameter * diameter;
    const height = Math.sqrt(circleArea / aspect);
    const width = aspect * height;
    const w2 = width / 2;
    const h2 = height / 2;
    const group = new THREE.Group();

    // (a) Whisper-fill plane — barely-there 4% colour wash so the
    // bracketed region reads as gently tinted vs. the surrounding
    // surface, without overpowering it.
    const fillGeo = new THREE.PlaneGeometry(width, height);
    const fillMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(fillGeo, fillMat));

    // (b) Corner brackets — 4 L-shapes, one at each rectangle
    // corner. Bracket arm length is 15% of the SHORTER side so
    // brackets stay proportional on both wide-area regions
    // (Perseverance ~15 × 18 km) and square-ish ROIs.
    const armLen = Math.min(width, height) * 0.15;
    // Each corner = 2 line segments (an L). 4 corners × 2 segments
    // × 2 endpoints × 3 coords = 48 floats.
    // Ordering: BL, BR, TR, TL — horizontal then vertical arm at
    // each, with the arm extending INWARD from the corner so the
    // tick reads as "this is the bound" not "extends past it".
    // prettier-ignore
    const bracketVerts = new Float32Array([
      // bottom-left corner
      -w2, -h2, 0,    -w2 + armLen, -h2, 0,   // → right
      -w2, -h2, 0,    -w2, -h2 + armLen, 0,   // ↑ up
      // bottom-right corner
       w2, -h2, 0,     w2 - armLen, -h2, 0,   // ← left
       w2, -h2, 0,     w2, -h2 + armLen, 0,   // ↑ up
      // top-right corner
       w2,  h2, 0,     w2 - armLen,  h2, 0,   // ← left
       w2,  h2, 0,     w2,  h2 - armLen, 0,   // ↓ down
      // top-left corner
      -w2,  h2, 0,    -w2 + armLen,  h2, 0,   // → right
      -w2,  h2, 0,    -w2,  h2 - armLen, 0,   // ↓ down
    ]);
    const bracketGeo = new THREE.BufferGeometry();
    bracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(bracketVerts, 3));
    const bracketMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.92,
    });
    group.add(new THREE.LineSegments(bracketGeo, bracketMat));

    // (c) Centre crosshair — small + mark at the region centroid.
    // Subtle but reinforces "this is a targeted area". Arm length
    // 4% of the shorter side so it stays a punctuation mark, not
    // a feature in its own right.
    const crossLen = Math.min(width, height) * 0.04;
    // prettier-ignore
    const crossVerts = new Float32Array([
      -crossLen, 0, 0,   crossLen, 0, 0,   // horizontal
      0, -crossLen, 0,   0, crossLen, 0,   // vertical
    ]);
    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute('position', new THREE.Float32BufferAttribute(crossVerts, 3));
    const crossMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
    });
    group.add(new THREE.LineSegments(crossGeo, crossMat));

    halo = group;
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
