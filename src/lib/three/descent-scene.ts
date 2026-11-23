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
import { buildDescentShots, descentPoseAt } from '../orbital/descent-director';
import { BoldArrow } from './bold-arrow';
import { SeparationBurst } from './separation-burst';
import {
  bodyGravity,
  type DescentBody,
  type DescentEvent,
  type DescentState,
} from '$lib/physics/descent/descent-physics';
import { R_BODY_M } from '$lib/physics/descent/descent-physics-constants';
import { sepProgress } from '$lib/orbital/ascent-cameras';
import { buildDescentModel } from '$lib/three/descent-models';
import type { FlightPhaseScene, ForceKey } from '$lib/three/flight-phase-scene';

/** Body mean radius (km, scene units). */
const R_BODY_KM: Record<DescentBody, number> = {
  moon: 1737.4,
  mars: 3389.5,
  venus: 6051.8,
  titan: 2574.7,
  earth: 6371,
  jupiter: 69911,
  mercury: 2439.7,
  comet_67p: 1.72,
  itokawa: 0.165,
  ryugu: 0.448,
  bennu: 0.245,
  eros: 8.42,
};

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
  // Airless like the Moon — black sky to the horizon, stars in daylight.
  mercury: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#0a0806'),
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
  titan: {
    high: new THREE.Color('#0a0805'),
    low: new THREE.Color('#c88a3c'),
    stars: false, // opaque orange haze
    fadeKm: 200,
    rim: { color: 0xd8933c, opacity: 0.45 },
  },
  // Earth re-entry — the inverse of a launch: black space at the entry
  // interface fades to a bright blue daytime sky as the capsule drops into
  // the troposphere, with the iconic blue atmospheric limb on the horizon.
  earth: {
    high: new THREE.Color('#02040a'),
    low: new THREE.Color('#6fa8dc'),
    stars: true,
    fadeKm: 100,
    rim: { color: 0x6fb7ff, opacity: 0.45 },
  },
  jupiter: {
    high: new THREE.Color('#0b0805'),
    low: new THREE.Color('#c8a878'),
    stars: false, // deep banded cloud murk (no surface)
    fadeKm: 300,
    rim: { color: 0xd8b88a, opacity: 0.4 },
  },
  // Airless micro-g bodies — black sky, stars, near-instant fade.
  comet_67p: {
    high: new THREE.Color('#020305'),
    low: new THREE.Color('#050608'),
    stars: true,
    fadeKm: 2,
  },
  itokawa: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#05060c'),
    stars: true,
    fadeKm: 1,
  },
  ryugu: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#05060c'),
    stars: true,
    fadeKm: 1,
  },
  bennu: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#05060c'),
    stars: true,
    fadeKm: 1,
  },
  eros: {
    high: new THREE.Color('#03040a'),
    low: new THREE.Color('#05060c'),
    stars: true,
    fadeKm: 2,
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
  velocity: 0x8aa0ff,
} as const;

export interface DescentSceneOptions {
  aspect: number;
  /** Trajectory length (s): the camera director cuts its shots across it. */
  durationS?: number;
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
  /** `prior`: the state a moment earlier on the trajectory, from which an airless lander's
   *  braking attitude is read (scrub-exact). */
  setState(s: DescentState, prior?: DescentState): void;
}

/**
 * Starship's pitch (vehicle rotation about z) on its return: belly-first (π/2, body level) until
 * the landing flip, then upright, engines down (0), over `flipS` (smoothstep). Pure.
 */
export function starshipPitch(t: number, flipT: number, flipS: number): number {
  const f = Math.min(1, Math.max(0, (t - flipT) / flipS));
  return (Math.PI / 2) * (1 - f * f * (3 - 2 * f));
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
  const sun = new THREE.DirectionalLight(0xfff4d0, 1.0 * Math.PI);
  sun.position.copy(sunDir).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xeeeeff, 0.3 * Math.PI));

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
  // Rest bounds of each flying part (in its parent's frame), for the director to frame what is
  // actually there: the aeroshell, the craft, a sky crane climbing off the rover on its bridles.
  const restBox = (o: THREE.Object3D): THREE.Box3 | null => {
    model.root.updateMatrixWorld(true);
    const inv = o.parent ? o.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
    const b = new THREE.Box3();
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh || mesh.name === 'mlePlume') return;
      for (let p: THREE.Object3D | null = mesh; p && p !== o.parent; p = p.parent)
        if (p.userData.surfaceOnly) return;
      mesh.geometry.computeBoundingBox();
      b.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));
    });
    if (b.isEmpty()) return null;
    // Relative to the part's own position, so its live position can be added back.
    return b.translate(o.position.clone().negate());
  };
  // An airbag lander rides in its ball's pivot: framed as a sphere of the ball's live size.
  const ball = model.airbagBall;
  let ballR = ball?.restY ?? 0;
  const parts: { o: THREE.Object3D; box: THREE.Box3 }[] = [];
  for (const o of [model.lander, model.descentStage, model.backshell, model.heatshield]) {
    if (ball && o === model.lander) continue;
    const box = restBox(o);
    if (box) parts.push({ o, box });
  }
  const liveCore = (t: number): { cy: number; r: number } => {
    // An opening lander (Beagle 2's lid and panels): frame its whole opened span.
    if (ball?.openSpan && petalsT != null && t >= petalsT)
      return { cy: ball.restY, r: ball.openSpan * 0.6 };
    const b = new THREE.Box3();
    if (ball && model.lander.visible) {
      const c = ball.pivot.position;
      b.setFromCenterAndSize(c.clone(), new THREE.Vector3(2 * ballR, 2 * ballR, 2 * ballR));
    }
    for (const p of parts) {
      if (!p.o.visible) continue;
      // The jettisoned heat shield falls away: not part of the subject once it goes.
      if (p.o === model.heatshield && p.o.position.y < model.heatshieldBaseY - vehLen * 0.2)
        continue;
      b.union(p.box.clone().translate(p.o.position));
    }
    if (b.isEmpty()) return { cy: vehLen * 0.3, r: vehLen * 0.62 };
    const c = b.getCenter(new THREE.Vector3());
    const sz = b.getSize(new THREE.Vector3());
    return { cy: c.y, r: Math.max(sz.y, Math.hypot(sz.x, sz.z) * 0.8) * 0.55 };
  };

  // Surface-only deployables (planted flag, driven-off rover, splayed petals) are
  // baked into the reused LANDED model but must NOT show while the craft is still
  // flying. Collect them once; the scene reveals them only at touchdown.
  // How far the deployed chute reaches above its attachment (vehicle lengths): MSL's 50 m
  // system towers about nine aeroshell lengths over the capsule.
  const chuteSpan =
    new THREE.Box3().setFromObject(model.parachute).max.y / vehLen - model.parachuteBaseY / vehLen;
  const mainSpan = model.mainChute
    ? new THREE.Box3().setFromObject(model.mainChute.group).max.y / vehLen
    : 0;
  const surfaceOnly: THREE.Object3D[] = [];
  const flightOnly: THREE.Object3D[] = []; // the reverse: Apollo's contact probes
  model.lander.traverse((o) => {
    if (o.userData?.surfaceOnly) surfaceOnly.push(o);
    if (o.userData?.flightOnly) flightOnly.push(o);
  });

  // Separation-event bursts (flash + debris) at the heat-shield jettison and the
  // backshell / chute-cut. Parented to the vehicle at the sep planes; driven by
  // sepProgress in updateForces() so they stay scrub-exact.
  const DESCENT_BURST_S = 2.2;
  const heatshieldBurst = new SeparationBurst({ scale: vehLen * 0.5, particleColor: 0xffd9b0 });
  heatshieldBurst.position.y = model.heatshieldBaseY;
  vehicle.add(heatshieldBurst);
  const backshellBurst = new SeparationBurst({ scale: vehLen * 0.44, particleColor: 0xeaf1ff });
  backshellBurst.position.y = model.backshellBaseY;
  vehicle.add(backshellBurst);

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
  // Starship (Flight 5) re-enters belly-first: the shock glow stretches along the belly (world X,
  // the plasma group is held level), and there is no capsule wake column.
  if (opts.events?.some((e) => e.type === 'landing_flip')) {
    plasmaCap.scale.set(3.2, 0.45, 0.9);
    plasmaTrail.visible = false;
  }
  plasma.add(plasmaCap, plasmaTrail);
  plasma.visible = false;
  vehicle.add(plasma);
  const plasmaCapMat = plasmaCap.material as THREE.MeshBasicMaterial;
  const plasmaTrailMat = plasmaTrail.material as THREE.MeshBasicMaterial;

  // ── Touchdown dust — a disc kicked up on the surface as the vehicle nears the
  //    ground under retro / airbags, flaring at touchdown. Body-tinted.
  // Starship (Flight 5) lands its burn on the sea: white spray, not grey dust.
  const overSea = opts.events?.some((e) => e.type === 'landing_flip') === true;
  const dustColor =
    body === 'mars' ? 0xc98a5a : body === 'venus' ? 0xd9a44a : overSea ? 0xe4edf3 : 0xb8b3ad;
  // Starship's three Raptors light a far bigger flame than a lander's retro (the plume is sized
  // off a capsule-scale body).
  const plumeK = overSea ? 2.5 : 1;
  const dust = new THREE.Mesh(new THREE.CircleGeometry(vehLen * 1.5, 40), additive(dustColor, 0));
  dust.rotation.x = -Math.PI / 2; // flat on the surface
  dust.position.y = vehLen * 0.02;
  dust.visible = false;
  const dustMat = dust.material as THREE.MeshBasicMaterial;
  scene.add(dust);

  // ── Science-Lens force vectors (thrust up / weight down / drag up / velocity down).
  const forces = new THREE.Group();
  forces.visible = false;
  const mkArrow = (hex: number): BoldArrow =>
    new BoldArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), vehLen, hex);
  const arrThrust = mkArrow(FORCE_COLORS.thrust);
  const arrWeight = mkArrow(FORCE_COLORS.weight);
  const arrDrag = mkArrow(FORCE_COLORS.drag);
  const arrVel = mkArrow(FORCE_COLORS.velocity);
  arrThrust.setLabel('RETRO', '#8fe8b0');
  arrWeight.setLabel('WEIGHT', '#ffb3b3');
  arrDrag.setLabel('DRAG', '#a8c8ff');
  arrVel.setLabel('VELOCITY', '#c4d0ff');
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
    const origin = new THREE.Vector3(0, vehicle.position.y, 0);
    const setArrow = (arr: BoldArrow, key: ForceKey, dy: number, lenKm: number): void => {
      const on = forceVisible[key] && lenKm > vehLen * 0.05 && dy !== 0;
      arr.visible = on;
      if (!on) return;
      arr.position.copy(origin);
      _v.set(0, dy, 0).normalize();
      arr.setDirection(_v);
      // Head proportional to arrow length so the aspect matches the coast arrows.
      arr.setLength(lenKm, lenKm * 0.3, lenKm * 0.1);
    };
    // Thrust — retro, up.
    setArrow(arrThrust, 'thrust', 1, s.thrustN > 0 ? (s.thrustN / FORCE_REF_N) * vehLen * 1.0 : 0);
    // Weight — toward the body centre, down.
    const weightN = s.massKg * bodyGravity(s.altM, body);
    setArrow(arrWeight, 'weight', -1, (weightN / FORCE_REF_N) * vehLen * 1.0);
    // Velocity — descending, down.
    setArrow(arrVel, 'velocity', -1, (s.velocityMs / SPEED_REF_MS) * vehLen * 1.0);
    // Drag — opposes the descent, up.
    setArrow(arrDrag, 'drag', 1, (s.dragN / DRAG_REF_N) * vehLen * 0.7);
  };

  // Separation event METs (undefined ⇒ that beat never fires).
  const metOf = (type: DescentEvent['type']): number | undefined =>
    opts.events?.find((e) => e.type === type)?.t;
  const hsT = metOf('heatshield_sep');
  const bsT = metOf('backshell_sep');
  const chuteT = metOf('parachute_deploy');
  // Two-stage chutes: parts marked chuteStage 1 (a drogue, Huygens' main, Venera's chute) are
  // released at parachute_jettison; parts marked 2 (capsule mains, Huygens' stabiliser) open then.
  const chuteJetT = metOf('parachute_jettison');
  const airbagT = metOf('airbag_deploy');
  const flipT = metOf('entry_flip');
  // Starship (Flight 5): belly-first through entry, then the landing flip to tail-down as the
  // landing burn lights, over LANDING_FLIP_S.
  const landingFlipT = metOf('landing_flip');
  const LANDING_FLIP_S = 4;
  const touchdownT = metOf('touchdown');
  // A lander with a contact beat (Apollo's probes, the engine cutoff): the last LOW_SCALE_ALT_M
  // are drawn at the craft's own scale, as the airbag ball's are. The craft is drawn about 36 times
  // its real size, so a 1.7 m probe reach or a 1 m drop would be lost in the km altitude.
  const cutoffT = metOf('engine_cutoff');
  const metresToScene = model.lander.userData.metresToScene as number | undefined;
  const lowK =
    !ball && metresToScene != null && (cutoffT != null || metOf('contact_light') != null)
      ? metresToScene
      : null;
  const LOW_SCALE_ALT_M = 60;
  // Airbag landers: the bridle, the cut (the backshell's flyaway when there is no backshell_sep),
  // the bounces and roll after first contact, rest, and the petals.
  const bridleT = metOf('bridle_lower');
  const cutT = metOf('bridle_cut');
  const restT = metOf('at_rest');
  const petalsT = metOf('petals_open');
  const shellSepT = bsT ?? cutT;
  const tdDownrangeKm = opts.events?.find((e) => e.type === 'touchdown')?.downrangeKm ?? 0;
  const BRIDLE_S = 6; // MER's bridle paid out in about 6 s (MER landing press kit)
  const INFLATE_S = 1; // drawn over a second; Pathfinder's bags filled in about 0.3 s
  const RETRACT_S = 6; // the real retraction took about an hour: at_rest/petals notes say so
  const PETAL_S = 6;
  const CHUTE_RELEASE_S = 4; // Beagle 2's main chute lets go at first impact and drifts off
  const BALL_SCALE_ALT_M = 30;
  const lowerT = metOf('skycrane_lower');
  const LOWER_S = 6;
  const FLYAWAY_S = 10;
  const smooth01 = (x: number): number => {
    const c = Math.min(1, Math.max(0, x));
    return c * c * (3 - 2 * c);
  };
  // Slow the EDL separations (item 4) so heat-shield jettison + chute-cut linger
  // as a held beat rather than a snap.
  const HS_SEP_S = 4.5;
  const BS_SEP_S = 4.5;
  // Entry attitude flip: hold tip-first for FLIP_HOLD_S after the beat, then pitch
  // to heat-shield-forward over FLIP_S (descent-seconds; the beat is slow-mo'd).
  const FLIP_HOLD_S = 6;
  const FLIP_S = 30;
  // Apollo CSM/LM undock: hold docked, then the CSM separates over UNDOCK_S.
  const UNDOCK_HOLD_S = 3;
  const UNDOCK_S = 16;

  // The camera director: cuts and moves keyed to trajectory time (descent-director.ts).
  const shots = buildDescentShots(
    opts.durationS ?? opts.events?.find((e) => e.type === 'touchdown')?.t ?? 600,
    opts.events ?? [],
    opts.siteId,
  );
  let frame = 0;
  let activePhaseKind = 'ballistic_entry';

  // Powered-descent attitude on an airless body: the lander points its engine along its
  // thrust, which tilts from vertical by the horizontal braking it must do against the
  // vertical support it needs (gravity less the orbital relief of its horizontal speed). An
  // Apollo LM brakes almost horizontally from 1.7 km/s and pitches upright only near the
  // ground. From the trajectory itself when the caller passes the state a moment earlier
  // (`prior`), so a scrub shows the attitude of the moment shown; else from successive frames
  // (held across a jump — the 20 s-before-touchdown frame kept the braking tilt, operator
  // 2026-11-23).
  let tiltRad = 0;
  let prevT: number | null = null;
  let prevVh = 0;
  let prevVd = 0;
  const airless = body === 'moon' || body === 'eros';
  const tiltFrom = (a: DescentState, b: DescentState, dt: number): number => {
    const vhOf = (x: DescentState) =>
      Math.sqrt(Math.max(0, x.velocityMs * x.velocityMs - x.velDownMs * x.velDownMs));
    const g = bodyGravity(b.altM, body);
    const vh = vhOf(b);
    const aH = Math.max(0, (vhOf(a) - vh) / dt);
    const aV = Math.max(
      0.05,
      g - (vh * vh) / (R_BODY_M[body] + b.altM) + (a.velDownMs - b.velDownMs) / dt,
    );
    return Math.atan2(aH, aV);
  };
  const setState = (s: DescentState, prior?: DescentState): void => {
    frame++;
    activePhaseKind = s.phaseKind;
    // An airbag ball's last BALL_SCALE_ALT_M (the bridle cut, the fall, the hops) are drawn at the
    // craft's own scale: in km the 21 m fall and a 16 m bounce would be a hundredth of the drawn
    // ball. Above, the km altitude continues from there (a constant lift; continuous, monotone).
    const inTail = ball != null && touchdownT != null && s.t > touchdownT;
    const craftY = lowK
      ? s.altM <= LOW_SCALE_ALT_M
        ? s.altM * lowK
        : LOW_SCALE_ALT_M * lowK + (s.altM - LOW_SCALE_ALT_M) / 1000
      : !ball
        ? s.altKm
        : s.altM <= BALL_SCALE_ALT_M
          ? s.altM * ball.k
          : BALL_SCALE_ALT_M * ball.k + (s.altM - BALL_SCALE_ALT_M) / 1000;
    vehicle.position.set(0, craftY, 0);
    const vd = s.velDownMs;
    const vh = Math.sqrt(Math.max(0, s.velocityMs * s.velocityMs - vd * vd));
    if (airless && s.phaseKind === 'powered_retro' && s.altM > 0 && prior && s.t - prior.t > 0.5) {
      tiltRad = tiltFrom(prior, s, s.t - prior.t);
    } else if (airless && s.phaseKind === 'powered_retro' && s.altM > 0) {
      const dt = prevT == null ? 0 : s.t - prevT;
      if (dt > 0 && dt < 5) {
        const g = bodyGravity(s.altM, body);
        const aH = Math.max(0, (prevVh - vh) / dt);
        const aV = Math.max(0.05, g - (vh * vh) / (R_BODY_M[body] + s.altM) + (prevVd - vd) / dt);
        const target = Math.atan2(aH, aV);
        tiltRad += (target - tiltRad) * Math.min(1, dt * 0.5);
      }
    } else if (s.altM <= 0 || s.phaseKind !== 'powered_retro') {
      tiltRad = 0;
    }
    prevT = s.t;
    prevVh = vh;
    prevVd = vd;
    vehicle.rotation.z = airless ? tiltRad : 0;

    // Sky: space-black high → the body's near-surface atmosphere colour low.
    const skyT = Math.min(1, Math.max(0, 1 - s.altKm / sky.fadeKm));
    (scene.background as THREE.Color).copy(sky.high).lerp(sky.low, skyT);
    if (sky.stars) (stars.material as THREE.PointsMaterial).opacity = 1 - skyT * 0.85;

    // ── EDL separations — pure functions of the mission time vs event METs, so
    //    scrubbing the timeline is exact.
    let undocking = false;
    // Heat-shield: jettisons DOWNWARD (below, toward the surface), tumbling in
    // two axes and shrinking as it recedes.
    const hp = sepProgress(s.t, hsT, HS_SEP_S);
    model.heatshield.visible = model.heatshield.geometry != null && hp < 1;
    model.heatshield.position.y = model.heatshieldBaseY - hp * vehLen * 5;
    model.heatshield.position.x = hp * vehLen * 0.6;
    model.heatshield.rotation.set(Math.PI + hp * 4, 0, hp * 2.6);
    // Gentle shrink only (item 4) — the downward drift recedes it via perspective;
    // keep it readable as the jettisoned shield tumbling toward the surface.
    model.heatshield.scale.setScalar(1 - 0.18 * hp);

    // Parachute: mortar-fires and INFLATES over ~2 s at deploy, sways under the
    // descent, then flies away UP with the backshell (chute-cut) at sep.
    const bp = sepProgress(s.t, shellSepT, BS_SEP_S);
    const chuteOut = chuteT != null && s.t >= chuteT;
    model.parachute.visible = chuteOut && bp < 1;
    const secondStage = chuteJetT != null && s.t >= chuteJetT;
    let anyStage = false;
    model.parachute.traverse((o) => {
      const stage = o.userData.chuteStage as number | undefined;
      if (stage == null) return;
      o.visible = stage === (secondStage ? 2 : 1);
      if (o.visible) anyStage = true;
    });
    if (secondStage && !anyStage) model.parachute.visible = false; // released, nothing follows
    if (model.parachute.visible) {
      const openT = secondStage ? chuteJetT : (chuteT ?? 0);
      const inflate = Math.min(1, Math.max(0, (s.t - openT) / 2));
      const sway = Math.sin(frame * 0.05) * 0.09 * (1 - bp);
      model.parachute.scale.set(0.35 + 0.65 * inflate, 0.5 + 0.5 * inflate, 0.35 + 0.65 * inflate);
      model.parachute.rotation.z = sway + bp * 0.9;
    }
    model.backshell.visible = bp < 1;
    // Airbag lander: it slides down the bridle (the backshell and chute climb above it, the ball
    // stays on the trajectory), the bags inflate (the ball's bottom rides the trajectory point),
    // the RAD rockets fire, the bridle is cut; on the ground the ball rolls, comes to rest, the
    // bags retract, it rights itself and the petals open.
    let hang = 0;
    if (ball) {
      const lp = smooth01(bridleT == null ? 0 : (s.t - bridleT) / BRIDLE_S);
      const inflate = airbagT == null ? 0 : smooth01((s.t - airbagT) / INFLATE_S);
      const retract = restT == null ? 0 : smooth01((s.t - restT) / RETRACT_S);
      const lift = (ball.radius - ball.restY) * inflate * (1 - retract);
      ball.pivot.position.y = ball.restY + lift;
      hang = ball.bridleLength * lp + lift;
      model.airbags.visible = inflate > 0 && retract < 1;
      const bagK = (0.15 + 0.85 * inflate) * (1 - 0.8 * retract);
      model.airbags.scale.set(bagK, bagK * (1 - 0.5 * retract), bagK);
      ballR = Math.max(ball.restY, ball.radius * bagK);
      // Rolling without slipping: the angle is the ground covered over the ball's radius.
      const rolledM = inTail ? (s.downrangeKm - tdDownrangeKm) * 1000 : 0;
      const roll = (rolledM * ball.k) / ball.radius;
      ball.pivot.rotation.set(roll * (1 - retract), 0, 0.35 * Math.sin(roll * 0.6) * (1 - retract));
      ball.bridle.visible = lp > 0 && (shellSepT == null || s.t < shellSepT);
      if (ball.bridle.visible) {
        const from = ball.pivot.position.y;
        ball.bridle.position.y = from;
        ball.bridle.scale.y = Math.max(1e-4, model.backshellBaseY + hang - from);
      }
      const radOn = s.phaseKind === 'powered_retro' && (cutT == null || s.t < cutT);
      for (const p of ball.radPlumes) {
        p.visible = radOn;
        p.scale.y = 1 + 0.12 * Math.sin(frame * 0.9 + p.id);
      }
      const open = petalsT == null ? 0 : smooth01((s.t - petalsT) / PETAL_S);
      for (const pt of ball.petals) pt.rotation.x = -ball.petalClosedRad * (1 - open);
      for (const o of ball.inside) o.visible = open > 0;
      ball.unfold?.(open);
    }

    // A main chute that stays on the lander when the backshell and pilot leave (Beagle 2): opens
    // at parachute_jettison, rides the ball up as the bags inflate, is released at first contact.
    const main = model.mainChute;
    if (main) {
      const gone = touchdownT == null ? 0 : smooth01((s.t - touchdownT) / CHUTE_RELEASE_S);
      main.group.visible = secondStage && gone < 1;
      if (main.group.visible) {
        const inflate = Math.min(1, Math.max(0, (s.t - (chuteJetT ?? 0)) / 2));
        const sway = Math.sin(frame * 0.05) * 0.09 * (1 - gone);
        main.group.scale.set(0.35 + 0.65 * inflate, 0.5 + 0.5 * inflate, 0.35 + 0.65 * inflate);
        main.group.rotation.z = sway + gone * 0.9;
        main.group.position.set(gone * vehLen * 1.5, main.baseY + hang + gone * vehLen * 6, 0);
      }
    }

    const rise = bp * vehLen * 4;
    model.parachute.position.set(bp * vehLen * 0.5, model.parachuteBaseY + hang + rise, 0);
    model.backshell.position.y = model.backshellBaseY + hang + rise;
    model.backshell.rotation.z = bp * 1.6;

    // Separation bursts — the pyro event at heat-shield jettison + chute-cut.
    heatshieldBurst.update(sepProgress(s.t, hsT, DESCENT_BURST_S));
    backshellBurst.position.y = model.backshellBaseY + hang;
    backshellBurst.update(sepProgress(s.t, shellSepT, DESCENT_BURST_S));

    // Aeroshell-body landers (Mars/Venus) ride STOWED inside the closed aeroshell
    // through entry + chute — only the heat-shield + backshell show. The rover +
    // its powered descent stage / retro are revealed once the heat-shield drops
    // away (exposing the terminal-descent hardware), never before. Earth capsules
    // and Moon/airless landers ARE the vehicle, so they stay visible throughout.
    const aeroshellBody = body === 'mars' || body === 'venus';
    const terminalPhase =
      s.phaseKind === 'skycrane' ||
      s.phaseKind === 'powered_retro' ||
      s.phaseKind === 'airbag_bounce' ||
      s.phaseKind === 'aeroshell_descent'; // Venus: sphere descends after backshell sep
    const landerShown = !aeroshellBody || hp > 0.04 || terminalPhase;
    model.lander.visible = landerShown;
    model.descentStage.visible = landerShown;
    model.retro.visible = landerShown;
    // Surface-only deployables appear only once down (flag planted, rover driven
    // off, petals splayed) — never mid-flight.
    // An airbag lander's deployables wait for its petals.
    const landed = ball
      ? petalsT != null && s.t >= petalsT + PETAL_S * 0.6
      : s.altM <= (lowK ? 0 : 2) || (touchdownT != null && s.t >= touchdownT);
    for (const o of surfaceOnly) o.visible = landed;
    const touched = s.altM <= 0 || (touchdownT != null && s.t >= touchdownT);
    for (const o of flightOnly) o.visible = !touched;

    // Skycrane rigging: shown only during the skycrane phase.
    model.skycraneRigging.visible = s.phaseKind === 'skycrane';
    // MSL sky crane: the stage climbs off the rover on its bridles over LOWER_S from
    // skycrane_lower (the rover stays on the trajectory), holds the rover at bridle length to
    // touchdown, then cuts the bridles and flies away (FLYAWAY_S).
    const ds = model.descentStage.userData as {
      restY?: number;
      bridleLength?: number;
      plumes?: THREE.Object3D[];
    };
    if (ds.restY != null && ds.bridleLength != null) {
      const lp = smooth01(lowerT == null ? 0 : (s.t - lowerT) / LOWER_S);
      const gap = ds.bridleLength * lp;
      const fa = touchdownT == null ? 0 : Math.max(0, (s.t - touchdownT) / FLYAWAY_S);
      model.descentStage.position.set(
        fa * fa * vehLen * 6,
        ds.restY + gap + fa * fa * vehLen * 4,
        0,
      );
      model.descentStage.rotation.z = -Math.min(1, fa * 3) * 0.6;
      model.descentStage.visible = landerShown && fa < 1;
      model.skycraneRigging.scale.y = Math.max(
        1e-4,
        ds.restY - model.skycraneRigging.position.y + gap,
      );
      model.skycraneRigging.visible = lp > 0 && fa === 0;
      const firing =
        (s.phaseKind === 'powered_retro' || s.phaseKind === 'skycrane' || (fa > 0 && fa < 1)) &&
        landerShown;
      for (const p of ds.plumes ?? []) {
        p.visible = firing;
        p.scale.y = 1 + 0.1 * Math.sin(frame * 0.7 + p.id);
      }
    }

    // Apollo CSM undock beat: the mothership starts docked above the LM, then
    // separates — pulling up + drifting away — over the opening of the descent
    // before the LM's powered descent. Scene-driven, gated on the orbiter part.
    const hasOrbiter = model.orbiter.children.length > 0;
    if (hasOrbiter) {
      const up = Math.min(1, Math.max(0, (s.t - UNDOCK_HOLD_S) / UNDOCK_S));
      const u = up * up * (3 - 2 * up); // smoothstep
      model.orbiter.visible = u < 0.999;
      model.orbiter.position.set(u * vehLen * 1.4, u * vehLen * 7, -u * vehLen * 1.6);
      model.orbiter.rotation.y = u * 1.3;
      undocking = u > 0.001 && u < 0.98;
    }

    // Airbags: inflate at deploy, then hidden once past bounce (near ground).
    if (airbagT != null && !ball) {
      const inflate = Math.min(1, Math.max(0, (s.t - airbagT) / 1.5));
      model.airbags.visible = s.t >= airbagT;
      model.airbags.scale.setScalar(0.2 + 0.8 * inflate);
    }

    // Retro plume: only while braking (powered / skycrane / lunar powered).
    const braking = s.phaseKind === 'powered_retro' || s.phaseKind === 'skycrane';
    const engineOn = braking && (cutoffT == null || s.t < cutoffT);
    plume.visible = engineOn;
    if (engineOn) {
      const flick = 1 + 0.1 * Math.sin(frame * 0.7) + 0.05 * Math.sin(frame * 1.9);
      plume.scale.set(plumeK, flick * plumeK, plumeK);
    }

    // Entry attitude flip (Earth crewed re-entry, RFC-034 §13): the capsule comes
    // off the deorbit burn falling TIP-FIRST (nose down), then rotates to HEAT-
    // SHIELD-FORWARD as it bites into the upper atmosphere — before the plasma
    // builds. Other bodies enter shield-forward already (or descend powered), so
    // they stay at attitude 0. `entryFlip`: 0 = nose-down (tip first), 1 = heat-
    // shield-down (entry attitude). Tied to the aero-heating onset so the flip
    // completes exactly as the fireball would start.
    const heat = Math.min(1, s.aeroHeatFlux / heatRef);
    // Anchored to the `entry_flip` beat: hold tip-first briefly, then pitch around
    // to heat-shield-forward over FLIP_S — a deliberate, slow-mo'd milestone
    // (descentSepTimes includes entry_flip) rather than an instant snap.
    let entryFlip = 1;
    if (flipT != null && body === 'earth' && s.phaseKind === 'ballistic_entry') {
      const fp = Math.min(1, Math.max(0, (s.t - (flipT + FLIP_HOLD_S)) / FLIP_S));
      entryFlip = fp * fp * (3 - 2 * fp); // smoothstep 0→1
    }
    vehicle.rotation.x = Math.PI * (1 - entryFlip); // π (tip down) → 0 (shield down)
    if (landingFlipT != null) {
      // Laid across the frame (about z), tiled belly (-X) down; the plasma stays world-aligned
      // (shock below the belly, wake above).
      vehicle.rotation.x = 0;
      vehicle.rotation.z = starshipPitch(s.t, landingFlipT, LANDING_FLIP_S);
      plasma.rotation.z = -vehicle.rotation.z;
    }

    // Entry fireball: glow tracks the normalised aero-heating proxy — the
    // hypersonic bow that peaks at peak heating then dies as the vehicle slows.
    // Gated until the capsule has flipped shield-forward (no plasma tip-first).
    const inEntry = s.phaseKind === 'ballistic_entry' || s.phaseKind === 'aeroshell_descent';
    plasma.visible = inEntry && heat > 0.04 && entryFlip > 0.6;
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
      dustMat.opacity = (overSea ? 0.12 : 0.3) * amt;
      dust.scale.setScalar(overSea ? 0.4 + 0.5 * amt : 0.5 + 1.3 * amt);
    }

    // The directed camera: the subject is the craft, plus the chute or the departing CSM when
    // they are out.
    let core = liveCore(s.t);
    let whole = core;
    if (model.mainChute?.group.visible) {
      const top = model.mainChute.group.position.y + mainSpan * vehLen;
      whole = { cy: top / 2, r: top / 2 + vehLen * 0.4 };
      // A 10 m canopy over a 0.7 m lander: a close shot would sit inside the canopy.
      if (airbagT == null || s.t < airbagT) core = whole;
    } else if (model.parachute.visible) {
      const top = model.parachute.position.y + chuteSpan * vehLen;
      whole = { cy: top / 2, r: top / 2 + vehLen * 0.4 };
    } else if (undocking) {
      const o = model.orbiter.position;
      whole = { cy: (o.y + vehLen) / 2, r: o.length() / 2 + vehLen * 1.2 };
    }
    const pose = descentPoseAt(shots, s.t, { core, whole }, craftY, camera.aspect);
    camera.position.set(pose.pos[0], craftY + pose.pos[1], pose.pos[2]);
    camera.lookAt(pose.target[0], craftY + pose.target[1], pose.target[2]);
    camera.fov = pose.fov;
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
    // At the entry interface the Mars/Venus lander is stowed inside the aeroshell.
    const stowed = body === 'mars' || body === 'venus';
    model.lander.visible = !stowed;
    model.descentStage.visible = !stowed;
    model.retro.visible = !stowed;
    model.orbiter.visible = model.orbiter.children.length > 0;
    model.orbiter.position.set(0, 0, 0);
    model.orbiter.rotation.set(0, 0, 0);
    for (const o of surfaceOnly) o.visible = false; // planted only at touchdown
    for (const o of flightOnly) o.visible = true;
    plume.visible = false;
    plasma.visible = false;
    dust.visible = false;
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
    // The directed camera has no easing to snap: every pose is a function of time.
    snapCamera: () => {},
    reset,
    dispose,
  };
}
