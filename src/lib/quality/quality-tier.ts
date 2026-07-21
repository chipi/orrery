/**
 * Graphics quality tier system for /fly (and re-usable for other 3D
 * routes). Auto-detects the user's GPU via `detect-gpu`, maps the
 * benchmark score to a tier, allows manual user override via
 * localStorage, and exposes the resolved configuration as a Svelte
 * 5 `$state` rune.
 *
 * Five tiers from `minimal` to `cinematic`. Each tier configures
 * every gross knob in the helio scene so a single value drives the
 * whole degrade path:
 *
 *   minimal  — integrated graphics, mobile. No post stack. Half-res.
 *   low      — older laptops. No bloom. Native res with pixelRatio 1.
 *   medium   — modern laptops integrated GPU. Bloom on, half-res buffer.
 *   high     — discrete GPU. Bloom on, full-res buffer, full geometry.
 *   cinematic — beefy GPU. Bloom + future DoF + grain. Full everything.
 *
 * The runtime adaptive layer (see `attachFrameMonitor`) measures
 * rolling average frame time and surfaces a notification when the
 * scene struggles; the user-facing dialog suggests demoting one tier.
 * We DON'T silently demote — that would change the scene mid-shot
 * which is its own UX problem.
 *
 * Storage key: `orrery.qualityTier` in localStorage. Values: a tier
 * string, or `'auto'` to follow `detect-gpu`. Default `'auto'`.
 */

// detect-gpu ships dual ESM/CJS — under SSR/Vite's CJS bridge the
// named export isn't reachable; under browser ESM it is. Use a
// dynamic import inside the call so the module is only touched
// when we actually need it (also lets first paint happen before
// the benchmark library loads).
type GpuTierResult = { tier: number; isMobile?: boolean };

export type QualityTier = 'minimal' | 'low' | 'medium' | 'high' | 'cinematic';

export interface QualityConfig {
  tier: QualityTier;
  /** Multiplier on devicePixelRatio. 0.5 = half-res buffer; 1.0 =
   *  pixelRatio 1 (no retina upscale); 2.0 = let the device decide
   *  up to the renderer's clamp. */
  pixelRatioCap: number;
  /** Whether to wire the EffectComposer + RenderPass + bloom pass. */
  postEnabled: boolean;
  /** Whether to include the UnrealBloomPass when post is on. */
  bloomEnabled: boolean;
  /** Bloom strength (when enabled). */
  bloomStrength: number;
  /** Bloom radius (when enabled). */
  bloomRadius: number;
  /** Bloom threshold (when enabled). */
  bloomThreshold: number;
  /** SphereGeometry width × height segments for planet meshes. */
  sphereSegments: number;
  /** Asteroid belt particle count. */
  asteroidBeltParticles: number;
  /** Kuiper belt particle count. */
  kuiperBeltParticles: number;
  /** Star field — dim background population. */
  starsDim: number;
  /** Star field — bright sparkle population. */
  starsBright: number;
  /** Star field — Milky Way band population. */
  starsMilkyWay: number;
  /** Whether to apply the rim-light Fresnel injection on spacecraft. */
  rimLightEnabled: boolean;
  /** Whether to append a Bokeh depth-of-field pass. Cinematic only —
   *  DoF is the most expensive post pass we wire and the focal-distance
   *  driving requires per-frame uniform updates the caller has to feed. */
  dofEnabled: boolean;
  /** Whether to append a subtle FilmPass grain. Cheaper than DoF but
   *  still tier-gated (medium+) — adds a photographic noise layer that
   *  reads as celluloid texture rather than dirty pixels. Scanlines off
   *  + grayscale off — just noise. */
  filmGrainEnabled: boolean;
  /** Whether to append a vignette ShaderPass. Cheapest of the polish
   *  passes — single full-screen fragment — so wired from medium+. */
  vignetteEnabled: boolean;
  /** Whether to add a procedural skydome — large inverted sphere with
   *  an equirectangular CanvasTexture painting a Milky Way band + a
   *  sparse field of brighter stars. Augments (doesn't replace) the
   *  existing Points-based star field. Wired at high+ — the additional
   *  sphere doubles overdraw, so we keep it off on weaker GPUs. */
  skydomeEnabled: boolean;
  /** Whether to install the hero IBL environment (`heroEnvironment`) on the
   *  scene. IBL gives the PBR hero models (rockets, capsules, landers, probes)
   *  real reflections/glints — but per-fragment env sampling is a per-frame GPU
   *  cost that starves the render loop on software-GL / GPU-less devices (it
   *  tipped the surface + /fly-descent CI e2e past their timing walls). Wired at
   *  high+ only, so capable GPUs get the cinematic reflections while weak/
   *  software-GL renderers (incl. the CI SwiftShader runner, which resolves to
   *  `medium`/`minimal`) skip it. See feedback_surface_perf_hogs. */
  iblEnabled: boolean;
  /** Whether to attach a Sun lens flare — a set of additive-blend
   *  procedural sprite "ghosts" stretching from the Sun's screen
   *  position toward the camera center. Cinematic only — the rolling
   *  per-frame screen-space math is the kind of thing the runtime
   *  adaptive layer would notice. */
  lensFlareEnabled: boolean;
}

const CONFIGS: Record<QualityTier, QualityConfig> = {
  minimal: {
    tier: 'minimal',
    pixelRatioCap: 0.75,
    postEnabled: false,
    bloomEnabled: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    sphereSegments: 12,
    asteroidBeltParticles: 400,
    kuiperBeltParticles: 500,
    starsDim: 600,
    starsBright: 100,
    starsMilkyWay: 400,
    rimLightEnabled: false,
    dofEnabled: false,
    filmGrainEnabled: false,
    vignetteEnabled: false,
    skydomeEnabled: false,
    iblEnabled: false,
    lensFlareEnabled: false,
  },
  low: {
    tier: 'low',
    pixelRatioCap: 1.0,
    postEnabled: false,
    bloomEnabled: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    sphereSegments: 18,
    asteroidBeltParticles: 800,
    kuiperBeltParticles: 1000,
    starsDim: 900,
    starsBright: 180,
    starsMilkyWay: 700,
    rimLightEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: false,
    vignetteEnabled: false,
    skydomeEnabled: false,
    iblEnabled: false,
    lensFlareEnabled: false,
  },
  medium: {
    tier: 'medium',
    pixelRatioCap: 1.25,
    postEnabled: true,
    bloomEnabled: true,
    bloomStrength: 0.3,
    bloomRadius: 0.55,
    bloomThreshold: 0.94,
    sphereSegments: 24,
    asteroidBeltParticles: 1200,
    kuiperBeltParticles: 1500,
    starsDim: 1200,
    starsBright: 240,
    starsMilkyWay: 950,
    rimLightEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: true,
    vignetteEnabled: true,
    skydomeEnabled: false,
    iblEnabled: false,
    lensFlareEnabled: false,
  },
  high: {
    tier: 'high',
    pixelRatioCap: 2.0,
    postEnabled: true,
    bloomEnabled: true,
    bloomStrength: 0.35,
    bloomRadius: 0.55,
    bloomThreshold: 0.92,
    sphereSegments: 32,
    asteroidBeltParticles: 1800,
    kuiperBeltParticles: 2200,
    starsDim: 1500,
    starsBright: 300,
    starsMilkyWay: 1200,
    rimLightEnabled: true,
    dofEnabled: false,
    filmGrainEnabled: true,
    vignetteEnabled: true,
    skydomeEnabled: true,
    iblEnabled: true,
    lensFlareEnabled: false,
  },
  cinematic: {
    tier: 'cinematic',
    pixelRatioCap: 2.0,
    postEnabled: true,
    bloomEnabled: true,
    bloomStrength: 0.42,
    bloomRadius: 0.6,
    bloomThreshold: 0.9,
    sphereSegments: 48,
    asteroidBeltParticles: 2400,
    kuiperBeltParticles: 2800,
    starsDim: 1800,
    starsBright: 380,
    starsMilkyWay: 1500,
    rimLightEnabled: true,
    dofEnabled: true,
    filmGrainEnabled: true,
    vignetteEnabled: true,
    skydomeEnabled: true,
    iblEnabled: true,
    lensFlareEnabled: true,
  },
};

const STORAGE_KEY = 'orrery.qualityTier';

/** What the user has set in localStorage. `null` = auto-detect. */
export type QualityChoice = QualityTier | 'auto';

export function readUserChoice(): QualityChoice {
  if (typeof localStorage === 'undefined') return 'auto';
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === 'auto' || raw == null) return 'auto';
  if (raw in CONFIGS) return raw as QualityTier;
  return 'auto';
}

export function writeUserChoice(choice: QualityChoice): void {
  if (typeof localStorage === 'undefined') return;
  if (choice === 'auto') localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, choice);
}

/** Map detect-gpu's tier (0-3) + fps benchmark to one of our quality
 *  tiers. detect-gpu returns:
 *    tier 0 → "device blacklisted / mobile-tier 0" — we use `minimal`
 *    tier 1 → "low-power integrated" — we use `low`
 *    tier 2 → "mid-range / modern integrated" — we use `medium`
 *    tier 3 → "discrete / high-end" — we use `high` (not cinematic,
 *             because cinematic is the user-opt-in extreme; even a
 *             beefy GPU shouldn't get pushed to it without consent). */
function mapDetectGpuTier(tier: number, isMobile: boolean): QualityTier {
  if (isMobile && tier <= 1) return 'minimal';
  if (isMobile && tier === 2) return 'low';
  if (tier === 0) return 'minimal';
  if (tier === 1) return 'low';
  if (tier === 2) return 'medium';
  return 'high';
}

let cachedAutoTier: QualityTier | null = null;

/** Run detect-gpu (cached). Returns the auto-resolved tier. */
export async function detectAutoTier(): Promise<QualityTier> {
  if (cachedAutoTier) return cachedAutoTier;
  try {
    // Dynamic import keeps detect-gpu out of the SSR module graph.
    // The module's interop shape varies between the CJS/ESM forms; the
    // helper survives both.
    const mod = await import('detect-gpu');
    const getGPUTier = mod as unknown as {
      getGPUTier?: (opts?: object) => Promise<GpuTierResult>;
      default?: { getGPUTier?: (opts?: object) => Promise<GpuTierResult> };
    };
    const fn = getGPUTier.getGPUTier ?? getGPUTier.default?.getGPUTier;
    if (!fn) throw new Error('detect-gpu missing getGPUTier');
    const gpu = await fn();
    cachedAutoTier = mapDetectGpuTier(gpu.tier, gpu.isMobile ?? false);
  } catch {
    // detect-gpu can throw on missing WebGL or odd environments;
    // fall back to medium so the user gets a working scene.
    cachedAutoTier = 'medium';
  }
  return cachedAutoTier;
}

/** Resolve the active QualityConfig given the user's stored choice
 *  + the auto-detected fallback. URL `?quality=tier` wins above both
 *  for testing convenience. */
export async function resolveQuality(url?: URL): Promise<QualityConfig> {
  const urlOverride = url?.searchParams.get('quality');
  if (urlOverride && urlOverride in CONFIGS) {
    return CONFIGS[urlOverride as QualityTier];
  }
  const user = readUserChoice();
  if (user !== 'auto') return CONFIGS[user];
  const auto = await detectAutoTier();
  return CONFIGS[auto];
}

/** Synchronous resolver — for code paths that can't await. Reads
 *  the URL override + user choice + a previously cached detected
 *  tier (stored under `orrery.qualityDetected` in localStorage on
 *  the previous session). Falls back to `medium` for first-time
 *  visitors so a desktop with a great GPU and a mobile with a weak
 *  one both get a workable scene before detection lands. The first
 *  visit kicks off background detection via `kickOffBackgroundDetect`
 *  whose result becomes the basis for the next session. */
const DETECTED_KEY = 'orrery.qualityDetected';
export function resolveQualitySync(url?: URL): QualityConfig {
  const urlOverride = url?.searchParams.get('quality');
  if (urlOverride && urlOverride in CONFIGS) {
    return CONFIGS[urlOverride as QualityTier];
  }
  const user = readUserChoice();
  if (user !== 'auto') return CONFIGS[user];
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(DETECTED_KEY);
    if (cached && cached in CONFIGS) return CONFIGS[cached as QualityTier];
  }
  return CONFIGS.medium;
}

/** Returns which of the four precedence layers supplied the tier
 *  `resolveQualitySync(url)` would return — URL override, saved user
 *  choice, cached detect-gpu result, or the medium fallback. The
 *  DebugPanel "Rendering" tab (#334) surfaces this so the user can
 *  tell at a glance whether the active tier is theirs to control or
 *  a baked-in default. */
export type QualityResolutionSource = 'url' | 'user-choice' | 'detect-gpu' | 'fallback';

export function resolveQualitySource(url?: URL): QualityResolutionSource {
  const urlOverride = url?.searchParams.get('quality');
  if (urlOverride && urlOverride in CONFIGS) return 'url';
  const user = readUserChoice();
  if (user !== 'auto') return 'user-choice';
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(DETECTED_KEY);
    if (cached && cached in CONFIGS) return 'detect-gpu';
  }
  return 'fallback';
}

/** Run detect-gpu in the background; cache the result for the next
 *  call to `resolveQualitySync`. Call this from app mount so first-
 *  ever visit's detection is ready by the second visit. */
export async function kickOffBackgroundDetect(): Promise<void> {
  const auto = await detectAutoTier();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DETECTED_KEY, auto);
  }
}

export function configFor(tier: QualityTier): QualityConfig {
  return CONFIGS[tier];
}

/**
 * Test-only: clear the memoised auto-detected tier so a unit test can
 * exercise `detectAutoTier` against a fresh mocked `detect-gpu` result.
 * Not used by application code.
 */
export function __resetAutoTierCacheForTests(): void {
  cachedAutoTier = null;
}

export const ALL_TIERS: QualityTier[] = ['minimal', 'low', 'medium', 'high', 'cinematic'];
