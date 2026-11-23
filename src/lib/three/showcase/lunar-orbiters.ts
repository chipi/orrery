/**
 * Showcase models: the lunar orbiters (Chandrayaan-1 and the Chandrayaan-2 orbiter, Chang'e 1 and
 * 2, Clementine, Kaguya, Luna 10, the five Lunar Orbiters, Lunar Prospector, SMART-1), built to
 * the bar of the Apollo LM: crinkled foil on every blanketed surface with tape seams, the real bus
 * shape, array layout, dish and instrument booms. Every craft stands with its main axis vertical,
 * arrays and booms deployed. Near-identical craft share a builder (Chang'e 1 and 2; the five Lunar
 * Orbiters).
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function pal() {
  return {
    gold: mat(0xd2a23a, 0.6, 0.35, true),
    goldDk: mat(0xa87a2c, 0.55, 0.42, true),
    silver: mat(0xc9ccd2, 0.6, 0.32, true),
    shell: mat(0xd9dce2, 0.85, 0.22),
    grey: mat(0x8f9298, 0.5, 0.5, true),
    black: mat(0x17181b, 0.5, 0.6, true),
    blackFoil: mat(0x26262b, 0.55, 0.5, true),
    dark: mat(0x2b2d31, 0.5, 0.6),
    white: mat(0xe6e4de, 0.2, 0.55),
    cream: mat(0xe8e0c6, 0.2, 0.55),
    metal: mat(0xaeb2b9, 0.6, 0.38),
    frame: mat(0xc2c5cb, 0.55, 0.4),
    tape: mat(0xe6cf8a, 0.3, 0.45),
    cell: mat(0x16234e, 0.55, 0.3),
    cellBlue: mat(0x1f3fa6, 0.55, 0.28),
    cellDark: mat(0x15192a, 0.5, 0.35),
    cellLine: mat(0xa9b4d0, 0.5, 0.4),
    cellGold: mat(0xc9a64a, 0.7, 0.35),
    copper: mat(0x8a4f2b, 0.45, 0.6),
    orange: mat(0xb0562a, 0.4, 0.6),
    dishW: Object.assign(mat(0xe3e4e6, 0.35, 0.42), { side: THREE.DoubleSide }),
    dishD: Object.assign(mat(0x2e2e33, 0.4, 0.5), { side: THREE.DoubleSide }),
    dishG: Object.assign(mat(0xd2a23a, 0.6, 0.35, true), { side: THREE.DoubleSide }),
    wire: mat(0xb4683a, 0.4, 0.5),
  };
}
type P = ReturnType<typeof pal>;

function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y0: number,
  z: number,
  seg = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y0 + h / 2, z);
  return add(g, mesh);
}

/** A cylinder along z (front toward +z) from z0 to z0 + h. */
function cylZ(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z0: number,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z0 + h / 2);
  return add(g, mesh);
}

function foilBox(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  amp: number,
  step = 0.2,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.BoxGeometry(
      w,
      h,
      d,
      Math.max(2, Math.round(w / step)),
      Math.max(2, Math.round(h / step)),
      Math.max(2, Math.round(d / step)),
    ),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

function foilCyl(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y0: number,
  z: number,
  seg: number,
  amp: number,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.CylinderGeometry(rt, rb, h, seg, Math.max(1, Math.round(h / 0.22))),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y0 + h / 2, z);
  return add(g, mesh);
}

/** A crinkled foil patch laid over a blanket; `ry` turns it to a side face. */
function patch(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
  amp = 0.008,
): THREE.Mesh {
  const mesh = foilSheet(m, w, h, amp);
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return add(g, mesh);
}

/** Tape seams: horizontal bands round a box body at the given heights, plus the four corner edges. */
function boxTape(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  cy: number,
  bands: number[],
): void {
  const t = 0.022;
  for (const y of bands) box(g, m, w + 0.016, t, d + 0.016, 0, cy - h / 2 + y, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) box(g, m, t, h, t, (sx * w) / 2, cy, (sz * d) / 2);
}

function solarPanel(
  parent: THREE.Object3D,
  P: P,
  w: number,
  h: number,
  cell: Mat,
  line: Mat,
  cols: number,
  rows: number,
  t = 0.035,
): THREE.Group {
  const g = add(parent, new THREE.Group());
  box(g, P.frame, w, h, t, 0, 0, 0);
  box(g, cell, w - 0.07, h - 0.07, t + 0.006, 0, 0, 0.001);
  for (let c = 1; c < cols; c++)
    box(g, line, 0.008, h - 0.07, t + 0.012, -w / 2 + 0.035 + ((w - 0.07) * c) / cols, 0, 0);
  for (let r = 1; r < rows; r++)
    box(g, line, w - 0.07, 0.008, t + 0.012, 0, -h / 2 + 0.035 + ((h - 0.07) * r) / rows, 0);
  return g;
}

/** Triangular lattice boom a → b: three longerons and zig-zag bracing. */
function lattice(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  rad: number,
  bays: number,
  r: number,
): void {
  const u = b.clone().sub(a);
  const L = u.length();
  u.normalize();
  const ref = Math.abs(u.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const n1 = new THREE.Vector3().crossVectors(u, ref).normalize();
  const n2 = new THREE.Vector3().crossVectors(u, n1).normalize();
  const ring = (t: number): THREE.Vector3[] =>
    [0, 1, 2].map((i) =>
      a
        .clone()
        .addScaledVector(u, t)
        .addScaledVector(n1, Math.cos((i * TAU) / 3) * rad)
        .addScaledVector(n2, Math.sin((i * TAU) / 3) * rad),
    );
  const r0 = ring(0);
  const r1 = ring(L);
  for (let i = 0; i < 3; i++) strut(g, m, r0[i], r1[i], r, 5);
  for (let k = 0; k <= bays; k++) {
    const p = ring((k * L) / bays);
    for (let i = 0; i < 3; i++) strut(g, m, p[i], p[(i + 1) % 3], r * 0.7, 4);
    if (k < bays) {
      const q = ring(((k + 1) * L) / bays);
      for (let i = 0; i < 3; i++) strut(g, m, p[i], q[(i + 1) % 3], r * 0.7, 4);
    }
  }
}

function placeDish(
  g: THREE.Object3D,
  d: THREE.Object3D,
  vertex: THREE.Vector3,
  axis: THREE.Vector3,
): void {
  d.position.copy(vertex);
  d.quaternion.setFromUnitVectors(V(0, 1, 0), axis.clone().normalize());
  g.add(d);
}

// ─── Chandrayaan-1 ───────────────────────────────────────────────────────────────────────────

function buildChandrayaan1(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const S = 1.5;
  const y0 = 0.14;
  const cy = y0 + S / 2;
  cyl(g, P.white, 0.46, 0.46, 0.1, 0, 0, 0, 32);
  cyl(g, P.dark, 0.1, 0.18, 0.26, 0, 0, 0, 14);
  foilBox(g, P.gold, S, S, S, 0, cy, 0, 0.022, 0.2);
  boxTape(g, P.tape, S, S, S, cy, [0.45, 0.95]);
  const top = y0 + S;
  const f = S / 2;
  // white radiator patches and the taped thermal covers on +z and -x
  patch(g, P.white, 0.62, 0.5, 0.28, cy + 0.16, f + 0.04);
  patch(g, P.white, 0.5, 0.36, -0.34, cy - 0.3, f + 0.04);
  patch(g, P.white, 0.5, 0.6, -f - 0.04, cy + 0.15, 0.1, -Math.PI / 2);
  box(g, P.tape, 0.64, 0.014, 0.018, 0.28, cy + 0.16, f + 0.052);
  box(g, P.tape, 0.014, 0.52, 0.018, 0.28, cy + 0.16, f + 0.052);
  // instrument apertures: gold-ringed black lenses
  for (const [x, y, r] of [
    [-0.45, cy + 0.38, 0.1],
    [-0.12, cy + 0.42, 0.075],
    [-0.4, cy + 0.02, 0.06],
  ] as const) {
    cylZ(g, P.goldDk, r * 1.35, r * 1.35, 0.05, x, y, f - 0.01, 20);
    cylZ(g, P.black, r, r, 0.06, x, y, f - 0.01, 20);
  }
  // top deck: star trackers, sensor boxes
  for (const sx of [-1, 1]) cyl(g, P.black, 0.07, 0.09, 0.16, sx * 0.45, top, f * 0.5, 14);
  box(g, P.metal, 0.3, 0.1, 0.25, 0.4, top + 0.05, -0.3);
  // 0.7 m S/X-band dish on a gold boom above the top deck
  strut(g, P.goldDk, V(-0.35, top, -0.1), V(-0.3, top + 0.28, 0.05), 0.04, 8);
  const hga = dish(P.dishG, P.black, 0.36);
  placeDish(g, hga, V(-0.3, top + 0.3, 0.05), V(0.05, 0.75, 0.65));
  // reaction jets at the lower corners
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const th = cyl(g, P.dark, 0.05, 0.02, 0.14, sx * 0.62, y0 - 0.02, sz * 0.62, 10);
      th.rotation.z = -sx * 0.5;
    }
  // the single solar panel, folded out on a two-bar yoke from the +x face
  const wing = add(g, new THREE.Group());
  wing.userData.solarArray = true;
  strut(wing, P.metal, V(f, cy + 0.5, 0.15), V(f + 0.3, cy + 0.5, 0.15), 0.03, 6);
  strut(wing, P.metal, V(f, cy - 0.5, 0.15), V(f + 0.3, cy - 0.5, 0.15), 0.03, 6);
  const pn = solarPanel(wing, P, 2.15, 1.8, P.cellDark, P.cellLine, 8, 6);
  pn.position.set(f + 0.3 + 1.075, cy, 0.15);
  return g;
}

// ─── Chandrayaan-2 orbiter ───────────────────────────────────────────────────────────────────

function buildChandrayaan2(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  cyl(g, P.orange, 0.52, 0.55, 0.34, 0, 0, 0, 36);
  cyl(g, P.metal, 0.58, 0.58, 0.05, 0, 0, 0, 36);
  const bw = 2.3;
  const bd = 2.1;
  const y0 = 0.34;
  const bh = 1.5;
  const cy = y0 + bh / 2;
  foilBox(g, P.gold, bw, bh, bd, 0, cy, 0, 0.03, 0.22);
  boxTape(g, P.tape, bw, bh, bd, cy, [0.5, 1.0]);
  const top = y0 + bh;
  // the central gold drum rising out of the top deck (the lander's seat)
  foilCyl(g, P.gold, 0.62, 0.62, 0.9, 0.1, top, -0.1, 28, 0.025);
  cyl(g, P.tape, 0.635, 0.635, 0.025, 0.1, top + 0.4, -0.1, 28);
  // white taped patches over radiators and the cut-outs they cover
  patch(g, P.white, 1.0, 1.05, 0.0, cy + 0.05, bd / 2 + 0.05);
  patch(g, P.white, 0.7, 0.5, -0.8, cy + 0.5, bd / 2 + 0.05);
  patch(g, P.white, 0.9, 0.85, bw / 2 + 0.05, cy + 0.2, -0.2, Math.PI / 2);
  box(g, P.tape, 1.02, 0.016, 0.022, 0, cy - 0.2, bd / 2 + 0.064);
  box(g, P.tape, 0.016, 1.07, 0.022, 0.3, cy + 0.05, bd / 2 + 0.064);
  // instrument cans and gold camera boxes on the corners
  foilBox(g, P.goldDk, 0.55, 0.35, 0.55, -0.95, top + 0.05, 0.5, 0.018, 0.15);
  foilCyl(g, P.gold, 0.2, 0.2, 0.75, -1.0, y0 - 0.1, 0.78, 16, 0.015);
  foilCyl(g, P.gold, 0.2, 0.2, 0.7, 1.0, y0 - 0.1, 0.78, 16, 0.015);
  for (const [x, z] of [
    [-1.0, 0.78],
    [1.0, 0.78],
    [-0.95, -0.7],
    [0.95, -0.7],
  ] as const) {
    cyl(g, P.white, 0.07, 0.1, 0.12, x, 0.04, z, 12);
    cyl(g, P.dark, 0.035, 0.07, 0.1, x, -0.06, z, 10);
  }
  // white-capped booms: magnetometer-style stubs and the star trackers
  strut(g, P.goldDk, V(bw / 2, cy + 0.3, 0.2), V(bw / 2 + 0.55, cy + 0.34, 0.2), 0.05, 8);
  cyl(g, P.white, 0.045, 0.045, 0.14, bw / 2 + 0.52, cy + 0.34, 0.2, 10).rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) cyl(g, P.white, 0.1, 0.13, 0.2, sx * 0.5, top, 0.72, 16);
  // S-band dish on a short boom off the +z face
  strut(g, P.metal, V(0.6, cy + 0.45, bd / 2), V(0.75, cy + 0.65, bd / 2 + 0.35), 0.03, 6);
  placeDish(g, dish(P.dishW, P.black, 0.45), V(0.75, cy + 0.65, bd / 2 + 0.35), V(0.2, 0.2, 0.95));
  // one solar wing of two panels on a yoke from the -x side
  const wing = add(g, new THREE.Group());
  wing.userData.solarArray = true;
  const yoke = V(-bw / 2, cy + 0.1, 0);
  strut(wing, P.metal, yoke, V(yoke.x - 0.45, yoke.y + 0.5, 0), 0.03, 6);
  strut(wing, P.metal, yoke, V(yoke.x - 0.45, yoke.y - 0.5, 0), 0.03, 6);
  for (let i = 0; i < 2; i++) {
    const pn = solarPanel(wing, P, 1.6, 1.9, P.cellDark, P.cellLine, 6, 7);
    pn.position.set(yoke.x - 0.45 - 0.8 - i * 1.64, yoke.y, 0);
  }
  return g;
}

// ─── Chang'e 1 and 2 (shared) ────────────────────────────────────────────────────────────────

function buildChange(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const bw = 2.0;
  const bh = 2.2;
  const bd = 1.72;
  const y0 = 0.34;
  const cy = y0 + bh / 2;
  const top = y0 + bh;
  // engine bell and the launch ring below the bus
  lathe(
    g,
    P.silver,
    [
      [0.12, 0],
      [0.2, 0.28],
      [0.26, 0.3],
      [0.1, 0.28],
    ],
    24,
  );
  cyl(g, P.metal, 0.4, 0.46, 0.06, 0, y0 - 0.06, 0, 28);
  foilBox(g, P.gold, bw, bh, bd, 0, cy, 0, 0.026, 0.22);
  boxTape(g, P.tape, bw, bh, bd, cy, [0.7, 1.45]);
  // inset silver panels and radiator patches with tape borders
  patch(g, P.white, 0.8, 0.6, -0.4, cy - 0.45, bd / 2 + 0.05);
  patch(g, P.silver, 0.5, 0.5, 0.55, cy - 0.5, bd / 2 + 0.05);
  patch(g, P.white, 0.8, 0.8, -bw / 2 - 0.05, cy + 0.2, 0, -Math.PI / 2);
  box(g, P.tape, 0.82, 0.016, 0.02, -0.4, cy - 0.15, bd / 2 + 0.064);
  // two small white relay dishes and the star trackers on the +z face
  for (const x of [-0.55, -0.1]) {
    placeDish(g, dish(P.dishW, P.black, 0.15), V(x, cy + 0.65, bd / 2 + 0.02), V(0, 0.15, 1));
  }
  for (const sx of [-1, 1]) cylZ(g, P.black, 0.06, 0.1, 0.18, sx * 0.55, cy + 0.2, bd / 2, 14);
  // the 0.8 m steerable high-gain dish on an arm from the +x top corner
  strut(g, P.metal, V(0.5, top - 0.1, 0.5), V(0.62, top + 0.2, bd / 2 + 0.28), 0.03, 6);
  placeDish(g, dish(P.dishW, P.metal, 0.4), V(0.62, top + 0.2, bd / 2 + 0.28), V(0.2, 0.3, 0.9));
  // top deck: low-gain dome in a louvred well, omni whip on a mast, jets
  cyl(g, P.dark, 0.5, 0.5, 0.05, -0.2, top - 0.02, -0.1, 28);
  lathe(
    g,
    P.silver,
    [
      [0, 0],
      [0.3, 0.08],
      [0.46, 0.0],
    ],
    28,
  ).position.set(-0.2, top + 0.02, -0.1);
  strut(g, P.metal, V(-0.2, top, -0.1), V(-0.2, top + 0.95, -0.1), 0.025, 6);
  cyl(g, P.white, 0.1, 0.02, 0.07, -0.2, top + 0.93, -0.1, 14);
  box(g, P.gold, 0.35, 0.18, 0.3, 0.65, top + 0.09, -0.4);
  cyl(g, P.black, 0.07, 0.07, 0.2, 0.2, top, -0.55, 10);
  // three thrusters on the +x face
  for (let i = 0; i < 3; i++) {
    const th = cyl(g, P.black, 0.045, 0.08, 0.22, bw / 2 + 0.07, cy + 0.3 - i * 0.2, 0.45, 12);
    th.rotation.z = -Math.PI / 2;
  }
  // two wings of three panels on gold yokes from ±x
  for (const side of [1, -1]) {
    const wing = add(g, new THREE.Group());
    wing.userData.solarArray = true;
    const x0 = (side * bw) / 2;
    const root = V(x0 + side * 0.5, cy + 0.05, 0);
    strut(wing, P.goldDk, V(x0, cy + 0.7, 0), V(root.x, root.y + 0.85, 0), 0.025, 6);
    strut(wing, P.goldDk, V(x0, cy - 0.5, 0), V(root.x, root.y - 0.85, 0), 0.025, 6);
    strut(wing, P.goldDk, V(root.x, root.y - 0.85, 0), V(root.x, root.y + 0.85, 0), 0.025, 6);
    for (let i = 0; i < 3; i++) {
      const pn = solarPanel(wing, P, 2.45, 1.72, P.cell, P.cellLine, 8, 6);
      pn.position.set(root.x + side * (1.23 + i * 2.5), root.y, 0);
    }
  }
  return g;
}

// ─── Clementine ──────────────────────────────────────────────────────────────────────────────

function buildClementine(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const flat = 1.14;
  const R = flat / 2 / Math.cos(Math.PI / 8);
  const H = 1.88;
  const y0 = 0.3;
  const cy = y0 + H / 2;
  const geo = crinkle(new THREE.CylinderGeometry(R, R, H, 8, 8), 0.014);
  const body = new THREE.Mesh(geo, P.gold);
  body.rotation.y = Math.PI / 8;
  body.position.y = cy;
  g.add(body);
  for (const y of [0.4, 0.95, 1.5]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.022, 8), P.tape);
    ring.rotation.y = Math.PI / 8;
    ring.position.y = y0 + y;
    g.add(ring);
  }
  // deck plates top and bottom
  for (const y of [y0, y0 + H]) {
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R * 0.98, 0.05, 8), P.grey);
    pl.rotation.y = Math.PI / 8;
    pl.position.y = y;
    g.add(pl);
  }
  const f = flat / 2;
  // the sensor face (+z): pale cover panel, the camera and lidar apertures
  box(g, P.white, 0.62, 1.1, 0.02, 0, cy + 0.2, f + 0.01);
  box(g, P.tape, 0.64, 0.02, 0.025, 0, cy + 0.75, f + 0.012);
  box(g, P.tape, 0.64, 0.02, 0.025, 0, cy - 0.35, f + 0.012);
  for (const [x, y, r] of [
    [-0.13, 0.42, 0.11],
    [0.13, 0.42, 0.11],
    [-0.12, 0.1, 0.07],
    [0.14, 0.08, 0.05],
    [0, -0.12, 0.06],
  ] as const) {
    cylZ(g, P.metal, r * 1.3, r * 1.3, 0.04, x, cy + y, f, 20);
    cylZ(g, P.black, r, r, 0.07, x, cy + y, f, 20);
  }
  // 12 attitude jets at the top and bottom corners
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    const x = Math.sin(a) * R * 0.98;
    const z = Math.cos(a) * R * 0.98;
    for (const y of [y0 + 0.06, y0 + H - 0.06]) {
      const th = cyl(g, P.black, 0.025, 0.04, 0.1, x, y - 0.05, z, 8);
      th.lookAt(V(x * 2, th.position.y, z * 2));
      th.rotateX(Math.PI / 2);
    }
  }
  // star trackers on the top deck
  for (const sx of [-1, 1]) cyl(g, P.black, 0.07, 0.09, 0.16, sx * 0.28, y0 + H, -0.3, 14);
  // bottom: the 1.07 m high-gain dish, opening downward
  const hga = dish(P.dishW, P.metal, 0.535);
  hga.rotation.x = Math.PI;
  hga.position.set(0, y0 - 0.02, 0);
  hga.scale.y = 0.8;
  g.add(hga);
  strut(g, P.metal, V(0, y0, 0), V(0, y0 - 0.12, 0), 0.04, 8);
  // top: the 489 N engine nozzle
  lathe(
    g,
    P.black,
    [
      [0.06, 0],
      [0.1, 0.12],
      [0.2, 0.46],
      [0.19, 0.46],
      [0.05, 0.1],
    ],
    24,
  ).position.y = y0 + H + 0.03;
  // two wings of two gimballed panels, long axis parallel to the prism, tan frames
  for (const side of [1, -1]) {
    const wing = add(g, new THREE.Group());
    wing.userData.solarArray = true;
    const x0 = side * (R * Math.cos(Math.PI / 8));
    box(wing, P.black, 0.42, 0.2, 0.2, x0 + side * 0.2, cy + 0.2, 0);
    for (let i = 0; i < 2; i++) {
      const pn = solarPanel(wing, P, 0.86, 1.85, P.cellBlue, P.cellGold, 6, 13, 0.03);
      pn.position.set(x0 + side * (0.62 + 0.44 + i * 0.9), cy + 0.2, 0);
      for (const fr of pn.children.slice(0, 1)) (fr as THREE.Mesh).material = P.cellGold;
    }
  }
  return g;
}

// ─── Kaguya (SELENE) ─────────────────────────────────────────────────────────────────────────

function buildKaguya(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const w = 2.1;
  const y0 = 0.35;
  const H = 2.4;
  const cy = y0 + H / 2;
  const top = y0 + H;
  for (const [x, z] of [
    [-0.7, 0.7],
    [0.7, 0.7],
    [0, -0.8],
  ] as const) {
    cyl(g, P.grey, 0.05, 0.05, y0, x, 0, z, 10);
    cyl(g, P.metal, 0.12, 0.12, 0.03, x, 0, z, 12);
  }
  foilBox(g, P.blackFoil, w, H, w, 0, cy, 0, 0.022, 0.22);
  boxTape(g, P.tape, w, H, w, cy, [0.8, 1.6]);
  box(g, P.gold, w + 0.04, 0.1, w + 0.04, 0, y0 + 0.05, 0);
  box(g, P.gold, w + 0.04, 0.1, w + 0.04, 0, top, 0);
  // top deck: star trackers and instrument boxes
  for (const sx of [-1, 1]) cyl(g, P.black, 0.09, 0.11, 0.2, sx * 0.6, top, -0.5, 14);
  foilBox(g, P.goldDk, 0.5, 0.25, 0.4, 0.55, top + 0.12, 0.5, 0.015, 0.15);
  // the relay and VLBI sub-satellites: octagonal drums on the +z face
  for (const sx of [-1, 1]) {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.55, 8);
    const oct = new THREE.Mesh(geo, P.silver);
    oct.rotation.x = Math.PI / 2;
    oct.rotation.y = Math.PI / 8;
    oct.position.set(sx * 0.55, y0 + 0.56, w / 2 + 0.28);
    g.add(oct);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.02, 8), P.cellDark);
    face.rotation.x = Math.PI / 2;
    face.rotation.y = Math.PI / 8;
    face.position.set(sx * 0.55, y0 + 0.56, w / 2 + 0.565);
    g.add(face);
    for (let k = 0; k < 4; k++) {
      const arm = box(g, P.metal, 0.9, 0.025, 0.02, sx * 0.55, y0 + 0.56, w / 2 + 0.58);
      arm.rotation.z = (k * Math.PI) / 4;
    }
  }
  // the 12 m class radar-sounder / magnetometer mast stub and the two wire antennas
  strut(g, P.metal, V(0.55, y0 + 0.95, w / 2 + 0.05), V(1.35, y0 + 0.45, w / 2 + 1.1), 0.065, 12);
  for (const [a, b] of [
    [V(-w / 2, 1.5, 0.7), V(-w / 2 - 4.2, 0.9, 2.6)],
    [V(w / 2, 1.2, -0.9), V(w / 2 + 3.8, 1.8, -2.8)],
  ]) {
    strut(g, P.wire, a, b, 0.008, 4);
  }
  // high-gain dish on a tripod and mast
  const apex = V(0, top + 0.55, 0);
  for (const [x, z] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0, 0.6],
  ] as const)
    strut(g, P.black, V(x, top, z), apex, 0.03, 6);
  strut(g, P.black, apex, V(0, 4.46, 0), 0.04, 8);
  placeDish(g, dish(P.dishD, P.black, 0.62), V(0, 4.45, 0), V(0, 1, 0.12));
  // the solar paddle: gold truss out to three blue panels on the +x side
  const wing = add(g, new THREE.Group());
  wing.userData.solarArray = true;
  const gx = w / 2;
  const px = gx + 1.15;
  strut(wing, P.cellGold, V(gx, cy - 0.5, 0), V(px, 0.35, 0), 0.03, 6);
  strut(wing, P.cellGold, V(gx, cy + 0.5, 0), V(px, 2.85, 0), 0.03, 6);
  strut(wing, P.cellGold, V(gx, cy, 0), V(px, 1.6, 0), 0.03, 6);
  strut(wing, P.cellGold, V(px, 0.35, 0), V(px, 2.85, 0), 0.03, 6);
  strut(wing, P.cellGold, V(gx, cy - 0.5, 0), V(gx, cy + 0.5, 0), 0.03, 6);
  for (let i = 0; i < 3; i++) {
    const pn = solarPanel(wing, P, 1.18, 2.5, P.cellBlue, P.cellLine, 6, 12);
    pn.position.set(px + 0.59 + i * 1.2, 1.6, 0);
  }
  return g;
}

// ─── Luna 10 ─────────────────────────────────────────────────────────────────────────────────

function buildLuna10(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  // the braking-engine module: a white lattice skirt round the engine bell
  const r0 = 0.3;
  const r1 = 0.66;
  const hs = 1.0;
  lathe(
    g,
    P.cream,
    [
      [r0, 0],
      [r0 + 0.02, 0.04],
      [r1, hs],
      [r1 - 0.03, hs],
      [r0 - 0.03, 0.04],
    ],
    32,
  );
  const tilt = Math.atan2(r1 - r0, hs);
  for (let row = 0; row < 2; row++)
    for (let j = 0; j < 12; j++) {
      const a = (j * TAU) / 12 + row * 0.26;
      const t = 0.3 + row * 0.38;
      const r = r0 + (r1 - r0) * t;
      const wrap = add(g, new THREE.Group());
      wrap.rotation.y = a;
      const win = box(wrap, P.dark, 0.2, 0.24, 0.02, 0, hs * t, r + 0.012);
      win.rotation.x = tilt;
    }
  cyl(g, P.dark, 0.34, 0.34, 0.07, 0, 0, 0, 32);
  lathe(
    g,
    P.silver,
    [
      [0.09, 0.0],
      [0.16, 0.34],
      [0.2, 0.7],
    ],
    20,
  );
  cyl(g, P.metal, r1 + 0.03, r1 + 0.03, 0.08, 0, hs, 0, 36);
  cyl(g, P.dark, r1, r1, 0.06, 0, hs + 0.08, 0, 36);
  // propellant tanks (cream boxes with rounded ends) and pipework
  for (const [sx, sz] of [
    [0.38, 0.12],
    [-0.36, -0.2],
  ] as const) {
    const t = foilBox(g, P.cream, 0.55, 0.62, 0.46, sx, hs + 0.46, sz, 0.008, 0.2);
    t.rotation.y = sx > 0 ? 0.2 : -0.3;
    cylZ(g, P.metal, 0.1, 0.1, 0.2, sx, hs + 0.46, sz + 0.2, 14);
  }
  foilBox(g, P.cream, 0.5, 0.4, 0.42, 0.05, hs + 0.28, 0.45, 0.008, 0.2);
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6;
    strut(
      g,
      P.metal,
      V(Math.cos(a) * 0.55, hs + 0.1, Math.sin(a) * 0.55),
      V(Math.cos(a + 0.5) * 0.22, hs + 0.75, Math.sin(a + 0.5) * 0.22),
      0.016,
      6,
    );
  }
  // the instrument capsule: a polished pressurised drum on a lower ring
  const cap = 1.62;
  lathe(
    g,
    P.shell,
    [
      [0.3, cap],
      [0.4, cap + 0.1],
      [0.46, cap + 0.3],
      [0.46, cap + 0.9],
      [0.4, cap + 1.15],
      [0.22, cap + 1.3],
      [0.0, cap + 1.33],
    ],
    40,
  );
  for (const y of [cap + 0.35, cap + 0.82]) cyl(g, P.metal, 0.475, 0.475, 0.04, 0, y, 0, 40);
  for (let k = 0; k < 16; k++) {
    const a = (k * TAU) / 16;
    box(g, P.metal, 0.03, 0.06, 0.03, Math.cos(a) * 0.477, cap + 0.36, Math.sin(a) * 0.477);
  }
  // four whip antennas, two mushroom magnetometer / plasma sensors on stalks, a gas-jet ring
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + Math.PI / 4;
    strut(
      g,
      P.metal,
      V(Math.cos(a) * 0.4, cap + 1.12, Math.sin(a) * 0.4),
      V(Math.cos(a) * 1.6, cap + 0.55, Math.sin(a) * 1.6),
      0.01,
      4,
    );
  }
  for (const [a, y] of [
    [0.4, cap + 0.7],
    [3.4, cap + 0.55],
  ] as const) {
    const px = Math.cos(a) * 0.46;
    const pz = Math.sin(a) * 0.46;
    strut(g, P.metal, V(px, y, pz), V(px * 1.55, y + 0.18, pz * 1.55), 0.014, 5);
    lathe(
      g,
      P.shell,
      [
        [0, 0],
        [0.07, 0.01],
        [0.09, 0.05],
        [0, 0.05],
      ],
      14,
    ).position.set(px * 1.55, y + 0.18, pz * 1.55);
  }
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + 0.3;
    const x = Math.cos(a) * 0.62;
    const z = Math.sin(a) * 0.62;
    const nz = cyl(g, P.dark, 0.04, 0.06, 0.12, x, hs - 0.1, z, 10);
    nz.rotation.z = -Math.cos(a) * 0.5;
    nz.rotation.x = Math.sin(a) * 0.5;
  }
  cyl(g, P.metal, 0.02, 0.02, 0.35, 0, cap + 1.3, 0, 6);
  cyl(g, P.black, 0.05, 0.05, 0.05, 0, cap + 1.63, 0, 10);
  return g;
}

// ─── Lunar Orbiter 1 – 5 (shared) ────────────────────────────────────────────────────────────

function buildLunarOrbiter(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  // equipment deck ring and the bright thermal shell round the camera system
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 40), P.white);
  deck.position.y = 0.03;
  g.add(deck);
  foilCyl(g, P.shell, 0.52, 0.7, 0.52, 0, 0.06, 0, 32, 0.008);
  cyl(g, P.black, 0.5, 0.52, 0.04, 0, 0.58, 0, 32);
  // camera: 80 mm and 610 mm lenses on the +z side
  cylZ(g, P.black, 0.085, 0.085, 0.14, -0.15, 0.32, 0.5, 20);
  cylZ(g, P.metal, 0.1, 0.1, 0.03, -0.15, 0.32, 0.6, 20);
  cylZ(g, P.black, 0.065, 0.065, 0.12, 0.08, 0.34, 0.5, 20);
  box(g, P.metal, 0.36, 0.22, 0.04, 0.35, 0.33, 0.58);
  // truss legs up to the tank ring
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + Math.PI / 4;
    strut(
      g,
      P.dark,
      V(Math.cos(a) * 0.62, 0.58, Math.sin(a) * 0.62),
      V(Math.cos(a) * 0.46, 1.38, Math.sin(a) * 0.46),
      0.025,
      8,
    );
  }
  for (const [y, r] of [
    [0.78, 0.56],
    [1.36, 0.47],
  ] as const) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 40), P.metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  // four propellant and pressurant tanks in a cluster
  for (let k = 0; k < 4; k++) {
    const a = (k * TAU) / 4 + Math.PI / 4;
    const x = Math.cos(a) * 0.28;
    const z = Math.sin(a) * 0.28;
    foilCyl(g, P.blackFoil, 0.19, 0.19, 0.5, x, 0.82, z, 14, 0.012);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 8, 0, TAU, 0, Math.PI / 2),
      P.blackFoil,
    );
    cap.position.set(x, 1.32, z);
    g.add(cap);
    const base = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 14, 8, 0, TAU, Math.PI / 2, Math.PI / 2),
      P.blackFoil,
    );
    base.position.set(x, 0.82, z);
    g.add(base);
  }
  // heat shield plate and the velocity-control engine on top
  const sh = box(g, P.shell, 0.95, 0.03, 0.95, 0, 1.5, 0);
  sh.rotation.y = 0.2;
  cyl(g, P.dark, 0.1, 0.11, 0.04, 0, 1.52, 0, 14);
  lathe(
    g,
    P.gold,
    [
      [0.03, 0],
      [0.07, 0.04],
      [0.1, 0.13],
      [0.09, 0.13],
      [0.02, 0.03],
    ],
    14,
  ).position.y = 1.52;
  // four solar panels on the deck, tips 3.72 m across diagonally
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const wing = add(g, new THREE.Group());
    wing.userData.solarArray = true;
    wing.rotation.y = -a + Math.PI / 2;
    const pn = solarPanel(wing, P, 0.82, 1.15, P.cellDark, P.metal, 3, 4, 0.03);
    pn.rotation.x = -Math.PI / 2;
    pn.position.set(0, 0.2, 1.3);
    strut(wing, P.metal, V(0.2, 0.1, 0.65), V(0.2, 0.2, 0.8), 0.015, 5);
    strut(wing, P.metal, V(-0.2, 0.1, 0.65), V(-0.2, 0.2, 0.8), 0.015, 5);
  }
  // 1 m high-gain dish on its 1.32 m boom, 2.08 m low-gain boom with its two discs
  strut(g, P.shell, V(-0.55, 0.45, 0), V(-1.85, 0.62, 0), 0.03, 8);
  placeDish(g, dish(P.dishW, P.metal, 0.5), V(-1.85, 0.62, 0), V(-0.15, 0.25, 1));
  strut(g, P.black, V(0.55, 0.42, 0.05), V(2.6, 0.18, 0.05), 0.025, 8);
  for (const x of [2.5, 2.62]) cyl(g, P.dark, 0.1, 0.1, 0.02, x, 0.12, 0.05, 16);
  return g;
}

// ─── Lunar Prospector ────────────────────────────────────────────────────────────────────────

function buildLunarProspector(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const R = 0.68;
  const H = 1.28;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), P.cellBlue);
  drum.position.y = H / 2;
  g.add(drum);
  for (let k = 0; k < 48; k++) {
    const a = (k * TAU) / 48;
    box(
      g,
      P.cellLine,
      0.006,
      H,
      0.006,
      Math.cos(a) * (R + 0.002),
      H / 2,
      Math.sin(a) * (R + 0.002),
    );
  }
  for (const y of [0.08, 0.32, 0.64, 0.96, 1.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.002, 0.005, 4, 64), P.cellLine);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 8, 48), P.frame);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = H;
  g.add(rim);
  const rim2 = rim.clone();
  rim2.position.y = 0;
  g.add(rim2);
  cyl(g, P.dark, R - 0.02, R - 0.02, 0.02, 0, 0.98, 0, 40);
  cyl(g, P.dark, R - 0.02, R - 0.02, 0.02, 0, 0, 0, 40);
  // the white nose cone rising out of the open top, with its dark base band
  lathe(
    g,
    P.white,
    [
      [0.2, 0.75],
      [0.19, 1.1],
      [0.12, 1.65],
      [0.03, 2.1],
      [0.0, 2.12],
    ],
    28,
  );
  cyl(g, P.dark, 0.205, 0.205, 0.1, 0, 0.9, 0, 28);
  cyl(g, P.gold, 0.28, 0.28, 0.07, 0, 0.98, 0, 20);
  for (const a of [0.5, 2.6, 4.7]) {
    box(g, P.gold, 0.14, 0.12, 0.14, Math.cos(a) * 0.4, 1.06, Math.sin(a) * 0.4);
  }
  // three 2.5 m lattice booms, each with its instruments at the tip
  const base = 0.64;
  for (let k = 0; k < 3; k++) {
    const a = Math.PI / 2 + (k * TAU) / 3;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const from = V(dx * R, base, dz * R);
    const to = V(dx * (R + 2.5), base, dz * (R + 2.5));
    lattice(g, P.orange, from, to, 0.08, 12, 0.012);
    box(g, P.gold, 0.16, 0.2, 0.16, dx * (R + 0.05), base, dz * (R + 0.05));
    if (k === 0) {
      box(g, P.gold, 0.4, 0.3, 0.3, to.x + dx * 0.15, base, to.z + dz * 0.15);
      cyl(g, P.white, 0.04, 0.04, 0.25, to.x + dx * 0.15, base + 0.15, to.z + dz * 0.15, 10);
      const ext = to.clone().addScaledVector(V(dx, 0, dz), 0.3);
      strut(g, P.metal, ext, ext.clone().addScaledVector(V(dx, 0, dz), 1.1), 0.014, 6);
      box(g, P.goldDk, 0.1, 0.1, 0.1, ext.x + dx * 1.15, base, ext.z + dz * 1.15);
    } else if (k === 1) {
      const c = cyl(
        g,
        P.white,
        0.1,
        0.1,
        0.55,
        to.x + dx * 0.15,
        base - 0.27,
        to.z + dz * 0.15,
        16,
      );
      c.rotation.x = 0;
      box(g, P.gold, 0.2, 0.2, 0.2, to.x + dx * 0.1, base + 0.2, to.z + dz * 0.1);
    } else {
      box(g, P.gold, 0.3, 0.25, 0.3, to.x + dx * 0.15, base, to.z + dz * 0.15);
      cyl(g, P.cream, 0.08, 0.08, 0.3, to.x + dx * 0.15, base - 0.45, to.z + dz * 0.15, 12);
    }
  }
  return g;
}

// ─── SMART-1 ─────────────────────────────────────────────────────────────────────────────────

function buildSmart1(): THREE.Group {
  const P = pal();
  const g = new THREE.Group();
  const w = 1.0;
  const H = 0.95;
  const y0 = 0.12;
  const cy = y0 + H / 2;
  const top = y0 + H;
  cyl(g, P.metal, 0.4, 0.42, 0.1, 0, 0, 0, 32);
  foilBox(g, P.silver, w, H, w, 0, cy, 0, 0.014, 0.2);
  foilBox(g, P.gold, w + 0.01, 0.07, w + 0.01, 0, top - 0.035, 0, 0.01, 0.2);
  boxTape(g, P.tape, w, H, w, cy, [0.4, 0.7]);
  // +z face: the instrument ring with the camera, the X-ray and infrared units
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 36), P.white);
  ring.position.set(0, cy - 0.05, w / 2 + 0.005);
  g.add(ring);
  cylZ(g, P.dark, 0.28, 0.28, 0.012, 0, cy - 0.05, w / 2, 32);
  cylZ(g, P.black, 0.07, 0.09, 0.14, -0.1, cy + 0.05, w / 2, 18);
  box(g, P.metal, 0.2, 0.14, 0.12, 0.12, cy - 0.12, w / 2 + 0.06);
  cylZ(g, P.dark, 0.04, 0.05, 0.09, 0.14, cy + 0.12, w / 2, 12);
  box(g, P.white, 0.36, 0.28, 0.014, -0.25, cy - 0.28, w / 2 + 0.007);
  // the PPS-1350 ion thruster on the -z side, its gimbal arm and exit ring
  box(g, P.metal, 0.14, 0.14, 0.2, 0, cy - 0.1, -w / 2 - 0.1);
  cylZ(g, P.metal, 0.14, 0.14, 0.18, 0, cy - 0.1, -w / 2 - 0.3, 24);
  cylZ(g, P.black, 0.09, 0.09, 0.02, 0, cy - 0.1, -w / 2 - 0.49, 20);
  // top: a 0.3 m high-gain dish on a stub, two whips
  strut(g, P.metal, V(0.2, top, -0.15), V(0.2, top + 0.14, -0.15), 0.025, 8);
  placeDish(g, dish(P.dishW, P.metal, 0.16), V(0.2, top + 0.14, -0.15), V(0.15, 1, 0.5));
  strut(g, P.metal, V(-0.3, top, 0.2), V(-0.38, top + 0.45, 0.22), 0.008, 4);
  box(g, P.black, 0.1, 0.08, 0.1, -0.3, top + 0.04, -0.3);
  // two wings of three panels on short yokes (x), panel face toward +z
  for (const side of [1, -1]) {
    const wing = add(g, new THREE.Group());
    wing.userData.solarArray = true;
    const x0 = (side * w) / 2;
    strut(wing, P.metal, V(x0, cy, 0), V(x0 + side * 0.42, cy, 0), 0.035, 8);
    for (let i = 0; i < 3; i++) {
      const pn = solarPanel(wing, P, 1.62, 1.04, P.cellBlue, P.cellLine, 5, 4);
      pn.position.set(x0 + side * (0.42 + 0.82 + i * 1.65), cy, 0);
    }
  }
  return g;
}

// ─── Registry ────────────────────────────────────────────────────────────────────────────────

const REF = (l: string, u: string): ShowcaseRef => ({ l, u });
const WP = (page: string, what: string): ShowcaseRef =>
  REF(
    `Wikipedia, ${page.replace(/_/g, ' ')}: ${what}`,
    `https://en.wikipedia.org/wiki/${encodeURI(page)}`,
  );
const WC = (file: string, what: string): ShowcaseRef =>
  REF(
    `Wikimedia Commons, ${file.replace(/_/g, ' ')}: ${what}`,
    `https://commons.wikimedia.org/wiki/File:${encodeURI(file)}`,
  );

function make(
  fn: () => THREE.Group,
  heightM: number,
  heightEstimate: string | undefined,
  diameterM: number,
  refs: ShowcaseRef[],
): ShowcaseModel {
  const m: ShowcaseModel = { build: () => finish(fn(), heightM), heightM, diameterM, refs };
  if (heightEstimate) m.heightEstimate = heightEstimate;
  return m;
}

const CHANGE_REFS = [
  WP(
    "Chang'e_1",
    'DFH-3A bus, two three-panel wings, steerable dish (shape; no dimensions published there)',
  ),
  WC(
    "Chang'e-1_mockup_at_BASM.jpg",
    'museum mock-up: gold cube, two three-panel wings, dishes on the faces',
  ),
  WC('Chang_e_1.jpg', 'CAD view: dome and mast on top, thrusters on a side, engine bell below'),
];

const LUNAR_ORBITER_REFS = [
  WP(
    'Lunar_Orbiter_program',
    'truncated-cone bus 1.65 m tall and 1.5 m across the base; four panels 3.72 m across; 1 m high-gain dish on a 1.32 m boom, low-gain antenna on a 2.08 m boom',
  ),
  WC(
    'Lunar_Orbiter_Spacecraft.jpg',
    'engineering mock-up: shell, tank cluster, four panels, both booms',
  ),
];
const LUNAR_ORBITER_EST =
  'The fleet entry has no height; Wikipedia gives the bus as 1.65 m tall (heat shield and engine nozzle on top); the booms and panels lie out to the sides, so the drawn height is the bus';

const lunarOrbiter = (): ShowcaseModel =>
  make(buildLunarOrbiter, 1.65, LUNAR_ORBITER_EST, 1.5, LUNAR_ORBITER_REFS);
const change = (): ShowcaseModel =>
  make(
    buildChange,
    3.3,
    'The fleet entry has no height; no source gives one. Judged as a ~2.2 m bus on its thrust axis plus the engine bell below and the omni mast above, scaled by eye from the museum mock-up photo',
    2.0,
    CHANGE_REFS,
  );

export const SHOWCASE: Record<string, ShowcaseModel> = {
  chandrayaan1: make(
    buildChandrayaan1,
    2.05,
    'The fleet entry has no height; Wikipedia gives the bus as a cuboid of about 1.5 m. Drawn with the launch ring below and the 0.7 m dish above, scaled from the clean-room photo',
    1.5,
    [
      WP('Chandrayaan-1', 'cuboid of about 1.5 m, single solar panel, high-gain dish'),
      WC(
        'Chandrayaan-1-01.jpg',
        'ISRO clean-room photo: gold foil cube, white patches, dish, panel',
      ),
    ],
  ),
  chandrayaan2: make(
    buildChandrayaan2,
    2.35,
    'The fleet entry has no height and no source dimensions were found. Judged from the integration-hall photo: a gold box on its separation ring with the lander drum on top, about 2.3 m wide',
    2.3,
    [
      WP(
        'Chandrayaan-2',
        'orbiter: 2379 kg, eight instruments, one solar wing, 100 km polar orbit',
      ),
      WC(
        'GSLV_Mk_III_M1,_Chandrayaan-2_-_Orbiter_at_SDSC_SHAR_01.jpg',
        'ISRO photo: gold foil box, white taped patches, gold drum, cans and jets, orange ring',
      ),
    ],
  ),
  change1: change(),
  'change-2': change(),
  clementine: make(
    buildClementine,
    2.65,
    'The fleet entry has no height. The prism is 1.88 m high and 1.14 m across (LLNL, via Wikipedia); the 1.07 m dish below it and the nozzle above it are added by eye from the render',
    1.2,
    [
      WP(
        'Clementine_(spacecraft)',
        'octagonal prism 1.88 m high and 1.14 m across, 42-inch dish at one end, 489 N thruster at the other, two wings, sensors on one face',
      ),
      WC(
        'Clementine_spacecraft_model.png',
        'render: sensor face, two two-panel wings, nozzle, dish',
      ),
    ],
  ),
  kaguya: make(buildKaguya, 4.8, undefined, 2.1, [
    WP(
      'SELENE',
      'main orbiter with two sub-satellites (Okina, Ouna) on its side, one solar paddle',
    ),
    WC(
      '月周回衛星「かぐや（SELENE)」の模型.JPG',
      '1/10 model: black bus, octagonal sub-satellites, mast dish, gold truss and three-panel paddle',
    ),
  ]),
  luna10: make(
    buildLuna10,
    3.0,
    'The fleet entry has no height; no source gives one. Judged from the Le Bourget museum model: engine-module skirt, tanks and the capsule at about 0.9 m across, about 3 m overall',
    1.32,
    [
      WP(
        'Luna_10',
        'first lunar orbiter; instrument capsule with magnetometer, gamma-ray spectrometer and counters',
      ),
      WC(
        'Luna_10_Musee_du_Bourget_P1010504.JPG',
        'museum model: lattice skirt, cream tanks, polished capsule, whips, mushroom sensors',
      ),
    ],
  ),
  'lunar-orbiter-1': lunarOrbiter(),
  'lunar-orbiter-2': lunarOrbiter(),
  'lunar-orbiter-3': lunarOrbiter(),
  'lunar-orbiter-4': lunarOrbiter(),
  'lunar-orbiter-5': lunarOrbiter(),
  'lunar-prospector': make(
    buildLunarProspector,
    2.12,
    'The fleet entry has no height. The drum is 1.28 m high and 1.36 m across (Wikipedia); the nose cone above it is scaled from the NASA illustration',
    1.36,
    [
      WP(
        'Lunar_Prospector',
        'graphite-epoxy drum 1.36 m across and 1.28 m high, three radial 2.5 m booms, 1.1 m magnetometer extension',
      ),
      WC(
        'Lunar_Prospector_orbiter.jpg',
        'NASA illustration: cell-covered drum, lattice booms, instruments, nose cone',
      ),
    ],
  ),
  'smart-1': make(
    buildSmart1,
    1.25,
    'The fleet entry has no height; Wikipedia says the craft was about one metre across. The 1 m bus, the launch ring below and the 0.3 m dish stub above are drawn to that',
    1.0,
    [
      WP('SMART-1', 'about 1 m across, 367 kg, solar-electric ion drive, two solar wings'),
      WC(
        "Artist's_impression_of_the_SMART-1_mission_ESA199399.jpg",
        'ESA artist impression: cube bus, gold top, three-panel wings',
      ),
    ],
  ),
};
