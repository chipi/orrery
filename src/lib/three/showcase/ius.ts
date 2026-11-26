/**
 * The Inertial Upper Stage on its airborne support equipment (ASE) tilt table, and the PAM-S
 * third stage Ulysses flew, for the W10 Shuttle deploy scene. Metres. The stack lies along +y,
 * the IUS aft end (stage-1 nozzle) at y = 0, so it mounts on the orbiter's `bayMount` (whose +y
 * points forward along the bay and -z out of it); `setTilt(deg)` raises the forward end out of the
 * bay about the aft pivot, as the ASE did (29 deg for checkout, then the deployment angle).
 *
 * Sources: the STS-34 press kit (IUS 17 ft long, 9.25 ft in diameter, two solid stages; the tilt
 * table's 29 deg checkout and 58 deg deployment angles). SCHEMATIC: the split between the stages,
 * the nozzles, the equipment section and the ASE frame are drawn from photos, not measured; the
 * PAM-S (a Star 48B) size is an estimate. Level of detail per the W11 standard once it is signed off.
 */
import * as THREE from 'three';

export const IUS_LENGTH_M = 17 * 0.3048;
export const IUS_DIAMETER_M = 9.25 * 0.3048;
/** Stage 1's share of the length: an ESTIMATE (the larger SRM-1, about 60 %). */
const STAGE1_LEN = 3.1;
const PAM_LEN = 2.0;
const PAM_R = 0.62;

const mat = (color: number, metalness = 0.3, roughness = 0.6, double = false) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });

function cyl(
  parent: THREE.Object3D,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  m: THREE.Material,
  seg = 40,
  open = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, y1 - y0, seg, 1, open), m);
  mesh.position.y = (y0 + y1) / 2;
  parent.add(mesh);
  return mesh;
}

export interface IusStack extends THREE.Group {
  userData: {
    /** Raise the stack's forward end out of the bay about the aft pivot (deg, 0 stowed). */
    setTilt: (deg: number) => void;
    /** The part that leaves at release: the IUS, the PAM-S when fitted, and the payload. */
    stack: THREE.Group;
    stage1: THREE.Group;
    stage2: THREE.Group;
    pamS?: THREE.Group;
    /** Nozzle exits in `stack` coordinates, where the scene lights each burn's plume (firing -y). */
    exits: { stage1: number; stage2: number; pamS?: number };
  };
}

/** The IUS (and a PAM-S above it when `pamS`) with `payload` on top, on the ASE tilt table. */
export function buildIusStack(o: { payload?: THREE.Object3D; pamS?: boolean } = {}): IusStack {
  const root = new THREE.Group() as IusStack;
  root.name = 'ius-ase';
  const R = IUS_DIAMETER_M / 2;
  const white = mat(0xe6e4de, 0.2, 0.55);
  const foil = mat(0xb8b2a2, 0.7, 0.35);
  const dark = mat(0x2b2c31, 0.5, 0.5, true);
  const frame = mat(0x8d9097, 0.6, 0.45);

  // ASE: the aft frame stays on the bay floor; the tilt frame carries the stack.
  const base = new THREE.Group();
  base.name = 'ase-aft-frame';
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 1.2), frame);
    leg.position.set(s * (R - 0.15), 0, 0.55);
    base.add(leg);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * R, 0.25, 0.2), frame);
  beam.position.set(0, 0, 1.1);
  base.add(beam);
  root.add(base);

  const tilt = new THREE.Group();
  tilt.name = 'ase-tilt-frame';
  root.add(tilt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.08, 0.07, 8, 48), frame);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.35;
  tilt.add(ring);

  const stack = new THREE.Group();
  stack.name = 'ius-stack';
  tilt.add(stack);

  const stage1 = new THREE.Group();
  stage1.name = 'ius-stage1';
  stack.add(stage1);
  cyl(stage1, R, R, 0.25, STAGE1_LEN, white);
  cyl(stage1, R * 0.98, R, 0, 0.25, foil);
  const n1 = cyl(stage1, R * 0.32, R * 0.18, -0.35, 0.05, dark, 24, true);
  n1.name = 'stage1-nozzle';

  const stage2 = new THREE.Group();
  stage2.name = 'ius-stage2';
  stack.add(stage2);
  cyl(stage2, R * 0.96, R * 0.96, STAGE1_LEN, STAGE1_LEN + 0.35, dark);
  cyl(stage2, R * 0.72, R * 0.72, STAGE1_LEN + 0.35, IUS_LENGTH_M - 0.55, foil);
  // the equipment support section: a full-diameter ring at the top
  cyl(stage2, R, R, IUS_LENGTH_M - 0.55, IUS_LENGTH_M, white);
  const n2 = cyl(stage2, R * 0.42, R * 0.16, STAGE1_LEN - 0.25, STAGE1_LEN + 0.35, dark, 24, true);
  n2.name = 'stage2-nozzle';
  n2.visible = false; // inside the interstage until stage 1 is gone
  stage2.userData.nozzle = n2;

  let top = IUS_LENGTH_M;
  let pamS: THREE.Group | undefined;
  if (o.pamS) {
    pamS = new THREE.Group();
    pamS.name = 'pam-s';
    stage2.add(pamS);
    cyl(pamS, PAM_R * 1.05, PAM_R * 1.05, top, top + 0.3, frame, 32, true);
    const motor = new THREE.Mesh(new THREE.SphereGeometry(PAM_R, 32, 16), dark);
    motor.scale.y = (PAM_LEN - 0.5) / 2 / PAM_R;
    motor.position.y = top + 0.25 + (PAM_LEN - 0.5) / 2;
    pamS.add(motor);
    cyl(pamS, PAM_R * 0.5, PAM_R * 0.2, top + 0.05, top + 0.3, dark, 24, true);
    top += PAM_LEN;
  }
  if (o.payload) {
    o.payload.position.y = top;
    (pamS ?? stage2).add(o.payload);
  }

  root.userData = {
    setTilt: (deg: number) => {
      tilt.rotation.x = -(Math.max(-10, Math.min(90, deg)) * Math.PI) / 180;
    },
    stack,
    stage1,
    stage2,
    pamS,
    exits: {
      stage1: -0.35,
      stage2: STAGE1_LEN - 0.25,
      pamS: pamS ? IUS_LENGTH_M + 0.05 : undefined,
    },
  };
  return root;
}
