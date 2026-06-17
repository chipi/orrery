<script lang="ts">
  // /mars is now a thin shell over the shared SurfaceScene component
  // (ADR-072 / #283 Slice 2). Planet-specific config (texture URL,
  // ambient tint, atmosphere shell, axial tilt, lander model builder,
  // hotspot builder registry) lives in MARS_CONFIG below. Traverses
  // (4 rover paths) are loaded via the optional loadTraverses prop.
  // Everything else — scene assembly, animation loop with fly-in tween
  // + drag inertia + smooth zoom lerp, HUD, panel state, hotspot LOD,
  // input handlers, equirectangular 2D drawing — is owned by SurfaceScene.
  import { base } from '$app/paths';
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  import type { SurfaceSceneConfig, LanderModelBuilder } from '$lib/surface-scene/types';
  import { buildMarsLanderModel } from '$lib/mars-lander-models';
  import { registerMarsHotspotBuilders } from '$lib/surface-scene/register-mars-hotspot-builders';
  import { getMarsSites, getMarsSiteGallery, getMarsTraverse } from '$lib/data';
  import type { Traverse } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';

  // Mars's native builder takes (siteId, missionType, agency, color) —
  // adapter reorders to the canonical (siteId, missionType, color, agency)
  // signature (see types.ts §LanderModelBuilder).
  const marsLanderBuilder: LanderModelBuilder = (siteId, missionType, color, agency) =>
    buildMarsLanderModel(siteId, missionType, agency, color);

  // Bulk-load the four documented rover traverses in parallel; null
  // entries (missing JSON) silently filtered out so missing data
  // degrades to "this rover has no rendered track" rather than failure.
  async function loadMarsTraverses(): Promise<Record<string, Traverse>> {
    const ids = ['curiosity', 'perseverance', 'opportunity', 'spirit'];
    const entries = await Promise.all(
      ids.map(async (id) => {
        const t = await getMarsTraverse(id);
        return t ? ([id, t] as const) : null;
      }),
    );
    const out: Record<string, Traverse> = {};
    for (const e of entries) if (e) out[e[0]] = e[1];
    return out;
  }

  // Hidden tour anchors driven by guide-mars: each entry maps an
  // audio-stage id to the actual mars-sites site id (they sometimes
  // differ — "pathfinder" vs "mars-pathfinder", "tianwen1" vs
  // "tianwen1-orbiter"). Add an entry here to expose a new marker to
  // the tour; the executor calls __surfaceSceneSelectSite(siteId).
  const TOUR_ANCHORS: ReadonlyArray<{ audioId: string; siteId: string }> = [
    // v0.6 anchors (kept; audio-stage names preserved).
    { audioId: 'curiosity', siteId: 'curiosity' },
    { audioId: 'perseverance', siteId: 'perseverance' },
    { audioId: 'pathfinder', siteId: 'mars-pathfinder' },
    // Phase 4 — guide-mars early-mission roll-call.
    { audioId: 'mars2', siteId: 'mars2' },
    { audioId: 'mars3', siteId: 'mars3' },
    { audioId: 'viking1-lander', siteId: 'viking1-lander' },
    { audioId: 'viking2-lander', siteId: 'viking2-lander' },
    // Phase 4 — guide-mars orbiter roll-call (t≈92 – 100).
    { audioId: 'mro', siteId: 'mro' },
    { audioId: 'maven', siteId: 'maven' },
    { audioId: 'mars-express', siteId: 'mars-express' },
    { audioId: 'mars-odyssey', siteId: 'mars-odyssey' },
    { audioId: 'tgo', siteId: 'tgo' },
    { audioId: 'mangalyaan', siteId: 'mangalyaan' },
    { audioId: 'hope', siteId: 'hope' },
    { audioId: 'tianwen1', siteId: 'tianwen1-orbiter' },
  ];

  const MARS_CONFIG: SurfaceSceneConfig = {
    planet: 'mars',
    textureUrl: `${base}/textures/2k_mars.jpg`,
    textureUrl4k: `${base}/textures/4k_mars.jpg`,
    // Real Mars radius — feeds altitude HUD km/unit ratio + atmosphere
    // shell sizing (120 km altitude → ~1.06 scene units at radius 30).
    radiusKm: 3389,
    // Thin CO₂ atmosphere shell (Mars only; Moon is vacuum).
    atmosphere: {
      color: 0xffaa66,
      altitudeKm: 120,
      meshOpacity: 0.08,
      ringOpacity: 0.5,
    },
    // Mars's real axial obliquity drives season/insolation.
    axialTiltDeg: 25.19,
    initialCamR: 150,
    landerModelBuilder: marsLanderBuilder,
    twoDMode: 'equirectangular',
    registerHotspotBuilders: registerMarsHotspotBuilders,
    // Slight-red ambient tint hints at Martian palette (consolidated
    // intensity 0.8 lives inside SurfaceScene per ADR-072 §Drift 5).
    ambientColor: 0x886655,
    // Science Lens panel for /mars (#303 fix). Pre-#303 SurfaceScene
    // mounted /moon's hardcoded panel here so the /mars user saw lunar
    // tidal-lock copy + a dead chip. Mars's atmosphere is the lensable
    // overlay on the surface scene.
    lensPanel: {
      title: 'Mars · thin CO₂ shell + a dynamo gone quiet',
      body: "Mars' atmospheric pressure sits at 0.6 % of Earth's — enough for parachute aerobraking but not aerocapture. The global magnetic dynamo died ~4 Gyr ago; the residual crustal magnetism in the southern highlands is the only fossil record of when it was alive.",
      tab: 'planets',
      section: 'magnetic-fields',
      available: ['atmosphere'],
    },
  };
</script>

<svelte:head>
  <title>{m.mars_page_title()}</title>
  <!-- Preload the site catalogue + hotspots sidecar so they start
       downloading during HTML parse instead of after the Svelte
       bundle executes and SurfaceScene's onMount() finally calls
       `loadSites()`. Saves the network roundtrip from the critical
       path; the JSON is already in the browser cache by the time
       getMarsSites() asks for it. (2026-06-17 perf pass.) -->
  <link rel="preload" as="fetch" href="{base}/data/mars-sites.json" crossorigin="anonymous" />
  <link rel="preload" as="fetch" href="{base}/data/surface-hotspots.json" crossorigin="anonymous" />
</svelte:head>

<DebugPanelRegistrar label="MARS" />

<SurfaceScene
  config={MARS_CONFIG}
  loadSites={getMarsSites}
  loadGallery={getMarsSiteGallery}
  loadTraverses={loadMarsTraverses}
/>

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Source list in
     TOUR_ANCHORS above; the audio-tour executor calls
     __surfaceSceneSelectSite via the window hook SurfaceScene exposes
     on mount. -->
<div class="tour-anchors" aria-hidden="true">
  {#each TOUR_ANCHORS as anchor (anchor.audioId)}
    <button
      type="button"
      data-audio-stage="mars-select-{anchor.audioId}"
      tabindex="-1"
      onclick={() =>
        (
          window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
        ).__surfaceSceneSelectSite?.(anchor.siteId)}>select {anchor.audioId}</button
    >
  {/each}
</div>
