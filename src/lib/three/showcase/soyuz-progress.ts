/**
 * Showcase models: the Soyuz crewed family (7K-OK, T, TM, TMA, MS) and the Progress cargo family
 * (7K-TG, M, MS). One parameterised builder per family, one SHOWCASE entry per variant.
 *
 * Standing pose, as on the rocket: service module at the bottom, descent module (Soyuz) or
 * refuelling + cargo module (Progress) above it, the orbital / cargo module on top with the
 * docking probe pointing up. Metres, base on y = 0, +z toward the viewer.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';

type Antennas = 'igla' | 'kurs' | 'kurs-na';

interface Palette {
  white: THREE.MeshStandardMaterial;
  grey: THREE.MeshStandardMaterial;
  silver: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  mli: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  cell: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  shield: THREE.MeshStandardMaterial;
  green: THREE.MeshStandardMaterial;
}

function palette(): Palette {
  const m = (color: number, metalness: number, roughness: number, side?: THREE.Side) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, side });
  return {
    white: m(0xe9e7e0, 0.15, 0.6),
    grey: m(0xa9adb2, 0.35, 0.5),
    silver: m(0xc9ccd0, 0.8, 0.3),
    gold: m(0xc79a3c, 0.85, 0.35),
    // Soyuz descent and orbital modules wear grey-green thermal blankets, not gold foil.
    mli: m(0x7f8466, 0.25, 0.75),
    dark: m(0x24262b, 0.5, 0.5),
    glass: m(0x0a0e16, 0.9, 0.12),
    cell: m(0x16254a, 0.6, 0.35, THREE.DoubleSide),
    frame: m(0x8d9298, 0.6, 0.4),
    shield: m(0x4a3524, 0.2, 0.9),
    green: m(0x6b8a74, 0.3, 0.6),
  };
}

const SEG = 32;

function lathe(pts: Array<[number, number]>, mat: THREE.Material, seg = SEG): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      seg,
    ),
    mat,
  );
  return mesh;
}

function cyl(
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  mat: THREE.Material,
  seg = 20,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg), mat);
  mesh.position.y = (y0 + y1) / 2;
  return mesh;
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Place `obj` on the hull at azimuth `a` (0 = +z), radius `r`, height `y`, local +z outward. */
function onHull(g: THREE.Group, obj: THREE.Object3D, a: number, r: number, y: number): void {
  obj.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
  obj.rotation.y = a;
  g.add(obj);
}

/** Four RCS thrusters in a quad, nozzles pointing outward. */
function rcsQuad(p: Palette): THREE.Group {
  const q = new THREE.Group();
  q.add(box(0.2, 0.2, 0.05, 0, 0, 0, p.grey));
  for (const [dx, dy] of [
    [-0.05, 0.05],
    [0.05, 0.05],
    [-0.05, -0.05],
    [0.05, -0.05],
  ]) {
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), p.dark);
    n.rotation.x = Math.PI / 2;
    n.position.set(dx, dy, 0.06);
    q.add(n);
  }
  return q;
}

/** A solar wing, deployed in the plane containing the craft axis. */
function wing(
  g: THREE.Group,
  p: Palette,
  side: 1 | -1,
  x0: number,
  x1: number,
  yc: number,
  chord: number,
): void {
  const len = x1 - x0;
  const cx = (side * (x0 + x1)) / 2;
  const w = new THREE.Group();
  w.add(box(len, chord, 0.03, cx, yc, 0, p.frame));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.08, chord - 0.08), p.cell);
  front.position.set(cx, yc, 0.018);
  w.add(front);
  const back = front.clone();
  back.position.z = -0.018;
  back.rotation.y = Math.PI;
  w.add(back);
  const cols = Math.round(len / 0.45);
  for (let i = 1; i < cols; i++) {
    w.add(box(0.018, chord - 0.06, 0.04, side * (x0 + (len * i) / cols), yc, 0, p.frame));
  }
  for (const f of [-1 / 3, 1 / 3]) {
    w.add(box(len - 0.06, 0.014, 0.04, cx, yc + f * (chord - 0.06), 0, p.frame));
  }
  w.add(cyl(0.03, 0.03, yc - 0.1, yc + 0.1, p.frame, 8));
  // Solar array: the launch scene keeps it stowed until the craft separates (types.ts).
  w.userData.solarArray = true;
  g.add(w);
}

/** Soyuz / Progress service module: engine bay, flared skirt, bulging instrument can. */
function serviceModule(
  g: THREE.Group,
  p: Palette,
  len: number,
  wings: { span: number; chord: number } | null,
): void {
  const top = len;
  const canTop = top - 0.14;
  g.add(
    lathe(
      [
        [0.0, 0.06],
        [1.08, 0.0],
        [1.1, 0.04],
        [1.1, 0.42],
        [1.34, 0.95],
      ],
      p.mli,
    ),
  );
  g.add(
    lathe(
      [
        [1.34, 0.95],
        [1.38, 1.15],
        [1.38, canTop - 0.45],
        [1.33, canTop],
        [1.2, top],
        [0.0, top],
      ],
      p.white,
    ),
  );
  // Radiator seams and the gold band at the upper rim.
  for (const y of [1.35, 1.75]) g.add(cyl(1.385, 1.385, y, y + 0.012, p.grey, SEG));
  g.add(cyl(1.335, 1.335, canTop - 0.06, canTop + 0.02, p.gold, SEG));
  // Main engine bell (KTDU), recessed in the skirt.
  const bell = lathe(
    [
      [0.1, 0.3],
      [0.2, 0.08],
      [0.46, 0.01],
      [0.44, 0.0],
      [0.18, 0.06],
      [0.08, 0.3],
    ],
    p.dark,
    24,
  );
  g.add(bell);
  g.add(cyl(0.0, 0.46, 0.02, 0.025, p.dark, 24));
  for (const a of [0.7, 2.3, 3.9, 5.5]) {
    onHull(g, rcsQuad(p), a, 1.39, canTop - 0.3);
    onHull(g, rcsQuad(p), a + Math.PI / 4, 1.15, 0.5);
  }
  if (wings) {
    const x1 = wings.span / 2;
    const yc = Math.min(1.3, canTop - wings.chord / 2 - 0.1);
    wing(g, p, 1, 1.3, x1, yc, wings.chord);
    wing(g, p, -1, 1.3, x1, yc, wings.chord);
  }
}

/** The probe-and-drogue docking head, ending with the ball tip at y = total. */
function dockingHead(g: THREE.Group, p: Palette, yBase: number, total: number): void {
  const funnelTop = Math.min(yBase + 0.16, total - 0.12);
  g.add(
    lathe(
      [
        [0.55, yBase],
        [0.58, yBase + 0.02],
        [0.5, funnelTop - 0.04],
        [0.2, funnelTop],
        [0.1, funnelTop],
      ],
      p.silver,
      28,
    ),
  );
  g.add(cyl(0.035, 0.035, funnelTop, total - 0.06, p.silver, 10));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), p.silver);
  tip.position.y = total - 0.06;
  g.add(tip);
}

function antenna(
  g: THREE.Group,
  p: Palette,
  kind: 'horn' | 'whip' | 'patch',
  a: number,
  r: number,
  y: number,
): void {
  const o = new THREE.Group();
  if (kind === 'horn') {
    o.add(box(0.05, 0.05, 0.14, 0, 0, 0.07, p.silver));
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.05, 0.1, 16, 1, true), p.grey);
    dish.rotation.x = Math.PI / 2;
    dish.position.z = 0.17;
    o.add(dish);
  } else if (kind === 'whip') {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), p.silver);
    w.rotation.x = Math.PI / 2;
    w.position.z = 0.27;
    o.add(w);
  } else {
    o.add(box(0.3, 0.22, 0.04, 0, 0, 0.02, p.dark));
    o.add(box(0.26, 0.18, 0.012, 0, 0, 0.045, p.grey));
  }
  onHull(g, o, a, r, y);
}

interface SoyuzSpec {
  total: number;
  /** Orbital-module length incl. docking head (m). */
  orbitalLen: number;
  wingSpan: number;
  wingChord: number;
  antennas: Antennas;
  mmod: boolean;
}

const SM_LEN = 2.26;
const DM_LEN = 2.24;

function buildSoyuz(s: SoyuzSpec): THREE.Group {
  const p = palette();
  const g = new THREE.Group();
  serviceModule(g, p, SM_LEN, { span: s.wingSpan, chord: s.wingChord });

  // Frame between service and descent module.
  g.add(cyl(1.15, 1.0, SM_LEN, SM_LEN + 0.1, p.dark, 24));
  // Descent module (bell) in thermal blankets, hatch at the top.
  const dmY = SM_LEN + 0.1;
  const dmTop = SM_LEN + DM_LEN;
  g.add(
    lathe(
      [
        [0.0, dmY],
        [0.9, dmY],
        [1.085, dmY + 0.3],
        [1.0, dmY + 1.0],
        [0.78, dmY + 1.6],
        [0.52, dmTop - 0.02],
        [0.5, dmTop],
        [0.0, dmTop],
      ],
      p.mli,
    ),
  );
  g.add(cyl(0.9, 0.9, dmY, dmY + 0.04, p.shield, 28));
  // Descent-module windows, two on opposite flanks.
  for (const a of [Math.PI / 2 + 0.5, -Math.PI / 2 - 0.5]) {
    const w = box(0.14, 0.14, 0.02, 0, 0, 0, p.glass);
    onHull(g, w, a, 0.95, dmY + 1.1);
  }

  // Orbital module: neck, sphere, docking collar.
  const sphereR = 1.13;
  const cy = dmTop + 0.12 + sphereR;
  g.add(
    lathe(
      [
        [0.5, dmTop],
        [0.52, dmTop + 0.1],
        [0.78, dmTop + 0.5],
      ],
      p.grey,
      24,
    ),
  );
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereR, 32, 20), p.white);
  sphere.position.y = cy;
  g.add(sphere);
  if (s.mmod) {
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(
        sphereR * 1.008,
        32,
        6,
        0,
        Math.PI * 2,
        Math.PI * 0.36,
        Math.PI * 0.2,
      ),
      p.gold,
    );
    band.position.y = cy;
    g.add(band);
  }
  // Seam ring at the equator.
  g.add(cyl(sphereR * 1.002, sphereR * 1.002, cy - 0.01, cy + 0.01, p.grey, 32));
  // Side hatch and window on the orbital module.
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 20), p.grey);
  hatch.rotation.x = Math.PI / 2;
  onHull(g, hatch, 0, sphereR - 0.02, cy - 0.05);
  const hatchWin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), p.glass);
  hatchWin.rotation.x = Math.PI / 2;
  onHull(g, hatchWin, 0, sphereR + 0.01, cy - 0.05);
  for (const a of [Math.PI * 0.62, -Math.PI * 0.62]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16), p.glass);
    w.rotation.x = Math.PI / 2;
    onHull(g, w, a, sphereR - 0.01, cy + 0.2);
  }
  // Docking collar and probe head.
  const collarBase = cy + sphereR - 0.2;
  const collarTop = s.total - 0.5;
  g.add(cyl(0.55, 0.55, collarBase, collarTop, p.white, 28));
  g.add(cyl(0.58, 0.58, collarTop - 0.03, collarTop + 0.02, p.grey, 28));
  dockingHead(g, p, collarTop, s.total);

  // Rendezvous antennas.
  const aY = cy + 0.1;
  if (s.antennas === 'igla') {
    antenna(g, p, 'horn', Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'horn', -Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'horn', Math.PI, 1.3, SM_LEN - 0.5);
  } else if (s.antennas === 'kurs') {
    for (const a of [0.8, 2.4, 3.9, 5.5]) antenna(g, p, 'whip', a, 0.55, collarBase + 0.3);
    antenna(g, p, 'horn', Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'horn', -Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'whip', Math.PI, 1.3, SM_LEN - 0.4);
  } else {
    antenna(g, p, 'patch', Math.PI, sphereR - 0.02, aY + 0.2);
    antenna(g, p, 'whip', Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'whip', -Math.PI / 2, sphereR - 0.02, aY);
    antenna(g, p, 'whip', Math.PI, 1.3, SM_LEN - 0.4);
  }
  return g;
}

interface ProgressSpec {
  total: number;
  serviceLen: number;
  refuelLen: number;
  /** Cargo-module hull length excluding the docking head. */
  cargoR: number;
  wingSpan: number | null;
  antennas: 'kurs' | 'kurs-na';
  mmod: boolean;
}

function buildProgress(s: ProgressSpec): THREE.Group {
  const p = palette();
  const g = new THREE.Group();
  serviceModule(g, p, s.serviceLen, s.wingSpan ? { span: s.wingSpan, chord: 1.3 } : null);
  g.add(cyl(1.15, 1.0, s.serviceLen, s.serviceLen + 0.1, p.dark, 24));

  // Refuelling module: ribbed cylinder with propellant-tank blisters.
  const rY0 = s.serviceLen + 0.1;
  const rY1 = s.serviceLen + s.refuelLen;
  g.add(cyl(s.cargoR, s.cargoR, rY0, rY1, p.grey, SEG));
  for (let i = 1; i < 5; i++) {
    const y = rY0 + ((rY1 - rY0) * i) / 5;
    g.add(cyl(s.cargoR + 0.01, s.cargoR + 0.01, y, y + 0.025, p.silver, SEG));
  }
  for (const a of [0.4, 1.97, 3.54, 5.11]) {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), p.green);
    tank.scale.set(1, 1.4, 1);
    onHull(g, tank, a, s.cargoR - 0.02, (rY0 + rY1) / 2);
  }
  // Collar between refuelling and cargo module.
  g.add(cyl(s.cargoR + 0.07, s.cargoR + 0.07, rY1, rY1 + 0.08, p.dark, SEG));

  // Cargo module: white cylinder with shoulders, hatch, windows.
  const cY0 = rY1 + 0.08;
  const headBase = s.total - 0.5;
  const shoulderTop = headBase - 0.28;
  g.add(
    lathe(
      [
        [s.cargoR, cY0],
        [s.cargoR, shoulderTop],
        [s.cargoR * 0.78, shoulderTop + 0.16],
        [0.56, headBase],
        [0.0, headBase],
      ],
      p.white,
    ),
  );
  for (let i = 1; i < 4; i++) {
    const y = cY0 + ((shoulderTop - cY0) * i) / 4;
    g.add(cyl(s.cargoR + 0.005, s.cargoR + 0.005, y, y + 0.015, p.grey, SEG));
  }
  if (s.mmod) {
    const y = cY0 + (shoulderTop - cY0) / 2;
    g.add(cyl(s.cargoR + 0.012, s.cargoR + 0.012, y - 0.45, y + 0.45, p.gold, SEG));
  }
  for (const a of [Math.PI / 2, -Math.PI / 2]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), p.glass);
    w.rotation.x = Math.PI / 2;
    onHull(g, w, a, s.cargoR + 0.005, shoulderTop - 0.4);
  }
  dockingHead(g, p, headBase, s.total);

  // Rendezvous antennas around the cargo-module head.
  const aY = shoulderTop - 0.1;
  if (s.antennas === 'kurs') {
    for (const a of [0.8, 2.4, 3.9, 5.5]) antenna(g, p, 'whip', a, 0.6, headBase - 0.04);
    antenna(g, p, 'horn', Math.PI / 2, s.cargoR, aY);
    antenna(g, p, 'horn', -Math.PI / 2, s.cargoR, aY);
  } else {
    antenna(g, p, 'patch', 0, s.cargoR, aY);
    antenna(g, p, 'whip', Math.PI / 2, s.cargoR, aY);
    antenna(g, p, 'whip', -Math.PI / 2, s.cargoR, aY);
  }
  antenna(g, p, 'whip', Math.PI, 1.3, s.serviceLen - 0.4);
  return g;
}

const WIKI_SOYUZ: ShowcaseRef = {
  l: 'Wikipedia, Soyuz (spacecraft) — variant comparison table: lengths, diameters, array spans, module L/D',
  u: 'https://en.wikipedia.org/wiki/Soyuz_(spacecraft)',
};
const WIKI_PROGRESS: ShowcaseRef = {
  l: 'Wikipedia, Progress (spacecraft) — variant comparison: length, diameter, array span',
  u: 'https://en.wikipedia.org/wiki/Progress_(spacecraft)',
};
const WIKI_PMS: ShowcaseRef = {
  l: 'Wikipedia, Progress-MS — 7.4 m x 2.7 m, 10.7 m array, Kurs-NA antennas, added MMOD shielding',
  u: 'https://en.wikipedia.org/wiki/Progress-MS',
};
const NASA_PROGRESS: ShowcaseRef = {
  l: 'NASA, About the Russian Progress Spacecraft — length 7.4 m, diameter 2.7 m',
  u: 'https://www.nasa.gov/wp-json/wp/v2/migration/167910?_fields=content',
};

function soyuz(spec: SoyuzSpec, refs: ShowcaseRef[]): ShowcaseModel {
  return {
    build: () => buildSoyuz(spec),
    heightM: spec.total,
    diameterM: 2.72,
    refs: [WIKI_SOYUZ, ...refs],
  };
}

function progress(spec: ProgressSpec, refs: ShowcaseRef[]): ShowcaseModel {
  return {
    build: () => buildProgress(spec),
    heightM: spec.total,
    diameterM: 2.72,
    refs: [WIKI_PROGRESS, ...refs],
  };
}

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'soyuz-7k-ok': soyuz(
    { total: 7.95, orbitalLen: 3.45, wingSpan: 9.8, wingChord: 1.8, antennas: 'igla', mmod: false },
    [],
  ),
  'soyuz-t': soyuz(
    {
      total: 7.48,
      orbitalLen: 2.98,
      wingSpan: 10.6,
      wingChord: 1.3,
      antennas: 'igla',
      mmod: false,
    },
    [],
  ),
  'soyuz-tm': soyuz(
    {
      total: 7.48,
      orbitalLen: 2.98,
      wingSpan: 10.6,
      wingChord: 1.3,
      antennas: 'kurs',
      mmod: false,
    },
    [],
  ),
  'soyuz-tma': soyuz(
    {
      total: 7.48,
      orbitalLen: 2.98,
      wingSpan: 10.7,
      wingChord: 1.3,
      antennas: 'kurs',
      mmod: false,
    },
    [],
  ),
  'soyuz-ms': soyuz(
    {
      total: 7.48,
      orbitalLen: 2.98,
      wingSpan: 10.7,
      wingChord: 1.3,
      antennas: 'kurs-na',
      mmod: true,
    },
    [],
  ),
  'progress-7k-tg': progress(
    {
      total: 7.94,
      serviceLen: SM_LEN,
      refuelLen: 2.0,
      cargoR: 1.1,
      wingSpan: null,
      antennas: 'kurs',
      mmod: false,
    },
    [],
  ),
  'progress-m': progress(
    {
      total: 7.23,
      serviceLen: SM_LEN,
      refuelLen: 1.78,
      cargoR: 1.1,
      wingSpan: 10.6,
      antennas: 'kurs',
      mmod: false,
    },
    [],
  ),
  'progress-ms': progress(
    {
      total: 7.4,
      serviceLen: 2.4,
      refuelLen: 1.78,
      cargoR: 1.1,
      wingSpan: 10.7,
      antennas: 'kurs-na',
      mmod: true,
    },
    [WIKI_PMS, NASA_PROGRESS],
  ),
};
