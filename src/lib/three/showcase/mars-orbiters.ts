/**
 * Showcase models: Mars and inner-planet orbiters. ExoMars TGO, Mars Odyssey, the Soviet M-71 bus
 * (Mars 2 and Mars 3 share one builder), MRO, Phobos 2, Tianwen-1, the Viking orbiter, Mariner 2
 * and the stacked BepiColombo cruise configuration. Each stands upright as on its launcher, base
 * on y = 0, front +z, in metres; arrays are named `userData.solarArray` groups. Blanketed surfaces
 * are crinkled foil with stitched seams, as in the lander family (kit.ts).
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const az = (a: number, r: number, y: number): THREE.Vector3 =>
  V(Math.sin(a) * r, y, Math.cos(a) * r);

interface P {
  gold: Mat;
  amber: Mat;
  silver: Mat;
  blackFoil: Mat;
  white: Mat;
  cream: Mat;
  alu: Mat;
  aluDark: Mat;
  dark: Mat;
  cell: Mat;
  cellDark: Mat;
  line: Mat;
  tape: Mat;
  dishFoil: Mat;
  dishGold: Mat;
  orange: Mat;
  red: Mat;
  shield: Mat;
}

function palette(): P {
  return {
    gold: mat(0xc99a38, 0.55, 0.4, true),
    amber: mat(0x9c6224, 0.5, 0.45, true),
    silver: mat(0xcfcdc7, 0.55, 0.4, true),
    blackFoil: mat(0x26272c, 0.4, 0.55, true),
    white: mat(0xe9e7e0, 0.15, 0.55),
    cream: mat(0xdcd5bf, 0.2, 0.6),
    alu: mat(0xb9bcc1, 0.7, 0.38),
    aluDark: mat(0x7e8187, 0.6, 0.5),
    dark: mat(0x1d1e22, 0.4, 0.65),
    cell: mat(0x2a3a70, 0.6, 0.3),
    cellDark: mat(0x353a4a, 0.6, 0.3),
    line: mat(0xb8a05a, 0.7, 0.35),
    tape: mat(0x8a8d93, 0.5, 0.5),
    dishFoil: mat(0xd5d3cc, 0.65, 0.35, true),
    dishGold: mat(0xb29640, 0.75, 0.3, true),
    orange: mat(0xd9692a, 0.2, 0.6),
    red: mat(0xb23a2a, 0.2, 0.55),
    shield: mat(0x17181b, 0.15, 0.85),
  };
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  seg = 20,
): THREE.Mesh {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.set(x, y, z);
  return add(g, c);
}

function sphere(g: THREE.Object3D, m: Mat, r: number, x: number, y: number, z: number): THREE.Mesh {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m);
  s.position.set(x, y, z);
  return add(g, s);
}

function ring(
  g: THREE.Object3D,
  m: Mat,
  R: number,
  tube: number,
  y: number,
  x = 0,
  z = 0,
): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 8, 48), m);
  t.rotation.x = Math.PI / 2;
  t.position.set(x, y, z);
  return add(g, t);
}

function latheMesh(g: THREE.Object3D, m: Mat, pts: [number, number][], seg = 40): THREE.Mesh {
  return add(
    g,
    new THREE.Mesh(
      new THREE.LatheGeometry(
        pts.map(([r, y]) => new THREE.Vector2(r, y)),
        seg,
      ),
      m,
    ),
  );
}

/** Place `o` with its +y axis along `dir`, origin at `from`. */
function aim(o: THREE.Object3D, from: THREE.Vector3, dir: THREE.Vector3): void {
  o.position.copy(from);
  o.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
}

/** Thermal-blanket box: crinkled foil on a segmented box. */
function mli(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  amp = 0.03,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(
    w,
    h,
    d,
    Math.max(2, Math.round(w / 0.3)),
    Math.max(2, Math.round(h / 0.3)),
    Math.max(2, Math.round(d / 0.3)),
  );
  const mesh = new THREE.Mesh(crinkle(geo, amp), m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** Stitched seams: thin tape strips across the four lateral faces of a blanketed box. */
function seams(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  nh = 3,
  nv = 2,
  off = 0.04,
): void {
  const t = 0.014;
  for (let i = 1; i <= nh; i++) {
    const yy = y - h / 2 + (h * i) / (nh + 1);
    for (const s of [-1, 1]) {
      box(g, m, w + 0.02, t, t, x, yy, z + s * (d / 2 + off));
      box(g, m, t, t, d + 0.02, x + s * (w / 2 + off), yy, z);
    }
  }
  for (let i = 1; i <= nv; i++) {
    const xx = x - w / 2 + (w * i) / (nv + 1);
    const zz = z - d / 2 + (d * i) / (nv + 1);
    for (const s of [-1, 1]) {
      box(g, m, t, h, t, xx, y, z + s * (d / 2 + off));
      box(g, m, t, h, t, x + s * (w / 2 + off), y, zz);
    }
  }
}

/** n-sided bus from crinkled foil slabs, a flat face toward +x when n is 4k+2 or 4k. */
function prismBays(
  g: THREE.Object3D,
  m: Mat,
  core: Mat,
  n: number,
  R: number,
  h: number,
  y: number,
  amp: number,
): void {
  const side = 2 * R * Math.sin(Math.PI / n);
  const apo = R * Math.cos(Math.PI / n);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.94, R * 0.94, h, n), core);
  c.position.y = y;
  g.add(c);
  for (let k = 0; k < n; k++) {
    const wrap = new THREE.Group();
    wrap.rotation.y = ((k + 0.5) / n) * TAU;
    g.add(wrap);
    mli(wrap, m, side * 1.01, h, 0.08, 0, y, apo - 0.04, amp);
  }
}

/** A blanketed bay: crinkled foil box with its seams. */
function bay(
  g: THREE.Object3D,
  P: P,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): void {
  mli(g, m, w, h, d, x, y, z, 0.022);
  seams(
    g,
    P.tape,
    w,
    h,
    d,
    x,
    y,
    z,
    Math.max(1, Math.round(h / 0.45)),
    Math.max(1, Math.round(w / 0.7)),
    0.03,
  );
}

interface PanelOpts {
  cols?: number;
  rows?: number;
  stripes?: number;
  cell?: Mat;
}

/** One solar panel in the xy plane facing +z: frame, cell field, cell-string gridlines. */
function cellPanel(P: P, w: number, h: number, o: PanelOpts = {}): THREE.Group {
  const g = new THREE.Group();
  box(g, P.alu, w, h, 0.035, 0, 0, 0);
  const cm = o.cell ?? P.cell;
  if (o.stripes) {
    const n = o.stripes;
    const bh = (h - 0.1) / n;
    for (let i = 0; i < n; i++) {
      box(g, i % 2 ? P.dark : cm, w - 0.1, bh * 0.92, 0.05, 0, -h / 2 + 0.05 + bh * (i + 0.5), 0);
    }
  } else {
    box(g, cm, w - 0.1, h - 0.1, 0.05, 0, 0, 0);
  }
  const cols = o.cols ?? Math.max(3, Math.round(w / 0.4));
  const rows = o.rows ?? Math.max(2, Math.round(h / 0.5));
  for (let c = 1; c < cols; c++)
    box(g, P.line, 0.011, h - 0.1, 0.056, -w / 2 + 0.05 + ((w - 0.1) * c) / cols, 0, 0);
  if (!o.stripes)
    for (let r = 1; r < rows; r++)
      box(g, P.line, w - 0.1, 0.011, 0.056, 0, -h / 2 + 0.05 + ((h - 0.1) * r) / rows, 0);
  return g;
}

/** A row of `n` panels along +x (or -x for dir = -1) from `x0`, marked as a solar array. */
function wing(
  parent: THREE.Object3D,
  P: P,
  x0: number,
  n: number,
  pw: number,
  ph: number,
  dir: 1 | -1,
  o: PanelOpts = {},
  gap = 0.06,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const p = cellPanel(P, pw, ph, o);
    p.position.x = dir * (x0 + i * (pw + gap) + pw / 2);
    g.add(p);
    if (i > 0) box(g, P.aluDark, 0.07, ph * 0.9, 0.05, dir * (x0 + i * (pw + gap) - gap / 2), 0, 0);
  }
  g.userData.solarArray = true;
  parent.add(g);
  return g;
}

/** Dish, vertex at the origin, axis +y; crinkled foil, rim, feed horn on struts. */
function foilDish(P: P, R: number, m?: Mat, amp = 0.02, depthF = 0.22): THREE.Group {
  const g = new THREE.Group();
  const depth = R * depthF;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const r = (R * i) / 14;
    pts.push(new THREE.Vector2(r, depth * (r / R) ** 2));
  }
  const bowl = new THREE.Mesh(crinkle(new THREE.LatheGeometry(pts, 40), amp), m ?? P.dishFoil);
  g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012 + R * 0.012, 6, 48), P.alu);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = depth;
  g.add(rim);
  const f = R * 0.55 + depth;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    strut(
      g,
      P.alu,
      V(Math.cos(a) * R * 0.97, depth, Math.sin(a) * R * 0.97),
      V(0, f, 0),
      0.008 + R * 0.004,
      5,
    );
  }
  cyl(g, P.dark, R * 0.06, R * 0.09, R * 0.14, 0, f, 0, 14);
  return g;
}

/** A skeletal dish: rim, rings and spokes only (Mariner 2's grid antenna). */
function gridDish(P: P, R: number, m: Mat): THREE.Group {
  const g = new THREE.Group();
  const depth = R * 0.22;
  const spokes = 8;
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * TAU;
    let prev = V(0, 0, 0);
    for (let i = 1; i <= 4; i++) {
      const r = (R * i) / 4;
      const p = V(Math.cos(a) * r, depth * (r / R) ** 2, Math.sin(a) * r);
      strut(g, m, prev, p, 0.012, 5);
      prev = p;
    }
  }
  for (const f of [0.5, 1]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R * f, 0.014, 6, 40), m);
    t.rotation.x = Math.PI / 2;
    t.position.y = depth * f * f;
    g.add(t);
  }
  strut(g, P.alu, V(0, 0, 0), V(0, R * 0.5, 0), 0.01, 5);
  cyl(g, P.alu, R * 0.05, R * 0.08, R * 0.1, 0, R * 0.52, 0, 12);
  return g;
}

/** Square truss between two heights: four legs, rings and X-bracing on each bay. */
function squareTruss(
  g: THREE.Object3D,
  m: Mat,
  y0: number,
  y1: number,
  s0: number,
  s1: number,
  bays: number,
  r: number,
  cx = 0,
  cz = 0,
): void {
  const corner = (k: number, f: number): THREE.Vector3 => {
    const s = s0 + (s1 - s0) * f;
    const sx = k === 0 || k === 3 ? s : -s;
    const sz = k < 2 ? s : -s;
    return V(cx + sx, y0 + (y1 - y0) * f, cz + sz);
  };
  for (let b = 0; b < bays; b++) {
    const f0 = b / bays;
    const f1 = (b + 1) / bays;
    for (let k = 0; k < 4; k++) {
      strut(g, m, corner(k, f0), corner(k, f1), r, 6);
      const k2 = (k + 1) % 4;
      strut(g, m, corner(k, f1), corner(k2, f1), r * 0.7, 5);
      strut(g, m, corner(k, f0), corner(k2, f1), r * 0.55, 5);
    }
  }
  for (let k = 0; k < 4; k++) strut(g, m, corner(k, 0), corner((k + 1) % 4, 0), r * 0.7, 5);
}

/** Stand the model at its height, base on y = 0. */
function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ─── ExoMars Trace Gas Orbiter ───────────────────────────────────────────────────────────────

const TGO_H = 3.2;

function buildTgo(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const y0 = 0.3;
  mli(g, P.gold, 2.0, 1.7, 2.0, 0, y0 + 0.85, 0, 0.04);
  seams(g, P.tape, 2.0, 1.7, 2.0, 0, y0 + 0.85, 0, 4, 3, 0.05);
  mli(g, P.silver, 2.0, 1.0, 2.0, 0, y0 + 2.2, 0, 0.03);
  seams(g, P.tape, 2.0, 1.0, 2.0, 0, y0 + 2.2, 0, 2, 3, 0.04);
  for (const s of [-1, 1]) {
    box(g, P.blackFoil, 0.03, 1.25, 1.5, s * 1.025, y0 + 1.5, 0);
    for (let k = 1; k < 5; k++)
      box(g, P.aluDark, 0.035, 0.012, 1.5, s * 1.04, y0 + 0.9 + k * 0.25, 0);
  }
  // engine bell and nadir hardware
  cyl(g, P.aluDark, 0.14, 0.3, 0.3, 0, 0.15, 0, 22);
  cyl(g, P.dark, 0.22, 0.22, 0.34, 0.42, y0 - 0.08, 0.3, 18);
  for (const sx of [-1, 1]) {
    cyl(g, P.white, 0.02, 0.12, 0.26, sx * 0.62, y0 - 0.1, 0.78, 14);
    cyl(g, P.aluDark, 0.025, 0.06, 0.1, sx * 0.9, y0 - 0.04, -0.85, 10);
  }
  // launch-adapter ring on top
  cyl(g, P.alu, 0.74, 0.74, 0.2, 0, y0 + 2.8, 0, 36);
  cyl(g, P.dark, 0.66, 0.66, 0.02, 0, y0 + 2.91, 0, 36);
  // NOMAD / ACS spectrometers on the anti-Earth face
  box(g, P.dark, 0.6, 0.5, 0.3, 0.45, y0 + 2.35, -1.14);
  box(g, P.dark, 0.5, 0.4, 0.3, -0.5, y0 + 2.3, -1.14);
  cyl(g, P.aluDark, 0.09, 0.09, 0.2, 0.45, y0 + 2.35, -1.34).rotation.x = Math.PI / 2;
  cyl(g, P.aluDark, 0.08, 0.08, 0.2, -0.5, y0 + 2.3, -1.3).rotation.x = Math.PI / 2;
  // UHF helix stub and thruster cans
  cyl(g, P.white, 0.03, 0.1, 0.4, -0.7, y0 + 2.5, 0.9, 12);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const)
    cyl(g, P.dark, 0.03, 0.07, 0.14, sx * 0.9, y0 + 0.1, sz * 0.9, 10);
  // two 2-panel arrays on short yokes
  for (const s of [1, -1] as const) {
    strut(g, P.alu, V(s * 1.0, y0 + 2.0, 0), V(s * 1.35, y0 + 2.0, 0), 0.04, 8);
    strut(g, P.alu, V(s * 1.0, y0 + 1.55, 0), V(s * 1.35, y0 + 1.95, 0), 0.025, 6);
    const w = wing(g, P, 1.3, 2, 3.7, 2.0, s, { cols: 9, rows: 5 });
    w.position.y = y0 + 2.0;
  }
  // 2.2 m high-gain dish on a boom at the front
  const d = foilDish(P, 1.1, P.silver, 0.012, 0.2);
  aim(d, V(0, y0 + 1.7, 1.1), V(0, Math.sin(0.7), Math.cos(0.7)));
  g.add(d);
  strut(g, P.alu, V(0, y0 + 1.5, 0.95), V(0, y0 + 1.7, 1.1), 0.05, 8);
  return finish(g, TGO_H);
}

// ─── 2001 Mars Odyssey ───────────────────────────────────────────────────────────────────────

const ODYSSEY_H = 3.7;

function buildOdyssey(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const y0 = 0.4;
  mli(g, P.amber, 1.7, 2.2, 1.6, 0, y0 + 1.1, 0, 0.03);
  seams(g, P.tape, 1.7, 2.2, 1.6, 0, y0 + 1.1, 0, 4, 2, 0.055);
  // folded blanket flaps on the corners
  mli(g, P.gold, 0.5, 0.9, 0.5, -0.75, y0 + 0.45, 0.65, 0.035);
  mli(g, P.gold, 0.5, 0.6, 0.5, 0.75, y0 + 1.9, 0.7, 0.035);
  // main engine and nadir deck
  cyl(g, P.aluDark, 0.12, 0.32, 0.4, 0, 0.2, 0, 22);
  // THEMIS and the camera cylinders on the +z face
  box(g, P.alu, 0.55, 0.45, 0.35, -0.2, y0 + 0.55, 0.95);
  for (const [x, y] of [
    [0.25, 0.5],
    [0.25, 0.82],
  ] as const) {
    cyl(g, P.alu, 0.1, 0.1, 0.22, x, y0 + y, 0.95).rotation.x = Math.PI / 2;
    cyl(g, P.dark, 0.07, 0.07, 0.04, x, y0 + y, 1.07).rotation.x = Math.PI / 2;
  }
  box(g, P.silver, 0.5, 0.4, 0.3, 0.1, y0 + 1.3, 0.92);
  // GRS boom: a 6 m lattice running to -x, with the gamma-ray spectrometer head at the tip
  const boomY = y0 + 1.35;
  const L = 6.0;
  const half = 0.13;
  const bays = 14;
  const x0 = -0.85;
  for (const [sy, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const)
    strut(
      g,
      P.alu,
      V(x0, boomY + sy * half, sz * half),
      V(x0 - L, boomY + sy * half, sz * half),
      0.012,
      5,
    );
  for (let b = 0; b <= bays; b++) {
    const x = x0 - (L * b) / bays;
    const xn = x0 - (L * (b + 1)) / bays;
    for (const [a, c] of [
      [V(0, half, half), V(0, half, -half)],
      [V(0, half, -half), V(0, -half, -half)],
      [V(0, -half, -half), V(0, -half, half)],
      [V(0, -half, half), V(0, half, half)],
    ] as const)
      strut(g, P.alu, V(x, boomY + a.y, a.z), V(x, boomY + c.y, c.z), 0.008, 4);
    if (b < bays) {
      strut(g, P.alu, V(x, boomY + half, half), V(xn, boomY + half, -half), 0.006, 4);
      strut(g, P.alu, V(x, boomY - half, -half), V(xn, boomY - half, half), 0.006, 4);
      strut(g, P.alu, V(x, boomY + half, -half), V(xn, boomY - half, -half), 0.006, 4);
      strut(g, P.alu, V(x, boomY - half, half), V(xn, boomY + half, half), 0.006, 4);
    }
  }
  const tip = x0 - L;
  cyl(g, P.silver, 0.3, 0.3, 0.5, tip - 0.2, boomY, 0).rotation.z = Math.PI / 2;
  cyl(g, P.gold, 0.31, 0.31, 0.06, tip - 0.46, boomY, 0).rotation.z = Math.PI / 2;
  const disc = cyl(g, P.gold, 0.5, 0.5, 0.025, tip + 0.15, boomY + 0.5, 0, 28);
  disc.rotation.z = 0.5;
  // one 3-panel array on +x, dark cells, tilted a little off the bus plane
  strut(g, P.alu, V(0.85, y0 + 1.6, 0), V(1.2, y0 + 1.6, 0), 0.04, 8);
  const w = wing(g, P, 1.2, 3, 1.55, 1.55, 1, { cols: 6, rows: 6, cell: P.cellDark });
  w.position.y = y0 + 1.6;
  // 1.3 m dish on a mast above the bus
  strut(g, P.alu, V(0.45, y0 + 2.2, -0.3), V(0.45, y0 + 2.6, -0.3), 0.03, 8);
  const d = foilDish(P, 0.65, P.silver, 0.02, 0.2);
  aim(d, V(0.45, y0 + 2.6, -0.3), V(0.1, 0.45, 0.89));
  g.add(d);
  box(g, P.silver, 0.18, 0.5, 0.06, 0.45, y0 + 2.62, -0.52);
  return finish(g, ODYSSEY_H);
}

// ─── Soviet M-71 (Mars 2 and Mars 3) ─────────────────────────────────────────────────────────

const M71_H = 4.1;

function buildM71(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const lander = mat(0xe9e4d6, 0.2, 0.5);
  const belt = mat(0xa8852f, 0.5, 0.45);
  // launch-adapter truss ring
  ring(g, P.alu, 0.95, 0.03, 0.04);
  ring(g, P.alu, 0.8, 0.03, 0.6);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    const b = ((k + 1) / 12) * TAU;
    strut(g, P.alu, az(a, 0.95, 0.04), az(a, 0.8, 0.6), 0.016, 6);
    strut(g, P.alu, az(a, 0.95, 0.04), az(b, 0.8, 0.6), 0.012, 5);
  }
  // main engine nozzle
  cyl(g, P.aluDark, 0.12, 0.4, 0.55, 0, 0.32, 0, 24);
  // lower hull and equipment cans
  latheMesh(g, P.cream, [
    [0.5, 0.55],
    [0.86, 0.8],
    [0.9, 1.15],
    [0.75, 1.35],
  ]);
  const can = [P.alu, P.aluDark, mat(0x7f95a3, 0.5, 0.45), P.alu];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    const c = can[k % 4] as Mat;
    cyl(g, c, 0.11, 0.11, 0.42, Math.sin(a) * 0.92, 0.85, Math.cos(a) * 0.92, 14);
    cyl(g, P.dark, 0.05, 0.05, 0.1, Math.sin(a) * 0.92, 0.62, Math.cos(a) * 0.92, 10);
  }
  // propellant tank barrel with its bands, and the tank spheres
  cyl(g, P.cream, 0.62, 0.62, 1.0, 0, 1.85, 0, 32);
  for (const y of [1.5, 1.85, 2.2]) ring(g, P.alu, 0.63, 0.02, y);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + 0.6;
    sphere(g, P.alu, 0.2, Math.sin(a) * 0.7, 1.62, Math.cos(a) * 0.7);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 1.5;
    sphere(g, P.aluDark, 0.12, Math.sin(a) * 0.7, 2.1, Math.cos(a) * 0.7);
  }
  // collar that carries the descent module
  latheMesh(g, P.cream, [
    [0.62, 2.33],
    [1.0, 2.45],
    [1.14, 2.62],
    [1.02, 2.78],
    [0.7, 2.82],
  ]);
  // aeroshell: banded black cone with its support hoop, the lander capsule on top
  const rAt = (y: number): number => 1.45 - (0.85 * (y - 2.9)) / 0.65;
  latheMesh(g, P.shield, [
    [1.45, 2.9],
    [1.43, 3.0],
    [0.6, 3.55],
    [0.55, 3.56],
  ]);
  for (const y of [3.0, 3.15, 3.3, 3.45]) ring(g, P.cream, rAt(y) + 0.012, 0.014, y);
  ring(g, P.cream, 1.5, 0.022, 3.12);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.4;
    strut(g, P.cream, az(a, 1.0, 2.62), az(a, 1.5, 3.12), 0.02, 6);
  }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 36, 16, 0, TAU, 0, Math.PI / 2),
    lander,
  );
  dome.position.y = 3.5;
  g.add(dome);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.605, 36, 8, 0, TAU, 0, 0.75), P.red);
  cap.position.y = 3.5;
  g.add(cap);
  ring(g, belt, 0.6, 0.025, 3.52);
  cyl(g, P.alu, 0.05, 0.07, 0.1, 0, 4.08, 0, 12);
  // 2.5 m shallow high-gain dish facing the front
  const dd = new THREE.Group();
  latheMesh(
    dd,
    mat(0xa9adb4, 0.7, 0.4, true),
    [
      [0.0, 0],
      [0.4, 0.015],
      [0.8, 0.06],
      [1.25, 0.14],
    ],
    48,
  );
  const rimD = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.022, 6, 56), P.alu);
  rimD.rotation.x = Math.PI / 2;
  rimD.position.y = 0.14;
  dd.add(rimD);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(dd, P.aluDark, V(0, 0.01, 0), V(Math.cos(a) * 1.22, 0.135, Math.sin(a) * 1.22), 0.008, 4);
  }
  strut(dd, P.alu, V(-1.2, 0.5, 0), V(1.2, 0.5, 0), 0.012, 5);
  strut(dd, P.alu, V(0, 0.0, 0), V(0, 0.55, 0), 0.015, 5);
  aim(dd, V(0, 1.75, 1.0), V(0, 0, 1));
  g.add(dd);
  strut(g, P.alu, V(0, 2.5, 0.9), V(0.5, 1.95, 1.0), 0.03, 6);
  strut(g, P.alu, V(0.9, 1.5, 0.3), V(0.55, 1.45, 1.0), 0.03, 6);
  // two big rectangular solar panels on struts
  for (const s of [1, -1] as const) {
    strut(g, P.alu, V(s * 0.62, 2.1, 0), V(s * 1.0, 2.1, 0), 0.03, 6);
    strut(g, P.alu, V(s * 0.62, 1.6, 0), V(s * 1.0, 1.7, 0), 0.03, 6);
    const w = wing(g, P, 1.0, 1, 1.95, 2.3, s, { cols: 14, rows: 16, cell: P.cellDark });
    w.position.y = 1.9;
    w.position.z = -0.05;
  }
  // striped orientation-sensor cones and the radiator loop
  for (const [x, y, z, a] of [
    [0.85, 1.2, 0.55, 1.0],
    [-0.8, 1.5, 0.6, 2.2],
    [0.7, 2.2, -0.5, 0.2],
  ] as const) {
    const c = new THREE.Group();
    for (let i = 0; i < 4; i++)
      cyl(
        c,
        i % 2 ? P.white : P.orange,
        0.05 + i * 0.012,
        0.045 + i * 0.012,
        0.07,
        0,
        0.035 + i * 0.07,
        0,
        12,
      );
    aim(c, V(x, y, z), V(Math.sin(a), 0.2, Math.cos(a)));
    g.add(c);
  }
  const loop = new THREE.CatmullRomCurve3([
    V(0.6, 1.05, -0.45),
    V(0.9, 1.05, -0.62),
    V(1.0, 1.6, -0.62),
    V(1.0, 2.3, -0.62),
    V(0.8, 2.45, -0.5),
  ]);
  add(g, new THREE.Mesh(new THREE.TubeGeometry(loop, 24, 0.035, 8), P.white));
  return finish(g, M71_H);
}

// ─── Mars Reconnaissance Orbiter ─────────────────────────────────────────────────────────────

const MRO_H = 4.7;

function buildMro(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const by = 1.0;
  mli(g, P.gold, 2.0, 2.0, 1.7, 0, by + 1.0, 0, 0.03);
  seams(g, P.tape, 2.0, 2.0, 1.7, 0, by + 1.0, 0, 4, 3, 0.055);
  // folded flaps of orange blanket on the lower deck
  mli(g, P.amber, 1.9, 0.25, 1.6, 0, by - 0.15, 0, 0.04);
  // HiRISE: gold-wrapped telescope barrel on the nadir deck, CTX / CRISM beside it
  cyl(g, P.gold, 0.4, 0.4, 1.1, 0.4, 0.55, 0.15, 28);
  ring(g, P.dark, 0.42, 0.03, 0.02, 0.4, 0.15);
  for (const y of [0.3, 0.6, 0.9]) ring(g, P.tape, 0.405, 0.012, y, 0.4, 0.15);
  box(g, P.dark, 0.55, 0.55, 0.5, -0.5, 0.65, 0.1);
  cyl(g, P.aluDark, 0.18, 0.18, 0.3, -0.5, 0.3, 0.1);
  cyl(g, P.alu, 0.12, 0.12, 0.4, -0.35, 0.75, 0.52, 16);
  // thruster cluster
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const)
    cyl(g, P.dark, 0.04, 0.09, 0.2, sx * 0.9, by - 0.3, sz * 0.78, 10);
  // two 2-segment arrays, 5.35 x 2.53 m each, on yokes with a gimbal block
  for (const s of [1, -1] as const) {
    box(g, P.dark, 0.3, 0.3, 0.3, s * 1.15, by + 1.5, 0);
    strut(g, P.alu, V(s * 1.0, by + 1.5, 0), V(s * 1.4, by + 1.5, 0), 0.05, 8);
    const w = wing(g, P, 1.35, 2, 2.6, 2.53, s, { cols: 8, rows: 8, cell: P.cellDark }, 0.15);
    w.position.y = by + 1.5;
  }
  // SHARAD 10 m dipole behind the bus
  strut(g, P.alu, V(0, by + 1.5, -0.85), V(-5, by + 1.9, -1.0), 0.016, 5);
  strut(g, P.alu, V(0, by + 1.5, -0.85), V(5, by + 1.9, -1.0), 0.016, 5);
  // 3 m high-gain dish on a gimballed mast above the bus
  strut(g, P.alu, V(0, by + 2.0, 0), V(0, by + 2.45, 0.15), 0.06, 8);
  cyl(g, P.dark, 0.14, 0.14, 0.2, 0, by + 2.4, 0.15, 14);
  const e = (65 * Math.PI) / 180;
  const d = foilDish(P, 1.5, P.dishFoil, 0.03, 0.16);
  aim(d, V(0, by + 2.55, 0.15), V(0, Math.sin(e), Math.cos(e)));
  g.add(d);
  // UHF whip and small antennas
  strut(g, P.alu, V(-0.7, by + 2.0, -0.5), V(-0.7, by + 3.0, -0.5), 0.015, 5);
  cyl(g, P.white, 0.04, 0.04, 0.15, 0.7, by + 2.07, 0.6, 10);
  return finish(g, MRO_H);
}

// ─── Phobos 2 ────────────────────────────────────────────────────────────────────────────────

const PHOBOS2_H = 3.6;

function buildPhobos2(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const tank = mat(0xece9df, 0.1, 0.35);
  // four white propellant spheres at the base around the engine, with a small silver sphere
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const)
    sphere(g, tank, 0.42, sx * 0.45, 0.42, sz * 0.45);
  sphere(g, P.alu, 0.13, 0.62, 0.98, 0.35);
  cyl(g, P.dark, 0.1, 0.4, 0.4, 0, 0.2, 0, 24);
  // the toroidal instrument / tank belt
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.24, 20, 56), tank);
  torus.rotation.x = Math.PI / 2;
  torus.position.y = 1.25;
  g.add(torus);
  ring(g, P.alu, 0.82, 0.015, 1.5);
  // central core with equipment boxes
  cyl(g, P.cream, 0.45, 0.45, 1.4, 0, 1.7, 0, 28);
  ring(g, P.alu, 0.46, 0.02, 1.15);
  ring(g, P.alu, 0.46, 0.02, 2.4);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    const x = Math.sin(a) * 0.62;
    const z = Math.cos(a) * 0.62;
    const b = box(g, k % 2 ? P.aluDark : P.alu, 0.32, 0.55, 0.22, x, 1.95, z);
    b.rotation.y = a;
    for (let r = 0; r < 4; r++) {
      const l = box(
        g,
        P.dark,
        0.26,
        0.015,
        0.02,
        Math.sin(a) * 0.74,
        1.75 + r * 0.1,
        Math.cos(a) * 0.74,
      );
      l.rotation.y = a;
    }
  }
  const coil = cyl(g, P.amber, 0.12, 0.12, 0.3, -0.4, 2.55, 0.55, 16);
  coil.rotation.z = 0.4;
  // top deck, antenna mast and a small dish
  cyl(g, P.white, 0.6, 0.6, 0.07, 0, 2.45, 0, 32);
  cyl(g, P.white, 0.09, 0.12, 0.6, 0, 2.8, 0, 14);
  cyl(g, mat(0x3868b8, 0.3, 0.5), 0.1, 0.1, 0.16, 0, 3.15, 0, 14);
  const d = foilDish(P, 0.42, mat(0xcfd5e0, 0.5, 0.35, true), 0.008, 0.25);
  aim(d, V(0, 3.2, 0.05), V(0, 0.55, 0.83));
  g.add(d);
  // two horizontal solar panels on outriggers
  for (const s of [1, -1] as const) {
    strut(g, P.alu, V(s * 0.5, 1.8, 0.25), V(s * 0.9, 1.78, 0.25), 0.03, 6);
    strut(g, P.alu, V(s * 0.5, 1.8, -0.25), V(s * 0.9, 1.78, -0.25), 0.03, 6);
    const w = wing(g, P, 0.9, 1, 1.95, 1.25, s, { cols: 10, rows: 7 });
    w.rotation.x = -Math.PI / 2;
    w.position.y = 1.78;
    for (const z of [-0.5, 0.5]) {
      strut(g, P.alu, V(s * 2.85, 1.78, z), V(s * 2.85, 1.45, z), 0.015, 5);
      box(g, P.white, 0.08, 0.06, 0.08, s * 2.85, 1.42, z);
    }
    strut(g, P.alu, V(s * 2.0, 1.76, 0.55), V(s * 1.3, 1.5, 0.35), 0.012, 5);
  }
  // white radiator plate with tubing on the front
  box(g, P.white, 1.1, 0.35, 0.05, 0, 1.45, 0.88);
  strut(g, P.alu, V(-0.5, 1.5, 0.92), V(0.5, 1.5, 0.92), 0.018, 6);
  strut(g, P.alu, V(-0.5, 1.4, 0.92), V(0.5, 1.4, 0.92), 0.018, 6);
  return finish(g, PHOBOS2_H);
}

// ─── Tianwen-1 orbiter with its entry capsule ────────────────────────────────────────────────

const TIANWEN_H = 3.4;

function buildTianwen1(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const R = 1.25;
  prismBays(g, P.gold, P.dark, 6, R, 1.5, 1.1, 0.03);
  for (const y of [0.7, 1.1, 1.5]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.014, 6), P.tape);
    r.position.y = y;
    g.add(r);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    box(g, P.tape, 0.014, 1.5, 0.014, Math.sin(a) * R * 1.04, 1.1, Math.cos(a) * R * 1.04);
  }
  // main engine, nadir camera and thrusters
  cyl(g, P.aluDark, 0.14, 0.38, 0.35, 0, 0.18, 0, 24);
  cyl(g, P.dark, 0.2, 0.2, 0.3, 0.6, 0.28, 0.5, 18);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + Math.PI / 6;
    cyl(g, P.dark, 0.03, 0.07, 0.14, Math.sin(a) * 1.1, 0.4, Math.cos(a) * 1.1, 10);
  }
  // capsule adapter and the entry capsule: backshell, shield, nose
  cyl(g, P.silver, 0.95, 0.95, 0.3, 0, 2.0, 0, 6);
  latheMesh(g, P.silver, [
    [0.9, 2.1],
    [0.92, 2.2],
    [1.7, 2.75],
    [1.7, 2.76],
  ]);
  latheMesh(g, P.shield, [
    [1.7, 2.75],
    [1.68, 2.8],
    [0.55, 3.38],
    [0.0, 3.4],
  ]);
  for (const r of [1.4, 1.1, 0.8]) ring(g, P.tape, r, 0.012, 2.75 + (1.7 - r) * 0.5 + 0.05);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    strut(g, P.tape, az(a, 1.12, 2.28), az(a, 1.62, 2.7), 0.012, 4);
  }
  // two 3-panel arrays, hinged on the flats at +/-x
  for (const s of [1, -1] as const) {
    strut(g, P.alu, V(s * R * 0.866, 1.2, 0), V(s * (R * 0.866 + 0.3), 1.2, 0), 0.04, 8);
    const w = wing(g, P, R * 0.866 + 0.3, 3, 1.45, 1.7, s, { cols: 6, rows: 7, cell: P.cellDark });
    w.position.y = 1.2;
  }
  // 2.5 m class medium-gain dish and the slender antenna rods
  const d = foilDish(P, 0.55, P.silver, 0.012, 0.2);
  aim(d, V(0, 1.05, -1.18), V(0, 0.2, -1.0));
  g.add(d);
  strut(g, P.alu, V(0.7, 1.7, 0.4), V(1.6, 2.4, 0.5), 0.01, 4);
  strut(g, P.alu, V(-0.7, 1.7, 0.4), V(-1.6, 2.4, 0.5), 0.01, 4);
  return finish(g, TIANWEN_H);
}

// ─── Viking orbiter (with its lander capsule) ────────────────────────────────────────────────

const VIKING_H = 3.4;

function buildVikingOrbiter(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const R = 1.25;
  const white = mat(0xeeece6, 0.1, 0.65);
  // engine cone at the bottom
  latheMesh(g, white, [
    [0.15, 0.0],
    [0.35, 0.08],
    [0.95, 1.0],
    [0.98, 1.05],
  ]);
  cyl(g, P.dark, 0.08, 0.14, 0.14, 0, 0.07, 0, 14);
  // octagonal bus ring: eight bays between a top and bottom rail
  prismBays(g, P.silver, P.dark, 8, R, 0.46, 1.28, 0.012);
  for (const y of [1.05, 1.51]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.03, R * 1.03, 0.03, 8), P.gold);
    rail.position.y = y;
    g.add(rail);
  }
  const apo = R * Math.cos(Math.PI / 8);
  for (let k = 0; k < 8; k++) {
    const a = ((k + 0.5) / 8) * TAU;
    const bx = box(
      g,
      k % 2 ? P.alu : P.silver,
      0.62,
      0.32,
      0.1,
      Math.sin(a) * (apo + 0.06),
      1.28,
      Math.cos(a) * (apo + 0.06),
    );
    bx.rotation.y = a;
    for (let l = 0; l < 4; l++) {
      const ls = box(
        g,
        P.dark,
        0.5,
        0.012,
        0.012,
        Math.sin(a) * (apo + 0.115),
        1.15 + l * 0.08,
        Math.cos(a) * (apo + 0.115),
      );
      ls.rotation.y = a;
    }
  }
  // tripod from the ring to the capsule skirt
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    strut(g, P.aluDark, az(a, 0.9, 1.5), az(a, 1.35, 2.15), 0.03, 6);
  }
  // capsule: skirt, equator rim, white dome with its meridian ribs
  latheMesh(g, white, [
    [1.0, 1.95],
    [1.55, 2.08],
    [1.75, 2.2],
    [1.72, 2.5],
    [1.45, 2.95],
    [0.9, 3.25],
    [0.0, 3.4],
  ]);
  ring(g, P.alu, 1.76, 0.03, 2.2);
  for (const [r, y] of [
    [1.7, 2.5],
    [1.42, 2.95],
    [0.88, 3.25],
  ] as const)
    ring(g, P.tape, r + 0.012, 0.012, y);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    strut(g, P.tape, az(a, 1.74, 2.3), az(a, 1.44, 2.97), 0.01, 4);
    strut(g, P.tape, az(a, 1.44, 2.97), az(a, 0.88, 3.26), 0.01, 4);
  }
  // four solar panels: two wings of two, horizontal on yokes
  for (const s of [1, -1] as const) {
    strut(g, P.alu, V(s * (apo + 0.02), 1.4, 0), V(s * (apo + 0.35), 1.4, 0), 0.04, 8);
    const w = wing(g, P, apo + 0.35, 2, 1.7, 1.25, s, { cols: 7, rows: 6 }, 0.1);
    w.rotation.x = -Math.PI / 2;
    w.position.y = 1.4;
    strut(g, P.alu, V(s * (apo + 0.35), 1.4, 0.6), V(s * (apo + 3.75), 1.4, 0.62), 0.02, 6);
    strut(g, P.alu, V(s * (apo + 0.35), 1.4, -0.6), V(s * (apo + 3.75), 1.4, -0.62), 0.02, 6);
  }
  // 1.5 m gold high-gain dish on a boom at the front
  const d = foilDish(P, 0.68, P.dishGold, 0.005, 0.24);
  aim(d, V(0.2, 1.45, 1.75), V(0.35, 0.3, 0.9));
  g.add(d);
  strut(g, P.alu, V(0.1, 1.3, 1.15), V(0.2, 1.45, 1.75), 0.04, 8);
  // low-gain antenna on a tripod, scan platform with the two cameras
  for (const dx of [-0.15, 0.15])
    strut(g, P.alu, V(-1.0 + dx, 1.5, 0.2), V(-1.45, 2.25, 0.3), 0.012, 5);
  cyl(g, P.alu, 0.22, 0.22, 0.03, -1.45, 2.28, 0.3, 20);
  box(g, P.silver, 0.45, 0.4, 0.55, 1.15, 1.35, 0.95);
  cyl(g, P.dark, 0.09, 0.09, 0.3, 1.15, 1.3, 1.3, 14).rotation.x = Math.PI / 2;
  cyl(g, P.dark, 0.07, 0.07, 0.3, 1.3, 1.5, 1.25, 14).rotation.x = Math.PI / 2;
  return finish(g, VIKING_H);
}

// ─── Mariner 2 ───────────────────────────────────────────────────────────────────────────────

const MARINER2_H = 3.66;

function buildMariner2(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const bx = 0.52;
  const y0 = 0.45;
  const t = 0.36;
  const top = y0 + t;
  // hexagonal frame with six electronics bays, a plate on the top and bottom
  for (const y of [y0 - 0.01, top + 0.01]) {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(bx, bx, 0.025, 6), P.aluDark);
    plate.position.y = y;
    g.add(plate);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    const wrap = add(g, new THREE.Group());
    wrap.rotation.y = a;
    bay(wrap, P, k % 2 ? P.silver : P.gold, 0.5, t - 0.04, 0.22, 0, y0 + t / 2, bx * 0.866 - 0.12);
    for (let l = 0; l < 4; l++)
      box(wrap, P.dark, 0.42, 0.012, 0.012, 0, y0 + 0.06 + l * 0.08, bx * 0.866 + 0.0);
  }
  mli(g, P.gold, 0.55, 0.28, 0.55, 0, y0 + t / 2, 0, 0.02);
  for (let k = 0; k < 6; k++) {
    const a = ((k + 0.5) / 6) * TAU;
    strut(g, P.gold, az(a, bx * 0.94, y0), az(a, bx * 0.94, top), 0.012, 5);
  }
  // pyramid mast: four-legged truss rising from the top plate, instruments along it
  const apexY = 3.17;
  squareTruss(g, P.alu, top, apexY, 0.34, 0.09, 4, 0.014);
  box(g, P.dark, 0.16, 0.2, 0.16, 0.16, top + 0.55, 0.16);
  box(g, P.white, 0.12, 0.14, 0.12, -0.14, top + 0.95, -0.12);
  box(g, P.silver, 0.12, 0.16, 0.12, 0.1, top + 1.5, -0.08);
  cyl(g, P.alu, 0.05, 0.05, 0.15, 0, apexY + 0.05, 0, 12);
  cyl(g, P.gold, 0.06, 0.15, 0.2, 0, apexY + 0.2, 0, 16);
  cyl(g, P.white, 0.05, 0.05, 0.42, 0, apexY + 0.5, 0, 12);
  // nitrogen bottles and the microwave radiometer
  for (const a of [0.3, 0.3 + TAU / 3, 0.3 + (2 * TAU) / 3])
    sphere(g, P.alu, 0.075, Math.sin(a) * 0.3, top + 0.09, Math.cos(a) * 0.3);
  const rad = foilDish(P, 0.24, P.silver, 0.006, 0.2);
  aim(rad, V(0.0, 0.62, 0.62), V(0.3, 0.45, 0.85));
  g.add(rad);
  // high-gain grid dish on a bracket below the bus, tilted toward Earth (+z)
  const hg = gridDish(P, 0.4, P.alu);
  aim(hg, V(0, 0.5, 0.75), V(0, Math.sin(0.65), Math.cos(0.65)));
  g.add(hg);
  strut(g, P.gold, V(0, y0, 0.3), V(0, 0.5, 0.75), 0.025, 8);
  strut(g, P.gold, V(0.2, y0, 0.2), V(0, 0.5, 0.75), 0.015, 6);
  // two solar panels: 183 x 76 cm on +x, 152 x 76 cm plus the 31 cm vane on -x
  for (const [s, len, ext] of [
    [1, 1.83, 0],
    [-1, 1.52, 0.31],
  ] as const) {
    const w = wing(g, P, 0.62, 1, len, 0.76, s, { cols: 8, rows: 4 }, 0);
    w.rotation.x = -Math.PI / 2;
    w.position.y = top - 0.06;
    strut(g, P.gold, V(s * 0.3, top - 0.06, 0.2), V(s * 0.62, top - 0.06, 0.3), 0.012, 5);
    strut(g, P.gold, V(s * 0.3, top - 0.06, -0.2), V(s * 0.62, top - 0.06, -0.3), 0.012, 5);
    if (ext) {
      const v = box(g, P.silver, ext, 0.02, 0.76, s * (0.62 + len + ext / 2 + 0.03), top - 0.06, 0);
      v.userData.solarArray = true;
    }
    box(g, P.dark, 0.06, 0.05, 0.08, s * (0.62 + len + ext + 0.05), top - 0.06, 0.3);
  }
  return finish(g, MARINER2_H);
}

// ─── BepiColombo cruise stack ────────────────────────────────────────────────────────────────

const BEPI_H = 6.4;

function buildBepiColombo(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  const mlw = mat(0xe4e2dc, 0.35, 0.5, true);
  const mlg = mat(0xb9b8b2, 0.45, 0.5, true);
  const redP = mat(0xa83228, 0.2, 0.6);
  // launch adapter ring at the base
  cyl(g, redP, 0.85, 0.95, 0.35, 0, 0.175, 0, 36);
  cyl(g, P.dark, 0.78, 0.78, 0.02, 0, 0.36, 0, 36);
  // Mercury Transfer Module: blanketed box with four ion thrusters under it
  const mtmY = 0.35;
  bay(g, P, mlw, 2.2, 2.1, 2.2, 0, mtmY + 1.05, 0);
  box(g, P.dark, 2.24, 0.06, 2.24, 0, mtmY + 2.13, 0);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    cyl(g, P.aluDark, 0.05, 0.13, 0.16, sx * 0.85, mtmY + 0.12, sz * 0.85, 14);
  }
  bay(g, P, mlg, 0.55, 1.2, 0.2, 0, mtmY + 1.05, 1.2);
  // medium-gain dish and horn on the MTM
  const mga = foilDish(P, 0.38, mat(0xe8e6e0, 0.3, 0.45, true), 0.006, 0.2);
  aim(mga, V(-1.35, mtmY + 1.3, 0.1), V(-0.9, 0.3, 0.3));
  g.add(mga);
  strut(g, P.alu, V(-1.1, mtmY + 1.3, 0.1), V(-1.35, mtmY + 1.3, 0.1), 0.03, 6);
  cyl(g, P.white, 0.02, 0.1, 0.3, 0.7, mtmY + 1.9, 1.3, 12).rotation.x = Math.PI / 2;
  // MPO: 2.4 x 2.2 x 1.7 m, white blanket, black radiator face
  const mpoY = mtmY + 2.16;
  bay(g, P, mlw, 2.2, 2.4, 1.7, 0, mpoY + 1.2, 0);
  box(g, P.blackFoil, 2.15, 1.3, 0.03, 0, mpoY + 1.3, 0.87);
  for (let k = 1; k < 8; k++)
    box(g, P.aluDark, 2.15, 0.012, 0.035, 0, mpoY + 0.75 + k * 0.14, 0.88);
  box(g, mlg, 0.6, 0.5, 0.05, 0.85, mpoY + 0.5, -0.88);
  // MPO 1 m high-gain dish on its boom, and the magnetometer boom's stub
  strut(g, P.alu, V(-0.6, mpoY + 2.4, 0), V(-0.9, mpoY + 2.75, 0.1), 0.03, 8);
  const hga = foilDish(P, 0.5, mat(0xefede8, 0.3, 0.4, true), 0.006, 0.2);
  aim(hga, V(-0.9, mpoY + 2.75, 0.1), V(-0.5, 0.7, 0.5));
  g.add(hga);
  strut(g, P.alu, V(0.9, mpoY + 2.4, -0.3), V(0.9, mpoY + 3.0, -0.3), 0.015, 5);
  // MOSIF sunshield cylinder with Mio inside, on top of the MPO
  const mosY = mpoY + 2.4;
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.1, 1.3, 40, 1, true),
    mat(0xd6d4cc, 0.3, 0.45, true),
  );
  shell.position.set(0, mosY + 0.65, 0);
  g.add(shell);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.97, 1.07, 1.28, 40, 1, true), P.dark);
  inner.position.copy(shell.position);
  g.add(inner);
  ring(g, P.alu, 1.0, 0.02, mosY + 1.3);
  const mio = new THREE.Group();
  mio.position.y = mosY + 0.12;
  const oct = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.0, 8), P.cell);
  oct.position.y = 0.5;
  mio.add(oct);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    box(mio, P.line, 0.012, 0.95, 0.012, Math.sin(a) * 0.9, 0.5, Math.cos(a) * 0.9);
  }
  const mdisc = foilDish(P, 0.55, P.gold, 0.01, 0.1);
  mdisc.position.y = 1.0;
  mio.add(mdisc);
  g.add(mio);
  // two MTM wings of four panels each, black-and-blue striped
  for (const s of [1, -1] as const) {
    box(g, P.dark, 0.3, 0.12, 0.2, s * 1.25, mtmY + 1.05, 0);
    const w = wing(g, P, 1.4, 4, 3.0, 1.7, s, { stripes: 8, cell: P.cell }, 0.08);
    w.position.y = mtmY + 1.05;
    w.rotation.x = 0;
  }
  return finish(g, BEPI_H);
}

// ─── Registry ────────────────────────────────────────────────────────────────────────────────

// ─── ESCAPADE (Blue and Gold, one builder) ───────────────────────────────────────────────────

function buildEscapade(): THREE.Group {
  const P = palette();
  const g = new THREE.Group();
  // Rocket Lab Explorer bus 1.20 x 1.65 x 1.09 m (x, y, z), two wings to 4.88 m across, a 0.6 m
  // dish and a 2 m boom above the bus with the magnetometer and the Langmuir probe.
  const W = 1.2;
  const H = 1.65;
  const D = 1.09;
  const y0 = 0.12;
  mli(g, P.blackFoil, W, H, D, 0, y0 + H / 2, 0, 0.012);
  seams(g, P.tape, W, H, D, 0, y0 + H / 2, 0, 3, 2, 0.03);
  for (const s of [-1, 1]) {
    box(g, P.white, 0.02, H * 0.55, D * 0.7, s * (W / 2 + 0.012), y0 + H * 0.4, 0);
    for (let k = 1; k < 6; k++)
      box(g, P.aluDark, 0.025, 0.01, D * 0.7, s * (W / 2 + 0.014), y0 + H * 0.125 + k * 0.15, 0);
  }
  // main engine and its four attitude thrusters below, the adapter ring
  cyl(g, P.aluDark, 0.07, 0.13, y0, 0, y0 / 2, 0, 18);
  cyl(g, P.alu, 0.32, 0.32, 0.04, 0, y0 - 0.02, 0, 32);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const)
    cyl(g, P.dark, 0.02, 0.045, 0.08, sx * 0.45, y0 + 0.02, sz * 0.4, 10);
  // the 0.6 m X-band dish on the +z face, star trackers, sun sensors
  const d = foilDish(P, 0.3, P.dishFoil, 0.006, 0.25);
  aim(d, V(0, y0 + H * 0.7, D / 2 + 0.05), V(0, 0, 1));
  g.add(d);
  for (const sx of [-0.4, 0.4]) {
    cyl(g, P.dark, 0.05, 0.05, 0.14, sx, y0 + H - 0.18, -D / 2 - 0.07, 14).rotation.x = Math.PI / 2;
  }
  box(g, P.alu, 0.12, 0.08, 0.04, 0.4, y0 + H * 0.3, D / 2 + 0.02);
  // two wings off the short sides: 4.88 m tip to tip
  for (const s of [1, -1] as const) {
    strut(
      g,
      P.alu,
      V(s * (W / 2), y0 + H * 0.55, 0),
      V(s * (W / 2 + 0.18), y0 + H * 0.55, 0),
      0.03,
      8,
    );
    const w = wing(g, P, W / 2 + 0.18, 2, 0.8, 1.4, s, { cols: 4, rows: 6 });
    w.position.y = y0 + H * 0.55;
  }
  // 2 m boom above the bus: the Langmuir probe part way up, the magnetometer at the tip
  const top = y0 + H;
  strut(g, P.alu, V(-0.3, top, -0.2), V(-0.3, top + 2.0, -0.2), 0.018, 8);
  box(g, P.white, 0.1, 0.1, 0.1, -0.3, top + 2.03, -0.2);
  box(g, P.dark, 0.08, 0.05, 0.08, -0.3, top + 1.1, -0.2);
  cyl(g, P.alu, 0.012, 0.012, 0.35, -0.3, top + 1.1, -0.02, 6).rotation.x = Math.PI / 2;
  return g;
}

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

const M71_REFS = [
  WP(
    'Mars_3',
    '4.1 m tall, 2 m across (5.9 m with panels); 2.9 m conical aeroshell and 1.2 m lander capsule on the bus opposite the engine (the same M-71 bus flew as Mars 2)',
  ),
  WC('Mars_3_Space_Probe_1.jpg', 'museum exhibit, front: flat dish, panels, aeroshell on top'),
  WC(
    'Mars_3_Space_Probe_3.jpg',
    'museum exhibit: truss ring, tank barrel, spheres, collar, banded shield',
  ),
];

function make(
  fn: () => THREE.Group,
  heightM: number,
  heightEstimate: string,
  diameterM: number,
  refs: ShowcaseRef[],
): ShowcaseModel {
  return { build: fn, heightM, heightEstimate, diameterM, refs };
}

export const SHOWCASE: Record<string, ShowcaseModel> = {
  escapade: make(
    buildEscapade,
    3.85,
    'No published height for the craft as it stands: the 1.65 m bus axis upright on its engine and adapter, with the 2 m magnetometer boom raised above it; the radiator and star-tracker sizes are judged.',
    1.65,
    [
      WP(
        'ESCAPADE',
        'two identical spacecraft, bus 1.20 x 1.65 x 1.09 m, 4.88 m across the deployed arrays, 0.6 m high-gain dish, 2 m boom with the magnetometer and the Langmuir probe',
      ),
    ],
  ),
  'exomars-tgo': make(
    buildTgo,
    TGO_H,
    'No height in the fleet entry; 3.2 m is the bus length of ESA’s published 3.2 x 2 x 2 m bus (recalled, not re-fetched), stood on its launch adapter with the 2.2 m dish and a 17.5 m array span; arrays, dish and instrument sizes judged from the ESOC model photo.',
    2.0,
    [
      WP(
        'ExoMars_Trace_Gas_Orbiter',
        'bus, two two-panel arrays, 2.2 m high-gain dish, NOMAD/ACS/CaSSIS',
      ),
      WC(
        'ExoMars_Trace_Gas_Orbiter_Model_at_ESOC.JPG',
        'model photo: gold bus, adapter ring, array layout, nadir antennas',
      ),
    ],
  ),
  'mars-odyssey': make(
    buildOdyssey,
    ODYSSEY_H,
    'No height in the fleet entry; bus drawn about 2.2 m high, overall about 3.7 m with the 1.3 m dish on its mast above, scaled from the NASA model render (not a published figure).',
    1.7,
    [
      WP('2001_Mars_Odyssey', 'bus, three-panel array, 1.3 m dish, gamma-ray spectrometer boom'),
      WC(
        'Mars_Odyssey_spacecraft_model.png',
        'NASA render: bus, array, dish on mast, GRS boom with its head',
      ),
    ],
  ),
  'mars2-orbiter': make(
    buildM71,
    M71_H,
    'No height in the fleet entry; 4.1 m is the height Wikipedia gives for the Mars 2 / Mars 3 spacecraft (4.1 x 2.0 x 5.9 m, lander included, panels deployed).',
    2.0,
    M71_REFS,
  ),
  'mars3-orbiter': make(
    buildM71,
    M71_H,
    'No height in the fleet entry; 4.1 m is the height Wikipedia gives for the Mars 2 / Mars 3 spacecraft (4.1 x 2.0 x 5.9 m, lander included, panels deployed).',
    2.0,
    M71_REFS,
  ),
  mro: make(
    buildMro,
    MRO_H,
    'No height in the fleet entry; the drawn bus is about 2 m with the nadir HiRISE below and the 3 m dish raised above it, scaled from the NASA model render; panels are the published 5.35 x 2.53 m.',
    2.0,
    [
      WP(
        'Mars_Reconnaissance_Orbiter',
        'solar panels 5.35 x 2.53 m each, HiRISE, CTX, SHARAD, 3 m high-gain dish',
      ),
      WC(
        'Mars_Reconnaissance_Orbiter_spacecraft_model.png',
        'NASA render: gold bus, dish, two-segment arrays, nadir instruments',
      ),
    ],
  ),
  'phobos-2': make(
    buildPhobos2,
    PHOBOS2_H,
    'No height in the fleet entry or on the Wikipedia page; about 3.2 m judged from the museum model photos against the two horizontal panels and the tank spheres.',
    1.9,
    [
      WP('Phobos_2', 'the Soviet Phobos 2 spacecraft (no dimensions on the page)'),
      WC(
        'Автоматическая_межпланетная_станция_Фобос_(14988562882).jpg',
        'museum model: four tank spheres, toroidal belt, core with boxes, mast dish, flat panels',
      ),
      WC('Phobos_(model).jpg', 'museum model, full view with both panels and outriggers'),
    ],
  ),
  'tianwen-1': make(
    buildTianwen1,
    TIANWEN_H,
    'No height in the fleet entry; about 3.4 m judged as a ~2.2 m hexagonal bus carrying the 3.4 m entry capsule (a recalled capsule diameter, not re-fetched).',
    2.5,
    [
      WP('Tianwen-1', 'orbiter below, the capsule housing the lander and Zhurong rover on top'),
      WC(
        'Tianwen-1_in_Mars_orbit.jpg',
        'CNSA photo: gold hexagonal bus, array wings, thin antenna rods',
      ),
    ],
  ),
  'viking1-orbiter': make(
    buildVikingOrbiter,
    VIKING_H,
    'No height in the fleet entry; the 2.5 m octagon is Wikipedia’s published width, the engine cone below and the 3.5 m-class capsule dome above judged from the NASA photo.',
    2.5,
    [
      WP('Viking_program', 'orbiter an octagon about 2.5 m across, based on Mariner 9'),
      WC(
        'Viking_spacecraft.jpg',
        'NASA photo: engine cone, octagon, four-panel wings, gold dish, capsule dome on top',
      ),
    ],
  ),
  'mariner-2': make(
    buildMariner2,
    MARINER2_H,
    'No height in the fleet entry; 3.66 m is the overall height NASA NSSDCA gives for Mariner 2 (as cited by the earlier builder in orbiters.ts; not re-fetched here).',
    1.04,
    [
      WP('Mariner_2', '100 cm hexagonal bus carrying panels, booms and antennas'),
      WC('Mariner_2.jpg', 'NASA illustration: hex frame, panels, grid dish, tower'),
      WC(
        'Model_of_Mariner_2_spacecraft_(GRC-1964-C-70182).jpg',
        'NASA model: tapered truss tower, six bays, dishes, panels',
      ),
    ],
  ),
  bepicolombo: make(
    buildBepiColombo,
    BEPI_H,
    'No height in the fleet entry; about 6.3 m judged from ESA stack pictures: MTM, then the 2.4 m MPO, then the Mio sunshield cylinder.',
    2.4,
    [
      WP('BepiColombo', 'MPO 2.4 x 2.2 x 1.7 m, Mio 1.8 x 1.1 m, MTM and MOSIF stacked for cruise'),
      WC(
        'BepiColombo_spacecraft_model.png',
        'ESA render of the cruise stack: MTM, MPO, sunshield, Mio',
      ),
      WC('BepiColombo_stack.jpg', 'ESA photo: blanketed stack, antenna horn and dish'),
    ],
  ),
};
