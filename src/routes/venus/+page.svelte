<script lang="ts">
  // /venus is a thin shell over the shared SurfaceScene (ADR-072), the
  // destination of /fly's Venus descents (RFC-034 §12). Venus-specific config
  // (texture, radius, lander glyph, lens story) lives in VENUS_CONFIG below;
  // all the scene machinery is owned by SurfaceScene.
  //
  // Data limit: Venus has no optical surface map (perpetual cloud cover, no
  // Magellan raster shipped), so the globe uses the cloud-top atmosphere
  // texture under a heavy amber tint — honest for what is visible of Venus.
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import { base } from '$app/paths';
  import type { SurfaceSceneConfig, LanderModelBuilder } from '$lib/surface-scene/types';
  import { buildVenusLanderModel } from '$lib/venus-lander-models';
  import { registerVenusHotspotBuilders } from '$lib/surface-scene/register-venus-hotspot-builders';
  import { getVenusSites, getVenusSiteGallery } from '$lib/data';

  const venusLanderBuilder: LanderModelBuilder = (siteId, missionType, color, agency) =>
    buildVenusLanderModel(siteId, missionType, color, agency);

  const VENUS_CONFIG: SurfaceSceneConfig = {
    planet: 'venus',
    textureUrl: `${base}/textures/2k_venus_atmosphere.jpg`,
    textureUrl4k: `${base}/textures/4k_venus_atmosphere.jpg`,
    // Real Venus radius — feeds the altitude HUD + atmosphere-shell sizing.
    radiusKm: 6051.8,
    // The thick sulphuric-acid haze — a dense amber shell.
    atmosphere: {
      color: 0xffc070,
      altitudeKm: 250,
      meshOpacity: 0.2,
      ringOpacity: 0.6,
    },
    // Venus rotates retrograde with a ~177° obliquity (effectively upside-down).
    axialTiltDeg: 177.4,
    initialCamR: 150,
    landerModelBuilder: venusLanderBuilder,
    twoDMode: 'equirectangular',
    registerHotspotBuilders: registerVenusHotspotBuilders,
    // Warm amber ambient hints at the Venusian sky.
    ambientColor: 0xaa7744,
    bodyTintCss: '#e0a84c',
    lensPanel: {
      title: 'Venus',
      body: 'A cloud-shrouded furnace — 92 bar of CO₂, ~465 °C at the surface, sulphuric-acid haze. Only the Soviet Venera and Vega landers ever returned data from the ground, for minutes each, before the heat and pressure killed them.',
      tab: 'mission-phases',
      section: 'edl',
      available: ['gravity', 'velocity'],
    },
  };
</script>

<SurfaceScene
  config={VENUS_CONFIG}
  body="venus"
  loadSites={getVenusSites}
  loadGallery={getVenusSiteGallery}
/>
