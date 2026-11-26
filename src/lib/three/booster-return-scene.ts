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
 *
 * Return to launch site (IM-1, docs/wip/2026-11-24-im1-rtls-sourced.md): sourced is the whole
 * timeline (entry burn 6:11-6:22, landing burn 7:17, touchdown 7:34; an aggregator citing The
 * Space Devs) and LZ-1 as an 86 m pad. The landing-burn engine count is an ESTIMATE (one centre
 * Merlin, as on the drone ship). The coast 2.5 km east, the scrub ground and the entry-burn altitudes
 * on the short 11 s burn are ESTIMATES.
 *
 * Falcon Heavy's first flight (docs/wip/2026-11-26-falcon-heavy-demo-sourced.md): the two side
 * boosters come home together, one to LZ-1 and one to LZ-2, 310 m north-west of it (Wikipedia
 * "Landing Zone 1"; both 86 m pads with the X). Sourced are the PLANNED press-kit entry burn
 * (6:41) and landing (7:58, one time for both, "nearly simultaneous"). The landing-burn start is
 * NOT FOUND and is an ESTIMATE (17 s, IM-1's sourced RTLS burn); so are the side boosters' nose
 * cones (falcon9-booster.ts), the second booster's wobble phase and the wide camera.
 *
 * Its centre core then misses the drone ship Of Course I Still Love You (`outcome: 'lost'`):
 * sourced that only one of its three landing engines lit, that it hit the water at about 500 km/h
 * (Musk; Space.com gives 484 km/h, both "300 mph") about 100 m from the ship, and that the impact
 * damaged two of the ship's thrusters. The planned landing time (8:19) stands for the impact. The
 * one engine's burn length, the deceleration, the splash and the camera are ESTIMATES; so is the
 * ship's place in the scene (the real one was far downrange; its distance is NOT FOUND).
 */
import * as THREE from 'three';
import {
  RETURN_HOLD_S,
  RETURN_LEAD_S,
  returnLauncherFor,
  returnWindow,
  type BoosterReturnLanding,
  type ReturnLauncher,
} from './booster-return-timing';
import type { LightId } from '$lib/orbital/ascent-director';
import { LEG_DEPLOY_S, SKY, landingPlume } from './landing-inset';
import { plumeCone } from './engine-plume';
import {
  FH_SIDE_BOOSTER_HEIGHT_M,
  buildFalcon9Booster,
  setFalcon9BoosterPose,
} from './showcase/falcon9-booster';
import { buildDroneShip, buildSeaPlane, DECK_WIDTH_M, FREEBOARD_M } from './showcase/drone-ship';
import { buildLandGround, buildLandingZone1 } from './showcase/landing-zone-1';
import {
  NEW_GLENN_BOOSTER_HEIGHT_M,
  buildNewGlennBooster,
  setNewGlennBoosterPose,
} from './showcase/new-glenn-booster';
import { buildJacklyn } from './showcase/jacklyn';
import { portraitFit } from './phone-framing';

export { RETURN_HOLD_S, RETURN_LEAD_S, returnLauncherFor, returnWindow };
export type { BoosterReturnLanding, ReturnLauncher };

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
}

const FALCON9_SPEC: ReturnSpec = {
  boosterH: 41.2,
  footDropM: 1.5,
  entryBurnLenS: 27,
  entryEngines: [0, 1, 5],
  landingEngine: 0,
  plumeR: 0.23,
  entryPlumeLen: 56,
  landingPlumeLen: 44,
  rcsN: 6,
};

export const RETURN_SPECS: Record<ReturnLauncher, ReturnSpec> = {
  'falcon-9': FALCON9_SPEC,
  // The side boosters are Falcon 9 first stages under a nose cone (ESTIMATE: its length).
  'falcon-heavy': { ...FALCON9_SPEC, boosterH: FH_SIDE_BOOSTER_HEIGHT_M },
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
  },
};

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
/** ESTIMATE: the Atlantic coast lies this far east of LZ-1 (m); the pad is really about this close. */
const COAST_M = 2500;
/** LZ-2 sits 310 m north-west of LZ-1 (sourced); north is -z, east +x. */
const LZ2_OFFSET = new THREE.Vector3(-310 / Math.SQRT2, 0, -310 / Math.SQRT2);
/** Sea level on the land scene, under the ground plane (m). */
const LAND_SEA_Y = -3;
/** ESTIMATE: mean descent speed through the entry burn (m/s), the drone-ship figures' mean. */
const ENTRY_MEAN_SPEED = (ENTRY_START_SPEED + ENTRY_END_SPEED) / 2;

/** Entry-burn cutoff (s): the sourced one when the flight has it, else the spec's estimated length. */
export function entryBurnEnd(
  l: BoosterReturnLanding,
  spec: ReturnSpec = RETURN_SPECS['falcon-9'],
): number {
  return l.entryBurnEndS ?? l.entryBurnS + spec.entryBurnLenS;
}

/** Altitude at cutoff: a sourced short burn sheds only what its length allows (ESTIMATE). */
function entryEndAlt(l: BoosterReturnLanding): number {
  return l.entryBurnEndS == null
    ? ENTRY_END_ALT_M
    : ENTRY_START_ALT_M - ENTRY_MEAN_SPEED * (l.entryBurnEndS - l.entryBurnS);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};

/** Booster base above the deck's footpad line (m): piecewise, continuous, ends at 0. */
export function returnAltitude(
  t: number,
  l: BoosterReturnLanding,
  spec: ReturnSpec = RETURN_SPECS['falcon-9'],
): number {
  const entryEnd = entryBurnEnd(l, spec);
  const entryLen = entryEnd - l.entryBurnS;
  const endAlt = entryEndAlt(l);
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
      (2 * s3 - 3 * s2 + 1) * endAlt +
      (s3 - 2 * s2 + s) * dt * -ENTRY_END_SPEED +
      (-2 * s3 + 3 * s2) * LANDING_BURN_ALT_M +
      (s3 - s2) * dt * v1
    );
  }
  if (t >= l.entryBurnS) {
    const s = (t - l.entryBurnS) / entryLen;
    return ENTRY_START_ALT_M + s * (endAlt - ENTRY_START_ALT_M);
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
  /** A second booster in the same frame wobbles and puffs out of step with the first. */
  phase = 0,
): BoosterReturnPose {
  const [a, b] = returnWindow(l);
  const entryEnd = entryBurnEnd(l, spec);
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
    rcs: Array.from({ length: spec.rcsN }, (_, i) => rcsWindow && rcsSlot(t, i + 11 * phase)),
    tiltX: 0.09 * calm * Math.sin(t * 1.3 + phase),
    tiltZ: 0.07 * calm * Math.sin(t * 0.9 + 1.1 + 2 * phase),
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
  const k = portraitFit(aspect) * sc;
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
  const camY = 5 + 0.04 * dd + 0.12 * Math.max(0, dd - 90);
  // Aim between the pad and the booster's top by angle, a little toward the pad so it clears the
  // HUD along the bottom; both stay in frame from 2 km up to touchdown.
  const reach = Math.hypot(0.42 * dd, 0.9 * dd);
  const aimAngle =
    0.45 * Math.atan2(h + spec.boosterH - camY, reach) + 0.55 * Math.atan2(-camY, reach);
  const lookY = Math.max(18 * sc, camY + reach * Math.tan(aimAngle));
  const deck: ReturnCamera = {
    pos: new THREE.Vector3(PAD_X - 0.42 * dd, camY, 0.9 * dd),
    look: new THREE.Vector3(PAD_X, lookY, 0),
  };
  // A short landing burn starts lower, so the cut waits until the booster is as low as on a 27 s burn.
  const burn = Math.max(1, l.touchdownS - l.landingBurnS);
  const shipIn = Math.min(SHIP_IN_S, (burn * (SHIP_IN_S + CUT_S)) / 27 - CUT_S);
  const s = smooth((t - (l.touchdownS - shipIn - CUT_S)) / CUT_S);
  return { pos: chase.pos.lerp(deck.pos, s), look: chase.look.lerp(deck.look, s) };
}

/** Where the twin-booster camera stands: south-west of the pads, looking north-east to the sea. */
const TWIN_MID = new THREE.Vector3(PAD_X, 0, 0).addScaledVector(LZ2_OFFSET, 0.5);
const TWIN_SIDE = new THREE.Vector3(-1, 0, 1).normalize();

/**
 * Falcon Heavy's pair: a wide view across both pads, far enough that the 310 m between them fits
 * the frame's width (with a margin) at any aspect; high with the boosters, then low over the
 * scrub as they come down, the Atlantic behind. `base` is the bell-exit height above the pads.
 */
export function twinReturnCamera(
  t: number,
  l: BoosterReturnLanding,
  base: number,
  aspect: number,
  spec: ReturnSpec = RETURN_SPECS['falcon-heavy'],
): ReturnCamera {
  const [t0] = returnWindow(l);
  const halfV = Math.tan(((35 / 2) * Math.PI) / 180);
  const halfH = halfV * aspect;
  // Wide frames see the pads side by side; a phone looks down the line of pads instead, one
  // booster behind the other, so neither shrinks to a speck to fit 310 m across a narrow frame.
  const line = LZ2_OFFSET.clone().normalize();
  const along = line.clone().negate().multiplyScalar(0.93).addScaledVector(TWIN_SIDE, 0.37);
  const w = clamp01((1.2 - aspect) / 0.5);
  // Slow drift round the pair, about 6 degrees over the scene, away from the line of pads.
  const side = TWIN_SIDE.clone()
    .lerp(along, w)
    .normalize()
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -(t - t0) * 0.0012);
  const lateral = LZ2_OFFSET.length() * Math.abs(side.x * line.z - side.z * line.x);
  const dFit = (lateral / 2 + 25) / halfH;
  const h = Math.max(0, base - spec.footDropM);
  const aim = h + spec.boosterH * 0.5;
  const high: ReturnCamera = {
    pos: TWIN_MID.clone()
      .addScaledVector(side, dFit * 1.05)
      .setY(aim + 0.12 * dFit),
    look: TWIN_MID.clone().setY(aim),
  };
  // Low: the pads near the bottom of the frame and room for the boosters' height above them.
  const dLow = Math.max(dFit, (h + spec.boosterH + 20) / halfV) * 1.05;
  const low: ReturnCamera = {
    pos: TWIN_MID.clone().addScaledVector(side, dLow).setY(14),
    look: TWIN_MID.clone().setY(Math.max(spec.boosterH * 0.55, (h + spec.boosterH) * 0.45)),
  };
  const burn = Math.max(1, l.touchdownS - l.landingBurnS);
  const shipIn = Math.min(SHIP_IN_S, (burn * (SHIP_IN_S + CUT_S)) / 27 - CUT_S);
  const s = smooth((t - (l.touchdownS - shipIn - CUT_S)) / CUT_S);
  return { pos: high.pos.lerp(low.pos, s), look: high.look.lerp(low.look, s) };
}

/** ESTIMATE: the lost core's segment opens this long before the impact (or as the pair's closes). */
const LOST_LEAD_S = 15;
const LOST_HOLD_S = 5;
/** Sourced: about 500 km/h at the water (Musk); m/s. */
export const LOST_IMPACT_SPEED = 500 / 3.6;
/** ESTIMATE: the one lit engine sheds speed at this rate (m/s^2) over the segment. */
const LOST_DECEL = 12;
/** Sourced: about 100 m from the ship. */
export const LOST_MISS_M = 100;

/** The lost core's window: right after the pair's (no cut back to the launch between them). */
export function lostWindow(
  lost: BoosterReturnLanding,
  pair: BoosterReturnLanding,
): [number, number] {
  return [
    Math.min(lost.touchdownS - LOST_LEAD_S, returnWindow(pair)[1]),
    lost.touchdownS + LOST_HOLD_S,
  ];
}

/** Bell-exit height above the sea for the lost core; 0 at the impact. */
export function lostAltitude(t: number, lost: BoosterReturnLanding): number {
  const dt = Math.max(0, lost.touchdownS - t);
  return LOST_IMPACT_SPEED * dt + 0.5 * LOST_DECEL * dt * dt;
}

export interface BoosterReturn {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  landing: BoosterReturnLanding;
  /** Pose for mission time `t`; false while the scene is closed. */
  update: (t: number, aspect: number) => boolean;
  /** Which part is playing at `t`: the landing (or pair), the lost centre core, or neither. */
  phaseAt: (t: number) => 'return' | 'lost' | null;
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
  /** Falcon Heavy's centre core, when it missed the drone ship (played after the side boosters). */
  lost?: BoosterReturnLanding,
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

  const twin = launcher === 'falcon-heavy';
  if (landing.site === 'landing-zone') {
    // Return to launch site: LZ-1 on the Cape, the Atlantic beyond a coast east of it.
    const lz = buildLandingZone1();
    lz.position.x = PAD_X;
    if (twin) {
      const lz2 = buildLandingZone1();
      lz2.name = 'landing-zone-2';
      lz2.position.set(PAD_X, 0, 0).add(LZ2_OFFSET);
      scene.add(lz2);
    }
    const ground = buildLandGround(2 * HORIZON_M);
    ground.position.x = COAST_M - HORIZON_M;
    // East of the coast only: overlapping planes would z-fight at range.
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(HORIZON_M, 2 * HORIZON_M),
      // Rougher where the lost core plays: up close beside the ship a 0.4 sea mirrors the sun white.
      new THREE.MeshStandardMaterial({
        color: 0x0c2a45,
        roughness: lost ? 0.85 : 0.4,
        metalness: 0.1,
      }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(COAST_M + HORIZON_M / 2, LAND_SEA_Y, 0);
    scene.add(lz, ground, ocean);
  } else {
    const ship = launcher === 'new-glenn' ? buildJacklyn() : buildDroneShip();
    const sea = buildSeaPlane(SEA_M);
    const farSea = new THREE.Mesh(
      new THREE.RingGeometry(SEA_M / 2, HORIZON_M, 48, 1),
      new THREE.MeshStandardMaterial({ color: 0x0c2a45, roughness: 0.4, metalness: 0.1 }),
    );
    farSea.rotation.x = -Math.PI / 2;
    farSea.position.y = -FREEBOARD_M - 1.5; // under the detailed plane's corners: no z-fight
    scene.add(ship, sea, farSea);
  }

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

  const pads = twin
    ? [new THREE.Vector3(PAD_X, 0, 0), new THREE.Vector3(PAD_X, 0, 0).add(LZ2_OFFSET)]
    : [new THREE.Vector3(PAD_X, 0, 0)];
  const boosters = pads.map((pad) => {
    const booster =
      launcher === 'new-glenn'
        ? buildNewGlennBooster()
        : buildFalcon9Booster({ sideBooster: twin });
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
    return { pad, booster, gimbal, entryPlumes, landingP, rcs };
  });

  const lostRig = lost ? buildLostCore(scene, lost, landing) : null;

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
    phaseAt: (t) =>
      boosterReturnPose(t, landing, spec).visible ? 'return' : lostRig?.on(t) ? 'lost' : null,
    update: (t, aspect) => {
      const pose = boosterReturnPose(t, landing, spec);
      let cam: ReturnCamera;
      if (pose.visible) {
        const flick = 0.85 + 0.15 * Math.sin(t * 47);
        boosters.forEach((b, k) => {
          const p = k ? boosterReturnPose(t, landing, spec, 1.9) : pose;
          (launcher === 'new-glenn' ? setNewGlennBoosterPose : setFalcon9BoosterPose)(b.booster, {
            fins: p.fins,
            legs: p.legs,
          });
          b.gimbal.position.set(b.pad.x, p.altM + BOOSTER_H / 2, b.pad.z);
          b.gimbal.rotation.set(p.tiltX, 0, p.tiltZ);
          b.entryPlumes.forEach((e) => {
            e.visible = p.entryPlumes > 0;
            e.scale.set(1, flick, 1);
          });
          b.landingP.visible = p.landingPlumes > 0;
          b.landingP.scale.set(1, flick, 1);
          b.rcs.forEach((r, i) => (r.visible = p.rcs[i]));
        });
        cam = twin
          ? twinReturnCamera(t, landing, pose.altM, aspect, spec)
          : returnCamera(t, landing, pose.altM, aspect, spec);
      } else if (lostRig?.on(t)) {
        cam = lostRig.update(t, aspect);
      } else return false;
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

/**
 * The lost centre core at sea: the drone ship far out on the ocean east of the Cape, the core
 * coming down on one engine and hitting the water beside the ship, a column of spray where it went
 * in. Its own camera: a chase on the core, then wide across the ship to the splash.
 */
function buildLostCore(scene: THREE.Scene, lost: BoosterReturnLanding, pair: BoosterReturnLanding) {
  const [w0, w1] = lostWindow(lost, pair);
  const shipAt = new THREE.Vector3(COAST_M + 150_000, LAND_SEA_Y + FREEBOARD_M, 0);
  const ship = buildDroneShip();
  ship.position.copy(shipAt);
  scene.add(ship); // on the scene's ocean plane, which meets the hull at its waterline
  const impact = new THREE.Vector3(shipAt.x, LAND_SEA_Y, shipAt.z + DECK_WIDTH_M / 2 + LOST_MISS_M);

  const core = buildFalcon9Booster();
  const H = RETURN_SPECS['falcon-9'].boosterH;
  core.position.y = -H / 2;
  const gimbal = new THREE.Group();
  gimbal.add(core);
  scene.add(gimbal);
  const plume = landingPlume(0.23, 44);
  core.getObjectByName('engine-0')!.add(plume);

  // Spray: a burst of white droplets thrown up and out on ballistic paths, and a foam ring, all
  // growing and fading after the impact (ESTIMATE: sizes, speeds, how long it hangs).
  const sprayM = new THREE.MeshBasicMaterial({
    color: 0xf4f6f8,
    transparent: true,
    depthWrite: false,
  });
  const DROPS = 90;
  const drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), sprayM, DROPS);
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const dropSpec = Array.from({ length: DROPS }, (_, i) => ({
    az: rnd(i, 1) * Math.PI * 2,
    el: ((55 + 33 * rnd(i, 2)) * Math.PI) / 180,
    v: 22 + 38 * rnd(i, 3),
    r: 0.8 + 1.8 * rnd(i, 4),
  }));
  const foamM = sprayM.clone();
  const foam = new THREE.Mesh(new THREE.RingGeometry(0.6, 1, 48), foamM);
  foam.rotation.x = -Math.PI / 2;
  foam.position.copy(impact).setY(LAND_SEA_Y + 0.4);
  scene.add(drops, foam);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const sc = new THREE.Vector3();
  function placeSpray(tau: number) {
    dropSpec.forEach((d, i) => {
      const r = d.v * Math.cos(d.el) * tau;
      const y = Math.max(0, d.v * Math.sin(d.el) * tau - 4.9 * tau * tau);
      v3.set(impact.x + Math.cos(d.az) * r, LAND_SEA_Y + y, impact.z + Math.sin(d.az) * r);
      sc.setScalar(d.r * (1 + 0.9 * tau));
      drops.setMatrixAt(i, m4.compose(v3, q, sc));
    });
    drops.instanceMatrix.needsUpdate = true;
  }

  const on = (t: number) => t >= w0 && t <= w1;
  const park = () => {
    gimbal.visible = drops.visible = foam.visible = false;
  };
  park();
  return {
    on,
    update(t: number, aspect: number): ReturnCamera {
      const T = lost.touchdownS;
      const alt = lostAltitude(t, lost);
      const down = t < T;
      gimbal.visible = down;
      gimbal.position.set(impact.x, LAND_SEA_Y + alt + H / 2, impact.z);
      const calm = clamp01((T - t) / 10);
      gimbal.rotation.set(0.05 * calm * Math.sin(t * 1.1), 0, 0.05 * calm * Math.sin(t * 0.8 + 1));
      setFalcon9BoosterPose(core, {
        fins: 1,
        legs: clamp01((t - (T - 1 - LEG_DEPLOY_S)) / LEG_DEPLOY_S),
      });
      plume.visible = down;
      plume.scale.set(1, 0.85 + 0.15 * Math.sin(t * 47), 1);
      const k = clamp01((t - T) / 1.6);
      const fade = 1 - clamp01((t - T - 1) / (LOST_HOLD_S - 1));
      drops.visible = foam.visible = t >= T;
      if (t >= T) placeSpray(t - T);
      foam.scale.setScalar(8 + 40 * k);
      sprayM.opacity = 0.85 * fade;
      foamM.opacity = 0.7 * fade;
      // Camera: a chase on the core high up, then wide across the ship to the impact point.
      const fit = portraitFit(aspect);
      const phi = 0.8 + (t - w0) * 0.02;
      const aim = LAND_SEA_Y + alt + H * 0.5;
      const chase: ReturnCamera = {
        pos: new THREE.Vector3(
          impact.x + Math.sin(phi) * 170 * fit,
          aim + 15,
          impact.z + Math.cos(phi) * 170 * fit,
        ),
        look: new THREE.Vector3(impact.x, aim, impact.z),
      };
      // Wide: from beyond the ship, far enough that the sea and the whole falling core share the
      // frame, dollying in as it drops (it covers ~140 m a second at the end).
      const span = Math.max(0, alt) + H + 30;
      const dist = Math.max(390 * fit, (span / (2 * Math.tan((17.5 * Math.PI) / 180))) * 1.15);
      const away = shipAt.clone().sub(impact).setY(0).normalize();
      const wide: ReturnCamera = {
        pos: impact
          .clone()
          .addScaledVector(away, dist)
          .add(new THREE.Vector3(0.18 * dist * Math.min(1, aspect), 0, 0))
          .setY(LAND_SEA_Y + 25 + 0.04 * dist),
        look: new THREE.Vector3(impact.x, LAND_SEA_Y + Math.max(30, span / 2), impact.z),
      };
      const s = smooth((t - (T - 10)) / 3);
      return { pos: chase.pos.lerp(wide.pos, s), look: chase.look.lerp(wide.look, s) };
    },
  };
}
