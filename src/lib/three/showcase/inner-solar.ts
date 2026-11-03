/**
 * Showcase models: inner-solar-system orbiters (Parker Solar Probe, Solar Orbiter, MESSENGER,
 * Magellan, Akatsuki). Each stands upright with its long stowed axis vertical, base on y = 0,
 * front facing +z; sun-side hardware (heat shields, sunshades) is drawn at its real size.
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

/** Thin rod between two points. */
function rod(g: THREE.Object3D, m: Mat, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
  const len = a.distanceTo(b);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  add(g, mesh);
}

/**
 * Parabolic dish (double-sided shell) with its vertex at `pos` and its axis along `dir`.
 * `depth` is the rim-to-vertex distance.
 */
function dish(
  g: THREE.Object3D,
  m: Mat,
  R: number,
  depth: number,
  pos: THREE.Vector3,
  dir: THREE.Vector3,
): THREE.Group {
  const wrap = add(g, new THREE.Group());
  wrap.position.copy(pos);
  wrap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  const pts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const r = (R * i) / 14;
    pts.push([r, depth * (r / R) ** 2]);
  }
  lathe(wrap, m, pts, 48);
  return wrap;
}

interface PanelMats {
  frame: Mat;
  cell: Mat;
  line: Mat;
}

function panelMats(cell = 0x1a2a55): PanelMats {
  return {
    frame: mat(0xb9bcc2, 0.5, 0.45),
    cell: mat(cell, 0.6, 0.3),
    line: mat(0xc9a64a, 0.7, 0.35),
  };
}

/** Flat solar panel in the x-y plane (face toward +z), with a cell grid. */
function panel(
  g: THREE.Object3D,
  pm: PanelMats,
  cx: number,
  cy: number,
  w: number,
  h: number,
  nx: number,
  ny: number,
): THREE.Group {
  const p = add(g, new THREE.Group());
  p.position.set(cx, cy, 0);
  box(p, pm.frame, w, h, 0.04, 0, 0, 0);
  box(p, pm.cell, w - 0.08, h - 0.08, 0.05, 0, 0, 0);
  for (let i = 1; i < nx; i++) {
    box(p, pm.line, 0.01, h - 0.08, 0.056, -w / 2 + 0.04 + ((w - 0.08) * i) / nx, 0, 0);
  }
  for (let j = 1; j < ny; j++) {
    box(p, pm.line, w - 0.08, 0.01, 0.056, 0, -h / 2 + 0.04 + ((h - 0.08) * j) / ny, 0);
  }
  return p;
}

// ---------------------------------------------------------------------------------------------
// Parker Solar Probe: 3.0 m tall, carbon-carbon TPS (2.3 m) on top
// ---------------------------------------------------------------------------------------------

function buildParker(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(0xe6e3da, 0.1, 0.7);
  const carbon = mat(0x2a2a2d, 0.3, 0.8, true);
  const gold = mat(0xb08f45, 0.65, 0.4);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const metal = mat(0xb9bcc2, 0.7, 0.4);
  const pm = panelMats(0x232f52);

  // bus: hexagonal prism (aft end with the star tracker / boom side down)
  const bus = cyl(g, gold, 0.5, 0.5, 0, 1.55, 6);
  bus.rotation.y = Math.PI / 6;
  cyl(g, dark, 0.52, 0.52, 0.0, 0.1, 6);

  // secondary cone shade and the 2.3 m primary shield with its white-coated sun face
  lathe(g, carbon, [
    [0.52, 1.1],
    [1.0, 2.88],
  ]);
  cyl(g, carbon, 1.15, 1.15, 2.8, 2.9);
  cyl(g, white, 1.15, 1.15, 2.9, 3.0);
  cyl(g, dark, 1.17, 1.17, 2.86, 2.9, 48);

  // two actively cooled arrays, each a 1.12 x 0.69 m primary panel with a canted secondary
  for (const s of [-1, 1]) {
    const arm = box(g, metal, 0.28, 0.06, 0.06, s * 0.64, 0.66, 0);
    arm.name = 'array-arm';
    panel(g, pm, s * (0.5 + 0.14 + 0.56), 0.66, 1.12, 0.69, 6, 3);
    const sec = add(g, new THREE.Group());
    sec.position.set(s * (0.64 + 1.12), 0.66, 0);
    sec.rotation.y = -s * 0.95;
    panel(sec, pm, s * 0.19, 0, 0.38, 0.69, 2, 3);
  }

  // 0.6 m high-gain dish on the side, magnetometer boom out of the aft shadow
  dish(g, white, 0.3, 0.1, new THREE.Vector3(0, 0.95, 0.6), new THREE.Vector3(0, 0.15, 1));
  rod(g, metal, new THREE.Vector3(0, 0.95, 0.5), new THREE.Vector3(0, 0.95, 0.62), 0.03);
  rod(g, dark, new THREE.Vector3(0.2, 0.1, -0.3), new THREE.Vector3(0.2, 0.1, -1.7), 0.025);
  box(g, dark, 0.1, 0.1, 0.1, 0.2, 0.1, -1.72);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Solar Orbiter: 3.1 m tall heat shield on the sun (+z) side, 2.5 m wide body, 18 m array span
// ---------------------------------------------------------------------------------------------

function buildSolarOrbiter(): THREE.Group {
  const g = new THREE.Group();
  const H = 3.1;
  const shield = mat(0x1e1c1b, 0.2, 0.9);
  const gold = mat(0xb08f45, 0.65, 0.4);
  const white = mat(0xe6e3da, 0.1, 0.7);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const metal = mat(0xb9bcc2, 0.7, 0.4);
  const pm = panelMats(0x1a2a55);

  // body: gold-wrapped box behind the shield
  box(g, gold, 2.5, H - 0.1, 1.9, 0, H / 2, -0.4);
  box(g, white, 1.0, 1.0, 0.04, -0.4, 1.0, -1.37);

  // heat shield: stand-off struts and the layered titanium / calcium-phosphate slab
  for (const sx of [-1, 1]) {
    for (const sy of [0.4, H - 0.4]) {
      box(g, metal, 0.08, 0.08, 0.35, sx * 1.0, sy, 0.7);
    }
  }
  box(g, shield, 2.5, H, 0.16, 0, H / 2, 1.0 + 0.08);
  box(g, dark, 2.5, H, 0.02, 0, H / 2, 1.0 - 0.01);
  // observing-port doors on the shield (the instruments look out through these)
  for (const [x, y] of [
    [-0.55, 2.4],
    [0.55, 2.4],
    [0, 0.8],
  ] as [number, number][]) {
    box(g, dark, 0.4, 0.3, 0.02, x, y, 1.17);
  }

  // two arrays, three 2.1 x 1.2 m panels each, on yokes
  for (const s of [-1, 1]) {
    box(g, metal, 1.2, 0.08, 0.08, s * (1.25 + 0.6), 1.5, -0.2);
    for (let i = 0; i < 3; i++) {
      panel(g, pm, s * (1.25 + 1.3 + 2.1 * i + 1.05 + 0.05 * i), 1.5, 2.1, 1.2, 4, 3).position.z =
        -0.2;
    }
  }

  // instrument boom (4.4 m) and the 1.5 m high-gain dish, both on the shaded rear
  rod(g, metal, new THREE.Vector3(0.7, 1.9, -1.35), new THREE.Vector3(0.7, 1.9, -5.75), 0.04);
  box(g, dark, 0.14, 0.14, 0.14, 0.7, 1.9, -5.8);
  rod(g, metal, new THREE.Vector3(-0.6, 2.1, -1.35), new THREE.Vector3(-0.6, 2.1, -1.75), 0.05);
  dish(g, white, 0.75, 0.2, new THREE.Vector3(-0.6, 2.1, -1.75), new THREE.Vector3(0, 0.1, -1));
  return g;
}

// ---------------------------------------------------------------------------------------------
// MESSENGER: 2.5 m tall x 2 m wide ceramic-cloth sunshade, 1.27 x 1.42 x 1.85 m bus
// ---------------------------------------------------------------------------------------------

function buildMessenger(): THREE.Group {
  const g = new THREE.Group();
  const shade = mat(0xd8c9a8, 0.1, 0.9);
  const gold = mat(0xb08f45, 0.65, 0.4);
  const white = mat(0xe6e3da, 0.1, 0.7);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const metal = mat(0xb9bcc2, 0.7, 0.4);
  const pm = panelMats(0x1a2a55);

  // bus: squat box, 1.42 wide, 1.27 deep, 1.85 tall, behind the shade
  box(g, gold, 1.42, 1.85, 1.27, 0, 1.25, -0.15);
  box(g, white, 1.0, 0.9, 0.03, 0, 0.9, -0.8);
  // LVA thruster nozzle under the bus
  lathe(g, dark, [
    [0.12, 0.15],
    [0.2, 0.32],
  ]);
  cyl(g, dark, 0.12, 0.12, 0.3, 0.33, 16);

  // sunshade: ceramic-cloth panel standing off the sun (+z) face on struts
  for (const sx of [-0.5, 0.5]) {
    for (const sy of [0.6, 1.9]) {
      box(g, metal, 0.05, 0.05, 0.3, sx, sy, 0.62);
    }
  }
  box(g, shade, 2.0, 2.5, 0.05, 0, 1.25, 0.8);

  // two rotatable arrays (mixed cells and mirror strips), tip to tip about 6 m
  for (const s of [-1, 1]) {
    box(g, metal, 0.2, 0.06, 0.06, s * 0.8, 1.25, -0.15);
    panel(g, pm, s * (0.9 + 1.1), 1.25, 2.2, 1.5, 4, 3).position.z = -0.15;
  }

  // 3.6 m magnetometer boom off the shaded top rear
  rod(g, metal, new THREE.Vector3(0, 1.9, -0.78), new THREE.Vector3(0, 1.9, -4.38), 0.035);
  box(g, dark, 0.12, 0.12, 0.12, 0, 1.9, -4.42);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Magellan: 6.4 m stack — Star 48B motor, 10-sided bus, forward equipment module, 3.7 m dish
// ---------------------------------------------------------------------------------------------

function buildMagellan(): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(0xb08f45, 0.65, 0.4);
  const white = mat(0xe6e3da, 0.2, 0.6, true);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const metal = mat(0xb9bcc2, 0.7, 0.4);
  const motor = mat(0x6e7075, 0.55, 0.5);
  const pm = panelMats(0x1a2a55);

  // solid rocket motor (Star 48B) and its nozzle
  lathe(g, dark, [
    [0.14, 0.0],
    [0.5, 0.5],
  ]);
  lathe(g, motor, [
    [0.0, 0.5],
    [0.62, 0.5],
    [0.62, 1.55],
    [0.5, 1.8],
    [0.4, 1.9],
  ]);

  // 10-sided aluminium bus (Voyager spare)
  const bus = cyl(g, metal, 0.92, 0.92, 1.9, 2.6, 10);
  bus.rotation.y = Math.PI / 10;
  cyl(g, dark, 0.94, 0.94, 2.1, 2.14, 10).rotation.y = Math.PI / 10;
  cyl(g, dark, 0.94, 0.94, 2.36, 2.4, 10).rotation.y = Math.PI / 10;

  // forward equipment module: gold-blanketed drum under the dish
  cyl(g, gold, 0.72, 0.72, 2.6, 4.4, 10).rotation.y = Math.PI / 10;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    box(
      g,
      dark,
      0.3,
      0.4,
      0.12,
      Math.sin(a) * 0.76,
      3.0 + (i % 2) * 0.7,
      Math.cos(a) * 0.76,
    ).rotation.y = a;
  }

  // 3.7 m graphite / aluminium high-gain dish on a hub, feed on three struts
  cyl(g, metal, 0.25, 0.25, 4.4, 5.5, 12);
  dish(g, white, 1.85, 0.7, new THREE.Vector3(0, 5.5, 0), new THREE.Vector3(0, 1, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    rod(
      g,
      metal,
      new THREE.Vector3(Math.sin(a) * 1.8, 6.17, Math.cos(a) * 1.8),
      new THREE.Vector3(0, 6.35, 0),
      0.025,
    );
  }
  cyl(g, dark, 0.1, 0.05, 6.2, 6.4, 12);

  // two square solar panels on arms either side of the bus, 4.6 m across
  for (const s of [-1, 1]) {
    box(g, metal, 0.2, 0.08, 0.08, s * 1.0, 2.25, 0);
    panel(g, pm, s * (1.1 + 0.6), 2.6, 1.2, 2.4, 3, 6);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------
// Akatsuki: 1.04 x 1.44 x 1.45 m box, two arrays, flat phased-array high-gain antenna
// ---------------------------------------------------------------------------------------------

function buildAkatsuki(): THREE.Group {
  const g = new THREE.Group();
  const gold = mat(0xb08f45, 0.65, 0.4);
  const white = mat(0xe6e3da, 0.1, 0.7);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const metal = mat(0xb9bcc2, 0.7, 0.4);
  const pm = panelMats(0x1a2a55);

  // bus box (1.04 wide, 1.44 deep) with the 500 N orbit-manoeuvre engine below
  box(g, gold, 1.04, 1.3, 1.44, 0, 0.8, 0);
  lathe(g, dark, [
    [0.07, 0.0],
    [0.16, 0.2],
  ]);
  cyl(g, dark, 0.16, 0.16, 0.2, 0.25, 16);

  // flat high-gain antenna plate on the front face, with a white radiator beside it
  box(g, white, 0.8, 0.8, 0.05, 0, 0.95, 0.745);
  box(g, dark, 0.7, 0.7, 0.02, 0, 0.95, 0.775);
  box(g, white, 0.6, 0.3, 0.03, 0, 0.35, 0.735);

  // two arrays, about 1.4 m^2 each
  for (const s of [-1, 1]) {
    box(g, metal, 0.12, 0.06, 0.06, s * 0.58, 0.8, 0);
    panel(g, pm, s * (0.64 + 0.7), 0.8, 1.4, 1.0, 5, 3);
  }
  return g;
}

// ---------------------------------------------------------------------------------------------

const REF = (l: string, u: string): ShowcaseRef => ({ l, u });

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'parker-solar-probe': {
    build: buildParker,
    heightM: 3,
    diameterM: 2.3,
    refs: [
      REF(
        'NASA NSSDCA — Parker Solar Probe: 3 m bus, 1 m diameter, TPS end 2.3 m diameter, 11.43 cm thick; arrays 1.12 x 0.69 m; 0.6 m high-gain antenna',
        'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-065A',
      ),
    ],
  },
  'solar-orbiter': {
    build: buildSolarOrbiter,
    heightM: 3.1,
    diameterM: 2.5,
    refs: [
      REF(
        'ESA — Solar Orbiter factsheet: body 2.5 x 3.1 x 2.7 m (3.1 m used as height), six 2.1 x 1.2 m panels, 18 m span, 4.4 m instrument boom',
        'https://www.esa.int/Science_Exploration/Space_Science/Solar_Orbiter/Solar_Orbiter_factsheet',
      ),
    ],
  },
  messenger: {
    build: buildMessenger,
    heightM: 2.5,
    diameterM: 1.42,
    refs: [
      REF(
        'NASA NSSDCA — MESSENGER: bus 1.27 x 1.42 x 1.85 m, sunshade about 2.5 m tall x 2 m wide (2.5 m used as height), arrays about 6 m tip to tip, 3.6 m magnetometer boom',
        'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2004-030A',
      ),
    ],
  },
  magellan: {
    build: buildMagellan,
    heightM: 6.4,
    diameterM: 3.7,
    refs: [
      REF(
        'Wikipedia (fallback) — Magellan: 10-sided bus, 6.4 m tall x 4.6 m diameter, 3.7 m high-gain antenna, Star 48B motor',
        'https://en.wikipedia.org/wiki/Magellan_(spacecraft)',
      ),
    ],
  },
  akatsuki: {
    build: buildAkatsuki,
    heightM: 1.45,
    diameterM: 1.04,
    refs: [
      REF(
        'Wikipedia (fallback) — Akatsuki: 1.45 x 1.04 x 1.44 m box, two arrays of about 1.4 m^2 each (1.45 m used as height)',
        'https://en.wikipedia.org/wiki/Akatsuki_(spacecraft)',
      ),
    ],
  },
};
