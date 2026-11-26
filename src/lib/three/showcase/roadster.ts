/**
 * Showcase model: the Roadster that Falcon Heavy's first flight sent around the Sun (6 Feb 2018),
 * with the "Starman" mannequin at the wheel, as mounted above the payload adapter. Metres, upright
 * as on the launcher (base on y = 0), the car's nose toward +z.
 *
 * Sourced (docs/wip/2026-11-26-falcon-heavy-demo-sourced.md): the production car's length
 * 3,946 mm, wheelbase 2,352 mm, height 1,127 mm with the top up and width 1,851-1,873 mm (two
 * sources disagree); midnight-cherry paint; flown open-top; the car mounted "in an inclined
 * position above the payload adapter", three cameras on tubular booms from the adapter; Starman in
 * the white-and-black SpaceX suit, right hand on the wheel and left arm on the door. SpaceX's own
 * CC0 photos from the flight (Commons) give the carbon panel down the bonnet, the black windscreen
 * frame and roll bar, the red mirror shells, the seats and the pose.
 *
 * ESTIMATED, not sourced: the body sections between those dimensions (read from the photos), the
 * overhangs, the wheel and tyre sizes, the incline (20 degrees), the adapter's shape and size, the
 * boom layout and every colour value. No brand mark is drawn (operator, 2026-11-27: none), and the
 * dashboard screen is left blank.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Production dimensions (sourced). */
export const CAR_LENGTH_M = 3.946;
const WHEELBASE_M = 2.352;
/** ESTIMATE: the front axle this far behind the nose. */
const FRONT_AXLE_F = 0.8;
const REAR_AXLE_F = FRONT_AXLE_F + WHEELBASE_M;
/** ESTIMATE: tyre radii, front and rear (the rear wheels are the larger). */
const TYRE_R = [0.3, 0.317];
const TYRE_W = [0.175, 0.225];
/** ESTIMATE: half-tracks to the tyre centres. */
const HALF_TRACK = [0.73, 0.75];
/** ESTIMATE: the car's nose-up incline on its mount. */
export const MOUNT_INCLINE_RAD = (20 * Math.PI) / 180;
/** Starman sits on the left (the car is left-hand drive in the flight photos). */
const DRIVER_Z = -0.36;
/** Midnight cherry (sourced name; the shade is an ESTIMATE). */
const PAINT_HEX = 0x5c0d18;

/** Monotone cubic through a table (Fritsch-Carlson): smooth, no overshoot, no flat steps. */
function lerpTable(t: [number, number][], f: number): number {
  const n = t.length;
  if (f <= t[0][0]) return t[0][1];
  if (f >= t[n - 1][0]) return t[n - 1][1];
  let i = 1;
  while (f > t[i][0]) i++;
  const slope = (j: number) => (t[j + 1][1] - t[j][1]) / (t[j + 1][0] - t[j][0]);
  const tangent = (j: number): number => {
    if (j === 0) return slope(0);
    if (j === n - 1) return slope(n - 2);
    const a = slope(j - 1);
    const b = slope(j);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const [f0, v0] = t[i - 1];
  const [f1, v1] = t[i];
  const h = f1 - f0;
  const s = (f - f0) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * v0 +
    (s3 - 2 * s2 + s) * h * tangent(i - 1) +
    (-2 * s3 + 3 * s2) * v1 +
    (s3 - s2) * h * tangent(i)
  );
}

// Body sections against f, metres behind the nose (ESTIMATES read from the flight photos).
const TOP: [number, number][] = [
  [0, 0.5],
  [0.12, 0.6],
  [0.45, 0.7],
  [0.9, 0.77],
  [1.32, 0.83],
  [1.62, 0.86],
  [2.5, 0.88],
  [2.72, 0.95],
  [3.45, 0.97],
  [3.85, 0.93],
  [CAR_LENGTH_M, 0.8],
];
const BOTTOM: [number, number][] = [
  [0, 0.3],
  [0.28, 0.15],
  [0.6, 0.13],
  [3.55, 0.13],
  [3.85, 0.25],
  [CAR_LENGTH_M, 0.36],
];
const HALF_W: [number, number][] = [
  [0, 0.42],
  [0.14, 0.7],
  [0.45, 0.835],
  [0.95, 0.85],
  [1.65, 0.815],
  [2.35, 0.84],
  [2.95, 0.875],
  [3.6, 0.87],
  [CAR_LENGTH_M, 0.74],
];
/** Fender crowns: the wings stand proud of the bonnet and rear deck (photos). */
const FENDER: [number, number][] = [
  [0, 0],
  [0.2, 0.05],
  [0.8, 0.09],
  [1.3, 0.02],
  [1.6, 0],
  [2.6, 0],
  [3.0, 0.05],
  [3.4, 0.05],
  [CAR_LENGTH_M, 0],
];
/** The open cockpit, a rounded rectangle in plan (f range, half-width, corner radius). */
const COCKPIT = { f0: 1.6, f1: 2.52, hw: 0.68, r: 0.2, floor: 0.3 };
/** The carbon panel down the middle of the bonnet (photos), as half-width against f. */
const CARBON: [number, number][] = [
  [0.18, 0],
  [0.3, 0.3],
  [1.0, 0.42],
  [1.3, 0.46],
];

function sgnPow(v: number, p: number): number {
  return Math.sign(v) * Math.abs(v) ** p;
}

function cockpitDist(f: number, z: number): number {
  const c = COCKPIT;
  const cf = (c.f0 + c.f1) / 2;
  const qf = Math.abs(f - cf) - ((c.f1 - c.f0) / 2 - c.r);
  const qz = Math.abs(z) - (c.hw - c.r);
  return Math.hypot(Math.max(qf, 0), Math.max(qz, 0)) + Math.min(Math.max(qf, qz), 0) - c.r;
}

/** The undeformed skin at station f and section angle th (0 = right side, pi/2 = top). */
function skin(f: number, th: number): { z: number; y: number } {
  const yt = lerpTable(TOP, f);
  const yb = lerpTable(BOTTOM, f);
  const a = lerpTable(HALF_W, f);
  const st = Math.sin(th);
  const z = a * sgnPow(Math.cos(th), 2 / 3.2) * (1 - 0.1 * Math.max(0, st));
  let y = (yt + yb) / 2 + ((yt - yb) / 2) * sgnPow(st, 2 / 3.2);
  if (st > 0) y += lerpTable(FENDER, f) * Math.exp(-(((Math.abs(z) - 0.6) / 0.17) ** 2));
  return { z, y };
}

/** Height of the upper skin at (f, z), found by bisection on the section angle. */
function topY(f: number, z: number): number {
  let lo = 0;
  let hi = Math.PI / 2;
  const target = Math.min(Math.abs(z), skin(f, 0).z);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (skin(f, mid).z > target) lo = mid;
    else hi = mid;
  }
  return skin(f, (lo + hi) / 2).y;
}

/** A patch lying on the upper skin, `lift` above it, over f0..f1 and |z| < hw(f). */
function skinPatch(
  f0: number,
  f1: number,
  hw: (f: number) => number,
  lift: number,
): THREE.BufferGeometry {
  const NF = 48;
  const NZ = 24;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= NF; i++) {
    const f = f0 + ((f1 - f0) * i) / NF;
    const w = Math.max(hw(f), 1e-3);
    for (let j = 0; j <= NZ; j++) {
      const z = -w + (2 * w * j) / NZ;
      pos.push(CAR_LENGTH_M / 2 - f, topY(f, z) + lift, z);
    }
  }
  for (let i = 0; i < NF; i++)
    for (let j = 0; j < NZ; j++) {
      const a = i * (NZ + 1) + j;
      const b = a + NZ + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The body shell: superellipse sections lofted nose to tail, then the cockpit pressed down to its
 * floor and the wheel arches pushed up round each wheel. Paint, carbon and the dark interior are
 * vertex colours over one paint material.
 */
function bodyGeometry(): THREE.BufferGeometry {
  const NS = 160;
  const NA = 176;
  const pos: number[] = [];
  const col: number[] = [];
  // Vertex colours carry the paint (linear RGB), so the carbon and the interior are not tinted red.
  const cherry = new THREE.Color(PAINT_HEX);
  const paint = [cherry.r, cherry.g, cherry.b];
  const dark = [0.012, 0.012, 0.014];
  const arches = [0, 1].map((i) => ({
    f: i ? REAR_AXLE_F : FRONT_AXLE_F,
    y: TYRE_R[i],
    r: TYRE_R[i] + 0.055,
    zIn: HALF_TRACK[i] - TYRE_W[i] / 2 - 0.04,
  }));
  for (let s = 0; s <= NS; s++) {
    const u = s / NS;
    // Denser at the nose and tail, where the sections turn fastest.
    const f = CAR_LENGTH_M * (0.5 - 0.5 * Math.cos(Math.PI * u));
    for (let k = 0; k < NA; k++) {
      const th = (k / NA) * Math.PI * 2;
      const sk = skin(f, th);
      const z = sk.z;
      let y = sk.y;
      const ff = f;
      let rgb = paint;
      if (Math.sin(th) > 0 && cockpitDist(f, z) < 0) {
        y = COCKPIT.floor;
        rgb = dark;
      }
      for (const w of arches) {
        if (Math.abs(z) < w.zIn) continue;
        // Inside the arch circle, skin moves straight up onto the arch: the opening below it is
        // left clear for the tyre, and the moved underside becomes the wheel-well roof.
        const df = ff - w.f;
        if (Math.abs(df) >= w.r) continue;
        const archY = w.y + Math.sqrt(w.r * w.r - df * df);
        if (y < archY) {
          y = archY;
          rgb = dark;
        }
      }
      pos.push(CAR_LENGTH_M / 2 - ff, y, z);
      col.push(...rgb);
    }
  }
  const idx: number[] = [];
  for (let s = 0; s < NS; s++) {
    for (let k = 0; k < NA; k++) {
      const a0 = s * NA + k;
      const a1 = s * NA + ((k + 1) % NA);
      const b0 = a0 + NA;
      const b1 = a1 + NA;
      idx.push(a0, a1, b0, a1, b1, b0);
    }
  }
  // End caps: a fan to each end section's centre.
  for (const [s, flip] of [
    [0, false],
    [NS, true],
  ] as const) {
    let cx = 0;
    let cy = 0;
    for (let k = 0; k < NA; k++) {
      cx += pos[(s * NA + k) * 3];
      cy += pos[(s * NA + k) * 3 + 1];
    }
    const ci = pos.length / 3;
    pos.push(cx / NA, cy / NA, 0);
    col.push(...(s === 0 ? dark : paint));
    for (let k = 0; k < NA; k++) {
      const a0 = s * NA + k;
      const a1 = s * NA + ((k + 1) % NA);
      if (flip) idx.push(ci, a0, a1);
      else idx.push(ci, a1, a0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Black trim round the cockpit opening, on the skin. */
function cockpitRim(g: THREE.Group, p: P): void {
  const c = COCKPIT;
  const pts: THREE.Vector3[] = [];
  const cf = (c.f0 + c.f1) / 2;
  const hf = (c.f1 - c.f0) / 2 - c.r;
  const hz = c.hw - c.r;
  // Corners in order round the opening; each quarter arc sampled, the straights between them.
  const corners: [number, number, number][] = [
    [cf + hf, hz, 0],
    [cf - hf, hz, Math.PI / 2],
    [cf - hf, -hz, Math.PI],
    [cf + hf, -hz, (3 * Math.PI) / 2],
  ];
  for (const [f, z, a0] of corners) {
    for (let i = 0; i <= 8; i++) {
      const a = a0 + (i / 8) * (Math.PI / 2);
      const ff = f + Math.cos(a) * c.r;
      const zz = z + Math.sin(a) * c.r;
      pts.push(V(X(ff), topY(ff, zz) + 0.012, zz));
    }
  }
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  add(g, new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.022, 8, true), p.black)).name =
    'cockpit-rim';
}

/** x in the car's frame for a station f behind the nose. */
const X = (f: number): number => CAR_LENGTH_M / 2 - f;

interface P {
  paint: Mat;
  paintSolid: Mat;
  carbon: Mat;
  black: Mat;
  trim: Mat;
  rubber: Mat;
  alloy: Mat;
  chrome: Mat;
  glass: Mat;
  lamp: Mat;
  tail: Mat;
  seat: Mat;
  seatRed: Mat;
  suit: Mat;
  suitDark: Mat;
  visor: Mat;
  adapter: Mat;
  boom: Mat;
  camera: Mat;
}

function palette(): P {
  const glass = mat(0x1d2a36, 0.2, 0.05);
  glass.transparent = true;
  glass.opacity = 0.32;
  glass.depthWrite = false;
  glass.side = THREE.DoubleSide;
  const paint = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.55,
    roughness: 0.3,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
  return {
    paint,
    paintSolid: mat(PAINT_HEX, 0.55, 0.3),
    carbon: (() => {
      const m = mat(0x1e1f22, 0.45, 0.32);
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -2;
      return m;
    })(),
    black: mat(0x121214, 0.2, 0.55),
    trim: mat(0x1c1c1f, 0.4, 0.4),
    rubber: mat(0x161616, 0, 0.9),
    alloy: mat(0x6c6e73, 0.85, 0.3),
    chrome: mat(0xc9ccd1, 1, 0.15),
    glass,
    lamp: mat(0xd8dde2, 0.9, 0.1),
    tail: mat(0x8a1010, 0.3, 0.25),
    seat: mat(0x1a1a1c, 0.05, 0.75),
    seatRed: mat(0x4e1f1a, 0.05, 0.7),
    suit: mat(0xe9e9e6, 0.05, 0.6),
    suitDark: mat(0x2a2b2f, 0.15, 0.55),
    visor: mat(0x08090c, 0.9, 0.08),
    adapter: mat(0xd9d9d6, 0.3, 0.55),
    boom: mat(0x8d9096, 0.8, 0.35),
    camera: mat(0x1b1c1f, 0.3, 0.5),
  };
}

/** A capsule from a to b (limbs, the torso). */
function limb(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  r: number,
): THREE.Mesh {
  const len = Math.max(1e-3, a.distanceTo(b));
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return add(g, mesh);
}

function wheel(p: P, i: number, side: number): THREE.Group {
  const r = TYRE_R[i];
  const w = TYRE_W[i];
  const g = new THREE.Group();
  // Tyre: a lathe about the axle (the group's y), rounded shoulders.
  const rim = r * 0.66;
  lathe(
    g,
    p.rubber,
    [
      [rim, -w / 2],
      [r - 0.03, -w / 2],
      [r, -w / 2 + 0.03],
      [r, w / 2 - 0.03],
      [r - 0.03, w / 2],
      [rim, w / 2],
    ],
    40,
  );
  // Alloy: a dished face and five spokes to the hub, on the outer side.
  const face = add(
    g,
    new THREE.Mesh(new THREE.CylinderGeometry(rim, rim, w * 0.9, 32, 1, true), p.alloy),
  );
  face.material = p.alloy;
  const lip = add(g, new THREE.Mesh(new THREE.TorusGeometry(rim, 0.012, 6, 32), p.alloy));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = w / 2 - 0.01;
  const disc = add(
    g,
    new THREE.Mesh(new THREE.CylinderGeometry(rim * 0.8, rim * 0.8, 0.02, 28), p.trim),
  );
  disc.position.y = -w * 0.1;
  const hub = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 16), p.alloy));
  hub.position.y = w / 2 - 0.04;
  for (let s = 0; s < 5; s++) {
    const a = (s / 5) * Math.PI * 2;
    const sp = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, rim - 0.04), p.alloy));
    sp.position.set(Math.sin(a) * rim * 0.5, w / 2 - 0.035, Math.cos(a) * rim * 0.5);
    sp.rotation.y = a;
  }
  // Axle along the car's z: the outer face toward the side the wheel is on.
  g.rotation.x = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  g.position.set(X(i ? REAR_AXLE_F : FRONT_AXLE_F), r, side * HALF_TRACK[i]);
  return g;
}

function windscreen(g: THREE.Group, p: P): void {
  // Base on the scuttle, header 0.26 m up and 0.36 m back; bowed forward at the middle.
  const N = 24;
  const fB = 1.3;
  const fT = 1.66;
  const yB = 0.84;
  const yT = 1.1;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= 1; j++) {
    const f = j ? fT : fB;
    const y = j ? yT : yB;
    const hw = j ? 0.6 : 0.7;
    for (let i = 0; i <= N; i++) {
      const s = (i / N) * 2 - 1;
      pos.push(X(f - 0.07 * (1 - s * s)), y, s * hw);
    }
  }
  for (let i = 0; i < N; i++) idx.push(i, i + 1, i + N + 1, i + 1, i + N + 2, i + N + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  add(g, new THREE.Mesh(geo, p.glass));
  // Black frame: header and A-pillars as tubes along the glass edges.
  const at = (j: number, i: number) =>
    V(pos[(j * (N + 1) + i) * 3], pos[(j * (N + 1) + i) * 3 + 1], pos[(j * (N + 1) + i) * 3 + 2]);
  for (let i = 0; i < N; i++) strut(g, p.black, at(1, i), at(1, i + 1), 0.02, 8);
  strut(g, p.black, at(0, 0), at(1, 0), 0.022, 8);
  strut(g, p.black, at(0, N), at(1, N), 0.022, 8);
  // Rear-view mirror on the header.
  box(g, p.black, 0.06, 0.06, 0.22, X(fT - 0.04), yT - 0.07, 0.02);
}

function cabin(g: THREE.Group, p: P): void {
  // Dashboard under the scuttle, carbon-dark, with the instrument binnacle ahead of the driver.
  const dash = add(g, new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 1.34, 3, 0.05), p.trim));
  dash.position.set(X(1.55), 0.7, 0);
  const bin = add(
    g,
    new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16, 1, false, 0, Math.PI), p.black),
  );
  bin.rotation.set(0, 0, Math.PI / 2);
  bin.position.set(X(1.62), 0.84, DRIVER_Z);
  // Centre screen, blank.
  box(g, p.black, 0.02, 0.1, 0.16, X(1.71), 0.74, 0.02);
  // Steering wheel: rim, three spokes, column into the dash; tilted toward the driver.
  const sw = new THREE.Group();
  sw.position.set(X(1.8), 0.71, DRIVER_Z);
  sw.rotation.set(0, Math.PI / 2, 0);
  sw.rotateX(-0.42);
  add(sw, new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.02, 8, 36), p.black));
  for (const a of [Math.PI / 2, Math.PI * 1.25, Math.PI * 1.75]) {
    const sp = add(sw, new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.02), p.alloy));
    sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0);
    sp.rotation.z = a;
  }
  add(sw, new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), p.trim)).rotation.x =
    Math.PI / 2;
  g.add(sw);
  strut(g, p.trim, V(X(1.8), 0.71, DRIVER_Z), V(X(1.6), 0.64, DRIVER_Z), 0.03, 8);
  // Seats: shell, cushion and side bolsters; the passenger's in the red-brown trim of the photos.
  for (const z of [DRIVER_Z, -DRIVER_Z]) {
    const m = z === DRIVER_Z ? p.seat : p.seatRed;
    const seat = new THREE.Group();
    seat.position.set(X(2.36), COCKPIT.floor, z);
    const back = add(seat, new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.62, 0.46, 3, 0.05), m));
    back.position.set(-0.08, 0.36, 0);
    back.rotation.z = 0.36;
    const cushion = add(seat, new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.1, 0.44, 3, 0.04), m));
    cushion.position.set(0.18, 0.07, 0);
    cushion.rotation.z = -0.08;
    for (const s of [-1, 1]) {
      const bol = add(seat, new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.5, 0.07, 3, 0.03), m));
      bol.position.set(-0.04, 0.36, s * 0.25);
      bol.rotation.z = 0.36;
    }
    g.add(seat);
  }
  // Roll bar behind the seats, black: a hoop across with two posts (photos).
  const yBar = 1.02;
  const fBar = 2.6;
  strut(g, p.black, V(X(fBar), yBar, -0.62), V(X(fBar), yBar, 0.62), 0.04, 10);
  for (const s of [-1, 1])
    strut(g, p.black, V(X(fBar), yBar, s * 0.62), V(X(fBar + 0.12), 0.88, s * 0.72), 0.045, 10);
  // Door mirrors: a stalk and a red shell (photos), just behind the windscreen base.
  for (const s of [-1, 1]) {
    strut(g, p.black, V(X(1.42), 0.86, s * 0.74), V(X(1.46), 0.9, s * 0.88), 0.015, 6);
    const shell = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), p.paintSolid));
    shell.scale.set(0.8, 0.65, 1.15);
    shell.position.set(X(1.47), 0.91, s * 0.93);
    const face = add(g, new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), p.chrome));
    face.position.set(X(1.53), 0.91, s * 0.93);
    face.rotation.y = -Math.PI / 2;
  }
}

function lamps(g: THREE.Group, p: P): void {
  // Headlamps in the noses of the front wings, teardrop lenses over chrome.
  for (const s of [-1, 1]) {
    const lens = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), p.glass));
    lens.scale.set(1.5, 0.55, 0.85);
    lens.position.set(X(0.2), 0.6, s * 0.6);
    lens.rotation.z = -0.3;
    const reflector = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), p.lamp));
    reflector.scale.set(1.3, 0.6, 0.9);
    reflector.position.set(X(0.24), 0.58, s * 0.6);
    // Tail lamps: a round pair each side on the tail panel.
    for (const dz of [0.0, 0.17]) {
      const t = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 18), p.tail));
      t.rotation.z = Math.PI / 2;
      t.position.set(X(CAR_LENGTH_M - 0.06), 0.72, s * (0.42 + dz));
    }
    // Side intake ahead of each rear wheel.
    const intake = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), p.black));
    intake.scale.set(1.4, 0.45, 0.12);
    intake.position.set(X(2.72), 0.56, s * 0.84);
  }
  // Mouth under the nose and a dark diffuser under the tail.
  const mouth = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 10), p.black));
  mouth.scale.set(0.12, 0.32, 1.9);
  mouth.position.set(X(0.035), 0.31, 0);
  box(g, p.black, 0.08, 0.14, 1.2, X(CAR_LENGTH_M - 0.04), 0.33, 0);
}

/** Starman: the suit white with dark panels, helmet with a black visor; posed as in the photos. */
function starman(g: THREE.Group, p: P): void {
  const z0 = DRIVER_Z;
  const hip = V(X(2.3), 0.48, z0);
  const neck = V(X(2.48), 0.98, z0);
  // Torso: a capsule widened across the car.
  const torso = limb(
    g,
    p.suit,
    hip.clone().add(V(0, 0.08, 0)),
    neck.clone().add(V(0, -0.06, 0)),
    0.15,
  );
  torso.scale.set(1.05, 1, 1.0);
  const chest = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), p.suit));
  chest.scale.set(0.75, 0.9, 1.12);
  chest.position.copy(hip.clone().lerp(neck, 0.62));
  // Collar ring and helmet: a white shell, the visor a black cap facing forward (+x).
  const ring = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 20), p.suitDark));
  ring.position.copy(neck).add(V(0.0, 0.03, 0));
  ring.rotation.x = Math.PI / 2;
  const head = neck.clone().add(V(X(2.5) - X(2.48), 0.2, 0));
  const helmet = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), p.suit));
  helmet.scale.set(1.08, 1.0, 0.96);
  helmet.position.copy(head);
  const visor = add(
    g,
    new THREE.Mesh(
      // phi = pi is +x in SphereGeometry: the visor faces forward.
      new THREE.SphereGeometry(
        0.158,
        24,
        12,
        Math.PI * 0.68,
        Math.PI * 0.64,
        Math.PI * 0.32,
        Math.PI * 0.3,
      ),
      p.visor,
    ),
  );
  visor.scale.copy(helmet.scale);
  visor.position.copy(head);
  // Arms: right hand on the wheel's right side, left elbow on the door top, forearm along it.
  const shL = neck.clone().add(V(0, -0.05, -0.2));
  const shR = neck.clone().add(V(0, -0.05, 0.2));
  for (const s of [shL, shR]) {
    const cap = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), p.suitDark));
    cap.position.copy(s);
  }
  const elR = V(X(2.15), 0.66, z0 + 0.26);
  const haR = V(X(1.86), 0.8, z0 + 0.13);
  // On the door top (the skin's height there), not floating above it.
  const elL = V(X(2.22), topY(2.22, -0.72) + 0.05, -0.72);
  const haL = V(X(1.86), topY(1.86, -0.74) + 0.045, -0.74);
  limb(g, p.suit, shR, elR, 0.05);
  limb(g, p.suit, elR, elR.clone().lerp(haR, 0.55), 0.045);
  limb(g, p.suitDark, elR.clone().lerp(haR, 0.55), haR, 0.042);
  limb(g, p.suit, shL, elL, 0.05);
  limb(g, p.suit, elL, elL.clone().lerp(haL, 0.55), 0.045);
  limb(g, p.suitDark, elL.clone().lerp(haL, 0.55), haL, 0.042);
  for (const e of [elR, elL])
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), p.suitDark)).position.copy(e);
  for (const h of [haR, haL]) {
    const glove = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), p.suitDark));
    glove.scale.set(1.3, 0.8, 1);
    glove.position.copy(h);
  }
  // Legs: thighs forward to the knees, shins down to the boots under the dash.
  for (const s of [-1, 1]) {
    const h = hip.clone().add(V(0, 0, s * 0.1));
    const knee = V(X(1.9), 0.58, z0 + s * 0.11);
    const foot = V(X(1.5), 0.38, z0 + s * 0.12);
    limb(g, p.suit, h, knee, 0.075);
    limb(g, p.suit, knee, foot, 0.06);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), p.suitDark)).position.copy(knee);
    const boot = box(g, p.suitDark, 0.24, 0.11, 0.11, foot.x - 0.06, foot.y - 0.02, foot.z);
    boot.rotation.z = 0.15;
  }
}

/** The car alone, in its own frame: nose +x, wheels on y = 0, centred on x and z. */
export function buildRoadsterCar(p: P = palette()): THREE.Group {
  const g = new THREE.Group();
  g.name = 'roadster-car';
  add(g, new THREE.Mesh(bodyGeometry(), p.paint)).name = 'body';
  add(
    g,
    new THREE.Mesh(
      skinPatch(0.18, 1.3, (f) => lerpTable(CARBON, f), 0.004),
      p.carbon,
    ),
  ).name = 'bonnet-carbon';
  cockpitRim(g, p);
  for (const i of [0, 1]) for (const s of [-1, 1]) g.add(wheel(p, i, s));
  windscreen(g, p);
  cabin(g, p);
  lamps(g, p);
  starman(g, p);
  return g;
}

/**
 * The adapter and the camera booms (ESTIMATE: shape and size; sourced only that three cameras rode
 * on tubular booms from a custom adapter and that the car sat inclined above it).
 */
function mount(p: P): THREE.Group {
  const g = new THREE.Group();
  g.name = 'payload-adapter';
  lathe(
    g,
    p.adapter,
    [
      [0, 0],
      [0.8, 0],
      [0.8, 0.08],
      [0.5, 0.62],
      [0.36, 0.7],
      [0, 0.7],
    ],
    40,
  );
  const ring = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.025, 8, 40), p.boom));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  return g;
}

export function buildRoadster(): THREE.Group {
  const p = palette();
  const root = new THREE.Group();
  root.name = 'roadster';
  const base = mount(p);
  root.add(base);
  const tilt = new THREE.Group();
  tilt.name = 'roadster-incline';
  const car = buildRoadsterCar(p);
  car.rotation.y = -Math.PI / 2; // nose toward +z
  tilt.add(car);
  tilt.rotation.x = -MOUNT_INCLINE_RAD; // nose up
  // The floor sits on a cradle above the adapter top; the pivot is the car's mid-floor.
  const pivotY = 0.7 + 0.32;
  tilt.position.y = pivotY - 0.13;
  root.add(tilt);
  // Cradle struts from the adapter top to four floor points under the car (ESTIMATE).
  tilt.updateMatrixWorld(true);
  root.updateMatrixWorld(true);
  const floorPts = [
    [0.9, 0.42],
    [0.9, -0.42],
    [-0.9, 0.42],
    [-0.9, -0.42],
  ].map(([x, z]) => car.localToWorld(V(x, 0.13, z)));
  for (const fp of floorPts) {
    const foot = V(Math.sign(fp.x) * 0.3, 0.7, Math.sign(fp.z) * 0.3);
    strut(root, p.boom, foot, fp, 0.035, 8);
  }
  // Three camera booms: ahead of the nose looking back, off the left rear looking forward at
  // Starman, and one over the passenger's shoulder (the views in SpaceX's photos).
  // Each boom leaves the adapter, runs under the floor and clear of the body to its camera.
  const C = (x: number, y: number, z: number) => car.localToWorld(V(x, y, z));
  const cams: { path: THREE.Vector3[]; look: THREE.Vector3 }[] = [
    { path: [C(1.0, 0.02, 0.2), C(2.35, 0.1, 0.2), C(2.55, 1.0, 0)], look: C(0, 0.9, 0) },
    {
      path: [C(-0.6, 0.02, -0.5), C(-1.3, 0.05, -1.25), C(-1.3, 1.2, -1.3)],
      look: C(0.2, 1.0, -0.4),
    },
    {
      path: [C(-0.6, 0.02, 0.5), C(-1.0, 0.05, 1.15), C(-1.0, 1.35, 1.1), C(-0.95, 1.3, 0.5)],
      look: C(0.8, 0.9, -0.1),
    },
  ];
  for (const { path, look } of cams) {
    const at = path[path.length - 1];
    let prev = V(0, 0.7, 0).lerp(V(path[0].x, 0.7, path[0].z), 0.4);
    for (const q of path) {
      strut(root, p.boom, prev, q, 0.025, 8);
      prev = q;
    }
    const cam = box(root, p.camera, 0.09, 0.07, 0.12, at.x, at.y, at.z);
    cam.lookAt(look);
  }
  // Base on y = 0.
  const bb = new THREE.Box3().setFromObject(root);
  root.position.y = -bb.min.y;
  const out = new THREE.Group();
  out.add(root);
  return out;
}

const REF = (l: string, u: string): ShowcaseRef => ({ l, u });
const WC = (file: string, what: string): ShowcaseRef =>
  REF(
    `Wikimedia Commons — ${file.replace(/_/g, ' ')}: ${what}`,
    `https://commons.wikimedia.org/wiki/File:${encodeURI(file)}`,
  );

/** Overall drawn height, metres (roadster.test.ts rebuilds the model and checks it). */
export const ROADSTER_HEIGHT_M = 2.76;

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'tesla-roadster': {
    build: buildRoadster,
    heightM: ROADSTER_HEIGHT_M,
    heightEstimate:
      'No published height for the car on its mount: the production car (3.946 m long, 2.352 m wheelbase) inclined 20 degrees nose-up above a payload adapter whose shape and size are judged.',
    diameterM: 1.87,
    refs: [
      REF(
        'Wikipedia — Tesla Roadster (first generation): length 3,946 mm, wheelbase 2,352 mm, height 1,127 mm, width 1,873 mm',
        'https://en.wikipedia.org/wiki/Tesla_Roadster_(first_generation)',
      ),
      REF(
        "Wikipedia — Elon Musk's Tesla Roadster: mounted inclined above the payload adapter, three cameras on booms, Starman in the SpaceX suit",
        'https://en.wikipedia.org/wiki/Elon_Musk%27s_Tesla_Roadster',
      ),
      WC(
        "Elon_Musk's_Tesla_Roadster_(40110297852).jpg",
        'SpaceX, CC0: front view with Earth, the carbon bonnet panel, windscreen frame and roll bar',
      ),
      WC(
        "Elon_Musk's_Tesla_Roadster_(40143096241).jpg",
        'SpaceX, CC0: left side, Starman with his left arm along the door',
      ),
      WC(
        "Elon_Musk's_Tesla_Roadster_(40110298232).jpg",
        'SpaceX, CC0: over the shoulder, right hand on the wheel, the dashboard',
      ),
    ],
  },
};
