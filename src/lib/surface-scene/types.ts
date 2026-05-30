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
 * labels. Currently 'moon' | 'mars'; would extend to a third literal if
 * we ever add 'mercury' / 'venus' / 'earth-surface' (see #285).
 */
export type SurfacePlanet = 'moon' | 'mars';

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
 * differ (moon-lander-models.ts vs mars-lander-models.ts) and the
 * function signatures are slightly different.
 */
export type LanderModelBuilder = (
  id: string,
  missionType: string | undefined,
  color: THREE.Color | string | number,
  // mars's builder takes an agency string; moon's doesn't.
  // Type widening with optional 4th param accepts both shapes.
  agency?: string,
) => THREE.Group;

/**
 * Vendored rover-traverse polylines. Mars has 4 today (Curiosity,
 * Perseverance, Spirit, Opportunity). Moon has historical EVA paths
 * (Apollo 14/15/16/17) and Lunokhod tracks that should be added in
 * a future slice but aren't vendored yet.
 */
export interface TraverseRegistry {
  byRoverId: Record<
    string,
    {
      points: Array<[number, number]>; // [lat, lon] in degrees
      status: 'ACTIVE' | 'ENDED';
      snapshotDate: string;
      credit: string;
    }
  >;
}

/**
 * Per-planet Tier 1 hotspot model builder registration. Already
 * implemented as `registerMoonHotspotBuilders()` /
 * `registerMarsHotspotBuilders()` (Slice 2A). Just plumb through.
 */
export type HotspotBuilderRegistrar = () => void;

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
   * Vendored rover-traverse data. Mars has it today; Moon's historical
   * EVA paths would be added here once vendored.
   */
  traverses?: TraverseRegistry;

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
