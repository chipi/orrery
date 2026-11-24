/**
 * Showcase models: inner-solar-system orbiters (Parker Solar Probe, Solar Orbiter, MESSENGER,
 * Magellan, Akatsuki). Each stands upright with its long stowed axis vertical, base on y = 0,
 * front facing +z; sun-side hardware (heat shields, sunshades) is drawn at its real size.
 * Blanketed bodies are crinkled foil with tape seams, panels are seamed cell strips, and the
 * thrusters, radiators, trackers and booms are drawn as hardware.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function pal(cell = 0x1a2a55): Record<string, Mat> {
  return {
    gold: mat(0xc99a3c, 0.55, 0.4, true),
    foil: mat(0xb9bcc2, 0.6, 0.35, true),
    tape: mat(0xd9b24a, 0.3, 0.5),
    carbon: mat(0x26262a, 0.3, 0.8),
    white: mat(0xe8e5dc, 0.1, 0.7),
    cream: mat(0xd9ceb0, 0.1, 0.85),
    dark: mat(0x1b1c20, 0.4, 0.6),
    metal: mat(0xb4b8be, 0.7, 0.4),
    titan: mat(0x8d9096, 0.75, 0.35),
    cell: mat(cell, 0.6, 0.3),
    seam: mat(0xc9a64a, 0.7, 0.35),
    mirror: mat(0xcfd3d8, 0.8, 0.2),
    dbl: Object.assign(mat(0xe6e4de, 0.15, 0.55), { side: THREE.DoubleSide }),
    dblDark: Object.assign(mat(0x26262a, 0.3, 0.8), { side: THREE.DoubleSide }),
  };
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rBot: number,
  rTop: number,
  y0: number,
  y1: number,
  seg = 32,
  x = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** A cylinder along z between two z values, at (x, y). */
function cylZ(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  z0: number,
  z1: number,
  x: number,
  y: number,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, (z0 + z1) / 2);
  return add(g, mesh);
}

/** A crinkled blanketed prism (hexagon, decagon, ...) standing on y0, `h` tall. */
function foilPrism(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  h: number,
  y0: number,
  sides: number,
  amp = 0.014,
  rotY = 0,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.CylinderGeometry(r, r, h, sides, Math.max(2, Math.round(h / 0.22))),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = y0 + h / 2;
  mesh.rotation.y = rotY;
  return add(g, mesh);
}

/** A crinkled blanketed box w x h x d centred at (x, y, z), with tape bands on its faces. */
function foilBlock(
  g: THREE.Object3D,
  m: Mat,
  tape: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  amp = 0.016,
): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  const geo = crinkle(
    new THREE.BoxGeometry(
      w,
      h,
      d,
      Math.max(2, Math.round(w / 0.24)),
      Math.max(2, Math.round(h / 0.24)),
      Math.max(2, Math.round(d / 0.24)),
    ),
    amp,
  );
  grp.add(new THREE.Mesh(geo, m));
  const t = 0.014;
  for (const f of [1 / 3, 2 / 3]) {
    box(grp, tape, w + 0.012, t, d + 0.012, 0, -h / 2 + h * f, 0);
    box(grp, tape, t, h + 0.012, d + 0.012, -w / 2 + w * f, 0, 0);
    box(grp, tape, w + 0.012, h + 0.012, t, 0, 0, -d / 2 + d * f);
  }
  return add(g, grp);
}

/** A paraboloid dish with vertex at `pos` and axis along `dir`; rim, ribs, feed on a tripod. */
function dishAt(
  g: THREE.Object3D,
  m: Mat,
  rimM: Mat,
  R: number,
  depth: number,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  feedLen: number,
  ribs = 12,
): THREE.Group {
  const wrap = add(g, new THREE.Group());
  wrap.position.copy(pos);
  wrap.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
  const pts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const r = Math.max(0.01, (R * i) / 14);
    pts.push([r, depth * (r / R) ** 2]);
  }
  lathe(wrap, m, pts, 40);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, Math.max(0.01, R * 0.014), 6, 48), rimM);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = depth;
  wrap.add(rim);
  for (let k = 0; k < ribs; k++) {
    const a = (k / ribs) * TAU;
    strut(wrap, rimM, V(0, 0.01, 0), V(Math.cos(a) * R, depth, Math.sin(a) * R), 0.006, 4);
  }
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 6;
    strut(
      wrap,
      rimM,
      V(Math.cos(a) * R * 0.92, depth * 0.85, Math.sin(a) * R * 0.92),
      V(0, feedLen, 0),
      Math.max(0.006, R * 0.01),
      5,
    );
  }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.07, R * 0.1, R * 0.12, 14), rimM);
  feed.position.y = feedLen;
  wrap.add(feed);
  return wrap;
}

/**
 * A solar panel in the x-y plane facing +z, centred on the origin: frame, cell slab, one seam
 * per cell column and row, and a hinge bar. `mirrors` leaves every third row a reflector strip.
 */
function cellPanel(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  w: number,
  h: number,
  cols: number,
  rows: number,
  mirrors = false,
): THREE.Group {
  const p = new THREE.Group();
  const t = 0.04;
  box(p, M.metal, w, h, t, 0, 0, 0);
  box(p, M.cell, w - 0.07, h - 0.07, t, 0, 0, 0.006);
  for (let i = 1; i < cols; i++) {
    box(p, M.seam, 0.008, h - 0.07, t + 0.012, -w / 2 + 0.035 + ((w - 0.07) * i) / cols, 0, 0.006);
  }
  for (let j = 0; j < rows; j++) {
    const y0 = -h / 2 + 0.035 + ((h - 0.07) * j) / rows;
    if (j > 0) box(p, M.seam, w - 0.07, 0.008, t + 0.012, 0, y0, 0.006);
    if (mirrors && j % 3 === 2) {
      box(
        p,
        M.mirror,
        w - 0.09,
        (h - 0.07) / rows - 0.03,
        t + 0.01,
        0,
        y0 + (h - 0.07) / rows / 2,
        0.008,
      );
    }
  }
  box(p, M.titan, w + 0.02, 0.03, t + 0.03, 0, h / 2, 0);
  box(p, M.titan, w + 0.02, 0.03, t + 0.03, 0, -h / 2, 0);
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  p.userData.solarArray = true;
  return add(g, p);
}

/** A ring of `n` small thruster pods on a circle of radius r at height y, pointing outward. */
function thrusterRing(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  n: number,
  r: number,
  y: number,
  phase: number,
  size: number,
): void {
  for (let k = 0; k < n; k++) {
    const a = phase + (k / n) * TAU;
    const pod = new THREE.Group();
    pod.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
    pod.rotation.y = a;
    box(pod, M.metal, size * 1.6, size * 1.6, size * 0.8, 0, 0, 0);
    cylZ(pod, M.dark, size * 0.35, size * 0.6, 0.0, size * 1.3, 0, 0, 10);
    add(g, pod);
  }
}

// ---------------------------------------------------------------------------------------------
// Parker Solar Probe: 3.0 m tall, carbon-carbon TPS (2.3 m) on top
// ---------------------------------------------------------------------------------------------

function buildParker(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x232f52);
  const BR = 0.5; // hexagonal bus, corner radius

  // launch-adapter ring and the hexagonal bus, gold blanket with tape seams
  cyl(g, M.dark, 0.46, 0.46, 0, 0.12, 36);
  foilPrism(g, M.gold, BR, 1.2, 0.12, 6, 0.012, Math.PI / 6);
  cyl(g, M.dark, BR + 0.02, BR + 0.02, 1.3, 1.34, 6).rotation.y = Math.PI / 6;
  for (const y of [0.45, 0.85]) {
    const band = cyl(g, M.tape, BR + 0.02, BR + 0.02, y, y + 0.018, 6);
    band.rotation.y = Math.PI / 6;
  }
  // radiators and instrument faces on the bus corners
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    const r = BR * Math.cos(Math.PI / 6) + 0.012;
    const face = new THREE.Group();
    face.position.set(Math.sin(a + Math.PI / 6) * r, 0.72, Math.cos(a + Math.PI / 6) * r);
    face.rotation.y = a + Math.PI / 6;
    if (k % 2 === 0) {
      box(face, M.foil, 0.42, 0.62, 0.02, 0, 0, 0);
      for (let s = -2; s <= 2; s++) box(face, M.dark, 0.38, 0.012, 0.024, 0, s * 0.12, 0);
    } else {
      box(face, M.metal, 0.3, 0.24, 0.03, 0, 0.1, 0);
      cylZ(face, M.dark, 0.05, 0.05, 0, 0.1, 0, -0.14, 14);
    }
    add(g, face);
  }
  thrusterRing(g, M, 6, BR * 0.9, 0.22, Math.PI / 6, 0.05);
  thrusterRing(g, M, 6, BR * 0.9, 1.22, 0, 0.045);
  // propellant tank dome on the aft end
  lathe(
    g,
    M.titan,
    [
      [0.02, 0.0],
      [0.18, 0.04],
      [0.3, 0.12],
    ],
    24,
  );

  // secondary cone shade, then the six titanium struts up to the 2.3 m primary shield
  lathe(
    g,
    M.dblDark,
    [
      [0.53, 1.34],
      [0.7, 1.9],
      [1.0, 2.8],
    ],
    48,
  );
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(
      g,
      M.titan,
      V(Math.sin(a) * 0.46, 1.34, Math.cos(a) * 0.46),
      V(Math.sin(a + 0.35) * 0.95, 2.8, Math.cos(a + 0.35) * 0.95),
      0.018,
      6,
    );
  }
  // shield: carbon face sheets round a foam core (dark rim), the sun face white-coated
  cyl(g, M.carbon, 1.15, 1.15, 2.78, 2.9, 64);
  const face = cyl(g, M.white, 1.15, 1.15, 2.9, 2.98, 64);
  face.material = M.white;
  lathe(
    g,
    M.white,
    [
      [0.0, 3.0],
      [1.0, 3.0],
      [1.15, 2.98],
    ],
    64,
  );
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.022, 8, 80), M.carbon);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 2.94;
  g.add(rim);
  for (const r of [0.45, 0.8]) {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 4, 80), M.cream);
    groove.rotation.x = Math.PI / 2;
    groove.position.y = 3.0;
    g.add(groove);
  }
  // shield attachment brackets round the rim underside
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.35;
    box(g, M.titan, 0.1, 0.06, 0.1, Math.sin(a) * 0.95, 2.76, Math.cos(a) * 0.95).rotation.y = a;
  }
  // the SWEAP Faraday cups reach out past the shield edge
  for (const a of [0.2, 3.3]) {
    const x = Math.sin(a) * 1.05;
    const z = Math.cos(a) * 1.05;
    cyl(g, M.metal, 0.012, 0.012, 2.4, 2.76, 6, x, z);
    cyl(g, M.dark, 0.06, 0.07, 2.76, 2.86, 14, x, z);
  }

  // two actively cooled arrays: each a 1.12 x 0.69 m primary panel with a canted secondary,
  // on an arm with the titanium coolant tubes and reservoir behind it
  for (const s of [-1, 1]) {
    const arm = box(g, M.metal, 0.42, 0.06, 0.06, s * 0.7, 0.66, 0);
    arm.name = 'array-arm';
    cyl(g, M.titan, 0.05, 0.05, 0.5, 0.82, 12, s * 0.7, -0.07);
    const pri = cellPanel(g, M, 1.12, 0.69, 8, 4);
    pri.position.set(s * (0.5 + 0.14 + 0.56), 0.66, 0);
    for (const dy of [-0.2, 0.2]) {
      cylZ(g, M.titan, 0.012, 0.012, -0.1, -0.02, s * 1.2, 0.66 + dy, 6).rotation.z = Math.PI / 2;
    }
    const hinge = add(g, new THREE.Group());
    hinge.position.set(s * (0.64 + 1.12), 0.66, 0);
    hinge.rotation.y = -s * 0.95;
    const sec = cellPanel(hinge, M, 0.38, 0.69, 3, 4);
    sec.position.set(s * 0.19, 0, 0);
  }

  // 0.6 m high-gain dish on its mast, magnetometer boom out of the aft shadow
  strut(g, M.metal, V(0, 0.85, 0.5), V(0, 0.95, 0.66), 0.03, 8);
  dishAt(g, M.dbl, M.metal, 0.3, 0.1, V(0, 0.95, 0.66), V(0, 0.15, 1), 0.2, 10);
  strut(g, M.dark, V(0.22, 0.12, -0.3), V(0.22, 0.12, -1.7), 0.025, 8);
  for (const z of [-0.8, -1.25]) box(g, M.metal, 0.07, 0.07, 0.07, 0.22, 0.12, z);
  box(g, M.dark, 0.1, 0.1, 0.1, 0.22, 0.12, -1.72);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Solar Orbiter: 3.1 m tall heat shield on the sun (+z) side, 2.5 m wide body, 18 m array span
// ---------------------------------------------------------------------------------------------

function buildSolarOrbiter(): THREE.Group {
  const g = new THREE.Group();
  const H = 3.1;
  const M = pal(0x1a2a55);
  const kapton = mat(0x23201f, 0.45, 0.45, true);

  // body: silver blanket with gold tape seams, behind the shield; black Kapton panel on the side
  foilBlock(g, M.foil, M.tape, 2.5, H - 0.1, 1.9, 0, H / 2, -0.4, 0.02);
  box(g, kapton, 0.02, 1.8, 1.4, 1.27, 1.7, -0.45);
  // radiator and instrument plate on the rear (shaded) face
  box(g, M.white, 1.0, 1.0, 0.04, -0.4, 1.0, -1.37);
  for (let j = -2; j <= 2; j++) box(g, M.dark, 0.96, 0.012, 0.045, -0.4, 1.0 + j * 0.18, -1.37);
  // launch-adapter ring on the underside
  box(g, M.dark, 1.8, 0.1, 1.6, 0, 0.05, -0.4);
  // thruster pods at the body corners
  for (const [x, y] of [
    [-1.2, 0.3],
    [1.2, 0.3],
    [-1.2, 2.7],
    [1.2, 2.7],
  ] as [number, number][]) {
    box(g, M.metal, 0.14, 0.14, 0.14, x, y, -1.38);
    cylZ(g, M.dark, 0.03, 0.05, -1.5, -1.45, x, y, 10);
  }

  // heat shield: stand-off struts, the black layered titanium / calcium-phosphate slab and its
  // reflective foil layers behind it
  for (const sx of [-1, 1]) {
    for (const sy of [0.4, H - 0.4]) {
      strut(g, M.titan, V(sx * 1.0, sy, 0.55), V(sx * 1.15, sy, 0.95), 0.04, 8);
      strut(g, M.titan, V(sx * 1.0, sy, 0.55), V(sx * 0.6, sy, 0.55), 0.03, 6);
    }
  }
  const shieldFoil = foilSheet(M.foil, 2.5, H, 0.02);
  shieldFoil.position.set(0, H / 2, 1.0 - 0.03);
  g.add(shieldFoil);
  box(g, M.carbon, 2.5, H, 0.1, 0, H / 2, 1.1);
  // observing-port doors in the shield, with their hinge frames
  for (const [x, y] of [
    [-0.55, 2.4],
    [0.55, 2.4],
    [0, 0.8],
  ] as [number, number][]) {
    box(g, M.dark, 0.44, 0.34, 0.02, x, y, 1.16);
    box(g, M.titan, 0.5, 0.04, 0.03, x, y + 0.19, 1.16);
    box(g, M.titan, 0.5, 0.04, 0.03, x, y - 0.19, 1.16);
  }
  // the rim bead of the shield and its corner clips
  for (const sy of [0.02, H - 0.02]) box(g, M.titan, 2.54, 0.04, 0.14, 0, sy, 1.1);
  for (const sx of [-1.25, 1.25]) box(g, M.titan, 0.04, H, 0.14, sx, H / 2, 1.1);

  // two arrays, three 2.1 x 1.2 m panels each, hinged along the span, on yokes
  for (const s of [-1, 1]) {
    box(g, M.metal, 1.3, 0.1, 0.08, s * (1.25 + 0.65), 1.5, -0.2).name = 'array-arm';
    box(g, M.titan, 0.12, 1.3, 0.1, s * 1.35, 1.5, -0.2);
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(g, M, 2.1, 1.2, 8, 5);
      p.position.set(s * (1.25 + 1.3 + 2.1 * i + 1.05 + 0.05 * i), 1.5, -0.2);
      box(g, M.titan, 0.07, 1.26, 0.05, s * (1.25 + 1.3 + 2.1 * i + 0.05 * i), 1.5, -0.2);
    }
  }

  // instrument boom (4.4 m) and the 1.5 m high-gain dish, both on the shaded rear
  strut(g, M.metal, V(0.7, 1.9, -1.35), V(0.7, 1.9, -5.75), 0.04, 8);
  for (const z of [-2.5, -4.0, -5.8]) box(g, M.dark, 0.12, 0.12, 0.12, 0.7, 1.9, z);
  box(g, M.metal, 0.2, 0.2, 0.2, 0.7, 1.9, -1.4);
  strut(g, M.metal, V(-0.6, 2.1, -1.35), V(-0.6, 2.1, -1.75), 0.05, 8);
  dishAt(g, M.dbl, M.metal, 0.75, 0.2, V(-0.6, 2.1, -1.75), V(0, 0.1, -1), 0.42, 14);
  // medium-gain horn
  cylZ(g, M.white, 0.05, 0.14, -1.4, -1.65, 0.6, 0.45, 14);
  return g;
}

// ---------------------------------------------------------------------------------------------
// MESSENGER: 2.5 m tall x 2 m wide ceramic-cloth sunshade, 1.27 x 1.42 x 1.85 m bus
// ---------------------------------------------------------------------------------------------

function buildMessenger(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x1a2a55);

  // bus: squat box, 1.42 wide, 1.27 deep, 1.85 tall, behind the shade; blanketed and taped
  foilBlock(g, M.gold, M.tape, 1.42, 1.85, 1.27, 0, 1.25, -0.15, 0.012);
  // radiator and louvres on the rear (shaded) face
  box(g, M.white, 1.0, 0.9, 0.03, 0, 0.9, -0.8);
  for (let j = -3; j <= 3; j++) box(g, M.dark, 0.96, 0.012, 0.035, 0, 0.9 + j * 0.12, -0.8);
  // propellant tanks and the helium sphere show on the upper face
  cyl(g, M.titan, 0.34, 0.34, 2.17, 2.4, 24, -0.3, -0.35);
  lathe(
    g,
    M.titan,
    [
      [0.0, 2.4],
      [0.3, 2.37],
      [0.34, 2.3],
    ],
    24,
  ).position.set(-0.3, 0, -0.35);
  const he = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), M.titan);
  he.position.set(0.35, 2.27, -0.3);
  g.add(he);
  // launch-adapter ring and the LVA nozzle under the bus
  cyl(g, M.dark, 0.5, 0.5, 0, 0.08, 32);
  lathe(
    g,
    M.dark,
    [
      [0.1, 0.08],
      [0.16, 0.2],
      [0.24, 0.34],
    ],
    24,
  );
  cyl(g, M.metal, 0.3, 0.3, 0.325, 0.34, 24);
  // four 22 N thruster cups on the bus corners and a pair of attitude pods
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(g, M.dark, 0.05, 0.08, 0.3, 0.4, 12, sx * 0.62, sz * 0.5 - 0.15);
    }
  }
  // MDIS imager and the laser altimeter on the +x side
  box(g, M.metal, 0.02, 0.3, 0.3, 0.72, 1.0, 0.05);
  cylZ(g, M.dark, 0.07, 0.07, 0.0, 0.25, 0.8, 1.0, 14);

  // sunshade: ceramic-cloth layers standing off the sun (+z) face on struts
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [0.6, 1.9]) {
      strut(g, M.titan, V(sx, sy, 0.4), V(sx * 1.1, sy, 0.78), 0.022, 6);
    }
  }
  const cloth = foilSheet(M.cream, 2.0, 2.5, 0.03);
  cloth.position.set(0, 1.25, 0.84);
  g.add(cloth);
  const back = foilSheet(M.cream, 2.0, 2.5, 0.02);
  back.position.set(0, 1.25, 0.78);
  back.rotation.y = Math.PI;
  g.add(back);
  box(g, M.cream, 2.0, 2.5, 0.03, 0, 1.25, 0.81);
  for (const y of [0.02, 2.48]) box(g, M.titan, 2.0, 0.04, 0.1, 0, y, 0.81);
  for (const x of [-1.0, 1.0]) box(g, M.titan, 0.04, 2.5, 0.1, x, 1.25, 0.81);

  // two rotatable arrays: cells with reflector strips, tip to tip about 6 m
  for (const s of [-1, 1]) {
    box(g, M.metal, 0.3, 0.07, 0.07, s * 0.85, 1.25, -0.15).name = 'array-arm';
    cyl(g, M.titan, 0.04, 0.04, 0.4, 2.1, 10, s * 1.0, -0.15);
    const p = cellPanel(g, M, 2.2, 1.5, 8, 6, true);
    p.position.set(s * (0.9 + 1.1), 1.25, -0.15);
  }

  // 3.6 m magnetometer boom off the shaded top rear
  strut(g, M.metal, V(0, 1.9, -0.78), V(0, 1.9, -4.38), 0.035, 8);
  box(g, M.dark, 0.12, 0.12, 0.12, 0, 1.9, -4.42);
  box(g, M.metal, 0.16, 0.16, 0.16, 0, 1.9, -0.84);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Magellan: 6.4 m stack: Star 48B motor, 10-sided bus, forward equipment module, 3.7 m dish
// ---------------------------------------------------------------------------------------------

function buildMagellan(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x1a2a55);
  const motor = mat(0x6e7075, 0.55, 0.5);
  const dec = Math.PI / 10;

  // solid rocket motor (Star 48B): nozzle bell with its stiffening rings, then the case
  lathe(
    g,
    M.dark,
    [
      [0.14, 0.0],
      [0.3, 0.2],
      [0.5, 0.5],
    ],
    36,
  );
  for (const [y, r] of [
    [0.12, 0.26],
    [0.3, 0.38],
  ] as [number, number][]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 6, 36), M.titan);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }
  lathe(
    g,
    motor,
    [
      [0.0, 0.5],
      [0.62, 0.5],
      [0.62, 1.55],
      [0.5, 1.8],
      [0.4, 1.9],
    ],
    36,
  );
  const sep = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 6, 36), M.metal);
  sep.rotation.x = Math.PI / 2;
  sep.position.y = 1.5;
  g.add(sep);

  // 10-sided aluminium bus (Voyager spare): ten equipment bays and its deck rings
  foilPrism(g, M.metal, 0.92, 0.7, 1.9, 10, 0.004, dec);
  for (const y of [1.9, 2.58]) cyl(g, M.dark, 0.94, 0.94, y, y + 0.04, 10).rotation.y = dec;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    const r = 0.92 * Math.cos(dec) + 0.012;
    const bay = box(
      g,
      k % 3 === 0 ? M.dark : M.white,
      0.4,
      0.5,
      0.025,
      Math.sin(a) * r,
      2.25,
      Math.cos(a) * r,
    );
    bay.rotation.y = a;
  }
  // truss feet joining motor and bus
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU;
    strut(
      g,
      M.titan,
      V(Math.sin(a) * 0.55, 1.58, Math.cos(a) * 0.55),
      V(Math.sin(a + 0.2) * 0.8, 1.92, Math.cos(a + 0.2) * 0.8),
      0.02,
      6,
    );
  }

  // forward equipment module: gold-blanketed drum under the dish, with its tape bands
  foilPrism(g, M.gold, 0.72, 1.8, 2.6, 10, 0.02, dec);
  for (const y of [3.0, 3.5, 4.0]) cyl(g, M.tape, 0.725, 0.725, y, y + 0.018, 10).rotation.y = dec;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    box(
      g,
      M.dark,
      0.3,
      0.4,
      0.05,
      Math.sin(a) * 0.74,
      3.0 + (i % 2) * 0.7,
      Math.cos(a) * 0.74,
    ).rotation.y = a;
  }
  // attitude-control thruster outriggers (lattice booms with a cluster at the end)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + Math.PI / 6;
    const s = Math.sin(a);
    const c = Math.cos(a);
    strut(g, M.titan, V(s * 0.72, 3.9, c * 0.72), V(s * 1.45, 4.0, c * 1.45), 0.02, 6);
    strut(g, M.titan, V(s * 0.72, 4.3, c * 0.72), V(s * 1.45, 4.05, c * 1.45), 0.015, 6);
    box(g, M.metal, 0.14, 0.14, 0.14, s * 1.5, 4.0, c * 1.5);
    cyl(g, M.dark, 0.03, 0.05, 4.05, 4.18, 10, s * 1.5, c * 1.5);
  }

  // 3.7 m graphite / aluminium high-gain dish on a hub, its sub-reflector cone on three struts
  cyl(g, M.metal, 0.25, 0.3, 4.4, 5.5, 20);
  const R = 1.85;
  const depth = 0.7;
  const d = dishAt(g, M.dbl, M.metal, R, depth, V(0, 5.5, 0), V(0, 1, 0), 0.7, 16);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 16), M.white);
  cone.rotation.x = Math.PI;
  cone.position.y = 0.8;
  d.add(cone);
  cyl(g, M.dark, 0.14, 0.06, 6.2, 6.4, 14);

  // two square solar panels on arms either side of the bus, 4.6 m across, on their masts
  for (const s of [-1, 1]) {
    box(g, M.metal, 0.3, 0.08, 0.08, s * 1.0, 2.25, 0).name = 'array-arm';
    cyl(g, M.titan, 0.035, 0.035, 1.55, 3.55, 10, s * 1.9, -0.05);
    const p = cellPanel(g, M, 1.6, 1.6, 8, 8);
    p.position.set(s * (1.1 + 0.8), 2.45, 0);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Akatsuki: 1.04 x 1.44 x 1.45 m box, two arrays, flat phased-array high-gain antenna
// ---------------------------------------------------------------------------------------------

function buildAkatsuki(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x1a2a55);
  const W = 1.04;
  const D = 1.44;
  const H = 1.45;

  // bus box: gold blanket with tape seams, 500 N orbit-manoeuvre engine below
  foilBlock(g, M.gold, M.tape, W, H - 0.18, D, 0, 0.15 + (H - 0.18) / 2, 0, 0.007);
  cyl(g, M.dark, 0.4, 0.4, 0, 0.15, 36);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.014, 6, 36), M.metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  lathe(
    g,
    M.dark,
    [
      [0.07, 0.0],
      [0.12, 0.1],
      [0.18, 0.2],
    ],
    24,
  );

  // flat phased-array high-gain antenna on the front face, a white radiator beside it
  box(g, M.white, 0.8, 0.8, 0.05, 0, 0.95, D / 2 + 0.02);
  box(g, M.dark, 0.7, 0.7, 0.02, 0, 0.95, D / 2 + 0.05);
  for (let i = -3; i <= 3; i++) {
    box(g, M.seam, 0.006, 0.7, 0.024, i * 0.1, 0.95, D / 2 + 0.052);
    box(g, M.seam, 0.7, 0.006, 0.024, 0, 0.95 + i * 0.1, D / 2 + 0.052);
  }
  box(g, M.white, 0.6, 0.3, 0.03, 0, 0.35, D / 2 + 0.015);
  for (let j = -2; j <= 2; j++)
    box(g, M.dark, 0.56, 0.008, 0.034, 0, 0.35 + j * 0.05, D / 2 + 0.016);
  // camera deck on the Venus-looking +x face: IR1, IR2, UVI, LIR and the lightning camera
  for (const [y, z, r] of [
    [1.0, 0.3, 0.07],
    [1.0, 0.0, 0.07],
    [0.65, 0.3, 0.09],
    [0.65, -0.1, 0.06],
    [0.4, -0.3, 0.05],
  ] as [number, number, number][]) {
    const c = cyl(g, M.dark, r, r, W / 2 - 0.02, W / 2 + 0.14, 14, 0, 0);
    c.rotation.z = Math.PI / 2;
    c.position.set(W / 2 + 0.06, y, z);
  }
  // the white 23 N thruster cups at the box corners
  for (const [x, y, z] of [
    [-0.5, 1.33, 0.7],
    [0.5, 1.33, 0.7],
    [-0.5, 1.33, -0.7],
    [0.5, 1.33, -0.7],
    [-0.5, 0.25, 0.7],
    [0.5, 0.25, 0.7],
  ] as [number, number, number][]) {
    cyl(g, M.white, 0.05, 0.065, y - 0.05, y + 0.07, 12, x * 1.04, z * 1.04);
  }
  // medium-gain horn on the -z face
  cylZ(g, M.tape, 0.04, 0.13, -D / 2 - 0.28, -D / 2, 0.25, 0.7, 14);

  // two arrays: a boom out of each side and two stacked panels, 1.0 x 1.4 m, about 1.4 m^2
  for (const s of [-1, 1]) {
    const boom = box(g, M.metal, 0.12, 0.07, 0.07, s * (W / 2 + 0.05), 0.75, 0);
    boom.name = 'array-arm';
    box(g, M.titan, 0.1, 0.1, 0.1, s * (W / 2 + 0.1), 0.75, 0);
    for (const dy of [-0.34, 0.34]) {
      const p = cellPanel(g, M, 1.0, 0.68, 6, 4);
      p.position.set(s * (W / 2 + 0.64), 0.75 + dy, 0);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------------------------

const REF = (l: string, u: string): ShowcaseRef => ({ l, u });

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'parker-solar-probe': {
    build: buildParker,
    heightM: 3,
    diameterM: 2.3,
    refs: [
      REF(
        'NASA NSSDCA: Parker Solar Probe: 3 m bus, 1 m diameter, TPS end 2.3 m diameter, 11.43 cm thick; arrays 1.12 x 0.69 m; 0.6 m high-gain antenna',
        'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-065A',
      ),
      REF(
        'Wikimedia Commons: Parker Solar Probe.jpg (artist view, shield, bus, arrays, boom)',
        encodeURI('https://commons.wikimedia.org/wiki/File:Parker_Solar_Probe.jpg'),
      ),
    ],
  },
  'solar-orbiter': {
    build: buildSolarOrbiter,
    heightM: 3.1,
    diameterM: 2.5,
    refs: [
      REF(
        'ESA: Solar Orbiter factsheet: body 2.5 x 3.1 x 2.7 m (3.1 m used as height), six 2.1 x 1.2 m panels, 18 m span, 4.4 m instrument boom',
        'https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/Solar_Orbiter_factsheet',
      ),
      REF(
        'Wikimedia Commons: Solar Orbiter STM (blanketed body, tape seams, black Kapton)',
        encodeURI('https://commons.wikimedia.org/wiki/File:Solar_Orbiter_STM_(16924827482).jpg'),
      ),
    ],
  },
  messenger: {
    build: buildMessenger,
    heightM: 2.5,
    diameterM: 1.42,
    refs: [
      REF(
        'NASA NSSDCA: MESSENGER: bus 1.27 x 1.42 x 1.85 m, sunshade about 2.5 m tall x 2 m wide (2.5 m used as height), arrays about 6 m tip to tip, 3.6 m magnetometer boom',
        'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2004-030A',
      ),
      REF(
        'Wikimedia Commons: MESSENGER spacecraft model.png (bus, tanks, arrays, sunshade)',
        encodeURI('https://commons.wikimedia.org/wiki/File:MESSENGER_spacecraft_model.png'),
      ),
    ],
  },
  magellan: {
    build: buildMagellan,
    heightM: 6.4,
    diameterM: 3.7,
    refs: [
      REF(
        'Wikipedia (fallback): Magellan: 10-sided bus, 6.4 m tall, 3.7 m high-gain antenna, Star 48B motor',
        'https://en.wikipedia.org/wiki/Magellan_(spacecraft)',
      ),
      REF(
        'Wikimedia Commons: Magellan - artist depiction.png (dish, bus, two square arrays)',
        encodeURI('https://commons.wikimedia.org/wiki/File:Magellan_-_artist_depiction.png'),
      ),
    ],
  },
  akatsuki: {
    build: buildAkatsuki,
    heightM: 1.45,
    diameterM: 1.04,
    refs: [
      REF(
        'Wikipedia (fallback): Akatsuki: 1.45 x 1.04 x 1.44 m box, two arrays of about 1.4 m^2 each (1.45 m used as height)',
        'https://en.wikipedia.org/wiki/Akatsuki_(spacecraft)',
      ),
      REF(
        'Wikimedia Commons: Akatsuki CG01.png (gold box, white thruster cups, stacked array panels)',
        encodeURI('https://commons.wikimedia.org/wiki/File:Akatsuki_CG01.png'),
      ),
    ],
  },
};
