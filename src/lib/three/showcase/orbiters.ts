/**
 * Showcase models: planetary orbiters built from two shared builders. `buildBoxOrbiter` covers
 * the box-bus Mars and Moon orbiters (Mars Express, MAVEN, Mangalyaan, Hope, LRO) from per-craft
 * parameters; `buildMariner` covers the octagonal-frame Mariners (4, 9 and, as a plain function,
 * 10). Each stands upright with the bus axis vertical, arrays and dishes deployed in x / z, and
 * the whole craft's height equal to the sourced overall length in the fleet entry.
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
// Shared Mariner builder
// ---------------------------------------------------------------------------------------------

type MarinerVariant = 4 | 9 | 10;

interface MarinerDims {
  /** Octagon corner-to-corner diameter. */
  diag: number;
  /** Bus depth. */
  depth: number;
  /** Bottom of the bus. */
  y0: number;
}

function octagon(
  g: THREE.Object3D,
  m: Mat,
  louver: Mat,
  dims: MarinerDims,
): { R: number; top: number } {
  const R = dims.diag / 2;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, dims.depth, 8), m);
  body.rotation.y = Math.PI / 8;
  body.position.y = dims.y0 + dims.depth / 2;
  g.add(body);
  const apothem = R * Math.cos(Math.PI / 8);
  // electronics-bay louvers on every face
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const wrap = add(g, new THREE.Group());
    wrap.rotation.y = a;
    for (let k = 0; k < 6; k++)
      box(
        wrap,
        louver,
        R * 0.62,
        0.02,
        0.025,
        0,
        dims.y0 + dims.depth * (0.2 + k * 0.12),
        apothem + 0.01,
      );
  }
  const top = dims.y0 + dims.depth;
  for (const y of [dims.y0, top]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.03, 8), louver);
    ring.rotation.y = Math.PI / 8;
    ring.position.y = y;
    g.add(ring);
  }
  return { R, top };
}

function jets(parent: THREE.Object3D, m: Mat, x: number, y: number, z: number): void {
  box(parent, m, 0.1, 0.1, 0.1, x, y, z);
}

/** Camera / instrument scan platform. */
function scanPlatform(
  g: THREE.Object3D,
  m: Mats,
  w: number,
  hgt: number,
  y: number,
  x = 0,
  z = 0,
): void {
  box(g, m.frame, w, hgt, w * 0.8, x, y, z);
  for (const [dx, r, len] of [
    [-w * 0.28, 0.09, hgt * 1.2],
    [w * 0.28, 0.06, hgt * 0.9],
  ] as const) {
    cyl(g, m.dark, r, r, y - len / 2, y + len / 2, x + dx, z + w * 0.4, 14);
  }
  box(g, m.dark, w * 0.3, hgt * 0.5, 0.05, x, y, z - w * 0.4);
}

/** Flat solar-pressure vane (and its mount) beyond a panel tip. */
function vane(parent: THREE.Object3D, m: Mats, x0: number, len: number, wid: number): void {
  box(parent, mat(0xd9d4c4, 0.3, 0.55), len, wid, 0.02, x0 + len / 2, 0, 0);
  box(parent, m.metal, len + 0.05, 0.03, 0.03, x0 + len / 2 - 0.025, 0, 0.02);
}

export function buildMariner(variant: MarinerVariant): THREE.Group {
  const g = new THREE.Group();
  const m = mats();
  const gold = mat(0xb08f45, 0.7, 0.4);
  const louver = mat(0x7d8189, 0.7, 0.4);
  const white = mat(0xe4e4e0, 0.3, 0.5);

  if (variant === 4) {
    // 1.27 m corner-to-corner octagon, 0.457 m deep; overall 2.89 m to the top of the mast
    const dims: MarinerDims = { diag: 1.27, depth: 0.457, y0: 0.198 };
    const { R, top } = octagon(g, gold, louver, dims);
    scanPlatform(g, m, 0.34, 0.16, 0.098);
    // four panels 1.76 x 0.90 m, in a cross at the top of the frame, a solar vane on each tip
    for (let i = 0; i < 4; i++) {
      const arm = add(g, new THREE.Group());
      arm.rotation.y = (i * Math.PI) / 2 + Math.PI / 2;
      arm.position.y = top;
      const flat = add(arm, new THREE.Group());
      flat.rotation.x = -Math.PI / 2;
      panelRow(flat, m, R * 0.95, 1.76, 0.9, 1, undefined, 0);
      vane(flat, m, R * 0.95 + 1.76 + 0.05, 1.04 - 0.05, 0.625);
      jets(flat, m.dark, R * 0.95 + 1.76 + 1.04, 0, 0);
    }
    // 1.168 x 0.58 m elliptical high-gain on top
    const hga = dishMesh(m, 0.584, 0.5);
    hga.position.set(0, top + 0.08, 0);
    hga.rotation.x = -0.18;
    g.add(hga);
    cyl(g, m.metal, 0.07, 0.07, top, top + 0.1, 0, 0, 10);
    // omni low-gain on a 2.235 m mast between two arms
    const mx = R * 0.5;
    cyl(g, m.metal, 0.03, 0.02, top, top + 2.235 - 0.1, mx, -mx, 8);
    cyl(g, m.white, 0.02, 0.05, top + 2.135, top + 2.235, mx, -mx, 12);
    // cruise sensors
    box(g, m.dark, 0.1, 0.1, 0.1, -R * 0.6, top + 0.06, R * 0.5);
    return g;
  }

  if (variant === 9) {
    // 1.384 m corner-to-corner octagon, 0.457 m deep; overall 2.28 m
    const dims: MarinerDims = { diag: 1.384, depth: 0.457, y0: 0.383 };
    const { R, top } = octagon(g, gold, louver, dims);
    scanPlatform(g, m, 0.62, 0.3, 0.18);
    // four panels 2.15 x 0.90 m: two side by side each side, on 0.6 m hinge struts
    for (const side of [1, -1]) {
      const wrap = add(g, new THREE.Group());
      wrap.scale.x = side;
      wrap.position.y = top;
      const flat = add(wrap, new THREE.Group());
      flat.rotation.x = -Math.PI / 2;
      for (const dz of [-0.46, 0.46]) {
        const lane = add(flat, new THREE.Group());
        lane.position.y = dz;
        box(lane, m.frame, 0.7, 0.05, 0.05, R + 0.25, 0, 0);
        panelRow(lane, m, R * 0.95 + 0.6, 2.15, 0.9, 1, undefined, 0);
        jets(lane, m.dark, R * 0.95 + 0.6 + 2.15 + 0.05, 0, 0);
      }
    }
    // propulsion module: two tanks and the gimballed engine on top
    cyl(g, m.metal, 0.22, 0.22, top, top + 0.55, -0.34, 0.1, 20);
    cyl(g, m.metal, 0.17, 0.17, top, top + 0.42, -0.34, -0.3, 20);
    cyl(g, m.dark, 0.05, 0.19, top + 0.55, top + 0.95, -0.34, 0.1, 18);
    // 1 m high-gain dish
    const hga = dishMesh(m, 0.5);
    hga.position.set(0.4, top + 0.28, 0);
    hga.rotation.set(0, 0, -0.1);
    g.add(hga);
    cyl(g, m.metal, 0.04, 0.04, top, top + 0.3, 0.4, 0, 8);
    // 1.44 m low-gain mast
    const mx = R * 0.45;
    cyl(g, m.metal, 0.03, 0.02, top, top + 1.37, mx, -mx * 1.1, 8);
    cyl(g, m.white, 0.02, 0.05, top + 1.37, top + 1.44, mx, -mx * 1.1, 12);
    return g;
  }

  return buildMariner10Group(m, gold, louver, white);
}

// ---------------------------------------------------------------------------------------------
// Mariner 10 (no fleet entry; exported as a plain function)
// ---------------------------------------------------------------------------------------------

/** 3.7 m from the top of the low-gain antenna to the bottom of the heat shield (NSSDCA). */
export const MARINER_10_HEIGHT_M = 3.7;

function buildMariner10Group(m: Mats, gold: Mat, louver: Mat, white: Mat): THREE.Group {
  const g = new THREE.Group();
  const dims: MarinerDims = { diag: 1.39, depth: 0.457, y0: 0.4 };
  const { R, top } = octagon(g, gold, louver, dims);
  const sunshade = mat(0xd8b24c, 0.25, 0.7, true);
  // sunshade: pleated kapton screen on the sun face (down), the engine nozzle through it
  box(g, sunshade, 2.6, 0.03, 1.6, 0, 0.015, 0);
  for (let i = 0; i < 9; i++) box(g, m.metal, 0.02, 0.05, 1.6, -1.2 + i * 0.3, 0.04, 0);
  strut(g, m.metal, v3(-0.9, 0.03, -0.6), v3(-0.45, 0.4, -0.4), 0.02);
  strut(g, m.metal, v3(0.9, 0.03, -0.6), v3(0.45, 0.4, -0.4), 0.02);
  strut(g, m.metal, v3(-0.9, 0.03, 0.6), v3(-0.45, 0.4, 0.4), 0.02);
  strut(g, m.metal, v3(0.9, 0.03, 0.6), v3(0.45, 0.4, 0.4), 0.02);
  cyl(g, m.dark, 0.2, 0.06, 0.03, 0.4, 0, 0, 16);
  // two panels 2.69 x 0.97 m on hinge struts, a tilt vane at each tip
  for (const side of [1, -1]) {
    const wrap = add(g, new THREE.Group());
    wrap.scale.x = side;
    wrap.position.y = top - 0.03;
    const flat = add(wrap, new THREE.Group());
    flat.rotation.x = -Math.PI / 2;
    box(flat, m.frame, 0.7, 0.05, 0.05, R + 0.25, 0, 0);
    panelRow(flat, m, R * 0.95 + 0.6, 2.69, 0.97, 1, undefined, 0);
    box(flat, m.metal, 0.05, 0.14, 0.03, R * 0.95 + 0.6 + 2.69 + 0.025, 0, 0);
    jets(flat, m.dark, R * 0.95 + 0.6 + 2.69 + 0.1, 0, 0);
  }
  // 2.85 m low-gain boom from the anti-sun face, tip at the 3.7 m overall height
  const boomTop = MARINER_10_HEIGHT_M;
  cyl(g, m.metal, 0.03, 0.02, top, boomTop - 0.12, -0.25, 0.25, 8);
  cyl(g, white, 0.02, 0.05, boomTop - 0.12, boomTop, -0.25, 0.25, 12);
  // 1.37 m high-gain dish on a boom at the bus side
  const hga = dishMesh(m, 0.685);
  hga.position.set(0.35, top + 0.55, 0.5);
  hga.quaternion.setFromUnitVectors(v3(0, 1, 0), v3(0.15, 0.55, 0.82).normalize());
  g.add(hga);
  strut(g, m.metal, v3(0.25, top, 0.35), v3(0.35, top + 0.55, 0.5), 0.04);
  // scan platform with two cameras on the anti-sun face
  scanPlatform(g, m, 0.5, 0.22, top + 0.16, 0.2, -0.2);
  cyl(g, m.dark, 0.08, 0.08, top + 0.27, top + 0.95, 0.07, -0.0, 14);
  // 5.8 m magnetometer boom, two sensors, hinged out of one side
  const mz = -(R * Math.cos(Math.PI / 8));
  const mb = add(g, new THREE.Group());
  strut(mb, m.metal, v3(0, top - 0.2, mz), v3(0, top - 0.2, mz - 5.8), 0.025);
  box(mb, m.dark, 0.1, 0.1, 0.1, 0, top - 0.2, mz - 3.0);
  box(mb, m.dark, 0.1, 0.1, 0.1, 0, top - 0.2, mz - 5.8);
  return g;
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

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'mars-express': {
    build: () =>
      buildBoxOrbiter({
        bus: [1.5, 1.8, 1.4],
        arrays: { sides: [1, -1], panels: 2, panelLen: 2.5, panelWid: 1.15, y: 0.9, strut: 0.25 },
        dish: { d: 1.6, vertex: [0, 0.9, 1.3], elev: 8, mount: [0, 0.9, 0.7] },
      }),
    heightM: 1.8,
    diameterM: 1.5,
    refs: [
      WIKI(
        'Mars_Express',
        'main body 1.5 x 1.8 x 1.4 m (length_m = the 1.8 m side, stood upright), ~12 m tip-to-tip arrays, 1.6 m high-gain dish',
      ),
    ],
  },
  maven: {
    build: () =>
      buildBoxOrbiter({
        bus: [2.29, 2.0, 2.29],
        arrays: {
          sides: [1, -1],
          panels: 2,
          panelLen: 2.2,
          panelWid: 1.5,
          y: 1.0,
          strut: 0.15,
          gull: { from: 1, deg: 20 },
          tipMag: true,
        },
        dish: { d: 2.0, vertex: [0, 2.816, 0], elev: 70, mount: [0, 2.0, 0] },
      }),
    heightM: 3.47,
    diameterM: 2.29,
    refs: [
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
    build: () =>
      buildBoxOrbiter({
        bus: [1.5, 1.5, 1.5],
        gold: true,
        arrays: { sides: [1], panels: 3, panelLen: 1.8, panelWid: 1.4, y: 0.75, strut: 0.2 },
        dish: { d: 2.2, vertex: [0, 0.66, 1.2], elev: 62, mount: [0, 0.75, 0.75] },
      }),
    heightM: 1.5,
    diameterM: 1.5,
    refs: [
      WIKI(
        'Mars_Orbiter_Mission',
        '1.5 m cube bus (length_m = cube edge, no dish counted), single 2.2 m reflector high-gain, I-1K bus',
      ),
    ],
  },
  hope: {
    build: () =>
      buildBoxOrbiter({
        bus: [2.37, 2.9, 2.37],
        hex: true,
        arrays: { sides: [1, -1], panels: 3, panelLen: 0.95, panelWid: 2.0, y: 1.45, strut: 0.25 },
        dish: { d: 1.85, vertex: [0, 1.45, 1.7], elev: 5, mount: [0, 1.45, 1.1] },
      }),
    heightM: 2.9,
    diameterM: 2.37,
    refs: [
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
      NSSDCA(
        '1971-051A',
        'Mariner 9',
        'octagon 138.4 cm across the diagonal, 45.7 cm deep; 4 panels 215 x 90 cm, 6.89 m per pair; 1.44 m low-gain mast; overall height 2.28 m (length_m)',
      ),
    ],
  },
  lro: {
    build: () =>
      buildBoxOrbiter({
        bus: [2.7, 3.9, 2.6],
        arrays: { sides: [1], panels: 1, panelLen: 4.1, panelWid: 2.6, y: 2.2, strut: 0.5 },
        dish: { d: 0.8, vertex: [-0.6, 3.2, 2.3], elev: 20, mount: [-0.6, 3.2, 1.3] },
      }),
    heightM: 3.9,
    diameterM: 2.7,
    refs: [
      WIKI(
        'Lunar_Reconnaissance_Orbiter',
        'launch configuration 390 x 270 x 260 cm (length_m = the 3.9 m side, stood upright)',
      ),
      NSSDCA('2009-031A', 'LRO', 'single 10.7 m2 solar array'),
    ],
  },
};
