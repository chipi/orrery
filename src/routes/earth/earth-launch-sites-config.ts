/**
 * `SurfaceSceneConfig` preset for unified /earth (#285 Phase 2 + #290).
 *
 * Composes the Earth surface layer (launchpads) with the full orbital
 * stack (atmosphere/ozone/moon-ghost/orbit-rings/satellites) via
 * SurfaceScene's `earthOrbitalLayers` extension. Replaces the legacy
 * mode-router that split /earth between EarthOrbitalScene (orbital) and
 * SurfaceScene (surface-only) — #290 unifies them so the user sees
 * launchpads as one more layer chip alongside the orbital toggles.
 *
 * Texture choice — uses the 2K Earth daymap to match /moon and /mars,
 * which both ship the 2K base inside SurfaceScene today. The real 4K
 * Earth daymap (committed in #284 Layer B at `34e7591a7`) feeds the
 * SurfaceScene LOD swap, and #287 wired the same per-body LOD swap
 * into /explore.
 *
 * @see {@link file://../../lib/surface-scene/README.md}
 * @see {@link file://../../../docs/adr/ADR-072.md}
 */
import type { SurfaceSceneConfig, LanderModelBuilder } from '$lib/surface-scene/types';
import { buildLaunchpadModel } from '$lib/earth-launchpad-models';
import { registerEarthHotspotBuilders } from '$lib/surface-scene/register-earth-hotspot-builders';
import { getEarthObjects } from '$lib/data';

const MOON_DISTANCE_KM = 384400;

// Per-regime ring colours, mirrors EarthOrbitalScene's REGIME_COLORS
// constant so the unified route's regime legend matches what users
// have seen since v0.4. LEO teal, MEO blue, GEO gold, HEO orange,
// MOON grey-purple, L2 yellow.
const REGIME_COLORS: Record<string, number> = {
  LEO: 0x4ecdc4,
  MEO: 0x7b9cff,
  GEO: 0xffc850,
  HEO: 0xff8c3c,
  MOON: 0xaaaacc,
  L2: 0xffd700,
};

// buildLaunchpadModel already matches the canonical
// (siteId, missionType, color, agency) LanderModelBuilder signature,
// so no adapter is needed. Cast preserves the import-time check that
// the contract still holds.
const earthLaunchpadBuilder: LanderModelBuilder = buildLaunchpadModel;

export function makeEarthLaunchSitesConfig(textureBaseUrl: string): SurfaceSceneConfig {
  return {
    planet: 'earth',
    textureUrl: `${textureBaseUrl}/textures/2k_earth_daymap.jpg`,
    textureUrl4k: `${textureBaseUrl}/textures/4k_earth_daymap.jpg`,
    // Real Earth radius — feeds altitude HUD km/unit ratio + atmosphere
    // shell sizing (100 km Kármán-line altitude → ~0.47 scene units at
    // a planet radius of 30 world units inside SurfaceScene).
    radiusKm: 6371,
    // Thin Rayleigh-blue atmosphere shell. Color and opacities bumped
    // for the unified /earth route (#303): at the consolidated camR=85
    // framing the prior 0.06/0.45 opacities were nearly imperceptible
    // even with the lens on. 0.18 mesh + 0.80 ring read as a clear
    // blue limb glow without overpowering the surface map.
    atmosphere: {
      color: 0x4488dd,
      altitudeKm: 100,
      meshOpacity: 0.18,
      ringOpacity: 0.8,
    },
    // Earth's real axial obliquity drives seasons / day-night terminator.
    axialTiltDeg: 23.4,
    landerModelBuilder: earthLaunchpadBuilder,
    // Earth rotates — equirectangular is the honest 2D projection
    // (same convention as Mars). Moon would use 'lunar-polar-discs'
    // because tidal lock makes a single equirectangular Moon map
    // imply rotation that doesn't physically exist.
    twoDMode: 'equirectangular',
    registerHotspotBuilders: registerEarthHotspotBuilders,
    // Slight cyan-blue ambient tint hints at Earth's atmospheric
    // palette (consolidated intensity 0.8 lives inside SurfaceScene
    // per ADR-072 §Drift 5).
    ambientColor: 0x6688aa,
    // /earth is 3D-only post-#290 — the legacy concentric-rings 2D
    // view is gone, and the equirectangular surface 2D would lose all
    // orbital context. Suppresses both the toggle button and the 2D
    // canvas.
    disable2D: true,
    // Science Lens panel for the unified /earth route (#303 fix). Pre-
    // #303 SurfaceScene mounted /moon's hardcoded panel for every route
    // — so /earth users saw "The Moon · 384 000 km out…" with only the
    // dead `tidal-lock` chip even though the atmosphere + ozone layers
    // are fully wired internally. Earth-specific copy + the two LayerKeys
    // whose visualisations actually live in this scene.
    lensPanel: {
      title: 'Earth · 6371 km radius, our orbital perch',
      body: 'A 100 km Kármán-line shell separates atmosphere from space; LEO begins another 100 km up. The ozone column at ~30 km blocks the UV-C that would otherwise sterilise the surface — its polar depletion is one of the few global atmospheric measurements visible from orbit.',
      tab: 'orbits',
      section: 'orbit-regimes',
      available: ['atmosphere', 'ozone'],
    },
    // /earth needs more camera headroom than /moon and /mars because
    // the scene includes the full orbital stack (Kármán shell at the
    // surface + LEO ring just above + moon-ghost at ~1814 scene units
    // out for context). 110 keeps Earth visually similar in size to
    // Moon/Mars at 85 while leaving room for the in-scene LEO ring +
    // satellite glyphs to land on screen. The prior consolidated 85
    // had Earth filling most of the viewport on first paint.
    initialCamR: 110,
    // #290 Slice 7 — orbital stack composed onto the surface scene.
    // Mirrors EarthOrbitalScene's exact construction values so the
    // unified route renders identically to the legacy orbital view
    // (modulo additive launchpad markers + chip-row sub-gating).
    earthOrbitalLayers: {
      // Discrete Kármán-line marker (science-lensed via 'atmosphere').
      // Teal limb-glow at exactly 100 km, surfaced when the user opens
      // the atmosphere lens. Opacities bumped for #303 visibility on
      // the consolidated /earth framing.
      karmanLineShell: {
        color: 0x4ecdc4,
        altitudeKm: 100,
        meshOpacity: 0.2,
        ringOpacity: 0.85,
      },
      // Polar ozone caps at ~30 km — Antarctic (south, larger spring
      // depletion) + smaller Arctic (north, winter depletion). Gated
      // by the 'ozone' science lens. Opacities bumped for #303
      // visibility at the consolidated framing.
      ozoneOverlay: {
        altitudeKm: 30,
        south: { color: 0xb866ff, opacity: 0.55, phiCoverageRatio: 0.34 },
        north: { color: 0x9b5dff, opacity: 0.45, phiCoverageRatio: 0.22 },
      },
      // Small textured Moon sphere at the real Moon-orbit radius —
      // anchors moon-orbiter satellites and acts as a wayfinding cue.
      moonGhost: {
        textureUrl: `${textureBaseUrl}/textures/2k_moon.jpg`,
        radiusUnits: 2.0,
        distanceKm: MOON_DISTANCE_KM,
      },
      // Per-regime orbit-ring torus, drawn at one representative
      // altitude per regime present in the loaded EarthObject set.
      // Default visible — matches EarthOrbitalScene's defaults.
      orbitRings: {
        regimeColors: REGIME_COLORS,
        visibleByDefault: true,
      },
      // Loaded async on mount; categories drive chip-row sub-toggles.
      // Defaults match EarthOrbitalScene's default-on state for every
      // category — users can hide via the new STATIONS / OBSERVATORIES
      // / CONSTELLATIONS / COMSATS / MOON ORBITERS chips.
      satellites: {
        loadObjects: getEarthObjects,
        categoryDefaultVisible: {
          station: true,
          observatory: true,
          constellation: true,
          comsat: true,
          moonOrbiter: true,
        },
      },
    },
  };
}
