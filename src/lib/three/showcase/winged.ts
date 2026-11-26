/**
 * Showcase models: the winged orbital vehicles. The Space Shuttle orbiters (one builder for all
 * seven; Columbia and Enterprise differ by material only), Buran and the OK-GLI atmospheric test
 * vehicle (one builder), and the X-37B.
 *
 * Frame (contract): metres, nose UP (+y), base y = 0 at the engine-exit plane, front +z. The span
 * runs along x. The vehicle's own "up" (dorsal: fin, payload-bay doors, windows) points to -z; the
 * belly (black tiles, gear doors, body flap) faces +z. Both builders are authored at the Shuttle's
 * scale (the X-37B at its own) and scaled uniformly to the sourced overall length. Landing gear is
 * deployed (the line-up lays the craft on its runway) and sits in the group 'landing-gear', so a
 * flight scene can hide it.
 *
 * What makes each read as itself, in order:
 * - Orbiter: the white upper fuselage with the four-section payload-bay doors, the black tile
 *   belly and nose cap, the double-delta wing with its RCC leading edge, the fin, the OMS pods
 *   with their RCS jets, the three SSMEs, the body flap.
 * - Buran: the same layout, no main engines (they were on Energia), two OMS nozzles in the tail.
 * - OK-GLI: the Buran airframe painted white-grey, with four AL-31 jets on the upper tail.
 * - X-37B: the small black-tile spaceplane, canted V-tail, closed bay doors.
 */
import * as THREE from 'three';
import { crinkle, hash3 } from './kit';
import type { ShowcaseModel, ShowcaseRef } from './types';

const std = (
  color: number,
  roughness = 0.85,
  metalness = 0.05,
  extra: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

interface Tone {
  white: number;
  black: number;
  blackSpread: number;
}

interface Mats {
  vc: THREE.MeshStandardMaterial;
  white: THREE.MeshStandardMaterial;
  rcc: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  line: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  bell: THREE.MeshStandardMaterial;
  engine: THREE.MeshStandardMaterial;
  shield: THREE.MeshStandardMaterial;
  tyre: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
}

function mats(): Mats {
  return {
    vc: std(0xffffff, 0.82, 0.04, { vertexColors: true, side: THREE.DoubleSide }),
    white: std(0xe6e5de, 0.8, 0.03, { side: THREE.DoubleSide }),
    rcc: std(0x2e2f32, 0.45, 0.25),
    glass: std(0x1a2733, 0.1, 0.55),
    line: std(0x4a4b50, 0.8),
    dark: std(0x0d0d10, 0.9),
    bell: std(0x8a6c4c, 0.35, 0.7, { side: THREE.DoubleSide }),
    engine: std(0x9b9b96, 0.5, 0.5),
    shield: std(0xd8d1ba, 0.95, 0.02, { flatShading: true }),
    tyre: std(0x151517, 0.9),
    gold: std(0xb8923a, 0.4, 0.7),
  };
}

const col = (n: number): THREE.Color => new THREE.Color(n);
const shade = (c: THREE.Color, k: number): THREE.Color => c.clone().multiplyScalar(k);
const jit = (c: THREE.Color, x: number, a: number, v: number, spread: number, k = 7): THREE.Color =>
  shade(c, 1 + hash3(x, a, v, k) * spread);

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

/** Lateral half width of the surface at station a and vehicle-up height v. */
function surfX(stns: Stn[], n: number, a: number, v: number): number {
  const p = prof(stns, a);
  const h = v >= 0 ? p.t : p.b;
  const r = Math.min(Math.abs(v) / h, 0.999);
  return p.w * Math.pow(1 - Math.pow(r, n), 1 / n);
}

type ColorFn = (x: number, a: number, v: number) => THREE.Color;

/** Per-triangle flat normals for the triangles `flat` picks (index of the first vertex). */
function flatten(g: THREE.BufferGeometry, flat: (i: number) => boolean): void {
  const p = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    if (!flat(i)) continue;
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    const n = b.sub(a).cross(c.sub(a)).normalize();
    for (let k = 0; k < 3; k++) nrm.setXYZ(i + k, n.x, n.y, n.z);
  }
}

/**
 * Lofted superellipse body along y, closed by caps. Vertex colour per quad (the tile mosaic),
 * `rough` crumples the blanketed zones (metres of displacement), whose faces then shade flat.
 */
function loft(
  coarse: Stn[],
  o: {
    n: number;
    ring?: number;
    step?: number;
    cx?: number;
    cv?: number;
    color: ColorFn;
    rough?: (x: number, a: number, v: number) => number;
    capColor?: THREE.Color;
  },
): THREE.BufferGeometry {
  const step = o.step ?? 0.7;
  const stns: Stn[] = [];
  for (let i = 0; i < coarse.length - 1; i++) {
    const p = coarse[i];
    const q = coarse[i + 1];
    const steps = Math.max(1, Math.ceil((q.a - p.a) / step));
    for (let k = 0; k < steps; k++) stns.push(prof(coarse, p.a + ((q.a - p.a) * k) / steps));
  }
  stns.push(coarse[coarse.length - 1]);
  const ring = o.ring ?? 48;
  const cx = o.cx ?? 0;
  const cv = o.cv ?? 0;
  const ex = 2 / o.n;
  const S = stns.length;
  const pos: number[] = [];
  const amps: number[] = [];
  for (let si = 0; si < S; si++) {
    const s = stns[si];
    for (let j = 0; j < ring; j++) {
      const th = (j / ring) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const px = s.w * Math.sign(c) * Math.pow(Math.abs(c), ex);
      const pv = sn >= 0 ? s.t * Math.pow(sn, ex) : -s.b * Math.pow(-sn, ex);
      let X = cx + px;
      let V = cv + pv;
      let A = s.a;
      const amp = si === 0 || si === S - 1 ? 0 : (o.rough?.(X, s.a, V) ?? 0);
      if (amp > 0) {
        const len = Math.hypot(px, pv) || 1;
        const d = hash3(X, s.a, V, 5) * amp;
        X += (px / len) * d;
        V += (pv / len) * d;
        A += hash3(X, s.a, V, 6) * amp * 0.4;
      }
      pos.push(X, A, -V);
      amps.push(amp);
    }
  }
  const idx: number[] = [];
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
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const [A, B, C] = [idx[i], idx[i + 1], idx[i + 2]].map(
      (k) => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]),
    );
    vol += A.dot(B.clone().cross(C)) / 6;
  }
  if (vol < 0)
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const body = g.toNonIndexed();
  g.dispose();
  const colors: number[] = [];
  const bp = body.getAttribute('position');
  let flatQuad = new Set<number>();
  for (let i = 0; i < bp.count; i += 6) {
    let x = 0;
    let a = 0;
    let v = 0;
    for (let k = 0; k < 6; k++) {
      x += bp.getX(i + k) / 6;
      a += bp.getY(i + k) / 6;
      v -= bp.getZ(i + k) / 6;
    }
    const c = o.color(x, a, v);
    for (let k = 0; k < 6; k++) colors.push(c.r, c.g, c.b);
    if (o.rough && o.rough(x, a, v) > 0) flatQuad.add(i);
  }
  flatten(body, (i) => flatQuad.has(i - (i % 6)));
  flatQuad = new Set();
  // flat caps at both ends (own vertices so the rim stays crisp)
  const capPos: number[] = [];
  const capC = o.capColor ?? new THREE.Color(0x6e675c);
  const addCap = (si: number): void => {
    const s = stns[si];
    const off = si * ring;
    for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring;
      const q1 = [pos[(off + j) * 3], pos[(off + j) * 3 + 1], pos[(off + j) * 3 + 2]];
      const q2 = [pos[(off + j2) * 3], pos[(off + j2) * 3 + 1], pos[(off + j2) * 3 + 2]];
      capPos.push(...q1, ...q2, cx, s.a, -cv);
    }
  };
  addCap(0);
  addCap(S - 1);
  const out = new THREE.BufferGeometry();
  const bn = body.getAttribute('normal');
  out.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([...Array.from(bp.array as Float32Array), ...capPos], 3),
  );
  out.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(
      [...Array.from(bn.array as Float32Array), ...new Array(capPos.length).fill(0)],
      3,
    ),
  );
  const capCols: number[] = [];
  for (let i = 0; i < capPos.length / 3; i++) capCols.push(capC.r, capC.g, capC.b);
  out.setAttribute('color', new THREE.Float32BufferAttribute([...colors, ...capCols], 3));
  body.dispose();
  // cap normals: along the axis, outward at each end
  const nrm = out.getAttribute('normal');
  const total = out.getAttribute('position').count;
  const capVerts = ring * 3;
  for (let i = total - 2 * capVerts; i < total; i++) {
    nrm.setXYZ(i, 0, i < total - capVerts ? -1 : 1, 0);
  }
  return out;
}

/** A grid of points as a coloured mesh geometry: a colour per quad, smooth or faceted. */
function gridGeo(
  rows: THREE.Vector3[][],
  color: (c: THREE.Vector3, i: number, j: number) => THREE.Color,
  smooth: boolean,
): THREE.BufferGeometry {
  const R = rows.length;
  const C = rows[0].length;
  const pos: number[] = [];
  for (const r of rows) for (const p of r) pos.push(p.x, p.y, p.z);
  const idx: number[] = [];
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < C - 1; j++) {
      const a = i * C + j;
      idx.push(a, a + 1, (i + 1) * C + j + 1, a, (i + 1) * C + j + 1, (i + 1) * C + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  g.dispose();
  const cs: number[] = [];
  const p = ng.getAttribute('position');
  let q = 0;
  for (let i = 0; i < R - 1; i++) {
    for (let j = 0; j < C - 1; j++) {
      const c = new THREE.Vector3();
      for (let k = 0; k < 6; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, q * 6 + k));
      c.multiplyScalar(1 / 6);
      const k = color(c, i, j);
      for (let m = 0; m < 6; m++) cs.push(k.r, k.g, k.b);
      q++;
    }
  }
  if (!smooth) ng.computeVertexNormals();
  ng.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
  return ng;
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  parent.add(o);
  return o;
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

/** A tile-mosaic box: its faces are split into quads, each with its own shade. */
function tileBox(
  w: number,
  h: number,
  d: number,
  base: THREE.Color,
  spread: number,
  parent: THREE.Object3D,
  m: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(
    w,
    h,
    d,
    Math.max(1, Math.round(w / 0.3)),
    Math.max(1, Math.round(h / 0.3)),
    1,
  ).toNonIndexed();
  const cs: number[] = [];
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i += 6) {
    const c = new THREE.Vector3();
    for (let k = 0; k < 6; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, i + k));
    c.multiplyScalar(1 / 6);
    const k = jit(base, c.x, c.y, c.z, spread);
    for (let m2 = 0; m2 < 6; m2++) cs.push(k.r, k.g, k.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
  const b = mesh(geo, m, parent);
  b.position.set(x, y, z);
  return b;
}

/** A thin dark seam between two points, lying on a surface (w across, h proud). */
function seam(
  parent: THREE.Object3D,
  m: THREE.Material,
  p: THREE.Vector3,
  q: THREE.Vector3,
  w: number,
  h: number,
): void {
  const len = p.distanceTo(q);
  const b = mesh(new THREE.BoxGeometry(w, h, len), m, parent);
  b.position.copy(p).add(q).multiplyScalar(0.5);
  b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.clone().sub(p).normalize());
}

/** A cone or cylinder between two points: radius ra at a, rb at b. */
function taper(
  parent: THREE.Object3D,
  m: THREE.Material,
  a: THREE.Vector3,
  b: THREE.Vector3,
  ra: number,
  rb: number,
  seg = 12,
): THREE.Mesh {
  const o = mesh(new THREE.CylinderGeometry(rb, ra, a.distanceTo(b), seg), m, parent);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return o;
}

/** A ring (torus) about the y axis at height y, centred (x, z). */
function ring(
  parent: THREE.Object3D,
  m: THREE.Material,
  R: number,
  r: number,
  x: number,
  y: number,
  z: number,
): void {
  const t = mesh(new THREE.TorusGeometry(R, r, 6, 28), m, parent);
  t.rotation.x = Math.PI / 2;
  t.position.set(x, y, z);
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
  for (let i = 0; i <= 14; i++) {
    const f = i / 14;
    pts.push(
      new THREE.Vector2(rThroat + (rExit - rThroat) * Math.pow(1 - f, contour), yExit + len * f),
    );
  }
  mesh(new THREE.LatheGeometry(pts, 28), m, parent).position.set(x, 0, z);
}

/**
 * A thick plate between a leading and a trailing edge (wing, fin, tail): two coloured surfaces
 * and closing strips at the leading edge, the trailing edge and the tip. `pos` maps the span
 * fraction u, the chord coordinate c, the chord fraction f and the side (0 top, 1 bottom).
 */
function slab(
  o: {
    ns: number;
    nf: number;
    le: (u: number) => number;
    te: (u: number) => number;
    pos: (u: number, c: number, f: number, side: 0 | 1) => THREE.Vector3;
    color: (side: 0 | 1, p: THREE.Vector3) => THREE.Color;
    edgeColor: (p: THREE.Vector3) => THREE.Color;
  },
  m: THREE.Material,
  parent: THREE.Object3D,
): void {
  const sides: THREE.Vector3[][][] = [[], []];
  for (let i = 0; i <= o.ns; i++) {
    const u = i / o.ns;
    for (const s of [0, 1] as const) {
      const row: THREE.Vector3[] = [];
      for (let j = 0; j <= o.nf; j++) {
        const f = j / o.nf;
        row.push(o.pos(u, o.le(u) + (o.te(u) - o.le(u)) * f, f, s));
      }
      sides[s].push(row);
    }
  }
  for (const s of [0, 1] as const) {
    mesh(
      gridGeo(sides[s], (c) => o.color(s, c), false),
      m,
      parent,
    );
  }
  const edge = (a: THREE.Vector3[], b: THREE.Vector3[]): void => {
    mesh(
      gridGeo([a, b], (c) => o.edgeColor(c), false),
      m,
      parent,
    );
  };
  edge(
    sides[0].map((r) => r[0]),
    sides[1].map((r) => r[0]),
  );
  edge(
    sides[0].map((r) => r[o.nf]),
    sides[1].map((r) => r[o.nf]),
  );
  edge(sides[0][o.ns], sides[1][o.ns]);
  edge(sides[0][0], sides[1][0]);
}

// ── payload-bay interior and the RMS (opt-in, see OrbiterOpts) ──────────────────

// Bay: 4.6 m wide and 18.3 m long per Wikipedia (Space Shuttle orbiter). The sill sits at x = ±2.1
// under the doors' hinge line; the liner's cross-section (vertical walls, a superellipse floor
// 1.9 m deep), the ribs, longerons and the bulkhead detail are SCHEMATIC.
const BAY_X = 2.1;
const BAY_A0 = 7.4;
const BAY_A1 = 25.8;
const BAY_FLOOR = 1.9;

/** The bay cross-section as (x, v) points: left sill, down the wall, round the floor, up to the right sill. */
function bayOutline(vh: number): [number, number][] {
  const vc = vh - 0.6;
  const pts: [number, number][] = [[-BAY_X, vh]];
  const n = 3;
  for (let i = 0; i <= 16; i++) {
    const phi = (i / 16) * Math.PI;
    const c = Math.cos(phi);
    pts.push([
      -BAY_X * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
      vc - BAY_FLOOR * Math.pow(Math.sin(phi), 2 / n),
    ]);
  }
  pts.push([BAY_X, vh]);
  return pts;
}

/** Drop the body quads of a loft whose centroid (x, a, v) the predicate picks; the end caps stay. */
function cutHull(
  g: THREE.BufferGeometry,
  ring: number,
  drop: (x: number, a: number, v: number) => boolean,
): THREE.BufferGeometry {
  const p = g.getAttribute('position');
  const body = p.count - ring * 6;
  const keep: number[] = [];
  for (let i = 0; i < body; i += 6) {
    let x = 0;
    let a = 0;
    let v = 0;
    for (let k = 0; k < 6; k++) {
      x += p.getX(i + k) / 6;
      a += p.getY(i + k) / 6;
      v -= p.getZ(i + k) / 6;
    }
    if (!drop(x, a, v)) for (let k = 0; k < 6; k++) keep.push(i + k);
  }
  for (let i = body; i < p.count; i++) keep.push(i);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const src = g.getAttribute(name);
    const arr = new Float32Array(keep.length * 3);
    keep.forEach((s, d) => {
      arr[d * 3] = src.getX(s);
      arr[d * 3 + 1] = src.getY(s);
      arr[d * 3 + 2] = src.getZ(s);
    });
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  g.dispose();
  return out;
}

/**
 * The bay seen when the doors are open: the liner, the sill longerons the doors hinge on, the
 * lengthwise longerons and the ribs, and the two end bulkheads (the aft one carries schematic
 * plumbing panels). hullV(a, x) is the dorsal skin height, so the bulkheads close under the arch.
 */
function buildBay(
  g: THREE.Object3D,
  M: Mats,
  WHITE: THREE.Color,
  vh: number,
  hullV: (a: number, x: number) => number,
): void {
  const out = bayOutline(vh);
  const liner = new THREE.Group();
  liner.name = 'bay-interior';
  g.add(liner);
  const rows: THREE.Vector3[][] = [];
  const NA = 12;
  for (let i = 0; i <= NA; i++) {
    const a = BAY_A0 + ((BAY_A1 - BAY_A0) * i) / NA;
    rows.push(out.map(([x, v]) => new THREE.Vector3(x, a, -v)));
  }
  const lc = shade(WHITE, 0.78);
  mesh(
    gridGeo(rows, (c) => jit(lc, c.x, c.y, c.z, 0.06, 21), false),
    M.vc,
    liner,
  );
  // sill flanges (inboard of the hull rim, under the doors), and lengthwise longerons on the wall and floor
  const sillZ = -vh + 0.06 + 0.15;
  for (const sg of [-1, 1]) {
    box(0.2, BAY_A1 - BAY_A0, 0.3, M.line, liner, sg * (BAY_X - 0.1), (BAY_A0 + BAY_A1) / 2, sillZ);
    for (const idx of [1, 5, 12, 16]) {
      const [x, v] = out[sg < 0 ? idx : out.length - 1 - idx];
      seam(
        liner,
        M.line,
        new THREE.Vector3(x, BAY_A0 + 0.2, -v),
        new THREE.Vector3(x, BAY_A1 - 0.2, -v),
        0.16,
        0.12,
      );
    }
  }
  // ribs: a thin frame every 1.6 m round the liner
  for (let a = BAY_A0 + 1.4; a < BAY_A1 - 0.8; a += 1.6) {
    const curve = new THREE.CatmullRomCurve3(out.map(([x, v]) => new THREE.Vector3(x, a, -v)));
    mesh(new THREE.TubeGeometry(curve, 40, 0.05, 6), M.line, liner);
  }
  // bulkheads: the cross-section closed under the door arch, 0.3 m thick
  for (const [a0, aft] of [
    [BAY_A0, true],
    [BAY_A1 - 0.3, false],
  ] as const) {
    const shape = new THREE.Shape();
    out.forEach(([x, v], i) => (i === 0 ? shape.moveTo(x, v) : shape.lineTo(x, v)));
    for (let k = 0; k <= 10; k++) {
      const x = BAY_X - (2 * BAY_X * k) / 10;
      shape.lineTo(x, hullV(a0 + 0.15, x));
    }
    const bh = mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }),
      M.white,
      liner,
    );
    bh.rotation.x = -Math.PI / 2;
    bh.position.y = a0;
    bh.name = aft ? 'bay-aft-bulkhead' : 'bay-forward-bulkhead';
    if (aft) {
      for (const [x, v, w, h] of [
        [-1.3, vh - 1.4, 0.9, 0.8],
        [0.2, vh - 2.0, 1.4, 0.7],
        [1.4, vh - 1.1, 0.7, 1.1],
        [-0.2, vh - 0.5, 1.0, 0.45],
      ] as const)
        box(w, 0.06, h, M.line, liner, x, a0 + 0.32, -v);
      box(0.3, 0.1, 0.3, M.gold, liner, -1.3, a0 + 0.36, -(vh - 1.4));
    }
  }
}

export interface RmsRig {
  /** The shoulder base on the port longeron, forward end of the bay. */
  base: THREE.Group;
  shoulderYaw: THREE.Group;
  shoulderPitch: THREE.Group;
  elbow: THREE.Group;
  wristPitch: THREE.Group;
  wristYaw: THREE.Group;
  wristRoll: THREE.Group;
  endEffector: THREE.Group;
  /** The grapple point, a child of the end effector. */
  tip: THREE.Object3D;
  /** The six joints in chain order, each a descendant of the one before. */
  joints: THREE.Group[];
  /** Shoulder to tip with the arm stowed, in model metres (15.2 for the sourced arm). */
  lengthM: number;
}

/**
 * The Shuttle Remote Manipulator System (Canadarm): 15.2 m long, 38 cm boom diameter, six joints,
 * per Wikipedia (Canadarm). Stowed it lies along the port (+x) sill at the forward end of the bay,
 * pointing aft (-y). The upper and lower boom lengths (6.4 / 7.0 m), the wrist and end-effector
 * proportions and the housings are SCHEMATIC. Joint axes (bay frame, every angle zero when stowed):
 * shoulderYaw about z (positive swings outboard, +x), the three pitch joints about x (positive raises
 * the downstream arm out of the bay, toward -z), wristYaw about z, wristRoll about the arm axis.
 */
function buildRms(g: THREE.Object3D, M: Mats, vh: number): RmsRig {
  const arm = new THREE.Group();
  arm.name = 'rms';
  g.add(arm);
  const AX = BAY_X - 0.3;
  const AZ = -vh + 0.75;
  const base = new THREE.Group();
  base.name = 'rms-base';
  base.position.set(AX, BAY_A1 - 0.7, AZ);
  arm.add(base);
  const R = 0.19;
  const cyl = (
    parent: THREE.Object3D,
    m: THREE.Material,
    r: number,
    len: number,
    axis: 'x' | 'y' | 'z',
    y = 0,
  ): THREE.Mesh => {
    const c = mesh(new THREE.CylinderGeometry(r, r, len, 16), m, parent);
    if (axis === 'x') c.rotation.z = Math.PI / 2;
    if (axis === 'z') c.rotation.x = Math.PI / 2;
    c.position.y = y;
    return c;
  };
  const joint = (parent: THREE.Object3D, name: string, y: number): THREE.Group => {
    const j = new THREE.Group();
    j.name = name;
    j.position.y = y;
    parent.add(j);
    return j;
  };
  const boom = (parent: THREE.Object3D, y0: number, y1: number): void => {
    cyl(parent, M.white, R, y1 - y0, 'y', -(y0 + y1) / 2);
  };
  box(0.6, 0.7, 0.5, M.line, base, 0, 0, 0.3); // pedestal on the sill
  const shoulderYaw = joint(base, 'rms-shoulder-yaw', 0);
  cyl(shoulderYaw, M.line, 0.3, 0.5, 'z');
  const shoulderPitch = joint(shoulderYaw, 'rms-shoulder-pitch', 0);
  cyl(shoulderPitch, M.white, 0.25, 0.62, 'x');
  boom(shoulderPitch, 0.25, 6.2);
  const elbow = joint(shoulderPitch, 'rms-elbow', -6.4);
  cyl(elbow, M.line, 0.25, 0.58, 'x');
  box(0.16, 0.2, 0.2, M.dark, elbow, 0, -0.1, -0.3); // elbow camera
  boom(elbow, 0.25, 6.75);
  const wristPitch = joint(elbow, 'rms-wrist-pitch', -7.0);
  cyl(wristPitch, M.line, 0.2, 0.46, 'x');
  const wristYaw = joint(wristPitch, 'rms-wrist-yaw', -0.4);
  cyl(wristYaw, M.white, 0.2, 0.4, 'z');
  const wristRoll = joint(wristYaw, 'rms-wrist-roll', -0.4);
  cyl(wristRoll, M.line, 0.19, 0.4, 'y', -0.2);
  const endEffector = joint(wristRoll, 'rms-end-effector', -0.4);
  cyl(endEffector, M.engine, 0.2, 0.5, 'y', -0.25);
  const snare = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 20), M.gold, endEffector);
  snare.rotation.x = Math.PI / 2;
  snare.position.y = -0.5;
  const tip = new THREE.Object3D();
  tip.name = 'rms-tip';
  tip.position.y = -0.6;
  endEffector.add(tip);
  // retention cradles along the sill that hold the stowed arm
  for (const a of [BAY_A1 - 1.2, 21.5, 17.5, 13.5, 10.2])
    box(0.5, 0.4, 0.3, M.line, arm, AX + 0.12, a, AZ + 0.3);
  return {
    base,
    shoulderYaw,
    shoulderPitch,
    elbow,
    wristPitch,
    wristYaw,
    wristRoll,
    endEffector,
    tip,
    joints: [shoulderYaw, shoulderPitch, elbow, wristPitch, wristYaw, wristRoll],
    lengthM: 6.4 + 7.0 + 0.4 + 0.4 + 0.4 + 0.6,
  };
}

// ── the orbiter ──────────────────────────────────────────────────────────────

const L0 = 37.237;
const SPAN0 = 23.79;

type Variant = 'shuttle' | 'columbia' | 'enterprise' | 'buran' | 'gli';

export interface OrbiterOpts {
  variant: Variant;
  length: number;
  span: number;
  /**
   * 'animated': the payload-bay doors are two rigid leaves hinged at the sills (userData.setBayDoors
   * (t), 0 closed to 1 open at 175 degrees), the hull is open under them and the bay interior is
   * built. Default (omitted): the closed, solid look every existing caller gets.
   */
  bayDoors?: 'animated';
  /** With bayDoors 'animated': add the RMS, stowed on the port sill (userData.rms). */
  rms?: boolean;
}

const TONES: Record<Variant, Tone> = {
  shuttle: { white: 0xfff4e2, black: 0x202024, blackSpread: 0.15 },
  columbia: { white: 0xfff4e2, black: 0x202024, blackSpread: 0.15 },
  // Enterprise carried foam and painted dummy tiles: charcoal, not the glossy black of flown tile
  enterprise: { white: 0xeae8df, black: 0x4a4b50, blackSpread: 0.05 },
  buran: { white: 0xfff2de, black: 0x1c1c20, blackSpread: 0.15 },
  // OK-GLI was a painted airframe: grey underside, no tiles
  gli: { white: 0xe8e6df, black: 0x56585e, blackSpread: 0.06 },
};

export function buildOrbiter(o: OrbiterOpts): THREE.Group {
  const M = mats();
  const tone = TONES[o.variant];
  const root = new THREE.Group();
  const g = new THREE.Group(); // authored at Shuttle scale
  root.add(g);
  const isBuran = o.variant === 'buran' || o.variant === 'gli';
  const isGli = o.variant === 'gli';
  const aft = isBuran ? 0.9 : 2.2; // aft bulkhead station
  const WHITE = col(tone.white);
  const BLACK = col(tone.black);
  const NOSE = col(isGli ? 0x3d3f45 : 0x16161a);

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
  // The line below which the fuselage is black tile: the belly aft, rising to the cockpit forward.
  const lowBlack = (a: number): number =>
    a < 27 ? -0.95 : a < 34 ? -0.95 + ((a - 27) / 7) * 1.35 : 0.4 + (a - 34) * 0.5;
  const isBlack = (a: number, v: number): boolean => a > 36.2 || v < lowBlack(a);
  const hullColor: ColorFn = (x, a, v) =>
    isBlack(a, v)
      ? jit(a > 36.2 ? NOSE : BLACK, x, a, v, tone.blackSpread)
      : jit(WHITE, x, a, v, 0.03, 9);
  // The openable bay: the hull is left open under the doors (between the sills, over the bay's
  // length) and the doors hinge on a straight line along each sill at the dorsal skin height.
  const animated = o.bayDoors === 'animated' && !isBuran;
  const HINGE_X = 2.17;
  const hingeV = surfV(stns, N, (BAY_A0 + BAY_A1) / 2, HINGE_X, true) + 0.04;
  let hull = loft(stns, {
    n: N,
    ring: 84,
    step: 0.3,
    color: hullColor,
    rough: (x, a, v) => (isBlack(a, v) || a < aft + 0.3 ? 0 : 0.018),
    capColor: new THREE.Color(0x6e675c),
  });
  if (animated)
    hull = cutHull(
      hull,
      84,
      (x, a, v) => v > 0 && Math.abs(x) < BAY_X && a > BAY_A0 + 0.1 && a < BAY_A1 - 0.1,
    );
  mesh(hull, M.vc, g).name = 'fuselage';

  // ── wings (the right one is authored; the left is its mirror) ──
  const half = o.span / 2 / (o.length / L0);
  const XT = half - 0.2;
  const sx = XT / 11.695;
  const W = (x: number): number => x * sx;
  const X0 = 2.0;
  const wingZb = 2.3;
  const xk = W(4.9);
  const xk2 = W(2.8);
  const wLE = (x: number): number =>
    x <= xk ? 30 + (21 - 30) * ((x - X0) / (xk - X0)) : 21 + (13.5 - 21) * ((x - xk) / (XT - xk));
  const wTE = (x: number): number =>
    x <= xk2 ? 4.2 : 4.2 + (8.5 - 4.2) * ((x - xk2) / (XT - xk2));
  const wT = (x: number): number => 1.55 + (0.42 - 1.55) * ((x - X0) / (XT - X0));
  const wP = (f: number): number => 0.88 - 0.7 * f;
  const wTop = (x: number, y: number): number => {
    const f = (wLE(x) - y) / (wLE(x) - wTE(x));
    return wingZb - wT(x) * wP(f);
  };
  const sideR = new THREE.Group();
  const chine = (x: number, y: number): boolean => o.variant === 'columbia' && y > 21.3 && x < 4.9;
  slab(
    {
      ns: 44,
      nf: 32,
      le: (u) => wLE(X0 + u * (XT - X0)),
      te: (u) => wTE(X0 + u * (XT - X0)),
      pos: (u, c, f, s) => {
        const x = X0 + u * (XT - X0);
        return new THREE.Vector3(
          x,
          c,
          s === 0 ? wingZb - wT(x) * wP(f) : wingZb - wT(x) * 0.06 * wP(f),
        );
      },
      color: (s, p) =>
        s === 1
          ? jit(BLACK, p.x, p.y, p.z, tone.blackSpread)
          : chine(p.x, p.y)
            ? jit(BLACK, p.x, p.y, p.z, tone.blackSpread)
            : jit(WHITE, p.x, p.y, p.z, 0.06, 11),
      edgeColor: (p) => jit(BLACK, p.x, p.y, p.z, tone.blackSpread),
    },
    M.vc,
    sideR,
  );
  // RCC leading edge: a tapering tube along both sweeps, with its panel joints
  {
    const pts = [
      new THREE.Vector3(X0, wLE(X0), 0),
      new THREE.Vector3(xk, wLE(xk), 0),
      new THREE.Vector3(XT, wLE(XT), 0),
    ];
    const rc = (x: number): number => wT(x) * 0.46;
    pts.forEach((p) => (p.z = wingZb - wT(p.x) * 0.44));
    const rccM = o.variant === 'enterprise' ? M.white : M.rcc;
    for (let i = 0; i < 2; i++) {
      taper(sideR, rccM, pts[i], pts[i + 1], rc(pts[i].x), rc(pts[i + 1].x), 14);
      const nj = i === 0 ? 3 : 7;
      for (let j = 1; j <= nj; j++) {
        const f = j / (nj + 1);
        const c = pts[i].clone().lerp(pts[i + 1], f);
        const r = rc(c.x) + 0.012;
        const dir = pts[i + 1].clone().sub(pts[i]).normalize();
        const jt = mesh(new THREE.CylinderGeometry(r, r, 0.05, 14), M.line, sideR);
        jt.position.copy(c);
        jt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
    }
    const tip = mesh(new THREE.SphereGeometry(rc(XT), 12, 10), rccM, sideR);
    tip.position.copy(pts[2]);
  }
  // elevon hinge lines and gaps on the upper surface, gear-door outlines on the underside
  const onWing = (x: number, y: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, wTop(x, y) - 0.012);
  const wseam = (p: [number, number], q: [number, number], w = 0.05): void =>
    seam(sideR, M.line, onWing(...p), onWing(...q), w, 0.03);
  wseam([W(3.0), 6.1], [XT - 0.2, 10.3]);
  wseam([W(7.4), 7.1], [W(7.4), 8.6]);
  wseam([W(5.0), 6.7], [W(5.0), 8.2]);
  wseam([xk + 0.2, wLE(xk) - 1.5], [XT - 0.4, wLE(XT) - 1.0], 0.04);
  {
    const zb = wingZb + 0.012;
    const gd = (x0: number, y0: number, x1: number, y1: number): void =>
      seam(sideR, M.line, new THREE.Vector3(x0, y0, zb), new THREE.Vector3(x1, y1, zb), 0.05, 0.03);
    gd(2.9, 15.2, 2.9, 19.4);
    gd(4.2, 15.2, 4.2, 19.4);
    gd(2.9, 15.2, 4.2, 15.2);
    gd(2.9, 19.4, 4.2, 19.4);
    gd(W(5.5), 8.0, W(10.5), 10.6);
  }
  g.add(sideR);
  const sideL = sideR.clone(true);
  sideL.scale.x = -1;
  g.add(sideL);

  // ── body flap, trailing the belly under the engines ──
  const flap = tileBox(6.2, aft, 0.34, BLACK, tone.blackSpread, g, M.vc, 0, aft / 2, 2.35);
  flap.name = 'body-flap';
  if (!isBuran) {
    for (const sg of [-1, 1])
      seam(
        g,
        M.line,
        new THREE.Vector3(sg * 3.15, 0, 2.2),
        new THREE.Vector3(sg * 3.15, aft, 2.2),
        0.06,
        0.04,
      );
    box(6.0, 0.05, 0.05, M.line, g, 0, aft + 0.03, 2.4);
  }

  // ── vertical stabiliser, dorsal ──
  const finV = 2.35;
  const FH = 9.0;
  const finT = (u: number): number => 0.5 - 0.38 * u;
  const finQ = (f: number): number => Math.min(1, Math.sqrt(f / 0.08)) * (1 - 0.55 * f);
  const finLE = (u: number): number => 16.0 - FH * u;
  const finTE = (u: number): number => 7.4 - 0.373 * FH * u;
  const fin = new THREE.Group();
  fin.name = 'fin';
  slab(
    {
      ns: 10,
      nf: 8,
      le: finLE,
      te: finTE,
      pos: (u, c, f, s) =>
        new THREE.Vector3((s === 0 ? -1 : 1) * finT(u) * finQ(f), c, -(finV + FH * u)),
      color: (_s, p) => jit(WHITE, p.x, p.y, p.z, 0.035, 13),
      edgeColor: (p) => jit(WHITE, p.x, p.y, p.z, 0.05, 14),
    },
    M.vc,
    fin,
  );
  g.add(fin);
  // the rudder / speed brake splits along the trailing edge, drawn on both faces
  for (const sgn of [-1, 1]) {
    const fa = 0.62;
    const pa = (u: number): THREE.Vector3 => {
      const c = finLE(u) + (finTE(u) - finLE(u)) * fa;
      return new THREE.Vector3(sgn * (finT(u) * finQ(fa) + 0.012), c, -(finV + FH * u));
    };
    seam(g, M.line, pa(0.08), pa(0.98), 0.03, 0.04);
  }
  // the fin's root fairing against the tail
  if (!isGli) {
    const fr = mesh(new THREE.SphereGeometry(1, 14, 10), M.white, g);
    fr.scale.set(0.55, 2.4, 0.45);
    fr.position.set(0, 7.0, -(finV + 0.1));
  }
  if (o.variant === 'columbia') {
    // SILTS pod on the fin tip, a nose pointing forward
    const silts = mesh(new THREE.SphereGeometry(1, 16, 12), M.white, g);
    silts.scale.set(0.45, 2.0, 0.55);
    silts.position.set(0, 5.4, -(finV + FH + 0.1));
  }

  // ── payload-bay doors, closed: four sections a side, blanket-white and crumpled ──
  const doorCol = (c: THREE.Vector3): THREE.Color => jit(col(tone.white), c.x, c.y, c.z, 0.04, 15);
  const doorCuts = [7.4, 12.0, 16.5, 21.2, 25.8];
  const hullPt = (a: number, x: number, off: number): THREE.Vector3 =>
    new THREE.Vector3(x, a, -(surfV(stns, N, a, x, true) + off));
  // Animated: each side is one rigid leaf (pivot on the hinge line, children in model coordinates
  // via `inner`); closed it is the same geometry as the default, only parented to the leaf.
  const leaves = new Map<number, THREE.Group>();
  const doorParent = (sgn: number): THREE.Object3D => {
    if (!animated) return g;
    const pivot = new THREE.Group();
    pivot.name = sgn > 0 ? 'bay-door-port' : 'bay-door-starboard';
    pivot.position.set(sgn * HINGE_X, 0, -hingeV);
    const inner = new THREE.Group();
    inner.position.set(-sgn * HINGE_X, 0, hingeV);
    pivot.add(inner);
    g.add(pivot);
    leaves.set(sgn, pivot);
    return inner;
  };
  for (const sgn of [-1, 1]) {
    const door = doorParent(sgn);
    for (let k = 0; k < doorCuts.length - 1; k++) {
      const a0 = doorCuts[k] + 0.06;
      const a1 = doorCuts[k + 1] - 0.06;
      const nr = 6;
      const nc = 6;
      const rows: THREE.Vector3[][] = [];
      for (let i = 0; i <= nr; i++) {
        const a = a0 + ((a1 - a0) * i) / nr;
        const row: THREE.Vector3[] = [];
        for (let j = 0; j <= nc; j++) {
          const x = sgn * (0.05 + (2.15 - 0.05) * (j / nc));
          const edge = i === 0 || i === nr || j === 0 || j === nc;
          const p = hullPt(a, x, 0.035);
          if (!edge) p.z += hash3(x, a, 1, 3) * 0.014;
          row.push(p);
        }
        rows.push(row);
      }
      mesh(gridGeo(rows, doorCol, false), M.vc, door).name = 'bay-door';
      if (animated) {
        // the radiator panel on the door's inner face (schematic: all four sections, tube
        // stripes across the panel; the real radiators cover the forward doors)
        const rad: THREE.Vector3[][] = [];
        const nrr = 14;
        for (let i = 0; i <= nrr; i++) {
          const a = a0 + 0.2 + ((a1 - a0 - 0.4) * i) / nrr;
          rad.push([0.25, 0.55, 1.0, 1.45, 1.75, 2.0].map((u) => hullPt(a, sgn * u, -0.02)));
        }
        mesh(
          gridGeo(
            rad,
            (c, i) => jit(col(i % 2 ? 0xc9ced2 : 0xe4e7e8), c.x, c.y, c.z, 0.03, 23),
            false,
          ),
          M.vc,
          door,
        ).name = 'bay-radiator';
      }
    }
    // hinge line and the latch tabs along the centre seam
    const hx = sgn * 2.17;
    for (let i = 0; i < 10; i++) {
      const a = 7.8 + i * 1.9;
      const p = hullPt(a, hx, 0.04);
      box(0.18, 0.5, 0.05, M.line, door, hx, a, p.z - 0.02);
    }
  }
  // dark gaps: the centre seam and the section joints
  if (animated) {
    // per side, so each leaf carries its own half
    for (const sgn of [-1, 1]) {
      const door = leaves.get(sgn)!.children[0];
      const strip = (a: number, hw: number, x0: number, x1: number, n: number): void => {
        const rows: THREE.Vector3[][] = [];
        for (let i = 0; i <= 1; i++) {
          const row: THREE.Vector3[] = [];
          for (let j = 0; j <= n; j++)
            row.push(hullPt(a - hw + i * 2 * hw, sgn * (x0 + ((x1 - x0) * j) / n), 0.02));
          rows.push(row);
        }
        mesh(
          gridGeo(rows, () => col(0x2a2a2e), false),
          M.vc,
          door,
        );
      };
      for (const a of doorCuts) strip(a, 0.07, 0, 2.15, 4);
      for (let i = 0; i < 12; i++) {
        const a = 7.4 + ((25.8 - 7.4) * i) / 12;
        const b = 7.4 + ((25.8 - 7.4) * (i + 1)) / 12;
        const rows: THREE.Vector3[][] = [
          [hullPt(a, 0, 0.02), hullPt(a, sgn * 0.06, 0.02)],
          [hullPt(b, 0, 0.02), hullPt(b, sgn * 0.06, 0.02)],
        ];
        mesh(
          gridGeo(rows, () => col(0x2a2a2e), false),
          M.vc,
          door,
        );
      }
    }
  }
  for (const a of animated ? [] : doorCuts) {
    const p = hullPt(a, 0, 0.022);
    const half2 = 2.15;
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i <= 1; i++) {
      const row: THREE.Vector3[] = [];
      for (let j = 0; j <= 8; j++) {
        const x = -half2 + (2 * half2 * j) / 8;
        row.push(hullPt(a - 0.07 + i * 0.14, x, 0.02));
      }
      rows.push(row);
    }
    void p;
    mesh(
      gridGeo(rows, () => col(0x2a2a2e), false),
      M.vc,
      g,
    );
  }
  if (!animated) {
    const rows: THREE.Vector3[][] = [];
    for (let i = 0; i <= 12; i++) {
      const a = 7.4 + ((25.8 - 7.4) * i) / 12;
      rows.push([hullPt(a, -0.06, 0.02), hullPt(a, 0.06, 0.02)]);
    }
    mesh(
      gridGeo(rows, () => col(0x2a2a2e), false),
      M.vc,
      g,
    );
  }

  if (animated) {
    buildBay(g, M, WHITE, hingeV, (a, x) => surfV(stns, N, a, x, true));
    const rig = o.rms ? buildRms(g, M, hingeV) : undefined;
    const OPEN = (175 * Math.PI) / 180;
    // t 0 closed .. 1 open (about 175 degrees, the leaf lying nearly flat outboard of the sill)
    const setBayDoors = (t: number): void => {
      const a = Math.min(1, Math.max(0, t)) * OPEN;
      for (const [sgn, leaf] of leaves) leaf.rotation.y = -sgn * a;
    };
    root.userData.setBayDoors = setBayDoors;
    root.userData.bayLeaves = { port: leaves.get(1), starboard: leaves.get(-1) };
    if (rig) root.userData.rms = rig;
    // Where a deployed stage's tilt table pivots: on the centreline at the aft end of the bay,
    // 1.05 m under the sill (a 2.9 m IUS then sits just inside the door line). The mount's +y
    // points forward along the bay and its -z out of the bay (dorsal). Placement SCHEMATIC.
    const mount = new THREE.Object3D();
    mount.name = 'bay-mount';
    mount.position.set(0, BAY_A0 + 0.6, -(hingeV - 1.05));
    g.add(mount);
    root.userData.bayMount = mount;
  }

  // ── flight-deck windows, frames and the side hatch ──
  const win = (x: number, a: number, w: number, h: number): void => {
    const v = surfV(stns, N, a, x, true);
    const vb = surfV(stns, N, a + 0.4, x, true);
    const va = surfV(stns, N, a - 0.4, x, true);
    const slope = (vb - va) / 0.8;
    const wg = new THREE.Group();
    wg.position.set(x, a, -(v + 0.02));
    wg.rotation.x = Math.atan(-slope);
    wg.rotation.y = Math.sign(x) * 0.18;
    box(w + 0.12, h + 0.12, 0.05, M.line, wg, 0, 0, 0);
    box(w, h, 0.07, M.glass, wg, 0, 0, 0.005);
    g.add(wg);
  };
  win(-0.62, 32.6, 0.62, 0.7);
  win(0.62, 32.6, 0.62, 0.7);
  win(-1.3, 31.7, 0.5, 0.75);
  win(1.3, 31.7, 0.5, 0.75);
  win(-0.55, 30.2, 0.45, 0.55);
  win(0.55, 30.2, 0.45, 0.55);
  win(-0.6, 27.6, 0.4, 0.45);
  win(0.6, 27.6, 0.4, 0.45);
  {
    // crew hatch on the port side (+x), a round door with its rim
    const a = 28.4;
    const v = -0.45;
    const hx = surfX(stns, N, a, v) + 0.02;
    const hatch = new THREE.Group();
    hatch.position.set(hx, a, -v);
    const tor = mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 24), M.line, hatch);
    tor.rotation.y = Math.PI / 2;
    const disc = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 24), M.white, hatch);
    disc.rotation.z = Math.PI / 2;
    const port = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16), M.glass, hatch);
    port.rotation.z = Math.PI / 2;
    port.position.set(0.02, 0.1, -0.12);
    g.add(hatch);
  }

  // ── forward RCS (nose, both flanks) and the nose gear door ──
  if (!isGli) {
    for (const sg of [-1, 1]) {
      const a0 = 34.7;
      const v0 = 0.4;
      const px = surfX(stns, N, a0, v0) + 0.01;
      box(0.06, 1.5, 1.0, M.dark, g, sg * px, a0 + 0.2, -(v0 + 0.1));
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 2; c++) {
          const th = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.16, 10), M.engine, g);
          th.rotation.z = (Math.PI / 2) * -sg;
          th.position.set(sg * (px + 0.05), a0 - 0.1 + c * 0.55, -(v0 - 0.25 + r * 0.32));
        }
    }
    for (let k = 0; k < 6; k++) {
      const th = (k / 6) * Math.PI * 2;
      const r = 0.38;
      const jet = mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.14, 8), M.engine, g);
      jet.position.set(Math.cos(th) * r, 36.7, -(Math.sin(th) * r * 0.9 + 0.05));
    }
  }
  {
    const aNg0 = 33.2;
    const aNg1 = 34.9;
    const lineAt = (p: THREE.Vector3, q: THREE.Vector3): void => seam(g, M.line, p, q, 0.05, 0.03);
    const bel = (a: number, x: number): THREE.Vector3 =>
      new THREE.Vector3(x, a, -(surfV(stns, N, a, x, false) - 0.02));
    lineAt(bel(aNg0, -0.45), bel(aNg1, -0.45));
    lineAt(bel(aNg0, 0.45), bel(aNg1, 0.45));
    lineAt(bel(aNg0, -0.45), bel(aNg0, 0.45));
    lineAt(bel(aNg1, -0.45), bel(aNg1, 0.45));
    // main gear doors on the belly
    for (const x of [-1.5, 1.5]) {
      lineAt(bel(16.9, x), bel(21.1, x));
      lineAt(bel(16.9, x - 0.5), bel(16.9, x + 0.5));
      lineAt(bel(21.1, x - 0.5), bel(21.1, x + 0.5));
      lineAt(bel(16.9, x - 0.5), bel(21.1, x - 0.5));
      lineAt(bel(16.9, x + 0.5), bel(21.1, x + 0.5));
    }
    // external-tank umbilical doors
    for (const x of [-1.2, 1.2]) {
      const p = bel(8, x);
      box(1.5, 1.8, 0.04, M.dark, g, x, 8, p.z - 0.01);
      box(0.2, 0.2, 0.08, M.engine, g, x, 8, p.z - 0.02);
    }
  }

  // ── aft: OMS pods, engines, RCS ──
  const eng = new THREE.Group();
  eng.name = 'aft-propulsion';
  g.add(eng);
  const rcsJet = (x: number, y: number, z: number, dir: THREE.Vector3): void => {
    const c = mesh(new THREE.CylinderGeometry(0.06, 0.11, 0.2, 8), M.engine, eng);
    c.position.set(x, y, z);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  };
  if (isGli) {
    // one AL-31F nacelle on each flank of the fin base (each housing a pair of jets)
    for (const x of [-2.2, 2.2]) {
      const v = surfV(stns, N, 3.5, x, true);
      const zc = -(v + 0.3);
      const nac = mesh(new THREE.CylinderGeometry(0.85, 0.78, 5.4, 20), M.engine, eng);
      nac.position.set(x, 3.3, zc);
      // intake lip, compressor face and spinner
      ring(eng, M.line, 0.85, 0.06, x, 6.0, zc);
      const face = mesh(new THREE.CircleGeometry(0.8, 20), M.dark, eng);
      face.rotation.x = -Math.PI / 2;
      face.position.set(x, 6.0, zc);
      const cone = mesh(new THREE.ConeGeometry(0.35, 0.7, 14), M.engine, eng);
      cone.position.set(x, 6.25, zc);
      // exhaust: petals in a tight ring
      const nz = mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.9, 20, 1, true), M.bell, eng);
      nz.position.set(x, 0.55, zc);
      ring(eng, M.line, 0.8, 0.05, x, 1.0, zc);
      // the structure joining the jet to the airframe
      const sp = mesh(new THREE.BoxGeometry(0.7, 3.4, 0.35), M.white, eng);
      sp.position.set(x, 3.4, zc + 0.5);
    }
    box(2.6, 0.5, 0.05, M.dark, eng, 0, aft + 0.25, 0.4);
  } else if (isBuran) {
    // no main engines on the orbiter: two OMS nozzles in the tail and the flush aft face
    for (const sg of [-1, 1]) {
      bellMesh(0.5, 0.15, 1.3, M.bell, eng, sg * 1.35, -0.9, 0.0, 0.6);
      ring(eng, M.line, 0.5, 0.035, sg * 1.35, 0.1, -0.9);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++)
          rcsJet(sg * (2.0 + c * 0.2), aft + 0.55 + r * 0.45, -2.55, new THREE.Vector3(0, 0, -1));
    }
    const sh = mesh(new THREE.PlaneGeometry(6, 1.6, 12, 4), M.shield, eng);
    sh.geometry = crinkle(sh.geometry, 0.03);
    sh.position.set(0, aft + 0.02, 0.4);
    sh.rotation.x = Math.PI / 2;
  } else {
    // three SSMEs, one above the pair; each with its heat shield, bell and stiffener rings
    for (const [x, v] of [
      [0, 1.1],
      [-1.5, -0.9],
      [1.5, -0.9],
    ] as const) {
      const z = -v;
      bellMesh(1.2, 0.34, 2.9, M.bell, eng, x, z, 0, 0.55);
      for (const [y, rr] of [
        [0.1, 1.2],
        [0.85, 0.93],
        [1.7, 0.74],
      ] as const)
        ring(eng, M.line, rr, 0.04, x, y, z);
      const skirt = new THREE.CylinderGeometry(1.0, 1.32, 0.9, 20, 3, true);
      const sk = mesh(crinkle(skirt, 0.04), M.shield, eng);
      sk.position.set(x, aft - 0.2, z);
      const neck = mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2, 16), M.engine, eng);
      neck.position.set(x, aft + 0.5, z);
    }
    // OMS pods on the upper aft corners: white blanket above, black tile below
    const podStn: Stn[] = [
      { a: aft, w: 0.9, t: 0.85, b: 0.8 },
      { a: aft + 1, w: 0.95, t: 0.9, b: 0.8 },
      { a: 7.5, w: 0.9, t: 0.85, b: 0.75 },
      { a: 9.5, w: 0.6, t: 0.5, b: 0.4 },
      { a: 10.2, w: 0.2, t: 0.15, b: 0.1 },
    ];
    for (const sg of [-1, 1]) {
      const pod = loft(podStn, {
        n: 2.2,
        ring: 28,
        step: 0.5,
        cx: sg * 1.75,
        cv: 2.55,
        color: (x, a, v) =>
          v < 2.3 ? jit(BLACK, x, a, v, tone.blackSpread) : jit(WHITE, x, a, v, 0.03, 16),
        rough: (_x, _a, v) => (v < 2.3 ? 0 : 0.016),
        capColor: new THREE.Color(0x6e675c),
      });
      mesh(pod, M.vc, g).name = 'oms-pod';
      bellMesh(0.45, 0.14, 1.2, M.bell, eng, sg * 1.75, -2.35, aft - 1.0, 0.6);
      ring(eng, M.line, 0.45, 0.03, sg * 1.75, aft - 0.9, -2.35);
      // the aft RCS: a dark panel on the pod flank with its jets, two more on the aft face
      box(0.05, 1.7, 1.0, M.dark, g, sg * 2.71, aft + 2.3, -2.75);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 2; c++)
          rcsJet(
            sg * 2.76,
            aft + 1.7 + c * 0.7,
            -(2.35 + r * 0.25 + 0.1),
            new THREE.Vector3(sg, 0, 0),
          );
      rcsJet(sg * 2.2, aft + 0.15, -3.2, new THREE.Vector3(0, -1, 0));
      rcsJet(sg * 1.5, aft + 0.15, -3.2, new THREE.Vector3(0, -1, 0));
    }
  }

  // ── deployed landing gear (the line-up lays the craft on its runway) ──
  const gear = new THREE.Group();
  gear.name = 'landing-gear';
  g.add(gear);
  const GROUND = 2.3 + 4.2;
  const leg = (x: number, a: number, z0: number, rUp: number, rLow: number): void => {
    const mid = z0 + (GROUND - z0) * 0.45;
    for (const [za, zb, r] of [
      [z0, mid, rUp],
      [mid, GROUND - 0.6, rLow],
    ] as const) {
      const c = mesh(new THREE.CylinderGeometry(r, r, zb - za, 12), M.engine, gear);
      c.rotation.x = Math.PI / 2;
      c.position.set(x, a, (za + zb) / 2);
    }
  };
  const wheel = (x: number, a: number, r: number, wd: number): void => {
    const w = mesh(new THREE.CylinderGeometry(r, r, wd, 18), M.tyre, gear);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, a, GROUND - r);
    const hub = mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, wd + 0.04, 12), M.engine, gear);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x, a, GROUND - r);
  };
  for (const sg of [-1, 1]) {
    leg(sg * 3.4, 17.8, 2.3, 0.22, 0.14);
    wheel(sg * 3.4 - 0.3, 17.8, 0.55, 0.4);
    wheel(sg * 3.4 + 0.3, 17.8, 0.55, 0.4);
  }
  leg(0, 34.0, surfV(stns, N, 34, 0, false) * -1, 0.16, 0.1);
  wheel(-0.25, 34.0, 0.45, 0.28);
  wheel(0.25, 34.0, 0.45, 0.28);

  g.scale.setScalar(o.length / L0);
  return root;
}

// ── X-37B ────────────────────────────────────────────────────────────────────

function buildX37b(): THREE.Group {
  const M = mats();
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const L = 8.92;
  const WHITE = col(0xf0eee6);
  const BLACK = col(0x18181c);
  const spread = 0.15;
  const stns: Stn[] = [
    { a: 0.35, w: 0.95, t: 0.4, b: 0.3 },
    { a: 1.0, w: 1.08, t: 0.45, b: 0.32 },
    { a: 5.0, w: 1.08, t: 0.45, b: 0.3 },
    { a: 6.6, w: 0.8, t: 0.36, b: 0.26 },
    { a: 7.9, w: 0.42, t: 0.24, b: 0.17 },
    { a: 8.65, w: 0.17, t: 0.11, b: 0.08 },
    { a: L, w: 0.03, t: 0.03, b: 0.03 },
  ];
  const N = 3.2;
  const hull = loft(stns, {
    n: N,
    ring: 40,
    step: 0.25,
    color: (x, a, v) =>
      a > 8.0 || v < -0.08 ? jit(BLACK, x, a, v, spread) : jit(WHITE, x, a, v, 0.03, 9),
    capColor: new THREE.Color(0x55524b),
  });
  mesh(hull, M.vc, g).name = 'fuselage';

  // wings: small, thin, black below, the right one authored and mirrored
  const XT = 2.275;
  const X0 = 0.7;
  const wLE = (x: number): number => 5.2 + (3.1 - 5.2) * ((x - X0) / (XT - X0));
  const wTE = (x: number): number =>
    x < 0.9 ? 0.35 : 0.35 + (1.05 - 0.35) * ((x - 0.9) / (XT - 0.9));
  const wT = (x: number): number => 0.34 + (0.1 - 0.34) * ((x - X0) / (XT - X0));
  const wZb = 0.3;
  const sideR = new THREE.Group();
  slab(
    {
      ns: 8,
      nf: 8,
      le: (u) => wLE(X0 + u * (XT - X0)),
      te: (u) => wTE(X0 + u * (XT - X0)),
      pos: (u, c, f, s) => {
        const x = X0 + u * (XT - X0);
        const p = 0.88 - 0.7 * f;
        return new THREE.Vector3(x, c, s === 0 ? wZb - wT(x) * p : wZb - wT(x) * 0.06 * p);
      },
      color: (s, p) =>
        s === 1 ? jit(BLACK, p.x, p.y, p.z, spread) : jit(WHITE, p.x, p.y, p.z, 0.06, 11),
      edgeColor: (p) => jit(BLACK, p.x, p.y, p.z, spread),
    },
    M.vc,
    sideR,
  );
  {
    const a = new THREE.Vector3(X0, wLE(X0), wZb - wT(X0) * 0.44);
    const b = new THREE.Vector3(XT, wLE(XT), wZb - wT(XT) * 0.44);
    taper(sideR, M.rcc, a, b, wT(X0) * 0.46, wT(XT) * 0.46, 10);
  }
  g.add(sideR);
  const sideL = sideR.clone(true);
  sideL.scale.x = -1;
  g.add(sideL);

  // canted V-tail, the roots on the dorsal side
  const phi = (28 * Math.PI) / 180;
  for (const sg of [-1, 1]) {
    const ey = new THREE.Vector3(sg * Math.sin(phi), 0, -Math.cos(phi));
    const nrm = new THREE.Vector3(sg * Math.cos(phi), 0, Math.sin(phi));
    const org = new THREE.Vector3(sg * 0.35, 0, -0.3);
    const H = 2.15;
    const tail = new THREE.Group();
    slab(
      {
        ns: 6,
        nf: 6,
        le: (u) => 2.55 - (u * H + 0.1) / 2.15,
        te: (u) => 0.55 + (0.2 * (u * H + 0.1)) / 2.15,
        pos: (u, c, f, s) => {
          const t = (0.1 - 0.06 * u) * Math.min(1, Math.sqrt(f / 0.1)) * (1 - 0.5 * f);
          return org
            .clone()
            .addScaledVector(ey, u * H - 0.1)
            .addScaledVector(nrm, (s === 0 ? -1 : 1) * t)
            .setY(c);
        },
        color: (_s, p) => jit(WHITE, p.x, p.y, p.z, 0.035, 13),
        edgeColor: (p) => jit(BLACK, p.x, p.y, p.z, spread),
      },
      M.vc,
      tail,
    );
    g.add(tail);
    seam(
      g,
      M.line,
      org.clone().addScaledVector(ey, 0.4).setY(1.05),
      org.clone().addScaledVector(ey, 1.9).setY(1.2),
      0.03,
      0.03,
    );
  }

  // payload-bay doors, closed: two leaves on the back, with the seam between them
  {
    const bayA0 = 1.7;
    const bayA1 = 3.8;
    for (const sg of [-1, 1]) {
      const rows: THREE.Vector3[][] = [];
      for (let i = 0; i <= 8; i++) {
        const a = bayA0 + ((bayA1 - bayA0) * i) / 8;
        const row: THREE.Vector3[] = [];
        for (let j = 0; j <= 3; j++) {
          const x = sg * (0.025 + (0.62 - 0.025) * (j / 3));
          row.push(new THREE.Vector3(x, a, -(surfV(stns, N, a, x, true) + 0.018)));
        }
        rows.push(row);
      }
      mesh(
        gridGeo(rows, (c) => jit(col(0xeae9e2), c.x, c.y, c.z, 0.03, 15), false),
        M.vc,
        g,
      );
    }
    for (const a of [bayA0, bayA1]) {
      const p = new THREE.Vector3(-0.63, a, -(surfV(stns, N, a, 0.0, true) + 0.03));
      seam(g, M.line, p, p.clone().setX(0.63), 0.04, 0.03);
    }
    seam(
      g,
      M.line,
      new THREE.Vector3(0, bayA0, -0.47),
      new THREE.Vector3(0, bayA1, -0.47),
      0.03,
      0.03,
    );
    for (const sg of [-1, 1])
      seam(
        g,
        M.line,
        new THREE.Vector3(sg * 0.63, bayA0, -0.42),
        new THREE.Vector3(sg * 0.63, bayA1, -0.42),
        0.03,
        0.03,
      );
  }

  // aft: the single engine nozzle on the tail face, the black tail plate under it
  bellMesh(0.3, 0.1, 0.5, M.bell, g, 0, 0, 0, 0.6);
  box(1.4, 0.35, 0.12, M.dark, g, 0, 0.17, 0.3);
  tileBox(1.5, 0.4, 0.14, BLACK, spread, g, M.vc, 0, 0.2, 0.31);
  // belly: gear-door outlines, the nose sensor window and the nose dark cap
  for (const sg of [-1, 1]) {
    seam(
      g,
      M.line,
      new THREE.Vector3(sg * 0.45, 1.9, 0.34),
      new THREE.Vector3(sg * 0.45, 3.0, 0.34),
      0.04,
      0.03,
    );
  }
  seam(
    g,
    M.line,
    new THREE.Vector3(-0.15, 6.1, 0.28),
    new THREE.Vector3(0.15, 6.1, 0.28),
    0.04,
    0.03,
  );
  box(0.24, 0.34, 0.04, M.glass, g, 0, 7.75, -0.2);

  // deployed gear: two mains, a nose leg
  const gear = new THREE.Group();
  gear.name = 'landing-gear';
  g.add(gear);
  const GR = 1.1;
  const leg = (x: number, a: number, z0: number, r: number, wr: number): void => {
    const c = mesh(new THREE.CylinderGeometry(r, r, GR - z0 - wr, 10), M.engine, gear);
    c.rotation.x = Math.PI / 2;
    c.position.set(x, a, z0 + (GR - z0 - wr) / 2);
    for (const dx of [-0.11, 0.11]) {
      const w = mesh(new THREE.CylinderGeometry(wr, wr, 0.1, 16), M.tyre, gear);
      w.rotation.z = Math.PI / 2;
      w.position.set(x + dx, a, GR - wr);
    }
  };
  for (const sg of [-1, 1]) leg(sg * 0.55, 2.3, 0.4, 0.045, 0.3);
  leg(0, 6.7, 0.35, 0.04, 0.25);
  return root;
}

// ── registry ─────────────────────────────────────────────────────────────────

const wiki = (page: string): string => `https://en.wikipedia.org/wiki/${encodeURI(page)}`;
const commons = (file: string): string =>
  `https://commons.wikimedia.org/wiki/File:${encodeURI(file)}`;

const R_ORBITER: ShowcaseRef[] = [
  {
    l: 'Space Shuttle orbiter — Wikipedia (length 37.237 m, wingspan 23.79 m, payload bay 18.3 × 4.6 m)',
    u: wiki('Space_Shuttle_orbiter'),
  },
  {
    l: 'Space Shuttle thermal protection system — Wikipedia (RCC leading edge, black HRSI tiles, white LRSI and blankets)',
    u: wiki('Space_Shuttle_thermal_protection_system'),
  },
  {
    l: 'Atlantis on display at the Kennedy Space Center Visitor Complex (photo: black nose and forward RCS, white blanket, windows, hatch)',
    u: commons(
      "Space_Shuttle_Atlantis_on_display_at_the_Kennedy_Space_Center's_Visitor_Complex.jpg",
    ),
  },
  {
    l: 'STS-135 Hurley looks at Atlantis tiles (photo: the black tile mosaic of the underside)',
    u: commons('STS-135_Hurley_looks_at_Atlantis_tiles.jpg'),
  },
];

const R_BURAN: ShowcaseRef[] = [
  {
    l: 'Buran (spacecraft) — Wikipedia (length 36.37 m, wingspan 23.92 m, payload bay 18.55 × 4.65 m)',
    u: wiki('Buran_(spacecraft)'),
  },
  {
    l: 'Buran-class orbiter — Wikipedia (main engines were on Energia)',
    u: wiki('Buran-class_orbiter'),
  },
  {
    l: 'VKK Buran (OK-GLI) at an air show (photo: the airframe, the four-jet tail, the black nose and chin)',
    u: commons('VKK_Buran_AN0077204.jpg'),
  },
];

/**
 * A Shuttle orbiter with an opening payload bay and the RMS, for deploy scenes. Closed (setBayDoors
 * (0)) it looks like the default model. root.userData: setBayDoors(t 0..1), bayLeaves {port,
 * starboard}, rms (RmsRig). The Shuttle variants only; Buran and OK-GLI have no openable bay.
 */
export function buildOrbiterOpenable(
  variant: Exclude<Variant, 'buran' | 'gli'> = 'shuttle',
): THREE.Group {
  return buildOrbiter({ variant, length: L0, span: SPAN0, bayDoors: 'animated', rms: true });
}

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
    { l: 'Space Shuttle Atlantis — Wikipedia', u: wiki('Space_Shuttle_Atlantis') },
  ]),
  challenger: orbiter('shuttle', [
    { l: 'Space Shuttle Challenger — Wikipedia', u: wiki('Space_Shuttle_Challenger') },
  ]),
  discovery: orbiter('shuttle', [
    { l: 'Space Shuttle Discovery — Wikipedia', u: wiki('Space_Shuttle_Discovery') },
  ]),
  endeavour: orbiter('shuttle', [
    { l: 'Space Shuttle Endeavour — Wikipedia', u: wiki('Space_Shuttle_Endeavour') },
  ]),
  columbia: orbiter('columbia', [
    {
      l: 'Space Shuttle Columbia — Wikipedia (only orbiter with black chines on the wing tops; SILTS pod on the fin)',
      u: wiki('Space_Shuttle_Columbia'),
    },
  ]),
  enterprise: orbiter('enterprise', [
    {
      l: 'Space Shuttle Enterprise — Wikipedia (simulated tiles of foam and paint, fibreglass leading edges)',
      u: wiki('Space_Shuttle_Enterprise'),
    },
  ]),
  buran: {
    build: () => buildOrbiter({ variant: 'buran', length: 36.37, span: 23.92 }),
    heightM: 36.37,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 4.65,
    refs: R_BURAN,
  },
  'buran-ok-gli': {
    build: () => buildOrbiter({ variant: 'gli', length: 36.37, span: 23.92 }),
    heightM: 36.37,
    pose: { kind: 'runway', top: '-z' },
    diameterM: 4.65,
    refs: [
      ...R_BURAN.slice(2),
      { l: 'OK-GLI — Wikipedia (four AL-31 turbofans at the rear)', u: wiki('OK-GLI') },
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
        u: wiki('Boeing_X-37'),
      },
      {
        l: 'X-37B at the Kennedy Space Center Shuttle Landing Facility, 2019 (photo: black tile underside and nose, closed bay doors, canted tail)',
        u: commons('X-37b_at_NASA_Kennedy_Space_Center_Shuttle_Landing_Facility_2019,_Oct._27.jpg'),
      },
    ],
  },
};
