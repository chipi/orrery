/**
 * Showcase models: the Western-built and Asian small lunar landers that followed Apollo —
 * Chandrayaan Vikram (-2 and -3, one builder with an option), the Pragyan rover that rides on it,
 * JAXA's SLIM, SpaceIL's Beresheet and Blue Origin's Blue Moon MK1. Same style as the Apollo LM and
 * Curiosity (operator 2026-11-23): real metres, crinkled foil where the craft wore it, struts,
 * tanks, nozzles, panels, footpads; base on y = 0, front toward +z.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, hash3, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function palette(): Record<string, Mat> {
  const lattice = mat(0xc4c7cc, 0.6, 0.4);
  lattice.wireframe = true;
  return {
    gold: mat(0xd2a23c, 0.55, 0.4, true),
    amber: mat(0xa8672a, 0.5, 0.45, true),
    goldPale: mat(0xe2bd62, 0.55, 0.38, true),
    silver: mat(0xcdd0d5, 0.55, 0.35, true),
    black: mat(0x18191c, 0.35, 0.65, true),
    dark: mat(0x2b2d31, 0.4, 0.7),
    steel: mat(0x9a9da3, 0.55, 0.4),
    alu: mat(0xb7bac0, 0.55, 0.4),
    white: mat(0xe6e4de, 0.2, 0.55),
    whiteMli: mat(0xe9e8e3, 0.3, 0.5, true),
    cell: mat(0x1d2c5e, 0.5, 0.35),
    cellLine: mat(0x8a93b0, 0.5, 0.5),
    bell: mat(0x3a3733, 0.6, 0.55, true),
    pad: mat(0xb7bac0, 0.55, 0.45),
    glass: Object.assign(mat(0x020306, 0.05, 0.5), { envMapIntensity: 0.25 }),
    tank: mat(0xc9ccd1, 0.55, 0.3),
    tankTi: mat(0x8d9096, 0.55, 0.35),
    lattice,
    wheel: mat(0xaeb2b8, 0.7, 0.35),
    cellPink: mat(0xe0808f, 0.4, 0.5),
    cellGold: mat(0x8a6c2a, 0.5, 0.4),
    copper: mat(0xb8672b, 0.65, 0.3),
    tankRed: mat(0x8a3a2a, 0.5, 0.35),
    gunmetal: mat(0x5b5f66, 0.55, 0.4),
    lra: mat(0x5a3d8f, 0.4, 0.4),
  };
}

/**
 * A crumpled blanket sheet of w × h metres, in the XY plane facing +z: a mesh cell about `cell`
 * metres, edges pinned flat so neighbours meet, interior nudged by up to `amp` (a low swell and
 * a per-vertex crinkle, as the foil lies on the Apollo LM).
 */
function foil(m: Mat, w: number, h: number, amp: number, seed = 0, cell = 0.09): THREE.Mesh {
  const nx = Math.min(36, Math.max(3, Math.round(w / cell)));
  const ny = Math.min(36, Math.max(3, Math.round(h / cell)));
  const geo = new THREE.PlaneGeometry(w, h, nx, ny);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const edge = Math.min(0.5 - Math.abs(x / w), 0.5 - Math.abs(y / h)) * Math.min(w, h);
    const taper = Math.min(1, edge / (cell * 0.8));
    const swell = Math.sin(x * 9 + seed * 3.1) * Math.sin(y * 7 + seed * 1.7);
    p.setZ(i, amp * taper * (0.7 * hash3(x, y, seed + w, 4) + 0.5 * swell));
  }
  const out = geo.toNonIndexed();
  out.computeVertexNormals();
  return new THREE.Mesh(out, m);
}

/**
 * A foil-wrapped box: dark core, four crumpled faces (+z, -z, +x, -x), black tape on the vertical
 * corners, and an optional contrasting patch of foil laid over each face.
 */
function wrapBox(
  g: THREE.Object3D,
  core: Mat,
  foils: [Mat, Mat, Mat, Mat],
  cx: number,
  cy: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  amp = 0.03,
  patch?: Mat,
  tape?: Mat,
): void {
  box(g, core, w - amp * 2.4, h - amp * 2.4, d - amp * 2.4, cx, cy, cz);
  const faces: [number, number, number, number][] = [
    [0, d / 2, 0, w], // +z
    [0, -d / 2, Math.PI, w], // -z
    [w / 2, 0, Math.PI / 2, d], // +x
    [-w / 2, 0, -Math.PI / 2, d], // -x
  ];
  faces.forEach(([fx, fz, yaw, fw], k) => {
    const s = foil(foils[k], fw, h, amp, k + 1);
    s.position.set(cx + fx, cy, cz + fz);
    s.rotation.y = yaw;
    add(g, s);
    if (patch) {
      const pw = fw * 0.42;
      const ph = h * 0.46;
      const px = hash3(k, fw, h, 9) * fw * 0.22;
      const py = hash3(k, fw, h, 10) * h * 0.18;
      const q = foil(patch, pw, ph, amp * 0.9, k + 11);
      q.position.set(px, py, amp * 1.6);
      s.add(q);
    }
    if (tape) {
      // A taped seam across the face at a third of its height.
      const t = foil(tape, fw, Math.max(0.012, h * 0.018), amp * 0.5, k + 21, 0.2);
      t.position.set(0, h * 0.18, amp * 1.4);
      s.add(t);
    }
  });
}

/** A solar panel: aluminium frame, dark blue cell field, cell and string lines, facing +z. */
function solarPanel(
  M: Record<string, Mat>,
  w: number,
  h: number,
  nx: number,
  ny: number,
): THREE.Group {
  const p = new THREE.Group();
  box(p, M.alu, w, h, 0.025, 0, 0, 0);
  box(p, M.cell, w - 0.06, h - 0.06, 0.012, 0, 0, 0.012);
  for (let i = 1; i < nx; i++)
    box(p, M.cellLine, 0.006, h - 0.06, 0.004, -w / 2 + (w * i) / nx, 0, 0.019);
  for (let j = 1; j < ny; j++)
    box(p, M.cellLine, w - 0.06, 0.006, 0.004, 0, -h / 2 + (h * j) / ny, 0.019);
  return p;
}

/** A rocket bell from throat (top, y0 + len) to exit (bottom, y0), axis y, at (x, z). */
function bell(
  g: THREE.Object3D,
  m: Mat,
  x: number,
  y0: number,
  z: number,
  rExit: number,
  len: number,
  rThroat = rExit * 0.3,
): void {
  const grp = new THREE.Group();
  grp.position.set(x, y0, z);
  lathe(
    grp,
    m,
    [
      [rExit, 0],
      [rExit * 0.86, len * 0.3],
      [rExit * 0.62, len * 0.62],
      [rThroat, len],
    ],
    28,
  );
  add(g, grp);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rExit, rExit * 0.05, 6, 28), m);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(x, y0, z);
  add(g, rim);
}

/** A small thruster: a cone nozzle at p opening along dir. */
function thruster(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  p: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
): void {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, r * 2, 10, 1, true), M.bell);
  c.position.copy(p).addScaledVector(dir, r);
  c.quaternion.setFromUnitVectors(V(0, -1, 0), dir.clone().normalize());
  add(g, c);
}

/** A dished footpad centred at (x, 0, z), radius r. */
function footpad(g: THREE.Object3D, M: Record<string, Mat>, x: number, z: number, r: number): void {
  const pad = new THREE.Group();
  pad.position.set(x, 0, z);
  lathe(
    pad,
    M.pad,
    [
      [0, 0],
      [r * 0.7, 0.01],
      [r, r * 0.16],
      [r * 0.94, r * 0.3],
    ],
    24,
  );
  add(g, pad);
}

/** Scale `g` so its Box3 is exactly `heightM` tall and rests on y = 0; returns the wrapping group. */
function stand(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(heightM / (b.max.y - b.min.y));
  g.position.y = -b.min.y * g.scale.y;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

// ─── Pragyan ────────────────────────────────────────────────────────────────

export const PRAGYAN_HEIGHT_M = 0.85;

/**
 * One Pragyan wheel, axis along x, rolling on y = 0: a closed aluminium drum with shallow chevron
 * cleats across the tread (not teeth), a raised rim disc and a dark hub on each side.
 */
function pragyanWheel(M: Record<string, Mat>, R: number, W: number): THREE.Group {
  const w = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 40, 1, false), M.wheel);
  drum.rotation.z = Math.PI / 2;
  add(w, drum);
  // Chevron grousers: two skewed strips meeting at the tread's centre line, every 15 degrees.
  for (let i = 0; i < 24; i++) {
    const c = new THREE.Group();
    c.rotation.x = (i / 24) * Math.PI * 2;
    for (const s of [-1, 1]) {
      const cl = box(c, M.steel, W * 0.52, 0.016, 0.01, s * W * 0.25, 0, R + 0.003);
      cl.rotation.z = -s * 0.45;
    }
    add(w, c);
  }
  for (const s of [-1, 1]) {
    const rimDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.008, 40),
      M.alu,
    );
    rimDisc.rotation.z = Math.PI / 2;
    rimDisc.position.x = s * (W / 2 + 0.002);
    add(w, rimDisc);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, 0.012, 32), M.dark);
    inner.rotation.z = Math.PI / 2;
    inner.position.x = s * (W / 2 + 0.006);
    add(w, inner);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 14), M.steel);
    hub.rotation.z = Math.PI / 2;
    hub.position.x = s * (W / 2 + 0.014);
    add(w, hub);
  }
  return w;
}

/** The raw Pragyan rover (about 0.9 × 0.75 × 0.85 m), wheels on y = 0, front toward +z. */
function pragyanRaw(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const WR = 0.1;
  const WW = 0.09;
  const TRK = 0.34;
  const wheelZ = [0.36, -0.1, -0.38];

  for (const s of [-1, 1]) {
    for (const z of wheelZ) {
      const w = pragyanWheel(M, WR, WW);
      w.position.set(s * TRK, WR, z);
      add(g, w);
    }
    // Rocker-bogie: the rocker runs from the front wheel up to the body pivot; the bogie hangs
    // from a joint behind the pivot and carries the middle and rear wheels.
    const ax = s * (TRK - WW / 2 - 0.012);
    const pivot = V(s * 0.255, 0.36, 0.08);
    const joint = V(s * 0.3, 0.27, -0.24);
    const front = V(ax, WR, wheelZ[0]);
    const mid = V(ax, WR, wheelZ[1]);
    const rear = V(ax, WR, wheelZ[2]);
    strut(g, M.alu, front, V(s * 0.3, 0.27, 0.22), 0.018, 8);
    strut(g, M.alu, V(s * 0.3, 0.27, 0.22), pivot, 0.022, 8);
    strut(g, M.alu, pivot, joint, 0.024, 8);
    strut(g, M.alu, joint, mid, 0.018, 8);
    strut(g, M.alu, joint, rear, 0.018, 8);
    box(g, M.dark, 0.06, 0.07, 0.07, s * 0.3, 0.27, joint.z);
    box(g, M.dark, 0.05, 0.08, 0.08, s * 0.27, 0.35, 0.08);
    // Wheel drive motors, dark, on each hub.
    for (const z of wheelZ) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 10), M.dark);
      m.rotation.z = Math.PI / 2;
      m.position.set(s * (TRK - WW / 2 - 0.03), WR, z);
      add(g, m);
    }
    // Steering/differential tie from the pivot to the body.
    strut(g, M.dark, V(s * 0.255, 0.36, 0.08), V(s * 0.19, 0.39, 0.08), 0.02, 8);
  }
  box(g, M.dark, 0.32, 0.02, 0.02, 0, 0.395, 0.08);

  // Body: the warm box under crumpled gold blanket, black tape seams, a silver patch, and the
  // lower black radiator strip.
  wrapBox(
    g,
    M.dark,
    [M.gold, M.goldPale, M.gold, M.amber],
    0,
    0.42,
    -0.03,
    0.46,
    0.26,
    0.66,
    0.012,
    M.silver,
    M.black,
  );
  // Solar panel on top, tilted forward on its rear posts, as the rover drove with it.
  const sp = solarPanel(M, 0.6, 0.78, 5, 8);
  sp.rotation.x = -Math.PI / 2 - 0.09;
  sp.position.set(0, 0.63, -0.03);
  add(g, sp);
  for (const s of [-1, 1]) {
    strut(g, M.alu, V(s * 0.24, 0.545, -0.28), V(s * 0.24, 0.6, -0.34), 0.012, 6);
    strut(g, M.alu, V(s * 0.24, 0.545, 0.2), V(s * 0.24, 0.565, 0.2), 0.012, 6);
  }

  // Front: the stereo navigation cameras on their tower at the nose, LIBS and APXS under it.
  box(g, M.alu, 0.07, 0.1, 0.07, 0, 0.5, 0.34);
  box(g, M.alu, 0.3, 0.06, 0.05, 0, 0.55, 0.37);
  for (const s of [-1, 1]) {
    box(g, M.black, 0.08, 0.07, 0.04, s * 0.11, 0.55, 0.39);
    box(g, M.glass, 0.045, 0.045, 0.01, s * 0.11, 0.55, 0.412);
  }
  box(g, M.alu, 0.22, 0.05, 0.1, 0, 0.3, 0.34);
  const apxs = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.09, 14), M.dark);
  apxs.rotation.x = Math.PI / 2;
  apxs.position.set(0.06, 0.29, 0.43);
  add(g, apxs);
  const libs = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 14), M.black);
  libs.rotation.x = Math.PI / 2;
  libs.position.set(-0.06, 0.29, 0.42);
  add(g, libs);
  box(g, M.glass, 0.04, 0.04, 0.01, -0.06, 0.29, 0.452);
  // Rear: the Rx/Tx antenna, a flat patch on a mast — the rover's highest point.
  strut(g, M.alu, V(0, 0.55, -0.31), V(0, 0.8, -0.31), 0.012, 6);
  const ant = dish(M.white, M.black, 0.07);
  ant.rotation.x = -0.9;
  ant.position.set(0, 0.8, -0.31);
  add(g, ant);
  // The flag-and-emblem plates on the flanks (ISRO emblem and the Ashoka lion stamped on the
  // wheels and shown on the body).
  for (const s of [-1, 1]) box(g, M.white, 0.006, 0.1, 0.12, s * 0.237, 0.4, 0.08);
  return g;
}

export function buildPragyan(): THREE.Group {
  return stand(pragyanRaw(), PRAGYAN_HEIGHT_M);
}

// ─── Vikram (Chandrayaan-2 and -3) ──────────────────────────────────────────

export const VIKRAM_HEIGHT_M = 1.2;

/**
 * Vikram in metres, landed, in Chandrayaan-3's configuration (four engines, solar panels on three
 * sides and the top); Chandrayaan-2's lander shares it (it differed by a fifth, central engine and
 * smaller legs). The ramp is down toward +z with Pragyan part-way down it, as a named child group 'rover'.
 */
export function buildVikram(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const bot = 0.44;
  const top = 1.08;
  const hb = top - bot;
  const half = 1.0;

  // Body: a 2 m box under crumpled gold and silver blanket, patches of the other foil, black tape.
  wrapBox(
    g,
    M.dark,
    [M.gold, M.silver, M.gold, M.silver],
    0,
    (top + bot) / 2,
    0,
    half * 2,
    hb,
    half * 2,
    0.035,
    undefined,
    M.black,
  );
  const base = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, half * 2), M.black);
  base.rotation.x = Math.PI / 2;
  base.position.y = bot - 0.004;
  add(g, base);
  // Top deck: the solar panel, framed in silver.
  const deck = solarPanel(M, 1.84, 1.84, 8, 8);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, top + 0.014, 0);
  add(g, deck);
  // Side solar panels on -x, +x and -z, at the top of each face; the blanket shows below them.
  const sideFaces: [number, number, number][] = [
    [-1, 0, -Math.PI / 2],
    [1, 0, Math.PI / 2],
    [0, -1, Math.PI],
  ];
  for (const [fx, fz, yaw] of sideFaces) {
    const p = solarPanel(M, 1.5, hb * 0.55, 7, 3);
    p.rotation.y = yaw;
    p.position.set(fx * (half + 0.06), top - 0.06 - hb * 0.275, fz * (half + 0.06));
    add(g, p);
  }
  // Payloads. ILSA seismometer box and RAMBHA-LP Langmuir probe (a boom) at the front corners of
  // the top deck; ChaSTE's thermal probe housing on its deployment arm on the -z side; the NASA
  // retroreflector tile; laser altimeter and star trackers; the X-band dish on its mast.
  box(g, M.silver, 0.3, 0.1, 0.22, 0.62, top + 0.07, 0.62);
  box(g, M.black, 0.26, 0.012, 0.18, 0.62, top + 0.125, 0.62);
  strut(g, M.silver, V(-0.7, top, 0.7), V(-0.7, top + 0.1, 0.7), 0.03, 8);
  strut(g, M.steel, V(-0.7, top + 0.1, 0.7), V(-0.7, top + 0.1, 1.2), 0.008, 6);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.steel);
  tip.position.set(-0.7, top + 0.1, 1.2);
  add(g, tip);
  box(g, M.alu, 0.26, 0.14, 0.2, 0.0, top + 0.08, -0.62);
  const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.24, 14), M.dark);
  probe.rotation.x = Math.PI / 2;
  probe.position.set(0.0, top + 0.09, -0.86);
  add(g, probe);
  const lra = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 20), M.glass);
  lra.position.set(-0.55, top + 0.03, -0.35);
  add(g, lra);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 20), M.steel);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(-0.55, top + 0.03, -0.35);
  add(g, ring);
  box(g, M.dark, 0.22, 0.1, 0.22, 0.22, top + 0.06, 0.1);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.16, 14), M.black);
  st.position.set(-0.55, top + 0.09, 0.2);
  add(g, st);
  strut(g, M.silver, V(0.62, top, -0.62), V(0.62, top + 0.26, -0.62), 0.016, 6);
  const d = dish(M.white, M.black, 0.16);
  d.rotation.x = 0.35;
  d.position.set(0.62, top + 0.26, -0.62);
  add(g, d);
  // Sensor windows and the camera block on the +z face (laser Doppler velocimeter, hazard cameras).
  for (const [x, y] of [
    [-0.55, bot + 0.2],
    [0.05, bot + 0.2],
  ])
    box(g, M.glass, 0.12, 0.1, 0.02, x, y, half + 0.03);
  box(g, M.black, 0.5, 0.22, 0.01, -0.5, bot + 0.2, half + 0.02);

  // Engines: four 800 N throttleable bells at the bottom corners.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      bell(g, M.bell, sx * 0.62, bot - 0.2, sz * 0.62, 0.09, 0.24);
      box(g, M.gold, 0.28, 0.07, 0.28, sx * 0.62, bot + 0.02, sz * 0.62);
      for (const [dx, dz] of [
        [1, 0],
        [0, 1],
      ])
        thruster(g, M, V(sx * 0.84, bot + 0.22, sz * 0.84), V(sx * dx, 0, sz * dz), 0.03);
    }

  // Four legs: a gold-wrapped main strut from the body corner to its footpad, a brace from the
  // body's lower edge, and the pad.
  const span = 1.62;
  const padR = 0.27;
  const legR = 0.065;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const A = V(sx * 0.98, bot + 0.5, sz * 0.98);
      const F = V(sx * span, padR * 0.3 + 0.03, sz * span);
      const mid = A.clone().lerp(F, 0.62);
      const s1 = strut(g, M.gold, A, mid, legR, 12);
      s1.geometry = crinkle(
        new THREE.CylinderGeometry(legR, legR, A.distanceTo(mid), 12, 6),
        0.012,
      );
      strut(g, M.silver, mid, F, legR * 0.7, 12);
      strut(
        g,
        M.silver,
        V(sx * 0.8, bot + 0.04, sz * 0.8),
        A.clone().lerp(F, 0.72),
        legR * 0.55,
        8,
      );
      box(g, M.gold, 0.22, 0.3, 0.22, sx * (half - 0.05), bot + 0.42, sz * (half - 0.05));
      footpad(g, M, sx * span, sz * span, padR);
      strut(
        g,
        M.silver,
        V(sx * span, padR * 0.3, sz * span),
        F.clone().add(V(0, 0.08, 0)),
        legR * 1.1,
        10,
      );
    }

  // The ramp: a panel hinged on the +z face, laid down to the ground, rails and cleats on it.
  const hinge = V(0, bot + 0.46, half + 0.03);
  const rampLen = 1.75;
  const ang = Math.asin(hinge.y / rampLen);
  const ramp = new THREE.Group();
  ramp.position.copy(hinge);
  ramp.rotation.x = ang;
  add(g, ramp);
  box(ramp, M.silver, 1.0, 0.03, rampLen, 0, -0.015, rampLen / 2);
  for (const s of [-1, 1]) box(ramp, M.alu, 0.04, 0.06, rampLen, s * 0.5, 0.005, rampLen / 2);
  for (let i = 1; i < 14; i++) box(ramp, M.steel, 0.92, 0.012, 0.016, 0, 0.004, (rampLen * i) / 14);
  box(ramp, M.dark, 1.04, 0.07, 0.07, 0, -0.01, 0.02);

  // Pragyan on the ramp, part-way down, pointing down the slope.
  const rover = new THREE.Group();
  rover.name = 'rover';
  const pr = pragyanRaw();
  pr.rotation.y = 0;
  rover.add(pr);
  const t = rampLen * 0.78;
  rover.position.set(0, hinge.y - Math.sin(ang) * t, hinge.z + Math.cos(ang) * t);
  rover.rotation.x = ang;
  rover.position.y += 0.012;

  // Fit to the sourced height measured on the lander alone (the rover sits within it).
  const b = new THREE.Box3().setFromObject(g);
  const k = VIKRAM_HEIGHT_M / (b.max.y - b.min.y);
  g.scale.setScalar(k);
  g.position.y = -b.min.y * k;
  const out = new THREE.Group();
  out.add(g);
  g.add(rover);
  return out;
}

// ─── SLIM ───────────────────────────────────────────────────────────────────

export const SLIM_HEIGHT_M = 2.0;

/** A crushable 3D-printed aluminium lattice pad: a downward hemisphere of open lattice over a dark core. */
function latticePad(
  g: THREE.Object3D,
  M: Record<string, Mat>,
  x: number,
  z: number,
  r: number,
): void {
  const grp = new THREE.Group();
  grp.position.set(x, r, z);
  const dome = (rr: number, m: Mat, wSeg: number, hSeg: number) => {
    const d = new THREE.Mesh(
      new THREE.SphereGeometry(rr, wSeg, hSeg, 0, Math.PI * 2, 0, Math.PI / 2),
      m,
    );
    d.rotation.x = Math.PI;
    return add(grp, d);
  };
  dome(r * 0.9, M.dark, 20, 8);
  dome(r, M.lattice, 14, 7);
  dome(r * 0.97, M.lattice, 7, 4);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 20), M.alu);
  add(grp, top);
  add(g, grp);
}

/**
 * JAXA SLIM in its flying attitude, long axis up, from the 1/2-scale model photos (Wikimedia
 * Commons, "SLIM half scale model", and LEV-1/LEV-2 at Sagamihara): an elongated prism entirely in
 * heavily crumpled gold foil; a large golden dome — the propellant tank end, with the main engine
 * inside — on the bottom face rimmed in silver; a long narrow strip of solar cells (red-lined)
 * down the +x face; at the top end a cluster of small silver thruster cones and an antenna horn;
 * five round lattice crush pads on short struts, with thin gold rods bracing them to the body.
 * In reality it touched down on the leg at the dome end and ended on its side: the scene rotates it.
 */
export function buildSlim(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const padR = 0.14;
  const bot = 0.6;
  const top = 1.78;
  const hb = top - bot;
  const W = 1.5;
  const D = 1.1;

  wrapBox(
    g,
    M.dark,
    [M.gold, M.goldPale, M.gold, M.goldPale],
    0,
    (top + bot) / 2,
    0,
    W,
    hb,
    D,
    0.04,
  );
  // Crumpled foil over the bottom face and the top cap; a flat gold rim ties the corners.
  const cap = foil(M.gold, W, D, 0.04, 8);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = top + 0.004;
  add(g, cap);
  const bottom = foil(M.amber, W, D, 0.03, 9);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = bot - 0.004;
  add(g, bottom);

  // The dome: the tank end, a crumpled gold hemisphere in a silver rim, main-engine nozzle at its pole.
  const domeGeo = new THREE.SphereGeometry(0.55, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.scale(1, 0.95, 1);
  domeGeo.rotateX(Math.PI);
  const dome = new THREE.Mesh(crinkle(domeGeo, 0.02), M.gold);
  dome.position.y = bot;
  add(g, dome);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.022, 8, 36), M.silver);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = bot - 0.01;
  add(g, rim);
  bell(g, M.bell, 0, bot - 0.58, 0, 0.1, 0.16);

  // The solar cell strip: long and narrow down the +x face, cells in red-lined strings.
  const strip = solarPanel({ ...M, cellLine: M.cellPink }, 0.62, hb - 0.12, 3, 12);
  strip.rotation.y = Math.PI / 2;
  strip.position.set(W / 2 + 0.04, (top + bot) / 2, 0);
  add(g, strip);
  for (const z of [-0.22, 0.22])
    for (const y of [bot + 0.2, top - 0.2])
      strut(g, M.alu, V(W / 2, y, z), V(W / 2 + 0.04, y, z), 0.012, 6);
  // The grey radiator box and the camera and radar on the +z face.
  box(g, M.silver, 0.5, 0.45, 0.04, -0.3, bot + 0.75, D / 2 + 0.05);
  box(g, M.dark, 0.36, 0.2, 0.03, 0.3, bot + 0.45, D / 2 + 0.05);
  for (const x of [0.22, 0.38]) box(g, M.glass, 0.08, 0.08, 0.02, x, bot + 0.45, D / 2 + 0.075);
  const radar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 20), M.black);
  radar.rotation.x = Math.PI / 2;
  radar.position.set(0.3, bot + 1.0, D / 2 + 0.06);
  add(g, radar);

  // Top end: small silver thruster cones round the rim, a taller antenna horn at one corner.
  const cone = (x: number, z: number, h: number, r: number) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r, h, 12), M.silver);
    c.position.set(x, top + h / 2, z);
    add(g, c);
  };
  for (const [x, z] of [
    [-0.62, -0.42],
    [-0.2, -0.46],
    [0.2, -0.46],
    [0.62, -0.42],
    [-0.62, 0.42],
    [-0.2, 0.46],
    [0.2, 0.46],
    [0.62, 0.42],
  ])
    cone(x, z, 0.08, 0.03);
  cone(0.55, 0, 0.2, 0.07);
  // Side thrusters on the flanks near the top, a boom stub at the corner.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      thruster(
        g,
        { ...M, bell: M.silver },
        V(sx * (W / 2 + 0.01), top - 0.12, sz * 0.3),
        V(sx, 0, 0),
        0.035,
      );

  // Five round lattice crush pads on short struts: four at the corners, the main one at the dome end,
  // thin gold rods bracing each corner pad up the body.
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    latticePad(g, M, sx * 0.62, sz * 0.42, padR);
    strut(g, M.steel, V(sx * 0.62, padR, sz * 0.42), V(sx * 0.62, bot, sz * 0.42), 0.04, 8);
    strut(
      g,
      M.gold,
      V(sx * 0.62, padR * 1.4, sz * 0.42),
      V(sx * 0.7, bot + 0.9, sz * 0.5),
      0.012,
      6,
    );
  }
  latticePad(g, M, 0, 0.66, padR * 1.15);
  strut(g, M.steel, V(0, padR * 1.15, 0.66), V(0, bot, 0.5), 0.045, 8);

  return stand(g, SLIM_HEIGHT_M);
}

// ─── Beresheet ──────────────────────────────────────────────────────────────

export const BERESHEET_HEIGHT_M = 1.5;

/** A silver tube ring of radius r at height y. */
function tubeRing(g: THREE.Object3D, m: Mat, r: number, y: number, t: number): void {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 48), m);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  add(g, ring);
}

/**
 * SpaceIL Beresheet (2 m across the legs, 1.5 m high), from the flight-model replica photos
 * (Wikimedia Commons, "Beresheet model on Habima Square" and BeresheetRender): a wide black top
 * deck rimmed in gold, an inverted-trapezoid tub of silver tube frame with white sponsor panels on
 * the faces, four big copper-coloured spherical tanks visible between the struts, the central
 * engine and four pairs of silver thruster cones under the lower plate, four long gunmetal legs
 * from the deck rim braced from the lower ring, flat round pads, tilted blue solar plates and a
 * few small boxes and the retroreflector disc on the deck.
 */
export function buildBeresheet(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const topY = 1.12;
  const lowY = 0.62;
  const RT = 0.8;
  const RB = 0.5;

  // Deck and lower plate: dark plates with gold edging.
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(RT, RT, 0.035, 48), M.black);
  deck.position.y = topY;
  add(g, deck);
  tubeRing(g, M.gold, RT + 0.005, topY, 0.012);
  tubeRing(g, M.silver, RT - 0.03, topY - 0.03, 0.015);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, 0.03, 32), M.dark);
  plate.position.y = lowY;
  add(g, plate);
  tubeRing(g, M.gold, RB + 0.004, lowY, 0.01);
  tubeRing(g, M.silver, RB, lowY + 0.03, 0.015);
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, topY - lowY, 20), M.dark);
  core.position.y = (topY + lowY) / 2;
  add(g, core);

  // Tub frame: eight struts from the top ring to the lower ring, white panels on the four faces.
  const slant = Math.hypot(RT - RB, topY - lowY);
  const tilt = Math.atan2(RT - RB, topY - lowY);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    strut(
      g,
      M.silver,
      V(Math.sin(a) * (RT - 0.03), topY - 0.03, Math.cos(a) * (RT - 0.03)),
      V(Math.sin(a) * RB, lowY + 0.03, Math.cos(a) * RB),
      0.014,
      8,
    );
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const panel = new THREE.Group();
    panel.rotation.y = a;
    const mid = ((RT + RB) / 2) * Math.cos(Math.PI / 8) - 0.02;
    panel.position.set(Math.sin(a) * mid, (topY + lowY) / 2, Math.cos(a) * mid);
    const p = box(panel, M.white, 0.55, slant * 0.94, 0.012, 0, 0, 0);
    p.rotation.x = tilt;
    box(
      panel,
      M.cell,
      0.4,
      0.012,
      0.014,
      0,
      slant * 0.2 * Math.cos(tilt),
      slant * 0.2 * Math.sin(tilt),
    );
    add(g, panel);
  }
  // Four large copper spherical tanks, between the struts at the diagonals.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const x = Math.sin(a) * 0.5;
    const z = Math.cos(a) * 0.5;
    const t = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 28, 18),
      i === 3 ? M.tankRed : M.copper,
    );
    t.position.set(x, 0.86, z);
    add(g, t);
    const nipple = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10), M.steel);
    nipple.position.set(x, 0.86 + 0.27, z);
    add(g, nipple);
    strut(g, M.silver, V(x, lowY + 0.03, z), V(x * 1.15, topY - 0.03, z * 1.15), 0.012, 6);
  }
  // The engine below: the central bell and four pairs of silver thruster cones.
  bell(g, M.dark, 0, lowY - 0.38, 0, 0.17, 0.4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const p = V(Math.sin(a) * 0.42, lowY - 0.02, Math.cos(a) * 0.42);
    const t = V(Math.cos(a), 0, -Math.sin(a));
    for (const s of [-1, 1])
      thruster(
        g,
        { ...M, bell: M.silver },
        p.clone().addScaledVector(t, s * 0.05),
        V(0, -1, 0),
        0.045,
      );
    box(g, M.dark, 0.16, 0.03, 0.05, p.x, p.y + 0.01, p.z).rotation.y = a;
  }
  // The deck: a retroreflector disc, two small lattice boxes in gold hoops, a camera, two tilted
  // blue solar plates, the magnetometer boom.
  const lra = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24), M.lra);
  lra.position.set(0.0, topY + 0.03, 0.25);
  add(g, lra);
  for (const [x, z] of [
    [0.4, -0.35],
    [0.0, -0.55],
  ]) {
    box(g, M.alu, 0.14, 0.16, 0.14, x, topY + 0.1, z);
    tubeRing(g, M.gold, 0.12, topY + 0.2, 0.008);
    for (const [dx, dz] of [
      [1, 1],
      [-1, 1],
    ])
      strut(
        g,
        M.steel,
        V(x - dx * 0.06, topY + 0.04, z - dz * 0.06),
        V(x + dx * 0.06, topY + 0.16, z + dz * 0.06),
        0.006,
        5,
      );
  }
  const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.14, 12), M.black);
  cam.position.set(-0.5, topY + 0.1, 0.3);
  add(g, cam);
  const big = solarPanel(M, 0.8, 0.52, 10, 6);
  big.rotation.set(-0.35, 0.35, 0);
  big.position.set(-0.35, topY + 0.3, -0.35);
  add(g, big);
  strut(g, M.alu, V(-0.35, topY, -0.5), V(-0.35, topY + 0.1, -0.35), 0.012, 6);
  const small = solarPanel(M, 0.5, 0.38, 6, 5);
  small.rotation.set(-0.55, -0.7, 0);
  small.position.set(0.5, topY + 0.24, 0.15);
  add(g, small);
  strut(g, M.silver, V(-0.1, topY + 0.03, 0.55), V(-0.1, topY + 0.3, 0.7), 0.01, 6);
  box(g, M.alu, 0.06, 0.06, 0.06, -0.1, topY + 0.32, 0.72);
  // Attitude thrusters on small pods at the deck rim.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const n = V(Math.sin(a), 0, Math.cos(a));
    const p = n
      .clone()
      .multiplyScalar(RT)
      .setY(topY - 0.08);
    box(g, M.dark, 0.08, 0.07, 0.08, p.x, p.y, p.z);
  }
  // Four long legs at the diagonals: gunmetal strut from the deck rim, a brace from the lower
  // ring to its mid-point, flat round pad.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dir = V(Math.sin(a), 0, Math.cos(a));
    const A = dir
      .clone()
      .multiplyScalar(RT - 0.02)
      .setY(topY - 0.02);
    const F = dir.clone().multiplyScalar(1.0).setY(0.07);
    strut(g, M.gunmetal, A, F, 0.04, 10);
    const K = A.clone().lerp(F, 0.5);
    strut(g, M.gunmetal, dir.clone().multiplyScalar(RB).setY(lowY), K, 0.018, 8);
    box(g, M.silver, 0.1, 0.07, 0.1, K.x, K.y, K.z).rotation.y = a;
    footpad(g, M, F.x, F.z, 0.15);
  }
  return stand(g, BERESHEET_HEIGHT_M);
}

// ─── Blue Moon MK1 ──────────────────────────────────────────────────────────

export const BLUE_MOON_HEIGHT_M = 8.05;

/** A cylinder wall in `n` gores alternating two crumpled foils (a blanket's panels). */
function goreWall(
  g: THREE.Object3D,
  a: Mat,
  b: Mat,
  R: number,
  y0: number,
  h: number,
  n: number,
  amp: number,
): void {
  for (let i = 0; i < n; i++) {
    const geo = new THREE.CylinderGeometry(
      R,
      R,
      h,
      4,
      Math.max(4, Math.round(h / 0.3)),
      true,
      (i / n) * Math.PI * 2,
      (Math.PI * 2) / n,
    );
    const m = new THREE.Mesh(crinkle(geo, amp), i % 2 ? b : a);
    m.position.y = y0 + h / 2;
    add(g, m);
  }
}

/** An octagonal aluminium truss cage: posts, rings at the ends and middle, alternating diagonals. */
function trussCage(g: THREE.Object3D, m: Mat, R: number, y0: number, y1: number, t: number): void {
  const n = 8;
  const pt = (i: number, y: number) =>
    V(Math.sin((i / n) * Math.PI * 2) * R, y, Math.cos((i / n) * Math.PI * 2) * R);
  const ym = (y0 + y1) / 2;
  for (let i = 0; i < n; i++) {
    strut(g, m, pt(i, y0), pt(i, y1), t, 6);
    for (const y of [y0, ym, y1]) strut(g, m, pt(i, y), pt(i + 1, y), t * 0.8, 6);
    strut(g, m, pt(i, y0), pt(i + 1, ym), t * 0.6, 5);
    strut(g, m, pt(i + 1, ym), pt(i, y1), t * 0.6, 5);
  }
}

/**
 * Blue Origin Blue Moon MK1: 8.05 m, 3.08 m across the body. From the flight-vehicle photos
 * (Wikimedia Commons, "Blue Moon Mark 1" in thermal-vacuum testing): a pale aluminium truss base
 * carrying the BE-7, a tall hull of crumpled gold and amber foil wrapped on the tanks with pale
 * intertank bands, two tall narrow golden solar-cell strips down the front, ladder-truss legs
 * along the flanks, an open octagonal truss cage across the top.
 */
export function buildBlueMoonMk1(): THREE.Group {
  const M = palette();
  const g = new THREE.Group();
  const R = 1.54;
  const yLow = 2.4;

  // Engine bay: the BE-7 under a truss cage, gimbal actuators, a black thermal skirt above it.
  bell(g, M.bell, 0, 0.9, 0, 0.5, 1.2, 0.14);
  trussCage(g, M.alu, R * 0.95, 0.3, yLow, 0.035);
  for (const s of [-1, 1]) {
    strut(g, M.silver, V(s * 0.75, 1.55, 0), V(s * 0.28, 2.05, 0), 0.04, 8);
    strut(g, M.silver, V(0, 1.55, s * 0.75), V(0, 2.05, s * 0.28), 0.04, 8);
  }
  const floor = new THREE.Mesh(
    crinkle(new THREE.CylinderGeometry(R, R, 0.2, 32, 2, true), 0.02),
    M.black,
  );
  floor.position.y = yLow - 0.05;
  add(g, floor);
  // Hull: the lower and upper tank sections in crumpled gold and amber gores, cream intertank
  // bands, steel frames.
  goreWall(g, M.gold, M.amber, R, yLow, 2.55, 14, 0.04);
  goreWall(g, M.goldPale, M.gold, R, yLow + 2.95, 2.5, 12, 0.04);
  {
    const band = new THREE.Mesh(
      crinkle(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.4, 40, 2, true), 0.012),
      M.whiteMli,
    );
    band.position.y = yLow + 2.75;
    add(g, band);
  }
  for (const y of [yLow, yLow + 2.55, yLow + 2.95, yLow + 5.45])
    tubeRing(g, M.steel, R * 1.012, y, 0.035);
  const lid = new THREE.Mesh(crinkle(new THREE.CylinderGeometry(R, R, 0.06, 32, 4), 0.02), M.gold);
  lid.position.y = yLow + 5.48;
  add(g, lid);
  // Top: an open octagonal truss cage and the antenna dish on it.
  trussCage(g, M.alu, R * 0.92, yLow + 5.5, 8.0, 0.03);
  const hga = dish(M.white, M.black, 0.3);
  hga.rotation.set(0.9, 0.5, 0);
  hga.position.set(0.5, 8.0, 0);
  add(g, hga);
  // Reaction-control pods high on the hull.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const n = V(Math.sin(a), 0, Math.cos(a));
    const p = n
      .clone()
      .multiplyScalar(R + 0.05)
      .setY(yLow + 4.9);
    const pod = box(g, M.dark, 0.3, 0.3, 0.3, p.x, p.y, p.z);
    pod.rotation.y = a;
    thruster(g, M, p.clone().addScaledVector(n, 0.12), n, 0.06);
    thruster(g, M, p.clone().add(V(0, 0.15, 0)), V(0, 1, 0), 0.06);
    // Ladder-truss legs: two rails and rungs from the cage level out to a flat pad.
    const t = V(Math.cos(a), 0, -Math.sin(a));
    const A = n
      .clone()
      .multiplyScalar(R + 0.12)
      .setY(yLow + 5.0);
    const F = n.clone().multiplyScalar(2.5).setY(0.3);
    for (const s of [-1, 1]) {
      const off = t.clone().multiplyScalar(s * 0.24);
      strut(g, M.alu, A.clone().add(off), F.clone().add(off), 0.045, 8);
    }
    const rungs = 12;
    for (let k = 0; k <= rungs; k++) {
      const q = A.clone().lerp(F, k / rungs);
      strut(
        g,
        M.alu,
        q.clone().addScaledVector(t, -0.24),
        q.clone().addScaledVector(t, 0.24),
        0.02,
        5,
      );
    }
    strut(
      g,
      M.steel,
      n
        .clone()
        .multiplyScalar(R)
        .setY(yLow + 0.4),
      A.clone().lerp(F, 0.75),
      0.04,
      8,
    );
    footpad(g, M, F.x, F.z, 0.5);
    strut(g, M.steel, F.clone().setY(0.14), F, 0.1, 10);
  }
  // Two tall narrow golden solar-cell strips down the front, on standoffs.
  const strips = { ...M, cell: M.cellGold, cellLine: M.dark };
  for (const s of [-1, 1]) {
    const sp = solarPanel(strips, 0.26, 5.2, 2, 22);
    sp.position.set(s * 0.45, yLow + 2.7, R + 0.16);
    add(g, sp);
    for (const y of [yLow + 0.4, yLow + 2.7, yLow + 5.0])
      strut(g, M.silver, V(s * 0.45, y, R - 0.02), V(s * 0.45, y, R + 0.15), 0.025, 6);
  }
  return stand(g, BLUE_MOON_HEIGHT_M);
}

// ─── Exports ────────────────────────────────────────────────────────────────

const VIKRAM_REFS: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Chandrayaan-2 / Vikram: 2.54 × 2 × 1.2 m, four 800 N throttleable engines (CY-2 has a fifth, central one), four legs, ramp',
    u: 'https://en.wikipedia.org/wiki/Chandrayaan-2',
  },
  {
    l: 'Wikipedia — Chandrayaan-3: Vikram box-shaped, four legs and four thrusters, carries Pragyan on a ramp',
    u: 'https://en.wikipedia.org/wiki/Chandrayaan-3',
  },
  { l: 'ISRO — Chandrayaan-3 lander', u: 'https://www.isro.gov.in/Chandrayaan3.html' },
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'vikram-cy2': {
    build: buildVikram,
    heightM: VIKRAM_HEIGHT_M,
    heightEstimate:
      'Wikipedia (Chandrayaan-2) gives 2.54 × 2 × 1.2 m; not yet checked against ISRO.',
    diameterM: 2.0,
    refs: VIKRAM_REFS,
  },
  'vikram-cy3': {
    build: buildVikram,
    heightM: VIKRAM_HEIGHT_M,
    heightEstimate:
      'No CY-3 figure published; the Chandrayaan-2 Vikram height (1.2 m), same design.',
    diameterM: 2.0,
    refs: VIKRAM_REFS,
  },
  pragyan: {
    build: buildPragyan,
    heightM: PRAGYAN_HEIGHT_M,
    heightEstimate: 'Wikipedia gives 0.9 × 0.75 × 0.85 m; not yet checked against ISRO.',
    diameterM: 0.75,
    refs: [
      {
        l: 'Wikipedia — Chandrayaan-2: Pragyan rover 0.9 × 0.75 × 0.85 m, six wheels',
        u: 'https://en.wikipedia.org/wiki/Chandrayaan-2',
      },
      { l: 'Wikipedia — Pragyan (rover)', u: 'https://en.wikipedia.org/wiki/Pragyan_(rover)' },
    ],
  },
  slim: {
    build: buildSlim,
    heightM: SLIM_HEIGHT_M,
    diameterM: 1.5,
    refs: [
      {
        l: 'Wikipedia — SLIM: 1.5 × 1.5 × 2 m, solar panel, two-step landing on its side',
        u: 'https://en.wikipedia.org/wiki/Smart_Lander_for_Investigating_Moon',
      },
      { l: 'JAXA — SLIM', u: 'https://global.jaxa.jp/projects/sas/slim/' },
    ],
  },
  beresheet: {
    build: buildBeresheet,
    heightM: BERESHEET_HEIGHT_M,
    diameterM: 2.0,
    refs: [
      {
        l: 'Wikipedia — Beresheet: 2 m across, 1.5 m high, nine engines (LEROS 2b main)',
        u: 'https://en.wikipedia.org/wiki/Beresheet',
      },
      {
        l: 'NASA Solar System Exploration — Beresheet',
        u: 'https://solarsystem.nasa.gov/missions/beresheet/in-depth/',
      },
    ],
  },
  'blue-moon-mk1': {
    build: buildBlueMoonMk1,
    heightM: BLUE_MOON_HEIGHT_M,
    diameterM: 3.08,
    refs: [
      {
        l: 'Wikipedia — Blue Moon: Mark 1 is 8.05 m high and 3.08 m across, one BE-7',
        u: 'https://en.wikipedia.org/wiki/Blue_Moon_(spacecraft)',
      },
    ],
  },
};
