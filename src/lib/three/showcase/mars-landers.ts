/**
 * Showcase models: the Mars landers. Viking, the Soviet Mars 2/3/6 capsule, Phoenix (and Mars
 * Polar Lander, the same design family), InSight, Schiaparelli, Beagle 2, the Pathfinder lander
 * and Sojourner. Each stands as it did on the surface, in real metres, base on y = 0, front +z.
 * Deployables are named child groups ('legs', 'petals', 'solar-arrays', 'mast', 'rover', 'arm')
 * so a scene can hide or animate them.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, beam, box, crinkle, dish, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
/** A point at azimuth a (0 = +z, turning toward +x), radius r, height y. */
const az = (a: number, r: number, y: number): THREE.Vector3 =>
  V(Math.sin(a) * r, y, Math.cos(a) * r);

function palette(): Record<string, Mat> {
  return {
    silver: mat(0xc9ccd1, 0.55, 0.35, true),
    foil: mat(0xd6d2c6, 0.5, 0.4, true),
    gold: mat(0xd2a443, 0.55, 0.38, true),
    amber: mat(0xa8692a, 0.5, 0.45, true),
    black: mat(0x1a1b1e, 0.35, 0.65, true),
    dark: mat(0x2b2d31, 0.4, 0.7),
    deck: mat(0x5a5d63, 0.55, 0.55),
    alu: mat(0xb9bcc1, 0.7, 0.38),
    aluDark: mat(0x7e8187, 0.6, 0.5),
    white: mat(0xe6e4de, 0.2, 0.55),
    cell: mat(0x14161c, 0.6, 0.3, true),
    cellLite: mat(0x20253a, 0.6, 0.3, true),
    glass: Object.assign(mat(0x020306, 0.05, 0.5), { envMapIntensity: 0.25 }),
    fabric: mat(0xe6dfcd, 0.0, 0.92, true),
    tan: mat(0xb89a68, 0.15, 0.8),
  };
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  seg = 18,
): THREE.Mesh {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.set(x, y, z);
  return add(g, c);
}

/** Stand the model at its height, base on y = 0. */
function finish(g: THREE.Group, height: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const s = height / (b.max.y - b.min.y);
  g.scale.setScalar(s);
  g.position.y = -b.min.y * s;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

/** A hexagon from six side apothems (side k faces azimuth k·60°); corner k joins sides k-1 and k. */
function hexPts(d: number[]): [number, number][] {
  return d.map((_, k) => {
    const a1 = ((k + 5) % 6) * (Math.PI / 3);
    const a2 = k * (Math.PI / 3);
    const [n1x, n1z] = [Math.sin(a1), Math.cos(a1)];
    const [n2x, n2z] = [Math.sin(a2), Math.cos(a2)];
    const d1 = d[(k + 5) % 6];
    const d2 = d[k];
    const det = n1x * n2z - n1z * n2x;
    return [(d1 * n2z - n1z * d2) / det, (n1x * d2 - d1 * n2x) / det] as [number, number];
  });
}

function regHex(R: number): [number, number][] {
  return Array.from({ length: 6 }, (_, k) => [
    Math.sin((k * Math.PI) / 3) * R,
    Math.cos((k * Math.PI) / 3) * R,
  ]);
}

function prism(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  y0: number,
  y1: number,
  k = 0.985,
): THREE.Mesh {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x * k, z * k)));
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false }),
    m,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y1;
  return add(g, mesh);
}

function cap(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  y: number,
  up: boolean,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))),
    m,
  );
  mesh.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  mesh.position.y = y;
  if (!up) mesh.scale.y = -1;
  return add(g, mesh);
}

function walls(
  g: THREE.Object3D,
  pts: [number, number][],
  y0: number,
  y1: number,
  pick: (i: number) => Mat,
  amp = 0.02,
): void {
  for (let i = 0; i < pts.length; i++) {
    const [ax, az0] = pts[i];
    const [bx, bz] = pts[(i + 1) % pts.length];
    const w = Math.hypot(bx - ax, bz - az0);
    const mx = (ax + bx) / 2;
    const mz = (az0 + bz) / 2;
    let nx = bz - az0;
    let nz = -(bx - ax);
    if (nx * mx + nz * mz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const s = foilSheet(pick(i), w, y1 - y0, amp);
    s.position.set(mx + (nx / w) * 0.004, (y0 + y1) / 2, mz + (nz / w) * 0.004);
    s.rotation.y = Math.atan2(nx, nz);
    add(g, s);
  }
}

/** A round honeycomb footpad on a short piston, base on the ground. */
function footpad(g: THREE.Object3D, M: Record<string, Mat>, at: THREE.Vector3, r: number): void {
  const pad = new THREE.Group();
  pad.position.set(at.x, 0, at.z);
  lathe(pad, M.alu, [
    [0.0, 0.0],
    [r * 0.7, r * 0.04],
    [r * 0.95, r * 0.22],
    [r, r * 0.55],
    [r * 0.93, r * 0.62],
  ]);
  strut(pad, M.aluDark, V(0, r * 0.5, 0), V(0, r * 1.2, 0), r * 0.18);
  add(g, pad);
}

/** A thin cable along a path, lying on the ground. */
function cable(g: THREE.Object3D, m: Mat, pts: THREE.Vector3[], r: number): void {
  add(
    g,
    new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 8, r, 6),
      m,
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// Viking
// ---------------------------------------------------------------------------------------------

const VIKING_H = 2.0;

export function buildVikingLander(): THREE.Group {
  const M = palette();
  const cream = mat(0xe6e3d8, 0.25, 0.5);
  const grey = mat(0xaeb1b6, 0.15, 0.9, true);
  const tanBox = mat(0xb9b190, 0.35, 0.6);
  const g = new THREE.Group();
  const DL = 0.638;
  const DS = 0.791;
  const Y0 = 0.64;
  const Y1 = 1.12;
  // Six sides, alternately 1.09 m and 0.56 m; the legs hang on the short ones (azimuth 60, 180,
  // 300), the cameras and sampler arm on the long forward one (azimuth 0), an engine under each.
  const pts = hexPts([DL, DS, DL, DS, DL, DS]);
  prism(g, M.dark, pts, Y0, Y1);
  walls(g, pts, Y0 + 0.04, Y1, (i) => (i % 2 === 0 ? cream : M.silver), 0.012);
  cap(g, M.black, pts, Y0 - 0.005, false);
  cap(g, M.deck, pts, Y1 + 0.005, true);
  walls(g, pts, Y0, Y0 + 0.06, () => M.black, 0.006);
  // Bulky grey blanket-wrapped bays where each leg folds, as on the Smithsonian's flight spare.
  for (const k of [1, 3, 5]) {
    const a = k * (Math.PI / 3);
    const p = az(a, DS + 0.1, Y1 - 0.2);
    const bay = new THREE.Mesh(
      crinkle(new THREE.BoxGeometry(0.62, 0.34, 0.36, 5, 3, 3), 0.035),
      grey,
    );
    bay.position.copy(p);
    bay.rotation.y = a;
    add(g, bay);
  }
  // Equipment boxes crowding the top deck.
  for (const [x, z, w, d, h] of [
    [-0.35, -0.05, 0.3, 0.3, 0.16],
    [0.3, -0.45, 0.34, 0.22, 0.2],
    [-0.05, 0.2, 0.3, 0.2, 0.1],
    [0.4, 0.15, 0.26, 0.34, 0.12],
  ])
    box(g, cream, w, h, d, x, Y1 + h / 2, z);
  for (const [x, z] of [
    [-0.12, 0.0],
    [0.15, -0.2],
  ]) {
    cyl(g, M.alu, 0.07, 0.07, 0.18, x, Y1 + 0.09, z, 14);
    cyl(g, M.black, 0.06, 0.06, 0.012, x, Y1 + 0.19, z, 14);
  }

  // Legs: a thin main strut from the top of each short side down to the dish footpad, two
  // bracing struts up to the body's lower corners.
  const legs = add(g, new THREE.Group());
  legs.name = 'legs';
  for (const k of [1, 3, 5]) {
    const a = k * (Math.PI / 3);
    const top = az(a, DS + 0.1, Y1 - 0.15);
    const knee = az(a, 1.2, 0.34);
    const mid = top.clone().lerp(knee, 0.55);
    strut(legs, M.alu, top, mid, 0.04, 12);
    strut(legs, M.silver, mid, knee, 0.028, 10);
    const brace = top.clone().lerp(knee, 0.62);
    for (const s of [-1, 1]) {
      const side = V(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(s * 0.27);
      const low = az(a, DS - 0.05, Y0 + 0.04).add(side);
      strut(legs, M.alu, low, brace, 0.022, 8);
    }
    const pad = new THREE.Group();
    pad.position.copy(az(a, 1.276, 0));
    lathe(pad, M.white, [
      [0, 0.0],
      [0.3, 0.02],
      [0.36, 0.06],
      [0.3, 0.08],
      [0, 0.06],
    ]);
    add(legs, pad);
    strut(legs, M.silver, knee, az(a, 1.276, 0.12), 0.026, 8);
  }

  // Terminal descent engines: a gold pod of 18 nozzles under each long side.
  for (const a of [0, TAU / 3, (2 * TAU) / 3]) {
    const c = az(a, 0.82, 0.44);
    cyl(g, M.gold, 0.17, 0.17, 0.24, c.x, c.y, c.z, 20);
    cyl(g, M.aluDark, 0.14, 0.17, 0.04, c.x, c.y - 0.13, c.z, 20);
    strut(g, M.alu, az(a, DL - 0.02, Y0 + 0.06), az(a, 0.82, 0.5), 0.022, 8);
    strut(g, M.alu, az(a + 0.35, DL + 0.05, Y0 + 0.03), az(a, 0.74, 0.5), 0.016, 6);
    strut(g, M.alu, az(a - 0.35, DL + 0.05, Y0 + 0.03), az(a, 0.74, 0.5), 0.016, 6);
    for (let n = 0; n < 18; n++) {
      const ring = n < 12;
      const t = ring ? (n / 12) * TAU : ((n - 12) / 6) * TAU + 0.3;
      const rr = ring ? 0.115 : 0.05;
      const nz = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.08, 8, 1, true), M.silver);
      nz.rotation.x = Math.PI;
      nz.position.set(c.x + Math.cos(t) * rr, c.y - 0.2, c.z + Math.sin(t) * rr);
      add(g, nz);
    }
  }

  // The two RTGs stand as tall white windscreens at the back of the deck, each ribbed and slotted.
  for (const sx of [-1, 1]) {
    const c = V(sx * 0.5, Y1, -0.3);
    cyl(g, M.white, 0.23, 0.23, 0.62, c.x, c.y + 0.31, c.z, 28);
    cyl(g, M.alu, 0.235, 0.235, 0.025, c.x, c.y + 0.63, c.z, 28);
    cyl(g, M.aluDark, 0.25, 0.25, 0.03, c.x, c.y + 0.02, c.z, 28);
    for (let r = 0; r < 4; r++) {
      const ra = (r / 4) * TAU + 0.4;
      box(
        g,
        M.black,
        0.02,
        0.26,
        0.02,
        c.x + Math.sin(ra) * 0.231,
        c.y + 0.35,
        c.z + Math.cos(ra) * 0.231,
      );
    }
  }

  // High-gain antenna: a disc on a two-axis gimbal at the end of a boom, in the middle at the back.
  const hgaBase = V(0, Y1, -0.5);
  strut(g, M.alu, hgaBase, hgaBase.clone().setY(1.5), 0.035, 10);
  box(g, M.aluDark, 0.14, 0.14, 0.14, 0, 1.56, -0.5);
  const hga = dish(M.white, M.silver, 0.4);
  hga.position.set(0, 1.62, -0.5);
  hga.rotation.set(1.05, 0, 0);
  add(g, hga);
  // Low-gain S-band mast with its cone, and the UHF turnstile.
  const lg = V(0.82, Y1 - 0.02, -0.3);
  strut(g, M.silver, lg, lg.clone().setY(1.45), 0.018, 6);
  add(g, new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 12), M.white)).position.set(
    lg.x,
    1.53,
    lg.z,
  );

  // Cameras on the forward face: a tan housing, the two cylinder scan cameras; and the
  // meteorology boom off the rear-left leg.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  box(mast, tanBox, 0.3, 0.3, 0.2, 0, Y1 + 0.15, 0.5);
  for (const x of [-0.07, 0.07]) {
    cyl(mast, M.silver, 0.05, 0.05, 0.28, x, Y1 + 0.44, 0.5, 18);
    cyl(mast, M.glass, 0.053, 0.053, 0.06, x, Y1 + 0.47, 0.5, 18);
  }
  const mb = az((5 * Math.PI) / 3, 1.0, 0.95);
  strut(mast, M.silver, mb, mb.clone().add(V(0.5, 0.55, -0.35)), 0.012, 6);
  box(mast, M.alu, 0.07, 0.06, 0.07, mb.x + 0.5, mb.y + 0.57, mb.z - 0.35);

  // Sampler arm: out from the forward face, a dark ribbed boom lowered to the soil.
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  box(arm, M.aluDark, 0.26, 0.2, 0.34, 0.0, 0.9, DL + 0.14);
  const a0 = V(0, 0.9, DL + 0.2);
  const a1 = V(0.05, 0.2, 2.05);
  strut(arm, mat(0x5d534c, 0.5, 0.55), a0, a1, 0.05, 10);
  const head = box(arm, M.alu, 0.13, 0.08, 0.16, 0.05, 0.16, 2.1);
  head.rotation.x = 0.3;
  cyl(arm, M.black, 0.012, 0.012, 0.1, 0.05, 0.1, 2.15, 6);
  return finish(g, VIKING_H);
}

// ---------------------------------------------------------------------------------------------
// Soviet Mars 2 / 3 / 6 landing capsule
// ---------------------------------------------------------------------------------------------

const SOVIET_H = 1.5;

/** The landed capsule: the 1.2 m sphere with four curved petals opened on the ground. */
export function buildSovietMarsLander(): THREE.Group {
  const M = palette();
  const white = mat(0xe9e4d6, 0.2, 0.5);
  const ring = mat(0xa8852f, 0.5, 0.45);
  const g = new THREE.Group();
  const R = 0.6;
  const CY = 0.75;
  // The body: the white spherical shell with its equatorial belt, the exposed instrument crown.
  const lower = add(g, new THREE.Mesh(new THREE.SphereGeometry(R, 40, 24), white));
  lower.position.y = CY;
  const belt = add(g, new THREE.Mesh(new THREE.TorusGeometry(R * 0.99, 0.03, 8, 56), ring));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = CY;
  // Gold-brown foil collar low on the sphere where it sits among the petals.
  const collar = add(
    g,
    new THREE.Mesh(crinkle(new THREE.CylinderGeometry(0.48, 0.5, 0.2, 14, 2, true), 0.02), M.gold),
  );
  collar.position.y = 0.3;

  // Four petals: curved white troughs hinged at the foot of the sphere and opened outward like
  // a flower, each with its rib frame, hinge barrel and a bracket of equipment.
  const petals = add(g, new THREE.Group());
  petals.name = 'petals';
  const PL = 1.15;
  const petalGeo = (): THREE.BufferGeometry => {
    const geo = new THREE.PlaneGeometry(1, PL, 6, 8);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const u = pos.getX(k);
      const v = pos.getY(k) + PL / 2;
      const wv = 0.7 - (0.7 - 0.28) * (v / PL);
      pos.setXYZ(k, u * wv, 0.11 * (u * 2) ** 2 * (wv / 0.7), v);
    }
    geo.computeVertexNormals();
    return geo;
  };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const p = add(petals, new THREE.Group());
    p.position.copy(az(a, 0.42, 0.2));
    p.rotation.y = a;
    const hinge = new THREE.Group();
    hinge.rotation.x = -0.42;
    add(p, hinge);
    const plate = new THREE.Mesh(petalGeo(), i % 2 ? white : M.foil);
    plate.material = (plate.material as Mat).clone();
    (plate.material as Mat).side = THREE.DoubleSide;
    add(hinge, plate);
    for (const s of [-1, 1])
      beam(hinge, M.aluDark, V(s * 0.35, 0.115, 0), V(s * 0.14, 0.115, PL), 0.02, 0.02);
    beam(hinge, M.aluDark, V(-0.14, 0.115, PL), V(0.14, 0.115, PL), 0.02, 0.02);
    cyl(hinge, M.dark, 0.03, 0.03, 0.66, 0, 0.0, 0.0, 10).rotation.z = Math.PI / 2;
    const unit = box(hinge, i % 2 ? M.alu : M.deck, 0.16, 0.08, 0.2, 0.0, 0.05, 0.55);
    unit.rotation.y = 0.2;
  }

  // Antenna crown: four rod aerials splayed out, two stereo-camera ears, a wind-sensor boom.
  const top = CY + R;
  cyl(g, M.aluDark, 0.07, 0.12, 0.14, 0, top - 0.04, 0, 18);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    strut(g, M.silver, az(a, 0.1, top + 0.02), az(a, 0.4, top + 0.18), 0.011, 6);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), M.white)).position.copy(
      az(a, 0.4, top + 0.18),
    );
  }
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  strut(mast, M.silver, V(0, top, 0), V(0, top + 0.22, 0), 0.01, 6);
  for (const s of [-1, 1]) {
    strut(mast, M.alu, V(s * 0.3, CY + 0.42, 0.15), V(s * 0.34, CY + 0.66, 0.18), 0.02, 8);
    box(mast, M.white, 0.1, 0.09, 0.1, s * 0.34, CY + 0.7, 0.18);
    cyl(mast, M.glass, 0.025, 0.025, 0.06, s * 0.34, CY + 0.7, 0.25, 10).rotation.x = Math.PI / 2;
  }
  strut(mast, M.silver, V(0.15, top - 0.05, -0.1), V(0.4, top + 0.15, -0.2), 0.01, 6);

  // PrOP-M: a box on two skis, tethered to the capsule by its umbilical, on the ground beside it.
  const rover = add(g, new THREE.Group());
  rover.name = 'rover';
  rover.position.set(1.5, 0, 1.25);
  rover.rotation.y = 0.5;
  for (const s of [-1, 1]) {
    box(rover, M.alu, 0.07, 0.015, 0.5, s * 0.12, 0.03, 0);
    const nose = box(rover, M.alu, 0.07, 0.015, 0.1, s * 0.12, 0.05, 0.28);
    nose.rotation.x = 0.5;
    strut(rover, M.aluDark, V(s * 0.12, 0.03, 0.1), V(s * 0.12, 0.12, 0.1), 0.012, 6);
    strut(rover, M.aluDark, V(s * 0.12, 0.03, -0.1), V(s * 0.12, 0.12, -0.1), 0.012, 6);
  }
  box(rover, M.foil, 0.34, 0.1, 0.3, 0, 0.17, 0);
  box(rover, M.gold, 0.3, 0.015, 0.26, 0, 0.23, 0);
  strut(rover, M.silver, V(0, 0.15, 0.15), V(0, 0.08, 0.42), 0.012, 6);
  strut(rover, M.silver, V(0.1, 0.23, -0.12), V(0.1, 0.45, -0.14), 0.007, 4);
  box(rover, M.black, 0.07, 0.04, 0.02, 0, 0.17, 0.155);
  cable(
    g,
    M.black,
    [
      V(1.45, 0.012, 1.1),
      V(1.1, 0.012, 0.95),
      V(0.8, 0.012, 1.05),
      V(0.65, 0.2, 0.7),
      V(0.5, 0.4, 0.45),
    ],
    0.01,
  );
  return finish(g, SOVIET_H);
}

// ---------------------------------------------------------------------------------------------
// Phoenix / Mars Polar Lander, InSight: the deck lander family
// ---------------------------------------------------------------------------------------------

const PHOENIX_H = 2.2;
const INSIGHT_H = 1.7;

function regPoly(n: number, R: number, phase = 0): [number, number][] {
  return Array.from({ length: n }, (_, k) => [
    Math.sin(phase + (k * TAU) / n) * R,
    Math.cos(phase + (k * TAU) / n) * R,
  ]);
}

/** A twelve-sided UltraFlex fan: dark gores on a hub, silver ribs, a gold edge. Faces +y. */
function ultraflex(M: Record<string, Mat>, r: number): THREE.Group {
  const f = new THREE.Group();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    const a1 = ((i + 1) / n) * TAU;
    const am = (a0 + a1) / 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          Math.cos(am) * 0.1,
          0.07,
          Math.sin(am) * 0.1,
          Math.cos(a1) * r,
          0,
          Math.sin(a1) * r,
          Math.cos(a0) * r,
          0,
          Math.sin(a0) * r,
        ],
        3,
      ),
    );
    geo.computeVertexNormals();
    add(f, new THREE.Mesh(geo, i % 2 ? M.cell : M.cellLite));
    const p0 = V(Math.cos(a0) * r, 0.004, Math.sin(a0) * r);
    const p1 = V(Math.cos(a1) * r, 0.004, Math.sin(a1) * r);
    strut(f, M.gold, p0, p1, 0.011, 5);
    strut(f, M.alu, V(Math.cos(a0) * 0.1, 0.075, Math.sin(a0) * 0.1), p0, 0.008, 4);
    // Cell strings: lighter bands across each gore.
    for (const t of [0.35, 0.62, 0.85]) {
      const q0 = V(Math.cos(a0) * r * t, 0.07 * (1 - t) + 0.006, Math.sin(a0) * r * t);
      const q1 = V(Math.cos(a1) * r * t, 0.07 * (1 - t) + 0.006, Math.sin(a1) * r * t);
      strut(f, M.cellLite, q0, q1, 0.005, 3);
    }
  }
  cyl(f, M.aluDark, 0.11, 0.13, 0.06, 0, 0.05, 0, 16);
  return f;
}

/** A triangular lattice tower: three posts, rings and diagonals. */
function lattice(
  g: THREE.Object3D,
  m: Mat,
  base: THREE.Vector3,
  h: number,
  r0: number,
  r1: number,
  bays: number,
): void {
  const post = (k: number, t: number): THREE.Vector3 => {
    const a = (k / 3) * TAU;
    const r = r0 + (r1 - r0) * t;
    return V(base.x + Math.sin(a) * r, base.y + h * t, base.z + Math.cos(a) * r);
  };
  for (let k = 0; k < 3; k++) strut(g, m, post(k, 0), post(k, 1), 0.01, 5);
  for (let b = 0; b <= bays; b++) {
    const t = b / bays;
    for (let k = 0; k < 3; k++) strut(g, m, post(k, t), post((k + 1) % 3, t), 0.006, 4);
    if (b < bays)
      for (let k = 0; k < 3; k++)
        strut(g, m, post(k, t), post((k + 1) % 3, (b + 1) / bays), 0.005, 4);
  }
}

/** Octagonal deck, gold-wrapped tub, three ribbed legs, 12 descent thrusters. Deck top at deckY. */
function deckLander(
  g: THREE.Group,
  M: Record<string, Mat>,
  R: number,
  deckY: number,
  padR: number,
): void {
  const pts = regPoly(8, R, Math.PI / 8);
  const tub = regPoly(8, R * 0.88, Math.PI / 8);
  const Y0 = deckY - 0.5;
  prism(g, M.dark, tub, Y0, deckY, 0.98);
  walls(g, tub, Y0 + 0.05, deckY - 0.05, (i) => (i % 2 ? M.gold : M.amber), 0.03);
  walls(g, tub, Y0, Y0 + 0.07, () => M.black, 0.006);
  cap(g, M.black, tub, Y0 - 0.005, false);
  prism(g, M.white, pts, deckY - 0.07, deckY, 1.0);
  cap(g, M.white, pts, deckY + 0.004, true);
  walls(g, pts, deckY - 0.07, deckY, () => M.gold, 0.004);
  // Round access hatches on the deck, as on the flight article.
  for (const [x, z, r] of [
    [-0.25, 0.1, 0.17],
    [0.15, -0.3, 0.1],
  ])
    cyl(g, M.black, r, r, 0.006, x * (R / 0.8), deckY + 0.006, z * (R / 0.8), 24);
  const legs = add(g, new THREE.Group());
  legs.name = 'legs';
  for (const k of [1, 3, 5]) {
    const a = k * (Math.PI / 3);
    const top = az(a, R * 0.94, deckY - 0.08);
    const knee = az(a, padR - 0.05, 0.4);
    const mid = top.clone().lerp(knee, 0.62);
    strut(legs, M.gold, top, mid, 0.06, 12).geometry = crinkle(
      new THREE.CylinderGeometry(0.06, 0.06, top.distanceTo(mid), 12, 6),
      0.012,
    );
    for (let c = 1; c < 7; c++) {
      const p = top.clone().lerp(mid, c / 7);
      const ringM = add(legs, new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 5, 12), M.black));
      ringM.position.copy(p);
      ringM.quaternion.setFromUnitVectors(V(0, 0, 1), mid.clone().sub(top).normalize());
    }
    strut(legs, M.silver, mid, knee, 0.04, 10);
    const brace = top.clone().lerp(knee, 0.7);
    for (const s of [-1, 1]) {
      const side = V(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(s * R * 0.4);
      strut(legs, M.alu, az(a, R * 0.66, Y0 + 0.08).add(side), brace, 0.028, 8);
    }
    footpad(legs, M, az(a, padR, 0), 0.3);
    strut(legs, M.silver, knee, az(a, padR, 0.24), 0.04, 8);
  }
  // Terminal-descent thruster pods under the other three corners: 4 nozzles each.
  for (const k of [0, 2, 4]) {
    const a = k * (Math.PI / 3);
    const c = az(a, R * 0.8, Y0 + 0.02);
    box(g, M.aluDark, 0.24, 0.1, 0.24, c.x, c.y, c.z).rotation.y = a;
    for (const [dx, dz] of [
      [-0.06, -0.06],
      [0.06, -0.06],
      [-0.06, 0.06],
      [0.06, 0.06],
    ]) {
      const nz = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 10, 1, true), M.black);
      nz.rotation.x = Math.PI;
      const o = V(dx, 0, dz).applyAxisAngle(V(0, 1, 0), a);
      nz.position.set(c.x + o.x, c.y - 0.1, c.z + o.z);
      add(g, nz);
    }
  }
}

function ultraflexPair(
  g: THREE.Group,
  M: Record<string, Mat>,
  r: number,
  cx: number,
  y: number,
  tilt: number,
  armFrom: number,
): void {
  const arrays = add(g, new THREE.Group());
  arrays.name = 'solar-arrays';
  for (const s of [-1, 1]) {
    const f = add(arrays, ultraflex(M, r));
    f.position.set(s * cx, y, 0);
    f.rotation.z = -s * tilt;
    f.userData.solarArray = true;
    for (const dz of [-0.25, 0.25])
      strut(
        arrays,
        M.alu,
        V(s * armFrom, y - 0.06, dz),
        V(s * (cx - r * 0.3), y + 0.02, dz),
        0.022,
        8,
      );
  }
}

function instrumentBox(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  body: Mat,
): void {
  box(g, body, w, h, d, x, y + h / 2, z);
  box(g, M.black, w * 0.9, 0.012, d * 0.9, x, y + h + 0.004, z);
}

export function buildPhoenix(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const DY = 0.95;
  deckLander(g, M, 0.8, DY, 1.45);
  ultraflexPair(g, M, 1.05, 1.78, DY + 0.08, 0.1, 0.7);
  // Deck: TEGA's two ovens, MECA's wet-chemistry cells, foil-wrapped electronics, UHF antenna.
  instrumentBox(g, M, 0.4, 0.2, 0.34, 0.42, DY, 0.38, M.alu);
  for (const dz of [-0.07, 0.07]) {
    cyl(g, M.black, 0.065, 0.065, 0.1, 0.42, DY + 0.24, 0.38 + dz, 14);
    cyl(g, M.aluDark, 0.07, 0.07, 0.015, 0.42, DY + 0.3, 0.38 + dz, 14);
  }
  instrumentBox(g, M, 0.46, 0.26, 0.4, -0.5, DY, 0.0, M.silver);
  for (const dx of [-0.15, -0.05, 0.05, 0.15])
    cyl(g, M.glass, 0.03, 0.03, 0.03, -0.5 + dx, DY + 0.28, 0.1, 10);
  const wrap = new THREE.Mesh(
    crinkle(new THREE.BoxGeometry(0.5, 0.2, 0.4, 5, 3, 4), 0.025),
    M.foil,
  );
  wrap.position.set(0.0, DY + 0.1, -0.18);
  add(g, wrap);
  const uhf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 12), M.white);
  uhf.position.set(0.28, DY + 0.14, -0.55);
  add(g, uhf);

  // Robotic arm: shoulder at the front-left, upper arm up and forward, forearm down to the scoop.
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  const sh = V(-0.28, DY + 0.12, 0.55);
  const el = V(-0.28, DY + 0.58, 1.4);
  const wr = V(-0.28, 0.3, 2.05);
  box(arm, M.aluDark, 0.22, 0.16, 0.22, sh.x, sh.y - 0.02, sh.z);
  strut(arm, M.gold, sh, el, 0.045, 12);
  cyl(arm, M.dark, 0.065, 0.065, 0.12, el.x, el.y, el.z, 14).rotation.z = Math.PI / 2;
  strut(arm, M.gold, el, wr, 0.04, 12);
  const scoop = add(
    arm,
    new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 14, 1, true, 0, Math.PI), M.alu),
  );
  scoop.position.copy(wr).add(V(0, -0.06, 0.04));
  scoop.rotation.set(0.2, 0, Math.PI / 2);
  box(arm, M.black, 0.07, 0.06, 0.08, wr.x + 0.1, wr.y + 0.06, wr.z - 0.02);

  // Cameras and weather: the SSI stereo head on a lattice tower; the MET mast with its lidar,
  // thermocouple arms and wind tell-tale.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  lattice(mast, M.alu, V(0.42, DY, -0.05), 0.78, 0.17, 0.07, 5);
  box(mast, M.alu, 0.3, 0.13, 0.12, 0.42, DY + 0.86, -0.05);
  for (const dx of [-0.09, 0.09]) {
    cyl(mast, M.glass, 0.04, 0.04, 0.05, 0.42 + dx, DY + 0.86, 0.02, 14).rotation.x = Math.PI / 2;
    cyl(mast, M.black, 0.05, 0.05, 0.02, 0.42 + dx, DY + 0.86, 0.0, 14).rotation.x = Math.PI / 2;
  }
  box(mast, M.aluDark, 0.15, 0.12, 0.15, -0.3, DY + 0.06, -0.55);
  strut(mast, M.white, V(-0.3, DY + 0.1, -0.55), V(-0.3, 2.14, -0.55), 0.018, 10);
  for (const [y, len] of [
    [DY + 0.55, 0.18],
    [DY + 0.85, 0.2],
    [DY + 1.14, 0.22],
  ]) {
    strut(mast, M.silver, V(-0.3, y, -0.55), V(-0.3 + len, y, -0.55), 0.008, 5);
    add(mast, new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.gold)).position.set(
      -0.3 + len,
      y,
      -0.55,
    );
  }
  cyl(mast, M.white, 0.05, 0.05, 0.12, -0.3, 2.14, -0.55, 14);
  cyl(mast, M.black, 0.045, 0.045, 0.02, -0.3, 2.21, -0.55, 14);
  return finish(g, PHOENIX_H);
}

export function buildInSight(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const DY = 1.0;
  deckLander(g, M, 0.9, DY, 1.6);
  ultraflexPair(g, M, 1.075, 1.95, DY + 0.1, 0.12, 0.8);
  // Deck: the tether and electronics boxes, a camera, the UHF mast, the medium-gain horn.
  const wrap = new THREE.Mesh(
    crinkle(new THREE.BoxGeometry(0.6, 0.2, 0.44, 5, 3, 4), 0.025),
    M.gold,
  );
  wrap.position.set(0.0, DY + 0.1, -0.25);
  add(g, wrap);
  instrumentBox(g, M, 0.34, 0.14, 0.3, 0.45, DY, 0.35, M.alu);
  cyl(g, M.white, 0.1, 0.1, 0.22, 0.45, DY + 0.25, 0.35, 16);
  box(g, M.aluDark, 0.16, 0.12, 0.18, 0.35, DY + 0.06, 0.62);
  cyl(g, M.glass, 0.035, 0.035, 0.04, 0.35, DY + 0.07, 0.72, 12).rotation.x = Math.PI / 2;
  strut(g, M.silver, V(-0.55, DY, -0.5), V(-0.55, DY + 0.42, -0.5), 0.012, 6);
  cyl(g, M.white, 0.05, 0.05, 0.03, -0.55, DY + 0.43, -0.5, 14);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 14, 1, true), M.white);
  horn.position.set(0.55, DY + 0.28, -0.55);
  horn.rotation.set(-0.4, 0, 0.2);
  add(g, horn);
  strut(g, M.aluDark, V(0.55, DY, -0.55), V(0.55, DY + 0.2, -0.55), 0.03, 8);
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  for (const s of [-1, 1]) {
    strut(mast, M.silver, V(s * 0.3, DY + 0.1, 0.1), V(s * 0.5, DY + 0.12, 0.7), 0.012, 6);
    box(mast, M.alu, 0.05, 0.05, 0.05, s * 0.5, DY + 0.12, 0.7);
  }

  // Robotic arm (IDA, 1.8 m): out over the ground with the grapple hanging at the end.
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  const sh = V(-0.35, DY + 0.1, 0.6);
  const el = V(-0.55, DY + 0.55, 1.4);
  const wr = V(-0.95, DY + 0.1, 2.0);
  box(arm, M.aluDark, 0.26, 0.16, 0.26, sh.x, sh.y - 0.01, sh.z);
  strut(arm, M.silver, sh, el, 0.05, 12);
  cyl(arm, M.dark, 0.07, 0.07, 0.14, el.x, el.y, el.z, 14).rotation.z = Math.PI / 2;
  strut(arm, M.silver, el, wr, 0.045, 12);
  box(arm, M.alu, 0.22, 0.14, 0.12, wr.x, wr.y - 0.06, wr.z);
  for (let i = 0; i < 5; i++) {
    const t = (i / 5) * TAU;
    strut(
      arm,
      M.black,
      V(wr.x + Math.cos(t) * 0.05, wr.y - 0.1, wr.z + Math.sin(t) * 0.05),
      V(wr.x + Math.cos(t) * 0.075, wr.y - 0.3, wr.z + Math.sin(t) * 0.075),
      0.01,
      5,
    );
  }
  box(arm, M.glass, 0.07, 0.07, 0.05, wr.x + 0.05, wr.y, wr.z + 0.08);

  // SEIS on the ground under its wind and thermal shield: a dome of crinkled silver foil with a
  // dark pleated skirt; its tether runs back to the deck.
  const seis = add(g, new THREE.Group());
  seis.name = 'seis';
  seis.position.set(-1.55, 0, 1.55);
  const dome = add(
    seis,
    new THREE.Mesh(
      crinkle(new THREE.SphereGeometry(0.46, 18, 10, 0, TAU, 0, Math.PI / 2), 0.018),
      M.silver,
    ),
  );
  dome.position.y = 0.1;
  add(
    seis,
    new THREE.Mesh(
      crinkle(new THREE.CylinderGeometry(0.46, 0.6, 0.18, 20, 2, true), 0.02),
      M.black,
    ),
  ).position.y = 0.09;
  box(seis, M.gold, 0.16, 0.012, 0.16, 0, 0.545, 0);
  cable(
    g,
    M.black,
    [
      V(-1.35, 0.02, 1.35),
      V(-1.1, 0.02, 1.15),
      V(-0.8, 0.02, 1.2),
      V(-0.7, 0.4, 0.95),
      V(-0.5, DY + 0.05, 0.6),
    ],
    0.018,
  );

  // HP3 deployed: the support structure on the ground, the mole and its science tether.
  const hp3 = add(g, new THREE.Group());
  hp3.name = 'hp3';
  hp3.position.set(1.55, 0, 1.5);
  prism(hp3, M.white, regHex(0.26), 0.02, 0.24, 1.0);
  cap(hp3, M.dark, regHex(0.26), 0.245, true);
  cyl(hp3, M.black, 0.07, 0.07, 0.2, 0, 0.35, 0, 14);
  cyl(hp3, M.alu, 0.085, 0.085, 0.02, 0, 0.46, 0, 14);
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI / 3);
    cyl(hp3, M.aluDark, 0.03, 0.03, 0.04, Math.sin(a) * 0.3, 0.025, Math.cos(a) * 0.3, 8);
  }
  box(hp3, M.gold, 0.22, 0.1, 0.16, 0.0, 0.07, -0.3);
  cable(
    g,
    M.black,
    [V(1.4, 0.02, 1.3), V(1.1, 0.02, 1.1), V(0.9, 0.3, 0.85), V(0.55, DY + 0.1, 0.5)],
    0.018,
  );
  return finish(g, INSIGHT_H);
}

// ---------------------------------------------------------------------------------------------
// Schiaparelli EDM
// ---------------------------------------------------------------------------------------------

const SCHIA_H = 0.8;

/** The EDM after landing as intended: flat crushable base, foil-wrapped platform, DREAMS on top. */
export function buildSchiaparelli(): THREE.Group {
  const M = palette();
  const tank = mat(0xcfd2d6, 0.8, 0.25);
  const tankGold = mat(0xb99a5e, 0.7, 0.3);
  const g = new THREE.Group();
  // The crushable structure: a flat dark honeycomb disc ringed by a silver-gold blanket band.
  lathe(
    g,
    M.dark,
    [
      [0.0, 0.0],
      [0.8, 0.0],
      [0.83, 0.03],
      [0.83, 0.2],
      [0.0, 0.2],
    ],
    48,
  );
  const band = add(
    g,
    new THREE.Mesh(
      crinkle(new THREE.CylinderGeometry(0.845, 0.845, 0.19, 36, 2, true), 0.015),
      M.foil,
    ),
  );
  band.position.y = 0.105;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    box(g, M.alu, 0.03, 0.17, 0.012, Math.sin(a) * 0.842, 0.105, Math.cos(a) * 0.842).rotation.y =
      a;
  }
  // The platform deck is under a crinkled silver blanket, as in the ESA model.
  const blanket = add(
    g,
    new THREE.Mesh(crinkle(new THREE.CylinderGeometry(0.76, 0.8, 0.16, 28, 3), 0.045), M.foil),
  );
  blanket.position.y = 0.26;
  // Propellant tanks: spheres on struts, two silver, one gold.
  for (const [k, m] of [
    [0, tank],
    [1, tankGold],
    [2, tank],
  ] as [number, Mat][]) {
    const a = (k / 3) * TAU + 0.5;
    const p = az(a, 0.47, 0.5);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), m)).position.copy(p);
    cyl(g, M.aluDark, 0.14, 0.12, 0.1, p.x, 0.34, p.z, 16);
    strut(g, M.alu, p.clone().add(V(0, 0.18, 0)), az(a + 0.35, 0.3, 0.6), 0.008, 4);
  }
  // Surface platform with DREAMS: a grey box, the gold conical UHF coil, two gold sensor masts.
  const plat = add(g, new THREE.Group());
  plat.name = 'platform';
  box(plat, M.alu, 0.72, 0.2, 0.42, 0.0, 0.5, -0.12);
  box(plat, M.silver, 0.5, 0.05, 0.3, 0.02, 0.64, -0.12);
  box(plat, M.white, 0.2, 0.012, 0.1, -0.15, 0.667, -0.12);
  lathe(
    plat,
    M.gold,
    [
      [0.12, 0.6],
      [0.1, 0.68],
      [0.07, 0.78],
      [0.045, 0.86],
    ],
    16,
  );
  for (let r = 0; r < 5; r++) {
    const rr = 0.12 - r * 0.018;
    const t = add(plat, new THREE.Mesh(new THREE.TorusGeometry(rr, 0.007, 5, 20), M.gold));
    t.rotation.x = Math.PI / 2;
    t.position.set(0.0, 0.62 + r * 0.055, 0);
  }
  plat.children[plat.children.length - 1].position.x = 0;
  strut(plat, M.gold, V(0.25, 0.6, -0.3), V(0.25, 0.92, -0.3), 0.012, 6);
  add(plat, new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M.gold)).position.set(
    0.25,
    0.93,
    -0.3,
  );
  strut(plat, M.gold, V(-0.3, 0.6, -0.28), V(-0.3, 0.84, -0.28), 0.01, 6);
  box(plat, M.deck, 0.06, 0.05, 0.06, 0.0, 0.69, 0.0);
  // Three thruster groups on the rim, three nozzles each, pointing out and down.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.9;
    const c = az(a, 0.74, 0.42);
    const mount = box(g, M.aluDark, 0.3, 0.06, 0.12, c.x, c.y - 0.04, c.z);
    mount.rotation.y = a;
    for (const s of [-1, 0, 1]) {
      const side = V(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(s * 0.09);
      const out = az(a, 0.1, 0);
      const nz = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 0.14, 10, 1, true),
        M.silver,
      );
      nz.position
        .copy(c)
        .add(side)
        .add(out)
        .add(V(0, -0.02, 0));
      nz.quaternion.setFromUnitVectors(
        V(0, -1, 0),
        out
          .clone()
          .normalize()
          .add(V(0, -0.5, 0))
          .normalize(),
      );
      add(g, nz);
      cyl(g, M.alu, 0.03, 0.03, 0.1, c.x + side.x, c.y + 0.05, c.z + side.z, 8);
    }
  }
  return finish(g, SCHIA_H);
}

// ---------------------------------------------------------------------------------------------
// Beagle 2
// ---------------------------------------------------------------------------------------------

const BEAGLE_H = 0.45;

/** Beagle 2 opened: the gold lid with its square target, four solar petals, the base and PAW arm. */
export function buildBeagle2(): THREE.Group {
  const M = palette();
  const gold = mat(0xc9a22f, 0.6, 0.35);
  const blue = [mat(0x2a3d78, 0.5, 0.35), mat(0x34488a, 0.5, 0.35), mat(0x1e2d62, 0.5, 0.35)];
  const g = new THREE.Group();
  // The lid, facing up: a gold dish with the dark plate and its gold calibration square.
  const lid = add(g, new THREE.Group());
  lid.name = 'lid';
  lathe(
    lid,
    gold,
    [
      [0, 0],
      [0.36, 0],
      [0.4, 0.03],
      [0.4, 0.07],
      [0.37, 0.08],
    ],
    40,
  );
  cyl(lid, M.black, 0.355, 0.355, 0.006, 0, 0.078, 0, 40);
  for (const [w, d, x, z] of [
    [0.34, 0.04, 0, 0.15],
    [0.34, 0.04, 0, -0.15],
    [0.04, 0.34, 0.15, 0],
    [0.04, 0.34, -0.15, 0],
  ])
    box(lid, gold, w, 0.008, d, x, 0.084, z);
  for (const [x, z] of [
    [0.07, 0.07],
    [-0.07, 0.07],
    [0.07, -0.07],
    [-0.07, -0.07],
  ])
    cyl(lid, M.alu, 0.012, 0.012, 0.012, x, 0.088, z, 8);

  // Four solar petals around the lid: dark rounded plates, a central hole, a mosaic of cells.
  const petals = add(g, new THREE.Group());
  petals.name = 'petals';
  for (let i = 0; i < 4; i++) {
    const a = ((i + 0.5) / 4) * TAU;
    const p = add(petals, new THREE.Group());
    const c = az(a, 0.66, 0.03);
    p.position.copy(c);
    p.userData.solarArray = true;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.36, 9), M.black);
    disc.rotation.x = -Math.PI / 2;
    disc.rotation.z = i * 0.4;
    add(p, disc);
    for (let u = -3; u <= 3; u++)
      for (let v = -3; v <= 3; v++) {
        const x = u * 0.088 + (v % 2) * 0.03;
        const z = v * 0.088;
        if (Math.hypot(x, z) < 0.07 || Math.hypot(x, z) > 0.3) continue;
        const cell = box(p, blue[(u * 3 + v * 5 + 30) % 3], 0.082, 0.004, 0.082, x, 0.004, z);
        cell.rotation.y = 0.1;
      }
    for (const t of [0.3, 1.8, 3.4, 4.9])
      cyl(p, M.alu, 0.012, 0.012, 0.012, Math.cos(t) * 0.33, 0.008, Math.sin(t) * 0.33, 8);
    strut(petals, M.aluDark, az(a, 0.4, 0.04), az(a, 0.5, 0.04), 0.012, 6);
  }

  // The base: a gold bowl at the back holding the electronics, with the arm lifting out of it.
  const base = add(g, new THREE.Group());
  base.name = 'base';
  base.position.set(0, 0, -1.08);
  lathe(
    base,
    gold,
    [
      [0, 0],
      [0.34, 0],
      [0.4, 0.04],
      [0.4, 0.13],
      [0.36, 0.14],
      [0.3, 0.1],
      [0, 0.07],
    ],
    40,
  );
  box(base, M.dark, 0.34, 0.05, 0.26, 0.04, 0.1, 0.0);
  box(base, M.alu, 0.14, 0.06, 0.14, -0.12, 0.12, 0.05);
  box(base, M.silver, 0.2, 0.04, 0.1, 0.0, 0.13, -0.15);
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  const sh = V(0.1, 0.16, -1.05);
  const el = V(0.12, 0.45, -0.55);
  const wr = V(0.12, 0.24, 0.08);
  cyl(arm, M.dark, 0.04, 0.04, 0.08, sh.x, sh.y, sh.z, 12);
  strut(arm, M.silver, sh, el, 0.018, 8);
  add(arm, new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.aluDark)).position.copy(el);
  strut(arm, M.silver, el, wr, 0.016, 8);
  // PAW: the drum with its cameras, spectrometers and the mole.
  const paw = add(arm, new THREE.Group());
  paw.position.copy(wr);
  cyl(paw, M.alu, 0.08, 0.08, 0.12, 0, -0.02, 0.0, 18);
  cyl(paw, M.black, 0.05, 0.05, 0.02, 0, -0.09, 0.0, 14);
  box(paw, M.aluDark, 0.07, 0.06, 0.05, 0.08, 0.03, 0.04);
  cyl(paw, M.glass, 0.016, 0.016, 0.03, 0.08, 0.03, 0.08, 8).rotation.x = Math.PI / 2;
  strut(paw, M.silver, V(-0.05, 0.02, 0.03), V(-0.18, 0.04, 0.2), 0.01, 6);
  return finish(g, BEAGLE_H);
}

// ---------------------------------------------------------------------------------------------
// Mars Pathfinder lander and Sojourner
// ---------------------------------------------------------------------------------------------

const PATHFINDER_H = 1.45;
const SOJOURNER_H = 0.3;

/** Pathfinder on the surface: white tetrahedral body, three petals open, ramps, deflated bags. */
export function buildPathfinderLander(): THREE.Group {
  const M = palette();
  const bag = mat(0xcdbf9a, 0.0, 0.95, true);
  const g = new THREE.Group();
  const BY = 0.1;
  // The body: a truncated tetrahedron, white, with the gold-foil rover bay and a front panel.
  const body = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.54, 0.62, 3), M.white));
  body.rotation.y = Math.PI / 3;
  body.position.y = BY + 0.31;
  cap(g, M.deck, regPoly(3, 0.2, Math.PI / 3), BY + 0.625, true);
  const foilPatch = (a: number): void => {
    const s = foilSheet(M.gold, 0.4, 0.3, 0.02);
    const p = az(a, 0.215, BY + 0.2);
    s.position.copy(p);
    s.rotation.set(-0.45, a, 0, 'YXZ');
    add(g, s);
  };
  foilPatch(0);
  foilPatch((2 * Math.PI) / 3);
  // Three petals, opened flat: dark solar plates in silver frames with copper edging.
  const petals = add(g, new THREE.Group());
  petals.name = 'petals';
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3;
    const pt = add(petals, new THREE.Group());
    pt.position.copy(az(a, 0.27, BY));
    pt.rotation.y = a;
    pt.userData.solarArray = true;
    const w0 = 0.93;
    const w1 = 0.26;
    const L = 1.2;
    const shape = new THREE.Shape([
      new THREE.Vector2(-w0 / 2, 0),
      new THREE.Vector2(w0 / 2, 0),
      new THREE.Vector2(w1 / 2, L),
      new THREE.Vector2(-w1 / 2, L),
    ]);
    const plate = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.cell);
    plate.rotation.x = Math.PI / 2;
    plate.position.y = 0.004;
    add(pt, plate);
    for (let s = 1; s < 6; s++) {
      const t = s / 6;
      const w = w0 + (w1 - w0) * t;
      box(pt, M.cellLite, w * 0.92, 0.003, 0.008, 0, 0.006, L * t);
    }
    for (const sd of [-1, 1]) {
      beam(pt, M.alu, V(sd * (w0 / 2), 0.012, 0), V(sd * (w1 / 2), 0.012, L), 0.03, 0.03);
      beam(
        pt,
        M.gold,
        V(sd * (w0 / 2 - 0.03), 0.008, 0.02),
        V(sd * (w1 / 2 - 0.02), 0.008, L - 0.02),
        0.012,
        0.012,
      );
    }
    beam(pt, M.alu, V(-w1 / 2, 0.012, L), V(w1 / 2, 0.012, L), 0.03, 0.03);
    beam(pt, M.alu, V(-w0 / 2, 0.012, 0), V(w0 / 2, 0.012, 0), 0.04, 0.04);
  }
  // Egress ramps: two gold-copper panels in silver frames either side of the front petal.
  for (const sd of [-1, 1]) {
    const a0 = V(sd * 0.36, BY + 0.03, 0.8);
    const b0 = V(sd * 1.45, 0.012, 1.15);
    const r = beam(g, M.gold, a0, b0, 0.42, 0.015);
    r.name = 'ramp';
    beam(g, M.alu, a0.clone().add(V(sd * 0.0, 0, 0.21)), b0.clone().add(V(0, 0, 0.21)), 0.03, 0.03);
    beam(g, M.alu, a0.clone().add(V(0, 0, -0.21)), b0.clone().add(V(0, 0, -0.21)), 0.03, 0.03);
  }
  // Deflated airbags: heaps of beige fabric bunched around the petals.
  const heaps: [number, number, number, number, number][] = [
    [-1.25, -0.2, 0.45, 0.07, 0.3],
    [-0.55, -0.95, 0.5, 0.09, 0.3],
    [0.55, -0.95, 0.5, 0.08, 0.3],
    [1.25, -0.2, 0.45, 0.07, 0.3],
    [-0.95, 0.55, 0.4, 0.07, 0.3],
    [0.3, -1.45, 0.45, 0.06, 0.3],
    [-0.3, -0.45, 0.45, 0.06, 0.3],
  ];
  for (const [x, z, r, h, amp] of heaps) {
    const m = new THREE.Mesh(crinkle(new THREE.SphereGeometry(1, 16, 10), amp * 0.5), bag);
    m.scale.set(r, h, r * 0.8);
    m.position.set(x, h * 0.5, z);
    m.rotation.y = x * 3;
    add(g, m);
  }
  // IMP: a lattice tower with the stereo camera head; the HGA and the MET mast with windsocks.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  const top = BY + 0.62;
  lattice(mast, M.alu, V(-0.02, top, -0.1), 0.83, 0.1, 0.06, 7);
  box(mast, M.white, 0.2, 0.1, 0.1, -0.02, top + 0.88, -0.1);
  for (const dx of [-0.05, 0.05]) {
    cyl(mast, M.glass, 0.022, 0.022, 0.04, dx - 0.02, top + 0.88, -0.03, 10).rotation.x =
      Math.PI / 2;
  }
  const hga = dish(mat(0x6d2f2a, 0.3, 0.6), M.black, 0.13);
  hga.position.set(0.17, top + 0.2, -0.08);
  hga.rotation.set(0.5, 0.3, 0);
  add(mast, hga);
  strut(mast, M.alu, V(0.17, top, -0.08), V(0.17, top + 0.2, -0.08), 0.012, 6);
  strut(mast, M.silver, V(0.32, top - 0.1, 0.05), V(0.32, top + 0.4, 0.05), 0.007, 4);
  for (const y of [top - 0.1 + 0.08, top - 0.1 + 0.25, top - 0.1 + 0.48]) {
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.07, 8, 1, true), M.white);
    sock.rotation.z = Math.PI / 2;
    sock.position.set(0.35, y, 0.05);
    add(mast, sock);
  }
  return finish(g, PATHFINDER_H);
}

/** Sojourner: six wheels on a rocker-bogie, the dark solar panel across the top, the whip antenna. */
export function buildSojourner(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const WR = 0.065;
  const WW = 0.045;
  const TX = 0.22;
  const WZ = [0.23, 0.0, -0.23];
  // Wheels: aluminium rim with stainless cleats, a dished hub.
  for (const s of [-1, 1])
    for (const z of WZ) {
      const w = add(g, new THREE.Group());
      w.position.set(s * TX, WR, z);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WW, 24, 1, false), M.alu);
      rim.rotation.z = Math.PI / 2;
      add(w, rim);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        const c = box(
          w,
          M.aluDark,
          WW,
          0.008,
          0.012,
          0,
          Math.cos(a) * (WR + 0.003),
          Math.sin(a) * (WR + 0.003),
        );
        c.rotation.x = a;
      }
      const disc = new THREE.Mesh(new THREE.CircleGeometry(WR * 0.95, 20), M.aluDark);
      disc.rotation.y = (s * Math.PI) / 2;
      disc.position.x = s * (WW / 2);
      add(w, disc);
      cyl(w, M.dark, 0.022, 0.022, 0.06, s * 0.025, 0, 0, 10).rotation.z = Math.PI / 2;
      strut(
        g,
        M.aluDark,
        V(s * (TX - WW / 2 - 0.01), WR, z),
        V(s * (TX - WW / 2 - 0.01), 0.16, z * 0.8),
        0.007,
        5,
      );
    }
  // Rocker and bogie on each side: titanium tubes from the body pivot to the three wheels.
  for (const s of [-1, 1]) {
    const x = s * (TX - WW / 2 - 0.01);
    const pivot = V(s * 0.16, 0.2, 0.04);
    const bogie = V(x, 0.15, -0.11);
    strut(g, M.aluDark, pivot, V(x, 0.16, WZ[0]), 0.012, 6);
    strut(g, M.aluDark, pivot, bogie, 0.012, 6);
    strut(g, M.aluDark, bogie, V(x, 0.16, WZ[1]), 0.01, 6);
    strut(g, M.aluDark, bogie, V(x, 0.16, WZ[2]), 0.01, 6);
    cyl(g, M.dark, 0.016, 0.016, 0.03, pivot.x, pivot.y, pivot.z, 10).rotation.z = Math.PI / 2;
  }
  // Body: the warm electronics box in gold-brown foil, a black belly, the dark panel on top.
  const body = add(
    g,
    new THREE.Mesh(crinkle(new THREE.BoxGeometry(0.3, 0.09, 0.44, 4, 2, 5), 0.006), M.gold),
  );
  body.position.set(0, 0.165, 0);
  box(g, M.black, 0.3, 0.012, 0.42, 0, 0.12, 0);
  box(g, M.cell, 0.44, 0.012, 0.6, 0, 0.215, 0.0);
  box(g, M.white, 0.44, 0.014, 0.012, 0, 0.214, 0.3);
  box(g, M.white, 0.44, 0.014, 0.012, 0, 0.214, -0.3);
  for (const sd of [-1, 1]) box(g, M.white, 0.012, 0.014, 0.6, sd * 0.22, 0.214, 0);
  for (let r = 1; r < 8; r++) box(g, M.cellLite, 0.42, 0.003, 0.004, 0, 0.222, -0.3 + r * 0.075);
  // Front: the stereo camera pair and the two laser stripe projectors; rear: the APXS drum.
  for (const x of [-0.07, 0.07]) {
    cyl(g, M.alu, 0.02, 0.02, 0.04, x, 0.17, 0.235, 12).rotation.x = Math.PI / 2;
    cyl(g, M.glass, 0.016, 0.016, 0.01, x, 0.17, 0.26, 12).rotation.x = Math.PI / 2;
  }
  for (const x of [-0.12, 0.12])
    cyl(g, M.black, 0.012, 0.012, 0.03, x, 0.145, 0.235, 8).rotation.x = Math.PI / 2;
  const apxs = cyl(g, M.silver, 0.04, 0.04, 0.05, 0, 0.16, -0.25, 18);
  apxs.rotation.x = Math.PI / 2;
  cyl(g, M.dark, 0.03, 0.03, 0.01, 0, 0.16, -0.278, 14).rotation.x = Math.PI / 2;
  // UHF whip antenna on the left rear, with its kink.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  strut(mast, M.silver, V(0.15, 0.215, -0.27), V(0.15, 0.25, -0.27), 0.006, 5);
  strut(mast, M.silver, V(0.15, 0.25, -0.27), V(0.16, 0.3, -0.27), 0.004, 4);
  return finish(g, SOJOURNER_H);
}

const R = (l: string, u: string): ShowcaseRef => ({ l, u });
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';

const VIKING_REFS: ShowcaseRef[] = [
  R(
    'NASA Science — Viking spacecraft: 2 m tall from footpads to the top of the S-band dish, 3 m at its widest',
    'https://science.nasa.gov/mission/viking/spacecraft-and-science',
  ),
  R(
    'Wikipedia — Viking program: hexagonal base with 1.09 / 0.56 m sides, 2.21 m footpad triangle, 18-nozzle engines, two RTGs, two cylinder cameras',
    'https://en.wikipedia.org/wiki/Viking_program',
  ),
  R(
    'Photo — Viking lander replica, Smithsonian NASM (white boxy body, tall RTG windscreens, gold engine pod, dish, grey leg bays)',
    COMMONS +
      "Viking_Mars_Lander_replica_on_display_in_the_Smithsonian's_Air_and_Space_museum_in_August_2015.jpg",
  ),
];
const SOVIET_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Mars 3: 1.2 m spherical landing capsule, four petals, four aerials, PrOP-M on skis on a 15 m umbilical',
    'https://en.wikipedia.org/wiki/Mars_3',
  ),
  R(
    'Photo — Mars 3 lander on display (white shell, curved petals open)',
    COMMONS + 'Mars3_lander2_vsm.jpg',
  ),
  R(
    'Scientific American — Skiing to Mars: the PrOP-M rovers',
    'https://www.scientificamerican.com/blog/life-unbounded/skiing-to-mars-the-original-rovers/',
  ),
];
const PHOENIX_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Phoenix: 5.5 m with arrays deployed, 1.5 m deck, about 2.2 m tall, 2.35 m arm, 1 m MET mast',
    'https://en.wikipedia.org/wiki/Phoenix_(spacecraft)',
  ),
  R(
    'Photo — Phoenix in assembly: octagonal deck, twelve-sided arrays',
    COMMONS + 'Phoenix_Mars_Lander_during_assembly_and_testing_(PIA09701).jpg',
  ),
  R('NASA render — Phoenix spacecraft model', COMMONS + 'Phoenix_spacecraft_model.png'),
];
const INSIGHT_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — InSight: 6.0 m wide with arrays, 1.56 m deck, 0.83-1.08 m deck height, 2.15 m arrays, 1.8 m arm',
    'https://en.wikipedia.org/wiki/InSight',
  ),
  R('NASA render — InSight on the surface, SEIS dome and HP3', COMMONS + 'InSight_Lander.jpg'),
  R('NASA — InSight final selfie', COMMONS + 'PIA25287-InSights_Final_Selfie_main.png'),
];
const SCHIA_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Schiaparelli EDM: 1.65 m lander, 2.4 m with the front shield, crushable structure, DREAMS',
    'https://en.wikipedia.org/wiki/Schiaparelli_EDM',
  ),
  R(
    'Photo — EDM model at ESOC (foil, tanks, platform, thrusters)',
    COMMONS + 'Schiaparelli_Lander_Model_at_ESOC.JPG',
  ),
  R(
    'Photo — EDM model, Le Bourget 2013',
    COMMONS + 'Maquette_EDM_salon_du_Bourget_2013_DSC_0192.JPG',
  ),
];
const BEAGLE_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Beagle 2: 1 m folded, 1.9 m unfolded, four disc solar arrays, 109 cm PAW arm',
    'https://en.wikipedia.org/wiki/Beagle_2',
  ),
  R(
    'Photo — Beagle 2 replica, opened (gold lid, four solar petals, base)',
    COMMONS + 'Beagle_2_replica.jpg',
  ),
  R('Photo — Beagle 2 at the Science Museum', COMMONS + 'Beagle_2_at_the_Science_Museum.jpg'),
];
const PATHFINDER_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Mars Pathfinder: tetrahedron lander, petals, two ramps, airbags, IMP, MET windsocks',
    'https://en.wikipedia.org/wiki/Mars_Pathfinder',
  ),
  R(
    'Photo — Pathfinder lander and Sojourner model, NASM Udvar-Hazy (white body, lattice IMP, ramps, bags)',
    COMMONS +
      'Model_of_the_Mars_Pathfinder_Lander_and_Sojourner_Rover_Taken_at_the_National_Air_and_Space_Museum_Steven_F._Udvar-Hazy_Center-_3732029393_4e641bbe00_o.jpg',
  ),
];
const SOJOURNER_REFS: ShowcaseRef[] = [
  R(
    'Wikipedia — Mars Pathfinder: Sojourner 65 cm long, 48 cm wide, 30 cm high',
    'https://en.wikipedia.org/wiki/Mars_Pathfinder',
  ),
  R(
    'Photo — Sojourner on Mars (dark panel, wheels, whip antenna)',
    COMMONS + 'Sojourner_on_Mars_PIA01122.jpg',
  ),
  R(
    'Photo — Sojourner rear, APXS and antenna',
    COMMONS + 'Back_of_Sojourner_and_its_Alpha_Proton_X-Ray_Spectrometer.png',
  ),
];

const SOVIET_EST =
  'no published landed height; the 1.2 m sphere stands on the petals with its aerials about a third of a sphere diameter above it, judged from the Mars 3 museum photo: 1.5 m';
const INSIGHT_EST =
  'no published overall height; the deck is 0.83-1.08 m high (Wikipedia), the UHF mast, camera and horn add about 0.5 m, so 1.7 m was judged from the NASA surface render';
const SCHIA_EST =
  'no published landed height; the lander module is 1.65 m across, the crushable base plus the tank and platform stack is about half a diameter: 0.8 m, judged from the ESA model photos';
const BEAGLE_EST =
  'no published opened height; the folded lander is 12 cm high, the opened arm elbow stands about 0.4 m: 0.45 m, judged from the Science Museum replica photo';
const MPL_EST =
  'no published height for Mars Polar Lander; drawn as the Phoenix deck-lander at 2.2 m (same design family, MET mast on top)';

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'viking-1': { build: buildVikingLander, heightM: VIKING_H, diameterM: 1.7, refs: VIKING_REFS },
  'viking-2': { build: buildVikingLander, heightM: VIKING_H, diameterM: 1.7, refs: VIKING_REFS },
  'viking2-lander': {
    build: buildVikingLander,
    heightM: VIKING_H,
    diameterM: 1.7,
    refs: VIKING_REFS,
  },
  'mars-2': {
    build: buildSovietMarsLander,
    heightM: SOVIET_H,
    heightEstimate: SOVIET_EST,
    diameterM: 1.2,
    refs: SOVIET_REFS,
  },
  'mars-3': {
    build: buildSovietMarsLander,
    heightM: SOVIET_H,
    heightEstimate: SOVIET_EST,
    diameterM: 1.2,
    refs: SOVIET_REFS,
  },
  mars6: {
    build: buildSovietMarsLander,
    heightM: SOVIET_H,
    heightEstimate: SOVIET_EST,
    diameterM: 1.2,
    refs: SOVIET_REFS,
  },
  phoenix: { build: buildPhoenix, heightM: PHOENIX_H, diameterM: 1.6, refs: PHOENIX_REFS },
  'mars-polar-lander': {
    build: buildPhoenix,
    heightM: PHOENIX_H,
    heightEstimate: MPL_EST,
    diameterM: 1.6,
    refs: PHOENIX_REFS,
  },
  insight: {
    build: buildInSight,
    heightM: INSIGHT_H,
    heightEstimate: INSIGHT_EST,
    diameterM: 1.56,
    refs: INSIGHT_REFS,
  },
  schiaparelli: {
    build: buildSchiaparelli,
    heightM: SCHIA_H,
    heightEstimate: SCHIA_EST,
    diameterM: 1.65,
    refs: SCHIA_REFS,
  },
  beagle2: {
    build: buildBeagle2,
    heightM: BEAGLE_H,
    heightEstimate: BEAGLE_EST,
    diameterM: 1.0,
    refs: BEAGLE_REFS,
  },
  sojourner: { build: buildSojourner, heightM: SOJOURNER_H, diameterM: 0.48, refs: SOJOURNER_REFS },
};

export { PATHFINDER_REFS };
