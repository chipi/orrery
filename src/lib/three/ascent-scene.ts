/**
 * Scene 0 — the /fly launch/ascent render (RFC-033 · epic #412).
 * Consumes the headless ascent trajectory (integrateAscent) and stages
 * a launch-site-local Three.js scene: a curved lit Earth that recedes,
 * pad + tower, a multi-stage vehicle that pitches along its velocity
 * and drops stages, an engine plume, and a star field. Kilometre scene
 * units — Earth centred a full radius below the pad so the launch site
 * sits at the origin and every vehicle-scale coordinate stays small
 * (float-precision-safe), exactly the "own frame" of RFC-033 L-A.
 *
 * Dev-harness first (/dev/ascent); wired into /fly at S6. The vehicle
 * is drawn at an exaggerated scale so it reads against Earth curvature —
 * a stylised knob, tuned in the browser, NOT a physics claim.
 */

import * as THREE from 'three';
import type { AscentState } from '$lib/orbital/ascent-physics';

const R_EARTH_KM = 6371;

export interface AscentSceneOptions {
  aspect: number;
  pixelRatio?: number;
  /** Exaggeration for the vehicle length (km). Real F9 ≈ 0.07; default 1.2 to read. */
  vehicleLengthKm?: number;
}

export interface AscentScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Position + orient the vehicle and frame the camera from a physics state. */
  setState(s: AscentState): void;
  setAspect(aspect: number): void;
  dispose(): void;
}

export function createAscentScene(opts: AscentSceneOptions): AscentScene {
  const vehLen = opts.vehicleLengthKm ?? 1.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050c');

  const camera = new THREE.PerspectiveCamera(48, opts.aspect, 0.01, 80_000);

  // ── Lighting: a hard sun + soft fill, so the limb glows and the
  //    vehicle catches a rim. Sun low for a dawn-launch rake.
  const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
  sun.position.set(-800, 300, 600);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223355, 0.5));

  // ── Earth: a big sphere a full radius below the pad (surface at y=0).
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM, 96, 96),
    new THREE.MeshStandardMaterial({ color: 0x2a5a8c, roughness: 1, metalness: 0 }),
  );
  earth.position.set(0, -R_EARTH_KM, 0);
  scene.add(earth);

  // Atmosphere shell — additive back-side glow for the limb.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + 90, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x5aa9ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  atmo.position.copy(earth.position);
  scene.add(atmo);

  // ── Star field.
  const starGeo = new THREE.BufferGeometry();
  const starN = 1500;
  const starPos = new Float32Array(starN * 3);
  // Deterministic scatter (no Math.random dependency for reproducibility).
  for (let i = 0; i < starN; i++) {
    const a = i * 2.399963; // golden-angle
    const z = 1 - (2 * (i + 0.5)) / starN;
    const r = Math.sqrt(1 - z * z);
    starPos[i * 3] = Math.cos(a) * r * 40_000;
    starPos[i * 3 + 1] = Math.abs(z) * 40_000 + 200; // bias to the upper sky
    starPos[i * 3 + 2] = Math.sin(a) * r * 40_000;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 60, sizeAttenuation: true }),
  );
  scene.add(stars);

  // ── Pad + tower at the origin.
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.9 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(vehLen * 0.6, vehLen * 0.7, vehLen * 0.1, 24), padMat);
  pad.position.y = vehLen * 0.05;
  scene.add(pad);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(vehLen * 0.08, vehLen * 1.1, vehLen * 0.08), padMat);
  tower.position.set(vehLen * 0.45, vehLen * 0.55, 0);
  scene.add(tower);

  // ── Vehicle group: two stages + nozzle + fairing + plume. Built along
  //    +Y (nose up); the group is rotated to the flight-path angle.
  const vehicle = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8ecf2, roughness: 0.45, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.6 });

  const rBody = vehLen * 0.055;
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.62, 32), bodyMat);
  stage1.position.y = vehLen * 0.31;
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.28, 32), bodyMat);
  stage2.position.y = vehLen * 0.76;
  const fairing = new THREE.Mesh(new THREE.ConeGeometry(rBody, vehLen * 0.18, 32), bodyMat);
  fairing.position.y = vehLen * 0.99;
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(rBody * 0.9, vehLen * 0.06, 24, 1, true), darkMat);
  nozzle.position.y = -vehLen * 0.01;
  const stage1Group = new THREE.Group();
  stage1Group.add(stage1, nozzle);
  vehicle.add(stage1Group, stage2, fairing);

  // Plume — emissive cone hanging below the nozzle.
  const plume = new THREE.Mesh(
    new THREE.ConeGeometry(rBody * 1.2, vehLen * 0.9, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  plume.rotation.z = Math.PI; // point down (−Y)
  plume.position.y = -vehLen * 0.5;
  stage1Group.add(plume);

  scene.add(vehicle);

  let fairingOn = true;
  let stage1On = true;

  const setState = (s: AscentState): void => {
    // Position (km): downrange x, altitude y.
    vehicle.position.set(s.downrangeKm, s.altKm, 0);

    // Orient along the flight path: angle of velocity from vertical.
    const horiz = Math.sqrt(Math.max(0, s.speedKms * s.speedKms - s.velUpKms * s.velUpKms));
    const fromVertical = Math.atan2(horiz, Math.max(1e-6, s.velUpKms));
    vehicle.rotation.z = -fromVertical; // tip downrange (+x)

    // Staging / fairing visibility from the physics state.
    if (fairingOn && s.stageIndex >= 1) {
      fairing.visible = false;
      fairingOn = false;
    }
    if (stage1On && s.stageIndex >= 1) {
      stage1Group.visible = false; // first stage gone
      stage1On = false;
    }
    // Plume only while a stage is burning.
    plume.visible = s.stageIndex >= 0;
    // Move the live plume to whichever stage is firing.
    const firing = s.stageIndex >= 1 ? stage2 : stage1;
    plume.parent?.remove(plume);
    firing.add(plume);
    plume.position.y = -vehLen * (s.stageIndex >= 1 ? 0.16 : 0.35);

    // Camera: a tracking three-quarter view that pulls back with altitude
    // so Earth curvature enters the frame as the vehicle climbs.
    const back = Math.max(vehLen * 6, s.altKm * 0.9 + vehLen * 4);
    camera.position.set(
      s.downrangeKm - back * 0.55,
      s.altKm + back * 0.25,
      back,
    );
    camera.lookAt(s.downrangeKm, s.altKm + vehLen * 0.5, 0);
  };

  const setAspect = (aspect: number): void => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const dispose = (): void => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    });
  };

  return { scene, camera, setState, setAspect, dispose };
}
