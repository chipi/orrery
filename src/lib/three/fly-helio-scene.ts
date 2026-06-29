import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { buildSkydome } from './skydome';
import { buildSunLensFlare, type SunLensFlare } from './sun-lens-flare';
import { createLayeredStarField } from '$lib/three/star-field';
import { createSceneRenderer } from '$lib/three/scene-renderer';
import type { QualityConfig } from '$lib/quality/quality-tier';
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
    arrokoth?: string;
    vesta?: string;
    psyche?: string;
    bennu?: string;
    halley?: string;
    '67p'?: string;
  };
  /** Resolved quality config — auto-detected or user-chosen per the
   *  `src/lib/quality/quality-tier.ts` system. Drives pixelRatio,
   *  bloom on/off, sphere segments, particle counts, etc. The component
   *  resolves this BEFORE calling buildHelioScene so the builder can
   *  size everything correctly without a post-hoc rebuild. */
  quality: QualityConfig;
}

export interface HelioSceneHandles {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: ReturnType<typeof createSceneRenderer>;
  /** Post-processing pipeline. Component animate loop calls
   *  `composer.render()` instead of `renderer.render(scene, camera)`.
   *  Resize is the caller's responsibility via `composer.setSize()`. */
  composer: EffectComposer;
  /** UnrealBloom pass — non-null when quality.bloomEnabled. Exposed so
   *  the DebugPanel "Rendering" tab (#334) can live-tune threshold /
   *  strength / radius without a reload. */
  bloomPass: UnrealBloomPass | null;
  /** Bokeh depth-of-field pass — non-null only on the cinematic tier.
   *  The component animate loop pokes `bokehPass.uniforms.focus.value`
   *  per frame with the camera-to-spacecraft distance so the focal
   *  plane tracks the hero subject. Other uniforms (aperture, maxblur)
   *  are baked at construction. */
  bokehPass: BokehPass | null;
  /** FilmPass — celluloid grain. Non-null when quality.filmGrainEnabled.
   *  Exposed for the Rendering tab's per-pass enable toggle (#334). */
  filmPass: FilmPass | null;
  /** ShaderPass wrapping VignetteShader — corner darkening. Non-null
   *  when quality.vignetteEnabled. Exposed for the Rendering tab. */
  vignettePass: ShaderPass | null;
  /** Procedural-skydome inverted-sphere mesh. Non-null when
   *  quality.skydomeEnabled. Exposed so the Rendering tab can flip
   *  `.visible` for live A/B without a reload. */
  skydomeMesh: THREE.Mesh | null;
  /** Sun lens flare — non-null only on the cinematic tier. The
   *  component animate loop calls `sunLensFlare.update(camera)` per
   *  frame to recompute ghost positions from the Sun's screen-space
   *  projection. */
  sunLensFlare: SunLensFlare | null;
  /** Sun visible-core mesh (solid yellow). */
  sunCore: THREE.Mesh;
  /** Sun additive-blending halo. */
  sunGlow: THREE.Mesh;
  /** Context-planet meshes for every non-active planet (Mercury,
   *  Venus, Mars, Jupiter, Saturn, Uranus, Neptune). Component updates
   *  positions per frame via destinationPos(simDay, id). Toggled via
   *  setContextPlanetsVisible — useful for grand-tour missions where
   *  the user benefits from seeing every body the spacecraft visits.
   *  Each entry is a small mesh (DEST_STYLE-sized) with a matching
   *  orbit ring. The mesh + ring for the CURRENTLY ACTIVE destination
   *  is hidden (the dedicated destinationMesh + destinationOrbitLine
   *  render in its place). */
  contextPlanets: Map<DestinationId, THREE.Mesh>;
  contextOrbits: Map<DestinationId, THREE.LineLoop>;
  setContextPlanetsVisible(visible: boolean): void;
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
  /** Toggle Hill sphere wireframes around every planet (Earth + the
   *  7 context planets). Mirrors /explore (PRD-023 Slice B). */
  setHillSpheresVisible: (visible: boolean) => void;
  /** Toggle L1 + L2 markers around every planet, positioned along the
   *  planet→Sun line. Mirrors /explore (PRD-023 Slice B). */
  setLagrangePointsVisible: (visible: boolean) => void;
  /** Update Hill sphere + L1 / L2 positions for a body given its
   *  current world position (after SCALE_3D conversion). Component
   *  calls this once per frame for every body it tracks. */
  updateHillSphereForBody: (id: DestinationId | 'earth', worldX: number, worldZ: number) => void;
  /** Toggle stylised magnetosphere shells around bodies with strong
   *  dynamos (Earth + the four gas giants). PRD-023 Slice D. */
  setMagnetospheresVisible: (visible: boolean) => void;
  /** Update magnetosphere position + orientation for a body. The shell
   *  stretches along the body→anti-Sun axis (the magnetotail direction)
   *  so component calls this each frame with the body's world position. */
  updateMagnetosphereForBody: (id: DestinationId | 'earth', worldX: number, worldZ: number) => void;
  /** Toggle the major-moon overlay — Galilean moons at Jupiter, Titan /
   *  Enceladus / Iapetus at Saturn, the Moon at Earth, Phobos / Deimos
   *  at Mars, Triton at Neptune. Each moon ships with a thin orbit
   *  ring centred on its parent. */
  setMoonsVisible: (visible: boolean) => void;
  /** Update moon meshes + orbit-ring centres for one parent planet.
   *  Component calls this each frame for every planet whose moons
   *  should track. Phase angle = simDay × 2π / periodDays. */
  updateMoonsForParent: (
    parent: DestinationId | 'earth',
    parentX: number,
    parentZ: number,
    simDay: number,
  ) => void;
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
  // Arrokoth — real radius ~18 km vs Pluto's 1188 km, but cinematically
  // it needs presence on screen during the NH 2019 flyby beat. Size 0.5
  // is the smallest body in DEST_STYLE that still reads at the iconic
  // composition distance. Color #9b5a48 — the canonical deep-red of
  // cold-classical KBOs (Stern et al., Science 2020).
  arrokoth: { size: 0.5, color: 0x9b5a48 },
  // Other asteroid destinations — Dawn at Vesta, OSIRIS-REx at Bennu,
  // Psyche mission to Psyche. Visual radii stylised (small enough to
  // distinguish from planets, big enough to compose iconic shots).
  vesta: { size: 0.45, color: 0xb8a890 },
  psyche: { size: 0.4, color: 0xa8a090 },
  bennu: { size: 0.3, color: 0x605a55 },
  // Comet nuclei — dark dusty bodies (Giotto/Halley + Rosetta/67P).
  // Halley nucleus reflectance ~0.04 (one of the darkest solar-system
  // bodies); 67P similar dark-grey. Colors stylised slightly brighter
  // than real albedo so the silhouette reads against the bloom.
  halley: { size: 0.35, color: 0x4a4744 },
  '67p': { size: 0.3, color: 0x5a5550 },
  // #341 Batch 5 small bodies — see PLANET_SIZES for size rationale.
  // Colors stylised per spectral class:
  //   - S-type (Itokawa, Didymos, Dimorphos): tan / silicate
  //   - C-type (Donaldjohanson, Eurybates): dark grey / carbonaceous
  //   - P-type (Polymele, Patroclus, Menoetius): dark brown-grey
  //   - D-type (Leucus, Orus): dark red-brown / primitive outer disc
  itokawa: { size: 0.35, color: 0xc1a075 },
  didymos: { size: 0.4, color: 0xb89570 },
  dimorphos: { size: 0.25, color: 0xa88860 },
  donaldjohanson: { size: 0.3, color: 0x3a3530 },
  eurybates: { size: 0.45, color: 0x4a4540 },
  polymele: { size: 0.35, color: 0x4a3f38 },
  leucus: { size: 0.4, color: 0x5a3a30 },
  orus: { size: 0.4, color: 0x5a4030 },
  patroclus: { size: 0.55, color: 0x4a3a30 },
  menoetius: { size: 0.5, color: 0x4a3a30 },
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
  // Pixel-ratio cap from the quality config — 0.5 on minimal (half-
  // res buffer for integrated graphics) up to 2.0 on high/cinematic.
  // The renderer's own clamp is min(devicePixelRatio, cap).
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.quality.pixelRatioCap));
  // ACES Filmic tone mapping — handles HDR Sun → SDR display the way
  // every cinematic space animation does. Single highest-impact line
  // for "cinematic feel" with zero performance cost. See
  // docs/guides/fly-cinematic-shot-language.md §T7 for the wider post
  // stack we'll layer on top in subsequent waves.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Post-processing pipeline — composer chains a sequence of passes
  // operating on the previous pass's output. Skipped entirely on the
  // `minimal` + `low` tiers where the perf budget can't afford even
  // one extra blit. On medium+ we wire RenderPass + UnrealBloomPass;
  // the bloom strength + threshold scale per tier so the cinematic
  // tier blooms more aggressively than medium.
  const containerW = opts.container.clientWidth || 1;
  const containerH = opts.container.clientHeight || 1;
  const composer = new EffectComposer(renderer);
  composer.setSize(containerW, containerH);
  composer.addPass(new RenderPass(scene, camera));
  let bloomPass: UnrealBloomPass | null = null;
  if (opts.quality.bloomEnabled) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(containerW, containerH),
      opts.quality.bloomStrength,
      opts.quality.bloomRadius,
      opts.quality.bloomThreshold,
    );
    composer.addPass(bloomPass);
  }
  // Bokeh depth-of-field — wave 2/3 punch #6. Appended after bloom so
  // bright bloomed highlights still contribute to bokeh discs. Focus
  // distance is updated per frame by the component animate loop (the
  // bokehPass handle is returned so the caller can poke
  // `bokehPass.uniforms.focus.value` with camera→spacecraft distance).
  // Aperture + maxblur baked here — increasing aperture deepens the
  // out-of-focus blur ring; maxblur caps the worst-case kernel radius.
  let bokehPass: BokehPass | null = null;
  if (opts.quality.dofEnabled) {
    bokehPass = new BokehPass(scene, camera, {
      focus: 100,
      aperture: 0.00012,
      maxblur: 0.008,
    });
    composer.addPass(bokehPass);
  }
  // Film grain — wave 2/3 punch #7. Subtle photographic noise layer
  // appended after bloom/DoF so the grain modulates the FINAL composed
  // image (not the pre-bloom hi-contrast pass — that would erase the
  // noise under the bloom blur). Scanlines + grayscale disabled —
  // just noise — so we get "shot on film" texture without retro-CRT
  // overlay. Tier-gated at medium+. Noise intensity intentionally low
  // (0.18) — celluloid grain, not VHS static.
  let filmPass: FilmPass | null = null;
  if (opts.quality.filmGrainEnabled) {
    filmPass = new FilmPass(0.18, 0, 0, 0);
    composer.addPass(filmPass);
  }
  // Vignette — wave 2/3 punch #8. Cheapest of the polish passes:
  // single full-screen fragment that darkens the corners proportional
  // to dot(uv, uv). Offset 0.95 = mild radial falloff; darkness 0.6 =
  // visible corner shade without crushing the frame. Last in the
  // chain so it modulates the final composed image (bloom highlights
  // included). Tier-gated at medium+ — even minimal-budget GPUs can
  // afford this single quad blit on a desktop screen, but we keep the
  // single off-switch in case a constrained device profile asks for it.
  let vignettePass: ShaderPass | null = null;
  if (opts.quality.vignetteEnabled) {
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms['offset'].value = 0.95;
    vignettePass.uniforms['darkness'].value = 0.6;
    composer.addPass(vignettePass);
  }
  // Procedural skydome — wave 2/3 punch #9. Large inverted sphere with
  // a CanvasTexture painting a Milky Way band gradient + sparse bright
  // stars. Augments the Points-based starfield rather than replacing it
  // — the Points provide the dense pinprick population, the skydome
  // provides the soft galactic-band glow that point sprites can't
  // carry. renderOrder -1000 + depthWrite false so everything else in
  // the scene composes in front. Tier-gated (high+).
  let skydomeMesh: THREE.Mesh | null = null;
  if (opts.quality.skydomeEnabled) {
    const sky = buildSkydome();
    skydomeMesh = sky.mesh;
    scene.add(skydomeMesh);
    // GC reclaims the sphere geometry + canvas texture when the scene
    // is torn down; the caller's cleanup destroys the renderer and
    // drops the WebGL context, freeing the GPU-side allocation.
  }
  // Sun lens flare — wave 2/3 punch #10. Sprite cluster anchored at
  // the Sun world position. Caller updates per frame from the animate
  // loop so ghost positions track the camera. Cinematic only.
  let sunLensFlare: SunLensFlare | null = null;
  if (opts.quality.lensFlareEnabled) {
    sunLensFlare = buildSunLensFlare({
      anchor: new THREE.Vector3(0, 0, 0),
      baseScale: 30,
    });
    scene.add(sunLensFlare.group);
  }

  // Sun illumination — uniform across the scene (distance=0 + decay=0).
  // Outer-planet missions (Voyager 1/2 at Saturn/Uranus/Neptune, New
  // Horizons at Pluto, Pioneer 10/11 at Jupiter/Saturn) sit BEYOND the
  // prior 2000-unit cutoff (Neptune at 30 AU × SCALE_3D=80 = 2400u),
  // so the PointLight previously gave them zero light and they rendered
  // near-black — see the Voyager 2 / Neptune smoke. Physical-accuracy
  // here is a non-goal vs the throne-of-glory cinematic vision; treat
  // sunlight as a uniform directional from origin. Inner planets keep
  // their existing look (they were already inside the previous
  // (1−d/D)^decay ≈ 1 plateau); outer planets finally show up lit.
  scene.add(new THREE.PointLight(0xfff4d0, 3.5, 0, 0));
  // HemisphereLight replaces the prior AmbientLight(0x111133, 0.8) —
  // ambient fill at non-zero intensity flattens shadow contrast (the
  // #1 amateur-CG tell per the shot-language guide). Hemisphere at
  // intensity 0.08 keeps the shadow side legible without erasing the
  // single-Sun direction. Sky-side gets a faint deep-space tint;
  // ground-side near-black so the underside doesn't pick up an
  // unphysical glow.
  scene.add(new THREE.HemisphereLight(0x08101a, 0x000000, 0.08));

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

  // Background = three layered star populations instead of the single
  // sparse field. Cinematic space frames are NOT pure black — they have
  // depth + structure (zodiacal light, galactic plane gradient). See
  // shot-language guide P1 + T8. The helper builds dim background +
  // bright sparkle + Milky Way band as a single Group; counts come
  // from the quality tier so low-tier devices render fewer points.
  scene.add(
    createLayeredStarField({
      counts: {
        dim: opts.quality.starsDim,
        bright: opts.quality.starsBright,
        milkyWay: opts.quality.starsMilkyWay,
      },
      shellRadius: 1500,
    }),
  );

  // Asteroid belt + Kuiper belt — same sampling shape as /explore so
  // the cruise view reads the same way at a glance. Belt particles
  // live in scene units (heliocentric AU × SCALE_3D) so they sit at
  // their real orbital radii. Visible by default — they fade naturally
  // when the camera is close to a planet, and read as a soft ring at
  // cruise scales (where the user benefits most from seeing them).
  const sampleBelt = (count: number, innerAu: number, outerAu: number, slabAu: number) => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = (innerAu + Math.random() * (outerAu - innerAu)) * SCALE_3D;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * slabAu * SCALE_3D;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  };
  // Main belt — real bounds 2.2–3.2 AU. Warm sandy palette.
  const asteroidBeltGeo = new THREE.BufferGeometry();
  asteroidBeltGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(sampleBelt(opts.quality.asteroidBeltParticles, 2.2, 3.2, 0.1), 3),
  );
  const asteroidBelt = new THREE.Points(
    asteroidBeltGeo,
    new THREE.PointsMaterial({
      color: 0xb8a470,
      size: 1.0,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
    }),
  );
  scene.add(asteroidBelt);
  // Kuiper belt — real bounds ~30–50 AU. Cooler bluish, sparser.
  const kuiperBeltGeo = new THREE.BufferGeometry();
  kuiperBeltGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(sampleBelt(opts.quality.kuiperBeltParticles, 30, 50, 0.18), 3),
  );
  const kuiperBelt = new THREE.Points(
    kuiperBeltGeo,
    new THREE.PointsMaterial({
      color: 0x9fc6e3,
      size: 1.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.4,
    }),
  );
  scene.add(kuiperBelt);

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

  // Context planets — Mercury through Neptune. Each renders at its
  // canonical DEST_STYLE size (smaller than Earth, but visible). For
  // grand-tour missions the user benefits from seeing every planet
  // the spacecraft visits as a flyby, not just the final destination.
  // Hidden by default; the calling component toggles visibility based
  // on the mission's flight.events roster. The mesh + orbit matching
  // the currently active destination stays HIDDEN inside this group
  // because destinationMesh + destinationOrbitLine render in its place.
  const CONTEXT_PLANET_IDS: DestinationId[] = [
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ];
  const contextPlanets = new Map<DestinationId, THREE.Mesh>();
  const contextOrbits = new Map<DestinationId, THREE.LineLoop>();
  let contextPlanetsGlobalVisible = false;
  let activeDestinationId: DestinationId = 'mars';
  for (const id of CONTEXT_PLANET_IDS) {
    const style = DEST_STYLE[id];
    if (!style) continue;
    const mesh = buildDestinationMesh(style, destinationTextures[id] ?? null);
    mesh.visible = false;
    scene.add(mesh);
    contextPlanets.set(id, mesh);
    const orbit = buildOrbitRing(DESTINATIONS[id].a, style.color);
    orbit.visible = false;
    scene.add(orbit);
    contextOrbits.set(id, orbit);
  }

  // Moons + their orbit rings for the major flyby bodies — same
  // /explore satellites pattern (PRD-026, GH #287 Slice D) compressed
  // to /fly's smaller per-planet body radii. Each moon is a small
  // textureless coloured sphere; each orbit is a thin line loop
  // centred on the parent planet. Positions update per frame from a
  // wall-clock drift phase (see updateMoonsForParent). Hidden by
  // default; toggled on by setMoonsVisible (gated via the science-lens
  // "moons" layer in the calling component).
  //
  // Wall-clock seconds that map to one real orbital day of moon drift.
  // Picked so the fastest moon (Phobos, 0.32 d) takes ~10 s per scene
  // revolution — a calm, readable drift rather than the old simSpeed-
  // coupled strobe. Relative speeds are preserved linearly.
  const MOON_SCENE_SECONDS_PER_DAY = 31.25;
  type MoonSpec = {
    parent: DestinationId | 'earth';
    name: string;
    color: number;
    sizeUnits: number;
    orbitUnits: number;
    periodDays: number;
    inclDeg: number;
  };
  const MOON_SYSTEM: MoonSpec[] = [
    // Earth — the Moon. Compressed to ~3 × Earth radius (real 60 ×).
    {
      parent: 'earth',
      name: 'Moon',
      color: 0xd8d8d8,
      sizeUnits: 0.7,
      orbitUnits: 7,
      periodDays: 27.32,
      inclDeg: 5.14,
    },
    // Mars — Phobos + Deimos.
    {
      parent: 'mars',
      name: 'Phobos',
      color: 0x9a8b7d,
      sizeUnits: 0.3,
      orbitUnits: 4,
      periodDays: 0.32,
      inclDeg: 1.08,
    },
    {
      parent: 'mars',
      name: 'Deimos',
      color: 0xb8a89a,
      sizeUnits: 0.2,
      orbitUnits: 6,
      periodDays: 1.26,
      inclDeg: 1.79,
    },
    // Jupiter — Galilean moons. Real distances 6–26 Jupiter radii;
    // compressed to keep them inside the flyby cinema framing.
    {
      parent: 'jupiter',
      name: 'Io',
      color: 0xebd28a,
      sizeUnits: 0.9,
      orbitUnits: 10,
      periodDays: 1.77,
      inclDeg: 0.05,
    },
    {
      parent: 'jupiter',
      name: 'Europa',
      color: 0xd8d2c3,
      sizeUnits: 0.8,
      orbitUnits: 13,
      periodDays: 3.55,
      inclDeg: 0.47,
    },
    {
      parent: 'jupiter',
      name: 'Ganymede',
      color: 0x9c8b76,
      sizeUnits: 1.2,
      orbitUnits: 17,
      periodDays: 7.15,
      inclDeg: 0.2,
    },
    {
      parent: 'jupiter',
      name: 'Callisto',
      color: 0x6e5e4d,
      sizeUnits: 1.1,
      orbitUnits: 22,
      periodDays: 16.69,
      inclDeg: 0.28,
    },
    // Saturn — Titan + Enceladus + Iapetus (the iconic three).
    {
      parent: 'saturn',
      name: 'Titan',
      color: 0xc59b62,
      sizeUnits: 1.0,
      orbitUnits: 14,
      periodDays: 15.95,
      inclDeg: 0.34,
    },
    {
      parent: 'saturn',
      name: 'Enceladus',
      color: 0xeaeaea,
      sizeUnits: 0.5,
      orbitUnits: 9,
      periodDays: 1.37,
      inclDeg: 0.02,
    },
    {
      parent: 'saturn',
      name: 'Iapetus',
      color: 0x7a6857,
      sizeUnits: 0.8,
      orbitUnits: 20,
      periodDays: 79.32,
      inclDeg: 15.47,
    },
    // Neptune — Triton (the only large one).
    {
      parent: 'neptune',
      name: 'Triton',
      color: 0xcdbba6,
      sizeUnits: 0.9,
      orbitUnits: 8,
      periodDays: 5.88,
      inclDeg: 156.89,
    },
  ];
  type MoonEntry = { spec: MoonSpec; mesh: THREE.Mesh; orbit: THREE.LineLoop };
  const moonEntries: MoonEntry[] = [];
  for (const spec of MOON_SYSTEM) {
    const mat = new THREE.MeshPhongMaterial({
      color: spec.color,
      emissive: spec.color,
      emissiveIntensity: 0.18,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.sizeUnits, 16, 16), mat);
    mesh.visible = false;
    scene.add(mesh);
    // Orbit ring — built once per moon at radius spec.orbitUnits,
    // tinted to the moon's colour at low opacity so the parent body
    // still reads as the dominant subject during flyby cinema.
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * spec.orbitUnits, 0, Math.sin(a) * spec.orbitUnits));
    }
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: spec.color, transparent: true, opacity: 0.35 }),
    );
    orbit.visible = false;
    scene.add(orbit);
    moonEntries.push({ spec, mesh, orbit });
  }
  let moonsVisible = false;
  function setMoonsVisible(on: boolean): void {
    moonsVisible = on;
    for (const m of moonEntries) {
      m.mesh.visible = on;
      m.orbit.visible = on;
    }
  }
  /** Update every moon's position + orbit-ring centre for the given
   *  parent-planet world position + a wall-clock drift phase. Component
   *  calls this once per frame for each parent (Earth + every context
   *  planet). Phase is driven by `driftSec` — real wall-clock seconds
   *  the caller accumulates ONLY while the sim plays (decoupled from
   *  simSpeed) — so the moons read as a calm drift at any play speed
   *  instead of strobing, and hold still during cinematic freezes.
   *  Per-moon offset keeps them from all aligning at drift 0. */
  function updateMoonsForParent(
    parent: DestinationId | 'earth',
    parentX: number,
    parentZ: number,
    driftSec: number,
  ): void {
    if (!moonsVisible) return;
    for (const m of moonEntries) {
      if (m.spec.parent !== parent) continue;
      m.orbit.position.set(parentX, 0, parentZ);
      // Inclination-tilt the orbit ring around the X axis so it
      // visibly diverges from the ecliptic.
      m.orbit.rotation.x = (m.spec.inclDeg * Math.PI) / 180;
      // Moon mesh: ride the orbit at the current phase angle. One scene
      // revolution = periodDays × MOON_SCENE_SECONDS_PER_DAY wall-clock
      // seconds, so real relative speeds are preserved (Io still laps
      // Callisto) but compressed into a calm range: Phobos ~10 s/rev,
      // Iapetus barely drifts. Nothing strobes, nothing is dead-static.
      const sceneSecondsPerRev = m.spec.periodDays * MOON_SCENE_SECONDS_PER_DAY;
      const phase =
        (driftSec / sceneSecondsPerRev) * Math.PI * 2 +
        // Deterministic per-moon offset so a fresh load doesn't
        // line every moon up at phase 0.
        m.spec.name.charCodeAt(0) * 0.37;
      const x = parentX + Math.cos(phase) * m.spec.orbitUnits;
      const z = parentZ + Math.sin(phase) * m.spec.orbitUnits;
      m.mesh.position.set(x, 0, z);
    }
  }

  function applyContextVisibility(): void {
    for (const [id, mesh] of contextPlanets) {
      const isActiveDest = id === activeDestinationId;
      mesh.visible = contextPlanetsGlobalVisible && !isActiveDest;
      const orbit = contextOrbits.get(id);
      if (orbit) orbit.visible = contextPlanetsGlobalVisible && !isActiveDest;
    }
  }

  function setContextPlanetsVisible(visible: boolean): void {
    contextPlanetsGlobalVisible = visible;
    applyContextVisibility();
  }

  // Hill spheres + L1 / L2 markers — mirrors /explore (PRD-023 Slice B).
  // Hill sphere = wireframe sphere at 6× the planet's visual radius,
  // marking the gravity-dominance boundary; L1 / L2 = small gold dots
  // along the planet→Sun line at ~Hill-radius distance. Built for every
  // body the spacecraft might fly by (Earth + the 7 context planets)
  // and the active destination. Hidden by default; toggled via
  // setHillSpheresVisible / setLagrangePointsVisible, which the
  // component wires to the science-layers panel.
  const HILL_COLOR = 0xff66cc;
  const LAGRANGE_COLOR = 0xffd766;
  function buildHillSphere(planetRadius: number): THREE.LineSegments {
    const geo = new THREE.WireframeGeometry(new THREE.SphereGeometry(planetRadius * 6, 16, 12));
    const mat = new THREE.LineBasicMaterial({
      color: HILL_COLOR,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const mesh = new THREE.LineSegments(geo, mat);
    mesh.visible = false;
    return mesh;
  }
  function buildLagrangeMarker(planetRadius: number): THREE.Mesh {
    const geo = new THREE.SphereGeometry(Math.max(0.4, planetRadius * 0.4), 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: LAGRANGE_COLOR,
      transparent: true,
      opacity: 0.92,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    return mesh;
  }
  type HillEntry = {
    hill: THREE.LineSegments;
    l1: THREE.Mesh;
    l2: THREE.Mesh;
    planetRadius: number;
  };
  const hillEntries = new Map<DestinationId | 'earth', HillEntry>();
  // Earth
  {
    const entry: HillEntry = {
      hill: buildHillSphere(EARTH_RADIUS),
      l1: buildLagrangeMarker(EARTH_RADIUS),
      l2: buildLagrangeMarker(EARTH_RADIUS),
      planetRadius: EARTH_RADIUS,
    };
    scene.add(entry.hill);
    scene.add(entry.l1);
    scene.add(entry.l2);
    hillEntries.set('earth', entry);
  }
  for (const id of CONTEXT_PLANET_IDS) {
    const style = DEST_STYLE[id];
    if (!style) continue;
    const entry: HillEntry = {
      hill: buildHillSphere(style.size),
      l1: buildLagrangeMarker(style.size),
      l2: buildLagrangeMarker(style.size),
      planetRadius: style.size,
    };
    scene.add(entry.hill);
    scene.add(entry.l1);
    scene.add(entry.l2);
    hillEntries.set(id, entry);
  }
  let lagrangePointsVisible = false;
  function setHillSpheresVisible(on: boolean): void {
    for (const entry of hillEntries.values()) entry.hill.visible = on;
  }
  function setLagrangePointsVisible(on: boolean): void {
    lagrangePointsVisible = on;
    for (const entry of hillEntries.values()) {
      entry.l1.visible = on;
      entry.l2.visible = on;
    }
  }
  /** Update Hill sphere + L1 / L2 positions to track the given planet's
   *  world position. L1 sits between planet and Sun (toward origin);
   *  L2 sits on the far side. Distance = 6 × planet visual radius
   *  (matches the Hill sphere wireframe radius, same /explore
   *  approximation). The component calls this in its animate loop with
   *  the live earth + destination + context positions. */
  function updateHillSphereForBody(
    id: DestinationId | 'earth',
    worldX: number,
    worldZ: number,
  ): void {
    const entry = hillEntries.get(id);
    if (!entry) return;
    entry.hill.position.set(worldX, 0, worldZ);
    if (!lagrangePointsVisible) return;
    const r = Math.hypot(worldX, worldZ);
    if (r < 1e-6) return;
    const ux = worldX / r;
    const uz = worldZ / r;
    const offset = entry.planetRadius * 6;
    entry.l1.position.set(worldX - ux * offset, 0, worldZ - uz * offset);
    entry.l2.position.set(worldX + ux * offset, 0, worldZ + uz * offset);
  }

  // Magnetosphere shells — same /explore palette (PRD-023 Slice D).
  // Only bodies with significant dynamos get one: Earth + the four gas
  // giants. Each shell is a stretched ellipsoid (4× planet radius,
  // scaled 1:0.7:2.4 — long axis runs along the body→anti-Sun line
  // each frame, so the magnetotail trails away from the Sun naturally).
  const MAGNETOSPHERE_BODIES = new Set<DestinationId | 'earth'>([
    'earth',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
  ]);
  type MagEntry = { mesh: THREE.Mesh; planetRadius: number };
  const magEntries = new Map<DestinationId | 'earth', MagEntry>();
  for (const id of MAGNETOSPHERE_BODIES) {
    const planetRadius = id === 'earth' ? EARTH_RADIUS : DEST_STYLE[id]?.size;
    if (planetRadius == null) continue;
    const geo = new THREE.SphereGeometry(planetRadius * 4, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: id === 'jupiter' ? 0xff66dd : 0x66ddff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 0.7, 2.4);
    mesh.visible = false;
    scene.add(mesh);
    magEntries.set(id, { mesh, planetRadius });
  }
  function setMagnetospheresVisible(on: boolean): void {
    for (const entry of magEntries.values()) entry.mesh.visible = on;
  }
  /** Update magnetosphere position + orientation so its long axis runs
   *  along the body→anti-Sun line (the magnetotail direction). */
  function updateMagnetosphereForBody(
    id: DestinationId | 'earth',
    worldX: number,
    worldZ: number,
  ): void {
    const entry = magEntries.get(id);
    if (!entry) return;
    entry.mesh.position.set(worldX, 0, worldZ);
    // Orient the stretched axis (Z, the 2.4× scale axis) along the
    // anti-Sun direction. Rotation around Y aligns the local +Z with
    // the world vector from the Sun (origin) through the body.
    const angle = Math.atan2(worldZ, worldX);
    // Three.js sphere's local +Z points along the geometry's pole. We
    // rotate so local +Z aligns with (worldX, worldZ) — gives the
    // magnetotail a "swept back from the Sun" feel.
    entry.mesh.rotation.set(0, -angle + Math.PI / 2, 0);
  }

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
    activeDestinationId = id;
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
    // Refresh context-planet visibility so the new active destination's
    // context mesh hides (the dedicated destinationMesh covers it) and
    // the previous one re-appears.
    applyContextVisibility();
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
    composer,
    bloomPass,
    bokehPass,
    filmPass,
    vignettePass,
    skydomeMesh,
    sunLensFlare,
    sunCore,
    sunGlow,
    earthMesh,
    destinationMesh,
    earthOrbitLine,
    contextPlanets,
    contextOrbits,
    setContextPlanetsVisible,
    setDestination,
    setDestinationOrbitVisible,
    setHillSpheresVisible,
    setLagrangePointsVisible,
    updateHillSphereForBody,
    setMagnetospheresVisible,
    updateMagnetosphereForBody,
    setMoonsVisible,
    updateMoonsForParent,
  };
}
