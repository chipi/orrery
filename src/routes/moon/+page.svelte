<script lang="ts">
  // /moon is now a thin shell over the shared SurfaceScene component
  // (ADR-072 / #283 Slice 2). Planet-specific config (texture URL,
  // ambient tint, tidal-lock overlay, lander model builder, hotspot
  // builder registry) lives in MOON_CONFIG below. Everything else —
  // scene assembly, animation loop, HUD, panel state, hotspot LOD,
  // input handlers — is owned by SurfaceScene.
  import { base } from '$app/paths';
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { buildMoonLanderModel } from '$lib/moon-lander-models';
  import { registerMoonHotspotBuilders } from '$lib/surface-scene/register-moon-hotspot-builders';
  import { getMoonSites, getMoonSiteGallery } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  const MOON_CONFIG: SurfaceSceneConfig = {
    planet: 'moon',
    textureUrl: `${base}/textures/2k_moon.jpg`,
    // Moon's near-side tidal-lock indicator (Mars rotates freely; no
    // analog). Science Lens 'tidal-lock' layer toggles visibility.
    tidalLockOverlay: { color: 0x4ecdc4, opacity: 0.18 },
    // Moon's ~0° obliquity (1.5° in reality, effectively zero here).
    axialTiltDeg: 0,
    landerModelBuilder: buildMoonLanderModel,
    twoDMode: 'lunar-polar-discs',
    registerHotspotBuilders: registerMoonHotspotBuilders,
    // Slight-blue ambient tint hints at lunar palette (consolidated
    // intensity 0.8 lives inside SurfaceScene per ADR-072 §Drift 5).
    ambientColor: 0x666688,
  };
</script>

<svelte:head><title>{m.moon_page_title()}</title></svelte:head>

<SurfaceScene config={MOON_CONFIG} loadSites={getMoonSites} loadGallery={getMoonSiteGallery} />
