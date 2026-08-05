/**
 * Sub-solar point + terminator science-lens layer for the surface
 * routes (PRD-023 amendment / #382).
 *
 * The sub-solar point is where the Sun sits directly overhead — the
 * centre of the lit hemisphere and local solar noon. The terminator is
 * the day/night great circle 90° away from it. Both are built from the
 * scene's *real* Sun direction (the DirectionalLight vector shared by
 * every surface route) rather than an aesthetic guess, and parented to
 * the scene (inertial) — so as the body auto-spins beneath them the
 * marker stays fixed at the Sun and the surface rotates through local
 * noon, exactly as it does in reality.
 *
 * Honest-scope note: the marker tracks the scene's Sun, which is a fixed
 * illumination direction, not a real-clock ephemeris. It answers "where
 * is the Sun / where is the day-night line" — not "what is the sub-solar
 * longitude at this UTC instant" (which would need a body-orientation
 * model the surface scenes don't carry). See #382.
 *
 * Mirrors the gate() + handle pattern in mars-lens-layers.ts.
 */
import * as THREE from 'three';
import { onLayerChange, type LayerKey } from '$lib/science-layers';
import { createAnimateLoop } from '$lib/three/animate-loop';

const DEG = Math.PI / 180;

export interface SunLayerHandle {
  object: THREE.Object3D;
  dispose: () => void;
}

function gate(
  object: THREE.Object3D,
  key: LayerKey,
  disposables: Array<{ dispose: () => void }>,
): SunLayerHandle {
  object.userData.layerKey = key;
  object.visible = false;
  const stop = onLayerChange(key, (on) => {
    object.visible = on;
  });
  return {
    object,
    dispose: () => {
      stop?.();
      for (const d of disposables) d.dispose();
    },
  };
}

export interface SubSolarOpts {
  planetRadius: number;
  /** World-space Sun direction (the scene DirectionalLight position). */
  sunDirection: THREE.Vector3;
  color: number;
  /** Angular radius of the noon-halo ring around the sub-solar point,
   *  degrees. Default 12°. */
  haloDeg?: number;
  /** PROTOTYPE seasonal sun-march (#386 diagram F). When set, the marker
   *  sways ±obliquity north/south over `periodSec` to animate the
   *  mechanism of seasons. Obliquity ≈ 0 (Moon) → no sway. */
  seasonal?: { obliquityDeg: number; periodSec?: number };
}

/**
 * Sub-solar dot at local noon + a small noon-halo ring around it + the
 * terminator great circle. Sun-lit hemisphere geometry only — no fill,
 * so it reads over any surface texture without hiding it.
 */
export function buildSubSolarPoint(opts: SubSolarOpts): SunLayerHandle {
  const R = opts.planetRadius;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  // Orthonormal basis with `n` along the Sun direction; {u, v} span the
  // plane perpendicular to it (the terminator plane).
  const n = opts.sunDirection.clone().normalize();
  const seed = Math.abs(n.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(n, seed).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  // Sub-solar dot — bright unlit marker just above the surface at the
  // point facing the Sun.
  const dotGeo = new THREE.SphereGeometry(R * 0.03, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: opts.color });
  disposables.push(dotGeo, dotMat);
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.copy(n).multiplyScalar(R * 1.012);
  group.add(dot);

  // Noon halo — a small circle of constant angular radius around the
  // sub-solar point (a "solar noon here" ring on the sphere surface).
  const haloRad = (opts.haloDeg ?? 12) * (Math.PI / 180);
  const haloMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  disposables.push(haloMat);
  const haloPts: THREE.Vector3[] = [];
  const cosH = Math.cos(haloRad);
  const sinH = Math.sin(haloRad);
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const p = new THREE.Vector3()
      .addScaledVector(n, cosH)
      .addScaledVector(u, sinH * Math.cos(t))
      .addScaledVector(v, sinH * Math.sin(t))
      .multiplyScalar(R * 1.006);
    haloPts.push(p);
  }
  const haloGeo = new THREE.BufferGeometry().setFromPoints(haloPts);
  disposables.push(haloGeo);
  group.add(new THREE.LineLoop(haloGeo, haloMat));

  // Terminator — the day/night great circle 90° from the Sun (the u-v
  // plane). Dimmer than the noon marker; it's context, not the subject.
  const termMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  disposables.push(termMat);
  const termPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const t = (i / 128) * Math.PI * 2;
    const p = new THREE.Vector3()
      .addScaledVector(u, Math.cos(t))
      .addScaledVector(v, Math.sin(t))
      .multiplyScalar(R * 1.004);
    termPts.push(p);
  }
  const termGeo = new THREE.BufferGeometry().setFromPoints(termPts);
  disposables.push(termGeo);
  group.add(new THREE.LineLoop(termGeo, termMat));

  // PROTOTYPE seasonal sun-march (#386 diagram F). Sway the whole marker
  // ±obliquity by rotating about the east axis (⊥ to the Sun direction
  // and up), which preserves longitude while migrating the sub-solar
  // latitude — the mechanism of seasons. Moon (obliquity ~0) holds
  // still: no seasons, honestly. Honours prefers-reduced-motion.
  if (opts.seasonal && opts.seasonal.obliquityDeg > 0.5) {
    const eps = opts.seasonal.obliquityDeg * DEG;
    const axis = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      group.quaternion.setFromAxisAngle(axis, eps); // static solstice tilt
    } else {
      const periodMs = (opts.seasonal.periodSec ?? 14) * 1000;
      const q = new THREE.Quaternion();
      const start = performance.now();
      const loop = createAnimateLoop({
        onFrame: () => {
          const t = (performance.now() - start) / periodMs;
          q.setFromAxisAngle(axis, eps * Math.sin(t * Math.PI * 2));
          group.quaternion.copy(q);
        },
        reducedMotion: () => false,
      });
      loop.start();
      disposables.push({ dispose: () => loop.cleanup() });
    }
  }

  return gate(group, 'sub-solar', disposables);
}
