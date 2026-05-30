import * as THREE from 'three';
import { R_EARTH_KM, R_MOON_KM } from '$lib/cislunar-geometry';

/**
 * Static cislunar-scene builder (ADR-058). Extracted from
 * src/routes/fly/+page.svelte onMount during W9 wave 8 (#279).
 *
 * Concern: the cislunar scene is an Earth-centred frame for Moon
 * missions — different scale, camera, and central body from the
 * heliocentric scene. Initial scene construction (lights, Earth +
 * Moon meshes, SoI rings) is mechanical and benefits from being a
 * builder function the component calls once at mount.
 *
 * Per the math-vs-UX separation: this module is UX (Three.js
 * primitives + scene wiring). It takes scalar inputs, returns scene
 * + camera + ref handles. The component owns layer-toggle
 * subscriptions, animation loop, render-loop coupling. Texture URLs
 * are passed in as parameters so the builder stays SvelteKit-base
 * agnostic.
 *
 * Scale rationale: SCALE_CISLUNAR = 1/10000 maps 1 km to 1e-4 world
 * units. Earth-Moon distance (384,400 km) → 38.44u, which fills a
 * 60° FOV at ~100u camera distance comfortably. Earth + Moon at
 * their true radii read as small but identifiable; the SoI rings
 * (Earth = 924,000 km → 92u; Moon = 66,100 km → 6.6u) frame the
 * scale.
 */

export interface CislunarSceneOptions {
  /** container.clientWidth / container.clientHeight at mount time. */
  aspect: number;
  /** Earth surface texture URL (e.g. `${base}/textures/2k_earth_daymap.jpg`). */
  earthTextureUrl: string;
  /** Moon surface texture URL (e.g. `${base}/textures/2k_moon.jpg`). */
  moonTextureUrl: string;
}

export interface CislunarSceneHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** 1 km = 1e-4 world units. Exposed so the component (or downstream
   *  builders for trajectory lines / spacecraft sprites) can scale
   *  ECI-km positions into the same scene without re-deriving it. */
  scaleCislunar: number;
  /** Directional light proxying the Sun for shading. Component does
   *  NOT need to repoint it; included so a future addition (sun-tracking
   *  per simDay) can. */
  sun: THREE.DirectionalLight;
  /** Earth mesh at origin. Component uses for raycasting / hover. */
  earth: THREE.Mesh;
  /** Moon mesh. Position is updated per frame by the component from
   *  moonEciPos(simDay) in the cislunar scale. */
  moon: THREE.Mesh;
  /** Earth sphere-of-influence torus (924,000 km radius). Hidden by
   *  default; component flips visibility when the 'soi' Science Lens
   *  layer toggles. */
  earthSoI: THREE.Mesh;
  /** Moon SoI (66,100 km). Child of `moon`, so it tracks Moon motion
   *  automatically. Same hidden-by-default visibility model. */
  moonSoI: THREE.Mesh;
  /** Cislunar Science Lens overlays (ADR-058 follow-up). All hidden
   *  by default; component flips .visible from onLayerChange callbacks
   *  and updates positions / directions per frame in the animate loop.
   *  Anchored at ECI km coords, scaled to scene units by SCALE_CISLUNAR.
   */
  overlays: CislunarOverlays;
}

export interface CislunarOverlays {
  /** Earth-gravity arrow (blue) on the spacecraft → Earth direction. */
  gravityEarth: THREE.ArrowHelper;
  /** Moon-gravity arrow (gray) on the spacecraft → Moon direction. */
  gravityMoon: THREE.ArrowHelper;
  /** Velocity tangent arrow (teal). */
  velocity: THREE.ArrowHelper;
  /** Centripetal arrow (red), points toward the dominant body. */
  centripetal: THREE.ArrowHelper;
  /** Perigee marker (pink) — placed each frame at the orbit's min-r
   *  point with respect to the active central body. */
  periMarker: THREE.Mesh;
  /** Apogee marker (blue) — same shape, max-r. */
  apoMarker: THREE.Mesh;
  /** Engine-off coast preview line — dashed yellow, two-body integrator
   *  under Earth gravity. */
  coastLine: THREE.Line;
}

const SCALE_CISLUNAR = 1 / 10000;

/** Earth SoI radius (km). Pulled out so callers / tests can refer to
 *  the same value if they need to compute related geometry. */
export const EARTH_SOI_KM = 924_000;
/** Moon SoI radius (km). */
export const MOON_SOI_KM = 66_100;

export function buildCislunarScene(opts: CislunarSceneOptions): CislunarSceneHandles {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, opts.aspect, 0.01, 4000);

  scene.add(new THREE.AmbientLight(0xeeeeff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff4d0, 1.6);
  sun.position.set(1000, 200, 1000);
  scene.add(sun);

  const texLoader = new THREE.TextureLoader();

  // Earth at origin. True physical radius scaled by SCALE_CISLUNAR.
  const earthTex = texLoader.load(opts.earthTextureUrl);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R_EARTH_KM * SCALE_CISLUNAR, 32, 32),
    new THREE.MeshStandardMaterial({
      map: earthTex,
      color: 0xffffff,
      roughness: 0.6,
    }),
  );
  scene.add(earth);

  // Moon — position updated each frame from moonEciPos(simDay).
  const moonTex = texLoader.load(opts.moonTextureUrl);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(R_MOON_KM * SCALE_CISLUNAR, 24, 24),
    new THREE.MeshStandardMaterial({
      map: moonTex,
      color: 0xffffff,
      roughness: 0.95,
    }),
  );
  scene.add(moon);

  // SoI rings — wired to the Science Lens 'soi' layer toggle (the
  // component owns the subscription). Both hidden by default; component
  // flips .visible when the toggle fires.
  const earthSoI = new THREE.Mesh(
    new THREE.TorusGeometry(EARTH_SOI_KM * SCALE_CISLUNAR, 0.08, 8, 96),
    new THREE.MeshBasicMaterial({
      color: 0x6aa9ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  earthSoI.rotation.x = Math.PI / 2;
  earthSoI.visible = false;
  scene.add(earthSoI);

  const moonSoI = new THREE.Mesh(
    new THREE.TorusGeometry(MOON_SOI_KM * SCALE_CISLUNAR, 0.04, 8, 64),
    new THREE.MeshBasicMaterial({
      color: 0xff9b6a,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  moonSoI.rotation.x = Math.PI / 2;
  moonSoI.visible = false;
  // Child of moon so the ring tracks lunar motion without per-frame
  // book-keeping in the render loop.
  moon.add(moonSoI);

  // ─── Science Lens overlays (ADR-058 follow-up) ─────────────────
  // Each overlay is hidden by default; component owns the
  // onLayerChange subscriptions + per-frame position updates.
  const ARROW_LEN = 4;
  const ARROW_HEAD_LEN = 0.7;
  const ARROW_HEAD_W = 0.4;

  const gravityEarth = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    ARROW_LEN,
    0x6aa9ff,
    ARROW_HEAD_LEN,
    ARROW_HEAD_W,
  );
  gravityEarth.visible = false;
  scene.add(gravityEarth);

  const gravityMoon = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    ARROW_LEN,
    0xcfcfcf,
    ARROW_HEAD_LEN,
    ARROW_HEAD_W,
  );
  gravityMoon.visible = false;
  scene.add(gravityMoon);

  const velocity = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    ARROW_LEN,
    0x4ecdc4,
    ARROW_HEAD_LEN,
    ARROW_HEAD_W,
  );
  velocity.visible = false;
  scene.add(velocity);

  const centripetal = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    ARROW_LEN,
    0xff6b6b,
    ARROW_HEAD_LEN,
    ARROW_HEAD_W,
  );
  centripetal.visible = false;
  scene.add(centripetal);

  const periMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.85 }),
  );
  periMarker.visible = false;
  scene.add(periMarker);

  const apoMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x6aa9ff, transparent: true, opacity: 0.85 }),
  );
  apoMarker.visible = false;
  scene.add(apoMarker);

  const coastLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.75,
      dashSize: 0.5,
      gapSize: 0.3,
    }),
  );
  coastLine.visible = false;
  scene.add(coastLine);

  return {
    scene,
    camera,
    scaleCislunar: SCALE_CISLUNAR,
    sun,
    earth,
    moon,
    earthSoI,
    moonSoI,
    overlays: {
      gravityEarth,
      gravityMoon,
      velocity,
      centripetal,
      periMarker,
      apoMarker,
      coastLine,
    },
  };
}
