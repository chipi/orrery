/**
 * Showcase models: small-body explorers (DART, Lucy, Psyche, Europa Clipper). Each stands with
 * the axis its sourced length is measured along vertical (base y = 0), front facing +z, arrays
 * deployed at their real size.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';

type Mat = THREE.MeshStandardMaterial;

function mat(color: number, metalness = 0.3, roughness = 0.6, double = false): Mat {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });
}

function add<T extends THREE.Object3D>(g: THREE.Object3D, o: T): T {
  g.add(o);
  return o;
}

function box(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** Cylinder along y between two heights, at (x, z). */
function cyl(
  g: THREE.Object3D,
  m: Mat,
  rBot: number,
  rTop: number,
  y0: number,
  y1: number,
  x = 0,
  z = 0,
  seg = 32,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** Cylinder along the z axis between two z values, at (x, y); r0 at z0, r1 at z1. */
function cylZ(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  z0: number,
  z1: number,
  x: number,
  y: number,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, 32, 1, open), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, (z0 + z1) / 2);
  return add(g, mesh);
}

/** Shallow parabolic dish facing +z, rim at z = 0 plus `depth` behind it. */
function dish(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  depth: number,
  x: number,
  y: number,
  z: number,
) {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(t * r, depth * (1 - t * t)));
  }
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), m);
  // lathe axis is y, dish opens toward +y; turn it to face +z
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z - depth);
  return add(g, mesh);
}

interface Mats {
  cell: Mat;
  frame: Mat;
  line: Mat;
  gold: Mat;
  white: Mat;
  dark: Mat;
  metal: Mat;
}

function mats(cell = 0x16254f): Mats {
  return {
    cell: mat(cell, 0.6, 0.3),
    frame: mat(0xb9bcc2, 0.5, 0.45),
    line: mat(0xc9a64a, 0.7, 0.35),
    gold: mat(0xb08f45, 0.65, 0.4),
    white: mat(0xe6e6e2, 0.2, 0.6),
    dark: mat(0x1b1c20, 0.4, 0.6),
    metal: mat(0xaeb2b8, 0.7, 0.4),
  };
}

/** Rectangular solar panel in the x-y plane, facing +z, with cell grid lines. */
function panel(
  g: THREE.Object3D,
  m: Mats,
  w: number,
  h: number,
  x: number,
  y: number,
  cols: number,
  rows: number,
): void {
  box(g, m.frame, w, h, 0.04, x, y, 0);
  box(g, m.cell, w - 0.1, h - 0.1, 0.05, x, y, 0.005);
  for (let c = 1; c < cols; c++)
    box(g, m.line, 0.012, h - 0.1, 0.056, x - w / 2 + 0.05 + ((w - 0.1) * c) / cols, y, 0.005);
  for (let r = 1; r < rows; r++)
    box(g, m.line, w - 0.1, 0.012, 0.056, x, y - h / 2 + 0.05 + ((h - 0.1) * r) / rows, 0.005);
}

/** Circular UltraFlex array facing +z with a wedge cut out toward the bus (at angle `notch`). */
function ultraflex(g: THREE.Object3D, m: Mats, R: number, x: number, y: number, notch: number) {
  const gap = 0.4;
  const wrap = add(g, new THREE.Group());
  wrap.position.set(x, y, 0);
  const start = notch + gap / 2;
  const theta = Math.PI * 2 - gap;
  wrap.add(
    new THREE.Mesh(new THREE.CircleGeometry(R, 64, start, theta), mat(0x16254f, 0.6, 0.3, true)),
  );
  for (let i = 0; i <= 18; i++) {
    const a = start + (theta * i) / 18;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(R, 0.03, 0.012), m.line);
    rib.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0.01);
    rib.rotation.z = a;
    wrap.add(rib);
  }
  for (const rr of [0.35, 0.65]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * rr, 0.012, 4, 80), m.line);
    ring.position.z = 0.01;
    wrap.add(ring);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), m.frame);
  hub.rotation.x = Math.PI / 2;
  wrap.add(hub);
}

// ---------------------------------------------------------------------------------------------
// DART
// ---------------------------------------------------------------------------------------------

function buildDart(): THREE.Group {
  const g = new THREE.Group();
  const m = mats(0x1a2c5c);
  const H = 2.6; // bus 1.8 x 1.9 x 2.6 m, the 2.6 m axis vertical
  const W = 1.8;
  const D = 1.9;
  const foil = mat(0xc4a24a, 0.55, 0.45);
  box(g, foil, W, H, D, 0, H / 2, 0);
  // panel strips on the bus
  for (const y of [0.55, H - 0.55]) box(g, m.white, W + 0.02, 0.5, D + 0.02, 0, y, 0);
  box(g, m.dark, W + 0.03, 0.04, D + 0.03, 0, H / 2, 0);

  // DRACO camera: baffle and aperture on the +z face
  cylZ(g, m.dark, 0.2, 0.2, D / 2, D / 2 + 0.45, 0.3, 1.5, true);
  cylZ(g, m.metal, 0.22, 0.22, D / 2, D / 2 + 0.06, 0.3, 1.5);
  cylZ(g, m.dark, 0.17, 0.17, D / 2 + 0.06, D / 2 + 0.07, 0.3, 1.5);
  // star trackers and the SMART Nav sun sensor beside it
  for (const x of [-0.45, -0.7]) cylZ(g, m.dark, 0.06, 0.07, D / 2, D / 2 + 0.16, x, 2.2);

  // NEXT-C ion engine: gridded thruster on the -z face with its dark grid disc
  const nz = -D / 2;
  cylZ(g, m.metal, 0.19, 0.19, nz - 0.3, nz, 0, 1.0);
  cylZ(g, m.dark, 0.185, 0.185, nz - 0.34, nz - 0.3, 0, 1.0);
  box(g, m.metal, 0.5, 0.5, 0.06, 0, 1.0, nz - 0.02);

  // flat-plate high-gain antenna
  box(g, m.white, 0.55, 0.55, 0.05, -0.45, 1.0, D / 2 + 0.03);

  // two ROSA roll-out arrays: 8.5 x 2.4 m each, from the bus sides on short masts
  for (const s of [1, -1]) {
    box(g, m.frame, 0.4, 0.1, 0.1, s * (W / 2 + 0.2), H / 2, 0);
    const armLen = 8.5;
    const x0 = W / 2 + 0.4;
    // two booms along the long edges
    for (const dy of [-1.2, 1.2])
      box(g, m.frame, armLen, 0.06, 0.06, s * (x0 + armLen / 2), H / 2 + dy, 0);
    const cols = 17;
    for (let i = 0; i < cols; i++) {
      const w = armLen / cols;
      panel(g, m, w - 0.02, 2.4, s * (x0 + w * (i + 0.5)), H / 2, 1, 6);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Lucy
// ---------------------------------------------------------------------------------------------

function buildLucy(): THREE.Group {
  const g = new THREE.Group();
  const m = mats(0x16264f);
  const R = 3.65; // 7.3 m UltraFlex discs
  const busH = 1.4; // between the discs: 2 x 7.3 + 1.4 = 16 m tip to tip
  const mid = R * 2 + busH / 2; // bus centre height
  const foil = mat(0xb48f3e, 0.6, 0.45);
  const busX = 1.7;
  const busZ = 1.5;

  // bus (long axis across the page, between the two arrays)
  box(g, foil, busX, busH, busZ, 0, mid, 0);
  box(g, m.dark, busX + 0.02, 0.05, busZ + 0.02, 0, mid, 0);
  // discs, each notched toward the bus, joined by short yokes
  ultraflex(g, m, R, 0, mid + busH / 2 + R, -Math.PI / 2);
  ultraflex(g, m, R, 0, mid - busH / 2 - R, Math.PI / 2);
  for (const s of [1, -1]) box(g, m.frame, 0.16, 0.5, 0.16, 0, mid + s * (busH / 2 + 0.02), -0.1);

  // 2 m high-gain dish on the +z face
  cyl(g, m.frame, 0.06, 0.06, mid - 0.1, mid + 0.1, 0, busZ / 2 + 0.2);
  box(g, m.frame, 0.1, 0.1, 0.4, 0, mid, busZ / 2 + 0.2);
  dish(g, m.white, 1.0, 0.3, 0, mid, busZ / 2 + 0.75);
  cylZ(g, m.dark, 0.04, 0.04, busZ / 2 + 0.75, busZ / 2 + 1.25, 0, mid);

  // instrument platform on the -x side: deck with the remote-sensing instruments pointing +z
  const px = -busX / 2 - 0.65;
  box(g, m.white, 1.3, 0.8, 0.12, px - 0.1, mid, busZ / 2 - 0.1);
  cylZ(g, m.dark, 0.2, 0.2, busZ / 2 - 0.04, busZ / 2 + 0.6, px - 0.35, mid + 0.15); // L'LORRI
  cylZ(g, m.dark, 0.13, 0.13, busZ / 2 - 0.04, busZ / 2 + 0.45, px + 0.15, mid + 0.18);
  box(g, m.metal, 0.4, 0.3, 0.4, px - 0.1, mid - 0.22, busZ / 2 + 0.16); // L'Ralph / L'TES
  // terminal tracking cameras on the +x side
  box(g, m.metal, 0.5, 0.5, 0.15, busX / 2 + 0.3, mid, busZ / 2 - 0.1);
  cylZ(g, m.dark, 0.1, 0.1, busZ / 2 - 0.04, busZ / 2 + 0.3, busX / 2 + 0.3, mid);
  // thruster cluster on the back
  for (const dy of [-0.4, 0.4]) cylZ(g, m.dark, 0.05, 0.1, -busZ / 2 - 0.3, -busZ / 2, 0, mid + dy);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Psyche
// ---------------------------------------------------------------------------------------------

function buildPsyche(): THREE.Group {
  const g = new THREE.Group();
  const m = mats(0x15244e);
  const total = 7.3; // cruciform arrays 7.3 m tall; bus 4.9 m tall incl. 2 m booms
  const busW = 2.2;
  const busD = 2.4;
  const busBot = total - 4.9; // bus 4.9 m including the booms, ends at the top
  const bodyTop = total - 2; // 2 m instrument booms above it
  const bodyH = bodyTop - busBot;
  const foil = mat(0xb48f3e, 0.6, 0.45);

  box(g, foil, busW, bodyH, busD, 0, busBot + bodyH / 2, 0);
  box(g, m.white, busW + 0.02, 0.4, busD + 0.02, 0, busBot + 0.5, 0);
  box(g, m.dark, busW + 0.03, 0.04, busD + 0.03, 0, busBot + bodyH / 2, 0);
  // Hall thrusters on the back (-z)
  for (const dx of [-0.5, 0.5])
    cylZ(g, m.dark, 0.2, 0.2, -busD / 2 - 0.2, -busD / 2, dx, busBot + 1.0);
  // booms with imager / gamma-ray and neutron spectrometer and magnetometers
  cyl(g, m.metal, 0.05, 0.05, bodyTop, total, -0.5, 0);
  cyl(g, m.metal, 0.05, 0.05, bodyTop, total, 0.5, 0);
  box(g, m.white, 0.3, 0.35, 0.3, -0.5, total - 0.2, 0);
  box(g, m.metal, 0.3, 0.3, 0.3, 0.5, total - 0.15, 0);
  // high-gain dish on the +z face
  box(g, m.frame, 0.1, 0.1, 0.5, 0, busBot + 2.6, busD / 2 + 0.25);
  dish(g, m.white, 1.0, 0.3, 0, busBot + 2.6, busD / 2 + 0.8);
  // multispectral imager pair
  for (const dx of [-0.6, 0.6])
    cylZ(g, m.dark, 0.14, 0.14, busD / 2, busD / 2 + 0.4, dx, busBot + 0.9);

  // two five-panel cruciform arrays: 3 panels across, 2 extra above / below the middle one
  const cy = total / 2;
  const armTotal = (24.76 - busW) / 2;
  const pw = armTotal / 3;
  const ph = total / 3;
  for (const s of [1, -1]) {
    box(g, m.frame, armTotal, 0.1, 0.08, s * (busW / 2 + armTotal / 2), cy, -0.05);
    for (let i = 0; i < 3; i++)
      panel(g, m, pw - 0.04, ph - 0.04, s * (busW / 2 + pw * (i + 0.5)), cy, 4, 3);
    const xm = s * (busW / 2 + pw * 1.5);
    panel(g, m, pw - 0.04, ph - 0.04, xm, cy + ph, 4, 3);
    panel(g, m, pw - 0.04, ph - 0.04, xm, cy - ph, 4, 3);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Europa Clipper
// ---------------------------------------------------------------------------------------------

function buildClipper(): THREE.Group {
  const g = new THREE.Group();
  const m = mats(0x16264f);
  const H = 5;
  const foil = mat(0xb48f3e, 0.6, 0.45);
  const alu = mat(0xc9ccd0, 0.7, 0.42);

  // propulsion module (tank stack) at the base, radiation vault above
  cyl(g, alu, 0.95, 0.95, 0, 1.2, 0, 0, 24);
  box(g, foil, 1.7, 0.1, 1.7, 0, 1.25, 0);
  box(g, m.gold, 1.7, 1.5, 1.7, 0, 2.05, 0);
  box(g, m.dark, 1.72, 0.04, 1.72, 0, 1.6, 0);
  box(g, m.dark, 1.72, 0.04, 1.72, 0, 2.5, 0);
  box(g, alu, 1.8, 0.12, 1.8, 0, 2.86, 0);
  // main engine skirt at the bottom
  cyl(g, m.dark, 0.35, 0.18, 0, 0.45, 0, 0);

  // 3 m high-gain antenna on top, dish facing up (+y), feed on a tripod
  const rimY = 3.55;
  const depth = 0.55;
  const rimR = 1.55; // 3.1 m
  cyl(g, m.metal, 0.3, 0.3, 2.9, rimY - depth, 0, 0);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(t * rimR, rimY - depth + depth * t * t));
  }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat(0xe6e6e2, 0.2, 0.6, true)));
  for (const a of [0.8, 2.4, 4.0, 5.5]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.25, 6), m.metal);
    s.position.set(Math.cos(a) * 0.35, rimY + 0.25, Math.sin(a) * 0.35);
    s.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    g.add(s);
  }
  cyl(g, m.dark, 0.12, 0.12, H - 0.25, H);

  // arrays: two wings of five panels either side at the vault level, 30.5 m tip to tip
  const wingLen = (30.5 - 1.8) / 2;
  const pw = wingLen / 5;
  const ph = 3.6;
  const ay = 2.2;
  for (const s of [1, -1]) {
    box(g, m.frame, wingLen, 0.08, 0.08, s * (0.9 + wingLen / 2), ay, -0.1);
    for (let i = 0; i < 5; i++) panel(g, m, pw - 0.05, ph, s * (0.9 + pw * (i + 0.5)), ay, 4, 4);
    // REASON ice-penetrating radar dipoles: long thin panels along the wing trailing edge
    box(g, m.white, 8.8, 0.18, 0.04, s * (0.9 + wingLen - 4.4), ay - ph / 2 - 0.2, -0.12);
    box(g, m.frame, 0.06, 0.1, 0.06, s * 1.4, ay - ph / 2 - 0.1, -0.12);
  }

  // magnetometer boom: 8.5 m, out the back (-z) with three fluxgate sensors
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 8.5, 8), m.metal);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 2.9, -0.9 - 4.25);
  g.add(boom);
  for (const z of [-0.9 - 3.0, -0.9 - 5.9, -0.9 - 8.5])
    box(g, m.white, 0.18, 0.18, 0.18, 0, 2.9, z);

  // sensor deck: cameras on the +z face
  box(g, m.metal, 0.7, 0.5, 0.35, -0.3, 1.5, 1.0);
  cylZ(g, m.dark, 0.15, 0.15, 0.85, 1.35, -0.3, 1.5);
  cylZ(g, m.dark, 0.1, 0.1, 0.85, 1.2, 0.35, 1.7);
  return g;
}

const NASA = (u: string, l: string): ShowcaseRef => ({ l, u });

export const SHOWCASE: Record<string, ShowcaseModel> = {
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
    ],
  },
};
