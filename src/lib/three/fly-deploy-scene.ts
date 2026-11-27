/**
 * The /fly Shuttle deploy scene (W10): the payload bay doors open, the IUS on its tilt table rises
 * to 29 deg for checkout and then to the deployment angle, the springs push it out, the table goes
 * back down, the orbiter fires its separation burn and backs away, and about an hour after release
 * the IUS fires its two stages (Ulysses: then spins up and fires the PAM-S). Full frame, in its own
 * scene, between the launch and the cruise; pose and camera are pure functions of scene time, so a
 * scrub is exact (the fly-return-scene.ts pattern).
 *
 * Time is COMPRESSED and the HUD says so: the real MET (`metAt`) is piecewise linear through the
 * profile's event times (deploy-profile.ts). Sourced (the post-flight mission reports): release,
 * the OMS-3 separation burn's time, length and delta-v (Galileo, Magellan), the first IUS ignition
 * (and Magellan's SRM-2). ESTIMATES (each profile's `estimatedFields`): the MET of the door opening
 * and the tilt steps (the HUD marks them "~"), Ulysses' RCS burn length and delta-v, the stage-2
 * and PAM-S ignition times, the burn lengths (press-kit plans), the separation burn's direction,
 * the stage and PAM-S separation speeds, the spin-up profile, the attitude of the orbiter over the
 * Earth and every camera move.
 *
 * Distances are real where the profile gives a speed: the stack drifts at the spring's 0.15 m/s
 * over the real seconds since release, and the orbiter backs away at the burn's delta-v. Frame:
 * world metres, the orbiter at rest with its nose toward +z and the bay open to +y; the Earth sits
 * below, drawn at 1/1000 of its size and distance (the same angle in the sky, inside the depth range).
 */
import * as THREE from 'three';
import type { DeployProfile } from '$lib/fly/deploy-profile';
import { plumeCone } from './engine-plume';
import { portraitFit } from './phone-framing';

const FT = 0.3048;
const NMI = 1852;
const EARTH_R_M = 6_371_000;
/** The Earth is drawn at this fraction of its size and distance. */
const EARTH_SCALE = 1 / 1000;

/** Scene seconds of each beat start. Compressed; the MET is in `metAt`. */
export const DT = {
  establish: 0,
  doors: 3,
  doorsEnd: 10,
  tilt: 11,
  tiltEnd: 14,
  deployAngle: 17,
  deployAngleEnd: 21,
  release: 23,
  separation: 31,
  separationEnd: 34,
  coast: 37,
  stage1: 46,
  stage1End: 51,
  stage2: 53,
  stage2End: 58,
  spin: 59,
  pamS: 64,
  pamSEnd: 68,
} as const;

export type DeployBeat =
  | 'establish'
  | 'doors'
  | 'tilt'
  | 'deployAngle'
  | 'release'
  | 'separation'
  | 'coast'
  | 'stage1'
  | 'stage2'
  | 'spin'
  | 'pamS';

/** Real seconds the scene shows before the profile's events: the door opening and the tilt steps
 *  are not in the reports (ESTIMATES), so their MET is marked "~" on the HUD. */
const DOORS_BEFORE_RELEASE_S = 4.75 * 3600;
const TILT_BEFORE_RELEASE_S = 1.7 * 3600;
const DEPLOY_ANGLE_BEFORE_RELEASE_S = 300;
/** The orbiter's RCS separation delta-v where the report prints none (STS-41): ESTIMATE. */
const DEFAULT_SEP_FTS = 1;
/** Stage 1 and the IUS stage 2 drift off after their separations: ESTIMATES. */
const STAGE_SEP_MS = 0.5;
const PAM_SEP_MS = 0.3;

export function deployEnd(p: Pick<DeployProfile, 'upperStage'>): number {
  return (p.upperStage.pamS ? DT.pamSEnd : DT.stage2End) + 3;
}

export function beatsFor(p: Pick<DeployProfile, 'upperStage'>): { id: DeployBeat; t: number }[] {
  const b: { id: DeployBeat; t: number }[] = [
    { id: 'establish', t: DT.establish },
    { id: 'doors', t: DT.doors },
    { id: 'tilt', t: DT.tilt },
    { id: 'deployAngle', t: DT.deployAngle },
    { id: 'release', t: DT.release },
    { id: 'separation', t: DT.separation },
    { id: 'coast', t: DT.coast },
    { id: 'stage1', t: DT.stage1 },
    { id: 'stage2', t: DT.stage2 },
  ];
  if (p.upperStage.pamS) b.push({ id: 'spin', t: DT.spin }, { id: 'pamS', t: DT.pamS });
  return b;
}

export function beatAt(t: number, p: Pick<DeployProfile, 'upperStage'>): DeployBeat {
  let id: DeployBeat = 'establish';
  for (const b of beatsFor(p)) if (t >= b.t) id = b.id;
  return id;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ramp = (t: number, t0: number, t1: number) => smooth((t - t0) / (t1 - t0));

function knots(p: DeployProfile): [number, number][] {
  const r = p.releaseS;
  const sep = p.sepBurnsS[0];
  const us = p.upperStage;
  const k: [number, number][] = [
    [DT.doors, r - DOORS_BEFORE_RELEASE_S],
    [DT.doorsEnd, r - DOORS_BEFORE_RELEASE_S + 300],
    [DT.tilt, r - TILT_BEFORE_RELEASE_S],
    [DT.tiltEnd, r - TILT_BEFORE_RELEASE_S + 120],
    [DT.deployAngle, r - DEPLOY_ANGLE_BEFORE_RELEASE_S],
    [DT.release, r],
    [DT.separation, sep],
    [DT.separationEnd, sep + p.sepBurns[0].burnS],
    [DT.stage1, p.stage1S],
    [DT.stage1End, p.stage1S + us.stage1.burnS],
    [DT.stage2, p.stage2S],
    [DT.stage2End, p.stage2S + us.stage2.burnS],
  ];
  if (us.pamS && p.pamSS !== undefined) {
    k.push([DT.pamS, p.pamSS], [DT.pamSEnd, p.pamSS + us.pamS.burnS]);
  }
  return k;
}

/** The real MET (s) shown on the HUD: piecewise linear through the profile's times. */
export function metAt(t: number, p: DeployProfile): number {
  const k = knots(p);
  if (t <= k[0][0]) return k[0][1] - (k[0][0] - t);
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, g0] = k[i - 1];
      const [t1, g1] = k[i];
      return lerp(g0, g1, (t - t0) / (t1 - t0));
    }
  }
  const [tl, gl] = k[k.length - 1];
  return gl + (t - tl);
}

/** True while the HUD clock is an estimate (before the release, the first sourced event). */
export const metIsEstimate = (t: number): boolean => t < DT.release;

export interface DeployPose {
  t: number;
  met: number;
  beat: DeployBeat;
  /** Bay doors, 0 closed to 1 open. */
  doors: number;
  /** The tilt table's angle (deg): it carries the stack until release, then goes down. */
  tableDeg: number;
  /** The stack's angle (deg): the table's until release, then held at the deployment angle. */
  stackDeg: number;
  released: boolean;
  /** How far the stack has moved out along its axis since release (m). */
  stackOutM: number;
  /** How far the orbiter has backed away since its separation burn (m). */
  orbiterBackM: number;
  /** Stage 1 moving off aft after its burn (m, along -axis). */
  stage1OffM: number;
  /** The PAM-S and the payload moving off the IUS stage 2 (m, along +axis). */
  pamOffM: number;
  spinRad: number;
  burn: 'sep' | 'stage1' | 'stage2' | 'pamS' | null;
  /** Seconds since the current burn's ignition (real), for the ignition flash. */
  burnAgeS: number;
}

function burnRun(met: number, ign: number, len: number): number | null {
  return met >= ign && met <= ign + len ? met - ign : null;
}

export function deployPose(t: number, p: DeployProfile): DeployPose {
  const met = metAt(t, p);
  const us = p.upperStage;
  const deployDeg = p.tilt[p.tilt.length - 1].deg;
  const checkDeg = p.tilt[0].deg;
  const released = t >= DT.release;
  const raise =
    t < DT.deployAngle
      ? checkDeg * ramp(t, DT.tilt, DT.tiltEnd)
      : lerp(checkDeg, deployDeg, ramp(t, DT.deployAngle, DT.deployAngleEnd));
  // After release the empty table is lowered (from about 5 s after release, real: ESTIMATE).
  const lowerK = clamp01((met - p.releaseS - 5) / 60);
  const tableDeg = released ? lerp(deployDeg, p.tableLowerDeg, smooth(lowerK)) : raise;
  const stackDeg = released ? deployDeg : raise;
  const stackOutM = released ? p.springMs * Math.max(0, met - p.releaseS) : 0;

  const sep = p.sepBurns[0];
  const sepS = p.sepBurnsS[0];
  const dv = (sep.dvFts ?? DEFAULT_SEP_FTS) * FT;
  const tau = met - sepS;
  const orbiterBackM =
    tau <= 0
      ? 0
      : tau < sep.burnS
        ? (0.5 * dv * tau * tau) / sep.burnS
        : dv * (tau - sep.burnS) + 0.5 * dv * sep.burnS;

  const s1End = p.stage1S + us.stage1.burnS;
  const stage1OffM = Math.max(0, met - s1End - 5) * STAGE_SEP_MS;
  let pamOffM = 0;
  let spinRad = 0;
  if (us.pamS && p.pamSS !== undefined) {
    const s2End = p.stage2S + us.stage2.burnS;
    const spin0 = s2End + 60;
    const spinUp = 60;
    const w = (us.pamS.spinRpm * 2 * Math.PI) / 60;
    const tt = met - spin0;
    // spin-up over a minute at constant acceleration, then a steady spin (ESTIMATE)
    if (tt > 0) spinRad = tt < spinUp ? (0.5 * w * tt * tt) / spinUp : w * (tt - spinUp / 2);
    pamOffM = Math.max(0, met - (p.pamSS - 60)) * PAM_SEP_MS;
  }

  let burn: DeployPose['burn'] = null;
  let burnAgeS = 0;
  const runs: [DeployPose['burn'], number | null][] = [
    ['sep', burnRun(met, sepS, sep.burnS)],
    ['stage1', burnRun(met, p.stage1S, us.stage1.burnS)],
    ['stage2', burnRun(met, p.stage2S, us.stage2.burnS)],
    ['pamS', us.pamS && p.pamSS !== undefined ? burnRun(met, p.pamSS, us.pamS.burnS) : null],
  ];
  for (const [id, age] of runs)
    if (age != null) {
      burn = id;
      burnAgeS = age;
    }

  return {
    t,
    met,
    beat: beatAt(t, p),
    doors: ramp(t, DT.doors, DT.doorsEnd),
    tableDeg,
    stackDeg,
    released,
    stackOutM,
    orbiterBackM,
    stage1OffM,
    pamOffM,
    spinRad,
    burn,
    burnAgeS,
  };
}

/** Where the scene's parts sit at rest (world metres), measured once from the built models. */
export interface DeployRig {
  /** The tilt table's pivot on the orbiter at rest. */
  pivot: THREE.Vector3;
  /** The orbiter's centre at rest. */
  orbiterCentre: THREE.Vector3;
  /** IUS length plus whatever rides on it (m). */
  stackLenM: number;
}

const DEFAULT_RIG: DeployRig = {
  pivot: new THREE.Vector3(0, 1.4, 8),
  orbiterCentre: new THREE.Vector3(0, 0, 19),
  stackLenM: 10,
};

/** The stack's axis in world space at angle `deg` (out of the bay toward +y, forward toward +z). */
export function stackAxis(deg: number): THREE.Vector3 {
  const a = (deg * Math.PI) / 180;
  return new THREE.Vector3(0, Math.sin(a), Math.cos(a));
}

/** The direction the orbiter backs away along: aft and a little down, clear of the stack's
 *  path (ESTIMATE; the reports give the burn's length and delta-v, not its direction). */
export function backAwayDir(): THREE.Vector3 {
  return new THREE.Vector3(0, -0.25, -1).normalize();
}

export function stackBase(pose: DeployPose, rig: DeployRig): THREE.Vector3 {
  return rig.pivot.clone().addScaledVector(stackAxis(pose.stackDeg), pose.stackOutM);
}

export function orbiterShift(pose: DeployPose): THREE.Vector3 {
  return backAwayDir().multiplyScalar(pose.orbiterBackM);
}

export interface DeployCamera {
  position: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

export function deployCamera(
  t: number,
  aspect: number,
  pose: DeployPose,
  p: DeployProfile,
  rig: DeployRig = DEFAULT_RIG,
): DeployCamera {
  const fit = portraitFit(aspect);
  const base = stackBase(pose, rig);
  const axis = stackAxis(pose.stackDeg);
  const stackMid = base.clone().addScaledVector(axis, rig.stackLenM / 2);
  const orb = rig.orbiterCentre.clone().add(orbiterShift(pose));
  const at = (look: THREE.Vector3, off: THREE.Vector3, fov = 40): DeployCamera => ({
    position: look.clone().addScaledVector(off, fit),
    look,
    fov,
  });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // Shots: establish over the wing, down into the bay, the tilt in profile, the release chase,
  // the orbiter backing away, then beside the stack for its burns.
  const shots: [number, DeployCamera][] = [
    [DT.establish, at(rig.orbiterCentre.clone(), V(34, 22, -26))],
    [DT.doors, at(rig.orbiterCentre.clone().add(V(0, 0, -3)), V(12, 30, -6))],
    [DT.tilt, at(rig.pivot.clone().add(V(0, 2.5, 3.5)), V(26, 6, 2))],
    [DT.release, at(stackMid.clone(), V(22, 8, -6))],
  ];
  if (t >= DT.separation) {
    // From beside the stack, looking back at the orbiter as it backs away (it shrinks for real).
    const back = stackMid.clone().sub(orb).normalize();
    const eye = stackMid
      .clone()
      .addScaledVector(back, 22 * fit)
      .add(V(12 * fit, 5 * fit, 0));
    shots.push([DT.separation, { position: eye, look: orb, fov: 34 }]);
  }
  if (t >= DT.coast) {
    // Beside the stack, low enough on it that the nozzle and its flame stay in frame.
    const look = (t >= DT.spin ? stackMid.clone().addScaledVector(axis, pose.pamOffM) : stackMid)
      .clone()
      .addScaledVector(axis, -rig.stackLenM * 0.2);
    shots.push([DT.coast, at(look, V(24, 6, -10))]);
  }
  // Hold each shot, then ease into the next over its first 1.6 s.
  let i = shots.length - 1;
  while (i > 0 && t < shots[i][0]) i--;
  const cur = shots[i][1];
  if (i === 0) return cur;
  const prev = shots[i - 1][1];
  const k = smooth((t - shots[i][0]) / 1.6);
  return {
    position: prev.position.clone().lerp(cur.position, k),
    look: prev.look.clone().lerp(cur.look, k),
    fov: lerp(prev.fov, cur.fov, k),
  };
}

export interface FlyDeployModels {
  /** buildOrbiterOpenable(): userData.setBayDoors, userData.bayMount. */
  orbiter: THREE.Group;
  /** buildIusStack({ payload, pamS }): userData.setTilt, stack, stage1, stage2, pamS, exits. */
  ius: THREE.Group;
}

export interface FlyDeployOptions {
  /** The Earth map (static/textures/2k_earth_daymap.jpg); a plain blue sphere without it. */
  earthTextureUrl?: string;
}

export interface FlyDeploy {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profile: DeployProfile;
  rig: DeployRig;
  end: number;
  /** The moving parts, for framing checks: the orbiter and the stack leaving it. */
  parts: { orbiter: THREE.Object3D; stack: THREE.Object3D };
  update: (t: number, aspect: number) => DeployPose;
  dispose: () => void;
}

function flame(r: number, len: number, hot: number, cool: number): THREE.Group {
  const g = new THREE.Group();
  for (const [rr, ll, c, o] of [
    [r, len, cool, 0.45],
    [r * 0.45, len * 0.55, hot, 0.85],
  ] as const) {
    const cone = plumeCone(rr, ll, c, o);
    cone.rotation.x = Math.PI; // apex at the nozzle, opening aft (-y)
    cone.position.y = -ll / 2;
    g.add(cone);
  }
  g.visible = false;
  return g;
}

/** The deploy scenes' sky: the Sun, the stars and the Earth below at 1/1000 scale for an orbit
 *  of `orbitNmi` (both deploy scenes share it). `stars` follows the camera. */
export function addDeployBackdrop(
  scene: THREE.Scene,
  orbitNmi: [number, number],
  earthTextureUrl?: string,
  /** The Earth's scale: the deploys stay within ~100 m of the origin; a docking spans a kilometre
   *  and needs the Earth farther below (the horizon's dip does not depend on the scale). */
  earthScale = EARTH_SCALE,
): { stars: THREE.Points; earthTex: THREE.Texture | null } {
  scene.background = new THREE.Color(0x000000);
  const sun = new THREE.DirectionalLight(0xfff6ea, 3.4);
  sun.position.set(60, 80, -40);
  scene.add(sun, new THREE.HemisphereLight(0x9fb4d8, 0x1d2430, 0.45));

  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = Math.imul(i + 1, 2654435761) >>> 0;
    const b = Math.imul(i + 7, 40503) >>> 0;
    const lon = (a / 4294967296) * Math.PI * 2;
    const y = (b / 4294967296) * 2 - 1;
    const rr = Math.sqrt(1 - y * y);
    sp.set([Math.cos(lon) * rr * 3e4, y * 3e4, Math.sin(lon) * rr * 3e4], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }),
  );
  stars.frustumCulled = false;
  scene.add(stars);

  const altM = ((orbitNmi[0] + orbitNmi[1]) / 2) * NMI;
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.9 });
  let earthTex: THREE.Texture | null = null;
  if (earthTextureUrl) {
    earthTex = new THREE.TextureLoader().load(earthTextureUrl, () => {
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    });
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthMat.map = earthTex;
  }
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R_M * earthScale, 96, 64), earthMat);
  earth.position.set(0, -(EARTH_R_M + altM) * earthScale, 0);
  earth.rotation.set(0.4, 1.2, 0);
  scene.add(earth);
  return { stars, earthTex };
}

export function createFlyDeploy(
  profile: DeployProfile,
  models: FlyDeployModels,
  opts: FlyDeployOptions = {},
): FlyDeploy {
  const scene = new THREE.Scene();
  const { stars, earthTex } = addDeployBackdrop(scene, profile.orbit.nmi, opts.earthTextureUrl);

  // The orbiter at rest: its authored frame has the nose on +y and the bay open to -z; turned so
  // the nose points +z and the bay opens to +y (away from the Earth).
  const orbiter = models.orbiter;
  const orbiterHolder = new THREE.Group();
  orbiter.rotation.x = Math.PI / 2;
  orbiterHolder.add(orbiter);
  scene.add(orbiterHolder);
  orbiterHolder.updateMatrixWorld(true);
  const mount = orbiter.userData.bayMount as THREE.Object3D;
  const pivot = mount.getWorldPosition(new THREE.Vector3());
  const box = new THREE.Box3().setFromObject(orbiter);
  const orbiterCentre = box.getCenter(new THREE.Vector3());

  // The IUS and its table: the table stays on the mount; the stack is moved to a holder in world
  // space, placed each frame from the pose.
  const ius = models.ius;
  mount.add(ius);
  const u = ius.userData as {
    setTilt: (d: number) => void;
    stack: THREE.Group;
    stage1: THREE.Group;
    stage2: THREE.Group;
    pamS?: THREE.Group;
    exits: { stage1: number; stage2: number; pamS?: number };
  };
  const stackHolder = new THREE.Group();
  scene.add(stackHolder);
  stackHolder.add(u.stack);
  const stackBox = new THREE.Box3().setFromObject(u.stack);
  const rig: DeployRig = {
    pivot,
    orbiterCentre,
    stackLenM: Math.max(1, stackBox.max.y - stackBox.min.y),
  };
  // The mount's frame in the world at rest (+y forward = world +z, -z out of the bay = world +y).
  const mountQ = mount.getWorldQuaternion(new THREE.Quaternion());

  const R = 1.41;
  const sepFlames: THREE.Group[] = [];
  const omsExit = new THREE.Vector3(1.75, 0.0, -2.35);
  for (const s of [-1, 1]) {
    if (profile.sepBurns[0].id !== 'oms3') break;
    const f = flame(0.4, 4, 0xe8eeff, 0x8fa8ff);
    f.position.set(s * omsExit.x, omsExit.y, omsExit.z);
    orbiter.children[0].add(f);
    sepFlames.push(f);
  }
  const s1Flame = flame(R * 0.3, 9, 0xfff0c8, 0xff9a4a);
  s1Flame.position.y = u.exits.stage1;
  u.stage1.add(s1Flame);
  const s2Flame = flame(R * 0.35, 7, 0xfff0c8, 0xff9a4a);
  s2Flame.position.y = u.exits.stage2;
  u.stage2.add(s2Flame);
  let pamFlame: THREE.Group | null = null;
  if (u.pamS && u.exits.pamS !== undefined) {
    pamFlame = flame(0.3, 5, 0xfff0c8, 0xff9a4a);
    pamFlame.position.y = u.exits.pamS;
    u.pamS.add(pamFlame);
  }
  const s2Nozzle = u.stage2.userData.nozzle as THREE.Object3D | undefined;
  const pamBaseY = u.pamS?.position.y ?? 0;

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 6e4);
  const setDoors = orbiter.userData.setBayDoors as (t: number) => void;
  // In orbit the gear is stowed.
  (orbiter.userData.setGear as ((t: number) => void) | undefined)?.(0);
  const end = deployEnd(profile);
  const q = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);

  const update = (tIn: number, aspect: number): DeployPose => {
    const t = Math.min(end, Math.max(0, tIn));
    const pose = deployPose(t, profile);
    setDoors(pose.doors);
    u.setTilt(pose.tableDeg);
    orbiterHolder.position.copy(orbiterShift(pose));
    // the stack: the mount's rest frame, turned up by its angle, moved out along its axis
    stackHolder.position.copy(stackBase(pose, rig));
    q.setFromAxisAngle(xAxis, -(pose.stackDeg * Math.PI) / 180);
    stackHolder.quaternion.copy(mountQ).multiply(q);
    u.stage1.position.y = -pose.stage1OffM;
    u.stage1.visible = pose.stage1OffM < 400;
    if (s2Nozzle) s2Nozzle.visible = pose.stage1OffM > 0.3;
    if (u.pamS) {
      u.pamS.position.y = pamBaseY + pose.pamOffM;
      u.pamS.rotation.y = pose.spinRad;
    }
    for (const f of sepFlames) f.visible = pose.burn === 'sep';
    s1Flame.visible = pose.burn === 'stage1';
    s2Flame.visible = pose.burn === 'stage2';
    if (pamFlame) pamFlame.visible = pose.burn === 'pamS';

    const cam = deployCamera(t, aspect, pose, profile, rig);
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
    rig,
    end,
    parts: { orbiter: orbiterHolder, stack: stackHolder },
    update,
    dispose,
  };
}
