/**
 * Showcase models: small-body explorers (DART, Lucy, Psyche, Europa Clipper). Each stands with
 * the axis its sourced length is measured along vertical (base y = 0), front facing +z, arrays
 * deployed at their real size. Blanketed bodies are crinkled foil with tape seams, arrays are
 * seamed cell strips (or UltraFlex petals), and dishes, thrusters, radiators and booms are
 * drawn as hardware.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

function pal(cell = 0x16254f): Record<string, Mat> {
  return {
    gold: mat(0xc99a3c, 0.55, 0.4, true),
    foil: mat(0xb9bcc2, 0.6, 0.35, true),
    tape: mat(0xd9b24a, 0.3, 0.5),
    white: mat(0xe8e5dc, 0.15, 0.65),
    dark: mat(0x1b1c20, 0.4, 0.6),
    metal: mat(0xb4b8be, 0.7, 0.4),
    titan: mat(0x8d9096, 0.75, 0.35),
    cell: mat(cell, 0.6, 0.3),
    seam: mat(0xc9a64a, 0.7, 0.35),
    kapton: mat(0x9a5a22, 0.45, 0.5, true),
    dbl: Object.assign(mat(0xe6e4de, 0.15, 0.55), { side: THREE.DoubleSide }),
  };
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rBot: number,
  rTop: number,
  y0: number,
  y1: number,
  x = 0,
  z = 0,
  seg = 28,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** A cylinder along z between two z values, at (x, y); r0 at z0, r1 at z1. */
function cylZ(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  z0: number,
  z1: number,
  x: number,
  y: number,
  seg = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, seg), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, (z0 + z1) / 2);
  return add(g, mesh);
}

/** A cylinder along x between two x values, at (y, z). */
function cylX(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  x0: number,
  x1: number,
  y: number,
  z: number,
  seg = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), seg), m);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set((x0 + x1) / 2, y, z);
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
  amp = 0.012,
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

/** A paraboloid dish, vertex at `pos`, axis along `dir`; rim, ribs and a feed on a tripod. */
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
      Math.max(0.006, R * 0.012),
      5,
    );
  }
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.07, R * 0.1, R * 0.12, 14), rimM);
  feed.position.y = feedLen;
  wrap.add(feed);
  return wrap;
}

/**
 * A solar panel in the x-y plane facing +z, centred on the origin: frame, cell slab, a seam per
 * cell column and row, edge bars.
 */
function cellPanel(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  w: number,
  h: number,
  cols: number,
  rows: number,
  t = 0.04,
): THREE.Group {
  const p = new THREE.Group();
  box(p, M.metal, w, h, t, 0, 0, 0);
  box(p, M.cell, w - 0.07, h - 0.07, t, 0, 0, 0.006);
  for (let i = 1; i < cols; i++) {
    box(p, M.seam, 0.008, h - 0.07, t + 0.012, -w / 2 + 0.035 + ((w - 0.07) * i) / cols, 0, 0.006);
  }
  for (let j = 1; j < rows; j++) {
    box(p, M.seam, w - 0.07, 0.008, t + 0.012, 0, -h / 2 + 0.035 + ((h - 0.07) * j) / rows, 0.006);
  }
  box(p, M.titan, w + 0.02, 0.03, t + 0.03, 0, h / 2, 0);
  box(p, M.titan, w + 0.02, 0.03, t + 0.03, 0, -h / 2, 0);
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  p.userData.solarArray = true;
  return add(g, p);
}

/** A louvred radiator plate facing +z of its group, w x h, with `n` louvre slats. */
function radiator(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  w: number,
  h: number,
  n: number,
): THREE.Group {
  const r = new THREE.Group();
  box(r, M.white, w, h, 0.03, 0, 0, 0);
  for (let j = 0; j < n; j++) {
    box(r, M.dark, w - 0.04, 0.012, 0.036, 0, -h / 2 + ((j + 0.5) * h) / n, 0);
  }
  return add(g, r);
}

/** A small attitude thruster pod: a bracket and a nozzle pointing along +z of its group. */
function pod(g: THREE.Object3D, M: Record<string, Mat>, size: number): THREE.Group {
  const p = new THREE.Group();
  box(p, M.metal, size * 1.6, size * 1.6, size * 0.8, 0, 0, 0);
  cylZ(p, M.dark, size * 0.35, size * 0.65, 0, size * 1.4, 0, 0, 10);
  return add(g, p);
}

// ---------------------------------------------------------------------------------------------
// DART: bus 1.8 x 1.9 x 2.6 m, two ROSA roll-out arrays of 8.5 x 2.4 m
// ---------------------------------------------------------------------------------------------

function buildDart(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x1a2c5c);
  const H = 2.6; // bus 1.8 x 1.9 x 2.6 m, the 2.6 m axis vertical
  const W = 1.8;
  const D = 1.9;

  // bus: gold blanket with tape seams, a deck plate at the base
  foilBlock(g, M.gold, M.tape, W, H - 0.1, D, 0, 0.1 + (H - 0.1) / 2, 0, 0.012);
  box(g, M.dark, W + 0.04, 0.1, D + 0.04, 0, 0.05, 0);
  // white radiator plates and a dark band between the foil blocks
  const rl = radiator(g, M, 0.7, 0.55, 5);
  rl.position.set(-0.45, 0.5, D / 2 + 0.02);
  const rr = radiator(g, M, 0.5, 0.9, 7);
  rr.position.set(W / 2 + 0.02, 1.1, -0.3);
  rr.rotation.y = Math.PI / 2;
  // corner thruster pods on the +z face (the 22 N hydrazine cluster)
  for (const [x, y] of [
    [-0.75, 0.3],
    [0.75, 0.3],
    [-0.75, 2.3],
    [0.75, 2.3],
  ] as [number, number][]) {
    const p = pod(g, M, 0.06);
    p.position.set(x, y, D / 2 + 0.04);
  }

  // DRACO camera: baffle with a ring and the dark aperture on the +z face
  cylZ(g, M.dark, 0.2, 0.2, D / 2, D / 2 + 0.45, 0.3, 1.5);
  cylZ(g, M.metal, 0.23, 0.23, D / 2, D / 2 + 0.07, 0.3, 1.5);
  cylZ(g, M.metal, 0.23, 0.23, D / 2 + 0.43, D / 2 + 0.47, 0.3, 1.5);
  // star trackers and the SMART Nav sun sensor
  for (const x of [-0.45, -0.7]) {
    cylZ(g, M.dark, 0.06, 0.07, D / 2, D / 2 + 0.16, x, 2.2);
    cylZ(g, M.metal, 0.08, 0.08, D / 2, D / 2 + 0.03, x, 2.2);
  }
  // LICIACube: the 6U cubesat in its dispenser on the +z face
  box(g, M.white, 0.26, 0.4, 0.2, 0.1, 2.25, D / 2 + 0.1);
  box(g, M.dark, 0.2, 0.06, 0.02, 0.1, 2.38, D / 2 + 0.21);

  // NEXT-C ion engine on the -z face: gimbal frame, body and the dark grid disc
  const nz = -D / 2;
  box(g, M.metal, 0.5, 0.5, 0.06, 0, 1.0, nz - 0.02);
  cylZ(g, M.titan, 0.2, 0.2, nz - 0.3, nz, 0, 1.0);
  cylZ(g, M.dark, 0.185, 0.185, nz - 0.35, nz - 0.3, 0, 1.0);
  for (const dx of [-0.28, 0.28]) cylZ(g, M.titan, 0.025, 0.025, nz - 0.2, nz, dx, 1.0, 8);

  // flat-plate high-gain antenna
  box(g, M.white, 0.55, 0.55, 0.05, -0.45, 1.2, D / 2 + 0.03);
  box(g, M.dark, 0.47, 0.47, 0.02, -0.45, 1.2, D / 2 + 0.06);
  // low-gain horn
  cylZ(g, M.tape, 0.04, 0.12, D / 2, D / 2 + 0.22, 0.45, 0.65, 14);

  // two ROSA roll-out arrays, 8.5 x 2.4 m, each from a stowage tube on a short mast: two rolled
  // booms along the long edges, the cell blanket between them and a tip bar
  for (const s of [1, -1]) {
    const x0 = W / 2 + 0.4;
    const armLen = 8.5;
    box(g, M.metal, 0.4, 0.1, 0.1, s * (W / 2 + 0.2), H / 2, 0).name = 'array-arm';
    cyl(g, M.titan, 0.14, 0.14, H / 2 - 1.25, H / 2 + 1.25, s * (x0 - 0.05), 0, 16);
    for (const dy of [-1.2, 1.2]) cylX(g, M.titan, 0.035, s * x0, s * (x0 + armLen), H / 2 + dy, 0);
    const p = cellPanel(g, M, armLen, 2.3, 34, 6, 0.012);
    p.position.set(s * (x0 + armLen / 2), H / 2, 0);
    box(g, M.titan, 0.08, 2.5, 0.06, s * (x0 + armLen), H / 2, 0);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Lucy: two 7.3 m UltraFlex discs and a 1.7 x 1.4 x 1.5 m bus, 16 m tip to tip
// ---------------------------------------------------------------------------------------------

/** A circular UltraFlex array facing +z with a wedge cut out toward the bus (at angle `notch`). */
function ultraflex(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  R: number,
  x: number,
  y: number,
  notch: number,
): void {
  const gap = 0.4;
  const wrap = add(g, new THREE.Group());
  wrap.position.set(x, y, 0);
  const start = notch + gap / 2;
  const theta = TAU - gap;
  const petals = 10;
  const dt = theta / petals;
  // the orange Kapton backing of the whole disc, then each gore's cells as a darker petal
  wrap.add(new THREE.Mesh(new THREE.CircleGeometry(R, 64, start, theta), M.kapton));
  const cellFace = Object.assign(mat(0x16254f, 0.55, 0.3), { side: THREE.DoubleSide });
  for (let i = 0; i < petals; i++) {
    const p = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.97, 12, start + i * dt + 0.025, dt - 0.05),
      cellFace,
    );
    p.position.z = 0.006;
    wrap.add(p);
    // the cell rows of each gore: arcs at set radii
    for (const rr of [0.3, 0.45, 0.6, 0.75, 0.9]) {
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(
          R * rr - 0.01,
          R * rr + 0.01,
          8,
          1,
          start + i * dt + 0.025,
          dt - 0.05,
        ),
        M.seam,
      );
      arc.position.z = 0.009;
      wrap.add(arc);
    }
  }
  // radial spars between the gores
  for (let i = 0; i <= petals; i++) {
    const a = start + i * dt;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(R, 0.04, 0.025), M.metal);
    rib.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0.014);
    rib.rotation.z = a;
    wrap.add(rib);
  }
  // rim cable and the central hub with the deployment canister
  const rimGeo = new THREE.TorusGeometry(R, 0.02, 6, 96, theta).rotateZ(start);
  const rim = new THREE.Mesh(rimGeo, M.metal);
  rim.position.z = 0.012;
  wrap.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 20), M.metal);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.04;
  wrap.add(hub);
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  wrap.userData.solarArray = true;
}

function buildLucy(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x16264f);
  const R = 3.65; // 7.3 m UltraFlex discs
  const busH = 1.4; // between the discs: 2 x 7.3 + 1.4 = 16 m tip to tip
  const mid = R * 2 + busH / 2; // bus centre height
  const busX = 1.7;
  const busZ = 1.5;

  // bus (long axis across the page, between the two arrays): gold blanket, tape, radiators
  foilBlock(g, M.gold, M.tape, busX, busH, busZ, 0, mid, 0, 0.014);
  box(g, M.dark, busX + 0.02, 0.05, busZ + 0.02, 0, mid, 0);
  const rad = radiator(g, M, 0.8, 0.5, 5);
  rad.position.set(0.3, mid - 0.3, -busZ / 2 - 0.02);
  rad.rotation.y = Math.PI;
  // discs, each notched toward the bus, on yoke struts
  ultraflex(g, M, R, 0, mid + busH / 2 + R, -Math.PI / 2);
  ultraflex(g, M, R, 0, mid - busH / 2 - R, Math.PI / 2);
  for (const s of [1, -1]) {
    box(g, M.metal, 0.16, 0.5, 0.16, 0, mid + s * (busH / 2 + 0.02), -0.1).name = 'array-arm';
    strut(
      g,
      M.titan,
      V(0.45, mid + s * busH * 0.4, -0.2),
      V(0.05, mid + s * (busH / 2 + 0.6), -0.1),
      0.025,
      6,
    );
    strut(
      g,
      M.titan,
      V(-0.45, mid + s * busH * 0.4, -0.2),
      V(-0.05, mid + s * (busH / 2 + 0.6), -0.1),
      0.025,
      6,
    );
  }

  // 2 m high-gain dish on a gimbal on the +z face
  cyl(g, M.metal, 0.07, 0.07, mid - 0.1, mid + 0.1, 0, busZ / 2 + 0.2, 16);
  box(g, M.metal, 0.1, 0.1, 0.4, 0, mid, busZ / 2 + 0.2);
  dishAt(g, M.dbl, M.metal, 1.0, 0.3, V(0, mid, busZ / 2 + 0.55), V(0, 0.15, 1), 0.55, 14);

  // instrument platform on the -x side: deck with the remote-sensing instruments pointing +z
  const px = -busX / 2 - 0.65;
  box(g, M.white, 1.3, 0.8, 0.12, px - 0.1, mid, busZ / 2 - 0.1);
  cylZ(g, M.dark, 0.2, 0.2, busZ / 2 - 0.04, busZ / 2 + 0.6, px - 0.35, mid + 0.15); // L'LORRI
  cylZ(g, M.metal, 0.22, 0.22, busZ / 2 + 0.55, busZ / 2 + 0.62, px - 0.35, mid + 0.15);
  cylZ(g, M.dark, 0.13, 0.13, busZ / 2 - 0.04, busZ / 2 + 0.45, px + 0.15, mid + 0.18);
  box(g, M.metal, 0.4, 0.3, 0.4, px - 0.1, mid - 0.22, busZ / 2 + 0.16); // L'Ralph / L'TES
  strut(
    g,
    M.titan,
    V(-busX / 2, mid - 0.3, busZ / 2 - 0.1),
    V(px + 0.3, mid - 0.3, busZ / 2 - 0.1),
    0.03,
    6,
  );
  // terminal tracking cameras on the +x side
  box(g, M.metal, 0.5, 0.5, 0.15, busX / 2 + 0.3, mid, busZ / 2 - 0.1);
  cylZ(g, M.dark, 0.1, 0.1, busZ / 2 - 0.04, busZ / 2 + 0.3, busX / 2 + 0.3, mid);
  cylZ(g, M.dark, 0.1, 0.1, busZ / 2 - 0.04, busZ / 2 + 0.25, busX / 2 + 0.3, mid - 0.22);
  // thruster cluster and the main engine on the back
  for (const dy of [-0.4, 0.4]) cylZ(g, M.dark, 0.05, 0.1, -busZ / 2 - 0.3, -busZ / 2, 0, mid + dy);
  for (const [x, y] of [
    [-0.8, mid - 0.6],
    [0.8, mid - 0.6],
    [-0.8, mid + 0.6],
    [0.8, mid + 0.6],
  ] as [number, number][]) {
    const p = pod(g, M, 0.06);
    p.position.set(x, y, busZ / 2 + 0.04);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Psyche: bus 2.2 x 2.4 m, five-panel cross wings 7.3 m tall and 24.8 m across
// ---------------------------------------------------------------------------------------------

function buildPsyche(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x15244e);
  const total = 7.3; // cruciform arrays 7.3 m tall; bus 4.9 m tall incl. 2 m booms
  const busW = 2.2;
  const busD = 2.4;
  const busBot = total - 4.9; // bus 4.9 m including the booms, ends at the top
  const bodyTop = total - 2; // 2 m instrument booms above it
  const bodyH = bodyTop - busBot;

  // bus: blanketed box with tape seams and the radiator plates
  foilBlock(g, M.gold, M.tape, busW, bodyH, busD, 0, busBot + bodyH / 2, 0, 0.014);
  box(g, M.dark, busW + 0.03, 0.05, busD + 0.03, 0, busBot + 0.02, 0);
  box(g, M.dark, busW + 0.03, 0.05, busD + 0.03, 0, bodyTop - 0.02, 0);
  const radA = radiator(g, M, 0.9, 1.1, 8);
  radA.position.set(busW / 2 + 0.02, busBot + 1.3, 0.2);
  radA.rotation.y = Math.PI / 2;
  const radB = radiator(g, M, 0.9, 1.1, 8);
  radB.position.set(-busW / 2 - 0.02, busBot + 1.3, 0.2);
  radB.rotation.y = -Math.PI / 2;
  // propellant-tank bulge on the +x face and the thruster pods at the corners
  for (const [x, y, z] of [
    [-1, 0.3, 1],
    [1, 0.3, 1],
    [-1, 2.4, 1],
    [1, 2.4, 1],
  ] as [number, number, number][]) {
    const p = pod(g, M, 0.06);
    p.position.set(x * busW * 0.45, busBot + y, z * (busD / 2 + 0.04));
  }
  // four SPT-140 Hall thrusters in a 2 x 2 cluster on the back (-z)
  for (const dx of [-0.5, 0.5]) {
    for (const dy of [0.7, 1.4]) {
      cylZ(g, M.metal, 0.2, 0.2, -busD / 2 - 0.1, -busD / 2, dx, busBot + dy);
      cylZ(g, M.dark, 0.17, 0.17, -busD / 2 - 0.2, -busD / 2 - 0.1, dx, busBot + dy);
    }
  }
  // 2 m instrument booms: magnetometer boom and the gamma-ray / neutron spectrometer boom
  cyl(g, M.metal, 0.05, 0.05, bodyTop, total, -0.5, 0, 12);
  cyl(g, M.metal, 0.05, 0.05, bodyTop, total, 0.5, 0, 12);
  strut(g, M.titan, V(-0.5, bodyTop + 0.1, 0), V(0.5, bodyTop + 0.1, 0), 0.025, 6);
  strut(g, M.titan, V(-0.5, bodyTop + 1.2, 0), V(0.5, bodyTop + 1.2, 0), 0.02, 6);
  box(g, M.white, 0.3, 0.35, 0.3, -0.5, total - 0.2, 0);
  box(g, M.metal, 0.3, 0.3, 0.3, 0.5, total - 0.15, 0);
  cyl(g, M.dark, 0.06, 0.06, total - 0.1, total + 0.0, -0.5, 0.17, 10);
  // high-gain dish on a pylon on the +z face
  strut(g, M.metal, V(0, busBot + 2.3, busD / 2), V(0, busBot + 2.6, busD / 2 + 0.55), 0.04, 8);
  dishAt(g, M.dbl, M.metal, 1.0, 0.3, V(0, busBot + 2.6, busD / 2 + 0.6), V(0, 0.1, 1), 0.65, 12);
  // multispectral imager pair and the star trackers
  for (const dx of [-0.6, 0.6]) {
    cylZ(g, M.dark, 0.14, 0.14, busD / 2, busD / 2 + 0.4, dx, busBot + 0.9);
    cylZ(g, M.metal, 0.16, 0.16, busD / 2 + 0.38, busD / 2 + 0.42, dx, busBot + 0.9);
  }
  for (const dx of [-0.15, 0.15])
    cylZ(g, M.dark, 0.06, 0.07, busD / 2, busD / 2 + 0.2, dx, busBot + 0.4);

  // two five-panel cruciform arrays: 3 panels across, 2 extra above / below the middle one
  const cy = total / 2;
  const armTotal = (24.76 - busW) / 2;
  const pw = armTotal / 3;
  const ph = total / 3;
  for (const s of [1, -1]) {
    box(g, M.metal, armTotal, 0.1, 0.08, s * (busW / 2 + armTotal / 2), cy, -0.05).name =
      'array-arm';
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(g, M, pw - 0.04, ph - 0.04, 8, 5);
      p.position.set(s * (busW / 2 + pw * (i + 0.5)), cy, 0);
    }
    const xm = s * (busW / 2 + pw * 1.5);
    for (const dy of [ph, -ph]) {
      const p = cellPanel(g, M, pw - 0.04, ph - 0.04, 8, 5);
      p.position.set(xm, cy + dy, 0);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Europa Clipper: 3.1 m dish on top, 30.5 m of arrays, 8.5 m magnetometer boom
// ---------------------------------------------------------------------------------------------

function buildClipper(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x16264f);
  const H = 5;
  const alu = mat(0xc9ccd0, 0.7, 0.42);

  // propulsion module (tank stack) at the base: a cylinder with foil bands and tank bumps
  cyl(g, alu, 0.95, 0.95, 0, 1.2, 0, 0, 36);
  for (const y of [0.35, 0.8]) cyl(g, M.tape, 0.955, 0.955, y, y + 0.02, 0, 0, 36);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), M.titan);
    t.position.set(Math.sin(a) * 0.92, 0.9, Math.cos(a) * 0.92);
    g.add(t);
  }
  // main engine skirt at the bottom, with its nozzle and four thruster pods on the shoulder
  cyl(g, M.dark, 0.38, 0.2, 0, 0.45, 0, 0, 24);
  cyl(g, M.metal, 0.4, 0.4, 0.43, 0.48, 0, 0, 24);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    const p = pod(g, M, 0.06);
    p.position.set(Math.sin(a) * 0.96, 1.15, Math.cos(a) * 0.96);
    p.rotation.y = a;
  }
  // radiation vault on top of the propulsion module: aluminium plates, blanketed corners
  box(g, M.foil, 1.7, 0.1, 1.7, 0, 1.25, 0);
  foilBlock(g, M.foil, M.tape, 1.7, 1.5, 1.7, 0, 2.05, 0, 0.014);
  box(g, M.dark, 1.72, 0.04, 1.72, 0, 1.6, 0);
  box(g, M.dark, 1.72, 0.04, 1.72, 0, 2.5, 0);
  box(g, alu, 1.8, 0.12, 1.8, 0, 2.86, 0);
  // radiator plates on the side faces
  const rrad = radiator(g, M, 0.9, 1.0, 8);
  rrad.position.set(0.86, 2.05, 0.2);
  rrad.rotation.y = Math.PI / 2;
  const lrad = radiator(g, M, 0.9, 1.0, 8);
  lrad.position.set(-0.86, 2.05, 0.2);
  lrad.rotation.y = -Math.PI / 2;

  // 3 m high-gain antenna on top, dish facing up (+y), feed on a tripod
  const rimY = 3.55;
  const depth = 0.55;
  const rimR = 1.55; // 3.1 m
  cyl(g, M.metal, 0.3, 0.3, 2.92, rimY - depth, 0, 0, 20);
  dishAt(g, M.dbl, M.metal, rimR, depth, V(0, rimY - depth, 0), V(0, 1, 0), 1.9, 16);
  cyl(g, M.dark, 0.05, 0.09, 4.9, H, 0, 0, 12);

  // arrays: two wings of five panels either side at the vault level, 30.5 m tip to tip
  const wingLen = (30.5 - 1.8) / 2;
  const pw = wingLen / 5;
  const ph = 3.6;
  const ay = 2.4;
  for (const s of [1, -1]) {
    box(g, M.metal, wingLen, 0.08, 0.08, s * (0.9 + wingLen / 2), ay, -0.1).name = 'array-arm';
    box(g, M.titan, 0.5, 0.3, 0.2, s * 1.0, ay, -0.08);
    for (let i = 0; i < 5; i++) {
      const p = cellPanel(g, M, pw - 0.05, ph, 8, 8);
      p.position.set(s * (0.9 + pw * (i + 0.5)), ay, 0);
    }
    // REASON ice-penetrating radar: two ladder-frame dipole antennas under each wing
    for (const f of [0.3, 0.75]) {
      const cx = s * (0.9 + wingLen * f);
      const ly = ay - ph / 2 - 0.3;
      box(g, M.white, 2.8, 0.05, 0.04, cx, ly + 0.2, -0.12);
      box(g, M.white, 2.8, 0.05, 0.04, cx, ly - 0.2, -0.12);
      for (let r = 0; r <= 6; r++)
        box(g, M.white, 0.04, 0.45, 0.04, cx - 1.4 + (2.8 * r) / 6, ly, -0.12);
      box(g, M.metal, 0.1, 0.35, 0.06, cx, ay - ph / 2 - 0.08, -0.12);
    }
  }

  // magnetometer boom: 8.5 m, out the back (-z), a stout tube with three fluxgate sensors
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 8.5, 12), M.titan);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 2.9, -0.9 - 4.25);
  g.add(boom);
  box(g, M.metal, 0.3, 0.3, 0.3, 0, 2.9, -1.0);
  for (const z of [-0.9 - 3.0, -0.9 - 5.9, -0.9 - 8.5]) {
    box(g, M.white, 0.18, 0.18, 0.18, 0, 2.9, z);
    box(g, M.dark, 0.1, 0.1, 0.26, 0, 2.9, z);
  }

  // sensor deck: cameras on the +z face
  box(g, M.metal, 0.7, 0.5, 0.35, -0.3, 1.5, 1.0);
  cylZ(g, M.dark, 0.15, 0.15, 0.85, 1.35, -0.3, 1.5);
  cylZ(g, M.metal, 0.17, 0.17, 1.3, 1.37, -0.3, 1.5);
  cylZ(g, M.dark, 0.1, 0.1, 0.85, 1.2, 0.35, 1.7);
  box(g, M.metal, 0.4, 0.3, 0.25, 0.4, 2.35, 0.95);
  cylZ(g, M.dark, 0.08, 0.08, 0.9, 1.15, 0.4, 2.35);
  return g;
}

// ---------------------------------------------------------------------------------------------
// NEAR Shoemaker: octagonal prism about 1.7 m, four 1.8 x 1.2 m arrays in a windmill, 1.5 m dish
// ---------------------------------------------------------------------------------------------

/** An octagonal prism, axis along y, `R` to the face centres, crinkled foil. */
function octPrism(
  g: THREE.Object3D,
  m: Mat,
  R: number,
  y0: number,
  h: number,
  amp: number,
): THREE.Mesh {
  const rv = R / Math.cos(Math.PI / 8);
  const geo = crinkle(
    new THREE.CylinderGeometry(rv, rv, h, 8, Math.max(2, Math.round(h / 0.2))),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.rotation.y = Math.PI / 8;
  mesh.position.y = y0 + h / 2;
  return add(g, mesh);
}

function buildNear(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x1a2350);
  const R = 0.85; // about 1.7 m across the flats
  const y0 = 0.2; // aft-deck instruments below
  const H = 1.7;
  const top = y0 + H;
  octPrism(g, M.gold, R, y0, H, 0.012);
  for (const y of [y0, top]) cyl(g, M.dark, R * 1.04, R * 1.04, y - 0.015, y + 0.015, 0, 0, 8);
  // radiator panels on two faces
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const r = radiator(g, M, 0.55, 0.9, 7);
    r.position.set(Math.sin(a) * (R + 0.02), y0 + H * 0.5, Math.cos(a) * (R + 0.02));
    r.rotation.y = a;
  }

  // forward deck: the fixed 1.5 m X-band dish with the magnetometer on its feed, the X-ray solar
  // monitor beside it
  cyl(g, M.metal, 0.22, 0.26, top, top + 0.12);
  const d = dishAt(g, M.dbl, M.metal, 0.75, 0.2, V(0, top + 0.12, 0), V(0, 1, 0), 0.62, 12);
  cyl(d, M.white, 0.06, 0.05, 0.62, 0.74, 0, 0, 12);
  box(g, M.metal, 0.16, 0.14, 0.16, 0.55, top + 0.07, 0.35);

  // four 1.8 x 1.2 m arrays, a windmill around the forward deck, cells facing +y with the dish
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU + Math.PI / 4;
    const arm = new THREE.Group();
    arm.rotation.y = a;
    arm.position.y = top - 0.08;
    add(g, arm);
    const p = cellPanel(arm, M, 1.2, 1.8, 6, 8);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = 0.18; // the windmill twist
    p.position.set(0, 0, R + 0.95);
    strut(arm, M.titan, V(0, 0, R * 0.95), V(0, 0, R + 0.08), 0.03, 6);
  }

  // aft deck: the multispectral imager, the near-infrared spectrometer, the laser rangefinder
  // and the X-ray / gamma-ray spectrometer heads, all looking down -y
  cyl(g, M.dark, 0.09, 0.09, y0 - 0.2, y0, -0.3, 0.2, 16);
  box(g, M.metal, 0.3, 0.18, 0.22, 0.25, y0 - 0.09, 0.25);
  cyl(g, M.dark, 0.07, 0.07, y0 - 0.16, y0, 0.25, -0.3, 14);
  box(g, M.white, 0.24, 0.16, 0.24, -0.25, y0 - 0.08, -0.3);
  for (const [x, z] of [
    [R * 0.7, R * 0.7],
    [-R * 0.7, R * 0.7],
    [R * 0.7, -R * 0.7],
    [-R * 0.7, -R * 0.7],
  ]) {
    const t = pod(g, M, 0.05);
    t.position.set(x, y0 + 0.1, z);
    t.rotation.x = Math.PI / 2;
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Hera: box bus 1.6 x 1.6 x 1.7 m, 11.5 m across the arrays (ESA), dish on one face
// ---------------------------------------------------------------------------------------------

function buildHera(): THREE.Group {
  const g = new THREE.Group();
  const M = pal(0x18244c);
  const W = 1.6;
  const H = 1.7;
  const y0 = 0.25; // adapter cone and engine below
  foilBlock(g, M.gold, M.tape, W, H, W, 0, y0 + H / 2, 0, 0.012);
  box(g, M.dark, W + 0.03, 0.04, W + 0.03, 0, y0 + 0.02, 0);
  box(g, M.dark, W + 0.03, 0.04, W + 0.03, 0, y0 + H - 0.02, 0);
  // the adapter cone and main engine under the central tube
  cyl(g, M.metal, 0.55, 0.42, y0 - 0.02, y0, 0, 0, 32);
  cyl(g, M.titan, 0.08, 0.16, 0.0, y0 - 0.02, 0, 0, 18);
  // radiators on the array faces
  for (const s of [1, -1]) {
    const r = radiator(g, M, 0.9, 1.0, 8);
    r.position.set(s * (W / 2 + 0.02), y0 + H * 0.35, 0.3);
    r.rotation.y = (s * Math.PI) / 2;
  }
  // the high-gain dish on the +z face
  strut(g, M.metal, V(0, y0 + H * 0.6, W / 2), V(0, y0 + H * 0.6, W / 2 + 0.2), 0.05, 8);
  dishAt(g, M.dbl, M.metal, 0.56, 0.17, V(0, y0 + H * 0.6, W / 2 + 0.22), V(0, 0, 1), 0.42, 12);
  // the science deck (-z): two framing cameras, thermal infrared imager, hyperspectral imager,
  // laser altimeter
  for (const dx of [-0.35, -0.1])
    cylZ(g, M.dark, 0.06, 0.07, -W / 2 - 0.22, -W / 2, dx, y0 + H * 0.7);
  box(g, M.metal, 0.26, 0.2, 0.2, 0.3, y0 + H * 0.7, -W / 2 - 0.1);
  cylZ(g, M.dark, 0.05, 0.05, -W / 2 - 0.25, -W / 2 - 0.2, 0.3, y0 + H * 0.7);
  box(g, M.white, 0.2, 0.18, 0.16, 0.0, y0 + H * 0.45, -W / 2 - 0.08);
  box(g, M.metal, 0.18, 0.16, 0.18, -0.4, y0 + H * 0.4, -W / 2 - 0.09);
  // the two CubeSat deployers (Milani, Juventas) on the top deck, thruster pods at the corners
  for (const dx of [-0.35, 0.35]) box(g, M.white, 0.28, 0.4, 0.36, dx, y0 + H + 0.2, -0.2);
  for (const [x, z] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const p = pod(g, M, 0.05);
    p.position.set(x * (W / 2 - 0.1), y0 + 0.12, z * (W / 2 + 0.03));
    p.rotation.y = z > 0 ? 0 : Math.PI;
  }
  // two wings of three panels: about 5 m each, 11.5 m tip to tip
  const pw = 1.603;
  const ph = 1.33;
  for (const s of [1, -1]) {
    const yA = y0 + H * 0.6;
    strut(g, M.titan, V(s * (W / 2), yA, 0), V(s * (W / 2 + 0.12), yA, 0), 0.03, 8);
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(g, M, pw - 0.04, ph, 6, 5);
      p.position.set(s * (W / 2 + 0.14 + pw * (i + 0.5)), yA, 0);
    }
  }
  return g;
}

const NASA = (u: string, l: string): ShowcaseRef => ({ l, u });

export const SHOWCASE: Record<string, ShowcaseModel> = {
  hera: {
    build: buildHera,
    heightM: 2.35,
    heightEstimate:
      'No published height for the craft as it stands: the 1.7 m bus on its 0.25 m adapter and engine, with the two CubeSat deployers on top; the dish size, instrument positions and deployer sizes are judged, not sourced.',
    diameterM: 1.6,
    refs: [
      NASA(
        'https://en.wikipedia.org/wiki/Hera_(space_mission)',
        'Wikipedia (fallback): bus 1.6 x 1.6 x 1.7 m (the 1.7 m height used), two CubeSats (Milani, Juventas)',
      ),
      NASA(
        'https://www.esa.int/articles/about-us/directorates/operations/space-safety/hera/hera-media-kit',
        'ESA Hera media kit: body about 1.6 m a side, arrays 11.5 m across',
      ),
    ],
  },
  'near-shoemaker': {
    build: buildNear,
    heightM: 2.76,
    heightEstimate:
      'No published height: the 1.7 m octagonal bus on a 0.2 m aft deck of instruments, with the 1.5 m dish and its magnetometer on the forward deck; the arrays stand in a windmill around the bus.',
    diameterM: 1.7,
    refs: [
      NASA(
        'https://en.wikipedia.org/wiki/NEAR_Shoemaker',
        'Wikipedia (fallback): octagonal prism about 1.7 m on a side (read here as across the flats), four 1.8 x 1.2 m arrays in a windmill, 1.5 m high-gain dish with the magnetometer on its feed, X-ray solar monitor forward, the other instruments aft',
      ),
    ],
  },
  dart: {
    build: buildDart,
    heightM: 2.6,
    diameterM: 1.9,
    refs: [
      NASA(
        'https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test',
        'Wikipedia (fallback): DART 1.8 x 1.9 x 2.6 m, ROSA 8.5 x 2.4 m each; NEXT-C ion engine, DRACO camera',
      ),
      NASA('https://science.nasa.gov/mission/dart/', 'NASA DART mission page'),
    ],
  },
  lucy: {
    build: buildLucy,
    heightM: 16,
    diameterM: 1.7,
    refs: [
      NASA(
        'https://science.nasa.gov/mission/lucy/spacecraft/',
        'NASA Lucy spacecraft: 16 m tip to tip with arrays deployed (the model stands on that axis), UltraFlex arrays ~7 m diameter each, 2 m high-gain antenna',
      ),
      NASA(
        'https://en.wikipedia.org/wiki/Lucy_(spacecraft)',
        'Wikipedia (fallback): array diameter 7.3 m',
      ),
      NASA(
        encodeURI('https://commons.wikimedia.org/wiki/File:Lucy_spacecraft_model.png'),
        'Wikimedia Commons: Lucy spacecraft model.png (gored UltraFlex discs, bus, dish)',
      ),
    ],
  },
  'psyche-spacecraft': {
    build: buildPsyche,
    heightM: 7.3,
    diameterM: 2.4,
    refs: [
      NASA(
        'https://science.nasa.gov/mission/psyche/spacecraft/',
        'NASA Psyche spacecraft: 25 x 7.3 m with arrays deployed (7.3 m is the height used), bus 4.9 m tall incl. 2 m booms, 2.2 x 2.4 m',
      ),
      NASA(
        encodeURI('https://commons.wikimedia.org/wiki/File:Psyche-spacecraft-diagram.png'),
        'Wikimedia Commons: Psyche-spacecraft-diagram.png (bus, dish, boom mast, five-panel arrays)',
      ),
    ],
  },
  'europa-clipper': {
    build: buildClipper,
    heightM: 5,
    diameterM: 1.8,
    refs: [
      NASA(
        'https://science.nasa.gov/mission/europa-clipper/mission-overview/',
        'NASA Europa Clipper mission overview: about 5 m tall, arrays span 30.5 m, 5 m is the height used',
      ),
      NASA(
        'https://en.wikipedia.org/wiki/Europa_Clipper',
        'Wikipedia (fallback): 3.1 m high-gain antenna, 8.5 m magnetometer boom',
      ),
      NASA(
        encodeURI('https://commons.wikimedia.org/wiki/File:Europa_Clipper_spacecraft_model.png'),
        'Wikimedia Commons: Europa Clipper spacecraft model.png (dish, vault, arrays, REASON ladders, boom)',
      ),
    ],
  },
};
