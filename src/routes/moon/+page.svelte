<script lang="ts">
  // /moon is now a thin shell over the shared SurfaceScene component
  // (ADR-072 / #283 Slice 2). Planet-specific config (texture URL,
  // ambient tint, tidal-lock overlay, lander model builder, hotspot
  // builder registry) lives in MOON_CONFIG below. Everything else —
  // scene assembly, animation loop, HUD, panel state, hotspot LOD,
  // input handlers — is owned by SurfaceScene.
  import { base } from '$app/paths';
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanel from '$lib/components/DebugPanel.svelte';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import { buildMoonLanderModel } from '$lib/moon-lander-models';
  import { registerMoonHotspotBuilders } from '$lib/surface-scene/register-moon-hotspot-builders';
  import { getMoonSites, getMoonSiteGallery } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

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

<svelte:head><title>{m.moon_page_title()}</title></svelte:head>

<DebugPanel pageLabel="MOON" />

<SurfaceScene config={MOON_CONFIG} loadSites={getMoonSites} loadGallery={getMoonSiteGallery} />

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). -->
<div class="tour-anchors" aria-hidden="true">
  <button
    type="button"
    data-audio-stage="moon-select-apollo11"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('apollo11')}>select apollo 11</button
  >
  <button
    type="button"
    data-audio-stage="moon-select-change4"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('change4')}>select chang'e 4</button
  >
  <button
    type="button"
    data-audio-stage="moon-select-chandrayaan3"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('chandrayaan3')}>select chandrayaan-3</button
  >
  <button
    type="button"
    data-audio-stage="moon-select-apollo17"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('apollo17')}>select apollo 17</button
  >
</div>
