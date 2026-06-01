/**
 * Props interface for the shared `SurfaceScene.svelte` component (ADR-072).
 *
 * The eight knobs below are the *justified* body differences between
 * /moon and /mars. Everything else is shared. Before adding a new prop:
 *   - read `src/lib/surface-scene/README.md` §"Before you add a new prop"
 *   - read ADR-072 §"Drifts that get consolidated" — 22 things were
 *     resolved into shared design; don't reintroduce them under another
 *     name
 *   - if the diff is genuinely physical/domain, open an ADR explaining
 *     why it isn't drift, then add the prop
 *
 * @see {@link file://./README.md}
 * @see {@link file://../../../docs/adr/ADR-072.md}
 */
import type * as THREE from 'three';

/**
 * Identity used for asset path prefixes (e.g. `texture/2k_${planet}.jpg`),
 * data-attribute e2e signals (`data-planet="moon"`), and debug overlay
 * labels. `'earth'` was added in #285 Phase 2 B1 to support launchpads
 * as Earth-surface markers (paralleling /moon and /mars). Future
 * candidates: 'mercury', 'venus'.
 */
export type SurfacePlanet = 'moon' | 'mars' | 'earth';

/**
 * 2D fallback projection mode (ADR-038). Mars rotates → equirectangular
 * is honest. Moon is tidally locked → two-disc near/far-side is the
 * only honest projection (a single equirectangular Moon map would imply
 * rotation relative to Earth, which it doesn't have).
 */
export type SurfaceTwoDMode = 'lunar-polar-discs' | 'equirectangular';

/**
 * Atmosphere shell — Mars only today. Skip the field entirely on Moon
 * (vacuum). Earth (#285) would also have one if/when we add launchpads.
 */
export interface AtmosphereConfig {
  /** Hex color, e.g. `0xffaa66` for Mars's dusty CO₂ */
  color: number;
  /** Height of the shell above the planet surface, in kilometers */
  altitudeKm: number;
  /** Volumetric shell opacity (0..1) */
  meshOpacity: number;
  /** Ring (limb) opacity (0..1) */
  ringOpacity: number;
}

/**
 * Tidal-lock indicator overlay — Moon only. Marks the near-side hemisphere
 * with a faint tint that parents to the planet mesh (so it rotates with
 * the body, demonstrating that a fixed hemisphere stays Earth-facing
 * regardless of the route's auto-spin behaviour). Toggled via the Science
 * Lens layer mechanism (ADR-055).
 */
export interface TidalLockOverlayConfig {
  /** Hex color, e.g. `0x4ecdc4` (teal) */
  color: number;
  /** Opacity (0..1), typically 0.18 */
  opacity: number;
}

/**
 * Per-mission lander glyph builder. Returns a small primitive-composed
 * 3D group identifiable as the specific mission (Apollo LM vs Lunokhod
 * vs Curiosity vs Viking, etc.). Per-planet because the catalogues
 * differ (moon-lander-models.ts vs mars-lander-models.ts).
 *
 * Canonical signature: (siteId, missionType, color, agency?). Moon's
 * native builder matches this exactly. Mars's native builder takes
 * agency BEFORE color, so the /mars route wraps `buildMarsLanderModel`
 * in a small adapter that reorders the args.
 */
export type LanderModelBuilder = (
  siteId: string,
  missionType: string | undefined,
  color: string,
  agency?: string,
) => THREE.Group;

/**
 * Per-planet Tier 1 hotspot model builder registration. Already
 * implemented as `registerMoonHotspotBuilders()` /
 * `registerMarsHotspotBuilders()` (Slice 2A). Just plumb through.
 */
export type HotspotBuilderRegistrar = () => void;

/**
 * Earth-specific orbital layer config (#290 — unify /earth so the
 * route uses SurfaceScene as the base, with orbital subsystems
 * layered on top as additive togglable layers). All sub-fields
 * optional; absent = that subsystem doesn't render. Only set on
 * `/earth`; `/moon` and `/mars` omit the whole field.
 *
 * The slices implementing this (Slices 1-7 of #290) each fill in one
 * sub-field + its lib helper file. Slice 0 (this commit) ships the
 * types contract only — no SurfaceScene code consumes these fields
 * yet, so /earth still mounts EarthOrbitalScene unchanged.
 */
export interface EarthOrbitalLayersConfig {
  /**
   * Karman-line atmosphere shell + equatorial ring at 100 km altitude.
   * Distinct from Mars's continuous-CO₂ `atmosphere` field — Earth's
   * version is a discrete Karman-line marker, science-layer-gated by
   * the `'atmosphere'` lens (ADR-055). Slice 1.
   */
  karmanLineShell?: {
    color: number;
    altitudeKm: number;
    meshOpacity: number;
    ringOpacity: number;
  };

  /**
   * Stratospheric ozone-hole overlay — translucent purple polar caps
   * at ~30 km altitude. South cap (Antarctic ozone hole, larger,
   * spring depletion) + smaller north cap (Arctic winter depletion).
   * Science-layer-gated by the `'ozone'` lens. Slice 1.
   */
  ozoneOverlay?: {
    altitudeKm: number;
    south: { color: number; opacity: number; phiCoverageRatio: number };
    north: { color: number; opacity: number; phiCoverageRatio: number };
  };

  /**
   * Moon ghost mesh — small textured Moon sphere at the real Moon-
   * orbit distance for spatial context. Click → navigate to `/moon`.
   * Slice 2.
   */
  moonGhost?: {
    textureUrl: string;
    radiusUnits: number;
    distanceKm: number;
  };

  /**
   * Orbit-regime torus rings (LEO/MEO/GEO/HEO/MOON/L2) drawn at one
   * representative altitude per regime present in the loaded data.
   * Inclination not modelled — rings sit in the equatorial plane.
   * Slice 2.
   */
  orbitRings?: {
    regimeColors: Record<string, number>;
    visibleByDefault: boolean;
  };

  /**
   * Per-category satellite rendering. Each category gets its own
   * visibility toggle chip + default state. Loader function returns
   * the EarthObject array; categorisation drives chip + visibility.
   * Slice 3.
   */
  satellites?: {
    loadObjects: (locale: string) => Promise<unknown[]>;
    categoryDefaultVisible: {
      station: boolean;
      observatory: boolean;
      constellation: boolean;
      comsat: boolean;
      moonOrbiter: boolean;
    };
  };
}

/**
 * The minimal config a route passes to `<SurfaceScene>`. Everything
 * not listed here is intentionally shared.
 */
export interface SurfaceSceneConfig {
  /** Identity — used for asset paths, e2e signals, debug labels */
  planet: SurfacePlanet;

  /** Surface texture URL, e.g. `${base}/textures/2k_moon.jpg` */
  textureUrl: string;

  /**
   * Optional 4K daymap, lazy-loaded when the camera approaches the
   * planet (per ADR-073 Layer B). Omit for bodies where no higher-res
   * source is available. When set, the route's SurfaceScene swaps
   * `material.map` from `textureUrl` to `textureUrl4k` once the
   * camera distance ratio drops below `SURFACE_LOD_4K_IN_RATIO`, with
   * hysteresis at `SURFACE_LOD_2K_OUT_RATIO` to prevent thrashing.
   * Mirrors the per-planet pattern shipped on /explore in #287.
   */
  textureUrl4k?: string;

  /**
   * Real-world body radius in km. Used to convert the dimensionless
   * scene `camR` into an altitude readout (and back, for the
   * atmosphere shell sizing). Mars: 3389. Moon: 1737.4.
   */
  radiusKm: number;

  /**
   * Atmosphere shell — Mars only today. Omit on Moon (vacuum).
   */
  atmosphere?: AtmosphereConfig;

  /**
   * Tidal-lock near-side overlay — Moon only. Omit on Mars (Mars
   * rotates freely; no analog of "near side").
   */
  tidalLockOverlay?: TidalLockOverlayConfig;

  /**
   * Real obliquity in degrees. Mars: 25.19. Moon: ~0 (1.5° in reality,
   * effectively zero at the rendering scale used here).
   */
  axialTiltDeg: number;

  /** Per-planet mission-specific 3D glyph builder */
  landerModelBuilder: LanderModelBuilder;

  /** 2D fallback projection convention */
  twoDMode: SurfaceTwoDMode;

  /**
   * Per-planet Tier 1 hotspot model builder registration bundle.
   */
  registerHotspotBuilders: HotspotBuilderRegistrar;

  /**
   * Ambient-light tint hints at body palette (slight blue for Moon
   * `0x666688`; slight red for Mars `0x886655`). Intensity is shared
   * at 0.8 (per ADR-072 §Drifts row 5).
   */
  ambientColor: number;

  /**
   * Earth-only — optional orbital subsystems layered on top of the
   * surface scene. Set on /earth to unify the previously-separate
   * EarthOrbitalScene's atmosphere / ozone / moon-ghost / orbit-rings
   * / satellites with the launchpad-marker layer. Omit on /moon and
   * /mars. Slices 1-7 of #290 fill in the consumer code; Slice 0
   * (this commit) only adds the type contract.
   */
  earthOrbitalLayers?: EarthOrbitalLayersConfig;

  /**
   * Suppress the 2D toggle + 2D canvas drawer entirely (#290 Slice 7).
   * Set on /earth where the legacy top-down concentric-rings 2D view
   * doesn't make sense after unification (the equirectangular surface
   * 2D would lose orbital context, and re-implementing the orbital
   * top-down would duplicate the 3D view's information). /moon and
   * /mars omit this; their 2D fallbacks stay.
   */
  disable2D?: boolean;
}

/**
 * Static config presets shipped with the lib. Routes use these to keep
 * planet-specific values in one place (and to make a future Mercury /
 * Earth-surface route a one-line config import).
 *
 * Implementation defers to the route files (importing `MOON_CONFIG`
 * here would pull the entire moon-lander-models graph into anyone who
 * imports `surface-scene/types`). The presets live in
 * `src/lib/surface-scene/{moon,mars}-config.ts` instead.
 */
