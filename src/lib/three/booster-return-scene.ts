/**
 * The /fly full-frame booster return: a Falcon 9 first stage coming home to a drone ship (or New
 * Glenn's booster to Jacklyn), in real metres — entry burn on three engines, grid-fin steering with cold-gas RCS puffs, the landing burn
 * on the centre engine, legs out, standing on the X. The pose and the camera are pure functions of
 * mission time, so scrubbing is exact.
 *
 * Sourced (Inspiration4, docs/wip/2026-11-22-booster-recovery-sourced.md): entry burn start,
 * landing burn start, touchdown. ESTIMATED, not sourced: the entry-burn length, every altitude and
 * speed below, the RCS pattern, the attitude wobble and the camera work.
 *
 * New Glenn (ESCAPADE, docs/wip/2026-11-24-escapade-sourced.md): sourced is the entry burn on
 * three of the seven BE-4 (Space.com), "about seven minutes into flight", and touchdown on Jacklyn
 * "about nine minutes". The landing-burn engine count, the entry-burn length, the altitudes and
 * the camera work are ESTIMATES.
 */
import * as THREE from 'three';
import { LANDING_HOLD_S } from '$lib/physics/ascent/ascent-physics';
import type { LightId } from '$lib/orbital/ascent-director';
import { LEG_DEPLOY_S, SKY, landingPlume, type Landing } from './landing-inset';
import { plumeCone } from './engine-plume';
import { buildFalcon9Booster, setFalcon9BoosterPose } from './showcase/falcon9-booster';
import { buildDroneShip, buildSeaPlane, FREEBOARD_M } from './showcase/drone-ship';
import {
  NEW_GLENN_BOOSTER_HEIGHT_M,
  buildNewGlennBooster,
  setNewGlennBoosterPose,
} from './showcase/new-glenn-booster';
import { buildJacklyn } from './showcase/jacklyn';

export type ReturnLauncher = 'falcon-9' | 'new-glenn';

/** What differs between the booster return scenes; the altitude profile is shared. */
export interface ReturnSpec {
  boosterH: number;
  /** Footpads sit this far under the bell exits when the legs are out. */
  footDropM: number;
  entryBurnLenS: number;
  /** engine-<i> anchors lit in the entry burn. */
  entryEngines: number[];
  /** engine-<i> anchor lit in the landing burn. */
  landingEngine: number;
  plumeR: number;
  entryPlumeLen: number;
  landingPlumeLen: number;
  rcsN: number;
  /** Deck view: the camera looks this fraction of the way up the booster's top. */
  lookFrac: number;
}

export const RETURN_SPECS: Record<ReturnLauncher, ReturnSpec> = {
  'falcon-9': {
    boosterH: 41.2,
    footDropM: 1.5,
    entryBurnLenS: 27,
    entryEngines: [0, 1, 5],
    landingEngine: 0,
    plumeR: 0.23,
    entryPlumeLen: 56,
    landingPlumeLen: 44,
    rcsN: 6,
    lookFrac: 0.4,
  },
  'new-glenn': {
    boosterH: NEW_GLENN_BOOSTER_HEIGHT_M,
    footDropM: 2, // new-glenn-booster.ts: feet ~2 m below the bells
    // ESTIMATE: ~30 s, like DART's sourced Falcon burn.
    entryBurnLenS: 30,
    // SOURCED (Space.com): three of the seven BE-4 relit; which three is not (centre + two opposite).
    entryEngines: [0, 1, 4],
    // UNVERIFIED ESTIMATE: one centre BE-4 (a search snippet said "Single Engine Booster Landing Burn").
    landingEngine: 0,
    plumeR: 0.5,
    entryPlumeLen: 80,
    landingPlumeLen: 62,
    rcsN: 4,
    lookFrac: 0.44, // keeps the taller nose in frame
  },
};

/** The return scene for a launch profile, or null when it has none (the inset plays instead). */
export function returnLauncherFor(profileId: string): ReturnLauncher | null {
  return profileId === 'falcon-9' || profileId === 'new-glenn' ? profileId : null;
}

export type BoosterReturnLanding = Landing & { entryBurnS: number };

/** Seconds the scene opens before the entry burn. */
export const RETURN_LEAD_S = 8;
export const RETURN_HOLD_S = LANDING_HOLD_S;
/** ESTIMATE: the entry burn runs this long (DART's sourced burn was 30 s, Starlink 6-108's 26 s). */
export const ENTRY_BURN_LEN_S = RETURN_SPECS['falcon-9'].entryBurnLenS;
/** ESTIMATE: altitude at entry-burn start and end (m). */
export const ENTRY_START_ALT_M = 65_000;
export const ENTRY_END_ALT_M = 38_000;
/** ESTIMATE: speed at the entry-burn start and end (m/s, downward). */
const ENTRY_START_SPEED = 900;
const ENTRY_END_SPEED = 1000;
/** ESTIMATE: altitude where the landing burn lights (m); it then decelerates evenly to rest. */
export const LANDING_BURN_ALT_M = 3_400;
/** Footpads sit this far under the bell exits when the legs are out (falcon9-booster.ts LEG_*). */
export const FOOT_DROP_M = RETURN_SPECS['falcon-9'].footDropM;
/** The pad centre on the deck (drone-ship.ts padX). */
const PAD_X = 8;
/** ESTIMATE: the camera frames the deck with the booster over the last this-many seconds. */
const SHIP_IN_S = 15;
const CUT_S = 4;
/** Sea: a detailed 4 km plane and a plain ring out to the horizon. */
const SEA_M = 4000;
const HORIZON_M = 350_000;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

export function returnWindow(l: BoosterReturnLanding): [number, number] {
  return [l.entryBurnS - RETURN_LEAD_S, l.touchdownS + RETURN_HOLD_S];
}

/** Booster base above the deck's footpad line (m): piecewise, continuous, ends at 0. */
export function returnAltitude(
  t: number,
  l: BoosterReturnLanding,
  spec: ReturnSpec = RETURN_SPECS['falcon-9'],
): number {
  const entryLen = spec.entryBurnLenS;
  const entryEnd = l.entryBurnS + entryLen;
  const burn = Math.max(1, l.touchdownS - l.landingBurnS);
  if (t >= l.touchdownS) return 0;
  if (t >= l.landingBurnS) return LANDING_BURN_ALT_M * ((l.touchdownS - t) / burn) ** 2;
  if (t >= entryEnd) {
    // Cubic Hermite between the entry-burn end and the landing-burn start, slopes matched to both.
    const dt = l.landingBurnS - entryEnd;
    const s = (t - entryEnd) / dt;
    const v1 = (-2 * LANDING_BURN_ALT_M) / burn;
    const s2 = s * s;
    const s3 = s2 * s;
    return (
      (2 * s3 - 3 * s2 + 1) * ENTRY_END_ALT_M +
      (s3 - 2 * s2 + s) * dt * -ENTRY_END_SPEED +
      (-2 * s3 + 3 * s2) * LANDING_BURN_ALT_M +
      (s3 - s2) * dt * v1
    );
  }
  if (t >= l.entryBurnS) {
    const s = (t - l.entryBurnS) / entryLen;
    return ENTRY_START_ALT_M + s * (ENTRY_END_ALT_M - ENTRY_START_ALT_M);
  }
  return ENTRY_START_ALT_M + (l.entryBurnS - t) * ENTRY_START_SPEED;
}

export const RCS_COUNT = RETURN_SPECS['falcon-9'].rcsN;
/** Cold-gas puffs: short 0.3 s slots, a fixed pseudo-random ~25% of them lit. */
function rcsSlot(t: number, i: number): boolean {
  const slot = Math.floor(t / 0.3);
  const h = Math.imul(slot * 31 + i * 17 + 7, 2654435761) >>> 0;
  return (h >>> 8) % 100 < 25;
}

export interface BoosterReturnPose {
  visible: boolean;
  /** Booster base above the deck (m): the bell exits, footpads are FOOT_DROP_M lower when legs are out. */
  altM: number;
  /** Engines lit in the entry burn: 3 (centre + two opposite ring engines), else 0. */
  entryPlumes: number;
  /** Landing burn: the centre engine alone, 1, else 0. */
  landingPlumes: number;
  fins: number;
  legs: number;
  /** One flag per rcs-<i> nozzle. */
  rcs: boolean[];
  /** Lean from the grid-fin steering (rad); zero from 3 s before touchdown. */
  tiltX: number;
  tiltZ: number;
}

export function boosterReturnPose(
  t: number,
  l: BoosterReturnLanding,
  spec: ReturnSpec = RETURN_SPECS['falcon-9'],
): BoosterReturnPose {
  const [a, b] = returnWindow(l);
  const entryEnd = l.entryBurnS + spec.entryBurnLenS;
  const entryBurning = t >= l.entryBurnS && t < entryEnd;
  const landingBurning = t >= l.landingBurnS && t < l.touchdownS;
  const rcsWindow =
    (t >= entryEnd && t < l.landingBurnS) || (t >= l.entryBurnS - 6 && t < l.entryBurnS);
  const calm = clamp01((l.touchdownS - 3 - t) / 8);
  return {
    visible: t >= a && t <= b,
    altM: returnAltitude(t, l, spec) + spec.footDropM,
    entryPlumes: entryBurning ? spec.entryEngines.length : 0,
    landingPlumes: landingBurning ? 1 : 0,
    fins: 1,
    legs: clamp01((t - (l.touchdownS - 1 - LEG_DEPLOY_S)) / LEG_DEPLOY_S),
    rcs: Array.from({ length: spec.rcsN }, (_, i) => rcsWindow && rcsSlot(t, i)),
    tiltX: 0.09 * calm * Math.sin(t * 1.3),
    tiltZ: 0.07 * calm * Math.sin(t * 0.9 + 1.1),
  };
}

export interface ReturnCamera {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

/**
 * A chase cam a few booster lengths off while it is high; then a low, wide view across the deck
 * that dollies in as the booster comes down, so the ship and the booster both read, ending close on
 * the legs. `base` is the bell-exit height above the deck.
 */
export function returnCamera(
  t: number,
  l: BoosterReturnLanding,
  base: number,
  aspect: number,
  spec: ReturnSpec = RETURN_SPECS['falcon-9'],
): ReturnCamera {
  // Distances are tuned on the 41.2 m Falcon booster; a taller one backs the camera off in step.
  const sc = spec.boosterH / RETURN_SPECS['falcon-9'].boosterH;
  const k = (aspect < 1 ? 1 + 0.7 * (1 / aspect - 1) : 1) * sc;
  const [t0] = returnWindow(l);
  // Chase: 3/4 view, slowly orbiting, a little above the booster's middle.
  const phi = 0.6 + (t - t0) * 0.014;
  const dc = 150 * k;
  const aim = base + 6 * sc; // body above, flame below
  const chase: ReturnCamera = {
    pos: new THREE.Vector3(PAD_X + Math.sin(phi) * dc, aim + 12 * sc, Math.cos(phi) * dc),
    look: new THREE.Vector3(PAD_X, aim, 0),
  };
  // Deck: from the +z side, a little aft, low; distance grows with the height to frame both.
  const h = Math.max(0, base - spec.footDropM);
  const dd = Math.max(90 * sc, 2 * (h + 60 * sc)) * (k / sc);
  const deck: ReturnCamera = {
    pos: new THREE.Vector3(
      PAD_X - 0.42 * dd,
      5 + 0.04 * dd + 0.12 * Math.max(0, dd - 90),
      0.9 * dd,
    ),
    look: new THREE.Vector3(
      PAD_X,
      Math.max(18 * sc, spec.lookFrac * (h + spec.boosterH) + 6 * sc),
      0,
    ),
  };
  const s = smooth((t - (l.touchdownS - SHIP_IN_S - CUT_S)) / CUT_S);
  return { pos: chase.pos.lerp(deck.pos, s), look: chase.look.lerp(deck.look, s) };
}

export interface BoosterReturn {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  landing: BoosterReturnLanding;
  /** Pose for mission time `t`; false while the scene is closed. */
  update: (t: number, aspect: number) => boolean;
  dispose: () => void;
}

const SKY_DAY = {
  zenith: new THREE.Color(0x3f78c0),
  horizon: new THREE.Color(0xbcd4ec),
  spaceHorizon: new THREE.Color(0x24569c),
};
const SKY_VOID = new THREE.Color(0x01030a);

const DOME_W = 24;
const DOME_H = 64;

export function createBoosterReturn(
  landing: BoosterReturnLanding,
  light: LightId = 'midday',
  launcher: ReturnLauncher = 'falcon-9',
): BoosterReturn {
  const spec = RETURN_SPECS[launcher];
  const BOOSTER_H = spec.boosterH;
  const look = SKY[light];
  // Day colours dimmed for dusk and night.
  const bright = { night: 0.12, dusk: 0.5, golden: 0.85, midday: 1 }[light];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(look.sky);
  scene.fog = new THREE.Fog(0xbcd4ec, 30_000, 260_000);
  scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x2a2620, look.hemi));
  const sun = new THREE.DirectionalLight(0xffffff, look.sun);
  sun.position.set(-300, 500, 800);
  scene.add(sun);

  const ship = launcher === 'new-glenn' ? buildJacklyn() : buildDroneShip();
  const sea = buildSeaPlane(SEA_M);
  const farSea = new THREE.Mesh(
    new THREE.RingGeometry(SEA_M / 2, HORIZON_M, 48, 1),
    new THREE.MeshStandardMaterial({ color: 0x0c2a45, roughness: 0.4, metalness: 0.1 }),
  );
  farSea.rotation.x = -Math.PI / 2;
  farSea.position.y = -FREEBOARD_M - 1.5; // under the detailed plane's corners: no z-fight
  scene.add(ship, sea, farSea);

  // Sky dome following the camera: horizon band to zenith, blacker with altitude.
  const domeGeo = new THREE.SphereGeometry(HORIZON_M * 1.1, DOME_W, DOME_H);
  const colors = new Float32Array(domeGeo.attributes.position.count * 3);
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const dome = new THREE.Mesh(
    domeGeo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  dome.renderOrder = -1;
  scene.add(dome);

  const booster = launcher === 'new-glenn' ? buildNewGlennBooster() : buildFalcon9Booster();
  booster.position.y = -BOOSTER_H / 2;
  const gimbal = new THREE.Group();
  gimbal.add(booster);
  scene.add(gimbal);

  const anchor = (n: string) => booster.getObjectByName(n)!;
  const entryPlumes = spec.entryEngines.map((i) => {
    const p = landingPlume(spec.plumeR, spec.entryPlumeLen);
    anchor(`engine-${i}`).add(p);
    return p;
  });
  const landingP = landingPlume(spec.plumeR, spec.landingPlumeLen);
  anchor(`engine-${spec.landingEngine}`).add(landingP);

  // Cold gas: a white translucent cone from the nozzle along its +z.
  const rcs = Array.from({ length: spec.rcsN }, (_, i) => {
    const puff = plumeCone(0.32, 2.4, 0xffffff, 0.45, THREE.NormalBlending);
    puff.rotation.x = -Math.PI / 2; // tip at the nozzle, opening along +z
    puff.position.z = 1.2;
    anchor(`rcs-${i}`).add(puff);
    return puff;
  });

  const camera = new THREE.PerspectiveCamera(35, 1.6, 0.5, HORIZON_M * 2);
  const [skyAlt, skyH] = [new THREE.Color(), new THREE.Color()];
  const c = new THREE.Color();

  function paintSky(altM: number) {
    const k = clamp01(altM / 60_000);
    skyH.copy(SKY_DAY.horizon).lerp(SKY_DAY.spaceHorizon, k).multiplyScalar(bright);
    skyAlt
      .copy(SKY_DAY.zenith)
      .lerp(SKY_VOID, smooth(k * 1.4))
      .multiplyScalar(bright);
    // High up the blue thins to a band on the horizon (the limb) with black above it.
    const band = 1.6 + 40 * k * k;
    const pos = domeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / (HORIZON_M * 1.1);
      c.copy(skyH).lerp(skyAlt, clamp01(y * band));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    domeGeo.attributes.color.needsUpdate = true;
    (scene.fog as THREE.Fog).color.copy(skyH);
    (scene.background as THREE.Color).copy(skyH);
  }

  return {
    scene,
    camera,
    landing,
    update: (t, aspect) => {
      const pose = boosterReturnPose(t, landing, spec);
      if (!pose.visible) return false;
      (launcher === 'new-glenn' ? setNewGlennBoosterPose : setFalcon9BoosterPose)(booster, {
        fins: pose.fins,
        legs: pose.legs,
      });
      gimbal.position.set(PAD_X, pose.altM + BOOSTER_H / 2, 0);
      gimbal.rotation.set(pose.tiltX, 0, pose.tiltZ);
      const flick = 0.85 + 0.15 * Math.sin(t * 47);
      entryPlumes.forEach((p) => {
        p.visible = pose.entryPlumes > 0;
        p.scale.set(1, flick, 1);
      });
      landingP.visible = pose.landingPlumes > 0;
      landingP.scale.set(1, flick, 1);
      rcs.forEach((p, i) => (p.visible = pose.rcs[i]));
      const cam = returnCamera(t, landing, pose.altM, aspect, spec);
      camera.position.copy(cam.pos);
      camera.lookAt(cam.look);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      dome.position.copy(cam.pos);
      paintSky(camera.position.y);
      return true;
    },
    dispose: () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
    },
  };
}
