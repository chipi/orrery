/**
 * Showcase models — the commercial crew / cargo capsules: Crew Dragon, Cargo Dragon 2, Cargo
 * Dragon v1, Starliner, Gaganyaan and New Shepard (whole vehicle, booster + capsule).
 *
 * Sourced dimensions (Wikipedia infoboxes — see `refs`): Dragon 2 capsule 4.5 m high, 4 m
 * across, 8.1 m with trunk; Dragon 1 6.1 m long, 3.7 m across, 2.3 m trunk; Starliner 5.03 m
 * (capsule + service module), 4.56 m across; Gaganyaan crew module 3.5 m x 3.58 m; New Shepard
 * 19.2 m tall, booster 3.8 m across. Everything not in a source (Dragon 1 array span, Gaganyaan
 * service-module length and arrays, Starliner / New Shepard module splits) is marked "estimate".
 */
import * as THREE from 'three';
import { strutBetween } from '../model-geom';
import type { ShowcaseModel, ShowcaseRef } from './types';

const WHITE = 0xf1f1ee;
const WHITE_DIM = 0xd9d9d4;
const BLACK = 0x15161a;
const HEAT = 0x2b2320;
const METAL = 0x8c9097;
const CELL = 0x1a2350;
const CELL_FRAME = 0xb9bec8;
const BLUE = 0x1d4fa3;
const GOLD = 0xc9a24a;

type Mats = Record<string, THREE.MeshStandardMaterial>;

function mat(color: number, rough = 0.6, metal = 0.05): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    side: THREE.DoubleSide,
  });
}

function baseMats(): Mats {
  return {
    white: mat(WHITE, 0.55),
    whiteDim: mat(WHITE_DIM, 0.6),
    black: mat(BLACK, 0.5, 0.2),
    heat: mat(HEAT, 0.85),
    metal: mat(METAL, 0.45, 0.25),
    cell: mat(CELL, 0.35, 0.3),
    frame: mat(CELL_FRAME, 0.4, 0.5),
    blue: mat(BLUE, 0.5),
    gold: mat(GOLD, 0.4, 0.3),
    glass: mat(0x0a1018, 0.15, 0.4),
  };
}

function lathe(points: [number, number][], m: THREE.Material, seg = 40): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.LatheGeometry(
      points.map(([r, y]) => new THREE.Vector2(r, y)),
      seg,
    ),
    m,
  );
}

function cyl(
  rTop: number,
  rBot: number,
  y0: number,
  y1: number,
  m: THREE.Material,
  seg = 40,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg), m);
  mesh.position.y = (y0 + y1) / 2;
  return mesh;
}

function box(w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Wrap `obj` (built facing +z, origin at its centre) at angle `theta` (0 = +z) on radius `r`. */
function radial(
  parent: THREE.Group,
  obj: THREE.Object3D,
  theta: number,
  r: number,
  y: number,
  tilt = 0,
): void {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  g.rotation.y = theta;
  g.rotation.x = -tilt;
  g.position.set(r * Math.sin(theta), y, r * Math.cos(theta));
  g.add(obj);
  parent.add(g);
}

function nozzle(m: THREE.Material, r0: number, r1: number, len: number): THREE.Mesh {
  const n = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 14, 1, true), m);
  n.rotation.x = Math.PI / 2;
  return n;
}

function panelFrame(
  w: number,
  l: number,
  m: Mats,
  cols: number,
  rows: number,
  y: number,
): THREE.Group {
  const g = new THREE.Group();
  g.add(box(w, 0.04, l, m.cell, 0, y, 0));
  for (let i = 0; i <= cols; i++)
    g.add(box(0.025, 0.05, l, m.frame, -w / 2 + (i * w) / cols, y, 0));
  for (let j = 0; j <= rows; j++)
    g.add(box(w, 0.05, 0.025, m.frame, 0, y, -l / 2 + (j * l) / rows));
  return g;
}

/** Dragon 2 gumdrop capsule with black nose cone; base (heat shield) at y = base. */
function dragon2Capsule(g: THREE.Group, m: Mats, base: number, crew: boolean): void {
  const cap = new THREE.Group();
  cap.position.y = base;
  cap.add(
    lathe(
      [
        [0, 0],
        [1.8, 0],
        [1.98, 0.14],
        [1.99, 0.35],
        [1.55, 1.4],
        [1.1, 2.7],
        [0.98, 3.4],
      ],
      m.white,
    ),
  );
  const shield = lathe(
    [
      [0, 0],
      [1.9, 0],
      [1.98, 0.14],
    ],
    m.heat,
  );
  cap.add(shield);
  cap.add(
    lathe(
      [
        [0.98, 3.4],
        [0.9, 3.45],
        [0.88, 3.55],
        [0.74, 4.2],
        [0.5, 4.45],
        [0, 4.5],
      ],
      m.black,
    ),
  );
  cap.add(cyl(0.92, 0.92, 3.38, 3.46, m.metal, 32));
  const slope = Math.atan((1.99 - 1.1) / 2.35);
  const sideR = (h: number) => 1.99 - ((1.99 - 1.1) * (h - 0.35)) / 2.35;
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    radial(cap, box(0.16, 0.12, 0.05, m.black), th, 0.94, 3.25, 0);
  }
  if (crew) {
    for (let k = 0; k < 4; k++) {
      const th = Math.PI / 4 + (k * Math.PI) / 2;
      const pod = new THREE.Group();
      pod.add(box(0.62, 1.0, 0.3, m.white, 0, 0, 0.1));
      const lip = box(0.66, 0.06, 0.34, m.metal, 0, -0.5, 0.1);
      pod.add(lip);
      for (const dx of [-0.15, 0.15]) {
        const n = nozzle(m.black, 0.08, 0.11, 0.22);
        n.position.set(dx, -0.1, 0.27);
        pod.add(n);
      }
      radial(cap, pod, th, sideR(1.15) + 0.1, 1.15, slope);
    }
    for (const th of [0.26, -0.26, Math.PI + 0.26, Math.PI - 0.26]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24), m.glass);
      w.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 24), m.metal);
      const grp = new THREE.Group();
      grp.add(w, ring);
      radial(cap, grp, th, sideR(2.2) + 0.01, 2.2, slope);
    }
  } else {
    for (let k = 0; k < 4; k++) {
      const th = Math.PI / 4 + (k * Math.PI) / 2;
      radial(cap, box(0.34, 0.5, 0.12, m.whiteDim), th, sideR(1.15) + 0.03, 1.15, slope);
    }
    radial(cap, box(0.9, 1.0, 0.04, m.whiteDim), 0, sideR(1.9) + 0.01, 1.9, slope);
  }
  g.add(cap);
}

/** Dragon 2 unpressurised trunk, y 0 .. h: body-mounted cells on the +z half and two fins. */
function dragon2Trunk(g: THREE.Group, m: Mats, h: number): void {
  g.add(cyl(1.95, 1.95, 0, h, m.white, 48));
  g.add(cyl(1.98, 1.98, 0, 0.12, m.metal, 48));
  const cells = new THREE.Mesh(
    new THREE.CylinderGeometry(
      1.965,
      1.965,
      h - 0.5,
      36,
      1,
      true,
      -Math.PI / 2 - 0.15,
      Math.PI + 0.3,
    ),
    m.cell,
  );
  cells.position.y = h / 2;
  g.add(cells);
  for (let i = 1; i < 6; i++)
    g.add(cyl(1.972, 1.972, 0.25 + (i * (h - 0.5)) / 6, 0.265 + (i * (h - 0.5)) / 6, m.frame, 48));
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.1);
  shape.lineTo(0.95, 0.55);
  shape.lineTo(0.95, h - 0.65);
  shape.lineTo(0, h - 0.1);
  shape.closePath();
  for (const side of [-1, 1]) {
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
    const fin = new THREE.Mesh(geo, m.white);
    fin.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    fin.position.set(side * 1.9, 0, side === 1 ? -0.035 : 0.035);
    g.add(fin);
  }
}

function buildDragon2(crew: boolean): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const trunkH = 3.6;
  dragon2Trunk(g, m, trunkH);
  dragon2Capsule(g, m, trunkH, crew);
  return g;
}

const DRAGON2_REFS: ShowcaseRef[] = [
  {
    l: 'SpaceX Dragon 2 — Wikipedia (capsule 4.5 m, 4 m across, 8.1 m with trunk)',
    u: 'https://en.wikipedia.org/wiki/SpaceX_Dragon_2',
  },
];

/** Dragon 1: capsule 3.8 m (hinged nose cap) on a 2.3 m trunk with two deployed arrays. */
function buildDragon1(): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const trunkH = 2.3;
  g.add(cyl(1.85, 1.85, 0, trunkH, m.white, 48));
  g.add(cyl(1.88, 1.88, 0, 0.1, m.metal, 48));
  g.add(cyl(1.88, 1.88, trunkH - 0.1, trunkH, m.metal, 48));
  for (const side of [-1, 1]) {
    g.add(box(0.1, 1.5, 1.4, m.metal, side * 1.9, 1.25, 0));
    const wing = new THREE.Group();
    wing.position.set(side * 1.95, 1.15, 0);
    const spar = box(0.14, 0.05, 0.05, m.metal);
    wing.add(spar);
    const sectionLen = 3.2;
    for (let s = 0; s < 2; s++) {
      const pnl = panelFrame(sectionLen - 0.1, 2.2, m, 6, 3, 0);
      pnl.position.x = side * (sectionLen / 2 + s * sectionLen + 0.05);
      pnl.rotation.x = Math.PI / 2;
      wing.add(pnl);
    }
    g.add(wing);
  }
  const capBase = trunkH;
  const cap = new THREE.Group();
  cap.position.y = capBase;
  cap.add(
    lathe(
      [
        [0, 0],
        [1.8, 0],
        [1.86, 0.1],
        [1.86, 0.2],
        [1.5, 1.2],
        [0.95, 2.6],
        [0.9, 2.9],
      ],
      m.white,
    ),
  );
  cap.add(
    lathe(
      [
        [0, 0],
        [1.8, 0],
        [1.86, 0.1],
      ],
      m.heat,
    ),
  );
  cap.add(
    lathe(
      [
        [0.9, 2.9],
        [0.82, 3.0],
        [0.7, 3.5],
        [0.45, 3.78],
        [0, 3.8],
      ],
      m.white,
    ),
  );
  cap.add(cyl(0.92, 0.92, 2.88, 2.94, m.metal, 32));
  cap.add(box(0.5, 0.1, 0.12, m.metal, 0, 3.62, 0.62));
  for (const th of [0.3, -0.3]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), m.glass);
    w.rotation.x = Math.PI / 2;
    radial(cap, w, th, 1.26, 1.9, Math.atan(0.55 / 1.4));
  }
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const quad = new THREE.Group();
    quad.add(box(0.3, 0.3, 0.12, m.black));
    for (const [dx, dy] of [
      [-0.07, 0.07],
      [0.07, 0.07],
      [-0.07, -0.07],
      [0.07, -0.07],
    ]) {
      const n = nozzle(m.heat, 0.03, 0.045, 0.1);
      n.position.set(dx, dy, 0.08);
      quad.add(n);
    }
    radial(cap, quad, th, 1.58, 1.1, 0.35);
  }
  g.add(cap);
  return g;
}

/** Starliner: capsule on service module, 4 launch-abort engine pods + RCS quads on the SM. */
function buildStarliner(): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const smH = 1.7;
  const skirtTop = 2.0;
  g.add(cyl(2.2, 2.2, 0, smH, m.white, 48));
  g.add(cyl(2.2, 2.2, 0, 0.1, m.metal, 48));
  g.add(cyl(2.28, 2.2, smH, skirtTop, m.metal, 48));
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const pod = new THREE.Group();
    pod.add(box(0.8, 0.9, 0.16, m.whiteDim));
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.12, 0.3, 20, 1, true), m.gold);
    bell.rotation.x = Math.PI / 2;
    bell.position.set(0, -0.05, 0.12);
    pod.add(bell);
    radial(g, pod, th, 2.22, 0.95, 0);
  }
  for (let k = 0; k < 4; k++) {
    const th = (k * Math.PI) / 2;
    const quad = new THREE.Group();
    quad.add(box(0.5, 0.4, 0.08, m.black));
    for (const [dx, dy] of [
      [-0.12, 0.09],
      [0.12, 0.09],
      [-0.12, -0.09],
      [0.12, -0.09],
    ]) {
      const n = nozzle(m.heat, 0.035, 0.05, 0.1);
      n.position.set(dx, dy, 0.07);
      quad.add(n);
    }
    radial(g, quad, th, 2.22, 1.15, 0);
  }
  const cap = new THREE.Group();
  cap.position.y = skirtTop;
  cap.add(
    lathe(
      [
        [0, 0],
        [2.0, 0],
        [2.28, 0.1],
        [2.2, 0.5],
        [1.7, 1.5],
        [1.3, 2.2],
        [0.95, 2.62],
      ],
      m.white,
    ),
  );
  cap.add(
    lathe(
      [
        [2.21, 0.1],
        [2.2, 0.5],
        [2.12, 0.78],
        [2.24, 0.78],
        [2.27, 0.1],
      ],
      m.blue,
    ),
  );
  cap.add(
    lathe(
      [
        [0.95, 2.62],
        [0.7, 2.7],
        [0.62, 3.02],
        [0.0, 3.03],
      ],
      m.metal,
    ),
  );
  cap.add(cyl(0.68, 0.68, 2.64, 2.78, m.black, 32));
  for (const th of [0.28, -0.28]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 22), m.glass);
    w.rotation.x = Math.PI / 2;
    radial(cap, w, th, 1.5, 1.9, 0.52);
  }
  radial(cap, box(0.9, 0.9, 0.04, m.whiteDim), Math.PI, 1.93, 1.1, 0.46);
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const quad = new THREE.Group();
    quad.add(box(0.3, 0.26, 0.08, m.black));
    radial(cap, quad, th, 1.4, 2.1, 0.52);
  }
  g.add(cap);
  return g;
}

/** Gaganyaan: conical crew module (3.5 x 3.58 m) on a cylindrical service module, twin arrays. */
function buildGaganyaan(): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const smH = 2.0;
  g.add(cyl(1.75, 1.75, 0, smH, m.gold, 48));
  g.add(cyl(1.78, 1.78, 0, 0.1, m.metal, 48));
  g.add(cyl(1.78, 1.78, smH - 0.1, smH, m.metal, 48));
  for (let k = 0; k < 5; k++) {
    const th = (k * 2 * Math.PI) / 5;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.22, 16, 1, true), m.metal);
    n.position.set(0.9 * Math.sin(th), 0.11, 0.9 * Math.cos(th));
    g.add(n);
  }
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const quad = new THREE.Group();
    quad.add(box(0.36, 0.3, 0.08, m.black));
    radial(g, quad, th, 1.78, smH - 0.4, 0);
  }
  const arms = new THREE.Group();
  for (const side of [-1, 1]) {
    arms.add(box(0.1, 0.5, 0.6, m.metal, side * 1.8, 1.35, 0));
    const wing = new THREE.Group();
    wing.position.set(side * 1.85, 1.35, 0);
    for (let s = 0; s < 2; s++) {
      const pnl = panelFrame(1.4, 2.6, m, 4, 6, 0);
      pnl.position.x = side * (0.7 + s * 1.45);
      pnl.rotation.x = Math.PI / 2;
      wing.add(pnl);
    }
    arms.add(wing);
  }
  g.add(arms);
  const cm = new THREE.Group();
  cm.position.y = smH;
  cm.add(
    lathe(
      [
        [0, 0],
        [1.65, 0],
        [1.75, 0.1],
        [1.7, 0.4],
        [1.0, 2.7],
        [0.75, 3.3],
        [0.6, 3.5],
        [0, 3.58],
      ],
      m.white,
    ),
  );
  cm.add(
    lathe(
      [
        [0, 0],
        [1.65, 0],
        [1.75, 0.1],
      ],
      m.heat,
    ),
  );
  cm.add(cyl(0.62, 0.62, 3.4, 3.5, m.metal, 28));
  const sl = Math.atan(0.7 / 2.3);
  for (const th of [0.3, -0.3]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 22), m.glass);
    w.rotation.x = Math.PI / 2;
    radial(cm, w, th, 1.34, 1.7, sl);
  }
  radial(cm, box(0.7, 0.8, 0.04, m.whiteDim), Math.PI, 1.41, 1.5, sl);
  g.add(cm);
  return g;
}

/** Mengzhou, lunar configuration: long service module with two wings, 4.5 m blunt-cone crew module. */
function buildMengzhou(): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const smH = 5.5;
  g.add(cyl(2.1, 2.1, 0, smH, m.whiteDim, 48));
  g.add(cyl(2.13, 2.13, 0, 0.12, m.metal, 48));
  g.add(cyl(2.13, 2.13, smH - 0.12, smH, m.metal, 48));
  g.add(cyl(2.11, 2.11, 1.2, 2.4, m.gold, 48));
  for (let k = 0; k < 4; k++) {
    const quad = new THREE.Group();
    quad.add(box(0.4, 0.34, 0.1, m.black));
    radial(g, quad, Math.PI / 4 + (k * Math.PI) / 2, 2.13, smH - 0.5, 0);
  }
  for (const side of [-1, 1]) {
    g.add(box(0.12, 0.5, 0.6, m.metal, side * 2.15, 3.6, 0));
    const wing = new THREE.Group();
    wing.position.set(side * 2.2, 3.6, 0);
    for (let s = 0; s < 3; s++) {
      const pnl = panelFrame(1.6, 2.4, m, 4, 6, 0);
      pnl.position.x = side * (0.85 + s * 1.65);
      pnl.rotation.x = Math.PI / 2;
      wing.add(pnl);
    }
    g.add(wing);
  }
  const cm = new THREE.Group();
  cm.position.y = smH;
  cm.add(
    lathe(
      [
        [0, 0],
        [2.15, 0],
        [2.25, 0.12],
        [2.15, 0.45],
        [1.0, 2.95],
        [0.85, 3.2],
        [0, 3.3],
      ],
      m.white,
    ),
  );
  cm.add(
    lathe(
      [
        [0, 0],
        [2.15, 0],
        [2.25, 0.12],
      ],
      m.heat,
    ),
  );
  const sl = Math.atan(1.15 / 2.5);
  for (const th of [0.35, -0.35]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 22), m.glass);
    w.rotation.x = Math.PI / 2;
    radial(cm, w, th, 1.62, 1.6, sl);
  }
  radial(cm, box(0.8, 0.9, 0.04, m.whiteDim), Math.PI, 1.7, 1.4, sl);
  g.add(cm);
  return g;
}

/** New Shepard: booster (ring fin, wedge fins, landing gear) with the crew capsule on top. */
function buildNewShepard(): THREE.Group {
  const m = baseMats();
  const g = new THREE.Group();
  const boosterTop = 15.2;
  const bodyBottom = 0.6;
  const R = 1.9;
  g.add(cyl(R, R, bodyBottom + 0.2, boosterTop - 0.5, m.white, 48));
  g.add(cyl(R + 0.015, R + 0.015, boosterTop - 3.4, boosterTop - 2.4, m.blue, 48));
  g.add(cyl(R, R, bodyBottom, bodyBottom + 0.2, m.black, 48));
  g.add(
    lathe(
      [
        [R, boosterTop - 0.5],
        [1.7, boosterTop - 0.2],
        [1.6, boosterTop],
      ],
      m.white,
    ),
  );
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.28, 0.9, 24, 1, true), m.metal);
  nz.position.y = bodyBottom + 0.05;
  g.add(nz);
  for (let k = 0; k < 8; k++) {
    const th = (k * Math.PI) / 4;
    g.add(
      box(0.05, 12.8, 0.05, m.whiteDim, (R + 0.01) * Math.sin(th), 7.9, (R + 0.01) * Math.cos(th)),
    );
  }
  const ringY = boosterTop - 2.4;
  const ring = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [2.45, 0],
        [2.62, 0],
        [2.62, 1.3],
        [2.45, 1.3],
        [2.45, 0],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      48,
    ),
    m.white,
  );
  ring.position.y = ringY - 0.4;
  g.add(ring);
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const a = new THREE.Vector3(R * Math.sin(th), ringY + 0.25, R * Math.cos(th));
    const b = new THREE.Vector3(2.5 * Math.sin(th), ringY + 0.25, 2.5 * Math.cos(th));
    g.add(strutBetween(a, b, 0.05, m.white, 8));
  }
  const wedge = new THREE.Shape();
  wedge.moveTo(0, 0);
  wedge.lineTo(1.1, 0);
  wedge.lineTo(0, 3.6);
  wedge.closePath();
  for (let k = 0; k < 3; k++) {
    const th = (k * 2 * Math.PI) / 3 + Math.PI / 6;
    const fin = new THREE.Mesh(
      new THREE.ExtrudeGeometry(wedge, { depth: 0.22, bevelEnabled: false }),
      m.white,
    );
    fin.position.set(0, bodyBottom + 0.2, -0.11);
    const holder = new THREE.Group();
    holder.rotation.y = Math.PI / 2 - th;
    fin.position.x = R - 0.02;
    holder.add(fin);
    g.add(holder);
  }
  for (let k = 0; k < 4; k++) {
    const th = (k * Math.PI) / 2 + Math.PI / 4;
    const hip = new THREE.Vector3(R * Math.sin(th), bodyBottom + 2.6, R * Math.cos(th));
    const foot = new THREE.Vector3(3.0 * Math.sin(th), 0.1, 3.0 * Math.cos(th));
    g.add(strutBetween(hip, foot, 0.09, m.metal, 10));
    const knee = new THREE.Vector3(R * Math.sin(th), bodyBottom + 0.5, R * Math.cos(th));
    g.add(strutBetween(knee, foot.clone().lerp(hip, 0.15), 0.06, m.metal, 8));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 16), m.black);
    pad.position.set(foot.x, 0.06, foot.z);
    g.add(pad);
  }
  const cap = new THREE.Group();
  cap.position.y = boosterTop;
  cap.add(
    lathe(
      [
        [0, 0],
        [1.55, 0],
        [1.95, 0.15],
        [1.9, 0.5],
        [1.7, 1.6],
        [1.35, 2.5],
        [1.05, 3.1],
        [0.9, 3.2],
      ],
      m.white,
    ),
  );
  cap.add(
    lathe(
      [
        [1.93, 0.15],
        [1.9, 0.5],
        [1.86, 0.9],
        [1.95, 0.9],
        [1.97, 0.15],
      ],
      m.blue,
    ),
  );
  cap.add(
    lathe(
      [
        [0.9, 3.2],
        [0.78, 3.4],
        [0.6, 3.75],
        [0.32, 3.98],
        [0, 4.0],
      ],
      m.black,
    ),
  );
  for (let k = 0; k < 6; k++) {
    const th = (k * Math.PI) / 3 + Math.PI / 6;
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 24), m.glass);
    w.rotation.x = Math.PI / 2;
    w.scale.set(1, 1, 1.4);
    radial(cap, w, th, 1.74, 1.7, Math.atan(0.35 / 1.0));
  }
  g.add(cap);
  return g;
}

/** Orion: crew module (5.02 m, 3.35 m) on the ESM (4.0 m + 0.55 m engine bell), 4 X-wings. */
function buildOrion(): THREE.Group {
  const m = baseMats();
  m.shell = mat(0xcfd2d6, 0.55, 0.15);
  m.mli = mat(0xc89a3c, 0.45, 0.3);
  m.rad = mat(0x6d7379, 0.5, 0.2);
  const g = new THREE.Group();
  const esmY0 = 0.55;
  const esmH = 4.0;
  const esmR = 2.05;
  g.add(cyl(esmR, esmR, esmY0, esmY0 + esmH, m.shell, 48));
  g.add(cyl(esmR + 0.02, esmR + 0.02, esmY0, esmY0 + 1.3, m.mli, 48));
  g.add(cyl(esmR + 0.04, esmR + 0.04, esmY0 + 1.3, esmY0 + 1.36, m.metal, 48));
  g.add(cyl(esmR + 0.04, esmR + 0.04, esmY0 + esmH - 0.08, esmY0 + esmH, m.metal, 48));
  for (let k = 0; k < 4; k++) {
    const th = (k * Math.PI) / 2;
    radial(g, box(1.5, 1.3, 0.04, m.rad), th, esmR + 0.02, esmY0 + 2.7, 0);
  }
  for (let k = 0; k < 6; k++) {
    const th = Math.PI / 6 + (k * Math.PI) / 3;
    const pod = new THREE.Group();
    pod.add(box(0.5, 0.4, 0.14, m.black));
    for (const [dx, dy] of [
      [-0.1, 0.08],
      [0.1, 0.08],
      [-0.1, -0.08],
      [0.1, -0.08],
    ]) {
      const n = nozzle(m.heat, 0.03, 0.045, 0.1);
      n.position.set(dx, dy, 0.08);
      pod.add(n);
    }
    radial(g, pod, th, esmR + 0.06, esmY0 + esmH - 0.55, 0);
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.46, 1.1, 28, 1, true), m.metal);
  bell.position.y = esmY0;
  g.add(bell);
  g.add(cyl(0.3, 0.3, esmY0 + 0.4, esmY0 + 0.7, m.heat, 20));
  for (let k = 0; k < 8; k++) {
    const th = (k * Math.PI) / 4;
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.3, 12, 1, true), m.metal);
    n.position.set(1.3 * Math.sin(th), esmY0 - 0.1, 1.3 * Math.cos(th));
    g.add(n);
  }
  const panelL = 2.4;
  const wingMid = esmY0 + 2.0;
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    const wing = new THREE.Group();
    wing.rotation.y = th - Math.PI / 2;
    wing.position.y = wingMid;
    wing.add(box(0.5, 0.35, 0.3, m.metal, esmR + 0.2, 0, 0));
    for (let s = 0; s < 3; s++) {
      const pnl = panelFrame(panelL - 0.06, 1.9, m, 6, 5, 0);
      pnl.rotation.x = Math.PI / 2;
      pnl.position.x = esmR + 0.35 + panelL / 2 + s * panelL;
      wing.add(pnl);
      wing.add(box(0.1, 0.1, 0.1, m.metal, esmR + 0.35 + s * panelL, 0, 0));
    }
    g.add(wing);
  }
  const cm = new THREE.Group();
  cm.position.y = esmY0 + esmH;
  cm.add(cyl(1.1, 1.3, 0, 0.12, m.black, 32));
  const cmBase = 0.12;
  cm.add(
    lathe(
      [
        [0, cmBase],
        [2.3, cmBase],
        [2.51, cmBase + 0.12],
        [2.4, cmBase + 0.5],
        [0.78, 3.0],
        [0.64, 3.1],
        [0.64, 3.28],
        [0.5, 3.35],
        [0, 3.35],
      ],
      m.shell,
    ),
  );
  cm.add(
    lathe(
      [
        [0, cmBase],
        [2.3, cmBase],
        [2.51, cmBase + 0.12],
      ],
      m.heat,
    ),
  );
  cm.add(cyl(0.68, 0.68, 3.12, 3.18, m.metal, 28));
  for (let i = 1; i < 5; i++) {
    const y = 0.12 + (i * 2.7) / 5;
    const r = 2.4 - ((2.4 - 0.78) * (y - 0.62)) / 2.38;
    cm.add(cyl(r + 0.012, r + 0.012, y, y + 0.025, m.whiteDim, 48));
  }
  const slope = Math.atan((2.4 - 0.78) / 2.38);
  for (const th of [0.32, -0.32, Math.PI + 0.32, Math.PI - 0.32]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), m.glass);
    w.rotation.x = Math.PI / 2;
    radial(cm, w, th, 1.6, 1.85, slope);
  }
  for (let k = 0; k < 4; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2;
    radial(cm, box(0.34, 0.28, 0.08, m.black), th, 2.03, 1.2, slope);
  }
  g.add(cm);
  return g;
}

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'crew-dragon': {
    build: () => buildDragon2(true),
    heightM: 8.1,
    diameterM: 4,
    refs: DRAGON2_REFS,
  },
  'cargo-dragon-2': {
    build: () => buildDragon2(false),
    heightM: 8.1,
    diameterM: 4,
    refs: DRAGON2_REFS,
  },
  'cargo-dragon-v1': {
    build: buildDragon1,
    heightM: 6.1,
    diameterM: 3.7,
    refs: [
      {
        l: 'SpaceX Dragon 1 — Wikipedia (6.1 m, 3.7 m, trunk 2.3 m; array span estimate)',
        u: 'https://en.wikipedia.org/wiki/SpaceX_Dragon_1',
      },
    ],
  },
  starliner: {
    build: buildStarliner,
    heightM: 5.03,
    diameterM: 4.56,
    refs: [
      {
        l: 'Boeing Starliner — Wikipedia (5.03 m capsule + SM, 4.56 m; module split estimate)',
        u: 'https://en.wikipedia.org/wiki/Boeing_Starliner',
      },
    ],
  },
  gaganyaan: {
    build: buildGaganyaan,
    heightM: 5.58,
    diameterM: 3.5,
    refs: [
      {
        l: 'Gaganyaan — Wikipedia (crew module 3.5 m x 3.58 m; SM length and arrays estimate)',
        u: 'https://en.wikipedia.org/wiki/Gaganyaan',
      },
    ],
  },
  mengzhou: {
    build: buildMengzhou,
    heightM: 8.8,
    diameterM: 4.5,
    refs: [
      {
        l: 'Mengzhou (spacecraft) — Wikipedia (8.8 m lunar configuration, crew module 4.5 m; module split and wings estimate)',
        u: 'https://en.wikipedia.org/wiki/Mengzhou_(spacecraft)',
      },
    ],
  },
  orion: {
    build: buildOrion,
    heightM: 7.9,
    diameterM: 5.02,
    refs: [
      {
        l: 'Orion (spacecraft) — Wikipedia (crew module 5.02 m x 3.3 m)',
        u: 'https://en.wikipedia.org/wiki/Orion_(spacecraft)',
      },
      {
        l: 'European Service Module — Wikipedia (4 m long, 4.1 m, 4 wings x 7.375 m, 19 m deployed; wing width estimate)',
        u: 'https://en.wikipedia.org/wiki/European_Service_Module',
      },
      {
        l: 'NASA Orion by the numbers (7.9 m overall)',
        u: 'https://www.nasa.gov/wp-content/uploads/2026/01/orion-by-the-numbers-2026b.pdf',
      },
    ],
  },
  'new-shepard': {
    build: buildNewShepard,
    heightM: 19.2,
    diameterM: 3.8,
    refs: [
      {
        l: 'New Shepard — Wikipedia (19.2 m, booster 3.8 m, 6 windows; booster/capsule split estimate)',
        u: 'https://en.wikipedia.org/wiki/New_Shepard',
      },
    ],
  },
};
