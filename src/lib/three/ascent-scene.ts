/**
 * Scene 0 — the /fly launch/ascent render (RFC-034 · epic #412).
 * Consumes the headless ascent trajectory (integrateAscent) and stages
 * a launch-site-local Three.js scene: a curved lit Earth (textured, with
 * a night side) that recedes, pad + tower, a multi-stage vehicle that
 * pitches along its velocity and drops stages, an engine plume, a sun +
 * glow, and a star field. Kilometre scene units — Earth centred a full
 * radius below the pad so the launch site sits at the origin and every
 * vehicle-scale coordinate stays small (float-precision-safe), the "own
 * frame" of RFC-034 L-A.
 *
 * Mounted by LaunchScene in /fly (the sole launch/ascent implementation).
 * The vehicle is a stylised procedural placeholder at an exaggerated scale
 * so it reads against Earth curvature — per-vehicle accurate GLBs land at S11.
 */

import * as THREE from 'three';
import { BoldArrow } from './bold-arrow';
import { SeparationBurst } from './separation-burst';
import {
  bodyAngleFromVerticalRad,
  gravity,
  type AscentEvent,
  type AscentState,
} from '$lib/physics/ascent/ascent-physics';
import {
  activeShotAt,
  composeShot,
  sepProgress,
  PAYLOAD_SEP_HOLD_S,
  type AscentCameraTuning,
  type AscentShotName,
  type ShotWindow,
} from '$lib/orbital/ascent-cameras';
import { buildInterplanetarySpacecraft } from '$lib/three/interplanetary-spacecraft-models';
import { buildCapsuleById } from '$lib/three/capsule-models';
import { buildLanderCruiseCraft } from '$lib/three/lander-cruise-models';
import { flyCraft } from '$lib/three/fly-craft';
import { getEarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';
import { buildLauncherModel } from '$lib/three/launcher-models';
import { clusterOffsets } from '$lib/three/launcher-detail';
import { getLauncherEngines } from '$lib/physics/propulsion/launcher-engines';
import {
  buildLaunchGround,
  type LaunchGround,
  type LaunchGroundSite,
} from '$lib/three/launch-ground';
import type { FlightPhaseScene, ForceKey } from '$lib/three/flight-phase-scene';

const R_EARTH_KM = 6371;

export interface AscentSceneOptions {
  aspect: number;
  /** Earth day/night + sun textures (from `${base}/textures/...`). Optional; falls back to flat colour. */
  earthDayUrl?: string;
  earthNightUrl?: string;
  /** Cloud texture URL; if omitted a procedural cloud layer is generated. */
  cloudUrl?: string;
  /** Launch-site coordinates — orients the globe so the real geography sits under the pad. */
  launchSite?: { lat: number; lon: number };
  /** Exaggeration for the vehicle length (km). Real F9 ≈ 0.07; default 1.2 to read. */
  vehicleLengthKm?: number;
  /** Camera shot schedule (from buildShotSchedule). Falls back to a single tracking shot. */
  schedule?: ShotWindow[];
  /** Live per-shot camera tuning (mutated by the camera-debug sliders); read by reference each frame. */
  tuning?: AscentCameraTuning;
  /** Ascent beats — drives scrub-safe stage/fairing/payload separation timing. */
  events?: AscentEvent[];
  /** Mission id → the payload's dedicated spacecraft model (else a generic bus). */
  spacecraftId?: string;
  /** The launcher's real height (fleet specs.height_m): a showcase craft is drawn to true
   *  scale against it. */
  launcherHeightM?: number;
  /** Launcher id → the rocket's dedicated procedural model (else a generic body). */
  launcherId?: string;
  /** Strap-on booster count (Atlas V's variable AJ-60A count) — drawn on the
   *  generic body + jettisoned at strap-on burnout. 0 / omitted = none. */
  boosterCount?: number;
  /** How many of the strap-ons are air-lit (LaunchBoosters.airLitCount): they light when the
   *  ground-lit ones burn out and separate at their own burnout. */
  boosterAirLitCount?: number;
  /** When the spacecraft leaves the upper stage, if not at SECO: on a flight with an
   *  injection burn it rides the stage through the burn and separates at its end, as on a
   *  real flight. The scene's clock (s.t) runs past the last physics state for this. */
  payloadSepT?: number;
  /** A kick stage carrying the spacecraft fires once the spacecraft has left the launcher
   *  (payloadSepT): for the whole burn when it is deployed first (Shuttle + IUS), for the
   *  second part when the last stage fires first (Delta II + Star 48B). */
  kickStage?: boolean;
  /** When the injection burn ends: the spent kick motor drops away from the spacecraft. */
  injectionBurnEndT?: number;
  /** Override the texture longitude offset (deg) for calibration; default −90. */
  lonTextureOffsetDeg?: number;
  /** Spin the globe about the pad-vertical so a green coastline faces downrange. */
  siteYawDeg?: number;
  /** Real cloudless satellite crop of the launch complex, laid as a ground patch (S8). */
  groundSite?: LaunchGroundSite;
}

/** Texture-seam longitude offset (deg) tuned so a site's real coastline lands under the pad. */
// Equirectangular daymap (Greenwich at the texture centre). With the corrected
// site-normal z sign, no longitude offset is needed — each site's real
// geography sits under the pad (Cape → Florida, Baikonur → the Kazakh steppe).
const LON_TEXTURE_OFFSET_DEG = 0;

/** Default globe spin (deg) about the pad-vertical: frame land, not open ocean. */
const DEFAULT_SITE_YAW_DEG = 0;

export interface AscentScene extends FlightPhaseScene<AscentState> {
  /** The camera shot active at the last setState() — for the HUD. */
  readonly activeShot: AscentShotName;
  /** Re-light the plume on the upper stage for the post-SECO injection burn
   *  (RFC-034 §3.1). Driven by the clock (not the clamped physics state, which
   *  freezes at SECO). */
  setInjectionBurn(on: boolean): void;
}

/** Rendered vehicle length (km, world units) — the single source for the scene
 *  default + the HUD/camera-debug callers that used to each hard-code 1.2. */
export const VEHICLE_LENGTH_KM = 1.2;

/** Science-Lens force-vector palette (matches the HUD legend). */
export const FORCE_COLORS = {
  thrust: 0x54e08a,
  weight: 0xff5a5a,
  drag: 0x5aa0ff,
  velocity: 0x7fe0ff,
} as const;

/** Generic payload for the ~110 missions without a dedicated model — a small
 *  bus with two solar wings and a dish. The wings ride on HINGE groups so the
 *  scene can fold them against the bus during ascent and swing them out at
 *  separation (`deployPayload`). Normalised to fit by buildPayload. */
export function buildGenericPayload(): THREE.Group {
  const g = new THREE.Group();
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.7, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xcfd6dd, roughness: 0.5, metalness: 0.45 }),
  );
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1f3a72,
    roughness: 0.4,
    metalness: 0.3,
  });
  const panelGeo = new THREE.BoxGeometry(1.0, 0.03, 0.55);
  // Each wing hangs off a hinge at the bus edge; the panel extends outward from
  // the hinge. Deployed = flat (rotZ 0); stowed = folded up flat along the body
  // (rotZ ≈ ∓90°). `deployPayload` lerps rotZ over the sep window.
  const wing = (side: 1 | -1): THREE.Group => {
    const hinge = new THREE.Group();
    hinge.position.x = side * 0.28;
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.x = side * 0.5; // extends outward from the hinge
    hinge.add(panel);
    hinge.userData.deploy = { closed: side * (Math.PI / 2), open: 0 };
    return hinge;
  };
  // High-gain antenna on a boom hinged at the bus top: stowed folded down against
  // the body (rotZ ≈ +112°), swings upright as it deploys (rotZ 0) — same lerp as
  // the wings so `deployPayload` opens it in the same beat.
  const antenna = new THREE.Group();
  antenna.position.set(0.14, 0.36, 0);
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.6, metalness: 0.4 }),
  );
  boom.position.y = 0.17;
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.6, side: THREE.DoubleSide }),
  );
  dish.position.y = 0.36; // sits at the boom tip
  dish.rotation.x = Math.PI; // concave face outward
  antenna.add(boom, dish);
  antenna.userData.deploy = { closed: Math.PI * 0.62, open: 0 };
  g.add(bus, wing(-1), wing(1), antenna);
  return g;
}

/** A single compact "stowed payload" shroud shown while the payload is still
 *  ATTACHED (fairing gone → separation) — represents the folded spacecraft on
 *  its adapter, the way it really rides under the fairing. One shape for every
 *  mission (operator decision 2026-07-29); the real deployed model appears +
 *  unfolds at separation. Normalised like buildPayload so it fits the fairing. */
function buildStowedPayload(vehLen: number, maxRadius?: number): THREE.Group {
  const body = new THREE.MeshStandardMaterial({ color: 0xd7dde3, roughness: 0.5, metalness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb8912f, roughness: 0.45, metalness: 0.7 });
  const g = new THREE.Group();
  // It rode inside the fairing, so it is never wider than the stage it sits on (the drum +
  // its panels span ~1.24 w; an SLS ICPS is far narrower than vehLen × 0.11).
  const w = Math.min(vehLen * 0.11, maxRadius ? (maxRadius * 2 * 0.95) / 1.24 : Infinity);
  // Compact drum body (the folded spacecraft) + tucked panels flat against it.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.5, w * 1.3, 20), body);
  drum.position.y = w * 0.75;
  const capMat = gold;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.5, w * 0.6, 20), body);
  cap.position.y = w * 1.7;
  // Folded panel slabs hugging the drum (thin, vertical, against the sides).
  for (const s of [1, -1]) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.04, w * 1.1, w * 0.7), capMat);
    slab.position.set(s * w * 0.52, w * 0.75, 0);
    g.add(slab);
  }
  // Payload adapter cone tapering down to the upper-stage forward dome.
  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.5, w * 0.62, w * 0.4, 20), body);
  adapter.position.y = w * 0.02;
  g.add(drum, cap, adapter);
  return g;
}

/** Drive a payload's deployment: `dp` 0 → 1 folds its hinged wings out and blooms
 *  it to full scale. Any child tagged `userData.deploy = {closed, open}` lerps
 *  its Z rotation; the whole holder scales 0.82 → 1 so even the static dedicated
 *  models get a "spring to life" beat as they separate. No-op past dp = 1. */
export function deployPayload(holder: THREE.Group, dp: number): void {
  const k = Math.min(1, Math.max(0, dp));
  holder.traverse((o) => {
    const d = o.userData?.deploy as { closed: number; open: number } | undefined;
    if (d) o.rotation.z = d.closed + (d.open - d.closed) * k;
  });
  const s = 0.82 + 0.18 * k;
  holder.scale.setScalar(holder.userData.baseScale ? holder.userData.baseScale * s : s);
}

/** The payload group: the mission's dedicated spacecraft model when one exists
 *  — an interplanetary probe (buildInterplanetarySpacecraft) or, for crewed
 *  flights, the bespoke re-entry capsule (buildCapsuleById via the earth-orbit
 *  registry) — else the generic bus. Normalised so its largest dimension ≈ the
 *  fairing interior and re-centred on the body axis. Capsules are tagged
 *  `userData.isCapsule` so the ascent scene rides them exposed (no fairing/
 *  shroud/solar-deploy) — see the payload branch in setState. */
export function buildPayload(
  spacecraftId: string | undefined,
  vehLen: number,
  bodyRadius?: number,
  launcherHeightM?: number,
  stageTopRadius?: number,
): THREE.Group {
  const probe = spacecraftId ? buildInterplanetarySpacecraft(spacecraftId) : null;
  // The /fleet showcase craft (preloaded by /fly) — the full CSM, Soyuz, Dragon, X-37B or probe.
  const craft = probe ? null : flyCraft(spacecraftId);
  const capsuleId =
    !probe && spacecraftId ? getEarthOrbitCoast(spacecraftId)?.capsuleId : undefined;
  // Artemis flights ride Orion (crew module + service module + wings): the cruise model, not
  // the generic bus every SLS flight showed before.
  const orion =
    !probe && !craft && !capsuleId && spacecraftId && ORION_MISSIONS.test(spacecraftId)
      ? buildLanderCruiseCraft('artemis4')
      : null;
  // Landers and Moon craft ride their cruise model (else they showed the generic bus).
  const cruise =
    !probe && !craft && !capsuleId && !orion && spacecraftId
      ? buildLanderCruiseCraft(spacecraftId)
      : null;
  const model =
    probe ??
    craft ??
    (capsuleId ? buildCapsuleById(capsuleId) : null) ??
    orion ??
    cruise ??
    buildGenericPayload();
  // Orion's four array wings (the box meshes) ride folded and open in Earth orbit.
  if (orion) {
    for (const c of orion.children) {
      const geo = (c as THREE.Mesh).geometry;
      if (geo instanceof THREE.BoxGeometry) c.userData.wing = { x: c.position.x, z: c.position.z };
    }
  }
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  // A capsule mates to the top of the stage, so its base diameter is at most the
  // launcher body diameter (real capsules equal it or taper narrower via an
  // adapter — never WIDER). Scale a capsule by its WIDTH against the body radius,
  // not its largest dimension, so it can never end up fatter than the rocket
  // (the Gemini-wider-than-Titan bug). Satellites still normalise to the fairing.
  // A showcase craft gives its body diameter (its arrays and wings would read as width).
  const capsuleWidth =
    (craft?.userData.bodyDiameterM as number | undefined) ?? Math.max(size.x, size.z);
  const k =
    craft && launcherHeightM && launcherHeightM > 0
      ? vehLen / launcherHeightM // metres → scene units: true scale against the rocket
      : capsuleId && bodyRadius && bodyRadius > 0
        ? (bodyRadius * 2 * 0.92) / (capsuleWidth || 1)
        : (vehLen * 0.19) / (Math.max(size.x, size.y, size.z) || 1);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.scale.setScalar(k);
  model.position.copy(center.multiplyScalar(-k));
  // A capsule rides heat-shield-down ON the stage: seat its base at the mount
  // rather than centre-mounting it like a satellite (else it sinks into the stage).
  if (capsuleId) model.position.y += (size.y * k) / 2;
  const holder = new THREE.Group();
  holder.add(model);
  // A true-scale craft narrower than its stage rides on a tapered adapter (Saturn's SLA,
  // ~3 × the radius step tall), not perched on the flat stage top.
  const craftR = ((craft?.userData.bodyDiameterM as number | undefined) ?? 0) * k * 0.5;
  const topR = stageTopRadius ?? bodyRadius ?? 0;
  if (craft && capsuleId && launcherHeightM && craftR > 0 && craftR < topR * 0.9) {
    const taperH = (topR - craftR) * 6;
    const taper = new THREE.Mesh(
      new THREE.CylinderGeometry(craftR, topR, taperH, 32, 1, false),
      new THREE.MeshStandardMaterial({ color: 0xe8e6df, roughness: 0.55, metalness: 0.15 }),
    );
    taper.position.y = taperH / 2;
    // Seat the full-width body (the SM, not its engine bell) on the taper top: the adapter
    // encloses whatever hangs below it, as the SLA did.
    const diaM = craft.userData.bodyDiameterM as number;
    let bodyBaseM = Infinity;
    craft.updateMatrixWorld(true);
    const rootInv = craft.matrixWorld.clone().invert();
    craft.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const b = new THREE.Box3().setFromObject(o).applyMatrix4(rootInv);
      if (Math.max(b.max.x - b.min.x, b.max.z - b.min.z) >= diaM * 0.85)
        bodyBaseM = Math.min(bodyBaseM, b.min.y);
    });
    const baseOffset = Number.isFinite(bodyBaseM) ? bodyBaseM * k : 0;
    model.position.y += taperH - baseOffset;
    holder.add(taper);
  }
  // Apollo CSMs fly under the launch escape tower (~10 m, a 0.66 m motor on a truss), jettisoned
  // early in the ascent with the boost protective cover.
  if (craft && launcherHeightM && spacecraftId && APOLLO_CSM_MISSIONS.has(spacecraftId)) {
    const top = new THREE.Box3().setFromObject(holder).max.y;
    const les = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xe9e7e1, roughness: 0.5 });
    const red = new THREE.MeshStandardMaterial({ color: 0x9c2a22, roughness: 0.6 });
    const m = k; // metres → scene units
    const truss = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33 * m, 0.95 * m, 3 * m, 4, 1, true),
      red,
    );
    truss.position.y = 1.5 * m;
    truss.rotation.y = Math.PI / 4;
    const motor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33 * m, 0.33 * m, 4.7 * m, 20),
      white,
    );
    motor.position.y = 5.35 * m;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.33 * m, 1.6 * m, 20), white);
    nose.position.y = 8.5 * m;
    const canard = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * m, 0.06 * m, 0.6 * m, 8), red);
    canard.position.y = 9.6 * m;
    les.add(truss, motor, nose, canard);
    les.position.y = top - 0.4 * m;
    holder.add(les);
    holder.userData.les = les;
  }
  // Orion flies under the launch-abort tower and panels, not a payload fairing: once they
  // jettison it rides in the open, so the scene shows it rather than a stowed shroud.
  if (orion) holder.userData.exposedAfterFairing = true;
  if (capsuleId) {
    holder.userData.isCapsule = true;
    // Soviet/Chinese capsules flew under an aerodynamic nose fairing that
    // jettisoned once past the atmosphere (Vostok's shroud dropped at ~T+2:34) —
    // they did NOT ride a bare capsule exposed the way Mercury/Gemini/Apollo/
    // Dragon did. Tag them so the scene rides them under a shroud, then exposes
    // the capsule after jettison.
    if (FAIRED_CAPSULES.has(capsuleId)) holder.userData.fairedCapsule = true;
  }
  return holder;
}

/** Missions whose payload is a full Apollo CSM (with its launch escape tower). */
const APOLLO_CSM_MISSIONS = new Set([
  'apollo7',
  'apollo9',
  'skylab-2',
  'skylab-3',
  'skylab-4',
  'apollo-soyuz',
]);

/** Missions whose payload is Orion. */
const ORION_MISSIONS = /^artemis\d+$/;

/** Open a payload's tagged array wings (`userData.wing`) by k: 0 folded against the body,
 *  1 fully out. */
export function setWingDeploy(holder: THREE.Object3D, k: number): void {
  const f = Math.min(1, Math.max(0, k));
  holder.traverse((o) => {
    const w = o.userData?.wing as { x: number; z: number } | undefined;
    if (!w) return;
    o.visible = f > 0.02;
    o.scale.setScalar(Math.max(0.02, f));
    o.position.x = w.x * (0.45 + 0.55 * f);
    o.position.z = w.z * (0.45 + 0.55 * f);
  });
}

/** Capsules that ascended under a jettisonable nose fairing (not exposed). */
export const FAIRED_CAPSULES = new Set(['vostok', 'voskhod', 'soyuz', 'shenzhou']);

export function createAscentScene(opts: AscentSceneOptions): AscentScene {
  const vehLen = opts.vehicleLengthKm ?? VEHICLE_LENGTH_KM;
  const scene = new THREE.Scene();
  // Sky colour is altitude-driven in setState: daylight blue on the pad →
  // deep black by ~70 km, the signature "blue sky to space" of an ascent.
  const SKY_GROUND = new THREE.Color('#5b8fc9');
  const SKY_SPACE = new THREE.Color('#03040a');
  scene.background = SKY_GROUND.clone();

  const camera = new THREE.PerspectiveCamera(46, opts.aspect, 0.01, 120_000);

  // ── Lighting: a hard warm sun toward the camera-facing hemisphere so
  //    the visible Earth is lit (not the night side), plus a cool fill so
  //    the shadowed limb never crushes to black.
  // Lighting copied from the proven /fly cislunar Earth (which uses the same
  // textures and looks right): bright white ambient + a warm directional, both
  // × Math.PI to restore the r128 look under three r155+ physical lights (#203).
  // The dark, un-×π ambient here before was what crushed the Earth to black.
  const sunDir = new THREE.Vector3(0.32, 0.5, 0.8).normalize();
  const sun = new THREE.DirectionalLight(0xfff4d0, 1.6 * Math.PI);
  sun.position.copy(sunDir).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xeeeeff, 0.7 * Math.PI));

  const texLoader = new THREE.TextureLoader();
  const loadColor = (url?: string): THREE.Texture | null => {
    if (!url) return null;
    const t = texLoader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const dayTex = loadColor(opts.earthDayUrl);
  const nightTex = loadColor(opts.earthNightUrl);

  // ── Earth: a big sphere a full radius below the pad (surface at y=0),
  //    rotated so the EQUATOR — not the smeared texture pole — sits under
  //    the launch site. Longitude tuned to frame a coastline.
  // Material copied from the cislunar Earth — plain lit map, no emissive hacks.
  const earthMat = new THREE.MeshStandardMaterial({
    map: dayTex ?? null,
    color: dayTex ? 0xffffff : 0x2a5a8c,
    roughness: 0.6,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH_KM, 128, 128), earthMat);
  earth.position.set(0, -R_EARTH_KM, 0);
  // Orient the globe so the launch site's real geography sits under the pad
  // (the pad is at the sphere's local +Y). Rotate the site's surface normal
  // onto +Y; default to a mid-Atlantic view when no site is given.
  const site = opts.launchSite ?? { lat: 0, lon: -30 };
  const latR = (site.lat * Math.PI) / 180;
  const lonR = ((site.lon + (opts.lonTextureOffsetDeg ?? LON_TEXTURE_OFFSET_DEG)) * Math.PI) / 180;
  // Texture point for (lat, lon) in Three's sphere-UV frame: x=cosφcosλ,
  // y=sinφ, z=−sinφ... the z is NEGATIVE sinλ (equirectangular seam at −X).
  const siteNormal = new THREE.Vector3(
    Math.cos(latR) * Math.cos(lonR),
    Math.sin(latR),
    -Math.cos(latR) * Math.sin(lonR),
  );
  earth.quaternion.setFromUnitVectors(siteNormal, new THREE.Vector3(0, 1, 0));
  // Aligning the site normal to +Y leaves ONE free DOF: the spin about the
  // pad's vertical (which compass bearing faces downrange). Pick it so the
  // green coastline sits in shot rather than open ocean — a real launch pad is
  // ringed by land. Rotate about the WORLD +Y (the pad-up axis).
  const yawDeg = opts.siteYawDeg ?? DEFAULT_SITE_YAW_DEG;
  if (yawDeg) earth.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), (yawDeg * Math.PI) / 180);
  scene.add(earth);

  // ── Launch-site ground detail (S8): a real cloudless satellite crop of the
  //    actual pad, tangent at the origin, so the launch sits on recognizable
  //    green land — the global daymap is far too coarse this close.
  let launchGround: LaunchGround | null = null;
  if (opts.groundSite) {
    launchGround = buildLaunchGround(opts.groundSite);
    scene.add(launchGround.group);
  }

  // Thin atmospheric limb — ONE subtle back-side rim so the edge glows under
  // bloom WITHOUT washing the disc. The broad additive shells + procedural
  // clouds that used to sit here muddied the whole surface to a grey haze
  // (the cislunar Earth has none of that — just Earth + lights, and it reads
  // crisp). A real cloud/specular pass waits for proper assets.
  const atmoRim = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + 55, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x8ec5ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmoRim.position.copy(earth.position);
  scene.add(atmoRim);

  // Graded sky dome (R5) — horizon haze → zenith blue, wrapped around the
  // camera and faded out with altitude so the low-altitude sky reads like a
  // real sky (not a flat fill) and dissolves to black space on the way up.
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uAlt: { value: 0 },
      uHorizon: { value: new THREE.Color(0xbcd6ec) },
      uZenith: { value: new THREE.Color(0x2f6fd0) },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uAlt; uniform vec3 uHorizon; uniform vec3 uZenith;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(uHorizon, uZenith, pow(h, 0.7));
        float fade = clamp(1.0 - uAlt / 55.0, 0.0, 1.0); // sky thins out by ~55 km
        gl_FragColor = vec4(col, fade);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(30_000, 32, 32), skyMat);
  skyDome.renderOrder = -10;
  scene.add(skyDome);

  // ── Sun disc + additive halo, far along the light direction.
  const sunGroup = new THREE.Group();
  const sunPos = sunDir.clone().multiplyScalar(60_000);
  sunGroup.position.copy(sunPos);
  sunGroup.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(1400, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff6e8 }),
    ),
    new THREE.Mesh(
      new THREE.SphereGeometry(4200, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  scene.add(sunGroup);

  // ── Star field (deterministic golden-angle scatter, upper sky).
  const starGeo = new THREE.BufferGeometry();
  const starN = 1800;
  const starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const a = i * 2.399963;
    const z = 1 - (2 * (i + 0.5)) / starN;
    const r = Math.sqrt(1 - z * z);
    starPos[i * 3] = Math.cos(a) * r * 60_000;
    starPos[i * 3 + 1] = Math.abs(z) * 60_000 + 300;
    starPos[i * 3 + 2] = Math.sin(a) * r * 60_000;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xdfeaff, size: 80, sizeAttenuation: true }),
  );
  scene.add(stars);

  // ── Pad + strongback tower at the origin (slim, matched to the vehicle).
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.9 });
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(vehLen * 0.15, vehLen * 0.2, vehLen * 0.05, 32),
    padMat,
  );
  pad.position.y = vehLen * 0.025;
  scene.add(pad);
  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(vehLen * 0.03, vehLen * 1.05, vehLen * 0.03),
    padMat,
  );
  tower.position.set(vehLen * 0.1, vehLen * 0.52, 0);
  scene.add(tower);

  // ── Vehicle: the launcher's procedural model — a per-vehicle silhouette
  //    where one exists, else a generic body. The scene animates its STANDARD
  //    parts (booster, upper stage, fairing halves) so the separation
  //    choreography is vehicle-agnostic.
  const vehicle = new THREE.Group();
  const rBody = vehLen * 0.05; // plume scale reference
  const model = buildLauncherModel(opts.launcherId, vehLen, opts.boosterCount ?? 0);
  const strapOnGroup = model.strapOns;
  // The strap-on bodies that flame (before any flames are added to the group; a part marked
  // noFlame — the Atlas booster skirt — rides along unlit) and where they sit.
  const strapOnBodies: THREE.Object3D[] = strapOnGroup
    ? strapOnGroup.children.filter((c) => !c.userData.noFlame)
    : [];
  const strapOnBase = strapOnBodies.map((b) => b.position.clone());
  // Air-lit strap-ons, spread evenly round the ring (Delta II: every third GEM).
  const airLitN = Math.min(
    Math.max(0, opts.boosterAirLitCount ?? 0),
    Math.max(0, strapOnBodies.length - 1),
  );
  const airStep = airLitN > 0 ? Math.max(1, Math.round(strapOnBodies.length / airLitN)) : 0;
  const isAirLit = (i: number): boolean =>
    airLitN > 0 && (i + 1) % airStep === 0 && (i + 1) / airStep <= airLitN;
  const midStageGroup = model.midStage;
  const booster = model.booster;
  const upperStage = model.upperStage;
  const fairingGroup = model.fairingGroup;
  const fairingHalfL = model.fairingL;
  const fairingHalfR = model.fairingR;
  const fairingBaseY = model.fairingBaseY;
  const payloadBaseY = model.payloadMountY;
  vehicle.add(model.root);

  // Measure the upper-stage body radius so a capsule payload is sized to the
  // rocket it mates to (never wider than the body). Half the stage's X extent.
  const _usBox = new THREE.Box3().setFromObject(upperStage);
  const _usSize = new THREE.Vector3();
  _usBox.getSize(_usSize);
  const upperStageRadius = Math.max(_usSize.x, _usSize.z) / 2;
  // Its centre along the body axis — the camera frames the stage + spacecraft between them
  // while the two coast and burn together after SECO.
  const upperStageCenterY = _usBox.getCenter(new THREE.Vector3()).y;
  // The radius of the stage's topmost part (the S-IVB, not the flared interstage below it).
  let stageTopRadius = upperStageRadius;
  let stageTopY = -Infinity;
  upperStage.updateMatrixWorld(true);
  upperStage.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    if (b.max.y > stageTopY + 1e-6) {
      stageTopY = b.max.y;
      stageTopRadius = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
    }
  });

  // Payload — TWO forms (#2 / operator decision 2026-07-29): a compact STOWED
  // shroud while it rides the exposed stage (fairing gone → SECO), then the real
  // deployed spacecraft (dedicated model or generic bus) springing free + its
  // wings unfolding at separation. Real payloads ride folded under the fairing
  // and deploy AFTER sep — showing the deployed model bolted to the rocket read
  // wrong.
  const payload = buildPayload(
    opts.spacecraftId,
    vehLen,
    upperStageRadius,
    opts.launcherHeightM,
    stageTopRadius,
  );
  // Crewed capsules ride exposed on top — no fairing, stowed shroud, or deploy.
  const isCapsulePayload = payload.userData.isCapsule === true;
  // …except the Soviet/Chinese capsules, which rode under a nose fairing that
  // jettisoned once past the atmosphere. They still separate at SECO like any
  // capsule — they just wear a shroud on the way up.
  const isFairedCapsule = payload.userData.fairedCapsule === true;
  // Rides in the open once the fairing (Orion: the abort tower + panels) is gone.
  const isExposedAfterFairing = payload.userData.exposedAfterFairing === true;
  // A payload carried in a closed bay (the Shuttle): hidden there until it is deployed.
  const bay = model.payloadBay;
  const bayDir = bay ? new THREE.Vector3(...bay.deployDir).normalize() : new THREE.Vector3();
  payload.position.y = payloadBaseY;
  payload.visible = false;
  vehicle.add(payload);
  // The kick stage's flame (Shuttle + IUS): at the deployed spacecraft's base, firing aft.
  const kickPlume = new THREE.Group();
  const kickMotorParts: THREE.Object3D[] = [];
  const stowedPayload = buildStowedPayload(vehLen, upperStageRadius);
  stowedPayload.position.y = payloadBaseY;
  stowedPayload.visible = false;
  vehicle.add(stowedPayload);

  // Payload adapter — the connecting structure (spacecraft adapter / trunk /
  // service section) between the capsule base and the top of the upper stage.
  // Without it the capsule floats above the rocket with a visible gap. Built
  // into the capsule holder so it rides + separates WITH the spacecraft (a
  // Dragon keeps its trunk, an Apollo its SM). Only capsules — satellites carry
  // their own adapter under the fairing.
  if (isCapsulePayload) {
    const capBox = new THREE.Box3().setFromObject(payload);
    const capSize = new THREE.Vector3();
    capBox.getSize(capSize);
    const capsuleR = Math.max(capSize.x, capSize.z) / 2;
    const gapH = payloadBaseY - _usBox.max.y;
    if (gapH > vehLen * 0.005 && upperStageRadius > 0) {
      const adapter = new THREE.Mesh(
        new THREE.CylinderGeometry(capsuleR * 0.98, upperStageRadius, gapH, 28, 1, false),
        new THREE.MeshStandardMaterial({ color: 0x363b43, roughness: 0.6, metalness: 0.5 }),
      );
      adapter.position.y = -gapH / 2; // holder-local: capsule base at 0, adapter below it
      payload.add(adapter);
    }
  }

  // Separation-event bursts (flash + frost/debris puff) at each sep plane —
  // parented to the vehicle so they sit at the interface. Driven by sepProgress
  // in updateForces(), so they're scrub-exact like every other sep animation.
  const BURST_S = 2.6;
  const boosterBurst = new SeparationBurst({ scale: vehLen * 0.55 });
  boosterBurst.position.y = 0;
  vehicle.add(boosterBurst);
  const fairingBurst = new SeparationBurst({ scale: vehLen * 0.42, particleColor: 0xeaf1ff });
  fairingBurst.position.y = fairingBaseY;
  vehicle.add(fairingBurst);
  // Small: a spacecraft leaves its stage on springs and small pyros, and the camera is close
  // on it — at 0.34 the flash filled the screen, and at 0.14 still most of it.
  const payloadBurst = new SeparationBurst({ scale: vehLen * 0.1 });
  if (bay) payloadBurst.position.set(...bay.center);
  else payloadBurst.position.y = payloadBaseY;
  vehicle.add(payloadBurst);

  scene.add(vehicle);

  // Plume (R4): a LAYERED exhaust — hot blue-white throat, a yellow core, a
  // wide orange glow, a long diffuse trail, and Mach-diamond shock beads down
  // the axis. Built along +Y then rotated so it fires −Y; flickered per frame.
  const plumeCone = (
    r: number,
    len: number,
    color: number,
    opacity: number,
    blending: THREE.Blending = THREE.AdditiveBlending,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, len, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending,
        depthWrite: false,
      }),
    );
    // After the launch-ground patch (renderOrder 2): the flame writes no depth, so a patch
    // drawn later painted over it wherever the ground sat behind it on screen.
    m.renderOrder = 3;
    return m;
  };
  // The white-hot core just under the bell, blended normally: the additive layers vanish
  // against a sunlit desert or bright sky (Soyuz and Proton at Baikonur read flameless).
  // Its wide end sits at the nozzle, where the outer cone's wide end is.
  const PLUME_CORE_LEN = vehLen * 0.11;
  const plumeCore = (r: number): THREE.Mesh => {
    const m = plumeCone(r, PLUME_CORE_LEN, 0xfff1d0, 0.85, THREE.NormalBlending);
    m.position.y = -(vehLen * 0.13 - PLUME_CORE_LEN / 2);
    m.renderOrder = 4;
    return m;
  };
  // One exhaust per REAL engine nozzle (Falcon 9's 9-Merlin octaweb, Saturn V's
  // 5-F-1 quincunx, …) so multi-engine boosters light ALL bells, not just the
  // axis. Layout mirrors engineCluster's nozzle grid; re-laid-out on stage change
  // (the usually single-engine upper stage collapses to one central bell).
  const engSpec = opts.launcherId ? getLauncherEngines(opts.launcherId) : undefined;
  // Strap-on rows ('per-booster') come first in a spec (Shuttle, R-7, Atlas V, SLS …) but
  // are not a core stage: indexing the spec by core stage gave the core the boosters' row —
  // one centred flame, SLS showing 1 of its 4 RS-25s. Core rows only here; strap-ons get
  // their own flames below.
  const coreRows = engSpec?.stages.filter((st) => st.arrangement !== 'per-booster');
  // Plume slots: 0 booster, 1 upper, 2 the last stage when the model has its own anchor for
  // it (a three-stage stack whose upper anchor drops with the mid stage).
  const FINAL_SLOT = model.finalPlumeAnchor ? 2 : 1;
  // Slot 3: a fourth serial stage that completes the orbit and makes the departure burn
  // (Proton-M's Briz-M); otherwise the injection fires from FINAL_SLOT.
  const INJECTION_SLOT = model.injectionPlumeAnchor ? 3 : FINAL_SLOT;
  const plumeAnchorFor = (slot: number): THREE.Object3D =>
    slot >= 3 && model.injectionPlumeAnchor
      ? model.injectionPlumeAnchor
      : slot >= 2
        ? (model.finalPlumeAnchor ?? model.upperPlumeAnchor)
        : slot === 1
          ? model.upperPlumeAnchor
          : model.boosterPlumeAnchor;
  // A plume anchor's nozzle exit (local y the flame starts at) and radius. A stage cylinder:
  // its base, with the bells hanging ~vehLen × 0.04 below it. Any other anchor (the Shuttle's
  // SSME cluster group) is measured — its own bells are inside its bounds. Measured in the
  // anchor's frame, so it holds whatever attitude the vehicle has.
  const anchorInfo = new Map<THREE.Object3D, { exitY: number; radius: number }>();
  const anchorOf = (a: THREE.Object3D): { exitY: number; radius: number } => {
    const hit = anchorInfo.get(a);
    if (hit) return hit;
    const cyl = (a as THREE.Mesh).geometry as THREE.CylinderGeometry | undefined;
    let info: { exitY: number; radius: number };
    if (cyl?.parameters?.height) {
      info = {
        exitY: -cyl.parameters.height / 2 - vehLen * 0.04,
        radius: cyl.parameters.radiusTop,
      };
    } else {
      a.updateWorldMatrix(true, true);
      const inv = a.matrixWorld.clone().invert();
      const box = new THREE.Box3();
      a.traverse((o) => {
        const g = (o as THREE.Mesh).geometry;
        if (!g) return;
        if (!g.boundingBox) g.computeBoundingBox();
        box.union(g.boundingBox!.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld)));
      });
      info = box.isEmpty()
        ? { exitY: -vehLen * 0.14, radius: rBody }
        : { exitY: box.min.y, radius: Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 };
    }
    anchorInfo.set(a, info);
    return info;
  };
  const stageNozzleLayout = (stageIdx: number): { offsets: [number, number][]; bellR: number } => {
    const st = coreRows?.[stageIdx];
    const offsets = clusterOffsets(st?.arrangement ?? 'single', st?.mainNozzles ?? 1);
    const stageR = anchorOf(plumeAnchorFor(stageIdx)).radius;
    const spread = Math.max(1, ...offsets.map(([x, z]) => Math.hypot(x, z)));
    const bellR = Math.min(stageR * 0.34, (stageR * 0.92) / (spread + 1));
    return { offsets, bellR };
  };
  const refBellR = Math.max(stageNozzleLayout(0).bellR, rBody * 0.18);
  const nozzleCount = Math.max(
    ...Array.from({ length: INJECTION_SLOT + 1 }, (_, i) => stageNozzleLayout(i).offsets.length),
  );
  const plume = new THREE.Group();
  const nozzlePlumes: THREE.Group[] = [];
  for (let i = 0; i < nozzleCount; i++) {
    const nz = new THREE.Group();
    nz.add(plumeCone(refBellR * 1.35, vehLen * 0.26, 0xff8a3c, 0.15));
    nz.add(plumeCone(refBellR * 0.85, vehLen * 0.2, 0xffcf80, 0.38));
    nz.add(plumeCore(refBellR * 0.6));
    plume.add(nz);
    nozzlePlumes.push(nz);
  }
  const layoutPlumes = (stageIdx: number): void => {
    const { offsets, bellR } = stageNozzleLayout(stageIdx);
    nozzlePlumes.forEach((nz, i) => {
      const on = i < offsets.length;
      nz.visible = on;
      if (on) nz.position.set(offsets[i][0] * bellR, 0, offsets[i][1] * bellR);
    });
  };
  let plumeStage = 0;
  layoutPlumes(0);
  plume.rotation.z = Math.PI; // point down (−Y)
  booster.add(plume);
  // The plume starts at the firing stage's nozzle exit (anchorOf). A fixed offset from the
  // anchor's centre only fit cores of one height (SLS's long core hid it).
  const PLUME_HALF = vehLen * 0.13; // the outer cone's half-length at scale 1

  // One flame per strap-on booster at its base, lit while the boosters burn.
  const strapOnPlumes: THREE.Group[] = [];
  if (strapOnGroup && engSpec?.stages.some((st) => st.arrangement === 'per-booster')) {
    model.root.updateMatrixWorld(true);
    // strapOnBodies is a copy taken before the flames are added to this same group.
    for (const sb of strapOnBodies) {
      const box = new THREE.Box3().setFromObject(sb);
      const base = strapOnGroup.worldToLocal(
        new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
      );
      // Sized from the booster itself: a solid's nozzle is about its own width, far wider
      // than the core's bells (the Shuttle's SRB flames drew as threads beside the SSMEs).
      const rS = Math.min(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
      const p = new THREE.Group();
      p.add(plumeCone(rS * 1.0, vehLen * 0.26, 0xff8a3c, 0.18));
      p.add(plumeCone(rS * 0.65, vehLen * 0.2, 0xffcf80, 0.42));
      p.add(plumeCore(rS * 0.5));
      p.rotation.z = Math.PI;
      p.position.set(base.x, base.y - PLUME_HALF * 0.85, base.z);
      p.scale.setScalar(0.85);
      p.visible = false;
      strapOnGroup.add(p);
      strapOnPlumes.push(p);
    }
  }

  if (opts.kickStage) {
    // The kick motor itself, under the spacecraft (a Star 48B on a Delta II, the IUS on the
    // Shuttle flights, Lunar Prospector's Star 37): body + nozzle, the flame from its exit.
    const { exitY, radius } = anchorOf(payload);
    const rm = Math.min(radius * 0.35, vehLen * 0.035);
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2c31,
      roughness: 0.6,
      metalness: 0.3,
    });
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(rm, rm * 0.9, rm * 1.8, 24), motorMat);
    motor.position.y = exitY - rm * 0.9;
    const kickNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(rm * 0.3, rm * 0.62, rm * 0.9, 20, 1, true),
      motorMat,
    );
    kickNozzle.position.y = exitY - rm * 1.8 - rm * 0.45;
    payload.add(motor, kickNozzle);
    for (const part of [motor, kickNozzle]) {
      part.userData.baseY = part.position.y;
      kickMotorParts.push(part);
    }
    const nozzleExitY = exitY - rm * 2.7;
    kickPlume.add(plumeCone(rm * 1.1, vehLen * 0.26, 0xff8a3c, 0.15));
    kickPlume.add(plumeCone(rm * 0.75, vehLen * 0.2, 0xffcf80, 0.38));
    kickPlume.add(plumeCore(rm * 0.5));
    kickPlume.rotation.z = Math.PI;
    kickPlume.position.y = nozzleExitY - PLUME_HALF * 0.7;
    kickPlume.scale.setScalar(0.7);
    kickPlume.visible = false;
    payload.add(kickPlume);
  }

  // ── Science-Lens force vectors (thrust / weight / drag / velocity),
  //    drawn in world space at the vehicle. Lengths are stylised so the
  //    diagram reads; thrust and weight share a scale so TWR stays honest.
  const FORCE_REF_N = 8_000_000; // ≈ liftoff thrust → maps to 2.2·vehLen
  const DRAG_REF_N = 120_000; // separate scale so drag reads at Max-Q
  const SPEED_REF = 7.8; // km/s → 2·vehLen
  const forces = new THREE.Group();
  forces.visible = false;
  const mkArrow = (hex: number): BoldArrow =>
    new BoldArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), vehLen, hex);
  const arrThrust = mkArrow(FORCE_COLORS.thrust);
  const arrWeight = mkArrow(FORCE_COLORS.weight);
  const arrDrag = mkArrow(FORCE_COLORS.drag);
  const arrVel = mkArrow(FORCE_COLORS.velocity);
  arrThrust.setLabel('THRUST', '#8fe8b0');
  arrWeight.setLabel('WEIGHT', '#ffb3b3');
  arrDrag.setLabel('DRAG', '#a8c8ff');
  arrVel.setLabel('VELOCITY', '#bfeaff');
  forces.add(arrThrust, arrWeight, arrDrag, arrVel);
  scene.add(forces);
  let showForces = false;
  // Per-vector visibility (the Science-Lens layers drive these individually).
  // Default all-off: an arrow shows only when its lens layer is on AND the
  // force is non-trivial at the current state. The group gate `forces.visible`
  // opens whenever any single vector is on.
  const forceVisible: Record<ForceKey, boolean> = {
    thrust: false,
    weight: false,
    drag: false,
    velocity: false,
  };
  const anyForceOn = (): boolean =>
    forceVisible.thrust || forceVisible.weight || forceVisible.drag || forceVisible.velocity;
  // Last physics state — lets a lens toggle refresh the arrows immediately even
  // when the timeline is paused (no setState pending).
  let lastState: AscentState | null = null;
  // Post-SECO injection burn (RFC-034 §3.1) — driven by the clock, not the
  // physics state (which freezes at SECO). Re-lights the upper-stage plume.
  let injectionBurning = false;

  let frame = 0;
  const schedule = opts.schedule ?? [];
  let activeShot: AscentShotName = 'ascent';

  // Smooth-camera convergence layer (the /fly cinematic technique — see
  // docs/guides/fly-cinematic-shot-language.md). composeShot() gives a per-frame
  // TARGET pose; the live camera EASES toward it (position + fov) so shot
  // changes blend as pans/dollies/zooms instead of hard-cutting, while the
  // look-at tracks the subject fast so the vehicle never leaves the frame.
  let camS: {
    px: number;
    py: number;
    pz: number;
    tx: number;
    ty: number;
    tz: number;
    fov: number;
  } | null = null;
  const K_POS = 0.13; // camera-position ease (smooth dolly / pan)
  const K_TGT = 0.45; // look-at ease — fast, so the subject stays framed
  const K_FOV = 0.13; // fov ease (smooth zoom)
  // The K_* factors are per 60 Hz frame; the last camera update's time scales them.
  let lastCamMs: number | null = null;

  // Separation event METs (undefined ⇒ that beat never fires; the sep stays at rest).
  const metOf = (type: AscentEvent['type']): number | undefined =>
    opts.events?.find((e) => e.type === type)?.t;
  // The first-stage body drops at FIRST-STAGE burnout (MECO), not at strap-on
  // jettison — both push a 'staging' event, but `meco` fires only at the first
  // real stage burnout, so it's the correct drop time for boosted stacks
  // (Shuttle ET+SRBs at ~510 s, not the SRB sep at ~94 s). Falls back to the
  // lone 'staging' for un-boosted two-stage vehicles. A boosted single-stage core (the
  // stage-and-a-half Atlas) has no MECO: its lone 'staging' is the booster-section drop,
  // and the core flies on to SECO.
  const stagingT = metOf('meco') ?? (strapOnGroup ? metOf('seco') : metOf('staging'));
  // Strap-on solids jettison at the FIRST 'staging' (their burnout, ~94 s for
  // Atlas V AJ-60As) — earlier than the core drop at MECO above.
  const strapOnSepT = metOf('staging');
  const stagingTimes = (opts.events ?? [])
    .filter((e) => e.type === 'staging')
    .map((e) => e.t)
    .sort((a, b) => a - b);
  // With an air-lit group the strap-ons leave in two waves: the second staging event.
  const airSepT = airLitN > 0 ? stagingTimes[1] : undefined;
  const fairingT = metOf('fairing_jettison');
  const secoT = metOf('seco');
  // The spacecraft leaves the stage at SECO, or after the injection burn when it rides it.
  const sepAfterSeco = opts.payloadSepT != null && (secoT == null || opts.payloadSepT > secoT);
  const payloadSepT = sepAfterSeco ? opts.payloadSepT : secoT;
  // Riding the launcher's stage through its injection burn (not deployed before a kick stage).
  const ridesInjection = sepAfterSeco && !opts.kickStage;
  // Intermediate serial stage (e.g. Saturn V's S-II) drops at the SECOND core
  // staging. Core stagings = the 'staging' events after the strap-on jettison
  // (the first one, only when strap-ons exist); [0] is the booster drop (== MECO),
  // [1] is the mid-stage. Falls back to SECO so a 2-stage vehicle mapped onto a
  // 3-part mesh (e.g. Saturn IB) drops its mid-part with the upper stage instead
  // of leaving it floating.
  const coreStagingTimes = stagingTimes.slice(strapOnGroup ? (airLitN > 0 ? 2 : 1) : 0);
  const midStageSepT = coreStagingTimes[1] ?? secoT;
  // A fourth serial part (Proton-M's third stage under Briz-M) drops at the third core staging.
  const lastCoreStageSepT = coreStagingTimes[2] ?? secoT;
  const BOOSTER_SEP_S = 5;
  // Fairing clamshell drifts slowly (item 4) so the halves linger in frame while
  // the payload is revealed — a held beat, not a snap-away.
  const FAIRING_SEP_S = 6.5;
  // Payload deployment (#2): wings swing out + the bus blooms to full scale over
  // this window after SECO, as the spacecraft springs free of the upper stage.
  const PAYLOAD_DEPLOY_S = 3;
  // Orion's array wings swing out over this window in Earth orbit.
  const WING_DEPLOY_S = 6;

  const _v = new THREE.Vector3();
  const updateForces = (s: AscentState): void => {
    const origin = new THREE.Vector3(s.downrangeKm, s.altKm, 0);
    const setArrow = (
      arr: BoldArrow,
      key: ForceKey,
      dx: number,
      dy: number,
      lenKm: number,
    ): void => {
      const on = forceVisible[key] && lenKm > vehLen * 0.05 && (dx !== 0 || dy !== 0);
      arr.visible = on;
      if (!on) return;
      arr.position.copy(origin);
      _v.set(dx, dy, 0).normalize();
      arr.setDirection(_v);
      // Head proportional to the arrow's own length so the aspect matches the
      // coast (capsule) arrows — slim, not the fat fixed head.
      arr.setLength(lenKm, lenKm * 0.3, lenKm * 0.1);
    };
    // Thrust — up the commanded body axis.
    const tl = (s.thrustN / FORCE_REF_N) * vehLen * 1.1;
    setArrow(
      arrThrust,
      'thrust',
      Math.cos(s.pitchRad),
      Math.sin(s.pitchRad),
      s.thrustN > 0 ? tl : 0,
    );
    // Weight — toward Earth's centre (a full radius below the pad).
    const weightN = s.massKg * gravity(s.altKm * 1000);
    setArrow(
      arrWeight,
      'weight',
      -s.downrangeKm,
      -(R_EARTH_KM + s.altKm),
      (weightN / FORCE_REF_N) * vehLen * 1.1,
    );
    // Velocity + drag (drag opposes velocity).
    const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
    setArrow(arrVel, 'velocity', horiz, s.velUpKms, (s.speedKms / SPEED_REF) * vehLen * 1.0);
    setArrow(arrDrag, 'drag', -horiz, -s.velUpKms, (s.dragN / DRAG_REF_N) * vehLen * 0.6);
  };

  const setState = (s: AscentState): void => {
    frame++;
    vehicle.position.set(s.downrangeKm, s.altKm, 0);

    // Sky: daylight blue on the pad → space-black by ~70 km (pow curve so
    // it darkens fast, like real onboard footage). Stars fade in as it darkens.
    const skyT = Math.min(1, Math.pow(s.altKm / 70, 0.65));
    (scene.background as THREE.Color).copy(SKY_GROUND).lerp(SKY_SPACE, skyT);
    (stars.material as THREE.PointsMaterial).opacity = skyT;
    (stars.material as THREE.PointsMaterial).transparent = true;
    skyMat.uniforms.uAlt.value = s.altKm;
    launchGround?.setAltitudeFade(s.altKm);

    // Orient along the commanded thrust direction (see bodyAngleFromVerticalRad).
    const fromVertical = bodyAngleFromVerticalRad(s);
    vehicle.rotation.z = -fromVertical;

    // ── Separations — every offset is a pure function of the mission time vs
    //    the event METs, so scrubbing the timeline back and forth is exact.
    // Booster: drifts back down the body axis, tumbles, recedes away.
    const bp = sepProgress(s.t, stagingT, BOOSTER_SEP_S);
    booster.visible = bp < 1;
    booster.position.y = -bp * vehLen * 3;
    booster.rotation.set(bp * 2.4, 0, bp * 1.2);
    // Only a gentle shrink (item 4) — the drift-away already recedes it via
    // perspective; keep it big enough to read as a distinct spent stage.
    booster.scale.setScalar(1 - 0.18 * bp);

    // Mid stage (serial): the middle stage (Saturn V's S-II) drops at the second
    // core staging — after the booster is gone and its own burn is spent, before
    // the final upper stage. Same drift as the booster, from a higher sep plane.
    if (midStageGroup) {
      const mp = sepProgress(s.t, midStageSepT, BOOSTER_SEP_S);
      midStageGroup.visible = mp < 1;
      midStageGroup.position.y = -mp * vehLen * 3;
      midStageGroup.rotation.set(mp * 2.4, 0, mp * 1.2);
      midStageGroup.scale.setScalar(1 - 0.18 * mp);
    }
    // A fourth serial part (Proton-M's third stage under Briz-M) drops the same way.
    if (model.lastCoreStage && lastCoreStageSepT != null) {
      const sp = sepProgress(s.t, lastCoreStageSepT, BOOSTER_SEP_S);
      model.lastCoreStage.visible = sp < 1;
      model.lastCoreStage.position.y = -sp * vehLen * 3;
      model.lastCoreStage.rotation.set(sp * 2.4, 0, sp * 1.2);
      model.lastCoreStage.scale.setScalar(1 - 0.18 * sp);
    }

    // Strap-on solids: at burnout they fall back + tumble away from the still-
    // climbing core (earlier than the core drop above).
    if (strapOnGroup && airLitN > 0) {
      // Two groups leave at their own burnouts: each booster falls back and tumbles
      // outward on its own.
      strapOnBodies.forEach((body, i) => {
        const sp = sepProgress(s.t, isAirLit(i) ? airSepT : strapOnSepT, BOOSTER_SEP_S);
        const b = strapOnBase[i];
        body.visible = sp < 1;
        body.position.set(b.x * (1 + sp * 0.8), b.y - sp * vehLen * 2.6, b.z * (1 + sp * 0.8));
        body.rotation.z = -Math.sign(b.x || 1) * sp * 1.2;
      });
    } else if (strapOnGroup) {
      const sp = sepProgress(s.t, strapOnSepT, BOOSTER_SEP_S);
      strapOnGroup.visible = sp < 1;
      strapOnGroup.position.y = -sp * vehLen * 2.6;
      strapOnGroup.rotation.set(sp * 1.6, 0, 0);
      strapOnGroup.scale.setScalar(1 - 0.18 * sp);
    }

    // Payload separation. Two regimes: crewed capsules ride exposed on top;
    // everything else rides folded under a jettisonable fairing.
    const pp = sepProgress(s.t, payloadSepT, PAYLOAD_SEP_HOLD_S);
    stowedPayload.position.y = payloadBaseY;
    if (isFairedCapsule) {
      // Nose-fairing capsule (Vostok/Voskhod/Soyuz/Shenzhou): a shroud covers the
      // capsule through the atmosphere, clamshells away once above it (~40% of the
      // way to orbit ≈ Vostok's real T+2:34), then the bare capsule coasts to SECO
      // and separates. No stowed shroud + no solar-wing deploy — it's a capsule.
      const jettT = secoT != null ? secoT * 0.42 : fairingT;
      const fp = sepProgress(s.t, jettT, FAIRING_SEP_S);
      fairingGroup.visible = fp < 1;
      const spread = fp * vehLen * 2.4;
      const rise = fairingBaseY + fp * vehLen * 1.2;
      fairingHalfL.position.set(-spread, rise, 0);
      fairingHalfR.position.set(spread, rise, 0);
      fairingHalfL.rotation.z = fp * 1.3;
      fairingHalfR.rotation.z = -fp * 1.3;
      stowedPayload.visible = false;
      // Capsule hidden under the shroud until jettison, then exposed to SECO.
      payload.visible = jettT != null ? s.t >= jettT : true;
      payload.position.y = payloadBaseY + pp * vehLen * 1.1;
      payload.rotation.y = 0;
    } else if (isCapsulePayload) {
      // Crewed capsule: exposed the whole ascent (no fairing, no stowed shroud,
      // no solar-wing deploy). At SECO it separates from the spent upper stage,
      // which drifts back the other way (below).
      fairingGroup.visible = false;
      const les = payload.userData.les as THREE.Object3D | undefined;
      if (les) les.visible = s.t < (fairingT ?? (secoT != null ? secoT * 0.35 : Infinity));
      stowedPayload.visible = false;
      payload.visible = true;
      payload.position.y = payloadBaseY + pp * vehLen * 1.1;
      payload.rotation.y = 0;
    } else {
      // Fairing: the two shells clamshell apart, rise, and tumble away.
      const fp = sepProgress(s.t, fairingT, FAIRING_SEP_S);
      fairingGroup.visible = fp < 1;
      const spread = fp * vehLen * 2.4;
      const rise = fairingBaseY + fp * vehLen * 1.2;
      fairingHalfL.position.set(-spread, rise, 0);
      fairingHalfR.position.set(spread, rise, 0);
      fairingHalfL.rotation.z = fp * 1.3;
      fairingHalfR.rotation.z = -fp * 1.3;

      // While it rides the exposed stage (fairing gone → separation) show the compact
      // STOWED shroud; at separation it springs free as the real deployed model, wings
      // unfolding over the deploy window.
      const exposed = fairingT != null ? s.t >= fairingT : s.stageIndex < 0;
      const separated = payloadSepT != null && s.t >= payloadSepT;
      payload.position.y = payloadBaseY + pp * vehLen * 1.1;
      if (isExposedAfterFairing) {
        // Orion: in the open from the abort-tower jettison, wings folded; they open in
        // Earth orbit (Artemis I: ~T+18 min, before TLI), so midway through the parking
        // coast when it rides the stage through injection, else as it separates.
        stowedPayload.visible = false;
        payload.visible = exposed;
        payload.rotation.y = 0;
        const wingT =
          ridesInjection && secoT != null && payloadSepT != null
            ? secoT + (payloadSepT - secoT) * 0.35
            : payloadSepT;
        setWingDeploy(payload, sepProgress(s.t, wingT, WING_DEPLOY_S));
      } else {
        stowedPayload.visible = exposed && !separated && !bay;
        payload.visible = separated || (payloadSepT == null && exposed && !bay);
        payload.rotation.y = s.t * 0.12;
        deployPayload(payload, sepProgress(s.t, payloadSepT, PAYLOAD_DEPLOY_S));
      }
      if (bay) {
        // Out through the open bay doors, not off the nose.
        const k = pp * vehLen * 0.9;
        payload.position.set(
          bay.center[0] + bayDir.x * k,
          bay.center[1] + bayDir.y * k,
          bay.center[2] + bayDir.z * k,
        );
      }
    }
    if (isCapsulePayload) {
      // A crewed capsule is a direct-insertion flight: it sprang free at SECO,
      // so the spent upper stage must tumble AWAY + shrink (like the booster) —
      // otherwise it lingers right beside the capsule and reads as "the capsule
      // never separated / the launcher is what's in orbit" (the exact bug Marko
      // flagged on Titan/Gemini). Only the spacecraft is left coasting.
      upperStage.position.y = -pp * vehLen * 4.5;
      upperStage.rotation.set(pp * 2.0, 0, pp * 1.0);
      upperStage.scale.setScalar(1 - 0.34 * pp);
    } else {
      upperStage.position.y = -pp * vehLen * 1.4;
    }

    // Separation bursts — the visible pyro/pusher event at each sep plane.
    boosterBurst.update(sepProgress(s.t, stagingT, BURST_S));
    fairingBurst.update(sepProgress(s.t, fairingT, BURST_S));
    payloadBurst.update(sepProgress(s.t, payloadSepT, BURST_S));

    // Plume: only while a stage burns; re-parent to the firing stage,
    // flicker the length, taper in vacuum.
    // The active stage's engines are firing: not before an air-lit core lights (LVM3's S200s
    // lift off alone) and not on a coast to apoapsis.
    const burning = s.stageIndex >= 0 && s.coreLit !== false;
    // The stage re-lights for injection with the spacecraft still on it. A capsule that
    // separated at SECO (no ride-through) leaves a spent stage that must not re-light.
    // The stage fires for injection only while the spacecraft is still on it; a kick stage
    // fires from the spacecraft once it has left (the whole burn, or its second part).
    const attachedNow = sepAfterSeco && payloadSepT != null && s.t < payloadSepT;
    const injecting = injectionBurning && attachedNow;
    kickPlume.visible = injectionBurning && opts.kickStage === true && !attachedNow;
    // After the burn the spent kick motor falls away from the spacecraft.
    const kp = sepProgress(s.t, opts.injectionBurnEndT, PAYLOAD_SEP_HOLD_S);
    for (const part of kickMotorParts) {
      part.visible = kp < 1;
      part.position.y = (part.userData.baseY as number) - kp * vehLen * 0.9;
    }
    if (kickPlume.visible) kickPlume.scale.set(0.7, 0.7 * (1 + 0.09 * Math.sin(frame * 0.7)), 0.7);
    plume.visible = burning || injecting;
    if (burning) {
      const stageForPlume = Math.min(s.stageIndex, INJECTION_SLOT);
      const firing = plumeAnchorFor(stageForPlume);
      if (plume.parent !== firing) {
        plume.parent?.remove(plume);
        firing.add(plume);
      }
      if (plumeStage !== stageForPlume) {
        layoutPlumes(stageForPlume);
        plumeStage = stageForPlume;
      }
      const flick = 1 + 0.09 * Math.sin(frame * 0.7) + 0.05 * Math.sin(frame * 1.9);
      // Upper-stage plume is longer + thinner in vacuum; wider in thick air.
      const vac = s.stageIndex >= 1 ? 1.6 : 1;
      plume.scale.set(1, flick * vac, 1);
      // Start just below the firing stage's nozzles (bells hang ~vehLen × 0.04 under it).
      plume.position.y = anchorOf(firing).exitY - PLUME_HALF * flick * vac;
    } else if (injecting) {
      // Post-SECO injection: the kick/upper stage re-lights — a long, thin
      // vacuum plume from the last stage's bell (the payload is still attached).
      const firing = plumeAnchorFor(INJECTION_SLOT);
      if (plume.parent !== firing) {
        plume.parent?.remove(plume);
        firing.add(plume);
      }
      if (plumeStage !== INJECTION_SLOT) {
        layoutPlumes(INJECTION_SLOT);
        plumeStage = INJECTION_SLOT;
      }
      const flick = 1 + 0.09 * Math.sin(frame * 0.7);
      plume.scale.set(0.85, flick * 1.9, 0.85);
      plume.position.y = anchorOf(firing).exitY - PLUME_HALF * flick * 1.9;
    }
    // Strap-on flames: each group only while it burns (ground-lit, air-lit, or both at once).
    const boostersLit = s.stageIndex === 0 && s.boostersActive === true;
    strapOnPlumes.forEach((p, i) => {
      p.visible =
        boostersLit &&
        (airLitN === 0 || (isAirLit(i) ? s.airLitBurning === true : s.groundLitBurning === true));
      if (p.visible) p.scale.set(0.85, 0.85 * (1 + 0.08 * Math.sin(frame * 0.9)), 0.85);
    });

    // Camera: pick the active shot, compose its target pose, then EASE the live
    // camera toward it (position + fov) while snapping the look-at fast — a
    // shot change reads as a pan/dolly/zoom that keeps the vehicle in frame,
    // never a hard jump into a corner.
    const shot = schedule.length
      ? activeShotAt(schedule, s.t)
      : { name: 'ascent' as const, progress: 0.5 };
    activeShot = shot.name;
    // Spacecraft world position — feeds the separation/orbit shots so the camera
    // tracks the spacecraft (not the empty vehicle origin) once the spent stage
    // recedes. Any payload that has sprung free, not only capsules: Orion and the
    // satellites drifted to a corner while the frame held the gap between them and
    // the stage. Before the separation, while stage and spacecraft coast and burn
    // together after SECO, frame the pair between them. Rotate the body-axis offset by
    // the live vehicle attitude.
    const separated = payloadSepT != null && s.t >= payloadSepT;
    const stackInOrbit = !separated && secoT != null && s.t >= secoT;
    const focusAxisY = separated
      ? payload.position.y
      : stackInOrbit
        ? (upperStageCenterY + payload.position.y) / 2
        : null;
    const capsuleFocus =
      focusAxisY != null
        ? {
            x: s.downrangeKm - focusAxisY * Math.sin(vehicle.rotation.z),
            y: s.altKm + focusAxisY * Math.cos(vehicle.rotation.z),
            z: separated ? payload.position.z : 0,
          }
        : null;
    const p = composeShot(
      activeShot,
      s,
      vehLen,
      shot.progress,
      opts.tuning?.[activeShot],
      capsuleFocus,
    );
    // Ease in the VEHICLE's frame, not the world's. In orbit the stack moves ~7.8 km/s × the
    // clock speed; easing world positions made the camera trail the 1.2 km craft by kilometres,
    // by an amount that changed with every frame's length — the craft jerked while the far
    // background stayed smooth. Relative to the vehicle the lag is only the shot's own motion,
    // and the per-frame factors are scaled to real frame time.
    const ax = s.downrangeKm;
    const ay = s.altKm;
    const now = performance.now();
    const frames =
      lastCamMs == null ? 1 : Math.min(6, Math.max(0, (now - lastCamMs) / (1000 / 60)));
    lastCamMs = now;
    const ease = (k: number): number => 1 - Math.pow(1 - k, frames);
    const kPos = ease(K_POS);
    const kTgt = ease(K_TGT);
    const kFov = ease(K_FOV);
    if (!camS) {
      camS = {
        px: p.px - ax,
        py: p.py - ay,
        pz: p.pz,
        tx: p.tx - ax,
        ty: p.ty - ay,
        tz: p.tz,
        fov: p.fov,
      };
    } else {
      camS.px += (p.px - ax - camS.px) * kPos;
      camS.py += (p.py - ay - camS.py) * kPos;
      camS.pz += (p.pz - camS.pz) * kPos;
      camS.tx += (p.tx - ax - camS.tx) * kTgt;
      camS.ty += (p.ty - ay - camS.ty) * kTgt;
      camS.tz += (p.tz - camS.tz) * kTgt;
      camS.fov += (p.fov - camS.fov) * kFov;
    }
    camera.position.set(camS.px + ax, camS.py + ay, camS.pz);
    camera.lookAt(camS.tx + ax, camS.ty + ay, camS.tz);
    camera.fov = camS.fov;
    camera.updateProjectionMatrix();

    lastState = s;
    if (showForces) updateForces(s);
  };

  const setForcesVisible = (on: boolean): void => {
    forceVisible.thrust = on;
    forceVisible.weight = on;
    forceVisible.drag = on;
    forceVisible.velocity = on;
    showForces = on;
    forces.visible = on;
    if (on && lastState) updateForces(lastState);
  };

  const setInjectionBurn = (on: boolean): void => {
    injectionBurning = on; // the continuous render loop applies it next frame
  };

  const setForceVisible = (force: ForceKey, on: boolean): void => {
    forceVisible[force] = on;
    const any = anyForceOn();
    showForces = any;
    forces.visible = any;
    if (any && lastState) updateForces(lastState);
  };

  const setAspect = (aspect: number): void => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const reset = (): void => {
    injectionBurning = false;
    booster.visible = true;
    booster.position.set(0, 0, 0);
    booster.rotation.set(0, 0, 0);
    booster.scale.setScalar(1);
    if (strapOnGroup) {
      strapOnGroup.visible = true;
      strapOnGroup.position.set(0, 0, 0);
      strapOnGroup.rotation.set(0, 0, 0);
      strapOnGroup.scale.setScalar(1);
    }
    fairingGroup.visible = true;
    fairingHalfL.position.set(0, fairingBaseY, 0);
    fairingHalfR.position.set(0, fairingBaseY, 0);
    fairingHalfL.rotation.set(0, 0, 0);
    fairingHalfR.rotation.set(0, 0, 0);
    payload.visible = false;
    payload.position.set(0, payloadBaseY, 0);
    upperStage.position.y = 0;
    if (plume.parent !== booster) {
      plume.parent?.remove(plume);
      booster.add(plume);
    }
    camS = null; // snap the smooth-camera to the first pose on restart
  };

  const dispose = (): void => {
    dayTex?.dispose();
    nightTex?.dispose();
    launchGround?.dispose();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
  };

  return {
    scene,
    camera,
    setState,
    setAspect,
    get activeShot() {
      return activeShot;
    },
    setForcesVisible,
    setForceVisible,
    setInjectionBurn,
    /** Snap the smooth-camera to its target instantly (use on a timeline scrub). */
    snapCamera: () => {
      camS = null;
    },
    reset,
    dispose,
  };
}
