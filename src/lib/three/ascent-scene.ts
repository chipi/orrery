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
 * Dev-harness first (/dev/ascent); wired into /fly at S6. The vehicle is
 * a stylised procedural placeholder at an exaggerated scale so it reads
 * against Earth curvature — per-vehicle accurate GLBs land at S11.
 */

import * as THREE from 'three';
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
import { buildLauncherModel } from '$lib/three/launcher-models';
import {
  buildLaunchGround,
  type LaunchGround,
  type LaunchGroundSite,
} from '$lib/three/launch-ground';

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

export interface AscentScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Position + orient the vehicle and frame the camera from a physics state. */
  setState(s: AscentState): void;
  setAspect(aspect: number): void;
  /** The camera shot active at the last setState() — for the HUD. */
  readonly activeShot: AscentShotName;
  /** Toggle the Science-Lens force vectors (thrust / weight / drag / velocity). */
  setForcesVisible(on: boolean): void;
  /** Snap the smooth-camera to its target instantly (use on a timeline scrub). */
  snapCamera(): void;
  /** Restore stages/fairing/plume to the pre-launch state (for replay). */
  reset(): void;
  dispose(): void;
}

/** Science-Lens force-vector palette (matches the HUD legend). */
export const FORCE_COLORS = {
  thrust: 0x54e08a,
  weight: 0xff5a5a,
  drag: 0x5aa0ff,
  velocity: 0x7fe0ff,
} as const;

/** Generic payload for the ~110 missions without a dedicated model — a small
 *  bus with two solar wings and a dish. Normalised to fit by buildPayload. */
function buildGenericPayload(): THREE.Group {
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
  const pL = new THREE.Mesh(panelGeo, panelMat);
  pL.position.x = -0.85;
  const pR = new THREE.Mesh(panelGeo, panelMat);
  pR.position.x = 0.85;
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xeaeaea, roughness: 0.6, side: THREE.DoubleSide }),
  );
  dish.position.y = 0.5;
  dish.rotation.x = Math.PI;
  g.add(bus, pL, pR, dish);
  return g;
}

/** The payload group: the mission's dedicated spacecraft model when one exists
 *  (buildInterplanetarySpacecraft), else the generic bus — normalised so its
 *  largest dimension ≈ the fairing interior and re-centred on the body axis. */
function buildPayload(spacecraftId: string | undefined, vehLen: number): THREE.Group {
  const model =
    (spacecraftId ? buildInterplanetarySpacecraft(spacecraftId) : null) ?? buildGenericPayload();
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const k = (vehLen * 0.19) / (Math.max(size.x, size.y, size.z) || 1);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.scale.setScalar(k);
  model.position.copy(center.multiplyScalar(-k));
  const holder = new THREE.Group();
  holder.add(model);
  return holder;
}

export function createAscentScene(opts: AscentSceneOptions): AscentScene {
  const vehLen = opts.vehicleLengthKm ?? 1.2;
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
  const model = buildLauncherModel(opts.launcherId, vehLen);
  const booster = model.booster;
  const upperStage = model.upperStage;
  const fairingGroup = model.fairingGroup;
  const fairingHalfL = model.fairingL;
  const fairingHalfR = model.fairingR;
  const fairingBaseY = model.fairingBaseY;
  const payloadBaseY = model.payloadMountY;
  vehicle.add(model.root);

  // Payload — the mission's spacecraft (or a generic bus), stowed under the
  // fairing, revealed at jettison, sprung free at SECO.
  const payload = buildPayload(opts.spacecraftId, vehLen);
  payload.position.y = payloadBaseY;
  payload.visible = false;
  vehicle.add(payload);

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
  const plume = new THREE.Group();
  const plumeGlow = plumeCone(rBody * 0.8, vehLen * 0.36, 0xff8a3c, 0.15);
  const plumeCore = plumeCone(rBody * 0.5, vehLen * 0.28, 0xffcf80, 0.38);
  plume.add(plumeGlow, plumeCore);
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
  const fairingT = metOf('fairing_jettison');
  const secoT = metOf('seco');
  const BOOSTER_SEP_S = 5;
  const FAIRING_SEP_S = 4;

  const _v = new THREE.Vector3();
  const updateForces = (s: AscentState): void => {
    const origin = new THREE.Vector3(s.downrangeKm, s.altKm, 0);
    const setArrow = (arr: THREE.ArrowHelper, dx: number, dy: number, lenKm: number): void => {
      const on = lenKm > vehLen * 0.05 && (dx !== 0 || dy !== 0);
      arr.visible = on;
      if (!on) return;
      arr.position.copy(origin);
      _v.set(dx, dy, 0).normalize();
      arr.setDirection(_v);
      arr.setLength(lenKm, vehLen * 0.28, vehLen * 0.16);
    };
    // Thrust — up the commanded body axis.
    const tl = (s.thrustN / FORCE_REF_N) * vehLen * 2.2;
    setArrow(arrThrust, Math.cos(s.pitchRad), Math.sin(s.pitchRad), s.thrustN > 0 ? tl : 0);
    // Weight — toward Earth's centre (a full radius below the pad).
    const weightN = s.massKg * gravity(s.altKm * 1000);
    setArrow(
      arrWeight,
      -s.downrangeKm,
      -(R_EARTH_KM + s.altKm),
      (weightN / FORCE_REF_N) * vehLen * 2.2,
    );
    // Velocity + drag (drag opposes velocity).
    const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
    setArrow(arrVel, horiz, s.velUpKms, (s.speedKms / SPEED_REF) * vehLen * 2);
    setArrow(arrDrag, -horiz, -s.velUpKms, (s.dragN / DRAG_REF_N) * vehLen * 1.2);
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
    booster.scale.setScalar(1 - 0.45 * bp);

    // Fairing: the two shells clamshell apart, rise, and tumble away.
    const fp = sepProgress(s.t, fairingT, FAIRING_SEP_S);
    fairingGroup.visible = fp < 1;
    const spread = fp * vehLen * 2.4;
    const rise = fairingBaseY + fp * vehLen * 1.2;
    fairingHalfL.position.set(-spread, rise, 0);
    fairingHalfR.position.set(spread, rise, 0);
    fairingHalfL.rotation.z = fp * 1.3;
    fairingHalfR.rotation.z = -fp * 1.3;

    // Payload: revealed once the fairing is gone; springs free at SECO while
    // the spent upper stage drifts back the other way.
    const pp = sepProgress(s.t, secoT, PAYLOAD_SEP_HOLD_S);
    payload.visible = fairingT != null ? s.t >= fairingT : s.stageIndex < 0;
    payload.position.y = payloadBaseY + pp * vehLen * 1.1;
    payload.rotation.y = s.t * 0.12;
    upperStage.position.y = -pp * vehLen * 1.4;

    // Plume: only while a stage burns; re-parent to the firing stage,
    // flicker the length, taper in vacuum.
    const burning = s.stageIndex >= 0;
    plume.visible = burning;
    if (burning) {
      const firing = s.stageIndex >= 1 ? model.upperPlumeAnchor : model.boosterPlumeAnchor;
      if (plume.parent !== firing) {
        plume.parent?.remove(plume);
        firing.add(plume);
      }
      const flick = 1 + 0.09 * Math.sin(frame * 0.7) + 0.05 * Math.sin(frame * 1.9);
      // Upper-stage plume is longer + thinner in vacuum; wider in thick air.
      const vac = s.stageIndex >= 1 ? 1.6 : 1;
      plume.scale.set(1, flick * vac, 1);
      // S1 plume emanates from the octaweb; S2 from its vacuum bell.
      plume.position.y = -(s.stageIndex >= 1 ? vehLen * 0.14 : vehLen * 0.3);
    }

    // Camera: pick the active shot, compose its target pose, then EASE the live
    // camera toward it (position + fov) while snapping the look-at fast — a
    // shot change reads as a pan/dolly/zoom that keeps the vehicle in frame,
    // never a hard jump into a corner.
    const shot = schedule.length
      ? activeShotAt(schedule, s.t)
      : { name: 'ascent' as const, progress: 0.5 };
    activeShot = shot.name;
    const p = composeShot(activeShot, s, vehLen, shot.progress, opts.tuning?.[activeShot]);
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

    if (showForces) updateForces(s);
  };

  const setForcesVisible = (on: boolean): void => {
    showForces = on;
    forces.visible = on;
  };

  const setAspect = (aspect: number): void => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const reset = (): void => {
    booster.visible = true;
    booster.position.set(0, 0, 0);
    booster.rotation.set(0, 0, 0);
    booster.scale.setScalar(1);
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
    /** Snap the smooth-camera to its target instantly (use on a timeline scrub). */
    snapCamera: () => {
      camS = null;
    },
    reset,
    dispose,
  };
}
