/**
 * Showcase model: Curiosity (Mars Science Laboratory), the second of the two models that set
 * the detailed models' style (operator 2026-11-23). Parked: wheels on y = 0, the stowed arm and
 * the mast toward +z, the MMRTG at the back.
 *
 * What makes it read as Curiosity, in order: six wheels on the rocker-bogie, the rockers'
 * differential bar across the rear deck; the mast with the ChemCam head and the Mastcam pair;
 * the finned MMRTG between its two white heat exchangers at the back; the stowed arm and its tool
 * turret across the front; the hexagonal high-gain antenna, the UHF post, the deck instruments.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, beam, box, crinkle, foilSheet, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

// Real dimensions (metres) — see REFS: 2.9 m long, 2.7 m wide, 2.2 m to the top of the mast,
// 0.5 m wheels.
const WHEEL_R = 0.25;
const WHEEL_W = 0.4;
const TRACK = 1.1; // wheel centre, either side
const WHEEL_Z = [1.0, -0.05, -1.0]; // front, middle, rear
const BODY = { x: 0.6, y0: 0.66, y1: 1.1, z0: -0.78, z1: 0.75 };

/** A wheel: aluminium rim with grousers, the titanium flexure spokes, a dark hub. Axis along x. */
function wheel(M: Record<string, Mat>, side: number): THREE.Group {
  const w = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 40, 1, true),
    M.alu,
  );
  rim.rotation.z = Math.PI / 2;
  add(w, rim);
  // Grousers: 24 chevron cleats across the tread.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const c = box(w, M.alu, WHEEL_W * 0.44, 0.012, 0.02, (s * WHEEL_W) / 4, 0, 0);
      c.position.set(
        (s * WHEEL_W) / 4,
        Math.cos(a) * (WHEEL_R + 0.006),
        Math.sin(a) * (WHEEL_R + 0.006),
      );
      // Rx turns the cleat's thin side radial; Ry (applied first) angles it into the chevron.
      c.rotation.set(a, s * 0.35, 0);
    }
  }
  // Outer face: the six curved titanium flexures and the hub, as seen from outside; the disc
  // closes the wheel behind them.
  const inner = (side * WHEEL_W) / 2;
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.06, WHEEL_R, 32), M.aluDark);
  disc.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  disc.position.x = -inner * 0.6;
  add(w, disc);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const a2 = a + 0.5;
    beam(
      w,
      M.ti,
      V(inner, Math.cos(a) * 0.07, Math.sin(a) * 0.07),
      V(inner, Math.cos(a2) * (WHEEL_R - 0.02), Math.sin(a2) * (WHEEL_R - 0.02)),
      0.012,
      0.04,
    );
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 20), M.dark);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = inner;
  add(w, hub);
  return w;
}

function buildSuspension(g: THREE.Group, M: Record<string, Mat>): void {
  for (const s of [-1, 1]) {
    const legX = s * (TRACK - WHEEL_W / 2 - 0.08);
    const pivot = V(s * (BODY.x + 0.06), 0.86, 0.1);
    const frontTop = V(legX, 0.66, WHEEL_Z[0]);
    const bogiePivot = V(legX, 0.56, -0.5);
    const midTop = V(legX, 0.5, WHEEL_Z[1]);
    const rearTop = V(legX, 0.62, WHEEL_Z[2]);
    // Rocker: pivot on the body → front wheel, and back to the bogie.
    beam(g, M.ti, pivot, frontTop, 0.07, 0.1);
    beam(g, M.ti, pivot, bogiePivot, 0.07, 0.1);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), M.dark)).position.copy(
      pivot,
    );
    // Bogie: middle and rear wheels.
    beam(g, M.ti, bogiePivot, midTop, 0.06, 0.09);
    beam(g, M.ti, bogiePivot, rearTop, 0.06, 0.09);
    const bp = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), M.dark));
    bp.rotation.z = Math.PI / 2;
    bp.position.copy(bogiePivot);
    // Each wheel hangs on a leg; front and rear legs carry the steering actuators.
    for (const [i, top] of [frontTop, midTop, rearTop].entries()) {
      const hub = V(legX, WHEEL_R, WHEEL_Z[i]);
      strut(g, M.ti, top, hub, 0.035, 10);
      if (i !== 1) {
        const act = add(
          g,
          new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), M.gold),
        );
        act.position.copy(top).add(V(0, 0.04, 0));
      }
      const w = wheel(M, s);
      w.position.set(s * TRACK, WHEEL_R, WHEEL_Z[i]);
      add(g, w);
    }
  }
  // Differential bar across the rear deck, linked down to each rocker.
  const dy = BODY.y1 + 0.08;
  beam(g, M.ti, V(-0.62, dy, -0.25), V(0.62, dy, -0.25), 0.05, 0.05);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), M.dark)).position.set(
    0,
    dy,
    -0.25,
  );
  for (const s of [-1, 1])
    strut(g, M.ti, V(s * 0.62, dy, -0.25), V(s * (BODY.x + 0.06), 0.86, 0.1), 0.018, 6);
}

function buildBody(g: THREE.Group, M: Record<string, Mat>): void {
  const { x, y0, y1, z0, z1 } = BODY;
  box(g, M.white, x * 2, y1 - y0, z1 - z0, 0, (y0 + y1) / 2, (z0 + z1) / 2);
  // Grey side panels and a belly pan; the deck plate on top.
  for (const s of [-1, 1]) {
    const p = foilSheet(M.grey, z1 - z0 - 0.2, y1 - y0 - 0.12, 0.004);
    p.position.set(s * (x + 0.003), (y0 + y1) / 2, (z0 + z1) / 2);
    p.rotation.y = s * (Math.PI / 2);
    add(g, p);
  }
  box(g, M.grey, x * 2 - 0.08, 0.04, z1 - z0 - 0.08, 0, y0 - 0.02, (z0 + z1) / 2);
  box(g, M.deck, x * 2 + 0.04, 0.03, z1 - z0 + 0.04, 0, y1 + 0.015, (z0 + z1) / 2);

  // Front and rear Hazcam pairs under the body.
  for (const [z, s] of [
    [z1 + 0.02, 1],
    [z0 - 0.02, -1],
  ] as [number, number][]) {
    for (const hx of [-0.22, -0.1, 0.1, 0.22]) {
      const c = box(g, M.dark, 0.06, 0.05, 0.06, hx, y0 + 0.06, z);
      add(c, new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), M.glass)).position.z = s * 0.031;
      if (s < 0) c.rotation.y = Math.PI;
    }
  }

  // Deck instruments: SAM and CheMin inlets, RAD, the calibration targets.
  for (const [bx, bz, w, h, d, m] of [
    [0.25, 0.25, 0.32, 0.1, 0.3, M.grey],
    [-0.05, 0.05, 0.22, 0.07, 0.22, M.white],
    [0.38, -0.2, 0.18, 0.12, 0.16, M.gold],
    [0.1, 0.5, 0.2, 0.05, 0.12, M.grey],
  ] as [number, number, number, number, number, Mat][])
    box(g, m, w, h, d, bx, y1 + 0.03 + h / 2, bz);
  for (const [ix, iz] of [
    [0.15, 0.3],
    [0.32, 0.3],
  ])
    box(g, M.dark, 0.06, 0.02, 0.06, ix, y1 + 0.17, iz);

  // High-gain antenna: the hexagonal plate on its gimbal, rear left; UHF post, rear right.
  strut(g, M.ti, V(0.36, y1, -0.48), V(0.36, y1 + 0.24, -0.48), 0.035, 10);
  const hga = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 6), M.white));
  hga.position.set(0.36, y1 + 0.3, -0.48);
  hga.rotation.set(0.7, 0.4, 0);
  const uhf = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 14), M.white));
  uhf.position.set(-0.4, y1 + 0.17, -0.55);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.grey)).position.set(
    -0.4,
    y1 + 0.35,
    -0.55,
  );
}

function buildMast(parent: THREE.Group, M: Record<string, Mat>): void {
  // Remote Sensing Mast, front right of the deck (the rover's right is -x). One group named
  // 'rsm': it rode stowed through entry and was raised on Mars, so a descent can hide it.
  const g = add(parent, new THREE.Group());
  g.name = 'rsm';
  const mx = -0.36;
  const mz = 0.5;
  const y0 = BODY.y1;
  strut(g, M.white, V(mx, y0, mz), V(mx, 1.83, mz), 0.06, 18);
  box(g, M.grey, 0.14, 0.1, 0.14, mx, y0 + 0.06, mz);
  // REMS booms at mid-mast.
  for (const a of [0.6, -2.2])
    beam(
      g,
      M.white,
      V(mx, 1.5, mz),
      V(mx + Math.sin(a) * 0.2, 1.5, mz + Math.cos(a) * 0.2),
      0.025,
      0.025,
    );
  // Head: the camera bar (Mastcam pair, the Navcam pairs) and ChemCam's telescope box on top.
  const head = new THREE.Group();
  head.position.set(mx, 1.83, mz);
  add(g, head);
  box(head, M.grey, 0.44, 0.14, 0.18, 0, 0.07, 0);
  for (const [cx, r] of [
    [-0.06, 0.035],
    [0.06, 0.028],
    [-0.17, 0.02],
    [-0.13, 0.02],
    [0.13, 0.02],
    [0.17, 0.02],
  ]) {
    const lens = add(head, new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 16), M.dark));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(cx, 0.07, 0.1);
    add(head, new THREE.Mesh(new THREE.CircleGeometry(r * 0.7, 16), M.glass)).position.set(
      cx,
      0.07,
      0.121,
    );
  }
  const chem = box(head, M.white, 0.26, 0.2, 0.34, 0, 0.24, -0.02);
  void chem;
  const ap = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), M.dark));
  ap.rotation.x = Math.PI / 2;
  ap.position.set(0, 0.25, 0.16);
  add(head, new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), M.glass)).position.set(
    0,
    0.25,
    0.176,
  );
  box(head, M.gold, 0.2, 0.03, 0.2, 0, 0.355, -0.04);
}

function buildRtg(g: THREE.Group, M: Record<string, Mat>): void {
  // MMRTG at the back, tilted up and aft, eight fins round its core; the two white heat
  // exchangers either side of it.
  const r = new THREE.Group();
  r.position.set(0, 0.98, BODY.z0 - 0.3);
  r.rotation.x = -0.75;
  add(g, r);
  add(r, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.66, 24), M.rtg));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const f = box(r, M.rtg, 0.012, 0.6, 0.13, Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26);
    f.rotation.y = -a;
  }
  for (const s of [-1, 1]) {
    const hx = add(
      g,
      new THREE.Mesh(crinkle(new THREE.BoxGeometry(0.06, 0.55, 0.5, 1, 4, 4), 0.004), M.white),
    );
    hx.position.set(s * 0.45, 0.98, BODY.z0 - 0.25);
    hx.rotation.set(-0.75, 0, s * 0.15);
  }
  // Struts to the body.
  for (const s of [-1, 1])
    strut(g, M.ti, V(s * 0.25, BODY.y0 + 0.1, BODY.z0), V(s * 0.18, 0.85, BODY.z0 - 0.25), 0.02, 6);
}

function buildArm(g: THREE.Group, M: Record<string, Mat>): void {
  // The 2.2 m arm stowed across the front: shoulder at the front left, the upper arm across,
  // the forearm folded back, the turret of tools low at the front.
  const shoulder = V(0.5, 0.86, BODY.z1 + 0.05);
  const elbow = V(-0.45, 0.86, BODY.z1 + 0.14);
  const wrist = V(0.05, 0.72, BODY.z1 + 0.28);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 16), M.dark)).position.copy(
    shoulder,
  );
  beam(g, M.white, shoulder, elbow, 0.09, 0.09);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), M.dark)).position.copy(
    elbow,
  );
  beam(g, M.white, elbow, wrist, 0.08, 0.08);
  const t = new THREE.Group();
  t.position.copy(wrist);
  add(g, t);
  add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 20), M.grey)).rotation.x =
    Math.PI / 2;
  // Drill, CHIMRA scoop box, APXS, MAHLI, the brush: around the turret.
  const drill = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 14), M.white));
  drill.position.set(0, -0.17, 0);
  add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, 0.08, 8), M.ti)).position.set(
    0,
    -0.33,
    0,
  );
  box(t, M.gold, 0.16, 0.12, 0.12, 0.17, 0.02, 0);
  const apxs = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 14), M.ti));
  apxs.position.set(-0.15, 0.06, 0);
  const mahli = box(t, M.dark, 0.08, 0.08, 0.08, -0.12, -0.08, 0.03);
  add(mahli, new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), M.glass)).position.z = 0.041;
  box(t, M.grey, 0.05, 0.05, 0.1, 0.08, 0.14, 0);
}

/** Curiosity in metres, parked: wheels on y = 0, mast and arm toward +z. */
export function buildCuriosity(): THREE.Group {
  const M: Record<string, Mat> = {
    white: mat(0xe9e5db, 0.15, 0.55),
    deck: mat(0xb8ae9c, 0.2, 0.7),
    grey: mat(0x8a8d93, 0.4, 0.5),
    dark: mat(0x26282c, 0.4, 0.6),
    alu: mat(0xb9bcc1, 0.7, 0.38),
    aluDark: mat(0x8f9297, 0.6, 0.5),
    ti: mat(0xa3a6ab, 0.65, 0.42),
    gold: mat(0xc99a3a, 0.55, 0.4, true),
    rtg: mat(0x3a3c40, 0.5, 0.5),
    glass: Object.assign(mat(0x020306, 0.05, 0.5), { envMapIntensity: 0.25 }),
  };
  const g = new THREE.Group();
  buildSuspension(g, M);
  buildBody(g, M);
  buildMast(g, M);
  buildRtg(g, M);
  buildArm(g, M);
  const b = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(CURIOSITY_HEIGHT_M / (b.max.y - b.min.y));
  g.position.y = -b.min.y * g.scale.y;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

export const CURIOSITY_HEIGHT_M = 2.2;

const REFS: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Curiosity (rover): 2.9 m long, 2.7 m wide, 2.2 m tall, 0.5 m wheels, rocker-bogie, MMRTG',
    u: 'https://en.wikipedia.org/wiki/Curiosity_(rover)',
  },
  {
    l: 'NASA JPL — MSL rover: mast, arm turret, HGA and UHF antennas, Hazcams',
    u: 'https://mars.nasa.gov/msl/spacecraft/rover/summary/',
  },
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  curiosity: {
    build: buildCuriosity,
    heightM: CURIOSITY_HEIGHT_M,
    diameterM: 2.7,
    refs: REFS,
  },
};
