<script lang="ts">
  // /moon is now a thin shell over the shared SurfaceScene component
  // (ADR-072 / #283 Slice 2). Planet-specific config (texture URL,
  // ambient tint, tidal-lock overlay, lander model builder, hotspot
  // builder registry) lives in MOON_CONFIG below. Everything else —
  // scene assembly, animation loop, HUD, panel state, hotspot LOD,
  // input handlers — is owned by SurfaceScene.
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  import SurfacePreloadLinks from '$lib/components/SurfacePreloadLinks.svelte';
  import TourAnchors from '$lib/components/TourAnchors.svelte';
  import { base } from '$app/paths';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { buildMoonLanderModel } from '$lib/moon-lander-models';
  import { registerMoonHotspotBuilders } from '$lib/surface-scene/register-moon-hotspot-builders';
  import { getMoonSites, getMoonSiteGallery } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  // Hidden tour anchors emit data-audio-stage="moon-select-{audio}".
  // The audio-tour test (src/lib/audio-tour.test.ts) scans this file
  // for the literal substring `moon-select-` — kept in this comment
  // and on each TourAnchors button below.
  const MOON_TOUR_ANCHORS = [
    { audio: 'luna9', site: 'luna9' },
    { audio: 'apollo11', site: 'apollo11' },
    { audio: 'change4', site: 'change4' },
    { audio: 'chandrayaan3', site: 'chandrayaan3' },
    { audio: 'apollo17', site: 'apollo17' },
    { audio: 'artemis3', site: 'artemis3' },
  ] as const;

  const MOON_CONFIG: SurfaceSceneConfig = {
    planet: 'moon',
    textureUrl: `${base}/textures/2k_moon.jpg`,
    textureUrl4k: `${base}/textures/4k_moon.jpg`,
    // Real Moon radius — feeds altitude HUD km/unit ratio.
    radiusKm: 1737.4,
    // Moon's near-side tidal-lock indicator (Mars rotates freely; no
    // analog). Science Lens 'tidal-lock' layer toggles visibility.
    tidalLockOverlay: { color: 0x4ecdc4, opacity: 0.18 },
    // Moon's ~0° obliquity (1.5° in reality, effectively zero here).
    axialTiltDeg: 0,
    initialCamR: 150,
    landerModelBuilder: buildMoonLanderModel,
    twoDMode: 'lunar-polar-discs',
    registerHotspotBuilders: registerMoonHotspotBuilders,
    // Slight-blue ambient tint hints at lunar palette (consolidated
    // intensity 0.8 lives inside SurfaceScene per ADR-072 §Drift 5).
    ambientColor: 0x666688,
    // UI tint — warm rocky grey, the colour a hand-sample of lunar
    // regolith reads as in raw photographs (the cool 3D-render blue
    // is for atmospheric mood; the chrome should read as "moon rock"
    // per user direction).
    bodyTintCss: '#b8b5a8',
    // Science Lens panel — Moon-specific copy + the tidal-lock chip
    // (Moon is the only body in the system where the near-side overlay
    // makes sense). Mirrors the prior hardcoded SurfaceScene fallback
    // so /moon behaviour is unchanged by the #303 plumbing refactor.
    lensPanel: {
      title: 'The Moon · 384 000 km out, three days each way',
      body: "Lunar surface gravity is 1/6 g; a vacuum-thin exosphere offers no aerobraking, so every mission has to carry full ∆v for the descent. Apollo's free-return trajectory let the Earth-Moon-Earth figure-8 act as a built-in abort path.",
      tab: 'transfers',
      section: 'free-return',
      available: ['tidal-lock'],
    },
  };
</script>

<svelte:head>
  <title>{m.moon_page_title()}</title>
</svelte:head>

<SurfacePreloadLinks planet="moon" />
<DebugPanelRegistrar label="MOON" />

<SurfaceScene config={MOON_CONFIG} loadSites={getMoonSites} loadGallery={getMoonSiteGallery} />

<TourAnchors route="moon" anchors={MOON_TOUR_ANCHORS} />
