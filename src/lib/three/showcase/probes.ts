/**
 * Showcase models: the deep-space probes (Cassini–Huygens, Galileo, Rosetta–Philae, Hayabusa and
 * Hayabusa2, OSIRIS-REx, the Venera and Vega landers with their buses, Giotto), built to the bar
 * of the Apollo LM and Curiosity: crinkled foil on the blanketed bodies, the real part layout, the
 * recognisable silhouette first.
 *
 * The part that descends or lands is a NAMED child group so a descent scene can detach it:
 * 'huygens' (Cassini), 'probe' (Galileo), 'philae' (Rosetta), 'src' (Hayabusa, Hayabusa2,
 * OSIRIS-REx), 'tagsam' (OSIRIS-REx), 'descent-sphere' (Venera, Vega), 'balloon' (Vega). The same
 * parts are exported on their own: buildHuygensProbe, buildGalileoProbe, buildPhilae,
 * buildVeneraLander, buildSampleReturnCapsule.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function pal(): Record<string, Mat> {
  return {
    gold: mat(0xd2a23a, 0.55, 0.38, true),
    amber: mat(0xa8692a, 0.5, 0.45, true),
    silver: mat(0xc9ccd2, 0.55, 0.35, true),
    grey: mat(0x8f9298, 0.5, 0.5, true),
    black: mat(0x17181b, 0.5, 0.6, true),
    dark: mat(0x2b2d31, 0.5, 0.6),
    navy: mat(0x1c2342, 0.5, 0.6),
    white: mat(0xe6e4de, 0.5, 0.5),
    metal: mat(0xaeb2b9, 0.55, 0.4),
    solar: mat(0x15234c, 0.5, 0.32),
    cell: mat(0x7d8cb4, 0.5, 0.4),
    copper: mat(0x86532f, 0.5, 0.7),
    char: mat(0x2e251f, 0.5, 0.8),
    bell: mat(0x3a3733, 0.55, 0.55, true),
    mesh: Object.assign(mat(0xd8c9a0, 0.5, 0.5), {
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    dbl: Object.assign(mat(0xe6e4de, 0.15, 0.55), { side: THREE.DoubleSide }),
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
  rt: number,
  rb: number,
  h: number,
  x: number,
  y0: number,
  z: number,
  seg: number,
  amp: number,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.CylinderGeometry(rt, rb, h, seg, Math.max(1, Math.round(h / 0.25))),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y0 + h / 2, z);
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

function sph(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  x: number,
  y: number,
  z: number,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), m);
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

function dishRibs(
  d: THREE.Group,
  m: Mat,
  R: number,
  depth: number,
  count: number,
  r: number,
): void {
  for (let k = 0; k < count; k++) {
    const a = (k / count) * TAU;
    let prev = V(0, 0, 0);
    for (let i = 1; i <= 5; i++) {
      const rr = (R * i) / 5;
      const p = V(Math.cos(a) * rr, depth * (rr / R) ** 2, Math.sin(a) * rr);
      strut(d, m, prev, p, r, 4);
      prev = p;
    }
  }
}

/** Thin quads laid out as a w × h grid of lines, facing +z (solar-cell gaps, tile seams). */
function gridGeo(w: number, h: number, nx: number, ny: number, t: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const quad = (x0: number, y0: number, x1: number, y1: number): void => {
    const n = pos.length / 3;
    pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
  };
  for (let i = 0; i <= nx; i++) {
    const x = -w / 2 + (w * i) / nx;
    quad(x - t / 2, -h / 2, x + t / 2, h / 2);
  }
  for (let j = 0; j <= ny; j++) {
    const y = -h / 2 + (h * j) / ny;
    quad(-w / 2, y - t / 2, w / 2, y + t / 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** A solar panel w × h facing +z: silver frame, dark cells, a grid of cell gaps. */
function solarPanel(
  M: Record<string, Mat>,
  w: number,
  h: number,
  nx: number,
  ny: number,
): THREE.Group {
  const p = new THREE.Group();
  box(p, M.silver, w, h, 0.04, 0, 0, 0);
  box(p, M.solar, w - 0.07, h - 0.07, 0.01, 0, 0, 0.022);
  const lines = new THREE.Mesh(gridGeo(w - 0.07, h - 0.07, nx, ny, 0.008), M.cell);
  lines.position.z = 0.0275;
  add(p, lines);
  return p;
}

function lattice(
  g: THREE.Object3D,
  m: Mat,
  a: THREE.Vector3,
  b: THREE.Vector3,
  half: number,
  bays: number,
  r: number,
): void {
  const grp = new THREE.Group();
  const len = a.distanceTo(b);
  const c: [number, number][] = [
    [half, 0],
    [-half * 0.5, -half * 0.87],
    [-half * 0.5, half * 0.87],
  ];
  for (const [y, z] of c) strut(grp, m, V(0, y, z), V(len, y, z), r, 5);
  for (let i = 0; i <= bays; i++) {
    const x = (len * i) / bays;
    for (let k = 0; k < 3; k++) {
      const p = c[k];
      const q = c[(k + 1) % 3];
      strut(grp, m, V(x, p[0], p[1]), V(x, q[0], q[1]), r * 0.7, 4);
    }
  }
  grp.position.copy(a);
  grp.quaternion.setFromUnitVectors(V(1, 0, 0), b.clone().sub(a).normalize());
  g.add(grp);
}

/** A finned RTG cylinder along +x of its group, starting at x = 0. */
function rtgUnit(M: Record<string, Mat>, len: number, r: number): THREE.Group {
  const u = new THREE.Group();
  const body = cyl(u, M.dark, r, r, len, 0, 0, 0, 16);
  body.rotation.z = Math.PI / 2;
  body.position.set(len / 2, 0, 0);
  for (let i = 0; i < 8; i++) {
    const f = cyl(u, M.silver, r * 1.55, r * 1.55, 0.018, 0, 0, 0, 16);
    f.rotation.z = Math.PI / 2;
    f.position.set(len * (0.12 + (0.76 * i) / 7), 0, 0);
  }
  return u;
}

/** Stand on y = 0 at the stated height (the whole craft, wings and booms included). */
function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ─── Sample return capsule (Hayabusa 0.4 m, OSIRIS-REx 0.81 m) ───────────────────────────────

/**
 * A sample return capsule on its own: heat shield apex at y = 0 pointing down (the flight
 * direction), backshell with the parachute lid above. `diameterM` 0.81 is OSIRIS-REx's; Hayabusa
 * and Hayabusa2 carry the 0.4 m capsule.
 */
export function buildSampleReturnCapsule(opts: { diameterM?: number } = {}): THREE.Group {
  const D = opts.diameterM ?? 0.81;
  const M = pal();
  const g = new THREE.Group();
  const R = D / 2;
  const nose = R * 0.42;
  const noseY = (r: number): number => nose - Math.sqrt(nose * nose - r * r);
  const tanR = nose * 0.87;
  const coneTopY = noseY(tanR) + (R - tanR) / Math.tan((60 * Math.PI) / 180);
  const fore: [number, number][] = [];
  for (let i = 0; i <= 5; i++) {
    const r = (tanR * i) / 5;
    fore.push([Math.max(r, 0.001), noseY(r)]);
  }
  fore.push([R, coneTopY], [R * 1.02, coneTopY + R * 0.05]);
  lathe(g, M.char, fore, 32);
  // Ablator tile seams on the heat shield.
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    strut(
      g,
      M.black,
      V(Math.cos(a) * tanR, noseY(tanR) + 0.002, Math.sin(a) * tanR),
      V(Math.cos(a) * R * 0.99, coneTopY, Math.sin(a) * R * 0.99),
      R * 0.012,
      4,
    );
  }
  const jointY = coneTopY + R * 0.05;
  const back = crinkle(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(R * 1.0, jointY),
        new THREE.Vector2(R * 0.8, jointY + R * 0.5),
        new THREE.Vector2(R * 0.42, jointY + R * 0.78),
        new THREE.Vector2(R * 0.3, jointY + R * 0.84),
        new THREE.Vector2(0.0, jointY + R * 0.86),
      ],
      32,
    ),
    R * 0.004,
  );
  add(g, new THREE.Mesh(back, mat(0xbfae8a, 0.5, 0.6, true)));
  cyl(g, M.dark, R * 0.3, R * 0.3, R * 0.04, 0, jointY + R * 0.84, 0, 20);
  const bandY = jointY + R * 0.02;
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 0.995, R * 0.025, 6, 40), M.dark);
  band.rotation.x = Math.PI / 2;
  band.position.y = bandY;
  add(g, band);
  return g;
}

// ─── Huygens ─────────────────────────────────────────────────────────────────────────────────

/**
 * The Huygens probe on its own, 2.7 m across: the 60° front shield (apex at y = 0, flight
 * direction down), the dark after cone with its ridges, the gold-foil back cover on top.
 */
export function buildHuygensProbe(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const R = 1.35;
  const Rn = 0.35;
  const ny = (r: number): number => Rn - Math.sqrt(Rn * Rn - r * r);
  const shield: [number, number][] = [
    [0.001, 0],
    [0.1, ny(0.1)],
    [0.2, ny(0.2)],
    [0.3, ny(0.3)],
    [R, 0.78],
    [R + 0.02, 0.8],
    [R + 0.02, 0.86],
    [R - 0.05, 0.88],
  ];
  lathe(g, M.char, shield, 48);
  // A lighter wedge of the ablator, as the flight shield was tiled.
  const wedge = new THREE.Mesh(
    new THREE.LatheGeometry(
      shield.slice(1, 5).map(([r, y]) => new THREE.Vector2(r * 1.004, y + 0.004)),
      6,
      0.4,
      0.5,
    ),
    mat(0x5a4636, 0.5, 0.85),
  );
  add(g, wedge);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    strut(
      g,
      M.black,
      V(Math.cos(a) * 0.3, 0.17, Math.sin(a) * 0.3),
      V(Math.cos(a) * R * 0.98, 0.78, Math.sin(a) * R * 0.98),
      0.012,
      4,
    );
  }
  lathe(
    g,
    M.black,
    [
      [R - 0.05, 0.88],
      [1.12, 1.02],
      [1.0, 1.06],
    ],
    48,
  );
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    strut(
      g,
      M.metal,
      V(Math.cos(a) * (R - 0.07), 0.9, Math.sin(a) * (R - 0.07)),
      V(Math.cos(a) * 1.03, 1.05, Math.sin(a) * 1.03),
      0.014,
      4,
    );
  }
  const cover = crinkle(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(1.0, 1.06),
        new THREE.Vector2(0.85, 1.18),
        new THREE.Vector2(0.55, 1.28),
        new THREE.Vector2(0.2, 1.32),
        new THREE.Vector2(0.0, 1.32),
      ],
      40,
      0,
      TAU,
    ),
    0.014,
  );
  add(g, new THREE.Mesh(cover, M.gold));
  cyl(g, M.black, 0.12, 0.12, 0.025, 0, 1.31, 0, 20);
  return g;
}

// ─── Cassini ─────────────────────────────────────────────────────────────────────────────────

function louvre(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  r: number,
  yaw: number,
  y: number,
): void {
  const grp = new THREE.Group();
  box(grp, M.dark, 0.78, 0.55, 0.04, 0, 0, 0);
  for (let i = 0; i < 9; i++) box(grp, M.silver, 0.06, 0.5, 0.05, -0.34 + i * 0.085, 0, 0.03);
  grp.position.set(Math.sin(yaw) * r, y, Math.cos(yaw) * r);
  grp.rotation.y = yaw;
  g.add(grp);
}

function buildCassiniCraft(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  // Propulsion module and lower equipment: the gold decagon with the two main engines.
  foilCyl(g, M.gold, 0.55, 1.05, 0.45, 0, 0.12, 0, 10, 0.02);
  foilCyl(g, M.gold, 1.05, 1.05, 1.65, 0, 0.57, 0, 10, 0.03);
  for (const sx of [-1, 1]) {
    lathe(g, M.bell, [
      [0.23, 0],
      [0.16, 0.26],
      [0.1, 0.5],
    ]).position.set(sx * 0.3, 0.02, 0);
  }
  foilCyl(g, M.gold, 1.2, 1.2, 1.35, 0, 2.22, 0, 10, 0.03);
  foilCyl(g, M.black, 1.215, 1.215, 0.22, 0, 2.22, 0, 10, 0.012);
  foilCyl(g, M.amber, 1.205, 1.205, 0.3, 0, 3.27, 0, 10, 0.014);
  // Upper equipment module, its radiators, the deck under the dish.
  foilCyl(g, M.gold, 1.4, 1.4, 0.8, 0, 3.57, 0, 10, 0.03);
  foilCyl(g, M.silver, 1.42, 1.42, 0.1, 0, 3.57, 0, 10, 0.012);
  cyl(g, M.dark, 1.4, 1.4, 0.04, 0, 4.37, 0, 20);
  for (const yaw of [0.7, 2.8, 4.9]) louvre(g, M, 1.44, yaw, 4.0);

  // The 4 m high-gain antenna on its collar, and the tripod carrying the low-gain antenna.
  const hga = paraDish(M.dbl, 2.0, 0.65);
  hga.position.y = 4.8;
  add(g, hga);
  dishRibs(hga, M.silver, 2.0, 0.65, 16, 0.014);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.025, 6, 60), M.metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.8 + 0.65;
  add(g, rim);
  cyl(g, M.silver, 0.65, 0.35, 0.42, 0, 4.4, 0, 16);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    strut(
      g,
      M.silver,
      V(Math.cos(a) * 1.15, 4.4, Math.sin(a) * 1.15),
      V(Math.cos(a) * 1.25, 4.8 + 0.65 * 0.39, Math.sin(a) * 1.25),
      0.03,
      6,
    );
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    strut(
      g,
      M.white,
      V(Math.cos(a) * 1.8, 4.8 + 0.65 * 0.81, Math.sin(a) * 1.8),
      V(0, 6.65, 0),
      0.03,
      6,
    );
  }
  const sub = paraDish(M.silver, 0.38, 0.09);
  sub.rotation.x = Math.PI;
  sub.position.y = 6.45;
  add(g, sub);
  cyl(g, M.white, 0.1, 0.12, 0.2, 0, 6.5, 0, 14);
  strut(g, M.metal, V(0, 6.68, 0), V(0, 6.82, 0), 0.015, 4);

  // Remote-sensing pallet on the front (+z): the camera and spectrometer barrels.
  box(g, M.navy, 0.95, 1.3, 0.9, 0, 3.05, 1.45);
  foilBox(g, M.gold, 0.97, 0.3, 0.92, 0, 3.55, 1.45, 0.015);
  for (const [x, y, r, len, m] of [
    [-0.27, 3.15, 0.13, 0.65, M.white],
    [0.08, 3.25, 0.09, 0.4, M.white],
    [0.3, 2.7, 0.15, 0.5, M.gold],
    [-0.3, 2.7, 0.1, 0.4, M.metal],
  ] as [number, number, number, number, Mat][]) {
    const t = cyl(g, m, r, r, len, 0, 0, 0, 16);
    t.rotation.x = Math.PI / 2;
    t.position.set(x, y, 1.9 + len / 2);
    const lens = cyl(g, M.black, r * 0.85, r * 0.85, 0.02, 0, 0, 0, 16);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(x, y, 1.9 + len + 0.005);
  }
  // Fields-and-particles pallet on -x, the radar bay at the back, the stowed magnetometer boom.
  box(g, M.metal, 0.9, 1.1, 0.8, -1.65, 3.0, 0.1);
  sph(g, M.silver, 0.22, -1.95, 3.45, 0.55);
  cyl(g, M.dark, 0.1, 0.1, 0.5, -1.6, 3.55, -0.2, 12);
  foilBox(g, M.gold, 1.25, 1.2, 0.4, 0, 2.85, -1.4, 0.02);
  box(g, M.black, 0.8, 0.8, 0.05, 0, 2.85, -1.62);
  foilBox(g, M.amber, 0.24, 3.1, 0.24, 1.0, 2.75, -1.2, 0.015);
  for (const y of [1.4, 2.75, 4.0]) box(g, M.silver, 0.32, 0.05, 0.32, 1.0, y, -1.2);

  // The three RTGs on outriggers, each with its radiator shield.
  for (const phi of [Math.PI / 3, Math.PI, (5 * Math.PI) / 3]) {
    const px = Math.sin(phi) * 1.75;
    const pz = Math.cos(phi) * 1.75;
    const u = rtgUnit(M, 1.1, 0.2);
    u.position.set(px - Math.cos(phi) * 0.55, 0.95, pz + Math.sin(phi) * 0.55);
    u.rotation.y = phi;
    add(g, u);
    const shield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 1.25, 14, 1, true, 0, Math.PI),
      M.dbl,
    );
    shield.rotation.z = Math.PI / 2;
    const sh = new THREE.Group();
    sh.add(shield);
    sh.position.set(px, 0.98, pz);
    sh.rotation.y = phi;
    add(g, sh);
    strut(
      g,
      M.silver,
      V(Math.sin(phi) * 0.95, 1.15, Math.cos(phi) * 0.95),
      V(px, 0.85, pz),
      0.04,
      6,
    );
    strut(
      g,
      M.silver,
      V(Math.sin(phi) * 0.95, 0.65, Math.cos(phi) * 0.95),
      V(px, 0.85, pz),
      0.04,
      6,
    );
  }

  // Huygens on the +x side, its shield facing out, on a three-point truss.
  const hu = buildHuygensProbe();
  hu.name = 'huygens';
  hu.rotation.z = Math.PI / 2;
  hu.position.set(1.58 + 1.32, 2.75, 0);
  add(g, hu);
  for (const [y, z] of [
    [1.7, 0.0],
    [3.5, 0.7],
    [3.5, -0.7],
  ])
    strut(g, M.silver, V(1.1, y, z * 0.6), V(1.62, 2.75 + (y - 2.75) * 0.7, z), 0.035, 6);
  return g;
}

// ─── Galileo ─────────────────────────────────────────────────────────────────────────────────

/** The Galileo atmospheric entry probe on its own: 1.26 m across, apex down at y = 0. */
export function buildGalileoProbe(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const Rn = 0.22;
  const ny = (r: number): number => Rn - Math.sqrt(Rn * Rn - r * r);
  lathe(
    g,
    M.char,
    [
      [0.001, 0],
      [0.06, ny(0.06)],
      [0.12, ny(0.12)],
      [0.156, 0.064],
      [0.63, 0.538],
      [0.645, 0.56],
    ],
    40,
  );
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    strut(
      g,
      M.black,
      V(Math.cos(a) * 0.16, 0.07, Math.sin(a) * 0.16),
      V(Math.cos(a) * 0.62, 0.53, Math.sin(a) * 0.62),
      0.007,
      4,
    );
  }
  lathe(
    g,
    M.dark,
    [
      [0.645, 0.56],
      [0.63, 0.6],
      [0.6, 0.62],
    ],
    40,
  );
  lathe(
    g,
    M.metal,
    [
      [0.6, 0.62],
      [0.4, 0.82],
      [0.3, 0.87],
      [0.001, 0.88],
    ],
    40,
  );
  const joint = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.014, 6, 40), M.black);
  joint.rotation.x = Math.PI / 2;
  joint.position.y = 0.59;
  add(g, joint);
  cyl(g, M.silver, 0.08, 0.08, 0.04, 0, 0.88, 0, 12);
  return g;
}

function buildGalileoCraft(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const probe = buildGalileoProbe();
  probe.name = 'probe';
  add(g, probe);
  cyl(g, M.dark, 0.72, 0.72, 0.14, 0, 0.87, 0, 16);
  // Despun section: octagon of gold foil, the scan platform out the front.
  foilCyl(g, M.gold, 0.95, 0.95, 0.95, 0, 1.0, 0, 8, 0.02);
  cyl(g, M.dark, 1.0, 1.0, 0.1, 0, 1.95, 0, 24);
  box(g, M.silver, 0.2, 0.2, 1.1, 0, 1.45, 1.45);
  const cam = cyl(g, M.metal, 0.2, 0.2, 0.9, 0, 0, 0, 16);
  cam.rotation.x = Math.PI / 2;
  cam.position.set(0.28, 1.55, 1.95);
  const lens = cyl(g, M.black, 0.17, 0.17, 0.02, 0, 0, 0, 16);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.28, 1.55, 2.41);
  box(g, M.white, 0.42, 0.38, 0.5, -0.3, 1.5, 1.8);
  cyl(g, M.gold, 0.1, 0.1, 0.6, -0.1, 1.2, 2.05, 12).rotation.x = Math.PI / 2;
  box(g, M.white, 1.0, 0.03, 1.1, 0, 1.9, 1.55);
  // Spun section: the octagonal drum, louvres and the retro-propulsion band.
  foilCyl(g, M.gold, 1.1, 1.1, 1.1, 0, 2.05, 0, 8, 0.025);
  foilCyl(g, M.black, 1.115, 1.115, 0.18, 0, 2.05, 0, 8, 0.01);
  for (const yaw of [0.4, 1.97, 3.54, 5.11]) {
    const l = new THREE.Group();
    box(l, M.black, 0.5, 0.65, 0.03, 0, 0, 0);
    for (let i = 0; i < 6; i++) box(l, M.silver, 0.04, 0.6, 0.04, -0.2 + i * 0.08, 0, 0.03);
    l.position.set(Math.sin(yaw) * 1.1, 2.7, Math.cos(yaw) * 1.1);
    l.rotation.y = yaw;
    add(g, l);
  }
  cyl(g, M.dark, 1.1, 1.1, 0.06, 0, 3.15, 0, 24);
  // The umbrella high-gain antenna: ribs, gold mesh, the feed on its tripod.
  cyl(g, M.gold, 0.25, 0.3, 0.35, 0, 3.15, 0, 14);
  const hga = paraDish(M.mesh, 2.4, 1.05, 16);
  hga.position.y = 3.5;
  add(g, hga);
  dishRibs(hga, M.gold, 2.4, 1.05, 18, 0.016);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.02, 6, 72), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.55;
  add(g, rim);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.3;
    strut(g, M.silver, V(Math.cos(a) * 2.4, 4.55, Math.sin(a) * 2.4), V(0, 5.25, 0), 0.025, 5);
  }
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 14), M.metal);
  horn.rotation.x = Math.PI;
  horn.position.y = 5.2;
  add(g, horn);
  cyl(g, M.white, 0.06, 0.06, 0.22, 0, 5.3, 0, 10);

  // The two RTG booms (+x and -x), each ending in a finned RTG.
  for (const s of [-1, 1]) {
    strut(g, M.silver, V(s * 1.05, 2.55, 0), V(s * 2.0, 2.55, 0), 0.06, 8);
    strut(g, M.silver, V(s * 1.05, 2.25, 0), V(s * 2.0, 2.5, 0), 0.03, 6);
    const u = rtgUnit(M, 1.3, 0.2);
    u.position.set(s * 1.95, 2.55, 0);
    u.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, u);
  }
  // The 10.9 m magnetometer boom, out the back, with its sensors.
  cyl(g, M.dark, 0.16, 0.16, 0.3, 0, 0, 0, 12).rotation.x = Math.PI / 2;
  const base = g.children[g.children.length - 1];
  base.position.set(0, 2.55, -1.2);
  lattice(g, M.silver, V(0, 2.55, -1.3), V(0, 2.5, -12.2), 0.1, 22, 0.012);
  for (const z of [-5.5, -8.8, -12.2]) foilBox(g, M.gold, 0.24, 0.24, 0.3, 0, 2.5, z, 0.01);
  return g;
}

// ─── Philae ──────────────────────────────────────────────────────────────────────────────────

/**
 * Philae on its own: the hexagonal body under a skin of solar cells, the tripod landing gear with
 * its footpads, the drill. Feet on y = 0; the top (cameras, the balcony) up.
 */
export function buildPhilae(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const RAD = 0.56;
  const Y0 = 0.42;
  const BODYH = 0.74;
  box(g, M.dark, 0.2, 0.2, 0.2, 0, Y0 - 0.08, 0);
  const hex: [number, number][] = [];
  for (let i = 0; i < 6; i++)
    hex.push([Math.cos((i / 6) * TAU) * RAD, Math.sin((i / 6) * TAU) * RAD]);
  const shape = new THREE.Shape(hex.map(([x, z]) => new THREE.Vector2(x, z)));
  const prism = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: BODYH, bevelEnabled: false }),
    M.dark,
  );
  prism.rotation.x = -Math.PI / 2;
  prism.position.y = Y0;
  add(g, prism);
  const panelW = RAD;
  for (let i = 0; i < 6; i++) {
    const a = ((i + 0.5) / 6) * TAU;
    const ap = RAD * Math.cos(Math.PI / 6);
    const p = solarPanel(M, panelW - 0.04, BODYH - 0.06, 8, 12);
    p.position.set(Math.cos(a) * (ap + 0.02), Y0 + BODYH / 2, -Math.sin(a) * (ap + 0.02));
    p.rotation.y = Math.PI / 2 + a;
    add(g, p);
  }
  // The top: solar cells and the two lighter radiator strips.
  const lid = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.solar);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = Y0 + BODYH + 0.004;
  add(g, lid);
  const lidLines = new THREE.Mesh(gridGeo(RAD * 1.7, RAD * 1.7, 14, 14, 0.008), M.cell);
  lidLines.rotation.x = -Math.PI / 2;
  lidLines.position.y = Y0 + BODYH + 0.008;
  add(g, lidLines);
  for (const sx of [-0.17, 0.17]) box(g, M.cell, 0.16, 0.006, 0.55, sx, Y0 + BODYH + 0.012, -0.05);
  // Balcony instruments: the gold camera column, lens barrels, antenna stubs.
  cyl(g, M.white, 0.11, 0.11, 0.42, 0.33, Y0 + BODYH, 0.1, 16);
  cyl(g, M.gold, 0.115, 0.115, 0.05, 0.33, Y0 + BODYH + 0.37, 0.1, 16);
  box(g, M.grey, 0.2, 0.12, 0.3, -0.25, Y0 + BODYH + 0.06, 0.2);
  for (const [x, z, a] of [
    [0.08, 0.52, 0],
    [-0.45, -0.28, 2.1],
  ] as [number, number, number][]) {
    const lens = cyl(g, M.black, 0.045, 0.06, 0.14, 0, 0, 0, 12);
    lens.position.set(x, Y0 + BODYH * 0.55, z);
    lens.rotation.set(Math.PI / 2, 0, a);
  }
  for (const s of [-1, 1])
    strut(g, M.dark, V(s * 0.45, Y0 + 0.02, 0.05), V(s * 1.45, Y0 + 0.02, 0.05), 0.006, 4);
  // Landing gear: three legs to dished feet, each with an ice screw; the drill in the middle.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 6;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const top = V(dx * 0.45, Y0 + 0.08, dz * 0.45);
    const elbow = V(dx * 0.78, Y0 - 0.02, dz * 0.78);
    const foot = V(dx * 0.92, 0.12, dz * 0.92);
    strut(g, M.black, top, elbow, 0.03, 8);
    strut(g, M.black, V(dx * 0.2, Y0 - 0.12, dz * 0.2), elbow, 0.022, 6);
    strut(g, M.metal, elbow, foot, 0.03, 8);
    cyl(g, M.white, 0.12, 0.09, 0.05, foot.x, 0, foot.z, 20);
    cyl(g, M.dark, 0.012, 0.012, 0.16, foot.x, 0.04, foot.z, 6);
  }
  cyl(g, M.dark, 0.05, 0.05, 0.3, 0, 0.1, 0, 10);
  cyl(g, M.gold, 0.07, 0.07, 0.04, 0, 0.1, 0, 10);
  return g;
}

// ─── Rosetta ─────────────────────────────────────────────────────────────────────────────────

function buildRosettaCraft(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const Y0 = 0.35;
  const H = 2.8;
  // Launch-adapter ring, then the box under silver-grey foil with black and gold patches.
  cyl(g, M.dark, 0.95, 1.0, Y0, 0, 0, 0, 24);
  foilBox(g, M.grey, 2.1, H, 2.0, 0, Y0 + H / 2, 0, 0.03);
  for (const s of [-1, 1]) {
    const p = foilSheet(M.black, 1.7, 1.1, 0.02);
    p.position.set(s * 1.09, Y0 + 1.9, 0.1);
    p.rotation.y = s * (Math.PI / 2);
    add(g, p);
    const q = foilSheet(M.gold, 1.3, 0.8, 0.02);
    q.position.set(s * 1.092, Y0 + 0.75, -0.3);
    q.rotation.y = s * (Math.PI / 2);
    add(g, q);
  }
  const bk = foilSheet(M.black, 1.8, 1.6, 0.02);
  bk.position.set(0, Y0 + 1.2, -1.06);
  bk.rotation.y = Math.PI;
  add(g, bk);
  box(g, M.dark, 2.14, 0.05, 2.04, 0, Y0 + H + 0.02, 0);
  // Top deck: the camera barrels, spectrometer, star trackers, the little microwave dish.
  const top = Y0 + H + 0.045;
  for (const [x, z, r, len, m] of [
    [-0.55, 0.45, 0.14, 0.75, M.white],
    [-0.2, 0.55, 0.1, 0.4, M.white],
    [0.45, 0.4, 0.17, 0.55, M.gold],
    [0.6, -0.3, 0.12, 0.45, M.metal],
  ] as [number, number, number, number, Mat][]) {
    cyl(g, m, r, r, len, x, top, z, 16);
    cyl(g, M.black, r * 0.8, r * 0.8, 0.02, x, top + len, z, 16);
  }
  box(g, M.metal, 0.5, 0.3, 0.4, -0.4, top + 0.15, -0.45);
  box(g, M.gold, 0.4, 0.22, 0.3, 0.05, top + 0.11, -0.55);
  for (const x of [-0.85, 0.85]) {
    box(g, M.dark, 0.22, 0.22, 0.22, x, top + 0.11, -0.7);
    cyl(g, M.black, 0.06, 0.09, 0.2, x, top + 0.22, -0.7, 10);
  }
  const mdish = paraDish(M.dbl, 0.17, 0.05, 6);
  mdish.position.set(0.1, top + 0.3, 0.1);
  mdish.rotation.x = 0.4;
  add(g, mdish);
  box(g, M.silver, 0.1, 0.3, 0.1, 0.1, top + 0.15, 0.1);

  // The 2.2 m high-gain antenna on the front, canted, on its boom.
  const hgaG = new THREE.Group();
  const hga = paraDish(M.dbl, 1.1, 0.28, 12);
  hga.position.y = 0.55;
  hgaG.add(hga);
  dishRibs(hga, M.silver, 1.1, 0.28, 12, 0.012);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    strut(
      hgaG,
      M.silver,
      V(Math.cos(a) * 1.05, 0.55 + 0.26, Math.sin(a) * 1.05),
      V(0, 1.4, 0),
      0.02,
      5,
    );
  }
  cyl(hgaG, M.gold, 0.08, 0.08, 0.15, 0, 1.38, 0, 10);
  strut(hgaG, M.silver, V(0, 0, 0), V(0, 0.55, 0), 0.05, 8);
  hgaG.position.set(0, Y0 + 1.55, 1.06);
  hgaG.rotation.x = Math.PI / 2 - 0.35;
  add(g, hgaG);

  // Solar wings: five panels each, 14 m, face on to the front.
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    const root = 1.05;
    strut(wing, M.dark, V(s * root, Y0 + 1.5, 0), V(s * (root + 0.6), Y0 + 1.5, 0), 0.05, 8);
    for (let i = 0; i < 5; i++) {
      const p = solarPanel(M, 2.8, 2.25, 14, 12);
      p.position.set(s * (root + 0.6 + 1.4 + i * 2.88), Y0 + 1.5, 0);
      wing.add(p);
      if (i > 0)
        strut(
          wing,
          M.silver,
          V(s * (root + 0.6 + i * 2.88 - 0.04), Y0 + 0.5, 0),
          V(s * (root + 0.6 + i * 2.88 - 0.04), Y0 + 2.5, 0),
          0.02,
          6,
        );
    }
    add(g, wing);
  }

  // Philae on the back wall, its feet on the body, its top out.
  const ph = buildPhilae();
  ph.name = 'philae';
  ph.rotation.x = -Math.PI / 2;
  ph.position.set(0, Y0 + 1.5, -1.06);
  add(g, ph);
  // Thruster pods at the lower corners.
  for (const [x, z] of [
    [1.0, 0.95],
    [-1.0, 0.95],
    [1.0, -0.95],
    [-1.0, -0.95],
  ]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), M.bell);
    t.position.set(x * 1.02, Y0 + 0.25, z * 1.02);
    t.rotation.z = x > 0 ? -Math.PI / 2.4 : Math.PI / 2.4;
    add(g, t);
  }
  return g;
}

// ─── Hayabusa and Hayabusa2 ──────────────────────────────────────────────────────────────────

function buildHayabusaCraft(variant: 'h1' | 'h2'): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const BW = 1.0;
  const BD = 1.6;
  const BH = 1.25;
  const Y0 = 1.0;
  const cx = Y0 + BH / 2;
  const body = variant === 'h1' ? M.gold : M.grey;
  foilBox(g, body, BW, BH, BD, 0, cx, 0, 0.025);
  for (const s of [-1, 1]) {
    const p = foilSheet(variant === 'h1' ? M.amber : M.silver, 1.2, 0.95, 0.018);
    p.position.set(s * (BW / 2 + 0.055), cx, 0.15);
    p.rotation.y = s * (Math.PI / 2);
    add(g, p);
  }
  const frontP = foilSheet(M.black, 0.8, 0.7, 0.015);
  frontP.position.set(-0.05, cx + 0.2, BD / 2 + 0.055);
  add(g, frontP);
  // Underside: the sampler horn on its bellows, four ion engines.
  const hx = 0;
  const hz = 0.2;
  cyl(g, M.dark, 0.14, 0.14, 0.12, hx, Y0 - 0.12, hz, 16);
  for (let i = 0; i < 11; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.022, 6, 18), M.silver);
    t.rotation.x = Math.PI / 2;
    t.position.set(hx, 0.4 + i * 0.06, hz);
    add(g, t);
  }
  cyl(g, M.dark, 0.08, 0.08, 0.7, hx, 0.3, hz, 10);
  lathe(g, M.metal, [
    [0.08, 0.34],
    [0.15, 0.2],
    [0.22, 0.04],
    [0.24, 0.0],
  ]).position.set(hx, 0, hz);
  for (const [x, z] of [
    [-0.28, -0.5],
    [0.28, -0.5],
    [-0.28, 0.55],
    [0.28, 0.55],
  ]) {
    cyl(g, M.gold, 0.09, 0.1, 0.18, x, Y0 - 0.17, z, 12);
    cyl(g, M.black, 0.06, 0.06, 0.02, x, Y0 - 0.19, z, 12);
  }
  // Top deck: the antenna, the star trackers, the camera cluster.
  const top = Y0 + BH;
  box(g, M.dark, BW + 0.02, 0.03, BD + 0.02, 0, top + 0.015, 0);
  if (variant === 'h1') {
    const dish = paraDish(M.dbl, 0.75, 0.12, 10);
    dish.position.set(0, top + 0.32, 0.05);
    dish.rotation.x = 0.28;
    add(g, dish);
    dishRibs(dish, M.silver, 0.75, 0.12, 10, 0.008);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      strut(
        g,
        M.silver,
        V(Math.cos(a) * 0.25, top, 0.05 + Math.sin(a) * 0.25),
        V(Math.cos(a) * 0.4, top + 0.32, 0.05 + Math.sin(a) * 0.4),
        0.014,
        5,
      );
    }
    cyl(g, M.gold, 0.08, 0.08, 0.15, 0, top + 0.4, 0.05, 10);
  } else {
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      box(a, M.white, 0.55, 0.045, 0.6, 0, 0, 0);
      box(a, M.gold, 0.5, 0.01, 0.55, 0, 0.026, 0);
      for (let i = 0; i < 5; i++) box(a, M.dark, 0.008, 0.012, 0.55, -0.2 + i * 0.1, 0.034, 0);
      a.position.set(s * 0.27, top + 0.2, -0.28);
      a.rotation.z = -s * 0.3;
      add(g, a);
      strut(g, M.silver, V(s * 0.27, top, -0.28), V(s * 0.27, top + 0.2, -0.28), 0.02, 6);
    }
    box(g, M.gold, 0.38, 0.14, 0.22, 0, top + 0.1, 0.45);
    for (const x of [-0.08, 0.08]) cyl(g, M.black, 0.045, 0.05, 0.12, x, top + 0.16, 0.45, 10);
    cyl(g, M.silver, 0.03, 0.03, 0.5, 0.3, top, 0.55, 6);
  }
  for (const x of [-0.3, 0.3]) {
    box(g, M.dark, 0.18, 0.1, 0.18, x, top + 0.08, 0.1);
    cyl(g, M.black, 0.055, 0.075, 0.1, x, top + 0.13, 0.1, 10);
  }
  // Hayabusa2's small carry-on impactor and the MINERVA-II hoppers.
  if (variant === 'h2') {
    cyl(g, M.silver, 0.19, 0.19, 0.5, 0, Y0 - 0.45, -0.55, 16);
    cyl(g, M.gold, 0.19, 0.12, 0.08, 0, Y0 - 0.53, -0.55, 16);
    for (const z of [-0.2, 0.3]) {
      const m2 = cyl(g, M.gold, 0.16, 0.16, 0.1, 0, 0, 0, 20);
      m2.rotation.z = Math.PI / 2;
      m2.position.set(-BW / 2 - 0.05, cx + 0.05, z);
    }
  }
  // The sample return capsule on the front, its shield out.
  const src = buildSampleReturnCapsule({ diameterM: 0.4 });
  src.name = 'src';
  src.rotation.x = -Math.PI / 2;
  const cap = new THREE.Box3().setFromObject(src);
  src.position.set(0.1, cx - 0.1, BD / 2 - cap.min.z - 0.08);
  add(g, src);

  // Solar wings: three panels each.
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    strut(wing, M.dark, V(s * (BW / 2), cx + 0.2, 0), V(s * (BW / 2 + 0.2), cx + 0.2, 0), 0.03, 6);
    for (let i = 0; i < 3; i++) {
      const p = solarPanel(M, 0.88, 1.25, 7, 10);
      p.position.set(s * (BW / 2 + 0.2 + 0.44 + i * 0.92), cx + 0.2, 0);
      wing.add(p);
    }
    add(g, wing);
  }
  return g;
}

// ─── OSIRIS-REx ──────────────────────────────────────────────────────────────────────────────

function buildOsirisRexCraft(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  const BW = 2.0;
  const BD = 2.4;
  const Y0 = 0.28;
  const BH = 2.3;
  cyl(g, M.dark, 0.85, 0.9, Y0, 0, 0, 0, 24);
  foilBox(g, M.grey, BW, BH, BD, 0, Y0 + BH / 2, 0, 0.03);
  for (const s of [-1, 1]) {
    const p = foilSheet(M.black, 1.7, 1.5, 0.02);
    p.position.set(s * (BW / 2 + 0.055), Y0 + 1.1, 0.1);
    p.rotation.y = s * (Math.PI / 2);
    add(g, p);
  }
  const fp = foilSheet(M.black, 1.2, 1.3, 0.02);
  fp.position.set(-0.3, Y0 + 1.0, BD / 2 + 0.055);
  add(g, fp);
  const bp = foilSheet(M.silver, 1.5, 1.4, 0.02);
  bp.position.set(0, Y0 + 1.2, -BD / 2 - 0.055);
  bp.rotation.y = Math.PI;
  add(g, bp);
  const deck = Y0 + BH;
  box(g, M.dark, BW + 0.02, 0.04, BD + 0.02, 0, deck + 0.02, 0);

  // Science deck: the camera suite, the laser altimeter, the spectrometers, star trackers.
  const dk = deck + 0.04;
  for (const [x, z, r, len, m] of [
    [0.55, 0.55, 0.16, 0.65, M.white],
    [0.2, 0.75, 0.1, 0.35, M.white],
    [-0.35, 0.85, 0.12, 0.4, M.metal],
  ] as [number, number, number, number, Mat][]) {
    cyl(g, m, r, r, len, x, dk, z, 16);
    cyl(g, M.black, r * 0.8, r * 0.8, 0.02, x, dk + len, z, 16);
  }
  box(g, M.silver, 0.5, 0.28, 0.4, -0.55, dk + 0.14, -0.55);
  cyl(g, M.black, 0.14, 0.18, 0.3, -0.55, dk + 0.28, -0.55, 14);
  cyl(g, M.gold, 0.15, 0.15, 0.3, 0.55, dk, -0.7, 16);
  box(g, M.dark, 0.2, 0.15, 0.2, -0.85, dk + 0.07, 0.6);
  cyl(g, M.black, 0.06, 0.08, 0.15, -0.85, dk + 0.15, 0.6, 10);

  // The sample return capsule, shield up, on the deck.
  const src = buildSampleReturnCapsule({ diameterM: 0.81 });
  src.name = 'src';
  src.rotation.x = Math.PI;
  const sb = new THREE.Box3().setFromObject(src);
  src.position.set(0.25, dk + (sb.max.y - sb.min.y) - 0.12, -0.05);
  add(g, src);

  // The 1.2 m high-gain dish on the front.
  const hgaG = new THREE.Group();
  const hga = paraDish(M.dbl, 0.62, 0.2, 12);
  hga.position.y = 0.32;
  hgaG.add(hga);
  dishRibs(hga, M.silver, 0.62, 0.2, 8, 0.01);
  const sub = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), M.gold);
  sub.position.y = 0.32 + 0.55;
  hgaG.add(sub);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    strut(
      hgaG,
      M.silver,
      V(Math.cos(a) * 0.55, 0.32 + 0.2 * 0.78, Math.sin(a) * 0.55),
      V(0, 0.87, 0),
      0.012,
      4,
    );
  }
  cyl(hgaG, M.metal, 0.12, 0.2, 0.32, 0, 0, 0, 14);
  hgaG.position.set(0.35, Y0 + 1.5, BD / 2 + 0.05);
  hgaG.rotation.x = Math.PI / 2 - 0.15;
  add(g, hgaG);

  // Solar arrays: one 1.9 m × 2.4 m panel each side, hinged high, canted back.
  for (const s of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    strut(wing, M.dark, V(s * (BW / 2), Y0 + 1.9, 0), V(s * (BW / 2 + 0.3), Y0 + 1.9, 0), 0.04, 8);
    const p = solarPanel(M, 1.9, 2.4, 9, 12);
    p.position.set(s * (BW / 2 + 0.3 + 0.95), Y0 + 1.9, 0);
    wing.add(p);
    add(g, wing);
  }

  // TAGSAM: the 3.35 m arm in its sampling reach out over the front, the head at the end.
  const ts = new THREE.Group();
  ts.name = 'tagsam';
  const sh = V(-0.7, dk + 0.12, 0.6);
  const el = V(-0.7, dk + 0.5, 2.1);
  const wr = V(-0.7, dk + 0.3, 3.6);
  cyl(ts, M.dark, 0.11, 0.11, 0.14, sh.x, sh.y - 0.07, sh.z, 14);
  strut(ts, M.dark, sh, el, 0.05, 10);
  strut(ts, M.dark, el, wr, 0.05, 10);
  for (const p of [sh, el, wr]) {
    const j = sph(ts, M.gold, 0.085, p.x, p.y, p.z, 12);
    j.scale.set(1, 0.8, 1);
  }
  const head = cyl(ts, M.silver, 0.17, 0.17, 0.07, 0, 0, 0, 24);
  head.rotation.x = Math.PI / 2;
  head.position.set(wr.x, wr.y, wr.z + 0.06);
  const bel = cyl(ts, M.black, 0.12, 0.12, 0.075, 0, 0, 0, 20);
  bel.rotation.x = Math.PI / 2;
  bel.position.set(wr.x, wr.y, wr.z - 0.02);
  add(g, ts);
  // Thruster pods on the lower corners, the instrument radiators.
  for (const [x, z] of [
    [1, 1.2],
    [-1, 1.2],
    [1, -1.2],
    [-1, -1.2],
  ]) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 10), M.bell);
    t.position.set(x * 1.03, Y0 + 0.2, z * 1.03);
    t.rotation.z = x > 0 ? -1.2 : 1.2;
    add(g, t);
  }
  return g;
}

// ─── Venera and Vega ─────────────────────────────────────────────────────────────────────────

/**
 * The Venera 13/14 lander as it sat on Venus: the pressure sphere on its conical aerobrake ring
 * (the saw-toothed rim seen in the Venera 13 panoramas), the camera ports with their ejected caps,
 * the cone antenna on top, the opened heat-shield petals around the neck. Ring bottom on y = 0.
 */
export function buildVeneraLander(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  // Conical aerobrake ring with its toothed rim.
  const ring = lathe(
    g,
    M.copper,
    [
      [1.0, 0.1],
      [0.92, 0.22],
      [0.55, 0.36],
      [0.36, 0.38],
      [0.36, 0.3],
      [0.55, 0.28],
      [0.92, 0.12],
      [1.0, 0.1],
    ],
    48,
  );
  ring.material = M.dbl;
  ring.material = Object.assign(mat(0x7a7d84, 0.55, 0.5), { side: THREE.DoubleSide });
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * TAU;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 3), M.silver);
    t.position.set(Math.cos(a) * 0.97, 0.19, Math.sin(a) * 0.97);
    t.rotation.set(0, -a, 0);
    t.rotation.z = Math.PI / 2 - 0.25;
    add(g, t);
  }
  const crush = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 32), M.dark);
  crush.rotation.x = Math.PI / 2;
  crush.position.y = 0.08;
  add(g, crush);
  // The pressure sphere, gold-wrapped on its cradle, the camera ports on the sides.
  const pr = 0.46;
  const cy = 0.82;
  cyl(g, M.dark, 0.34, 0.4, 0.3, 0, 0.1, 0, 20);
  const shell = new THREE.Mesh(crinkle(new THREE.SphereGeometry(pr, 28, 18), 0.004), M.silver);
  shell.position.y = cy;
  add(g, shell);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(pr * 1.002, 0.01, 6, 36), M.black);
  seam.rotation.x = Math.PI / 2;
  seam.position.y = cy;
  add(g, seam);
  for (const [a, y] of [
    [0.5, 0.0],
    [-0.5, 0.0],
    [Math.PI, 0.05],
  ] as [number, number][]) {
    const port = cyl(g, M.black, 0.08, 0.1, 0.1, 0, 0, 0, 16);
    port.rotation.x = Math.PI / 2;
    const pg = new THREE.Group();
    pg.add(port);
    port.position.set(0, 0, pr + 0.02);
    pg.position.y = cy + y;
    pg.rotation.y = a + Math.PI / 2;
    add(g, pg);
  }
  // Colour-test bars on the ring edge, cone antenna and whip, the soil-sampler arm.
  for (const k of [-1, 1])
    box(g, k > 0 ? M.white : M.black, 0.06, 0.14, 0.02, k * 0.06, 0.55, pr + 0.4);
  lathe(g, M.silver, [
    [0.3, cy + pr * 0.7],
    [0.2, cy + pr + 0.02],
    [0.07, cy + pr + 0.28],
    [0.02, cy + pr + 0.34],
  ]);
  strut(g, M.metal, V(0.15, cy + pr * 0.9, 0.1), V(0.3, cy + pr + 0.75, 0.1), 0.012, 4);
  strut(g, M.dark, V(-0.3, cy + pr * 0.75, -0.2), V(-0.7, cy + 0.1, -0.55), 0.02, 6);
  cyl(g, M.dark, 0.06, 0.06, 0.1, -0.72, cy, -0.56, 10);
  // Opened heat-shield petals standing up around the neck.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.2;
    const pet = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 8, 6, 0, 0.7, 0.55, 0.45),
      Object.assign(mat(0x6b4630, 0.5, 0.75, true), { side: THREE.DoubleSide }),
    );
    pet.rotation.y = a;
    pet.position.y = cy - 0.05;
    add(g, pet);
  }
  return g;
}

interface VeneraSpec {
  bay: number;
  sph: number;
  dish: number;
  panels: number;
  pw: number;
  ph: number;
  balloon: boolean;
  rich: boolean;
}

const VENERA_SPEC: Record<'v7' | 'v13' | 'vega', VeneraSpec> = {
  v7: {
    bay: 0.72,
    sph: 0.62,
    dish: 0.7,
    panels: 1,
    pw: 0.85,
    ph: 1.7,
    balloon: false,
    rich: false,
  },
  v13: { bay: 0.95, sph: 1.2, dish: 1.1, panels: 2, pw: 1.05, ph: 2.2, balloon: false, rich: true },
  vega: { bay: 0.95, sph: 1.2, dish: 1.2, panels: 2, pw: 1.1, ph: 2.3, balloon: true, rich: true },
};

function buildVeneraBusCraft(variant: 'v7' | 'v13' | 'vega'): THREE.Group {
  const S = VENERA_SPEC[variant];
  const M = pal();
  const g = new THREE.Group();
  const s = S.bay / 0.95;
  const y1 = 0.15;
  const bayH = 0.95 * s;
  const tankR = 0.84 * s;
  const tankH = 1.1 * s;
  const y2 = y1 + bayH;
  const y3 = y2 + tankH;
  cyl(g, M.dark, S.bay + 0.06, S.bay + 0.06, y1, 0, 0, 0, 32);
  // Engine bay: the white drum with its rows of holes and rings.
  cyl(g, M.white, S.bay, S.bay, bayH, 0, y1, 0, 36);
  for (const yy of [y1 + 0.05, y2 - 0.05]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(S.bay, 0.03, 6, 48), M.metal);
    t.rotation.x = Math.PI / 2;
    t.position.y = yy;
    add(g, t);
  }
  if (S.rich)
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU;
      const h = cyl(g, M.dark, 0.045, 0.045, 0.02, 0, 0, 0, 10);
      h.rotation.x = Math.PI / 2;
      const hg = new THREE.Group();
      hg.add(h);
      h.position.z = S.bay + 0.005;
      hg.position.y = y1 + bayH * 0.45;
      hg.rotation.y = a;
      add(g, hg);
    }
  // Instrument and tank bay: narrower, plumbing and spherical tanks showing.
  cyl(g, M.white, tankR, tankR, tankH, 0, y2, 0, 36);
  for (const [a, rr, yy] of [
    [0.5, 0.36, 0.4],
    [-1.1, 0.3, 0.7],
    [2.6, 0.34, 0.5],
  ] as [number, number, number][]) {
    sph(
      g,
      M.metal,
      rr * s,
      Math.sin(a) * tankR * 1.02,
      y2 + yy * s,
      Math.cos(a) * tankR * 1.02,
      16,
    );
  }
  if (S.rich)
    for (let k = 0; k < 9; k++) {
      const a = 0.3 + (k / 9) * TAU;
      strut(
        g,
        k % 2 ? M.silver : M.metal,
        V(Math.sin(a) * (tankR + 0.04), y2 + 0.05, Math.cos(a) * (tankR + 0.04)),
        V(Math.sin(a + 0.1) * (tankR + 0.05), y3 - 0.1, Math.cos(a + 0.1) * (tankR + 0.05)),
        0.015,
        5,
      );
    }
  box(g, M.metal, 0.3 * s, 0.22 * s, 0.22 * s, 0.4 * s, y2 + 0.2, tankR + 0.05);
  box(g, M.dark, 0.2 * s, 0.2 * s, 0.2 * s, -0.5 * s, y2 + 0.85 * s, tankR + 0.04);
  for (const sx of [-1, 1]) {
    const th = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 8), M.bell);
    th.position.set(sx * S.bay * 0.9, y1 + 0.35, S.bay * 0.5);
    th.rotation.z = -sx * 1.1;
    add(g, th);
  }
  // Cradle ring, six struts holding the descent sphere.
  const sphC = y3 + S.sph * 0.82;
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(S.bay * 0.86, 0.05, 8, 40), M.metal);
  ringM.rotation.x = Math.PI / 2;
  ringM.position.y = y3 + 0.02;
  add(g, ringM);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(
      g,
      M.silver,
      V(Math.sin(a) * tankR * 0.97, y3 - 0.05, Math.cos(a) * tankR * 0.97),
      V(Math.sin(a) * S.sph * 0.72, sphC - S.sph * 0.66, Math.cos(a) * S.sph * 0.72),
      0.028,
      6,
    );
  }

  // The descent sphere (named for the descent scene): ablator shell, seams, parachute hatch.
  const ds = new THREE.Group();
  ds.name = 'descent-sphere';
  ds.position.y = sphC;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(S.sph, 40, 28),
    mat(variant === 'v7' ? 0x9a9ea6 : 0x8a5a36, 0.5, 0.7),
  );
  ds.add(shell);
  for (const lat of [0, 0.55, -0.45]) {
    const rr = S.sph * Math.cos(lat) * 1.003;
    const sm = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 6, 56), M.dark);
    sm.rotation.x = Math.PI / 2;
    sm.position.y = S.sph * Math.sin(lat);
    ds.add(sm);
  }
  const strip = new THREE.Mesh(new THREE.TorusGeometry(S.sph * 1.006, 0.022, 5, 28), M.white);
  strip.rotation.y = -Math.PI / 2;
  ds.add(strip);
  cyl(ds, M.silver, 0.2 * (S.sph / 1.2), 0.24 * (S.sph / 1.2), 0.05, 0, S.sph * 0.97, 0, 20);
  strut(
    ds,
    M.dark,
    V(S.sph * 0.55, S.sph * 0.8, 0),
    V(S.sph * 0.55, S.sph * 0.8 + 0.85, 0),
    0.015,
    5,
  );
  add(g, ds);

  // Vega's stowed balloon canister on the sphere's crown.
  if (S.balloon) {
    const bl = new THREE.Group();
    bl.name = 'balloon';
    const by = sphC + S.sph * 0.98;
    cyl(bl, M.white, 0.42, 0.46, 0.5, 0, by, 0, 28);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 12, 0, TAU, 0, Math.PI / 2),
      M.white,
    );
    dome.position.y = by + 0.5;
    bl.add(dome);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.02, 6, 32), M.metal);
    band.rotation.x = Math.PI / 2;
    band.position.y = by + 0.25;
    bl.add(band);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      strut(
        bl,
        M.metal,
        V(Math.cos(a) * 0.46, by + 0.02, Math.sin(a) * 0.46),
        V(Math.cos(a) * 0.46, by + 0.48, Math.sin(a) * 0.46),
        0.01,
        4,
      );
    }
    add(g, bl);
  }

  // The parabolic dish on a mast, front, tilted up; mesh surface, ribs, feed.
  const dg = new THREE.Group();
  const dish = paraDish(M.mesh, S.dish, S.dish * 0.3, 12);
  dg.add(dish);
  dishRibs(dish, M.silver, S.dish, S.dish * 0.3, 14, 0.012);
  const dr = new THREE.Mesh(new THREE.TorusGeometry(S.dish, 0.02, 6, 48), M.metal);
  dr.rotation.x = Math.PI / 2;
  dr.position.y = S.dish * 0.3;
  dg.add(dr);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU;
    strut(
      dg,
      M.silver,
      V(Math.cos(a) * S.dish, S.dish * 0.3, Math.sin(a) * S.dish),
      V(0, S.dish * 0.9, 0),
      0.015,
      4,
    );
  }
  cyl(dg, M.metal, 0.06, 0.06, 0.12, 0, S.dish * 0.86, 0, 8);
  dg.position.set(0, y2 + 0.65 * s, S.bay + 0.5 * s);
  dg.rotation.x = 0.95;
  add(g, dg);
  strut(g, M.silver, V(0, y2 + 0.25, S.bay * 0.98), V(0, y2 + 0.65 * s, S.bay + 0.5 * s), 0.04, 8);
  strut(g, M.silver, V(0, y2 + 0.95 * s, tankR), V(0, y2 + 0.65 * s, S.bay + 0.5 * s), 0.03, 6);

  // Solar wings: panels face the front, on a rail at each side of the tank bay.
  for (const sx of [-1, 1]) {
    const wing = new THREE.Group();
    wing.userData.solarArray = true;
    const wy = y2 + 0.5 * s;
    box(wing, M.dark, 0.12, S.ph + 0.1, 0.1, sx * (tankR + 0.1), wy, 0);
    for (let i = 0; i < S.panels; i++) {
      const p = solarPanel(M, S.pw, S.ph, 7, 14);
      p.position.set(sx * (tankR + 0.2 + S.pw / 2 + i * (S.pw + 0.05)), wy, 0);
      wing.add(p);
    }
    add(g, wing);
  }
  // Vega's scan platform: two camera barrels on an arm under the tank bay.
  if (variant === 'vega') {
    strut(g, M.metal, V(0.4, y2 + 0.25, S.bay * 0.9), V(1.2, y2 + 0.1, S.bay * 1.1), 0.04, 6);
    for (const z of [0, 0.22]) {
      const c = cyl(g, M.dark, 0.1, 0.1, 0.5, 0, 0, 0, 12);
      c.rotation.x = Math.PI / 2;
      c.position.set(1.2, y2 + 0.1 + z * 0.5, S.bay * 1.1 + 0.25 + z);
    }
  }
  return g;
}

// ─── Giotto ──────────────────────────────────────────────────────────────────────────────────

function buildGiottoCraft(): THREE.Group {
  const M = pal();
  const g = new THREE.Group();
  // Apogee-motor nozzle and the instrument platform.
  lathe(g, M.bell, [
    [0.34, 0],
    [0.25, 0.2],
    [0.18, 0.35],
  ]).position.y = 0;
  cyl(g, M.dark, 0.95, 0.95, 0.12, 0, 0.35, 0, 32);
  cyl(g, M.white, 0.9, 0.9, 0.07, 0, 0.35 - 0.05, 0, 32);
  // The drum: dark solar cells in vertical strips, gold bands, the experiment boxes at the foot.
  cyl(g, M.solar, 0.93, 0.93, 1.08, 0, 0.47, 0, 48);
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * TAU;
    box(g, M.cell, 0.008, 1.02, 0.008, Math.sin(a) * 0.934, 1.01, Math.cos(a) * 0.934);
  }
  for (const y of [0.47, 1.51]) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.935, 0.025, 6, 48), M.gold);
    b.rotation.x = Math.PI / 2;
    b.position.y = y + 0.02;
    add(g, b);
  }
  for (const [a, w] of [
    [0.8, 0.28],
    [2.3, 0.2],
    [3.7, 0.24],
    [5.2, 0.2],
  ]) {
    const bx = new THREE.Group();
    box(bx, M.silver, w, 0.26, 0.12, 0, 0, 0);
    box(bx, M.gold, w * 0.6, 0.12, 0.03, 0, 0, 0.07);
    bx.position.set(Math.sin(a) * 0.97, 0.62, Math.cos(a) * 0.97);
    bx.rotation.y = a;
    add(g, bx);
  }
  // The Whipple dust shield: the deck over the drum with its bumper plate above it.
  cyl(g, M.metal, 0.95, 0.95, 0.04, 0, 1.55, 0, 48);
  cyl(g, M.dark, 0.94, 0.94, 0.02, 0, 1.53, 0, 48);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.2;
    strut(
      g,
      M.dark,
      V(Math.sin(a) * 0.85, 1.55, Math.cos(a) * 0.85),
      V(Math.sin(a) * 0.85, 1.7, Math.cos(a) * 0.85),
      0.012,
      4,
    );
  }
  const bump = cyl(g, M.silver, 0.92, 0.92, 0.012, 0, 1.7, 0, 48);
  bump.material = M.silver;
  // The despun high-gain antenna: white cone mount, the tilted 1.47 m dish, the gantry above.
  lathe(g, M.white, [
    [0.6, 1.71],
    [0.35, 1.9],
    [0.12, 2.02],
  ]);
  const d = paraDish(M.dbl, 0.735, 0.17, 12);
  d.position.set(0.05, 2.0, 0);
  d.rotation.z = -0.35;
  add(g, d);
  const dr = new THREE.Mesh(new THREE.TorusGeometry(0.735, 0.015, 6, 40), M.metal);
  dr.rotation.x = Math.PI / 2;
  dr.position.y = 0.17;
  d.add(dr);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.5;
    const rimPt = V(Math.cos(a) * 0.7, 0.16, Math.sin(a) * 0.7);
    strut(d, M.silver, rimPt, V(0, 0.55, 0), 0.01, 4);
  }
  const apex = V(0, 2.88, 0);
  for (const a of [0.3, 0.3 + TAU / 3, 0.3 + (2 * TAU) / 3]) {
    const foot = V(Math.sin(a) * 0.9, 1.7, Math.cos(a) * 0.9);
    const knee = V(Math.sin(a) * 0.9, 2.3, Math.cos(a) * 0.9);
    strut(g, M.black, foot, knee, 0.04, 8);
    strut(g, M.black, knee, apex, 0.04, 8);
    box(g, M.gold, 0.05, 0.05, 0.05, knee.x, knee.y, knee.z);
  }
  box(g, M.white, 0.32, 0.3, 0.32, 0, 2.7, 0);
  cyl(g, M.gold, 0.08, 0.1, 0.1, 0, 2.55, 0, 10);
  cyl(g, M.gold, 0.06, 0.06, 0.12, 0, 2.85, 0, 10);
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

const HAYABUSA_REFS = [
  WP(
    'Hayabusa2',
    'body 1 × 1.6 × 1.25 m, three-panel arrays, sampler horn, SCI, MINERVA-II, capsule',
  ),
  WC(
    '20190605_hayabusa-diagram-tpr-01.png',
    'JAXA instrument diagram: body, horn, capsule and arrays placement',
  ),
];
const VENERA_REFS = [
  WP(
    'Venera',
    'the Venera 9-14 bus: two solar panels, parabolic dish, spherical descent apparatus',
  ),
  WC(
    'Vega_Solar_System_Probe_Bus_and_Landing_Apparatus.jpg',
    'photo of the Venera-derived bus with the sphere on top',
  ),
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  cassini: make(
    buildCassiniCraft,
    6.8,
    'No published overall height in the fleet entry; 6.8 m is the length Wikipedia gives for Cassini-Huygens, the 4 m high-gain antenna sets the width',
    4,
    [
      WP('Cassini–Huygens', '6.8 m length, 4 m antenna, three RTGs, Huygens 2.7 m'),
      WC(
        'Cassini_spacecraft_raw_uncompressed.png',
        'render: antenna, gold body, pallets, RTGs, Huygens on the side',
      ),
      WC('Huygens_probe_schematic_diagram.png', 'Huygens shield, after cone and back cover'),
    ],
  ),
  galileo: make(
    buildGalileoCraft,
    5.3,
    'No published overall height in the fleet entry; 5.3 m is the length Wikipedia gives for Galileo without the boom',
    4.8,
    [
      WP(
        'Galileo_(spacecraft)',
        '5.3 m length, 4.8 m antenna, RTG booms, 10.9 m magnetometer boom, probe',
      ),
      WC(
        'Detailed_Drawing_of_the_Galileo_Spacecraft.png',
        'NASA drawing: spun and despun sections, probe, booms',
      ),
    ],
  ),
  rosetta: make(
    buildRosettaCraft,
    3.95,
    'No published overall height in the fleet entry; the 2.8 m body edge (the launch axis) plus the adapter ring and top-deck instruments',
    2.1,
    [
      WP('Rosetta_(spacecraft)', 'body 2.8 × 2.1 × 2.0 m, 32 m across the arrays, 2.2 m antenna'),
      WC('Rosetta_-_Philae_close-up.jpg', 'ESA render of Philae on the orbiter'),
      WC('Philae_lander_(transparent_bg).png', 'Philae: hexagonal body, tripod gear, solar cells'),
    ],
  ),
  hayabusa: make(
    () => buildHayabusaCraft('h1'),
    2.9,
    'No published overall height in the fleet entry; the 1.25 m body, the horn and the antenna as drawn from photos',
    1.6,
    [
      WP('Hayabusa', '1 × 1.6 × 2 m body, 1.5 m antenna, 5.7 m across the panels'),
      ...HAYABUSA_REFS,
    ],
  ),
  'hayabusa-2': make(
    () => buildHayabusaCraft('h2'),
    2.75,
    'No published overall height in the fleet entry; the 1.25 m body, the horn and the antennas as drawn from photos',
    1.6,
    HAYABUSA_REFS,
  ),
  'osiris-rex': make(
    buildOsirisRexCraft,
    3.4,
    'No published overall height in the fleet entry; the bus and adapter with the capsule on the deck, the arm folded flat',
    2.4,
    [
      WP('OSIRIS-REx', 'bus 2.4 m, arrays 6.2 m across, 3.35 m TAGSAM arm, 0.81 m capsule'),
      WC('OSIRIS-REx_spacecraft_model.png', 'render: bus, arrays, dish, TAGSAM arm, capsule'),
    ],
  ),
  'venera-7': make(
    () => buildVeneraBusCraft('v7'),
    3.55,
    'No published overall height in the fleet entry; drawn from the Venera bus proportions at the 1 m Venera 7 descent sphere',
    1.5,
    VENERA_REFS,
  ),
  'venera-13': make(
    () => buildVeneraBusCraft('v13'),
    5,
    'No published overall height in the fleet entry; the bus and the 2.4 m descent sphere as drawn from photos of the Vega twin',
    2.4,
    VENERA_REFS,
  ),
  'vega-1': make(
    () => buildVeneraBusCraft('vega'),
    5.3,
    'No published overall height in the fleet entry; the bus, the 2.4 m descent sphere and the balloon canister as drawn from the museum photo',
    2.4,
    VENERA_REFS,
  ),
  'vega-2': make(
    () => buildVeneraBusCraft('vega'),
    5.3,
    'No published overall height in the fleet entry; the bus, the 2.4 m descent sphere and the balloon canister as drawn from the museum photo',
    2.4,
    VENERA_REFS,
  ),
  giotto: make(
    buildGiottoCraft,
    2.85,
    'No published overall height in the fleet entry; 2.85 m is the height Wikipedia gives, 1.86 m the drum',
    1.86,
    [
      WP('Giotto_(spacecraft)', '1.86 m drum, 1.47 m despun antenna, dust shield'),
      WC('Giotto_Whipple_shield_ESA239195.jpg', 'ESA photo: deck, tilted dish, gantry with camera'),
      WC('Schéma_sonde-spatiale-Giotto.png', 'schematic: drum, shield, dish, arches'),
    ],
  ),
};
