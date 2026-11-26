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
import { MAIN_GROUND_Z, MAIN_H, MAIN_STN, NOSE_GROUND_Z, NOSE_STN } from './orbiter-stance';
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
  /** `vc` with a second colour per quad (`colorB`) and a per-vertex `toneSide`: each fragment
   *  takes colorB where the interpolated side is > 0, so a tile line crosses a quad as a smooth
   *  curve instead of stepping from quad to quad. */
  vcSplit: THREE.MeshStandardMaterial;
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

function splitTone(m: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec3 colorB;\nattribute float toneSide;\nvarying vec3 vColorB;\nvarying float vToneSide;',
      )
      .replace(
        '#include <color_vertex>',
        '#include <color_vertex>\nvColorB = colorB;\nvToneSide = toneSide;',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vColorB;\nvarying float vToneSide;',
      )
      .replace(
        '#include <color_fragment>',
        'diffuseColor.rgb *= vToneSide > 0.0 ? vColorB : vColor.rgb;',
      );
  };
  m.customProgramCacheKey = () => 'winged-split-tone';
  return m;
}

function mats(): Mats {
  return {
    vc: std(0xffffff, 0.82, 0.04, { vertexColors: true, side: THREE.DoubleSide }),
    vcSplit: splitTone(std(0xffffff, 0.82, 0.04, { vertexColors: true, side: THREE.DoubleSide })),
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
  c?: number; // vehicle-up offset of the section's centre (a drooped nose has c < 0)
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
        c: (p.c ?? 0) + ((q.c ?? 0) - (p.c ?? 0)) * f,
      };
    }
  }
  return stns[stns.length - 1];
}

/** A superellipse exponent, or one for the dorsal half and one for the ventral half. */
type Exp = number | { t: number; b: number };
const expOf = (n: Exp, dorsal: boolean): number => (typeof n === 'number' ? n : dorsal ? n.t : n.b);

/** Vehicle-up coordinate v of the surface at station a, lateral x (dorsal or ventral). */
function surfV(stns: Stn[], n: Exp, a: number, x: number, dorsal: boolean): number {
  const p = prof(stns, a);
  const e = expOf(n, dorsal);
  const r = Math.min(Math.abs(x) / p.w, 0.999);
  const k = Math.pow(1 - Math.pow(r, e), 1 / e);
  return (p.c ?? 0) + (dorsal ? p.t * k : -p.b * k);
}

/** Lateral half width of the surface at station a and vehicle-up height v. */
function surfX(stns: Stn[], n: Exp, a: number, v: number): number {
  const p = prof(stns, a);
  const dv = v - (p.c ?? 0);
  const h = dv >= 0 ? p.t : p.b;
  const e = expOf(n, dv >= 0);
  const r = Math.min(Math.abs(dv) / h, 0.999);
  return p.w * Math.pow(1 - Math.pow(r, e), 1 / e);
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
    n: Exp;
    ring?: number;
    step?: number;
    cx?: number;
    cv?: number;
    color: ColorFn;
    rough?: (x: number, a: number, v: number) => number;
    capColor?: THREE.Color;
    /** A second tone: `side` > 0 picks `colorB` per fragment (material `vcSplit`). */
    split?: { side: (x: number, a: number, v: number) => number; colorB: ColorFn };
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
  const S = stns.length;
  const pos: number[] = [];
  const amps: number[] = [];
  for (let si = 0; si < S; si++) {
    const s = stns[si];
    for (let j = 0; j < ring; j++) {
      const th = (j / ring) * Math.PI * 2;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      const ex = 2 / expOf(o.n, sn >= 0);
      const px = s.w * Math.sign(c) * Math.pow(Math.abs(c), ex);
      const pv = sn >= 0 ? s.t * Math.pow(sn, ex) : -s.b * Math.pow(-sn, ex);
      let X = cx + px;
      let V = cv + (s.c ?? 0) + pv;
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
  const colorsB: number[] = [];
  const sides: number[] = [];
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
    if (o.split) {
      const cb = o.split.colorB(x, a, v);
      for (let k = 0; k < 6; k++) {
        colorsB.push(cb.r, cb.g, cb.b);
        sides.push(o.split.side(bp.getX(i + k), bp.getY(i + k), -bp.getZ(i + k)));
      }
    }
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
      capPos.push(...q1, ...q2, cx, s.a, -(cv + (s.c ?? 0)));
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
  if (o.split) {
    out.setAttribute('colorB', new THREE.Float32BufferAttribute([...colorsB, ...capCols], 3));
    const capSides = new Array(capPos.length / 3).fill(-1);
    out.setAttribute('toneSide', new THREE.Float32BufferAttribute([...sides, ...capSides], 1));
  }
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
// The Shuttle orbiter is authored from the HAER measured drawings of Discovery (Library of Congress
// HAER TX-116-A, sheets 5-7; readings in docs/wip/2026-11-27-orbiter-haer-measurements.md). Station
// a = NOSE_A - x, x metres aft of the nose tip; a = 0 is the fin tip's trailing corner, the
// orbiter's aft-most point, 37.07 m behind the nose on the drawing. The vehicle-up v is 4.85 m
// below the drawing's height above the main wheels' ground.
const L0 = 37.07;
const NOSE_A = L0;
const SPAN0 = 23.79;
const stn = (x: number): number => NOSE_A - x;
/** Piecewise-linear lookup in (key, value) pairs sorted by key, clamped at the ends. */
const pl = (pts: [number, number][], k: number): number => {
  if (k <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++)
    if (k <= pts[i][0]) {
      const [k0, v0] = pts[i - 1];
      const [k1, v1] = pts[i];
      return v0 + ((v1 - v0) * (k - k0)) / (k1 - k0);
    }
  return pts[pts.length - 1][1];
};

// the door line runs x 8.6-28.3; the bay itself x 9.6-28.0
const BAY_A0 = stn(28.0);
const BAY_A1 = stn(9.6);
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
  for (const name of ['position', 'normal', 'color', 'colorB', 'toneSide']) {
    const src = g.getAttribute(name);
    if (!src) continue;
    const n = src.itemSize;
    const arr = new Float32Array(keep.length * n);
    keep.forEach((s, d) => {
      for (let k = 0; k < n; k++) arr[d * n + k] = src.getComponent(s, k);
    });
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
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
  for (const a of [BAY_A1 - 1.2, BAY_A0 + 14.1, BAY_A0 + 10.1, BAY_A0 + 6.1, BAY_A0 + 2.8])
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
  /**
   * 'animated': userData.setGear(t), 0 stowed to 1 down. Each leg swings forward into its well
   * about its top (the nose and main gear both retract forward and up), the drag braces fold, and
   * the doors (group 'gear-doors') open in the first third and close over the stowed legs, which are
   * hidden. Default (omitted): the gear stays down, doors open.
   */
  gear?: 'animated';
  /**
   * Columbia's SILTS pod on the fin tip (default: on for Columbia). It came with the
   * 1986 refit (STS-61-C), so Columbia's earlier flights go without it (orbiterLook in
   * orbiter-stance.ts).
   */
  silts?: boolean;
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
  // the aft bulkhead (Buran's tail is shorter) and the body flap's trailing edge
  const flapEnd = stn(35.4);
  const aft = isBuran ? flapEnd + 0.9 : stn(33.0);
  const WHITE = col(tone.white);
  const BLACK = col(tone.black);
  const NOSE = col(isGli ? 0x3d3f45 : 0x3a3b3f); // the RCC nose cap, dark grey

  // The fuselage from the side and top elevations: [x, top y, belly y, half-width]. The section's
  // centre stays on v = 0 except toward the nose tip, which sits low (y 4.5).
  const SECTIONS: [number, number, number, number][] = [
    [0, 4.5, 4.45, 0.05],
    [0.08, 4.78, 4.18, 0.3],
    [0.25, 5.0, 3.97, 0.48],
    [0.5, 5.23, 3.79, 0.73],
    [0.75, 5.38, 3.67, 0.89],
    [1.0, 5.53, 3.6, 1.03],
    [1.5, 5.78, 3.49, 1.24],
    [2.0, 6.02, 3.36, 1.44],
    [2.5, 6.25, 3.26, 1.59],
    [3.0, 6.46, 3.17, 1.75],
    [3.5, 6.68, 3.12, 1.88],
    [4.0, 6.87, 3.07, 2.01],
    [4.5, 7.07, 3.03, 2.11],
    [5.0, 7.29, 3.0, 2.22],
    [5.25, 7.54, 2.99, 2.28],
    [5.5, 7.79, 2.97, 2.33],
    [5.75, 8.03, 2.96, 2.38],
    [6.0, 8.26, 2.95, 2.43],
    [6.25, 8.41, 2.94, 2.48],
    [6.5, 8.52, 2.93, 2.52],
    [6.75, 8.58, 2.93, 2.57],
    [7.0, 8.61, 2.92, 2.62],
    [7.5, 8.6, 2.91, 2.68],
    [8.0, 8.6, 2.9, 2.7],
    [10, 8.6, 2.86, 2.7],
    [15, 8.6, 2.73, 2.7],
    [20, 8.6, 2.62, 2.7],
    [25, 8.6, 2.52, 2.72],
    // aft of the bay the crown rises between the OMS pods (aft elevation: y 9.3 at h 1)
    [28, 8.75, 2.5, 2.8],
    [29, 9.2, 2.55, 2.9],
    [30.5, 9.3, 2.7, 3.05],
    [33.0, 9.2, 3.3, 3.2],
  ];
  const Y0 = 4.85;
  const stns: Stn[] = SECTIONS.map(([x, yt, yb, w]) => {
    const c = x < 2 ? -0.35 + (0.35 * x) / 2 : 0;
    return { a: stn(x), w, t: yt - Y0 - c, b: c - (yb - Y0), c };
  }).reverse();
  if (aft < stns[0].a) stns.unshift({ ...stns[0], a: aft });
  // a round crown (the bay doors' arc) over vertical sides and a flat belly
  const N: Exp = { t: 2.8, b: 3.2 };
  // The tile line (black below), from the side elevation: the whole nose to x 1.0, then up to the
  // forward RCS (y 5.9-6.6), y 5.6 under the windows with the patch round the crew hatch, and
  // y 4.05 falling to 3.9 aft of x 7.6.
  const lowBlack = (a: number): number => {
    const x = NOSE_A - a;
    const y =
      x < 1.0
        ? 99
        : x < 3.4
          ? 5.9 + ((x - 1.0) / 2.4) * 0.7
          : x < 6.2
            ? 5.6
            : x < 7.7
              ? 6.0
              : 4.05 - Math.min(1, (x - 7.7) / 19.3) * 0.15;
    return y - Y0;
  };
  const NOSE_CAP = stn(0.5);
  const isBlack = (a: number, v: number): boolean => v < lowBlack(a);
  // > 0 on the black side
  const blackSide = (_x: number, a: number, v: number): number => Math.min(9, lowBlack(a) - v);
  const hullWhite: ColorFn = (x, a, v) => jit(WHITE, x, a, v, 0.015, 9);
  const hullBlack: ColorFn = (x, a, v) =>
    jit(a > NOSE_CAP ? NOSE : BLACK, x, a, v, tone.blackSpread);
  // The openable bay: the hull is left open under the doors (between the sills, over the bay's
  // length) and the doors hinge on a straight line along each sill at the dorsal skin height.
  const animated = o.bayDoors === 'animated' && !isBuran;
  const HINGE_X = 2.17;
  const hingeV = surfV(stns, N, (BAY_A0 + BAY_A1) / 2, HINGE_X, true) + 0.04;
  let hull = loft(stns, {
    n: N,
    ring: 84,
    step: 0.3,
    color: hullWhite,
    split: { side: blackSide, colorB: hullBlack },
    rough: (x, a, v) => (isBlack(a, v) || a < aft + 0.3 ? 0 : 0.018),
    capColor: new THREE.Color(0x6e675c),
  });
  if (animated)
    hull = cutHull(
      hull,
      84,
      (x, a, v) => v > 0 && Math.abs(x) < BAY_X && a > BAY_A0 + 0.1 && a < BAY_A1 - 0.1,
    );
  mesh(hull, M.vcSplit, g).name = 'fuselage';

  // ── wings (the right one is authored; the left is its mirror) ──
  const half = o.span / 2 / (o.length / L0);
  const XT = half - 0.15;
  const X0 = 2.0;
  // the underside rises outboard of the root: 5 deg, as the forward elevation's silhouette rises
  // (0.62 m over the outer 6.5 m); NASA gives 3.5 deg for the wing's reference plane
  const DIH = Math.tan((5 * Math.PI) / 180);
  const bellyZ = (a: number): number => {
    const q = prof(stns, a);
    return q.b - (q.c ?? 0);
  };
  // (aft of x 28.5 the belly rises to the aft face; the elevons stay level)
  const wZ = (h: number, a: number): number =>
    bellyZ(Math.max(a, stn(28.5))) - Math.max(0, h - X0) * DIH;
  // the planform from the top plan, [half-span h, x]: the glove, its kink, the 45-ish deg main
  // leading edge and the elevons' trailing edge
  const LE_PTS: [number, number][] = [
    [X0, 6.0],
    [2.7, 7.5],
    [3.13, 10],
    [3.62, 13],
    [3.94, 15],
    [4.28, 17],
    [4.44, 18],
    [4.7, 19],
    [5.15, 20],
    [5.82, 21],
    [6.76, 22],
    [10.77, 26],
    [11.42, 27],
    [11.7, 28],
    [XT, 28.4],
  ];
  const TE_PTS: [number, number][] = [
    [X0, 32.4],
    [3.9, 32.09],
    [XT, 30.69],
  ];
  const xk = 5.15;
  const wLE = (h: number): number => stn(pl(LE_PTS, h));
  const wTE = (h: number): number => stn(pl(TE_PTS, h));
  // thickness scale: the forward elevation's wing stands 1.65 m deep at h 4 and 0.54 m at h 11.5
  const wT = (h: number): number => Math.max(0.45, 1.94 - (h - X0) * 0.148);
  // the glove is a thin strake ahead of the wing box
  const gl = (a: number): number => 0.25 + 0.75 * Math.min(1, Math.max(0, (NOSE_A - a - 6.2) / 10));
  // thickness over the chord: the NACA 4-digit distribution, thickest (1.0) at 30 % with a
  // rounded nose; the underside stays nearly flat
  const wP = (f: number): number =>
    10 * (0.2969 * Math.sqrt(f) - 0.126 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1015 * f ** 4);
  const wTop = (h: number, a: number): number => {
    const f = (wLE(h) - a) / (wLE(h) - wTE(h));
    return wZ(h, a) - wT(h) * wP(f) * gl(a);
  };
  const sideR = new THREE.Group();
  const chine = (x: number, y: number): boolean =>
    o.variant === 'columbia' && y > stn(16.5) && x < 4.6;
  slab(
    {
      ns: 44,
      nf: 32,
      le: (u) => wLE(X0 + u * (XT - X0)),
      te: (u) => wTE(X0 + u * (XT - X0)),
      pos: (u, c, f, s) => {
        const x = X0 + u * (XT - X0);
        const th = wT(x) * wP(f) * gl(c);
        return new THREE.Vector3(x, c, s === 0 ? wZ(x, c) - th : wZ(x, c) - th * 0.06);
      },
      color: (s, p) =>
        s === 1
          ? jit(BLACK, p.x, p.y, p.z, tone.blackSpread)
          : chine(p.x, p.y)
            ? jit(BLACK, p.x, p.y, p.z, tone.blackSpread)
            : jit(WHITE, p.x, p.y, p.z, 0.025, 11),
      edgeColor: (p) => jit(BLACK, p.x, p.y, p.z, tone.blackSpread),
    },
    M.vc,
    sideR,
  );
  // RCC leading edge: a tapering tube along both sweeps, with its panel joints
  {
    // the edge follows every point of the planform; the tube is tangent to it (its centre a radius
    // behind the edge) and slims along the glove
    const rc = (x: number, a: number): number => wT(x) * 0.16 * gl(a);
    const pts = [X0 + 0.15, ...LE_PTS.map(([h]) => h).filter((h) => h > X0 + 0.15)].map((h) => {
      const a = wLE(h);
      const r = rc(h, a);
      // the outward normal in plan: (-da/dh, 1), normalised
      const dadh = (wLE(h + 0.05) - wLE(h - 0.05)) / 0.1;
      const nl = Math.hypot(dadh, 1);
      return new THREE.Vector3(h + (dadh / nl) * r, a - r / nl, wZ(h, a) - r * 1.1);
    });
    const rccM = o.variant === 'enterprise' ? M.white : M.rcc;
    for (let i = 0; i < pts.length - 1; i++) {
      taper(
        sideR,
        rccM,
        pts[i],
        pts[i + 1],
        rc(pts[i].x, pts[i].y),
        rc(pts[i + 1].x, pts[i + 1].y),
        14,
      );
      const nj = Math.floor(pts[i].distanceTo(pts[i + 1]) / 1.1);
      for (let j = 1; j <= nj; j++) {
        const f = j / (nj + 1);
        const c = pts[i].clone().lerp(pts[i + 1], f);
        const r = rc(c.x, c.y) + 0.012;
        const dir = pts[i + 1].clone().sub(pts[i]).normalize();
        const jt = mesh(new THREE.CylinderGeometry(r, r, 0.05, 14), M.line, sideR);
        jt.position.copy(c);
        jt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
    }
    const last = pts[pts.length - 1];
    const tip = mesh(new THREE.SphereGeometry(rc(XT, last.y), 12, 10), rccM, sideR);
    tip.position.copy(last);
  }
  // elevon hinge lines and gaps on the upper surface, gear-door outlines on the underside
  const onWing = (x: number, y: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, wTop(x, y) - 0.012);
  const hinge = (h: number): number =>
    stn(
      pl(
        [
          [3.9, 30.6],
          [11.4, 28.95],
        ],
        h,
      ),
    );
  const wseam = (p: [number, number], q: [number, number], w = 0.05): void =>
    seam(sideR, M.line, onWing(...p), onWing(...q), w, 0.03);
  // the elevon hinge line, the split between the two elevons, the RCC panel line behind the edge
  wseam([3.9, hinge(3.9)], [11.4, hinge(11.4)]);
  wseam([7.8, hinge(7.8)], [7.8, wTE(7.8) - 0.05]);
  wseam([xk + 0.25, wLE(xk + 0.25) - 1.0], [XT - 0.4, wLE(XT - 0.4) - 0.6], 0.04);
  {
    const gd = (x0: number, y0: number, x1: number, y1: number): void =>
      seam(
        sideR,
        M.line,
        new THREE.Vector3(x0, y0, wZ(x0, y0) + 0.012),
        new THREE.Vector3(x1, y1, wZ(x1, y1) + 0.012),
        0.05,
        0.03,
      );
    gd(3.9, hinge(3.9), 11.4, hinge(11.4));
  }
  g.add(sideR);
  const sideL = sideR.clone(true);
  sideL.scale.x = -1;
  g.add(sideL);

  // ── body flap, trailing the belly under the engines ──
  // hinged under the aft face (y 3.25) and trailed down, its edge near y 2.3 (side and aft elevations)
  const flapHinge = new THREE.Group();
  flapHinge.position.set(0, aft, 4.85 - 3.25);
  flapHinge.rotation.x = (-16 * Math.PI) / 180;
  g.add(flapHinge);
  const FL = aft - flapEnd;
  const flap = tileBox(6.2, FL, 0.34, BLACK, tone.blackSpread, flapHinge, M.vc, 0, -FL / 2, 0.17);
  flap.name = 'body-flap';
  if (!isBuran) {
    for (const sg of [-1, 1])
      seam(
        flapHinge,
        M.line,
        new THREE.Vector3(sg * 3.15, -FL, 0.0),
        new THREE.Vector3(sg * 3.15, 0, 0.0),
        0.06,
        0.04,
      );
    box(6.0, 0.05, 0.05, M.line, flapHinge, 0, 0.03, 0.1);
  }

  // ── vertical stabiliser, dorsal ──
  // From the side elevation: the root on the hull's crown (y 8.6) with the leading edge's fillet,
  // the leading edge at 45 deg, the tip chord at y 16.55, the trailing edge swept back to the tip.
  const finV = 8.6 - Y0;
  const FH = 16.55 - 8.6;
  const FIN_LE: [number, number][] = [
    [8.6, 26.6],
    [9.0, 27.3],
    [9.5, 27.55],
    [10.0, 27.9],
    [16.46, 34.45],
    [16.55, 34.7],
  ];
  const FIN_TE: [number, number][] = [
    [8.6, 33.3],
    [9.0, 33.6],
    [10.44, 34.3],
    [16.08, 37.0],
    [16.35, 37.07],
    [16.55, 37.02],
  ];
  const finY = (u: number): number => 8.6 + FH * u;
  const finT = (u: number): number => (u < 0.06 ? 0.55 - (u / 0.06) * 0.19 : 0.36 - 0.22 * u);
  const finQ = (f: number): number => Math.min(1, Math.sqrt(f / 0.08)) * (1 - 0.55 * f);
  const finLE = (u: number): number => stn(pl(FIN_LE, finY(u)));
  const finTE = (u: number): number => stn(pl(FIN_TE, finY(u)));
  const fin = new THREE.Group();
  fin.name = 'fin';
  slab(
    {
      ns: 24,
      nf: 10,
      le: finLE,
      te: finTE,
      pos: (u, c, f, s) =>
        new THREE.Vector3((s === 0 ? -1 : 1) * finT(u) * finQ(f), c, -(finV + FH * u)),
      color: (_s, p) => jit(WHITE, p.x, p.y, p.z, 0.02, 13),
      edgeColor: (p) => jit(WHITE, p.x, p.y, p.z, 0.03, 14),
    },
    M.vc,
    fin,
  );
  g.add(fin);
  // the rudder / speed brake splits along the trailing edge, drawn on both faces
  for (const sgn of [-1, 1]) {
    const fa = 0.58;
    const pa = (u: number): THREE.Vector3 => {
      const c = finLE(u) + (finTE(u) - finLE(u)) * fa;
      return new THREE.Vector3(sgn * (finT(u) * finQ(fa) + 0.012), c, -(finV + FH * u));
    };
    seam(g, M.line, pa(0.08), pa(0.98), 0.03, 0.04);
  }
  // the fin's root fairing against the tail
  if (!isGli) {
    const fr = mesh(new THREE.SphereGeometry(1, 14, 10), M.white, g);
    fr.scale.set(0.9, 3.0, 0.75);
    fr.position.set(0, stn(30.0), -(finV + 0.05));
  }
  if (o.variant === 'columbia' && o.silts !== false) {
    // SILTS pod on the fin tip, a nose pointing forward
    const silts = mesh(new THREE.SphereGeometry(1, 16, 12), M.white, g);
    silts.scale.set(0.45, 1.8, 0.55);
    silts.position.set(0, stn(34.9), -(finV + FH + 0.1));
  }

  // ── payload-bay doors, closed: four sections a side, blanket-white and crumpled ──
  const doorCol = (c: THREE.Vector3): THREE.Color => jit(col(tone.white), c.x, c.y, c.z, 0.04, 15);
  const doorCuts = [28.0, 23.4, 18.9, 14.2, 9.6].map(stn);
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
      const a = BAY_A0 + 0.4 + i * 1.9;
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
        const a = BAY_A0 + ((BAY_A1 - BAY_A0) * i) / 12;
        const b = BAY_A0 + ((BAY_A1 - BAY_A0) * (i + 1)) / 12;
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
      const a = BAY_A0 + ((BAY_A1 - BAY_A0) * i) / 12;
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
  // the six windshield panes (x 5.1-6.4), then the two overhead windows over the flight deck
  for (const sg of [-1, 1]) {
    win(sg * 0.5, stn(5.6), 0.7, 0.75);
    win(sg * 1.25, stn(5.75), 0.6, 0.75);
    win(sg * 1.85, stn(6.2), 0.45, 0.6);
    win(sg * 0.35, stn(7.6), 0.42, 0.42);
  }
  {
    // crew hatch on the port side (+x), a round door with its rim
    const a = stn(7.0);
    const v = 5.2 - Y0;
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
      // the forward RCS module on each flank of the nose (x 2.0-3.4, y 5.6-6.6)
      const a0 = stn(2.8);
      const v0 = 5.9 - Y0;
      const px = surfX(stns, N, a0, v0) - 0.02;
      box(0.06, 1.2, 0.6, M.dark, g, sg * px, a0, -v0);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 2; c++) {
          const th = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 10), M.engine, g);
          th.rotation.z = (Math.PI / 2) * -sg;
          th.position.set(sg * (px + 0.03), a0 - 0.28 + c * 0.55, -(v0 - 0.18 + r * 0.18));
        }
    }
    // three jets across the top of the nose (the forward elevation: y 5.85, x about 1.0)
    for (const hx of [-0.38, 0, 0.38]) {
      const a = stn(1.0);
      const jet = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 8), M.engine, g);
      jet.position.set(hx, a, -(surfV(stns, N, a, hx, true) - 0.06));
    }
  }
  {
    const aNg0 = stn(3.9);
    const lineAt = (p: THREE.Vector3, q: THREE.Vector3): void => seam(g, M.line, p, q, 0.05, 0.03);
    const bel = (a: number, x: number): THREE.Vector3 =>
      new THREE.Vector3(x, a, -(surfV(stns, N, a, x, false) - 0.02));
    // the forward orbiter/ET attach fitting, just aft of the nose-gear well (Xo 378)
    box(0.7, 0.5, 0.05, M.dark, g, 0, aNg0 - 0.6, bel(aNg0 - 0.6, 0).z - 0.01);
    lineAt(bel(aNg0 - 0.95, -0.35), bel(aNg0 - 0.25, -0.35));
    lineAt(bel(aNg0 - 0.95, 0.35), bel(aNg0 - 0.25, 0.35));
    // external-tank umbilical doors
    for (const x of [-1.3, 1.3]) {
      const a = stn(29.7);
      const p = bel(a, x);
      box(1.5, 1.8, 0.04, M.dark, g, x, a, p.z - 0.01);
      box(0.2, 0.2, 0.08, M.engine, g, x, a, p.z - 0.02);
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
  // Buran's and OK-GLI's tails are placed from the body flap's trailing edge
  if (isBuran) eng.position.y = flapEnd;
  if (isGli) {
    // one AL-31F nacelle on each flank of the fin base (each housing a pair of jets)
    for (const x of [-2.2, 2.2]) {
      const v = surfV(stns, N, flapEnd + 3.5, x, true);
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
    box(2.6, 0.5, 0.05, M.dark, eng, 0, aft - flapEnd + 0.25, 0.4);
  } else if (isBuran) {
    // no main engines on the orbiter: two OMS nozzles in the tail and the flush aft face
    for (const sg of [-1, 1]) {
      bellMesh(0.5, 0.15, 1.3, M.bell, eng, sg * 1.35, -0.9, 0.0, 0.6);
      ring(eng, M.line, 0.5, 0.035, sg * 1.35, 0.1, -0.9);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++)
          rcsJet(
            sg * (2.0 + c * 0.2),
            aft - flapEnd + 0.55 + r * 0.45,
            -2.55,
            new THREE.Vector3(0, 0, -1),
          );
    }
    const sh = mesh(new THREE.PlaneGeometry(6, 1.6, 12, 4), M.shield, eng);
    sh.geometry = crinkle(sh.geometry, 0.03);
    sh.position.set(0, aft - flapEnd + 0.02, 0.4);
    sh.rotation.x = Math.PI / 2;
  } else {
    // three SSMEs, one above the pair; each with its heat shield, bell and stiffener rings
    for (const [x, v, y0] of [
      [0, 8.18 - Y0, stn(34.85)],
      [-1.52, 5.03 - Y0, stn(35.4)],
      [1.52, 5.03 - Y0, stn(35.4)],
    ] as const) {
      const z = -v;
      bellMesh(1.19, 0.34, 2.9, M.bell, eng, x, z, y0, 0.55);
      for (const [y, rr] of [
        [0.1, 1.19],
        [0.85, 0.93],
        [1.7, 0.74],
      ] as const)
        ring(eng, M.line, rr, 0.04, x, y0 + y, z);
      const skirt = new THREE.CylinderGeometry(1.0, 1.32, 0.9, 20, 3, true);
      const sk = mesh(crinkle(skirt, 0.04), M.shield, eng);
      sk.position.set(x, aft - 0.2, z);
      const neck = mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.2, 16), M.engine, eng);
      neck.position.set(x, aft + 0.5, z);
    }
    // OMS pods on the upper aft corners: white blanket above, black tile below
    // a round lobe each side of the fin (aft elevation: out to h 3.86, top y 9.7) whose lower
    // flank fairs down into the aft fuselage's side (h 3.05 at y 6.45); the rest is buried
    const PX = 2.3;
    const PV = 7.9 - Y0;
    const podStn: Stn[] = [
      { a: stn(33.3), w: 1.5, t: 1.75, b: 2.3 },
      { a: stn(32.3), w: 1.55, t: 1.8, b: 2.3 },
      { a: stn(30.0), w: 1.5, t: 1.75, b: 2.2 },
      { a: stn(28.6), w: 1.1, t: 1.3, b: 1.6 },
      { a: stn(27.8), w: 0.6, t: 0.7, b: 0.8 },
      { a: stn(27.35), w: 0.15, t: 0.15, b: 0.15 },
    ];
    for (const sg of [-1, 1]) {
      const pod = loft(podStn, {
        n: 2.0,
        ring: 28,
        step: 0.5,
        cx: sg * PX,
        cv: PV,
        // white blanket; black tile only where the flank meets the fuselage's tiled side
        color: (x, a, v) =>
          v < 4.6 - Y0 ? jit(BLACK, x, a, v, tone.blackSpread) : jit(WHITE, x, a, v, 0.015, 16),
        rough: (_x, _a, v) => (v < 4.6 - Y0 ? 0 : 0.016),
        capColor: new THREE.Color(0x6e675c),
      });
      mesh(pod, M.vc, g).name = 'oms-pod';
      bellMesh(0.58, 0.16, 1.3, M.bell, eng, sg * 2.33, -(8.69 - Y0), stn(34.1), 0.6);
      ring(eng, M.line, 0.58, 0.03, sg * 2.33, stn(34.1) + 0.1, -(8.69 - Y0));
      // the aft RCS: a dark panel on the pod's outer flank with its jets, two more on the aft face
      const fx = PX + 1.5;
      box(0.05, 1.7, 1.0, M.dark, g, sg * fx, stn(32.2), -(PV - 0.2));
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 2; c++)
          rcsJet(
            sg * (fx + 0.05),
            stn(32.2) - 0.35 + c * 0.7,
            -(PV - 0.55 + r * 0.25),
            new THREE.Vector3(sg, 0, 0),
          );
      rcsJet(sg * 3.4, stn(33.3) - 0.05, -(7.85 - Y0), new THREE.Vector3(0, -1, 0));
      rcsJet(sg * 3.75, stn(33.3) - 0.05, -(7.85 - Y0), new THREE.Vector3(0, -1, 0));
    }
  }

  // ── landing gear (JSC-12770 Vol. 10D, 1978: a tricycle of single shock struts, two tyres each;
  // all three retract forward and up, the mains into the wings, and the gear linkage opens the
  // doors). The line-up lays the craft on its runway with the gear down. ──
  const gear = new THREE.Group();
  gear.name = 'landing-gear';
  g.add(gear);
  const doors = new THREE.Group();
  doors.name = 'gear-doors';
  g.add(doors);
  const UP = new THREE.Vector3(0, 1, 0);
  /** Lays a unit-height cylinder from p to q. */
  const setBar = (o: THREE.Object3D, p: THREE.Vector3, q: THREE.Vector3): void => {
    const d = q.clone().sub(p);
    o.position.copy(p).addScaledVector(d, 0.5);
    o.quaternion.setFromUnitVectors(UP, d.clone().normalize());
    o.scale.set(1, d.length(), 1);
  };
  const bar = (parent: THREE.Object3D, m: THREE.Material, r: number): THREE.Mesh =>
    mesh(new THREE.CylinderGeometry(r, r, 1, 10), m, parent);
  const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
  // a tyre with rounded shoulders, its hub and brake stack; the axle along x
  const tyreGeo = (r: number, w: number): THREE.BufferGeometry => {
    const pts: THREE.Vector2[] = [];
    const ri = r * 0.62;
    const n = 10;
    pts.push(new THREE.Vector2(ri, -w / 2));
    for (let i = 0; i <= n; i++) {
      const th = -Math.PI / 2 + (i / n) * Math.PI;
      pts.push(new THREE.Vector2(r - w * 0.28 + Math.cos(th) * w * 0.28, Math.sin(th) * (w / 2)));
    }
    pts.push(new THREE.Vector2(ri, w / 2));
    return new THREE.LatheGeometry(pts, 28);
  };
  const wheel = (p: THREE.Object3D, dx: number, z: number, r: number, w: number): void => {
    const t = mesh(tyreGeo(r, w), M.tyre, p);
    t.rotation.z = Math.PI / 2;
    t.position.set(dx, 0, z);
    const hub = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.92, 18), M.engine, p);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(dx, 0, z);
    const cap = mesh(new THREE.CylinderGeometry(r * 0.26, r * 0.3, w + 0.03, 14), M.line, p);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(dx, 0, z);
  };
  interface Leg {
    pivot: THREE.Group;
    /** Where the drag brace meets the strut (pivot frame) and its fixed end in the well. */
    onStrut: THREE.Vector3;
    anchor: THREE.Vector3;
    half: number;
    upper: THREE.Object3D;
    lower: THREE.Object3D;
    knee: THREE.Object3D;
  }
  const legs: Leg[] = [];
  // A leg hangs from a pivot at its top (x, a, z0): outer cylinder, the oleo piston below it, the
  // torque links on its aft side, the axle and two wheels; the drag brace runs forward to the well
  // and folds (two links, straight and locked when down) as the leg swings up.
  const buildLeg = (
    name: string,
    x: number,
    a: number,
    z0: number,
    r: number,
    w: number,
    track: number,
    rOuter: number,
    braceAt: number,
    braceTo: number,
    ground: number,
  ): void => {
    const p = new THREE.Group();
    p.name = name;
    p.position.set(x, a, z0);
    gear.add(p);
    const L = ground - r - z0;
    setBar(bar(p, M.white, rOuter), v3(0, 0, -0.05), v3(0, 0, L * 0.58));
    setBar(bar(p, M.engine, rOuter * 1.12), v3(0, 0, L * 0.56), v3(0, 0, L * 0.6));
    setBar(bar(p, M.engine, rOuter * 0.62), v3(0, 0, L * 0.58), v3(0, 0, L));
    // torque links: a scissor on the aft side between the cylinder and the piston foot
    const kneeT = v3(0, -rOuter * 2.2, L * 0.79);
    setBar(bar(p, M.line, 0.035), v3(0, -rOuter, L * 0.6), kneeT);
    setBar(bar(p, M.line, 0.035), kneeT, v3(0, -rOuter * 0.8, L - 0.12));
    // axle beam
    const ax = bar(p, M.engine, 0.075);
    setBar(ax, v3(-track - w * 0.35, 0, L), v3(track + w * 0.35, 0, L));
    wheel(p, -track, L, r, w);
    wheel(p, track, L, r, w);
    const onStrut = v3(0, rOuter * 0.8, braceAt);
    const anchor = v3(x, a + braceTo, z0 + 0.05);
    const down = p.position.clone().add(onStrut);
    legs.push({
      pivot: p,
      onStrut,
      anchor,
      half: down.distanceTo(anchor) / 2,
      upper: bar(gear, M.engine, 0.06),
      lower: bar(gear, M.engine, 0.07),
      knee: mesh(new THREE.SphereGeometry(0.1, 10, 8), M.line, gear),
    });
  };
  for (const sg of [-1, 1])
    buildLeg(
      sg < 0 ? 'gear-main-starboard' : 'gear-main-port',
      sg * MAIN_H,
      MAIN_STN,
      wZ(MAIN_H, MAIN_STN),
      0.565,
      0.41,
      0.3,
      0.26,
      1.0,
      1.6,
      MAIN_GROUND_Z,
    );
  const noseZ0 = surfV(stns, N, NOSE_STN, 0, false) * -1;
  buildLeg('gear-nose', 0, NOSE_STN, noseZ0, 0.41, 0.23, 0.2, 0.17, 0.7, 1.0, NOSE_GROUND_Z);

  // wells and doors. A door is a tile leaf hinged along one edge, built on the skin it closes over
  // (the belly curve for the nose, the flat wing underside for the mains); its inner face is bare
  // structure. The well is a dark recess panel just proud of the skin, covered by the closed door.
  const hinges: { o: THREE.Object3D; sg: number; max: number }[] = [];
  const doorLeaf = (
    skin: (a: number, x: number) => THREE.Vector3,
    a0: number,
    a1: number,
    xh: number,
    xf: number,
    max: number,
  ): void => {
    const sg = Math.sign(xh - xf);
    const p0 = skin(a0, xh);
    const p1 = skin(a1, xh);
    const axis = new THREE.Group();
    axis.position.copy(p0);
    axis.quaternion.setFromUnitVectors(UP, p1.clone().sub(p0).normalize());
    doors.add(axis);
    const leaf = new THREE.Group();
    axis.add(leaf);
    axis.updateMatrix();
    const inv = axis.matrix.clone().invert();
    const na = 12;
    const nx = 4;
    const sheet = (
      off: number,
      shadeOf: ((c: THREE.Vector3) => THREE.Color) | null,
      m: THREE.Material,
    ): void => {
      const pos: number[] = [];
      const cs: number[] = [];
      const at = (i: number, j: number): THREE.Vector3 => {
        const a = a0 + ((a1 - a0) * i) / na;
        const x = xh + ((xf - xh) * j) / nx;
        return skin(a, x)
          .add(v3(0, 0, off))
          .applyMatrix4(inv);
      };
      for (let i = 0; i < na; i++)
        for (let j = 0; j < nx; j++) {
          const q = [
            at(i, j),
            at(i + 1, j),
            at(i + 1, j + 1),
            at(i, j),
            at(i + 1, j + 1),
            at(i, j + 1),
          ];
          const c = q[0].clone().add(q[2]).multiplyScalar(0.5);
          const k = shadeOf ? shadeOf(c) : null;
          for (const v of q) {
            pos.push(v.x, v.y, v.z);
            if (k) cs.push(k.r, k.g, k.b);
          }
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (shadeOf) geo.setAttribute('color', new THREE.Float32BufferAttribute(cs, 3));
      geo.computeVertexNormals();
      mesh(geo, m, leaf);
    };
    sheet(0.06, (c) => jit(BLACK, c.x, c.y, c.z, tone.blackSpread), M.vc);
    sheet(0.035, null, M.white);
    hinges.push({ o: leaf, sg, max });
    // the well under this leaf
    const wp: number[] = [];
    const corner = (a: number, x: number): number[] =>
      skin(a, x)
        .add(v3(0, 0, 0.012))
        .toArray();
    wp.push(...corner(a0, xh), ...corner(a1, xh), ...corner(a1, xf));
    wp.push(...corner(a0, xh), ...corner(a1, xf), ...corner(a0, xf));
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.computeVertexNormals();
    mesh(wg, M.dark, doors);
  };
  const wingSkin = (a: number, x: number): THREE.Vector3 => v3(x, a, wZ(Math.abs(x), a));
  const bellySkin = (a: number, x: number): THREE.Vector3 => v3(x, a, -surfV(stns, N, a, x, false));
  // main wells x 20.4-24.3 (the side elevation), the doors hinged outboard; nose doors x 1.2-3.9
  for (const sg of [-1, 1]) doorLeaf(wingSkin, stn(24.3), stn(20.4), sg * 4.3, sg * 2.8, 1.45);
  for (const sg of [-1, 1]) doorLeaf(bellySkin, stn(3.9), stn(1.2), sg * 0.55, 0, 1.35);

  const kneeAt = (b: THREE.Vector3, an: THREE.Vector3, half: number): THREE.Vector3 => {
    const mid = b.clone().add(an).multiplyScalar(0.5);
    const d = an.clone().sub(b);
    const h = Math.sqrt(Math.max(0, half * half - d.lengthSq() / 4));
    // the fold bends up into the well (-z), in the leg's plane
    const perp = v3(0, d.z, -d.y).normalize();
    if (perp.z > 0) perp.negate();
    return mid.addScaledVector(perp, h);
  };
  const setGear = (t: number): void => {
    const k = Math.min(1, Math.max(0, t));
    const shown = k > 0.02;
    for (const l of legs) {
      l.pivot.rotation.x = (-(1 - k) * Math.PI) / 2;
      l.pivot.visible = shown;
      l.pivot.updateMatrix();
      const b = l.onStrut.clone().applyMatrix4(l.pivot.matrix);
      const kn = kneeAt(b, l.anchor, l.half);
      setBar(l.upper, l.anchor, kn);
      setBar(l.lower, kn, b);
      l.knee.position.copy(kn);
      for (const o of [l.upper, l.lower, l.knee]) o.visible = shown;
    }
    // the doors swing open over the first third of the travel and stay open
    const f = Math.min(1, k / 0.3);
    const open = f * f * (3 - 2 * f);
    for (const h of hinges) h.o.rotation.y = h.sg * h.max * open;
  };
  setGear(1);
  if (o.gear === 'animated') root.userData.setGear = setGear;

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

/** A sheet of the HAER TX-116-A survey (Orbiter Discovery) in the Library of Congress. */
const haer = (sheet: string): string => `https://www.loc.gov/pictures/item/tx1107.sheet.${sheet}/`;

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
  {
    l: 'HAER TX-116-A, Orbiter Discovery (OV-103), port elevation (Library of Congress measured drawing: the side profile, fin, OMS pods, gear stations)',
    u: haer('00006a'),
  },
  {
    l: 'HAER TX-116-A, Orbiter Discovery (OV-103), top plan (the planform: glove, wing, 23.80 m span)',
    u: haer('00007a'),
  },
  {
    l: 'HAER TX-116-A, Orbiter Discovery (OV-103), forward and aft elevations (sections, engines, 6.96 m gear track, 16.55 m height)',
    u: haer('00005a'),
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
 * starboard}, rms (RmsRig), bayMount, setGear(t 0..1; down until set). The Shuttle variants only;
 * Buran and OK-GLI have no openable bay.
 */
export function buildOrbiterOpenable(
  variant: Exclude<Variant, 'buran' | 'gli'> = 'shuttle',
  silts?: boolean,
): THREE.Group {
  return buildOrbiter({
    variant,
    length: L0,
    span: SPAN0,
    bayDoors: 'animated',
    rms: true,
    gear: 'animated',
    silts,
  });
}

/** A Shuttle orbiter as it flies: gear up, doors closed (launch stack, Earth-orbit coast). */
export function buildOrbiterFlying(
  variant: Exclude<Variant, 'buran' | 'gli'> = 'shuttle',
  silts?: boolean,
): THREE.Group {
  const root = buildOrbiter({ variant, length: L0, span: SPAN0, gear: 'animated', silts });
  (root.userData.setGear as (t: number) => void)(0);
  return root;
}

/** /fly's Earth-orbit craft (fly-craft.ts): STS-1 flew before Columbia carried SILTS. */
const flying = (variant: 'shuttle' | 'columbia', silts?: boolean) =>
  Object.assign((): THREE.Group => buildOrbiterFlying(variant, silts), { diameterM: 4.6 });
export const buildColumbiaSts1 = flying('columbia', false);
export const buildColumbiaFlying = flying('columbia');
export const buildShuttleFlying = flying('shuttle');

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
