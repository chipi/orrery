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

export type ModuleAxis = 'x' | 'y' | 'z';

/** Apply the rotation that aligns a default-Y cylinder with the requested axis. */
function applyAxisRotation(mesh: THREE.Object3D, axis: ModuleAxis): void {
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  // axis === 'y' → no rotation
}

/**
 * Build a two-section pressurised module — the canonical pattern used by
 * Tianhe, Zvezda, Zarya, Nauka, Destiny, Kibo PM, etc. Two cylinders of
 * different radii joined by a gold MLI transition band, all sharing the
 * same `userData.moduleId`. The result is a Group ready to add to root.
 *
 * Layout (along the requested axis):
 *   [ section A (forward) ][ MLI band ][ section B (aft) ]
 *
 * @param opts.id          moduleId tag for picking
 * @param opts.position    world-space center of the assembled module
 * @param opts.axis        long axis ('x' | 'y' | 'z')
 * @param opts.sections    [forward, aft] section dimensions
 * @param opts.hullMat     base hull material (cloned per section)
 * @param opts.mliMat      gold MLI material for the transition band
 * @param opts.bandFactor  optional multiplier for transition-band radius
 *                         (default: 1.05× section A radius)
 */
export function makeTwoSectionModule(opts: {
  id: string;
  position: THREE.Vector3;
  axis: ModuleAxis;
  sections: [{ len: number; r: number }, { len: number; r: number }];
  hullMat: THREE.Material;
  mliMat: THREE.Material;
  bandFactor?: number;
}): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(opts.position);
  const [a, b] = opts.sections;
  const totalLen = a.len + b.len;

  // Forward section centred at +half-(totalLen)/2 along axis; aft at -half.
  const aOffset = totalLen / 2 - a.len / 2;
  const bOffset = -totalLen / 2 + b.len / 2;

  // Build along Y (default cylinder axis) then rotate the whole group.
  const aMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(a.r, a.r, a.len, 14, 1),
    opts.hullMat instanceof THREE.MeshStandardMaterial ? opts.hullMat.clone() : opts.hullMat,
  );
  aMesh.position.y = aOffset;
  aMesh.userData.stationPickable = true;
  aMesh.userData.moduleId = opts.id;
  setShadowFlags(aMesh);
  group.add(aMesh);

  const bMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(b.r, b.r, b.len, 14, 1),
    opts.hullMat instanceof THREE.MeshStandardMaterial ? opts.hullMat.clone() : opts.hullMat,
  );
  bMesh.position.y = bOffset;
  bMesh.userData.stationPickable = true;
  bMesh.userData.moduleId = opts.id;
  setShadowFlags(bMesh);
  group.add(bMesh);

  // MLI band at the joint
  const bandFactor = opts.bandFactor ?? 1.05;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(a.r * bandFactor, b.r * bandFactor, 0.06, 14, 1),
    opts.mliMat,
  );
  band.position.y = bOffset + b.len / 2;
  band.userData.stationPickable = true;
  band.userData.moduleId = opts.id;
  setShadowFlags(band);
  group.add(band);

  applyAxisRotation(group, opts.axis);
  return group;
}

/** Gold MLI band at a joint — flat cylinder around a host module's axis. */
export function makeMliBand(
  position: THREE.Vector3,
  axis: ModuleAxis,
  radius: number,
  length: number,
  mat: THREE.Material,
): THREE.Mesh {
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 14, 1), mat);
  band.position.copy(position);
  applyAxisRotation(band, axis);
  setShadowFlags(band);
  return band;
}

/**
 * Small radial docking-port stub — short cylinder protruding from a host
 * module along the requested direction. The port mesh inherits the host's
 * `moduleId` so picking still selects the parent module.
 */
export function makeRadialDockingPort(opts: {
  hostPosition: THREE.Vector3;
  hostId: string;
  direction: 'nadir' | 'zenith' | 'port' | 'starboard' | 'fwd' | 'aft';
  hostRadius: number;
  portRadius?: number;
  portLength?: number;
  mat: THREE.Material;
}): THREE.Mesh {
  const portR = opts.portRadius ?? opts.hostRadius * 0.35;
  const portLen = opts.portLength ?? 0.06;
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(portR, portR, portLen, 10, 1), opts.mat);
  // Direction → axis mapping
  const dir = new THREE.Vector3();
  switch (opts.direction) {
    case 'zenith':
      dir.set(0, 1, 0);
      break;
    case 'nadir':
      dir.set(0, -1, 0);
      break;
    case 'port':
      dir.set(0, 0, -1);
      break;
    case 'starboard':
      dir.set(0, 0, 1);
      break;
    case 'fwd':
      dir.set(1, 0, 0);
      break;
    case 'aft':
      dir.set(-1, 0, 0);
      break;
  }
  // Offset stub from host surface
  const offset = opts.hostRadius + portLen / 2;
  stub.position.copy(opts.hostPosition).addScaledVector(dir, offset);
  // Default cylinder axis is Y; align with `dir`
  stub.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  stub.userData.moduleId = opts.hostId;
  stub.userData.stationPickable = true;
  setShadowFlags(stub);
  return stub;
}

/**
 * PMA-style axial docking adapter — gold MLI truncated cone along the
 * requested axis. Used for PMA-1/PMA-2/PMA-3 + Tiangong forward-axial.
 */
export function makeAxialAdapter(opts: {
  position: THREE.Vector3;
  axis: ModuleAxis;
  length: number;
  bigRadius: number;
  smallRadius?: number;
  mat: THREE.Material;
}): THREE.Mesh {
  const small = opts.smallRadius ?? opts.bigRadius * 0.7;
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(small, opts.bigRadius, opts.length, 12, 1),
    opts.mat,
  );
  cone.position.copy(opts.position);
  applyAxisRotation(cone, opts.axis);
  setShadowFlags(cone);
  return cone;
}
