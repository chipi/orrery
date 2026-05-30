import * as THREE from 'three';
import { createStarField } from '$lib/three/star-field';
import { createSceneRenderer } from '$lib/three/scene-renderer';
import { DESTINATIONS, R_EARTH_AU, R_MARS_AU, type DestinationId } from '$lib/lambert-grid.constants';
import { SCALE_3D } from '$lib/fly-scene-constants';

/**
 * Static heliocentric-scene builder. Extracted from
 * src/routes/fly/+page.svelte onMount during W9 wave A (#279).
 *
 * Mirror of $lib/three/fly-cislunar-scene (wave 8) for the
 * Sun-centred frame. Owns scene + camera + renderer, lighting, the
 * Sun (core + glow), star field, Earth + destination meshes, Earth
 * + destination orbit rings, and the per-destination styling +
 * destination-swap method.
 *
 * Per the math-vs-UX separation: this module is UX (Three.js scene
 * primitives + builder). It exposes a typed setDestination() method
 * so the previously-inline marsOrbitLine mutation is encapsulated
 * (the line gets disposed + replaced inside the builder; component
 * never sees the dangling reference). The historical-Mars-arcs
 * visibility toggle is wired via an optional callback, since that
 * overlay is mission-overlay state, not base-scene state.
 *
 * Per-frame position updates (earthMesh.position, destinationMesh.position)
 * stay in the component's animate loop — the builder hands out the
 * mesh refs so the loop can mutate them directly.
 */

export interface HelioSceneOptions {
  /** The DOM container the renderer attaches its canvas into. */
  container: HTMLDivElement;
  /** container.clientWidth / container.clientHeight at mount time. */
  aspect: number;
  /** Optional notifier fired whenever setDestination(id) is called.
   *  Used by the component to flip the historical-Mars-arcs group
   *  visibility (visible only on Mars destinations). */
  onDestinationChange?: (id: DestinationId) => void;
}

export interface HelioSceneHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: ReturnType<typeof createSceneRenderer>;
  /** Sun visible-core mesh (solid yellow). */
  sunCore: THREE.Mesh;
  /** Sun additive-blending halo. */
  sunGlow: THREE.Mesh;
  /** Earth mesh — position is updated per frame by the component
   *  from earthPos(simDay) × SCALE_3D. */
  earthMesh: THREE.Mesh;
  /** Destination body mesh (Mars by default; in-place mutated by
   *  setDestination — geometry + material rebuilt at the new radius
   *  and colour). Component animates position from
   *  destinationPos(simDay) × SCALE_3D. */
  destinationMesh: THREE.Mesh;
  /** Earth orbit ring — static, never replaced. */
  earthOrbitLine: THREE.LineLoop;
  /** Switch the destination body. Disposes the previous destination
   *  orbit line + the destination mesh's geometry, builds the new
   *  ring + geometry from DEST_STYLE[id], and fires onDestinationChange.
   *  Idempotent — calling repeatedly with the same id rebuilds. */
  setDestination: (id: DestinationId) => void;
}

interface DestinationStyle {
  size: number;
  color: number;
}

/**
 * Per-destination visual styling (sphere radius + colour) for the
 * heliocentric scene. Sizes are tuned for /fly's scale — smaller
 * than /explore because the camera here sits much closer to the
 * body. Outer-planet diameters are compressed so even Jupiter
 * doesn't dominate the scene at default zoom.
 */
export const DEST_STYLE: Record<string, DestinationStyle> = {
  mercury: { size: 1.0, color: 0x9b9b9b },
  venus: { size: 2.5, color: 0xc9b870 },
  mars: { size: 1.9, color: 0xc1440e },
  jupiter: { size: 5.5, color: 0xc88b3a },
  saturn: { size: 4.8, color: 0xe4d191 },
  uranus: { size: 3.4, color: 0x7de8e8 },
  neptune: { size: 3.4, color: 0x3f54ba },
  pluto: { size: 0.9, color: 0xb9a895 },
  ceres: { size: 0.6, color: 0xa8a499 },
};

/** Earth radius in /fly heliocentric units (tuned smaller than
 *  /explore because the camera here sits closer). */
const EARTH_RADIUS = 2.6;

/** Build a LineLoop sampling one orbital revolution at a given AU
 *  radius. 128 segments smooths the ring at typical zooms; opacity
 *  0.4 reads clearly against the dark background. */
function buildOrbitRing(radius: number, color: number): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius * SCALE_3D, 0, Math.sin(a) * radius * SCALE_3D));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
  );
}

/** Build the destination mesh at the given style. */
function buildDestinationMesh(style: DestinationStyle): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(style.size, 24, 24),
    new THREE.MeshPhongMaterial({
      color: style.color,
      emissive: style.color,
      emissiveIntensity: 0.2,
    }),
  );
}

export function buildHelioScene(opts: HelioSceneOptions): HelioSceneHandles {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, opts.aspect, 0.5, 4000);
  const renderer = createSceneRenderer(opts.container);

  scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2000, 1.2));
  scene.add(new THREE.AmbientLight(0x111133, 0.8));

  // Sun — solid core + additive-blend halo. Sun visibility is owned
  // by the component (cislunar Moon-mode hides the Sun).
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(8, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff0a0 }),
  );
  scene.add(sunCore);
  const sunGlow = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff9922,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(sunGlow);

  scene.add(createStarField({ count: 2000, radius: 1500, jitter: 500, opacity: 0.7 }));

  // Earth orbit + initial destination orbit (Mars by default).
  const earthOrbitLine = buildOrbitRing(R_EARTH_AU, 0x4b9cd3);
  let destinationOrbitLine = buildOrbitRing(R_MARS_AU, 0xc1440e);
  scene.add(earthOrbitLine);
  scene.add(destinationOrbitLine);

  // Earth + initial destination (Mars) meshes.
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 24, 24),
    new THREE.MeshPhongMaterial({
      color: 0x3a8fcc,
      emissive: 0x3a8fcc,
      emissiveIntensity: 0.2,
    }),
  );
  scene.add(earthMesh);
  const destinationMesh = buildDestinationMesh(DEST_STYLE.mars);
  scene.add(destinationMesh);

  function setDestination(id: DestinationId): void {
    const style = DEST_STYLE[id] ?? DEST_STYLE.mars;
    // Mesh geometry — dispose old, build new at the destination radius.
    destinationMesh.geometry.dispose();
    destinationMesh.geometry = new THREE.SphereGeometry(style.size, 24, 24);
    // Material — recolour in place.
    const mat = destinationMesh.material as THREE.MeshPhongMaterial;
    mat.color.setHex(style.color);
    mat.emissive.setHex(style.color);
    // Orbit ring — full replace (size + colour change together).
    const orbitRadius = DESTINATIONS[id].a;
    scene.remove(destinationOrbitLine);
    destinationOrbitLine.geometry.dispose();
    (destinationOrbitLine.material as THREE.Material).dispose();
    destinationOrbitLine = buildOrbitRing(orbitRadius, style.color);
    scene.add(destinationOrbitLine);
    opts.onDestinationChange?.(id);
  }

  return {
    scene,
    camera,
    renderer,
    sunCore,
    sunGlow,
    earthMesh,
    destinationMesh,
    earthOrbitLine,
    setDestination,
  };
}
