/**
 * Showcase models: the rovers after Curiosity (operator 2026-11-23, one central model per craft).
 * One builder per craft family: the Mars Exploration Rover (Spirit and Opportunity share it),
 * Perseverance, Zhurong, ExoMars Rosalind Franklin, and the Apollo Lunar Roving Vehicle.
 *
 * Every craft stands on its wheels (y = 0), front toward +z. Deployable and stowed parts are named
 * groups: 'mast' (stowed for entry), 'arm', 'solar-arrays' (userData.solarArray), and for
 * Perseverance 'ingenuity' (under the belly).
 *
 * What makes each read as itself, in order:
 * - MER: gold warm-electronics box under a flat blue-black solar deck with four wing panels, the
 *   Pancam mast with its camera bar behind the white Mini-TES tube, the round gold HGA dish on its
 *   stalk, the UHF stub, the arm's turret low at the front, six small wheels on the rocker-bogie.
 * - Perseverance: Curiosity's layout with straight-cleat wheels, the Mastcam-Z + SuperCam head,
 *   the large coring turret, the caching bay at the front belly and Ingenuity under it.
 * - Zhurong: a wide silver deck with four butterfly solar wings, the tall single mast with its
 *   camera box and the bronze cylinder beside it, two small dishes, ribbed wheels on tall legs.
 * - ExoMars: the lattice-like walking chassis with a wheel on every leg, two wide solar wings,
 *   the gold PanCam bar on its mast, the drill box on the front.
 * - LRV: the open aluminium frame, wire-mesh wheels with titanium chevrons under tan fenders, two
 *   tube seats, the T-handle in front of the black console, the umbrella dish, the camera and the
 *   whip on the front, the tool pallet at the back; the TV camera is the named anchor 'tv-camera'.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, beam, box, crinkle, dish, foilSheet, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
type Ms = Record<string, Mat>;

function palette(): Ms {
  return {
    white: mat(0xe9e5db, 0.5, 0.5),
    cream: mat(0xcfc6b0, 0.5, 0.6),
    deck: mat(0xb8ae9c, 0.5, 0.65),
    grey: mat(0x8a8d93, 0.5, 0.5),
    dark: mat(0x26282c, 0.5, 0.6),
    alu: mat(0xc3c6cb, 0.55, 0.38),
    aluDark: mat(0x8f9297, 0.55, 0.5),
    ti: mat(0xa3a6ab, 0.55, 0.42),
    gold: mat(0xc99a3a, 0.55, 0.4, true),
    rtg: mat(0x3a3c40, 0.5, 0.5),
    pv: mat(0x1b2748, 0.5, 0.3),
    amber: mat(0xa8702a, 0.55, 0.4, true),
    bronze: mat(0x8a5a36, 0.55, 0.45),
    silver: mat(0xd2d5da, 0.55, 0.35),
    glass: Object.assign(mat(0x020306, 0.05, 0.5), { envMapIntensity: 0.25 }),
  };
}

function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(heightM / (b.max.y - b.min.y));
  g.position.y = -b.min.y * g.scale.y;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

function cyl(
  g: THREE.Object3D,
  m: Mat,
  rt: number,
  rb: number,
  len: number,
  p: THREE.Vector3,
  axis: 'x' | 'y' | 'z' = 'y',
  seg = 16,
): THREE.Mesh {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, len, seg), m);
  if (axis === 'x') c.rotation.z = Math.PI / 2;
  else if (axis === 'z') c.rotation.x = Math.PI / 2;
  c.position.copy(p);
  return add(g, c);
}

/** A camera lens facing +z (or -z with s = -1): dark barrel, black glass. */
function lens(g: THREE.Object3D, M: Ms, r: number, x: number, y: number, z: number, s = 1): void {
  cyl(g, M.dark, r, r, 0.03, V(x, y, z), 'z', 14);
  const gl = add(g, new THREE.Mesh(new THREE.CircleGeometry(r * 0.7, 14), M.glass));
  gl.position.set(x, y, z + s * 0.016);
  if (s < 0) gl.rotation.y = Math.PI;
}

/** A flat solar panel w × d, aluminium frame and blue-black cells with their grid, top at +y. */
function panel(
  g: THREE.Object3D,
  M: Ms,
  w: number,
  d: number,
  nx: number,
  nz: number,
): THREE.Group {
  const p = new THREE.Group();
  box(p, M.alu, w, 0.02, d, 0, 0, 0);
  box(p, M.pv, w - 0.04, 0.008, d - 0.04, 0, 0.012, 0);
  for (let i = 1; i < nx; i++)
    box(p, M.alu, 0.004, 0.003, d - 0.04, -w / 2 + 0.02 + ((w - 0.04) * i) / nx, 0.017, 0);
  for (let i = 1; i < nz; i++)
    box(p, M.alu, w - 0.04, 0.003, 0.004, 0, 0.017, -d / 2 + 0.02 + ((d - 0.04) * i) / nz);
  return add(g, p);
}

/** A flat plate from an outline in (x, z), top at y, thickness t. */
function plate(
  g: THREE.Object3D,
  m: Mat,
  pts: [number, number][],
  y: number,
  t: number,
  k = 1,
): THREE.Mesh {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x * k, z * k)));
  const mesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false }),
    m,
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  return add(g, mesh);
}

interface WheelSpec {
  r: number;
  w: number;
  n: number;
  kind: 'chevron' | 'straight' | 'rib';
  face: Mat;
  tread: Mat;
  spokes: number;
}

/** A rover wheel, axis along x, the outer face toward `side`: rim with cleats, face, spokes, hub. */
function wheel(M: Ms, S: WheelSpec, side: number): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(S.r, S.r, S.w, 40, 1, true), S.tread);
  rim.rotation.z = Math.PI / 2;
  add(g, rim);
  const cH = S.r * (S.kind === 'rib' ? 0.04 : 0.08);
  const cT = ((2 * Math.PI * S.r) / S.n) * (S.kind === 'rib' ? 0.3 : 0.45);
  for (let i = 0; i < S.n; i++) {
    const a = (i / S.n) * Math.PI * 2;
    const rr = S.r + cH * 0.4;
    const place = (c: THREE.Mesh, x: number, yaw: number): void => {
      c.position.set(x, Math.cos(a) * rr, Math.sin(a) * rr);
      c.rotation.set(a, yaw, 0);
    };
    if (S.kind === 'chevron') {
      for (const s of [-1, 1])
        place(box(g, S.tread, S.w * 0.46, cH, cT, 0, 0, 0), (s * S.w) / 4, s * 0.35);
    } else {
      place(box(g, S.tread, S.w * 0.98, cH, cT, 0, 0, 0), 0, 0);
    }
  }
  const hubR = S.r * 0.28;
  const xo = side * (S.w / 2 - 0.012);
  const face = new THREE.Mesh(new THREE.RingGeometry(hubR, S.r * 0.94, 36), S.face);
  face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  face.position.x = xo;
  add(g, face);
  const back = new THREE.Mesh(new THREE.CircleGeometry(S.r * 0.94, 36), M.dark);
  back.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  back.position.x = -xo;
  add(g, back);
  const k = S.r / 0.25;
  for (let i = 0; i < S.spokes; i++) {
    const a = (i / S.spokes) * Math.PI * 2;
    const a2 = a + 0.5;
    beam(
      g,
      M.ti,
      V(xo + side * 0.004, Math.cos(a) * hubR, Math.sin(a) * hubR),
      V(xo + side * 0.004, Math.cos(a2) * S.r * 0.88, Math.sin(a2) * S.r * 0.88),
      0.012 * k,
      0.04 * k,
    );
  }
  cyl(g, M.dark, hubR * 1.05, hubR * 1.05, S.w * 0.2, V(side * (S.w / 2 - 0.005), 0, 0), 'x', 20);
  return g;
}

interface RB {
  track: number;
  legInset: number;
  zs: [number, number, number];
  pivot: THREE.Vector3;
  frontTop: number;
  bogie: [number, number];
  midTop: number;
  rearTop: number;
  rk: [number, number];
  bg: [number, number];
  leg: number;
  wheel: WheelSpec;
  actuators: boolean;
  diff: { y: number; z: number; half: number; bar: number };
}

/** The rocker-bogie of the MER and MSL family: rocker to the front wheel and to the bogie, which
 *  carries the middle and rear wheels; the differential bar across the deck. */
function rockerBogie(g: THREE.Group, M: Ms, P: RB): void {
  const r = P.wheel.r;
  for (const s of [-1, 1]) {
    const legX = s * (P.track - P.wheel.w / 2 - P.legInset);
    const pivot = V(s * P.pivot.x, P.pivot.y, P.pivot.z);
    const frontTop = V(legX, P.frontTop, P.zs[0]);
    const bogiePivot = V(legX, P.bogie[0], P.bogie[1]);
    const midTop = V(legX, P.midTop, P.zs[1]);
    const rearTop = V(legX, P.rearTop, P.zs[2]);
    beam(g, M.ti, pivot, frontTop, P.rk[0], P.rk[1]);
    beam(g, M.ti, pivot, bogiePivot, P.rk[0], P.rk[1]);
    cyl(g, M.dark, P.rk[1] * 0.7, P.rk[1] * 0.7, P.rk[0] * 1.7, pivot, 'x');
    beam(g, M.ti, bogiePivot, midTop, P.bg[0], P.bg[1]);
    beam(g, M.ti, bogiePivot, rearTop, P.bg[0], P.bg[1]);
    cyl(g, M.dark, P.bg[1] * 0.65, P.bg[1] * 0.65, P.bg[0] * 1.6, bogiePivot, 'x');
    for (const [i, top] of [frontTop, midTop, rearTop].entries()) {
      const hub = V(legX, r, P.zs[i]);
      strut(g, M.ti, top, hub, P.leg, 10);
      if (P.actuators && i !== 1)
        cyl(g, M.gold, P.leg * 1.7, P.leg * 1.7, P.leg * 3.4, top.clone().add(V(0, P.leg, 0)));
      const w = wheel(M, P.wheel, s);
      w.position.set(s * P.track, r, P.zs[i]);
      add(g, w);
    }
  }
  const { y, z, half, bar } = P.diff;
  beam(g, M.ti, V(-half, y, z), V(half, y, z), bar, bar);
  cyl(g, M.dark, bar, bar, bar * 1.6, V(0, y, z), 'y', 12);
  for (const s of [-1, 1])
    strut(g, M.ti, V(s * half, y, z), V(s * P.pivot.x, P.pivot.y, P.pivot.z), bar * 0.4, 6);
}

// ------------------------------------------------------------------------------------------
// Mars Exploration Rover: Spirit and Opportunity
// ------------------------------------------------------------------------------------------

function buildMer(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const wheelSpec: WheelSpec = {
    r: 0.13,
    w: 0.16,
    n: 26,
    kind: 'chevron',
    face: M.gold,
    tread: M.alu,
    spokes: 6,
  };
  rockerBogie(g, M, {
    track: 0.64,
    legInset: 0.05,
    zs: [0.5, -0.06, -0.56],
    pivot: V(0.4, 0.55, 0.02),
    frontTop: 0.42,
    bogie: [0.4, -0.3],
    midTop: 0.34,
    rearTop: 0.4,
    rk: [0.075, 0.1],
    bg: [0.065, 0.09],
    leg: 0.04,
    wheel: wheelSpec,
    actuators: true,
    diff: { y: 0.82, z: -0.62, half: 0.4, bar: 0.025 },
  });

  // Warm electronics box: gold foil on three sides, the structure under it.
  const web = add(
    g,
    new THREE.Mesh(crinkle(new THREE.BoxGeometry(0.72, 0.3, 1.0, 6, 3, 8), 0.01), M.gold),
  );
  web.position.set(0, 0.55, 0);
  // Crinkled foil on the box sides: gold and amber sheets, as the flight blankets were.
  for (const s of [-1, 1]) {
    const f = foilSheet(M.amber, 0.96, 0.26, 0.012);
    f.position.set(s * 0.364, 0.55, 0);
    f.rotation.y = s * (Math.PI / 2);
    add(g, f);
  }
  for (const [z, s] of [
    [0.505, 1],
    [-0.505, -1],
  ] as [number, number][]) {
    const f = foilSheet(M.amber, 0.68, 0.26, 0.012);
    f.position.set(0, 0.55, z);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
  }
  box(g, M.dark, 0.7, 0.03, 0.98, 0, 0.39, 0);
  for (const [z, s] of [
    [0.5, 1],
    [-0.5, -1],
  ] as [number, number][])
    for (const hx of [-0.26, -0.14, 0.14, 0.26]) {
      const c = box(g, M.dark, 0.08, 0.06, 0.05, hx, 0.45, z + s * 0.02);
      add(c, new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), M.glass)).position.z = s * 0.026;
      if (s < 0) c.rotation.y = Math.PI;
    }

  // Rover equipment deck: aluminium frame and the blue-black solar deck.
  const outline: [number, number][] = [
    [-0.5, 0.78],
    [0.5, 0.78],
    [0.72, 0.42],
    [0.72, -0.55],
    [0.46, -0.8],
    [-0.46, -0.8],
    [-0.72, -0.55],
    [-0.72, 0.42],
  ];
  plate(g, M.alu, outline, 0.72, 0.04);
  plate(g, M.pv, outline, 0.726, 0.012, 0.94);
  // Fine cell grid across the deck, clipped to its octagon.
  const k = 0.94;
  for (let i = -12; i <= 12; i++) {
    const x = i * 0.056;
    const ax = Math.abs(x);
    const zt = ax <= 0.5 ? 0.78 : 0.78 - (ax - 0.5) * (0.36 / 0.22);
    const zb = ax <= 0.46 ? -0.8 : -0.8 + (ax - 0.46) * (0.25 / 0.26);
    if (ax > 0.7) continue;
    box(g, M.alu, 0.003, 0.002, (zt - zb) * k, x * k, 0.7335, ((zt + zb) / 2) * k);
  }
  for (let j = -13; j <= 13; j++) {
    const z = j * 0.058;
    const hw =
      z > 0.42
        ? 0.72 - (z - 0.42) * (0.22 / 0.36)
        : z < -0.55
          ? 0.72 - (-0.55 - z) * (0.26 / 0.25)
          : 0.72;
    if (Math.abs(z) > 0.78) continue;
    box(g, M.alu, hw * 2 * k, 0.002, 0.003, 0, 0.7335, z * k);
  }
  // Rim ribs of the deck's frame.
  for (const s of [-1, 1]) box(g, M.alu, 0.03, 0.05, 1.0, s * 0.72, 0.7, -0.05);
  // Calibration sundial and the deck electronics.
  cyl(g, M.dark, 0.06, 0.06, 0.02, V(0.3, 0.745, -0.5));
  cyl(g, M.grey, 0.035, 0.035, 0.03, V(0.3, 0.752, -0.5));
  box(g, M.silver, 0.26, 0.06, 0.2, 0.3, 0.77, 0.0);
  box(g, M.gold, 0.16, 0.05, 0.16, -0.4, 0.765, -0.35);

  // Solar wings, four: two each side, flat beside the deck.
  const arrays = add(g, new THREE.Group());
  arrays.name = 'solar-arrays';
  arrays.userData.solarArray = true;
  for (const s of [-1, 1])
    for (const [z, d] of [
      [0.28, 0.68],
      [-0.4, 0.74],
    ] as [number, number][]) {
      const p = panel(arrays, M, 0.45, d, 8, 11);
      p.position.set(s * 0.96, 0.7, z);
      p.rotation.z = s * -0.05;
      box(arrays, M.alu, 0.04, 0.03, d * 0.9, s * 0.73, 0.71, z);
    }

  // Mini-TES periscope: the white tube along the deck's front, and the Pancam mast.
  const tes = cyl(g, M.white, 0.06, 0.06, 0.4, V(-0.07, 0.8, 0.32), 'x', 20);
  void tes;
  cyl(g, M.gold, 0.065, 0.065, 0.05, V(-0.3, 0.8, 0.32), 'x', 20);
  cyl(g, M.dark, 0.065, 0.065, 0.03, V(0.14, 0.8, 0.32), 'x', 20);
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  strut(mast, M.silver, V(0.14, 0.88, 0.32), V(0.14, 1.4, 0.32), 0.026, 14);
  box(mast, M.dark, 0.08, 0.08, 0.08, 0.14, 0.9, 0.32);
  const head = add(mast, new THREE.Group());
  head.position.set(0.14, 1.4, 0.32);
  box(head, M.dark, 0.38, 0.11, 0.1, 0, 0.055, 0);
  for (const hx of [-0.15, 0.15]) {
    cyl(head, M.silver, 0.034, 0.034, 0.03, V(hx, 0.055, 0.06), 'z', 18);
    lens(head, M, 0.026, hx, 0.055, 0.07);
  }
  for (const hx of [-0.06, 0.06]) {
    box(head, M.silver, 0.05, 0.05, 0.03, hx, 0.055, 0.06);
    lens(head, M, 0.015, hx, 0.055, 0.075);
  }
  box(head, M.gold, 0.1, 0.02, 0.1, 0, 0.11, 0);

  // High-gain antenna on its stalk at the rear left; UHF stub and the whip behind it.
  strut(g, M.silver, V(0.46, 0.74, -0.62), V(0.46, 0.98, -0.62), 0.02, 10);
  const hga = cyl(g, M.gold, 0.14, 0.14, 0.012, V(0.46, 1.02, -0.62), 'y', 32);
  hga.rotation.set(-0.5, 0, 0.12);
  cyl(g, M.grey, 0.04, 0.04, 0.34, V(-0.48, 0.91, -0.6), 'y', 14);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), M.grey)).position.set(
    -0.48,
    1.08,
    -0.6,
  );
  strut(g, M.silver, V(0.0, 0.74, -0.7), V(0.0, 1.22, -0.7), 0.006, 6);

  // Arm (IDD), stowed low at the front: the turret with its four tools.
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  const sh = V(-0.3, 0.56, 0.5);
  const el = V(-0.3, 0.46, 0.74);
  const wr = V(-0.1, 0.52, 0.82);
  cyl(arm, M.dark, 0.05, 0.05, 0.1, sh, 'x');
  beam(arm, M.grey, sh, el, 0.06, 0.06);
  cyl(arm, M.dark, 0.045, 0.045, 0.09, el, 'x');
  beam(arm, M.grey, el, wr, 0.05, 0.05);
  const tur = add(arm, new THREE.Group());
  tur.position.copy(wr).add(V(0, 0, 0.04));
  cyl(tur, M.dark, 0.1, 0.1, 0.05, V(0, 0, 0), 'z', 24);
  cyl(tur, M.alu, 0.04, 0.04, 0.1, V(0, 0.06, 0.05), 'z', 16);
  cyl(tur, M.ti, 0.03, 0.03, 0.09, V(-0.07, -0.04, 0.05), 'z', 14);
  box(tur, M.white, 0.07, 0.07, 0.09, 0.07, -0.04, 0.05);
  box(tur, M.dark, 0.06, 0.05, 0.08, 0.0, -0.08, 0.04);
  lens(tur, M, 0.014, 0.0, -0.08, 0.085);
  return finish(g, MER_HEIGHT_M);
}

export const MER_HEIGHT_M = 1.5;

// ------------------------------------------------------------------------------------------
// Perseverance: Curiosity's design (the approved builder, copied here) with the real differences
// ------------------------------------------------------------------------------------------

const PW_R = 0.26;
const PW_W = 0.4;
const P_TRACK = 1.1;
const P_WZ = [1.0, -0.05, -1.0];
const PB = { x: 0.6, y0: 0.66, y1: 1.1, z0: -0.78, z1: 0.75 };

/** Perseverance's wheel: thicker rim with lips, 48 straight cleats, the curved flexures. */
function pWheel(M: Ms, side: number): THREE.Group {
  const w = new THREE.Group();
  const black = mat(0x2b2d31, 0.5, 0.5);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(PW_R, PW_R, PW_W, 48, 1, true), black);
  rim.rotation.z = Math.PI / 2;
  add(w, rim);
  for (const s of [-1, 1]) {
    const lip = new THREE.Mesh(new THREE.TorusGeometry(PW_R - 0.004, 0.014, 6, 48), M.alu);
    lip.rotation.y = Math.PI / 2;
    lip.position.x = s * (PW_W / 2 - 0.008);
    add(w, lip);
  }
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const c = box(w, black, PW_W * 0.98, 0.022, 0.02, 0, 0, 0);
    c.position.set(0, Math.cos(a) * (PW_R + 0.007), Math.sin(a) * (PW_R + 0.007));
    c.rotation.set(a, 0, 0);
  }
  const inner = (side * PW_W) / 2;
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.06, PW_R, 32), M.aluDark);
  disc.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  disc.position.x = -inner * 0.6;
  add(w, disc);
  const back = new THREE.Mesh(new THREE.CircleGeometry(PW_R, 32), M.dark);
  back.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
  back.position.x = inner * 0.6;
  add(w, back);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const a2 = a + 0.5;
    beam(
      w,
      M.ti,
      V(inner, Math.cos(a) * 0.07, Math.sin(a) * 0.07),
      V(inner, Math.cos(a2) * (PW_R - 0.02), Math.sin(a2) * (PW_R - 0.02)),
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

function pSuspension(g: THREE.Group, M: Ms): void {
  for (const s of [-1, 1]) {
    const legX = s * (P_TRACK - PW_W / 2 - 0.08);
    const pivot = V(s * (PB.x + 0.06), 0.86, 0.1);
    const frontTop = V(legX, 0.66, P_WZ[0]);
    const bogiePivot = V(legX, 0.56, -0.5);
    const midTop = V(legX, 0.5, P_WZ[1]);
    const rearTop = V(legX, 0.62, P_WZ[2]);
    beam(g, M.ti, pivot, frontTop, 0.07, 0.1);
    beam(g, M.ti, pivot, bogiePivot, 0.07, 0.1);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), M.dark)).position.copy(
      pivot,
    );
    beam(g, M.ti, bogiePivot, midTop, 0.06, 0.09);
    beam(g, M.ti, bogiePivot, rearTop, 0.06, 0.09);
    const bp = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), M.dark));
    bp.rotation.z = Math.PI / 2;
    bp.position.copy(bogiePivot);
    for (const [i, top] of [frontTop, midTop, rearTop].entries()) {
      const hub = V(legX, PW_R, P_WZ[i]);
      strut(g, M.ti, top, hub, 0.035, 10);
      if (i !== 1) {
        const act = add(
          g,
          new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16), M.gold),
        );
        act.position.copy(top).add(V(0, 0.04, 0));
      }
      const w = pWheel(M, s);
      w.position.set(s * P_TRACK, PW_R, P_WZ[i]);
      add(g, w);
    }
  }
  const dy = PB.y1 + 0.08;
  beam(g, M.ti, V(-0.62, dy, -0.25), V(0.62, dy, -0.25), 0.05, 0.05);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), M.dark)).position.set(
    0,
    dy,
    -0.25,
  );
  for (const s of [-1, 1])
    strut(g, M.ti, V(s * 0.62, dy, -0.25), V(s * (PB.x + 0.06), 0.86, 0.1), 0.018, 6);
}

function pBody(g: THREE.Group, M: Ms): void {
  const { x, y0, y1, z0, z1 } = PB;
  box(g, M.white, x * 2, y1 - y0, z1 - z0, 0, (y0 + y1) / 2, (z0 + z1) / 2);
  for (const s of [-1, 1]) {
    const p = foilSheet(M.grey, z1 - z0 - 0.2, y1 - y0 - 0.12, 0.004);
    p.position.set(s * (x + 0.003), (y0 + y1) / 2, (z0 + z1) / 2);
    p.rotation.y = s * (Math.PI / 2);
    add(g, p);
  }
  box(g, M.grey, x * 2 - 0.08, 0.04, z1 - z0 - 0.08, 0, y0 - 0.02, (z0 + z1) / 2);
  box(g, M.deck, x * 2 + 0.04, 0.03, z1 - z0 + 0.04, 0, y1 + 0.015, (z0 + z1) / 2);

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
  // The sample caching bay across the front belly: a dark cavity, the carousel and its tubes.
  box(g, M.dark, 0.5, 0.2, 0.16, 0, y0 + 0.2, z1 + 0.04);
  const car = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 24), M.alu));
  car.rotation.x = Math.PI / 2;
  car.position.set(0, y0 + 0.2, z1 + 0.14);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const tb = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), M.grey));
    tb.rotation.x = Math.PI / 2;
    tb.position.set(Math.cos(a) * 0.06, y0 + 0.2 + Math.sin(a) * 0.06, z1 + 0.16);
  }

  // Deck: MEDA sensors, the calibration targets, the heat-exchanger-free deck electronics.
  for (const [bx, bz, w, h, d, m] of [
    [0.25, 0.25, 0.32, 0.1, 0.3, M.grey],
    [-0.05, 0.05, 0.22, 0.07, 0.22, M.white],
    [0.38, -0.2, 0.18, 0.12, 0.16, M.gold],
    [0.1, 0.5, 0.2, 0.05, 0.12, M.grey],
  ] as [number, number, number, number, number, Mat][])
    box(g, m, w, h, d, bx, y1 + 0.03 + h / 2, bz);
  const cal = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), M.dark));
  cal.position.set(-0.05, y1 + 0.09, 0.3);

  // High-gain antenna: the hexagonal plate on its gimbal; UHF post.
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

function pMast(parent: THREE.Group, M: Ms): void {
  const g = add(parent, new THREE.Group());
  g.name = 'mast';
  const mx = -0.36;
  const mz = 0.5;
  const y0 = PB.y1;
  strut(g, M.white, V(mx, y0, mz), V(mx, 1.83, mz), 0.06, 18);
  box(g, M.grey, 0.14, 0.1, 0.14, mx, y0 + 0.06, mz);
  for (const a of [0.6, -2.2])
    beam(
      g,
      M.white,
      V(mx, 1.5, mz),
      V(mx + Math.sin(a) * 0.2, 1.5, mz + Math.cos(a) * 0.2),
      0.025,
      0.025,
    );
  const head = new THREE.Group();
  head.position.set(mx, 1.83, mz);
  add(g, head);
  // The bar: Mastcam-Z's two zoom boxes at the ends, the Navcam pair between them.
  box(head, M.grey, 0.46, 0.12, 0.18, 0, 0.06, 0);
  for (const hx of [-0.18, 0.18]) {
    box(head, M.white, 0.11, 0.13, 0.16, hx, 0.1, 0.03);
    const l = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.04, 16), M.dark));
    l.rotation.x = Math.PI / 2;
    l.position.set(hx, 0.1, 0.12);
    add(head, new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), M.glass)).position.set(
      hx,
      0.1,
      0.141,
    );
  }
  for (const hx of [-0.045, 0.045]) {
    box(head, M.dark, 0.05, 0.05, 0.05, hx, 0.06, 0.1);
    add(head, new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), M.glass)).position.set(
      hx,
      0.06,
      0.126,
    );
  }
  // SuperCam: the white telescope box on top with the big round aperture, gold-foil lid.
  box(head, M.white, 0.26, 0.2, 0.34, 0, 0.26, -0.02);
  const ap = add(head, new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), M.dark));
  ap.rotation.x = Math.PI / 2;
  ap.position.set(0, 0.26, 0.16);
  add(head, new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), M.glass)).position.set(
    0,
    0.26,
    0.176,
  );
  box(head, M.gold, 0.2, 0.03, 0.2, 0, 0.365, -0.04);
}

function pRtg(g: THREE.Group, M: Ms): void {
  const r = new THREE.Group();
  r.position.set(0, 0.98, PB.z0 - 0.3);
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
    hx.position.set(s * 0.45, 0.98, PB.z0 - 0.25);
    hx.rotation.set(-0.75, 0, s * 0.15);
  }
  for (const s of [-1, 1])
    strut(g, M.ti, V(s * 0.25, PB.y0 + 0.1, PB.z0), V(s * 0.18, 0.85, PB.z0 - 0.25), 0.02, 6);
}

function pArm(g: THREE.Group, M: Ms): void {
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  const shoulder = V(0.5, 0.86, PB.z1 + 0.05);
  const elbow = V(-0.45, 0.86, PB.z1 + 0.14);
  const wrist = V(0.05, 0.72, PB.z1 + 0.3);
  add(
    arm,
    new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 16), M.dark),
  ).position.copy(shoulder);
  beam(arm, M.white, shoulder, elbow, 0.09, 0.09);
  add(arm, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 16), M.dark)).position.copy(
    elbow,
  );
  beam(arm, M.white, elbow, wrist, 0.08, 0.08);
  const t = new THREE.Group();
  t.position.copy(wrist);
  add(arm, t);
  // The larger turret: the coring drill with its bit and stabiliser, SHERLOC/WATSON, PIXL, gDRT.
  add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 24), M.grey)).rotation.x =
    Math.PI / 2;
  const drill = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.34, 16), M.white));
  drill.position.set(0, -0.2, 0);
  add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.014, 0.1, 10), M.ti)).position.set(
    0,
    -0.42,
    0,
  );
  for (const s of [-1, 1]) {
    const st = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), M.dark));
    st.position.set(s * 0.09, -0.24, 0.1);
  }
  box(t, M.gold, 0.2, 0.14, 0.14, 0.2, 0.03, 0);
  const pixl = box(t, M.dark, 0.14, 0.12, 0.12, -0.2, -0.04, 0.03);
  add(pixl, new THREE.Mesh(new THREE.CircleGeometry(0.025, 12), M.glass)).position.z = 0.061;
  const gd = add(t, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 14), M.ti));
  gd.position.set(-0.13, 0.14, 0.03);
  box(t, M.grey, 0.06, 0.05, 0.1, 0.1, 0.16, 0);
}

/** Ingenuity as carried under the belly: rotor plane parallel to the belly, the solar panel
 *  facing the ground, the legs folded against the fuselage. */
function pIngenuity(g: THREE.Group, M: Ms): void {
  const h = add(g, new THREE.Group());
  h.name = 'ingenuity';
  const y = PB.y0 - 0.05;
  const z = 0.1;
  box(h, M.grey, 0.5, 0.03, 0.4, 0, y, z);
  box(h, M.gold, 0.14, 0.17, 0.2, 0, y - 0.12, z);
  for (const s of [-1, 1])
    for (const t of [-1, 1])
      strut(
        h,
        M.dark,
        V(s * 0.08, y - 0.04, z + t * 0.08),
        V(s * 0.1, y - 0.26, z + t * 0.09),
        0.008,
        6,
      );
  strut(h, M.dark, V(0, y - 0.2, z), V(0, y - 0.4, z), 0.014, 8);
  for (const dy of [-0.3, -0.34]) {
    box(h, M.rtg, 1.2, 0.016, 0.11, 0, y + dy, z);
    cyl(h, M.dark, 0.025, 0.025, 0.03, V(0, y + dy, z));
  }
  const sp = panel(h, M, 0.5, 0.2, 5, 2);
  sp.position.set(0, y - 0.42, z);
  sp.rotation.x = Math.PI;
}

function buildPerseverance(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  pSuspension(g, M);
  pBody(g, M);
  pMast(g, M);
  pRtg(g, M);
  pArm(g, M);
  pIngenuity(g, M);
  return finish(g, PERSEVERANCE_HEIGHT_M);
}

export const PERSEVERANCE_HEIGHT_M = 2.2;

// ------------------------------------------------------------------------------------------
// Zhurong
// ------------------------------------------------------------------------------------------

function buildZhurong(): THREE.Group {
  const M = palette();
  M.shell = mat(0xc9ced6, 0.5, 0.4);
  const g = new THREE.Group();
  const r = 0.16;
  const spec: WheelSpec = {
    r,
    w: 0.17,
    n: 44,
    kind: 'rib',
    face: M.alu,
    tread: M.silver,
    spokes: 8,
  };

  // Body: a silver skirt under a pale deck, rounded corners.
  const outline: [number, number][] = [
    [-0.46, 0.8],
    [0.46, 0.8],
    [0.68, 0.58],
    [0.68, -0.58],
    [0.46, -0.8],
    [-0.46, -0.8],
    [-0.68, -0.58],
    [-0.68, 0.58],
  ];
  plate(g, M.aluDark, outline, 0.62, 0.26, 0.96);
  // Panel lines on the deck and skirt, blanket patches, the instrument boxes on the deck.
  for (const x of [-0.45, 0, 0.45]) box(g, M.grey, 0.006, 0.004, 1.5, x, 0.682, 0);
  for (const z of [-0.5, 0.05, 0.6]) box(g, M.grey, 1.3, 0.004, 0.006, 0, 0.682, z);
  for (const s of [-1, 1]) {
    for (const z of [-0.45, 0.0, 0.45]) box(g, M.dark, 0.012, 0.2, 0.006, s * 0.667, 0.5, z);
    const bl = foilSheet(M.gold, 0.34, 0.16, 0.012);
    bl.position.set(s * 0.668, 0.5, -0.2);
    bl.rotation.y = s * (Math.PI / 2);
    add(g, bl);
  }
  for (const s of [-1, 1]) {
    const bl = foilSheet(M.gold, 0.5, 0.18, 0.012);
    bl.position.set(0, 0.5, s * 0.775);
    bl.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, bl);
  }
  box(g, M.grey, 0.22, 0.05, 0.16, 0.4, 0.72, 0.4);
  box(g, M.dark, 0.14, 0.04, 0.14, 0.4, 0.75, -0.1);
  cyl(g, M.dark, 0.05, 0.05, 0.05, V(0.1, 0.72, -0.4));
  box(g, M.silver, 0.2, 0.05, 0.12, -0.45, 0.72, -0.45);
  plate(g, M.shell, outline, 0.68, 0.06);
  for (const s of [-1, 1]) {
    box(g, M.silver, 0.01, 0.2, 1.1, s * 0.665, 0.5, 0.0);
    box(g, M.dark, 0.012, 0.04, 0.3, s * 0.668, 0.46, 0.5);
  }
  for (const z of [0.3, -0.35]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.006, 6, 40), M.grey);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.0, 0.685, z);
    add(g, ring);
  }
  // Rear hazcams and the front pair under the lip.
  for (const [z, s] of [
    [0.82, 1],
    [-0.82, -1],
  ] as [number, number][])
    for (const hx of [-0.14, 0.14]) {
      const c = box(g, M.dark, 0.06, 0.05, 0.05, hx, 0.55, z);
      add(c, new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), M.glass)).position.z = s * 0.026;
      if (s < 0) c.rotation.y = Math.PI;
    }

  // Six wheels, each on its own leg with an active suspension: a joint on the body skirt, the
  // arm out, the leg down to the hub.
  const track = 0.8;
  for (const s of [-1, 1])
    for (const zw of [0.78, 0.0, -0.78]) {
      const joint = V(s * 0.7, 0.5, zw * 0.86);
      const knee = V(s * (track - 0.05), 0.52, zw);
      const hub = V(s * (track - 0.1), r, zw);
      cyl(g, M.dark, 0.085, 0.085, 0.12, joint, 'x', 20);
      cyl(g, M.silver, 0.06, 0.06, 0.14, joint, 'x', 20);
      beam(g, M.silver, joint, knee, 0.09, 0.1);
      strut(g, M.silver, knee, hub, 0.05, 14);
      cyl(g, M.dark, 0.07, 0.07, 0.11, knee, 'x', 20);
      cyl(g, M.dark, 0.06, 0.06, 0.1, V(hub.x, hub.y + 0.02, hub.z), 'x', 20);
      strut(g, M.ti, V(s * 0.66, 0.38, zw * 0.86), V(s * (track - 0.08), 0.26, zw), 0.022, 8);
      box(g, M.gold, 0.1, 0.08, 0.14, s * 0.62, 0.4, zw * 0.86);
      const w = wheel(M, spec, s);
      w.position.set(s * track, r, zw);
      add(g, w);
    }

  // Four butterfly solar wings: raised a little at their outer edges.
  const arrays = add(g, new THREE.Group());
  arrays.name = 'solar-arrays';
  arrays.userData.solarArray = true;
  for (const s of [-1, 1])
    for (const [z, d] of [
      [0.5, 0.86],
      [-0.5, 0.86],
    ] as [number, number][]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.68, 0.7, z);
      pivot.rotation.z = s * 0.2;
      add(arrays, pivot);
      const p = panel(pivot, M, 0.86, d, 12, 10);
      p.position.x = s * 0.43;
      box(pivot, M.alu, 0.05, 0.04, d * 0.9, 0, 0, 0);
    }

  // The tall mast at the front: a square white tube, the camera box with the navigation cameras
  // and the multispectral camera.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  const mx = -0.28;
  const mz = 0.45;
  box(mast, M.grey, 0.16, 0.06, 0.16, mx, 0.72, mz);
  box(mast, M.white, 0.08, 1.0, 0.08, mx, 1.2, mz);
  box(mast, M.grey, 0.1, 0.05, 0.1, mx, 1.0, mz);
  box(mast, M.grey, 0.1, 0.05, 0.1, mx, 1.45, mz);
  const head = add(mast, new THREE.Group());
  head.position.set(mx, 1.78, mz);
  box(head, M.white, 0.34, 0.12, 0.12, 0, 0, 0);
  for (const hx of [-0.11, 0.11]) lens(head, M, 0.026, hx, 0.0, 0.07);
  for (const hx of [-0.03, 0.03]) lens(head, M, 0.014, hx, 0.0, 0.07);
  box(head, M.gold, 0.14, 0.03, 0.1, 0, 0.075, 0);
  cyl(head, M.grey, 0.02, 0.02, 0.1, V(0, -0.08, 0), 'y', 10);
  // The bronze cylinder beside the mast and the black hose up to the head.
  cyl(g, M.bronze, 0.075, 0.075, 0.22, V(-0.46, 0.82, 0.42), 'y', 24);
  cyl(g, M.dark, 0.09, 0.09, 0.03, V(-0.46, 0.715, 0.42), 'y', 24);
  const hose = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        V(-0.46, 0.92, 0.42),
        V(-0.36, 1.1, 0.5),
        V(-0.3, 1.4, 0.5),
        V(-0.26, 1.74, 0.46),
      ]),
      24,
      0.011,
      6,
    ),
    M.dark,
  );
  add(mast, hose);

  // Two dishes: the round one tilted at the deck's centre, the small one on its stalk at the rear.
  strut(g, M.silver, V(0.15, 0.7, 0.02), V(0.15, 0.82, 0.02), 0.02, 8);
  const d1 = cyl(g, M.white, 0.14, 0.14, 0.012, V(0.15, 0.88, 0.02), 'y', 30);
  d1.rotation.set(0.3, 0, 0.9);
  strut(g, M.silver, V(0.42, 0.7, -0.56), V(0.42, 1.1, -0.56), 0.016, 8);
  const d2 = dish(M.white, M.grey, 0.12);
  d2.position.set(0.42, 1.1, -0.56);
  d2.rotation.set(-0.7, 0, 0.2);
  add(g, d2);
  strut(g, M.silver, V(-0.1, 0.7, -0.55), V(-0.1, 1.0, -0.55), 0.008, 6);
  return finish(g, ZHURONG_HEIGHT_M);
}

export const ZHURONG_HEIGHT_M = 1.85;

// ------------------------------------------------------------------------------------------
// ExoMars Rosalind Franklin
// ------------------------------------------------------------------------------------------

function buildExoMars(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const r = 0.125;
  const spec: WheelSpec = {
    r,
    w: 0.1,
    n: 36,
    kind: 'rib',
    face: M.silver,
    tread: M.alu,
    spokes: 0,
  };
  const track = 0.72;

  // Chassis: a bogie beam per side for the two front wheels, a transverse rear bogie, each wheel
  // on its own walking leg with a motor housing at the top.
  const legTop = 0.38;
  const wheelsAt: [number, number][] = [
    [1, 0.7],
    [1, 0.22],
    [-1, 0.7],
    [-1, 0.22],
    [1, -0.62],
    [-1, -0.62],
  ];
  for (const [s, z] of wheelsAt) {
    const top = V(s * (track - 0.03), legTop, z);
    const hub = V(s * (track - 0.05), r, z);
    strut(g, M.alu, top, hub, 0.036, 12);
    box(g, M.dark, 0.09, 0.13, 0.11, top.x, top.y + 0.04, top.z);
    cyl(g, M.gold, 0.05, 0.05, 0.05, top.clone().add(V(-s * 0.08, 0.04, 0)), 'x', 14);
    cyl(g, M.dark, 0.04, 0.04, 0.12, V(hub.x, hub.y + 0.09, hub.z), 'x', 14);
    const w = wheel(M, spec, s);
    w.position.set(s * track, r, z);
    add(g, w);
  }
  for (const s of [-1, 1]) {
    const bx = s * (track - 0.03);
    beam(g, M.alu, V(bx, legTop, 0.7), V(bx, legTop, 0.22), 0.07, 0.1);
    // Pivot post up to the body at the bogie's middle.
    strut(g, M.alu, V(bx, legTop, 0.46), V(s * 0.5, 0.56, 0.46), 0.022, 8);
    cyl(g, M.dark, 0.045, 0.045, 0.08, V(bx, legTop, 0.46), 'x', 14);
  }
  beam(g, M.alu, V(-(track - 0.03), legTop, -0.62), V(track - 0.03, legTop, -0.62), 0.07, 0.1);
  strut(g, M.alu, V(0, legTop, -0.62), V(0, 0.55, -0.5), 0.03, 8);
  cyl(g, M.dark, 0.05, 0.05, 0.1, V(0, legTop, -0.62), 'x', 14);
  // Lattice tubes along the body.
  for (const s of [-1, 1]) {
    strut(g, M.alu, V(s * 0.5, 0.5, 0.5), V(s * 0.5, 0.5, -0.5), 0.016, 8);
    strut(g, M.alu, V(s * 0.5, 0.5, 0.5), V(s * 0.62, 0.38, 0.46), 0.014, 6);
  }

  // Body: a white thermal-blanket box with gold patches and a silver deck.
  box(g, M.white, 1.0, 0.44, 0.95, 0, 0.7, -0.05);
  box(g, M.gold, 0.9, 0.22, 0.02, 0, 0.62, -0.535);
  for (const s of [-1, 1]) box(g, M.gold, 0.02, 0.2, 0.6, s * 0.505, 0.68, -0.15);
  box(g, M.silver, 1.04, 0.03, 0.99, 0, 0.935, -0.05);
  // Panel lines, blanket sheets and instruments on the deck and flanks.
  for (const x of [-0.3, 0.3]) box(g, M.grey, 0.006, 0.004, 0.95, x, 0.952, -0.05);
  for (const z of [-0.35, 0.1]) box(g, M.grey, 1.0, 0.004, 0.006, 0, 0.952, z);
  for (const s of [-1, 1]) {
    for (const z of [-0.3, 0.1]) box(g, M.dark, 0.006, 0.4, 0.006, s * 0.503, 0.7, z);
    const bl = foilSheet(M.gold, 0.5, 0.2, 0.012);
    bl.position.set(s * 0.506, 0.78, 0.2);
    bl.rotation.y = s * (Math.PI / 2);
    add(g, bl);
  }
  const rb = foilSheet(M.white, 0.9, 0.38, 0.015);
  rb.position.set(0, 0.7, 0.425);
  add(g, rb);
  box(g, M.dark, 0.2, 0.06, 0.16, 0.3, 0.97, -0.3);
  box(g, M.grey, 0.16, 0.05, 0.12, 0.3, 0.97, 0.05);
  cyl(g, M.dark, 0.05, 0.05, 0.06, V(-0.1, 0.98, -0.35));
  for (const x of [-0.18, 0.18]) box(g, M.dark, 0.2, 0.1, 0.08, x, 0.55, -0.55);
  box(g, M.dark, 0.9, 0.02, 0.02, 0, 0.62, 0.43);
  for (const hx of [-0.3, -0.1, 0.1, 0.3]) {
    const c = box(g, M.dark, 0.06, 0.05, 0.05, hx, 0.52, 0.43);
    add(c, new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), M.glass)).position.z = 0.026;
  }

  // Two big solar wings, hinged along the deck's sides, each in two panels, opened flat.
  const arrays = add(g, new THREE.Group());
  arrays.name = 'solar-arrays';
  arrays.userData.solarArray = true;
  for (const s of [-1, 1]) {
    const inner = panel(arrays, M, 0.62, 0.95, 10, 12);
    inner.position.set(s * 0.83, 0.96, -0.05);
    inner.rotation.z = s * -0.04;
    const outer = panel(arrays, M, 0.62, 0.95, 10, 12);
    outer.position.set(s * 1.44, 0.96, -0.05);
    outer.rotation.z = s * -0.04;
    box(arrays, M.alu, 0.05, 0.03, 0.9, s * 0.53, 0.96, -0.05);
    box(arrays, M.alu, 0.04, 0.03, 0.9, s * 1.135, 0.96, -0.05);
  }

  // The PanCam mast and its gold camera bar.
  const mast = add(g, new THREE.Group());
  mast.name = 'mast';
  box(mast, M.dark, 0.14, 0.05, 0.14, 0, 0.97, 0.18);
  strut(mast, M.silver, V(0, 0.98, 0.18), V(0, 1.6, 0.18), 0.03, 14);
  const head = add(mast, new THREE.Group());
  head.position.set(0, 1.66, 0.18);
  box(head, M.dark, 0.06, 0.08, 0.06, 0, -0.04, 0);
  cyl(head, M.gold, 0.055, 0.055, 0.42, V(0, 0.04, 0), 'x', 20);
  for (const hx of [-0.15, 0.15]) lens(head, M, 0.02, hx, 0.04, 0.06);
  lens(head, M, 0.014, 0.0, 0.04, 0.06);
  cyl(head, M.dark, 0.02, 0.02, 0.03, V(-0.04, 0.04, 0.06), 'z', 12);

  // The drill box on the front: a tall aluminium housing with the drill tube bundle.
  const arm = add(g, new THREE.Group());
  arm.name = 'arm';
  box(arm, M.aluDark, 0.3, 0.5, 0.24, 0, 0.7, 0.66);
  box(arm, M.gold, 0.32, 0.05, 0.26, 0, 0.97, 0.66);
  cyl(arm, M.dark, 0.06, 0.06, 0.18, V(0, 0.52, 0.8), 'y', 16);
  cyl(arm, M.ti, 0.02, 0.016, 0.3, V(0, 0.28, 0.8), 'y', 10);
  box(arm, M.dark, 0.2, 0.12, 0.04, 0, 0.9, 0.8);

  // UHF helix antenna on the rear deck.
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts.push(V(Math.cos(t * Math.PI * 12) * 0.05, t * 0.3, Math.sin(t * Math.PI * 12) * 0.05));
  }
  const helix = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.005, 5),
    M.gold,
  );
  helix.position.set(-0.3, 0.95, -0.4);
  add(g, helix);
  cyl(g, M.grey, 0.04, 0.04, 0.04, V(-0.3, 0.955, -0.4));
  return finish(g, EXOMARS_HEIGHT_M);
}

export const EXOMARS_HEIGHT_M = 1.75;

// ------------------------------------------------------------------------------------------
// Apollo Lunar Roving Vehicle
// ------------------------------------------------------------------------------------------

/** The umbrella HGA: an open mesh of ribs and hoops, opening along +y, a feed on its axis. */
function lrvDish(M: Ms, r: number): THREE.Group {
  const g = new THREE.Group();
  const depth = r * 0.3;
  const mesh = mat(0xe6e8ea, 0.55, 0.35);
  const prof = (t: number): [number, number] => [r * t, depth * t * t];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    for (let k = 0; k < 6; k++) {
      const [r0, y0] = prof(k / 6);
      const [r1, y1] = prof((k + 1) / 6);
      strut(
        g,
        mesh,
        V(Math.cos(a) * r0, y0, Math.sin(a) * r0),
        V(Math.cos(a) * r1, y1, Math.sin(a) * r1),
        0.0035,
        4,
      );
    }
  }
  for (const t of [0.2, 0.4, 0.6, 0.8, 1]) {
    const [rr, yy] = prof(t);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0035, 4, 48), mesh);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yy;
    add(g, ring);
  }
  cyl(g, M.white, 0.03, 0.03, 0.06, V(0, 0.01, 0), 'y', 12);
  strut(g, M.alu, V(0, 0, 0), V(0, r * 0.55, 0), 0.006, 6);
  cyl(g, M.white, 0.02, 0.012, 0.05, V(0, r * 0.55, 0), 'y', 10);
  return g;
}

function lrvWheel(M: Ms, side: number): THREE.Group {
  const g = new THREE.Group();
  const R = 0.41;
  const W = 0.23;
  const wire = mat(0xb9bdc2, 0.55, 0.45);
  for (let i = 0; i < 9; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.004, 0.0035, 5, 64), wire);
    t.rotation.y = Math.PI / 2;
    t.position.x = -W / 2 + (W * i) / 8;
    add(g, t);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    cyl(
      g,
      wire,
      0.0035,
      0.0035,
      W,
      V(0, Math.cos(a) * (R - 0.004), Math.sin(a) * (R - 0.004)),
      'x',
      4,
    );
  }
  for (let i = 0; i < 36; i++) {
    const a = ((i + 0.5) / 36) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const c = box(g, M.aluDark, W * 0.5, 0.012, 0.03, (s * W) / 4, 0, 0);
      c.position.set((s * W) / 4, Math.cos(a) * (R + 0.002), Math.sin(a) * (R + 0.002));
      c.rotation.set(a, s * 0.5, 0);
    }
  }
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 6, 40), M.alu);
  hoop.rotation.y = Math.PI / 2;
  add(g, hoop);
  const dm = Object.assign(mat(0xc3c6cb, 0.55, 0.38), { side: THREE.DoubleSide });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.12, 0.06, 28, 1, true), dm);
  disc.rotation.z = (side * Math.PI) / 2;
  disc.position.x = side * 0.04;
  add(g, disc);
  cyl(g, M.dark, 0.09, 0.09, 0.14, V(0, 0, 0), 'x', 20);
  cyl(g, M.alu, 0.05, 0.05, 0.05, V(side * 0.08, 0, 0), 'x', 14);
  return g;
}

/** A strap seat: a tube frame with woven webbing strips across the pan and the back. */
function lrvSeat(g: THREE.Group, M: Ms, x: number, y: number): void {
  const tube = 0.0125;
  const hw = 0.19;
  const P = (a: number, b: number, c: number): THREE.Vector3 => V(x + a, y + b, c);
  for (const t of [-1, 1]) {
    strut(g, M.alu, P(t * hw, 0, -0.38), P(t * hw, 0.14, -0.38), tube, 6);
    strut(g, M.alu, P(t * hw, 0.14, -0.38), P(t * hw, 0.14, -0.02), tube, 6);
    strut(g, M.alu, P(t * hw, 0.14, -0.02), P(t * hw, 0.0, 0.0), tube, 6);
    strut(g, M.alu, P(t * hw, 0.14, -0.38), P(t * hw, 0.6, -0.44), tube, 6);
    strut(g, M.alu, P(t * hw, 0.3, -0.41), P(t * hw, 0.3, -0.12), tube * 0.8, 6);
  }
  strut(g, M.alu, P(-hw, 0.6, -0.44), P(hw, 0.6, -0.44), tube, 6);
  strut(g, M.alu, P(-hw, 0.14, -0.02), P(hw, 0.14, -0.02), tube, 6);
  for (let i = 0; i < 8; i++) {
    const xx = -hw + 0.02 + ((hw * 2 - 0.04) * i) / 7;
    box(g, M.webbing, 0.03, 0.006, 0.36, x + xx, y + 0.15, -0.2);
    const b = box(g, M.webbing, 0.03, 0.44, 0.006, x + xx, y + 0.39, -0.415);
    b.rotation.x = -0.12;
  }
  for (let j = 0; j < 7; j++) box(g, M.seat, 0.38, 0.006, 0.02, x, y + 0.153, -0.36 + j * 0.055);
  const foot = box(g, M.alu, 0.36, 0.012, 0.26, x, y + 0.04, 0.3);
  foot.rotation.x = 0.35;
  box(g, M.webbing, 0.3, 0.02, 0.04, x, y + 0.1, 0.38);
}

function buildLrv(): THREE.Group {
  const M = palette();
  M.fender = Object.assign(mat(0xd49a5c, 0.5, 0.55), { side: THREE.DoubleSide });
  M.seat = mat(0xcfc7b3, 0.5, 0.8);
  M.webbing = mat(0xe3dfd0, 0.5, 0.8);
  const g = new THREE.Group();
  const R = 0.41;
  const HX = 0.915;
  const HZ = 1.15;
  const railY = 0.52;
  const T = 0.0125;

  for (const s of [-1, 1]) {
    strut(g, M.alu, V(s * 0.5, railY, -1.5), V(s * 0.5, railY, 1.5), T, 8);
    strut(g, M.alu, V(s * 0.5, railY - 0.1, -1.4), V(s * 0.5, railY - 0.1, 1.4), T, 8);
    for (const z of [-1.4, -0.75, 0.0, 0.7, 1.4])
      strut(g, M.alu, V(s * 0.5, railY - 0.1, z), V(s * 0.5, railY, z + 0.1), 0.008, 6);
  }
  for (const z of [-1.5, -1.15, -0.75, -0.35, 0.15, 0.7, 1.15, 1.5])
    strut(g, M.alu, V(-0.5, railY, z), V(0.5, railY, z), T, 8);
  for (const z of [-0.6, -0.1, 0.4])
    strut(g, M.alu, V(-0.5, railY - 0.1, z), V(0.5, railY - 0.1, z), 0.008, 6);
  box(g, M.aluDark, 0.9, 0.008, 1.3, 0, railY + 0.008, -0.05);
  box(g, M.alu, 0.9, 0.008, 0.2, 0, railY + 0.008, 0.8);

  for (const s of [-1, 1])
    for (const z of [HZ, -HZ]) {
      const hub = V(s * 0.82, R, z);
      strut(g, M.alu, V(s * 0.5, railY + 0.04, z - 0.14), V(s * 0.82, R + 0.14, z), 0.01, 8);
      strut(g, M.alu, V(s * 0.5, railY + 0.04, z + 0.14), V(s * 0.82, R + 0.14, z), 0.01, 8);
      strut(g, M.alu, V(s * 0.5, railY - 0.1, z - 0.12), V(s * 0.82, R - 0.06, z), 0.01, 8);
      strut(g, M.alu, V(s * 0.5, railY - 0.1, z + 0.12), V(s * 0.82, R - 0.06, z), 0.01, 8);
      strut(g, M.alu, V(s * 0.6, railY + 0.02, z), V(s * 0.82, R + 0.3, z), 0.008, 6);
      cyl(g, M.white, 0.075, 0.075, 0.18, hub.clone().add(V(-s * 0.04, 0, 0)), 'x', 20);
      const w = lrvWheel(M, s);
      w.position.set(s * HX, R, z);
      add(g, w);
      // The shaped fender: an arc over the wheel, flared tabs at its ends, two stays.
      const fr = R + 0.04;
      const f = new THREE.Mesh(
        new THREE.CylinderGeometry(fr, fr, 0.28, 32, 1, true, Math.PI / 2 - 1.0, 2.0),
        M.fender,
      );
      f.rotation.z = Math.PI / 2;
      f.position.set(s * HX, R, z);
      add(g, f);
      for (const e of [-1, 1]) {
        const ang = Math.PI / 2 - e * 1.0;
        const tab = box(g, M.fender, 0.28, 0.008, 0.1, 0, 0, 0);
        tab.position.set(s * HX, R + Math.sin(ang) * fr - 0.012, z + Math.cos(ang) * fr + e * 0.02);
        tab.rotation.x = -e * 0.75;
        void tab;
      }
      for (const e of [-1, 1])
        strut(
          g,
          M.alu,
          V(s * HX - s * 0.1, R + fr * 0.97, z + e * 0.12),
          V(s * 0.55, railY + 0.03, z + e * 0.14),
          0.007,
          5,
        );
    }

  lrvSeat(g, M, -0.28, railY);
  lrvSeat(g, M, 0.28, railY);

  // Control post: black console with gold top, the T-handle ahead of the seats.
  box(g, M.dark, 0.34, 0.32, 0.1, 0.0, railY + 0.32, 0.62);
  box(g, M.gold, 0.34, 0.03, 0.12, 0.0, railY + 0.495, 0.62);
  box(g, M.white, 0.14, 0.09, 0.08, -0.26, railY + 0.4, 0.62);
  for (const [hx, hy, k] of [
    [-0.09, 0.4, 0.07],
    [0.09, 0.4, 0.05],
  ])
    cyl(g, M.grey, k, k, 0.015, V(hx, railY + hy, 0.675), 'z', 20);
  strut(g, M.white, V(0, railY + 0.02, 0.36), V(0, railY + 0.27, 0.32), 0.018, 8);
  cyl(g, M.white, 0.016, 0.016, 0.32, V(0, railY + 0.285, 0.32), 'x', 10);
  for (const s of [-1, 1])
    cyl(g, M.white, 0.028, 0.028, 0.1, V(s * 0.17, railY + 0.285, 0.32), 'x', 12);

  // Front: the LCRU box with its silver lid and gold sides, two small battery boxes beside it.
  box(g, M.white, 0.5, 0.2, 0.36, 0, railY + 0.12, 1.14);
  box(g, M.silver, 0.46, 0.02, 0.32, 0, railY + 0.23, 1.14);
  for (const s of [-1, 1]) {
    box(g, M.gold, 0.012, 0.16, 0.3, s * 0.256, railY + 0.12, 1.14);
    box(g, M.white, 0.16, 0.12, 0.3, s * 0.4, railY + 0.1, 1.12);
    box(g, M.gold, 0.14, 0.015, 0.26, s * 0.4, railY + 0.165, 1.12);
  }
  // LCRU's own small antenna on its lid.
  strut(g, M.alu, V(0.15, railY + 0.24, 1.2), V(0.15, railY + 0.5, 1.2), 0.005, 6);
  const cam = new THREE.Group();
  // The TV camera of the ground-commanded television assembly (GCTA) that filmed the Apollo 15-17
  // liftoffs: the group origin is its pan/tilt pivot, the lens looks along +z.
  cam.name = 'tv-camera';
  cam.position.set(-0.22, railY + 0.5, 1.4);
  add(g, cam);
  strut(g, M.alu, V(-0.22, railY, 1.4), V(-0.22, railY + 0.44, 1.4), T, 8);
  box(cam, M.gold, 0.22, 0.13, 0.2, 0, 0.06, 0);
  box(cam, M.white, 0.1, 0.1, 0.08, 0, 0.06, 0.14);
  lens(cam, M, 0.035, 0, 0.06, 0.19);
  strut(g, M.alu, V(-0.55, railY + 0.02, 1.05), V(-0.55, 1.08, 1.05), 0.005, 6);
  cyl(g, M.white, 0.05, 0.03, 0.12, V(-0.55, railY + 0.1, 1.05), 'y', 12);
  // The umbrella dish on its mast at the front left (+x), tilted up and back toward Earth.
  strut(g, M.alu, V(0.34, railY + 0.02, 0.86), V(0.34, 0.76, 0.86), T, 8);
  const hga = lrvDish(M, 0.45);
  hga.position.set(0.34, 0.76, 0.86);
  hga.rotation.set(-0.7, 0, 0);
  add(g, hga);

  box(g, M.alu, 0.92, 0.012, 0.5, 0, railY + 0.03, -1.3);
  box(g, M.gold, 0.28, 0.22, 0.3, -0.28, railY + 0.15, -1.3);
  box(g, M.white, 0.28, 0.16, 0.3, 0.05, railY + 0.12, -1.3);
  box(g, M.cream, 0.18, 0.1, 0.22, 0.32, railY + 0.09, -1.28);
  strut(g, M.alu, V(0.4, railY + 0.03, -1.45), V(0.4, railY + 0.55, -1.45), 0.01, 8);
  strut(g, M.alu, V(0.28, railY + 0.5, -1.45), V(0.52, railY + 0.5, -1.45), 0.008, 6);
  return finish(g, LRV_HEIGHT_M);
}

export const LRV_HEIGHT_M = 1.14;

// ------------------------------------------------------------------------------------------

const REF_MER: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Mars Exploration Rover: "stand 1.5 m high, 2.3 m wide and 1.6 m long", six wheels, rocker-bogie',
    u: 'https://en.wikipedia.org/wiki/Mars_Exploration_Rover',
  },
  {
    l: 'Wikimedia Commons — MER-2 on its lander prelaunch (PIA04849): deck, WEB, Pancam mast, Mini-TES tube, HGA',
    u: 'https://commons.wikimedia.org/wiki/File:MER-2_On_Lander_Prelaunch_PIA04849.jpg',
  },
];

const REF_PERS: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Perseverance (rover): 2.9 x 2.7 x 2.2 m, wheels, MMRTG, Ingenuity',
    u: 'https://en.wikipedia.org/wiki/Perseverance_(rover)',
  },
  {
    l: 'Wikimedia Commons — Perseverance test rover (PIA23965): straight-cleat wheels, chassis',
    u: 'https://commons.wikimedia.org/wiki/File:Perseverance_Test_Rover_Moves_to_Mars_Yard_(PIA23965_fig1).jpg',
  },
  {
    l: 'Wikimedia Commons — Attaching the helicopter (PIA23372) and Ingenuity leaving the belly: how it rides under the rover',
    u: 'https://commons.wikimedia.org/wiki/File:PIA23372-16-BuildingMars2020Rover-AttachingHelicopter-20190828.jpg',
  },
];

const REF_ZHURONG: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Zhurong (rover): 2.6 x 3 x 1.85 m, six wheels, four solar panels, mast',
    u: 'https://en.wikipedia.org/wiki/Zhurong_(rover)',
  },
  {
    l: 'Wikimedia Commons — Zhurong rover mockup at CSTM: deck, wings, mast, dishes, ribbed wheels',
    u: 'https://commons.wikimedia.org/wiki/File:Zhurong_rover_mockup_at_CSTM_01.jpg',
  },
];

const REF_EXO: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Rosalind Franklin (rover): 25 cm wheels, drill to 2 m, six wheels',
    u: 'https://en.wikipedia.org/wiki/Rosalind_Franklin_(rover)',
  },
  {
    l: 'Wikimedia Commons — ExoMars prototype rover: chassis, wheel legs, PanCam bar on its mast',
    u: 'https://commons.wikimedia.org/wiki/File:ExoMars_prototype_rover.jpg',
  },
];

const REF_LRV: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Lunar Roving Vehicle: 3.6 ft height, 7.5 ft wheelbase, wire-mesh wheels, TV camera on the front',
    u: 'https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle',
  },
  {
    l: 'Wikimedia Commons — Apollo 15 Lunar Roving Vehicle (museum article) and the LRV control console',
    u: 'https://commons.wikimedia.org/wiki/File:Apollo_15_Lunar_Roving_Vehicle.jpg',
  },
];

const MER_ESTIMATE =
  'Not in the fleet JSON. 1.5 m is the Pancam mast top, from Wikipedia "Mars Exploration Rover": ' +
  '"The rovers are six-wheeled, solar-powered robots that stand 1.5 m (4.9 ft) high, 2.3 m (7.5 ft) wide and 1.6 m (5.2 ft) long."';

export const SHOWCASE: Record<string, ShowcaseModel> = {
  spirit: {
    build: buildMer,
    heightM: MER_HEIGHT_M,
    heightEstimate: MER_ESTIMATE,
    diameterM: 1.6,
    refs: REF_MER,
  },
  opportunity: {
    build: buildMer,
    heightM: MER_HEIGHT_M,
    heightEstimate: MER_ESTIMATE,
    diameterM: 1.6,
    refs: REF_MER,
  },
  perseverance: {
    build: buildPerseverance,
    heightM: PERSEVERANCE_HEIGHT_M,
    heightEstimate:
      'Not in the fleet JSON. 2.2 m is the Wikipedia "Perseverance (rover)" infobox dimensions, 2.9 x 2.7 x 2.2 m (length x width x height).',
    diameterM: 2.7,
    refs: REF_PERS,
  },
  zhurong: {
    build: buildZhurong,
    heightM: ZHURONG_HEIGHT_M,
    heightEstimate:
      'Not in the fleet JSON. 1.85 m is the Wikipedia "Zhurong (rover)" infobox dimensions, 2.6 x 3 x 1.85 m (length x width x height).',
    diameterM: 1.4,
    refs: REF_ZHURONG,
  },
  'exomars-rosalind-franklin': {
    build: buildExoMars,
    heightM: EXOMARS_HEIGHT_M,
    heightEstimate:
      'No published height found. Judged from the ExoMars prototype photos: the PanCam head stands about 7 wheel diameters high, and the wheels are 25 cm (Wikipedia "Rosalind Franklin (rover)"), so about 1.75 m.',
    diameterM: 1.0,
    refs: REF_EXO,
  },
  'lrv-apollo': {
    build: buildLrv,
    heightM: LRV_HEIGHT_M,
    heightEstimate:
      'Not in the fleet JSON. 1.14 m is the Wikipedia "Lunar Roving Vehicle" infobox height, 3.6 ft; it is taken as the top of the dish, the highest part of the drawn model.',
    diameterM: 3.1,
    refs: REF_LRV,
  },
};
