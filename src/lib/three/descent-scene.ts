/**
 * Descent scene — the /fly Entry, Descent & Landing render (RFC-034 §9), the
 * inverse of ascent-scene.ts. Consumes the headless descent trajectory
 * (integrateDescent) and stages a body-local Three.js scene: a curved lit
 * destination body (Moon / Mars / Venus, textured) that GROWS below a
 * descending lander, a per-body sky (airless black, thin Martian salmon, thick
 * Venusian amber), the EDL stack (aeroshell, parachute, skycrane / retro /
 * airbags) shedding its parts on the physics beats, a retro plume, and a
 * smooth cinematic camera. Kilometre scene units — the body centred a full
 * radius below the landing site so the surface sits at y=0 and the lander
 * descends toward it, the same "own frame" as the ascent scene.
 *
 * Mounted by DescentScene.svelte in /fly. Implements FlightPhaseScene so the
 * shared ascent-renderer composer drives it unchanged.
 */

import * as THREE from 'three';
import {
  bodyGravity,
  type DescentBody,
  type DescentEvent,
  type DescentState,
} from '$lib/orbital/descent-physics';
import { sepProgress } from '$lib/orbital/ascent-cameras';
import { buildDescentModel } from '$lib/three/descent-models';
import type { FlightPhaseScene, ForceKey } from '$lib/three/flight-phase-scene';

/** Body mean radius (km, scene units). */
const R_BODY_KM: Record<DescentBody, number> = { moon: 1737.4, mars: 3389.5, venus: 6051.8 };

/** Per-body sky/atmosphere grading — inverse of the ascent "blue → black". */
interface SkyConfig {
  high: THREE.Color; // colour at the entry interface (near space)
  low: THREE.Color; // colour just above the surface (in the murk)
  stars: boolean;
  fadeKm: number; // altitude over which sky transitions high → low
  rim?: { color: number; opacity: number };
}
const SKY: Record<DescentBody, SkyConfig> = {
  moon: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#05060c'),
    stars: true,
    fadeKm: 5,
  },
  mars: {
    high: new THREE.Color('#060608'),
    low: new THREE.Color('#c99a72'),
    stars: true,
    fadeKm: 55,
    rim: { color: 0xd8a882, opacity: 0.28 },
  },
  venus: {
    high: new THREE.Color('#2a1a0a'),
    low: new THREE.Color('#e0a84c'),
    stars: false,
    fadeKm: 90,
    rim: { color: 0xffb347, opacity: 0.5 },
  },
};

/** Rendered lander length (km, world units) — exaggerated so it reads against
 *  the body curvature, matching the ascent scene's treatment. */
export const DESCENT_VEHICLE_LENGTH_KM = 1.0;

/** Science-Lens force-vector palette (matches the HUD legend + ascent scene). */
export const FORCE_COLORS = {
  thrust: 0x54e08a,
  weight: 0xff5a5a,
  drag: 0x5aa0ff,
  velocity: 0x7fe0ff,
} as const;

export interface DescentSceneOptions {
  aspect: number;
  body: DescentBody;
  /** Surface texture URL (e.g. `${base}/textures/2k_mars.jpg`). */
  bodyTextureUrl?: string;
  /** Landing-site coordinates — orients the globe so the real geography sits under the lander. */
  landingSite?: { lat: number; lon: number };
  /** Exaggeration for the lander length (km). Default DESCENT_VEHICLE_LENGTH_KM. */
  vehicleLengthKm?: number;
  /** Landing-site id → the dedicated descent-stack + terminal lander model. */
  siteId: string;
  /** Descent beats — drives scrub-safe EDL separation timing. */
  events?: DescentEvent[];
  /** Peak aero-heating proxy from the summary — normalises the entry fireball
   *  glow so it peaks at peak heating regardless of body. */
  peakHeatFlux?: number;
}

export interface DescentScene extends FlightPhaseScene<DescentState> {
  /** The EDL phase active at the last setState() — for the HUD. */
  readonly activePhaseKind: string;
}

export function createDescentScene(opts: DescentSceneOptions): DescentScene {
  const vehLen = opts.vehicleLengthKm ?? DESCENT_VEHICLE_LENGTH_KM;
  const body = opts.body;
  const rBody = R_BODY_KM[body];
  const sky = SKY[body];

  const scene = new THREE.Scene();
  scene.background = sky.high.clone();
  const camera = new THREE.PerspectiveCamera(46, opts.aspect, 0.01, 120_000);

  // ── Lighting: a warm sun toward the camera hemisphere + a cool fill so the
  //    shadowed limb never crushes to black (×π for r155+ physical lights, #203).
  const sunDir = new THREE.Vector3(0.35, 0.55, 0.75).normalize();
  const sun = new THREE.DirectionalLight(0xfff4d0, 1.6 * Math.PI);
  sun.position.copy(sunDir).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xeeeeff, 0.7 * Math.PI));

  // ── Destination body: a big textured sphere a full radius below the landing
  //    site (surface at y=0), oriented so the site's geography sits under the
  //    lander. As altitude → 0 the camera follows the lander down and the body
  //    fills the frame — the "growing below" of a descent.
  const texLoader = new THREE.TextureLoader();
  let bodyTex: THREE.Texture | null = null;
  if (opts.bodyTextureUrl) {
    bodyTex = texLoader.load(opts.bodyTextureUrl);
    bodyTex.colorSpace = THREE.SRGBColorSpace;
  }
  const bodyMat = new THREE.MeshStandardMaterial({
    map: bodyTex ?? null,
    color: bodyTex ? 0xffffff : 0x9a6a4a,
    roughness: 0.92,
    metalness: 0.02,
  });
  const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(rBody, 128, 128), bodyMat);
  bodyMesh.position.set(0, -rBody, 0);
  const siteC = opts.landingSite ?? { lat: 0, lon: 0 };
  const latR = (siteC.lat * Math.PI) / 180;
  const lonR = (siteC.lon * Math.PI) / 180;
  const siteNormal = new THREE.Vector3(
    Math.cos(latR) * Math.cos(lonR),
    Math.sin(latR),
    -Math.cos(latR) * Math.sin(lonR),
  );
  bodyMesh.quaternion.setFromUnitVectors(siteNormal, new THREE.Vector3(0, 1, 0));
  scene.add(bodyMesh);

  // Thin atmospheric limb (Mars/Venus only) — one back-side rim glow.
  if (sky.rim) {
    const rim = new THREE.Mesh(
      new THREE.SphereGeometry(rBody + rBody * 0.012, 96, 96),
      new THREE.MeshBasicMaterial({
        color: sky.rim.color,
        transparent: true,
        opacity: sky.rim.opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    rim.position.copy(bodyMesh.position);
    scene.add(rim);
  }

  // ── Star field (airless bodies + high Mars) — golden-angle scatter.
  const starGeo = new THREE.BufferGeometry();
  const starN = 1600;
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
    new THREE.PointsMaterial({
      color: 0xdfeaff,
      size: 80,
      sizeAttenuation: true,
      transparent: true,
    }),
  );
  stars.visible = sky.stars;
  scene.add(stars);

  // ── Vehicle: the EDL descent stack. The scene animates its STANDARD parts
  //    (heat-shield, backshell, parachute, descent stage, airbags) so the EDL
  //    choreography is mission-agnostic.
  const vehicle = new THREE.Group();
  const rBodyRef = vehLen * 0.05; // plume scale reference
  const model = buildDescentModel(opts.siteId, body, vehLen);
  vehicle.add(model.root);
  scene.add(vehicle);

  // Retro plume — a layered downward exhaust, lit only while braking.
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
  const plume = new THREE.Group();
  plume.add(
    plumeCone(rBodyRef * 0.7, vehLen * 0.3, 0xff8a3c, 0.16),
    plumeCone(rBodyRef * 0.45, vehLen * 0.22, 0xffcf80, 0.4),
  );
  plume.rotation.z = Math.PI; // fire down (−Y)
  plume.visible = false;
  model.retroPlumeAnchor.add(plume);

  // ── Entry fireball — a plasma cap at the heat-shield + a wake streaming up
  //    behind the descending vehicle, glowing with the (normalised) aero-heating
  //    proxy so it peaks at peak heating then fades. The iconic hypersonic bow.
  const heatRef = Math.max(1, opts.peakHeatFlux ?? 1);
  const additive = (color: number, opacity: number): THREE.MeshBasicMaterial =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  const plasma = new THREE.Group();
  const plasmaCap = new THREE.Mesh(
    new THREE.SphereGeometry(vehLen * 0.5, 20, 16),
    additive(0xffe2b0, 0),
  );
  plasmaCap.position.y = -vehLen * 0.26; // bow shock at the heat-shield (below)
  plasmaCap.scale.y = 0.7;
  const plasmaTrail = new THREE.Mesh(
    new THREE.ConeGeometry(vehLen * 0.44, vehLen * 2.6, 20, 1, true),
    additive(0xff7a2c, 0),
  );
  plasmaTrail.position.y = vehLen * 1.25; // streams UP behind the descent
  plasma.add(plasmaCap, plasmaTrail);
  plasma.visible = false;
  vehicle.add(plasma);
  const plasmaCapMat = plasmaCap.material as THREE.MeshBasicMaterial;
  const plasmaTrailMat = plasmaTrail.material as THREE.MeshBasicMaterial;

  // ── Touchdown dust — a disc kicked up on the surface as the vehicle nears the
  //    ground under retro / airbags, flaring at touchdown. Body-tinted.
  const dustColor = body === 'mars' ? 0xc98a5a : body === 'venus' ? 0xd9a44a : 0xb8b3ad;
  const dust = new THREE.Mesh(new THREE.CircleGeometry(vehLen * 1.5, 40), additive(dustColor, 0));
  dust.rotation.x = -Math.PI / 2; // flat on the surface
  dust.position.y = vehLen * 0.02;
  dust.visible = false;
  const dustMat = dust.material as THREE.MeshBasicMaterial;
  scene.add(dust);

  // ── Science-Lens force vectors (thrust up / weight down / drag up / velocity down).
  const forces = new THREE.Group();
  forces.visible = false;
  const mkArrow = (hex: number): THREE.ArrowHelper =>
    new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      vehLen,
      hex,
      vehLen * 0.28,
      vehLen * 0.16,
    );
  const arrThrust = mkArrow(FORCE_COLORS.thrust);
  const arrWeight = mkArrow(FORCE_COLORS.weight);
  const arrDrag = mkArrow(FORCE_COLORS.drag);
  const arrVel = mkArrow(FORCE_COLORS.velocity);
  forces.add(arrThrust, arrWeight, arrDrag, arrVel);
  scene.add(forces);
  let showForces = false;
  const forceVisible: Record<ForceKey, boolean> = {
    thrust: false,
    weight: false,
    drag: false,
    velocity: false,
  };
  const anyForceOn = (): boolean =>
    forceVisible.thrust || forceVisible.weight || forceVisible.drag || forceVisible.velocity;
  let lastState: DescentState | null = null;

  // Force scaling: thrust + weight share a scale so their balance reads honestly.
  const FORCE_REF_N = 60_000; // maps to ~2·vehLen
  const DRAG_REF_N = 200_000;
  const SPEED_REF_MS = 300;
  const _v = new THREE.Vector3();
  const updateForces = (s: DescentState): void => {
    const origin = new THREE.Vector3(0, s.altKm, 0);
    const setArrow = (arr: THREE.ArrowHelper, key: ForceKey, dy: number, lenKm: number): void => {
      const on = forceVisible[key] && lenKm > vehLen * 0.05 && dy !== 0;
      arr.visible = on;
      if (!on) return;
      arr.position.copy(origin);
      _v.set(0, dy, 0).normalize();
      arr.setDirection(_v);
      arr.setLength(lenKm, vehLen * 0.28, vehLen * 0.16);
    };
    // Thrust — retro, up.
    setArrow(arrThrust, 'thrust', 1, s.thrustN > 0 ? (s.thrustN / FORCE_REF_N) * vehLen * 2 : 0);
    // Weight — toward the body centre, down.
    const weightN = s.massKg * bodyGravity(s.altM, body);
    setArrow(arrWeight, 'weight', -1, (weightN / FORCE_REF_N) * vehLen * 2);
    // Velocity — descending, down.
    setArrow(arrVel, 'velocity', -1, (s.velocityMs / SPEED_REF_MS) * vehLen * 2);
    // Drag — opposes the descent, up.
    setArrow(arrDrag, 'drag', 1, (s.dragN / DRAG_REF_N) * vehLen * 1.4);
  };

  // Separation event METs (undefined ⇒ that beat never fires).
  const metOf = (type: DescentEvent['type']): number | undefined =>
    opts.events?.find((e) => e.type === type)?.t;
  const hsT = metOf('heatshield_sep');
  const bsT = metOf('backshell_sep');
  const chuteT = metOf('parachute_deploy');
  const airbagT = metOf('airbag_deploy');
  const HS_SEP_S = 3;
  const BS_SEP_S = 3;

  // Smooth-camera convergence (mirrors the ascent scene).
  let camS: {
    px: number;
    py: number;
    pz: number;
    tx: number;
    ty: number;
    tz: number;
    fov: number;
  } | null = null;
  const K_POS = 0.12;
  const K_TGT = 0.45;
  const K_FOV = 0.12;
  let frame = 0;
  let activePhaseKind = 'ballistic_entry';

  /** Per-phase camera framing (distance / height / fov) around the lander. */
  const shotFor = (s: DescentState): { dist: number; height: number; fov: number } => {
    switch (s.phaseKind) {
      case 'ballistic_entry':
        return { dist: 9, height: 2.4, fov: 54 };
      case 'parachute':
        return { dist: 6, height: 1.6, fov: 48 };
      case 'aeroshell_descent':
        return { dist: 7, height: 1.2, fov: 50 };
      case 'powered_retro':
        return { dist: 4.6, height: 0.9, fov: 44 };
      case 'skycrane':
        return { dist: 4.2, height: 0.7, fov: 42 };
      case 'airbag_bounce':
        return { dist: 3.6, height: 0.4, fov: 42 };
      default:
        return { dist: 5, height: 1, fov: 46 };
    }
  };

  const setState = (s: DescentState): void => {
    frame++;
    activePhaseKind = s.phaseKind;
    vehicle.position.set(0, s.altKm, 0);

    // Sky: space-black high → the body's near-surface atmosphere colour low.
    const skyT = Math.min(1, Math.max(0, 1 - s.altKm / sky.fadeKm));
    (scene.background as THREE.Color).copy(sky.high).lerp(sky.low, skyT);
    if (sky.stars) (stars.material as THREE.PointsMaterial).opacity = 1 - skyT * 0.85;

    // ── EDL separations — pure functions of the mission time vs event METs, so
    //    scrubbing the timeline is exact.
    // Heat-shield: jettisons DOWNWARD (below, toward the surface), tumbling in
    // two axes and shrinking as it recedes.
    const hp = sepProgress(s.t, hsT, HS_SEP_S);
    model.heatshield.visible = model.heatshield.geometry != null && hp < 1;
    model.heatshield.position.y = model.heatshieldBaseY - hp * vehLen * 5;
    model.heatshield.position.x = hp * vehLen * 0.6;
    model.heatshield.rotation.set(Math.PI + hp * 4, 0, hp * 2.6);
    model.heatshield.scale.setScalar(1 - 0.4 * hp);

    // Parachute: mortar-fires and INFLATES over ~2 s at deploy, sways under the
    // descent, then flies away UP with the backshell (chute-cut) at sep.
    const bp = sepProgress(s.t, bsT, BS_SEP_S);
    const chuteOut = chuteT != null && s.t >= chuteT;
    model.parachute.visible = chuteOut && bp < 1;
    if (model.parachute.visible) {
      const inflate = Math.min(1, Math.max(0, (s.t - (chuteT ?? 0)) / 2));
      const sway = Math.sin(frame * 0.05) * 0.09 * (1 - bp);
      model.parachute.scale.set(0.35 + 0.65 * inflate, 0.5 + 0.5 * inflate, 0.35 + 0.65 * inflate);
      model.parachute.rotation.z = sway + bp * 0.9;
    }
    model.backshell.visible = bp < 1;
    const rise = bp * vehLen * 4;
    model.parachute.position.set(bp * vehLen * 0.5, model.parachuteBaseY + rise, 0);
    model.backshell.position.y = model.backshellBaseY + rise;
    model.backshell.rotation.z = bp * 1.6;

    // Skycrane rigging: shown only during the skycrane phase.
    model.skycraneRigging.visible = s.phaseKind === 'skycrane';

    // Airbags: inflate at deploy, then hidden once past bounce (near ground).
    if (airbagT != null) {
      const inflate = Math.min(1, Math.max(0, (s.t - airbagT) / 1.5));
      model.airbags.visible = s.t >= airbagT;
      model.airbags.scale.setScalar(0.2 + 0.8 * inflate);
    }

    // Retro plume: only while braking (powered / skycrane / lunar powered).
    const braking = s.phaseKind === 'powered_retro' || s.phaseKind === 'skycrane';
    plume.visible = braking;
    if (braking) {
      const flick = 1 + 0.1 * Math.sin(frame * 0.7) + 0.05 * Math.sin(frame * 1.9);
      plume.scale.set(1, flick, 1);
    }

    // Entry fireball: glow tracks the normalised aero-heating proxy — the
    // hypersonic bow that peaks at peak heating then dies as the vehicle slows.
    const heat = Math.min(1, s.aeroHeatFlux / heatRef);
    const inEntry = s.phaseKind === 'ballistic_entry' || s.phaseKind === 'aeroshell_descent';
    plasma.visible = inEntry && heat > 0.04;
    if (plasma.visible) {
      const flick = 0.85 + 0.15 * Math.sin(frame * 1.3);
      plasmaCapMat.opacity = 0.7 * heat * flick;
      plasmaTrailMat.opacity = 0.45 * heat * flick;
      plasma.scale.set(1, 0.7 + 0.7 * heat, 1);
    }

    // Touchdown dust: ramps up as the vehicle nears the ground under retro /
    // airbags, and flares at touchdown.
    const nearGround = s.altKm < vehLen * 0.5;
    const kicking = nearGround && (braking || s.phaseKind === 'airbag_bounce' || s.altM <= 0);
    dust.visible = kicking;
    if (kicking) {
      const prox = 1 - Math.min(1, s.altKm / (vehLen * 0.5)); // 0 far → 1 at ground
      const amt = Math.max(prox, s.altM <= 0 ? 1 : 0);
      dustMat.opacity = 0.3 * amt;
      dust.scale.setScalar(0.5 + 1.3 * amt);
    }

    // Camera: compose a per-phase target pose, ease the live camera toward it.
    const sh = shotFor(s);
    const angle = 0.6 + frame * 0.0006; // gentle cinematic drift
    const dist = sh.dist * vehLen;
    const px = Math.sin(angle) * dist;
    const py = s.altKm + sh.height * vehLen;
    const pz = Math.cos(angle) * dist;
    // Look slightly below the lander so the surface stays in frame as it nears.
    const tx = 0;
    const ty = s.altKm - Math.min(s.altKm, dist * 0.25);
    const tz = 0;
    if (!camS) {
      camS = { px, py, pz, tx, ty, tz, fov: sh.fov };
    } else {
      camS.px += (px - camS.px) * K_POS;
      camS.py += (py - camS.py) * K_POS;
      camS.pz += (pz - camS.pz) * K_POS;
      camS.tx += (tx - camS.tx) * K_TGT;
      camS.ty += (ty - camS.ty) * K_TGT;
      camS.tz += (tz - camS.tz) * K_TGT;
      camS.fov += (sh.fov - camS.fov) * K_FOV;
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
    model.heatshield.visible = model.heatshield.geometry != null;
    model.heatshield.position.set(0, model.heatshieldBaseY, 0);
    model.heatshield.rotation.set(Math.PI, 0, 0);
    model.heatshield.scale.setScalar(1);
    model.backshell.visible = true;
    model.backshell.position.y = model.backshellBaseY;
    model.backshell.rotation.set(0, 0, 0);
    model.parachute.visible = false;
    model.parachute.position.set(0, model.parachuteBaseY, 0);
    model.parachute.scale.setScalar(1);
    model.airbags.visible = false;
    model.skycraneRigging.visible = false;
    plume.visible = false;
    plasma.visible = false;
    dust.visible = false;
    camS = null;
  };
  const dispose = (): void => {
    bodyTex?.dispose();
    scene.traverse((o) => {
      const mm = o as THREE.Mesh;
      if (mm.geometry) mm.geometry.dispose();
      const mat = mm.material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
  };

  return {
    scene,
    camera,
    setState,
    setAspect,
    get activePhaseKind() {
      return activePhaseKind;
    },
    setForcesVisible,
    setForceVisible,
    snapCamera: () => {
      camS = null;
    },
    reset,
    dispose,
  };
}
