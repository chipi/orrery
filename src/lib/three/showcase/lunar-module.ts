/**
 * Showcase model: the Apollo Lunar Module (operator 2026-11-23: the LM "looks like two-year-old
 * children toys… almost has nothing to do with how the real thing looked"). Landed: legs down,
 * footpads on y = 0, the ascent stage on top, the ladder on the forward (+z) leg.
 *
 * What makes it read as the LM, in order: the descent stage's crinkled gold-and-amber foil on an
 * octagonal body; the four legs on the axes, each a gold-wrapped telescoping strut, two silver
 * side braces and a dish footpad; the faceted ascent stage with its two triangular windows and
 * the square hatch, the propellant-tank cheeks either side, the docking tunnel on top; the four
 * RCS quads on their outriggers; the rendezvous radar and the S-band dish.
 */
import * as THREE from 'three';
import type { ShowcaseModel, ShowcaseRef } from './types';
import { add, box, crinkle, dish, foilSheet, lathe, mat, strut, type Mat } from './kit';

// Real dimensions (metres) — see REFS.
const DESC_HALF = 2.11; // descent stage, half the 4.22 m across the flats
const DESC_CHAMFER = 1.19; // half-length of an axis face: the corner bays are chamfered
const DESC_BOT = 1.5;
const DESC_TOP = 3.15;
const PAD_R = 4.52; // footpad centre: 9.4 m across the diagonal pads, less the pad radius
const ASC_BASE = 3.3;

function buildDescentStage(g: THREE.Group, M: Record<string, Mat>): void {
  const oct: [number, number][] = [
    [DESC_CHAMFER, DESC_HALF],
    [DESC_HALF, DESC_CHAMFER],
    [DESC_HALF, -DESC_CHAMFER],
    [DESC_CHAMFER, -DESC_HALF],
    [-DESC_CHAMFER, -DESC_HALF],
    [-DESC_HALF, -DESC_CHAMFER],
    [-DESC_HALF, DESC_CHAMFER],
    [-DESC_CHAMFER, DESC_HALF],
  ];
  // Solid core so the foil never shows daylight through a gap.
  const shape = new THREE.Shape(oct.map(([x, z]) => new THREE.Vector2(x * 0.985, z * 0.985)));
  const core = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: DESC_TOP - DESC_BOT, bevelEnabled: false }),
    M.dark,
  );
  core.rotation.x = Math.PI / 2;
  core.position.y = DESC_TOP;
  add(g, core);

  const h = DESC_TOP - DESC_BOT;
  for (let i = 0; i < 8; i++) {
    const [ax, az] = oct[i];
    const [bx, bz] = oct[(i + 1) % 8];
    const w = Math.hypot(bx - ax, bz - az);
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const yaw = Math.atan2(mx, mz);
    const axisFace = i % 2 === 0 ? false : true;
    // Axis faces (where the legs are) in gold, the chamfered bays in the deeper amber, as the
    // flown stages were: two foils, crinkled, a black band of the base heat shield under them.
    const sheet = foilSheet(axisFace ? M.amber : M.gold, w, h - 0.2, 0.035);
    sheet.position.set(mx * 1.004, DESC_BOT + 0.2 + (h - 0.2) / 2, mz * 1.004);
    sheet.rotation.y = yaw;
    add(g, sheet);
    const band = foilSheet(M.black, w, 0.2, 0.01);
    band.position.set(mx * 1.004, DESC_BOT + 0.1, mz * 1.004);
    band.rotation.y = yaw;
    add(g, band);
  }
  // Top deck and the base heat shield.
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.deck);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = DESC_TOP + 0.005;
  add(g, deck);
  const base = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.black);
  base.rotation.x = Math.PI / 2;
  base.position.y = DESC_BOT - 0.005;
  add(g, base);

  // Descent engine: the bell hangs below the stage, its skirt wrapped in foil.
  lathe(g, M.bell, [
    [0.76, DESC_BOT - 0.62],
    [0.7, DESC_BOT - 0.35],
    [0.55, DESC_BOT - 0.05],
    [0.42, DESC_BOT + 0.1],
  ]);
  lathe(g, M.bellIn, [
    [0.42, DESC_BOT + 0.1],
    [0.53, DESC_BOT - 0.05],
    [0.68, DESC_BOT - 0.35],
    [0.74, DESC_BOT - 0.62],
  ]);
  add(
    g,
    new THREE.Mesh(
      crinkle(new THREE.CylinderGeometry(0.95, 1.15, 0.25, 16, 1, true), 0.03),
      M.gold,
    ),
  ).position.y = DESC_BOT - 0.1;

  // Four legs on the axes; the forward one (+z) carries the ladder.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const at = (r: number, y: number, s = 0): THREE.Vector3 =>
      dir.clone().multiplyScalar(r).add(side.clone().multiplyScalar(s)).setY(y);

    // Outrigger box at the top of the face, where the primary strut hangs.
    const out = box(g, M.gold, 0.5, 0.42, 0.55, 0, 0, 0);
    out.position.copy(at(DESC_HALF + 0.22, DESC_TOP - 0.25));
    out.rotation.y = a;

    const top = at(DESC_HALF + 0.42, DESC_TOP - 0.3);
    const knee = at(PAD_R - 0.08, 0.42);
    // Primary strut: the gold-wrapped cylinder, then the bare shock-absorber piston.
    const mid = top.clone().lerp(knee, 0.62);
    strut(g, M.gold, top, mid, 0.13, 12).geometry = crinkle(
      new THREE.CylinderGeometry(0.13, 0.13, top.distanceTo(mid), 12, 6),
      0.012,
    );
    strut(g, M.silver, mid, knee, 0.075, 12);
    // Secondary struts from the stage's lower corners to the primary, and the deployment truss.
    const brace = top.clone().lerp(knee, 0.7);
    for (const s of [-1, 1]) {
      const low = at(DESC_HALF, DESC_BOT + 0.15, s * (DESC_CHAMFER - 0.05));
      strut(g, M.silver, low, brace, 0.045);
      strut(
        g,
        M.black,
        at(DESC_HALF - 0.1, DESC_BOT + 0.05, s * 0.5),
        low.clone().lerp(brace, 0.5),
        0.03,
      );
    }
    // Footpad: a shallow dish of honeycomb aluminium.
    const pad = new THREE.Group();
    pad.position.copy(at(PAD_R, 0));
    lathe(pad, M.pad, [
      [0.0, 0.0],
      [0.3, 0.015],
      [0.43, 0.08],
      [0.47, 0.2],
      [0.45, 0.24],
    ]);
    strut(pad, M.silver, new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.45, 0), 0.09);
    add(g, pad);
    // RCS plume deflector plate on the deck under each quad (at the diagonals).
    const da = a + Math.PI / 4;
    const defl = box(
      g,
      M.gold,
      0.32,
      0.03,
      0.26,
      Math.sin(da) * 1.6,
      DESC_TOP + 0.12,
      Math.cos(da) * 1.6,
    );
    defl.rotation.set(0.35, da, 0);

    if (i === 0) {
      // Ladder down the forward strut, and the porch outside the hatch.
      const lTop = at(DESC_HALF + 0.3, DESC_TOP + 0.05);
      const lBot = knee.clone().add(new THREE.Vector3(0, 0.1, 0));
      const offs = dir.clone().multiplyScalar(0.12);
      for (const s of [-1, 1]) {
        const sv = side.clone().multiplyScalar(s * 0.24);
        strut(
          g,
          M.silver,
          lTop.clone().add(sv).add(offs),
          lBot.clone().add(sv).add(offs),
          0.025,
          6,
        );
      }
      for (let k = 1; k < 10; k++) {
        const p = lTop
          .clone()
          .lerp(lBot, k / 10)
          .add(offs);
        strut(
          g,
          M.silver,
          p.clone().add(side.clone().multiplyScalar(-0.24)),
          p.clone().add(side.clone().multiplyScalar(0.24)),
          0.018,
          6,
        );
      }
      box(g, M.deck, 0.95, 0.04, 0.7, 0, DESC_TOP + 0.08, DESC_HALF + 0.3);
      // Handrails either side of the porch: two posts and a rail running out to the ladder.
      for (const s of [-1, 1]) {
        const p0 = new THREE.Vector3(s * 0.46, DESC_TOP + 0.1, DESC_HALF + 0.02);
        const p1 = new THREE.Vector3(s * 0.46, DESC_TOP + 0.1, DESC_HALF + 0.6);
        const up = new THREE.Vector3(0, 0.55, 0);
        strut(g, M.silver, p0, p0.clone().add(up), 0.018, 6);
        strut(g, M.silver, p1, p1.clone().add(up), 0.018, 6);
        strut(g, M.silver, p0.clone().add(up), p1.clone().add(up), 0.018, 6);
      }
    }
  }

  // MESA (the stowed equipment bay) folded against the forward-left bay, silver foil.
  const mesa = foilSheet(M.silver, 0.95, 1.05, 0.02);
  const mesaA = Math.atan2(-1, 1);
  mesa.position.set(Math.sin(mesaA) * 2.0, DESC_BOT + 0.85, Math.cos(mesaA) * 2.0);
  mesa.rotation.y = mesaA;
  add(g, mesa);
  // Black thermal panels low on the aft bays.
  for (const ba of [Math.PI * 0.75, -Math.PI * 0.75]) {
    const p = foilSheet(M.black, 1.25, 0.7, 0.012);
    p.position.set(Math.sin(ba) * 1.7, DESC_BOT + 0.6, Math.cos(ba) * 1.7);
    p.rotation.y = ba;
    add(g, p);
  }
}

/** A box between two heights and two z planes, centred on x. */
function cabinBlock(
  g: THREE.Object3D,
  m: Mat,
  w: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
): THREE.Mesh {
  return box(g, m, w, y1 - y0, z1 - z0, 0, (y0 + y1) / 2, (z0 + z1) / 2);
}

function buildAscentStage(g: THREE.Group, M: Record<string, Mat>): void {
  const a = new THREE.Group();
  a.name = 'ascent-stage';
  a.position.y = ASC_BASE;
  add(g, a);

  // Crew cabin: a lower block holding the hatch, and above it the upper cabin whose face slopes
  // back 28 degrees — the window panel, the LM's "face" (side profile extruded across).
  const front = 1.25;
  const back = -0.25;
  const slopeTop = front - 0.45;
  cabinBlock(a, M.anod, 2.4, 0.25, 1.45, back, front);
  // The cabin's flanks under silver blanket, a black panel low on each, as flown.
  for (const sx of [-1, 1]) {
    const side = foilSheet(M.silver, front - back - 0.1, 1.1, 0.02);
    side.position.set(sx * 1.21, 0.85, (front + back) / 2);
    side.rotation.y = sx * (Math.PI / 2);
    add(a, side);
    const low = foilSheet(M.black, 0.7, 0.4, 0.01);
    low.position.set(sx * 1.225, 0.5, front - 0.45);
    low.rotation.y = sx * (Math.PI / 2);
    add(a, low);
  }
  const prof = new THREE.Shape([
    new THREE.Vector2(back, 1.45),
    new THREE.Vector2(front, 1.45),
    new THREE.Vector2(slopeTop, 2.3),
    new THREE.Vector2(back, 2.3),
  ]);
  const upperW = 2.05;
  const upper = new THREE.Mesh(
    new THREE.ExtrudeGeometry(prof, { depth: upperW, bevelEnabled: false }),
    M.anodDark,
  );
  upper.rotation.y = -Math.PI / 2;
  upper.position.x = upperW / 2;
  add(a, upper);
  // Chamfered upper corners of the lower block, where it narrows to the upper cabin.
  for (const sx of [-1, 1]) {
    const ch = box(a, M.anod, 0.32, 0.5, front - back, sx * 1.1, 1.5, (front + back) / 2);
    ch.rotation.z = sx * 0.6;
  }
  const slope = Math.atan2(front - slopeTop, 2.3 - 1.45);
  const face = new THREE.Group();
  face.position.set(0, (1.45 + 2.3) / 2, (front + slopeTop) / 2 + 0.01);
  face.rotation.x = -slope;
  add(a, face);
  box(face, M.faceDark, upperW - 0.1, 0.92, 0.03, 0, 0, 0);
  for (const sx of [-1, 1]) {
    const tri = new THREE.Shape([
      new THREE.Vector2(sx * 0.14, 0.36),
      new THREE.Vector2(sx * 0.86, 0.36),
      new THREE.Vector2(sx * 0.24, -0.34),
    ]);
    const frame = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.black);
    frame.scale.setScalar(1.1);
    frame.position.set(0, 0.01, 0.025);
    add(face, frame);
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(tri), M.glass);
    glass.position.z = 0.035;
    add(face, glass);
  }
  // Forward hatch (0.81 m square) with its handle, below the windows.
  box(a, M.hatch, 0.84, 0.84, 0.06, 0, 0.85, front + 0.03);
  box(a, M.black, 0.3, 0.05, 0.05, 0.2, 0.85, front + 0.08);
  // Panel seams on the cabin sides.
  for (const s of [-1, 1])
    for (const z of [0.15, 0.7]) box(a, M.black, 0.02, 1.15, 0.02, s * 1.19, 0.85, z);

  // Docking tunnel and drogue on top, the overhead window ahead of it.
  const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.5, 28), M.silver);
  tun.position.set(0, 2.55, 0.2);
  add(a, tun);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 8, 28), M.black);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 2.8, 0.2);
  add(a, ring);
  // The drogue sits inside the tunnel: this anchor is the ring plane the CSM's probe tip seats at.
  const drogue = new THREE.Object3D();
  drogue.name = 'docking-drogue';
  drogue.position.set(0, 2.82, 0.2);
  add(a, drogue);
  box(a, M.glass, 0.3, 0.03, 0.3, -0.5, 2.31, 0.85);
  // Docking target on its post, forward left of the tunnel.
  strut(
    a,
    M.silver,
    new THREE.Vector3(-0.75, 2.3, 0.6),
    new THREE.Vector3(-0.75, 2.7, 0.6),
    0.02,
    6,
  );
  box(a, M.white, 0.3, 0.04, 0.04, -0.75, 2.72, 0.6);
  box(a, M.white, 0.04, 0.3, 0.04, -0.75, 2.72, 0.6);

  // Aft equipment bay, silver blanket over the box, black radiators on its flanks.
  const aft = new THREE.Mesh(
    crinkle(new THREE.BoxGeometry(1.8, 1.35, 1.55, 6, 5, 6), 0.025),
    M.silver,
  );
  aft.position.set(0, 1.0, back - 0.75);
  add(a, aft);
  for (const s of [-1, 1]) box(a, M.black, 0.03, 0.9, 1.1, s * 0.92, 1.05, back - 0.8);
  box(a, M.dark, 1.2, 0.6, 0.06, 0, 1.0, back - 1.55);

  // Propellant-tank cheeks: oxidizer (left) the larger, fuel (right), in crinkled blanket.
  for (const [x, r, len] of [
    [-1.32, 0.66, 0.9],
    [1.3, 0.58, 0.8],
  ] as [number, number, number][]) {
    const t = new THREE.Mesh(
      crinkle(new THREE.CapsuleGeometry(r, len, 10, 32), 0.008),
      x < 0 ? M.black : M.silver,
    );
    t.rotation.x = Math.PI / 2;
    t.position.set(x, 0.95, back - 0.15);
    add(a, t);
  }

  // RCS quads on outriggers at the four corners, each four nozzles.
  [
    [1.0, 1.0],
    [-1.0, 1.0],
    [1.0, -1.0],
    [-1.0, -1.0],
  ].forEach(([qx, qz], qi) => {
    const q = new THREE.Group();
    q.name = `lm-rcs-quad-${qi}`;
    const n = new THREE.Vector3(qx, 0, qz).normalize();
    q.position.set(n.x * 1.95, 1.55, n.z * 1.95 + (qz > 0 ? 0.15 : -0.55));
    add(a, q);
    strut(
      a,
      M.silver,
      new THREE.Vector3(n.x * 1.1, 1.55, q.position.z - n.z * 0.7),
      q.position.clone(),
      0.05,
      6,
    );
    box(q, M.anod, 0.28, 0.32, 0.28, 0, 0, 0);
    box(q, M.black, 0.3, 0.06, 0.3, 0, 0.13, 0);
    for (const d of [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(n.z, 0, -n.x),
      new THREE.Vector3(-n.z, 0, n.x),
    ]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.075, 0.2, 10, 1, true), M.bell);
      c.position.copy(d.clone().multiplyScalar(0.24));
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      add(q, c);
    }
  });

  // Rendezvous radar: dish on a yoke, forward right of the tunnel.
  const rr = new THREE.Group();
  rr.position.set(0.72, 2.45, 0.85);
  add(a, rr);
  box(rr, M.anod, 0.12, 0.3, 0.12, 0, -0.1, 0);
  const rd = dish(M.white, M.black, 0.3);
  rd.rotation.x = Math.PI / 2 - 0.35;
  rd.position.y = 0.12;
  add(rr, rd);
  // S-band steerable antenna on its boom, right rear.
  const sbBase = new THREE.Vector3(1.05, 2.1, back - 0.5);
  const sbTip = new THREE.Vector3(1.55, 2.75, back - 0.75);
  strut(a, M.silver, sbBase, sbTip, 0.035, 6);
  const sb = dish(M.white, M.black, 0.33);
  sb.position.copy(sbTip);
  sb.rotation.set(0.5, 0, -0.5);
  add(a, sb);
  // VHF blades and the in-flight S-band horns.
  strut(
    a,
    M.silver,
    new THREE.Vector3(-0.4, 1.68, back - 1.4),
    new THREE.Vector3(-0.55, 2.55, back - 1.8),
    0.015,
    4,
  );
  strut(
    a,
    M.silver,
    new THREE.Vector3(-1.15, 0.4, back - 0.9),
    new THREE.Vector3(-1.55, 0.05, back - 1.3),
    0.015,
    4,
  );
  for (const [x, z] of [
    [0.6, front + 0.05],
    [-0.6, back - 1.55],
  ]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 10), M.white);
    horn.position.set(x, 2.25, z);
    add(a, horn);
  }

  // Ascent engine cover, seen between the stages.
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.3, 20), M.bell);
  cover.position.y = 0.05;
  add(a, cover);
  // Ascent engine exit plane, local +y along the exhaust (down).
  const engineExit = new THREE.Object3D();
  engineExit.name = 'ascent-engine-exit';
  engineExit.position.set(0, -0.1, 0);
  engineExit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
  add(a, engineExit);
}

/** The landed Apollo LM in metres: footpads on y = 0, ladder (and the front) toward +z. */
export function buildApolloLunarModule(): THREE.Group {
  const M: Record<string, Mat> = {
    gold: mat(0xd6a53c, 0.55, 0.38, true),
    amber: mat(0xb0702a, 0.5, 0.45, true),
    silver: mat(0xcdd0d5, 0.55, 0.35, true),
    black: mat(0x18191c, 0.35, 0.65, true),
    dark: mat(0x2b2d31, 0.4, 0.7),
    deck: mat(0x5a5d63, 0.55, 0.55),
    pad: mat(0xb7bac0, 0.75, 0.4),
    bell: mat(0x3a3733, 0.6, 0.55, true),
    bellIn: mat(0x24211e, 0.5, 0.7, true),
    anod: mat(0x8d9098, 0.55, 0.45),
    anodDark: mat(0x55585f, 0.55, 0.45),
    faceDark: mat(0x2c2f35, 0.35, 0.6),
    hatch: mat(0x7a7e86, 0.55, 0.45),
    glass: Object.assign(mat(0x020306, 0.05, 0.55), { envMapIntensity: 0.25 }),
    white: mat(0xe4e2dc, 0.2, 0.55),
  };
  const g = new THREE.Group();
  const ds = new THREE.Group();
  ds.name = 'descent-stage';
  g.add(ds);
  buildDescentStage(ds, M);
  buildAscentStage(g, M);
  // Stand at the sourced 7.04 m overall height.
  const box3 = new THREE.Box3().setFromObject(g);
  g.scale.setScalar(LM_HEIGHT_M / (box3.max.y - box3.min.y));
  g.position.y = -box3.min.y * g.scale.y;
  const out = new THREE.Group();
  out.add(g);
  // For a descent: the descent engine's exit plane (the plume starts there) and the top of the
  // docking tunnel (the CSM docks there), in the model's metres.
  out.userData.engineExitY = (DESC_BOT - 0.62) * g.scale.y + g.position.y;
  out.userData.dockY = (ASC_BASE + 2.82) * g.scale.y + g.position.y;
  return out;
}

export const LM_HEIGHT_M = 7.04;

const REFS: ShowcaseRef[] = [
  {
    l: 'Wikipedia — Apollo Lunar Module: 7.04 m height, 4.22 m descent-stage width, 9.4 m across the landing gear',
    u: 'https://en.wikipedia.org/wiki/Apollo_Lunar_Module',
  },
  {
    l: 'NASA — Apollo News Reference, Lunar Module: ascent and descent stage layout, RCS quads, antennas',
    u: 'https://www.hq.nasa.gov/alsj/LM04_Lunar_Module_ppLV1-17.pdf',
  },
];

export const SHOWCASE: Record<string, ShowcaseModel> = {
  'apollo-lm': {
    build: buildApolloLunarModule,
    heightM: LM_HEIGHT_M,
    diameterM: 4.22,
    refs: REFS,
  },
};
