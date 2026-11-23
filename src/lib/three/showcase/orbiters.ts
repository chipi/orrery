/**
 * Showcase models: planetary orbiters built from two shared builders. `buildBoxOrbiter` covers
 * the box-bus Mars and Moon orbiters (Mars Express, MAVEN, Mangalyaan, Hope, LRO) from per-craft
 * parameters; `buildMariner` covers the octagonal-frame Mariners (4, 9 and, as a plain function,
 * 10). Each stands upright with the bus axis vertical, arrays and dishes deployed in x / z, and
 * the whole craft's height equal to the sourced overall length in the fleet entry.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { crinkle, foilSheet } from './kit';

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

/** Cylinder / frustum between two heights on the y axis, at (x, z). */
function cyl(
  g: THREE.Object3D,
  m: Mat,
  rBot: number,
  rTop: number,
  y0: number,
  y1: number,
  x = 0,
  z = 0,
  seg = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** Thin round strut between two points. */
function strut(g: THREE.Object3D, m: Mat, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  add(g, mesh);
}

const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

interface Mats {
  cell: Mat;
  line: Mat;
  frame: Mat;
  dark: Mat;
  white: Mat;
  dishM: Mat;
  metal: Mat;
}

function mats(): Mats {
  return {
    cell: mat(0x1a2a55, 0.6, 0.3, true),
    line: mat(0xc9a64a, 0.7, 0.35),
    frame: mat(0xb9bcc2, 0.5, 0.45),
    dark: mat(0x1b1c20, 0.4, 0.6),
    white: mat(0xe8e8e4, 0.2, 0.6),
    dishM: mat(0xe3e4e6, 0.35, 0.4, true),
    metal: mat(0x9a9ea5, 0.7, 0.4),
  };
}

/**
 * Row of rectangular panels along +x from `x0`, flat face toward +z, `wid` tall, centred on y = 0.
 * Panels from index `kinkFrom` on are folded about the vertical joint axis by `kinkDeg` toward -z
 * (the gull wing).
 */
function panelRow(
  parent: THREE.Object3D,
  m: Mats,
  x0: number,
  panelLen: number,
  wid: number,
  n: number,
  kink?: { from: number; deg: number },
  gap = 0.04,
): THREE.Group {
  const row = add(parent, new THREE.Group());
  const step = panelLen + gap;
  let host: THREE.Object3D = row;
  for (let i = 0; i < n; i++) {
    if (kink && i === kink.from) {
      const hinge = add(row, new THREE.Group());
      hinge.position.x = x0 + i * step - gap / 2;
      hinge.rotation.y = THREE.MathUtils.degToRad(kink.deg);
      host = hinge;
    }
    const cx =
      kink && i >= kink.from
        ? (i - kink.from) * step + gap / 2 + panelLen / 2
        : x0 + i * step + panelLen / 2;
    box(host, m.frame, panelLen, wid, 0.04, cx, 0, 0);
    box(host, m.cell, panelLen - 0.1, wid - 0.1, 0.05, cx, 0, 0);
    const cols = Math.max(3, Math.round(panelLen / 0.35));
    for (let c = 1; c < cols; c++)
      box(
        host,
        m.line,
        0.012,
        wid - 0.1,
        0.056,
        cx - panelLen / 2 + 0.05 + ((panelLen - 0.1) * c) / cols,
        0,
        0,
      );
    const rows = Math.max(2, Math.round(wid / 0.45));
    for (let r = 1; r < rows; r++)
      box(
        host,
        m.line,
        panelLen - 0.1,
        0.012,
        0.056,
        cx,
        -wid / 2 + 0.05 + ((wid - 0.1) * r) / rows,
        0,
      );
  }
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  row.userData.solarArray = true;
  return row;
}

/**
 * Parabolic dish, vertex at the origin, axis +y, `depth` = 0.3 R, with a feed on a short stem.
 * `squash` < 1 turns it into the elliptical Mariner-4 high-gain antenna.
 */
function dishMesh(m: Mats, R: number, squash = 1): THREE.Group {
  const g = new THREE.Group();
  const depth = 0.3 * R;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector2((R * i) / 12, depth * (i / 12) ** 2));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), m.dishM);
  bowl.scale.z = squash;
  g.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012 + R * 0.01, 6, 40), m.frame);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = depth;
  rim.scale.y = squash;
  g.add(rim);
  const hubStem = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.04, R * 0.04, depth * 1.3, 8),
    m.metal,
  );
  hubStem.position.y = depth * 0.65;
  g.add(hubStem);
  const horn = new THREE.Mesh(new THREE.ConeGeometry(R * 0.07, R * 0.14, 12), m.dark);
  horn.position.y = depth * 1.3 + R * 0.07;
  g.add(horn);
  return g;
}

/** Place a dish with its vertex at `v`; the axis tilts `elev` degrees above horizontal toward +z. */
function placeDish(parent: THREE.Object3D, d: THREE.Group, v: THREE.Vector3, elev: number): void {
  const e = THREE.MathUtils.degToRad(elev);
  d.position.copy(v);
  d.quaternion.setFromUnitVectors(v3(0, 1, 0), v3(0, Math.sin(e), Math.cos(e)));
  parent.add(d);
}

// ---------------------------------------------------------------------------------------------
// Shared box-bus orbiter
// ---------------------------------------------------------------------------------------------

export interface BoxOrbiterCfg {
  /** Bus [width x, height y, depth z] in metres. */
  bus: [number, number, number];
  /** Six-sided bus (flat faces toward +/-z) instead of a rectangular box; `w` is flat-to-flat. */
  hex?: boolean;
  /** Gold thermal blanket on the bus; otherwise silver-grey. */
  gold?: boolean;
  arrays: {
    sides: (1 | -1)[];
    panels: number;
    panelLen: number;
    panelWid: number;
    /** Height of the array centre line. */
    y: number;
    /** Gap between the bus face and the first panel. */
    strut: number;
    gull?: { from: number; deg: number };
    /** Magnetometer box on a short boom at each array tip. */
    tipMag?: boolean;
  };
  dish: {
    d: number;
    /** Dish vertex. */
    vertex: [number, number, number];
    /** Axis elevation above horizontal, toward +z. */
    elev: number;
    /** Where the boom leaves the bus. */
    mount: [number, number, number];
  };
}

export function buildBoxOrbiter(cfg: BoxOrbiterCfg): THREE.Group {
  const g = new THREE.Group();
  const m = mats();
  const [w, h, d] = cfg.bus;
  const skin = mat(cfg.gold ? 0xc59a3c : 0xaeb2b8, cfg.gold ? 0.85 : 0.6, cfg.gold ? 0.3 : 0.45);
  const trim = mat(cfg.gold ? 0x8a6a22 : 0x6f737a, 0.6, 0.5);

  // bus
  let faceX = w / 2;
  let faceZ = d / 2;
  if (cfg.hex) {
    const R = w / 2 / Math.cos(Math.PI / 6);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, 6), skin);
    body.rotation.y = Math.PI / 6;
    body.position.y = h / 2;
    g.add(body);
    faceX = R;
    faceZ = R * Math.cos(Math.PI / 6) * (d / w);
    body.scale.z = d / w;
  } else {
    box(g, skin, w, h, d, 0, h / 2, 0);
  }
  // deck plates and equipment bands
  box(g, trim, w * 0.96, 0.05, d * 0.96, 0, 0.03, 0);
  box(g, trim, w * 0.96, 0.05, d * 0.96, 0, h - 0.03, 0);
  const band = (y: number) => box(g, trim, w * 1.01, 0.03, d * 1.01, 0, y, 0);
  band(h * 0.33);
  band(h * 0.66);
  // radiator and instrument aperture on the back (-z) face, star trackers and thrusters on the front
  box(g, m.white, w * 0.5, h * 0.28, 0.03, -w * 0.12, h * 0.5, -faceZ - 0.012);
  for (let i = 0; i < 5; i++)
    box(g, m.metal, w * 0.5, 0.012, 0.04, -w * 0.12, h * 0.38 + i * h * 0.056, -faceZ - 0.03);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.05, h * 0.05, 0.1, 16), m.dark);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(w * 0.3, h * 0.78, -faceZ - 0.04);
  g.add(lens);
  for (const sx of [-1, 1]) {
    const tracker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.18, 12, 1, true),
      m.dark,
    );
    tracker.rotation.x = Math.PI / 2;
    tracker.position.set(sx * w * 0.3, h * 0.2, faceZ + 0.08);
    g.add(tracker);
    box(g, m.dark, 0.1, 0.1, 0.1, sx * faceX * 0.55, h - 0.1, faceZ * 0.5);
  }
  // reaction control thrusters at the lower corners
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const th = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.14, 10), m.dark);
      th.position.set(sx * w * 0.42, 0.18, sz * faceZ * 0.8);
      th.rotation.z = (sx * Math.PI) / 3;
      g.add(th);
    }

  // arrays
  const a = cfg.arrays;
  for (const side of a.sides) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = side;
    wrap.position.y = a.y;
    const x0 = faceX + a.strut;
    box(wrap, m.frame, a.strut + 0.12, 0.08, 0.08, faceX + a.strut / 2 - 0.06, 0, 0);
    // yoke bars to the panel edges
    box(wrap, m.frame, 0.06, a.panelWid * 0.9, 0.06, x0 + 0.03, 0, 0);
    const row = panelRow(wrap, m, x0, a.panelLen, a.panelWid, a.panels, a.gull);
    if (a.tipMag) {
      const reach = a.gull
        ? x0 +
          a.gull.from * (a.panelLen + 0.04) +
          (a.panels - a.gull.from) *
            (a.panelLen + 0.04) *
            Math.cos(THREE.MathUtils.degToRad(a.gull.deg))
        : x0 + a.panels * (a.panelLen + 0.04);
      const zOff = a.gull
        ? -(a.panels - a.gull.from) *
          (a.panelLen + 0.04) *
          Math.sin(THREE.MathUtils.degToRad(a.gull.deg))
        : 0;
      box(row, m.dark, 0.14, 0.14, 0.14, reach + 0.08, 0, zOff);
      strut(row, m.metal, v3(reach - 0.02, 0, zOff), v3(reach + 0.08, 0, zOff), 0.02);
    }
  }

  // high-gain dish on its boom
  const dc = cfg.dish;
  const vertex = v3(...dc.vertex);
  const mount = v3(...dc.mount);
  strut(g, m.metal, mount, vertex, 0.045);
  const dish = dishMesh(m, dc.d / 2);
  placeDish(g, dish, vertex, dc.elev);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Detailed builds: Mars Express, MAVEN, Mangalyaan, Hope, LRO and the Mariners
// ---------------------------------------------------------------------------------------------

const TAU = Math.PI * 2;

function pal() {
  return {
    gold: mat(0xd2a23a, 0.6, 0.35, true),
    goldDk: mat(0xa87a2c, 0.55, 0.42, true),
    silver: mat(0xc9ccd2, 0.6, 0.32, true),
    grey: mat(0x8f9298, 0.5, 0.5, true),
    dark: mat(0x2b2d31, 0.5, 0.6),
    black: mat(0x17181b, 0.5, 0.6, true),
    white: mat(0xe6e4de, 0.2, 0.55),
    whiteFoil: mat(0xe9e7e0, 0.25, 0.6, true),
    metal: mat(0xaeb2b9, 0.6, 0.38),
    frame: mat(0xc2c5cb, 0.55, 0.4),
    tape: mat(0xe6cf8a, 0.3, 0.45),
    cell: mat(0x16234e, 0.55, 0.3),
    cellLine: mat(0xa9b4d0, 0.5, 0.4),
    cream: mat(0xe8e0c6, 0.2, 0.55),
    dishW: Object.assign(mat(0xe3e4e6, 0.35, 0.42), { side: THREE.DoubleSide }),
    dishD: Object.assign(mat(0x2e2e33, 0.4, 0.5), { side: THREE.DoubleSide }),
    dishG: Object.assign(mat(0xd2a23a, 0.6, 0.35, true), { side: THREE.DoubleSide }),
    kapton: mat(0xd8a43a, 0.3, 0.6, true),
    teal: mat(0x6fb3a6, 0.3, 0.5),
  };
}
type P = ReturnType<typeof pal>;

/** Crinkled foil block: blanketed bus faces. */
function foilBox(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  amp = 0.012,
  step = 0.2,
): THREE.Mesh {
  const geo = crinkle(
    new THREE.BoxGeometry(
      w,
      h,
      d,
      Math.max(2, Math.round(w / step)),
      Math.max(2, Math.round(h / step)),
      Math.max(2, Math.round(d / step)),
    ),
    amp,
  );
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  return add(g, mesh);
}

/** Tape seams: vertical strips down a face and a horizontal band, on a box centred at (cx,cy,cz). */
function seams(
  g: THREE.Object3D,
  P: P,
  w: number,
  h: number,
  d: number,
  cx: number,
  cy: number,
  cz: number,
  nV = 3,
  nH = 2,
): void {
  for (const sz of [-1, 1]) {
    for (let i = 1; i <= nV; i++)
      box(
        g,
        P.tape,
        0.014,
        h * 1.002,
        0.012,
        cx - w / 2 + (w * i) / (nV + 1),
        cy,
        cz + (sz * d) / 2,
      );
    for (let i = 1; i <= nH; i++)
      box(
        g,
        P.tape,
        w * 1.002,
        0.014,
        0.012,
        cx,
        cy - h / 2 + (h * i) / (nH + 1),
        cz + (sz * d) / 2,
      );
  }
  for (const sx of [-1, 1])
    for (let i = 1; i <= nH; i++)
      box(
        g,
        P.tape,
        0.012,
        0.014,
        d * 1.002,
        cx + (sx * w) / 2,
        cy - h / 2 + (h * i) / (nH + 1),
        cz,
      );
}

/** Sit the craft exactly on y = 0 (crinkled blanket and bells move the lowest point a little). */
function grounded(g: THREE.Group): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const out = new THREE.Group();
  g.position.y -= b.min.y;
  out.add(g);
  return out;
}

/** A recessed engine bay in the base deck: a dark cup in a metal ring. */
function engineBay(g: THREE.Object3D, P: P, x: number, z: number, r: number): void {
  cyl(g, P.metal, r * 1.25, r * 1.25, 0, 0.06, x, z, 24);
  cyl(g, P.black, r, r * 0.8, 0, 0.08, x, z, 24);
}

function aim(o: THREE.Object3D, dir: THREE.Vector3): void {
  o.quaternion.setFromUnitVectors(v3(0, 1, 0), dir.clone().normalize());
}

/** A thruster bell with its base at `pos`, opening along `dir`. */
function nozzle(g: THREE.Object3D, P: P, pos: THREE.Vector3, dir: THREE.Vector3, r = 0.04): void {
  const len = r * 3.2;
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.9, r * 0.7, len, 14, 1, true),
    P.black,
  );
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.8, 12), P.metal);
  const grp = add(g, new THREE.Group());
  grp.position.copy(pos);
  aim(grp, dir);
  bell.position.y = len / 2;
  base.position.y = r * 0.2;
  grp.add(bell, base);
}

/** A cylinder along z from z0 to z0 + len, centred at (x, y). */
function barrel(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  len: number,
  x: number,
  y: number,
  z0: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), m);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(x, y, z0 + len / 2);
  return add(g, mesh);
}

/** Star tracker: a body with an open baffle toward +z. */
function tracker(g: THREE.Object3D, P: P, x: number, y: number, z: number, s = 1): void {
  box(g, P.dark, 0.14 * s, 0.14 * s, 0.12 * s, x, y, z);
  const baf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * s, 0.065 * s, 0.2 * s, 16, 1, true),
    P.black,
  );
  baf.rotation.x = Math.PI / 2;
  baf.position.set(x, y, z + 0.14 * s);
  g.add(baf);
  barrel(g, P.metal, 0.07 * s, 0.015, x, y, z + 0.06 * s);
}

/** One solar panel in the xy plane (cells face +z), centred on the origin. */
function cellPanel(
  parent: THREE.Object3D,
  P: P,
  len: number,
  wid: number,
  cell = 0.24,
): THREE.Group {
  const g = add(parent, new THREE.Group());
  box(g, P.frame, len, wid, 0.03, 0, 0, 0);
  box(g, P.cell, len - 0.05, wid - 0.05, 0.012, 0, 0, 0.018);
  const cols = Math.max(2, Math.round(len / cell));
  const rows = Math.max(2, Math.round(wid / cell));
  for (let c = 1; c < cols; c++)
    box(
      g,
      P.cellLine,
      0.006,
      wid - 0.05,
      0.004,
      -len / 2 + 0.025 + ((len - 0.05) * c) / cols,
      0,
      0.025,
    );
  for (let r = 1; r < rows; r++)
    box(
      g,
      P.cellLine,
      len - 0.05,
      0.006,
      0.004,
      0,
      -wid / 2 + 0.025 + ((wid - 0.05) * r) / rows,
      0.025,
    );
  // Back-side stiffening ribs.
  for (const f of [-0.33, 0.33]) box(g, P.frame, len * 0.96, 0.025, 0.04, 0, f * wid, -0.03);
  return g;
}

/** A wing of `n` panels along +x from the origin, hinge tapes between them. */
function solarWing(
  parent: THREE.Object3D,
  P: P,
  n: number,
  len: number,
  wid: number,
  gap = 0.04,
  cell = 0.24,
): THREE.Group {
  const wing = add(parent, new THREE.Group());
  for (let i = 0; i < n; i++) {
    const p = cellPanel(wing, P, len, wid, cell);
    p.position.x = i * (len + gap) + len / 2;
    if (i > 0) {
      for (const sy of [-0.35, 0.35])
        box(wing, P.metal, gap + 0.06, 0.07, 0.05, i * (len + gap) - gap / 2, sy * wid, 0);
    }
  }
  return wing;
}

/** Round dish with the vertex at the origin and the axis +y; ribs, rim, feed on a tripod. */
function rdish(P: P, R: number, skin: Mat, depthK = 0.22, feedK = 0.5): THREE.Group {
  const g = new THREE.Group();
  const d = R * depthK;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) pts.push(new THREE.Vector2((R * i) / 14, d * (i / 14) ** 2));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), skin));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.01 + R * 0.012, 6, 48), P.frame);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = d;
  g.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    strut(
      g,
      P.metal,
      v3(R * 0.12 * Math.cos(a), -0.015, R * 0.12 * Math.sin(a)),
      v3(R * Math.cos(a), d, R * Math.sin(a)),
      0.007,
    );
  }
  box(g, P.metal, R * 0.3, 0.05, R * 0.3, 0, -0.02, 0);
  const fy = d + R * feedK;
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3 + Math.PI / 2;
    strut(g, P.frame, v3(R * 0.97 * Math.cos(a), d, R * 0.97 * Math.sin(a)), v3(0, fy, 0), 0.012);
  }
  const horn = new THREE.Mesh(new THREE.ConeGeometry(R * 0.07, R * 0.16, 14), P.cream);
  horn.position.y = fy;
  horn.rotation.x = Math.PI;
  g.add(horn);
  const sub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.05, R * 0.05, R * 0.08, 12), P.metal);
  sub.position.y = fy + R * 0.1;
  g.add(sub);
  return g;
}

function placeDishDir(
  parent: THREE.Object3D,
  d: THREE.Group,
  v: THREE.Vector3,
  dir: THREE.Vector3,
): void {
  d.position.copy(v);
  aim(d, dir);
  parent.add(d);
}

/** Folded-frame yoke: a D-frame of grey bars `w` x `h` standing in the xy plane. */
function yoke(g: THREE.Object3D, P: P, x: number, y: number, w: number, h: number): void {
  const t = 0.07;
  box(g, P.grey, w, t, 0.05, x, y + h / 2 - t / 2, 0);
  box(g, P.grey, w, t, 0.05, x, y - h / 2 + t / 2, 0);
  box(g, P.grey, t, h, 0.05, x - w / 2 + t / 2, y, 0);
  box(g, P.grey, t, h, 0.05, x + w / 2 - t / 2, y, 0);
}

// -- Mars Express ----------------------------------------------------------------------------

function buildMarsExpress(): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  const W = 1.5;
  const H = 1.8;
  const D = 1.4;
  foilBox(g, P.silver, W, H - 0.03, D, 0, H / 2 - 0.015, 0, 0.012);
  seams(g, P, W, H, D, 0, H / 2, 0, 3, 3);
  // gold-blanket corner pieces and top/bottom decks
  box(g, P.goldDk, W * 1.03, 0.09, D * 1.03, 0, 0.045, 0);
  box(g, P.goldDk, W * 1.03, 0.09, D * 1.03, 0, H - 0.045, 0);
  for (const sx of [-1, 1])
    foilBox(g, P.gold, 0.06, H * 0.98, D * 0.5, sx * (W / 2 + 0.02), H / 2, -D * 0.2, 0.01);
  // nadir (+z) face: HRSC, OMEGA, SPICAM, PFS apertures
  box(g, P.frame, 0.45, 0.4, 0.42, 0.18, 1.2, D / 2 + 0.2);
  barrel(g, P.black, 0.09, 0.14, 0.1, 1.2, D / 2 + 0.38);
  barrel(g, P.black, 0.09, 0.14, 0.28, 1.2, D / 2 + 0.38);
  barrel(g, P.dark, 0.13, 0.25, -0.3, 0.7, D / 2);
  barrel(g, P.metal, 0.06, 0.18, 0.3, 0.62, D / 2);
  box(g, P.dark, 0.3, 0.22, 0.2, -0.25, 1.35, D / 2 + 0.1);
  tracker(g, P, 0.5, 1.6, D / 2 + 0.05);
  tracker(g, P, -0.5, 1.62, D / 2 + 0.05);
  for (const sx of [-1, 1])
    nozzle(g, P, v3(sx * 0.62, 0.16, D / 2 - 0.08), v3(sx * 0.4, -0.3, 0.9), 0.035);
  // main engine bell in the base deck
  engineBay(g, P, 0, -0.1, 0.1);
  // radiator on the back (-z) face
  box(g, P.white, 0.9, 0.9, 0.03, 0.1, 0.9, -D / 2 - 0.02);
  for (let i = 0; i < 7; i++)
    box(g, P.metal, 0.9, 0.012, 0.05, 0.1, 0.5 + i * 0.13, -D / 2 - 0.035);
  // arrays: D-frame yokes and four narrow panels per wing, ~11.4 m tip to tip
  for (const s of [-1, 1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = s;
    wrap.position.y = 0.9;
    box(wrap, P.metal, 0.5, 0.09, 0.09, W / 2 + 0.2, 0, 0);
    yoke(wrap, P, W / 2 + 0.55, 0, 0.5, 1.7);
    const wing = solarWing(wrap, P, 4, 1.12, 1.7, 0.03, 0.25);
    wing.position.x = W / 2 + 0.8;
    wing.userData.solarArray = true;
  }
  // 1.6 m high-gain dish on the back, tilted up toward Earth
  const dr = rdish(P, 0.8, P.dishW, 0.2, 0.42);
  placeDishDir(g, dr, v3(0, 0.55, -D / 2 - 0.35), v3(0, 0.82, -0.57));
  strut(g, P.metal, v3(0, 0.7, -D / 2), v3(0, 0.55, -D / 2 - 0.35), 0.05);
  return grounded(g);
}

// -- MAVEN -----------------------------------------------------------------------------------

function buildMaven(): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  const W = 2.29;
  const H = 2.0;
  foilBox(g, P.gold, W, H - 0.05, W, 0, H / 2 - 0.025, 0, 0.022, 0.18);
  seams(g, P, W, H, W, 0, H / 2, 0, 4, 3);
  box(g, P.frame, W * 1.03, 0.09, W * 1.03, 0, 0.045, 0);
  box(g, P.frame, W * 1.03, 0.09, W * 1.03, 0, H - 0.045, 0);
  // propellant tank dome showing through the +z face
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 32, 16, 0, TAU, 0, Math.PI / 2),
    P.silver,
  );
  dome.rotation.x = Math.PI / 2;
  dome.position.set(0, 0.95, W / 2 - 0.02);
  g.add(dome);
  // top deck: SEP and SWEA booms, EUV monitor, star trackers, Electra antenna
  for (const sx of [-1, 1]) {
    strut(g, P.metal, v3(sx * 0.9, H, 0.5), v3(sx * 1.05, H + 0.28, 0.5), 0.02);
    box(g, P.dark, 0.16, 0.12, 0.14, sx * 1.05, H + 0.34, 0.5);
    tracker(g, P, sx * 0.5, H + 0.05, 0.9, 0.9);
  }
  box(g, P.dark, 0.3, 0.2, 0.3, 0.45, H + 0.1, -0.7);
  barrel(g, P.cream, 0.08, 0.3, -0.5, H + 0.12, -0.8);
  // articulated payload platform boom out of the +z face: NGIMS, IUVS, STATIC
  strut(g, P.gold, v3(0, 0.45, W / 2), v3(0, 0.45, W / 2 + 1.4), 0.035);
  const app = add(g, new THREE.Group());
  app.position.set(0, 0.45, W / 2 + 1.4);
  box(app, P.frame, 0.36, 0.3, 0.26, 0, 0, 0.1);
  barrel(app, P.dark, 0.1, 0.22, 0.09, 0.02, 0.2);
  box(app, P.silver, 0.2, 0.14, 0.18, -0.2, -0.12, 0.1);
  barrel(app, P.black, 0.06, 0.18, -0.12, 0.1, 0.22);
  // thruster pods on the bottom corners
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(g, P.dark, 0.2, 0.16, 0.2, sx * (W / 2 + 0.06), 0.12, sz * (W / 2 + 0.06));
      nozzle(g, P, v3(sx * (W / 2 + 0.12), 0.12, sz * (W / 2 + 0.12)), v3(sx, 0, sz), 0.035);
    }
  // arrays: gull-wing pairs of 2.2 x 1.5 m panels, a magnetometer cone on each tip
  for (const s of [-1, 1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = s;
    wrap.position.y = 1.0;
    box(wrap, P.metal, 0.2, 0.1, 0.1, W / 2 + 0.07, 0, 0);
    const arr = add(wrap, new THREE.Group());
    arr.userData.solarArray = true;
    const x0 = W / 2 + 0.15;
    const inner = cellPanel(arr, P, 2.2, 1.5, 0.3);
    inner.position.x = x0 + 1.1;
    const hinge = add(arr, new THREE.Group());
    hinge.position.x = x0 + 2.2 + 0.04;
    hinge.rotation.y = THREE.MathUtils.degToRad(20);
    const outer = cellPanel(hinge, P, 2.2, 1.5, 0.3);
    outer.position.x = 1.1;
    for (const sy of [-0.5, 0.5]) box(arr, P.metal, 0.1, 0.1, 0.06, x0 + 2.22, sy, 0);
    const tipX = 2.2 * Math.cos(THREE.MathUtils.degToRad(20)) + 0.04;
    const tipZ = -2.2 * Math.sin(THREE.MathUtils.degToRad(20));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), P.grey);
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(tipX + 0.28, 0, tipZ);
    hinge.add(cone);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), P.gold);
    mag.position.set(tipX + 0.58, 0, tipZ);
    hinge.add(mag);
  }
  // 2 m high-gain dish on its gimbal boom
  const dr = rdish(P, 1.0, P.dishW, 0.22, 0.3);
  placeDishDir(g, dr, v3(0, 2.83, 0), v3(0, 0.94, 0.342));
  strut(g, P.frame, v3(0, H, 0), v3(0, 2.83, 0), 0.07);
  box(g, P.metal, 0.3, 0.2, 0.3, 0, 2.6, 0);
  return grounded(g);
}

// -- Mangalyaan ------------------------------------------------------------------------------

function buildMangalyaan(): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  const W = 1.5;
  const H = 1.36;
  foilBox(g, P.silver, W, H - 0.03, W, 0, H / 2 - 0.015, 0, 0.014);
  seams(g, P, W, H, W, 0, H / 2, 0, 3, 2);
  box(g, P.goldDk, W * 1.03, 0.09, W * 1.03, 0, H - 0.045, 0);
  box(g, P.goldDk, W * 1.03, 0.09, W * 1.03, 0, 0.045, 0);
  // gold blanket on the sun-facing corner strips
  for (const sz of [-1, 1])
    foilBox(g, P.gold, W * 0.98, H * 0.3, 0.05, 0, H * 0.78, sz * (W / 2 + 0.02), 0.012);
  // propellant tank dome on top in a collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 32), P.metal);
  collar.position.y = H + 0.01;
  g.add(collar);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 32, 12, 0, TAU, 0, Math.PI / 3.1),
    P.silver,
  );
  dome.scale.y = 0.55;
  dome.position.y = H - 0.14;
  g.add(dome);
  // medium-gain horn, LGA, and sun sensors on top corners
  strut(g, P.metal, v3(0.4, H, -0.45), v3(0.4, H + 0.12, -0.45), 0.025);
  barrel(g, P.gold, 0.06, 0.12, 0.4, H - 0.02, -0.55);
  box(g, P.dark, 0.1, 0.1, 0.1, -0.55, H + 0.03, -0.5);
  tracker(g, P, -0.5, H - 0.03, 0.5, 0.8);
  // payload faces: MSM, MCC, TIS, LAP, MENCA on +z
  barrel(g, P.dark, 0.1, 0.2, 0.28, 0.75, W / 2);
  barrel(g, P.black, 0.07, 0.14, 0.52, 0.5, W / 2);
  box(g, P.frame, 0.3, 0.25, 0.14, -0.25, 0.75, W / 2 + 0.07);
  box(g, P.dark, 0.2, 0.2, 0.14, -0.1, 0.3, W / 2 + 0.07);
  // 440 N engine bell at the base and attitude thrusters on the corners
  engineBay(g, P, 0, 0, 0.1);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      nozzle(g, P, v3(sx * (W / 2 + 0.02), 0.2, sz * (W / 2 + 0.02)), v3(sx, 0, sz), 0.03);
  // single 3-panel array on a boom out of +x
  const wrap = add(g, new THREE.Group());
  wrap.position.y = 0.68;
  box(wrap, P.metal, 0.45, 0.12, 0.12, W / 2 + 0.2, 0, 0);
  const wing = solarWing(wrap, P, 3, 1.8, 1.3, 0.03, 0.26);
  wing.position.x = W / 2 + 0.45;
  wing.userData.solarArray = true;
  // 2.2 m reflector on a boom off the -x face
  const dr = rdish(P, 1.1, P.dishD, 0.2, 0.28);
  placeDishDir(g, dr, v3(-1.0, 0.6, 0), v3(-0.5, 0.87, 0));
  strut(g, P.metal, v3(-W / 2, 0.65, 0), v3(-1.0, 0.6, 0), 0.05);
  return grounded(g);
}

// -- Hope ------------------------------------------------------------------------------------

function buildHope(): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  const W = 2.37;
  const H = 2.0;
  foilBox(g, P.gold, W, H - 0.045, W, 0, H / 2 - 0.022, 0, 0.02, 0.2);
  seams(g, P, W, H, W, 0, H / 2, 0, 3, 3);
  box(g, P.dark, W * 1.03, 0.09, W * 1.03, 0, 0.045, 0);
  box(g, P.dark, W * 1.03, 0.09, W * 1.03, 0, H - 0.045, 0);
  // radiator panels on the -z face
  box(g, P.white, 1.2, 1.1, 0.03, 0.3, 1.0, -W / 2 - 0.02);
  for (let i = 0; i < 8; i++)
    box(g, P.metal, 1.2, 0.012, 0.05, 0.3, 0.5 + i * 0.14, -W / 2 - 0.035);
  // science deck on +z: EXI, EMIRS, EMUS
  box(g, P.cream, 0.6, 0.5, 0.45, -0.6, 1.0, W / 2 + 0.22);
  barrel(g, P.black, 0.12, 0.2, -0.7, 1.0, W / 2 + 0.44);
  const emirs = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 28), P.cream);
  emirs.position.set(0.45, 1.2, W / 2 + 0.3);
  g.add(emirs);
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.05), P.silver);
  mirror.position.set(0.45, 1.2, W / 2 + 0.58);
  mirror.rotation.x = 0.7;
  g.add(mirror);
  box(g, P.black, 0.5, 0.3, 0.4, 0.45, 0.55, W / 2 + 0.2);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.1, 0.3, 4, 1, true), P.black);
  hood.rotation.x = Math.PI / 2;
  hood.rotation.z = Math.PI / 4;
  hood.position.set(0.45, 0.55, W / 2 + 0.55);
  g.add(hood);
  tracker(g, P, -0.9, H - 0.2, W / 2 + 0.05);
  tracker(g, P, 0.9, H - 0.2, W / 2 + 0.05);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(g, P.dark, 0.2, 0.15, 0.2, sx * (W / 2 + 0.05), 0.12, sz * (W / 2 + 0.05));
      nozzle(g, P, v3(sx * (W / 2 + 0.1), 0.12, sz * (W / 2 + 0.1)), v3(sx, 0, sz), 0.035);
    }
  engineBay(g, P, 0, 0, 0.12);
  // arrays: two wings of three 0.95 x 2.0 m panels
  for (const s of [-1, 1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = s;
    wrap.position.y = 1.0;
    box(wrap, P.metal, 0.3, 0.1, 0.1, W / 2 + 0.12, 0, 0);
    yoke(wrap, P, W / 2 + 0.3, 0, 0.1, 1.9);
    const wing = solarWing(wrap, P, 3, 0.95, 1.95, 0.03, 0.26);
    wing.position.x = W / 2 + 0.35;
    wing.userData.solarArray = true;
  }
  // 1.85 m high-gain dish on a trussed bracket on top
  for (const sx of [-1, 1]) {
    strut(g, P.grey, v3(sx * 0.55, H, 0.4), v3(sx * 0.3, 2.44, 0), 0.04);
    strut(g, P.grey, v3(sx * 0.55, H, -0.4), v3(sx * 0.3, 2.44, 0), 0.04);
  }
  box(g, P.grey, 0.7, 0.1, 0.5, 0, 2.38, 0);
  const dr = rdish(P, 0.925, P.dishW, 0.2, 0.18);
  dr.position.set(0, 2.42, 0);
  g.add(dr);
  return grounded(g);
}

// -- LRO -------------------------------------------------------------------------------------

function buildLro(): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  const W = 2.7;
  const H = 3.55;
  const D = 2.6;
  box(g, P.frame, W, H, D, 0, H / 2, 0);
  // gold blanket panels on the +-x faces and a silvered +z deck
  for (const sx of [-1, 1])
    foilBox(g, P.gold, 0.05, H * 0.86, D * 0.92, sx * (W / 2 + 0.02), H * 0.5, 0, 0.014);
  foilBox(g, P.silver, W * 0.92, H * 0.5, 0.05, 0, H * 0.72, D / 2 + 0.02, 0.012);
  foilBox(g, P.black, W * 0.92, H * 0.86, 0.05, 0, H * 0.5, -D / 2 - 0.02, 0.012);
  seams(g, P, W + 0.05, H * 0.86, D * 0.92, 0, H * 0.5, 0, 3, 4);
  box(g, P.dark, W * 1.03, 0.09, D * 1.03, 0, 0.045, 0);
  box(g, P.dark, W * 1.03, 0.09, D * 1.03, 0, H - 0.045, 0);
  // top: LEND cone, CRaTER box, star trackers
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 20, 1, true), P.teal);
  cone.position.set(-0.3, H + 0.175, 0.2);
  cone.rotation.x = Math.PI;
  g.add(cone);
  box(g, P.dark, 0.4, 0.3, 0.4, 0.5, H + 0.15, -0.3);
  tracker(g, P, -0.9, H + 0.04, 0.8);
  tracker(g, P, 0.9, H + 0.04, 0.8);
  // nadir (+z) payload face: two LROC NACs, LOLA, Diviner, LAMP, Mini-RF horns
  box(g, P.frame, 1.2, 0.6, 0.5, -0.4, 2.2, D / 2 + 0.28);
  barrel(g, P.dark, 0.17, 0.55, -0.65, 2.2, D / 2 + 0.5);
  barrel(g, P.dark, 0.17, 0.55, -0.15, 2.2, D / 2 + 0.5);
  barrel(g, P.black, 0.1, 0.1, -0.65, 2.2, D / 2 + 1.05);
  barrel(g, P.black, 0.1, 0.1, -0.15, 2.2, D / 2 + 1.05);
  box(g, P.metal, 0.5, 0.5, 0.45, 0.6, 1.4, D / 2 + 0.25);
  barrel(g, P.dark, 0.12, 0.2, 0.6, 1.4, D / 2 + 0.5);
  box(g, P.dark, 0.4, 0.25, 0.3, -0.7, 1.2, D / 2 + 0.17);
  barrel(g, P.black, 0.09, 0.3, 0.7, 3.0, D / 2);
  // thrusters on bottom corners
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      box(g, P.dark, 0.22, 0.16, 0.22, sx * (W / 2 + 0.06), 0.2, sz * (D / 2 + 0.06));
      nozzle(g, P, v3(sx * (W / 2 + 0.12), 0.2, sz * (D / 2 + 0.12)), v3(sx, 0, sz), 0.04);
    }
  engineBay(g, P, 0, 0, 0.14);
  // single array: two 2.05 x 2.6 m sections on a boom out of +x
  const wrap = add(g, new THREE.Group());
  wrap.position.y = 2.2;
  strut(wrap, P.metal, v3(W / 2, 0, 0), v3(W / 2 + 0.5, 0, 0), 0.06);
  box(wrap, P.metal, 0.12, 2.5, 0.08, W / 2 + 0.5, 0, 0);
  const wing = solarWing(wrap, P, 2, 2.0, 2.6, 0.05, 0.3);
  wing.position.x = W / 2 + 0.55;
  wing.userData.solarArray = true;
  // 0.8 m dish on a two-axis boom out of -x
  strut(g, P.gold, v3(-W / 2, 3.2, -0.3), v3(-2.2, 3.2, 0.1), 0.07);
  box(g, P.metal, 0.22, 0.22, 0.22, -2.25, 3.2, 0.1);
  const dr = rdish(P, 0.4, P.dishW, 0.25, 0.3);
  placeDishDir(g, dr, v3(-2.45, 3.2, 0.2), v3(-0.9, 0.2, 0.4));
  return grounded(g);
}

// -- Mariners 4, 9, 10 -----------------------------------------------------------------------

type MarinerVariant = 4 | 9 | 10;

/** Octagonal foil frame, bottom at y0; louver shutters on every other face. Returns top height. */
function octBody(
  g: THREE.Object3D,
  P: P,
  foil: Mat,
  diag: number,
  depth: number,
  y0: number,
  louverFaces = 4,
): { R: number; top: number } {
  const R = diag / 2;
  const apothem = R * Math.cos(Math.PI / 8);
  const geo = crinkle(new THREE.CylinderGeometry(R, R, depth, 8, 3), 0.008);
  const body = new THREE.Mesh(geo, foil);
  body.rotation.y = Math.PI / 8;
  body.position.y = y0 + depth / 2;
  g.add(body);
  const top = y0 + depth;
  for (const y of [y0, top]) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.015, R * 1.015, 0.035, 8),
      P.frame,
    );
    ring.rotation.y = Math.PI / 8;
    ring.position.y = y;
    g.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const w = add(g, new THREE.Group());
    w.rotation.y = (i * TAU) / 8 + Math.PI / 8;
    box(w, P.tape, 0.014, depth, 0.014, 0, y0 + depth / 2, R * 1.003);
  }
  const step = 8 / louverFaces;
  for (let i = 0; i < 8; i += step) {
    const w = add(g, new THREE.Group());
    w.rotation.y = (i * TAU) / 8;
    box(w, P.dark, R * 0.62, depth * 0.78, 0.015, 0, y0 + depth / 2, apothem + 0.008);
    for (let k = 0; k < 7; k++) {
      const b = box(
        w,
        P.frame,
        R * 0.58,
        0.034,
        0.012,
        0,
        y0 + depth * (0.16 + k * 0.1125),
        apothem + 0.03,
      );
      b.rotation.x = -0.45;
    }
  }
  return { R, top };
}

function jets(parent: THREE.Object3D, m: Mat, x: number, y: number, z: number): void {
  box(parent, m, 0.1, 0.1, 0.1, x, y, z);
}

/** Flat solar-pressure vane (and its mount) beyond a panel tip. */
function vane(parent: THREE.Object3D, m: Mats, x0: number, len: number, wid: number): void {
  box(parent, mat(0xd9d4c4, 0.3, 0.55), len, wid, 0.02, x0 + len / 2, 0, 0);
  box(parent, m.metal, len + 0.05, 0.03, 0.03, x0 + len / 2 - 0.025, 0, 0.02);
}

/** Tapered solar-pressure vane, root width `w0` at x = 0 to `w1` at x = len, tilted by `tilt`. */
function taperVane(
  parent: THREE.Object3D,
  P: P,
  len: number,
  w0: number,
  w1: number,
  tilt: number,
): void {
  const sh = new THREE.Shape();
  sh.moveTo(0, -w0 / 2);
  sh.lineTo(len, -w1 / 2);
  sh.lineTo(len, w1 / 2);
  sh.lineTo(0, w0 / 2);
  sh.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), P.silver);
  m.rotation.x = tilt;
  parent.add(m);
  strut(parent, P.metal, v3(0, 0, 0), v3(len, 0, 0), 0.012);
}

/** A panel's underside truss: two rails and diagonals along x from 0 to len. */
function panelTruss(g: THREE.Object3D, P: P, len: number, wid: number): void {
  const z = -0.06;
  for (const sy of [-1, 1]) box(g, P.frame, len, 0.04, 0.05, len / 2, sy * wid * 0.45, z);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i * len) / n;
    const b = ((i + 1) * len) / n;
    const up = i % 2 === 0;
    strut(
      g,
      P.frame,
      v3(a, up ? -wid * 0.45 : wid * 0.45, z),
      v3(b, up ? wid * 0.45 : -wid * 0.45, z),
      0.014,
    );
  }
}

/** Camera / instrument scan platform hung from the frame, cameras toward +z. */
function scanPod(g: THREE.Object3D, P: P, x: number, y: number, z: number, s: number): void {
  foilBox(g, P.gold, 0.4 * s, 0.22 * s, 0.34 * s, x, y, z, 0.01, 0.15);
  barrel(g, P.dark, 0.075 * s, 0.3 * s, x - 0.08 * s, y, z + 0.14 * s);
  barrel(g, P.black, 0.045 * s, 0.18 * s, x + 0.1 * s, y + 0.03 * s, z + 0.14 * s);
  barrel(g, P.metal, 0.09 * s, 0.03 * s, x - 0.08 * s, y, z + 0.44 * s);
  box(g, P.dark, 0.14 * s, 0.1 * s, 0.1 * s, x + 0.12 * s, y - 0.14 * s, z);
}

function mariner4(g: THREE.Group, P: P): void {
  const { R, top } = octBody(g, P, P.gold, 1.27, 0.457, 0.198);
  scanPod(g, P, 0, 0.171, 0.1, 0.9);
  // four panels 1.76 x 0.90 m in a cross, a tilted vane and gas jet on each tip
  for (let i = 0; i < 4; i++) {
    const arm = add(g, new THREE.Group());
    arm.rotation.y = (i * Math.PI) / 2 + Math.PI / 2;
    arm.position.y = top;
    const flat = add(arm, new THREE.Group());
    flat.rotation.x = -Math.PI / 2;
    box(flat, P.metal, 0.12, 0.1, 0.06, R * 0.95 - 0.02, 0, 0);
    const pnl = cellPanel(flat, P, 1.76, 0.9, 0.22);
    pnl.position.x = R * 0.95 + 0.88;
    pnl.userData.solarArray = true;
    const trussHost = add(flat, new THREE.Group());
    trussHost.position.x = R * 0.95;
    panelTruss(trussHost, P, 1.76, 0.9);
    const v = add(flat, new THREE.Group());
    v.position.x = R * 0.95 + 1.76 + 0.03;
    taperVane(v, P, 1.0, 0.62, 0.3, 0.45);
    box(flat, P.dark, 0.08, 0.08, 0.08, R * 0.95 + 1.76 + 1.03, 0, 0);
  }
  // 1.17 x 0.58 m elliptical high-gain on top, tilted toward +z, its feed on a tripod
  const hga = rdish(P, 0.584, P.dishG, 0.2, 0.3);
  hga.scale.z = 0.5;
  hga.position.set(0, top + 0.28, -0.12);
  hga.rotation.x = 1.1;
  g.add(hga);
  box(g, P.metal, 0.3, 0.1, 0.2, 0, top + 0.05, 0.05);
  // 2.235 m omni mast behind the dish, a collar at each third and the cup on top
  cyl(g, P.metal, 0.03, 0.03, top, top + 2.235 - 0.1, 0, -0.1, 12);
  for (const y of [0.7, 1.4]) cyl(g, P.gold, 0.045, 0.045, top + y, top + y + 0.05, 0, -0.1, 12);
  cyl(g, P.whiteFoil, 0.02, 0.06, top + 2.135, top + 2.235, 0, -0.1, 16);
  // cruise sun sensors, Canopus tracker and gas-jet pods on the top ring
  box(g, P.dark, 0.1, 0.08, 0.1, -R * 0.55, top + 0.05, R * 0.4);
  barrel(g, P.black, 0.05, 0.2, R * 0.5, top + 0.07, -R * 0.6);
  for (const a of [0.2, 1.8, 3.4, 5.0])
    box(g, P.metal, 0.07, 0.07, 0.07, Math.cos(a) * R, top - 0.1, Math.sin(a) * R);
}

function mariner9(g: THREE.Group, P: P): void {
  const { R, top } = octBody(g, P, P.silver, 1.384, 0.457, 0.383);
  scanPod(g, P, 0, 0.27, 0.12, 1.4);
  // white propulsion module on top: a foil frustum, tape seams, gold engine bell
  const mod = new THREE.Mesh(
    crinkle(new THREE.CylinderGeometry(0.4, R * 0.92, 0.7, 8, 4), 0.02),
    P.whiteFoil,
  );
  mod.rotation.y = Math.PI / 8;
  mod.position.y = top + 0.35;
  g.add(mod);
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) * TAU) / 8;
    strut(
      g,
      P.tape,
      v3(Math.sin(a) * R * 0.92 * 1.002, top + 0.01, Math.cos(a) * R * 0.92 * 1.002),
      v3(Math.sin(a) * 0.4 * 1.002, top + 0.69, Math.cos(a) * 0.4 * 1.002),
      0.007,
    );
  }
  const bell = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.05, 0],
        [0.07, 0.04],
        [0.13, 0.14],
        [0.17, 0.16],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      24,
    ),
    P.dishG,
  );
  bell.position.y = top + 0.7;
  g.add(bell);
  // four panels 2.15 x 0.90 m: two a side on hinge struts, a gas jet at each tip
  for (const side of [1, -1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = side;
    wrap.position.y = top - 0.02;
    const flat = add(wrap, new THREE.Group());
    flat.rotation.x = -Math.PI / 2;
    for (const dz of [-0.5, 0.5]) {
      const lane = add(flat, new THREE.Group());
      lane.position.y = dz;
      box(lane, P.metal, 0.7, 0.07, 0.05, R + 0.25, 0, 0);
      const pnl = cellPanel(lane, P, 2.15, 0.9, 0.22);
      pnl.position.x = R * 0.95 + 0.6 + 1.075;
      pnl.userData.solarArray = true;
      const host = add(lane, new THREE.Group());
      host.position.x = R * 0.95 + 0.6;
      panelTruss(host, P, 2.15, 0.9);
      box(lane, P.dark, 0.1, 0.1, 0.1, R * 0.95 + 0.6 + 2.2, 0, 0);
    }
  }
  // 1 m high-gain dish at the front, gold tripod feed
  const hga = rdish(P, 0.5, P.dishG, 0.2, 0.5);
  placeDishDir(g, hga, v3(0, top + 0.32, 0.62), v3(0, 0.2, 1));
  strut(g, P.metal, v3(0, top, 0.45), v3(0, top + 0.32, 0.62), 0.04);
  // 1.44 m low-gain mast beside the module: tube, collars and the cup
  const mx = 0.46;
  cyl(g, P.metal, 0.025, 0.025, top, top + 1.36, mx, -mx, 12);
  for (const y of [0.4, 0.9]) cyl(g, P.dishG, 0.04, 0.04, top + y, top + y + 0.04, mx, -mx, 12);
  cyl(g, P.whiteFoil, 0.02, 0.06, top + 1.36, top + 1.44, mx, -mx, 16);
  tracker(g, P, -0.5, top + 0.02, 0.4, 0.8);
}

/** 3.7 m from the top of the low-gain antenna to the bottom of the heat shield (NSSDCA). */
export const MARINER_10_HEIGHT_M = 3.7;

function mariner10(g: THREE.Group, P: P): void {
  const { R, top } = octBody(g, P, P.gold, 1.39, 0.457, 0.4);
  // sunshade: a pleated kapton screen under the bus, the engine nozzle through it
  const shade = foilSheet(P.kapton, 2.7, 1.6, 0.012);
  shade.rotation.x = -Math.PI / 2;
  shade.position.y = 0.02;
  g.add(shade);
  for (let i = 0; i < 9; i++) box(g, P.metal, 0.02, 0.04, 1.6, -1.2 + i * 0.3, 0.045, 0);
  box(g, P.metal, 2.7, 0.04, 0.03, 0, 0.045, 0.8);
  box(g, P.metal, 2.7, 0.04, 0.03, 0, 0.045, -0.8);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      strut(g, P.metal, v3(sx * 0.95, 0.04, sz * 0.62), v3(sx * 0.45, 0.4, sz * 0.4), 0.02);
  nozzle(g, P, v3(0, 0.33, 0), v3(0, -1, 0), 0.1);
  // two 2.69 x 0.97 m panels with a tilt vane at each tip
  for (const side of [1, -1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = side;
    wrap.position.y = top - 0.03;
    const flat = add(wrap, new THREE.Group());
    flat.rotation.x = -Math.PI / 2;
    box(flat, P.metal, 0.7, 0.07, 0.05, R + 0.25, 0, 0);
    const pnl = cellPanel(flat, P, 2.69, 0.97, 0.22);
    pnl.position.x = R * 0.95 + 0.6 + 1.345;
    pnl.userData.solarArray = true;
    const host = add(flat, new THREE.Group());
    host.position.x = R * 0.95 + 0.6;
    panelTruss(host, P, 2.69, 0.97);
    box(flat, P.metal, 0.05, 0.28, 0.03, R * 0.95 + 0.6 + 2.69 + 0.025, 0, 0);
    box(flat, P.dark, 0.1, 0.1, 0.1, R * 0.95 + 0.6 + 2.69 + 0.1, 0, 0);
  }
  // 2.85 m low-gain boom from the anti-sun face, tip at the 3.7 m overall height
  cyl(g, P.metal, 0.03, 0.03, top, MARINER_10_HEIGHT_M - 0.12, -0.25, 0.25, 12);
  for (const y of [0.9, 1.9])
    cyl(g, P.frame, 0.045, 0.045, top + y, top + y + 0.05, -0.25, 0.25, 12);
  cyl(g, P.whiteFoil, 0.02, 0.07, MARINER_10_HEIGHT_M - 0.12, MARINER_10_HEIGHT_M, -0.25, 0.25, 16);
  // 1.37 m high-gain dish on a boom, a flat white sun-side screen behind it
  const hga = rdish(P, 0.685, P.dishW, 0.2, 0.3);
  placeDishDir(g, hga, v3(0.35, top + 0.55, 0.5), v3(0.15, 0.55, 0.82));
  strut(g, P.metal, v3(0.25, top, 0.35), v3(0.35, top + 0.55, 0.5), 0.04);
  strut(g, P.metal, v3(0.55, top, 0.2), v3(0.4, top + 0.5, 0.45), 0.03);
  // scan platform with two cameras on the anti-sun face
  scanPod(g, P, 0.2, top + 0.16, -0.2, 1.3);
  barrel(g, P.dark, 0.08, 0.5, 0.07, top + 0.3, -0.05);
  // 5.8 m magnetometer boom with two sensors
  const mz = -(R * Math.cos(Math.PI / 8));
  strut(g, P.metal, v3(0, top - 0.2, mz), v3(0, top - 0.2, mz - 5.8), 0.025);
  box(g, P.metal, 0.12, 0.12, 0.1, 0, top - 0.2, mz - 0.1);
  for (const dz of [3.0, 5.8]) {
    box(g, P.dark, 0.1, 0.1, 0.1, 0, top - 0.2, mz - dz);
    box(g, P.gold, 0.05, 0.05, 0.12, 0.08, top - 0.2, mz - dz);
  }
  tracker(g, P, -0.55, top + 0.03, 0.4, 0.8);
}

export function buildMariner(variant: MarinerVariant): THREE.Group {
  const g = new THREE.Group();
  const P = pal();
  if (variant === 4) mariner4(g, P);
  else if (variant === 9) mariner9(g, P);
  else mariner10(g, P);
  return grounded(g);
}

export function buildMariner10(): THREE.Group {
  return buildMariner(10);
}

// ---------------------------------------------------------------------------------------------
// Fleet entries
// ---------------------------------------------------------------------------------------------

const WIKI = (title: string, what: string): ShowcaseRef => ({
  l: `Wikipedia (fallback source), ${title.replace(/_/g, ' ')} — ${what}`,
  u: `https://en.wikipedia.org/wiki/${title}`,
});
const NSSDCA = (id: string, name: string, what: string): ShowcaseRef => ({
  l: `NASA NSSDCA, ${name} — ${what}`,
  u: `https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=${id}`,
});

const COMMONS = (file: string, what: string): ShowcaseRef => ({
  l: `Wikimedia Commons, ${file} — ${what}`,
  u: `https://commons.wikimedia.org/wiki/${encodeURI('File:' + file.replace(/ /g, '_'))}`,
});

// ── Moon orbiters (/fly craft, no fleet entry) ────────────────────────────────────────────
// Box buses share buildBoxOrbiter (the operator's rule: share a model where the differences
// are small). Sizes are approximate published bus dimensions, for shape and proportion only.

/** Clementine (1994): a ~1.9 m octagonal-ish bus with two single-panel wings. */
export function buildClementine(): THREE.Group {
  return buildBoxOrbiter({
    bus: [1.14, 1.88, 1.14],
    hex: true,
    arrays: { sides: [1, -1], panels: 1, panelLen: 1.9, panelWid: 1.1, y: 1.1, strut: 0.15 },
    dish: { d: 0.4, vertex: [0, 1.88, 0.5], elev: 30, mount: [0, 1.7, 0.4] },
  });
}

/** SMART-1 (2003): a ~1 m cube with two long two-panel wings. */
export function buildSmart1(): THREE.Group {
  return buildBoxOrbiter({
    bus: [1, 1, 1],
    arrays: { sides: [1, -1], panels: 3, panelLen: 2.1, panelWid: 0.8, y: 0.5, strut: 0.2 },
    dish: { d: 0.3, vertex: [0, 1.05, 0.45], elev: 20, mount: [0, 0.9, 0.4] },
  });
}

/** Chang'e 1 (2007): DFH-3 bus, gold, two wings, a steerable dish. */
export function buildChange1(): THREE.Group {
  return buildBoxOrbiter({
    bus: [2.0, 2.2, 1.7],
    gold: true,
    arrays: { sides: [1, -1], panels: 3, panelLen: 2.3, panelWid: 1.6, y: 1.1, strut: 0.3 },
    dish: { d: 0.8, vertex: [0, 1.6, 1.3], elev: 15, mount: [0, 1.4, 0.85] },
  });
}

/** Chandrayaan-1 (2008): a ~1.5 m gold cube with one wing and a dish on a boom. */
export function buildChandrayaan1(): THREE.Group {
  return buildBoxOrbiter({
    bus: [1.5, 1.5, 1.5],
    gold: true,
    arrays: { sides: [1], panels: 1, panelLen: 2.15, panelWid: 1.8, y: 0.75, strut: 0.25 },
    dish: { d: 0.7, vertex: [-0.8, 1.6, 0.9], elev: 25, mount: [-0.6, 1.4, 0.75] },
  });
}

/** Kaguya / SELENE (2007): a 2.1 m box bus with one large solar wing and a dish on a mast. Schematic. */
export function buildKaguya(): THREE.Group {
  return buildBoxOrbiter({
    bus: [2.1, 2.1, 2.1],
    gold: true,
    arrays: { sides: [1], panels: 2, panelLen: 2.2, panelWid: 2.4, y: 1.05, strut: 0.3 },
    dish: { d: 0.9, vertex: [0, 2.4, 0], elev: 0, mount: [0, 2.1, 0] },
  });
}

/** Lunar Prospector (1998): a 1.36 m drum covered in cells, three 2.5 m instrument booms. */
export function buildLunarProspector(): THREE.Group {
  const g = new THREE.Group();
  const m = mats();
  cyl(g, m.cell, 0.68, 0.68, 0, 1.28);
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    const from = new THREE.Vector3(Math.cos(a) * 0.68, 0.64, Math.sin(a) * 0.68);
    const to = new THREE.Vector3(Math.cos(a) * 3.18, 0.64, Math.sin(a) * 3.18);
    strut(g, m.metal, from, to, 0.03);
    box(g, m.white, 0.18, 0.18, 0.18, to.x, to.y, to.z);
  }
  cyl(g, m.metal, 0.05, 0.05, 1.28, 1.88);
  return g;
}

/** Luna 10 (1966): the 1.5 m pressurised cylinder with its antenna whips and magnetometer boom. */
export function buildLuna10(): THREE.Group {
  const g = new THREE.Group();
  const m = mats();
  cyl(g, m.white, 0.38, 0.38, 0, 1.5);
  cyl(g, m.metal, 0.42, 0.42, 0.96, 1.04);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    strut(
      g,
      m.metal,
      new THREE.Vector3(Math.cos(a) * 0.38, 1.4, Math.sin(a) * 0.38),
      new THREE.Vector3(Math.cos(a) * 1.3, 2.2, Math.sin(a) * 1.3),
      0.012,
    );
  }
  strut(g, m.metal, new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 3.0, 0), 0.02);
  return g;
}

/**
 * Mariner 2 (1962, no fleet-entry specs): the hexagonal Ranger-derived bus, two solar panels (one
 * with its solar-pressure extension), the high-gain dish on an arm below the bus and the omni
 * antenna on top of the pyramid instrument mast. Sources: NASA NSSDCA 1962-041A — hexagonal base
 * 1.04 m across and 0.36 m thick, panels 183 x 76 cm and 152 x 76 cm plus a 31 cm extension
 * (5.05 m span), overall height 3.66 m. The dish size and the mast layout are schematic.
 */
export const MARINER_2_HEIGHT_M = 3.66;
export const MARINER_2_SPAN_M = 5.05;

export function buildMariner2(): THREE.Group {
  const g = new THREE.Group();
  const m = mats();
  const gold = mat(0xb08f45, 0.7, 0.4);
  const louver = mat(0x7d8189, 0.7, 0.4);
  const white = mat(0xe4e4e0, 0.3, 0.5);
  const R = 1.04 / 2;
  const apothem = R * Math.cos(Math.PI / 6);
  const y0 = 0.4;
  const top = y0 + 0.36;

  // hexagonal bus, a flat face toward +x and -x where the panels hinge
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.36, 6), gold);
  body.position.y = y0 + 0.18;
  g.add(body);
  for (const y of [y0, top]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.03, 6), louver);
    ring.position.y = y;
    g.add(ring);
  }
  // electronics-bay louvers on the six faces
  for (let i = 0; i < 6; i++) {
    const wrap = add(g, new THREE.Group());
    wrap.rotation.y = Math.PI / 6 + (i * Math.PI) / 3;
    for (let k = 0; k < 4; k++)
      box(wrap, louver, R * 0.6, 0.02, 0.025, 0, y0 + 0.08 + k * 0.07, apothem + 0.01);
  }

  // two panels: 183 x 76 cm on +x; 152 x 76 cm plus the 31 cm solar-pressure extension on -x
  const hinge = apothem + 0.25;
  for (const [side, len, ext] of [
    [1, 1.83, 0],
    [-1, 1.52, 0.31],
  ] as const) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = side;
    wrap.position.y = top - 0.04;
    const flat = add(wrap, new THREE.Group());
    flat.rotation.x = -Math.PI / 2;
    box(flat, m.frame, 0.3, 0.05, 0.05, apothem + 0.12, 0, 0);
    panelRow(flat, m, hinge, len, 0.76, 1, undefined, 0);
    if (ext) vane(flat, m, hinge + len, ext, 0.76);
    jets(flat, m.dark, hinge + len + ext + 0.04, 0, 0);
  }

  // high-gain dish on an arm below the bus, tilted toward the Earth (+z)
  const hga = dishMesh(m, 0.4);
  placeDish(g, hga, v3(0, 0.5, 0.62), 35);
  strut(g, m.metal, v3(0, y0, 0.2), v3(0, 0.5, 0.62), 0.03);
  const lo = new THREE.Box3().setFromObject(g).min.y;

  // pyramid instrument mast: four legs from the top face, the omni antenna at the apex
  const topY = lo + MARINER_2_HEIGHT_M;
  const apexY = topY - 0.8;
  const s = 0.32;
  for (const [cx, cz] of [
    [s, s],
    [-s, s],
    [s, -s],
    [-s, -s],
  ] as const)
    strut(g, m.metal, v3(cx, top, cz), v3(0, apexY, 0), 0.015);
  for (const f of [0.35, 0.7]) {
    const r = s * (1 - f);
    const y = top + (apexY - top) * f;
    for (const [a, b] of [
      [v3(r, y, r), v3(-r, y, r)],
      [v3(-r, y, r), v3(-r, y, -r)],
      [v3(-r, y, -r), v3(r, y, -r)],
      [v3(r, y, -r), v3(r, y, r)],
    ] as const)
      strut(g, m.metal, a, b, 0.01);
  }
  // cosmic-ray, plasma and magnetometer sensors on the mast
  box(g, m.dark, 0.16, 0.16, 0.16, 0.12, top + (apexY - top) * 0.3, 0.12);
  box(g, m.white, 0.12, 0.12, 0.12, -0.1, top + (apexY - top) * 0.5, -0.1);
  box(g, m.dark, 0.1, 0.1, 0.1, 0.08, top + (apexY - top) * 0.72, -0.06);
  cyl(g, white, 0.06, 0.06, apexY, topY, 0, 0, 12);
  // cold-gas nitrogen bottles and the attitude-control jets at the bus corners
  for (const a of [Math.PI / 6, Math.PI / 6 + (2 * Math.PI) / 3, Math.PI / 6 + (4 * Math.PI) / 3])
    cyl(g, m.metal, 0.07, 0.07, top, top + 0.16, Math.sin(a) * R * 0.5, Math.cos(a) * R * 0.5, 12);

  const out = new THREE.Group();
  g.position.y = -lo;
  out.add(g);
  return out;
}

/**
 * Mars Reconnaissance Orbiter (2005): the bus, two 5.35 x 2.53 m solar arrays, the 3 m high-gain
 * dish on its boom, the 1.6 m x 0.9 m HiRISE barrel on the nadir deck and the SHARAD 10 m dipole
 * (two 5 m tubes) trailing behind. Sources: NASA NSSDCA 2005-029A (3 m dish, 10 m2 arrays),
 * NASA MRO science-instruments page (HiRISE, SHARAD), Wikipedia for the 5.35 x 2.53 m array size
 * (backlog row). The bus box and the boom layout are schematic. Stands nadir down.
 */
export const MRO_ARRAY_M = { len: 5.35, wid: 2.53 } as const;
export const MRO_DISH_M = 3;
export const MRO_SHARAD_M = 10;
export const MRO_HIRISE_M = { len: 1.6, dia: 0.9 } as const;

export function buildMro(): THREE.Group {
  const g = buildBoxOrbiter({
    bus: [1.8, 2.2, 1.6],
    arrays: {
      sides: [1, -1],
      panels: 1,
      panelLen: MRO_ARRAY_M.len,
      panelWid: MRO_ARRAY_M.wid,
      y: 1.1,
      strut: 0.5,
    },
    dish: { d: MRO_DISH_M, vertex: [0, 2.75, 0], elev: 70, mount: [0, 2.2, 0] },
  });
  const m = mats();
  // HiRISE: the 1.6 m barrel on the nadir deck, its aperture ring at the bottom, with CTX beside it
  const hi = add(g, new THREE.Group());
  hi.userData.hirise = true;
  cyl(hi, m.white, MRO_HIRISE_M.dia / 2, MRO_HIRISE_M.dia / 2, -1.0, 0.6, 0.4, 0.1, 28);
  cyl(
    hi,
    m.dark,
    MRO_HIRISE_M.dia / 2 + 0.04,
    MRO_HIRISE_M.dia / 2 + 0.04,
    -1.0,
    -0.94,
    0.4,
    0.1,
    28,
  );
  cyl(hi, m.dark, 0.2, 0.2, -0.55, 0.1, -0.45, 0.3, 18);
  box(g, m.dark, 0.45, 0.35, 0.4, -0.45, -0.2, -0.3);
  // SHARAD: a 10 m dipole (two 5 m tubes) held behind the bus on a short mast
  const sh = add(g, new THREE.Group());
  sh.userData.sharad = true;
  const sz = -(0.8 + 0.7);
  strut(sh, m.metal, v3(0, 1.5, -0.8), v3(0, 1.5, sz), 0.04);
  for (const sx of [-1, 1]) {
    strut(sh, m.frame, v3(0, 1.5, sz), v3(sx * (MRO_SHARAD_M / 2), 1.5, sz), 0.03);
    box(sh, m.dark, 0.08, 0.08, 0.08, sx * (MRO_SHARAD_M / 2), 1.5, sz);
  }
  // UHF (Electra) whip and thruster cluster on the zenith deck
  cyl(g, m.metal, 0.02, 0.02, 2.2, 3.0, -0.6, -0.5, 8);
  const lo = new THREE.Box3().setFromObject(g).min.y;
  const out = new THREE.Group();
  g.position.y = -lo;
  out.add(g);
  return out;
}

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'mars-express': {
    build: buildMarsExpress,
    heightM: 1.8,
    diameterM: 1.5,
    refs: [
      COMMONS(
        'Mars Express.jpg',
        'bus, D-frame yokes and four-panel wings, dish on the back (shape reference photo)',
      ),
      WIKI(
        'Mars_Express',
        'main body 1.5 x 1.8 x 1.4 m (length_m = the 1.8 m side, stood upright), ~12 m tip-to-tip arrays, 1.6 m high-gain dish',
      ),
    ],
  },
  maven: {
    build: buildMaven,
    heightM: 3.47,
    diameterM: 2.29,
    refs: [
      COMMONS(
        'Maven spacecraft full.jpg',
        'gold bus, tank dome, gull-wing arrays with tip magnetometers, boom and dish (shape reference)',
      ),
      {
        l: 'NASA Science, MAVEN key facts — length 11.4 m (array tip to tip), width 2.29 m, height 3.47 m (length_m here is the 3.47 m height, bus on its base, dish up)',
        u: 'https://science.nasa.gov/mission/maven/',
      },
      NSSDCA(
        '2013-063A',
        'MAVEN',
        'cubic 2.3 x 2.3 m, 2 m high bus; 1.3 m central propellant tank',
      ),
      WIKI('MAVEN', '2 m high-gain dish (dish diameter only; not on the NASA pages)'),
    ],
  },
  mangalyaan: {
    build: buildMangalyaan,
    heightM: 1.5,
    diameterM: 1.5,
    refs: [
      COMMONS(
        'Mars Orbiter Mission Spacecraft.jpg',
        'cube bus, tank dome, single array, side-mounted reflector (labelled reference)',
      ),
      WIKI(
        'Mars_Orbiter_Mission',
        '1.5 m cube bus (length_m = cube edge, no dish counted), single 2.2 m reflector high-gain, I-1K bus',
      ),
    ],
  },
  hope: {
    build: buildHope,
    heightM: 2.9,
    diameterM: 2.37,
    refs: [
      COMMONS(
        'Emirates Mars Mission mockup at IAC 2021 02.jpg',
        'box bus with the dish on its bracket on top, science deck on one face (flight mockup photo)',
      ),
      WIKI(
        'Emirates_Mars_Mission',
        '2.37 m wide x 2.90 m long body (length_m = 2.90 m), 1.85 m high-gain dish (the article also says 1.5 m), two solar panels',
      ),
    ],
  },
  'mariner-4': {
    build: () => buildMariner(4),
    heightM: 2.89,
    diameterM: 1.27,
    refs: [
      COMMONS(
        'Mariner 3 and 4.jpg',
        'octagon, four-panel cross with tip vanes, top dish and mast (shape reference photo)',
      ),
      NSSDCA(
        '1964-077A',
        'Mariner 4',
        'octagon 127 cm across the diagonal, 45.7 cm high; 4 panels 176 x 90 cm, 688 cm tip-to-tip with vanes; 116.8 cm high-gain; 223.5 cm mast; overall height 289 cm (length_m)',
      ),
    ],
  },
  'mariner-9': {
    build: () => buildMariner(9),
    heightM: 2.28,
    diameterM: 1.384,
    refs: [
      COMMONS(
        'Mariner09.jpg',
        'white propulsion module on the octagon, front dish with its tripod feed, panel arms (shape reference photo)',
      ),
      NSSDCA(
        '1971-051A',
        'Mariner 9',
        'octagon 138.4 cm across the diagonal, 45.7 cm deep; 4 panels 215 x 90 cm, 6.89 m per pair; 1.44 m low-gain mast; overall height 2.28 m (length_m)',
      ),
    ],
  },
  lro: {
    build: buildLro,
    heightM: 3.9,
    diameterM: 2.7,
    refs: [
      COMMONS(
        'Schema-1 de la sonde Lunar Reconnaissance Orbiter.png',
        'bus faces, payload face, boom dish and the sectioned array (labelled diagram)',
      ),
      WIKI(
        'Lunar_Reconnaissance_Orbiter',
        'launch configuration 390 x 270 x 260 cm (length_m = the 3.9 m side, stood upright)',
      ),
      NSSDCA('2009-031A', 'LRO', 'single 10.7 m2 solar array'),
    ],
  },
};
