/**
 * Showcase models: the Soviet and Chinese robotic lunar landers and rovers (operator 2026-11-23:
 * one detailed central model per craft). Luna 9's landed capsule, the E-8-5 sample return (Luna 16
 * and 24), the E-8 rover bus and Lunokhod 1 / 2, Chang'e 3 / 4 with Yutu and Yutu-2, and
 * Chang'e 5 / 6 with their ascenders. Landed: footpads and wheels on y = 0, front toward +z.
 *
 * What makes each read as itself: the petals of the 58 cm Luna 9 ball; the E-8's squat gold hull,
 * torus tanks, outside spheres and the sphere-topped ascent stage; the Lunokhod's tub on eight
 * wire-mesh wheels under an open solar lid; the Chang'e landers' boxy gold body on four long
 * legs with the rover ramps; Yutu's rocker-bogie, tilted panel and camera mast; the Chang'e 5 / 6
 * gold ascender on its lander with the drill tower and sampling arm.
 *
 * Several dimensions are not published (China shares little): those are noted in REFS and are
 * proportioned from photographs.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, beam, box, crinkle, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const rad = (d: number): number => (d * Math.PI) / 180;

function materials(): Record<string, Mat> {
  return {
    gold: mat(0xd2a03c, 0.55, 0.38, true),
    amber: mat(0xa8672a, 0.5, 0.45, true),
    silver: mat(0xc8ccd2, 0.55, 0.35, true),
    alu: mat(0xb4b8bf, 0.55, 0.4),
    aluDark: mat(0x7f838b, 0.55, 0.45),
    steel: mat(0x5f636b, 0.55, 0.45),
    black: mat(0x16171a, 0.35, 0.65, true),
    dark: mat(0x2a2c30, 0.4, 0.65),
    white: mat(0xe6e4de, 0.2, 0.55),
    cream: mat(0xd9d3c1, 0.25, 0.6),
    green: mat(0x7d8a74, 0.35, 0.6),
    solar: mat(0x1b2a5a, 0.45, 0.35),
    cellLine: mat(0x8d9bc0, 0.5, 0.4),
    red: mat(0xb3222a, 0.1, 0.7),
    yellow: mat(0xe0b52b, 0.1, 0.7),
    bell: mat(0x3a3733, 0.6, 0.55, true),
    bellIn: mat(0x24211e, 0.5, 0.7, true),
    glass: Object.assign(mat(0x020306, 0.05, 0.5), { envMapIntensity: 0.25 }),
    petal: Object.assign(mat(0xc4c8ce, 0.55, 0.35), { side: THREE.DoubleSide }),
    petalIn: Object.assign(mat(0x8a8d93, 0.5, 0.5), { side: THREE.DoubleSide }),
  };
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rTop: number,
  rBot: number,
  h: number,
  x: number,
  y: number,
  z: number,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

function ball(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  x: number,
  y: number,
  z: number,
  seg = 28,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** A torus lying flat (axis up) at the given centre. */
function torus(
  g: THREE.Object3D,
  m: Mat,
  big: number,
  small: number,
  x: number,
  y: number,
  z: number,
  seg = 36,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(big, small, 10, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** A crinkled open cylinder of foil (thermal blanket wrap), base at y0. */
function foilCyl(
  g: THREE.Object3D,
  m: Mat,
  rTop: number,
  rBot: number,
  h: number,
  y0: number,
  amp = 0.03,
  seg = 20,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.CylinderGeometry(rTop, rBot, h, seg, Math.max(2, Math.round(h / 0.28)), true),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = y0 + h / 2;
  return add(g, mesh);
}

/** A crinkled foil-wrapped box. */
function foilBox(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  amp = 0.015,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.BoxGeometry(
      w,
      h,
      d,
      Math.max(2, Math.round(w / 0.25)),
      Math.max(1, Math.round(h / 0.25)),
      Math.max(2, Math.round(d / 0.25)),
    ),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/**
 * A rounded-rectangle loft: rings of [y, half-width x, half-depth z], capped both ends. `p` is
 * the superellipse exponent (2 = ellipse, large = a squarer, rounded box).
 */
function loft(
  g: THREE.Object3D,
  m: Mat,
  rings: [number, number, number][],
  p = 5,
  n = 40,
): THREE.Mesh {
  const pos: number[] = [];
  for (const [y, hx, hz] of rings) {
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      pos.push(
        hx * Math.sign(c) * Math.abs(c) ** (2 / p),
        y,
        hz * Math.sign(s) * Math.abs(s) ** (2 / p),
      );
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k;
      const b = i * n + ((k + 1) % n);
      const c = (i + 1) * n + k;
      const d = (i + 1) * n + ((k + 1) % n);
      idx.push(a, c, b, b, c, d);
    }
  }
  const capIdx = (ring: number, up: boolean): void => {
    const ci = pos.length / 3;
    pos.push(0, rings[ring][0], 0);
    for (let k = 0; k < n; k++) {
      const a = ring * n + k;
      const b = ring * n + ((k + 1) % n);
      if (up) idx.push(ci, b, a);
      else idx.push(ci, a, b);
    }
  };
  capIdx(rings.length - 1, true);
  capIdx(0, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return add(g, new THREE.Mesh(geo, m));
}

/** A solar panel w × d (x by z), dark cells with a light grid, in a frame; centred, flat. */
function solarPanel(M: Record<string, Mat>, w: number, d: number, cell = 0.14): THREE.Group {
  const g = new THREE.Group();
  box(g, M.solar, w, 0.018, d, 0, 0, 0);
  const nx = Math.max(2, Math.round(w / cell));
  const nz = Math.max(2, Math.round(d / cell));
  for (let i = 1; i < nx; i++) box(g, M.cellLine, 0.004, 0.003, d, -w / 2 + (i * w) / nx, 0.01, 0);
  for (let k = 1; k < nz; k++) box(g, M.cellLine, w, 0.003, 0.004, 0, 0.011, -d / 2 + (k * d) / nz);
  for (const s of [-1, 1]) {
    box(g, M.alu, 0.03, 0.025, d + 0.03, (s * w) / 2, 0, 0);
    box(g, M.alu, w, 0.025, 0.03, 0, 0, (s * d) / 2);
  }
  return g;
}

/** Stand a model on y = 0 at exactly its sourced height. */
function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(heightM / (b.max.y - b.min.y));
  g.position.y = -b.min.y * g.scale.y;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

/** A dished footpad centred at the origin of its group; r is the dish radius. */
function footpad(M: Record<string, Mat>, r: number): THREE.Group {
  const pad = new THREE.Group();
  lathe(
    pad,
    M.petal,
    [
      [0.0, 0.0],
      [r * 0.65, r * 0.03],
      [r * 0.93, r * 0.18],
      [r, r * 0.4],
      [r * 0.94, r * 0.46],
    ],
    28,
  );
  torus(pad, M.aluDark, r * 0.78, r * 0.07, 0, r * 0.3, 0, 28);
  strut(pad, M.silver, V(0, r * 0.3, 0), V(0, r * 0.9, 0), r * 0.17, 10);
  return pad;
}

interface LegSpec {
  az: number;
  /** where the primary strut leaves the body (radius, y) */
  topR: number;
  topY: number;
  /** footpad centre radius; the pad stands on y = 0 */
  padR: number;
  padSize: number;
  /** secondary strut mounts on the body (radius, y, lateral half-spread) */
  braceR: number;
  braceY: number;
  braceS: number;
  wrap: Mat;
  r: number;
}

/** A landing leg: wrapped primary strut, bare piston, two braces, a footpad. */
function lander_leg(g: THREE.Object3D, M: Record<string, Mat>, s: LegSpec): void {
  const dir = V(Math.sin(s.az), 0, Math.cos(s.az));
  const side = V(Math.cos(s.az), 0, -Math.sin(s.az));
  const at = (r: number, y: number, lat = 0): THREE.Vector3 =>
    dir.clone().multiplyScalar(r).add(side.clone().multiplyScalar(lat)).setY(y);
  const top = at(s.topR, s.topY);
  const knee = at(s.padR, s.padSize * 0.5);
  const mid = top.clone().lerp(knee, 0.56);
  const wrapped = strut(g, s.wrap, top, mid, s.r, 12);
  wrapped.geometry = crinkle(
    new THREE.CylinderGeometry(s.r, s.r, top.distanceTo(mid), 12, 5),
    s.r * 0.12,
  );
  strut(g, M.silver, mid, knee, s.r * 0.6, 12);
  const j = box(g, M.aluDark, s.r * 3, s.r * 3, s.r * 3, 0, 0, 0);
  j.position.copy(top);
  j.rotation.y = s.az;
  const brace = top.clone().lerp(knee, 0.66);
  for (const l of [-1, 1]) {
    strut(g, M.silver, at(s.braceR, s.braceY, l * s.braceS), brace, s.r * 0.4, 8);
  }
  const pad = footpad(M, s.padSize);
  pad.position.copy(at(s.padR, 0));
  add(g, pad);
}

// --- Luna 9 ----------------------------------------------------------------------------

const LUNA9_HEIGHT_M = 0.9;

/** Luna 9's 58 cm landing capsule on the Ocean of Storms: petals open, TV head and antennas up. */
export function buildLuna9(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  const R = 0.29;
  const cy = R; // rests on its lower hemisphere
  // After landing only the lower half is left standing: the sealed instrument hemisphere with a
  // shallow lid, the four petals having flopped open around it.
  const lower = new THREE.Mesh(
    new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    M.silver,
  );
  lower.position.y = cy;
  add(g, lower);
  const belt = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.004, 40, 6, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.16),
    M.aluDark,
  );
  belt.position.y = cy;
  add(g, belt);
  lathe(
    g,
    M.alu,
    [
      [R * 1.0, cy],
      [R * 0.96, cy + 0.012],
      [R * 0.7, cy + 0.052],
      [R * 0.34, cy + 0.08],
      [0.001, cy + 0.085],
    ],
    40,
  );
  torus(g, M.steel, R * 1.0, 0.014, 0, cy, 0, 48);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ball(g, M.dark, 0.011, Math.sin(a) * R * 1.01, cy + 0.025, Math.cos(a) * R * 1.01, 8);
  }
  // Four flat, rounded petals hinged on the equator, folded down and outward onto the ground.
  const petalShape = new THREE.Shape();
  const pw = 0.19;
  const pl = 0.5;
  petalShape.moveTo(-pw * 0.8, 0);
  petalShape.bezierCurveTo(-pw * 1.25, pl * 0.3, -pw * 1.1, pl * 0.8, 0, pl);
  petalShape.bezierCurveTo(pw * 1.1, pl * 0.8, pw * 1.25, pl * 0.3, pw * 0.8, 0);
  petalShape.lineTo(-pw * 0.8, 0);
  const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 18,
  });
  petalGeo.rotateX(Math.PI / 2);
  petalGeo.translate(0, 0.014, 0);
  const innerShape = new THREE.ShapeGeometry(petalShape, 18);
  innerShape.scale(0.82, 0.84, 1);
  innerShape.translate(0, 0.04, 0);
  innerShape.rotateX(Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hinge = new THREE.Group();
    hinge.name = 'petals'; // opened after landing: a descent stows them
    hinge.position.set(Math.sin(a) * R, cy, Math.cos(a) * R);
    hinge.rotation.y = a;
    const open = new THREE.Group();
    open.rotation.x = rad(39);
    hinge.add(open);
    add(open, new THREE.Mesh(petalGeo, M.petal));
    const face = new THREE.Mesh(innerShape, M.petalIn);
    face.position.y = 0.0185;
    add(open, face);
    box(open, M.steel, 0.012, 0.01, pl * 0.92, 0, 0.022, pl * 0.48);
    box(open, M.steel, pw * 1.5, 0.014, 0.014, 0, 0.012, 0.01);
    const hb = cyl(hinge, M.steel, 0.012, 0.012, pw * 1.7, 0, 0, 0, 10);
    hb.rotation.z = Math.PI / 2;
    add(g, hinge);
  }
  // Top cap: the TV camera head with its mirror, the sun and earth sensors.
  cyl(g, M.dark, 0.11, 0.13, 0.05, 0, cy + 0.085 + 0.0, 0, 24);
  cyl(g, M.silver, 0.055, 0.06, 0.16, 0, cy + 0.085 + 0.1, 0, 20);
  const mirror = box(g, M.alu, 0.1, 0.012, 0.1, 0, cy + 0.085 + 0.2, 0.0);
  mirror.rotation.x = rad(-40);
  const lens = cyl(g, M.glass, 0.03, 0.03, 0.02, 0, cy + 0.085 + 0.14, 0.058, 16);
  lens.rotation.x = Math.PI / 2;
  cyl(g, M.gold, 0.03, 0.03, 0.05, 0.1, cy + 0.085 - 0.005, 0.0, 12);
  ball(g, M.glass, 0.025, -0.1, cy + 0.085 - 0.02, 0.02, 12);
  // Four rod antennas fanned from the cap, two long and two short.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const len = i % 2 === 0 ? 0.46 : 0.38;
    const base = V(Math.sin(a) * 0.1, cy + 0.085 - 0.01, Math.cos(a) * 0.1);
    const tip = base.clone().add(V(Math.sin(a) * len * 0.5, len * 0.87, Math.cos(a) * len * 0.5));
    strut(g, M.steel, base, tip, 0.006, 5);
    ball(g, M.gold, 0.012, tip.x, tip.y, tip.z, 8);
  }
  // Thermal control shutters on the belt.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const sh = box(g, M.dark, 0.07, 0.05, 0.012, 0, 0, 0);
    sh.position.set(Math.sin(a) * R * 0.97, cy - 0.13, Math.cos(a) * R * 0.97);
    sh.rotation.set(0.2, a, 0);
  }
  return finish(g, LUNA9_HEIGHT_M);
}

// --- E-8 landing stage (KT), shared by Luna 16 / 24 and the Lunokhod carriers --------------

const KT_TOP = 1.96; // the deck the ascent stage (or the rover bay) stands on
const KT_PAD_R = 1.95;

function buildKtStage(g: THREE.Group, M: Record<string, Mat>): void {
  // KTDU-417 main engine below the hull.
  lathe(g, M.bell, [
    [0.22, 1.2],
    [0.28, 0.95],
    [0.4, 0.55],
    [0.5, 0.3],
  ]);
  lathe(g, M.bellIn, [
    [0.5, 0.3],
    [0.39, 0.55],
    [0.27, 0.95],
    [0.21, 1.2],
  ]);
  for (let i = 0; i < 4; i++) {
    // four small braking-vernier nozzles around the bell
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cyl(g, M.bell, 0.09, 0.05, 0.28, Math.sin(a) * 0.62, 0.92, Math.cos(a) * 0.62, 12);
  }
  // Hull: the gold-wrapped core between the two torus tanks, a bright instrument drum above.
  foilCyl(g, M.gold, 0.8, 0.82, 0.78, 0.98, 0.03, 24);
  cyl(g, M.black, 0.84, 0.84, 0.06, 0, 0.96, 0, 28);
  cyl(g, M.silver, 0.8, 0.8, 0.22, 0, 1.76, 0, 28);
  cyl(g, M.dark, 0.86, 0.86, 0.05, 0, KT_TOP - 0.025, 0, 28);
  // Two toroidal propellant tanks ringed round the core.
  torus(g, M.alu, 0.93, 0.25, 0, 1.2, 0, 40);
  torus(g, M.alu, 0.9, 0.21, 0, 1.6, 0, 40);
  for (const y of [1.2, 1.6]) torus(g, M.steel, 0.93, 0.012, 0, y, 0, 44);
  // Four spherical pressurant tanks out on the diagonals, strapped to the hull.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * 1.22;
    const z = Math.cos(a) * 1.22;
    const sph = ball(g, M.silver, 0.36, x, 1.4, z, 28);
    sph.scale.y = 1;
    torus(g, M.steel, 0.362, 0.012, x, 1.4, z, 28);
    const r2 = torus(g, M.steel, 0.3, 0.012, x, 1.62, z, 28);
    r2.scale.set(1, 1, 1);
    strut(g, M.steel, V(Math.sin(a) * 0.85, 1.4, Math.cos(a) * 0.85), V(x, 1.4, z), 0.03, 6);
  }
  // Four legs on the axes (+z front).
  for (let i = 0; i < 4; i++) {
    lander_leg(g, M, {
      az: (i / 4) * Math.PI * 2,
      topR: 0.95,
      topY: 1.7,
      padR: KT_PAD_R,
      padSize: 0.34,
      braceR: 0.9,
      braceY: 1.05,
      braceS: 0.32,
      wrap: M.gold,
      r: 0.07,
    });
  }
  // Landing-radar antenna and the TV camera on the deck rim, omni whips, an S-band cone.
  const radar = box(g, M.dark, 0.3, 0.1, 0.3, 0, 0.78, -0.7);
  radar.rotation.x = rad(12);
  cyl(g, M.silver, 0.12, 0.02, 0.12, 0, 0.7, -0.7, 14);
  for (const s of [-1, 1]) {
    const cam = cyl(g, M.silver, 0.06, 0.06, 0.24, s * 0.55, KT_TOP + 0.12, 0.45, 14);
    cam.rotation.z = s * rad(10);
    const lens = cyl(g, M.glass, 0.04, 0.04, 0.02, s * 0.55, KT_TOP + 0.2, 0.5, 12);
    lens.rotation.x = Math.PI / 2;
  }
  // Drill rig (LB-09): the boom out from the hull and the drill column standing on the ground.
  const az = rad(24);
  const rr = (r: number): [number, number] => [Math.sin(az) * r, Math.cos(az) * r];
  const [bx0, bz0] = rr(0.86);
  const [bx1, bz1] = rr(1.45);
  box(g, M.aluDark, 0.22, 0.2, 0.22, bx0, 1.78, bz0).rotation.y = az;
  beam(g, M.silver, V(bx0, 1.78, bz0), V(bx1, 1.62, bz1), 0.07, 0.07);
  const [dx, dz] = rr(1.5);
  const head = box(g, M.gold, 0.2, 0.34, 0.2, dx, 1.42, dz);
  head.rotation.y = az;
  cyl(g, M.steel, 0.05, 0.05, 0.9, dx, 0.82, dz, 10);
  cyl(g, M.dark, 0.07, 0.07, 0.12, dx, 0.55, dz, 10);
  strut(g, M.silver, V(dx, 1.58, dz), V(dx, 1.7, dz), 0.025, 6);
  // Antenna whips and a cone.
  for (const [x, z, len] of [
    [-0.7, -0.5, 0.9],
    [0.7, -0.45, 0.65],
  ] as [number, number, number][]) {
    strut(g, M.steel, V(x, KT_TOP, z), V(x * 1.1, KT_TOP + len, z), 0.012, 5);
  }
}

/** The ascent stage with the sample-return capsule, standing on the KT deck. */
function buildKtAscent(g: THREE.Group, M: Record<string, Mat>): void {
  const a = new THREE.Group();
  a.name = 'ascent-stage';
  a.position.y = KT_TOP;
  add(g, a);
  cyl(a, M.steel, 0.68, 0.7, 0.1, 0, 0.05, 0, 28);
  foilCyl(a, M.gold, 0.6, 0.62, 0.85, 0.1, 0.03, 24);
  for (const y of [0.12, 0.95]) torus(a, M.silver, 0.62, 0.02, 0, y, 0, 36);
  // Four attitude-thruster pods and the propellant-tank bulges.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const x = Math.sin(ang) * 0.66;
    const z = Math.cos(ang) * 0.66;
    box(a, M.alu, 0.13, 0.2, 0.13, x, 0.5, z).rotation.y = ang;
    cyl(a, M.bell, 0.03, 0.045, 0.1, x * 1.07, 0.42, z * 1.07, 8);
    ball(a, M.silver, 0.1, Math.sin(ang + 0.5) * 0.6, 0.78, Math.cos(ang + 0.5) * 0.6, 14);
  }
  lathe(a, M.silver, [
    [0.62, 0.95],
    [0.58, 1.08],
    [0.46, 1.25],
    [0.3, 1.4],
    [0.22, 1.46],
  ]);
  const cap = new THREE.Group();
  cap.name = 'return-capsule';
  add(a, cap);
  cyl(cap, M.dark, 0.2, 0.22, 0.1, 0, 1.5, 0, 20);
  ball(cap, M.bell, 0.27, 0, 1.74, 0, 28);
  torus(cap, M.silver, 0.255, 0.016, 0, 1.62, 0, 28);
  torus(cap, M.silver, 0.12, 0.012, 0, 1.98, 0, 20);
  cyl(cap, M.gold, 0.05, 0.05, 0.05, 0, 2.0, 0, 12);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.4;
    strut(
      a,
      M.steel,
      V(Math.sin(ang) * 0.3, 1.4, Math.cos(ang) * 0.3),
      V(Math.sin(ang) * 0.2, 1.52, Math.cos(ang) * 0.2),
      0.02,
      6,
    );
  }
  strut(a, M.steel, V(-0.45, 1.2, -0.1), V(-0.7, 1.55, -0.2), 0.011, 5);
  strut(a, M.steel, V(0.45, 1.2, 0.2), V(0.72, 1.5, 0.3), 0.011, 5);
}

const KT_ASCENT_HEIGHT_M = 3.96;

/** Luna 16 / Luna 24 (E-8-5): the KT landing stage under the ascent stage and return capsule. */
export function buildLunaSampleReturn(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  buildKtStage(g, M);
  buildKtAscent(g, M);
  return finish(g, KT_ASCENT_HEIGHT_M);
}

/** One long ramp from the rover deck edge down to the ground, ribbed, with side rails. */
function ramp(g: THREE.Object3D, M: Record<string, Mat>, sign: number): void {
  const top = V(0, KT_TOP + 0.06, sign * 1.28);
  const foot = V(0, 0.06, sign * 5.3);
  beam(g, M.aluDark, top, foot, 1.1, 0.04);
  for (const s of [-1, 1]) {
    beam(
      g,
      M.silver,
      top.clone().add(V(s * 0.57, 0.04, 0)),
      foot.clone().add(V(s * 0.57, 0.04, 0)),
      0.06,
      0.08,
    );
  }
  const n = 16;
  for (let i = 1; i < n; i++) {
    const p = top.clone().lerp(foot, i / n);
    const rung = box(g, M.steel, 1.08, 0.025, 0.05, p.x, p.y + 0.03, p.z);
    rung.rotation.x = Math.atan2(top.y - foot.y, Math.abs(foot.z - top.z)) * -sign;
  }
  box(g, M.steel, 1.2, 0.04, 0.2, 0, 0.04, sign * 5.35);
}

/** The E-8 landing stage that carried Lunokhod 1 and 2: the KT stage with the rover deck and ramps. */
export function buildLunaE8LandingStage(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  buildKtStage(g, M);
  // Rover deck: an octagonal platform on the KT stage with a rim and the tie-down posts.
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.1, 8), M.green);
  deck.position.y = KT_TOP + 0.05;
  deck.rotation.y = Math.PI / 8;
  add(g, deck);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.03, 6, 8), M.steel);
  rimRing.rotation.set(Math.PI / 2, 0, Math.PI / 8);
  rimRing.position.y = KT_TOP + 0.1;
  add(g, rimRing);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    box(g, M.silver, 0.12, 0.26, 0.12, Math.sin(a) * 1.05, KT_TOP + 0.23, Math.cos(a) * 1.05);
  }
  const ramps = new THREE.Group();
  ramps.name = 'ramps';
  add(g, ramps);
  ramp(ramps, M, 1);
  ramp(ramps, M, -1);
  // Hinge brackets where each ramp meets the deck.
  for (const s of [-1, 1]) box(g, M.steel, 1.2, 0.1, 0.12, 0, KT_TOP + 0.08, s * 1.3);
  return g;
}

// --- Lunokhod ---------------------------------------------------------------------------

const LUNOKHOD_HEIGHT_M = 2.6;
const LK_WHEEL_R = 0.255;
const LK_WHEEL_W = 0.2;
const LK_TRACK = 0.95;
const LK_WHEEL_Z = [-0.84, -0.28, 0.28, 0.84];
const LK_RIM_Y = 1.0;
const LK_HINGE_Z = -0.8;
const LK_R = 0.8;

/** A Lunokhod wheel: two rims, a wire-mesh tread, a hub with spokes. Axis along x. */
function lunokhodWheel(M: Record<string, Mat>): THREE.Group {
  const w = new THREE.Group();
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(LK_WHEEL_R, 0.024, 8, 44), M.black);
    rim.rotation.y = Math.PI / 2;
    rim.position.x = (s * LK_WHEEL_W) / 2;
    add(w, rim);
  }
  for (const x of [-0.065, 0, 0.065]) {
    const mid = new THREE.Mesh(new THREE.TorusGeometry(LK_WHEEL_R - 0.006, 0.007, 6, 44), M.black);
    mid.rotation.y = Math.PI / 2;
    mid.position.x = x;
    add(w, mid);
  }
  // The mesh: thin wires along the tread, crossing at the middle ring, and the spokes.
  const wires = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, LK_WHEEL_W, 4),
    M.dark,
    72,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    dummy.position.set(0, Math.cos(a) * (LK_WHEEL_R - 0.004), Math.sin(a) * (LK_WHEEL_R - 0.004));
    dummy.rotation.set(0, 0, Math.PI / 2);
    dummy.updateMatrix();
    wires.setMatrixAt(i, dummy.matrix);
  }
  add(w, wires);
  const spokes = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, LK_WHEEL_R - 0.06, 4),
    M.cream,
    48,
  );
  for (let i = 0; i < 48; i++) {
    const a = ((i % 24) / 24) * Math.PI * 2;
    const r = (LK_WHEEL_R + 0.06) / 2;
    dummy.position.set(i < 24 ? -LK_WHEEL_W / 2 : LK_WHEEL_W / 2, Math.cos(a) * r, Math.sin(a) * r);
    dummy.rotation.set(a, 0, 0);
    dummy.updateMatrix();
    spokes.setMatrixAt(i, dummy.matrix);
  }
  add(w, spokes);
  const hub = cyl(w, M.cream, 0.05, 0.085, LK_WHEEL_W + 0.1, 0, 0, 0, 16);
  hub.rotation.z = Math.PI / 2;
  const cap = cyl(w, M.silver, 0.04, 0.04, 0.02, 0, 0, 0, 12);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = LK_WHEEL_W / 2 + 0.055;
  return w;
}

/** A front TV window: a round porthole in a bezel on a small raised pod, a sun hood above it. */
function lunokhodCamera(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  x: number,
  y: number,
  z: number,
): void {
  const pod = box(g, M.alu, 0.17, 0.15, 0.08, x, y, z);
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 8, 24), M.steel);
  bezel.position.z = 0.042;
  add(pod, bezel);
  const lens = cyl(pod, M.glass, 0.05, 0.05, 0.02, 0, 0, 0.04, 20);
  lens.rotation.x = Math.PI / 2;
  const hood = box(pod, M.dark, 0.17, 0.012, 0.07, 0, 0.082, 0.04);
  hood.rotation.x = 0.25;
}

/** A round solar array of radius r in the xz plane: dark disc, light cell grid clipped to it, a frame ring. */
function roundSolar(M: Record<string, Mat>, r: number, cell = 0.13): THREE.Group {
  const g = new THREE.Group();
  cyl(g, M.solar, r, r, 0.018, 0, 0, 0, 56);
  const n = Math.floor(r / cell);
  for (let i = -n; i <= n; i++) {
    const x = i * cell;
    const half = Math.sqrt(Math.max(0, r * r - x * x));
    box(g, M.cellLine, 0.004, 0.003, half * 2 * 0.99, x, 0.011, 0);
    box(g, M.cellLine, half * 2 * 0.99, 0.003, 0.004, 0, 0.012, x);
  }
  torus(g, M.alu, r, 0.014, 0, 0.004, 0, 56);
  return g;
}

/** A conical helical antenna, base at its origin, axis along +y. */
function helixCone(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  h: number,
  r0: number,
  r1: number,
): void {
  strut(g, M.steel, V(0, 0, 0), V(0, h, 0), 0.012, 6);
  const turns = 9;
  for (let i = 0; i < turns; i++) {
    const t = i / (turns - 1);
    torus(g, M.gold, r0 + (r1 - r0) * t, 0.007, 0, t * h, 0, 24);
  }
}

/** Lunokhod 1 / 2, lid open on its rear hinge (the group named `lid` turns about x to close it). */
export function buildLunokhod(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  const wheel = lunokhodWheel(M);
  for (const s of [-1, 1]) {
    // A longitudinal frame member per side, the wheel motors and swing arms.
    beam(
      g,
      M.steel,
      V(s * 0.66, 0.56, LK_WHEEL_Z[0]),
      V(s * 0.66, 0.56, LK_WHEEL_Z[3]),
      0.07,
      0.07,
    );
    for (const z of LK_WHEEL_Z) {
      const wh = wheel.clone();
      wh.position.set(s * LK_TRACK, LK_WHEEL_R, z);
      add(g, wh);
      strut(g, M.steel, V(s * 0.66, 0.56, z), V(s * (LK_TRACK - 0.08), LK_WHEEL_R, z), 0.028, 8);
      cyl(g, M.aluDark, 0.065, 0.065, 0.16, s * (LK_TRACK - 0.14), LK_WHEEL_R, z, 14).rotation.z =
        Math.PI / 2;
      strut(g, M.steel, V(s * 0.66, 0.56, z), V(s * 0.5, 0.7, z), 0.03, 6);
    }
  }
  // The tub: a round, slightly convex bathtub, wider at the rim than the flat dark instrument
  // compartment under it; the lid is a circular dome of the same diameter.
  loft(
    g,
    M.black,
    [
      [0.36, 0.4, 0.4],
      [0.44, 0.5, 0.5],
    ],
    2,
    56,
  );
  loft(
    g,
    M.cream,
    [
      [0.44, 0.5, 0.5],
      [0.5, 0.64, 0.64],
      [0.58, 0.72, 0.72],
      [0.78, 0.77, 0.77],
      [0.92, 0.79, 0.79],
      [LK_RIM_Y, LK_R, LK_R],
    ],
    2,
    56,
  );
  loft(
    g,
    M.steel,
    [
      [LK_RIM_Y - 0.01, 0.82, 0.82],
      [LK_RIM_Y + 0.035, 0.82, 0.82],
    ],
    2,
    56,
  );
  cyl(g, M.aluDark, 0.46, 0.46, 0.12, 0, 0.4, 0, 28);
  // The tub's own top plate: a cream convex cover with an overhanging rim, shallow ribs on it.
  loft(
    g,
    M.cream,
    [
      [LK_RIM_Y + 0.03, 0.86, 0.86],
      [LK_RIM_Y + 0.05, 0.85, 0.85],
      [LK_RIM_Y + 0.08, 0.72, 0.72],
      [LK_RIM_Y + 0.11, 0.45, 0.45],
      [LK_RIM_Y + 0.12, 0.15, 0.15],
    ],
    2,
    56,
  );
  for (const k of [-1, 1]) {
    const rib = box(g, M.aluDark, 0.02, 0.012, 1.3, 0, LK_RIM_Y + 0.105, 0);
    rib.rotation.y = k * rad(45);
  }
  // Instrument bay panels on the flanks, set tangent to the tub.
  for (const s of [-1, 1]) {
    for (const a of [100, 150]) {
      const t = rad(a) * s;
      const bp = box(g, M.dark, 0.012, 0.22, 0.34, Math.sin(t) * 0.7, 0.66, Math.cos(t) * 0.7);
      bp.rotation.y = t;
    }
  }
  // Rear: the polonium-210 heat source, a finned drum on its cradle.
  const drum = cyl(g, M.steel, 0.12, 0.12, 0.72, 0, 0.66, -1.0, 16);
  drum.rotation.z = Math.PI / 2;
  for (let i = -4; i <= 4; i++) {
    const f = cyl(g, M.aluDark, 0.16, 0.16, 0.012, i * 0.075, 0.66, -1.0, 16);
    f.rotation.z = Math.PI / 2;
  }
  for (const s of [-1, 1]) box(g, M.steel, 0.05, 0.22, 0.1, s * 0.3, 0.55, -0.92);
  // Ninth wheel on a trailing arm: the odometer.
  beam(g, M.steel, V(0, 0.55, -0.9), V(0, 0.18, -1.45), 0.05, 0.05);
  const odo = cyl(g, M.aluDark, 0.17, 0.17, 0.08, 0, 0.17, -1.45, 20);
  odo.rotation.z = Math.PI / 2;
  // The soil penetrometer on the right rear.
  box(g, M.aluDark, 0.1, 0.2, 0.12, 0.32, 0.46, -0.58);
  strut(g, M.steel, V(0.32, 0.4, -0.58), V(0.32, 0.2, -0.58), 0.012, 5);
  // Front: stereo TV windows, the X-ray spectrometer and the French reflector, all on the curve.
  const onTub = (deg: number, r: number): [number, number] => [
    Math.sin(rad(deg)) * r,
    Math.cos(rad(deg)) * r,
  ];
  for (const deg of [-13, 13]) {
    const [cx, cz] = onTub(deg, 0.8);
    const cam = new THREE.Group();
    cam.position.set(cx, 0.8, cz);
    cam.rotation.y = rad(deg);
    add(g, cam);
    lunokhodCamera(cam, M, 0, 0, 0);
  }
  const [xx, xz] = onTub(-45, 0.67);
  const xr = box(g, M.alu, 0.2, 0.14, 0.12, xx, 0.6, xz);
  xr.rotation.y = rad(-45);
  // The French laser corner-cube reflector: a framed 3 x 4 array on the front of the tub.
  const [rx, rz] = onTub(42, 0.66);
  const refl = box(g, M.steel, 0.36, 0.26, 0.03, rx, 0.6, rz);
  refl.rotation.y = rad(42);
  for (let i = 0; i < 3; i++)
    for (let k = 0; k < 4; k++) {
      const px = -0.12 + k * 0.08;
      const py = -0.08 + i * 0.08;
      const cube = cyl(refl, M.cream, 0.03, 0.03, 0.012, px, py, 0.02, 6);
      cube.rotation.x = Math.PI / 2;
      const hole = cyl(refl, M.glass, 0.018, 0.018, 0.012, px, py, 0.026, 6);
      hole.rotation.x = Math.PI / 2;
    }
  // Panoramic camera heads on the rim, either side of the front.
  for (const s of [-1, 1]) {
    const [px, pz] = onTub(s * 36, 0.68);
    cyl(g, M.white, 0.055, 0.06, 0.2, px, LK_RIM_Y + 0.13, pz, 16);
    cyl(g, M.dark, 0.058, 0.058, 0.04, px, LK_RIM_Y + 0.25, pz, 16);
    const m = box(g, M.alu, 0.07, 0.012, 0.07, px, LK_RIM_Y + 0.28, pz);
    m.rotation.x = rad(-35);
    const l = cyl(
      g,
      M.glass,
      0.025,
      0.025,
      0.02,
      px + Math.sin(rad(s * 36)) * 0.04,
      LK_RIM_Y + 0.14,
      pz + Math.cos(rad(s * 36)) * 0.04,
      12,
    );
    l.rotation.x = Math.PI / 2;
    l.rotation.y = rad(s * 36);
  }
  // Antennas: the conical helical on a pivot arm at the left, four whips on the rim.
  const hx = -0.72;
  strut(g, M.steel, V(hx, LK_RIM_Y, -0.1), V(hx, LK_RIM_Y + 0.28, -0.1), 0.03, 8);
  const helix = new THREE.Group();
  helix.position.set(hx, LK_RIM_Y + 0.28, -0.1);
  helix.rotation.set(rad(-35), 0, rad(18));
  helixCone(helix, M, 0.6, 0.03, 0.16);
  add(g, helix);
  for (const [x, z, len] of [
    [-0.45, -0.55, 1.1],
    [0.45, -0.55, 1.1],
    [-0.3, -0.64, 0.55],
    [0.3, -0.64, 0.55],
  ] as [number, number, number][]) {
    const lean = Math.sign(x) * 0.12;
    strut(g, M.steel, V(x, LK_RIM_Y, z), V(x + lean, LK_RIM_Y + len, z), 0.007, 5);
    cyl(g, M.dark, 0.022, 0.022, 0.06, x, LK_RIM_Y + 0.03, z, 8);
  }
  // The lid: a circular shallow dome of the tub's diameter, hinged on the rear edge, the round
  // solar array on its inner face.
  const lid = new THREE.Group();
  lid.name = 'lid';
  lid.position.set(0, LK_RIM_Y + 0.05, LK_HINGE_Z);
  lid.rotation.x = rad(128) * -1;
  add(g, lid);
  const cells = roundSolar(M, 0.82, 0.13);
  cells.position.set(0, 0.005, LK_R);
  add(lid, cells);
  const shell = loft(
    lid,
    M.white,
    [
      [0.02, 0.86, 0.86],
      [0.05, 0.86, 0.86],
      [0.12, 0.8, 0.8],
      [0.2, 0.7, 0.7],
      [0.27, 0.52, 0.52],
      [0.3, 0.3, 0.3],
      [0.31, 0.1, 0.1],
    ],
    2,
    56,
  );
  shell.position.z = LK_R;
  const barrel = cyl(lid, M.steel, 0.035, 0.035, 0.9, 0, 0, 0, 12);
  barrel.rotation.z = Math.PI / 2;
  return finish(g, LUNOKHOD_HEIGHT_M);
}

// --- Chang'e 3 / 4 -----------------------------------------------------------------------

const CHANGE34_HEIGHT_M = 2.7;
const CE_BODY = { y0: 0.98, y1: 1.88, half: 1.0, chamfer: 0.42 };
const CE_PAD_R = 2.15;

function octagon(half: number, chamfer: number): [number, number][] {
  return [
    [chamfer, half],
    [half, chamfer],
    [half, -chamfer],
    [chamfer, -half],
    [-chamfer, -half],
    [-half, -chamfer],
    [-half, chamfer],
    [-chamfer, half],
  ];
}

/** An octagonal gold-and-white lander body with deck and base plate, as the Chang'e landers. */
function changeBody(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  oct: [number, number][],
  y0: number,
  y1: number,
  foilFrac: number,
): void {
  const shape = new THREE.Shape(oct.map(([x, z]) => new THREE.Vector2(x * 0.95, z * 0.95)));
  const core = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false }),
    M.dark,
  );
  core.rotation.x = Math.PI / 2;
  core.position.y = y1;
  add(g, core);
  const h = y1 - y0;
  const split = y0 + h * foilFrac;
  for (let i = 0; i < 8; i++) {
    const [ax, az] = oct[i];
    const [bx, bz] = oct[(i + 1) % 8];
    const w = Math.hypot(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const yaw = Math.atan2(mx, mz);
    const diag = i % 2 === 1;
    // Lower part foil, upper part painted panel.
    const lo = foilSheet(diag ? M.amber : M.gold, w, split - y0, 0.03);
    lo.position.set(mx * 1.004, (y0 + split) / 2, mz * 1.004);
    lo.rotation.y = yaw;
    add(g, lo);
    const hi = foilSheet(M.white, w, y1 - split, 0.006);
    hi.position.set(mx * 1.004, (split + y1) / 2, mz * 1.004);
    hi.rotation.y = yaw;
    add(g, hi);
  }
  const base = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.black);
  base.rotation.x = Math.PI / 2;
  base.position.y = y0 - 0.005;
  add(g, base);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.aluDark);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = y1 + 0.005;
  add(g, deck);
}

/** Two long rover ramps down the front, each two rails and rungs. */
function changeRamps(g: THREE.Object3D, M: Record<string, Mat>): void {
  const ramps = new THREE.Group();
  ramps.name = 'ramps';
  add(g, ramps);
  const top = CE_BODY.y1 + 0.07;
  for (const x of [-0.3, 0.3]) {
    const a = V(x, top, CE_BODY.half + 0.1);
    const b = V(x, 0.08, 3.4);
    beam(ramps, M.silver, a, b, 0.5, 0.04);
    for (const s of [-1, 1])
      beam(
        ramps,
        M.alu,
        a.clone().add(V(s * 0.26, 0.03, 0)),
        b.clone().add(V(s * 0.26, 0.03, 0)),
        0.04,
        0.06,
      );
    for (let i = 1; i < 14; i++) {
      const p = a.clone().lerp(b, i / 14);
      const r = box(ramps, M.steel, 0.46, 0.02, 0.035, p.x, p.y + 0.03, p.z);
      r.rotation.x = -Math.atan2(top - 0.08, 3.4 - CE_BODY.half - 0.1);
    }
  }
}

export function buildChange34(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  const { y0, y1, half, chamfer } = CE_BODY;
  const oct = octagon(half, chamfer);
  changeBody(g, M, oct, y0, y1, 0.52);
  // Descent engine and the four small attitude / braking thrusters at the corners.
  lathe(g, M.bell, [
    [0.2, y0 - 0.05],
    [0.28, y0 - 0.28],
    [0.38, y0 - 0.55],
    [0.43, y0 - 0.72],
  ]);
  lathe(g, M.bellIn, [
    [0.43, y0 - 0.72],
    [0.37, y0 - 0.55],
    [0.27, y0 - 0.28],
    [0.19, y0 - 0.05],
  ]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * 0.82;
    const z = Math.cos(a) * 0.82;
    cyl(g, M.bell, 0.07, 0.035, 0.22, x, y0 - 0.1, z, 12);
    box(g, M.gold, 0.2, 0.04, 0.2, x, y0 - 0.02, z).rotation.y = a;
  }
  // Four legs on the diagonals (the front, +z, is between two of them, on the ramps).
  for (let i = 0; i < 4; i++) {
    lander_leg(g, M, {
      az: (i / 4) * Math.PI * 2 + Math.PI / 4,
      topR: 1.12,
      topY: y1 - 0.12,
      padR: CE_PAD_R,
      padSize: 0.4,
      braceR: 0.98,
      braceY: y0 + 0.1,
      braceS: 0.35,
      wrap: M.gold,
      r: 0.09,
    });
  }
  changeRamps(g, M);
  // Rover cradle on the top deck: four hold-down posts and the rover's shadow plate.
  for (const [x, z] of [
    [-0.55, 0.6],
    [0.55, 0.6],
    [-0.55, -0.1],
    [0.55, -0.1],
  ]) {
    box(g, M.silver, 0.12, 0.12, 0.12, x, y1 + 0.06, z);
  }
  // Solar wings on the rear diagonals, tilted up, hinged on the top edge.
  for (const s of [-1, 1]) {
    const wing = solarPanel(M, 0.9, 1.1, 0.12);
    const pivot = new THREE.Group();
    pivot.position.set(s * 1.02, y1 - 0.05, -0.5);
    wing.position.x = s * 0.45;
    pivot.rotation.z = s * rad(-28);
    add(pivot, wing);
    add(g, pivot);
    userData(pivot);
  }
  // Camera mast at the rear of the deck, the steerable X-band dish on its boom.
  const mx = 0;
  const mz = -0.62;
  strut(g, M.silver, V(mx, y1, mz), V(mx, y1 + 0.72, mz), 0.035, 10);
  const head = box(g, M.white, 0.34, 0.12, 0.12, mx, y1 + 0.78, mz);
  for (const s of [-1, 1]) {
    const l = cyl(head, M.glass, 0.032, 0.032, 0.02, s * 0.1, 0, 0.065, 14);
    l.rotation.x = Math.PI / 2;
  }
  const dishBoom = beam(g, M.alu, V(0.55, y1, -0.1), V(0.62, y1 + 0.35, -0.25), 0.04, 0.04);
  void dishBoom;
  const dishMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 24, 10, 0, Math.PI * 2, 0, 0.9),
    M.petal,
  );
  dishMesh.scale.set(1, 0.5, 1);
  dishMesh.rotation.set(rad(-120), 0, 0);
  dishMesh.position.set(0.62, y1 + 0.42, -0.28);
  add(g, dishMesh);
  strut(g, M.steel, V(0.62, y1 + 0.35, -0.25), V(0.62, y1 + 0.6, -0.1), 0.01, 5);
  // Omni antenna whip and the terrain-camera boxes on the front corners.
  strut(g, M.steel, V(-0.7, y1, -0.5), V(-0.72, y1 + 0.55, -0.5), 0.01, 5);
  for (const s of [-1, 1]) box(g, M.dark, 0.14, 0.12, 0.1, s * 0.7, y1 + 0.06, 0.82);
  // Side radiator panels (white) low on the axis faces and the landing camera under the nose.
  for (const s of [-1, 1]) box(g, M.white, 0.02, 0.5, 0.8, s * (half + 0.02), y1 - 0.45, 0);
  return finish(g, CHANGE34_HEIGHT_M);
}

/** Tag a solar wing so a launch can keep it stowed. */
function userData(o: THREE.Object3D): void {
  o.userData.solarArray = true;
}

// --- Yutu / Yutu-2 -----------------------------------------------------------------------

const YUTU_HEIGHT_M = 1.5;
const YT_R = 0.15;
const YT_W = 0.12;
const YT_TRACK = 0.44;
const YT_Z = [0.52, 0.0, -0.52];

/** A Yutu wheel: an aluminium drum with slanted cleats, six curved spokes, a hub. Axis along x. */
function yutuWheel(M: Record<string, Mat>, side: number): THREE.Group {
  const w = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(YT_R, YT_R, YT_W, 32, 1, true), M.alu);
  rim.rotation.z = Math.PI / 2;
  add(w, rim);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const c = box(w, M.alu, YT_W * 0.5, 0.01, 0.014, (s * YT_W) / 4, 0, 0);
      c.position.set((s * YT_W) / 4, Math.cos(a) * (YT_R + 0.004), Math.sin(a) * (YT_R + 0.004));
      c.rotation.set(a, s * 0.4, 0);
    }
  }
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.04, YT_R, 28), M.aluDark);
  disc.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  disc.position.x = (-(side * YT_W) / 2) * 0.5;
  add(w, disc);
  const inner = (side * YT_W) / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const a2 = a + 0.45;
    beam(
      w,
      M.silver,
      V(inner, Math.cos(a) * 0.04, Math.sin(a) * 0.04),
      V(inner, Math.cos(a2) * (YT_R - 0.015), Math.sin(a2) * (YT_R - 0.015)),
      0.008,
      0.024,
    );
  }
  const hub = cyl(w, M.dark, 0.045, 0.045, 0.08, inner, 0, 0, 14);
  hub.rotation.z = Math.PI / 2;
  return w;
}

export function buildYutu(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  // Rocker-bogie on each side.
  for (const s of [-1, 1]) {
    const legX = s * (YT_TRACK - YT_W / 2 - 0.04);
    const pivot = V(s * 0.4, 0.55, 0.06);
    const frontTop = V(legX, 0.4, YT_Z[0]);
    const bogie = V(legX, 0.36, -0.25);
    const midTop = V(legX, 0.3, YT_Z[1]);
    const rearTop = V(legX, 0.36, YT_Z[2]);
    beam(g, M.steel, pivot, frontTop, 0.04, 0.05);
    beam(g, M.steel, pivot, bogie, 0.04, 0.05);
    beam(g, M.steel, bogie, midTop, 0.035, 0.045);
    beam(g, M.steel, bogie, rearTop, 0.035, 0.045);
    cyl(g, M.dark, 0.04, 0.04, 0.07, pivot.x, pivot.y, pivot.z, 12).rotation.z = Math.PI / 2;
    for (const [i, top] of [frontTop, midTop, rearTop].entries()) {
      strut(g, M.silver, top, V(legX, YT_R, YT_Z[i]), 0.018, 8);
      if (i !== 1) cyl(g, M.gold, 0.035, 0.035, 0.06, top.x, top.y + 0.03, top.z, 12);
      const w = yutuWheel(M, s);
      w.position.set(s * YT_TRACK, YT_R, YT_Z[i]);
      add(g, w);
    }
  }
  // The body: a dark equipment tray under a gold blanket-wrapped warm box.
  box(g, M.aluDark, 0.74, 0.1, 0.96, 0, 0.5, 0);
  foilBox(g, M.gold, 0.74, 0.24, 0.96, 0, 0.67, 0, 0.012);
  box(g, M.silver, 0.5, 0.02, 0.6, 0, 0.795, 0.12);
  // Front: the arm folded under the nose with the spectrometer head, hazard cameras.
  box(g, M.aluDark, 0.14, 0.08, 0.2, 0, 0.46, 0.58);
  strut(g, M.steel, V(-0.04, 0.46, 0.66), V(-0.04, 0.46, 0.78), 0.02, 6);
  box(g, M.dark, 0.1, 0.09, 0.08, -0.04, 0.46, 0.8);
  for (const x of [-0.18, 0.18]) {
    const h = box(g, M.dark, 0.07, 0.05, 0.05, x, 0.6, 0.5);
    const l = cyl(h, M.glass, 0.017, 0.017, 0.01, 0, 0, 0.028, 10);
    l.rotation.x = Math.PI / 2;
  }
  // The big panel on the back half of the top, hinged at its front edge and tilted up.
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.8, -0.15);
  hinge.rotation.x = rad(32);
  const panel = solarPanel(M, 0.7, 0.72, 0.1);
  panel.position.z = -0.36;
  add(hinge, panel);
  add(g, hinge);
  hinge.userData.solarArray = true;
  strut(g, M.silver, V(-0.28, 0.8, -0.2), V(-0.28, 0.9, -0.58), 0.014, 6);
  strut(g, M.silver, V(0.28, 0.8, -0.2), V(0.28, 0.9, -0.58), 0.014, 6);
  // Mast with the camera head: pan-cams outside, nav-cams inside.
  const mastX = 0.18;
  strut(g, M.silver, V(mastX, 0.8, 0.18), V(mastX, 1.4, 0.18), 0.022, 10);
  const head = box(g, M.white, 0.3, 0.1, 0.1, mastX, 1.45, 0.18);
  for (const [x, r] of [
    [-0.11, 0.028],
    [-0.04, 0.02],
    [0.04, 0.02],
    [0.11, 0.028],
  ]) {
    const l = cyl(head, M.glass, r, r, 0.01, x, 0, 0.055, 12);
    l.rotation.x = Math.PI / 2;
  }
  box(g, M.silver, 0.1, 0.03, 0.04, mastX, 1.5, 0.18);
  // Rear: antennas. the steerable high-gain dish on a post.
  const dishAt = V(-0.24, 0.95, -0.46);
  strut(g, M.silver, V(-0.24, 0.8, -0.46), dishAt, 0.018, 8);
  const cup = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 8, 0, Math.PI * 2, 0, 0.95),
    M.petal,
  );
  cup.scale.set(1, 0.55, 1);
  cup.rotation.x = rad(-100);
  cup.position.copy(dishAt);
  add(g, cup);
  strut(
    g,
    M.steel,
    dishAt.clone().add(V(0, -0.02, 0)),
    dishAt.clone().add(V(0, 0.01, 0.09)),
    0.008,
    5,
  );
  strut(g, M.steel, V(0.3, 0.8, -0.4), V(0.32, 1.1, -0.42), 0.008, 5);
  // Belly: the ground-penetrating radar boxes.
  box(g, M.dark, 0.3, 0.05, 0.2, 0, 0.4, 0.15);
  return finish(g, YUTU_HEIGHT_M);
}

// --- Chang'e 5 / 6 -----------------------------------------------------------------------

const CHANGE56_HEIGHT_M = 3.6;
const C5 = { y0: 0.95, y1: 1.95, half: 1.3, chamfer: 0.55 };

export function buildChange56(): THREE.Group {
  const M = materials();
  const g = new THREE.Group();
  const { y0, y1, half, chamfer } = C5;
  changeBody(g, M, octagon(half, chamfer), y0, y1, 0.55);
  lathe(g, M.bell, [
    [0.22, y0 - 0.05],
    [0.3, y0 - 0.3],
    [0.42, y0 - 0.58],
    [0.48, y0 - 0.78],
  ]);
  lathe(g, M.bellIn, [
    [0.48, y0 - 0.78],
    [0.41, y0 - 0.58],
    [0.29, y0 - 0.3],
    [0.21, y0 - 0.05],
  ]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    cyl(g, M.bell, 0.08, 0.04, 0.24, Math.sin(a) * 0.95, y0 - 0.12, Math.cos(a) * 0.95, 12);
  }
  for (let i = 0; i < 4; i++) {
    lander_leg(g, M, {
      az: (i / 4) * Math.PI * 2 + Math.PI / 4,
      topR: 1.45,
      topY: y1 - 0.15,
      padR: 2.45,
      padSize: 0.45,
      braceR: 1.3,
      braceY: y0 + 0.1,
      braceS: 0.4,
      wrap: M.gold,
      r: 0.1,
    });
  }
  // The ascender: a gold octagonal vehicle on the deck, with the sample port on top.
  const asc = new THREE.Group();
  asc.name = 'ascent-stage';
  asc.position.y = y1;
  add(g, asc);
  const ao = octagon(0.74, 0.3);
  const aShape = new THREE.Shape(ao.map(([x, z]) => new THREE.Vector2(x * 0.95, z * 0.95)));
  const aCore = new THREE.Mesh(
    new THREE.ExtrudeGeometry(aShape, { depth: 1.05, bevelEnabled: false }),
    M.amber,
  );
  aCore.rotation.x = Math.PI / 2;
  aCore.position.y = 1.15;
  add(asc, aCore);
  for (let i = 0; i < 8; i++) {
    const [ax, az] = ao[i];
    const [bx, bz] = ao[(i + 1) % 8];
    const w = Math.hypot(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const s = foilSheet(i % 2 ? M.gold : M.amber, w * 1.07, 1.08, 0.008);
    s.position.set(mx * 1.015, 0.62, mz * 1.015);
    s.rotation.y = Math.atan2(mx, mz);
    add(asc, s);
  }
  const aTop = new THREE.Mesh(new THREE.ShapeGeometry(aShape), M.silver);
  aTop.rotation.x = -Math.PI / 2;
  aTop.position.y = 1.16;
  add(asc, aTop);
  torus(asc, M.steel, 0.35, 0.03, 0, 1.2, 0, 28);
  cyl(asc, M.dark, 0.3, 0.32, 0.24, 0, 1.28, 0, 24);
  cyl(asc, M.black, 0.22, 0.22, 0.02, 0, 1.41, 0, 24);
  // The sample canister and the top-deck omni whip, four attitude-thruster clusters.
  cyl(asc, M.silver, 0.12, 0.12, 0.08, 0, 1.46, 0, 18);
  strut(asc, M.steel, V(0.5, 1.16, -0.4), V(0.55, 1.62, -0.45), 0.01, 5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * 0.82;
    const z = Math.cos(a) * 0.82;
    box(asc, M.alu, 0.14, 0.14, 0.14, x, 0.9, z).rotation.y = a;
    cyl(asc, M.bell, 0.03, 0.05, 0.1, x * 1.06, 0.9, z * 1.06, 8);
  }
  box(asc, M.white, 0.02, 0.5, 0.45, 0.76, 0.6, 0.2);
  // Lander side: the drill tower, the sampling arm folded at the front, the sample container.
  const towerX = -1.42;
  box(g, M.aluDark, 0.22, 1.5, 0.26, towerX, y1 - 0.2 + 0.0, 0.2);
  cyl(g, M.steel, 0.045, 0.045, 1.4, towerX - 0.02, y1 - 0.2, 0.32, 10);
  box(g, M.gold, 0.28, 0.2, 0.3, towerX, y1 + 0.6, 0.2);
  strut(g, M.steel, V(towerX, y1 + 0.7, 0.2), V(towerX, y1 + 1.0, 0.2), 0.015, 6);
  const armBase = V(0.6, y1 + 0.05, half - 0.08);
  box(g, M.aluDark, 0.22, 0.14, 0.2, armBase.x, armBase.y, armBase.z);
  const e1 = armBase.clone().add(V(0.25, 0.32, 0.28));
  const e2 = e1.clone().add(V(0.15, -0.08, 0.5));
  strut(g, M.silver, armBase, e1, 0.04, 8);
  ball(g, M.dark, 0.06, e1.x, e1.y, e1.z, 12);
  strut(g, M.silver, e1, e2, 0.035, 8);
  const scoop = box(g, M.steel, 0.1, 0.12, 0.14, e2.x, e2.y - 0.02, e2.z + 0.04);
  scoop.rotation.x = 0.4;
  // Camera mast and the dish at the back of the deck.
  strut(g, M.silver, V(-0.4, y1, -1.0), V(-0.4, y1 + 0.65, -1.0), 0.03, 10);
  const head = box(g, M.white, 0.3, 0.1, 0.1, -0.4, y1 + 0.7, -1.0);
  for (const s of [-1, 1]) {
    const l = cyl(head, M.glass, 0.028, 0.028, 0.02, s * 0.09, 0, 0.055, 12);
    l.rotation.x = Math.PI / 2;
  }
  strut(g, M.silver, V(0.6, y1, -1.0), V(0.62, y1 + 0.4, -1.0), 0.03, 8);
  const dishMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 10, 0, Math.PI * 2, 0, 0.9),
    M.petal,
  );
  dishMesh.scale.set(1, 0.5, 1);
  dishMesh.rotation.set(rad(-125), 0, 0);
  dishMesh.position.set(0.62, y1 + 0.45, -1.0);
  add(g, dishMesh);
  for (const s of [-1, 1]) box(g, M.white, 0.02, 0.55, 1.0, s * (half + 0.02), y1 - 0.5, -0.1);
  // Deck-edge instruments on the lander, and the solar wings folded to the sides.
  for (const s of [-1, 1]) {
    const wing = solarPanel(M, 0.8, 1.4, 0.12);
    const pivot = new THREE.Group();
    pivot.position.set(s * (half + 0.02), y1 - 0.6, 0.0);
    wing.position.x = s * 0.4;
    pivot.rotation.z = s * rad(-62);
    add(pivot, wing);
    add(g, pivot);
    userData(pivot);
  }
  return finish(g, CHANGE56_HEIGHT_M);
}

const REFS_COMMON: ShowcaseRef[] = [
  {
    l: 'Wikipedia (EN) — Luna 9: 58 cm landing capsule, 99 kg, four petals opened after landing',
    u: 'https://en.wikipedia.org/wiki/Luna_9',
  },
  {
    l: 'Wikipedia (EN) — Luna 24: KT descent stage as the Lunokhod bus; ascent stage with spherical return capsule, about 2 m tall',
    u: 'https://en.wikipedia.org/wiki/Luna_24',
  },
  {
    l: 'Wikipedia (EN) — Luna 16: descent stage cylindrical body, four legs, fuel tanks, landing radar, drill arm',
    u: 'https://en.wikipedia.org/wiki/Luna_16',
  },
  {
    l: 'Wikipedia (EN) — Lunokhod 1: tub on eight wheels, convex lid with solar cells inside, 135 cm closed, 170 x 160 cm',
    u: 'https://en.wikipedia.org/wiki/Lunokhod_1',
  },
  {
    l: 'Wikipedia (EN) — Lunokhod 2: third camera, magnetometer on a 2.5 m boom',
    u: 'https://en.wikipedia.org/wiki/Lunokhod_2',
  },
  {
    l: 'Wikipedia (EN) — Chang’e 3 and Yutu: rover 1.5 m long, 1.0 m wide, mast about 1.5 m, six wheels',
    u: 'https://en.wikipedia.org/wiki/Chang%27e_3',
  },
  {
    l: 'Wikipedia (EN) — Chang’e 4 and Yutu-2: 1.5 x 1.0 x 1.0 m, 140 kg',
    u: 'https://en.wikipedia.org/wiki/Chang%27e_4',
  },
  {
    l: 'Wikipedia (EN) — Chang’e 5 and 6: lander with ascender on top, drill and scoop sampling',
    u: 'https://en.wikipedia.org/wiki/Chang%27e_5',
  },
  {
    l: 'Bonhams — Lavochkin Luna 9 model: four stabilising petals, rotating mirror and camera head, antennae',
    u: 'https://www.bonhams.com/auction/24898/lot/579/luna-9-soviet-lunar-lander-model/',
  },
  {
    l: 'Wikipedia (EN) — Luna 17: Lunokhod 1 on the E-8 landing stage with its two descent ramps',
    u: 'https://en.wikipedia.org/wiki/Luna_17',
  },
  {
    l: 'NASA NSSDC — Lunokhod 1: tub with convex lid, helical and cone antennas, TV cameras, polonium-210 heater, French reflector',
    u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-095D',
  },
];

const pick = (i: number[]): ShowcaseRef[] => i.map((k) => REFS_COMMON[k]);

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'luna-9': {
    build: buildLuna9,
    heightM: LUNA9_HEIGHT_M,
    heightEstimate: 'The 58 cm capsule (published) with its antennas raised, scaled from photos.',
    diameterM: 0.58,
    refs: pick([0, 8]),
  },
  'luna-16': {
    build: buildLunaSampleReturn,
    heightM: KT_ASCENT_HEIGHT_M,
    heightEstimate: 'The 2 m ascent stage (published) on the KT landing stage, scaled from photos.',
    diameterM: 1.7,
    refs: pick([2, 1]),
  },
  luna24: {
    build: buildLunaSampleReturn,
    heightM: KT_ASCENT_HEIGHT_M,
    heightEstimate: 'The 2 m ascent stage (published) on the KT landing stage, scaled from photos.',
    diameterM: 1.7,
    refs: pick([1, 2]),
  },
  'lunokhod-1': {
    build: buildLunokhod,
    heightM: LUNOKHOD_HEIGHT_M,
    heightEstimate: 'Lid open as on the surface; the published 1.35 m is with the lid closed.',
    diameterM: 1.6,
    refs: pick([3, 10, 9]),
  },
  'lunokhod-2': {
    build: buildLunokhod,
    heightM: LUNOKHOD_HEIGHT_M,
    heightEstimate: 'Lid open as on the surface; the published 1.35 m is with the lid closed.',
    diameterM: 1.6,
    refs: pick([4, 3, 10, 9]),
  },
  'change-3': {
    build: buildChange34,
    heightM: CHANGE34_HEIGHT_M,
    heightEstimate: 'No published height: scaled from photos against the 1.4 m Yutu on its deck.',
    diameterM: 2.0,
    refs: pick([5]),
  },
  'change-4': {
    build: buildChange34,
    heightM: CHANGE34_HEIGHT_M,
    heightEstimate: 'No published height: scaled from photos against the 1.4 m Yutu on its deck.',
    diameterM: 2.0,
    refs: pick([6, 5]),
  },
  yutu: {
    build: buildYutu,
    heightM: YUTU_HEIGHT_M,
    heightEstimate: 'Wikipedia gives a 1.5 m mast height; not yet checked against CNSA.',
    diameterM: 1.0,
    refs: pick([5]),
  },
  'yutu-2': {
    build: buildYutu,
    heightM: YUTU_HEIGHT_M,
    heightEstimate: 'Wikipedia gives a 1.5 m mast height; not yet checked against CNSA.',
    diameterM: 1.0,
    refs: pick([6]),
  },
  'change-5': {
    build: buildChange56,
    heightM: CHANGE56_HEIGHT_M,
    heightEstimate: 'No published height: scaled from photos against the lander footprint.',
    diameterM: 2.6,
    refs: pick([7]),
  },
  change6: {
    build: buildChange56,
    heightM: CHANGE56_HEIGHT_M,
    heightEstimate: 'No published height: scaled from photos against the lander footprint.',
    diameterM: 2.6,
    refs: pick([7]),
  },
};
