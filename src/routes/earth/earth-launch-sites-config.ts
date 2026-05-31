/**
 * `SurfaceSceneConfig` preset for Earth launchpads (#285 Phase 2).
 *
 * B1 ships the preset standalone so it's ready to be imported by the
 * /earth refactor in B2 (which composes this surface layer alongside
 * the existing orbital satellite layer). The /earth route file itself
 * stays untouched in B1 — pure framework prep.
 *
 * Texture choice — uses the 2K Earth daymap to match /moon and /mars,
 * which both ship the 2K base inside SurfaceScene today. The real 4K
 * Earth daymap (committed in #284 Layer B at `34e7591a7`) feeds the
 * bespoke /earth orbital scene's LOD swap; SurfaceScene gains the same
 * 2K→4K swap mechanism in #287, after which all bodies in /explore
 * plus this Earth-surface preset upgrade to 4K LOD-in automatically.
 *
 * @see {@link file://../../lib/surface-scene/README.md}
 * @see {@link file://../../../docs/adr/ADR-072.md}
 */
import type { SurfaceSceneConfig, LanderModelBuilder } from '$lib/surface-scene/types';
import { buildLaunchpadModel } from '$lib/earth-launchpad-models';
import { registerEarthHotspotBuilders } from '$lib/surface-scene/register-earth-hotspot-builders';

// buildLaunchpadModel already matches the canonical
// (siteId, missionType, color, agency) LanderModelBuilder signature,
// so no adapter is needed. Cast preserves the import-time check that
// the contract still holds.
const earthLaunchpadBuilder: LanderModelBuilder = buildLaunchpadModel;

export function makeEarthLaunchSitesConfig(textureBaseUrl: string): SurfaceSceneConfig {
  return {
    planet: 'earth',
    textureUrl: `${textureBaseUrl}/textures/2k_earth_daymap.jpg`,
    // Real Earth radius — feeds altitude HUD km/unit ratio + atmosphere
    // shell sizing (100 km Kármán-line altitude → ~0.47 scene units at
    // a planet radius of 30 world units inside SurfaceScene).
    radiusKm: 6371,
    // Thin Rayleigh-blue atmosphere shell. Color and opacities tuned
    // to read as "Earth's blue limb glow" without overpowering the
    // surface map. Differs from Mars's dusty CO₂ (0xffaa66) by being
    // cooler + slightly more transparent in the mesh.
    atmosphere: {
      color: 0x4488dd,
      altitudeKm: 100,
      meshOpacity: 0.06,
      ringOpacity: 0.45,
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
  };
}
