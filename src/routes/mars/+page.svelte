<script lang="ts">
  // /mars is now a thin shell over the shared SurfaceScene component
  // (ADR-072 / #283 Slice 2). Planet-specific config (texture URL,
  // ambient tint, atmosphere shell, axial tilt, lander model builder,
  // hotspot builder registry) lives in MARS_CONFIG below. Traverses
  // (4 rover paths) are loaded via the optional loadTraverses prop.
  // Everything else — scene assembly, animation loop with fly-in tween
  // + drag inertia + smooth zoom lerp, HUD, panel state, hotspot LOD,
  // input handlers, equirectangular 2D drawing — is owned by SurfaceScene.
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  import SurfacePreloadLinks from '$lib/components/SurfacePreloadLinks.svelte';
  import TourAnchors from '$lib/components/TourAnchors.svelte';
  import { base } from '$app/paths';
  import type { SurfaceSceneConfig, LanderModelBuilder } from '$lib/surface-scene/types';
  import { buildMarsLanderModel } from '$lib/mars-lander-models';
  import { registerMarsHotspotBuilders } from '$lib/surface-scene/register-mars-hotspot-builders';
  import { getMarsSites, getMarsSiteGallery, getMarsTraverse } from '$lib/data';
  import type { Traverse } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';

  // Hidden tour anchors emit data-audio-stage="mars-select-{audio}".
  // The audio-tour test (src/lib/audio-tour.test.ts) scans this file
  // for the literal substring `mars-select-` — kept in this comment
  // and on each TourAnchors button below.

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

  // Driven by guide-mars: each entry maps an audio-stage id to the
  // actual mars-sites site id (they sometimes differ — "pathfinder"
  // vs "mars-pathfinder", "tianwen1" vs "tianwen1-orbiter"). Add an
  // entry here to expose a new marker to the tour; the executor
  // calls __surfaceSceneSelectSite(siteId).
  const MARS_TOUR_ANCHORS = [
    // v0.6 anchors (kept; audio-stage names preserved).
    { audio: 'curiosity', site: 'curiosity' },
    { audio: 'perseverance', site: 'perseverance' },
    { audio: 'pathfinder', site: 'mars-pathfinder' },
    // Phase 4 — guide-mars early-mission roll-call.
    { audio: 'mars2', site: 'mars2' },
    { audio: 'mars3', site: 'mars3' },
    { audio: 'viking1-lander', site: 'viking1-lander' },
    { audio: 'viking2-lander', site: 'viking2-lander' },
    // Phase 4 — guide-mars orbiter roll-call (t≈92 – 100).
    { audio: 'mro', site: 'mro' },
    { audio: 'maven', site: 'maven' },
    { audio: 'mars-express', site: 'mars-express' },
    { audio: 'mars-odyssey', site: 'mars-odyssey' },
    { audio: 'tgo', site: 'tgo' },
    { audio: 'mangalyaan', site: 'mangalyaan' },
    { audio: 'hope', site: 'hope' },
    { audio: 'tianwen1', site: 'tianwen1-orbiter' },
  ] as const;

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
</svelte:head>

<SurfacePreloadLinks planet="mars" />
<DebugPanelRegistrar label="MARS" />

<SurfaceScene
  config={MARS_CONFIG}
  loadSites={getMarsSites}
  loadGallery={getMarsSiteGallery}
  loadTraverses={loadMarsTraverses}
/>

<TourAnchors route="mars" anchors={MARS_TOUR_ANCHORS} />
