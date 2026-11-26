/**
 * Falcon 9 Block 5 first stage, detailed for a full-frame close-up of the landing: nine Merlin 1D
 * on the octaweb, white tank section with soot, black interstage, four lattice titanium grid fins
 * that fold flat against the body, four landing legs hinged at the base that stow along the lower
 * body and swing out and down, nitrogen cold-gas RCS pods on the interstage.
 *
 * Frame: metres, y up, base of the engine bells on y = 0, axis on x = z = 0. Legs sit at the
 * azimuths 0/90/180/270 deg (radial = (sin a, 0, cos a)), grid fins on the diagonals.
 *
 * Animation anchors, all found by name:
 * - `engine-<i>` (i = 0 centre, 1..8 ring), at the bell exit; exhaust leaves along local -y.
 * - `rcs-<i>` (0..5), at each nozzle exit; the gas leaves along local +z.
 * - `grid-fin-<i>` pivots and `leg-<i>` pivots (also grouped under `grid-fins` / `landing-legs`).
 * - `foot-<i>`, the footpad centre of each leg.
 * Drive the deployment with `setFalcon9BoosterPose`.
 *
 * `{ sideBooster: true }` builds a Falcon Heavy side booster: sourced (docs/wip/
 * 2026-11-26-falcon-heavy-demo-sourced.md, second pass) only that a nose cone replaces the black
 * interstage; its length and shape are ESTIMATES (a white cylinder to the fins, then a 5 m ogive),
 * and the grid fins are drawn as on a Falcon 9 (sources disagree whether they were larger).
 */
import * as THREE from 'three';
import { box, lathe, mat, type Mat } from './kit';

// Sourced: Wikipedia "Falcon 9": diameter 3.7 m; leg span about 18 m when deployed.
const R = 1.85;
const HEIGHT = 41.2; // estimate: first stage incl. interstage, about 41.2 m
const INTERSTAGE_H = 6.7; // estimate
const INTERSTAGE_BASE = HEIGHT - INTERSTAGE_H;
const OCTAWEB_Y = 1.3; // estimate: bell exit to the heat shield
const BODY_BASE = 1.7;
const RING_R = 1.2;
const LEG_L = 8.2; // estimate: feet 18 m apart (sourced span) and ~1.5 m below the bells, as on landed boosters
const LEG_HINGE_Y = 2.5; // estimate
const LEG_DEPLOY = (119 * Math.PI) / 180; // from "up along the body" to ~29 deg below horizontal (estimate)
const PISTON_BODY_Y = 7.5; // estimate
const PISTON_LEG_AT = 5.8; // distance along the leg
const FIN_W = 1.5;
const FIN_H = 1.2;
const FIN_Y = 38.8;
/** ESTIMATE: a side booster's white nose section runs to here, then the ogive. */
const SIDE_NOSE_BASE = 40;
const SIDE_NOSE_LEN = 5;
export const FH_SIDE_BOOSTER_HEIGHT_M = SIDE_NOSE_BASE + SIDE_NOSE_LEN;

const hullDir = (a: number, r: number, y: number) =>
  new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);

function finLattice(m: Mat): THREE.Group {
  const f = new THREE.Group();
  const D = 0.2; // cell depth
  const t = 0.035;
  const nx = 6;
  const ny = 5;
  box(f, m, FIN_W, 0.07, D, FIN_W / 2, 0.035, 0);
  box(f, m, FIN_W, 0.07, D, FIN_W / 2, FIN_H - 0.035, 0);
  box(f, m, 0.07, FIN_H, D, 0.035, FIN_H / 2, 0);
  box(f, m, 0.07, FIN_H, D, FIN_W - 0.035, FIN_H / 2, 0);
  for (let i = 1; i < nx; i++) box(f, m, t, FIN_H, D, (FIN_W * i) / nx, FIN_H / 2, 0);
  for (let j = 1; j < ny; j++) box(f, m, FIN_W, t, D, FIN_W / 2, (FIN_H * j) / ny, 0);
  return f;
}

export function buildFalcon9Booster({ sideBooster = false } = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = sideBooster ? 'falcon-heavy-side-booster' : 'falcon9-booster';
  const M: Record<string, Mat> = {
    white: mat(0xeceeef, 0.15, 0.55),
    soot: mat(0x5b5a58, 0.1, 0.9),
    sootLight: mat(0x9b9a97, 0.1, 0.85),
    black: mat(0x16171a, 0.3, 0.55),
    shield: mat(0x2b2b2e, 0.4, 0.6),
    bell: mat(0x3d3f44, 0.7, 0.4),
    titanium: mat(0x8d9096, 0.85, 0.35),
    leg: mat(0x1d1e21, 0.2, 0.6),
    metal: mat(0xb3b6bb, 0.8, 0.3),
  };

  // Tank section, white, with soot gradient bands over the lower body.
  lathe(g, M.white, [
    [R, BODY_BASE],
    [R, INTERSTAGE_BASE],
  ]);
  lathe(g, M.soot, [
    [R + 0.006, BODY_BASE],
    [R + 0.006, 7],
  ]);
  lathe(g, M.sootLight, [
    [R + 0.004, 7],
    [R + 0.004, 12],
  ]);
  if (sideBooster) {
    const ogive: [number, number][] = [
      [R, INTERSTAGE_BASE],
      [R, SIDE_NOSE_BASE],
    ];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      ogive.push([R * Math.sqrt(Math.max(0, 1 - t * t)), SIDE_NOSE_BASE + SIDE_NOSE_LEN * t]);
    }
    lathe(g, M.white, ogive);
  } else {
    lathe(g, M.black, [
      [R + 0.002, INTERSTAGE_BASE],
      [R + 0.002, HEIGHT],
      [R - 0.3, HEIGHT],
    ]);
  }
  // Octaweb heat shield.
  lathe(g, M.shield, [
    [0, OCTAWEB_Y],
    [R, OCTAWEB_Y],
    [R, BODY_BASE],
    [0, BODY_BASE],
  ]);
  lathe(g, M.shield, [
    [0, OCTAWEB_Y],
    [R - 0.05, OCTAWEB_Y],
  ]);

  // Nine Merlin 1D: bell exits on y = 0.
  for (let i = 0; i < 9; i++) {
    const a = ((i - 1) * Math.PI) / 4;
    const p = i === 0 ? new THREE.Vector3() : hullDir(a, RING_R, 0);
    const bell = new THREE.Group();
    lathe(
      bell,
      M.bell,
      [
        [0.46, 0],
        [0.4, 0.2],
        [0.28, 0.65],
        [0.17, 1.1],
        [0.15, OCTAWEB_Y + 0.05],
      ],
      20,
    );
    box(bell, M.metal, 0.3, 0.35, 0.3, 0.3, OCTAWEB_Y + 0.15, 0); // turbopump
    bell.position.copy(p);
    g.add(bell);
    const anchor = new THREE.Object3D();
    anchor.name = `engine-${i}`;
    anchor.position.copy(p);
    g.add(anchor);
  }

  // Grid fins.
  const fins = new THREE.Group();
  fins.name = 'grid-fins';
  g.add(fins);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const pivot = new THREE.Group();
    pivot.name = `grid-fin-${i}`;
    // Hinge on a vertical axis at the fin's edge: stowed lies tangent on the hull, deployed points out.
    const tangent = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    pivot.position
      .copy(hullDir(a, R + 0.1, FIN_Y - FIN_H / 2))
      .addScaledVector(tangent, -FIN_W / 2);
    pivot.rotation.y = a;
    pivot.userData.hingeAxis = new THREE.Vector3(0, 1, 0);
    pivot.userData.deployAngle = -Math.PI / 2;
    const lat = finLattice(M.titanium);
    lat.position.z = 0.08;
    pivot.add(lat);
    box(pivot, M.titanium, 0.25, 0.4, 0.3, 0.05, FIN_H / 2, -0.02); // hinge fitting
    fins.add(pivot);
  }

  // RCS cold-gas pods, opposite each other: three nozzles each (out, and either tangent).
  let rcsN = 0;
  for (const a of [0, Math.PI]) {
    const pod = new THREE.Group();
    pod.rotation.y = a;
    pod.position.copy(hullDir(a, R, 38.2));
    box(pod, M.metal, 0.7, 0.55, 0.3, 0, 0, 0.12);
    const dirs: [number, number][] = [
      [0, 0.1],
      [-0.3, 0.1],
      [0.3, 0.1],
    ];
    dirs.forEach(([x], k) => {
      const out =
        k === 0
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(k === 1 ? -1 : 1, 0, 0.4).normalize();
      const n = new THREE.Object3D();
      n.name = `rcs-${rcsN++}`;
      n.position.set(x, 0, 0.3);
      n.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.035, 0.12, 10), M.black);
      cone.rotation.x = Math.PI / 2;
      cone.position.z = -0.06;
      n.add(cone);
      pod.add(n);
    });
    g.add(pod);
  }

  // Landing legs.
  const legs = new THREE.Group();
  legs.name = 'landing-legs';
  g.add(legs);
  const feet = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const pivot = new THREE.Group();
    pivot.name = `leg-${i}`;
    pivot.rotation.order = 'YXZ'; // azimuth first, then the fold about the tangent
    pivot.position.copy(hullDir(a, R + 0.06, LEG_HINGE_Y));
    pivot.rotation.y = a;
    pivot.userData.hingeAxis = new THREE.Vector3(1, 0, 0);
    pivot.userData.deployAngle = LEG_DEPLOY;
    const arm = new THREE.Group();
    arm.name = `leg-arm-${i}`;
    // A-frame: two honeycomb struts splayed at the hinge, joined at the foot.
    for (const s of [-1, 1]) {
      const len = Math.hypot(0.45, LEG_L);
      const strutMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, len, 0.22), M.leg);
      strutMesh.position.set(s * 0.225, LEG_L / 2, 0);
      strutMesh.rotation.z = s * Math.atan2(0.45, LEG_L);
      arm.add(strutMesh);
    }
    box(arm, M.leg, 0.9, 0.12, 0.2, 0, 0.1, 0);
    box(arm, M.leg, 0.5, 0.12, 0.2, 0, LEG_L * 0.4, 0);
    const down = new THREE.Vector3(0, Math.cos(LEG_DEPLOY), -Math.sin(LEG_DEPLOY));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 20), M.leg);
    pad.position.set(0, LEG_L, 0);
    pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), down);
    arm.add(pad);
    const foot = new THREE.Object3D();
    foot.name = `foot-${i}`;
    foot.position.set(0, LEG_L, 0);
    arm.add(foot);
    pivot.add(arm);
    legs.add(pivot);

    // Telescoping piston: body bracket to a point on the leg, rebuilt by the pose setter.
    const piston = new THREE.Group();
    piston.name = `leg-piston-${i}`;
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 10), M.metal);
    outer.name = 'outer';
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1, 10), M.titanium);
    inner.name = 'inner';
    piston.add(outer, inner);
    g.add(piston);
  }
  void feet;

  setFalcon9BoosterPose(g, { fins: 0, legs: 0 });
  return g;
}

/** Fold/unfold: fins and legs 0 (stowed) .. 1 (deployed). Pure: same input, same pose. */
export function setFalcon9BoosterPose(
  g: THREE.Object3D,
  { fins, legs }: { fins: number; legs: number },
): void {
  const f = Math.min(1, Math.max(0, fins));
  const l = Math.min(1, Math.max(0, legs));
  for (let i = 0; i < 4; i++) {
    const fin = g.getObjectByName(`grid-fin-${i}`);
    if (fin)
      fin.rotation.y = Math.PI / 4 + (i * Math.PI) / 2 + f * (fin.userData.deployAngle as number);
    const leg = g.getObjectByName(`leg-${i}`);
    if (!leg) continue;
    const ang = l * LEG_DEPLOY;
    leg.rotation.x = ang;
    const a = (i * Math.PI) / 2;
    const top = hullDir(a, R + 0.05, PISTON_BODY_Y);
    const at = new THREE.Vector3(0, PISTON_LEG_AT * Math.cos(ang), PISTON_LEG_AT * Math.sin(ang))
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), a)
      .add(hullDir(a, R + 0.06, LEG_HINGE_Y));
    const piston = g.getObjectByName(`leg-piston-${i}`);
    if (!piston) continue;
    const len = Math.max(0.2, top.distanceTo(at));
    const dir = at.clone().sub(top).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const outer = piston.getObjectByName('outer')!;
    const inner = piston.getObjectByName('inner')!;
    const half = Math.min(len, Math.max(len * 0.55, 0.4));
    for (const [m, from] of [
      [outer, top.clone().addScaledVector(dir, half / 2)],
      [inner, at.clone().addScaledVector(dir, -half / 2)],
    ] as [THREE.Object3D, THREE.Vector3][]) {
      m.scale.set(1, half, 1);
      m.position.copy(from);
      m.quaternion.copy(q);
    }
  }
}

export const FALCON9_BOOSTER_HEIGHT_M = HEIGHT;
