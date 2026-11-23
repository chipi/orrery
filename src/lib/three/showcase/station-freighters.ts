/**
 * Showcase models: station freighters (Cygnus, HTV, HTV-X, ATV, Tianzhou) and the Shenzhou and
 * Apollo CSM crewed craft, built to the bar of the Apollo LM: crinkled foil and tape seams on
 * every blanketed surface, panel lines, thruster pods, docking systems, cell-gridded arrays.
 * Each stands as on its launcher: engine / service end down (y = 0), docking end up, front
 * facing +z, solar arrays deployed at their real span in the x-y plane.
 *
 * Crewed craft carry named groups for the descent scenes: Shenzhou 'orbital-module',
 * 'descent-module' (the re-entry module), 'service-module'; the Apollo CSM 'descent-module' (the
 * command module) and 'service-module'. The CSM apex (the docking probe) stays the highest point
 * and on the axis: `dockedApolloCsm` flips it nose-down onto the LM's drogue.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, lathe, mat, strut, type Mat } from './kit';

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

/**
 * Apollo CSM: the service module in white with its bright lower band, the sector beams and
 * panel rings, the four RCS quads, the umbilical fairing and (Block II) the stowed high-gain
 * antenna, over the big SPS engine bell; the command module on top, a cone on its brown
 * ablative base with the five windows, the side hatch, the thruster pairs and the forward
 * compartment, ending in the docking ring and probe (Block II) or the smooth cover (Block I).
 * The apex is the highest point of the model, on the axis.
 */
function buildApolloCsm(block2: boolean): THREE.Group {
  const g = new THREE.Group();
  const M = mats();
  const R = 1.955;
  const smBot = 2.83;
  const smTop = 7.35;
  const bellMat = mat(0x6f7378, 0.7, 0.5, true);
  const shield = mat(0x6e4220, 0.3, 0.8);
  const cmWhite = mat(0xd0d3d9, 0.8, 0.25);
  const sw = mat(0xdcdfe4, 0.75, 0.28);

  // service module
  const sm = grp(g, 'service-module');
  lathe(
    sm,
    bellMat,
    [
      [1.25, 0.0],
      [1.2, 0.18],
      [1.06, 0.55],
      [0.86, 0.95],
      [0.64, 1.5],
      [0.45, 2.05],
      [0.33, 2.55],
      [0.3, smBot + 0.05],
    ],
    48,
  );
  for (const y of [0.4, 0.95, 1.55]) torus(sm, M.aluDark, 1.2 - y * 0.42, 0.03, y, 40);
  torus(sm, M.rib, 1.25, 0.03, 0.03, 48);
  // aft bulkhead skirt
  cyl(sm, sw, R, R, smBot - 0.03, smBot + 0.1, 60);
  cyl(sm, M.aluDark, R * 0.35, R, smBot - 0.1, smBot - 0.03, 60);
  // skin: lower aluminium band, white above, radiator panels high on the module
  cyl(sm, sw, R, R, smBot + 0.1, smBot + 1.4, 60);
  cyl(sm, sw, R, R, smBot + 1.4, smTop, 60);
  const skinTop = smTop - 0.02;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU;
    const a1 = ((i + 1) / 6) * TAU;
    sector(sm, sw, R + 0.008, R + 0.008, smBot + 1.45, skinTop, a0 + 0.04, a1 - 0.04, 6);
    sector(sm, sw, R + 0.008, R + 0.008, smBot + 0.12, smBot + 1.37, a0 + 0.04, a1 - 0.04, 6);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const b = box(
      sm,
      i % 2 ? M.rib : M.aluDark,
      i % 2 ? 0.05 : 0.09,
      smTop - smBot - 0.05,
      0.04,
      0,
      0,
      0,
    );
    b.position.copy(pol(R + 0.015, a, (smTop + smBot) / 2));
    b.rotation.y = a;
  }
  for (const y of [smBot + 1.4, smBot + 3.0]) torus(sm, M.aluDark, R + 0.012, 0.03, y, 60);
  torus(sm, M.dark, R, 0.04, smTop - 0.02, 60);
  // radiator panels
  for (const a of [Math.PI / 6, Math.PI / 6 + Math.PI / 2, Math.PI + Math.PI / 6, Math.PI * 1.67]) {
    const f = onProfile(sm, () => R, smTop - 0.95, a, 0.02);
    box(f, M.white, 1.1, 0.02, 1.7, 0, 0.01, 0);
    for (let k = -2; k <= 2; k++) box(f, M.aluDark, 0.012, 0.025, 1.7, k * 0.22, 0.012, 0);
  }
  // umbilical fairing along one side
  const fa = add(sm, new THREE.Group());
  fa.rotation.y = Math.PI / 2;
  box(fa, sw, 0.7, 2.4, 0.22, 0, smTop - 1.3, R + 0.08);
  box(fa, M.aluDark, 0.5, 0.05, 0.12, 0, smTop - 0.08, R + 0.19);
  const taper = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.5, 4), sw);
  taper.rotation.y = Math.PI / 4;
  taper.scale.set(1, 1, 0.45);
  taper.position.set(0, smTop - 2.75, R + 0.1);
  taper.rotation.x = Math.PI;
  fa.add(taper);
  // RCS quads
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const f = add(sm, new THREE.Group());
    f.rotation.y = a;
    box(f, M.alu, 0.5, 1.0, 0.26, 0, smTop - 1.0, R + 0.11);
    box(f, M.dark, 0.42, 0.9, 0.04, 0, smTop - 1.0, R + 0.25);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        bell(
          f,
          M.nozzle,
          new THREE.Vector3(sx * 0.14, smTop - 1.0 + sy * 0.3, R + 0.26),
          new THREE.Vector3(sx * 0.9, sy * 0.3, 0.5),
          0.07,
          0.14,
        );
      }
    }
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.4, 4), M.alu);
    wedge.scale.z = 0.4;
    wedge.rotation.y = Math.PI / 4;
    wedge.position.set(0, smTop - 0.2, R + 0.1);
    f.add(wedge);
  }
  if (block2) {
    // stowed high-gain antenna on the aft SM wall
    const h = add(sm, new THREE.Group());
    h.rotation.y = Math.PI;
    box(h, M.rib, 1.0, 0.7, 0.12, 0, smBot + 0.9, R + 0.08);
    for (const [dx, dy] of [
      [-0.24, -0.16],
      [0.24, -0.16],
      [-0.24, 0.16],
      [0.24, 0.16],
    ]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20), M.silver);
      d.rotation.x = Math.PI / 2;
      d.position.set(dx, smBot + 0.9 + dy, R + 0.17);
      h.add(d);
    }
    box(h, M.silver, 0.2, 0.2, 0.05, 0, smBot + 0.9, R + 0.2);
  }

  // forward bulkhead rim the command module's heat shield sits in
  cyl(sm, sw, R, R, smTop, smTop + 0.5, 60);
  torus(sm, M.aluDark, R + 0.004, 0.025, smTop + 0.25, 60);
  for (let i = 0; i < 3; i++) {
    const f = onProfile(sm, () => R, smTop + 0.25, (i / 3) * TAU + 0.5, 0.0);
    box(f, M.dark, 0.2, 0.03, 0.14, 0, 0.012, 0);
  }

  // command module
  const cm = grp(g, 'descent-module');
  cm.position.y = smTop;
  lathe(
    cm,
    shield,
    [
      [0.0, 0.0],
      [0.9, 0.04],
      [1.55, 0.16],
      [1.85, 0.3],
      [R, 0.5],
    ],
    60,
  );
  // the crew compartment cone, wearing its panel seams
  const cmR = (y: number): number => (y <= 0.5 ? R : R - ((y - 0.5) * (R - 0.62)) / 2.2);
  blanket(
    cm,
    cmWhite,
    [
      [R, 0.5],
      [0.62, 2.7],
    ],
    0.014,
    60,
    0.16,
  );
  torus(cm, shield, R - 0.02, 0.05, 0.5, 60);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    strut(cm, M.aluDark, pol(R - 0.02, a, 0.52), pol(0.64, a, 2.68), 0.01, 4);
  }
  for (const y of [1.0, 1.9]) torus(cm, M.aluDark, cmR(y) + 0.006, 0.012, y, 60);
  // forward compartment + apex
  cyl(cm, cmWhite, 0.62, 0.58, 2.7, 3.25, 40);
  torus(cm, M.silver, 0.6, 0.04, 2.7);
  // windows on the conic skin: rendezvous pair, side pair
  for (const [a, y, w, h] of [
    [0.45, 2.15, 0.2, 0.3],
    [-0.45, 2.15, 0.2, 0.3],
    [Math.PI / 2, 1.55, 0.3, 0.3],
    [-Math.PI / 2, 1.55, 0.3, 0.3],
  ] as [number, number, number, number][]) {
    const f = onProfile(cm, cmR, y, a, 0.006);
    box(f, M.rib, w + 0.07, 0.02, h + 0.07, 0, 0.004, 0);
    box(f, M.glass, w, 0.03, h, 0, 0.012, 0);
  }
  // side hatch with its window, on the back
  const hf = onProfile(cm, cmR, 1.2, Math.PI, 0.006);
  box(hf, M.silver, 0.95, 0.02, 0.95, 0, 0.004, 0);
  box(hf, M.aluDark, 0.8, 0.02, 0.8, 0, 0.014, 0);
  box(hf, M.glass, 0.28, 0.03, 0.28, 0, 0.026, 0.12);
  for (const sx of [-1, 1]) box(hf, M.rib, 0.04, 0.04, 0.2, sx * 0.3, 0.03, -0.2);
  // thruster pairs round the shoulder, and the umbilical on the front
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const f = onProfile(cm, cmR, 0.95, a, 0.01);
    box(f, M.dark, 0.15, 0.03, 0.12, 0, 0.012, 0);
    for (const dx of [-0.04, 0.04]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), M.nozzle);
      c.position.set(dx, 0.04, 0);
      f.add(c);
    }
  }

  if (block2) {
    // forward docking ring and probe: the highest point, on the axis
    cyl(cm, M.silver, 0.7, 0.62, 3.2, 3.25, 40);
    torus(cm, M.silver, 0.62, 0.05, 3.25);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const b = box(cm, M.dark, 0.07, 0.07, 0.07, 0, 3.27, 0);
      b.position.copy(pol(0.6, a, 3.28));
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      strut(cm, M.silver, pol(0.55, a, 3.27), pol(0.06, a, 3.5), 0.022, 5);
    }
    cyl(cm, M.rib, 0.05, 0.05, 3.25, 3.5, 12);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 20), M.silver);
    head.position.y = 3.57;
    cm.add(head);
  } else {
    // Block I: smooth forward hatch cover
    cyl(cm, cmWhite, 0.58, 0.45, 3.0, 3.25, 32);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 8, 0, TAU, 0, 0.4), cmWhite);
    cap.position.y = 3.25 - 0.45;
    cm.add(cap);
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
        'CSM: SM 4.52 m, 3.91 m diameter, SPS nozzle 3.88 m; Block I has no docking probe',
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
        'CSM total about 11.0 m, SM 4.52 m, 3.91 m diameter',
      ),
      {
        l: 'NSSDCA — Apollo 11 CSM: 11.0 m long, CM 3.65 m high',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A',
      },
    ],
  },
};
