/**
 * Tianhe as it flew in June 2021, for the /fly docking (W9, Shenzhou 12): the core module alone
 * (Wentian and Mengtian came in 2022), its spherical node with the forward port Shenzhou 12 took,
 * the free nadir and side ports, the small and large sections of the living cabin, the resource
 * cabin with its two wings, and the aft port where Tianzhou-2 sat. Drawn in metres, whole: the
 * /tiangong diagram (tiangong-proxy-model.ts) is not to scale.
 *
 * Sourced (static/data/docking-profiles/shenzhou-12.json `provenance`): 16.6 m long and 4.2 m
 * across at most; the node a sphere 2.8 m across; the node, small section, large section, aft
 * passage and resource cabin in that order; the docking passage 0.8 m; each wing 13 m out from
 * the body. ESTIMATES: the length of each section, the small section's and the resource cabin's
 * 2.8 m, the docking ring's size and petals, the wing's 5.2 m width (from 67 m2 a wing over the
 * 13 m), where the wings stand, every colour. Not drawn: the robotic arm, antennas, handrails.
 *
 * Frame: the origin on the forward docking ring's face on the axis, +x forward out of the port
 * (the direction of flight), +y zenith. `userData.dockingPort` is the forward ring's face,
 * `userData.aftPort` the aft one (facing -x).
 */
import * as THREE from 'three';
import { xCyl, xRing, type DockingEnd } from './iss-docking-end';

export const TIANHE_LEN_M = 16.6;
const NODE_R = 1.4;
const SMALL_R = 1.4;
const LARGE_R = 2.1;
const RESOURCE_R = 1.4;
const RING_R = 0.6;
const WING_LEN = 13;
const WING_W = 5.2;

const mat = (color: number, metalness = 0.1, roughness = 0.7) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

export interface TianheModel extends DockingEnd {
  userData: { dockingPort: THREE.Object3D; aftPort: THREE.Object3D; length: number };
}

/** A passive docking ring facing `dir` (+1 forward, -1 aft) with its face at x: the adapter
 *  drum, the dark hatch, the guide ring and three petals (turned 60 deg from the active ring's,
 *  so the two sets mesh). */
function dockingRing(g: THREE.Object3D, x: number, dir: 1 | -1, metal: THREE.Material): void {
  const dark = mat(0x26282d, 0.3, 0.6);
  const a0 = x - dir * 0.45;
  xCyl(g, metal, 0.66, 0.66, Math.min(a0, x - dir * 0.08), Math.max(a0, x - dir * 0.08), 36);
  xCyl(g, dark, 0.4, 0.4, Math.min(x, x - dir * 0.08), Math.max(x, x - dir * 0.08), 28);
  xRing(g, metal, RING_R, 0.04, x);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.34, 0.03), metal);
    petal.position.set(x + dir * 0.11, Math.cos(a) * 0.56, Math.sin(a) * 0.56);
    petal.rotation.set(-a, 0, 0);
    petal.rotateZ(dir * 0.3);
    g.add(petal);
  }
}

export function buildTianhe2021(): TianheModel {
  const g = new THREE.Group() as TianheModel;
  g.name = 'tianhe-2021';
  const white = mat(0xe9e7e0, 0.05, 0.8);
  const seam = mat(0xb4b1a8, 0.05, 0.8);
  const metal = mat(0xbcc0c6, 0.6, 0.35);
  const dark = mat(0x26282d, 0.3, 0.6);

  // the forward port and the node sphere behind it
  dockingRing(g, 0, 1, metal);
  const nodeX = -0.45 - NODE_R + 0.1;
  const node = new THREE.Mesh(new THREE.SphereGeometry(NODE_R, 40, 28), white);
  node.position.x = nodeX;
  g.add(node);
  // the free ports on the node: nadir and the two sides (the labs' berths a year later)
  for (const [dy, dz] of [
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.36, 32), metal);
    adapter.position.set(nodeX, dy * (NODE_R + 0.05), dz * (NODE_R + 0.05));
    if (dz) adapter.rotation.x = Math.PI / 2;
    g.add(adapter);
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24), dark);
    hatch.position.set(nodeX, dy * (NODE_R + 0.24), dz * (NODE_R + 0.24));
    if (dz) hatch.rotation.x = Math.PI / 2;
    g.add(hatch);
  }

  // the living cabin: the small section, its taper, the large section
  const s0 = nodeX - 0.2;
  const s1 = s0 - 5.0;
  xCyl(g, white, SMALL_R, SMALL_R, s1, s0, 48);
  for (const k of [0.25, 0.5, 0.75]) xRing(g, seam, SMALL_R + 0.01, 0.025, s0 - 5.0 * k);
  const t1 = s1 - 0.8;
  xCyl(g, white, LARGE_R, SMALL_R, t1, s1, 48);
  const l1 = t1 - 4.0;
  xCyl(g, white, LARGE_R, LARGE_R, l1, t1, 56);
  for (const k of [0, 0.5, 1]) xRing(g, seam, LARGE_R + 0.01, 0.03, t1 - 4.0 * k);
  // the aft passage and the resource cabin, to the aft port at the sourced 16.6 m
  const r0 = l1 - 0.6;
  xCyl(g, white, RESOURCE_R, LARGE_R, r0, l1, 48);
  const aftX = -TIANHE_LEN_M;
  xCyl(g, mat(0xd9d6cc, 0.1, 0.75), RESOURCE_R, RESOURCE_R, aftX + 0.45, r0, 48);
  dockingRing(g, aftX, -1, metal);

  // the two wings on the resource cabin, out along the orbit normal on short masts
  const cells = mat(0x1c2747, 0.35, 0.45);
  const frame = mat(0xc9a24a, 0.6, 0.4);
  const wingX = (r0 + aftX + 0.45) / 2;
  for (const s of [-1, 1]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), metal);
    mast.rotation.x = Math.PI / 2;
    mast.position.set(wingX, 0, s * (RESOURCE_R + 0.5));
    g.add(mast);
    const z0 = RESOURCE_R + 1.0;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(WING_W, 0.04, WING_LEN), cells);
    wing.position.set(wingX, 0, s * (z0 + WING_LEN / 2));
    g.add(wing);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(WING_W + 0.1, 0.05, 0.1), frame);
    edge.position.set(wingX, 0, s * (z0 + WING_LEN));
    g.add(edge);
    for (let k = 1; k < 6; k++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(WING_W, 0.05, 0.04), frame);
      line.position.set(wingX, 0, s * (z0 + (WING_LEN * k) / 6));
      g.add(line);
    }
  }

  const port = new THREE.Object3D();
  port.name = 'docking-port';
  g.add(port);
  const aft = new THREE.Object3D();
  aft.name = 'aft-port';
  aft.position.x = aftX;
  g.add(aft);
  g.userData = { dockingPort: port, aftPort: aft, length: TIANHE_LEN_M };
  return g;
}
