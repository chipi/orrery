/**
 * The /fly arm release (W10, `method: 'rms'`): the Shuttle's Remote Manipulator System grapples
 * the observatory in the open bay, lifts it out and holds it high, its arrays and antennas deploy
 * on the arm, the end effector lets go and the orbiter backs away on its RCS. Hubble (STS-31): solar
 * array panel 2 stalls, half deploys on the second try and deploys on the third. Compton (STS-37):
 * the high-gain antenna stays stowed through the RCS and arm shaking, the arm lowers Compton toward
 * the bay and a spacewalker frees it, then the arm takes it back up and lets go. Pose and camera
 * are pure functions of scene time (the fly-deploy-scene.ts pattern), so a scrub is exact.
 *
 * Time is COMPRESSED and the HUD says so. Sourced (the post-flight mission reports): the release
 * and the separation burns' start times, the order of events and how the two anomalies played out.
 * ESTIMATES (each profile's `estimatedFields`): every MET before the release (the HUD marks them
 * "~"; Compton's spacewalk start is the English Wikipedia's), the burns' length and delta-v, the
 * arm's joint angles (an inverse-kinematics fit to the schematic Canadarm in winged.ts), the bay
 * placement, the lift heights, the release position, the spacewalker and every camera move.
 *
 * Frame: as fly-deploy-scene.ts (world metres, the orbiter's nose toward +z, the bay open to +y,
 * the Earth below at 1/1000 scale). The arm is solved in the orbiter model's own frame (the bay
 * opens to -z there, the nose is +y).
 */
import * as THREE from 'three';
import type { RmsDeployProfile } from '$lib/fly/deploy-profile';
import type { RmsRig } from './showcase/winged';
import { addDeployBackdrop, backAwayDir } from './fly-deploy-scene';
import { portraitFit } from './phone-framing';

const FT = 0.3048;
/** Upper and lower boom (shoulder pitch to elbow, elbow to wrist pitch) and wrist pitch to the
 *  grapple point, as built in winged.ts buildRms (SCHEMATIC split of the sourced 15.2 m). */
const L1 = 6.4;
const L2 = 7.0;
const WRIST = 1.8;
/** The RCS separation delta-v when the report prints none: ESTIMATE (fly-deploy-scene.ts). */
const DEFAULT_SEP_FTS = 1;

export type RmsBeat =
  | 'establish'
  | 'grapple'
  | 'unberth'
  | 'arrays'
  | 'arrayStuck'
  | 'arrayRetry'
  | 'antennas'
  | 'antennaStuck'
  | 'eva'
  | 'release'
  | 'separation';

type Phase =
  | 'reach'
  | 'grip'
  | 'lift'
  | 'toRelease'
  | 'arrays'
  | 'stuck'
  | 'retry'
  | 'antennas'
  | 'shake'
  | 'lower'
  | 'free'
  | 'raise'
  | 'release'
  | 'separation';

interface Step {
  phase: Phase;
  beat?: RmsBeat;
  /** Scene seconds. */
  t0: number;
  t1: number;
  /** Real MET seconds before the release at the step's start (ESTIMATES), or null when the step
   *  sits at or after the release (its MET then comes from the burns). */
  metBefore?: number;
}

const H = 3600;

/** The scene timeline: the same opening for both, then each anomaly as flown. */
export function rmsSteps(p: Pick<RmsDeployProfile, 'anomaly'>): Step[] {
  // Compton's day ran longer: grapple about an hour after the arm was positioned, the move to the
  // release position about an hour after that, then the arrays, the stuck antenna, the shaking
  // and the spacewalk (STS-37 report; the hours before the release are ESTIMATES).
  const long = p.anomaly === 'antenna-eva';
  const before = (hHubble: number, hCompton: number) => (long ? hCompton : hHubble) * H;
  const s: Step[] = [
    { phase: 'reach', beat: 'grapple', t0: 3, t1: 8.5, metBefore: before(5, 8.6) },
    { phase: 'grip', t0: 8.5, t1: 10, metBefore: before(4.8, 8.2) },
    { phase: 'lift', beat: 'unberth', t0: 10.5, t1: 15, metBefore: before(4.5, 7.4) },
    { phase: 'toRelease', t0: 15, t1: 21, metBefore: before(4, 7.1) },
  ];
  let t = 22;
  if (p.anomaly === 'array-retry') {
    s.push(
      { phase: 'arrays', beat: 'arrays', t0: t, t1: t + 5, metBefore: 3.2 * H },
      { phase: 'stuck', beat: 'arrayStuck', t0: t + 5, t1: t + 8, metBefore: 2.8 * H },
      { phase: 'retry', beat: 'arrayRetry', t0: t + 8, t1: t + 15, metBefore: 2.2 * H },
      { phase: 'antennas', beat: 'antennas', t0: t + 15.5, t1: t + 19, metBefore: 1.2 * H },
    );
    t += 20;
  } else if (long) {
    s.push(
      { phase: 'arrays', beat: 'arrays', t0: t, t1: t + 5, metBefore: 6.4 * H },
      { phase: 'shake', beat: 'antennaStuck', t0: t + 5.5, t1: t + 11, metBefore: 5.8 * H },
      // its MET is the profile's spacewalk start (rmsMetAt)
      { phase: 'lower', beat: 'eva', t0: t + 11.5, t1: t + 16, metBefore: 4.6 * H },
      { phase: 'free', t0: t + 17, t1: t + 21, metBefore: 4.2 * H },
      { phase: 'raise', t0: t + 21.5, t1: t + 26, metBefore: 0.8 * H },
    );
    t += 27;
  } else {
    s.push(
      { phase: 'arrays', beat: 'arrays', t0: t, t1: t + 5, metBefore: 2 * H },
      { phase: 'antennas', beat: 'antennas', t0: t + 5.5, t1: t + 9, metBefore: 1 * H },
    );
    t += 10;
  }
  s.push(
    { phase: 'release', beat: 'release', t0: t, t1: t + 5 },
    { phase: 'separation', beat: 'separation', t0: t + 6, t1: t + 14 },
  );
  return s;
}

export function rmsDeployEnd(p: Pick<RmsDeployProfile, 'anomaly'>): number {
  const s = rmsSteps(p);
  return s[s.length - 1].t1 + 3;
}

export function rmsBeatsFor(p: Pick<RmsDeployProfile, 'anomaly'>): { id: RmsBeat; t: number }[] {
  return [
    { id: 'establish', t: 0 },
    ...rmsSteps(p)
      .filter((s) => s.beat)
      .map((s) => ({ id: s.beat!, t: s.t0 })),
  ];
}

export function rmsBeatAt(t: number, p: Pick<RmsDeployProfile, 'anomaly'>): RmsBeat {
  let id: RmsBeat = 'establish';
  for (const b of rmsBeatsFor(p)) if (t >= b.t) id = b.id;
  return id;
}

const releaseT = (p: Pick<RmsDeployProfile, 'anomaly'>) =>
  rmsSteps(p).find((s) => s.phase === 'release')!.t0;

/** True while the HUD clock is an estimate (before the release, the first sourced event). */
export const rmsMetIsEstimate = (t: number, p: Pick<RmsDeployProfile, 'anomaly'>): boolean =>
  t < releaseT(p);

/** The real MET (s) on the HUD: piecewise linear through the steps' estimated offsets, the
 *  release and the separation burns. Compton's spacewalk sits at the profile's EVA time. */
export function rmsMetAt(t: number, p: RmsDeployProfile): number {
  const steps = rmsSteps(p);
  const r = p.releaseS;
  const k: [number, number][] = [[0, r - (p.anomaly === 'antenna-eva' ? 9 : 5.3) * H]];
  for (const s of steps) {
    if (s.metBefore === undefined) continue;
    const met = s.phase === 'lower' && p.evaS !== undefined ? p.evaS : r - s.metBefore;
    if (met > k[k.length - 1][1]) k.push([s.t0, met]);
  }
  const rel = releaseT(p);
  k.push([rel, r]);
  const sepStep = steps.find((s) => s.phase === 'separation')!;
  const sep = p.sepBurnsS[0];
  if (sep > r) k.push([sepStep.t0, sep]);
  // the last shot runs at about 75x: the orbiter has drifted a few hundred metres by the end
  k.push([rmsDeployEnd(p), Math.max(sep, r) + p.sepBurns[0].burnS + 900]);
  if (t <= 0) return k[0][1] + t;
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, g0] = k[i - 1];
      const [t1, g1] = k[i];
      return g0 + ((g1 - g0) * (t - t0)) / (t1 - t0);
    }
  }
  const [tl, gl] = k[k.length - 1];
  return gl + (t - tl);
}

/** The arm's six joint angles (rad) in chain order: shoulder yaw and pitch, elbow, wrist pitch,
 *  yaw, roll. */
export type Joints = [number, number, number, number, number, number];
export const STOWED: Joints = [0, 0, 0, 0, 0, 0];

/**
 * Inverse kinematics for a grapple point `tip` (in the arm base's frame: the orbiter model's axes,
 * origin at the shoulder) approached straight down into the bay (+z), the elbow up. The wrist roll
 * takes back the shoulder yaw past `yawRef`, so the payload keeps its heading as the arm swings.
 * Null when out of reach.
 */
export function solveArm(tip: THREE.Vector3, yawRef = 0): Joints | null {
  // the wrist pitch joint sits WRIST above the grapple point (out of the bay, -z)
  const w = tip.clone().add(new THREE.Vector3(0, 0, -WRIST));
  const yaw = Math.atan2(w.x, -w.y);
  const u = Math.hypot(w.x, w.y);
  const v = -w.z;
  const d2 = u * u + v * v;
  const c = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  if (c > 1 || c < -1) return null;
  const sols = [Math.acos(c), -Math.acos(c)].map((e) => {
    const sh = Math.atan2(v, u) - Math.atan2(L2 * Math.sin(e), L1 + L2 * Math.cos(e));
    return [sh, e] as const;
  });
  // elbow up: the solution whose elbow stands higher out of the bay
  const [sh, el] = sols.sort((a, b) => Math.sin(b[0]) - Math.sin(a[0]))[0];
  const wristPitch = -Math.PI / 2 - sh - el;
  return [yaw, sh, el, wristPitch, 0, yaw - yawRef];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpJ = (a: Joints, b: Joints, k: number): Joints =>
  a.map((x, i) => lerp(x, b[i], k)) as Joints;

/** The solved arm poses, from the built models. */
export interface RmsKeys {
  /** Over the fixture, 1.2 m above it. */
  hover: Joints;
  grapple: Joints;
  /** Lifted clear of the bay. */
  unberth: Joints;
  /** High above the crew cabin, where the observatory deploys and is let go. */
  release: Joints;
  /** Compton's spacewalk pose: lowered toward the bay. */
  lowered: Joints;
  /** After the release: the end effector backed off the fixture. */
  backOff: Joints;
}

export interface RmsPose {
  t: number;
  met: number;
  beat: RmsBeat;
  joints: Joints;
  /** 'bay' before the grapple, 'arm' while held, 'free' after the release. */
  payload: 'bay' | 'arm' | 'free';
  /** Each wing 0 stowed .. 1 deployed (Hubble: wing 2 is the one that stalled). */
  arrays: [number, number];
  antennas: number;
  /** The spacewalker's presence 0..1 (Compton). */
  eva: number;
  /** How far the orbiter has backed away since its separation burn (m). */
  orbiterBackM: number;
  /** Seconds since the separation burn's ignition while it burns, else null. */
  burn: number | null;
}

export function rmsPose(t: number, p: RmsDeployProfile, keys: RmsKeys): RmsPose {
  const steps = rmsSteps(p);
  const at = (ph: Phase) => steps.find((s) => s.phase === ph);
  const k = (ph: Phase) => {
    const s = at(ph);
    return s ? smooth((t - s.t0) / (s.t1 - s.t0)) : 0;
  };
  const met = rmsMetAt(t, p);
  const reach = at('reach')!;
  let joints: Joints = STOWED;
  if (t >= reach.t0) joints = lerpJ(STOWED, keys.hover, k('reach'));
  if (t >= at('grip')!.t0) joints = lerpJ(keys.hover, keys.grapple, k('grip'));
  if (t >= at('lift')!.t0) joints = lerpJ(keys.grapple, keys.unberth, k('lift'));
  if (t >= at('toRelease')!.t0) joints = lerpJ(keys.unberth, keys.release, k('toRelease'));
  const lower = at('lower');
  const raise = at('raise');
  if (lower && t >= lower.t0) joints = lerpJ(keys.release, keys.lowered, k('lower'));
  if (raise && t >= raise.t0) joints = lerpJ(keys.lowered, keys.release, k('raise'));
  const shake = at('shake');
  if (shake && t >= shake.t0 && t <= shake.t1) {
    // the RCS and then the arm shaking the stuck antenna: a small wrist oscillation (ESTIMATE)
    const a =
      0.025 *
      Math.sin((t - shake.t0) * 9) *
      Math.sin(((t - shake.t0) / (shake.t1 - shake.t0)) * Math.PI);
    joints = joints.map((x, i) => (i === 3 ? x + a : x)) as Joints;
  }
  const rel = at('release')!;
  if (t >= rel.t0) joints = lerpJ(keys.release, keys.backOff, k('release'));

  const payload: RmsPose['payload'] =
    t < at('grip')!.t1 ? 'bay' : t < rel.t0 + 0.6 ? 'arm' : 'free';

  let arrays: [number, number];
  const ar = at('arrays')!;
  const kA = k('arrays');
  if (p.anomaly === 'array-retry') {
    // panel 2: the mast out, the blanket does not roll (first attempt); half out on the second;
    // all out on the third (STS-31 report: their outcome, not their times)
    const retry = at('retry')!;
    const kR = clamp01((t - retry.t0) / (retry.t1 - retry.t0));
    const second = 0.25 + 0.35 * smooth(kR / 0.4);
    const third = lerp(0.6, 1, smooth((kR - 0.55) / 0.45));
    const w2 = t < retry.t0 ? Math.min(0.27, kA) : kR < 0.55 ? second : third;
    arrays = [kA, t < ar.t0 ? 0 : w2];
  } else arrays = [kA, kA];
  const antennas = p.anomaly === 'antenna-eva' ? k('free') : k('antennas');
  const eva = lower && raise ? clamp01(Math.min((t - lower.t0) / 2, (raise.t0 + 1 - t) / 1.5)) : 0;

  const sepS = p.sepBurnsS[0];
  const burnS = p.sepBurns[0].burnS;
  const dv = (p.sepBurns[0].dvFts ?? DEFAULT_SEP_FTS) * FT;
  const tau = met - sepS;
  const orbiterBackM =
    tau <= 0
      ? 0
      : tau < burnS
        ? (0.5 * dv * tau * tau) / burnS
        : dv * (tau - burnS) + 0.5 * dv * burnS;
  return {
    t,
    met,
    beat: rmsBeatAt(t, p),
    joints,
    payload,
    arrays,
    antennas,
    eva,
    orbiterBackM,
    burn: tau >= 0 && tau <= burnS ? tau : null,
  };
}

export interface FlyRmsDeployModels {
  /** buildOrbiterOpenable(): userData.rms (RmsRig), userData.bay, setBayDoors. */
  orbiter: THREE.Group;
  /** The observatory as launched (buildHubble / buildCompton({ asLaunched: true })): userData
   *  grapple, setArrays, setAntennas or setAntenna. */
  payload: THREE.Group;
}

export interface FlyRmsDeploy {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profile: RmsDeployProfile;
  keys: RmsKeys;
  end: number;
  parts: { orbiter: THREE.Object3D; payload: THREE.Object3D; tip: THREE.Object3D };
  update: (t: number, aspect: number) => RmsPose;
  dispose: () => void;
}

interface Bay {
  aftY: number;
  fwdY: number;
  halfWidth: number;
  sillZ: number;
  floorZ: number;
}

/** A spacesuited figure (SCHEMATIC): the white suit, the backpack, the gold visor; ~1.9 m. */
function spacewalker(): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xeeece6, roughness: 0.7 });
  const visor = new THREE.MeshStandardMaterial({
    color: 0xd8a640,
    metalness: 0.8,
    roughness: 0.25,
  });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  add(new THREE.CapsuleGeometry(0.26, 0.55, 4, 10), white, 0, 1.15, 0);
  add(new THREE.BoxGeometry(0.55, 0.65, 0.25), white, 0, 1.25, -0.27);
  add(new THREE.SphereGeometry(0.19, 14, 10), white, 0, 1.78, 0);
  add(
    new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    visor,
    0,
    1.76,
    0.06,
  ).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), white, s * 0.12, 0.45, 0);
    const arm = add(new THREE.CapsuleGeometry(0.09, 0.5, 4, 8), white, s * 0.36, 1.35, 0.15);
    arm.rotation.x = -1.0;
  }
  return g;
}

export function createFlyRmsDeploy(
  profile: RmsDeployProfile,
  models: FlyRmsDeployModels,
  opts: { earthTextureUrl?: string } = {},
): FlyRmsDeploy {
  const scene = new THREE.Scene();
  const { stars, earthTex } = addDeployBackdrop(scene, profile.orbit.nmi, opts.earthTextureUrl);

  const orbiter = models.orbiter;
  const orbiterHolder = new THREE.Group();
  orbiter.rotation.x = Math.PI / 2;
  orbiterHolder.add(orbiter);
  scene.add(orbiterHolder);
  (orbiter.userData.setGear as ((t: number) => void) | undefined)?.(0);
  // The doors opened hours earlier (their time is in no report): open from the first frame.
  (orbiter.userData.setBayDoors as (t: number) => void)(1);
  const rig = orbiter.userData.rms as RmsRig;
  const bay = orbiter.userData.bay as Bay;
  const model = rig.base.parent!;

  // The observatory in the bay: its long axis along the bay, its base (Hubble's aft shroud, which
  // carries the fixture) forward by the arm's shoulder, the fixture's face up out of the bay, its
  // lowest point on the floor (ESTIMATE: no source gives the orientation in the bay).
  const pay = models.payload;
  const pu = pay.userData as {
    grapple: THREE.Object3D;
    setArrays?: (a: number, b?: number) => void;
    setAntennas?: (k: number) => void;
    setAntenna?: (k: number) => void;
  };
  const payHolder = new THREE.Group();
  payHolder.add(pay);
  scene.add(payHolder);
  const inBay = new THREE.Group();
  model.add(inBay);
  pay.updateMatrixWorld(true);
  const pb = new THREE.Box3().setFromObject(pay);
  // local +z (the fixture's face) to model -z (out of the bay), local +y aft (-y)
  inBay.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  // its base half a metre short of the forward bulkhead; local -z now points into the bay
  const fwdEnd = bay.fwdY - 0.5;
  inBay.position.set(0, fwdEnd + pb.min.y, bay.floorZ + pb.min.z - 0.15);
  orbiterHolder.updateMatrixWorld(true);
  const bayWorld = inBay.matrixWorld.clone();

  // Solve the arm in the base's frame (the model's axes; the base carries no rotation).
  const toBase = (worldP: THREE.Vector3) => {
    const p = model.worldToLocal(worldP.clone());
    return p.sub(rig.base.position);
  };
  payHolder.matrixAutoUpdate = false;
  payHolder.matrix.copy(bayWorld);
  payHolder.updateMatrixWorld(true);
  const fixture0 = toBase(pu.grapple.getWorldPosition(new THREE.Vector3()));
  const solve = (p: THREE.Vector3, yawRef: number, what: string): Joints => {
    const j = solveArm(p, yawRef);
    if (!j) throw new Error(`RMS out of reach: ${what} at ${p.toArray().map((x) => x.toFixed(2))}`);
    return j;
  };
  const grapple = solve(fixture0, 0, 'grapple');
  const yawRef = grapple[0];
  grapple[5] = 0;
  const up = (m: number) => new THREE.Vector3(0, 0, -m);
  // The release position (ESTIMATE; the STS-31 press kit has Hubble held "above the crew cabin"):
  // the fixture 6 m aft of the shoulder and 7.4 m above it, the payload hanging aft of it over the
  // bay. With the grapple on top, the arm has to stand over the payload: the upper boom rises near
  // the shoulder, clear of the payload's forward end, and the lower boom reaches back over its top.
  // Held above the cabin, the upper boom would pass through the payload.
  const RELEASE_AFT = 6;
  const RELEASE_UP = 7.4;
  const releaseTip = new THREE.Vector3(fixture0.x, -RELEASE_AFT, -RELEASE_UP);
  const keys: RmsKeys = {
    hover: solve(fixture0.clone().add(up(1.2)), yawRef, 'hover'),
    grapple,
    unberth: solve(fixture0.clone().add(up(3.4)), yawRef, 'unberth'),
    release: solve(releaseTip, yawRef, 'release'),
    // Compton lowered so the antenna is in reach from the bay (STS-37 report; how far: ESTIMATE)
    lowered: solve(new THREE.Vector3(fixture0.x, -RELEASE_AFT, -4.6), yawRef, 'lowered'),
    // the end effector lets go and backs straight up off the fixture
    backOff: solve(releaseTip.clone().add(up(1.5)), yawRef, 'backOff'),
  };
  keys.hover[5] = 0;
  keys.unberth[5] = 0;

  const setJoints = (j: Joints) => {
    rig.shoulderYaw.rotation.z = j[0];
    rig.shoulderPitch.rotation.x = j[1];
    rig.elbow.rotation.x = j[2];
    rig.wristPitch.rotation.x = j[3];
    rig.wristYaw.rotation.z = j[4];
    rig.wristRoll.rotation.y = j[5];
  };
  // The payload's pose relative to the end effector, fixed at the grapple.
  setJoints(keys.grapple);
  orbiterHolder.updateMatrixWorld(true);
  const eeInv = rig.endEffector.matrixWorld.clone().invert();
  const offset = eeInv.multiply(bayWorld);
  const heldAt = (j: Joints) => {
    setJoints(j);
    orbiterHolder.updateMatrixWorld(true);
    return rig.endEffector.matrixWorld.clone().multiply(offset);
  };
  const freeWorld = heldAt(keys.release);
  setJoints(STOWED);

  const walker = spacewalker();
  walker.visible = false;
  model.add(walker);
  // in the bay under the lowered Compton, facing aft toward it (ESTIMATE)
  walker.position.set(
    -fixture0.x * 0.3 + rig.base.position.x - 1.2,
    fixture0.y + rig.base.position.y - 1.5,
    bay.sillZ + 0.4,
  );
  walker.rotation.x = -Math.PI / 2;

  const rcsFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 1.4, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xcfe0ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  rcsFlame.visible = false;
  model.add(rcsFlame);
  rcsFlame.position.set(0, bay.fwdY + 3.5, bay.sillZ - 0.5);
  rcsFlame.rotation.x = Math.PI;

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 6e4);
  const end = rmsDeployEnd(profile);
  // the body's centre (the stowed box measured before anything deployed), not the arrays'
  const bodyCentre = pb.getCenter(new THREE.Vector3());
  const payCentre = () => pay.localToWorld(bodyCentre.clone());
  const orbCentre = () => new THREE.Box3().setFromObject(orbiter).getCenter(new THREE.Vector3());
  const steps = rmsSteps(profile);
  const stepT = (ph: Phase) => steps.find((s) => s.phase === ph)?.t0 ?? Infinity;
  const restCentre = orbCentre();

  const update = (tIn: number, aspect: number): RmsPose => {
    const t = Math.min(end, Math.max(0, tIn));
    const pose = rmsPose(t, profile, keys);
    orbiterHolder.position.copy(backAwayDir().multiplyScalar(pose.orbiterBackM));
    setJoints(pose.joints);
    orbiterHolder.updateMatrixWorld(true);
    payHolder.matrix.copy(
      pose.payload === 'bay'
        ? bayWorld
        : pose.payload === 'arm'
          ? rig.endEffector.matrixWorld.clone().multiply(offset)
          : freeWorld,
    );
    if (pose.payload === 'bay') {
      // the bay pose moves with the orbiter (it does not before the separation; kept exact)
      payHolder.matrix.copy(inBay.matrixWorld);
    }
    payHolder.updateMatrixWorld(true);
    pu.setArrays?.(pose.arrays[0], pose.arrays[1]);
    pu.setAntennas?.(pose.antennas);
    pu.setAntenna?.(pose.antennas);
    walker.visible = pose.eva > 0.02;
    walker.position.z = bay.sillZ + 0.4 - 0.3 * pose.eva;
    rcsFlame.visible = pose.burn != null;

    const fit = portraitFit(aspect);
    const pc = payCentre();
    const oc = orbCentre();
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // On a phone each shot swings toward the bay's axis (world z), along the observatory's length,
    // so the long body stays inside the narrow frame.
    const portrait = aspect < 1;
    const shot = (look: THREE.Vector3, off: THREE.Vector3, fov = 40) => {
      const o = portrait ? V(off.x * 0.35, off.y, off.z || -1).setLength(off.length()) : off;
      return { position: look.clone().addScaledVector(o, fit), look, fov };
    };
    const shots: [number, ReturnType<typeof shot>][] = [
      [0, shot(restCentre.clone().add(V(0, 2, 2)), V(26, 24, -30))],
      [
        stepT('reach'),
        shot(
          restCentre
            .clone()
            .lerp(pc, 0.5)
            .add(V(0, 3, 4)),
          V(22, 18, -12),
        ),
      ],
      [stepT('lift'), shot(pc.clone().lerp(restCentre, 0.3), V(30, 9, 6))],
      [stepT('arrays'), shot(pc.clone(), V(9, 9, -27))],
    ];
    if (profile.anomaly === 'array-retry')
      shots.push([stepT('stuck'), shot(pc.clone().add(V(3, 0, 0)), V(12, 7, -15), 38)]);
    if (profile.anomaly === 'antenna-eva') {
      shots.push([stepT('shake'), shot(pc.clone(), V(9, 13, -11), 38)]);
      shots.push([stepT('lower'), shot(pc.clone().add(V(0, -2, 0)), V(11, 13, -12), 40)]);
      shots.push([stepT('raise'), shot(pc.clone(), V(12, 10, -24))]);
    }
    shots.push([stepT('release'), shot(pc.clone(), V(18, 7, -14))]);
    if (t >= stepT('separation')) {
      // beside the observatory, looking back at the orbiter as it backs away (it shrinks for real)
      const back = pc.clone().sub(oc).normalize();
      // on a phone the eye sits nearer the line of the two, so both stay inside the narrow frame
      const side = aspect < 1 ? 0.6 : 1;
      const eye = pc
        .clone()
        .addScaledVector(back, (aspect < 1 ? 22 : 16) * fit)
        .add(V(9 * side, 4 * side, 0));
      shots.push([
        stepT('separation'),
        { position: eye, look: oc.clone().lerp(pc, 0.35), fov: 36 },
      ]);
    }
    let i = shots.length - 1;
    while (i > 0 && t < shots[i][0]) i--;
    let cam = shots[i][1];
    if (i > 0) {
      const prev = shots[i - 1][1];
      const kk = smooth((t - shots[i][0]) / 1.8);
      cam = {
        position: prev.position.clone().lerp(cam.position, kk),
        look: prev.look.clone().lerp(cam.look, kk),
        fov: lerp(prev.fov, cam.fov, kk),
      };
    }
    camera.position.copy(cam.position);
    camera.fov = cam.fov;
    camera.aspect = aspect;
    camera.lookAt(cam.look);
    camera.updateProjectionMatrix();
    stars.position.copy(camera.position);
    return pose;
  };

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    earthTex?.dispose();
  };

  return {
    scene,
    camera,
    profile,
    keys,
    end,
    parts: { orbiter: orbiterHolder, payload: pay, tip: rig.tip },
    update,
    dispose,
  };
}
