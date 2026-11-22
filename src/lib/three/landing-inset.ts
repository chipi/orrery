/**
 * The /fly booster-landing inset (0.9.11 F2, operator 2026-11-22): at the flight's real landing
 * time a small view shows the recovered booster coming down on its engines — landing-burn plume,
 * legs out — onto a drone ship, a landing zone, or into the launch tower's arms, while the main
 * view stays with the upper stage. The pose is a pure function of mission time, so scrubbing is
 * exact. Lengths are in booster lengths (the part is scaled to 1).
 */
import * as THREE from 'three';
import { LANDING_HOLD_S, type PartRecovery } from '$lib/physics/ascent/ascent-physics';
import type { LightId } from '$lib/orbital/ascent-director';
import { buildLauncherModel } from './launcher-models';
import { plumeCone } from './engine-plume';

export type Landing = PartRecovery & { touchdownS: number; landingBurnS: number };

/** Seconds the inset opens before the landing burn, and stays after touchdown. */
export const INSET_LEAD_S = 8;
export const INSET_HOLD_S = LANDING_HOLD_S;
/** Legs swing out over these seconds, ending one second before touchdown. */
export const LEG_DEPLOY_S = 3;
/** The tower's arms close over the last seconds of a catch. */
export const CATCH_CLOSE_S = 1.5;
/** Height above the deck (booster lengths) when the landing burn lights. */
const H_BURN = 2.5;
/** A deployed leg swings this far from stowed (folded up the body) to down and out. */
const LEG_SWING_RAD = (150 * Math.PI) / 180;
/** Open arms stand this far off the closed line. */
const ARM_OPEN_RAD = (55 * Math.PI) / 180;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Where the inset fits: the free band between `ceiling` (the flight plan's bottom) and `floor`
 * (the play bar or the readouts), right-aligned, 7:5, at most `maxW` wide. Null when the band
 * is too short to show a booster (`MIN_H`).
 */
export const INSET_MIN_H = 90;
export function insetPlacement(
  ceiling: number,
  floor: number,
  maxW: number,
): { top: number; width: number; height: number } | null {
  const height = Math.min(floor - ceiling, (maxW * 5) / 7);
  if (height < INSET_MIN_H) return null;
  return { top: floor - height, width: (height * 7) / 5, height };
}

export function insetWindow(l: Landing): [number, number] {
  return [l.landingBurnS - INSET_LEAD_S, l.touchdownS + INSET_HOLD_S];
}

export interface LandingPose {
  visible: boolean;
  /** Booster base above the deck (or the catch line), in booster lengths. */
  height: number;
  burning: boolean;
  /** 0 stowed → 1 deployed. */
  legs: number;
  /** 0 open → 1 closed on the booster (a catch). */
  arms: number;
}

/**
 * Before the burn the booster falls at the speed the burn then takes out; through the burn it
 * decelerates evenly to rest at touchdown (height ∝ time-to-go²).
 */
export function landingPose(t: number, l: Landing): LandingPose {
  const [a, b] = insetWindow(l);
  const burn = Math.max(1, l.touchdownS - l.landingBurnS);
  let height: number;
  if (t >= l.touchdownS) height = 0;
  else if (t >= l.landingBurnS) height = H_BURN * ((l.touchdownS - t) / burn) ** 2;
  else height = H_BURN + (l.landingBurnS - t) * ((2 * H_BURN) / burn);
  const caught = l.outcome === 'caught';
  return {
    visible: t >= a && t <= b,
    height,
    burning: t >= l.landingBurnS && t < l.touchdownS,
    legs: caught ? 0 : clamp01((t - (l.touchdownS - 1 - LEG_DEPLOY_S)) / LEG_DEPLOY_S),
    arms: caught ? clamp01((t - (l.touchdownS - CATCH_CLOSE_S)) / CATCH_CLOSE_S) : 0,
  };
}

export interface LandingInset {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  landing: Landing;
  /** Pose the inset for mission time `t`; false while it is closed. */
  update: (t: number, aspect: number) => boolean;
  dispose: () => void;
}

/** A leg hinged at its foot: re-parented under a pivot there so it can swing out and down. */
function hingeLegs(part: THREE.Object3D): { pivot: THREE.Group; axis: THREE.Vector3 }[] {
  const legs: THREE.Mesh[] = [];
  part.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && typeof o.userData.landingLegAngle === 'number')
      legs.push(o as THREE.Mesh);
  });
  return legs.map((leg) => {
    const a = leg.userData.landingLegAngle as number;
    const h = (leg.geometry as THREE.BoxGeometry).parameters.height;
    const parent = leg.parent!;
    const pivot = new THREE.Group();
    pivot.position.set(leg.position.x, leg.position.y - h / 2, leg.position.z);
    parent.add(pivot);
    leg.position.set(0, h / 2, 0);
    pivot.add(leg);
    // up × outward: rotating +Y about it swings the leg's top out along its radial direction.
    return { pivot, axis: new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)) };
  });
}

/** A landing-burn flame for a body of radius `r` and length `len` (model units). */
function landingPlume(r: number, len: number): THREE.Group {
  const g = new THREE.Group();
  const outer = plumeCone(r * 2.6, len * 0.5, 0xff8a3d, 0.5);
  const inner = plumeCone(r * 1.3, len * 0.3, 0xffd27a, 0.8);
  outer.position.y = len * 0.25;
  inner.position.y = len * 0.15;
  g.add(outer, inner);
  g.rotation.z = Math.PI; // fire −Y, under the engines
  return g;
}

const mat = (color: number, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.1 });

/** The drone ship's deck and hull on a dark sea; the deck top is y = 0. */
function droneShip(): THREE.Group {
  const g = new THREE.Group();
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x10263a, 0.35));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.1;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.3), mat(0x3b4049));
  deck.position.y = -0.03;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.4), mat(0x23272e));
  hull.position.y = -0.12;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.34, 0.38, 48),
    new THREE.MeshBasicMaterial({ color: 0xe8ebef }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  g.add(sea, hull, deck, ring);
  return g;
}

/** A concrete landing pad with its ring, on flat scrub; y = 0 is the pad. */
function landingZone(): THREE.Group {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x3d4a35, 0.95));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.004;
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), mat(0xa9a59c, 0.9));
  pad.rotation.x = -Math.PI / 2;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.57, 48),
    new THREE.MeshBasicMaterial({ color: 0xe8ebef }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  g.add(ground, pad, ring);
  return g;
}

/** Height of the catch line (booster base when caught) above the ground, in booster lengths. */
const CATCH_BASE_Y = 0.2;

/** The launch tower and its two catch arms, hinged on the tower's face. */
function catchTower(): { group: THREE.Group; arms: THREE.Group[] } {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mat(0x4a463d, 0.95));
  ground.rotation.x = -Math.PI / 2;
  const steel = mat(0x2f343b, 0.6);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, 0.22), steel);
  tower.position.set(-0.42, 0.95, 0);
  g.add(ground, tower);
  const armY = CATCH_BASE_Y + 0.86;
  const arms = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    hinge.position.set(-0.31, armY, side * 0.09);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.04), steel);
    arm.position.x = 0.25;
    hinge.add(arm);
    hinge.userData.side = side;
    g.add(hinge);
    return hinge;
  });
  return { group: g, arms };
}

/** Booster part of `launcherId`'s model, base at the origin, scaled to 1 booster length. */
function boosterPart(launcherId: string, boosterCount: number, part: Landing['part']) {
  const model = buildLauncherModel(launcherId, 1, boosterCount);
  const src = part === 'strapOns' ? model.strapOns : model.booster;
  const keep = src ?? model.booster;
  keep.removeFromParent();
  // Free the rest of the rocket's geometry (materials may be shared builder caches: left alone).
  model.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  keep.position.set(0, 0, 0);
  keep.rotation.set(0, 0, 0);
  keep.scale.setScalar(1);
  keep.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(keep);
  const len = Math.max(1e-6, box.max.y - box.min.y);
  const holder = new THREE.Group();
  keep.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  holder.add(keep);
  holder.scale.setScalar(1 / len);
  // Engine positions for the plumes: each side booster, or the single core, at its base.
  const bodies = part === 'strapOns' && src ? [...src.children] : [keep];
  const rBody = (box.max.z - box.min.z) / 2;
  return { holder, keep, bodies, len, rBody };
}

/** Sky colour and light strength per the launch scene's light (landing is minutes later, at or
 *  near the same site, so the inset takes the launch's light). */
const SKY: Record<LightId, { sky: number; hemi: number; sun: number }> = {
  night: { sky: 0x0b1220, hemi: 0.9, sun: 0.5 },
  dusk: { sky: 0x3a3f5c, hemi: 1.2, sun: 0.9 },
  golden: { sky: 0x8fa3c2, hemi: 1.5, sun: 1.4 },
  midday: { sky: 0x86acd8, hemi: 1.7, sun: 1.6 },
};

export function createLandingInset(
  launcherId: string,
  boosterCount: number,
  landing: Landing,
  light: LightId = 'midday',
): LandingInset {
  const look = SKY[light];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(look.sky);
  scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x2a2620, look.hemi));
  const sun = new THREE.DirectionalLight(0xffffff, look.sun);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  const caught = landing.outcome === 'caught';
  let arms: THREE.Group[] = [];
  if (caught) {
    const t = catchTower();
    arms = t.arms;
    scene.add(t.group);
  } else scene.add(landing.site === 'droneship' ? droneShip() : landingZone());
  const baseY = caught ? CATCH_BASE_Y : 0;

  const { holder, keep, bodies, len, rBody } = boosterPart(launcherId, boosterCount, landing.part);
  scene.add(holder);
  const legs = hingeLegs(keep);
  // One plume under each body's engines, in the part's own (model) units.
  holder.updateMatrixWorld(true);
  const plumes = bodies.map((b) => {
    const bb = new THREE.Box3().setFromObject(b);
    const foot = keep.worldToLocal(
      new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2),
    );
    const p = landingPlume(rBody, len);
    p.position.copy(foot);
    keep.add(p);
    return p;
  });

  const camera = new THREE.PerspectiveCamera(35, 1.4, 0.01, 200);
  const q = new THREE.Quaternion();

  return {
    scene,
    camera,
    landing,
    update: (t, aspect) => {
      const pose = landingPose(t, landing);
      if (!pose.visible) return false;
      holder.position.y = baseY + pose.height;
      for (const { pivot, axis } of legs)
        pivot.quaternion.copy(q.setFromAxisAngle(axis, pose.legs * LEG_SWING_RAD));
      const flick = 0.85 + 0.15 * Math.sin(t * 47);
      for (const p of plumes) {
        p.visible = pose.burning;
        p.scale.set(1, flick, 1);
      }
      for (const arm of arms)
        arm.rotation.y = (arm.userData.side as number) * ARM_OPEN_RAD * (1 - pose.arms);
      // Follow the booster down; the deck comes into frame for the last seconds.
      const lookY = Math.max(baseY + 0.55, baseY + pose.height + 0.5);
      camera.position.set(0.35, lookY + 0.15, 3.4);
      camera.lookAt(0, lookY, 0);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      return true;
    },
    dispose: () => {
      scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    },
  };
}
