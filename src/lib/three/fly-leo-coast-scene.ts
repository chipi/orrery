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
import { BoldArrow } from './bold-arrow';
import { buildGlowTube } from './glow-line';

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

export interface LeoCoastScene extends FlightPhaseScene<CoastState> {
  /** Toggle the centripetal-acceleration arrow. Orbit-specific — centripetal is
   *  the role gravity plays, not a `ForceKey`, so it gets its own control. */
  setCentripetalVisible(on: boolean): void;
}

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
  const ringPts = ringRaw
    .map((p) => inclined(p, incRad))
    .map((p) => new THREE.Vector3(p.x, p.y, p.z));
  // Bold glowing orbit tube (was a 1px line). ~28 km radius reads as a clean
  // ribbon against the 6371 km Earth without swamping it.
  const ring = buildGlowTube(ringPts, {
    color: 0x5fb0ef,
    radius: 28,
    opacity: 0.9,
    closed: !opts.suborbital,
  });
  scene.add(ring);

  // ── Capsule ───────────────────────────────────────────────────────────
  const capsule = opts.buildCapsule();
  // Scale the ~1-unit model up so it reads against the 6371-km Earth — heavily
  // exaggerated (a real capsule would be sub-pixel), like every /fly subject.
  capsule.scale.setScalar(460);
  scene.add(capsule);

  // ── Science-Lens force vectors (orbit trio) ───────────────────────────
  // A LEO coast is free-fall: no thrust or drag. The teachable diagram is
  // velocity (tangent) balanced by gravity (radially inward) — and the whole
  // point of orbit is that gravity IS the centripetal force, so the inward
  // gravity + inward centripetal arrows sit alongside each other to show the
  // balance. Colors match the ascent/descent force legend (weight=red,
  // velocity=cyan) with a distinct gold centripetal.
  const COAST_FORCE_COLORS = { weight: 0xff5a5a, velocity: 0x7fe0ff, centripetal: 0xffc850 };
  // Length is set per-frame from the camera distance so the arrows hold a
  // constant on-screen size (~11% of the view) instead of a fixed world size
  // that balloons on the close TRACK shots — construct at a placeholder.
  const mkArrow = (hex: number): BoldArrow =>
    new BoldArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, hex);
  const arrWeight = mkArrow(COAST_FORCE_COLORS.weight);
  const arrVel = mkArrow(COAST_FORCE_COLORS.velocity);
  const arrCentripetal = mkArrow(COAST_FORCE_COLORS.centripetal);
  arrWeight.setLabel('GRAVITY', '#ffb3b3');
  arrVel.setLabel('VELOCITY', '#bfeaff');
  arrCentripetal.setLabel('CENTRIPETAL', '#ffdf9a');
  arrWeight.visible = false;
  arrVel.visible = false;
  arrCentripetal.visible = false;
  const forces = new THREE.Group();
  forces.add(arrWeight, arrVel, arrCentripetal);
  scene.add(forces);

  // ── Ground-track (builds under the sub-satellite point) ───────────────
  const trackPositions = new Float32Array((RING_STEPS + 4) * 3);
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.BufferAttribute(trackPositions, 3));
  // Ground-track grows point-by-point each frame, so it stays a Line (a tube
  // would need a full rebuild per step) — but brighter + fully opaque so it
  // reads as a crisp trail on the rotating Earth.
  const track = new THREE.Line(
    trackGeo,
    new THREE.LineBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 1 }),
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

  // ── Cinematic camera (fly-cinematic-shot-language.md) — a shot schedule that
  //    cuts across the coast: an establishing wide of the capsule against the
  //    sunlit Earth → a trailing tracking shot → a low limb shot with the blue
  //    atmosphere rim behind → a high ground-track shot. The pose lerps toward
  //    each shot's target so the cuts read as smooth crane/dolly moves.
  const camDist = rOrbit * 2.4;
  const baseCamPos = new THREE.Vector3(camDist * 0.7, camDist * 0.55, camDist * 0.7);
  camera.position.copy(baseCamPos);
  const camLookAt = new THREE.Vector3(0, 0, 0);
  camera.lookAt(camLookAt);

  type CoastShot = { pos: THREE.Vector3; target: THREE.Vector3 };
  const coastShotPose = (f: number, pos: THREE.Vector3, radial: THREE.Vector3): CoastShot => {
    // In-plane basis around the capsule: tangent (velocity) + side.
    const ahead2 = orbitPointAt(opts.suborbital ? Math.min(1, f + 0.02) : (f * renderedLoops + 0.02) % 1);
    const tangent = ahead2.clone().sub(pos).normalize();
    const side = tangent.clone().cross(radial).normalize();
    const shot = opts.suborbital ? (f < 0.5 ? 0 : 1) : f < 0.28 ? 0 : f < 0.55 ? 1 : f < 0.82 ? 2 : 3;
    switch (shot) {
      case 1: // TRACK — trail behind + above the capsule
        return {
          pos: pos.clone().addScaledVector(tangent, -3400).addScaledVector(radial, 1700).addScaledVector(side, 700),
          target: pos.clone().addScaledVector(tangent, 600),
        };
      case 2: // LIMB — off to the side + slightly below, Earth's blue rim behind
        return {
          pos: pos.clone().addScaledVector(side, 4200).addScaledVector(radial, -500).addScaledVector(tangent, -1200),
          target: pos.clone(),
        };
      case 3: // GROUND-TRACK — high over the sub-satellite point, looking down
        return {
          pos: radial.clone().multiplyScalar(rOrbit + 8500).addScaledVector(tangent, -2600),
          target: radial.clone().multiplyScalar(R_EARTH_KM + 200),
        };
      default: // ESTABLISH — wide, the capsule small against the full Earth
        return { pos: baseCamPos.clone(), target: new THREE.Vector3(0, 0, 0) };
    }
  };

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

    // Science-Lens force arrows: velocity along the tangent, gravity + the
    // centripetal it supplies both radially inward. Size them to a constant
    // fraction of the camera distance so they read the same on-screen whether
    // the camera is on the wide establishing shot or the close track shot.
    const inward = radial.clone().negate();
    const tangent = ahead.clone().sub(pos).normalize();
    const armLen = camera.position.distanceTo(pos) * 0.13;
    for (const a of [arrWeight, arrVel, arrCentripetal]) {
      a.setLength(armLen, armLen * 0.3, armLen * 0.1);
    }
    arrWeight.position.copy(pos);
    arrWeight.setDirection(inward);
    arrVel.position.copy(pos);
    arrVel.setDirection(tangent);
    // Offset the centripetal arrow slightly downrange so it reads as a distinct
    // vector beside gravity — the lesson being they coincide (gravity IS the
    // centripetal force).
    arrCentripetal.position.copy(pos).addScaledVector(tangent, armLen * 0.5);
    arrCentripetal.setDirection(inward);

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

    // Cinematic camera: lerp toward the active shot's pose for smooth crane moves.
    const shot = coastShotPose(s.coastFraction, pos, radial);
    camera.position.lerp(shot.pos, 0.06);
    camLookAt.lerp(shot.target, 0.06);
    camera.lookAt(camLookAt);
  };

  const setAspect = (aspect: number): void => {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  // Free-fall coast: thrust + drag don't apply, but gravity (weight) + velocity
  // do. Centripetal isn't a ForceKey (it's the role gravity plays), so it has
  // its own control the CoastScene wires from the `centripetal` lens layer.
  const setForceVisible = (force: ForceKey, on: boolean): void => {
    if (force === 'weight') arrWeight.visible = on;
    else if (force === 'velocity') arrVel.visible = on;
    // thrust / drag: no-op in free-fall.
  };
  const setCentripetalVisible = (on: boolean): void => {
    arrCentripetal.visible = on;
  };
  const setForcesVisible = (on: boolean): void => {
    arrWeight.visible = on;
    arrVel.visible = on;
    arrCentripetal.visible = on;
  };

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
    setCentripetalVisible,
    // The shot schedule + per-frame lerp own the camera; snap is a no-op so a
    // scrub doesn't kick it back to the establishing wide every frame.
    snapCamera: () => {},
    reset,
    dispose,
  };
}
