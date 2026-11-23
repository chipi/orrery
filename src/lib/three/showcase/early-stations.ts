/**
 * Showcase models: Skylab as flown after the 1973 repair, and Sputnik 1 (a plain builder, no fleet
 * entry). Skylab stands on its aft end (y = 0), the docking adapter up, the Sun (and with it the
 * Apollo Telescope Mount, the parasol and the face of every array) toward +z.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, foilSheet, lathe, mat, strut, type Mat } from './kit';

const TAU = Math.PI * 2;

function pol(r: number, a: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(r * Math.sin(a), y, r * Math.cos(a));
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rBot: number,
  rTop: number,
  y0: number,
  y1: number,
  seg = 48,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg, 1, open), m);
  mesh.position.y = (y0 + y1) / 2;
  return add(g, mesh);
}

function torus(g: THREE.Object3D, m: Mat, r: number, tube: number, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 64), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  return add(g, mesh);
}

/** Tape-like vertical strap on a drum of radius r at azimuth a. */
function strap(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  a: number,
  y0: number,
  y1: number,
  w: number,
  d = 0.03,
): void {
  const b = box(g, m, w, y1 - y0, d, 0, 0, 0);
  b.position.copy(pol(r + d / 2 - 0.004, a, (y0 + y1) / 2));
  b.rotation.y = a;
}

/** Thin rod between two points. */
function rod(g: THREE.Object3D, m: Mat, a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Mesh {
  return strut(g, m, a, b, r, 8);
}

/** A small thruster cone at p pointing along dir. */
function nozzle(
  g: THREE.Object3D,
  m: Mat,
  p: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
  len: number,
): void {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, len, 12, 1, true), m);
  c.position.copy(p);
  c.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  g.add(c);
}

// ---------------------------------------------------------------------------------------------
// Skylab
// ---------------------------------------------------------------------------------------------

const SKY_R = 3.3; // OWS and fixed airlock shroud, 6.6 m
const SKY_H = 25.1; // 82.4 ft cluster length without the CSM

const OWS_TOP = 14.6; // Orbital Workshop, 14.6 m
const IU_TOP = 15.4; // instrument unit ring
const SHROUD_TOP = 18.2; // cylindrical part of the fixed airlock shroud
const MDA_BOT = 19.9; // airlock module ends here, the docking adapter begins
const MDA_R = 1.6; // 3.2 m (10.5 ft)
const MDA_CONE = 24.3;
const PORT_R = 1.05;

/** Height of the MDA axial docking port face; a CSM docks nose down onto it. */
export const SKYLAB_AXIAL_PORT = { y: SKY_H };

interface ArrayMats {
  frame: Mat;
  cell: Mat;
  line: Mat;
}

/** Flat solar blade along local +x from `x0`, `n` panels, face toward +z, centred on y = 0. */
function solarBlade(
  parent: THREE.Object3D,
  am: ArrayMats,
  x0: number,
  len: number,
  width: number,
  n: number,
): THREE.Group {
  const w = add(parent, new THREE.Group());
  const gap = 0.05;
  const seg = (len - (n - 1) * gap) / n;
  const lines: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (seg + gap) + seg / 2;
    box(w, am.frame, seg, width, 0.05, cx, 0, 0);
    box(w, am.cell, seg - 0.12, width - 0.12, 0.07, cx, 0, 0);
    const cols = Math.max(3, Math.round(seg / 0.35));
    for (let c = 1; c < cols; c++) {
      const b = new THREE.BoxGeometry(0.01, width - 0.12, 0.074);
      b.translate(cx - seg / 2 + 0.06 + ((seg - 0.12) * c) / cols, 0, 0);
      lines.push(b);
    }
    const rows = Math.max(2, Math.round(width / 0.45));
    for (let r = 1; r < rows; r++) {
      const b = new THREE.BoxGeometry(seg - 0.12, 0.01, 0.074);
      b.translate(cx, -width / 2 + 0.06 + ((width - 0.12) * r) / rows, 0);
      lines.push(b);
    }
    if (i > 0) box(w, am.frame, 0.06, width + 0.04, 0.08, cx - seg / 2 - gap / 2, 0, 0);
  }
  add(w, new THREE.Mesh(mergeGeometries(lines, false), am.line));
  return w;
}

/**
 * Skylab as it flew after the repair: the black-skirted workshop (bare tank wall, the stringers
 * the micrometeoroid shield tore away, the single wing, the gold parasol), the instrument-unit
 * ring, the airlock shroud with its truss, the docking adapter with the axial port, and the
 * Apollo Telescope Mount swung out to the Sun with its four-blade windmill.
 */
function buildSkylab(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xe3e3de, 0.2, 0.55);
  const hull = mat(0xd9dad6, 0.45, 0.5);
  const band = mat(0x2a2b2f, 0.3, 0.6);
  const truss = mat(0x9a9da3, 0.7, 0.45);
  const dark = mat(0x16171b, 0.4, 0.6);
  const glass = mat(0x0a0e16, 0.9, 0.12);
  const silver = mat(0xc4c7cc, 0.75, 0.4);
  const nozMat = mat(0x3a3733, 0.6, 0.5, true);

  // Orbital Workshop: S-IVB tank wall, bare after the micrometeoroid shield tore away
  cyl(g, mat(0x26272b, 0.3, 0.6, true), SKY_R, SKY_R, 0, 1.7, 64, true);
  lathe(
    g,
    mat(0x3a3b3f, 0.4, 0.55, true),
    [
      [0.0, 0.7],
      [1.4, 0.95],
      [2.6, 1.35],
      [SKY_R - 0.05, 1.7],
    ],
    48,
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    strap(g, truss, SKY_R, a, 0.1, 1.65, 0.1, 0.05);
  }
  cyl(g, hull, SKY_R, SKY_R, 1.7, OWS_TOP, 64);
  torus(g, truss, SKY_R + 0.01, 0.05, 1.7);
  torus(g, truss, SKY_R + 0.01, 0.05, OWS_TOP);
  for (const y of [5.2, 9.0, 12.4]) torus(g, truss, SKY_R + 0.008, 0.035, y);
  // tank-wall panel seams and the shield attachment stringers left on it
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    strap(g, truss, SKY_R, a, 1.8, OWS_TOP - 0.1, 0.07, 0.04);
  }
  // aft cold-gas thruster quads
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const q = add(g, new THREE.Group());
    q.rotation.y = a;
    box(q, silver, 0.55, 0.4, 0.3, 0, 1.1, SKY_R + 0.14);
    for (const sx of [-1, 1]) {
      nozzle(
        q,
        nozMat,
        new THREE.Vector3(sx * 0.17, 0.96, SKY_R + 0.38),
        new THREE.Vector3(sx * 0.3, -0.5, 0.8),
        0.07,
        0.2,
      );
      nozzle(
        q,
        nozMat,
        new THREE.Vector3(sx * 0.3, 1.2, SKY_R + 0.28),
        new THREE.Vector3(sx, 0.4, 0.5),
        0.07,
        0.2,
      );
    }
  }

  // instrument unit ring
  cyl(g, band, SKY_R, SKY_R, OWS_TOP, IU_TOP, 64);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const p = box(g, white, 0.5, IU_TOP - OWS_TOP - 0.1, 0.02, 0, (OWS_TOP + IU_TOP) / 2, 0);
    p.position.copy(pol(SKY_R + 0.005, a, (OWS_TOP + IU_TOP) / 2));
    p.rotation.y = a;
  }

  // Airlock Module: fixed airlock shroud, the truss ring and the cone down to the MDA
  cyl(g, white, SKY_R, SKY_R, IU_TOP, SHROUD_TOP, 64);
  torus(g, truss, SKY_R + 0.01, 0.05, IU_TOP);
  torus(g, truss, SKY_R + 0.01, 0.05, SHROUD_TOP);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const p = box(g, truss, 0.14, SHROUD_TOP - IU_TOP, 0.07, 0, (IU_TOP + SHROUD_TOP) / 2, 0);
    p.position.copy(pol(SKY_R + 0.02, a, (IU_TOP + SHROUD_TOP) / 2));
    p.rotation.y = a;
  }
  cyl(g, white, SKY_R, MDA_R, SHROUD_TOP, MDA_BOT, 64);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    rod(g, truss, pol(SKY_R + 0.02, a, SHROUD_TOP), pol(MDA_R + 0.03, a, MDA_BOT), 0.035);
  }
  torus(g, truss, MDA_R + 0.02, 0.06, MDA_BOT);
  // EVA hatch on the antisolar side, its handrails and a window
  box(g, dark, 0.9, 0.9, 0.12, 0, 16.6, -SKY_R - 0.04);
  box(g, silver, 0.7, 0.7, 0.04, 0, 16.6, -SKY_R - 0.1);
  box(g, silver, 1.1, 0.06, 0.16, 0, 17.2, -SKY_R - 0.06);
  box(g, silver, 1.1, 0.06, 0.16, 0, 16.0, -SKY_R - 0.06);

  // Multiple Docking Adapter
  cyl(g, white, MDA_R, MDA_R, MDA_BOT, MDA_CONE, 48);
  for (const y of [21.4, 22.9]) torus(g, truss, MDA_R + 0.01, 0.04, y);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const p = box(g, truss, 0.1, MDA_CONE - MDA_BOT - 0.2, 0.04, 0, (MDA_BOT + MDA_CONE) / 2, 0);
    p.position.copy(pol(MDA_R + 0.015, a, (MDA_BOT + MDA_CONE) / 2));
    p.rotation.y = a;
  }
  // EREP windows (antisolar side), in frames
  for (const [x, z] of [
    [0, -MDA_R - 0.02],
    [0.9, -MDA_R + 0.03],
    [-0.9, -MDA_R + 0.03],
  ]) {
    box(g, truss, 0.82, 0.62, 0.05, x, 21.0, z - 0.01);
    box(g, glass, 0.7, 0.5, 0.06, x, 21.0, z);
  }
  // contingency radial port
  const side = add(g, new THREE.Group());
  side.position.set(-MDA_R, 22.3, 0);
  side.rotation.z = Math.PI / 2;
  cyl(side, silver, 0.55, 0.55, 0, 0.22, 32);
  cyl(side, dark, 0.4, 0.4, 0.2, 0.24, 32);
  // axial port: shoulder cone, collar and the docking face at SKY_H
  cyl(g, white, MDA_R, PORT_R, MDA_CONE, 24.95, 48);
  cyl(g, silver, PORT_R, PORT_R, 24.95, SKY_H, 48);
  cyl(g, dark, PORT_R - 0.18, PORT_R - 0.18, SKY_H - 0.06, SKY_H - 0.04, 32);
  torus(g, dark, PORT_R - 0.05, 0.03, SKY_H - 0.04);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    box(
      g,
      dark,
      0.08,
      0.05,
      0.08,
      Math.sin(a) * (PORT_R - 0.02),
      SKY_H - 0.05,
      Math.cos(a) * (PORT_R - 0.02),
    );
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    box(g, silver, 0.14, 0.04, 0.3, 0, SKY_H - 0.045, 0).position.copy(pol(0.5, a, SKY_H - 0.045));
  }

  // OWS solar wing: the one array that deployed, out on +x, face toward the Sun
  const wingMats: ArrayMats = {
    frame: mat(0xb9bcc2, 0.5, 0.45),
    cell: mat(0x1a2a55, 0.6, 0.3),
    line: mat(0xc9a64a, 0.7, 0.35),
  };
  const wingY = 6.2;
  const wingLen = 10.3;
  const wingW = 6.4;
  const wing = add(g, new THREE.Group());
  wing.position.set(SKY_R - 0.05, wingY, 0);
  solarBlade(wing, wingMats, 0.1, wingLen, wingW, 4);
  for (const dy of [-wingW / 2 - 0.05, wingW / 2 + 0.05]) {
    box(wing, truss, wingLen + 0.2, 0.12, 0.14, (wingLen + 0.2) / 2, dy, 0);
  }
  for (const dy of [-wingW / 2, wingW / 2]) box(wing, silver, 0.5, 0.35, 0.3, 0.2, dy, 0);
  wing.userData.solarArray = true;
  // stump of the wing that was torn off at launch, on -x
  const stump = add(g, new THREE.Group());
  stump.position.set(-(SKY_R - 0.05), wingY, 0);
  stump.rotation.y = Math.PI;
  for (const dy of [-wingW / 2, wingW / 2]) {
    box(stump, silver, 0.5, 0.35, 0.3, 0.2, dy, 0);
    box(stump, truss, 1.3, 0.12, 0.14, 0.85, dy, 0);
    box(stump, dark, 0.06, 0.2, 0.2, 1.5, dy, 0);
  }

  // Skylab parasol (SL-2): 6.7 x 7.3 m canopy ~0.2 m over the sun-side tank wall, crinkled
  const parasolY = 8.5;
  const canopy = mat(0xcf9a35, 0.4, 0.55, true);
  const sheet = foilSheet(canopy, 6.7, 7.3, 0.09);
  sheet.position.set(0, parasolY, SKY_R + 0.2);
  g.add(sheet);
  for (const sx of [-1, 1]) {
    box(g, truss, 0.08, 7.3, 0.06, sx * 3.35, parasolY, SKY_R + 0.2);
  }
  for (const sy of [-1, 1]) box(g, truss, 6.7, 0.08, 0.06, 0, parasolY + sy * 3.65, SKY_R + 0.2);
  const hub = new THREE.Vector3(0, parasolY, SKY_R + 0.2);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      rod(g, truss, hub, new THREE.Vector3(sx * 3.3, parasolY + sy * 3.6, SKY_R + 0.21), 0.04);
    }
  }
  const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), silver);
  hubMesh.rotation.x = Math.PI / 2;
  hubMesh.position.copy(hub).setZ(SKY_R + 0.12);
  g.add(hubMesh);

  // Apollo Telescope Mount, swung out radial on the sun side of the airlock shroud
  const atmY = 16.85;
  const rackZ0 = 3.4;
  const rackZ1 = 7.0; // 3.6 m rack
  const atm = add(g, new THREE.Group());
  atm.position.set(0, atmY, 0);
  const rackMat = mat(0x8c8f96, 0.7, 0.5);
  const foil = mat(0xb48a3c, 0.75, 0.4, true);
  const rackGeo = crinkle(new THREE.CylinderGeometry(1.7, 1.7, rackZ1 - rackZ0, 8, 4, true), 0.05);
  const rack = new THREE.Mesh(rackGeo, foil);
  rack.rotation.x = Math.PI / 2;
  rack.rotation.z = Math.PI / 8;
  rack.position.z = (rackZ0 + rackZ1) / 2;
  atm.add(rack);
  for (const z of [rackZ0, rackZ1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.06, 6, 8), rackMat);
    ring.rotation.z = Math.PI / 8;
    ring.position.z = z;
    atm.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    box(
      atm,
      rackMat,
      0.1,
      0.1,
      rackZ1 - rackZ0,
      Math.cos(a) * 1.7,
      Math.sin(a) * 1.7,
      (rackZ0 + rackZ1) / 2,
    );
  }
  // deployment truss to the shroud
  for (const [ax, ay] of [
    [-1.2, -1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [1.2, 1.2],
  ]) {
    rod(
      atm,
      rackMat,
      new THREE.Vector3(ax, ay, rackZ0),
      new THREE.Vector3(ax * 1.1, ay * 1.1, SKY_R - 0.1),
      0.07,
    );
  }
  // control moment gyros on the rack
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * TAU) / 3;
    box(atm, silver, 0.55, 0.55, 0.55, Math.cos(a) * 1.0, Math.sin(a) * 1.0, rackZ0 + 0.45);
  }
  // canister: 2.1 m x 3.0 m, sun end proud of the rack
  const canZ0 = 4.78;
  const canZ1 = 7.78;
  const can = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, canZ1 - canZ0, 40), white);
  can.rotation.x = Math.PI / 2;
  can.position.z = (canZ0 + canZ1) / 2;
  atm.add(can);
  for (const z of [canZ0 + 0.15, canZ1 - 0.15, (canZ0 + canZ1) / 2]) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.045, 6, 40), rackMat);
    r.position.z = z;
    atm.add(r);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const s = box(
      atm,
      rackMat,
      0.07,
      0.04,
      canZ1 - canZ0 - 0.3,
      Math.cos(a) * 1.06,
      Math.sin(a) * 1.06,
      (canZ0 + canZ1) / 2,
    );
    s.rotation.z = a;
  }
  const cap = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), mat(0x4a4d54, 0.6, 0.45));
  cap.position.z = canZ1 + 0.005;
  atm.add(cap);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const ap = new THREE.Mesh(new THREE.CircleGeometry(i % 2 ? 0.14 : 0.19, 20), glass);
    ap.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, canZ1 + 0.012);
    atm.add(ap);
  }
  const apC = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glass);
  apC.position.z = canZ1 + 0.012;
  atm.add(apC);

  // ATM windmill: four blades at 45 degrees to the cluster axis, ~27 m2 each (110 m2 in all)
  const atmMats: ArrayMats = {
    frame: mat(0xaeb1b8, 0.5, 0.45),
    cell: mat(0x141f44, 0.6, 0.3),
    line: mat(0xc9a64a, 0.7, 0.35),
  };
  const windmill = add(atm, new THREE.Group());
  windmill.position.z = 6.1;
  windmill.userData.solarArray = true;
  for (let k = 0; k < 4; k++) {
    const holder = add(windmill, new THREE.Group());
    holder.rotation.z = Math.PI / 4 + (k * Math.PI) / 2;
    solarBlade(holder, atmMats, 1.65, 8.3, 3.3, 3);
    box(holder, truss, 1.7, 0.14, 0.12, 0.85, 0, 0);
    for (const dy of [-1.7, 1.7]) box(holder, truss, 8.4, 0.08, 0.1, 5.8, dy, 0);
  }
  return g;
}

const WIKI = (title: string, what: string): ShowcaseRef => ({
  l: `Wikipedia (fallback) — ${what}`,
  u: `https://en.wikipedia.org/wiki/${title}`,
});

export const SHOWCASE: Record<string, ShowcaseModel> = {
  skylab: {
    build: buildSkylab,
    heightM: SKY_H,
    diameterM: 6.6,
    refs: [
      {
        l: 'NASA EP-107 Skylab: A Guidebook (NTRS) — OWS 6.7 m x 14.6 m, wing 9 m / 27 m tip to tip, ATM rack 3.3 x 3.6 m, canister 2.1 x 3 m, 110 m2 per array system, four-blade windmill, MDA axial port at the forward end',
        u: 'https://ntrs.nasa.gov/citations/19730025070',
      },
      {
        l: 'NASA, The Skylab Parasol (NTRS) — 6.7 x 7.3 m canopy, sun-facing side, 8 in above the OWS skin',
        u: 'https://ntrs.nasa.gov/citations/19760012092',
      },
      WIKI(
        'Skylab',
        'component table (EP-107 data): 82.4 ft (25.1 m) without CSM, MDA 17.3 ft x 10.5 ft, AM 17.6 ft, ATM 14.7 ft, 55.8 ft width with one wing, 36.3 ft height with ATM',
      ),
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Sputnik 1
// ---------------------------------------------------------------------------------------------

const SPUTNIK_R = 0.5 * 0.585; // 585 mm sphere (58 cm nominal)
const SPUTNIK_SWEEP = (35 * Math.PI) / 180; // antennas trail 35 degrees off the axis
const SPUTNIK_LONG = 2.9;
const SPUTNIK_SHORT = 2.4;

/** Sphere top to the tip of the long antennas, nose up. */
export const SPUTNIK1_HEIGHT_M = SPUTNIK_R + SPUTNIK_LONG * Math.cos(SPUTNIK_SWEEP);

/**
 * Sputnik 1: the polished 58 cm sphere of two welded hemispheres (the joint flange and its 36
 * bolts, the two screw plugs), and the four whip antennas on spring hinge blocks at the joint,
 * two long and two short, swept back.
 */
export function buildSputnik1(): THREE.Group {
  const g = new THREE.Group();
  const polished = mat(0xd9dbde, 1.0, 0.12);
  const seam = mat(0x7d8087, 0.9, 0.3);
  const whip = mat(0xbfc2c6, 0.9, 0.25);
  const block = mat(0x23242a, 0.6, 0.4);
  const body = add(g, new THREE.Group());
  body.position.y = SPUTNIK1_HEIGHT_M - SPUTNIK_R;

  body.add(new THREE.Mesh(new THREE.SphereGeometry(SPUTNIK_R, 64, 48), polished));
  // hemisphere joint: flange ring and the 36 bolts
  const ring = new THREE.Mesh(new THREE.TorusGeometry(SPUTNIK_R, 0.006, 8, 96), seam);
  ring.rotation.x = Math.PI / 2;
  body.add(ring);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), seam);
    b.position.set(Math.cos(a) * (SPUTNIK_R - 0.002), 0.014, Math.sin(a) * (SPUTNIK_R - 0.002));
    body.add(b);
  }
  // two screw plugs on the upper hemisphere
  for (const [az, el] of [
    [0.6, 0.6],
    [3.2, 0.8],
  ]) {
    const n = new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    );
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16), seam);
    plug.position.copy(n).multiplyScalar(SPUTNIK_R);
    plug.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    body.add(plug);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.004), block);
    slot.position.copy(n).multiplyScalar(SPUTNIK_R + 0.006);
    slot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    body.add(slot);
  }

  // four whip antennas hinged at the joint, in two opposite pairs (2.4 m and 2.9 m), swept back
  const hinges: [number, number][] = [
    [0, SPUTNIK_SHORT],
    [Math.PI / 2, SPUTNIK_LONG],
    [Math.PI, SPUTNIK_SHORT],
    [(3 * Math.PI) / 2, SPUTNIK_LONG],
  ];
  for (const [az, len] of hinges) {
    const dir = new THREE.Vector3(
      Math.cos(az) * Math.sin(SPUTNIK_SWEEP),
      -Math.cos(SPUTNIK_SWEEP),
      Math.sin(az) * Math.sin(SPUTNIK_SWEEP),
    );
    const root = new THREE.Vector3(Math.cos(az) * SPUTNIK_R, 0, Math.sin(az) * SPUTNIK_R);
    const tip = root.clone().addScaledVector(dir, len);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0055, len, 8), whip);
    w.position.copy(root).add(tip).multiplyScalar(0.5);
    w.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    body.add(w);
    // spring hinge block on the joint flange
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.03), block);
    hb.position.copy(root).addScaledVector(new THREE.Vector3(Math.cos(az), 0, Math.sin(az)), 0.012);
    hb.rotation.y = -az;
    body.add(hb);
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), seam);
    hinge.position.copy(root).addScaledVector(dir, 0.03);
    body.add(hinge);
  }
  return g;
}
