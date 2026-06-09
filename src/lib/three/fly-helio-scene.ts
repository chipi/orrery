import * as THREE from 'three';
import { createStarField } from '$lib/three/star-field';
import { createSceneRenderer } from '$lib/three/scene-renderer';
import {
  DESTINATIONS,
  R_EARTH_AU,
  R_MARS_AU,
  type DestinationId,
} from '$lib/lambert-grid.constants';
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
  /** Texture URLs for the Sun + Earth + every destination body, so the
   *  /fly heliocentric scene gets the same /explore-grade photorealism
   *  for free (2026-06-06 user direction: "we have new amazing way to
   *  visualise planets on /explore. Can we take that to /fly and use
   *  same graphics for planets/sun?"). All paths typically built from
   *  `${base}/textures/<file>.jpg` by the calling component so they
   *  respect SvelteKit's base. */
  bodyTextures: {
    sun: string;
    earth: string;
    mercury: string;
    venus: string;
    mars: string;
    jupiter: string;
    saturn: string;
    uranus: string;
    neptune: string;
    pluto: string;
    ceres?: string;
  };
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
  /** Toggle visibility of the destination orbit line. Stable across
   *  destination swaps — the builder applies the visibility flag to
   *  whichever line is currently active. Used by the animate loop to
   *  hide the destination ring during cislunar Moon-mode rendering. */
  setDestinationOrbitVisible: (visible: boolean) => void;
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
    pts.push(
      new THREE.Vector3(Math.cos(a) * radius * SCALE_3D, 0, Math.sin(a) * radius * SCALE_3D),
    );
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
  );
}

/** Build the destination mesh at the given style. Texture-aware: when
 *  a map is supplied the diffuse color is white (so the texture's true
 *  colors come through) and emissive stays a faint tint of the fallback
 *  colour so the body still reads when unlit by the Sun light. */
function buildDestinationMesh(style: DestinationStyle, map: THREE.Texture | null): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(style.size, 32, 32),
    new THREE.MeshPhongMaterial({
      map: map ?? null,
      color: map ? 0xffffff : style.color,
      emissive: style.color,
      emissiveIntensity: map ? 0.05 : 0.2,
    }),
  );
}

/** Build a Saturn-style multi-band ring system around a body of the
 *  given radius. Re-uses the canonical C / B / A / Cassini / Encke / F
 *  band ratios shipped for /explore (commit ce7e97a20) but rescaled to
 *  /fly's much smaller body diameters. Returns a group the caller can
 *  add/remove as a unit when the destination switches between Saturn
 *  and another body. */
function buildSaturnRings(size: number): THREE.Group {
  const r0 = size * 1.4;
  const rOuter = size * 2.6;
  const span = rOuter - r0;
  const group = new THREE.Group();
  const bands: Array<{ inner: number; outer: number; color: number; opacity: number }> = [
    { inner: 0.0, outer: 0.18, color: 0x8a7858, opacity: 0.35 },
    { inner: 0.18, outer: 0.55, color: 0xf1d7a3, opacity: 0.62 },
    { inner: 0.55, outer: 0.6, color: 0x4a3f2c, opacity: 0.18 },
    { inner: 0.6, outer: 0.92, color: 0xddc497, opacity: 0.5 },
    { inner: 0.92, outer: 0.94, color: 0x4a3f2c, opacity: 0.15 },
    { inner: 0.94, outer: 1.0, color: 0xe4d191, opacity: 0.28 },
  ];
  for (const b of bands) {
    const geo = new THREE.RingGeometry(r0 + b.inner * span, r0 + b.outer * span, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: b.color,
      transparent: true,
      opacity: b.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(geo, mat));
  }
  group.rotation.x = Math.PI / 2.2;
  return group;
}

export function buildHelioScene(opts: HelioSceneOptions): HelioSceneHandles {
  const scene = new THREE.Scene();
  // Far plane sized for the most distant supported destination —
  // Pluto's wide framing reaches `cameraDistanceFor = max(180, a·SCALE_3D·2)
  // = 6400u` for `a = 40 AU`, plus the Sun-to-spacecraft distance from
  // the camera (another ~6400u). 16000u covers everything with margin
  // and the depth-buffer precision loss is negligible because /fly
  // never has overlapping coplanar surfaces near the far plane.
  // Previous value 4000 clipped Neptune (Voyager 2) and Pluto
  // (New Horizons) — the scene rendered black for those missions.
  const camera = new THREE.PerspectiveCamera(55, opts.aspect, 0.5, 16000);
  const renderer = createSceneRenderer(opts.container);

  scene.add(new THREE.PointLight(0xfff4d0, 3.5, 2000, 1.2));
  scene.add(new THREE.AmbientLight(0x111133, 0.8));

  // Texture loader shared by Sun + Earth + every destination body.
  const texLoader = new THREE.TextureLoader();
  const sunTex = texLoader.load(opts.bodyTextures.sun);
  const earthTex = texLoader.load(opts.bodyTextures.earth);
  const destinationTextures: Partial<Record<DestinationId, THREE.Texture>> = {};
  for (const id of Object.keys(DEST_STYLE) as DestinationId[]) {
    const url = opts.bodyTextures[id as keyof HelioSceneOptions['bodyTextures']];
    if (url) destinationTextures[id] = texLoader.load(url);
  }

  // Sun — textured emissive core + additive-blend halo. The texture
  // ships as `emissiveMap` so the Sun glows from its own surface
  // detail (granules, sunspots) without needing to be re-lit by an
  // external light. The additive halo stays unchanged.
  const sunCore = new THREE.Mesh(
    new THREE.SphereGeometry(8, 64, 64),
    new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xffffff,
    }),
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

  // Earth + initial destination (Mars) meshes — both textured.
  const earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 32, 32),
    new THREE.MeshPhongMaterial({
      map: earthTex,
      color: 0xffffff,
      emissive: 0x081a36,
      emissiveIntensity: 0.15,
    }),
  );
  scene.add(earthMesh);
  const destinationMesh = buildDestinationMesh(DEST_STYLE.mars, destinationTextures.mars ?? null);
  scene.add(destinationMesh);

  // Saturn ring system — parented to the destination mesh so it tracks
  // Saturn's per-frame position automatically. Stays in the scene at
  // all times but toggles visibility based on the active destination
  // so we don't need to dispose + rebuild on every swap.
  const saturnRings = buildSaturnRings(DEST_STYLE.saturn.size);
  saturnRings.visible = false;
  destinationMesh.add(saturnRings);

  /** Mutable visibility flag preserved across destination swaps so a
   *  cislunar mode-set followed by a setDestination still hides the
   *  newly-built ring. */
  let destinationOrbitVisible = true;

  function setDestination(id: DestinationId): void {
    const style = DEST_STYLE[id] ?? DEST_STYLE.mars;
    // Mesh geometry — dispose old, build new at the destination radius.
    destinationMesh.geometry.dispose();
    destinationMesh.geometry = new THREE.SphereGeometry(style.size, 32, 32);
    // Material — swap to the destination's texture (or null + fallback
    // colour if no texture is shipped for this body).
    const mat = destinationMesh.material as THREE.MeshPhongMaterial;
    const map = destinationTextures[id] ?? null;
    mat.map = map;
    mat.color.setHex(map ? 0xffffff : style.color);
    mat.emissive.setHex(style.color);
    mat.emissiveIntensity = map ? 0.05 : 0.2;
    mat.needsUpdate = true;
    // Orbit ring — full replace (size + colour change together).
    const orbitRadius = DESTINATIONS[id].a;
    scene.remove(destinationOrbitLine);
    destinationOrbitLine.geometry.dispose();
    (destinationOrbitLine.material as THREE.Material).dispose();
    destinationOrbitLine = buildOrbitRing(orbitRadius, style.color);
    destinationOrbitLine.visible = destinationOrbitVisible;
    scene.add(destinationOrbitLine);
    // Saturn rings — reveal only when we're at Saturn; resize the rings
    // every time so a future tuning of DEST_STYLE.saturn.size carries
    // through without a code change here.
    saturnRings.visible = id === 'saturn';
    opts.onDestinationChange?.(id);
  }

  function setDestinationOrbitVisible(visible: boolean): void {
    destinationOrbitVisible = visible;
    destinationOrbitLine.visible = visible;
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
    setDestinationOrbitVisible,
  };
}
