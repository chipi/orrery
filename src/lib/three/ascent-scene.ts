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
import type { AscentState } from '$lib/orbital/ascent-physics';
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
  /** Exaggeration for the vehicle length (km). Real F9 ≈ 0.07; default 1.2 to read. */
  vehicleLengthKm?: number;
  /** Camera shot schedule (from buildShotSchedule). Falls back to a single tracking shot. */
  schedule?: ShotWindow[];
}

export interface AscentScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Position + orient the vehicle and frame the camera from a physics state. */
  setState(s: AscentState): void;
  setAspect(aspect: number): void;
  /** The camera shot active at the last setState() — for the HUD. */
  readonly activeShot: AscentShotName;
  /** Restore stages/fairing/plume to the pre-launch state (for replay). */
  reset(): void;
  dispose(): void;
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
  const sunDir = new THREE.Vector3(0.32, 0.5, 0.8).normalize();
  const sun = new THREE.DirectionalLight(0xfff2df, 3.9);
  sun.position.copy(sunDir).multiplyScalar(1000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x33456b, 0.75));

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
  const earthMat = new THREE.MeshStandardMaterial({
    color: dayTex ? 0xffffff : 0x2a5a8c,
    map: dayTex ?? null,
    emissive: 0xffffff,
    emissiveMap: nightTex ?? null,
    emissiveIntensity: nightTex ? 0.55 : 0,
    roughness: 1,
    metalness: 0,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH_KM, 128, 128), earthMat);
  earth.position.set(0, -R_EARTH_KM, 0);
  earth.rotation.set(-Math.PI / 2, 2.1, 0); // equator up; longitude → coastline
  scene.add(earth);

  // Atmosphere — two additive back-side shells for a bright, thick blue
  // limb that reads against black (a broad haze + a tighter hot rim).
  const atmoHaze = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + 220, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x4aa0ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmoHaze.position.copy(earth.position);
  scene.add(atmoHaze);
  const atmoRim = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + 70, 128, 128),
    new THREE.MeshBasicMaterial({
      color: 0x9fd0ff,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmoRim.position.copy(earth.position);
  scene.add(atmoRim);

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
    new THREE.ConeGeometry(rBody * 0.8, vehLen * 0.4, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const plumeGlow = new THREE.Mesh(
    new THREE.ConeGeometry(rBody * 1.5, vehLen * 0.62, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  plume.add(plumeCore, plumeGlow);
  plume.rotation.z = Math.PI; // point down (−Y)
  stage1Group.add(plume);

  let fairingOn = true;
  let stage1On = true;
  let frame = 0;
  const schedule = opts.schedule ?? [];
  let activeShot: AscentShotName = 'ascent';

  const setState = (s: AscentState): void => {
    frame++;
    vehicle.position.set(s.downrangeKm, s.altKm, 0);

    // Sky: daylight blue on the pad → space-black by ~70 km (pow curve so
    // it darkens fast, like real onboard footage). Stars fade in as it darkens.
    const skyT = Math.min(1, Math.pow(s.altKm / 70, 0.65));
    (scene.background as THREE.Color).copy(SKY_GROUND).lerp(SKY_SPACE, skyT);
    (stars.material as THREE.PointsMaterial).opacity = skyT;
    (stars.material as THREE.PointsMaterial).transparent = true;

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
    reset,
    dispose,
  };
}
