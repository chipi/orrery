import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  kickOffBackgroundDetect,
  resolveQualitySync,
  type QualityConfig,
} from '$lib/quality/quality-tier';
import { createSceneRenderer, WebGLUnavailableError } from '$lib/three/scene-renderer';
import { createLayeredStarField } from '$lib/three/star-field';

export interface ExploreRenderStack {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  url: URL;
  quality: QualityConfig;
  tex4kAllowed: boolean;
  renderer: THREE.WebGLRenderer;
  _orbitUp: THREE.Vector3;
  _velTangent: THREE.Vector3;
  textureLoader: THREE.TextureLoader;
  loadTexture: (file: string) => THREE.Texture;
  PLANET_LOD_IN_RATIO: number;
  PLANET_LOD_OUT_RATIO: number;
  getSunMap4k: () => THREE.Texture | null;
  sunMesh: THREE.Mesh;
  updateSunLod: (distanceToSun: number) => void;
  composer: EffectComposer;
  bloomPass: UnrealBloomPass | null;
}

/**
 * /explore's solar-system render stack, lifted verbatim from the page's onMount:
 * scene, camera, quality tier, renderer, lights, the Sun (+ 2K/4K LOD) and its
 * glow shells, the layered star field, and the composer (+ tier-gated bloom).
 * Returns null when WebGL is unavailable (the renderer shows the fallback notice).
 * WebGL-only, so coverage-excluded like explore-scene-host.
 */
export function createExploreRenderStack(
  container: HTMLElement,
  base: string,
): ExploreRenderStack | null {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.5,
    8000,
  );
  // Quality tier (URL ?quality=… > user choice > cached detect-gpu >
  // medium fallback). Sync resolver so the scene builds without
  // awaiting the GPU benchmark; the background detect updates the
  // cache for the next visit. See lib/quality/quality-tier.ts.
  // Resolved BEFORE createSceneRenderer so the pixel-ratio cap is
  // threaded in at construction (single set, no post-hoc override).
  const url = new URL(window.location.href);
  const quality = resolveQualitySync(url);
  void kickOffBackgroundDetect();
  // Gate the per-planet 4K texture LOD on tier — on minimal/low (mobile,
  // weak GPU) the 4K fetch + GPU upload cost outweighs the visual win, so
  // those tiers stay at 2K throughout. Mirrors SurfaceScene's tex4kAllowed.
  // __MOBILE__: the Capacitor build ships 2K only (4K planet textures are
  // pruned off-device, ADR-079 D3) — force 2K regardless of resolved tier.
  const tex4kAllowed = quality.tier !== 'minimal' && quality.tier !== 'low' && !__MOBILE__;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = createSceneRenderer(container, {
      pixelRatioCap: quality.pixelRatioCap,
      // Pure black surrounding space (matches /earth /moon /mars) rather than the
      // default dark-indigo clear (0x04040c).
      clearColor: 0x000000,
    });
  } catch (e) {
    // WebGL unavailable (#474/#470/#430) — the fallback notice is shown in the
    // container; bail the scene init instead of an uncaught crash.
    if (e instanceof WebGLUnavailableError) return null;
    throw e;
  }

  // Per-frame scratch vectors for the velocity-arrow overlay — reused
  // each frame instead of allocating `new THREE.Vector3()` per visible
  // planet (the animate loop runs these every frame). Safe to share:
  // each is written then consumed within a single loop iteration.
  const _orbitUp = new THREE.Vector3(0, 1, 0);
  const _velTangent = new THREE.Vector3();
  // ACES filmic tone mapping — HDR Sun → SDR roll-off so bright
  // highlights (bloomed Sun + lit planet sides) don't clip to flat
  // white. Matches the /fly helio scene's stack (#322).
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  // PRD-023 Slice A — enable shadow maps for Saturn's ring-shadow
  // effect. PCFSoftShadowMap is the cheap default; we scope the
  // perf cost by setting castShadow only on the ring mesh and
  // receiveShadow only on Saturn's planet mesh. Other planets +
  // moons + small bodies don't participate so the 6 cube-map
  // passes the PointLight shadow pipeline does each frame render
  // ~2 objects total. The sun's PointLight is the shadow caster
  // since its position is the physical Sun in the scene.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Uniform sunlight from origin (distance=0 + decay=0). The r0.185 upgrade's
  // physically-correct lighting made the prior (…, 2500, 1.2) point light fall
  // off to near-zero across the planets' 50–430u orbits, so every planet
  // rendered black ("lost textures"). Match /fly's helio fix: treat the Sun as
  // a uniform source — still a point light at origin so Saturn's ring shadow
  // casts correctly.
  const sunLight = new THREE.PointLight(0xfff4d0, 3.5, 0, 0);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.1;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);
  // HemisphereLight replaces the prior AmbientLight(0x111133, 0.8) —
  // ambient at 0.8 was flattening shadow contrast (the #1 amateur-CG
  // tell per the shot-language guide). Hemisphere at 0.08 keeps the
  // shadow side legible without erasing the single-Sun direction.
  // Sky-side faint deep-space tint; ground-side near-black so the
  // underside doesn't pick up an unphysical glow.
  scene.add(new THREE.HemisphereLight(0x08101a, 0x000000, 0.08));
  const fill = new THREE.DirectionalLight(0x223366, 0.3);
  fill.position.set(-200, 100, -200);
  scene.add(fill);

  const textureLoader = new THREE.TextureLoader();
  // PBR migration (2026-06-15): MeshStandardMaterial expects albedo
  // textures to be tagged with `colorSpace = SRGBColorSpace` so the
  // engine de-gammas the sRGB-encoded JPGs into linear before
  // lighting math, then the renderer re-gammas at output. Without
  // this tag the texture is treated as already-linear, lighting
  // operates on the wrong values, and the output gamma pass produces
  // washed-out / desaturated colors. Applies to every albedo + every
  // emissive map; normal/roughness maps (which we don't have yet)
  // would stay Linear.
  const loadTexture = (file: string): THREE.Texture => {
    const tex = textureLoader.load(`${base}/textures/${file}`);
    // r128 API — colorSpace property was added in r152. The earlier
    // `tex.colorSpace = THREE.SRGBColorSpace` lines were silent no-ops
    // here (typeof THREE.SRGBColorSpace === 'undefined' in r128).
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // Per-planet texture LOD swap (#287). 2K base loads eagerly so
  // the first paint of /explore stays cheap. 4K lazy-loads when the
  // camera approaches a planet (per-body distance threshold). Sun
  // gets the same treatment via its own pair below. Uranus +
  // Neptune skip LOD because SSS doesn't publish a 4K source for
  // either; they stay 2K eagerly.
  const SUN_RADIUS = 18;
  const PLANET_LOD_IN_RATIO = 15; // distance / planet_size ≤ this → swap to 4K + reveal moons
  const PLANET_LOD_OUT_RATIO = 20; // distance / planet_size ≥ this → swap back to 2K + hide moons

  const sunMap2k = loadTexture('2k_sun.jpg');
  let sunMap4k: THREE.Texture | null = null;
  let sun4kLoadStarted = false;
  let sunLodLevel: '2k' | '4k' = '2k';
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunMap2k, color: 0xfff0a0 });
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 32, 32), sunMaterial);
  sunMesh.userData = { planetId: '__sun__' };
  scene.add(sunMesh);
  function ensureSun4kLoaded(): void {
    // __MOBILE__: 4k_sun.jpg is pruned off-device (ADR-079 D3) — stay at 2K.
    if (sun4kLoadStarted || __MOBILE__) return;
    sun4kLoadStarted = true;
    textureLoader.load(
      `${base}/textures/4k_sun.jpg`,
      (tex) => {
        // Sun map is rendered via MeshBasicMaterial (unlit) but
        // still benefits from sRGB tagging so the texture's
        // mid-tones don't shift when output gamma is applied.
        tex.colorSpace = THREE.SRGBColorSpace;
        sunMap4k = tex;
      },
      undefined,
      () => {
        sun4kLoadStarted = false; // allow retry next threshold cross
      },
    );
  }
  function updateSunLod(distanceToSun: number): void {
    const ratio = distanceToSun / SUN_RADIUS;
    if (ratio <= PLANET_LOD_IN_RATIO) {
      ensureSun4kLoaded();
      if (sunMap4k && sunLodLevel !== '4k') {
        sunMaterial.map = sunMap4k;
        sunMaterial.needsUpdate = true;
        sunLodLevel = '4k';
      }
    } else if (ratio >= PLANET_LOD_OUT_RATIO && sunLodLevel !== '2k') {
      sunMaterial.map = sunMap2k;
      sunMaterial.needsUpdate = true;
      sunLodLevel = '2k';
    }
  }
  const glowConfigs: Array<{ r: number; color: number; opacity: number }> = [
    { r: 22, color: 0xffdd66, opacity: 0.18 },
    { r: 40, color: 0xff9922, opacity: 0.08 },
    { r: 58, color: 0xff6600, opacity: 0.04 },
    { r: 76, color: 0xff4400, opacity: 0.02 },
  ];
  for (const g of glowConfigs) {
    scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(g.r, 16, 16),
        new THREE.MeshBasicMaterial({
          color: g.color,
          transparent: true,
          opacity: g.opacity,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
  }

  // Layered cinematic star field — dim background + bright sparkle +
  // Milky Way band, counts gated by quality tier so low-end devices
  // render fewer points. Shared with /fly + /iss + /tiangong; shell
  // radius matches /explore's wide stellar outer shell.
  scene.add(
    createLayeredStarField({
      counts: {
        dim: quality.starsDim,
        bright: quality.starsBright,
        milkyWay: quality.starsMilkyWay,
      },
      shellRadius: 3000,
    }),
  );

  // Post-processing — EffectComposer + RenderPass + (optional)
  // UnrealBloomPass. Bloom is tier-gated (medium+) so minimal/low
  // skips the extra blit on weaker GPUs. Sun glow is the marquee
  // beneficiary (already textured emissive — bloom amplifies it
  // without changing the underlying material). Selection halo +
  // material-based outline still work because the composer just
  // wraps the same scene.render call.
  const composer = new EffectComposer(renderer);
  composer.setSize(container.clientWidth, container.clientHeight);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatioCap));
  composer.addPass(new RenderPass(scene, camera));
  let bloomPass: UnrealBloomPass | null = null;
  if (quality.bloomEnabled) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      quality.bloomStrength,
      quality.bloomRadius,
      quality.bloomThreshold,
    );
    composer.addPass(bloomPass);
  }

  return {
    scene,
    camera,
    url,
    quality,
    tex4kAllowed,
    renderer,
    _orbitUp,
    _velTangent,
    textureLoader,
    loadTexture,
    PLANET_LOD_IN_RATIO,
    PLANET_LOD_OUT_RATIO,
    getSunMap4k: () => sunMap4k,
    sunMesh,
    updateSunLod,
    composer,
    bloomPass,
  };
}
