/**
 * LEO orbit-coast scene (RFC-034 §13) — the middle act of a Tier-1 Earth-orbit
 * flight: after ascent inserts the capsule into low Earth orbit, it *coasts*,
 * looping the planet before the deorbit burn. Earth-centred, kilometre scene
 * units (like ascent-scene.ts, NOT the 1/10000 cislunar scale that renders LEO
 * sub-pixel), so the capsule sits legibly a few hundred km above a full Earth.
 *
 * The hybrid coast rule (decided with Marko): the capsule renders
 * `min(realRevs, LOOP_CAP)` loops — so 1 / 2 / 3-orbit missions show exactly
 * that many distinct loops, and long marathons (Gemini-7's 206) render a few
 * representative loops while the *real* scale is carried by the MET/date clock
 * and the "REV n / N" counter in the HUD (those read the true numbers). A
 * ground-track builds under the path on the rotating Earth. A suborbital hop
 * renders a single ballistic arc instead of a closed loop.
 *
 * Implements FlightPhaseScene<CoastState> so it plugs into the same
 * ascent-renderer composer + clock-driven player as the launch + descent scenes.
 */

import * as THREE from 'three';
import { parkingOrbit } from '$lib/orbital/cislunar/cislunar-geometry';
import type { FlightPhaseScene, ForceKey } from './flight-phase-scene';

const R_EARTH_KM = 6371;
/** Rendered orbit loops are capped here; the REV counter still shows real N. */
export const LOOP_CAP = 3;

/** The headless state the clock feeds the coast scene each frame. */
export interface CoastState {
  /** Fraction through the whole coast phase, [0, 1] — drives rendered position. */
  coastFraction: number;
  /** Real mission-elapsed seconds so far (HUD MET/date clock reads this). */
  metS: number;
  /** Real revolutions completed so far (HUD "REV n" reads this). */
  rev: number;
}

export interface LeoCoastSceneOptions {
  container: HTMLElement;
  aspect: number;
  /** Orbit altitude (km) — apogee/perigee mean is fine for the ring. */
  altitudeKm: number;
  inclinationDeg: number;
  /** Real total revolutions (drives the rendered-loop cap + is shown as N). */
  totalRevs: number;
  /** Suborbital hop → render one ballistic arc, not a closed loop. */
  suborbital?: boolean;
  /** Builds the capsule mesh (family-specific, e.g. buildMercuryCapsule). */
  buildCapsule: () => THREE.Group;
  /** Earth day-map texture URL (e.g. `${base}/textures/2k_earth_daymap.jpg`). */
  earthTextureUrl?: string;
}

export interface LeoCoastScene extends FlightPhaseScene<CoastState> {}

/** Rotate a local-equatorial orbit point into the inclined plane (about +X). */
function inclined(pt: { x: number; y: number; z: number }, incRad: number): THREE.Vector3 {
  const c = Math.cos(incRad);
  const s = Math.sin(incRad);
  // cislunar-geometry emits equatorial (y≈0); tilt about X so it reads as inclination:
  // rotating (x, 0, z) about +X by inc → (x, z·sin, z·cos).
  return new THREE.Vector3(pt.x, pt.z * s, pt.z * c);
}

export function createLeoCoastScene(opts: LeoCoastSceneOptions): LeoCoastScene {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, opts.aspect, 10, 200_000);

  const renderedLoops = Math.max(1, Math.min(LOOP_CAP, Math.round(opts.totalRevs)));
  const incRad = (opts.inclinationDeg * Math.PI) / 180;
  const rOrbit = R_EARTH_KM + opts.altitudeKm;

  // ── Lighting: a sun key + soft fill so the day side reads + the capsule glints.
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
  sun.position.set(1, 0.35, 0.6).multiplyScalar(100_000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223044, 0.9));

  // ── Earth ───────────────────────────────────────────────────────────
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x2a4a74, roughness: 1, metalness: 0 });
  if (opts.earthTextureUrl) {
    new THREE.TextureLoader().load(opts.earthTextureUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    });
  }
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH_KM, 96, 96), earthMat);
  scene.add(earth);

  // Thin blue atmosphere limb.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM + 90, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x6fb7ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    }),
  );
  scene.add(atmo);

  // ── Star field (cheap procedural points on a far shell) ───────────────
  const starGeo = new THREE.BufferGeometry();
  const starN = 1400;
  const starPos = new Float32Array(starN * 3);
  // Deterministic scatter (no Math.random — varies by index) on a big shell.
  for (let i = 0; i < starN; i++) {
    const a = i * 2.399963; // golden-angle spiral
    const y = 1 - (2 * (i + 0.5)) / starN;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    starPos[i * 3] = Math.cos(a) * r * 120_000;
    starPos[i * 3 + 1] = y * 120_000;
    starPos[i * 3 + 2] = Math.sin(a) * r * 120_000;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 260, sizeAttenuation: true })),
  );

  // ── Orbit ring (one closed loop) or suborbital arc ────────────────────
  const RING_STEPS = 240;
  const ringRaw = opts.suborbital
    ? // A lofted ballistic arc: half an ellipse peaking at altitudeKm.
      Array.from({ length: RING_STEPS + 1 }, (_, i) => {
        const t = i / RING_STEPS;
        const ang = Math.PI * (t - 0.5); // −90°..+90° arc over the limb
        return {
          x: rOrbit * Math.sin(ang) * 0.6,
          y: 0,
          z: (R_EARTH_KM + opts.altitudeKm * Math.cos(ang)) - 0, // peak at apogee
        };
      }).map((p) => ({ x: p.x, y: p.y, z: p.z }))
    : parkingOrbit(opts.altitudeKm, 0, 1, RING_STEPS);
  const ringPts = ringRaw.map((p) => inclined(p, incRad));
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0x4b9cd3, transparent: true, opacity: 0.75 }),
  );
  scene.add(ring);

  // ── Capsule ───────────────────────────────────────────────────────────
  const capsule = opts.buildCapsule();
  // Scale the ~1-unit model up so it reads against the 6371-km Earth — heavily
  // exaggerated (a real capsule would be sub-pixel), like every /fly subject.
  capsule.scale.setScalar(460);
  scene.add(capsule);

  // ── Ground-track (builds under the sub-satellite point) ───────────────
  const trackPositions = new Float32Array((RING_STEPS + 4) * 3);
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(trackPositions, 3));
  const track = new THREE.Line(
    trackGeo,
    new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.9 }),
  );
  trackGeo.setDrawRange(0, 0);
  scene.add(track);
  let trackCount = 0;
  let lastTrackFraction = -1;

  // Position on the orbit at a rendered-angle parameter u∈[0,1] of ONE loop.
  const orbitPointAt = (u: number): THREE.Vector3 => {
    const idx = Math.min(RING_STEPS, Math.max(0, Math.round(u * RING_STEPS)));
    return ringPts[idx].clone();
  };

  // ── Camera framing: three-quarter view onto the orbit plane ───────────
  const camDist = rOrbit * 2.4;
  const baseCamPos = new THREE.Vector3(camDist * 0.7, camDist * 0.55, camDist * 0.7);
  camera.position.copy(baseCamPos);
  camera.lookAt(0, 0, 0);

  let earthSpin = 0;

  const setState = (s: CoastState): void => {
    // Hybrid rule: the rendered angle sweeps `renderedLoops` loops over the coast;
    // the HUD counter (s.rev / totalRevs) carries the real count separately.
    const swept = s.coastFraction * renderedLoops; // total loops rendered so far
    const u = opts.suborbital ? Math.min(1, s.coastFraction) : swept % 1;
    const pos = orbitPointAt(u);
    capsule.position.copy(pos);
    // Orient heat-shield-down (−local-radial), nose along the velocity.
    const radial = pos.clone().normalize();
    capsule.up.copy(radial);
    const ahead = orbitPointAt((u + 0.01) % 1);
    capsule.lookAt(ahead);

    // Earth rotates through the coast (a full mission is many hours → visible spin).
    earthSpin = (s.metS / 86_400) * Math.PI * 2; // one turn per day
    earth.rotation.y = earthSpin;

    // Ground-track: drop a point on the surface under the capsule, at intervals.
    if (s.coastFraction - lastTrackFraction > 0.004 && trackCount < RING_STEPS + 3) {
      const sub = radial.clone().multiplyScalar(R_EARTH_KM + 40);
      // Counter-rotate into Earth's spinning frame so the track "sticks".
      sub.applyAxisAngle(new THREE.Vector3(0, 1, 0), -earthSpin);
      trackPositions.set([sub.x, sub.y, sub.z], trackCount * 3);
      trackCount++;
      trackGeo.setDrawRange(0, trackCount);
      trackGeo.attributes.position.needsUpdate = true;
      lastTrackFraction = s.coastFraction;
    }
    track.rotation.y = earthSpin; // ride the spin so the track stays on the ground
  };

  const setAspect = (aspect: number): void => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  // The coast is free-fall — no thrust/weight/drag lens vectors (a no-op surface
  // so the shared player can call them uniformly; a velocity arrow can be added
  // in the Science-Lens slice later).
  const setForceVisible = (_force: ForceKey, _on: boolean): void => {};
  const setForcesVisible = (_on: boolean): void => {};

  const reset = (): void => {
    trackCount = 0;
    lastTrackFraction = -1;
    trackGeo.setDrawRange(0, 0);
    earth.rotation.y = 0;
    track.rotation.y = 0;
    capsule.position.copy(orbitPointAt(0));
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

  return {
    scene,
    camera,
    setState,
    setAspect,
    setForceVisible,
    setForcesVisible,
    snapCamera: () => camera.position.copy(baseCamPos),
    reset,
    dispose,
  };
}
