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
import { gravity, type AscentEvent, type AscentState } from '$lib/orbital/ascent-physics';
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
import { getEarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';
import { buildLauncherModel } from '$lib/three/launcher-models';
import { clusterOffsets } from '$lib/three/launcher-detail';
import { getLauncherEngines } from '$lib/orbital/launcher-engines';
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
  /** Launcher id → the rocket's dedicated procedural model (else a generic body). */
  launcherId?: string;
  /** Strap-on booster count (Atlas V's variable AJ-60A count) — drawn on the
   *  generic body + jettisoned at strap-on burnout. 0 / omitted = none. */
  boosterCount?: number;
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
function buildStowedPayload(vehLen: number): THREE.Group {
  const body = new THREE.MeshStandardMaterial({ color: 0xd7dde3, roughness: 0.5, metalness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xb8912f, roughness: 0.45, metalness: 0.7 });
  const g = new THREE.Group();
  const w = vehLen * 0.11;
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
): THREE.Group {
  const probe = spacecraftId ? buildInterplanetarySpacecraft(spacecraftId) : null;
  const capsuleId =
    !probe && spacecraftId ? getEarthOrbitCoast(spacecraftId)?.capsuleId : undefined;
  const model = probe ?? (capsuleId ? buildCapsuleById(capsuleId) : null) ?? buildGenericPayload();
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  // A capsule mates to the top of the stage, so its base diameter is at most the
  // launcher body diameter (real capsules equal it or taper narrower via an
  // adapter — never WIDER). Scale a capsule by its WIDTH against the body radius,
  // not its largest dimension, so it can never end up fatter than the rocket
  // (the Gemini-wider-than-Titan bug). Satellites still normalise to the fairing.
  const k =
    capsuleId && bodyRadius && bodyRadius > 0
      ? (bodyRadius * 2 * 0.92) / (Math.max(size.x, size.z) || 1)
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

  // Payload — TWO forms (#2 / operator decision 2026-07-29): a compact STOWED
  // shroud while it rides the exposed stage (fairing gone → SECO), then the real
  // deployed spacecraft (dedicated model or generic bus) springing free + its
  // wings unfolding at separation. Real payloads ride folded under the fairing
  // and deploy AFTER sep — showing the deployed model bolted to the rocket read
  // wrong.
  const payload = buildPayload(opts.spacecraftId, vehLen, upperStageRadius);
  // Crewed capsules ride exposed on top — no fairing, stowed shroud, or deploy.
  const isCapsulePayload = payload.userData.isCapsule === true;
  // …except the Soviet/Chinese capsules, which rode under a nose fairing that
  // jettisoned once past the atmosphere. They still separate at SECO like any
  // capsule — they just wear a shroud on the way up.
  const isFairedCapsule = payload.userData.fairedCapsule === true;
  payload.position.y = payloadBaseY;
  payload.visible = false;
  vehicle.add(payload);
  const stowedPayload = buildStowedPayload(vehLen);
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
  const payloadBurst = new SeparationBurst({ scale: vehLen * 0.34 });
  payloadBurst.position.y = payloadBaseY;
  vehicle.add(payloadBurst);

  scene.add(vehicle);

  // Plume (R4): a LAYERED exhaust — hot blue-white throat, a yellow core, a
  // wide orange glow, a long diffuse trail, and Mach-diamond shock beads down
  // the axis. Built along +Y then rotated so it fires −Y; flickered per frame.
  const plumeCone = (r: number, len: number, color: number, opacity: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r, len, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
  // One exhaust per REAL engine nozzle (Falcon 9's 9-Merlin octaweb, Saturn V's
  // 5-F-1 quincunx, …) so multi-engine boosters light ALL bells, not just the
  // axis. Layout mirrors engineCluster's nozzle grid; re-laid-out on stage change
  // (the usually single-engine upper stage collapses to one central bell).
  const engSpec = opts.launcherId ? getLauncherEngines(opts.launcherId) : undefined;
  const stageNozzleLayout = (stageIdx: number): { offsets: [number, number][]; bellR: number } => {
    const st = engSpec?.stages[stageIdx];
    const offsets = clusterOffsets(st?.arrangement ?? 'single', st?.mainNozzles ?? 1);
    const anchor = (
      stageIdx >= 1 ? model.upperPlumeAnchor : model.boosterPlumeAnchor
    ) as THREE.Mesh;
    const geo = anchor.geometry as THREE.CylinderGeometry | undefined;
    const stageR = geo?.parameters?.radiusTop ?? rBody;
    const spread = Math.max(1, ...offsets.map(([x, z]) => Math.hypot(x, z)));
    const bellR = Math.min(stageR * 0.34, (stageR * 0.92) / (spread + 1));
    return { offsets, bellR };
  };
  const refBellR = Math.max(stageNozzleLayout(0).bellR, rBody * 0.18);
  const nozzleCount = Math.max(
    stageNozzleLayout(0).offsets.length,
    stageNozzleLayout(1).offsets.length,
  );
  const plume = new THREE.Group();
  const nozzlePlumes: THREE.Group[] = [];
  for (let i = 0; i < nozzleCount; i++) {
    const nz = new THREE.Group();
    nz.add(plumeCone(refBellR * 1.35, vehLen * 0.26, 0xff8a3c, 0.15));
    nz.add(plumeCone(refBellR * 0.85, vehLen * 0.2, 0xffcf80, 0.38));
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

  // Separation event METs (undefined ⇒ that beat never fires; the sep stays at rest).
  const metOf = (type: AscentEvent['type']): number | undefined =>
    opts.events?.find((e) => e.type === type)?.t;
  // The first-stage body drops at FIRST-STAGE burnout (MECO), not at strap-on
  // jettison — both push a 'staging' event, but `meco` fires only at the first
  // real stage burnout, so it's the correct drop time for boosted stacks
  // (Shuttle ET+SRBs at ~510 s, not the SRB sep at ~94 s). Falls back to the
  // lone 'staging' for un-boosted two-stage vehicles.
  const stagingT = metOf('meco') ?? metOf('staging');
  // Strap-on solids jettison at the FIRST 'staging' (their burnout, ~94 s for
  // Atlas V AJ-60As) — earlier than the core drop at MECO above.
  const strapOnSepT = metOf('staging');
  const fairingT = metOf('fairing_jettison');
  const secoT = metOf('seco');
  // Intermediate serial stage (e.g. Saturn V's S-II) drops at the SECOND core
  // staging. Core stagings = the 'staging' events after the strap-on jettison
  // (the first one, only when strap-ons exist); [0] is the booster drop (== MECO),
  // [1] is the mid-stage. Falls back to SECO so a 2-stage vehicle mapped onto a
  // 3-part mesh (e.g. Saturn IB) drops its mid-part with the upper stage instead
  // of leaving it floating.
  const coreStagingTimes = (opts.events ?? [])
    .filter((e) => e.type === 'staging')
    .map((e) => e.t)
    .sort((a, b) => a - b)
    .slice(strapOnGroup ? 1 : 0);
  const midStageSepT = coreStagingTimes[1] ?? secoT;
  const BOOSTER_SEP_S = 5;
  // Fairing clamshell drifts slowly (item 4) so the halves linger in frame while
  // the payload is revealed — a held beat, not a snap-away.
  const FAIRING_SEP_S = 6.5;
  // Payload deployment (#2): wings swing out + the bus blooms to full scale over
  // this window after SECO, as the spacecraft springs free of the upper stage.
  const PAYLOAD_DEPLOY_S = 3;

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

    // Orient along the flight path (velocity angle from vertical).
    const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
    const fromVertical = Math.atan2(horiz, Math.max(1e-6, s.velUpKms));
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

    // Strap-on solids: at burnout they fall back + tumble away from the still-
    // climbing core (earlier than the core drop above).
    if (strapOnGroup) {
      const sp = sepProgress(s.t, strapOnSepT, BOOSTER_SEP_S);
      strapOnGroup.visible = sp < 1;
      strapOnGroup.position.y = -sp * vehLen * 2.6;
      strapOnGroup.rotation.set(sp * 1.6, 0, 0);
      strapOnGroup.scale.setScalar(1 - 0.18 * sp);
    }

    // Payload separation. Two regimes: crewed capsules ride exposed on top;
    // everything else rides folded under a jettisonable fairing.
    const pp = sepProgress(s.t, secoT, PAYLOAD_SEP_HOLD_S);
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

      // While it rides the exposed stage (fairing gone → SECO) show the compact
      // STOWED shroud; at SECO it springs free as the real deployed model, wings
      // unfolding over the deploy window.
      const exposed = fairingT != null ? s.t >= fairingT : s.stageIndex < 0;
      const separated = secoT != null && s.t >= secoT;
      stowedPayload.visible = exposed && !separated;
      payload.visible = separated || (secoT == null && exposed);
      payload.position.y = payloadBaseY + pp * vehLen * 1.1;
      payload.rotation.y = s.t * 0.12;
      deployPayload(payload, sepProgress(s.t, secoT, PAYLOAD_DEPLOY_S));
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
    payloadBurst.update(sepProgress(s.t, secoT, BURST_S));

    // Plume: only while a stage burns; re-parent to the firing stage,
    // flicker the length, taper in vacuum.
    const burning = s.stageIndex >= 0;
    // A capsule has already separated by the injection beat, so its spent stage
    // must NOT re-light — only satellites ride the kick stage through injection.
    const injecting = injectionBurning && !isCapsulePayload;
    plume.visible = burning || injecting;
    if (burning) {
      const stageForPlume = s.stageIndex >= 1 ? 1 : 0;
      const firing = stageForPlume >= 1 ? model.upperPlumeAnchor : model.boosterPlumeAnchor;
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
      // S1 plume emanates from the octaweb; S2 from its vacuum bell.
      plume.position.y = -(s.stageIndex >= 1 ? vehLen * 0.14 : vehLen * 0.3);
    } else if (injecting) {
      // Post-SECO injection: the kick/upper stage re-lights — a long, thin
      // vacuum plume from the upper bell (the payload is still attached).
      const firing = model.upperPlumeAnchor;
      if (plume.parent !== firing) {
        plume.parent?.remove(plume);
        firing.add(plume);
      }
      if (plumeStage !== 1) {
        layoutPlumes(1);
        plumeStage = 1;
      }
      const flick = 1 + 0.09 * Math.sin(frame * 0.7);
      plume.scale.set(0.85, flick * 1.9, 0.85);
      plume.position.y = -(vehLen * 0.14);
    }

    // Camera: pick the active shot, compose its target pose, then EASE the live
    // camera toward it (position + fov) while snapping the look-at fast — a
    // shot change reads as a pan/dolly/zoom that keeps the vehicle in frame,
    // never a hard jump into a corner.
    const shot = schedule.length
      ? activeShotAt(schedule, s.t)
      : { name: 'ascent' as const, progress: 0.5 };
    activeShot = shot.name;
    // Capsule world position — feeds the separation/orbit shots so the camera
    // tracks the spacecraft (not the empty vehicle origin) once the spent stage
    // recedes. Rotate the payload's body-axis offset by the live vehicle attitude.
    const capsuleFocus = isCapsulePayload
      ? {
          x: s.downrangeKm - payload.position.y * Math.sin(vehicle.rotation.z),
          y: s.altKm + payload.position.y * Math.cos(vehicle.rotation.z),
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
    if (!camS) {
      camS = { px: p.px, py: p.py, pz: p.pz, tx: p.tx, ty: p.ty, tz: p.tz, fov: p.fov };
    } else {
      camS.px += (p.px - camS.px) * K_POS;
      camS.py += (p.py - camS.py) * K_POS;
      camS.pz += (p.pz - camS.pz) * K_POS;
      camS.tx += (p.tx - camS.tx) * K_TGT;
      camS.ty += (p.ty - camS.ty) * K_TGT;
      camS.tz += (p.tz - camS.tz) * K_TGT;
      camS.fov += (p.fov - camS.fov) * K_FOV;
    }
    camera.position.set(camS.px, camS.py, camS.pz);
    camera.lookAt(camS.tx, camS.ty, camS.tz);
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
