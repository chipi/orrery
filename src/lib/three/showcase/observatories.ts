/**
 * Showcase models: the space observatories (operator 2026-11-23: one detailed central model per
 * craft). Every craft stands with its long axis up, base on y = 0, front toward +z, arrays and
 * sunshields deployed as in flight, the drawn height equal to `heightM`.
 *
 * What makes each read as itself is listed on its builder: Hubble's crinkled silver light shield
 * with the open aperture door and the two rigid wings; JWST's 18 gold hexagons, tripod and
 * five-layer sunshield; Chandra's long tapered tube with the two wings; Spitzer's single tilted
 * panel against the cryostat tube; Kepler's amber-wrapped barrel and fixed panel; TESS's four
 * hooded cameras; Gaia's 10 m sunshield skirt; Euclid's baffle behind the solar-array shield;
 * XMM-Newton's tube with the mirror-module face; Compton's boxy instrument deck; Hitomi's
 * extended optical bench; Spektr-RG's seven-module eROSITA beside the ART-XC tube.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, beam, box, crinkle, dish, foilSheet, hash3, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

function mats(): Record<string, Mat> {
  return {
    foil: mat(0xd2d5da, 0.55, 0.3, true),
    foilDk: mat(0x9b9fa7, 0.55, 0.38, true),
    gold: mat(0xd6a53c, 0.55, 0.36, true),
    amber: mat(0xb8782c, 0.5, 0.42, true),
    kapton: mat(0xc98d34, 0.5, 0.4, true),
    shine: mat(0xdfe2e6, 0.55, 0.2),
    alu: mat(0x9aa0a8, 0.55, 0.42),
    aluDk: mat(0x5d6168, 0.55, 0.45),
    dark: mat(0x23262b, 0.4, 0.65),
    black: mat(0x101114, 0.3, 0.7, true),
    white: mat(0xe9e7e1, 0.2, 0.5),
    cream: mat(0xd9d2c0, 0.2, 0.55),
    solar: mat(0x1f3568, 0.5, 0.3),
    solarDk: mat(0x151d36, 0.5, 0.35),
    cell: mat(0x93a2c4, 0.5, 0.4),
    back: mat(0xb9bcc2, 0.55, 0.45),
    mirror: mat(0xe0b13a, 0.55, 0.22),
    beryl: mat(0x2a2623, 0.45, 0.5),
    purple: mat(0x7d4f82, 0.35, 0.5, true),
    shield: mat(0xc8c6d8, 0.55, 0.28, true),
    glass: Object.assign(mat(0x020306, 0.05, 0.55), { envMapIntensity: 0.25 }),
  };
}

/** A cylinder or frustum on the y axis from y0 (radius r0) to y1 (radius r1). */
function cyl(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  x = 0,
  z = 0,
  seg = 36,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** An n-sided prism on the y axis, a flat face toward +z, `r` the corner radius. */
function prism(
  g: THREE.Object3D,
  m: Mat,
  n: number,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  x = 0,
  z = 0,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r1, r0, y1 - y0, n, 1);
  geo.rotateY(Math.PI / n);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** A crumpled open foil tube on the y axis. */
function foilTube(
  g: THREE.Object3D,
  m: Mat,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  amp: number,
  x = 0,
  z = 0,
  seg = 40,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(
    r1,
    r0,
    y1 - y0,
    seg,
    Math.max(2, Math.round((y1 - y0) / 0.22)),
    true,
  );
  const mesh = new THREE.Mesh(crinkle(geo, amp), m);
  mesh.position.set(x, (y0 + y1) / 2, z);
  return add(g, mesh);
}

/** Thin hoop (a band) around the y axis. */
function band(g: THREE.Object3D, m: Mat, r: number, y: number, h: number, x = 0, z = 0): void {
  cyl(g, m, r, r, y - h / 2, y + h / 2, x, z, 40, true);
}

/** Vertical straps and hoops over a cylinder: seams of the blanket. */
function seams(
  g: THREE.Object3D,
  m: Mat,
  r: number,
  y0: number,
  y1: number,
  n: number,
  x = 0,
  z = 0,
): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = box(g, m, 0.045, y1 - y0, 0.02, 0, (y0 + y1) / 2, 0);
    s.position.set(x + Math.sin(a) * (r + 0.01), (y0 + y1) / 2, z + Math.cos(a) * (r + 0.01));
    s.rotation.y = a;
  }
}

/** A flat rounded rectangle w × h, thickness t, lying in the xy plane. */
function roundRect(m: Mat, w: number, h: number, r: number, t: number): THREE.Mesh {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  geo.translate(0, 0, -t / 2);
  return new THREE.Mesh(geo, m);
}

/** A solar panel w × h facing +z: framed, cell-gridded; the back is plain silver. */
function cellPanel(
  M: Record<string, Mat>,
  w: number,
  h: number,
  nx: number,
  ny: number,
  front: Mat = M.solar,
): THREE.Group {
  const p = new THREE.Group();
  const t = 0.05;
  p.add(
    new THREE.Mesh(new THREE.BoxGeometry(w, h, t), [M.alu, M.alu, M.alu, M.alu, front, M.back]),
  );
  for (let i = 1; i < nx; i++)
    box(p, M.cell, 0.01, h - 0.05, 0.004, -w / 2 + (i * w) / nx, 0, t / 2 + 0.002);
  for (let j = 1; j < ny; j++)
    box(p, M.cell, w - 0.05, 0.01, 0.004, 0, -h / 2 + (j * h) / ny, t / 2 + 0.002);
  return p;
}

function finish(g: THREE.Group, heightM: number): THREE.Group {
  const b = new THREE.Box3().setFromObject(g);
  const k = heightM / (b.max.y - b.min.y);
  g.scale.setScalar(k);
  g.position.y = -b.min.y * k;
  const out = new THREE.Group();
  out.add(g);
  return out;
}

function solarWing(g: THREE.Object3D): THREE.Group {
  const w = new THREE.Group();
  w.userData.solarArray = true;
  g.add(w);
  return w;
}

// ---------------------------------------------------------------------------------------------
// Hubble Space Telescope
// ---------------------------------------------------------------------------------------------

export const HUBBLE_H = 13.2;

/**
 * Hubble: the polished aft shroud with its gold rings and panel lines; the equipment section with
 * its doors; the crinkled silver light shield with the white aperture door hinged open; the two
 * rigid wings (SM3B) on their masts; the two high-gain antenna booms; the white aft nub.
 */
export function buildHubble(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  // Aft shroud: 4.2 m across, polished, ribbed with panel lines.
  cyl(g, M.dark, 2.0, 2.0, 0, 0.18, 0, 0, 40);
  cyl(g, M.shine, 2.1, 2.1, 0.18, 4.3, 0, 0, 48);
  for (const y of [0.9, 1.7, 2.5, 3.3]) band(g, M.aluDk, 2.105, y, 0.025);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const s = box(g, M.aluDk, 0.02, 4.0, 0.01, 0, 2.2, 0);
    s.position.set(Math.sin(a) * 2.106, 2.2, Math.cos(a) * 2.106);
    s.rotation.y = a;
  }
  for (const y of [0.18, 4.3]) band(g, M.gold, 2.14, y, 0.09);
  // Aft end: the instrument bay bulkhead, the nub.
  cyl(g, M.aluDk, 1.2, 1.2, -0.12, 0.0, 0, 0, 24);
  cyl(g, M.white, 0.25, 0.04, -0.4, -0.12, 0.55, 0.3, 14);
  for (const [x, z] of [
    [-0.7, 0.7],
    [0.9, -0.5],
  ])
    cyl(g, M.dark, 0.3, 0.3, -0.3, 0, x, z, 14);

  // Equipment section: eight doors (silver, one with the gold frame), handrails.
  cyl(g, M.dark, 2.08, 2.08, 4.3, 6.3, 0, 0, 48);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const door = box(g, i % 3 === 0 ? M.foil : M.shine, 1.0, 1.7, 0.06, 0, 5.3, 0);
    door.position.set(Math.sin(a) * 2.1, 5.3, Math.cos(a) * 2.1);
    door.rotation.y = a;
    const frame = box(g, M.gold, 1.06, 0.05, 0.07, 0, 5.3, 0);
    frame.position.set(Math.sin(a) * 2.11, 6.18, Math.cos(a) * 2.11);
    frame.rotation.y = a;
    const rail = strut(
      g,
      M.gold,
      V(Math.sin(a + 0.25) * 2.22, 4.6, Math.cos(a + 0.25) * 2.22),
      V(Math.sin(a + 0.25) * 2.22, 6.1, Math.cos(a + 0.25) * 2.22),
      0.015,
      5,
    );
    void rail;
  }
  for (const y of [4.3, 6.3]) band(g, M.gold, 2.13, y, 0.07);

  // Forward shell and light shield: crinkled silver foil, straps, open at the top.
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 0.9, 40, 1, true), M.foil);
  cone.position.set(0, 6.75, 0);
  add(g, cone);
  foilTube(g, M.foil, 1.7, 1.62, 6.7, 12.9, 0.05, 0, 0, 44);
  cyl(g, M.foilDk, 1.6, 1.6, 6.7, 13.1, 0, 0, 40, true);
  seams(g, M.gold, 1.67, 7.2, 12.6, 14);
  for (const y of [8.0, 9.6, 11.2, 12.6]) band(g, M.kapton, 1.66, y, 0.06);
  // Aperture: dark inside, baffle rim.
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.04, 8, 48), M.aluDk);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 13.1;
  add(g, lip);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 1.2, 40, 1, true), M.black);
  inner.material = mat(0x07080a, 0.3, 0.8);
  (inner.material as Mat).side = THREE.BackSide;
  inner.position.y = 12.5;
  add(g, inner);
  // Aperture door: white, hinged open on the back edge.
  const hinge = new THREE.Group();
  hinge.position.set(0, 13.15, -1.65);
  const door = roundRect(M.white, 3.2, 3.1, 0.55, 0.07);
  door.rotation.x = -Math.PI / 2;
  door.position.set(0, 0, 1.55);
  hinge.add(door);
  box(hinge, M.alu, 2.8, 0.03, 0.05, 0, 0.04, 0.05);
  for (const x of [-1.1, 0, 1.1]) box(hinge, M.back, 0.04, 0.02, 2.8, x, 0.045, 1.55);
  hinge.rotation.x = -1.3;
  add(g, hinge);

  // Rigid solar wings on masts at the junction of the shell and the equipment section.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 2.1, 6.35, 0);
    box(wing, M.alu, 0.5, 0.5, 0.5, s * 0.1, 0, 0);
    box(wing, M.gold, 0.45, 0.06, 0.52, s * 0.1, 0.27, 0);
    strut(wing, M.alu, V(s * 0.3, 0, 0), V(s * 6.2, 0, 0), 0.05, 8);
    strut(wing, M.alu, V(s * 0.3, 0.06, 0.02), V(s * 6.2, 0.06, 0.02), 0.025, 6);
    for (const dy of [-0.72, 0.72]) {
      const p = cellPanel(M, 5.5, 1.3, 22, 5);
      p.position.set(s * 3.3, dy, 0);
      wing.add(p);
    }
    box(wing, M.gold, 0.06, 3.1, 0.08, s * 6.15, 0, 0);
  }
  // High-gain antenna booms, on opposite sides, perpendicular to the wings.
  for (const s of [-1, 1]) {
    const root = V(0.0, 6.6, s * 2.1);
    box(g, M.alu, 0.4, 0.4, 0.4, 0, 6.6, s * 2.12);
    const tip = V(0.0, 6.6 + s * 0.5, s * 6.2);
    strut(g, M.alu, root, tip, 0.045, 8);
    strut(g, M.alu, V(0.18, 6.4, s * 2.2), V(0.02, 6.6 + s * 0.5, s * 5.4), 0.015, 5);
    const d = dish(M.shine, M.dark, 0.9);
    d.position.copy(tip);
    d.rotation.x = s * (Math.PI / 2 - 0.25);
    add(g, d);
  }
  // Two gold-capped magnetic torquers along the shell.
  for (const s of [-1, 1]) {
    cyl(g, M.alu, 0.07, 0.07, 6.9, 10.2, s * 1.75, 0, 8);
    box(g, M.gold, 0.14, 0.4, 0.14, s * 1.75, 9.8, 0);
  }
  return finish(g, HUBBLE_H);
}

// ---------------------------------------------------------------------------------------------
// James Webb Space Telescope
// ---------------------------------------------------------------------------------------------

export const JWST_H = 9.0;

function sunshieldLayer(
  M: Record<string, Mat>,
  y: number,
  billow: number,
  k: number,
  m: Mat,
): THREE.Mesh {
  // Octagonal kite, 21.2 m long (x) by 14.2 m wide (z), edges subdivided so the foil can wrinkle.
  const poly: [number, number][] = [
    [-10.6, -1.7],
    [-3.6, -7.1],
    [3.6, -7.1],
    [10.6, -1.7],
    [10.6, 1.7],
    [3.6, 7.1],
    [-3.6, 7.1],
    [-10.6, 1.7],
  ];
  const per: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % poly.length];
    const n = 6;
    for (let s = 0; s < n; s++) per.push([ax + ((bx - ax) * s) / n, az + ((bz - az) * s) / n]);
  }
  const R = 6;
  const pts: number[] = [];
  const idx: number[] = [];
  const P = per.length;
  for (let j = 0; j <= R; j++) {
    const t = j / R;
    for (let i = 0; i < P; i++) {
      const x = per[i][0] * t;
      const z = per[i][1] * t;
      const edge = j === R ? 0 : 1;
      pts.push(x, y + billow * (1 - t * t) + hash3(x, 0, z, k) * 0.05 * edge, z);
    }
  }
  for (let j = 0; j < R; j++)
    for (let i = 0; i < P; i++) {
      const a = j * P + i;
      const b = j * P + ((i + 1) % P);
      const c = (j + 1) * P + i;
      const d = (j + 1) * P + ((i + 1) % P);
      idx.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setIndex(idx);
  const out = geo.toNonIndexed();
  out.computeVertexNormals();
  const mesh = new THREE.Mesh(out, m);
  // The purple-pink edge binding of the membrane.
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % poly.length];
    beam(mesh, M.purple, V(ax, y, az), V(bx, y, bz), 0.06, 0.05);
  }
  return mesh;
}

/**
 * JWST: the five sunshield membranes (kite 21.2 × 14.2 m, purple-pink bound edges) over the
 * amber-wrapped bus; above them the 18 gold hexagons of the 6.5 m mirror (a centre of twelve and a
 * folded-out wing of three each side) on the black backplane, and the secondary mirror on its
 * three-legged tripod; the bus's flat solar panel and its small antenna.
 */
export function buildJwst(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();

  // Spacecraft bus, below the sunshield: amber-gold wrapped box, radiators, the fixed solar panel.
  const bus = new THREE.Group();
  box(bus, M.dark, 3.0, 1.55, 2.6, 0, 0.78, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(M.kapton, 3.0, 1.5, 0.05);
    f.position.set(0, 0.78, s * 1.37);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(bus, f);
    const f2 = foilSheet(M.gold, 2.6, 1.5, 0.05);
    f2.position.set(s * 1.57, 0.78, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(bus, f2);
  }
  box(bus, M.black, 2.6, 0.1, 2.2, 0, 0.02, 0);
  // Fixed flat solar panel and the sun-side flap on the +z edge; both face the sun (down).
  const pan = solarWing(bus);
  const sp = cellPanel(M, 2.5, 3.4, 10, 14);
  sp.rotation.x = Math.PI / 2;
  sp.position.set(0, 0.62, 2.9);
  pan.add(sp);
  box(pan, M.alu, 0.1, 0.1, 1.4, 0, 0.6, 1.9);
  // Small high-gain antenna and star trackers.
  const hga = dish(M.white, M.dark, 0.42);
  hga.position.set(-1.1, 1.62, -0.5);
  hga.rotation.set(-0.5, 0, 0.3);
  add(bus, hga);
  strut(bus, M.alu, V(-1.1, 1.55, -0.5), V(-1.1, 1.68, -0.5), 0.03, 6);
  for (const x of [0.5, 1.0]) box(bus, M.black, 0.3, 0.25, 0.3, x, 1.7, -0.7);
  add(g, bus);

  // The unitised pallets and the tower through the sunshield.
  for (const s of [-1, 1]) {
    box(g, M.gold, 1.2, 1.1, 2.2, s * 2.3, 1.55, 0);
    box(g, M.black, 0.1, 0.8, 1.8, s * 2.95, 1.55, 0);
  }
  cyl(g, M.dark, 0.55, 0.55, 1.55, 3.0, 0, 0, 12);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.78;
    strut(
      g,
      M.black,
      V(Math.sin(a) * 0.9, 1.55, Math.cos(a) * 0.9),
      V(Math.sin(a) * 0.45, 3.0, Math.cos(a) * 0.45),
      0.035,
      6,
    );
  }

  // Sunshield: five membranes stacked with the hot one nearest the bus, booms under them.
  const sun = new THREE.Group();
  sun.name = 'sunshield';
  const ys = [1.75, 1.98, 2.22, 2.46, 2.7];
  ys.forEach((y, i) => {
    sun.add(sunshieldLayer(M, y, 0.1 + i * 0.02, i + 3, i === 0 ? M.kapton : M.shield));
  });
  strut(sun, M.black, V(0, 1.66, -7.1), V(0, 1.66, 7.1), 0.04, 6);
  strut(sun, M.black, V(-10.6, 1.66, 0), V(10.6, 1.66, 0), 0.04, 6);
  for (const s of [-1, 1]) {
    box(sun, M.gold, 0.22, 0.12, 4.2, s * 10.7, 1.7, 0);
    box(sun, M.white, 0.5, 0.5, 0.5, s * 10.5, 1.75, 0);
  }
  // Momentum-trim flap on the rear edge.
  box(sun, M.foil, 3.4, 1.6, 0.04, 0, 2.5, -7.3);
  strut(sun, M.black, V(0, 1.7, -7.1), V(0, 3.2, -7.3), 0.03, 6);
  add(g, sun);

  // Telescope on the tower: the primary mirror group.
  const mir = new THREE.Group();
  mir.name = 'mirror';
  const CY = 5.9; // mirror centre height
  const R = 0.762; // hexagon corner radius: 1.32 m flat to flat
  const seg: THREE.Group[] = [];
  const cells: [number, number][] = [];
  for (let q = -2; q <= 2; q++)
    for (let r = -2; r <= 2; r++) {
      const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
      if (d >= 1 && d <= 2) cells.push([q, r]);
    }
  const hexGeo = new THREE.CylinderGeometry(R * 0.965, R * 0.965, 0.04, 6);
  hexGeo.rotateY(Math.PI / 6);
  hexGeo.rotateX(Math.PI / 2);
  const backGeo = new THREE.CylinderGeometry(R, R, 0.18, 6);
  backGeo.rotateY(Math.PI / 6);
  backGeo.rotateX(Math.PI / 2);
  const wingL = new THREE.Group();
  wingL.name = 'mirror-wing-left';
  const wingR = new THREE.Group();
  wingR.name = 'mirror-wing-right';
  for (const [q, r] of cells) {
    const x = 1.5 * R * q * 1.012;
    const y = Math.sqrt(3) * R * (r + q / 2) * 1.012;
    const s = new THREE.Group();
    const face = new THREE.Mesh(hexGeo, M.mirror);
    face.position.z = 0.03;
    s.add(face);
    // The concave dish: a shallow cone behind the face reads as the curve.
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.0, R * 0.9, 0.05, 6, 1), M.mirror);
    cone.geometry.rotateY(Math.PI / 6);
    cone.geometry.rotateX(Math.PI / 2);
    cone.position.z = 0.0;
    s.add(cone);
    const back = new THREE.Mesh(backGeo, M.beryl);
    back.position.z = -0.1;
    s.add(back);
    s.position.set(x, y, 0);
    seg.push(s);
    // Outer columns (|x| beyond the centre block) are the wings.
    (Math.abs(q) === 2 ? (q > 0 ? wingR : wingL) : mir).add(s);
  }
  // Wings: a hinge pivot at the centre block's edge (here already unfolded flat).
  mir.add(wingL, wingR);
  // Backplane: the black truss and the ISIM / aft-optics block, the radiator fins below.
  box(mir, M.black, 3.2, 3.6, 0.9, 0, 0, -0.75);
  box(mir, M.dark, 6.8, 0.35, 0.5, 0, -0.1, -0.35);
  const hole = box(mir, M.black, 1.4, 1.3, 0.3, 0, 0, -0.02);
  void hole;
  cyl(mir, M.dark, 0.7, 0.7, -0.4, 0.4, 0, -0.5, 6);
  box(mir, M.black, 1.2, 3.0, 0.1, 0, -2.2, -0.55);
  for (let i = 0; i < 5; i++) box(mir, M.aluDk, 1.2, 0.04, 0.9, 0, -3.1 + i * 0.3, -0.95);
  box(mir, M.beryl, 3.0, 0.25, 0.3, 0, -3.6, -0.6);
  mir.position.set(0, CY, 0);
  mir.rotation.x = -0.1;
  add(g, mir);
  // Secondary mirror on the three-legged tripod.
  const tipZ = 7.2;
  const tip = V(0, CY + 0.2, tipZ);
  for (const [x, y] of [
    [-2.55, 2.0],
    [2.55, 2.0],
    [0, -2.9],
  ])
    strut(g, M.black, V(x, CY + y, 0.1), tip, 0.055, 8);
  const sec = new THREE.Group();
  cyl(sec, M.black, 0.5, 0.4, 0, 0.5, 0, 0, 16);
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.05, 20), M.mirror);
  sm.rotation.x = Math.PI / 2;
  sm.position.z = -0.0;
  sec.rotation.x = Math.PI / 2;
  sec.position.copy(tip);
  sec.position.z += 0.2;
  add(g, sec);
  sm.position.set(0, CY + 0.2, tipZ - 0.1);
  sm.rotation.x = Math.PI / 2;
  sm.material = M.mirror;
  add(g, sm);
  return finish(g, JWST_H);
}

/** An n-sided wrap of crinkled foil sheets round the y axis, alternating two blankets. */
function foilWrap(
  g: THREE.Object3D,
  a: Mat,
  b: Mat,
  n: number,
  r: number,
  y0: number,
  y1: number,
  amp: number,
): void {
  const apo = r * Math.cos(Math.PI / n);
  const w = 2 * r * Math.sin(Math.PI / n);
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const s = foilSheet(i % 2 ? b : a, w, y1 - y0, amp);
    s.position.set(
      Math.sin(ang) * (apo + amp * 1.3 + 0.004),
      (y0 + y1) / 2,
      Math.cos(ang) * (apo + amp * 1.3 + 0.004),
    );
    s.rotation.y = ang;
    add(g, s);
  }
}

// ---------------------------------------------------------------------------------------------
// Chandra X-ray Observatory
// ---------------------------------------------------------------------------------------------

export const CHANDRA_H = 13.8;

/**
 * Chandra: the long tapered tube in crinkled silver foil with its gold bands and the sunshade
 * door box at the far end; the octagonal spacecraft module in silver and gold blanket with the
 * instrument drum under it; the two three-panel wings on gold A-frame trusses; the round hinged
 * disc on the module.
 */
export function buildChandra(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  // Instrument module end: a drum with the concentric bullseye of the focal-plane end.
  cyl(g, M.dark, 1.15, 1.15, 0, 0.5, 0, 0, 32);
  cyl(g, M.aluDk, 0.95, 0.95, -0.04, 0.0, 0, 0, 32);
  cyl(g, M.gold, 0.3, 0.3, -0.07, -0.03, 0, 0, 24);
  for (const r of [0.5, 0.7]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 6, 32), M.alu);
    t.rotation.x = Math.PI / 2;
    t.position.y = -0.02;
    add(g, t);
  }
  // Spacecraft module: octagon, silver and gold blanket, black base plate, corner struts.
  prism(g, M.dark, 8, 1.5, 1.5, 0.5, 3.4);
  foilWrap(g, M.foil, M.gold, 8, 1.52, 0.5, 3.4, 0.05);
  prism(g, M.black, 8, 1.56, 1.56, 0.4, 0.55);
  prism(g, M.alu, 8, 1.56, 1.56, 3.35, 3.45);
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    strut(
      g,
      M.gold,
      V(Math.sin(a) * 1.5, 0.5, Math.cos(a) * 1.5),
      V(Math.sin(a) * 1.5, 3.4, Math.cos(a) * 1.5),
      0.03,
      5,
    );
  }
  // Boxes and radiators on the module faces.
  box(g, M.white, 0.7, 0.9, 0.08, -0.5, 1.9, 1.42);
  box(g, M.black, 0.6, 0.6, 0.12, 0.6, 1.3, 1.42);
  box(g, M.kapton, 0.9, 0.6, 0.1, 0.3, 2.7, 1.42);
  cyl(g, M.dark, 0.12, 0.2, 3.4, 3.65, 0.6, 0.6, 10);
  cyl(g, M.dark, 0.12, 0.2, 3.4, 3.65, -0.6, 0.6, 10);
  // The long tapered tube.
  cyl(g, M.dark, 0.94, 0.62, 3.45, 13.0, 0, 0, 24);
  foilTube(g, M.foil, 1.1, 0.74, 3.45, 13.0, 0.06, 0, 0, 36);
  seams(g, M.gold, 0.9, 4.0, 12.6, 10);
  for (const [y, r] of [
    [5.2, 1.0],
    [7.6, 0.9],
    [10.0, 0.82],
    [12.4, 0.75],
  ] as [number, number][])
    band(g, M.kapton, r, y, 0.08);
  // The far end: collar and the box with its hinged lid, the sunshade door.
  cyl(g, M.black, 0.8, 0.78, 12.95, 13.2, 0, 0, 24);
  box(g, M.cream, 1.45, 0.8, 1.45, 0, 13.55, 0);
  box(g, M.gold, 1.5, 0.08, 1.5, 0, 13.2, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 13.95, -0.7);
  const lidMesh = box(lid, M.white, 1.4, 0.06, 1.4, 0, 0, 0.7);
  void lidMesh;
  lid.rotation.x = -0.75;
  add(g, lid);
  // The round hinged disc on the module.
  const disc = new THREE.Group();
  disc.position.set(0.1, 3.5, 0.2);
  cyl(disc, M.shine, 1.05, 1.05, 0, 0.07, 0, 0, 40);
  cyl(disc, M.dark, 0.18, 0.18, 0.06, 0.1, 0.35, 0.2, 14);
  disc.rotation.set(-0.9, 0, 0.25);
  disc.position.set(0.5, 3.9, 0.3);
  add(g, disc);
  // Wings: three panels each on a gold A-frame, root at the module's side.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 1.6, 2.0, 0);
    strut(wing, M.gold, V(-s * 0.1, -0.7, 0), V(s * 1.0, 0.0, 0), 0.04, 5);
    strut(wing, M.gold, V(-s * 0.1, 0.7, 0), V(s * 1.0, 0.0, 0), 0.04, 5);
    strut(wing, M.gold, V(0, 0.7, 0), V(0, -0.7, 0), 0.03, 5);
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(M, 2.25, 1.7, 8, 6);
      p.position.set(s * (2.3 + i * 2.35), 0, 0);
      wing.add(p);
    }
    box(wing, M.gold, 7.3, 0.04, 0.06, s * 4.4, 0.0, -0.05);
  }
  return finish(g, CHANDRA_H);
}

// ---------------------------------------------------------------------------------------------
// Spitzer Space Telescope
// ---------------------------------------------------------------------------------------------

export const SPITZER_H = 4.45;

/**
 * Spitzer: the cryostat's wide vacuum shell stepping to the narrower telescope outer shell, open
 * at the top; the octagonal bus in amber foil with its gold truss; the single flat solar panel and
 * sun shield leaning against the tube; the small dish.
 */
export function buildSpitzer(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const warm = mat(0xcdbfba, 0.55, 0.32, true);
  // Bus: octagon in amber and gold, base ring, equipment boxes.
  prism(g, M.dark, 8, 1.12, 1.12, 0.0, 0.85);
  foilWrap(g, M.kapton, M.gold, 8, 1.14, 0.0, 0.85, 0.03);
  prism(g, M.black, 8, 1.18, 1.18, -0.03, 0.1);
  prism(g, M.gold, 8, 1.2, 1.2, 0.8, 0.9);
  box(g, M.black, 0.8, 0.5, 0.12, 0.2, 0.45, 1.05);
  box(g, M.white, 0.5, 0.4, 0.1, -0.45, 0.45, 1.05);
  cyl(g, M.aluDk, 0.12, 0.12, 0.2, 0.7, 1.0, 0.7, 10);
  // Truss from the bus up to the vacuum shell.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    strut(
      g,
      M.gold,
      V(Math.sin(a) * 1.0, 0.9, Math.cos(a) * 1.0),
      V(Math.sin(a + 0.2) * 0.75, 1.35, Math.cos(a + 0.2) * 0.75),
      0.025,
      5,
    );
  }
  cyl(g, M.aluDk, 0.85, 0.85, 0.9, 1.35, 0, 0, 24);
  // Vacuum shell, the neck, the outer shell, all in warm brushed silver.
  cyl(g, M.dark, 0.93, 0.93, 1.35, 2.8, 0, 0, 40);
  foilTube(g, warm, 0.96, 0.96, 1.35, 2.8, 0.012, 0, 0, 40);
  band(g, M.kapton, 0.965, 1.4, 0.07);
  band(g, M.kapton, 0.965, 2.75, 0.07);
  cyl(g, warm, 0.95, 0.66, 2.8, 3.15, 0, 0, 40, true);
  cyl(g, M.dark, 0.66, 0.66, 3.15, 4.4, 0, 0, 40, true);
  foilTube(g, warm, 0.67, 0.67, 3.15, 4.4, 0.01, 0, 0, 40);
  band(g, M.kapton, 0.68, 3.2, 0.05);
  band(g, M.kapton, 0.68, 4.4, 0.05);
  // Aperture: the dark bore under a rim.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.03, 8, 40), M.alu);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.4;
  add(g, rim);
  cyl(g, M.black, 0.64, 0.64, 4.35, 4.38, 0, 0, 32);
  // Solar panel / sun shield: one flat plane against the tube, leaning out; cells outward.
  const arr = solarWing(g);
  const piv = new THREE.Group();
  piv.position.set(1.12, 0.85, 0);
  const pan = cellPanel(M, 2.05, 3.75, 9, 15);
  pan.rotation.y = Math.PI / 2;
  pan.position.set(0, 1.9, 0);
  piv.add(pan);
  piv.rotation.z = -0.16;
  arr.add(piv);
  for (const z of [-0.8, 0.8]) strut(arr, M.gold, V(0.95, 0.95, z), V(1.2, 1.35, z), 0.025, 5);
  // Small dish on a stub at the bus.
  const d = dish(M.white, M.dark, 0.3);
  d.position.set(-0.4, 0.95, -0.9);
  d.rotation.set(-0.9, 0, 0);
  add(g, d);
  strut(g, M.alu, V(-0.4, 0.85, -0.9), V(-0.4, 0.95, -0.9), 0.03, 6);
  return finish(g, SPITZER_H);
}

// ---------------------------------------------------------------------------------------------
// Kepler
// ---------------------------------------------------------------------------------------------

export const KEPLER_H = 4.7;

/**
 * Kepler: the amber-wrapped photometer barrel with the cream sunshade plate and its louvres, the
 * dark vaned aperture at the top; the silver hexagonal bus with its grey equipment boxes,
 * thrusters and the round dark dish; the single fixed solar panel hinged out from the bus.
 */
export function buildKepler(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const bus = mat(0xb2b6bd, 0.55, 0.34, true);
  // Bus: hexagonal, silver crinkled foil on a dark core, equipment boxes on the top deck.
  prism(g, M.dark, 6, 1.55, 1.55, 0.0, 1.1);
  foilWrap(g, bus, M.foil, 6, 1.57, 0.02, 1.08, 0.04);
  prism(g, M.black, 6, 1.6, 1.6, -0.02, 0.1);
  prism(g, M.aluDk, 6, 1.6, 1.6, 1.08, 1.14);
  box(g, M.aluDk, 0.5, 0.4, 0.5, 1.15, 1.35, 0.5);
  box(g, M.alu, 0.45, 0.3, 0.45, 0.6, 1.3, -0.9);
  box(g, M.dark, 0.5, 0.5, 0.5, -0.6, 1.3, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = 0.6 + i * 0.5;
    cyl(g, M.black, 0.1, 0.13, -0.15, 0.1, Math.sin(a) * 1.0, Math.cos(a) * 1.0 + 0.2, 10);
  }
  // Round dark dish on the +x flank, tilted out.
  const dsk = new THREE.Group();
  cyl(dsk, M.dark, 0.62, 0.62, 0, 0.08, 0, 0, 32);
  cyl(dsk, M.aluDk, 0.5, 0.5, 0.08, 0.1, 0, 0, 24);
  dsk.rotation.z = -1.0;
  dsk.position.set(1.55, 0.5, 0.2);
  add(g, dsk);
  // Photometer barrel: amber foil over a dark core, gold straps.
  cyl(g, M.dark, 1.1, 1.1, 1.14, 4.4, 0, 0, 40);
  foilTube(g, M.kapton, 1.24, 1.24, 1.14, 4.4, 0.06, 0, 0, 44);
  seams(g, M.gold, 1.26, 1.3, 4.3, 12);
  for (const y of [1.9, 2.9, 3.9]) band(g, M.gold, 1.265, y, 0.05);
  // Aperture cap: a dark collar and the vaned plate.
  cyl(g, M.black, 1.28, 1.28, 4.4, 4.7, 0, 0, 44, true);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.28, 0.045, 8, 44), M.aluDk);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 4.7;
  add(g, lip);
  cyl(g, M.black, 1.22, 1.22, 4.5, 4.55, 0, 0, 40);
  for (let i = -3; i <= 3; i++) box(g, M.aluDk, 0.04, 0.06, 2.3, i * 0.32, 4.6, 0);
  // The cream sunshade plate across the sunward flank, with louvre slots.
  const shade = mat(0xd9d2bc, 0.2, 0.55);
  shade.side = THREE.DoubleSide;
  const arc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.31, 1.31, 2.4, 32, 1, true, -0.95, 1.9),
    shade,
  );
  arc.position.y = 2.9;
  add(g, arc);
  for (let i = 0; i < 9; i++) {
    const t = -0.8 + i * 0.2;
    const sl = box(g, M.aluDk, 0.06, 0.55 + (i % 2) * 0.2, 0.02, 0, 3.2 + ((i % 3) - 1) * 0.1, 0);
    sl.position.set(Math.sin(t) * 1.325, 3.2 + ((i % 3) - 1) * 0.12, Math.cos(t) * 1.325);
    sl.rotation.y = t;
  }
  // The fixed solar array, hinged out from the -x edge of the bus.
  const arr = solarWing(g);
  const piv = new THREE.Group();
  piv.position.set(-1.45, 1.1, 0);
  const pan = cellPanel(M, 2.8, 3.6, 12, 15);
  pan.rotation.y = -Math.PI / 2;
  pan.position.set(0, 1.8, 0);
  piv.add(pan);
  piv.rotation.z = 0.4;
  arr.add(piv);
  return finish(g, KEPLER_H);
}

// ---------------------------------------------------------------------------------------------
// TESS
// ---------------------------------------------------------------------------------------------

export const TESS_H = 1.5;

/**
 * TESS: four hooded cameras fanned along the top plate of a small silver-and-gold bus, each a
 * dark lens barrel with its yellow ring and a flared square hood; the two flat solar wings on
 * hinged arms; the little dish and thruster pods.
 */
export function buildTess(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  box(g, M.dark, 1.2, 0.62, 1.1, 0, 0.31, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(M.gold, 1.15, 0.58, 0.02);
    f.position.set(0, 0.31, s * 0.575);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
    const f2 = foilSheet(M.foil, 1.05, 0.58, 0.02);
    f2.position.set(s * 0.625, 0.31, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(g, f2);
  }
  box(g, M.black, 1.3, 0.05, 1.2, 0, 0.0, 0);
  box(g, M.beryl, 1.45, 0.07, 1.0, 0, 0.66, 0);
  // Cameras: tilt outward 12° and 36°.
  const yellow = mat(0xd6c24a, 0.4, 0.45);
  [-0.55, -0.185, 0.185, 0.55].forEach((x, i) => {
    const tilt = [0.63, 0.21, -0.21, -0.63][i];
    const cam = new THREE.Group();
    cyl(cam, M.black, 0.17, 0.17, 0, 0.34, 0, 0, 24);
    cyl(cam, yellow, 0.175, 0.175, 0.14, 0.19, 0, 0, 24);
    cyl(cam, M.aluDk, 0.19, 0.19, 0.34, 0.37, 0, 0, 24);
    const hoodGeo = new THREE.CylinderGeometry(0.33, 0.2, 0.62, 4, 1, true);
    hoodGeo.rotateY(Math.PI / 4);
    const hood = new THREE.Mesh(hoodGeo, M.foil);
    hood.position.y = 0.66;
    add(cam, hood);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 20), M.glass);
    lens.position.y = 0.36;
    add(cam, lens);
    cam.position.set(x, 0.7, 0);
    cam.rotation.z = tilt;
    add(g, cam);
  });
  // Solar wings on arms, either side, one panel each.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 0.6, 0.34, 0);
    strut(wing, M.alu, V(0, 0, 0), V(s * 0.25, 0, 0), 0.025, 6);
    for (const dz of [-0.01]) {
      const p = cellPanel(M, 1.3, 0.98, 6, 5);
      p.position.set(s * 0.9, 0, dz);
      wing.add(p);
    }
  }
  // Dish and thruster pods on the back.
  const d = dish(M.white, M.dark, 0.26);
  d.position.set(0.0, 0.3, -0.65);
  d.rotation.x = -Math.PI / 2 + 0.2;
  add(g, d);
  for (const x of [-0.45, 0.45]) cyl(g, M.black, 0.04, 0.07, 0.05, 0.2, x, 0.5, 8);
  return finish(g, TESS_H);
}

/** A flat sheet over a polygon in the xz plane, subdivided so it can billow and wrinkle. */
function polarSheet(
  poly: [number, number][],
  y: number,
  lift: number,
  amp: number,
  k: number,
  m: Mat,
  edgeSteps = 4,
  rings = 6,
): THREE.Mesh {
  const per: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i];
    const [bx, bz] = poly[(i + 1) % poly.length];
    for (let s = 0; s < edgeSteps; s++)
      per.push([ax + ((bx - ax) * s) / edgeSteps, az + ((bz - az) * s) / edgeSteps]);
  }
  const P = per.length;
  const pts: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    for (let i = 0; i < P; i++) {
      const x = per[i][0] * t;
      const z = per[i][1] * t;
      pts.push(x, y + lift * (1 - t) + (j === rings ? 0 : hash3(x, 0, z, k) * amp), z);
    }
  }
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < P; i++) {
      const a = j * P + i;
      const b = j * P + ((i + 1) % P);
      const c = (j + 1) * P + i;
      const d = (j + 1) * P + ((i + 1) % P);
      idx.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setIndex(idx);
  const out = geo.toNonIndexed();
  out.computeVertexNormals();
  return new THREE.Mesh(out, m);
}

// ---------------------------------------------------------------------------------------------
// Gaia
// ---------------------------------------------------------------------------------------------

export const GAIA_H = 4.6;

/**
 * Gaia: the 10 m dodecagonal sunshield of wrinkled foil with its twelve gold patches, the solar
 * cells of the sun side under its rim; above it the black drum of the service module with silver
 * blanket skirt and the payload torus, its window open on the mirrors, the white top cap; the flat
 * phased-array antenna under the shield.
 */
export function buildGaia(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const SY = 1.15;
  const poly: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    poly.push([Math.sin(a) * 5.0, Math.cos(a) * 5.0]);
  }
  add(g, polarSheet(poly, SY, 0.35, 0.05, 11, M.foil, 5, 7));
  // Rim hoops, ribs and the 12 gold patches (top face), cells below (sun side).
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = ((i + 1) / 12) * Math.PI * 2;
    beam(
      g,
      M.aluDk,
      V(Math.sin(a) * 5, SY, Math.cos(a) * 5),
      V(Math.sin(b) * 5, SY, Math.cos(b) * 5),
      0.05,
      0.05,
    );
    strut(
      g,
      M.aluDk,
      V(Math.sin(a) * 1.7, SY + 0.28, Math.cos(a) * 1.7),
      V(Math.sin(a) * 5, SY, Math.cos(a) * 5),
      0.03,
      5,
    );
    const mid = a + Math.PI / 12;
    const patch = box(g, M.gold, 1.3, 0.03, 1.1, 0, SY + 0.06, 0);
    patch.position.set(
      Math.sin(mid) * 4.05,
      SY + 0.07 + 0.35 * (1 - 4.05 / 5),
      Math.cos(mid) * 4.05,
    );
    patch.rotation.y = mid;
    const cells = cellPanel(M, 1.5, 1.8, 5, 6);
    cells.rotation.set(Math.PI / 2, 0, 0);
    cells.rotation.order = 'YXZ';
    cells.rotation.y = mid;
    cells.position.set(Math.sin(mid) * 4.1, SY - 0.06, Math.cos(mid) * 4.1);
    add(g, cells);
  }
  // Under the shield: the phased-array antenna and the ring of struts holding the shield.
  cyl(g, M.aluDk, 0.55, 0.55, 0.0, 0.8, 0, 0, 20);
  cyl(g, M.gold, 0.5, 0.5, -0.02, 0.0, 0, 0, 20);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    strut(
      g,
      M.black,
      V(Math.sin(a) * 0.5, 0.8, Math.cos(a) * 0.5),
      V(Math.sin(a) * 1.6, SY - 0.02, Math.cos(a) * 1.6),
      0.03,
      5,
    );
  }
  // Service module: a silver blanket skirt cone under the black drum.
  foilTube(g, M.foil, 1.9, 1.5, SY + 0.1, 1.85, 0.04, 0, 0, 24);
  cyl(g, M.dark, 1.45, 1.45, SY + 0.1, 1.85, 0, 0, 24);
  prism(g, M.black, 12, 1.55, 1.55, 1.85, 2.75);
  for (const y of [1.85, 2.75]) band(g, M.gold, 1.56, y, 0.06);
  box(g, M.gold, 0.7, 0.5, 0.06, 0.5, 2.3, 1.5);
  box(g, M.white, 0.9, 0.7, 0.06, -0.6, 2.3, 1.5);
  // Payload torus with the open window.
  cyl(g, M.black, 1.6, 1.6, 2.75, 4.5, 0, 0, 40);
  band(g, M.gold, 1.61, 2.8, 0.05);
  band(g, M.gold, 1.61, 4.45, 0.05);
  box(g, M.dark, 1.5, 0.95, 0.35, 0.0, 3.6, 1.72);
  for (const x of [-0.45, 0.45]) {
    box(g, M.mirror, 0.55, 0.6, 0.03, x, 3.62, 1.9);
  }
  box(g, M.alu, 1.6, 0.04, 0.4, 0, 3.15, 1.76);
  box(g, M.alu, 1.6, 0.04, 0.4, 0, 4.07, 1.76);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.6, 0.15, 40), M.white);
  cap.position.y = 4.52;
  add(g, cap);
  cyl(g, M.white, 1.5, 1.2, 4.5, 4.62, 0, 0, 40);
  strut(g, M.alu, V(0.2, 4.6, 0.2), V(0.2, 4.85, 0.2), 0.012, 4);
  return finish(g, GAIA_H);
}

// ---------------------------------------------------------------------------------------------
// Euclid
// ---------------------------------------------------------------------------------------------

export const EUCLID_H = 4.7;

/**
 * Euclid: the cream telescope baffle rising out of the gold-wrapped payload module, on the
 * silver service module with its thruster pods and dish; the one big flat solar-array / sunshield
 * plate along the sun side, silver behind, with its side flaps.
 */
export function buildEuclid(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  // Service module.
  box(g, M.dark, 3.3, 1.7, 3.3, 0, 0.85, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(M.foil, 3.3, 1.65, 0.05);
    f.position.set(0, 0.85, s * 1.72);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
    const f2 = foilSheet(M.gold, 3.3, 1.65, 0.05);
    f2.position.set(s * 1.72, 0.85, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(g, f2);
  }
  box(g, M.black, 3.5, 0.1, 3.5, 0, 0.02, 0);
  box(g, M.alu, 3.5, 0.08, 3.5, 0, 1.72, 0);
  for (const [x, z] of [
    [1.0, 1.75],
    [-1.0, 1.75],
  ] as [number, number][]) {
    cyl(g, M.black, 0.1, 0.18, 0.4, 0.75, x, z + 0.1, 10);
    g.children[g.children.length - 1].rotation.x = Math.PI / 2;
  }
  box(g, M.black, 0.35, 0.3, 0.3, -1.3, 1.5, 1.8);
  box(g, M.black, 0.35, 0.3, 0.3, 1.3, 1.5, 1.8);
  const sd = dish(M.white, M.dark, 0.3);
  sd.position.set(-1.0, 0.5, -1.85);
  sd.rotation.x = -Math.PI / 2;
  add(g, sd);
  // Payload module: gold-wrapped, angular, the baffle above.
  box(g, M.dark, 2.5, 1.5, 2.5, 0, 2.55, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(M.gold, 2.5, 1.45, 0.06);
    f.position.set(0, 2.55, s * 1.31);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
    const f2 = foilSheet(M.kapton, 2.5, 1.45, 0.06);
    f2.position.set(s * 1.31, 2.55, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(g, f2);
  }
  // Truss legs between the modules.
  for (const [x, z] of [
    [-1.2, -1.2],
    [1.2, -1.2],
    [-1.2, 1.2],
    [1.2, 1.2],
  ] as [number, number][])
    strut(g, M.black, V(x, 1.7, z), V(x * 0.9, 1.8, z * 0.9), 0.05, 6);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.5, 0.5, 8), M.gold);
  shroud.position.y = 3.55;
  add(g, shroud);
  cyl(g, M.cream, 0.98, 0.98, 3.7, 4.7, 0, 0, 36, true);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rib = box(g, M.white, 0.05, 1.0, 0.03, 0, 4.2, 0);
    rib.position.set(Math.sin(a) * 0.99, 4.2, Math.cos(a) * 0.99);
    rib.rotation.y = a;
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.05, 8, 40), M.white);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.7;
  add(g, rim);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.6, 36, 1, true), M.black);
  (bore.material as Mat) = mat(0x08090b, 0.3, 0.8);
  (bore.material as Mat).side = THREE.BackSide;
  bore.position.y = 4.35;
  add(g, bore);
  // The solar-array / sunshield plate on the sun side.
  const arr = solarWing(g);
  const pan = cellPanel(M, 3.6, 4.3, 18, 22);
  pan.rotation.y = Math.PI / 2;
  pan.position.set(1.95, 2.35, 0);
  arr.add(pan);
  for (const z of [-1.0, 1.0]) strut(arr, M.alu, V(1.7, 1.9, z), V(1.93, 1.0, z), 0.03, 5);
  for (const s of [-1, 1]) {
    const flap = box(arr, M.foil, 0.55, 3.0, 0.04, 2.1, 2.35, s * 1.95);
    flap.rotation.y = s * 0.25;
  }
  return finish(g, EUCLID_H);
}

// ---------------------------------------------------------------------------------------------
// XMM-Newton
// ---------------------------------------------------------------------------------------------

export const XMM_H = 10.8;

/**
 * XMM-Newton: the focal-plane platform with its dark radiators at the base, the long tube in
 * crumpled dark-silver foil, and at the top the service module carrying the mirror-module face:
 * three large yellow-rimmed modules with their concentric shells, the two small telescopes, the
 * two dishes; the two three-panel wings.
 */
export function buildXmm(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const dkFoil = mat(0xa7acb4, 0.55, 0.34, true);
  const olive = mat(0xb9a65a, 0.5, 0.4);
  // Focal plane platform: hexagonal box, silver foil, black radiators.
  prism(g, M.dark, 6, 1.2, 1.2, 0, 1.8);
  foilWrap(g, dkFoil, M.foil, 6, 1.22, 0.05, 1.75, 0.04);
  for (const s of [-1, 1]) box(g, M.black, 0.08, 1.2, 1.1, s * 1.14, 0.95, 0);
  box(g, M.white, 1.1, 0.5, 0.08, 0, 1.0, 1.12);
  prism(g, M.black, 6, 1.26, 1.26, -0.02, 0.1);
  // Tube.
  cyl(g, M.dark, 0.82, 0.82, 1.8, 8.7, 0, 0, 24);
  foilTube(g, dkFoil, 0.92, 0.92, 1.8, 8.7, 0.05, 0, 0, 36);
  seams(g, M.alu, 0.93, 1.9, 8.6, 12);
  for (const y of [3.4, 5.1, 6.8]) band(g, M.foilDk, 0.935, y, 0.07);
  // Service module with the mirror-module face on top.
  prism(g, M.dark, 8, 1.62, 1.62, 8.7, 10.7);
  foilWrap(g, dkFoil, M.foil, 8, 1.64, 8.75, 10.65, 0.05);
  prism(g, M.black, 8, 1.7, 1.7, 10.65, 10.8);
  const mods: [number, number, number][] = [
    [-0.55, -0.5, 0.45],
    [0.55, -0.5, 0.45],
    [0.0, 0.5, 0.45],
  ];
  for (const [x, z, r] of mods) {
    cyl(g, olive, r, r, 10.8, 10.95, x, z, 36, true);
    cyl(g, M.black, r - 0.04, r - 0.04, 10.78, 10.82, x, z, 36);
    for (const rr of [r - 0.1, r - 0.2, r - 0.3]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.012, 5, 36), M.mirror);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 10.84, z);
      add(g, t);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI;
      const sp = box(g, M.alu, 0.012, 0.015, (r - 0.05) * 2, 0, 10.85, 0);
      sp.position.set(x, 10.85, z);
      sp.rotation.y = a;
    }
  }
  for (const [x, z, r] of [
    [1.05, 0.55, 0.2],
    [-1.05, 0.55, 0.2],
  ] as [number, number, number][]) {
    cyl(g, M.alu, r, r, 10.8, 10.95, x, z, 24, true);
    cyl(g, M.glass.clone() as Mat, r - 0.02, r - 0.02, 10.8, 10.82, x, z, 24);
  }
  // Two dishes on small booms.
  for (const s of [-1, 1]) {
    const d = dish(M.white, M.dark, 0.5);
    d.position.set(s * 1.55, 10.7, -1.0);
    d.rotation.set(0.3, 0, -s * 0.5);
    add(g, d);
    strut(g, M.alu, V(s * 1.4, 10.4, -0.9), V(s * 1.55, 10.7, -1.0), 0.03, 6);
  }
  // Solar wings: three panels each.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 1.7, 9.6, 0);
    strut(wing, M.alu, V(0, 0, 0), V(s * 7.2, 0, 0), 0.04, 6);
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(M, 2.15, 1.75, 9, 7);
      p.position.set(s * (1.35 + i * 2.2), 0, 0);
      wing.add(p);
    }
  }
  return finish(g, XMM_H);
}

// ---------------------------------------------------------------------------------------------
// Compton Gamma Ray Observatory
// ---------------------------------------------------------------------------------------------

export const COMPTON_H = 5.0;

/**
 * Compton: the boxy light-grey instrument deck with its gold bays; the four instruments on top (the
 * OSSE box, the domed COMPTEL and EGRET cylinders) and the BATSE detector modules on the
 * corners; the two long four-panel wings on truss booms; the dish on its boom.
 */
export function buildCompton(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const lt = mat(0xcfd3d9, 0.5, 0.4, true);
  // Bus deck.
  box(g, M.dark, 4.2, 1.8, 3.4, 0, 0.9, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(lt, 4.2, 1.7, 0.03);
    f.position.set(0, 0.9, s * 1.76);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
    const f2 = foilSheet(lt, 3.4, 1.7, 0.03);
    f2.position.set(s * 2.16, 0.9, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(g, f2);
    box(g, M.gold, 1.2, 0.7, 0.05, s * 1.0, 0.9, s * 1.76);
    box(g, M.gold, 0.05, 0.7, 1.0, s * 2.17, 1.0, 0);
  }
  box(g, M.black, 4.2, 0.1, 3.4, 0, -0.02, 0);
  box(g, M.alu, 4.3, 0.15, 3.5, 0, 1.85, 0);
  // OSSE: an open box with its gold detector heads.
  box(g, lt, 1.3, 2.3, 1.7, -1.45, 3.0, 0);
  box(g, M.gold, 1.0, 1.0, 0.2, -1.45, 3.3, 0.85);
  box(g, M.black, 0.6, 0.9, 0.1, -1.45, 3.35, 0.95);
  box(g, M.alu, 1.35, 0.1, 1.75, -1.45, 4.17, 0);
  // COMPTEL and EGRET: domed cylinders.
  for (const [x, r, h] of [
    [0.1, 0.85, 3.0],
    [1.55, 0.62, 2.5],
  ] as [number, number, number][]) {
    cyl(g, M.shine, r, r, 1.9, 1.9 + h, x, 0, 32);
    band(g, M.gold, r + 0.01, 1.95, 0.08, x, 0);
    band(g, M.gold, r + 0.01, 1.9 + h - 0.05, 0.08, x, 0);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      M.foil,
    );
    dome.scale.y = 0.45;
    dome.position.set(x, 1.9 + h, 0);
    add(g, dome);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const sm = box(g, M.aluDk, 0.03, h - 0.4, 0.02, 0, 1.9 + h / 2, 0);
      sm.position.set(x + Math.sin(a) * (r + 0.01), 1.9 + h / 2, Math.cos(a) * (r + 0.01));
      sm.rotation.y = a;
    }
  }
  box(g, M.aluDk, 0.9, 0.5, 0.9, 1.55, 1.85, 0.0);
  // BATSE modules on the eight corners.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      for (const y of [0.1, 1.85]) {
        const b = box(g, M.alu, 0.75, 0.12, 0.75, sx * 2.25, y, sz * 1.85);
        b.rotation.set(sz * 0.4, 0, -sx * 0.4);
      }
  // Solar wings: a truss boom and four flat panels each, facing up.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 2.3, 1.3, 0);
    strut(wing, M.white, V(0, 0, 0), V(s * 7.8, 0, 0), 0.05, 6);
    strut(wing, M.white, V(s * 0.2, 0, 1.0), V(s * 7.6, 0, 1.0), 0.03, 5);
    for (let i = 0; i < 4; i++) {
      const p = cellPanel(M, 1.8, 2.7, 8, 12);
      p.rotation.x = -Math.PI / 2;
      p.position.set(s * (1.2 + i * 1.9), 0.06, 0);
      wing.add(p);
    }
    for (const i of [0, 3])
      strut(
        wing,
        M.white,
        V(s * (0.4 + i * 2.0), 0, 0),
        V(s * (1.4 + i * 1.9), -0.3, 1.3),
        0.025,
        5,
      );
  }
  // High-gain dish on its boom.
  strut(g, M.white, V(-1.9, 0.6, 1.5), V(-3.6, 0.4, 3.4), 0.05, 6);
  const d = dish(M.white, M.dark, 0.55);
  d.position.set(-3.6, 0.4, 3.4);
  d.rotation.set(0.3, 0, 0.4);
  add(g, d);
  return finish(g, COMPTON_H);
}

// ---------------------------------------------------------------------------------------------
// Hitomi (ASTRO-H)
// ---------------------------------------------------------------------------------------------

export const HITOMI_H = 14.0;

/**
 * Hitomi: the gold-wrapped telescope cylinder with its four domed apertures, the flared gold
 * transition, the octagonal silver bus with its panel faces, and the extended optical bench: a
 * long octagonal gold-and-silver tube down to the focal-plane instrument box; two three-panel
 * wings.
 */
export function buildHitomi(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  const bluePanel = mat(0x9fb0c8, 0.5, 0.35, true);
  // Focal-plane instrument box and the extended optical bench.
  prism(g, M.dark, 8, 0.75, 0.75, 0, 1.3);
  foilWrap(g, M.gold, M.foil, 8, 0.77, 0.05, 1.25, 0.03);
  prism(g, M.black, 8, 0.8, 0.8, -0.02, 0.1);
  prism(g, M.dark, 8, 0.55, 0.55, 1.3, 7.9);
  foilWrap(g, M.kapton, M.foil, 8, 0.58, 1.3, 7.9, 0.04);
  for (const y of [2.6, 4.2, 5.8]) prism(g, M.gold, 8, 0.62, 0.62, y - 0.04, y + 0.04);
  // Bus.
  prism(g, M.dark, 8, 1.3, 1.3, 7.9, 10.9);
  foilWrap(g, M.foil, bluePanel, 8, 1.32, 8.0, 10.8, 0.03);
  prism(g, M.gold, 8, 1.36, 1.36, 7.85, 8.0);
  box(g, M.black, 0.9, 1.0, 0.08, -0.3, 9.0, 1.2);
  box(g, M.white, 0.7, 0.8, 0.08, 0.7, 10.2, 1.2);
  // Transition and the telescope cylinder.
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.35, 0.75, 8, 1), M.gold);
  fl.geometry.rotateY(Math.PI / 8);
  fl.position.y = 11.28;
  add(g, fl);
  foilTube(g, M.gold, 1.0, 1.0, 11.65, 13.65, 0.06, 0, 0, 32);
  cyl(g, M.dark, 0.9, 0.9, 11.65, 13.65, 0, 0, 24);
  for (const y of [12.2, 13.0]) band(g, M.kapton, 1.01, y, 0.06);
  cyl(g, M.alu, 0.95, 0.95, 13.62, 13.7, 0, 0, 32);
  // Four apertures on top.
  for (const [x, z, r] of [
    [-0.45, 0.45, 0.34],
    [0.45, 0.45, 0.34],
    [-0.45, -0.45, 0.3],
    [0.45, -0.45, 0.3],
  ] as [number, number, number][]) {
    cyl(g, M.gold, r, r, 13.7, 14.0, x, z, 20);
    cyl(g, M.black, r - 0.05, r - 0.05, 13.98, 14.0, x, z, 20);
  }
  // Wings.
  for (const s of [-1, 1]) {
    const wing = solarWing(g);
    wing.position.set(s * 1.4, 9.4, 0);
    strut(wing, M.alu, V(0, 0, 0), V(s * 5.0, 0, 0), 0.04, 6);
    for (let i = 0; i < 3; i++) {
      const p = cellPanel(M, 1.55, 2.6, 6, 9);
      p.position.set(s * (1.0 + i * 1.6), 0, 0);
      wing.add(p);
    }
  }
  return finish(g, HITOMI_H);
}

// ---------------------------------------------------------------------------------------------
// Spektr-RG
// ---------------------------------------------------------------------------------------------

export const SRG_H = 4.9;

/**
 * Spektr-RG: the Navigator bus in silver blanket; on it the black octagonal eROSITA with seven
 * mirror modules in a honeycomb and two white antenna domes, beside the tall ART-XC tube with its
 * seven small modules; the octagonal solar panel one side and the framed rectangular panel the
 * other.
 */
export function buildSpektrRg(): THREE.Group {
  const M = mats();
  const g = new THREE.Group();
  // Navigator bus.
  box(g, M.dark, 1.9, 1.8, 1.9, 0, 0.9, 0);
  for (const s of [-1, 1]) {
    const f = foilSheet(M.foil, 1.9, 1.7, 0.04);
    f.position.set(0, 0.9, s * 0.99);
    f.rotation.y = s > 0 ? 0 : Math.PI;
    add(g, f);
    const f2 = foilSheet(M.kapton, 1.9, 1.7, 0.04);
    f2.position.set(s * 0.99, 0.9, 0);
    f2.rotation.y = s * (Math.PI / 2);
    add(g, f2);
  }
  box(g, M.black, 2.0, 0.1, 2.0, 0, 0.0, 0);
  box(g, M.aluDk, 2.0, 0.12, 2.0, 0, 1.84, 0);
  // eROSITA: black octagonal housing, seven modules on the top face.
  prism(g, M.black, 8, 1.1, 1.1, 1.9, 3.7, -0.3, 0.15);
  prism(g, M.alu, 8, 1.15, 1.15, 3.6, 3.75, -0.3, 0.15);
  const hexPos: [number, number][] = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hexPos.push([Math.sin(a) * 0.62, Math.cos(a) * 0.62]);
  }
  for (const [dx, dz] of hexPos) {
    const x = -0.3 + dx;
    const z = 0.15 + dz;
    cyl(g, M.dark, 0.29, 0.29, 3.7, 3.82, x, z, 28, true);
    cyl(g, M.glass.clone() as Mat, 0.27, 0.27, 3.66, 3.68, x, z, 28);
    for (let i = 0; i < 12; i++) {
      const sp = box(g, M.alu, 0.012, 0.012, 0.52, 0, 3.72, 0);
      sp.position.set(x, 3.72, z);
      sp.rotation.y = (i / 12) * Math.PI;
    }
    for (const r of [0.2, 0.12]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 4, 24), M.mirror);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 3.7, z);
      add(g, t);
    }
  }
  for (const [x, z] of [
    [-1.2, 0.8],
    [0.5, 1.0],
  ] as [number, number][]) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      M.white,
    );
    dome.position.set(x, 3.45, z);
    add(g, dome);
    cyl(g, M.alu, 0.08, 0.08, 3.1, 3.45, x, z, 8);
  }
  // ART-XC: the tall tube behind, with its seven small modules.
  cyl(g, M.black, 0.6, 0.6, 1.9, 4.8, 1.05, -0.5, 24);
  foilTube(g, M.foilDk, 0.63, 0.63, 2.1, 4.1, 0.03, 1.05, -0.5, 24);
  box(g, M.alu, 0.5, 0.7, 0.3, 1.5, 3.2, -0.2);
  cyl(g, M.aluDk, 0.66, 0.66, 4.75, 4.9, 1.05, -0.5, 24);
  for (const [dx, dz] of hexPos) {
    cyl(g, M.dark, 0.11, 0.11, 4.88, 4.93, 1.05 + dx * 0.55, -0.5 + dz * 0.55, 14, true);
    cyl(g, M.mirror, 0.06, 0.06, 4.9, 4.91, 1.05 + dx * 0.55, -0.5 + dz * 0.55, 10);
  }
  // Solar arrays: octagonal on -x, framed rectangular on +x.
  const left = solarWing(g);
  left.position.set(-3.3, 1.7, 0);
  const oct = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.06, 8), M.solarDk);
  oct.rotation.x = Math.PI / 2;
  oct.geometry.rotateY(Math.PI / 8);
  left.add(oct);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.04, 8, 1, true), M.gold);
  rim.rotation.x = Math.PI / 2;
  rim.geometry.rotateY(Math.PI / 8);
  left.add(rim);
  for (let i = -3; i <= 3; i++) box(left, M.cell, 0.01, 3.2, 0.004, i * 0.45, 0, 0.032);
  strut(left, M.alu, V(1.6, -0.1, 0), V(2.6, -0.2, 0), 0.04, 6);
  const right = solarWing(g);
  right.position.set(3.4, 1.7, 0);
  const rp = cellPanel(M, 3.0, 2.3, 14, 10, M.solarDk);
  right.add(rp);
  strut(right, M.alu, V(-1.5, -0.8, 0.0), V(-2.5, -0.2, 0), 0.04, 6);
  for (const dx of [-1.5, 0, 1.5])
    strut(right, M.aluDk, V(dx, -1.15, -0.05), V(dx, 1.15, -0.05), 0.025, 5);
  beam(right, M.aluDk, V(-1.5, -1.15, -0.05), V(1.5, 1.15, -0.05), 0.04, 0.04);
  return finish(g, SRG_H);
}

const WIKI = (page: string, what: string): ShowcaseRef => ({
  l: `Wikipedia — ${what}`,
  u: `https://en.wikipedia.org/wiki/${page}`,
});
const COMMONS = (file: string, what: string): ShowcaseRef => ({
  l: `Wikimedia Commons — ${what}`,
  u: `https://commons.wikimedia.org/wiki/File:${file}`,
});

/** No fleet entry carries a length, so each model says how its height was judged. */
const EST = (basis: string): string =>
  `No length in the fleet entry; the model is drawn upright at ${basis}`;

export const SHOWCASE: Record<string, ShowcaseModel> = {
  hubble: {
    build: buildHubble,
    heightM: HUBBLE_H,
    heightEstimate: EST('13.2 m, the published length (Wikipedia infobox: 13.2 x 4.2 m).'),
    diameterM: 4.2,
    refs: [
      WIKI('Hubble_Space_Telescope', 'Hubble Space Telescope: 13.2 x 4.2 m, layout, solar arrays'),
      COMMONS(
        'HST-SM4.jpeg',
        'Hubble after the final servicing mission (the photo the shape was taken from)',
      ),
    ],
  },
  jwst: {
    build: buildJwst,
    heightM: JWST_H,
    heightEstimate: EST(
      '9 m, judged from the 6.5 m mirror (18 hexagons of 1.32 m flat to flat) stood on the sunshield and bus; the 21.2 x 14.2 m sunshield is the published figure.',
    ),
    diameterM: 6.5,
    refs: [
      WIKI(
        'James_Webb_Space_Telescope',
        'JWST: 18 hexagonal segments, 6.5 m mirror, sunshield 21.2 x 14.2 m',
      ),
      COMMONS('JWST_spacecraft_model_3.png', 'JWST spacecraft model (layout and sunshield shape)'),
    ],
  },
  chandra: {
    build: buildChandra,
    heightM: CHANDRA_H,
    heightEstimate: EST(
      '13.8 m, the length recalled from the NASA fact sheet and not re-verified; the tube and spacecraft module are scaled against it.',
    ),
    diameterM: 3.0,
    refs: [
      WIKI('Chandra_X-ray_Observatory', 'Chandra: layout, mirror assembly, solar arrays'),
      COMMONS('Chandra_X-ray_Observatory_spacecraft_model.png', 'Chandra spacecraft model'),
      COMMONS('Chandra_artist_illustration.jpg', 'Chandra artist illustration'),
    ],
  },
  spitzer: {
    build: buildSpitzer,
    heightM: SPITZER_H,
    heightEstimate: EST(
      '4.45 m, the length recalled from the NASA fact sheet and not re-verified; the 0.85 m telescope sets the tube width.',
    ),
    diameterM: 2.1,
    refs: [
      WIKI('Spitzer_Space_Telescope', 'Spitzer: 0.85 m telescope, cryostat, solar panel'),
      COMMONS('Spitzer_spacecraft_model.png', 'Spitzer spacecraft model'),
    ],
  },
  kepler: {
    build: buildKepler,
    heightM: KEPLER_H,
    heightEstimate: EST('4.7 m, the published length (Wikipedia infobox: 4.7 x 2.7 m).'),
    diameterM: 2.7,
    refs: [
      WIKI('Kepler_space_telescope', 'Kepler: 4.7 x 2.7 m, photometer, solar array'),
      COMMONS('Kepler_(spacecraft).jpg', 'Kepler spacecraft artist render'),
    ],
  },
  tess: {
    build: buildTess,
    heightM: TESS_H,
    heightEstimate: EST(
      '1.5 m, one of the three published dimensions (Wikipedia infobox: 3.7 x 1.2 x 1.5 m) taken as the height with the cameras up.',
    ),
    diameterM: 1.2,
    refs: [
      WIKI('Transiting_Exoplanet_Survey_Satellite', 'TESS: dimensions, four cameras, solar arrays'),
      COMMONS('TESS-cameras.png', 'TESS camera assembly (barrels and flared hoods)'),
    ],
  },
  gaia: {
    build: buildGaia,
    heightM: GAIA_H,
    heightEstimate: EST(
      '4.6 m, the published body length (Wikipedia infobox: 4.6 x 2.3 m) with the 10 m sunshield deployed.',
    ),
    diameterM: 3.2,
    refs: [
      WIKI('Gaia_(spacecraft)', 'Gaia: 10 m sunshield, payload and service module'),
      COMMONS('Gaia_spacecraft.jpeg', 'Gaia artist render'),
    ],
  },
  euclid: {
    build: buildEuclid,
    heightM: EUCLID_H,
    heightEstimate: EST(
      '4.7 m, the ESA launch-kit height recalled from memory and not re-verified (about 4.7 m high, 3.7 m across).',
    ),
    diameterM: 3.7,
    refs: [
      WIKI('Euclid_(spacecraft)', 'Euclid: layout, telescope, solar array'),
      COMMONS('Euclid_spacecraft_model.png', 'Euclid spacecraft model'),
      COMMONS('Euclid_spacecraft_ESA24912474.jpg', 'Euclid, ESA render'),
    ],
  },
  'xmm-newton': {
    build: buildXmm,
    heightM: XMM_H,
    heightEstimate: EST(
      '10.8 m, the published length (Wikipedia infobox: length 10.8 m, span 16.16 m).',
    ),
    diameterM: 3.2,
    refs: [
      WIKI('XMM-Newton', 'XMM-Newton: length 10.8 m, span 16.16 m, three mirror modules'),
      COMMONS('XMM-Newton_spacecraft_model.png', 'XMM-Newton spacecraft model'),
      COMMONS('XMM-Newton_spacecraft_model_2.png', 'XMM-Newton spacecraft model, rear view'),
    ],
  },
  'compton-gro': {
    build: buildCompton,
    heightM: COMPTON_H,
    heightEstimate: EST(
      '5 m, judged from the renders against the four instruments and the long wings; no published height was found.',
    ),
    diameterM: 4.2,
    refs: [
      WIKI('Compton_Gamma_Ray_Observatory', 'Compton: BATSE, OSSE, COMPTEL, EGRET'),
      COMMONS(
        'Compton_Gamma_Ray_Observatory_cutaway_(unlabelled).jpg',
        'Compton cutaway illustration',
      ),
      COMMONS(
        'Compton_Gamma_Ray_Observatory_released_from_Atlantis_(S37-96-009).jpg',
        'Compton released from Atlantis (STS-37 photograph)',
      ),
    ],
  },
  hitomi: {
    build: buildHitomi,
    heightM: HITOMI_H,
    heightEstimate: EST(
      '14 m, the figure recalled for the extended optical bench (about 14 m long) and not re-verified.',
    ),
    diameterM: 2.6,
    refs: [
      WIKI('Hitomi_(satellite)', 'Hitomi (ASTRO-H): extensible optical bench, instruments'),
      COMMONS('Hitomi.png', 'Hitomi diagram'),
      COMMONS("ASTRO-H_'HITOMI'.jpg", 'ASTRO-H before launch (stowed bench)'),
    ],
  },
  'spektr-rg': {
    build: buildSpektrRg,
    heightM: SRG_H,
    heightEstimate: EST(
      '4.9 m, judged from the renders against the 1.9 m eROSITA housing; no published height was found.',
    ),
    diameterM: 2.0,
    refs: [
      WIKI('Spektr-RG', 'Spektr-RG: eROSITA, ART-XC, Navigator bus'),
      COMMONS('Spektr-RG_payloads.png', 'Spektr-RG payloads render'),
    ],
  },
};
