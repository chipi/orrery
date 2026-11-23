/**
 * Showcase models: the classic crewed capsules and their cargo cousin. Vostok / Voskhod, Mercury,
 * Gemini, the Soyuz family and the Progress family (operator 2026-11-23: one central model per
 * craft, built to the bar of the Apollo LM and Curiosity, no bolted-on geometric shapes).
 *
 * Standing pose, as on the launcher: nose up, base on y = 0, +z the front. Every separable part
 * is a NAMED child group, so a descent scene can keep only what comes home:
 * - Vostok / Voskhod: 'descent-module' (the sphere), 'instrument-module', Voskhod 'retropack'
 * - Mercury: 'descent-module' (the capsule), 'retropack'
 * - Gemini: 'descent-module' (the re-entry module), 'adapter' (retro + equipment sections)
 * - Soyuz: 'orbital-module', 'descent-module', 'service-module'
 * - Progress: 'cargo-module', 'refuel-module', 'service-module'
 *
 * What makes each read as itself, in order, is listed at its builder.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, lathe, mat, strut, type Mat } from './kit';

type Mats = Record<string, Mat>;
const TAU = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const pol = (r: number, a: number, y: number): THREE.Vector3 =>
  new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));
const frac = (t: number): number => t - Math.floor(t);
const tri = (t: number): number => Math.abs(frac(t) * 2 - 1) * 2 - 1;

function grp(parent: THREE.Object3D, name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  parent.add(g);
  return g;
}

/** A cylinder or frustum between y0 (radius r0) and y1 (radius r1). */
function cyl(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  seg = 28,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

/** A horizontal ring (band, flange, strap) of radius R, tube radius r, at height y. */
function torus(g: THREE.Object3D, m: Mat, R: number, r: number, y: number, seg = 48): THREE.Mesh {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, seg), m);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  return add(g, t);
}

function ball(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  p: THREE.Vector3,
  sy = 1,
  seg = 16,
): THREE.Mesh {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m);
  s.scale.y = sy;
  s.position.copy(p);
  return add(g, s);
}

function tube(g: THREE.Object3D, m: Mat, pts: THREE.Vector3[], r: number, seg = 24): THREE.Mesh {
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6, false);
  return add(g, new THREE.Mesh(geo, m));
}

interface SurfOpts {
  nA?: number;
  nY?: number;
  /** Ridge height (metres) of the vertical corrugation and the overlapping rows. */
  amp?: number;
  /** Vertical ridges around the full circle. */
  ridges?: number;
  /** Overlapping rows (shingles) over the height. */
  rows?: number;
  a0?: number;
  a1?: number;
}

/**
 * A faceted surface of revolution r(y), optionally an arc only, with corrugation ridges and
 * overlapping shingle rows: the skin of Mercury, the Gemini re-entry module, radiator patches.
 */
function surf(
  m: Mat,
  rAt: (y: number) => number,
  y0: number,
  y1: number,
  o: SurfOpts = {},
): THREE.Mesh {
  const nA = o.nA ?? 72;
  const nY = o.nY ?? 24;
  const amp = o.amp ?? 0;
  const a0 = o.a0 ?? 0;
  const a1 = o.a1 ?? TAU;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= nY; j++) {
    const y = y0 + ((y1 - y0) * j) / nY;
    for (let i = 0; i <= nA; i++) {
      const a = a0 + ((a1 - a0) * i) / nA;
      let r = rAt(y);
      if (amp) {
        if (o.ridges) r += amp * 0.5 * tri((a * o.ridges) / TAU);
        if (o.rows) r += amp * frac((j / nY) * o.rows);
      }
      pos.push(r * Math.sin(a), y, r * Math.cos(a));
    }
  }
  for (let j = 0; j < nY; j++) {
    for (let i = 0; i < nA; i++) {
      const p = j * (nA + 1) + i;
      idx.push(p, p + 1, p + nA + 1, p + 1, p + nA + 2, p + nA + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const out = geo.toNonIndexed();
  out.computeVertexNormals();
  return new THREE.Mesh(out, m);
}

/** A crinkled thermal-blanket skin: a lathe of `pts` (r, y), densified, every vertex nudged. */
function blanket(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  amp: number,
  seg = 40,
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

/** A frame at `pos` whose local +y is `normal`: hatches, ports and boxes are built in it. */
function frameAt(parent: THREE.Object3D, pos: THREE.Vector3, normal: THREE.Vector3): THREE.Group {
  const f = new THREE.Group();
  f.position.copy(pos);
  const n = normal.clone().normalize();
  const t = new THREE.Vector3().crossVectors(Y_AXIS, n);
  if (t.lengthSq() < 1e-4) f.quaternion.setFromUnitVectors(Y_AXIS, n);
  else {
    // Keep local x horizontal and local z pointing down the surface, so hatches sit upright.
    t.normalize();
    f.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(t, n, new THREE.Vector3().crossVectors(t, n)),
    );
  }
  parent.add(f);
  return f;
}

/** A frame on a surface of revolution r(y) at height y, azimuth yaw (0 = +z). */
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

/** A frame on a sphere of radius R about the origin, polar angle theta (0 = top), azimuth yaw. */
function onSphere(parent: THREE.Object3D, R: number, theta: number, yaw: number): THREE.Group {
  const n = new THREE.Vector3(
    Math.sin(theta) * Math.sin(yaw),
    Math.cos(theta),
    Math.sin(theta) * Math.cos(yaw),
  );
  return frameAt(parent, n.clone().multiplyScalar(R), n);
}

/** A porthole in a frame: a bright ring and the dark glass. */
function port(f: THREE.Object3D, M: Mats, R: number, tubeR = 0.02): void {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, tubeR, 8, 28), M.silver);
  t.rotation.x = Math.PI / 2;
  add(f, t);
  const d = new THREE.Mesh(new THREE.CircleGeometry(R, 28), M.glass);
  d.rotation.x = -Math.PI / 2;
  d.position.y = 0.004;
  add(f, d);
}

/** A shallow domed hatch cover in a frame. */
function hatchCap(f: THREE.Object3D, m: Mat, R: number, h: number): void {
  lathe(
    f,
    m,
    [
      [0, 0],
      [R, 0],
      [R * 0.95, h * 0.7],
      [R * 0.6, h],
      [0, h * 1.05],
    ],
    32,
  );
}

/** A small thruster nozzle flaring outward at (r, yaw, y). */
function thruster(g: THREE.Object3D, m: Mat, a: number, r: number, y: number, rad = 0.035): void {
  const out = pol(1, a, 0);
  const c = new THREE.Mesh(new THREE.ConeGeometry(rad, rad * 2.6, 10), m);
  c.quaternion.setFromUnitVectors(Y_AXIS, out.clone().negate());
  c.position.copy(pol(r + rad * 1.2, a, y));
  add(g, c);
}

/** Stand a finished craft on y = 0 at its published height. */
function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Vostok / Voskhod
// ---------------------------------------------------------------------------------------------

/**
 * The Vostok 3KA and the Voskhod 3KV: what reads as Vostok is the 2.3 m sphere (polished upper
 * half, the dark ablative cover over the lower, two green retaining straps, the big entry hatch,
 * the portholes, the four hairpin antennas), the belt of sixteen strapped olive gas bottles
 * where it meets the instrument module, the module's cream cylinder with its black louvre
 * patches over a faceted olive cone, and the retro engine bell at the foot. Voskhod is the same
 * craft with the backup solid retro pack on top of the sphere.
 */
function buildVostok(voskhod: boolean): THREE.Group {
  const M: Mats = {
    cream: mat(0xd2c9ae, 0.5, 0.55),
    olive: mat(0x58623f, 0.5, 0.6, true),
    bottle: mat(0x4e5a37, 0.55, 0.5),
    dark: mat(0x232529, 0.5, 0.6, true),
    silver: mat(0xc7cace, 0.55, 0.3),
    polish: mat(0xb9bdc2, 0.55, 0.22),
    ablate: mat(0x3a322c, 0.5, 0.92),
    ablateEdge: mat(0x6d5c4b, 0.5, 0.8),
    strap: mat(0x6f8d3e, 0.5, 0.6),
    glass: mat(0x05070b, 0.3, 0.2),
    bell: mat(0x3a3733, 0.6, 0.5, true),
    foil: mat(0xc19a48, 0.55, 0.4, true),
  };
  const g = new THREE.Group();

  // Instrument module: foot at y = 0, top rim at 2.07.
  const im = grp(g, 'instrument-module');
  const coneR = (y: number): number => 0.42 + ((y - 0.25) * (1.215 - 0.42)) / 0.9;
  add(im, surf(M.olive, coneR, 0.25, 1.15, { nA: 16, nY: 1 }));
  lathe(im, M.dark, [
    [0, 0.25],
    [0.42, 0.25],
  ]);
  lathe(im, M.bell, [
    [0.32, 0],
    [0.24, 0.1],
    [0.17, 0.22],
    [0.14, 0.3],
  ]);
  lathe(im, M.cream, [
    [0, 1.15],
    [1.215, 1.15],
    [1.215, 2.0],
    [1.12, 2.07],
    [0, 2.07],
  ]);
  torus(im, M.silver, 1.22, 0.03, 1.15);
  torus(im, M.silver, 1.2, 0.03, 2.02);
  for (const [a0, a1] of [
    [1.15, 2.0],
    [4.3, 5.15],
  ]) {
    add(
      im,
      surf(M.dark, () => 1.226, 1.28, 1.85, { nA: 12, nY: 24, amp: 0.02, rows: 6, a0, a1 }),
    );
  }
  for (const [yaw, y, r] of [
    [0, 1.62, 0.2],
    [Math.PI, 1.62, 0.2],
    [2.5, 1.35, 0.13],
  ]) {
    const f = onProfile(im, () => 1.215, y, yaw);
    hatchCap(f, M.silver, r, 0.03);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 24), M.silver);
    ring.rotation.x = Math.PI / 2;
    add(f, ring);
  }
  for (const [yaw, y] of [
    [0.85, 1.55],
    [-1.9, 1.75],
  ]) {
    box(
      onProfile(im, () => 1.215, y, yaw),
      M.dark,
      0.3,
      0.14,
      0.22,
      0,
      0.06,
      0,
    );
  }
  // Handrails, the loops on the module's side.
  for (const yaw of [1.5, -1.5]) {
    tube(
      im,
      M.silver,
      [
        pol(1.215, yaw - 0.12, 1.4),
        pol(1.32, yaw - 0.1, 1.55),
        pol(1.32, yaw + 0.1, 1.55),
        pol(1.215, yaw + 0.12, 1.4),
      ],
      0.012,
    );
  }
  // The gas-bottle belt: sixteen olive spheres, each with its silver strap.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const c = pol(1.07, a, 2.2);
    ball(im, M.bottle, 0.165, c, 0.92);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.012, 6, 16), M.silver);
    band.rotation.y = a + Math.PI / 2;
    band.position.copy(c);
    add(im, band);
  }
  torus(im, M.silver, 1.0, 0.03, 2.05);

  // Descent sphere: centre 3.1, radius 1.15.
  const R = 1.15;
  const C = 3.1;
  const dm = grp(g, 'descent-module');
  const sg = new THREE.Group();
  sg.position.y = C;
  dm.add(sg);
  add(sg, new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), M.polish));
  add(
    sg,
    new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.03, 64, 40, 0, TAU, 1.2, Math.PI - 1.2),
      M.ablate,
    ),
  );
  torus(sg, M.ablateEdge, (R + 0.03) * Math.sin(1.2), 0.022, (R + 0.03) * Math.cos(1.2));
  for (const rot of [0.9, 2.25]) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(R + 0.045, 0.018, 6, 72), M.strap);
    s.rotation.y = rot;
    add(sg, s);
  }
  // Entry hatch (large), technological hatch, the two portholes.
  const hatch = onSphere(sg, R + 0.03, 1.72, 0.1);
  hatchCap(hatch, M.polish, 0.4, 0.05);
  const hr = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 40), M.silver);
  hr.rotation.x = Math.PI / 2;
  add(hatch, hr);
  const th = onSphere(sg, R + 0.03, 2.05, 3.3);
  hatchCap(th, M.polish, 0.2, 0.04);
  port(onSphere(sg, R + 0.03, 1.45, -1.25), M, 0.13);
  port(onSphere(sg, R + 0.03, 1.9, -0.7), M, 0.2, 0.025);

  // Top: the antenna cap, four hairpin loops and two whips (and Voskhod's retro pack).
  let top = C + R;
  if (voskhod) {
    const rp = grp(g, 'retropack');
    rp.position.y = top - 0.04;
    blanket(
      rp,
      M.foil,
      [
        [0.46, 0],
        [0.5, 0.03],
        [0.5, 0.36],
        [0.4, 0.43],
      ],
      0.012,
      28,
      0.12,
    );
    lathe(rp, M.dark, [
      [0, 0.43],
      [0.4, 0.43],
    ]);
    torus(rp, M.silver, 0.5, 0.025, 0.03);
    lathe(rp, M.bell, [
      [0.2, 0.43],
      [0.15, 0.5],
      [0.11, 0.55],
    ]);
    top += 0.42;
  }
  cyl(dm, M.silver, 0.14, 0.14, top - 0.04, top + 0.05, 20);
  const base = top + 0.05;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const out = pol(1, a, 0);
    const b = pol(0.1, a, base);
    tube(
      dm,
      M.silver,
      [
        b,
        b
          .clone()
          .addScaledVector(out, 0.08)
          .setY(base + 0.15),
        b
          .clone()
          .addScaledVector(out, 0.2)
          .setY(base + 0.37),
        b
          .clone()
          .addScaledVector(out, 0.34)
          .setY(base + 0.32),
        b
          .clone()
          .addScaledVector(out, 0.4)
          .setY(base + 0.15),
      ],
      0.009,
    );
  }
  for (const a of [0.2, Math.PI + 0.2]) {
    const b = pol(0.1, a, base);
    strut(
      dm,
      M.silver,
      b,
      b
        .clone()
        .addScaledVector(pol(1, a, 0), 0.2)
        .setY(base + 0.42),
      0.008,
      5,
    );
  }
  return finish(g, voskhod ? 5.0 : 4.55);
}

// ---------------------------------------------------------------------------------------------
// Mercury
// ---------------------------------------------------------------------------------------------

/**
 * The Mercury spacecraft (no escape tower): the black corrugated-shingle cone, the trapezoid
 * window and hatch on it, the short neck with its thruster nozzles and the tower ring, the white
 * recovery / antenna canister, the concave ablative heat shield, and under it the retropack of
 * three silver rockets held by three straps that run over the shield's rim up the cone.
 */
function buildMercury(): THREE.Group {
  const M: Mats = {
    shingle: mat(0x2e2926, 0.5, 0.5, true),
    plate: mat(0x4a4642, 0.5, 0.45),
    shield: mat(0x2f2b27, 0.5, 0.9),
    silver: mat(0xc9ccd1, 0.55, 0.3),
    white: mat(0xdcdddf, 0.5, 0.45),
    glass: mat(0x05070b, 0.3, 0.2),
    rocket: mat(0xbfc3c8, 0.55, 0.35),
    nozzle: mat(0x8b8f95, 0.6, 0.4),
    strap: mat(0x9a9da2, 0.55, 0.4),
    dark: mat(0x1d1d20, 0.5, 0.6),
  };
  const g = new THREE.Group();
  const dm = grp(g, 'descent-module');
  const SH = 0.62;
  lathe(dm, M.shield, [
    [0, 0.68],
    [0.3, 0.655],
    [0.6, 0.63],
    [0.86, 0.605],
    [0.9, 0.6],
    [0.9, 0.68],
  ]);
  torus(dm, M.plate, 0.9, 0.03, 0.62);
  const coneR = (y: number): number => 0.9 - ((y - SH) * 0.47) / 1.48;
  add(dm, surf(M.shingle, coneR, SH, 2.1, { nA: 112, nY: 52, amp: 0.01, ridges: 56, rows: 13 }));
  torus(dm, M.silver, 0.47, 0.04, 2.1);
  add(
    dm,
    surf(M.shingle, () => 0.43, 2.1, 2.55, { nA: 48, nY: 12, amp: 0.012, ridges: 36, rows: 3 }),
  );
  for (let i = 0; i < 6; i++) thruster(dm, M.nozzle, (i / 6) * TAU + 0.3, 0.43, 2.32, 0.03);
  lathe(dm, M.white, [
    [0, 2.55],
    [0.33, 2.55],
    [0.33, 2.95],
    [0.05, 3.3],
    [0, 3.3],
  ]);
  torus(dm, M.silver, 0.34, 0.025, 2.55);
  torus(dm, M.dark, 0.332, 0.02, 2.78);

  // The window (a trapezoid, wider at the bottom) and the side hatch, on the cone at +z.
  const trap = (wB: number, wT: number, h: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(-wB / 2, -h / 2);
    s.lineTo(wB / 2, -h / 2);
    s.lineTo(wT / 2, h / 2);
    s.lineTo(-wT / 2, h / 2);
    s.closePath();
    return s;
  };
  const win = onProfile(dm, coneR, 1.8, 0.0, -0.01);
  const inner = new THREE.Group();
  inner.rotation.x = -Math.PI / 2;
  win.add(inner);
  add(
    inner,
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(trap(0.34, 0.24, 0.36), { depth: 0.03, bevelEnabled: false }),
      M.silver,
    ),
  );
  const gl = add(
    inner,
    new THREE.Mesh(
      new THREE.ExtrudeGeometry(trap(0.25, 0.17, 0.27), { depth: 0.04, bevelEnabled: false }),
      M.glass,
    ),
  );
  gl.position.z = 0.002;
  const hat = onProfile(dm, coneR, 1.38, 0.0, -0.012);
  box(hat, M.shingle, 0.42, 0.035, 0.56, 0, 0.012, 0);
  box(hat, M.silver, 0.46, 0.02, 0.04, 0, 0.03, 0.29);
  box(hat, M.silver, 0.46, 0.02, 0.04, 0, 0.03, -0.29);

  // Retropack: hub, three rockets, three straps.
  const rp = grp(g, 'retropack');
  cyl(rp, M.rocket, 0.13, 0.13, 0.02, 0.64, 20);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 6;
    const c = pol(0.3, a, 0);
    const r = cyl(rp, M.rocket, 0.17, 0.17, 0.24, 0.64, 24);
    r.position.x = c.x;
    r.position.z = c.z;
    const n = cyl(rp, M.nozzle, 0.13, 0.07, 0.02, 0.24, 20);
    n.position.x = c.x;
    n.position.z = c.z;
    const rim = torus(rp, M.silver, 0.17, 0.012, 0.24, 24);
    rim.position.x = c.x;
    rim.position.z = c.z;
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 6 + Math.PI / 3;
    const pts = [
      pol(0.4, a, 0.3),
      pol(0.93, a, 0.585),
      pol(0.94, a, 0.65),
      pol(coneR(1.1) + 0.015, a, 1.1),
    ];
    for (let k = 0; k < pts.length - 1; k++) strut(rp, M.strap, pts[k], pts[k + 1], 0.016, 6);
    box(rp, M.silver, 0.08, 0.08, 0.05, pts[3].x, pts[3].y, pts[3].z).rotation.y = a;
  }
  return finish(g, 3.3);
}

// ---------------------------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------------------------

/**
 * The Gemini spacecraft: the white adapter (ribbed equipment section, tapered retro section,
 * the OAMS thruster pods with their grilles and ports, the retro exhausts, the copper ring at
 * the join), under the black re-entry module with its shingled cone, the two big hatches each
 * with its small window, the RCS section with its thruster ports and the narrower rendezvous
 * and recovery section at the nose.
 */
function buildGemini(): THREE.Group {
  const M: Mats = {
    white: mat(0xd8d6cf, 0.5, 0.5, true),
    ridge: mat(0xb9bcc0, 0.55, 0.4, true),
    black: mat(0x202022, 0.5, 0.55, true),
    blackSm: mat(0x1c1c1e, 0.5, 0.55),
    plate: mat(0x35353a, 0.5, 0.5),
    silver: mat(0xc7cace, 0.55, 0.3),
    copper: mat(0xb5703a, 0.55, 0.4),
    glass: mat(0x05070b, 0.3, 0.2),
    dark: mat(0x16161a, 0.5, 0.6),
    grey: mat(0x8d9096, 0.5, 0.5),
  };
  const g = new THREE.Group();
  const ADP = 2.29;

  const ad = grp(g, 'adapter');
  add(
    ad,
    surf(M.white, () => 1.524, 0, 1.2, { nA: 72, nY: 24, amp: 0.012, rows: 6 }),
  );
  const retroR = (y: number): number => 1.524 - ((y - 1.2) * 0.3) / 1.09;
  add(ad, surf(M.white, retroR, 1.2, ADP, { nA: 72, nY: 12, amp: 0.01, rows: 4 }));
  lathe(ad, M.dark, [
    [0, 0],
    [1.524, 0],
  ]);
  torus(ad, M.silver, 1.53, 0.035, 1.2);
  torus(ad, M.copper, 1.225, 0.032, ADP - 0.02);
  torus(ad, M.dark, 1.52, 0.03, 0.02);
  // Ribbed radiator patch, and the OAMS pods (grille, two round ports) at the join.
  add(
    ad,
    surf(M.ridge, () => 1.534, 0.25, 1.05, {
      nA: 16,
      nY: 32,
      amp: 0.022,
      rows: 8,
      a0: 2.5,
      a1: 3.8,
    }),
  );
  for (const yaw of [1.05, -1.05]) {
    const f = onProfile(ad, () => 1.524, 1.0, yaw);
    box(f, M.white, 0.95, 0.12, 0.6, 0, 0.04, 0);
    box(f, M.dark, 0.5, 0.02, 0.4, -0.12, 0.11, 0);
    for (const x of [0.3, 0.42]) {
      const p = cyl(f, M.dark, 0.075, 0.075, 0.1, 0.13, 16);
      p.position.x = x;
      p.position.z = -0.12;
    }
  }
  for (let i = 0; i < 4; i++) {
    const f = onProfile(ad, retroR, 1.75, Math.PI / 4 + (i * Math.PI) / 2);
    hatchCap(f, M.dark, 0.12, 0.02);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), M.silver);
    rim.rotation.x = Math.PI / 2;
    add(f, rim);
  }

  // Re-entry module: shingled black cone from the 2.3 m heat shield to the nose.
  const dm = grp(g, 'descent-module');
  const rmR = (y: number): number => 1.15 - ((y - ADP) * 0.48) / 2.0;
  lathe(dm, M.dark, [
    [0, ADP],
    [1.15, ADP],
  ]);
  add(dm, surf(M.black, rmR, ADP, 4.29, { nA: 96, nY: 48, amp: 0.01, ridges: 48, rows: 14 }));
  torus(dm, M.copper, 1.15, 0.02, ADP + 0.02);
  // RCS section and the rendezvous and recovery section.
  lathe(dm, M.blackSm, [
    [0, 4.29],
    [0.67, 4.29],
    [0.67, 4.86],
    [0.55, 4.9],
    [0.52, 4.9],
    [0.52, 5.6],
    [0.44, 5.66],
    [0.2, 5.7],
    [0.2, 5.736],
    [0, 5.736],
  ]);
  torus(dm, M.grey, 0.67, 0.02, 4.29);
  torus(dm, M.grey, 0.52, 0.02, 4.9);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    for (const y of [4.46, 4.7]) {
      const f = onProfile(dm, () => 0.67, y, a);
      const p = cyl(f, M.dark, 0.05, 0.05, 0, 0.03, 14);
      p.position.y = 0.012;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.01, 6, 14), M.silver);
      rim.rotation.x = Math.PI / 2;
      add(f, rim);
    }
  }
  for (let i = 0; i < 4; i++) {
    const f = onProfile(dm, () => 0.52, 5.28, (i * Math.PI) / 2 + 0.4, -0.004);
    box(f, M.grey, 0.34, 0.016, 0.6, 0, 0.008, 0);
    box(f, M.dark, 0.34, 0.02, 0.03, 0, 0.01, 0.3);
  }
  torus(dm, M.copper, 0.52, 0.015, 5.62);
  // The two hatches, each with its window, set into the cone.
  const hatchShape = (wB: number, wT: number, h: number): THREE.Shape => {
    const s = new THREE.Shape();
    s.moveTo(-wB / 2, -h / 2);
    s.lineTo(wB / 2, -h / 2);
    s.lineTo(wT / 2, h / 2);
    s.lineTo(-wT / 2, h / 2);
    s.closePath();
    return s;
  };
  for (const yaw of [0.95, -0.95]) {
    const f = onProfile(dm, rmR, 3.5, yaw);
    const inner = new THREE.Group();
    inner.rotation.x = -Math.PI / 2;
    f.add(inner);
    add(
      inner,
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(hatchShape(0.78, 0.5, 1.15), {
          depth: 0.035,
          bevelEnabled: false,
        }),
        M.plate,
      ),
    );
    const w = add(
      inner,
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(hatchShape(0.42, 0.2, 0.55), {
          depth: 0.045,
          bevelEnabled: false,
        }),
        M.glass,
      ),
    );
    w.position.set(0, 0.25, 0.002);
    const ring = add(
      inner,
      new THREE.Mesh(
        new THREE.ExtrudeGeometry(hatchShape(0.5, 0.26, 0.62), {
          depth: 0.04,
          bevelEnabled: false,
        }),
        M.silver,
      ),
    );
    ring.position.set(0, 0.25, 0);
    ring.scale.set(1, 1, 0.9);
    w.position.z = 0.012;
  }
  return finish(g, 5.736);
}

// ---------------------------------------------------------------------------------------------
// Soyuz / Progress
// ---------------------------------------------------------------------------------------------

function soyuzMats(): Mats {
  return {
    white: mat(0xe6e4dd, 0.5, 0.55),
    // The orbital and descent modules wear grey-green thermal blankets.
    mli: mat(0x717a60, 0.5, 0.65, true),
    mliDark: mat(0x4d5441, 0.5, 0.7, true),
    smMli: mat(0x9b957f, 0.5, 0.55, true),
    shield: mat(0x4a3524, 0.5, 0.9),
    silver: mat(0xc9ccd0, 0.55, 0.3),
    dark: mat(0x24262b, 0.5, 0.5, true),
    tan: mat(0xa87a44, 0.5, 0.5),
    glass: mat(0x0a0e16, 0.5, 0.15),
    cell: mat(0x1c2c5a, 0.55, 0.35),
    gold: mat(0xc9a24a, 0.55, 0.4),
    frame: mat(0x8d9298, 0.55, 0.4),
    nozzle: mat(0x3a3733, 0.6, 0.5, true),
    dish: Object.assign(mat(0xe9e8e3, 0.5, 0.45), { side: THREE.DoubleSide }),
  };
}

/** A solar wing in the plane of the craft axis: frame, cells both sides, cross-bars, hinges. */
function solarWing(
  M: Mats,
  side: 1 | -1,
  root: number,
  tip: number,
  y0: number,
  chord: number,
  sections: number,
): THREE.Group {
  const w = new THREE.Group();
  w.userData.solarArray = true;
  const len = tip - root;
  const cx = side * (root + len / 2);
  const cy = y0 + chord / 2;
  box(w, M.frame, len, chord, 0.03, cx, cy, 0);
  for (const z of [0.019, -0.019]) {
    const cells = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.1, chord - 0.1), M.cell);
    cells.position.set(cx, cy, z);
    if (z < 0) cells.rotation.y = Math.PI;
    add(w, cells);
    for (let i = 1; i < 8; i++) {
      box(w, M.gold, len - 0.1, 0.012, 0.004, cx, y0 + 0.05 + ((chord - 0.1) * i) / 8, z * 1.15);
    }
    for (let i = 1; i < sections * 3; i++) {
      box(
        w,
        M.gold,
        0.012,
        chord - 0.1,
        0.004,
        side * (root + 0.05 + ((len - 0.1) * i) / (sections * 3)),
        cy,
        z * 1.15,
      );
    }
  }
  for (let i = 0; i <= sections; i++) {
    box(w, M.silver, 0.05, chord + 0.04, 0.05, side * (root + (len * i) / sections), cy, 0);
  }
  box(w, M.silver, len, 0.04, 0.05, cx, y0, 0);
  box(w, M.silver, len, 0.04, 0.05, cx, y0 + chord, 0);
  // Root hinge and boom to the drum.
  box(w, M.silver, 0.34, 0.4, 0.22, side * (root - 0.12), cy, 0);
  strut(
    w,
    M.silver,
    new THREE.Vector3(side * (root - 0.25), y0 + 0.2, 0.06),
    new THREE.Vector3(side * root, y0 + 0.1, 0.02),
    0.025,
    6,
  );
  return w;
}

interface SmSpec {
  wingSpan: number | null;
  wingChord: number;
  sections: number;
}

/**
 * The service module the Soyuz and the Progress share: the white drum with the engine bell in
 * its aft face and the attitude thrusters, the blanketed instrument barrel with its tan
 * radiator patches and straps, the truss ring up to the next module, the two solar wings, the
 * Kurs dishes on their booms. y 0 to 2.26.
 */
function serviceModule(parent: THREE.Object3D, M: Mats, s: SmSpec): THREE.Group {
  const sm = grp(parent, 'service-module');
  lathe(
    sm,
    M.white,
    [
      [0, 0],
      [1.3, 0],
      [1.36, 0.08],
      [1.36, 0.6],
      [1.3, 0.66],
      [1.12, 0.78],
      [0, 0.78],
    ],
    48,
  );
  torus(sm, M.dark, 1.31, 0.04, 0.03);
  torus(sm, M.silver, 1.36, 0.02, 0.6);
  lathe(sm, M.nozzle, [
    [0.44, 0],
    [0.32, 0.12],
    [0.2, 0.3],
    [0.16, 0.38],
  ]);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    thruster(sm, M.nozzle, a - 0.05, 1.36, 0.3, 0.05);
    thruster(sm, M.nozzle, a + 0.05, 1.36, 0.3, 0.05);
  }
  const f0 = onProfile(sm, () => 1.36, 0.35, 0.4);
  box(f0, M.dark, 0.5, 0.05, 0.32, 0, 0.02, 0);
  // Instrument barrel in gold-grey foil, then the truss ring to the next module.
  blanket(
    sm,
    M.smMli,
    [
      [1.12, 0.78],
      [1.12, 1.95],
      [1.07, 2.0],
    ],
    0.014,
    48,
    0.2,
  );
  lathe(
    sm,
    M.dark,
    [
      [0, 1.95],
      [1.08, 1.95],
      [1.0, 2.26],
      [0, 2.26],
    ],
    40,
  );
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    strut(sm, M.silver, pol(1.09, a, 1.96), pol(0.99, a, 2.25), 0.022, 6);
  }
  torus(sm, M.silver, 1.08, 0.03, 1.95);
  const barrelR = (): number => 1.145;
  for (const [a0, a1] of [
    [0.25, 1.0],
    [3.4, 4.2],
  ]) {
    add(sm, surf(M.tan, barrelR, 1.05, 1.75, { nA: 14, nY: 14, amp: 0.014, rows: 5, a0, a1 }));
  }
  for (const y of [1.0, 1.82]) torus(sm, M.tan, 1.14, 0.016, y);
  // Wings.
  if (s.wingSpan) {
    for (const side of [1, -1] as const) {
      sm.add(solarWing(M, side, 1.36, s.wingSpan / 2, 0.12, s.wingChord, s.sections));
    }
  }
  // Kurs antennas: dishes on booms to the front and back, a smaller one, two whips.
  for (const [yaw, r] of [
    [0, 0.24],
    [Math.PI, 0.2],
    [1.9, 0.12],
  ]) {
    const base = pol(1.2, yaw, 0.55);
    const tip = pol(1.62, yaw, 0.78);
    strut(sm, M.silver, base, tip, 0.02, 6);
    const d = dish(M.dish, M.dark, r);
    d.position.copy(tip);
    d.quaternion.setFromUnitVectors(Y_AXIS, pol(1, yaw, 0.25).normalize());
    sm.add(d);
  }
  strut(sm, M.silver, pol(0.9, -0.9, 0.78), pol(1.0, -0.9, 1.55), 0.012, 4);
  strut(sm, M.silver, pol(0.9, 2.4, 0.78), pol(1.0, 2.4, 1.4), 0.012, 4);
  return sm;
}

/** The docking unit and probe on the top of an orbital or cargo module, base at y. */
function dockingProbe(g: THREE.Object3D, M: Mats, y: number, top: number): void {
  cyl(g, M.silver, 0.5, 0.5, y, y + 0.06, 32);
  torus(g, M.silver, 0.5, 0.04, y + 0.06);
  lathe(g, M.dark, [
    [0, y + 0.04],
    [0.44, y + 0.04],
  ]);
  cyl(g, M.silver, 0.06, 0.06, y, top - 0.13, 12);
  ball(g, M.silver, 0.12, new THREE.Vector3(0, top - 0.12, 0), 1, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    strut(g, M.silver, pol(0.1, a, top - 0.2), pol(0.2, a, top - 0.28), 0.012, 4);
  }
}

/**
 * Soyuz: the spheroid orbital module in grey-green blanket (side hatch, porthole, antennas)
 * with the docking probe on top; the descent module, a bell with the brown ablative heat shield,
 * three viewports and the top hatch ring; the service module with the two wings.
 */
function buildSoyuz(total: number, wingSpan: number, wingChord: number): THREE.Group {
  const M = soyuzMats();
  const g = new THREE.Group();
  serviceModule(g, M, { wingSpan, wingChord, sections: 3 });

  // Descent module: 2.26 to 4.5.
  const dm = grp(g, 'descent-module');
  const dmProfile: [number, number][] = [
    [1.0, 2.3],
    [1.085, 2.42],
    [1.085, 2.66],
    [1.02, 2.95],
    [0.9, 3.3],
    [0.75, 3.7],
    [0.56, 4.12],
    [0.43, 4.4],
    [0.38, 4.5],
  ];
  blanket(dm, M.mli, dmProfile, 0.012, 48, 0.2);
  lathe(
    dm,
    M.shield,
    [
      [0, 2.26],
      [1.0, 2.26],
      [1.085, 2.4],
    ],
    40,
  );
  const dmR = profileFn(dmProfile);
  torus(dm, M.mliDark, 0.58, 0.022, 4.1);
  torus(dm, M.silver, 0.4, 0.03, 4.49);
  hatchCap(frameAt(dm, new THREE.Vector3(0, 4.5, 0), Y_AXIS), M.silver, 0.34, 0.04);
  port(onProfile(dm, dmR, 3.55, 0, 0.02), M, 0.12);
  port(onProfile(dm, dmR, 3.95, 0.62, 0.02), M, 0.09);
  port(onProfile(dm, dmR, 3.95, -0.62, 0.02), M, 0.09);
  box(onProfile(dm, dmR, 2.85, 2.4, 0.02), M.dark, 0.3, 0.1, 0.22, 0, 0, 0);
  const strapC = new THREE.Color(0x8a6a44);
  for (const yaw of [1.1, 2.3, 3.5]) {
    const pts = [2.5, 3.0, 3.5, 4.0].map((y) => pol(dmR(y) + 0.03, yaw, y));
    tube(dm, mat(strapC.getHex(), 0.5, 0.6), pts, 0.012, 16);
  }

  // Orbital module: 4.5 up to the probe tip.
  const om = grp(g, 'orbital-module');
  const L = total - 4.5;
  const omPts: [number, number][] = (
    [
      [0.36, 0],
      [0.72, 0.05],
      [1.0, 0.17],
      [1.12, 0.34],
      [1.13, 0.5],
      [1.02, 0.66],
      [0.8, 0.77],
      [0.58, 0.82],
      [0.52, 0.84],
      [0.5, 0.9],
    ] as [number, number][]
  ).map(([r, f]) => [r, 4.5 + f * L] as [number, number]);
  blanket(om, M.mli, omPts, 0.014, 48, 0.2);
  const omR = profileFn(omPts);
  dockingProbe(om, M, 4.5 + 0.9 * L, total);
  const hatch = onProfile(om, omR, 4.5 + 0.4 * L, 0.0, 0.02);
  const hr = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), M.silver);
  hr.rotation.x = Math.PI / 2;
  add(hatch, hr);
  hatchCap(hatch, M.mliDark, 0.31, 0.03);
  port(onProfile(om, omR, 4.5 + 0.42 * L, -1.15, 0.02), M, 0.14);
  port(onProfile(om, omR, 4.5 + 0.55 * L, 1.15, 0.02), M, 0.1);
  box(onProfile(om, omR, 4.5 + 0.66 * L, 2.3, 0.02), M.dark, 0.4, 0.12, 0.3, 0, 0, 0);
  const antBase = pol(0.8, 0.8, 4.5 + 0.7 * L);
  strut(om, M.silver, antBase, antBase.clone().add(new THREE.Vector3(0.1, 0.22, 0.1)), 0.012, 4);
  ball(om, M.dish, 0.06, antBase.clone().add(new THREE.Vector3(0.1, 0.24, 0.1)));
  // The brown cable loops along the join of orbital and descent modules.
  const tc = mat(0x8a6a44, 0.5, 0.6);
  tube(
    om,
    tc,
    [pol(0.45, -0.6, 4.45), pol(0.62, -0.4, 4.7), pol(0.7, -0.2, 4.95), pol(0.72, 0, 5.15)],
    0.014,
    14,
  );
  return finish(g, total);
}

/**
 * Progress: the Soyuz service module and wings (none on the 7K-TG, battery-powered), the dark
 * blanketed refuelling module with its four tank blisters and tan straps where the Soyuz has
 * the descent module, and the cargo module on top: a long cylinder tapering to the docking
 * unit with its probe, two Kurs dishes and the whips.
 */
function buildProgress(total: number, refuel: number, wingSpan: number | null): THREE.Group {
  const M = soyuzMats();
  const g = new THREE.Group();
  serviceModule(g, M, { wingSpan, wingChord: 1.3, sections: 3 });

  const y1 = 2.26 + refuel;
  const rf = grp(g, 'refuel-module');
  const rfPts: [number, number][] = [
    [1.02, 2.26],
    [1.1, 2.34],
    [1.1, y1 - 0.08],
    [1.02, y1],
  ];
  blanket(rf, M.mliDark, rfPts, 0.014, 48, 0.2);
  torus(rf, M.silver, 1.1, 0.03, 2.34);
  torus(rf, M.silver, 1.1, 0.03, y1 - 0.08);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const geo = crinkle(new THREE.SphereGeometry(0.5, 14, 12), 0.015);
    const b = add(rf, new THREE.Mesh(geo, M.mliDark));
    b.scale.set(0.5, ((refuel - 0.5) / 2 / 0.5) * 1, 0.42);
    b.position.copy(pol(1.1, a, 2.26 + refuel / 2));
    b.rotation.y = a;
  }
  for (const y of [2.26 + refuel * 0.25, 2.26 + refuel * 0.75]) torus(rf, M.tan, 1.115, 0.016, y);
  box(
    onProfile(rf, () => 1.1, 2.26 + refuel * 0.5, 0, 0.02),
    M.silver,
    0.26,
    0.05,
    0.26,
    0,
    0,
    0,
  );

  const cg = grp(g, 'cargo-module');
  const L = total - y1;
  const cPts: [number, number][] = [
    [1.02, y1],
    [1.1, y1 + 0.08],
    [1.1, y1 + L - 0.82],
    [0.95, y1 + L - 0.62],
    [0.62, y1 + L - 0.3],
    [0.58, y1 + L - 0.24],
    [0.54, y1 + L - 0.2],
  ];
  blanket(cg, M.mli, cPts, 0.015, 48, 0.2);
  const cR = profileFn(cPts);
  torus(cg, M.silver, 1.1, 0.03, y1 + 0.08);
  dockingProbe(cg, M, y1 + L - 0.24, total);
  for (const y of [y1 + L * 0.3, y1 + L * 0.62]) torus(cg, M.tan, 1.115, 0.016, y);
  for (const [yaw, y, r] of [
    [0.7, y1 + L * 0.45, 0.24],
    [-0.7, y1 + L * 0.7, 0.2],
  ]) {
    const f = onProfile(cg, cR, y, yaw);
    const base = new THREE.Vector3(0, 0.02, 0);
    strut(f, M.silver, base, new THREE.Vector3(0, 0.3, 0), 0.02, 6);
    const d = dish(M.dish, M.dark, r);
    d.position.set(0, 0.3, 0);
    f.add(d);
  }
  box(onProfile(cg, cR, y1 + L * 0.2, 2.2, 0.02), M.dark, 0.4, 0.1, 0.3, 0, 0, 0);
  box(onProfile(cg, cR, y1 + L * 0.8, -2.3, 0.02), M.silver, 0.3, 0.06, 0.22, 0, 0, 0);
  strut(cg, M.silver, pol(0.9, 1.3, y1 + L - 0.6), pol(0.95, 1.3, y1 + L - 0.05), 0.012, 4);
  return finish(g, total);
}

// ---------------------------------------------------------------------------------------------

const REF_VOSTOK: ShowcaseRef = {
  l: 'Wikipedia, Vostok (spacecraft) and Voskhod: 2.3 m sphere, 2.43 m module, 4.55 m / 5 m overall; museum photographs (Commons "Vostok spacecraft", "Vostok spacecraft replica2", Memorial Museum of Astronautics)',
  u: 'https://en.wikipedia.org/wiki/Vostok_(spacecraft)',
};
const REF_MERCURY: ShowcaseRef = {
  l: 'Wikipedia, Project Mercury / Mercury spacecraft: 3.3 m, 1.8 m base; NASA photographs (Commons "Mercury capsule HD", "Boilerplate Mercury Capsule")',
  u: 'https://en.wikipedia.org/wiki/Project_Mercury',
};
const REF_GEMINI: ShowcaseRef = {
  l: 'Wikipedia, Gemini spacecraft: 5.736 m, 3.048 m adapter base, 2.3 m re-entry module; NASA cutaway and photographs (Commons "Gemini spacecraft", "Gemini 9a spacecraft on display", "Gemini 7 in orbit")',
  u: 'https://en.wikipedia.org/wiki/Gemini_(spacecraft)',
};
const REF_SOYUZ: ShowcaseRef = {
  l: 'Wikipedia, Soyuz (spacecraft): module lengths (orbital 2.98, descent 2.24, service 2.26), 2.72 m diameter; ISS photographs (Commons "Soyuz TMA-7 spacecraft2edit1", "Soyuz TMA-16 approaching ISS")',
  u: 'https://en.wikipedia.org/wiki/Soyuz_(spacecraft)',
};
const REF_PROGRESS: ShowcaseRef = {
  l: 'Wikipedia, Progress (spacecraft): cargo, refuelling and service modules, length 7.23 m (M), solar panels first on Progress M; ISS photographs (Commons "ISS Progress cargo spacecraft")',
  u: 'https://en.wikipedia.org/wiki/Progress_(spacecraft)',
};

const soyuz = (total: number, span: number, chord: number): ShowcaseModel => ({
  build: () => buildSoyuz(total, span, chord),
  heightM: total,
  diameterM: 2.72,
  refs: [REF_SOYUZ],
});
const progress = (total: number, refuel: number, span: number | null): ShowcaseModel => ({
  build: () => buildProgress(total, refuel, span),
  heightM: total,
  diameterM: 2.72,
  refs: [REF_PROGRESS],
});

export const SHOWCASE: Record<string, ShowcaseModel> = {
  vostok: { build: () => buildVostok(false), heightM: 4.55, diameterM: 2.43, refs: [REF_VOSTOK] },
  voskhod: { build: () => buildVostok(true), heightM: 5.0, diameterM: 2.43, refs: [REF_VOSTOK] },
  'mercury-capsule': { build: buildMercury, heightM: 3.3, diameterM: 1.8, refs: [REF_MERCURY] },
  gemini: { build: buildGemini, heightM: 5.736, diameterM: 3.048, refs: [REF_GEMINI] },
  'soyuz-7k-ok': soyuz(7.95, 9.8, 1.8),
  'soyuz-t': soyuz(7.48, 10.6, 1.3),
  'soyuz-tm': soyuz(7.48, 10.6, 1.3),
  'soyuz-tma': soyuz(7.48, 10.7, 1.3),
  'soyuz-ms': soyuz(7.48, 10.7, 1.3),
  'progress-7k-tg': progress(7.94, 2.0, null),
  'progress-m': progress(7.23, 1.78, 10.6),
  'progress-ms': progress(7.4, 1.78, 10.7),
};
