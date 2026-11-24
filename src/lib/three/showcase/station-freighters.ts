/**
 * Showcase models: station freighters (Cygnus, HTV, HTV-X, ATV, Tianzhou) and the Shenzhou and
 * Apollo CSM crewed craft, built to the bar of the Apollo LM: crinkled foil and tape seams on
 * every blanketed surface, panel lines, thruster pods, docking systems, cell-gridded arrays.
 * Each stands as on its launcher: engine / service end down (y = 0), docking end up, front
 * facing +z, solar arrays deployed at their real span in the x-y plane.
 *
 * Crewed craft carry named groups for the descent scenes: Shenzhou 'orbital-module',
 * 'descent-module' (the re-entry module), 'service-module'; the Apollo CSM 'descent-module' (holding
 * the 'command-module'), 'service-module', 'sps-engine' and the named anchors listed on
 * `buildApolloCsm`. The CSM apex (the docking probe) stays the highest point
 * and on the axis: `dockedApolloCsm` flips it nose-down onto the LM's drogue.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, lathe, mat, strut, type Mat } from './kit';
import { buildSimBay, type SimBayOptions } from './apollo-sim-bay';

type Mats = Record<string, Mat>;
const TAU = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const pol = (r: number, a: number, y: number): THREE.Vector3 =>
  new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));

function grp(parent: THREE.Object3D, name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

/** Cylinder / frustum between y0 (radius r0) and y1 (radius r1). */
function cyl(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  seg = 48,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

/** A curved panel: an azimuth arc a0..a1 of a frustum (r0 at y0, r1 at y1); 0 = +z. */
function sector(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  a0: number,
  a1: number,
  seg = 6,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, true, a0, a1 - a0),
    m,
  );
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

function torus(g: THREE.Object3D, m: Mat, R: number, r: number, y: number, seg = 56): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 6, seg), m);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  return add(g, t);
}

/** A crinkled thermal-blanket skin: a lathe of `pts` (r, y), densified, every vertex nudged. */
function blanket(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  amp: number,
  seg = 44,
  step = 0.2,
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

/** A crinkled foil drum between y0 and y1 (radius r0 to r1). */
function foilDrum(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  amp: number,
  seg = 44,
): THREE.Mesh {
  return blanket(
    g,
    m,
    [
      [r0, y0],
      [r1, y1],
    ],
    amp,
    seg,
    0.18,
  );
}

/** Vertical tape straps over a drum of radius r between y0 and y1. */
function straps(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  y0: number,
  y1: number,
  n: number,
  w = 0.05,
  a0 = 0,
  r1 = r,
): void {
  const m1 = (y0 + y1) / 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    const rm = (r + r1) / 2 + 0.006;
    const b = box(g, m, w, Math.hypot(y1 - y0, r1 - r), 0.012, 0, 0, 0);
    b.position.copy(pol(rm, a, m1));
    b.rotation.order = 'YXZ';
    b.rotation.y = a;
    b.rotation.x = Math.atan2(r - r1, y1 - y0);
  }
}

/** A frame at `pos` whose local +y is `normal`. */
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

/** A frame on a surface of revolution r(y) at height y and azimuth yaw, local +y outward. */
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

/** Engine bell with its throat at `pos`, opening along `dir` (unit); exit radius r, length len. */
function bell(
  g: THREE.Object3D,
  m: Mat,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
  len: number,
): void {
  const f = new THREE.Group();
  f.position.copy(pos);
  f.quaternion.setFromUnitVectors(Y_AXIS, dir.clone().normalize());
  g.add(f);
  lathe(
    f,
    m,
    [
      [r * 0.3, 0],
      [r * 0.36, len * 0.18],
      [r * 0.55, len * 0.55],
      [r * 0.8, len * 0.85],
      [r, len],
    ],
    24,
  );
  torus(f, m, r * 0.98, r * 0.04, len, 24);
}

/** Thruster pod: a block on the hull at azimuth a, height y, four nozzles on its corners. */
function pod(
  g: THREE.Object3D,
  podMat: Mat,
  noz: Mat,
  radius: number,
  y: number,
  a: number,
  w: number,
  h: number,
  d: number,
): void {
  const f = add(g, new THREE.Group());
  f.rotation.y = a;
  box(f, podMat, w, h, d, 0, y, radius + d / 2 - 0.02);
  box(f, noz, w * 0.7, h * 0.12, 0.02, 0, y, radius + d + 0.0);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      bell(
        f,
        noz,
        new THREE.Vector3(sx * w * 0.32, y + sy * h * 0.3, radius + d + 0.01),
        new THREE.Vector3(sx * 0.6, sy * 0.4, 0.7),
        0.06,
        0.12,
      );
    }
  }
}

function boltRing(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  y: number,
  n: number,
  size: number,
  a0 = 0,
): void {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    const b = box(g, m, size, size * 0.8, size, 0, y, 0);
    b.position.copy(pol(r, a, y));
    b.rotation.y = a;
  }
}

function mats(): Mats {
  return {
    white: mat(0xe8e6e0, 0.35, 0.55),
    alu: mat(0xc4c7cb, 0.75, 0.4),
    aluDark: mat(0x9a9ea4, 0.75, 0.45),
    silver: mat(0xcfd2d6, 0.7, 0.35),
    rib: mat(0x8f9399, 0.75, 0.45),
    foilWhite: mat(0xe4e3de, 0.35, 0.55, true),
    foilSilver: mat(0xc9ccd0, 0.7, 0.4, true),
    foilGold: mat(0xc39b3f, 0.6, 0.45, true),
    dark: mat(0x1c1d22, 0.4, 0.6),
    nozzle: mat(0x3b3834, 0.6, 0.5, true),
    nozzleSmooth: mat(0x3b3834, 0.6, 0.5),
    glass: mat(0x0a0e16, 0.9, 0.12),
    cell: mat(0x182a58, 0.6, 0.3),
    cellBrown: mat(0x2e2220, 0.6, 0.35),
    line: mat(0xc9a64a, 0.7, 0.35),
    frame: mat(0xb9bcc2, 0.5, 0.45),
    copper: mat(0xc4733a, 0.7, 0.4),
    orange: mat(0xd88a2c, 0.6, 0.45),
  };
}

// ---------------------------------------------------------------------------------------------
// Solar arrays
// ---------------------------------------------------------------------------------------------

function mergedBoxes(
  parts: [number, number, number, number, number, number][],
): THREE.BufferGeometry {
  const geos = parts.map(([w, h, d, x, y, z]) => {
    const b = new THREE.BoxGeometry(w, h, d);
    b.translate(x, y, z);
    return b;
  });
  return mergeGeometries(geos, false);
}

/** A cell field w x h at (cx, cy): the cell plate and its grid of bus lines, both faces. */
function cellPlate(
  parent: THREE.Object3D,
  cell: Mat,
  line: Mat,
  cx: number,
  cy: number,
  w: number,
  h: number,
  pitchX: number,
  pitchY: number,
): void {
  box(parent, cell, w, h, 0.055, cx, cy, 0);
  const parts: [number, number, number, number, number, number][] = [];
  const cols = Math.max(1, Math.round(w / pitchX));
  const rows = Math.max(1, Math.round(h / pitchY));
  for (let c = 1; c < cols; c++) parts.push([0.008, h, 0.062, cx - w / 2 + (w * c) / cols, cy, 0]);
  for (let r = 1; r < rows; r++) parts.push([w, 0.008, 0.062, cx, cy - h / 2 + (h * r) / rows, 0]);
  if (parts.length) add(parent, new THREE.Mesh(mergedBoxes(parts), line));
}

/**
 * Folded-array style wing: `n` rectangular panels in a row along +x from x0, in the plane
 * normal to z (flat face toward +z), `width` tall, centred on y, rotated `angle` about y.
 */
function wing(
  parent: THREE.Object3D,
  M: Mats,
  x0: number,
  y: number,
  len: number,
  width: number,
  n: number,
  angle = 0,
  cell: Mat = M.cell,
  frame: Mat = M.frame,
  pitch = 0.34,
): THREE.Group {
  const w = add(parent, new THREE.Group());
  w.position.y = y;
  w.rotation.y = angle;
  const gap = 0.05;
  const seg = (len - (n - 1) * gap) / n;
  box(w, M.aluDark, x0 + 0.1, 0.09, 0.09, (x0 + 0.1) / 2 - 0.05, 0, 0);
  box(w, M.silver, 0.2, 0.34, 0.2, x0 - 0.02, 0, 0);
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (seg + gap) + seg / 2;
    box(w, frame, seg, width, 0.04, cx, 0, 0);
    cellPlate(w, cell, M.line, cx, 0, seg - 0.1, width - 0.1, pitch, pitch * 1.2);
    if (i > 0) box(w, M.silver, 0.05, width + 0.04, 0.07, cx - seg / 2 - gap / 2, 0, 0);
  }
  for (const s of [-1, 1]) box(w, M.silver, len, 0.04, 0.06, x0 + len / 2, (s * width) / 2, 0);
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  w.userData.solarArray = true;
  return w;
}

/** Round fan array (UltraFlex): a decagon with a wedge missing toward the body, radial gores. */
function fan(parent: THREE.Object3D, M: Mats, hubX: number, y: number, R: number, side: 1 | -1) {
  const wedge = 0.5;
  const g = add(parent, new THREE.Group());
  g.position.set(hubX * side, y, 0);
  g.userData.solarArray = true;
  const start = side === 1 ? Math.PI + wedge / 2 : wedge / 2;
  const theta = TAU - wedge;
  const n = 10;
  const back = new THREE.Mesh(new THREE.CircleGeometry(R, n, start, theta), M.foilGold);
  back.position.z = -0.01;
  g.add(back);
  // dark cell fields, one per gore, inset from the gold gore borders
  const cellGeos: THREE.BufferGeometry[] = [];
  const lineParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = start + (theta * i) / n;
    const a1 = start + (theta * (i + 1)) / n;
    const am = (a0 + a1) / 2;
    const half = (a1 - a0) / 2;
    const rIn = R * 0.12;
    const rOut = R * 0.965;
    const k = 0.82;
    const pts: [number, number][] = [
      [rIn, am - half * k],
      [rOut, am - half * k * 0.9],
      [rOut, am + half * k * 0.9],
      [rIn, am + half * k],
    ];
    const sh = new THREE.Shape(
      pts.map(([r, a]) => new THREE.Vector2(r * Math.cos(a), r * Math.sin(a))),
    );
    const geo = new THREE.ShapeGeometry(sh);
    geo.translate(0, 0, 0.004);
    cellGeos.push(geo);
    // cell rows across the gore
    for (let rr = 1; rr < 11; rr++) {
      const r = rIn + ((rOut - rIn) * rr) / 11;
      const hw = r * Math.tan(half * k * 0.95);
      const b = new THREE.BoxGeometry(0.008, hw * 1.8, 0.01);
      b.rotateZ(am);
      b.translate(Math.cos(am) * r, Math.sin(am) * r, 0.007);
      lineParts.push(b);
    }
  }
  g.add(new THREE.Mesh(mergeGeometries(cellGeos, false), M.cell));
  g.add(new THREE.Mesh(mergeGeometries(lineParts, false), M.line));
  for (let i = 0; i <= n; i++) {
    const a = start + (theta * i) / n;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(R, 0.03, 0.02), M.silver);
    rib.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0.008);
    rib.rotation.z = a;
    g.add(rib);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 4, n, theta), M.silver);
  rim.rotation.z = start;
  rim.position.z = 0.004;
  g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 20), M.silver);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  box(parent, M.aluDark, hubX - 1.4, 0.1, 0.1, (side * (hubX + 1.4)) / 2, y, 0);
}

/** A curved cell patch on a drum of radius r (azimuth a0..a1, heights y0..y1) with its grid. */
function cellPatch(
  g: THREE.Object3D,
  M: Mats,
  cell: Mat,
  r: number,
  y0: number,
  y1: number,
  a0: number,
  a1: number,
  cols: number,
  rows: number,
  lift = 0.012,
): void {
  sector(g, cell, r + lift, r + lift, y0, y1, a0, a1, Math.max(6, Math.round((a1 - a0) * 8)));
  for (let c = 0; c <= cols; c++) {
    const a = a0 + ((a1 - a0) * c) / cols;
    const b = box(g, M.line, 0.012, y1 - y0, 0.012, 0, (y0 + y1) / 2, 0);
    b.position.copy(pol(r + lift + 0.004, a, (y0 + y1) / 2));
    b.rotation.y = a;
  }
  for (let rr = 0; rr <= rows; rr++) {
    const y = y0 + ((y1 - y0) * rr) / rows;
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(
        r + lift + 0.004,
        0.005,
        4,
        Math.max(6, Math.round((a1 - a0) * 8)),
        a1 - a0,
      ),
      M.line,
    );
    t.rotation.x = Math.PI / 2;
    t.rotation.z = Math.PI / 2 - a1;
    t.position.y = y;
    g.add(t);
  }
}

/** Berthing ring (CBM / HTV and Cygnus top): raised collar, bolts, latches and a hatch. */
function berthRing(g: THREE.Object3D, y: number, r: number, M: Mats, collar: Mat): void {
  cyl(g, collar, r, r, y, y + 0.22);
  cyl(g, M.dark, r - 0.04, r - 0.04, y + 0.2, y + 0.225, 48);
  torus(g, M.rib, r - 0.02, 0.025, y + 0.225, 48);
  boltRing(g, M.dark, r - 0.1, y + 0.23, 16, 0.07);
  cyl(g, M.aluDark, r - 0.28, r - 0.28, y + 0.21, y + 0.235, 40);
  // four capture latches in the seat
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const l = box(g, M.silver, 0.18, 0.05, 0.12, 0, y + 0.24, 0);
    l.position.copy(pol(r - 0.18, a, y + 0.24));
    l.rotation.y = a;
  }
  box(g, M.rib, r * 1.0, 0.025, 0.05, 0, y + 0.245, 0);
}

/** A band of body-mounted rectangular panel pockets with straps: the isogrid look. */
function pocketPanels(
  g: THREE.Object3D,
  M: Mats,
  r: number,
  y0: number,
  y1: number,
  rows: number,
  cols: number,
  face: Mat,
  pocket: Mat,
): void {
  const rowH = (y1 - y0) / rows;
  for (let rr = 0; rr < rows; rr++) {
    for (let c = 0; c < cols; c++) {
      const a0 = (c / cols) * TAU;
      const a1 = ((c + 1) / cols) * TAU;
      const m = 0.045;
      sector(
        g,
        face,
        r + 0.01,
        r + 0.01,
        y0 + rr * rowH + 0.04,
        y0 + (rr + 1) * rowH - 0.04,
        a0 + m,
        a1 - m,
        5,
      );
      sector(
        g,
        pocket,
        r + 0.02,
        r + 0.02,
        y0 + rr * rowH + 0.15,
        y0 + (rr + 1) * rowH - 0.15,
        a0 + 0.17,
        a1 - 0.17,
        5,
      );
    }
  }
  for (let rr = 0; rr <= rows; rr++) torus(g, M.rib, r + 0.015, 0.035, y0 + rr * rowH, 64);
  for (let c = 0; c < cols; c++) {
    const a = (c / cols) * TAU;
    const b = box(g, M.rib, 0.1, y1 - y0, 0.04, 0, (y0 + y1) / 2, 0);
    b.position.copy(pol(r + 0.02, a, (y0 + y1) / 2));
    b.rotation.y = a;
  }
}

// ---------------------------------------------------------------------------------------------
// Cygnus
// ---------------------------------------------------------------------------------------------

/**
 * Cygnus: the bare-aluminium pressurised cargo module in rows of raised, pocketed panels between
 * vertical straps, the common-berthing collar on its conic shoulder, and below it the service
 * module (a gold-and-silver blanketed drum on a strut truss with the equipment boxes, the four
 * thruster pods and the main engine in its aft dish). Standard carries flat rectangular wings,
 * Enhanced the round UltraFlex decagons; only the cargo module's length differs.
 */
function buildCygnus(totalH: number, fanArrays: boolean): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const R = 1.535;
  const smH = 2.49;
  const pcmTop = totalH - 0.59;

  const sm = grp(g, 'service-module');
  // aft dish and the main engine
  lathe(
    sm,
    M.foilSilver,
    [
      [0, 0.4],
      [R - 0.18, 0.4],
      [R - 0.06, 0.52],
    ],
    48,
  );
  lathe(sm, M.alu, [
    [0.0, 0.46],
    [0.62, 0.43],
    [0.62, 0.4],
    [0.0, 0.4],
  ]);
  bell(sm, M.nozzle, new THREE.Vector3(0, 0.46, 0), new THREE.Vector3(0, -1, 0), 0.45, 0.46);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.26;
    bell(
      sm,
      M.nozzle,
      pol(1.0, a, 0.42),
      new THREE.Vector3(0.2 * Math.sin(a), -1, 0.2 * Math.cos(a)),
      0.06,
      0.16,
    );
  }
  // the drum in crinkled gold foil, silver around the shoulder
  foilDrum(sm, M.foilGold, R - 0.05, R - 0.05, 0.5, 1.55, 0.03, 40);
  foilDrum(sm, M.foilSilver, R - 0.05, R - 0.05, 1.55, 1.7, 0.02, 40);
  straps(sm, M.dark, R - 0.05, 0.5, 1.7, 12, 0.05, 0.12);
  torus(sm, M.rib, R - 0.04, 0.03, 1.7);
  // strut truss and the equipment bay up to the cargo module
  cyl(sm, M.dark, R - 0.28, R - 0.28, 1.7, smH, 40);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    strut(
      sm,
      M.aluDark,
      pol(R - 0.08, a, 1.7),
      pol(R - 0.08, a + (i % 2 ? 0.1 : -0.1), smH),
      0.025,
      6,
    );
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const f = onProfile(sm, () => R - 0.18, 2.1 + (i % 2) * 0.12, a);
    box(f, i % 3 ? M.alu : M.foilGold, 0.5, 0.06, 0.34, 0, 0.03, 0);
  }
  for (let i = 0; i < 4; i++) {
    pod(sm, M.foilSilver, M.nozzle, R - 0.2, 2.0, (i / 4) * TAU + Math.PI / 4, 0.46, 0.46, 0.2);
  }
  torus(sm, M.rib, R, 0.04, smH);

  // pressurised cargo module
  const pcm = grp(g, 'cargo-module');
  cyl(pcm, M.aluDark, R - 0.012, R - 0.012, smH, pcmTop, 56);
  const rows = Math.max(2, Math.round((pcmTop - smH) / 1.1));
  pocketPanels(pcm, M, R, smH, pcmTop, rows, 8, M.alu, M.aluDark);
  // forward conic shoulder in panels, to the berthing collar
  const shoulder = pcmTop + 0.33;
  cyl(pcm, M.aluDark, R, 0.98, pcmTop, shoulder, 56);
  for (let c = 0; c < 8; c++) {
    sector(
      pcm,
      M.alu,
      R + 0.012,
      0.99,
      pcmTop + 0.03,
      shoulder - 0.02,
      (c / 8) * TAU + 0.05,
      ((c + 1) / 8) * TAU - 0.05,
      4,
    );
  }
  torus(pcm, M.rib, R + 0.015, 0.035, pcmTop, 64);
  berthRing(pcm, shoulder, 0.98, M, M.white);

  // arrays at the service module / cargo module joint
  const ay = smH + 0.15;
  if (fanArrays) {
    fan(g, M, R + 0.55, ay + 0.2, 1.95, 1);
    fan(g, M, R + 0.55, ay + 0.2, 1.95, -1);
  } else {
    for (const s of [0, Math.PI]) wing(g, M, R + 0.2, ay + 0.15, 3.6, 2.0, 3, s);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// HTV and HTV-X
// ---------------------------------------------------------------------------------------------

/** Open exposed-cargo section: half shell, floor pallet, two bulkhead rings and a payload box. */
function openCargoBay(g: THREE.Object3D, M: Mats, y0: number, y1: number, r: number): void {
  const half = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, y1 - y0, 40, 1, true, Math.PI / 2, Math.PI),
    mat(0xb8bbc1, 0.7, 0.45, true),
  );
  half.position.y = (y0 + y1) / 2;
  g.add(half);
  for (const y of [y0 + 0.05, y1 - 0.05]) cyl(g, M.rib, r, r, y - 0.05, y + 0.05, 48);
  for (const sx of [-1, 1]) {
    box(g, M.rib, 0.12, y1 - y0, 0.12, sx * r, (y0 + y1) / 2, 0);
    strut(
      g,
      M.rib,
      new THREE.Vector3(sx * r, y0, 0),
      new THREE.Vector3(sx * r * 0.9, y1, r * 0.35),
      0.03,
      6,
    );
  }
  // pallet and payload box on its rails
  box(g, M.aluDark, r * 1.35, y1 - y0 - 0.2, 0.1, 0, (y0 + y1) / 2, r * 0.12);
  const payload = box(g, M.white, r * 0.9, (y1 - y0) * 0.55, r * 0.55, 0, (y0 + y1) / 2, r * 0.46);
  payload.name = 'payload';
  const py = (y0 + y1) / 2;
  const ph = (y1 - y0) * 0.55;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1])
      box(g, M.rib, 0.06, 0.06, r * 0.55, sx * r * 0.45, py + sy * ph * 0.5, r * 0.46);
  }
  box(g, M.alu, r * 0.9, 0.05, 0.05, 0, py + ph * 0.5, r * 0.74);
  for (let i = 0; i < 3; i++)
    box(g, M.foilGold, 0.35, 0.2, 0.05, (i - 1) * r * 0.28, py + 0.1, r * 0.74);
}

/**
 * HTV: the white propulsion module with four engines and the thruster pods on a plate with
 * its four tank domes, the silver avionics section, the open exposed-cargo bay with its pallet,
 * and the pressurised carrier in white with the body-mounted dark cell patches over the barrel.
 */
function buildHtv(): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const R = 2.2;

  const pmTop = 1.8;
  foilDrum(g, M.foilWhite, R * 0.62, R, 0.35, 0.75, 0.025, 48);
  foilDrum(g, M.foilWhite, R, R, 0.75, pmTop, 0.025, 48);
  // aft plate with the four tank domes
  lathe(g, M.white, [
    [0, 0.35],
    [R * 0.62, 0.35],
  ]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const f = frameAt(g, pol(0.95, a, 0.35), new THREE.Vector3(0, -1, 0));
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 8, 0, TAU, 0, 0.9), M.alu);
    d.rotation.x = Math.PI;
    d.scale.y = 0.35;
    f.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 28), M.rib);
    ring.rotation.x = Math.PI / 2;
    f.add(ring);
  }
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    bell(
      g,
      M.nozzle,
      new THREE.Vector3(sx * 0.7, 0.36, sz * 0.7),
      new THREE.Vector3(0, -1, 0),
      0.22,
      0.36,
    );
  }
  straps(g, M.dark, R, 0.75, pmTop, 16, 0.05, 0.1);
  for (let i = 0; i < 4; i++) {
    pod(g, M.silver, M.nozzle, R, 1.25, (i / 4) * TAU + Math.PI / 4, 0.55, 0.6, 0.14);
  }
  torus(g, M.foilGold, R, 0.06, pmTop, 56);
  torus(g, M.rib, R, 0.04, 0.75, 56);

  // avionics module, silver, with body cells and antennas
  const avTop = 2.8;
  foilDrum(g, M.foilSilver, R, R, pmTop, avTop, 0.02, 48);
  cellPatch(g, M, M.cellBrown, R, pmTop + 0.1, avTop - 0.1, -0.9, 0.7, 6, 3, 0.04);
  cellPatch(g, M, M.cellBrown, R, pmTop + 0.1, avTop - 0.1, 2.2, 3.9, 6, 3, 0.04);
  for (let i = 0; i < 2; i++) {
    const f = onProfile(g, () => R, 2.3, 1.1 + i * 3.1);
    box(f, M.white, 0.4, 0.05, 0.4, 0, 0.03, 0);
    dishAt(g, M, pol(R + 0.1, 1.1 + i * 3.1 + 0.5, 2.5), 0.2);
  }
  torus(g, M.rib, R, 0.04, avTop, 56);

  // exposed logistics carrier
  const ulcTop = 6.0;
  openCargoBay(g, M, avTop, ulcTop, R);

  // pressurised logistics carrier
  const plcTop = 9.8 - 0.26;
  cyl(g, M.rib, R - 0.03, R - 0.03, ulcTop, plcTop, 56);
  const rows = 3;
  pocketPanels(g, M, R, ulcTop, plcTop, rows, 12, M.white, M.foilWhite);
  cellPatch(g, M, M.cellBrown, R + 0.03, ulcTop + 0.2, plcTop - 0.2, -1.1, 1.3, 9, 8);
  cellPatch(g, M, M.cellBrown, R + 0.03, ulcTop + 0.2, plcTop - 0.2, 2.1, 4.1, 9, 8);
  torus(g, M.foilGold, R, 0.05, ulcTop, 56);
  cyl(g, M.white, R, 1.0, plcTop - 0.01, plcTop + 0.01);
  berthRing(g, plcTop, 1.0, M, M.silver);
  return g;
}

/** A small round antenna dish on a stub at `p`, facing out along +z. */
function dishAt(g: THREE.Object3D, M: Mats, p: THREE.Vector3, r: number): void {
  const d = dish(M.white, M.dark, r);
  d.position.copy(p);
  d.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3(p.x, 0.4, p.z).normalize());
  g.add(d);
}

/**
 * HTV-X: the gold-blanketed pressurised module, the open cargo-support deck, the silver service
 * module with its thruster pods, small body panels and the two long narrow arrays.
 */
function buildHtvX(): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const R = 2.2;

  // service module 0 - 2.7 m
  foilDrum(g, M.foilGold, R * 0.7, R, 0.3, 0.7, 0.03, 48);
  foilDrum(g, M.foilSilver, R, R, 0.7, 2.7, 0.025, 48);
  straps(g, M.dark, R, 0.7, 2.7, 14, 0.05, 0.1);
  bell(g, M.nozzle, new THREE.Vector3(0, 0.34, 0), new THREE.Vector3(0, -1, 0), 0.4, 0.34);
  for (let i = 0; i < 4; i++) {
    pod(g, M.silver, M.nozzle, R, 1.9, (i / 4) * TAU + Math.PI / 4, 0.55, 0.6, 0.14);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    cellPatch(g, M, M.cellBrown, R, 0.85, 1.7, a - 0.2, a + 0.2, 3, 3, 0.045);
  }
  // star-tracker / antenna boxes
  for (let i = 0; i < 3; i++) {
    const f = onProfile(g, () => R, 2.45, 0.4 + i * 2.1, 0.0);
    box(f, M.white, 0.34, 0.2, 0.34, 0, 0.1, 0);
    box(f, M.dark, 0.18, 0.04, 0.18, 0, 0.22, 0);
  }
  torus(g, M.rib, R, 0.05, 2.7, 56);

  // unpressurised cargo support system 2.7 - 4.5 m
  openCargoBay(g, M, 2.7, 4.5, R);

  // pressurised module 4.5 - 8.0 m, in gold blanket
  const top = 8.0 - 0.26;
  foilDrum(g, M.foilGold, R, R, 4.5, top, 0.035, 56);
  straps(g, M.dark, R, 4.5, top, 20, 0.05, 0.06);
  for (const y of [5.5, 6.7]) torus(g, M.foilSilver, R + 0.012, 0.03, y, 56);
  torus(g, M.rib, R, 0.05, 4.5, 56);
  cyl(g, M.white, R, 1.0, top - 0.01, top + 0.01);
  berthRing(g, top, 1.0, M, M.silver);

  // deployable arrays: 18.2 m span, long and narrow
  const L = (18.2 - 2 * R) / 2;
  for (const s of [0, Math.PI])
    wing(g, M, R + 0.1, 1.5, L - 0.1, 1.5, 5, s, M.cellBrown, M.aluDark, 0.3);
  return g;
}

// ---------------------------------------------------------------------------------------------
// ATV
// ---------------------------------------------------------------------------------------------

/**
 * ATV: the aft section (gold cone, four engines, the thruster pods) under the white quilted
 * cargo carrier, its conic nose with the Russian docking ring, and the four long wings in an X
 * on their booms, copper-edged panels.
 */
function buildAtv(): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const R = 2.25;

  const asrTop = 3.4;
  foilDrum(g, M.foilGold, R * 0.8, R, 0.7, 1.0, 0.03, 48);
  foilDrum(g, M.foilSilver, R, R, 1.0, asrTop, 0.03, 48);
  lathe(g, M.foilGold, [
    [0, 0.7],
    [R * 0.8, 0.7],
  ]);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    bell(
      g,
      M.nozzle,
      new THREE.Vector3(sx * 0.9, 0.7, sz * 0.9),
      new THREE.Vector3(0, -1, 0),
      0.24,
      0.7,
    );
  }
  straps(g, M.dark, R, 1.0, asrTop, 16, 0.05, 0.05);
  for (let i = 0; i < 4; i++) {
    pod(g, M.silver, M.nozzle, R, 2.9, (i / 4) * TAU, 0.6, 0.5, 0.14);
    pod(g, M.silver, M.nozzle, R, 1.5, (i / 4) * TAU + Math.PI / 4, 0.6, 0.5, 0.14);
  }
  torus(g, M.rib, R, 0.05, asrTop, 56);

  // integrated cargo carrier: quilted white micrometeoroid blankets
  const iccTop = 8.9;
  foilDrum(g, M.foilWhite, R, R, asrTop, iccTop, 0.04, 56);
  straps(g, M.rib, R, asrTop, iccTop, 24, 0.07, 0.05);
  for (let i = 1; i <= 5; i++)
    torus(g, M.foilSilver, R + 0.012, 0.03, asrTop + (i * (iccTop - asrTop)) / 6, 56);
  // two hatches' worth of radiator patches and handrails
  for (const a of [0.7, 3.8]) {
    const f = onProfile(g, () => R, 5.8, a, 0.01);
    box(f, M.alu, 0.9, 0.04, 1.6, 0, 0.02, 0);
  }
  // nose cone and the docking system
  foilDrum(g, M.foilWhite, R, 1.05, iccTop, iccTop + 0.65, 0.03, 48);
  cyl(g, M.silver, 1.05, 1.05, iccTop + 0.65, 9.75, 48);
  cyl(g, M.dark, 0.9, 0.9, 9.74, 9.77, 40);
  torus(g, M.rib, 1.0, 0.04, 9.74, 48);
  boltRing(g, M.dark, 0.98, 9.77, 12, 0.08);
  cyl(g, M.aluDark, 0.34, 0.34, 9.7, 9.8, 28);
  cyl(g, M.rib, 0.045, 0.045, 9.75, 10.2, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), M.silver);
  head.position.y = 10.2;
  g.add(head);
  cyl(g, M.silver, 0.1, 0.02, 10.2, 10.3, 10);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    strut(g, M.silver, pol(0.1, a, 10.05), pol(0.34, a, 9.85), 0.018, 5);
  }

  // four wings in an X, 22.3 m tip to tip (diagonal)
  const reach = 22.3 / 2;
  for (let k = 0; k < 4; k++) {
    wing(
      g,
      M,
      R + 0.1,
      3.0,
      reach - R - 0.1,
      1.3,
      4,
      Math.PI / 4 + (k * Math.PI) / 2,
      M.cellBrown,
      M.copper,
      0.4,
    );
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Tianzhou
// ---------------------------------------------------------------------------------------------

/**
 * Tianzhou: the white wrinkled-blanket propulsion drum with its orange thruster blocks, the
 * bigger cargo module in grey-white blanket with its band seams, the docking mechanism, the
 * relay dish and the two big wings.
 */
function buildTianzhou(): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const Rc = 1.675;
  const Rp = 1.4;

  const pmTop = 3.2;
  foilDrum(g, M.foilWhite, Rp * 0.8, Rp, 0.5, 0.8, 0.03, 44);
  foilDrum(g, M.foilWhite, Rp, Rp, 0.8, pmTop, 0.035, 44);
  lathe(g, M.white, [
    [0, 0.5],
    [Rp * 0.8, 0.5],
  ]);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    bell(
      g,
      M.nozzle,
      new THREE.Vector3(sx * 0.6, 0.5, sz * 0.6),
      new THREE.Vector3(0, -1, 0),
      0.2,
      0.45,
    );
  }
  for (let i = 0; i < 4; i++) {
    pod(g, M.orange, M.nozzle, Rp, 2.7, (i / 4) * TAU + Math.PI / 4, 0.5, 0.5, 0.12);
    pod(g, M.orange, M.nozzle, Rp, 1.3, (i / 4) * TAU, 0.5, 0.5, 0.12);
  }
  straps(g, M.rib, Rp, 0.8, pmTop, 12, 0.05, 0.2);
  torus(g, M.foilSilver, Rp, 0.04, 1.0, 44);
  // transition to the cargo module
  foilDrum(g, M.foilSilver, Rp, Rc, pmTop, pmTop + 0.5, 0.02, 44);
  torus(g, M.rib, Rp, 0.04, pmTop, 44);

  // cargo module 3.7 - 10.1 m
  const cTop = 10.1;
  const cBot = pmTop + 0.5;
  foilDrum(g, M.foilWhite, Rc, Rc, cBot, cTop, 0.05, 56);
  straps(g, M.rib, Rc, cBot, cTop, 16, 0.06, 0.1);
  for (const y of [cBot + 2.2, cBot + 4.3]) torus(g, M.foilSilver, Rc + 0.018, 0.045, y, 56);
  for (const a of [0.9, 4.0]) {
    const f = onProfile(g, () => Rc, 8.0, a, 0.01);
    box(f, M.alu, 0.5, 0.04, 0.8, 0, 0.02, 0);
  }
  for (let i = 0; i < 5; i++) {
    const a = 0.3 + i * 1.25;
    const f = onProfile(g, () => Rc, 9.5 + (i % 2) * 0.2, a, 0.0);
    box(f, M.orange, 0.18, 0.12, 0.18, 0, 0.06, 0);
  }
  // docking end
  foilDrum(g, M.foilWhite, Rc, 0.85, cTop, cTop + 0.3, 0.03, 48);
  cyl(g, M.silver, 0.85, 0.85, cTop + 0.3, 10.6, 44);
  boltRing(g, M.dark, 0.8, 10.6, 12, 0.07);
  cyl(g, M.dark, 0.66, 0.66, 10.57, 10.6, 36);
  torus(g, M.rib, 0.7, 0.03, 10.6, 36);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    const f = onProfile(g, () => 0.78, 10.58, a, 0);
    box(f, M.alu, 0.16, 0.06, 0.2, 0, 0.03, 0);
  }
  cyl(g, M.rib, 0.04, 0.04, 10.5, 10.6, 8);
  // relay dish on a boom
  const base = pol(Rc - 0.1, 0.8, pmTop + 0.4);
  const tip = pol(Rc + 0.15, 0.8, pmTop + 0.95);
  strut(g, M.silver, base, tip, 0.035, 6);
  dishAt(g, M, tip, 0.3);

  const L = (14.9 - 2 * Rp) / 2;
  for (const s of [0, Math.PI])
    wing(g, M, Rp + 0.1, 2.0, L - 0.1, 2.2, 3, s, M.cell, M.frame, 0.42);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Shenzhou
// ---------------------------------------------------------------------------------------------

/**
 * Shenzhou: the service module (white drum in silver blanket, the maroon aft skirt and the
 * orange thruster blocks, two wings), the bell-shaped re-entry module with its dark ablative
 * base and windows, and the orbital module in quilted silver with its round shoulder and the
 * docking mechanism.
 */
function buildShenzhou(): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const maroon = mat(0x6d2c26, 0.2, 0.8);
  const shield = mat(0x3a2f26, 0.2, 0.8);

  // service module 0 - 2.94 m: 2.5 m drum, flared to 2.8 m at the shoulder
  const sm = grp(g, 'service-module');
  const smTop = 2.94;
  cyl(sm, maroon, 0.8, 1.25, 0.35, 0.6);
  cyl(sm, M.foilWhite, 1.25, 1.25, 0.6, 2.1, 48);
  foilDrum(sm, M.foilWhite, 1.25, 1.25, 0.6, 2.1, 0.025, 48);
  foilDrum(sm, M.foilSilver, 1.25, 1.4, 2.1, 2.6, 0.025, 48);
  cyl(sm, M.silver, 1.4, 1.4, 2.6, smTop, 48);
  straps(sm, M.rib, 1.25, 0.6, 2.1, 12, 0.05, 0.1);
  torus(sm, M.rib, 1.4, 0.03, 2.6);
  torus(sm, M.dark, 1.25, 0.03, 0.62);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    bell(
      sm,
      M.nozzle,
      new THREE.Vector3(sx * 0.45, 0.36, sz * 0.45),
      new THREE.Vector3(0, -1, 0),
      0.17,
      0.34,
    );
  }
  for (let i = 0; i < 4; i++) {
    pod(sm, M.orange, M.nozzle, 1.4, 2.45, (i / 4) * TAU + Math.PI / 4, 0.4, 0.4, 0.1);
    pod(sm, M.orange, M.nozzle, 1.25, 1.0, (i / 4) * TAU, 0.4, 0.4, 0.1);
  }
  for (const a of [0.9, 3.5]) {
    const f = onProfile(sm, () => 1.25, 1.6, a, 0.01);
    box(f, M.alu, 0.7, 0.03, 0.8, 0, 0.015, 0);
  }

  // re-entry module 2.94 - 5.44 m: bell with dark ablative base
  const dm = grp(g, 'descent-module');
  const dmProfile: [number, number][] = [
    [1.26, smTop + 0.4],
    [1.0, smTop + 1.5],
    [0.72, smTop + 2.25],
    [0.62, 5.44],
  ];
  lathe(dm, shield, [
    [0, smTop + 0.05],
    [0.8, smTop + 0.08],
    [1.2, smTop + 0.22],
    [1.26, smTop + 0.4],
  ]);
  lathe(dm, M.foilSilver, dmProfile);
  const dmR = profileFn(dmProfile);
  torus(dm, M.rib, 1.26, 0.04, smTop + 0.4);
  torus(dm, M.rib, 0.64, 0.03, 5.4);
  for (const yaw of [-0.4, 0.4]) {
    const f = onProfile(dm, dmR, smTop + 1.25, yaw, 0.005);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 24), M.rib);
    ring.rotation.x = Math.PI / 2;
    f.add(ring);
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), M.glass);
    d.rotation.x = -Math.PI / 2;
    d.position.y = 0.004;
    f.add(d);
  }
  const hatch = onProfile(dm, dmR, smTop + 1.0, Math.PI, 0.004);
  box(hatch, M.alu, 0.5, 0.012, 0.5, 0, 0.004, 0);
  for (let i = 0; i < 6; i++) {
    const f = onProfile(dm, dmR, smTop + 0.75, (i / 6) * TAU + 0.3, 0.012);
    box(f, M.dark, 0.1, 0.03, 0.14, 0, 0.012, 0);
  }

  // orbital module 5.44 - 8.24 m, then the docking mechanism and antennas to 9.25 m
  const om = grp(g, 'orbital-module');
  const oTop = 8.24;
  cyl(om, M.silver, 0.62, 0.62, 5.44, 5.64, 32);
  const omPts: [number, number][] = [
    [1.0, 5.64],
    [1.125, 6.2],
    [1.125, 7.2],
    [1.08, 7.8],
    [0.92, 8.1],
    [0.78, oTop],
  ];
  blanket(om, M.foilSilver, omPts, 0.022, 48, 0.2);
  for (const y of [6.2, 7.2, 8.0]) torus(om, M.rib, 1.13, 0.025, y);
  straps(om, M.rib, 1.125, 6.2, 7.2, 14, 0.05, 0.1);
  const omR = profileFn(omPts);
  const port = onProfile(om, omR, 7.0, 0, 0.004);
  const pr = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 28), M.rib);
  pr.rotation.x = Math.PI / 2;
  port.add(pr);
  const pg = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), M.glass);
  pg.rotation.x = -Math.PI / 2;
  pg.position.y = 0.004;
  port.add(pg);
  const sideHatch = onProfile(om, omR, 6.7, 2.2, 0.004);
  box(sideHatch, M.alu, 0.46, 0.02, 0.6, 0, 0.01, 0);
  cyl(om, M.silver, 0.78, 0.55, oTop, oTop + 0.5, 32);
  cyl(om, M.dark, 0.5, 0.5, oTop + 0.5, oTop + 0.55, 28);
  boltRing(om, M.dark, 0.54, oTop + 0.52, 10, 0.05);
  cyl(om, M.silver, 0.2, 0.2, oTop + 0.55, 9.25, 16);
  cyl(om, M.dark, 0.14, 0.14, 9.2, 9.25, 12);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.4;
    strut(om, M.silver, pol(0.2, a, 8.95), pol(0.46, a, oTop + 0.6), 0.015, 5);
  }

  // service-module wings: 17 m span, 2.6 m wide
  const L = (17 - 2 * 1.4) / 2;
  for (const s of [0, Math.PI]) wing(sm, M, 1.5, 1.55, L - 0.1, 2.6, 4, s, M.cell, M.frame, 0.4);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Apollo CSM
// ---------------------------------------------------------------------------------------------

/** An open arc of a cylinder, a0..a1 (0 = +z), as geometry for a merged mesh. */
function arcGeo(r: number, y0: number, y1: number, a0: number, a1: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(r, r, y1 - y0, 10, 1, true, a0, a1 - a0);
  geo.translate(0, (y0 + y1) / 2, 0);
  return geo;
}

/** A box w x h x d at `p`, turned `yaw` about y, as geometry for a merged mesh. */
function boxGeo(w: number, h: number, d: number, p: THREE.Vector3, yaw = 0): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.rotateY(yaw);
  geo.translate(p.x, p.y, p.z);
  return geo;
}

function mergedMesh(g: THREE.Object3D, m: Mat, geos: THREE.BufferGeometry[]): THREE.Mesh {
  return add(g, new THREE.Mesh(mergeGeometries(geos, false), m));
}

/**
 * A small thruster: a bell with its throat at `pos` opening along `dir`, in a group named `name`
 * placed at the exit plane with local +y = the way the exhaust leaves (a scene hangs a puff on it).
 */
function thruster(
  parent: THREE.Object3D,
  m: Mat,
  name: string,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
  len: number,
): THREE.Group {
  const d = dir.clone().normalize();
  const t = new THREE.Group();
  t.name = name;
  t.position.copy(pos).addScaledVector(d, len);
  t.quaternion.setFromUnitVectors(Y_AXIS, d);
  parent.add(t);
  const body = new THREE.Group();
  body.position.y = -len;
  t.add(body);
  lathe(
    body,
    m,
    [
      [r * 0.36, 0],
      [r * 0.3, len * 0.18],
      [r * 0.42, len * 0.5],
      [r * 0.72, len * 0.82],
      [r, len],
    ],
    20,
  );
  return t;
}

// Sourced figures (see the entry's `refs`): 3.91 m diameter; CSM 11.0 m; CM 3.48 m with probe;
// SM 4.52 m body, about 7.5 m with the nozzle; SPS nozzle 3.882 m long, 2.501 m across the exit;
// CM forward compartment 0.58 m; side hatch 0.86 x 0.74 m; windows 0.23 m (side), 0.20 x 0.23 m
// (rendezvous), 0.23 m hatch window; RCS thrusters 0.30 m x 0.15 m; HGA four 0.79 m dishes round
// a 0.28 m one; two 2.8 m2 radiators over sectors 2+3 and 5+6; six sectors of 50/70/60/50/70/60 deg.
export const CSM_R = 1.955;
export const CSM_SM_TOP = 7.52;
const CSM_SM_BOT = CSM_SM_TOP - 4.52;
const CSM_SECTORS = [50, 70, 60, 50, 70, 60].map((d) => (d * Math.PI) / 180);
export const CSM_HEIGHT = 11.0;

export interface ApolloCsmOptions extends SimBayOptions {
  simBay?: boolean;
}

/**
 * Apollo CSM: the service module in white with six sectors between their radial beams, the two
 * radiators, the four RCS quads (four thrusters each), the umbilical fairing, the VHF scimitars
 * and (Block II) the stowed high-gain antenna of four dishes, over the SPS bell; the command
 * module on top, a cone on its brown ablative base with the five windows, the side hatch, the
 * thruster pairs and the forward compartment, ending in the docking ring and probe (Block II) or
 * the smooth cover (Block I). The probe head is the highest point, on the axis.
 *
 * Named parts: 'descent-module' (the part that comes home) holding 'command-module' (with
 * 'docking-probe' > 'docking-probe-head', 'capture-latch-0..2', the 'probe-tip' anchor; windows
 * 'window-*', 'side-hatch', 'cm-rcs-0..11'); 'service-module' ('sm-sector-1..6', 'radiator-0/1',
 * 'rcs-quad-0..3' each with nozzles 'rcs-<q>-0..3', 'umbilical-fairing', 'scimitar-0/1',
 * 'high-gain-antenna' with 'hga-dish-0..3'); 'sps-engine' with the 'engine-exit' anchor at the exit
 * plane. Nozzle and 'engine-exit' groups have local +y along the exhaust.
 *
 * `{ simBay: true }` (the J-mission service module of Apollo 15-17) opens sector 1 as the SIM bay:
 * 'sm-sector-1' holds the 'sim-bay' group (apollo-sim-bay.ts) instead of a skin panel, and the
 * umbilical fairing moves round to sector 2 (an estimate: it must clear the bay).
 */
export function buildApolloCsm(block2: boolean, opts: ApolloCsmOptions = {}): THREE.Group {
  const simBay = !!opts.simBay;
  const g = new THREE.Group();
  const M = mats();
  const R = CSM_R;
  const smBot = CSM_SM_BOT;
  const smTop = CSM_SM_TOP;
  const shield = mat(0x6e4220, 0.3, 0.8);
  const cmWhite = mat(0xe2e2de, 0.25, 0.45);
  const cmSkin = mat(0xd2d4d8, 0.4, 0.34);
  const sw = mat(0xe8e8e4, 0.2, 0.5);
  const radMat = mat(0xf2f2f0, 0.2, 0.45);
  const dishMat = mat(0xd8dade, 0.4, 0.4, true);
  const ablator = mat(0x8c7c64, 0.35, 0.65, true);
  const extension = mat(0x4a4e54, 0.7, 0.5, true);

  const dm = grp(g, 'descent-module');
  const sm = grp(g, 'service-module');

  // --- SPS engine: the bell from the throat inside the module (3.882 m up) to the exit at y = 0
  const sps = grp(g, 'sps-engine');
  const SPS_LEN = 3.882;
  const SPS_EXIT = 1.2505;
  const SPS_THROAT = SPS_EXIT / Math.sqrt(62.5);
  const bellAt = (y: number): number =>
    SPS_THROAT + (SPS_EXIT - SPS_THROAT) * Math.pow((SPS_LEN - y) / SPS_LEN, 0.62);
  const lower: [number, number][] = [];
  const upper: [number, number][] = [[bellAt(1.5), 1.5]];
  for (let i = 0; i <= 16; i++) {
    const y = (SPS_LEN * i) / 16;
    if (y < 1.5) lower.push([bellAt(y), y]);
    else if (y > 1.5) upper.push([bellAt(y), y]);
  }
  lower.push([bellAt(1.5), 1.5]);
  lathe(sps, extension, lower, 56);
  lathe(sps, ablator, upper, 56);
  for (const y of [0.04, 0.5, 1.0, 1.5, 2.2, 2.9]) {
    torus(sps, M.rib, bellAt(y) + 0.004, 0.015, y, 56);
  }
  const exit = new THREE.Object3D();
  exit.name = 'engine-exit';
  exit.quaternion.setFromUnitVectors(Y_AXIS, new THREE.Vector3(0, -1, 0));
  sps.add(exit);

  // --- service module: aft bulkhead deck round the engine, and a short skirt
  lathe(
    sm,
    M.aluDark,
    [
      [bellAt(smBot), smBot],
      [R, smBot],
    ],
    60,
  );
  cyl(sm, sw, R, R, smBot, smBot + 0.12, 60, true);
  torus(sm, M.rib, R + 0.004, 0.035, smBot + 0.06, 60);

  // six sectors between their radial beams, sector 1 centred on +z
  const edges: number[] = [-CSM_SECTORS[0] / 2];
  for (const w of CSM_SECTORS) edges.push(edges[edges.length - 1] + w);
  const panelGeos: THREE.BufferGeometry[] = [];
  const seamGeos: THREE.BufferGeometry[] = [];
  const beamGeos: THREE.BufferGeometry[] = [];
  const skinLo = smBot + 0.12;
  for (let i = 0; i < 6; i++) {
    const a0 = edges[i];
    const a1 = edges[i + 1];
    const sec = grp(sm, `sm-sector-${i + 1}`);
    sec.userData.arc = [a0, a1];
    if (simBay && i === 0) {
      beamGeos.push(
        boxGeo(0.11, smTop - skinLo, 0.05, pol(R + 0.02, a0, (smTop + skinLo) / 2), a0),
      );
      sec.add(
        buildSimBay(
          { R, yLo: skinLo, yHi: smTop - 0.05, halfArc: (a1 - a0) / 2 - 0.02 },
          { mission: opts.mission, subsatellite: opts.subsatellite },
        ),
      );
      continue;
    }
    sector(sec, sw, R, R, skinLo, smTop, a0 + 0.02, a1 - 0.02, 8);
    const mid = (a0 + a1) / 2;
    const w = ((a1 - a0) / 2) * 0.7;
    for (const y of [smBot + 1.4, smBot + 3.0]) {
      seamGeos.push(arcGeo(R + 0.006, y - 0.012, y + 0.012, a0 + 0.04, a1 - 0.04));
    }
    for (const [y0, y1] of [
      [smBot + 0.3, smBot + 1.25],
      [smBot + 1.55, smBot + 2.85],
      [smBot + 3.15, smTop - 0.4],
    ]) {
      panelGeos.push(arcGeo(R + 0.008, y0, y0 + 0.012, mid - w, mid + w));
      panelGeos.push(arcGeo(R + 0.008, y1 - 0.012, y1, mid - w, mid + w));
      for (const s of [-1, 1]) {
        const a = mid + s * w;
        panelGeos.push(boxGeo(0.012, y1 - y0, 0.014, pol(R + 0.006, a, (y0 + y1) / 2), a));
      }
    }
    beamGeos.push(boxGeo(0.11, smTop - skinLo, 0.05, pol(R + 0.02, a0, (smTop + skinLo) / 2), a0));
  }
  mergedMesh(sm, M.aluDark, seamGeos).name = 'sm-seams';
  mergedMesh(sm, M.rib, panelGeos).name = 'sm-panel-lines';
  mergedMesh(sm, M.aluDark, beamGeos).name = 'sm-radial-beams';
  torus(sm, M.dark, R + 0.004, 0.03, smTop - 0.015, 60);

  // the two radiators: 2.8 m2 each, over sectors 2+3 and 5+6, low on the module
  const radH = 0.63;
  const radY = smBot + 0.55;
  [
    [1, 2],
    [4, 5],
  ].forEach(([s0, s1], k) => {
    const rad = grp(sm, `radiator-${k}`);
    const a0 = edges[s0] + 0.06;
    const a1 = edges[s1 + 1] - 0.06;
    sector(rad, radMat, R + 0.016, R + 0.016, radY, radY + radH, a0, a1, 14);
    const tubes: THREE.BufferGeometry[] = [];
    for (let i = 0; i <= 26; i++) {
      const a = a0 + ((a1 - a0) * i) / 26;
      tubes.push(boxGeo(0.014, radH, 0.012, pol(R + 0.022, a, radY + radH / 2), a));
    }
    for (const y of [radY, radY + radH]) tubes.push(arcGeo(R + 0.02, y - 0.015, y + 0.015, a0, a1));
    mergedMesh(rad, M.aluDark, tubes);
  });

  // umbilical fairing under the CM, down the +z side
  const fa = grp(sm, 'umbilical-fairing');
  // the J-mission bay takes sector 1 down to the CM: the fairing moves to sector 2, clear of the
  // RCS quad at 45 deg (estimate)
  if (simBay) fa.rotation.y = (66 * Math.PI) / 180;
  box(fa, sw, 0.7, 2.4, 0.22, 0, smTop - 1.3, R + 0.08);
  box(fa, M.aluDark, 0.5, 0.05, 0.12, 0, smTop - 0.08, R + 0.19);
  box(fa, M.rib, 0.5, 0.03, 0.02, 0, smTop - 1.0, R + 0.2);
  const taper = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.5, 4), sw);
  taper.rotation.y = Math.PI / 4;
  taper.scale.set(1, 1, 0.45);
  taper.position.set(0, smTop - 2.75, R + 0.1);
  taper.rotation.x = Math.PI;
  fa.add(taper);

  // RCS quads, 90 deg apart, four thrusters each: up, down, and the two tangential
  for (let q = 0; q < 4; q++) {
    const quad = grp(sm, `rcs-quad-${q}`);
    quad.rotation.y = (q / 4) * TAU + Math.PI / 4;
    const qy = smTop - 1.0;
    box(quad, M.alu, 0.5, 0.9, 0.22, 0, qy, R + 0.1);
    box(quad, M.aluDark, 0.42, 0.8, 0.04, 0, qy, R + 0.22);
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 4), M.alu);
    wedge.scale.z = 0.4;
    wedge.rotation.y = Math.PI / 4;
    wedge.position.set(0, qy + 0.62, R + 0.1);
    quad.add(wedge);
    const specs: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(0, qy + 0.44, R + 0.2), new THREE.Vector3(0, 1, 0.35)],
      [new THREE.Vector3(0, qy - 0.44, R + 0.2), new THREE.Vector3(0, -1, 0.35)],
      [new THREE.Vector3(-0.24, qy, R + 0.22), new THREE.Vector3(-1, 0, 0.35)],
      [new THREE.Vector3(0.24, qy, R + 0.22), new THREE.Vector3(1, 0, 0.35)],
    ];
    specs.forEach(([p, d], n) =>
      thruster(quad, M.nozzleSmooth, `rcs-${q}-${n}`, p, d, 0.085, 0.17),
    );
  }

  // VHF scimitars: curved blades rising from the forward rim, on the +x and -x sides
  const sc = new THREE.Shape();
  sc.moveTo(-0.1, 0);
  sc.quadraticCurveTo(-0.02, 0.5, 0.2, 0.95);
  sc.lineTo(0.24, 0.95);
  sc.quadraticCurveTo(0.02, 0.55, 0.0, 0);
  sc.closePath();
  for (let k = 0; k < 2; k++) {
    const mount = grp(sm, `scimitar-mount-${k}`);
    mount.rotation.y = k * Math.PI + Math.PI / 2;
    const blade = new THREE.Mesh(
      new THREE.ExtrudeGeometry(sc, { depth: 0.03, bevelEnabled: false }),
      M.silver,
    );
    blade.name = `scimitar-${k}`;
    blade.rotation.y = Math.PI / 2;
    blade.position.set(-0.015, smTop + 0.02, R + 0.02);
    mount.add(blade);
  }

  if (block2) {
    // stowed high-gain antenna on the back wall (sector 4): four 0.79 m dishes round a 0.28 m
    // one on a frame, the boom hinged at the bulkhead
    const hga = grp(sm, 'high-gain-antenna');
    hga.rotation.y = Math.PI;
    const hy = smBot + 1.45;
    const stand = R + 0.3;
    strut(
      hga,
      M.rib,
      new THREE.Vector3(0, smBot + 0.2, R + 0.03),
      new THREE.Vector3(0, hy, stand),
      0.04,
      8,
    );
    box(hga, M.rib, 1.0, 0.08, 0.08, 0, hy, stand - 0.1);
    box(hga, M.rib, 0.08, 1.0, 0.08, 0, hy, stand - 0.1);
    box(hga, M.silver, 0.28, 0.28, 0.05, 0, hy, stand + 0.02);
    [
      [-0.43, 0.43],
      [0.43, 0.43],
      [-0.43, -0.43],
      [0.43, -0.43],
    ].forEach(([dx, dy], n) => {
      const d = dish(dishMat, M.dark, 0.395);
      d.name = `hga-dish-${n}`;
      d.rotation.x = Math.PI / 2;
      d.position.set(dx, hy + dy, stand);
      hga.add(d);
    });
  }

  // --- command module ------------------------------------------------------------------------
  const cm = grp(dm, 'command-module');
  cm.position.y = smTop;
  lathe(
    cm,
    shield,
    [
      [0.0, 0.0],
      [0.9, 0.03],
      [1.55, 0.1],
      [1.85, 0.18],
      [R, 0.32],
    ],
    60,
  );
  const cmCone: [number, number][] = [
    [R, 0.32],
    [0.7, 2.45],
  ];
  const cmR = profileFn(cmCone);
  // Smooth silver skin: a densely segmented lathe with smooth normals (the crinkled blanket read
  // as a faceted, dented cone in the docking close-ups).
  lathe(cm, cmSkin, cmCone, 96);
  torus(cm, shield, R - 0.02, 0.05, 0.32, 60);
  const cmSeams: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const p0 = pol(R - 0.02, a, 0.36);
    const p1 = pol(0.72, a, 2.43);
    const geo = new THREE.CylinderGeometry(0.008, 0.008, p0.distanceTo(p1), 4);
    geo.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(Y_AXIS, p1.clone().sub(p0).normalize()),
    );
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    geo.translate(mid.x, mid.y, mid.z);
    cmSeams.push(geo);
  }
  mergedMesh(cm, M.aluDark, cmSeams).name = 'cm-seams';
  for (const y of [1.0, 1.9]) torus(cm, M.aluDark, cmR(y) + 0.006, 0.012, y, 60);
  // forward compartment, 0.58 m tall
  cyl(cm, cmWhite, 0.7, 0.54, 2.45, 3.03, 40);
  torus(cm, M.silver, 0.7, 0.035, 2.45);

  // windows: two triangular rendezvous (0.20 x 0.23 m) behind the hatch, two 0.23 m side windows
  // flanking it; the hatch is on +z; frames are dark metal
  const tri = (f: THREE.Object3D, m: Mat, w: number, h: number, lift: number): void => {
    const s = new THREE.Shape([
      new THREE.Vector2(-w / 2, -h / 2),
      new THREE.Vector2(w / 2, -h / 2),
      new THREE.Vector2(0, h / 2),
    ]);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = lift;
    f.add(mesh);
  };
  [0.5, -0.5].forEach((a, k) => {
    const f = onProfile(cm, cmR, 2.05, a + Math.PI, 0.006);
    f.name = `window-rendezvous-${k}`;
    tri(f, M.rib, 0.3, 0.33, 0.004);
    tri(f, M.glass, 0.2, 0.23, 0.012);
  });
  [1.0, -1.0].forEach((a, k) => {
    const f = onProfile(cm, cmR, 1.5, a, 0.006);
    f.name = `window-side-${k}`;
    box(f, M.rib, 0.3, 0.02, 0.3, 0, 0.004, 0);
    box(f, M.glass, 0.23, 0.03, 0.23, 0, 0.012, 0);
  });
  // side hatch, 0.86 m wide, 0.74 m high, with its 0.23 m window
  const hf = onProfile(cm, cmR, 1.2, 0, 0.006);
  hf.name = 'side-hatch';
  box(hf, M.silver, 0.96, 0.02, 0.84, 0, 0.004, 0);
  box(hf, M.aluDark, 0.86, 0.02, 0.74, 0, 0.014, 0);
  const hw = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 24), M.glass);
  hw.name = 'window-hatch';
  hw.position.set(0, 0.026, 0.1);
  hf.add(hw);
  for (const sx of [-1, 1]) box(hf, M.rib, 0.04, 0.04, 0.2, sx * 0.3, 0.03, -0.2);
  // twelve CM RCS thrusters, in pairs round the shoulder
  let ti = 0;
  for (let i = 0; i < 6; i++) {
    const f = onProfile(cm, cmR, 0.95, (i / 6) * TAU + 0.52, 0.01);
    box(f, M.dark, 0.17, 0.03, 0.14, 0, 0.012, 0);
    for (const dx of [-0.045, 0.045]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), M.nozzle);
      c.name = `cm-rcs-${ti++}`;
      c.position.set(dx, 0.04, 0);
      f.add(c);
    }
  }

  if (block2) {
    // docking ring (0.76 m hatch), twelve latches, and the probe: the highest point, on the axis
    cyl(cm, M.silver, 0.54, 0.5, 3.0, 3.04, 40);
    torus(cm, M.silver, 0.5, 0.04, 3.04);
    cyl(cm, M.aluDark, 0.38, 0.38, 3.04, 3.05, 32);
    torus(cm, M.rib, 0.38, 0.015, 3.05, 32);
    const latches: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      latches.push(boxGeo(0.05, 0.05, 0.05, pol(0.47, a, 3.075), a));
    }
    mergedMesh(cm, M.dark, latches).name = 'docking-latches';
    const probe = grp(cm, 'docking-probe');
    probe.position.y = 3.05;
    const shaftTop = CSM_HEIGHT - smTop - 3.05 - 0.1;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      strut(probe, M.silver, pol(0.44, a, 0), pol(0.05, a, shaftTop * 0.6), 0.02, 5);
    }
    cyl(probe, M.rib, 0.05, 0.04, 0, shaftTop, 12);
    const head = grp(probe, 'docking-probe-head');
    head.position.y = shaftTop;
    // the probe's narrow barrel and a short nose, with three small capture latches round it
    lathe(
      head,
      M.silver,
      [
        [0.04, 0],
        [0.045, 0.01],
        [0.045, 0.07],
        [0.03, 0.09],
        [0.0, 0.1],
      ],
      24,
    );
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const l = box(head, M.dark, 0.022, 0.05, 0.03, 0, 0.045, 0);
      l.name = `capture-latch-${i}`;
      l.position.copy(pol(0.056, a, 0.045));
      l.rotation.y = a;
    }
    const tip = new THREE.Object3D();
    tip.name = 'probe-tip';
    tip.position.y = 0.1;
    head.add(tip);
  } else {
    // Block I: smooth forward hatch cover, 0.4 m lower
    lathe(
      cm,
      cmWhite,
      [
        [0.54, 3.03],
        [0.46, 3.055],
        [0.3, 3.073],
        [0.0, 3.08],
      ],
      32,
    );
  }
  return g;
}

// ---------------------------------------------------------------------------------------------

const WIKI = (title: string, what: string): ShowcaseRef => ({
  l: `Wikipedia — ${what}`,
  u: `https://en.wikipedia.org/wiki/${title}`,
});

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'cygnus-standard': {
    build: () => buildCygnus(5.14, false),
    heightM: 5.14,
    diameterM: 3.07,
    refs: [WIKI('Cygnus_(spacecraft)', 'Cygnus: 5.14 m length, 3.07 m diameter, Standard variant')],
  },
  'cygnus-enhanced': {
    build: () => buildCygnus(6.39, true),
    heightM: 6.39,
    diameterM: 3.07,
    refs: [WIKI('Cygnus_(spacecraft)', 'Cygnus: 6.39 m length, UltraFlex fan arrays')],
  },
  htv: {
    build: buildHtv,
    heightM: 9.8,
    diameterM: 4.4,
    refs: [WIKI('H-II_Transfer_Vehicle', 'HTV: about 9.8 m incl. thrusters, 4.4 m diameter')],
  },
  'htv-x': {
    build: buildHtvX,
    heightM: 8,
    diameterM: 4.4,
    refs: [
      WIKI(
        'HTV-X',
        'HTV-X: 8 m, 4.4 m, 18.2 m array span, 2.7 m service and 3.5 m pressurised module',
      ),
    ],
  },
  atv: {
    build: buildAtv,
    heightM: 10.3,
    diameterM: 4.5,
    refs: [WIKI('Automated_Transfer_Vehicle', 'ATV: 10.3 m, 4.5 m, 22.3 m array span')],
  },
  tianzhou: {
    build: buildTianzhou,
    heightM: 10.6,
    diameterM: 3.35,
    refs: [WIKI('Tianzhou_(spacecraft)', 'Tianzhou: 10.6 m, 3.35 m, 14.9 m array span')],
  },
  shenzhou: {
    build: buildShenzhou,
    heightM: 9.25,
    diameterM: 2.8,
    refs: [
      WIKI(
        'Shenzhou_(spacecraft)',
        'Shenzhou: 9.25 m, orbital 2.8 m, re-entry 2.5 m, service 2.94 m, 17 m span',
      ),
    ],
  },
  'apollo-csm-block-i': {
    build: () => buildApolloCsm(false),
    heightM: 10.6,
    diameterM: 3.91,
    refs: [
      WIKI(
        'Apollo_command_and_service_module',
        'CSM: SM 4.52 m body, 3.91 m diameter, SPS nozzle 3.88 m; Block I has no docking probe (smooth hatch cover)',
      ),
    ],
  },
  'apollo-csm-block-ii': {
    build: () => buildApolloCsm(true),
    heightM: 11,
    diameterM: 3.91,
    refs: [
      WIKI(
        'Apollo_command_and_service_module',
        'CSM 11.0 m (36.2 ft), SM body 14 ft 10 in (4.52 m), 3.91 m diameter, four RCS quads of four thrusters, SPS nozzle 3.882 m long and 2.501 m across the exit',
      ),
      WIKI(
        'Apollo_command_module',
        'CM 3.48 m with probe and heat shield, 3.91 m across the base, forward compartment 0.58 m, five windows (side 0.23 m square, rendezvous 0.20 x 0.23 m, hatch window 0.23 m), side hatch 0.74 x 0.86 m, 12 RCS thrusters',
      ),
      WIKI(
        'Apollo_service_module',
        'SM six sectors of 50/70/60/50/70/60 degrees (sector 1 ballast, 4 fuel cells), two 2.8 m2 radiators over sectors 2+3 and 5+6, RCS thruster 0.30 x 0.15 m, high-gain antenna of four 0.79 m dishes round a 0.28 m one',
      ),
      {
        l: 'NSSDCA — Apollo 11 CSM: 11.0 m long, CM 3.65 m high, SM 7.6 m long incl. nozzle, 3.9 m diameter',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A',
      },
    ],
  },
};
