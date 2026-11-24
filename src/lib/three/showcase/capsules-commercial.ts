/**
 * Showcase models: the commercial and national crew / cargo capsules. Crew Dragon and Cargo
 * Dragon 2 (one builder), Cargo Dragon v1, Starliner, Gaganyaan, Mengzhou, Orion and New
 * Shepard (operator 2026-11-23: one central model per craft, built to the bar of the Apollo LM
 * and Curiosity, no bolted-on geometric shapes).
 *
 * Standing pose, as on the launcher: nose up, base on y = 0, +z the front. The crew module is the
 * NAMED group 'descent-module' (the part that comes home), the rest named groups: 'trunk' (Dragon),
 * 'service-module' (Dragon 1 trunk excepted), 'launch-adapter' (Orion), 'booster' (New Shepard).
 * The descent groups sit at the identity transform; their parts carry absolute heights.
 *
 * Sourced dimensions (Wikipedia infoboxes and NASA, see `refs`): Dragon 2 capsule 4.5 m high,
 * 4 m across, 8.1 m with trunk; Dragon 1 6.1 m long, 3.7 m across, 2.3 m trunk; Starliner 5.03 m
 * (capsule + service module), 4.56 m across; Gaganyaan crew module 3.5 m x 3.58 m; Mengzhou
 * 8.8 m, crew module 4.5 m; Orion crew module 5.02 m x 3.35 m, ESM 4 m long, 4 wings of 7.375 m,
 * 7.9 m overall; New Shepard 19.2 m, booster 3.8 m across. Everything not in a source (module
 * splits, array spans and panel sizes, hardware layout) is read off the photographs and marked
 * "estimate".
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, lathe, mat, strut, type Mat } from './kit';

type Mats = Record<string, Mat>;
const TAU = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const pol = (r: number, a: number, y: number): THREE.Vector3 =>
  new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));

function grp(parent: THREE.Object3D, name?: string): THREE.Group {
  const g = new THREE.Group();
  if (name) g.name = name;
  parent.add(g);
  return g;
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  seg = 40,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

/** A horizontal ring (band, flange, strap) of radius R, tube radius r, at height y. */
function torus(g: THREE.Object3D, m: Mat, R: number, r: number, y: number, seg = 56): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 6, seg), m);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  return add(g, t);
}

/** An open cylindrical strip (a doubler, a tape band, a cell patch), arc a0 .. a0 + len (0 = +z). */
function band(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  y0: number,
  y1: number,
  a0 = 0,
  len = TAU,
  seg = 56,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true, a0, len), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

/** A crinkled thermal-blanket skin: a lathe of `pts` (r, y), densified, every vertex nudged. */
function blanket(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  amp: number,
  seg = 48,
  step = 0.17,
): THREE.Mesh {
  const dense: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i];
    const [r1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(r1 - r0, y1 - y0) / step));
    for (let k = 0; k < n; k++) {
      dense.push(new THREE.Vector2(r0 + ((r1 - r0) * k) / n, y0 + ((y1 - y0) * k) / n));
    }
  }
  const last = pts[pts.length - 1];
  dense.push(new THREE.Vector2(last[0], last[1]));
  return add(g, new THREE.Mesh(crinkle(new THREE.LatheGeometry(dense, seg), amp), m));
}

/** Radius at height y of a polyline profile of (r, y) points. */
function profileFn(pts: [number, number][]): (y: number) => number {
  return (y) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [r0, y0] = pts[i];
      const [r1, y1] = pts[i + 1];
      if (y >= Math.min(y0, y1) && y <= Math.max(y0, y1) && y1 !== y0) {
        return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
    }
    return pts[pts.length - 1][0];
  };
}

/** A frame at `pos` whose local +y is `normal`; local x runs along the ring, local -z up the surface. */
function frameAt(parent: THREE.Object3D, pos: THREE.Vector3, normal: THREE.Vector3): THREE.Group {
  const f = new THREE.Group();
  f.position.copy(pos);
  const n = normal.clone().normalize();
  const t = new THREE.Vector3().crossVectors(Y_AXIS, n);
  if (t.lengthSq() < 1e-4) f.quaternion.setFromUnitVectors(Y_AXIS, n);
  else {
    t.normalize();
    f.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(t, n, new THREE.Vector3().crossVectors(t, n)),
    );
  }
  parent.add(f);
  return f;
}

/** A frame on a surface of revolution r(y) at height y, azimuth yaw (0 = +z), lifted off it. */
function onProfile(
  parent: THREE.Object3D,
  rAt: (y: number) => number,
  y: number,
  yaw: number,
  lift = 0,
): THREE.Group {
  const s = (rAt(y + 0.01) - rAt(y - 0.01)) / 0.02;
  const k = 1 / Math.hypot(1, s);
  const n = new THREE.Vector3(Math.sin(yaw) * k, -s * k, Math.cos(yaw) * k);
  return frameAt(parent, pol(rAt(y), yaw, y).addScaledVector(n, lift), n);
}

/** A seam (tape line, panel gap) running up the surface at azimuth yaw between y0 and y1. */
function seamUp(
  g: THREE.Object3D,
  m: Mat,
  rAt: (y: number) => number,
  yaw: number,
  y0: number,
  y1: number,
  r = 0.01,
  lift = 0.004,
): void {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const ya = y0 + ((y1 - y0) * i) / n;
    const yb = y0 + ((y1 - y0) * (i + 1)) / n;
    strut(g, m, pol(rAt(ya) + lift, yaw, ya), pol(rAt(yb) + lift, yaw, yb), r, 5);
  }
}

/** A seam ring round the surface at height y. */
function seamRing(
  g: THREE.Object3D,
  m: Mat,
  rAt: (y: number) => number,
  y: number,
  r = 0.01,
  lift = 0.004,
): void {
  torus(g, m, rAt(y) + lift, r, y, 72);
}

function roundShape(w: number, h: number, rad: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = w / 2;
  const y = h / 2;
  const r = Math.min(rad, x, y);
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);
  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);
  s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/** A raised rounded plate w x h (h up the surface) of thickness t in a frame, offset (dx, dUp). */
function plate(
  f: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  rad: number,
  t: number,
  lift = 0,
  dx = 0,
  dUp = 0,
): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(roundShape(w, h, rad), { depth: t, bevelEnabled: false });
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(dx, lift, -dUp);
  return add(f, mesh);
}

/** A window: bright frame, dark glass. */
function window(
  f: THREE.Object3D,
  M: Mats,
  w: number,
  h: number,
  rad: number,
  dx = 0,
  dUp = 0,
  lift = 0,
): void {
  plate(f, M.silver, w + 0.08, h + 0.08, rad + 0.03, 0.022, lift, dx, dUp);
  plate(f, M.glass, w, h, rad, 0.03, lift, dx, dUp);
}

/** A nozzle bell in a frame: flares outward, dark throat. */
function bell(f: THREE.Object3D, m: Mat, dark: Mat, rad: number, len: number, x = 0, z = 0): void {
  const c = new THREE.Mesh(new THREE.ConeGeometry(rad, len, 14, 1, true), m);
  c.rotation.x = Math.PI;
  c.position.set(x, len / 2, z);
  add(f, c);
  const d = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.82, 14), dark);
  d.rotation.x = -Math.PI / 2;
  d.position.set(x, len * 0.12, z);
  add(f, d);
}

/** A flat-lying solar panel (normal +y), w along x, l along z: cells, grid lines, frame. */
function cellPanel(M: Mats, w: number, l: number, cols: number, rows: number): THREE.Group {
  const g = new THREE.Group();
  box(g, M.cell, w, 0.02, l, 0, 0, 0);
  for (let i = 0; i <= cols; i++)
    box(g, M.cellLine, 0.012, 0.024, l, -w / 2 + (i * w) / cols, 0, 0);
  for (let j = 0; j <= rows; j++)
    box(g, M.cellLine, w, 0.024, 0.012, 0, 0, -l / 2 + (j * l) / rows);
  box(g, M.frame, w + 0.04, 0.03, 0.035, 0, 0, l / 2);
  box(g, M.frame, w + 0.04, 0.03, 0.035, 0, 0, -l / 2);
  box(g, M.frame, 0.035, 0.03, l, w / 2, 0, 0);
  box(g, M.frame, 0.035, 0.03, l, -w / 2, 0, 0);
  return g;
}

function baseMats(): Mats {
  return {
    white: mat(0xeeeeea, 0.04, 0.55),
    whiteDim: mat(0xd6d6d0, 0.05, 0.6),
    silver: mat(0xc3c7cc, 0.55, 0.3),
    grey: mat(0x8c9097, 0.4, 0.45),
    dark: mat(0x1c1d21, 0.2, 0.55),
    black: mat(0x101114, 0.2, 0.5),
    seam: mat(0x9a9b97, 0.1, 0.7),
    heat: mat(0x2d2622, 0, 0.9),
    heatEdge: mat(0x594a3e, 0, 0.8),
    glass: mat(0x070a10, 0.4, 0.15),
    cell: mat(0x16204a, 0.3, 0.35),
    cellLine: mat(0xb4ad9e, 0.5, 0.4),
    frame: mat(0xb9bec8, 0.5, 0.4),
    gold: mat(0xc99d3c, 0.5, 0.4, true),
    blue: mat(0x1d4fa3, 0, 0.5),
    copper: mat(0xa8703a, 0.5, 0.45),
  };
}

/** Stand a finished craft on y = 0 at its published height. */
function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const k = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(k);
  g.position.y = -b.min.y * k;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Dragon 2 (Crew Dragon, Cargo Dragon 2)
// ---------------------------------------------------------------------------------------------

/**
 * Dragon 2: what reads as Dragon 2 is the gumdrop capsule, widest low down and tapering over a
 * conical flank to the black clamshell nose cone, the white painted skin with its panel lines, on
 * the crew version the trapezoid hatch, the four windows and the four SuperDraco bays low on the
 * flank (two bells each, behind a white fairing) with the Draco pockets above them, the dark
 * PICA-X heat shield under it all; and behind it the trunk: a white drum with the cell patch
 * wrapped round half of it and two tall white radiator fins. Cargo Dragon 2 is the same craft
 * without windows and SuperDraco bays (cover plates instead).
 */
function buildDragon2(crew: boolean): THREE.Group {
  const M = baseMats();
  const g = new THREE.Group();
  const TRUNK = 3.6;

  const tr = grp(g, 'trunk');
  const tR = 1.9;
  cyl(tr, M.white, tR, tR - 0.03, 0, TRUNK, 56);
  cyl(tr, M.silver, tR + 0.03, tR + 0.03, 0, 0.14, 56);
  cyl(tr, M.silver, tR + 0.02, tR + 0.02, TRUNK - 0.12, TRUNK, 56);
  const trR = (): number => tR - 0.015;
  for (const y of [0.9, 1.9, 2.9]) seamRing(tr, M.seam, trR, y, 0.008);
  // Body-mounted cells on the +z half: a dark patch, string lines, framed in silver.
  const a0 = -Math.PI / 2 + 0.25;
  const aLen = Math.PI - 0.5;
  band(tr, M.cell, tR + 0.012, 0.35, TRUNK - 0.3, a0, aLen, 48);
  for (let i = 0; i <= 14; i++) {
    const a = a0 + (aLen * i) / 14;
    strut(tr, M.cellLine, pol(tR + 0.016, a, 0.35), pol(tR + 0.016, a, TRUNK - 0.3), 0.005, 4);
  }
  for (let j = 0; j <= 10; j++) {
    const y = 0.35 + ((TRUNK - 0.65) * j) / 10;
    band(tr, M.cellLine, tR + 0.015, y - 0.005, y + 0.005, a0, aLen, 48);
  }
  for (const y of [0.33, TRUNK - 0.28])
    band(tr, M.frame, tR + 0.02, y - 0.02, y + 0.02, a0, aLen, 48);
  for (const a of [a0, a0 + aLen]) {
    strut(tr, M.frame, pol(tR + 0.02, a, 0.33), pol(tR + 0.02, a, TRUNK - 0.27), 0.02, 5);
  }
  // The two radiator fins, with their coolant-tube lines.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0.1);
  finShape.lineTo(0.95, 0.5);
  finShape.lineTo(0.95, TRUNK - 0.6);
  finShape.lineTo(0, TRUNK - 0.1);
  finShape.closePath();
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.position.x = side * (tR - 0.06);
    fin.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: false }),
      M.white,
    );
    body.position.z = -0.04;
    fin.add(body);
    for (let k = 1; k < 7; k++) {
      const y = 0.1 + ((TRUNK - 0.2) * k) / 7;
      box(fin, M.seam, 0.84, 0.014, 0.1, 0.5, y, 0);
    }
    box(fin, M.silver, 0.04, TRUNK - 1.1, 0.1, 0.95, TRUNK / 2, 0);
    tr.add(fin);
  }
  // Access panels.
  for (const [yaw, y] of [
    [-Math.PI * 0.75, 1.4],
    [Math.PI * 0.75, 2.5],
    [Math.PI, 0.7],
  ]) {
    const f = onProfile(tr, trR, y, yaw);
    plate(f, M.whiteDim, 0.55, 0.45, 0.04, 0.02);
    plate(f, M.seam, 0.5, 0.012, 0.004, 0.026);
  }

  // The capsule. Heat shield at y = TRUNK, nose cone tip at TRUNK + 4.5.
  const dm = grp(g, 'descent-module');
  const cap = grp(dm);
  cap.position.y = TRUNK;
  const body: [number, number][] = [
    [1.98, 0.05],
    [2.0, 0.3],
    [1.93, 0.8],
    [1.72, 1.5],
    [1.46, 2.2],
    [1.2, 2.8],
    [1.02, 3.1],
  ];
  const rBody = profileFn(body);
  lathe(cap, M.white, [[0, 0.02], ...body], 72);
  lathe(cap, M.heat, [
    [0, 0],
    [1.2, 0],
    [1.75, 0.01],
    [1.93, 0.04],
    [1.98, 0.06],
  ]);
  for (const r of [0.5, 1.0, 1.5]) torus(cap, M.heatEdge, r, 0.01, -0.004, 48);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    strut(cap, M.heatEdge, pol(0.1, a, -0.006), pol(1.85, a, -0.006), 0.006, 4);
  }
  torus(cap, M.heatEdge, 1.99, 0.022, 0.1, 72);
  // Nose cone: black clamshell, hinge line, latches.
  lathe(
    cap,
    M.white,
    [
      [1.02, 3.1],
      [1.0, 3.2],
      [0.86, 3.65],
      [0.6, 4.15],
      [0.3, 4.42],
      [0, 4.5],
    ],
    56,
  );
  torus(cap, M.silver, 1.03, 0.03, 3.1, 56);
  const rNose = profileFn([
    [1.0, 3.2],
    [0.86, 3.65],
    [0.6, 4.15],
  ]);
  for (const yaw of [Math.PI / 2, -Math.PI / 2]) {
    strut(
      cap,
      M.silver,
      pol(rNose(3.3) + 0.006, yaw, 3.3),
      pol(rNose(4.1) + 0.006, yaw, 4.1),
      0.012,
      5,
    );
  }
  for (const yaw of [0.5, -0.5, Math.PI - 0.5, Math.PI + 0.5]) {
    const f = onProfile(cap, rBody, 3.0, yaw);
    box(f, M.silver, 0.14, 0.05, 0.09, 0, 0.02, 0);
  }
  // Panel lines on the flank.
  for (const y of [0.75, 1.55, 2.3]) seamRing(cap, M.seam, rBody, y, 0.008);
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * TAU + 0.13;
    const k = i % 2;
    seamUp(cap, M.seam, rBody, yaw, 0.75 + k * 0.8, 1.55 + k * 0.75, 0.007);
  }

  // Hatch: rounded door on the +z flank, its frame and latch pegs.
  {
    const f = onProfile(cap, rBody, 1.95, 0);
    plate(f, M.whiteDim, crew ? 0.95 : 0.8, crew ? 1.15 : 0.9, 0.2, 0.035);
    plate(f, M.seam, crew ? 1.0 : 0.85, crew ? 1.2 : 0.95, 0.22, 0.012, -0.002);
    for (let k = 0; k < 6; k++) box(f, M.grey, 0.04, 0.03, 0.04, -0.38 + k * 0.152, 0.04, 0.5);
    if (crew) plate(f, M.glass, 0.26, 0.3, 0.08, 0.04, 0.0, 0.0, 0.22);
  }
  const quad = [Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
  if (crew) {
    // Four windows, in pairs either side of the hatch and astern of it.
    for (const yaw of [0.58, -0.58, Math.PI - 0.58, Math.PI + 0.58]) {
      window(onProfile(cap, rBody, 2.45, yaw), M, 0.3, 0.42, 0.1);
    }
    // Four SuperDraco bays low on the flank: white fairing, dark bay, two bells.
    for (const yaw of quad) {
      const f = onProfile(cap, rBody, 0.95, yaw);
      const T = 0.11;
      plate(f, M.dark, 0.64, 0.84, 0.12, 0.02, 0, 0, -0.0);
      for (const sx of [-1, 1]) box(f, M.white, 0.12, T, 1.06, sx * 0.385, T / 2, 0);
      for (const su of [-1, 1]) box(f, M.white, 0.9, T, 0.11, 0, T / 2, su * 0.475);
      box(f, M.seam, 0.012, 0.012, 0.8, 0, 0.022, 0);
      for (const dx of [-0.16, 0.16]) bell(f, M.grey, M.black, 0.12, 0.2, dx, 0.12);
    }
    // Draco pockets, two to a cluster, above the SuperDraco bays.
    for (const yaw of [
      Math.PI / 4 + 0.4,
      -Math.PI / 4 - 0.4,
      (3 * Math.PI) / 4 - 0.4,
      (-3 * Math.PI) / 4 + 0.4,
    ]) {
      const f = onProfile(cap, rBody, 1.7, yaw);
      plate(f, M.dark, 0.34, 0.14, 0.06, 0.03);
      for (const dx of [-0.08, 0.08]) bell(f, M.grey, M.black, 0.045, 0.1, dx, 0);
    }
  } else {
    for (const yaw of quad) {
      const f = onProfile(cap, rBody, 1.5, yaw);
      plate(f, M.whiteDim, 0.5, 0.9, 0.08, 0.03);
      plate(f, M.dark, 0.34, 0.14, 0.06, 0.036, 0, 0, 0.25);
      for (const dx of [-0.08, 0.08]) bell(f, M.grey, M.black, 0.045, 0.1, dx, -0.1);
    }
  }
  return finish(g, 8.1);
}

/** A crinkled foil patch wrapped on a cylinder: arc a0 .. a0 + len, y0 .. y1. */
function foilBand(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  y0: number,
  y1: number,
  a0: number,
  len: number,
  amp: number,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(
    r + amp,
    r + amp,
    y1 - y0,
    Math.max(6, Math.round((len * r) / 0.2)),
    Math.max(2, Math.round((y1 - y0) / 0.2)),
    true,
    a0,
    len,
  );
  const mesh = new THREE.Mesh(crinkle(geo, amp), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

// ---------------------------------------------------------------------------------------------
// Dragon 1
// ---------------------------------------------------------------------------------------------

/**
 * Cargo Dragon v1: what reads as Dragon 1 is the squat bell of a capsule with its rounded shoulder
 * and the white nose cone, four Draco quads low on the flank, the heat shield under it; and the
 * 2.3 m trunk of white panels with the two solar wings (two big cell panels each) reaching out
 * from the trunk sides.
 */
function buildDragon1(): THREE.Group {
  const M = baseMats();
  const g = new THREE.Group();
  const TRUNK = 2.3;
  const tR = 1.84;

  const tr = grp(g, 'trunk');
  cyl(tr, M.white, tR, tR - 0.02, 0, TRUNK, 56);
  cyl(tr, M.silver, tR + 0.03, tR + 0.03, 0, 0.12, 56);
  cyl(tr, M.silver, tR + 0.02, tR + 0.02, TRUNK - 0.1, TRUNK, 56);
  const trR = (): number => tR - 0.01;
  for (const y of [0.6, 1.15, 1.7]) seamRing(tr, M.seam, trR, y, 0.008);
  for (let i = 0; i < 16; i++)
    seamUp(tr, M.seam, trR, (i / 16) * TAU + 0.1, 0.12, TRUNK - 0.1, 0.006);
  // Radiator panels on the +z / -z faces and access doors.
  for (const yaw of [0.9, -0.9, Math.PI - 0.9, Math.PI + 0.9]) {
    const f = onProfile(tr, trR, 1.15, yaw);
    plate(f, M.whiteDim, 0.9, 1.5, 0.05, 0.02);
    plate(f, M.seam, 0.94, 0.012, 0.004, 0.026, 0, 0, 0.3);
    plate(f, M.seam, 0.94, 0.012, 0.004, 0.026, 0, 0, -0.3);
  }
  // The two solar wings: root hinge on the trunk side, two panels each, spar behind.
  for (const side of [-1, 1]) {
    const wing = grp(tr);
    wing.userData.solarArray = true;
    box(wing, M.silver, 0.34, 0.5, 0.5, side * (tR + 0.08), 1.15, 0);
    strut(
      wing,
      M.silver,
      new THREE.Vector3(side * (tR + 0.1), 1.15, -0.1),
      new THREE.Vector3(side * (tR + 6.5), 1.15, -0.1),
      0.04,
      6,
    );
    for (let s = 0; s < 2; s++) {
      const pnl = cellPanel(M, 3.05, 2.1, 12, 8);
      pnl.rotation.x = Math.PI / 2;
      pnl.position.set(side * (tR + 0.35 + 1.6 + s * 3.2), 1.15, 0.03);
      wing.add(pnl);
      box(wing, M.silver, 3.05, 0.06, 0.04, side * (tR + 0.35 + 1.6 + s * 3.2), 1.15, -0.04);
    }
  }

  // Capsule, heat shield at y = TRUNK.
  const dm = grp(g, 'descent-module');
  const cap = grp(dm);
  cap.position.y = TRUNK;
  const body: [number, number][] = [
    [1.78, 0.04],
    [1.85, 0.16],
    [1.85, 0.4],
    [1.62, 1.0],
    [1.3, 1.85],
    [1.06, 2.45],
    [0.98, 2.9],
  ];
  const rBody = profileFn(body);
  lathe(cap, M.white, [[0, 0.02], ...body], 72);
  lathe(cap, M.heat, [
    [0, 0],
    [1.4, 0],
    [1.78, 0.02],
    [1.86, 0.1],
  ]);
  torus(cap, M.heatEdge, 1.86, 0.02, 0.1, 72);
  lathe(
    cap,
    M.white,
    [
      [0.98, 2.9],
      [0.96, 3.0],
      [0.78, 3.45],
      [0.45, 3.75],
      [0, 3.8],
    ],
    56,
  );
  torus(cap, M.silver, 1.0, 0.03, 2.9, 56);
  torus(cap, M.grey, 0.42, 0.04, 3.74, 32);
  for (const y of [0.8, 1.55, 2.2]) seamRing(cap, M.seam, rBody, y, 0.008);
  for (let i = 0; i < 12; i++) {
    const k = i % 2;
    seamUp(cap, M.seam, rBody, (i / 12) * TAU + 0.13, 0.8 + k * 0.75, 1.55 + k * 0.65, 0.007);
  }
  // Four Draco quads in recessed pockets, an access hatch above each.
  for (let k = 0; k < 4; k++) {
    const yaw = Math.PI / 4 + (k * Math.PI) / 2;
    const f = onProfile(cap, rBody, 1.25, yaw);
    plate(f, M.whiteDim, 0.62, 0.62, 0.1, 0.05);
    plate(f, M.dark, 0.5, 0.5, 0.08, 0.056);
    for (const [dx, du] of [
      [-0.12, 0.12],
      [0.12, 0.12],
      [-0.12, -0.12],
      [0.12, -0.12],
    ]) {
      bell(f, M.grey, M.black, 0.065, 0.14, dx, -du);
    }
    const h = onProfile(cap, rBody, 1.95, yaw);
    plate(h, M.whiteDim, 0.5, 0.4, 0.05, 0.03);
    plate(h, M.seam, 0.54, 0.012, 0.004, 0.036);
  }
  // Side panels: the umbilical plate and the cargo-door outline on +z.
  {
    const f = onProfile(cap, rBody, 1.5, 0);
    plate(f, M.whiteDim, 0.9, 1.1, 0.12, 0.03);
    plate(f, M.seam, 0.94, 1.14, 0.13, 0.012, -0.002);
    for (let k = 0; k < 5; k++) box(f, M.grey, 0.04, 0.03, 0.04, -0.32 + k * 0.16, 0.04, 0.44);
  }
  for (const yaw of [Math.PI, Math.PI / 2, -Math.PI / 2]) {
    const f = onProfile(cap, rBody, 2.25, yaw);
    plate(f, M.silver, 0.2, 0.12, 0.03, 0.03);
  }
  return finish(g, 6.1);
}

// ---------------------------------------------------------------------------------------------
// Starliner
// ---------------------------------------------------------------------------------------------

/**
 * Boeing Starliner CST-100: what reads as Starliner is the broad, low conical crew module (white
 * silver skin with its blue stripes, the NASA roundel, black thruster doors, the dark shoulder
 * band, the domed forward cover) on the squat service module: white drum with silver foil
 * patches, four doghouse thruster pods at the diagonals and four launch-abort engines on the axes.
 */
function buildStarliner(): THREE.Group {
  const M = baseMats();
  M.foil = mat(0xc8cacd, 0.6, 0.35, true);
  M.shoulder = mat(0x24211f, 0, 0.8);
  const g = new THREE.Group();
  const SM = 2.0;

  const sm = grp(g, 'service-module');
  const sR = 2.2;
  cyl(sm, M.white, sR, sR, 0.05, 1.7, 56);
  cyl(sm, M.silver, sR + 0.03, sR + 0.03, 0, 0.14, 56);
  lathe(
    sm,
    M.silver,
    [
      [sR, 1.7],
      [sR + 0.08, 1.78],
      [2.28, 1.82],
      [2.28, 2.0],
      [2.2, 2.0],
    ],
    56,
  );
  lathe(sm, M.dark, [
    [0, 0],
    [1.9, 0],
    [2.2, 0.02],
  ]);
  const sRf = (): number => sR;
  for (const y of [0.55, 1.2]) seamRing(sm, M.seam, sRf, y, 0.01);
  for (let k = 0; k < 4; k++) {
    // Foil patches between the pods.
    const a = (k * Math.PI) / 2 + 0.28;
    foilBand(sm, M.foil, sR + 0.012, 0.2, 1.62, a, Math.PI / 2 - 0.56, 0.014);
  }
  for (let k = 0; k < 4; k++) {
    // Doghouse: a boxed pod with a row of thruster bells and its door seam.
    const yaw = Math.PI / 4 + (k * Math.PI) / 2;
    const f = onProfile(sm, sRf, 0.95, yaw);
    plate(f, M.whiteDim, 0.85, 0.95, 0.06, 0.22);
    plate(f, M.seam, 0.9, 1.0, 0.07, 0.012, -0.002);
    plate(f, M.dark, 0.6, 0.45, 0.04, 0.23, 0, 0, 0.2);
    for (const dx of [-0.2, -0.1, 0, 0.1, 0.2]) bell(f, M.grey, M.black, 0.04, 0.1, dx, -0.22);
    for (const dx of [-0.15, 0.15]) bell(f, M.grey, M.black, 0.05, 0.12, dx, 0.18);
  }
  for (let k = 0; k < 4; k++) {
    // Launch-abort engine: a canted nozzle on the axis, its cradle behind.
    const yaw = (k * Math.PI) / 2;
    const f = onProfile(sm, sRf, 0.95, yaw);
    plate(f, M.whiteDim, 0.5, 0.7, 0.06, 0.1);
    bell(f, M.gold, M.black, 0.22, 0.42, 0, 0.0);
  }

  const dm = grp(g, 'descent-module');
  const cm = grp(dm);
  cm.position.y = SM;
  const body: [number, number][] = [
    [2.0, 0],
    [2.28, 0.1],
    [2.28, 0.3],
    [2.2, 0.5],
    [1.7, 1.5],
    [1.3, 2.2],
    [0.95, 2.62],
  ];
  const rBody = profileFn(body);
  lathe(cm, M.silver, [[0, 0], ...body], 72);
  // Dark TPS shoulder band, white cone sheathing above it.
  lathe(
    cm,
    M.shoulder,
    [
      [2.0, -0.003],
      [2.285, 0.1],
      [2.285, 0.3],
      [2.21, 0.5],
      [2.12, 0.62],
      [2.2, 0.62],
      [2.29, 0.3],
      [2.29, 0.1],
    ],
    72,
  );
  lathe(
    cm,
    M.white,
    [0.62, 0.95, 1.5, 1.85, 2.2, 2.4, 2.62].map((y): [number, number] => [rBody(y) + 0.014, y]),
  );
  const rSk = (y: number): number => rBody(y) + 0.014;
  for (const y of [0.9, 1.4, 1.95]) seamRing(cm, M.seam, rSk, y, 0.009);
  for (let i = 0; i < 16; i++) {
    const k = i % 2;
    seamUp(cm, M.seam, rSk, (i / 16) * TAU + 0.1, 0.9 + k * 0.5, 1.4 + k * 0.55, 0.007);
  }
  // Forward dome and the docking hatch cover on it.
  lathe(
    cm,
    M.silver,
    [
      [0.95, 2.62],
      [0.9, 2.7],
      [0.72, 2.84],
      [0.45, 2.96],
      [0.0, 3.03],
    ],
    56,
  );
  cyl(cm, M.black, 0.97, 0.97, 2.6, 2.68, 56);
  torus(cm, M.grey, 0.46, 0.035, 2.96, 40);
  cyl(cm, M.dark, 0.35, 0.35, 2.99, 3.03, 32);
  // Blue stripes, windows, roundel, thruster doors.
  for (let k = 0; k < 8; k++) {
    const f = onProfile(cm, rSk, 1.2, (k * TAU) / 8 + 0.2);
    plate(f, M.blue, 0.13, 0.9, 0.02, 0.014);
  }
  for (const yaw of [0.34, -0.34]) {
    window(onProfile(cm, rSk, 1.95, yaw), M, 0.26, 0.26, 0.08);
  }
  {
    const f = onProfile(cm, rSk, 1.75, Math.PI);
    plate(f, M.whiteDim, 0.9, 0.9, 0.1, 0.03);
    plate(f, M.seam, 0.94, 0.94, 0.11, 0.012, -0.002);
  }
  {
    const f = onProfile(cm, rSk, 1.05, 0.85);
    plate(f, M.blue, 0.45, 0.45, 0.225, 0.03);
    plate(f, M.white, 0.3, 0.1, 0.03, 0.036);
  }
  for (let k = 0; k < 4; k++) {
    const f = onProfile(cm, rSk, 2.05, Math.PI / 4 + (k * Math.PI) / 2);
    plate(f, M.black, 0.34, 0.22, 0.04, 0.03);
    for (const dx of [-0.07, 0.07]) {
      bell(f, M.grey, M.black, 0.045, 0.07, dx, 0);
    }
  }
  return finish(g, 5.03);
}

// ---------------------------------------------------------------------------------------------
// Gaganyaan
// ---------------------------------------------------------------------------------------------

/**
 * Gaganyaan: what reads as Gaganyaan is the crew module, a blunt cone with a rounded shoulder, a
 * white skin panelled in copper-brown tape (a grid of fat seams), the trapezoid hatch with its
 * round porthole flanked by two more, the little cap and nose on top; under it the service
 * module, a drum wrapped in crinkled gold foil with silver tape, the flared skirt with three
 * engine bells and the two cell wings on arms.
 */
function buildGaganyaan(): THREE.Group {
  const M = baseMats();
  M.foilGold = mat(0xc99a3a, 0.55, 0.4, true);
  M.tape = mat(0xc0c3c8, 0.55, 0.35);
  const g = new THREE.Group();
  const SM = 2.0;

  const sm = grp(g, 'service-module');
  const sR = 1.68;
  blanket(
    sm,
    M.foilGold,
    [
      [sR, 0.4],
      [sR, SM - 0.12],
    ],
    0.02,
    36,
    0.2,
  );
  cyl(sm, M.grey, 1.05, sR + 0.03, 0.0, 0.4, 48);
  cyl(sm, M.silver, sR + 0.03, sR + 0.03, SM - 0.14, SM, 48);
  lathe(sm, M.dark, [
    [0.2, 0.02],
    [1.05, 0.02],
  ]);
  for (const y of [0.9, 1.45]) torus(sm, M.tape, sR + 0.03, 0.012, y, 56);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    strut(sm, M.tape, pol(sR + 0.03, a, 0.4), pol(sR + 0.03, a, SM - 0.14), 0.01, 4);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3 + Math.PI / 6;
    const f = new THREE.Group();
    f.position.copy(pol(0.58, a, 0));
    sm.add(f);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.62, 20, 1, true), M.grey);
    n.position.y = 0.31;
    f.add(n);
    cyl(f, M.dark, 0.12, 0.12, 0.6, 0.8, 16);
  }
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const f = onProfile(sm, () => sR + 0.03, SM - 0.5, a);
    plate(f, M.dark, 0.42, 0.3, 0.05, 0.05);
    for (const dx of [-0.1, 0.1]) bell(f, M.grey, M.black, 0.05, 0.1, dx, 0);
  }
  // Two wings: arm, hinge block, two panels each.
  for (const side of [-1, 1]) {
    const wing = grp(sm);
    wing.userData.solarArray = true;
    box(wing, M.silver, 0.3, 0.5, 0.6, side * (sR + 0.1), 1.35, 0);
    strut(
      wing,
      M.silver,
      new THREE.Vector3(side * (sR + 0.1), 1.35, -0.12),
      new THREE.Vector3(side * (sR + 3.1), 1.35, -0.12),
      0.035,
      6,
    );
    for (let s = 0; s < 2; s++) {
      const pnl = cellPanel(M, 1.4, 2.4, 8, 12);
      pnl.rotation.x = Math.PI / 2;
      pnl.position.set(side * (sR + 0.9 + s * 1.5), 1.35, 0.0);
      wing.add(pnl);
    }
  }

  const dm = grp(g, 'descent-module');
  const cm = grp(dm);
  cm.position.y = SM;
  const body: [number, number][] = [
    [1.6, 0],
    [1.72, 0.1],
    [1.75, 0.35],
    [1.3, 1.5],
    [0.98, 2.4],
    [0.82, 2.95],
    [0.72, 3.3],
  ];
  const rBody = profileFn(body);
  lathe(cm, M.white, [[0, 0], ...body], 72);
  lathe(cm, M.heat, [
    [0, -0.003],
    [1.3, -0.003],
    [1.6, 0],
    [1.72, 0.1],
  ]);
  lathe(
    cm,
    M.white,
    [
      [0.72, 3.3],
      [0.62, 3.44],
      [0.5, 3.5],
      [0.2, 3.52],
      [0, 3.58],
    ],
    48,
  );
  torus(cm, M.silver, 0.7, 0.03, 3.3, 48);
  // Tape grid: copper-brown seams in rings and staggered runs.
  const ringYs = [0.7, 1.2, 1.7, 2.3, 2.8];
  for (const y of ringYs) seamRing(cm, M.copper, rBody, y, 0.014, 0.006);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + 0.12;
    for (let j = 0; j < ringYs.length - 1; j++) {
      if ((i + j) % 2 === 0) seamUp(cm, M.copper, rBody, a, ringYs[j], ringYs[j + 1], 0.012, 0.006);
    }
  }
  seamRing(cm, M.copper, rBody, 0.3, 0.014, 0.006);
  // Hatch, two portholes, and the rim vents.
  {
    const f = onProfile(cm, rBody, 1.55, 0);
    plate(f, M.copper, 1.0, 1.1, 0.12, 0.03);
    plate(f, M.white, 0.88, 0.98, 0.1, 0.045);
    window(f, M, 0.26, 0.26, 0.13, 0, 0, 0.045);
    box(f, M.copper, 0.5, 0.045, 0.012, 0, 0.0, 0.0);
  }
  for (const yaw of [0.62, -0.62]) {
    const f = onProfile(cm, rBody, 1.55, yaw);
    plate(f, M.copper, 0.34, 0.34, 0.17, 0.03);
    plate(f, M.glass, 0.22, 0.22, 0.11, 0.04);
  }
  for (let k = 0; k < 8; k++) {
    const f = onProfile(cm, rBody, 0.45, (k * TAU) / 8 + 0.2);
    plate(f, M.dark, 0.1, 0.1, 0.05, 0.02);
  }
  for (let k = 0; k < 4; k++) {
    const f = onProfile(cm, rBody, 2.7, (k * Math.PI) / 2 + Math.PI / 4);
    plate(f, M.dark, 0.2, 0.14, 0.04, 0.02);
  }
  return finish(g, 5.58);
}

// ---------------------------------------------------------------------------------------------
// Mengzhou
// ---------------------------------------------------------------------------------------------

/**
 * Mengzhou, lunar configuration: what reads as Mengzhou is the grey-silver conical crew module
 * with its red band and the two raised ridges on the top rim, over a white band; the plain white
 * service-module drum below it, narrower than the module, with gold thruster frames on its
 * flank, two long cell wings, and four big engine bells under a tapered skirt.
 */
function buildMengzhou(): THREE.Group {
  const M = baseMats();
  M.cmGrey = mat(0xb4b6b8, 0.4, 0.5);
  M.red = mat(0xb8291f, 0, 0.5);
  M.thrFrame = mat(0xc9a03e, 0.45, 0.45);
  const g = new THREE.Group();

  const sm = grp(g, 'service-module');
  const sR = 1.62;
  const smProfile: [number, number][] = [
    [0.95, 0.95],
    [1.35, 1.5],
    [sR, 2.2],
    [sR, 4.85],
    [1.8, 5.1],
    [2.25, 5.55],
  ];
  const rSm = profileFn(smProfile);
  lathe(sm, M.white, smProfile, 64);
  lathe(sm, M.dark, [
    [0.0, 0.95],
    [0.95, 0.95],
  ]);
  for (const y of [1.2, 3.0, 4.5]) seamRing(sm, M.seam, rSm, y, 0.01);
  for (let i = 0; i < 12; i++) seamUp(sm, M.seam, rSm, (i / 12) * TAU + 0.1, 2.2, 4.85, 0.007);
  for (let i = 0; i < 6; i++) seamUp(sm, M.seam, rSm, (i / 6) * TAU + 0.2, 0.95, 2.2, 0.007);
  torus(sm, M.silver, 1.62, 0.03, 2.2, 56);
  // Engine bells: four large, under the skirt (their tips on y = 0).
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const f = new THREE.Group();
    f.position.copy(pol(0.62, a, 0));
    sm.add(f);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.5, 1.15, 28, 1, true), M.grey);
    n.position.y = 0.575;
    f.add(n);
    cyl(f, M.dark, 0.22, 0.22, 1.0, 1.15, 20);
    torus(f, M.silver, 0.5, 0.02, 0.0, 28);
  }
  // Gold thruster frames: a box truss with a nest of bells, four on the flank.
  for (let k = 0; k < 4; k++) {
    const yaw = Math.PI / 4 + (k * Math.PI) / 2 + (k % 2 ? 0.1 : -0.1);
    const f = onProfile(sm, rSm, 3.3, yaw);
    plate(f, M.thrFrame, 0.7, 0.6, 0.04, 0.2);
    plate(f, M.dark, 0.56, 0.46, 0.03, 0.21);
    for (const [dx, du] of [
      [-0.18, 0.1],
      [0.18, 0.1],
      [-0.18, -0.12],
      [0.18, -0.12],
    ]) {
      bell(f, M.grey, M.black, 0.055, 0.14, dx, -du);
    }
  }
  // Two wings on short masts: four panels each.
  for (const side of [-1, 1]) {
    const wing = grp(sm);
    wing.userData.solarArray = true;
    box(wing, M.silver, 0.3, 0.55, 0.65, side * (sR + 0.12), 3.7, 0);
    strut(
      wing,
      M.silver,
      new THREE.Vector3(side * (sR + 0.1), 3.7, -0.14),
      new THREE.Vector3(side * (sR + 7.2), 3.7, -0.14),
      0.04,
      6,
    );
    for (let s = 0; s < 4; s++) {
      const pnl = cellPanel(M, 1.7, 2.6, 8, 12);
      pnl.rotation.x = Math.PI / 2;
      pnl.position.set(side * (sR + 1.1 + s * 1.76), 3.7, 0);
      wing.add(pnl);
    }
  }

  const dm = grp(g, 'descent-module');
  const cm = grp(dm);
  const Y0 = 5.55;
  const body: [number, number][] = [
    [2.25, Y0],
    [2.25, 5.95],
    [2.2, 6.0],
    [1.65, 7.3],
    [1.25, 8.2],
    [1.05, 8.62],
    [0.95, 8.8],
  ];
  const rCm = profileFn(body);
  lathe(cm, M.cmGrey, [...body].slice(2), 64);
  lathe(cm, M.white, body.slice(0, 3), 64);
  lathe(cm, M.cmGrey, [
    [0.95, 8.8],
    [0, 8.8],
  ]);
  torus(cm, M.red, 2.2, 0.025, 6.0, 64);
  for (const y of [6.7, 7.5]) seamRing(cm, M.seam, rCm, y, 0.01);
  for (let i = 0; i < 12; i++) {
    const k = i % 2;
    seamUp(cm, M.seam, rCm, (i / 12) * TAU + 0.12, 6.0 + k * 0.7, 6.7 + k * 0.8, 0.008);
  }
  // Hatch fairing: a bulged silver door on the +z flank.
  {
    const f = onProfile(cm, rCm, 6.5, 0);
    plate(f, M.silver, 0.55, 0.9, 0.08, 0.14);
    plate(f, M.seam, 0.6, 0.95, 0.09, 0.014, -0.002);
    plate(f, M.dark, 0.3, 0.18, 0.04, 0.15, 0, 0, -0.15);
  }
  // Two raised silver ridges on the top rim, the thruster holes below them and on the flank.
  for (const yaw of [Math.PI / 2, -Math.PI / 2]) {
    const f = onProfile(cm, rCm, 8.45, yaw);
    plate(f, M.silver, 0.5, 0.7, 0.1, 0.12);
    plate(f, M.seam, 0.54, 0.74, 0.1, 0.012, -0.002);
  }
  for (const [yaw, y] of [
    [0.9, 7.0],
    [-0.9, 7.0],
    [Math.PI - 0.7, 7.3],
    [Math.PI + 0.7, 7.3],
    [0.6, 8.0],
    [-0.6, 8.0],
  ]) {
    const f = onProfile(cm, rCm, y, yaw);
    for (const dx of [-0.07, 0.07]) plate(f, M.black, 0.1, 0.1, 0.05, 0.015, 0, dx, 0);
  }
  window(onProfile(cm, rCm, 7.7, 0.4), M, 0.2, 0.3, 0.08);
  window(onProfile(cm, rCm, 7.7, -0.4), M, 0.2, 0.3, 0.08);
  cyl(cm, M.dark, 0.34, 0.34, 8.78, 8.82, 28);
  return finish(g, 8.8);
}

// ---------------------------------------------------------------------------------------------
// Orion
// ---------------------------------------------------------------------------------------------

/**
 * Orion with the European Service Module, as on the SLS stack: what reads as Orion is the wide
 * crew-module cone (white tile panels, the crew hatch and four windows, thruster pods, the
 * domed forward-bay cover), its dark convex heat shield overhanging the crew-module adapter
 * (white blanketed collar); the ESM, a silver drum with its radiator plates, gold foil low down,
 * six thruster pods under the collar, the OMS-E bell and eight auxiliary engines on its floor;
 * the four X-wing arrays on masts; and below it the spacecraft adapter, the flared launch ring
 * with its three jettison seams.
 */
function buildOrion(): THREE.Group {
  const M = baseMats();
  M.shell = mat(0xdadbdc, 0.15, 0.5);
  M.rad = mat(0x8f959b, 0.4, 0.4);
  M.mli = mat(0xc89a3c, 0.5, 0.4, true);
  M.foil = mat(0xe4e2dc, 0.5, 0.4, true);
  M.cell = mat(0x201a1a, 0.1, 0.6);
  M.cellLine = mat(0xb0763a, 0.5, 0.4);
  M.frame = mat(0xc4b79a, 0.5, 0.4);
  const g = new THREE.Group();
  const ESM0 = 0.55;
  const ESM1 = 4.55;
  const eR = 2.05;

  const la = grp(g, 'launch-adapter');
  lathe(
    la,
    M.shell,
    [
      [2.52, 0],
      [2.52, 0.1],
      [2.3, 0.35],
      [2.08, ESM0],
    ],
    72,
  );
  lathe(
    la,
    M.whiteDim,
    [
      [2.08, ESM0],
      [2.3, 0.35],
      [2.5, 0.1],
      [2.5, 0.0],
    ],
    72,
  );
  torus(la, M.silver, 2.53, 0.04, 0.04, 72);
  torus(la, M.silver, 2.2, 0.025, 0.42, 72);
  const rLa = profileFn([
    [2.52, 0.1],
    [2.3, 0.35],
    [2.08, ESM0],
  ]);
  for (let k = 0; k < 3; k++) {
    const yaw = (k * TAU) / 3;
    seamUp(la, M.seam, rLa, yaw, 0.12, ESM0 - 0.02, 0.012, 0.01);
    for (const yawB of [yaw + 0.1, yaw - 0.1]) {
      for (let i = 0; i < 4; i++) {
        const f = onProfile(la, rLa, 0.14 + i * 0.09, yawB);
        box(f, M.grey, 0.05, 0.03, 0.05, 0, 0.02, 0);
      }
    }
  }

  const sm = grp(g, 'service-module');
  const eRf = (): number => eR;
  cyl(sm, M.shell, eR, eR, ESM0, ESM1 - 0.5, 56);
  foilBand(sm, M.mli, eR + 0.02, ESM0 + 0.02, ESM0 + 1.3, 0, TAU, 0.03);
  torus(sm, M.silver, eR + 0.04, 0.03, ESM0 + 1.3, 64);
  torus(sm, M.silver, eR + 0.04, 0.03, ESM0, 64);
  for (const y of [2.5, 3.5]) seamRing(sm, M.seam, eRf, y, 0.01, 0.006);
  for (let i = 0; i < 16; i++) {
    seamUp(sm, M.seam, eRf, (i / 16) * TAU + 0.07, ESM0 + 1.34, ESM1 - 0.5, 0.007, 0.006);
  }
  // Radiator plates and tank-bay doors between the wing masts.
  for (let k = 0; k < 4; k++) {
    const f = onProfile(sm, eRf, 2.9, (k * Math.PI) / 2);
    plate(f, M.rad, 1.45, 1.8, 0.04, 0.04);
    plate(f, M.seam, 1.5, 0.014, 0.004, 0.046, 0, 0, 0.4);
    plate(f, M.seam, 1.5, 0.014, 0.004, 0.046, 0, 0, -0.4);
    plate(f, M.rad, 0.5, 0.7, 0.04, 0.06, 0, 0.0, -1.15 + 0.2);
  }
  // Crew-module adapter: a blanketed collar with its spars.
  cyl(sm, M.shell, eR, eR - 0.1, ESM1 - 0.5, ESM1 - 0.0, 56);
  foilBand(sm, M.foil, eR - 0.04, ESM1 - 0.5, ESM1 + 0.45, 0, TAU, 0.03);
  torus(sm, M.silver, eR - 0.02, 0.035, ESM1 - 0.5, 64);
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3 + Math.PI / 6;
    strut(sm, M.silver, pol(eR - 0.1, a, ESM1 - 0.45), pol(1.55, a, ESM1 + 0.4), 0.05, 6);
  }
  // Thruster pods: six of four, under the collar.
  for (let k = 0; k < 6; k++) {
    const yaw = Math.PI / 6 + (k * Math.PI) / 3;
    const f = onProfile(sm, eRf, ESM1 - 0.9, yaw);
    plate(f, M.dark, 0.5, 0.42, 0.04, 0.14);
    plate(f, M.silver, 0.56, 0.48, 0.05, 0.1);
    for (const [dx, du] of [
      [-0.1, 0.08],
      [0.1, 0.08],
      [-0.1, -0.08],
      [0.1, -0.08],
    ]) {
      bell(f, M.grey, M.black, 0.045, 0.12, dx, -du);
    }
  }
  // The floor: the OMS-E bell, eight auxiliary engines, a dark ring of tank sumps.
  lathe(sm, M.dark, [
    [0.0, ESM0 + 0.001],
    [eR, ESM0 + 0.001],
  ]);
  const omse = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.46, 1.0, 32, 1, true), M.grey);
  omse.position.y = ESM0 + 0.0;
  sm.add(omse);
  cyl(sm, M.dark, 0.22, 0.22, ESM0 + 0.2, ESM0 + 0.5, 20);
  torus(sm, M.silver, 0.46, 0.02, ESM0 - 0.5, 32);
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + Math.PI / 8;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.32, 14, 1, true), M.grey);
    n.position.copy(pol(1.35, a, ESM0 - 0.1));
    sm.add(n);
  }
  // Four X-wing arrays on masts: three panels each, in the plane of the axis.
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const wing = grp(sm);
    wing.userData.solarArray = true;
    wing.rotation.y = a - Math.PI / 2;
    const y = ESM0 + 2.0;
    box(wing, M.silver, 0.45, 0.4, 0.34, eR + 0.1, y, 0);
    strut(
      wing,
      M.silver,
      new THREE.Vector3(eR + 0.05, y + 0.12, 0),
      new THREE.Vector3(eR + 0.75, y + 0.05, 0),
      0.05,
      6,
    );
    for (let s = 0; s < 3; s++) {
      const x = eR + 0.8 + 1.22 + s * 2.46;
      const pnl = cellPanel(M, 2.4, 1.9, 9, 7);
      pnl.rotation.x = Math.PI / 2;
      pnl.position.set(x, y, 0);
      wing.add(pnl);
      box(wing, M.silver, 0.1, 0.1, 0.1, x - 1.23, y, 0);
    }
  }

  const dm = grp(g, 'descent-module');
  const cm = grp(dm);
  cm.position.y = ESM1;
  const body: [number, number][] = [
    [2.51, 0.5],
    [2.52, 0.62],
    [2.45, 0.72],
    [0.82, 3.1],
    [0.74, 3.22],
  ];
  const rBody = profileFn(body);
  lathe(
    cm,
    M.shell,
    [
      [0.0, 0.0],
      [0.8, 0.04],
      [1.5, 0.16],
      [2.0, 0.3],
      [2.3, 0.4],
      [2.51, 0.5],
    ],
    72,
  );
  lathe(
    cm,
    M.heat,
    [
      [0.0, -0.004],
      [0.8, 0.036],
      [1.5, 0.156],
      [2.0, 0.296],
      [2.3, 0.396],
      [2.49, 0.49],
    ],
    72,
  );
  for (const r of [0.6, 1.2, 1.8, 2.3]) {
    torus(cm, M.heatEdge, r, 0.012, 0.04 + 0.12 * r * r * 0.35, 48);
  }
  lathe(cm, M.shell, body, 72);
  // Forward-bay cover: a short drum with a domed lid and the docking hatch ring.
  lathe(
    cm,
    M.white,
    [
      [0.74, 3.22],
      [0.74, 3.3],
      [0.6, 3.34],
      [0.3, 3.35],
      [0.0, 3.35],
    ],
    48,
  );
  torus(cm, M.silver, 0.76, 0.025, 3.22, 48);
  torus(cm, M.grey, 0.28, 0.03, 3.35, 32);
  cyl(cm, M.dark, 0.24, 0.24, 3.34, 3.37, 24);
  const rSk = (y: number): number => rBody(y) + 0.012;
  // Tile gaps.
  for (const y of [1.2, 1.9, 2.55]) seamRing(cm, M.seam, rBody, y, 0.01, 0.006);
  for (let i = 0; i < 24; i++) {
    const k = i % 2;
    seamUp(cm, M.seam, rBody, (i / 24) * TAU + 0.07, 0.72 + k * 0.5, 1.2 + k * 0.7, 0.007, 0.006);
  }
  for (let i = 0; i < 12; i++) {
    seamUp(cm, M.seam, rBody, (i / 12) * TAU + 0.14, 1.9, 2.55, 0.007, 0.006);
  }
  // Crew hatch (+z) and four windows.
  {
    const f = onProfile(cm, rSk, 1.45, 0);
    plate(f, M.whiteDim, 1.0, 1.05, 0.2, 0.03);
    plate(f, M.seam, 1.05, 1.1, 0.22, 0.014, -0.002);
    window(f, M, 0.3, 0.3, 0.1, 0, 0.18, 0.03);
    for (let k = 0; k < 6; k++) box(f, M.grey, 0.045, 0.03, 0.045, -0.4 + k * 0.16, 0.04, 0.5);
  }
  for (const yaw of [0.62, -0.62, Math.PI + 0.35, Math.PI - 0.35]) {
    window(onProfile(cm, rSk, 1.85, yaw), M, 0.3, 0.4, 0.1);
  }
  // Reaction-control pods and the aft-bay door.
  for (let k = 0; k < 4; k++) {
    const f = onProfile(cm, rSk, 1.0, Math.PI / 4 + (k * Math.PI) / 2 + 0.1);
    plate(f, M.dark, 0.4, 0.32, 0.04, 0.03);
    for (const dx of [-0.1, 0, 0.1]) bell(f, M.grey, M.black, 0.04, 0.08, dx, 0);
  }
  for (const yaw of [Math.PI / 2, -Math.PI / 2]) {
    const f = onProfile(cm, rSk, 2.7, yaw);
    plate(f, M.whiteDim, 0.5, 0.4, 0.05, 0.03);
    plate(f, M.dark, 0.2, 0.12, 0.04, 0.036);
  }
  return finish(g, 7.9);
}

// ---------------------------------------------------------------------------------------------
// New Shepard
// ---------------------------------------------------------------------------------------------

/**
 * New Shepard, the whole vehicle on the pad: what reads as New Shepard is the tall white booster
 * with its black engine skirt and single big BE-3 bell, the blue band and the wide ring fin
 * round its upper body, three wedge tail fins and four landing legs on pads; and the crew
 * capsule on top, a white dome with a blue band, six big rounded windows, the crew hatch and the
 * parachute cap. The capsule is the 'descent-module', the rest the 'booster'.
 */
function buildNewShepard(): THREE.Group {
  const M = baseMats();
  M.panel = mat(0xe4e5e6, 0.1, 0.5);
  const g = new THREE.Group();
  const TOP = 15.2;
  const BOT = 0.6;
  const R = 1.9;

  const bo = grp(g, 'booster');
  cyl(bo, M.white, R, R, BOT + 0.2, TOP - 0.5, 56);
  cyl(bo, M.black, R + 0.01, R + 0.01, BOT, BOT + 0.2, 56);
  const rB = (): number => R;
  for (let y = 2.2; y < TOP - 0.6; y += 2.4) seamRing(bo, M.seam, rB, y, 0.012, 0.005);
  cyl(bo, M.blue, R + 0.012, R + 0.012, TOP - 3.5, TOP - 2.5, 56);
  // Adapter shoulder to the capsule base ring.
  lathe(
    bo,
    M.white,
    [
      [R, TOP - 0.5],
      [1.82, TOP - 0.25],
      [1.7, TOP - 0.05],
    ],
    56,
  );
  // Engine: skirt cone, BE-3 bell, throat.
  lathe(bo, M.dark, [
    [1.2, BOT - 0.02],
    [0.7, BOT - 0.2],
  ]);
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.62, 1.0, 36, 1, true), M.grey);
  nz.position.y = BOT - 0.2;
  bo.add(nz);
  torus(bo, M.silver, 0.62, 0.025, BOT - 0.7, 36);
  cyl(bo, M.dark, 0.34, 0.34, BOT - 0.05, BOT + 0.25, 24);
  // Raceways: four vertical covers with end caps, and access plates.
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const a = pol(R + 0.03, th, 1.2);
    const b = pol(R + 0.03, th, TOP - 1.0);
    strut(bo, M.panel, a, b, 0.05, 6);
  }
  for (const [yaw, y] of [
    [0, 6.3],
    [Math.PI, 9.0],
    [Math.PI / 2, 4.2],
    [-Math.PI / 2, 11.2],
  ]) {
    const f = onProfile(bo, rB, y, yaw);
    plate(f, M.panel, 0.7, 0.9, 0.06, 0.03);
    plate(f, M.seam, 0.75, 0.014, 0.004, 0.036, 0, 0, 0.3);
    plate(f, M.seam, 0.75, 0.014, 0.004, 0.036, 0, 0, -0.3);
  }
  // Ring fin: a short open drum round the upper body, on four spokes.
  const ringY = TOP - 2.4;
  const ring = new THREE.Group();
  ring.position.y = ringY - 0.4;
  bo.add(ring);
  cyl(ring, M.white, 2.62, 2.62, 0, 1.3, 72, true);
  cyl(ring, M.whiteDim, 2.45, 2.45, 0, 1.3, 72, true);
  lathe(
    ring,
    M.white,
    [
      [2.45, 1.3],
      [2.62, 1.3],
    ],
    72,
  );
  lathe(
    ring,
    M.white,
    [
      [2.62, 0],
      [2.45, 0],
    ],
    72,
  );
  torus(ring, M.blue, 2.625, 0.04, 0.65, 72);
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    strut(bo, M.white, pol(R, th, ringY + 0.25), pol(2.5, th, ringY + 0.25), 0.06, 8);
    strut(bo, M.white, pol(R, th, ringY - 0.15), pol(2.5, th, ringY - 0.15), 0.05, 8);
  }
  // Three wedge tail fins.
  const wedge = new THREE.Shape();
  wedge.moveTo(0, 0);
  wedge.lineTo(1.1, 0);
  wedge.lineTo(0, 3.6);
  wedge.closePath();
  for (let k = 0; k < 3; k++) {
    const th = (k * TAU) / 3 + Math.PI / 6;
    const fin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wedge, { depth: 0.22, bevelEnabled: false }),
      M.white,
    );
    fin.position.set(R - 0.02, BOT + 0.2, -0.11);
    const holder = new THREE.Group();
    holder.rotation.y = Math.PI / 2 - th;
    holder.add(fin);
    bo.add(holder);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 3.0, 0.24), M.blue);
    stripe.position.set(R + 0.08, BOT + 1.9, 0);
    stripe.rotation.z = 0.28;
    holder.add(stripe);
  }
  // Four landing legs: upper strut, brace, foot pad.
  for (let k = 0; k < 4; k++) {
    const th = (k * Math.PI) / 2 + Math.PI / 4;
    const hip = pol(R, th, BOT + 2.6);
    const foot = pol(3.0, th, 0.1);
    strut(bo, M.silver, hip, foot, 0.09, 10);
    strut(bo, M.silver, pol(R, th, BOT + 0.5), foot.clone().lerp(hip, 0.15), 0.06, 8);
    box(bo, M.dark, 0.34, 0.2, 0.34, hip.x, hip.y, hip.z).rotation.y = th;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 20), M.dark);
    pad.position.set(foot.x, 0.06, foot.z);
    bo.add(pad);
  }

  const dm = grp(g, 'descent-module');
  const cap = grp(dm);
  cap.position.y = TOP;
  const body: [number, number][] = [
    [1.5, 0.02],
    [1.8, 0.12],
    [1.85, 0.4],
    [1.8, 1.3],
    [1.58, 2.2],
    [1.22, 3.0],
    [0.82, 3.55],
    [0.5, 3.85],
  ];
  const rC = profileFn(body);
  lathe(cap, M.white, [[0, 0.02], ...body, [0.0, 3.95]], 72);
  lathe(cap, M.dark, [
    [1.45, 0.02],
    [1.5, 0.02],
    [1.8, 0.12],
    [1.81, 0.22],
    [1.5, 0.12],
  ]);
  cyl(cap, M.blue, 1.862, 1.862, 0.45, 0.85, 72);
  torus(cap, M.silver, 0.5, 0.04, 3.85, 36);
  cyl(cap, M.grey, 0.34, 0.34, 3.9, 3.96, 28);
  for (const y of [1.2, 2.1, 2.9]) seamRing(cap, M.seam, rC, y, 0.01, 0.005);
  for (let i = 0; i < 12; i++)
    seamUp(cap, M.seam, rC, (i / 12) * TAU + 0.26, 0.9, 3.3, 0.008, 0.005);
  for (let k = 0; k < 6; k++) {
    const yaw = Math.PI / 6 + (k * Math.PI) / 3;
    const f = onProfile(cap, rC, 1.85, yaw);
    plate(f, M.silver, 0.98, 1.38, 0.28, 0.03);
    plate(f, M.glass, 0.86, 1.26, 0.24, 0.04);
  }
  {
    const f = onProfile(cap, rC, 1.75, 0);
    plate(f, M.whiteDim, 0.62, 0.95, 0.1, 0.04);
    plate(f, M.seam, 0.68, 1.0, 0.12, 0.014, -0.002);
    window(f, M, 0.18, 0.12, 0.04, 0, 0.18, 0.04);
  }
  return finish(g, 19.2);
}

// ─── Registry ────────────────────────────────────────────────────────────────────────────────

const WP = (page: string, what: string): ShowcaseRef => ({
  l: `Wikipedia, ${page.replace(/_/g, ' ')}: ${what}`,
  u: `https://en.wikipedia.org/wiki/${encodeURI(page)}`,
});
const WC = (file: string, what: string): ShowcaseRef => ({
  l: `Wikimedia Commons, ${file}: ${what}`,
  u: `https://commons.wikimedia.org/wiki/File:${encodeURI(file)}`,
});

const DRAGON2_REFS: ShowcaseRef[] = [
  WP('SpaceX_Dragon_2', 'capsule 4.5 m high, 4 m across, 8.1 m with the trunk'),
  WC('CCP SpaceX Demo-2 Dragon (3).jpg', 'Crew Dragon: hatch, windows, bays, heat shield'),
  WC('SpaceX CRS-15 Dragon docked to the ISS (4).jpg', 'Dragon 1 nose, Draco pockets, trunk'),
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'crew-dragon': {
    build: () => buildDragon2(true),
    heightM: 8.1,
    diameterM: 4,
    refs: DRAGON2_REFS,
  },
  'cargo-dragon-2': {
    build: () => buildDragon2(false),
    heightM: 8.1,
    diameterM: 4,
    refs: DRAGON2_REFS,
  },
  'cargo-dragon-v1': {
    build: buildDragon1,
    heightM: 6.1,
    diameterM: 3.7,
    refs: [
      WP(
        'SpaceX_Dragon_1',
        '6.1 m long, 3.7 m across, trunk 2.3 m; array span (two 3.2 m panels a side) estimate',
      ),
      WC('CRS-8 Dragon from ISS (ISS047E050943).jpg', 'two solar wings, trunk, nose'),
      WC('SpaceX CRS-15 Dragon docked to the ISS (4).jpg', 'capsule flank, Draco pockets'),
    ],
  },
  starliner: {
    build: buildStarliner,
    heightM: 5.03,
    diameterM: 4.56,
    refs: [
      WP(
        'Boeing_Starliner',
        '5.03 m capsule + service module, 4.56 m across; module split estimate',
      ),
      WC('Starliner Departs the Space Station.png', 'crew module, service module, doghouses'),
      WC('Calypso Starliner capsule postflight.jpg', 'crew module shoulder, panels, roundel'),
    ],
  },
  gaganyaan: {
    build: buildGaganyaan,
    heightM: 5.58,
    diameterM: 3.5,
    refs: [
      WP(
        'Gaganyaan',
        'crew module 3.5 m x 3.58 m; service module length, arrays and engines estimate',
      ),
      WC('Gaganyaan module infographic (cropped).jpg', 'module layout, hatch and portholes'),
      WC(
        'Dummy Gaganyaan Crew Module for TV-D1 abort test 01.jpg',
        'crew module shape and tape seams',
      ),
    ],
  },
  mengzhou: {
    build: buildMengzhou,
    heightM: 8.8,
    diameterM: 4.5,
    refs: [
      WP(
        'Mengzhou_(spacecraft)',
        '8.8 m lunar configuration, crew module 4.5 m; module split, wings and engines estimate',
      ),
      WC(
        'Chinese next-generation crewed spacecraft mockup - NMC.jpg',
        'module proportions, thruster frames, wing',
      ),
      WC('New Chinese Capsule 2.png', 'wing layout'),
    ],
  },
  orion: {
    build: buildOrion,
    heightM: 7.9,
    diameterM: 5.02,
    refs: [
      WP('Orion_(spacecraft)', 'crew module 5.02 m x 3.3 m'),
      WP(
        'European_Service_Module',
        '4 m long, 4.1 m, 4 wings x 7.375 m, 19 m deployed; wing width and adapter size estimate',
      ),
      {
        l: 'NASA Orion by the numbers (7.9 m overall)',
        u: 'https://www.nasa.gov/wp-content/uploads/2026/01/orion-by-the-numbers-2026b.pdf',
      },
      WC(
        'Orion Service Module elements 2015.jpg',
        'crew module, adapter collar, ESM, spacecraft adapter',
      ),
      WC('Artemis 1 - Orion and ESM approach Moon.jpg', 'ESM thrusters, collar, wing mast'),
    ],
  },
  'new-shepard': {
    build: buildNewShepard,
    heightM: 19.2,
    diameterM: 3.8,
    refs: [
      WP(
        'New_Shepard',
        '19.2 m whole vehicle, booster 3.8 m, 6 windows; booster/capsule split estimate',
      ),
      WC('New Shepard capsule 01 (cropped).jpg', 'capsule dome, hatch, large windows'),
      WC('New Shepard spacecraft.jpg', 'capsule outline'),
    ],
  },
};
