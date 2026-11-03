/**
 * Showcase models — winged orbital vehicles: the Space Shuttle orbiters, Buran, the OK-GLI
 * atmospheric test vehicle and the X-37B.
 *
 * Frame (contract): metres, nose UP (+y), base y = 0 at the engine-exit plane, front +z. Span runs
 * along x. The vehicle's own "up" (dorsal: fin, payload-bay doors, windows) points to -z; the
 * belly (black tiles, gear doors, body flap) faces +z. All builders are authored at the
 * Shuttle's scale and scaled uniformly to the sourced overall length.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';

const std = (color: number, roughness = 0.85, metalness = 0.05): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

interface Mats {
  white: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  rcc: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  line: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  bell: THREE.MeshStandardMaterial;
  engine: THREE.MeshStandardMaterial;
  blanket: THREE.MeshStandardMaterial;
  hull: THREE.MeshStandardMaterial;
  panel: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
}

function mats(): Mats {
  return {
    white: std(0xe8e8e3),
    black: std(0x26262a, 0.7),
    rcc: std(0x2c2c2f, 0.5, 0.2),
    glass: std(0x0a1018, 0.15, 0.6),
    line: std(0x3b3b3f),
    dark: std(0x101012),
    bell: std(0x75706a, 0.4, 0.7),
    engine: std(0x9a9a95, 0.6, 0.3),
    blanket: std(0xcdc5b0, 0.95),
    hull: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.04 }),
    panel: std(0x1d2a52, 0.35, 0.5),
    gold: std(0xb8923a, 0.4, 0.7),
  };
}

// ── geometry helpers ─────────────────────────────────────────────────────────

interface Stn {
  a: number; // axial station (y)
  w: number; // half width
  t: number; // dorsal half height
  b: number; // ventral half height
}

function prof(stns: Stn[], a: number): Stn {
  if (a <= stns[0].a) return stns[0];
  for (let i = 1; i < stns.length; i++) {
    if (a <= stns[i].a) {
      const p = stns[i - 1];
      const q = stns[i];
      const f = (a - p.a) / (q.a - p.a);
      return {
        a,
        w: p.w + (q.w - p.w) * f,
        t: p.t + (q.t - p.t) * f,
        b: p.b + (q.b - p.b) * f,
      };
    }
  }
  return stns[stns.length - 1];
}

/** Vehicle-up coordinate v of the surface at station a, lateral x (dorsal or ventral). */
function surfV(stns: Stn[], n: number, a: number, x: number, dorsal: boolean): number {
  const p = prof(stns, a);
  const r = Math.min(Math.abs(x) / p.w, 0.999);
  const k = Math.pow(1 - Math.pow(r, n), 1 / n);
  return dorsal ? p.t * k : -p.b * k;
}

type ColorFn = (x: number, a: number, v: number) => THREE.Color;

/** Lofted superellipse body along y; vertex colours per face, closed by caps. */
function loft(
  coarse: Stn[],
  opts: {
    n: number;
    ring?: number;
    cx?: number;
    cv?: number;
    color: ColorFn;
    capColor?: THREE.Color;
  },
): THREE.BufferGeometry {
  const stns: Stn[] = [];
  for (let i = 0; i < coarse.length - 1; i++) {
    const p = coarse[i];
    const q = coarse[i + 1];
    const steps = Math.max(1, Math.ceil((q.a - p.a) / 1.2));
    for (let k = 0; k < steps; k++) stns.push(prof(coarse, p.a + ((q.a - p.a) * k) / steps));
  }
  stns.push(coarse[coarse.length - 1]);
  const ring = opts.ring ?? 24;
  const cx = opts.cx ?? 0;
  const cv = opts.cv ?? 0;
  const ex = 2 / opts.n;
  const pos: number[] = [];
  const idx: number[] = [];
  const S = stns.length;
  for (const s of stns) {
    for (let j = 0; j < ring; j++) {
      const th = (j / ring) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const px = s.w * Math.sign(c) * Math.pow(Math.abs(c), ex);
      const pv = sn >= 0 ? s.t * Math.pow(sn, ex) : -s.b * Math.pow(-sn, ex);
      pos.push(cx + px, s.a, -(cv + pv));
    }
  }
  for (let i = 0; i < S - 1; i++) {
    for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring;
      const a = i * ring + j;
      const b = i * ring + j2;
      const c = (i + 1) * ring + j2;
      const d = (i + 1) * ring + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  const col: number[] = [];
  const p = ng.getAttribute('position');
  for (let i = 0; i < p.count; i += 6) {
    let x = 0;
    let a = 0;
    let v = 0;
    for (let k = 0; k < 6; k++) {
      x += p.getX(i + k) / 6;
      a += p.getY(i + k) / 6;
      v -= p.getZ(i + k) / 6;
    }
    const c = opts.color(x, a, v);
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  // flat caps at both ends (own vertices so the rim stays crisp)
  const capPos: number[] = [];
  const capCol: number[] = [];
  const capC = opts.capColor ?? new THREE.Color(0x6e675c);
  const addCap = (si: number, flip: boolean): void => {
    const s = stns[si];
    const o = si * ring;
    for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring;
      const A = [pos[(o + j) * 3], pos[(o + j) * 3 + 1], pos[(o + j) * 3 + 2]];
      const B = [pos[(o + j2) * 3], pos[(o + j2) * 3 + 1], pos[(o + j2) * 3 + 2]];
      const Cc = [cx, s.a, -cv];
      const tri = flip ? [A, Cc, B] : [A, B, Cc];
      for (const q of tri) capPos.push(q[0], q[1], q[2]);
      for (let k = 0; k < 3; k++) capCol.push(capC.r, capC.g, capC.b);
    }
  };
  addCap(0, false);
  addCap(S - 1, true);
  const all = new Float32Array([...Array.from(p.array as Float32Array), ...capPos]);
  const nrm = new Float32Array([
    ...Array.from(ng.getAttribute('normal').array as Float32Array),
    ...new Array(capPos.length).fill(0),
  ]);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(all, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute([...col, ...capCol], 3));
  ng.dispose();
  // orientation: make signed volume positive, then recompute normals flat for the caps
  let vol = 0;
  const q = out.getAttribute('position');
  for (let i = 0; i < q.count; i += 3) {
    const ax = q.getX(i),
      ay = q.getY(i),
      az = q.getZ(i);
    const bx = q.getX(i + 1),
      by = q.getY(i + 1),
      bz = q.getZ(i + 1);
    const cxx = q.getX(i + 2),
      cy = q.getY(i + 2),
      cz = q.getZ(i + 2);
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cxx) + az * (bx * cy - by * cxx)) / 6;
  }
  if (vol < 0) {
    const arr = q.array as Float32Array;
    const carr = out.getAttribute('color').array as Float32Array;
    for (let i = 0; i < q.count; i += 3) {
      for (let k = 0; k < 3; k++) {
        const t = arr[(i + 1) * 3 + k];
        arr[(i + 1) * 3 + k] = arr[(i + 2) * 3 + k];
        arr[(i + 2) * 3 + k] = t;
        const tc = carr[(i + 1) * 3 + k];
        carr[(i + 1) * 3 + k] = carr[(i + 2) * 3 + k];
        carr[(i + 2) * 3 + k] = tc;
      }
    }
  }
  out.computeVertexNormals();
  // computeVertexNormals on non-indexed geometry gives flat normals; smooth the body part by
  // re-deriving them from the indexed hull for a rounder look.
  return smoothBody(out, stns.length, ring);
}

/** Replace flat normals of the lofted body by position-welded smooth normals. */
function smoothBody(g: THREE.BufferGeometry, S: number, ring: number): THREE.BufferGeometry {
  const bodyVerts = (S - 1) * ring * 6;
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const acc = new Map<string, THREE.Vector3>();
  const key = (i: number): string =>
    `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
  for (let i = 0; i < bodyVerts; i++) {
    const k = key(i);
    const v = acc.get(k) ?? new THREE.Vector3();
    v.add(new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i)));
    acc.set(k, v);
  }
  for (let i = 0; i < bodyVerts; i++) {
    const v = acc.get(key(i))!.clone().normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  parent.add(o);
  return o;
}

/** Flat panel from a 2D polygon, extruded `depth`, placed by an orthonormal basis. */
function panel(
  pts: Array<[number, number]>,
  depth: number,
  m: THREE.Material,
  parent: THREE.Object3D,
  ex: THREE.Vector3,
  ey: THREE.Vector3,
  origin: THREE.Vector3,
): THREE.Mesh {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  const ez = new THREE.Vector3().crossVectors(ex, ey);
  const mat4 = new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(origin);
  g.applyMatrix4(mat4);
  return mesh(g, m, parent);
}

/** Thin bar between two points in the (x, y) plane at depth z. */
function bar(
  p: [number, number],
  q: [number, number],
  w: number,
  h: number,
  z: number,
  m: THREE.Material,
  parent: THREE.Object3D,
): void {
  const dx = q[0] - p[0];
  const dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  const b = mesh(new THREE.BoxGeometry(w, len, h), m, parent);
  b.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, z);
  b.rotation.z = Math.atan2(-dx, dy);
}

function box(
  sx: number,
  sy: number,
  sz: number,
  m: THREE.Material,
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const b = mesh(new THREE.BoxGeometry(sx, sy, sz), m, parent);
  b.position.set(x, y, z);
  return b;
}

/** Rocket bell, exit plane at yExit, throat above; axis along y. */
function bellMesh(
  rExit: number,
  rThroat: number,
  len: number,
  m: THREE.Material,
  parent: THREE.Object3D,
  x: number,
  z: number,
  yExit: number,
  contour = 0.6,
): void {
  const pts: THREE.Vector2[] = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const f = i / N; // 0 at exit → 1 at throat
    const rr = rThroat + (rExit - rThroat) * Math.pow(1 - f, contour);
    pts.push(new THREE.Vector2(rr, yExit + len * f));
  }
  const g = new THREE.LatheGeometry(pts, 24);
  const mm = m.clone();
  (mm as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  const o = mesh(g, mm, parent);
  o.position.set(x, 0, z);
}

// ── Orbiter / Buran builder ──────────────────────────────────────────────────

const L0 = 37.237;
const SPAN0 = 23.79;
const DORSAL_Z = (v: number): number => -v;

type Variant = 'shuttle' | 'columbia' | 'enterprise' | 'buran' | 'gli';

interface OrbiterOpts {
  variant: Variant;
  length: number;
  span: number;
}

function buildOrbiter(o: OrbiterOpts): THREE.Group {
  const M = mats();
  const root = new THREE.Group();
  const g = new THREE.Group(); // authored at Shuttle scale
  root.add(g);
  const isBuran = o.variant === 'buran' || o.variant === 'gli';
  const isEnt = o.variant === 'enterprise';
  const aft = isBuran ? 0.9 : 2.2; // aft bulkhead station

  const stns: Stn[] = [
    { a: aft, w: 2.8, t: 2.5, b: 2.3 },
    { a: aft + 2, w: 2.85, t: 2.6, b: 2.35 },
    { a: 7, w: 2.8, t: 2.5, b: 2.35 },
    { a: 26, w: 2.6, t: 2.4, b: 2.3 },
    { a: 29, w: 2.4, t: 2.4, b: 2.2 },
    { a: 32, w: 2.0, t: 2.0, b: 1.9 },
    { a: 34.5, w: 1.4, t: 1.4, b: 1.3 },
    { a: 35.6, w: 1.22, t: 1.12, b: 1.1 },
    { a: 36.5, w: 0.9, t: 0.82, b: 0.8 },
    { a: 37.0, w: 0.55, t: 0.5, b: 0.5 },
    { a: 37.18, w: 0.3, t: 0.27, b: 0.27 },
    { a: L0, w: 0.05, t: 0.05, b: 0.05 },
  ];
  const N = 2.6;
  const nose = new THREE.Color(0x232326);
  const blk = new THREE.Color(0x26262a);
  const wht = new THREE.Color(0xe8e8e3);
  const grey = new THREE.Color(0x3a3a3d);
  const lowBlack = (a: number): number => (a < 27 ? -0.95 : -0.95 + ((a - 27) / 7) * 1.05);
  const hullColor: ColorFn = (_x, a, v) => {
    if (a > 36.0) return nose;
    if (isEnt && a < 26 && v < lowBlack(a)) return grey;
    return v < lowBlack(a) ? blk : wht;
  };
  const hull = loft(stns, { n: N, color: hullColor, capColor: new THREE.Color(0x6e675c) });
  mesh(hull, M.hull, g);

  const half = o.span / 2 / (o.length / L0);
  const XT = 11.695;
  const sx = (half - 0.2) / XT;
  const W = (x: number): number => x * sx;

  // ── wings (right side authored; mirrored with scale.x = -1) ──
  const wingZ0 = 1.85;
  const wingT = 0.45;
  const wingPoly: Array<[number, number]> = [
    [2.0, 30.0],
    [W(4.9), 21.0],
    [W(XT), 13.5],
    [W(XT), 8.5],
    [W(2.8), 4.2],
    [2.0, 4.2],
  ];
  const sideR = new THREE.Group();
  const ID = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] as const;
  const wUp = panel(wingPoly, wingT / 2, M.white, sideR, ID[0], ID[1], new THREE.Vector3(0, 0, 0));
  wUp.position.z = wingZ0 + wingT / 4;
  const wLo = panel(wingPoly, wingT / 2, M.black, sideR, ID[0], ID[1], new THREE.Vector3(0, 0, 0));
  wLo.position.z = wingZ0 + (3 * wingT) / 4;
  const zMid = wingZ0 + wingT / 2;
  const rccM = isEnt ? M.white : M.rcc;
  const rccBar = (p: [number, number], q: [number, number]): void => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    const c = mesh(new THREE.CylinderGeometry(0.2, 0.2, len, 10), rccM, sideR);
    c.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, zMid);
    c.rotation.z = Math.atan2(-dx, dy);
  };
  rccBar([2.2, 29.6], [W(4.9), 21.0]);
  rccBar([W(4.9), 21.0], [W(XT), 13.5]);
  {
    const s = mesh(new THREE.SphereGeometry(0.2, 10, 8), rccM, sideR);
    s.position.set(W(4.9), 21.0, zMid);
    const s2 = mesh(new THREE.SphereGeometry(0.2, 10, 8), rccM, sideR);
    s2.position.set(W(XT), 13.5, zMid);
  }
  // elevon seams on the upper (dorsal, -z) surface
  const zTop = wingZ0 - 0.012;
  bar([W(3.0), 6.1], [W(11.7), 10.3], 0.05, 0.03, zTop, M.line, sideR);
  bar([W(7.4), 7.1], [W(7.4), 8.6], 0.05, 0.03, zTop, M.line, sideR);
  // Columbia's black chines on the wing glove
  if (o.variant === 'columbia') {
    panel(
      [
        [2.2, 29.6],
        [W(4.8), 21.2],
        [W(3.3), 21.2],
        [2.2, 25.0],
      ],
      0.03,
      M.black,
      sideR,
      ID[0],
      ID[1],
      new THREE.Vector3(0, 0, 0),
    ).position.z = wingZ0 - 0.012;
  }
  // main-gear door outline on the black underside
  const zBel = wingZ0 + wingT + 0.012;
  const gd = M.line;
  bar([W(2.9), 18], [W(2.9), 22.5], 0.06, 0.03, 2.35, gd, sideR);
  g.add(sideR);
  const sideL = sideR.clone(true);
  sideL.scale.x = -1;
  g.add(sideL);
  void zBel;

  // ── body flap (belly, below the engines) ──
  const flap = box(6.2, aft, 0.34, M.black, g, 0, aft / 2, 2.1);
  flap.name = 'body-flap';
  if (!isBuran) {
    box(5.0, 0.04, 0.05, M.line, g, 0, aft, 2.3);
  }

  // ── vertical stabiliser, dorsal ──
  const finV = 2.35;
  const finPoly: Array<[number, number]> = [
    [16.0 + 0.3, -0.3],
    [16.0, 0],
    [7.0, 9.0],
    [4.04, 9.0],
    [7.4, 0],
    [7.4 - 0.3 * 0.373, -0.3],
  ];
  const fin = panel(
    finPoly,
    0.55,
    M.white,
    g,
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 0, DORSAL_Z(finV)),
  );
  fin.name = 'fin';
  for (const sgn of [-1, 1]) {
    // split rudder / speed brake seam, parallel to the trailing edge
    const xx = sgn * 0.285;
    const hA = 0.4;
    const hB = 8.7;
    const aTE = (h: number): number => 7.4 - 0.373 * h;
    const p0: [number, number] = [aTE(hA) + 1.9, finV + hA];
    const p1: [number, number] = [aTE(hB) + 1.9, finV + hB];
    const dA = p1[0] - p0[0];
    const dZ = -(p1[1] - p0[1]);
    const len = Math.hypot(dA, dZ);
    const s = box(0.03, len, 0.05, M.line, g, xx, (p0[0] + p1[0]) / 2, -(p0[1] + p1[1]) / 2);
    s.rotation.x = Math.atan2(dZ, dA);
  }
  // fin-tip drag-chute / tip detail
  if (!isBuran) box(0.6, 1.6, 0.4, M.white, g, 0, 8.4, -(finV + 0.3));
  if (o.variant === 'columbia') {
    const silts = mesh(new THREE.SphereGeometry(1, 14, 10), M.white, g);
    silts.scale.set(0.45, 1.7, 0.5);
    silts.position.set(0, 5.5, -(finV + 9.15));
  }

  // ── payload-bay door seams (dorsal) ──
  for (const x of [0, -1.5, 1.5]) {
    const a0 = 7.2;
    const a1 = 26;
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const ya = a0 + ((a1 - a0) * i) / steps;
      const yb = a0 + ((a1 - a0) * (i + 1)) / steps;
      const va = surfV(stns, N, ya, x, true);
      const vb = surfV(stns, N, yb, x, true);
      const s = box(
        0.05,
        yb - ya + 0.02,
        0.04,
        M.line,
        g,
        x,
        (ya + yb) / 2,
        -((va + vb) / 2 + 0.02),
      );
      s.rotation.x = Math.atan2(-(vb - va), yb - ya);
    }
  }
  // door cross seams
  for (const a of [9.5, 13.5, 17.5, 21.5, 25.4]) {
    const v0 = surfV(stns, N, a, 1.5, true);
    box(3.0, 0.04, 0.04, M.line, g, 0, a, -(v0 + 0.03));
  }

  // ── cockpit windows (dorsal forward) ──
  const win = (x: number, a: number, w: number, h: number): void => {
    const v = surfV(stns, N, a, x, true);
    const vb = surfV(stns, N, a + 0.4, x, true);
    const va = surfV(stns, N, a - 0.4, x, true);
    const slope = (vb - va) / 0.8;
    const b = box(w, h, 0.05, M.glass, g, x, a, -(v + 0.02));
    b.rotation.x = Math.atan(-slope);
    b.rotation.y = Math.sign(x) * 0.18;
  };
  win(-0.62, 32.6, 0.62, 0.7);
  win(0.62, 32.6, 0.62, 0.7);
  win(-1.3, 31.7, 0.5, 0.75);
  win(1.3, 31.7, 0.5, 0.75);
  win(-0.55, 30.2, 0.45, 0.55);
  win(0.55, 30.2, 0.45, 0.55);

  // ── forward RCS cluster and nose gear door ──
  for (let k = 0; k < 8; k++) {
    const th = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const r = 0.42;
    box(0.12, 0.12, 0.05, M.dark, g, Math.cos(th) * r, 35.3, Math.sin(th) * r * 0.9 + 0.1);
  }
  {
    const aNg0 = 33.2;
    const aNg1 = 34.9;
    for (const x of [-0.45, 0.45]) {
      const vb = surfV(stns, N, (aNg0 + aNg1) / 2, x, false);
      box(0.04, aNg1 - aNg0, 0.03, M.line, g, x, (aNg0 + aNg1) / 2, -vb + 0.02);
    }
    for (const a of [aNg0, aNg1]) {
      const vb = surfV(stns, N, a, 0, false);
      box(0.9, 0.04, 0.03, M.line, g, 0, a, -vb + 0.02);
    }
    // main gear doors on the fuselage belly
    for (const x of [-1.5, 1.5]) {
      const vb = surfV(stns, N, 19, x, false);
      box(0.04, 4.2, 0.03, M.line, g, x, 19, -vb + 0.02);
      box(0.9, 0.04, 0.03, M.line, g, x, 16.9, -vb + 0.02);
      box(0.9, 0.04, 0.03, M.line, g, x, 21.1, -vb + 0.02);
    }
    // ET umbilical doors
    for (const x of [-1.2, 1.2]) {
      const vb = surfV(stns, N, 8, x, false);
      box(1.6, 1.8, 0.03, M.line, g, x, 8, -vb + 0.015).material = M.dark;
    }
  }

  // ── aft: OMS pods, engines, RCS ──
  const eng = new THREE.Group();
  g.add(eng);
  if (o.variant === 'gli') {
    // four AL-31F turbojets on the upper aft fuselage, two on each side of the fin
    for (const x of [-2.35, -1.05, 1.05, 2.35]) {
      const nac = mesh(new THREE.CylinderGeometry(0.62, 0.55, 5.6, 16), M.engine, eng);
      nac.position.set(x, 2.8, -(2.7 + 0.1));
      const nz = mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.2, 16), M.bell, eng);
      nz.position.set(x, 0.6, -2.8);
      const inlet = mesh(new THREE.CircleGeometry(0.5, 16), M.dark, eng);
      inlet.rotation.x = -Math.PI / 2;
      inlet.position.set(x, 5.62, -2.8);
      const cone = mesh(new THREE.ConeGeometry(0.28, 0.6, 12), M.engine, eng);
      cone.position.set(x, 5.9, -2.8);
    }
    // blank aft end: no OMS, no main engines
    box(2.6, 0.5, 0.05, M.dark, eng, 0, aft + 0.25, 0.4);
  } else if (isBuran) {
    // no main engines on the orbiter: two OMS nozzles and the flush aft end
    for (const sx2 of [-1, 1]) {
      bellMesh(0.5, 0.15, 1.3, M.bell, eng, sx2 * 1.35, -0.9, 0.0, 0.6);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 2; c++)
          box(0.2, 0.2, 0.05, M.dark, eng, sx2 * (2.15 + c * 0.25), aft + 0.45 + r * 0.3, -2.5);
    }
    box(1.4, 0.7, 0.06, M.blanket, eng, 0, aft + 0.05, 0.9);
  } else {
    const ssme = [
      [0, 1.1],
      [-1.5, -0.9],
      [1.5, -0.9],
    ];
    for (const [x, v] of ssme) {
      if (isEnt) {
        // no engines installed: plain dummy nozzle fairings
        const cone = mesh(new THREE.CylinderGeometry(0.75, 1.0, 2.4, 20), M.engine, eng);
        cone.position.set(x, 1.2, -v);
        const cap = mesh(new THREE.CircleGeometry(0.95, 20), M.dark, eng);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(x, 0.01, -v);
      } else {
        bellMesh(1.2, 0.35, 4.27, M.bell, eng, x, -v, 0, 0.55);
        const neck = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 14), M.engine, eng);
        neck.position.set(x, aft + 0.1, -v);
      }
    }
    if (!isEnt) {
      // OMS pods on the upper aft corners
      const podStn: Stn[] = [
        { a: aft, w: 0.9, t: 0.85, b: 0.8 },
        { a: aft + 1, w: 0.95, t: 0.9, b: 0.8 },
        { a: 7.5, w: 0.9, t: 0.85, b: 0.75 },
        { a: 9.5, w: 0.6, t: 0.5, b: 0.4 },
        { a: 10.2, w: 0.2, t: 0.15, b: 0.1 },
      ];
      for (const sgn of [-1, 1]) {
        const pod = loft(podStn, {
          n: 2.2,
          ring: 20,
          cx: sgn * 1.75,
          cv: 2.55,
          color: (_x, _a, v) => (v < 2.2 ? blk : wht),
          capColor: new THREE.Color(0x6e675c),
        });
        mesh(pod, M.hull, g);
        bellMesh(0.45, 0.14, 1.2, M.bell, eng, sgn * 1.75, -2.35, aft - 1.0, 0.6);
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 2; c++)
            box(0.16, 0.16, 0.05, M.dark, g, sgn * (1.35 + c * 0.4), 8.2 - r * 0.28, -3.25);
      }
    }
  }

  // ── uniform scale to the sourced overall length; centre on x = z = 0 ──
  // deployed landing gear: ground plane z = GROUND (belly side); total height on gear 17.86 m
  const GROUND = 2.3 + 4.2;
  const gearMat = M.engine;
  const strut = (x: number, a: number, z0: number, r: number): void => {
    const c = mesh(new THREE.CylinderGeometry(r, r, GROUND - z0, 10), gearMat, g);
    c.rotation.x = Math.PI / 2;
    c.position.set(x, a, (z0 + GROUND) / 2);
  };
  const wheel = (x: number, a: number, r: number, wd: number): void => {
    const w = mesh(new THREE.CylinderGeometry(r, r, wd, 16), M.dark, g);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, a, GROUND - r);
  };
  for (const sgn of [-1, 1]) {
    strut(sgn * 3.4, 17, 2.3, 0.2);
    for (const da of [-0.5, 0.5]) wheel(sgn * 3.4, 17 + da, 0.55, 0.45);
  }
  strut(0, 34.0, surfV(stns, N, 34, 0, false) * -1, 0.14);
  for (const dx of [-0.25, 0.25]) wheel(dx, 34.0, 0.45, 0.28);
  const k = o.length / L0;
  g.scale.setScalar(k);
  // fuselage centreline already at x = 0; z axis centred on the fuselage
  return root;
}

// ── X-37B ────────────────────────────────────────────────────────────────────

function buildX37b(): THREE.Group {
  const M = mats();
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const L = 8.92;
  const stns: Stn[] = [
    { a: 0.35, w: 0.95, t: 0.55, b: 0.5 },
    { a: 1.0, w: 1.0, t: 0.6, b: 0.5 },
    { a: 5.0, w: 1.0, t: 0.62, b: 0.45 },
    { a: 6.5, w: 0.8, t: 0.5, b: 0.4 },
    { a: 8.0, w: 0.4, t: 0.3, b: 0.25 },
    { a: 8.7, w: 0.17, t: 0.13, b: 0.11 },
    { a: L, w: 0.03, t: 0.03, b: 0.03 },
  ];
  const wht = new THREE.Color(0xe6e6e1);
  const blk = new THREE.Color(0x1a1a1d);
  const hull = loft(stns, {
    n: 2.5,
    ring: 28,
    color: (_x, a, v) => (a > 8.1 || v < -0.12 ? blk : wht),
    capColor: new THREE.Color(0x55524b),
  });
  mesh(hull, M.hull, g);
  const wingPoly: Array<[number, number]> = [
    [0.7, 5.2],
    [2.275, 3.1],
    [2.275, 1.05],
    [0.9, 0.35],
    [0.7, 0.35],
  ];
  const sideR = new THREE.Group();
  const ID = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] as const;
  panel(wingPoly, 0.14, M.white, sideR, ID[0], ID[1], new THREE.Vector3(0, 0, 0.1));
  panel(wingPoly, 0.14, M.black, sideR, ID[0], ID[1], new THREE.Vector3(0, 0, 0.22));
  bar([0.8, 5.2], [2.275, 3.1], 0.07, 0.3, 0.16, M.rcc, sideR);
  bar([1.0, 1.7], [2.2, 2.0], 0.03, 0.02, 0.0, M.line, sideR);
  // canted V-tail, root on the dorsal side
  const phi = (28 * Math.PI) / 180;
  for (const sgn of [-1, 1]) {
    const ex = new THREE.Vector3(0, 1, 0);
    const ey = new THREE.Vector3(sgn * Math.sin(phi), 0, -Math.cos(phi));
    const org = new THREE.Vector3(sgn * 0.35, 0, -0.45);
    panel(
      [
        [2.55, -0.1],
        [0.55, -0.1],
        [0.75, 2.05],
        [1.55, 2.05],
      ],
      0.1,
      M.white,
      g,
      ex,
      ey,
      org,
    );
    // rudder seam
    const seamTop = new THREE.Vector3(0, 0.95, 0);
    void seamTop;
  }
  g.add(sideR);
  const sideL = sideR.clone(true);
  sideL.scale.x = -1;
  g.add(sideL);
  // payload bay: opened door leaves and the deployed folding array
  const bayA0 = 1.7;
  const bayA1 = 3.8;
  const bayTop = 0.6;
  box(1.2, bayA1 - bayA0, 0.03, M.dark, g, 0, (bayA0 + bayA1) / 2, -(bayTop - 0.04));
  for (const sgn of [-1, 1]) {
    const door = box(
      0.62,
      bayA1 - bayA0,
      0.04,
      M.white,
      g,
      sgn * 0.78,
      (bayA0 + bayA1) / 2,
      -(bayTop + 0.35),
    );
    door.rotation.y = sgn * 1.2;
    door.position.x = sgn * 0.95;
  }
  box(0.08, 0.08, 0.9, M.gold, g, 0, 2.75, -(bayTop + 0.4));
  const panelW = 1.2;
  for (let i = 0; i < 3; i++) {
    const pn = box(
      panelW,
      2.0,
      0.04,
      M.panel,
      g,
      (i - 1) * (panelW + 0.03),
      2.75,
      -(bayTop + 0.85),
    );
    void pn;
  }
  // aft: single engine nozzle and tail details, the base sits at y = 0
  bellMesh(0.3, 0.1, 0.5, M.bell, g, 0, 0, 0, 0.6);
  box(1.4, 0.35, 0.12, M.black, g, 0, 0.17, 0.5);
  // gear door seams (belly)
  for (const sgn of [-1, 1]) box(0.04, 1.0, 0.02, M.line, g, sgn * 0.45, 2.5, 0.48);
  // nose RCS and dark sensor window
  box(0.2, 0.3, 0.03, M.glass, g, 0, 7.8, -0.28);
  const X_GROUND = 0.5 + 0.6;
  for (const sgn of [-1, 1]) {
    const c = box(0.06, 0.06, X_GROUND - 0.45, M.engine, g, sgn * 0.55, 2.2, (0.45 + X_GROUND) / 2);
    box(0.12, 0.3, 0.3, M.dark, g, sgn * 0.55, 2.2, X_GROUND - 0.15);
    void c;
  }
  box(0.05, 0.05, X_GROUND - 0.3, M.engine, g, 0, 6.3, (0.3 + X_GROUND) / 2);
  box(0.1, 0.22, 0.22, M.dark, g, 0, 6.3, X_GROUND - 0.11);
  void L;
  return root;
}

// ── registry ─────────────────────────────────────────────────────────────────

const R_ORBITER: ShowcaseRef[] = [
  {
    l: 'Space Shuttle orbiter — Wikipedia (length 37.237 m, wingspan 23.79 m, height 17.86 m, payload bay 18.3 × 4.6 m)',
    u: 'https://en.wikipedia.org/wiki/Space_Shuttle_orbiter',
  },
];

function orbiter(variant: Variant, extra: ShowcaseRef[] = []): ShowcaseModel {
  return {
    build: () => buildOrbiter({ variant, length: L0, span: SPAN0 }),
    heightM: L0,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 4.6,
    refs: [...R_ORBITER, ...extra],
  };
}

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'space-shuttle-orbiter': orbiter('shuttle'),
  atlantis: orbiter('shuttle', [
    {
      l: 'Space Shuttle Atlantis — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Atlantis',
    },
  ]),
  challenger: orbiter('shuttle', [
    {
      l: 'Space Shuttle Challenger — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Challenger',
    },
  ]),
  discovery: orbiter('shuttle', [
    {
      l: 'Space Shuttle Discovery — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Discovery',
    },
  ]),
  endeavour: orbiter('shuttle', [
    {
      l: 'Space Shuttle Endeavour — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Endeavour',
    },
  ]),
  columbia: orbiter('columbia', [
    {
      l: 'Space Shuttle Columbia — Wikipedia (only orbiter with black chines; SILTS pod on the fin)',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Columbia',
    },
  ]),
  enterprise: orbiter('enterprise', [
    {
      l: 'Space Shuttle Enterprise — Wikipedia (no engines, no OMS pods, simulated tiles, fibreglass leading edges)',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_Enterprise',
    },
  ]),
  buran: {
    build: () => buildOrbiter({ variant: 'buran', length: 36.37, span: 23.92 }),
    heightM: 36.37,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 4.65,
    refs: [
      {
        l: 'Buran (spacecraft) — Wikipedia (length 36.37 m, wingspan 23.92 m, payload bay 18.55 × 4.65 m)',
        u: 'https://en.wikipedia.org/wiki/Buran_(spacecraft)',
      },
      {
        l: 'Buran-class orbiter — Wikipedia (main engines were on Energia)',
        u: 'https://en.wikipedia.org/wiki/Buran-class_orbiter',
      },
    ],
  },
  'buran-ok-gli': {
    build: () => buildOrbiter({ variant: 'gli', length: 36.37, span: 23.92 }),
    heightM: 36.37,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 4.65,
    refs: [
      {
        l: 'OK-GLI — Wikipedia (four AL-31 turbofans at the rear)',
        u: 'https://en.wikipedia.org/wiki/OK-GLI',
      },
      {
        l: 'buran-energia.com — OK-GLI (AL-31F, same aerodynamics and mass properties as Buran)',
        u: 'https://www.buran-energia.com/bourane-buran/bourane-modele-gli.php',
      },
    ],
  },
  x37b: {
    build: buildX37b,
    heightM: 8.92,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 2.0,
    refs: [
      {
        l: 'Boeing X-37 — Wikipedia (length 8.92 m, wingspan 4.55 m, height 2.90 m, bay 2.1 × 1.2 m)',
        u: 'https://en.wikipedia.org/wiki/Boeing_X-37',
      },
    ],
  },
};
