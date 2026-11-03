/**
 * Showcase models: station freighters (Cygnus, HTV, HTV-X, ATV, Tianzhou) and the Shenzhou and
 * Apollo CSM crewed craft. Each stands as on its launcher: engine / service end down (y = 0),
 * docking end up, front facing +z, solar arrays deployed at their real span in the x-y plane.
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

/** Cylinder / frustum between two heights on the y axis. */
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

/** Surface of revolution from (radius, y) points. */
function lathe(g: THREE.Object3D, m: Mat, pts: [number, number][], seg = 48): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      seg,
    ),
    m,
  );
  return add(g, mesh);
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

function torus(g: THREE.Object3D, m: Mat, r: number, tube: number, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 48), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  return add(g, mesh);
}

/** Small cone nozzle pointing along `dir` (unit vector) at `pos`. */
function nozzle(
  g: THREE.Object3D,
  m: Mat,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
  r: number,
  len: number,
): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, len, 12, 1, true), m);
  mesh.position.copy(pos);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  add(g, mesh);
}

/** Thruster pod: a block on the hull at angle `a`, height `y`, with nozzles pointing tangentially. */
function rcsPod(
  g: THREE.Object3D,
  podMat: Mat,
  dark: Mat,
  radius: number,
  y: number,
  a: number,
  w: number,
  h: number,
  d: number,
): void {
  const wrap = add(g, new THREE.Group());
  wrap.rotation.y = a;
  box(wrap, podMat, w, h, d, 0, y, radius + d / 2 - 0.02);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      nozzle(
        wrap,
        dark,
        new THREE.Vector3(sx * w * 0.32, y + sy * h * 0.3, radius + d + 0.02),
        new THREE.Vector3(sx * 0.6, sy * 0.4, 0.7),
        0.05,
        0.1,
      );
    }
  }
}

function bolts(g: THREE.Object3D, m: Mat, r: number, y: number, n: number, size: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    box(g, m, size, size, size, Math.cos(a) * r, y, Math.sin(a) * r);
  }
}

interface ArrayMats {
  frame: Mat;
  cell: Mat;
  line: Mat;
}

function arrayMats(cell = 0x1a2a55, frame = 0xb9bcc2): ArrayMats {
  return {
    frame: mat(frame, 0.5, 0.45),
    cell: mat(cell, 0.6, 0.3),
    line: mat(0xc9a64a, 0.7, 0.35),
  };
}

/**
 * Folded-array style wing: `n` rectangular segments in a row along +x from x0, in the plane
 * normal to z (flat face toward +z), `width` tall, centred on y.
 */
function wing(
  parent: THREE.Object3D,
  am: ArrayMats,
  x0: number,
  y: number,
  len: number,
  width: number,
  n: number,
  angle = 0,
  gap = 0.04,
): THREE.Group {
  const w = add(parent, new THREE.Group());
  w.position.y = y;
  w.rotation.y = angle;
  const seg = (len - (n - 1) * gap) / n;
  box(w, am.frame, x0 + 0.1, 0.07, 0.07, (x0 + 0.1) / 2 - 0.05, 0, 0);
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * (seg + gap) + seg / 2;
    box(w, am.frame, seg, width, 0.04, cx, 0, 0);
    box(w, am.cell, seg - 0.1, width - 0.1, 0.05, cx, 0, 0);
    const cols = Math.max(2, Math.round(seg / 0.5));
    for (let c = 1; c < cols; c++) {
      box(
        w,
        am.line,
        0.012,
        width - 0.1,
        0.056,
        cx - seg / 2 + 0.05 + ((seg - 0.1) * c) / cols,
        0,
        0,
      );
    }
    box(w, am.line, seg - 0.1, 0.012, 0.056, cx, 0, 0);
  }
  return w;
}

/** Round fan array (UltraFlex): disc with a wedge missing toward the body, radial gores. */
function fan(
  parent: THREE.Object3D,
  am: ArrayMats,
  hubX: number,
  y: number,
  R: number,
  side: 1 | -1,
): void {
  const gap = 0.5;
  const g = add(parent, new THREE.Group());
  g.position.set(hubX * side, y, 0);
  const start = side === 1 ? -Math.PI + gap / 2 : gap / 2;
  const theta = Math.PI * 2 - gap;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(R, 48, start, theta),
    mat(0x1a2a55, 0.6, 0.3, true),
  );
  g.add(disc);
  for (let i = 0; i <= 14; i++) {
    const a = start + (theta * i) / 14;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(R, 0.016, 0.01), am.line);
    rib.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0.006);
    rib.rotation.z = a;
    g.add(rib);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 16), am.frame);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  const mast = box(parent, am.frame, hubX - 1.4, 0.08, 0.08, (side * (hubX + 1.4)) / 2, y, 0);
  mast.position.x = (side * (hubX + 1.4)) / 2;
}

/** Berthing/docking ring seat: raised ring, bolts and a dark hatch. */
function berthRing(
  g: THREE.Object3D,
  y: number,
  r: number,
  metal: Mat,
  dark: Mat,
  withHatch = true,
): void {
  cyl(g, metal, r, r, y, y + 0.22, 48);
  bolts(g, dark, r, y + 0.23, 16, 0.06);
  torus(g, dark, r - 0.04, 0.025, y + 0.22);
  if (withHatch) cyl(g, dark, r - 0.18, r - 0.18, y + 0.2, y + 0.23, 32);
}

// ---------------------------------------------------------------------------------------------
// Cygnus
// ---------------------------------------------------------------------------------------------

function buildCygnus(totalH: number, fanArrays: boolean): THREE.Group {
  const g = new THREE.Group();
  const R = 1.535; // 3.07 m
  const smH = 2.49; // service module incl. engine skirt
  const aluminium = mat(0xc9ccd0, 0.75, 0.42);
  const rib = mat(0xa7abb1, 0.8, 0.4);
  const gold = mat(0xb08f45, 0.65, 0.4);
  const white = mat(0xe8e8e4, 0.2, 0.6);
  const dark = mat(0x1b1c20, 0.4, 0.6);

  // service module (GEOStar-derived): gold-wrapped drum, white radiator band, main engine
  cyl(g, gold, R - 0.04, R - 0.04, 0.35, smH - 0.45);
  cyl(g, white, R - 0.03, R - 0.03, smH - 0.45, smH - 0.05);
  cyl(g, dark, R - 0.1, R - 0.1, 0.34, 0.36);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(g, dark, 0.05, smH - 0.85, 0.02, 0, 0, 0).position.set(
      Math.sin(a) * (R - 0.02),
      (0.35 + smH - 0.45) / 2,
      Math.cos(a) * (R - 0.02),
    );
  }
  lathe(g, dark, [
    [0.45, 0.0],
    [0.38, 0.12],
    [0.22, 0.34],
    [0.2, 0.45],
  ]);
  for (let i = 0; i < 4; i++) {
    rcsPod(
      g,
      white,
      dark,
      R - 0.04,
      smH - 0.5,
      (i / 4) * Math.PI * 2 + Math.PI / 4,
      0.4,
      0.4,
      0.12,
    );
  }
  torus(g, rib, R - 0.02, 0.04, smH);

  // pressurised cargo module (Thales Alenia): bare aluminium drum, stiffener rings and ribs
  const pcmTop = totalH - 0.59;
  cyl(g, aluminium, R, R, smH, pcmTop);
  const nRing = Math.floor((pcmTop - smH) / 0.5);
  for (let i = 1; i <= nRing; i++)
    torus(g, rib, R + 0.005, 0.022, smH + (i * (pcmTop - smH)) / (nRing + 1));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rb = box(g, rib, 0.06, pcmTop - smH - 0.1, 0.03, 0, 0, 0);
    rb.position.set(Math.sin(a) * (R + 0.005), (pcmTop + smH) / 2, Math.cos(a) * (R + 0.005));
    rb.rotation.y = a;
  }
  // forward dome to the common berthing mechanism
  cyl(g, aluminium, R, 0.98, pcmTop, pcmTop + 0.33);
  berthRing(g, pcmTop + 0.33, 0.98, white, dark);

  // arrays at the service module / PCM joint
  const am = arrayMats(0x172a5c);
  const ay = smH - 0.1;
  if (fanArrays) {
    fan(g, am, R + 0.55, ay + 0.5, 1.95, 1);
    fan(g, am, R + 0.55, ay + 0.5, 1.95, -1);
  } else {
    for (const s of [1, -1]) {
      const w = wing(g, am, R + 0.2, ay + 0.3, 3.6, 2.0, 3, s === 1 ? 0 : Math.PI);
      w.position.y = ay + 0.3;
    }
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// HTV and HTV-X
// ---------------------------------------------------------------------------------------------

/** Open exposed-cargo section: half shell, floor pallet, two bulkhead rings and a payload box. */
function openCargoBay(
  g: THREE.Object3D,
  y0: number,
  y1: number,
  r: number,
  shell: Mat,
  frame: Mat,
  payload: Mat,
): void {
  const half = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, y1 - y0, 40, 1, true, Math.PI / 2, Math.PI),
    shell,
  );
  half.position.y = (y0 + y1) / 2;
  g.add(half);
  for (const y of [y0 + 0.05, y1 - 0.05]) cyl(g, frame, r, r, y - 0.05, y + 0.05, 48);
  // pallet floor in the open (+z) half
  const pallet = box(g, frame, r * 1.35, y1 - y0 - 0.2, 0.1, 0, (y0 + y1) / 2, r * 0.1);
  pallet.position.z = r * 0.12;
  const px = box(g, payload, r * 0.9, (y1 - y0) * 0.55, r * 0.55, 0, (y0 + y1) / 2, r * 0.45);
  px.position.z = r * 0.46;
  // longerons along the open edge
  for (const sx of [-1, 1]) {
    box(g, frame, 0.1, y1 - y0, 0.1, sx * r, (y0 + y1) / 2, 0);
  }
}

function buildHtv(): THREE.Group {
  const g = new THREE.Group();
  const R = 2.2;
  const gold = mat(0xc19a3e, 0.65, 0.4);
  const silver = mat(0xcdd0d4, 0.7, 0.4);
  const white = mat(0xe6e6e2, 0.25, 0.6);
  const rib = mat(0xa5a9af, 0.8, 0.4);
  const dark = mat(0x1c1d22, 0.4, 0.6);
  const cellMat = mat(0x1b2c5e, 0.6, 0.3);
  const frame = mat(0x8e9298, 0.7, 0.45, true);

  // propulsion module: gold MLI drum, 4 main engines, thruster pods, body solar cells
  const pmTop = 1.8;
  cyl(g, gold, R * 0.62, R, 0.35, 0.75);
  cyl(g, gold, R, R, 0.75, pmTop);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    nozzle(
      g,
      dark,
      new THREE.Vector3(sx * 0.7, 0.18, sz * 0.7),
      new THREE.Vector3(0, -1, 0),
      0.22,
      0.4,
    );
  }
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, R, 1.25, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.55, 0.6, 0.14);
  }
  torus(g, rib, R, 0.04, pmTop);

  // avionics module with body-mounted cells
  const avTop = 2.8;
  cyl(g, silver, R, R, pmTop, avTop);
  for (const a0 of [-0.9, 2.2]) {
    const cells = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.8, 24, 1, true, a0, 1.6),
      cellMat,
    );
    cells.position.y = (pmTop + avTop) / 2;
    g.add(cells);
  }

  // unpressurised logistics carrier: open bay
  const ulcTop = 6.0;
  openCargoBay(
    g,
    avTop,
    ulcTop,
    R,
    mat(0xb8bbc1, 0.7, 0.45, true),
    frame,
    mat(0xd8d8d4, 0.3, 0.55),
  );

  // pressurised logistics carrier
  const plcTop = 9.8 - 0.26;
  cyl(g, white, R, R, ulcTop, plcTop);
  const n = 7;
  for (let i = 1; i <= n; i++)
    torus(g, rib, R + 0.005, 0.025, ulcTop + (i * (plcTop - ulcTop)) / (n + 1));
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rb = box(g, rib, 0.07, plcTop - ulcTop - 0.1, 0.03, 0, 0, 0);
    rb.position.set(Math.sin(a) * (R + 0.005), (plcTop + ulcTop) / 2, Math.cos(a) * (R + 0.005));
    rb.rotation.y = a;
  }
  const cells = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.012, R + 0.012, 1.4, 24, 1, true, 2.4, 1.5),
    cellMat,
  );
  cells.position.y = ulcTop + 1.0;
  g.add(cells);
  cyl(g, white, R, 1.0, plcTop - 0.01, plcTop + 0.01);
  berthRing(g, plcTop, 1.0, silver, dark);
  return g;
}

function buildHtvX(): THREE.Group {
  const g = new THREE.Group();
  const R = 2.2;
  const gold = mat(0xc19a3e, 0.65, 0.4);
  const silver = mat(0xcdd0d4, 0.7, 0.4);
  const white = mat(0xe6e6e2, 0.25, 0.6);
  const rib = mat(0xa5a9af, 0.8, 0.4);
  const dark = mat(0x1c1d22, 0.4, 0.6);
  const frame = mat(0x8e9298, 0.7, 0.45, true);

  // service module 0 – 2.7 m
  cyl(g, gold, R * 0.7, R, 0.3, 0.7);
  cyl(g, gold, R, R, 0.7, 2.7);
  lathe(g, dark, [
    [0.4, 0.0],
    [0.34, 0.12],
    [0.2, 0.34],
    [0.18, 0.4],
  ]);
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, R, 1.9, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.55, 0.6, 0.14);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = box(g, white, 0.8, 0.9, 0.03, 0, 0, 0);
    p.position.set(Math.sin(a) * (R + 0.01), 1.1, Math.cos(a) * (R + 0.01));
    p.rotation.y = a;
  }
  torus(g, rib, R, 0.04, 2.7);

  // unpressurised cargo support system 2.7 – 4.5 m
  openCargoBay(g, 2.7, 4.5, R, mat(0xb8bbc1, 0.7, 0.45, true), frame, mat(0xd8d8d4, 0.3, 0.55));

  // pressurised module 4.5 – 8.0 m
  const top = 8.0 - 0.26;
  cyl(g, white, R, R, 4.5, top);
  for (let i = 1; i <= 5; i++) torus(g, rib, R + 0.005, 0.025, 4.5 + (i * (top - 4.5)) / 6);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rb = box(g, rib, 0.07, top - 4.6, 0.03, 0, 0, 0);
    rb.position.set(Math.sin(a) * (R + 0.005), (top + 4.5) / 2, Math.cos(a) * (R + 0.005));
    rb.rotation.y = a;
  }
  cyl(g, white, R, 1.0, top - 0.01, top + 0.01);
  berthRing(g, top, 1.0, silver, dark);

  // deployable arrays: 18.2 m span
  const am = arrayMats(0x172a5c);
  const L = (18.2 - 2 * R) / 2;
  for (const s of [0, Math.PI]) wing(g, am, R + 0.1, 1.5, L - 0.1, 1.9, 4, s);
  return g;
}

// ---------------------------------------------------------------------------------------------
// ATV
// ---------------------------------------------------------------------------------------------

function buildAtv(): THREE.Group {
  const g = new THREE.Group();
  const R = 2.25;
  const grey = mat(0xb9bcc1, 0.55, 0.5);
  const white = mat(0xe4e4e0, 0.25, 0.6);
  const silver = mat(0xcfd2d6, 0.7, 0.4);
  const rib = mat(0x9ea2a8, 0.8, 0.4);
  const dark = mat(0x1c1d22, 0.4, 0.6);
  const gold = mat(0xb4903f, 0.65, 0.4);

  // aft section (propulsion + avionics): 4 main engines, 28 thrusters
  const asrTop = 3.4;
  cyl(g, gold, R * 0.8, R, 0.7, 1.0);
  cyl(g, grey, R, R, 1.0, asrTop);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    nozzle(
      g,
      dark,
      new THREE.Vector3(sx * 0.9, 0.35, sz * 0.9),
      new THREE.Vector3(0, -1, 0),
      0.24,
      0.7,
    );
  }
  cyl(g, dark, R * 0.8, R * 0.8, 0.69, 0.71);
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, R, 2.9, (i / 4) * Math.PI * 2, 0.6, 0.5, 0.14);
    rcsPod(g, silver, dark, R, 1.5, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.6, 0.5, 0.14);
  }
  torus(g, rib, R, 0.04, asrTop);

  // integrated cargo carrier: micrometeoroid shielding, grey-white panels
  const iccTop = 8.9;
  cyl(g, white, R, R, asrTop, iccTop);
  const n = 8;
  for (let i = 1; i <= n; i++)
    torus(g, rib, R + 0.005, 0.025, asrTop + (i * (iccTop - asrTop)) / (n + 1));
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const rb = box(g, grey, 0.08, iccTop - asrTop - 0.1, 0.03, 0, 0, 0);
    rb.position.set(Math.sin(a) * (R + 0.005), (iccTop + asrTop) / 2, Math.cos(a) * (R + 0.005));
    rb.rotation.y = a;
  }
  // forward cone and Russian docking system with probe
  cyl(g, white, R, 1.05, iccTop, iccTop + 0.65);
  cyl(g, silver, 1.05, 1.05, iccTop + 0.65, 9.75);
  bolts(g, dark, 1.0, 9.76, 12, 0.07);
  cyl(g, dark, 0.85, 0.85, 9.74, 9.77, 32);
  cyl(g, rib, 0.045, 0.045, 9.75, 10.2, 8);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), silver);
  head.position.y = 10.2;
  g.add(head);
  cyl(g, silver, 0.1, 0.02, 10.2, 10.3, 8);

  // four wings in an X, 22.3 m tip to tip (diagonal)
  const am = arrayMats(0x162858);
  const reach = 22.3 / 2;
  for (let k = 0; k < 4; k++) {
    const w = wing(g, am, R + 0.1, 3.0, reach - R - 0.1, 1.7, 4, Math.PI / 4 + (k * Math.PI) / 2);
    w.rotation.y = Math.PI / 4 + (k * Math.PI) / 2;
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Tianzhou
// ---------------------------------------------------------------------------------------------

function buildTianzhou(): THREE.Group {
  const g = new THREE.Group();
  const Rc = 1.675;
  const Rp = 1.4;
  const gold = mat(0xbf9a42, 0.65, 0.4);
  const white = mat(0xe6e6e2, 0.25, 0.6);
  const silver = mat(0xc9ccd0, 0.7, 0.4);
  const rib = mat(0x9ea2a8, 0.8, 0.4);
  const dark = mat(0x1c1d22, 0.4, 0.6);

  // propulsion module 0 – 3.2 m
  const pmTop = 3.2;
  cyl(g, gold, Rp * 0.8, Rp, 0.5, 0.8);
  cyl(g, gold, Rp, Rp, 0.8, pmTop);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    nozzle(
      g,
      dark,
      new THREE.Vector3(sx * 0.6, 0.25, sz * 0.6),
      new THREE.Vector3(0, -1, 0),
      0.2,
      0.5,
    );
  }
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, Rp, 2.7, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.5, 0.5, 0.12);
    rcsPod(g, silver, dark, Rp, 1.3, (i / 4) * Math.PI * 2, 0.5, 0.5, 0.12);
  }
  torus(g, rib, Rp, 0.035, 1.0);
  // transition to the cargo module
  cyl(g, silver, Rp, Rc, pmTop, pmTop + 0.5);

  // cargo module 3.7 – 10.1 m
  const cTop = 10.1;
  const cBot = pmTop + 0.5;
  cyl(g, white, Rc, Rc, cBot, cTop);
  const n = 6;
  for (let i = 1; i <= n; i++)
    torus(g, rib, Rc + 0.005, 0.022, cBot + (i * (cTop - cBot)) / (n + 1));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rb = box(g, silver, 0.07, cTop - cBot - 0.1, 0.03, 0, 0, 0);
    rb.position.set(Math.sin(a) * (Rc + 0.005), (cTop + cBot) / 2, Math.cos(a) * (Rc + 0.005));
    rb.rotation.y = a;
  }
  // docking end
  cyl(g, white, Rc, 0.85, cTop, cTop + 0.3);
  cyl(g, silver, 0.85, 0.85, cTop + 0.3, 10.6, 40);
  bolts(g, dark, 0.8, 10.57, 12, 0.06);
  cyl(g, dark, 0.65, 0.65, 10.57, 10.6, 32);

  // two wings, 14.9 m span
  const am = arrayMats(0x172a5c);
  const L = (14.9 - 2 * Rp) / 2;
  for (const s of [0, Math.PI]) wing(g, am, Rp + 0.1, 2.0, L - 0.1, 2.2, 4, s);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Shenzhou
// ---------------------------------------------------------------------------------------------

function buildShenzhou(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xe8e8e4, 0.2, 0.6);
  const cream = mat(0xd9d6cb, 0.3, 0.55);
  const silver = mat(0xc4c7cc, 0.7, 0.4);
  const gold = mat(0xbf9a42, 0.65, 0.4);
  const shield = mat(0x3a2f26, 0.2, 0.8);
  const dark = mat(0x1c1d22, 0.4, 0.6);
  const glass = mat(0x0a0e16, 0.9, 0.12);
  const rib = mat(0xa1a5ab, 0.8, 0.4);

  // service module 0 – 2.94 m: 2.5 m drum, flared to 2.8 m at the shoulder
  const smTop = 2.94;
  cyl(g, gold, 0.8, 1.25, 0.35, 0.6);
  cyl(g, cream, 1.25, 1.25, 0.6, 2.1);
  cyl(g, cream, 1.25, 1.4, 2.1, 2.6);
  cyl(g, silver, 1.4, 1.4, 2.6, smTop);
  for (const [sx, sz] of [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    nozzle(
      g,
      dark,
      new THREE.Vector3(sx * 0.45, 0.22, sz * 0.45),
      new THREE.Vector3(0, -1, 0),
      0.17,
      0.45,
    );
  }
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, 1.4, 2.45, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.4, 0.4, 0.1);
    rcsPod(g, silver, dark, 1.25, 1.0, (i / 4) * Math.PI * 2, 0.4, 0.4, 0.1);
  }
  torus(g, rib, 1.4, 0.03, 2.6);

  // re-entry module 2.94 – 5.44 m: bell with dark ablative base
  lathe(g, shield, [
    [0, smTop + 0.05],
    [0.8, smTop + 0.08],
    [1.2, smTop + 0.22],
    [1.26, smTop + 0.4],
  ]);
  lathe(g, white, [
    [1.26, smTop + 0.4],
    [1.0, smTop + 1.5],
    [0.72, smTop + 2.25],
    [0.62, 5.44],
  ]);
  for (const a of [-0.35, 0.35]) {
    const w = add(g, new THREE.Group());
    w.rotation.y = a;
    const p = box(w, glass, 0.16, 0.2, 0.02, 0, smTop + 1.25, 0);
    p.position.z = 1.07;
    p.rotation.x = -0.26;
  }

  // orbital module 5.44 – 8.24 m
  const oTop = 8.24;
  cyl(g, silver, 0.62, 0.62, 5.44, 5.64);
  cyl(g, white, 1.0, 1.125, 5.64, 6.2);
  cyl(g, white, 1.125, 1.125, 6.2, oTop - 0.15);
  cyl(g, white, 1.125, 0.78, oTop - 0.15, oTop);
  for (const y of [6.2, 7.2, 8.0]) torus(g, rib, 1.13, 0.025, y);
  const win = box(g, glass, 0.2, 0.3, 0.03, 0, 7.0, 1.14);
  win.rotation.x = 0;
  // docking mechanism and antennas to 9.25 m
  cyl(g, silver, 0.78, 0.55, oTop, oTop + 0.5, 32);
  cyl(g, dark, 0.5, 0.5, oTop + 0.5, oTop + 0.55, 24);
  bolts(g, dark, 0.54, oTop + 0.52, 10, 0.05);
  cyl(g, silver, 0.2, 0.2, oTop + 0.55, 9.25, 16);
  cyl(g, dark, 0.14, 0.14, 9.2, 9.25, 12);

  // service-module wings: 17 m span, 2.6 m wide
  const am = arrayMats(0x172a5c);
  const L = (17 - 2 * 1.4) / 2;
  for (const s of [0, Math.PI]) wing(g, am, 1.5, 1.55, L - 0.1, 2.6, 4, s);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Apollo CSM
// ---------------------------------------------------------------------------------------------

function buildApolloCsm(block2: boolean): THREE.Group {
  const g = new THREE.Group();
  const R = 1.955;
  const smBot = 2.83;
  const smTop = 7.35;
  const white = mat(0xe6e6e1, 0.25, 0.55);
  const silver = mat(0xc4c7cc, 0.75, 0.4);
  const rib = mat(0x9fa3a9, 0.8, 0.4);
  const dark = mat(0x1c1d22, 0.4, 0.6);
  const bell = mat(0x6e6a63, 0.7, 0.5, true);
  const shield = mat(0x7b4a24, 0.3, 0.75);
  const glass = mat(0x0a0e16, 0.9, 0.12);
  const cmWhite = mat(0xdddad2, 0.35, 0.5);

  // SPS engine bell, 2.5 m exit, exit plane at y = 0
  lathe(
    g,
    bell,
    [
      [1.25, 0.0],
      [1.12, 0.35],
      [0.86, 0.85],
      [0.6, 1.5],
      [0.4, 2.1],
      [0.3, 2.6],
      [0.45, smBot + 0.05],
    ],
    40,
  );
  torus(g, rib, 1.25, 0.03, 0.03);

  // service module
  cyl(g, white, R, R, smBot, smTop, 60);
  cyl(g, silver, R, R, smBot - 0.03, smBot + 0.1, 60);
  // aft heat-shield skirt
  cyl(g, rib, R * 0.4, R * 0.4, smBot - 0.1, smBot + 0.02, 24);
  // sector beams between the bays
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = box(g, rib, 0.05, smTop - smBot - 0.05, 0.03, 0, 0, 0);
    b.position.set(Math.sin(a) * (R + 0.005), (smTop + smBot) / 2, Math.cos(a) * (R + 0.005));
    b.rotation.y = a;
  }
  // horizontal bay lines
  for (const y of [smBot + 1.4, smBot + 3.1]) torus(g, rib, R + 0.005, 0.02, y);
  // radiator panels (dark-edged) high on the SM
  for (const a of [Math.PI / 8, Math.PI + Math.PI / 8]) {
    const w = add(g, new THREE.Group());
    w.rotation.y = a;
    box(w, silver, 1.1, 1.8, 0.02, 0, smTop - 1.1, R + 0.01);
  }
  // umbilical fairing along one side
  const fa = add(g, new THREE.Group());
  fa.rotation.y = Math.PI / 2;
  box(fa, white, 0.7, 2.4, 0.22, 0, smTop - 1.3, R + 0.08);
  // RCS quads
  for (let i = 0; i < 4; i++) {
    rcsPod(g, silver, dark, R, smTop - 1.0, (i / 4) * Math.PI * 2 + Math.PI / 4, 0.5, 1.0, 0.28);
  }
  // separation plane
  torus(g, dark, R, 0.04, smTop);

  if (block2) {
    // stowed high-gain antenna on the aft SM wall
    const h = add(g, new THREE.Group());
    h.rotation.y = Math.PI;
    box(h, rib, 1.0, 0.7, 0.12, 0, smBot + 0.9, R + 0.08);
    for (const [dx, dy] of [
      [-0.24, -0.16],
      [0.24, -0.16],
      [-0.24, 0.16],
      [0.24, 0.16],
    ]) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), silver);
      d.rotation.x = Math.PI / 2;
      d.position.set(dx, smBot + 0.9 + dy, R + 0.17);
      h.add(d);
    }
    box(h, silver, 0.2, 0.2, 0.05, 0, smBot + 0.9, R + 0.2);
  }

  // command module
  const cm = add(g, new THREE.Group());
  cm.position.y = smTop;
  lathe(cm, shield, [
    [0.0, 0.0],
    [0.9, 0.04],
    [1.55, 0.16],
    [1.85, 0.3],
    [R, 0.5],
  ]);
  lathe(cm, cmWhite, [
    [R, 0.5],
    [0.62, 2.7],
  ]);
  torus(cm, shield, R - 0.02, 0.05, 0.5);
  // forward compartment + apex
  cyl(cm, cmWhite, 0.62, 0.58, 2.7, 3.25, 32);
  torus(cm, silver, 0.6, 0.04, 2.7);
  // windows on the conic skin: rendezvous pair, side pair, hatch
  const slope = Math.atan((R - 0.62) / 2.2);
  const coneR = (y: number): number => R - ((y - 0.5) * (R - 0.62)) / 2.2;
  for (const [a, y, w, h] of [
    [0.45, 2.15, 0.2, 0.3],
    [-0.45, 2.15, 0.2, 0.3],
    [Math.PI / 2, 1.55, 0.3, 0.3],
    [-Math.PI / 2, 1.55, 0.3, 0.3],
  ] as [number, number, number, number][]) {
    const wr = add(cm, new THREE.Group());
    wr.rotation.y = a;
    const p = box(wr, glass, w, h, 0.03, 0, y, coneR(y) + 0.01);
    p.rotation.x = -slope;
  }
  const hatchW = add(cm, new THREE.Group());
  hatchW.rotation.y = Math.PI;
  const hatch = box(hatchW, silver, 0.85, 0.85, 0.03, 0, 1.2, coneR(1.2) + 0.01);
  hatch.rotation.x = -slope;
  box(hatchW, glass, 0.3, 0.3, 0.035, 0, 1.2, coneR(1.2) + 0.02).rotation.x = -slope;
  // CM RCS thruster nubs near the shoulder
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const wr = add(cm, new THREE.Group());
    wr.rotation.y = a;
    box(wr, dark, 0.12, 0.1, 0.05, 0, 0.9, coneR(0.9) + 0.02).rotation.x = -slope;
  }

  if (block2) {
    // forward docking ring and probe
    cyl(cm, silver, 0.7, 0.62, 3.25 - 0.05, 3.25 + 0.0, 32);
    torus(cm, silver, 0.62, 0.05, 3.25);
    cyl(cm, rib, 0.05, 0.05, 3.25, 3.65, 8);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.06, 16), silver);
    head.position.y = 3.62;
    cm.add(head);
  } else {
    // Block I: smooth forward hatch cover
    cyl(cm, cmWhite, 0.58, 0.45, 3.25 - 0.25, 3.25, 32);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 20, 8, 0, Math.PI * 2, 0, 0.4),
      cmWhite,
    );
    cap.position.y = 3.25 - 0.45;
    cm.add(cap);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------

const WIKI = (title: string, what: string): ShowcaseRef => ({
  l: `Wikipedia — ${what}`,
  u: `https://en.wikipedia.org/wiki/${title}`,
});

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'cygnus-standard': {
    build: () => buildCygnus(5.14, false),
    heightM: 5.14,
    diameterM: 3.07,
    refs: [WIKI('Cygnus_(spacecraft)', 'Cygnus: 5.14 m length, 3.07 m diameter, Standard variant')],
  },
  'cygnus-enhanced': {
    build: () => buildCygnus(6.39, true),
    heightM: 6.39,
    diameterM: 3.07,
    refs: [WIKI('Cygnus_(spacecraft)', 'Cygnus: 6.39 m length, UltraFlex fan arrays')],
  },
  htv: {
    build: buildHtv,
    heightM: 9.8,
    diameterM: 4.4,
    refs: [WIKI('H-II_Transfer_Vehicle', 'HTV: about 9.8 m incl. thrusters, 4.4 m diameter')],
  },
  'htv-x': {
    build: buildHtvX,
    heightM: 8,
    diameterM: 4.4,
    refs: [
      WIKI(
        'HTV-X',
        'HTV-X: 8 m, 4.4 m, 18.2 m array span, 2.7 m service and 3.5 m pressurised module',
      ),
    ],
  },
  atv: {
    build: buildAtv,
    heightM: 10.3,
    diameterM: 4.5,
    refs: [WIKI('Automated_Transfer_Vehicle', 'ATV: 10.3 m, 4.5 m, 22.3 m array span')],
  },
  tianzhou: {
    build: buildTianzhou,
    heightM: 10.6,
    diameterM: 3.35,
    refs: [WIKI('Tianzhou_(spacecraft)', 'Tianzhou: 10.6 m, 3.35 m, 14.9 m array span')],
  },
  shenzhou: {
    build: buildShenzhou,
    heightM: 9.25,
    diameterM: 2.8,
    refs: [
      WIKI(
        'Shenzhou_(spacecraft)',
        'Shenzhou: 9.25 m, orbital 2.8 m, re-entry 2.5 m, service 2.94 m, 17 m span',
      ),
    ],
  },
  'apollo-csm-block-i': {
    build: () => buildApolloCsm(false),
    heightM: 10.6,
    diameterM: 3.91,
    refs: [
      WIKI(
        'Apollo_command_and_service_module',
        'CSM: SM 4.52 m, 3.91 m diameter, SPS nozzle 3.88 m; Block I has no docking probe',
      ),
    ],
  },
  'apollo-csm-block-ii': {
    build: () => buildApolloCsm(true),
    heightM: 11,
    diameterM: 3.91,
    refs: [
      WIKI(
        'Apollo_command_and_service_module',
        'CSM total about 11.0 m, SM 4.52 m, 3.91 m diameter',
      ),
      {
        l: 'NSSDCA — Apollo 11 CSM: 11.0 m long, CM 3.65 m high',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A',
      },
    ],
  },
};
