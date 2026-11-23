/**
 * The shared kit of the detailed spacecraft models (the Apollo LM, Curiosity, and the landers
 * that follow them; operator 2026-11-23: one central model per craft, used everywhere):
 * materials, crinkled thermal blanket, struts, panels, dishes. MeshStandardMaterial only, no
 * textures, so a model reads the same in every scene, with or without the IBL environment.
 */
import * as THREE from 'three';

export type Mat = THREE.MeshStandardMaterial;

export function mat(color: number, metalness: number, roughness: number, flat = false): Mat {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    flatShading: flat,
    side: flat ? THREE.DoubleSide : THREE.FrontSide,
  });
}

export function add<T extends THREE.Object3D>(g: THREE.Object3D, o: T): T {
  g.add(o);
  return o;
}

/** Deterministic noise in [-1, 1] from a position: shared corners move together, no seams. */
export function hash3(x: number, y: number, z: number, k: number): number {
  const s = Math.sin(
    Math.round(x * 500) * 12.9898 + Math.round(y * 500) * 78.233 + Math.round(z * 500) * 37.719 + k,
  );
  return (s * 43758.5453 - Math.floor(s * 43758.5453)) * 2 - 1;
}

/** Crumple a geometry like thermal blanket: every vertex nudged by `amp` metres, faceted. */
export function crinkle(geo: THREE.BufferGeometry, amp: number): THREE.BufferGeometry {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setXYZ(
      i,
      x + hash3(x, y, z, 1) * amp,
      y + hash3(x, y, z, 2) * amp,
      z + hash3(x, y, z, 3) * amp,
    );
  }
  const out = geo.index ? geo.toNonIndexed() : geo;
  out.computeVertexNormals();
  return out;
}

/** A crinkled foil sheet w × h, facing +z, edges kept straight so neighbours meet. */
export function foilSheet(m: Mat, w: number, h: number, amp: number): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(
    w,
    h,
    Math.max(2, Math.round(w / 0.28)),
    Math.max(2, Math.round(h / 0.28)),
  );
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    if (Math.abs(Math.abs(x) - w / 2) < 1e-6 || Math.abs(Math.abs(y) - h / 2) < 1e-6) continue;
    p.setZ(i, hash3(x, y, w + h, 4) * amp);
  }
  const out = geo.toNonIndexed();
  out.computeVertexNormals();
  return new THREE.Mesh(out, m);
}

/** A cylinder strut from a to b. */
export function strut(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
  seg = 10,
): THREE.Mesh {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return add(g, mesh);
}

export function box(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

export function lathe(g: THREE.Object3D, m: Mat, pts: [number, number][], seg = 36): THREE.Mesh {
  return add(
    g,
    new THREE.Mesh(
      new THREE.LatheGeometry(
        pts.map(([r, y]) => new THREE.Vector2(r, y)),
        seg,
      ),
      m,
    ),
  );
}

/** A dish antenna: a shallow bowl opening along +y of its group, with a feed. */
export function dish(m: Mat, feed: Mat, r: number): THREE.Group {
  const d = new THREE.Group();
  lathe(
    d,
    m,
    [
      [0.02, 0],
      [r * 0.5, r * 0.07],
      [r, r * 0.28],
    ],
    24,
  ).material = m;
  strut(d, feed, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, r * 0.6, 0), r * 0.04, 6);
  return d;
}

/** A rectangular beam w × h from a to b (rocker arms, booms), its h side up. */
export function beam(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  w: number,
  h: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, a.distanceTo(b)), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  // Local frame: +z along a → b, +y as near world up as the direction allows.
  const dir = b.clone().sub(a).normalize();
  const up = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(b, a, up));
  return add(g, mesh);
}
