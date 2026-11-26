/**
 * Showcase models: the deep-space and outer-planet craft — Voyager 1 and 2 (one builder), Pioneer
 * 10 and 11 (one builder), Juno, Juice, Dawn, Ulysses and New Horizons — drawn at real length, booms and wings
 * deployed as in the NASA/ESA renders. Crinkled foil on every blanketed body, truss booms made of
 * real longerons and diagonals, solar cells as seamed strips.
 *
 * Axis convention: y up along the dish / spin axis, the craft standing on its launch adapter end,
 * the booms and wings spread in the horizontal plane, the science side toward +z.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

function pal(): Record<string, Mat> {
  return {
    gold: mat(0xd2a23a, 0.55, 0.38, true),
    amber: mat(0xa8692a, 0.5, 0.45, true),
    silver: mat(0xc9ccd2, 0.55, 0.35, true),
    grey: mat(0x8f9298, 0.5, 0.5, true),
    black: mat(0x17181b, 0.5, 0.6, true),
    kapton: mat(0x2a2218, 0.45, 0.55, true),
    dark: mat(0x2b2d31, 0.5, 0.6),
    white: mat(0xe6e4de, 0.5, 0.5),
    metal: mat(0xaeb2b9, 0.55, 0.4),
    titanium: mat(0x9a9da3, 0.7, 0.35, true),
    rtg: mat(0x3b3c40, 0.6, 0.45),
    wire: mat(0xb9b4a0, 0.5, 0.5),
    cellJuno: mat(0x3a2023, 0.5, 0.32),
    cellBlue: mat(0x1b2c66, 0.5, 0.3),
    cellDark: mat(0x1a1e33, 0.5, 0.32),
    seam: mat(0xb3825a, 0.6, 0.4),
    frame: mat(0xcfcfd3, 0.5, 0.4),
    dbl: Object.assign(mat(0xe6e4de, 0.15, 0.55), { side: THREE.DoubleSide }),
    dishGold: Object.assign(mat(0xcdbb8a, 0.3, 0.5), { side: THREE.DoubleSide }),
  };
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

function foilCyl(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  h: number,
  y0: number,
  seg: number,
  amp: number,
  rotY = 0,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.CylinderGeometry(r, r, h, seg, Math.max(1, Math.round(h / 0.25))),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = y0 + h / 2;
  mesh.rotation.y = rotY;
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
  amp = 0.02,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.BoxGeometry(
      w,
      h,
      d,
      Math.max(1, Math.round(w / 0.3)),
      Math.max(1, Math.round(h / 0.3)),
      Math.max(1, Math.round(d / 0.3)),
    ),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** A paraboloid dish, vertex at the origin, opening along +y of its group. */
function paraDish(m: Mat, R: number, depth: number, n = 14): THREE.Group {
  const d = new THREE.Group();
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const r = Math.max(0.01, (R * i) / n);
    pts.push([r, depth * (r / R) ** 2]);
  }
  lathe(d, m, pts, 40);
  return d;
}

function dishRim(d: THREE.Group, m: Mat, R: number, depth: number, ribs: number): void {
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, Math.max(0.012, R * 0.012), 6, 48), m);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = depth;
  d.add(rim);
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * TAU;
    strut(d, m, V(0, 0.01, 0), V(Math.cos(a) * R, depth, Math.sin(a) * R), 0.008, 4);
  }
}

/** A triangular lattice truss from a to b: three longerons, rings and diagonals every bay. */
function truss(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  rad: number,
  bay: number,
  r: number,
): void {
  const L = a.distanceTo(b);
  const d = b.clone().sub(a).normalize();
  const ref = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const p1 = d.clone().cross(ref).normalize();
  const p2 = d.clone().cross(p1).normalize();
  const corner = (k: number): THREE.Vector3 =>
    p1
      .clone()
      .multiplyScalar(Math.cos((k * TAU) / 3) * rad)
      .add(p2.clone().multiplyScalar(Math.sin((k * TAU) / 3) * rad));
  const n = Math.max(1, Math.round(L / bay));
  for (let k = 0; k < 3; k++) strut(g, m, a.clone().add(corner(k)), b.clone().add(corner(k)), r, 5);
  for (let i = 0; i <= n; i++) {
    const c = a.clone().addScaledVector(d, (L * i) / n);
    const c1 = a.clone().addScaledVector(d, (L * Math.min(i + 1, n)) / n);
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      if (i > 0 || rad > 0.03)
        strut(g, m, c.clone().add(corner(k)), c.clone().add(corner(k2)), r * 0.8, 4);
      if (i < n) strut(g, m, c.clone().add(corner(k)), c1.clone().add(corner(k2)), r * 0.7, 4);
    }
  }
}

/** A solar panel lying in the xz plane, length along +x from the origin, width along z, cells up. */
function solarPanel(M: Record<string, Mat>, cell: Mat, len: number, wid: number): THREE.Group {
  const g = new THREE.Group();
  const t = 0.04;
  box(g, cell, len, t, wid, len / 2, 0, 0);
  box(g, M.frame, len + 0.02, t * 1.1, 0.035, len / 2, 0, wid / 2);
  box(g, M.frame, len + 0.02, t * 1.1, 0.035, len / 2, 0, -wid / 2);
  box(g, M.frame, 0.035, t * 1.1, wid, 0, 0, 0);
  box(g, M.frame, 0.035, t * 1.1, wid, len, 0, 0);
  const nx = Math.max(2, Math.round(len / 0.32));
  for (let i = 1; i < nx; i++) box(g, M.seam, 0.012, t * 1.05, wid - 0.06, (len * i) / nx, 0, 0);
  const nz = Math.max(2, Math.round(wid / 0.5));
  for (let j = 1; j < nz; j++) {
    box(g, M.seam, len - 0.06, t * 1.05, 0.01, len / 2, 0, -wid / 2 + (wid * j) / nz);
  }
  return g;
}

function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ─── Voyager 1 and 2 ─────────────────────────────────────────────────────────────────────────

function buildVoyager(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const BR = 0.936;
  const BY = 0.45;
  const BH = 0.47;

  foilCyl(g, M.gold, BR, BH, BY, 10, 0.018, Math.PI / 10);
  cyl(g, M.black, BR * 0.98, BR * 0.98, 0.02, 0, BY - 0.01, 0, 10);
  cyl(g, M.black, BR * 0.98, BR * 0.98, 0.02, 0, BY + BH - 0.01, 0, 10);
  for (let k = 0; k < 10; k++) {
    const a = ((k + 0.5) / 10) * TAU;
    const x = Math.sin(a) * BR * 0.9;
    const z = Math.cos(a) * BR * 0.9;
    const p = V(x, BY, z);
    const q = V(Math.sin(a) * BR * 1.04, BY, Math.cos(a) * BR * 1.04);
    if (k % 3 === 0) {
      const bay = box(g, M.black, 0.5, BH * 0.7, 0.03, 0, 0, 0);
      bay.position.copy(p.clone().lerp(q, 0.8)).setY(BY + BH / 2);
      bay.rotation.y = a;
    }
    strut(g, M.silver, V(x * 0.9, 0.12, z * 0.9), V(x, BY, z), 0.016, 5);
  }
  cyl(g, M.silver, 0.55, 0.55, 0.03, 0, 0.09, 0, 10);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    strut(
      g,
      M.silver,
      V(Math.sin(a) * 0.5, 0.1, Math.cos(a) * 0.5),
      V(Math.sin(a) * BR * 0.9, BY, Math.cos(a) * BR * 0.9),
      0.014,
      5,
    );
  }

  const dy = BY + BH + 0.12;
  cyl(g, M.black, 0.55, 0.8, 0.12, 0, BY + BH, 0, 20);
  const R = 1.83;
  const depth = 0.62;
  const d = paraDish(M.dbl, R, depth, 16);
  d.position.y = dy;
  add(g, d);
  dishRim(d, M.metal, R, depth, 16);
  const fy = 1.12;
  const sub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.12, 16), M.silver);
  sub.rotation.x = Math.PI;
  sub.position.y = fy;
  d.add(sub);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    strut(d, M.silver, V(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3), V(0, fy, 0), 0.012, 5);
    strut(
      d,
      M.metal,
      V(Math.cos(a) * (R - 0.04), depth - 0.03, Math.sin(a) * (R - 0.04)),
      V(0, fy, 0),
      0.012,
      5,
    );
  }
  cyl(d, M.black, 0.14, 0.14, 0.34, 0.0, 0.0, 0.0, 14);
  cyl(d, M.silver, 0.03, 0.14, 0.12, 0, fy + 0.04, 0, 12);
  cyl(d, M.silver, 0.012, 0.012, 0.3, 0, fy + 0.14, 0, 6);

  // RTG boom, three generators end to end
  const rb = V(0, 0.42, -BR * 0.9);
  const re = V(0, 0.32, -3.7);
  truss(g, M.gold, rb, re, 0.2, 0.5, 0.012);
  for (let i = 0; i < 3; i++) {
    const z = -2.05 - i * 0.55;
    const c = cyl(g, M.rtg, 0.18, 0.18, 0.5, 0, 0, 0, 16);
    c.rotation.x = Math.PI / 2;
    c.position.set(0, 0.2, z);
    for (let f = 0; f < 5; f++) {
      const fin = cyl(g, M.silver, 0.24, 0.24, 0.012, 0, 0, 0, 20);
      fin.rotation.x = Math.PI / 2;
      fin.position.set(0, 0.2, z - 0.2 + f * 0.1);
    }
  }
  cyl(g, M.black, 0.05, 0.05, 0.16, 0, 0.12, -3.7, 8);

  // science boom with the scan platform
  const sb = V(0.1, 0.62, BR * 0.9);
  const se = V(0.1, 2.55, 1.7);
  truss(g, M.gold, sb, se, 0.08, 0.3, 0.009);
  const plat = new THREE.Group();
  plat.position.copy(se);
  add(g, plat);
  box(plat, M.gold, 0.6, 0.12, 0.8, 0, 0, 0.1);
  const ax = (m: Mat, r: number, len: number, x: number, y: number, z: number): void => {
    const c = cyl(plat, m, r, r, len, 0, 0, 0, 14);
    c.rotation.x = Math.PI / 2;
    c.position.set(x, y, z);
  };
  ax(M.black, 0.07, 0.8, -0.12, 0.2, 0.5);
  ax(M.black, 0.045, 0.4, 0.1, 0.2, 0.35);
  ax(M.gold, 0.13, 0.4, 0.05, -0.2, 0.4);
  ax(M.gold, 0.07, 0.35, 0.3, 0.05, 0.3);
  ax(M.amber, 0.055, 0.3, -0.3, -0.05, 0.3);
  box(plat, M.amber, 0.25, 0.2, 0.3, -0.2, 0.0, -0.2);
  box(g, M.amber, 0.22, 0.16, 0.2, 0.1, 1.2, 1.1);
  box(g, M.gold, 0.2, 0.2, 0.2, 0.1, 1.9, 1.5);
  box(g, M.silver, 0.34, 0.28, 0.02, BR * 0.8 + 0.1, 0.62, 0.6);

  // the 13 m magnetometer boom from its canister, with the two sensors on it
  const mb = V(BR * 0.9, 0.55, 0);
  const me = V(13.9, 0.55, 0);
  const can = cyl(g, M.gold, 0.14, 0.14, 0.7, 0, 0, 0, 12);
  can.rotation.z = Math.PI / 2;
  can.position.set(BR + 0.2, 0.55, 0);
  truss(g, M.gold, V(mb.x + 0.55, mb.y, 0), me, 0.07, 0.6, 0.008);
  box(g, M.silver, 0.1, 0.1, 0.1, 7.5, 0.55, 0.08);
  box(g, M.silver, 0.12, 0.12, 0.12, 13.95, 0.55, 0);

  // the two 10 m plasma-wave whips are left out (thin wires that would set the framing)

  // Golden Record in its cover on the bus
  const rec = new THREE.Group();
  const a = 100 * RAD;
  rec.position.set(
    Math.sin(a) * (BR * 0.94 + 0.03),
    BY + BH * 0.5,
    Math.cos(a) * (BR * 0.94 + 0.03),
  );
  rec.rotation.y = a;
  add(g, rec);
  box(rec, M.silver, 0.36, 0.36, 0.015, 0, 0, 0);
  const disc = cyl(rec, M.gold, 0.15, 0.15, 0.012, 0, 0, 0, 28);
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 0.016;
  disc.position.y = 0;
  const hub = cyl(rec, M.amber, 0.04, 0.04, 0.016, 0, 0, 0, 12);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.02;
  return g;
}

// ─── Pioneer 10 and 11 ───────────────────────────────────────────────────────────────────────

function buildPioneer(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const side = 0.76;
  const BH = 0.36;
  const BR = side;

  foilCyl(g, M.silver, BR, BH, 0, 6, 0.012);
  cyl(g, M.gold, BR * 1.01, BR * 1.01, 0.02, 0, BH - 0.01, 0, 6);
  cyl(g, M.gold, BR * 1.01, BR * 1.01, 0.02, 0, -0.01, 0, 6);
  const lv = new THREE.Group();
  lv.position.set(0, -0.015, 0);
  add(g, lv);
  cyl(lv, M.dark, 0.5, 0.5, 0.02, 0, -0.01, 0, 24);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * TAU;
    box(lv, M.silver, 0.3, 0.012, 0.03, Math.cos(a) * 0.3, -0.03, Math.sin(a) * 0.3).rotation.y =
      -a;
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(
      g,
      M.gold,
      V(Math.cos(a) * BR, 0.05, Math.sin(a) * BR),
      V(Math.cos(a) * BR, BH, Math.sin(a) * BR),
      0.02,
      5,
    );
  }

  // equipment compartment on the side
  foilBox(g, M.gold, 0.55, 0.3, 0.45, -0.62, 0.15, 0.95 + 0.0, 0.015);
  foilBox(g, M.gold, 0.4, 0.22, 0.3, 0.55, 0.12, -1.05, 0.015);

  // 2.74 m dish on struts above the bus
  const R = 1.37;
  const depth = 0.42;
  const dy = BH + 0.24;
  const d = paraDish(M.dbl, R, depth, 16);
  d.position.y = dy;
  add(g, d);
  dishRim(d, M.metal, R, depth, 12);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + Math.PI / 6;
    strut(
      g,
      M.silver,
      V(Math.cos(a) * BR, BH, Math.sin(a) * BR),
      V(Math.cos(a) * 0.5, dy + 0.02, Math.sin(a) * 0.5),
      0.016,
      5,
    );
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.12;
    box(
      d,
      M.cellDark ?? M.dark,
      0.3,
      0.012,
      0.18,
      Math.cos(a) * (R * 0.82),
      depth * 0.69 + 0.01,
      Math.sin(a) * (R * 0.82),
    ).rotation.y = -a;
  }
  // feed horn on its tripod, omni on top
  const fy = 1.05;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    strut(
      d,
      M.silver,
      V(Math.cos(a) * R * 0.52, depth * 0.14, Math.sin(a) * R * 0.52),
      V(0, fy, 0),
      0.014,
      5,
    );
  }
  cyl(d, M.gold, 0.16, 0.16, 0.22, 0, fy - 0.1, 0, 16);
  cyl(d, M.silver, 0.03, 0.16, 0.1, 0, fy + 0.12, 0, 14);
  cyl(d, M.silver, 0.01, 0.01, 0.55, 0, fy + 0.22, 0, 6);
  cyl(d, M.silver, 0.04, 0.04, 0.05, 0, fy + 0.77, 0, 8);

  // two RTG booms 3 m long at 120 deg, two generators each
  for (const s of [-1, 1]) {
    const a = (90 + s * 120) * RAD;
    const dir = V(Math.cos(a), 0, Math.sin(a));
    const start = dir
      .clone()
      .multiplyScalar(BR * 0.95)
      .setY(0.18);
    const end = dir
      .clone()
      .multiplyScalar(BR * 0.95 + 3)
      .setY(0.18);
    truss(g, M.gold, start, end, 0.12, 0.45, 0.008);
    const perp = V(-dir.z, 0, dir.x);
    for (const o of [-0.17, 0.17]) {
      const c0 = end.clone().addScaledVector(dir, 0.3).addScaledVector(perp, o);
      const c1 = c0.clone().addScaledVector(dir, 0.55);
      strut(g, M.rtg, c0, c1, 0.09, 12);
      for (let f = 0; f < 6; f++) {
        const p = c0.clone().lerp(c1, f / 5);
        const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 16), M.silver);
        fin.position.copy(p);
        fin.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
        add(g, fin);
      }
    }
  }

  // 6.6 m magnetometer boom
  truss(g, M.gold, V(0, 0.18, BR * 0.95), V(0, 0.18, BR * 0.95 + 6.6), 0.05, 0.6, 0.006);
  box(g, M.silver, 0.12, 0.12, 0.14, 0, 0.18, BR * 0.95 + 6.66);
  return g;
}

// ─── Juno ────────────────────────────────────────────────────────────────────────────────────

function buildJuno(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const BR = 1.75;
  const BY = 0.6;
  const BH = 1.55;

  // the radiation vault, the titanium hexagonal box under the bus, and the main engine
  cyl(g, M.titanium, 0.8, 0.8, BY, 0, 0.0, 0, 6);
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) / 6) * TAU;
    box(g, M.silver, 0.06, 0.06, 0.06, Math.sin(a) * 0.7, BY * 0.8, Math.cos(a) * 0.7);
  }
  cyl(g, M.bell, 0.28, 0.08, 0.3, 0, -0.0, 0, 18);
  foilCyl(g, M.kapton, BR, BH, BY, 6, 0.03);
  cyl(g, M.black, BR * 1.01, BR * 1.01, 0.04, 0, BY, 0, 6);
  cyl(g, M.black, BR * 1.01, BR * 1.01, 0.04, 0, BY + BH - 0.04, 0, 6);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(
      g,
      M.silver,
      V(Math.sin(a) * BR, BY, Math.cos(a) * BR),
      V(Math.sin(a) * BR, BY + BH, Math.cos(a) * BR),
      0.025,
      5,
    );
    const am = ((k + 0.5) / 6) * TAU;
    if (k % 2 === 0) {
      const mw = box(g, M.grey, 0.04, BH * 0.8, 1.1, 0, 0, 0);
      mw.position.set(Math.sin(am) * BR * 0.88, BY + BH * 0.5, Math.cos(am) * BR * 0.88);
      mw.rotation.y = am + Math.PI / 2;
    }
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.3;
    box(g, M.black, 0.4, 0.3, 0.4, Math.sin(a) * 1.1, BY - 0.05, Math.cos(a) * 1.1);
  }

  // 2.5 m high-gain dish on top, with the feed and the low-gain cone
  const R = 1.25;
  const depth = 0.42;
  const dy = BY + BH + 0.28;
  const d = paraDish(M.dishGold, R, depth, 16);
  d.position.y = dy;
  add(g, d);
  dishRim(d, M.gold, R, depth, 14);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.4;
    strut(d, M.black, V(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5), V(0, 0.95, 0), 0.025, 5);
  }
  cyl(d, M.black, 0.1, 0.1, 0.18, 0, 0.86, 0, 12);
  cyl(g, M.black, 0.6, 1.0, 0.28, 0, BY + BH, 0, 16);
  cyl(g, M.silver, 0.05, 0.34, 0.5, 0, dy + 1.0, 0, 16);
  cyl(g, M.silver, 0.01, 0.01, 0.6, 0, dy + 1.5, 0, 6);

  // three solar wings at 120 deg, 2.7 m wide: two of four panels, one of three with the MAG boom
  const wings: [number, number, boolean][] = [
    [90, 4, false],
    [210, 4, false],
    [330, 3, true],
  ];
  for (const [deg, n, mag] of wings) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    wing.rotation.y = deg * RAD;
    wing.position.y = BY + BH * 0.5;
    add(g, wing);
    const yoke = BR + 0.25;
    box(wing, M.silver, yoke - BR + 0.2, 0.08, 0.5, (BR + yoke) / 2, 0, 0);
    const pl = 8.9 / 4;
    for (let i = 0; i < n; i++) {
      const p = solarPanel(M, M.cellJuno, pl - 0.04, 2.7);
      p.position.x = yoke + i * pl;
      wing.add(p);
    }
    for (let i = 0; i < n - 1; i++) {
      box(wing, M.silver, 0.08, 0.06, 0.4, yoke + (i + 1) * pl - 0.02, 0.03, 0);
    }
    if (mag) {
      const bx = yoke + n * pl;
      const y = 0;
      const tri = [V(bx, y, -1.1), V(bx + 3.0, y, -0.2), V(bx + 3.0, y, 0.2), V(bx, y, 1.1)];
      for (let i = 0; i < 3; i++) strut(wing, M.titanium, tri[i], tri[i + 1], 0.05, 6);
      strut(wing, M.titanium, V(bx, y, -0.35), V(bx + 2.6, y, -0.08), 0.04, 6);
      strut(wing, M.titanium, V(bx, y, 0.35), V(bx + 2.6, y, 0.08), 0.04, 6);
      strut(wing, M.titanium, V(bx, y, -1.1), V(bx, y, 1.1), 0.05, 6);
      box(wing, M.silver, 0.3, 0.2, 0.3, bx + 3.1, 0, 0);
    }
  }
  return g;
}

// ─── Juice ───────────────────────────────────────────────────────────────────────────────────

function buildJuice(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const W = 1.9;
  const H = 2.6;
  const D = 1.9;
  const Y0 = 7.5;

  // thrust cone with the main engine and the white propellant-tank skirt
  lathe(
    g,
    M.white,
    [
      [0.2, Y0 - 1.1],
      [0.75, Y0 - 0.5],
      [0.95, Y0],
    ],
    24,
  );
  cyl(g, M.bell, 0.3, 0.08, 0.45, 0, Y0 - 1.4, 0, 18);
  foilBox(g, M.dark, W, H, D, 0, Y0 + H / 2, 0, 0.02);
  for (const s of [-1, 1]) {
    box(g, M.silver, 0.04, H * 0.9, 0.04, s * (W / 2 + 0.02), Y0 + H / 2, D / 2 - 0.1);
    box(g, M.silver, 0.04, H * 0.9, 0.04, s * (W / 2 + 0.02), Y0 + H / 2, -D / 2 + 0.1);
  }

  // fixed 2.5 m dish on the front face
  const R = 1.25;
  const depth = 0.42;
  const dish = paraDish(M.dbl, R, depth, 16);
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, Y0 + H * 0.55, D / 2 + 0.05);
  add(g, dish);
  dishRim(dish, M.metal, R, depth, 16);
  const fs = new THREE.Group();
  fs.position.copy(dish.position);
  add(g, fs);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    strut(
      fs,
      M.silver,
      V(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.1),
      V(0, 0, depth + 0.7),
      0.014,
      5,
    );
  }
  cyl(g, M.silver, 0.1, 0.1, 0.2, 0, 0, 0, 10).position.set(0, Y0 + H * 0.55, D / 2 + depth + 0.8);

  // two wings: a row of three 3.9 x 2.2 m panels with one above and one below the middle panel
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    wing.position.set(s * (W / 2 + 0.55), Y0 + H * 0.5, 0);
    add(g, wing);
    box(wing, M.silver, 0.6, 0.1, 0.1, -s * 0.28, 0, 0);
    const pw = 3.9;
    const ph = 2.2;
    for (let i = 0; i < 3; i++) {
      const p = solarPanel(M, M.cellDark, pw - 0.05, ph);
      p.rotation.x = Math.PI / 2;
      p.position.x = s > 0 ? 0.3 + i * pw : -0.3 - i * pw - (pw - 0.05);
      wing.add(p);
    }
    for (const dy of [-1, 1]) {
      const p = solarPanel(M, M.cellDark, pw - 0.05, ph);
      p.rotation.x = Math.PI / 2;
      p.position.set(s > 0 ? 0.3 + pw : -0.3 - pw - (pw - 0.05), dy * (ph + 0.05), 0);
      wing.add(p);
    }
  }

  // 10.6 m MAG boom at an angle; the 16 m RIME dipole is left out (a thin wire that would set the framing)
  box(g, M.gold, 0.2, 0.3, 0.2, 0.35, Y0 + H + 0.2, -0.4);
  const mb = V(-0.45, Y0 + H, -0.6);
  const me = mb.clone().add(V(-4.2, 6.7, -3.6).normalize().multiplyScalar(10.6));
  truss(g, M.silver, mb, me, 0.06, 0.55, 0.008);
  box(g, M.silver, 0.1, 0.1, 0.1, me.x, me.y, me.z);
  // low-gain antenna mast and instrument pods
  cyl(g, M.silver, 0.01, 0.01, 1.4, -0.5, Y0 + H, 0.3, 6);
  box(g, M.gold, 0.5, 0.4, 0.3, 0.55, Y0 + H + 0.2, 0.5);
  box(g, M.amber, 0.3, 0.3, 0.3, -0.4, Y0 + H + 0.15, 0.55);
  return g;
}

// ─── Dawn ────────────────────────────────────────────────────────────────────────────────────

function buildDawn(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const W = 1.64;
  const H = 1.77;
  const Dp = 1.64;
  const Y0 = 0.35;

  foilBox(g, M.kapton, W, H, Dp, 0, Y0 + H / 2, 0, 0.02);
  foilBox(g, M.gold, W * 0.5, H * 0.35, 0.05, W * 0.18, Y0 + H * 0.7, Dp / 2 + 0.03, 0.015);
  foilBox(g, M.gold, 0.05, H * 0.4, Dp * 0.5, -W / 2 - 0.03, Y0 + H * 0.35, 0, 0.015);
  for (const [x, z] of [
    [-W / 2, -Dp / 2],
    [W / 2, -Dp / 2],
    [W / 2, Dp / 2],
    [-W / 2, Dp / 2],
  ]) {
    strut(g, M.silver, V(x, Y0, z), V(x, Y0 + H, z), 0.025, 5);
  }
  cyl(g, M.silver, 0.5, 0.5, 0.05, 0, 0.0, 0, 24);
  cyl(g, M.silver, 0.45, 0.5, 0.3, 0, 0.05, 0, 24);

  // three ion thrusters on the lower deck, the middle one on the axis
  for (const x of [-0.45, 0, 0.45]) {
    const th = new THREE.Group();
    th.position.set(x, 0.0, Dp / 2 - 0.4);
    add(g, th);
    cyl(th, M.silver, 0.17, 0.17, 0.1, 0, 0.3, 0, 22);
    cyl(th, M.dark, 0.15, 0.15, 0.03, 0, 0.27, 0, 22);
    cyl(th, M.grey, 0.12, 0.17, 0.12, 0, 0.4, 0, 22);
  }

  // 1.24 m high-gain dish on the top deck, tilted toward the front
  const R = 0.62;
  const depth = 0.17;
  const dh = new THREE.Group();
  dh.position.set(-0.3, Y0 + H + 0.25, 0.1);
  dh.rotation.x = 0.35;
  add(g, dh);
  const d = paraDish(M.dbl, R, depth, 12);
  dh.add(d);
  dishRim(d, M.metal, R, depth, 8);
  strut(d, M.silver, V(0, 0, 0), V(0, 0.55, 0), 0.012, 5);
  cyl(d, M.silver, 0.04, 0.04, 0.08, 0, 0.5, 0, 8);
  strut(g, M.silver, V(-0.3, Y0 + H, 0.1), V(-0.3, Y0 + H + 0.25, 0.1), 0.04, 6);

  // 19.7 m across: five 1.75 x 2.3 m panels each side, faces to the front
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    wing.position.set(s * (W / 2 + 0.05), Y0 + H * 0.5, 0);
    add(g, wing);
    box(wing, M.silver, 0.6, 0.06, 0.06, s * 0.28, 0, 0);
    const pl = 1.75;
    for (let i = 0; i < 5; i++) {
      const p = solarPanel(M, M.cellBlue, pl - 0.04, 2.3);
      p.rotation.x = Math.PI / 2;
      p.position.x = s > 0 ? 0.57 + i * pl : -0.57 - i * pl - (pl - 0.04);
      wing.add(p);
    }
  }
  // star trackers and the framing cameras
  box(g, M.black, 0.2, 0.2, 0.3, 0.4, Y0 + H + 0.12, -0.3);
  box(g, M.black, 0.16, 0.2, 0.2, 0.5, Y0 + H * 0.55, Dp / 2 + 0.1);
  return g;
}

// ─── Ulysses ─────────────────────────────────────────────────────────────────────────────────

function buildUlysses(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const W = 1.6;
  const H = 1.2;
  const Dp = 1.6;

  cyl(g, M.silver, 0.55, 0.65, 0.2, 0, 0, 0, 24);
  foilBox(g, M.gold, W, H, Dp, 0, 0.2 + H / 2, 0, 0.03);
  box(g, M.black, W + 0.02, 0.03, Dp + 0.02, 0, 0.2 + H + 0.05, 0);
  for (const [x, z] of [
    [-W / 2, -Dp / 2],
    [W / 2, -Dp / 2],
    [W / 2, Dp / 2],
    [-W / 2, Dp / 2],
  ]) {
    strut(g, M.silver, V(x, 0.2, z), V(x, 0.2 + H, z), 0.02, 5);
  }
  foilBox(g, M.amber, 0.35, 0.35, 0.35, 0.45, 0.2 + H + 0.18, -0.4, 0.015);
  box(g, M.silver, 0.4, 0.28, 0.08, -W / 2 - 0.06, 0.2 + H * 0.5, 0.2);

  // 1.65 m dish over the top, on its mast
  const R = 0.825;
  const depth = 0.3;
  const dy = 0.2 + H + 0.45;
  cyl(g, M.silver, 0.1, 0.1, 0.47, 0, 0.2 + H, 0, 12);
  const d = paraDish(M.dbl, R, depth, 14);
  d.position.y = dy;
  add(g, d);
  dishRim(d, M.metal, R, depth, 12);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    strut(
      d,
      M.silver,
      V(Math.cos(a) * R * 0.45, depth * 0.2, Math.sin(a) * R * 0.45),
      V(0, 0.75, 0),
      0.012,
      5,
    );
  }
  cyl(d, M.gold, 0.1, 0.1, 0.16, 0, 0.68, 0, 12);
  cyl(d, M.silver, 0.01, 0.01, 0.3, 0, 0.85, 0, 6);

  // the GPHS-RTG, a finned cylinder on a stand at the side
  const rt = new THREE.Group();
  rt.position.set(W / 2 + 0.55, 0.45, -0.2);
  add(g, rt);
  const rc = cyl(rt, M.rtg, 0.21, 0.21, 1.14, 0, 0, 0, 18);
  rc.rotation.z = Math.PI / 2;
  for (let f = 0; f < 9; f++) {
    const fin = cyl(rt, M.silver, 0.3, 0.3, 0.012, 0, 0, 0, 20);
    fin.rotation.z = Math.PI / 2;
    fin.position.x = -0.5 + f * 0.125;
    fin.position.y = 0.0;
  }
  strut(g, M.silver, V(W / 2, 0.3, -0.2), V(W / 2 + 0.2, 0.45, -0.2), 0.04, 6);
  strut(g, M.silver, V(W / 2, 0.9, -0.2), V(W / 2 + 0.2, 0.55, -0.2), 0.04, 6);

  // experiment boom with its sensors; the 72 m wire dipole and 7.5 m axial monopole are left out (thin wires would set the framing)
  const eb = V(0, 0.2 + H * 0.6, Dp / 2);
  const ee = V(0, 0.2 + H * 0.6, Dp / 2 + 5.6);
  strut(g, M.silver, eb, ee, 0.025, 6);
  for (const z of [1.4, 3.0, 4.6, 5.6])
    box(g, M.gold, 0.18, 0.14, 0.2, 0, 0.2 + H * 0.6, Dp / 2 + z);
  return g;
}

// ─── New Horizons ────────────────────────────────────────────────────────────────────────────

/** A blunted-triangle prism (outline in x/z, extruded up y), crinkled. */
function foilPrism(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  y0: number,
  h: number,
  amp: number,
): THREE.Mesh {
  const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: h,
    steps: Math.max(2, Math.round(h / 0.12)),
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0, 0);
  const mesh = new THREE.Mesh(crinkle(geo, amp), m);
  return add(g, mesh);
}

function buildNewHorizons(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  // Triangular bus almost 0.76 m thick under the 2.1 m dish; the rear corner (-z) carries the RTG.
  // Wikipedia gives the envelope as 2.2 x 2.1 x 2.7 m without axes: drawn here as 2.1 m across
  // the dish and 2.7 m from the dish rim to the RTG's end, judged from the clean-room photo.
  // Science face +z.
  const BY = 0.12;
  const BH = 0.76;
  const cut = 0.1;
  const A: [number, number] = [0, -0.62];
  const B: [number, number] = [-1.12, 0.55];
  const C: [number, number] = [1.12, 0.55];
  const lerp = (p: [number, number], q: [number, number], t: number): [number, number] => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ];
  const outline: [number, number][] = [];
  for (const [p, prev, next] of [
    [A, C, B],
    [B, A, C],
    [C, B, A],
  ] as const) {
    outline.push(lerp(p, prev, cut), lerp(p, next, cut));
  }
  foilPrism(g, M.gold, outline, BY, BH, 0.012);
  // black deck edges top and bottom
  for (const y of [BY, BY + BH]) {
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i];
      const q = outline[(i + 1) % outline.length];
      strut(g, M.black, V(p[0], y, p[1]), V(q[0], y, q[1]), 0.012, 4);
    }
  }
  // launch adapter ring under the central cylinder
  cyl(g, M.silver, 0.42, 0.47, BY, 0, 0, -0.05, 32);
  cyl(g, M.metal, 0.48, 0.48, 0.02, 0, 0, -0.05, 32);

  // instruments on the science face (+z): LORRI's sunshade, Ralph, Alice, PEPSSI and SWAP
  const zf = 0.55;
  const lorri = cyl(g, M.black, 0.13, 0.13, 0.14, 0, 0, 0, 20);
  lorri.rotation.x = Math.PI / 2;
  lorri.position.set(-0.42, BY + 0.42, zf + 0.07);
  foilBox(g, M.silver, 0.32, 0.24, 0.14, 0.12, BY + 0.38, zf + 0.07, 0.008);
  box(g, M.black, 0.12, 0.12, 0.01, 0.12, BY + 0.4, zf + 0.145);
  foilBox(g, M.black, 0.2, 0.14, 0.1, 0.52, BY + 0.5, zf + 0.05, 0.006);
  box(g, M.dark, 0.06, 0.04, 0.01, 0.52, BY + 0.52, zf + 0.105);
  box(g, M.metal, 0.12, 0.1, 0.12, -0.75, BY + BH - 0.08, zf - 0.05);
  cyl(g, M.silver, 0.1, 0.12, 0.14, 0.62, BY + BH - 0.16, 0.42, 18);
  // star trackers on the -x side, thruster clusters at the two front corners
  for (const y of [BY + 0.2, BY + 0.45]) box(g, M.black, 0.1, 0.1, 0.12, -0.62, y, -0.25);
  for (const [x, z] of [B, C]) {
    for (const dy of [0.06, BH - 0.06]) {
      const t = cyl(g, M.metal, 0.025, 0.04, 0.07, x * 0.9, BY + dy - 0.035, z * 0.95, 8);
      t.rotation.z = (x > 0 ? -1 : 1) * 0.6;
    }
  }

  // 2.1 m high-gain dish on the top deck; the 0.3 m medium-gain dish drawn on its feed support
  const R = 1.05;
  const depth = 0.27;
  const dy = BY + BH + 0.04;
  cyl(g, M.silver, 0.3, 0.34, 0.05, 0, BY + BH, 0, 24);
  const d = paraDish(M.dishGold, R, depth, 16);
  d.position.y = dy;
  add(g, d);
  dishRim(d, M.metal, R, depth, 16);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 6;
    strut(
      d,
      M.silver,
      V(Math.cos(a) * R * 0.62, depth * 0.4, Math.sin(a) * R * 0.62),
      V(Math.cos(a) * 0.14, 0.6, Math.sin(a) * 0.14),
      0.012,
      5,
    );
  }
  cyl(d, M.white, 0.04, 0.09, 0.16, 0, 0.02, 0, 16);
  cyl(d, M.silver, 0.2, 0.17, 0.05, 0, 0.6, 0, 24);
  const mga = paraDish(M.white, 0.15, 0.05, 8);
  mga.position.y = 0.65;
  d.add(mga);
  cyl(d, M.white, 0.035, 0.035, 0.12, 0, 0.65, 0, 10);

  // the GPHS-RTG off the rear corner on its tripod, radial fins along its length
  const rz0 = A[1] + 0.08;
  const rLen = 1.14;
  const ry = BY + 0.36;
  const rt = new THREE.Group();
  rt.position.set(0, ry, rz0 - rLen / 2);
  add(g, rt);
  const core = cyl(rt, M.rtg, 0.15, 0.15, rLen, 0, -rLen / 2, 0, 18);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0, 0);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    const fin = box(rt, M.black, 0.012, 0.07, rLen * 0.96, 0, 0, 0);
    fin.position.set(Math.cos(a) * 0.185, Math.sin(a) * 0.185, 0);
    fin.rotation.z = a + Math.PI / 2;
  }
  for (const zEnd of [-rLen / 2, rLen / 2]) {
    const cap = cyl(rt, M.metal, 0.17, 0.17, 0.03, 0, -0.015, zEnd, 18);
    cap.rotation.x = Math.PI / 2;
  }
  const foot = V(0, ry, rz0 + 0.02);
  for (const [x, y] of [
    [-0.28, BY + 0.1],
    [0.28, BY + 0.1],
    [0, BY + BH - 0.08],
  ]) {
    strut(g, M.titanium, V(x, y, A[1] + 0.3), foot, 0.018, 6);
  }
  return g;
}

// ─── Registry ────────────────────────────────────────────────────────────────────────────────

const REF = (l: string, u: string): ShowcaseRef => ({ l, u });
const WP = (page: string, what: string): ShowcaseRef =>
  REF(
    `Wikipedia — ${page.replace(/_/g, ' ')}: ${what}`,
    `https://en.wikipedia.org/wiki/${encodeURI(page)}`,
  );
const WC = (file: string, what: string): ShowcaseRef =>
  REF(
    `Wikimedia Commons — ${file.replace(/_/g, ' ')}: ${what}`,
    `https://commons.wikimedia.org/wiki/File:${encodeURI(file)}`,
  );

function make(
  fn: () => THREE.Group,
  heightM: number,
  heightEstimate: string,
  diameterM: number,
  refs: ShowcaseRef[],
): ShowcaseModel {
  return { build: () => finish(fn(), heightM), heightM, heightEstimate, diameterM, refs };
}

const VOYAGER_REFS = [
  WP(
    'Voyager_program',
    '3.7 m dish, 13 m magnetometer boom, two 10 m plasma-wave antennas, 30 cm Golden Record',
  ),
  WC(
    'Voyager_spacecraft_model.png',
    'render: dish, decagon bus, science boom, RTG boom, long magnetometer boom',
  ),
  WC('Voyager_Instruments.jpg', 'NASA labelled diagram: bus, RTGs, scan platform, booms'),
];
const PIONEER_REFS = [
  WP(
    'Pioneer_10',
    '2.74 m dish, hexagonal bus 36 cm deep with 76 cm sides, two 3 m RTG booms 120 deg apart, 6.6 m magnetometer boom',
  ),
  WC(
    'Pioneer_10-11_spacecraft.jpg',
    'NASA painting: dish, hexagonal bus, both RTG booms, magnetometer boom',
  ),
  WC(
    'Pioneer_10_Diagram_(No_labels).svg',
    'line drawing: bus, booms, dish, instrument compartment',
  ),
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'voyager-1': make(
    buildVoyager,
    2.86,
    'No published overall height in the fleet entry; the drawn height of the 3.7 m dish axis on its bus with the science boom raised (the two 10 m plasma-wave whips are left out as thin wires), measured against the 3.7 m dish in the NASA diagram',
    3.7,
    VOYAGER_REFS,
  ),
  'voyager-2': make(
    buildVoyager,
    2.86,
    'No published overall height in the fleet entry; the drawn height of the 3.7 m dish axis on its bus with the science boom raised (the two 10 m plasma-wave whips are left out as thin wires), measured against the 3.7 m dish in the NASA diagram',
    3.7,
    VOYAGER_REFS,
  ),
  'pioneer-10': make(
    buildPioneer,
    2.52,
    'No published overall height in the fleet entry; the 36 cm bus plus the dish depth and feed with its omni antenna, scaled from the 2.74 m dish in the NASA painting',
    2.74,
    PIONEER_REFS,
  ),
  'pioneer-11': make(
    buildPioneer,
    2.52,
    'No published overall height in the fleet entry; the 36 cm bus plus the dish depth and feed with its omni antenna, scaled from the 2.74 m dish in the NASA painting',
    2.74,
    PIONEER_REFS,
  ),
  juno: make(
    buildJuno,
    4.53,
    'No published overall height in the fleet entry; the hexagonal bus, vault and engine plus the 2.5 m dish and feed, judged from the render against the 2.7 m panel width',
    3.5,
    [
      WP(
        'Juno_(spacecraft)',
        '20.1 m span, panels 2.7 x 8.9 m, two of four segments and one of three plus the magnetometer',
      ),
      WC(
        'Juno_spacecraft_model_1.png',
        'render: dish, black bus, three wings, MAG boom frame on the third',
      ),
    ],
  ),
  juice: make(
    buildJuice,
    12.89,
    "No published overall height in the fleet entry; the drawn height from the engine cone to the tip of the 10.6 m MAG boom raised at an angle; the 16 m RIME wire dipole is left out as a thin wire. Wikipedia's 16.8 x 27.1 x 13.7 m is the overall envelope with booms and antennas deployed, so its 13.7 m is close to this drawn 12.9 m",
    1.9,
    [
      WP(
        'Jupiter_Icy_Moons_Explorer',
        '2.5 m dish, 16 m RIME antenna, 10.6 m magnetometer boom, 16.8 x 27.1 x 13.7 m',
      ),
      WC(
        'Juice_flyby_of_Callisto_artists_impression.jpg',
        'ESA render: boxy bus, dish on the front, two cross-shaped wings, RIME and MAG booms',
      ),
    ],
  ),
  dawn: make(
    buildDawn,
    2.93,
    'No published overall height in the fleet entry; the 1.77 m body with the ion thruster deck below and the tilted dish above (Wikipedia: 1.64 x 19.7 x 1.77 m)',
    1.77,
    [
      WP(
        'Dawn_(spacecraft)',
        '1.64 x 19.7 x 1.77 m, 19.7 m across the arrays, 1.24 m dish, three xenon ion thrusters',
      ),
      WC(
        'Dawn_spacecraft_model.png',
        'render: boxy bus, two five-panel wings, tilted dish, thrusters',
      ),
    ],
  ),
  'new-horizons': make(
    buildNewHorizons,
    1.69,
    'No published overall height in the fleet entry; the 0.76 m triangular bus on its adapter ring plus the 2.1 m dish, its secondary and the 0.3 m medium-gain antenna, judged from the render (Wikipedia gives the overall envelope as 2.2 x 2.1 x 2.7 m)',
    2.1,
    [
      WP(
        'New_Horizons',
        '2.2 x 2.1 x 2.7 m, triangular body almost 0.76 m thick, RTG in the plane of the triangle from one vertex, 2.1 m high-gain and 0.3 m medium-gain antennas',
      ),
      WC(
        'New_Horizons_spacecraft_model_1.png',
        'render: triangular bus, dish with the medium-gain antenna on its secondary, RTG off one corner',
      ),
    ],
  ),
  ulysses: make(
    buildUlysses,
    3,
    'No published overall height in the fleet entry; the box and the 1.65 m dish on its mast, scaled from the ESA render; the 72 m wire dipole and the 7.5 m axial monopole are left out as thin wires that would set the framing',
    1.65,
    [
      WP(
        'Ulysses_(spacecraft)',
        '1.65 m dish, 72 m wire dipole, 7.5 m axial monopole, GPHS-RTG on the side',
      ),
      WC(
        'Ulysses_spacecraft_model.png',
        'render: gold box, dish, RTG, experiment boom, radial wires',
      ),
    ],
  ),
};
