/**
 * Scene 0 — the /fly launch/ascent render (RFC-033 · epic #412).
 * Consumes the headless ascent trajectory (integrateAscent) and stages
 * a launch-site-local Three.js scene: a curved lit Earth (textured, with
 * a night side) that recedes, pad + tower, a multi-stage vehicle that
 * pitches along its velocity and drops stages, an engine plume, a sun +
 * glow, and a star field. Kilometre scene units — Earth centred a full
 * radius below the pad so the launch site sits at the origin and every
 * vehicle-scale coordinate stays small (float-precision-safe), the "own
 * frame" of RFC-033 L-A.
 *
 * Dev-harness first (/dev/ascent); wired into /fly at S6. The vehicle is
 * a stylised procedural placeholder at an exaggerated scale so it reads
 * against Earth curvature — per-vehicle accurate GLBs land at S11.
 */

import * as THREE from 'three';
import { gravity, type AscentState } from '$lib/orbital/ascent-physics';
import {
  composeShot,
  selectShot,
  type AscentShotName,
  type ShotWindow,
} from '$lib/orbital/ascent-cameras';

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
}

/** Texture-seam longitude offset (deg) tuned so a site's real coastline lands under the pad. */
const LON_TEXTURE_OFFSET_DEG = -90;

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
  const lonR = ((site.lon + LON_TEXTURE_OFFSET_DEG) * Math.PI) / 180;
  const siteNormal = new THREE.Vector3(
    Math.cos(latR) * Math.cos(lonR),
    Math.sin(latR),
    Math.cos(latR) * Math.sin(lonR),
  );
  earth.quaternion.setFromUnitVectors(siteNormal, new THREE.Vector3(0, 1, 0));
  scene.add(earth);

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

  // ── Pad + tower at the origin.
  const padMat = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.9 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(vehLen * 0.55, vehLen * 0.65, vehLen * 0.08, 32), padMat);
  pad.position.y = vehLen * 0.04;
  scene.add(pad);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(vehLen * 0.07, vehLen * 1.15, vehLen * 0.07), padMat);
  tower.position.set(vehLen * 0.42, vehLen * 0.57, 0);
  scene.add(tower);

  // ── Vehicle group: two stages + interstage + nozzle + fairing + plume.
  const vehicle = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeef2f7, roughness: 0.4, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16181d, roughness: 0.55, metalness: 0.3 });

  const rBody = vehLen * 0.055;
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.6, 40), bodyMat);
  stage1.position.y = vehLen * 0.3;
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.05, 40), darkMat);
  interstage.position.y = vehLen * 0.625;
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.26, 40), bodyMat);
  stage2.position.y = vehLen * 0.78;
  const fairing = new THREE.Mesh(new THREE.ConeGeometry(rBody, vehLen * 0.18, 40), bodyMat);
  fairing.position.y = vehLen * 1.0;
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(rBody * 0.92, vehLen * 0.06, 28, 1, true), darkMat);
  nozzle.position.y = -vehLen * 0.01;
  const stage1Group = new THREE.Group();
  stage1Group.add(stage1, nozzle);
  vehicle.add(stage1Group, interstage, stage2, fairing);
  scene.add(vehicle);

  // Plume: a hot inner core + an additive outer glow, hung below the
  // firing nozzle and flickered per frame.
  const plume = new THREE.Group();
  const plumeCore = new THREE.Mesh(
    new THREE.ConeGeometry(rBody * 0.7, vehLen * 0.4, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe6b0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const plumeGlow = new THREE.Mesh(
    new THREE.ConeGeometry(rBody * 1.3, vehLen * 0.6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  plume.add(plumeCore, plumeGlow);
  plume.rotation.z = Math.PI; // point down (−Y)
  stage1Group.add(plume);

  // ── Science-Lens force vectors (thrust / weight / drag / velocity),
  //    drawn in world space at the vehicle. Lengths are stylised so the
  //    diagram reads; thrust and weight share a scale so TWR stays honest.
  const FORCE_REF_N = 8_000_000; // ≈ liftoff thrust → maps to 2.2·vehLen
  const DRAG_REF_N = 120_000; // separate scale so drag reads at Max-Q
  const SPEED_REF = 7.8; // km/s → 2·vehLen
  const forces = new THREE.Group();
  forces.visible = false;
  const mkArrow = (hex: number): THREE.ArrowHelper =>
    new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), vehLen, hex, vehLen * 0.28, vehLen * 0.16);
  const arrThrust = mkArrow(FORCE_COLORS.thrust);
  const arrWeight = mkArrow(FORCE_COLORS.weight);
  const arrDrag = mkArrow(FORCE_COLORS.drag);
  const arrVel = mkArrow(FORCE_COLORS.velocity);
  forces.add(arrThrust, arrWeight, arrDrag, arrVel);
  scene.add(forces);
  let showForces = false;

  let fairingOn = true;
  let stage1On = true;
  let frame = 0;
  const schedule = opts.schedule ?? [];
  let activeShot: AscentShotName = 'ascent';

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
    setArrow(arrWeight, -s.downrangeKm, -(R_EARTH_KM + s.altKm), (weightN / FORCE_REF_N) * vehLen * 2.2);
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

    // Orient along the flight path (velocity angle from vertical).
    const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
    const fromVertical = Math.atan2(horiz, Math.max(1e-6, s.velUpKms));
    vehicle.rotation.z = -fromVertical;

    // Staging / fairing from the physics state.
    if (fairingOn && s.stageIndex >= 1) {
      fairing.visible = false;
      fairingOn = false;
    }
    if (stage1On && s.stageIndex >= 1) {
      stage1Group.visible = false;
      interstage.visible = false;
      stage1On = false;
    }

    // Plume: only while a stage burns; re-parent to the firing stage,
    // flicker the length, taper in vacuum.
    const burning = s.stageIndex >= 0;
    plume.visible = burning;
    if (burning) {
      const firing = s.stageIndex >= 1 ? stage2 : stage1;
      if (plume.parent !== firing) {
        plume.parent?.remove(plume);
        firing.add(plume);
      }
      const flick = 1 + 0.09 * Math.sin(frame * 0.7) + 0.05 * Math.sin(frame * 1.9);
      // Upper-stage plume is longer + thinner in vacuum.
      const vac = s.stageIndex >= 1 ? 1.5 : 1;
      plume.scale.set(1, flick * vac, 1);
      plume.position.y = -(s.stageIndex >= 1 ? vehLen * 0.12 : vehLen * 0.22) * (flick * vac);
    }

    // Camera: pick the active shot from the schedule and compose its pose.
    // Hard-cut between shots (cinematic); the pose is a continuous function
    // of the state, so it moves smoothly within a shot.
    activeShot = schedule.length ? selectShot(schedule, s.t) : 'ascent';
    const p = composeShot(activeShot, s, vehLen);
    camera.position.set(p.px, p.py, p.pz);
    camera.lookAt(p.tx, p.ty, p.tz);
    if (camera.fov !== p.fov) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }

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
    fairingOn = true;
    stage1On = true;
    fairing.visible = true;
    stage1Group.visible = true;
    interstage.visible = true;
    if (plume.parent !== stage1Group) {
      plume.parent?.remove(plume);
      stage1Group.add(plume);
    }
  };

  const dispose = (): void => {
    dayTex?.dispose();
    nightTex?.dispose();
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
    reset,
    dispose,
  };
}
