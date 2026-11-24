/**
 * New Glenn first stage (GS1, "Never Tell Me the Odds" on NG-2), detailed for a full-frame
 * close-up of the landing: seven BE-4 under a dark aft module, a white 7 m body, two strakes and
 * four movable fins near the top, six landing legs that stow along the lower body and swing out.
 *
 * Sourced (docs/wip/2026-11-24-booster-landings-sourced.md): 57.5 m tall, 7 m diameter, 7 BE-4
 * (one centre, six ring), 6 legs extending just before touchdown, 4 movable fins at the top with
 * 2 strakes below them. Everything else here is an estimate: colours, the aft-module fairing, leg
 * length and angle, fin and strake size, and the RCS pods (placement not sourced).
 *
 * Frame: metres, y up, base of the engine bells on y = 0, axis on x = z = 0. Fins at azimuths
 * 0/90/180/270 deg, legs at 30 + 60 i deg, strakes at 45 and 225 deg (radial = (sin a, 0, cos a)).
 *
 * Animation anchors, all found by name:
 * - `engine-<i>` (i = 0 centre, 1..6 ring), at the bell exit; exhaust leaves along local -y.
 * - `rcs-<i>` (0..3), at each nozzle exit; the gas leaves along local +z.
 * - `fin-<i>` pivots and `leg-<i>` pivots (also grouped under `fins` / `landing-legs`).
 * - `foot-<i>`, the footpad centre of each leg; `strake-<i>`, fixed meshes.
 * Drive the deployment with `setNewGlennBoosterPose`.
 */
import * as THREE from 'three';
import { box, lathe, mat, type Mat } from './kit';

const R = 3.5; // sourced: 7 m diameter
const HEIGHT = 57.5; // sourced: 57.5 m (the doc row is labelled "Booster"; treated as GS1)
const OCTAWEB_Y = 2.8; // estimate: bell exit to the heat shield
const BODY_BASE = 3.2;
const AFT_TOP = 9; // estimate: top of the dark aft module
const RING_R = 2.3; // estimate
const FIN_W = 4; // estimate: ~4 x 3 m panels
const FIN_H = 3;
const FIN_Y = 50; // estimate: centre height
const STRAKE_Y0 = 36; // estimate
const STRAKE_L = 10;
const LEG_L = 10.3; // estimate: feet ~9 m from the axis and ~2 m below the bells
const LEG_HINGE_Y = 3; // estimate
const LEG_DEPLOY = (119 * Math.PI) / 180; // from "up along the body" to ~29 deg below horizontal (estimate)
const PISTON_BODY_Y = 8.5; // estimate
const PISTON_LEG_AT = 6.8; // distance along the leg
const RCS_Y = 52.5; // estimate

const hullDir = (a: number, r: number, y: number) =>
  new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
const finAz = (i: number) => (i * Math.PI) / 2;
const legAz = (i: number) => Math.PI / 6 + (i * Math.PI) / 3;

function finPanel(m: Mat): THREE.Group {
  const f = new THREE.Group();
  // Tapered panel: root along the hull, shorter tip.
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(FIN_W, 0.35);
  s.lineTo(FIN_W, FIN_H - 0.35);
  s.lineTo(0, FIN_H);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: false });
  geo.translate(0, 0, -0.14);
  f.add(new THREE.Mesh(geo, m));
  return f;
}

export function buildNewGlennBooster(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'new-glenn-booster';
  const M: Record<string, Mat> = {
    white: mat(0xeceeef, 0.15, 0.55),
    aft: mat(0x2a2c31, 0.3, 0.6),
    band: mat(0x24262b, 0.3, 0.6),
    shield: mat(0x2b2b2e, 0.4, 0.6),
    bell: mat(0x3d3f44, 0.7, 0.4),
    fin: mat(0xd9dcdf, 0.3, 0.5),
    leg: mat(0x1d1e21, 0.2, 0.6),
    metal: mat(0xb3b6bb, 0.8, 0.3),
    titanium: mat(0x8d9096, 0.85, 0.35),
  };

  lathe(
    g,
    M.white,
    [
      [R, BODY_BASE],
      [R, HEIGHT],
      [0, HEIGHT],
    ],
    48,
  );
  // Estimate: dark aft module around the engines, and a dark band at the very top.
  lathe(
    g,
    M.aft,
    [
      [R + 0.01, BODY_BASE],
      [R + 0.01, AFT_TOP],
    ],
    48,
  );
  lathe(
    g,
    M.band,
    [
      [R + 0.01, HEIGHT - 1.8],
      [R + 0.01, HEIGHT],
    ],
    48,
  );
  // Heat shield between the bells and the body.
  lathe(
    g,
    M.shield,
    [
      [0, OCTAWEB_Y],
      [R, OCTAWEB_Y],
      [R, BODY_BASE],
      [0, BODY_BASE],
    ],
    48,
  );

  // Seven BE-4: bell exits on y = 0.
  for (let i = 0; i < 7; i++) {
    const p = i === 0 ? new THREE.Vector3() : hullDir(((i - 1) * Math.PI) / 3, RING_R, 0);
    const bell = new THREE.Group();
    lathe(
      bell,
      M.bell,
      [
        [0.85, 0],
        [0.78, 0.35],
        [0.55, 1.2],
        [0.34, 2.0],
        [0.3, OCTAWEB_Y + 0.05],
      ],
      24,
    );
    box(bell, M.metal, 0.6, 0.6, 0.6, 0.5, OCTAWEB_Y + 0.3, 0); // turbopump
    bell.position.copy(p);
    g.add(bell);
    const anchor = new THREE.Object3D();
    anchor.name = `engine-${i}`;
    anchor.position.copy(p);
    g.add(anchor);
  }

  // Two fixed strakes below the fins.
  for (let i = 0; i < 2; i++) {
    const a = Math.PI / 4 + i * Math.PI;
    const s = box(g, M.fin, 0.16, STRAKE_L, 0.5, 0, 0, 0);
    s.name = `strake-${i}`;
    s.position.copy(hullDir(a, R + 0.2, STRAKE_Y0 + STRAKE_L / 2));
    s.rotation.y = a;
  }

  // Fins.
  const fins = new THREE.Group();
  fins.name = 'fins';
  g.add(fins);
  for (let i = 0; i < 4; i++) {
    const a = finAz(i);
    const pivot = new THREE.Group();
    pivot.name = `fin-${i}`;
    // Hinge on a vertical axis at the panel's edge: stowed lies tangent on the hull, deployed points out.
    const tangent = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    pivot.position
      .copy(hullDir(a, R + 0.2, FIN_Y - FIN_H / 2))
      .addScaledVector(tangent, -FIN_W / 2);
    pivot.rotation.y = a;
    pivot.userData.hingeAxis = new THREE.Vector3(0, 1, 0);
    pivot.userData.deployAngle = -Math.PI / 2;
    pivot.add(finPanel(M.fin));
    box(pivot, M.titanium, 0.4, 0.8, 0.45, 0.1, FIN_H / 2, 0); // hinge fitting
    fins.add(pivot);
  }

  // RCS cold-gas pods (estimate): two nozzles each, out and to one side.
  let rcsN = 0;
  for (const a of [Math.PI / 4, Math.PI / 4 + Math.PI]) {
    const pod = new THREE.Group();
    pod.rotation.y = a;
    pod.position.copy(hullDir(a, R, RCS_Y));
    box(pod, M.metal, 0.9, 0.6, 0.3, 0, 0, 0.12);
    for (const k of [0, 1]) {
      const out = k === 0 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0.4).normalize();
      const n = new THREE.Object3D();
      n.name = `rcs-${rcsN++}`;
      n.position.set(k === 0 ? -0.2 : 0.25, 0, 0.3);
      n.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), out);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.045, 0.15, 10), M.band);
      cone.rotation.x = Math.PI / 2;
      cone.position.z = -0.07;
      n.add(cone);
      pod.add(n);
    }
    g.add(pod);
  }

  // Landing legs.
  const legs = new THREE.Group();
  legs.name = 'landing-legs';
  g.add(legs);
  for (let i = 0; i < 6; i++) {
    const a = legAz(i);
    const pivot = new THREE.Group();
    pivot.name = `leg-${i}`;
    pivot.rotation.order = 'YXZ'; // azimuth first, then the fold about the tangent
    pivot.position.copy(hullDir(a, R + 0.06, LEG_HINGE_Y));
    pivot.rotation.y = a;
    pivot.userData.hingeAxis = new THREE.Vector3(1, 0, 0);
    pivot.userData.deployAngle = LEG_DEPLOY;
    const arm = new THREE.Group();
    arm.name = `leg-arm-${i}`;
    for (const s of [-1, 1]) {
      const len = Math.hypot(0.6, LEG_L);
      const strutMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, len, 0.32), M.leg);
      strutMesh.position.set(s * 0.3, LEG_L / 2, 0);
      strutMesh.rotation.z = s * Math.atan2(0.6, LEG_L);
      arm.add(strutMesh);
    }
    box(arm, M.leg, 1.2, 0.18, 0.3, 0, 0.12, 0);
    box(arm, M.leg, 0.7, 0.16, 0.28, 0, LEG_L * 0.4, 0);
    const down = new THREE.Vector3(0, Math.cos(LEG_DEPLOY), -Math.sin(LEG_DEPLOY));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.16, 20), M.leg);
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
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 10), M.metal);
    outer.name = 'outer';
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 10), M.titanium);
    inner.name = 'inner';
    piston.add(outer, inner);
    g.add(piston);
  }

  setNewGlennBoosterPose(g, { fins: 0, legs: 0 });
  return g;
}

/** Fold/unfold: fins and legs 0 (stowed) .. 1 (deployed). Pure: same input, same pose. */
export function setNewGlennBoosterPose(
  g: THREE.Object3D,
  { fins, legs }: { fins: number; legs: number },
): void {
  const f = Math.min(1, Math.max(0, fins));
  const l = Math.min(1, Math.max(0, legs));
  for (let i = 0; i < 4; i++) {
    const fin = g.getObjectByName(`fin-${i}`);
    if (fin) fin.rotation.y = finAz(i) + f * (fin.userData.deployAngle as number);
  }
  for (let i = 0; i < 6; i++) {
    const leg = g.getObjectByName(`leg-${i}`);
    if (!leg) continue;
    const ang = l * LEG_DEPLOY;
    leg.rotation.x = ang;
    const a = legAz(i);
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
    const half = Math.min(len, Math.max(len * 0.55, 0.6));
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

export const NEW_GLENN_BOOSTER_HEIGHT_M = HEIGHT;
