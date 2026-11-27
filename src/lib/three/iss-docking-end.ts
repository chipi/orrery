/**
 * The ISS docking end for the /fly docking (W9, Demo-2): Harmony's forward end cone with its
 * berthing ring, PMA-2, IDA-2 with its soft-capture ring and its targets, and HTV-9 on Harmony's
 * Earth-facing port. Drawn at their sourced sizes in metres, over the /iss diagram station
 * (iss-proxy-model.ts) scaled to metres, which carries the rest of the station.
 *
 * Sourced (static/data/docking-profiles/crew-dragon-demo-2.json `provenance`): Harmony 4.4 m
 * across; PMA-2 1.86 m long, 1.9 m across the wide end and 1.37 m the narrow one; IDA 1.1 m high,
 * 1.6 m wide, about 2.4 m with its targets; HTV 9.8 m long with its thrusters, 4.4 m across.
 * SCHEMATIC: the end cone's taper, PMA-2 drawn straight (it is an off-axis cone), the IDA's ring,
 * petals and target layout, the HTV's section lengths and its panel pattern, every colour.
 *
 * Frame: the origin on Harmony's forward end face on its axis, +x forward out of the port, +y
 * zenith; `userData.dockingPort` is IDA-2's ring face. `buildHtv()` stands on its berthing ring at
 * the origin, its body down -y.
 */
import * as THREE from 'three';

const HARMONY_R = 2.2;
const END_CONE = 0.5;
const PMA_LEN = 1.86;
const PMA_R_WIDE = 0.95;
const PMA_R_NARROW = 0.685;
const IDA_LEN = 1.1;
const IDA_R = 0.8;
const HTV_LEN = 9.8;
const HTV_R = 2.2;

const mat = (color: number, metalness = 0.1, roughness = 0.7, side: THREE.Side = THREE.FrontSide) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, side });

/** A cylinder along +x from x0 to x1 (radii at each end). */
function xCyl(
  g: THREE.Object3D,
  m: THREE.Material,
  r0: number,
  r1: number,
  x0: number,
  x1: number,
  seg = 40,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, x1 - x0, seg), m);
  mesh.rotation.z = -Math.PI / 2;
  mesh.position.x = (x0 + x1) / 2;
  g.add(mesh);
  return mesh;
}

/** A ring in the y-z plane at x. */
function xRing(g: THREE.Object3D, m: THREE.Material, R: number, r: number, x: number): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, 48), m);
  t.rotation.y = Math.PI / 2;
  t.position.x = x;
  g.add(t);
  return t;
}

export interface DockingEnd extends THREE.Group {
  userData: { dockingPort: THREE.Object3D; length: number };
}

export function buildHarmonyForwardEnd(): DockingEnd {
  const g = new THREE.Group() as DockingEnd;
  g.name = 'harmony-forward-end';
  const blanket = mat(0xe7e4da, 0.05, 0.8);
  const seam = mat(0xa9a69c, 0.05, 0.8);
  const metal = mat(0xb9bdc3, 0.6, 0.35);
  const dark = mat(0x2a2c31, 0.3, 0.6);
  const pmaMli = mat(0xd8ccb0, 0.15, 0.75);
  const gold = mat(0xc9a24a, 0.7, 0.35);

  // Harmony's forward end cone and its berthing ring (CBM).
  xCyl(g, blanket, HARMONY_R, 1.15, 0, END_CONE, 48);
  xRing(g, metal, HARMONY_R + 0.02, 0.05, 0.02);
  xCyl(g, metal, 1.12, 1.08, END_CONE, END_CONE + 0.12, 40);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), dark);
    bolt.position.set(END_CONE + 0.06, Math.cos(a) * 1.14, Math.sin(a) * 1.14);
    g.add(bolt);
  }
  // Handrails on the cone, four of them.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 6), gold);
    const r = 1.75;
    rail.position.set(0.3, Math.cos(a) * r, Math.sin(a) * r);
    rail.rotation.x = a;
    g.add(rail);
  }

  // PMA-2: the blanketed cone, its seams.
  const p0 = END_CONE + 0.12;
  const p1 = p0 + PMA_LEN;
  xCyl(g, pmaMli, PMA_R_WIDE, PMA_R_NARROW, p0, p1, 36);
  for (const k of [0.25, 0.5, 0.75]) {
    const r = PMA_R_WIDE + (PMA_R_NARROW - PMA_R_WIDE) * k;
    xRing(g, seam, r + 0.01, 0.012, p0 + PMA_LEN * k);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(PMA_LEN, 0.02, 0.02), seam);
    const r = (PMA_R_WIDE + PMA_R_NARROW) / 2 + 0.01;
    s.position.set((p0 + p1) / 2, Math.cos(a) * r, Math.sin(a) * r);
    s.rotation.x = -a;
    s.rotation.z = Math.atan2(PMA_R_WIDE - PMA_R_NARROW, PMA_LEN) * (Math.cos(a) >= 0 ? 1 : -1);
    g.add(s);
  }
  xRing(g, metal, PMA_R_NARROW + 0.03, 0.04, p1);

  // IDA-2: the drum, the soft-capture ring with its three petals, the targets.
  const i0 = p1;
  const i1 = i0 + IDA_LEN;
  xCyl(g, metal, IDA_R, IDA_R, i0, i0 + 0.55, 40);
  xCyl(g, mat(0xd2d4d6, 0.3, 0.55), IDA_R * 0.92, 0.66, i0 + 0.55, i1 - 0.1, 40);
  xCyl(g, dark, 0.45, 0.45, i1 - 0.1, i1 - 0.08, 32);
  xRing(g, metal, 0.62, 0.045, i1);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.03), metal);
    const r = 0.56;
    petal.position.set(i1 + 0.1, Math.cos(a) * r, Math.sin(a) * r);
    petal.rotation.set(-a, 0, 0);
    petal.rotateZ(Math.PI / 2);
    petal.rotateX(0.35);
    g.add(petal);
  }
  // The targets on two arms out to ~1.2 m (the 2.4 m with targets).
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.45), metal);
    arm.position.set(i0 + 0.35, 0.1, s * (IDA_R + 0.2));
    g.add(arm);
    const tgt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.3), mat(0x15161a, 0.2, 0.5));
    tgt.position.set(i0 + 0.4, 0.1, s * 1.15);
    g.add(tgt);
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.08), mat(0xf2f2f2, 0, 0.4));
    dot.position.set(i0 + 0.43, 0.1, s * 1.15);
    g.add(dot);
  }
  const port = new THREE.Object3D();
  port.name = 'docking-port';
  port.position.x = i1;
  g.add(port);
  g.userData = { dockingPort: port, length: i1 };
  return g;
}

/** HTV (Kounotori): berthing ring at the origin, the body hanging down -y. */
export function buildHtv(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'htv';
  const cells = mat(0x1d2a4a, 0.3, 0.45);
  const frame = mat(0xc9ccd0, 0.5, 0.4);
  const white = mat(0xe4e2db, 0.05, 0.75);
  const gold = mat(0xc69b3e, 0.7, 0.35);
  const along = (m: THREE.Material, r0: number, r1: number, y0: number, y1: number, seg = 40) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, y1 - y0, seg), m);
    c.position.y = -(y0 + y1) / 2;
    g.add(c);
    return c;
  };
  // the berthing ring and the pressurised carrier's end cone
  along(frame, 1.08, 1.12, 0, 0.12);
  along(white, 1.15, HTV_R, 0.12, 0.6);
  // the body: the pressurised and unpressurised carriers, the avionics and propulsion modules,
  // wrapped in cell panels between frame rings
  const sections = [0.6, 3.9, 6.4, 7.6, 9.2];
  for (let i = 0; i < sections.length - 1; i++) {
    along(cells, HTV_R, HTV_R, sections[i], sections[i + 1]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(HTV_R + 0.01, 0.04, 6, 48), frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -sections[i];
    g.add(ring);
  }
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 8.6, 0.02), frame);
    s.position.set(Math.sin(a) * (HTV_R + 0.01), -4.9, Math.cos(a) * (HTV_R + 0.01));
    g.add(s);
  }
  // the unpressurised carrier's open bay on one side
  const bay = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.0, 0.1), mat(0x30323a, 0.3, 0.6));
  bay.position.set(0, -5.1, HTV_R + 0.02);
  g.add(bay);
  // the aft bulkhead and the main thrusters (to the sourced 9.8 m)
  along(gold, HTV_R, HTV_R * 0.9, 9.2, 9.45);
  for (const [x, z] of [
    [0.6, 0.6],
    [-0.6, 0.6],
    [0.6, -0.6],
    [-0.6, -0.6],
  ]) {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 12, 1, true), frame);
    bell.position.set(x, -HTV_LEN + 0.17, z);
    g.add(bell);
  }
  return g;
}
