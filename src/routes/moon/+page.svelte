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
  import OrbitRuler from '$lib/components/OrbitRuler.svelte';
  import RegimePanel from '$lib/components/RegimePanel.svelte';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
  import type { OrbitRegime } from '$types/orbit-regime';
  import { buildMoonLanderModel } from '$lib/moon-lander-models';
  import { registerMoonHotspotBuilders } from '$lib/surface-scene/register-moon-hotspot-builders';
  import {
    getMoonSites,
    getMoonSiteGallery,
    getOrbitRegimesMoon,
    getMoonTraverse,
  } from '$lib/data';
  import type { Traverse } from '$types/surface-site';
  import { regimeForAltitude } from '$lib/orbit-regime-match';
  import { getLocale } from '$lib/paraglide/runtime';
  import * as m from '$lib/paraglide/messages';

  // Hidden tour anchors emit data-audio-stage="moon-select-{audio}".
  // The audio-tour test (src/lib/audio-tour.test.ts) scans this file
  // for the literal substring `moon-select-` — kept in this comment
  // and on each TourAnchors button below.
  const MOON_TOUR_ANCHORS = [
    { audio: 'luna9', site: 'luna9' },
    { audio: 'apollo11', site: 'apollo11' },
    { audio: 'apollo12', site: 'apollo12' },
    { audio: 'apollo14', site: 'apollo14' },
    { audio: 'apollo15', site: 'apollo15' },
    { audio: 'apollo16', site: 'apollo16' },
    { audio: 'apollo17', site: 'apollo17' },
    { audio: 'change4', site: 'change4' },
    { audio: 'change6', site: 'change6' },
    { audio: 'chandrayaan3', site: 'chandrayaan3' },
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
    // Sub-Earth point + libration envelope ('sub-earth' lens) and the
    // far-side tint ('far-side' lens) — both attach to the lunar surface.
    lunarLayers: {
      subEarth: { color: 0xffd27f },
      farSide: { color: 0xd98a4a, opacity: 0.16 },
    },
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
      available: ['tidal-lock', 'sub-earth', 'far-side'],
    },
  };

  // Orbit-ruler + regime-panel state (#355). Same pattern as /earth
  // (#354) — data + components shared, regime panel stacks under the
  // satellite/site panel (z=28 vs default 30) so clicking a resident
  // reveals the orbiter's detail panel without closing the ruler panel.
  let regimes: OrbitRegime[] = $state([]);
  // Orbit ruler auto-hides once the camera dips below the lowest orbit
  // band (#363) — SurfaceScene flips this via onOrbitsInViewChange.
  let orbitsInView = $state(true);
  let regimePanelOpen = $state(false);
  let selectedRegimeId = $state<string | null>(null);
  let selectedRegime = $derived(
    selectedRegimeId ? (regimes.find((r) => r.id === selectedRegimeId) ?? null) : null,
  );

  // Active lunar-orbiter selection (drives ruler highlight). On /moon
  // orbiter selection lives in SurfaceScene's `selected` (SurfaceSite),
  // not `selectedSat` (EarthObject — /earth-only). The onSiteSelect
  // callback fires from SurfaceScene's $effect on `selected` changes.
  let selectedSiteId = $state<string | null>(null);
  let moonOrbiterSites: Array<{ id: string; altitude_km?: number }> = $state([]);

  // Highlight derivation — match the selected lunar orbiter's altitude
  // against the regime bands via the shared `regimeForAltitude` helper
  // (introduced for /earth + /mars; /moon adopts it for consistency).
  let highlightRegime = $derived.by(() => {
    if (!selectedSiteId) return null;
    const orb = moonOrbiterSites.find((s) => s.id === selectedSiteId);
    const matched = regimeForAltitude(orb?.altitude_km, regimes);
    return matched?.id ?? null;
  });

  let selectableIds = $derived(new Set(moonOrbiterSites.map((s) => s.id)));

  function openRegime(id: string) {
    selectedRegimeId = id;
    regimePanelOpen = true;
    const url = new URL(window.location.href);
    url.searchParams.set('regime', id);
    goto(url.pathname + url.search, { replaceState: true, noScroll: true, keepFocus: true });
  }

  function closeRegime() {
    regimePanelOpen = false;
    const url = new URL(window.location.href);
    url.searchParams.delete('regime');
    goto(url.pathname + (url.search ? url.search : ''), {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  }

  // Resident click → select that orbiter site in the scene. Same
  // `__surfaceSceneSelectSite` window hook the tour anchors use. We
  // INTENTIONALLY do not close the regime panel (per #354's 2026-06-22
  // stacking direction); the satellite panel paints on top at z=30.
  function onResidentClick(id: string) {
    (
      window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
    ).__surfaceSceneSelectSite?.(id);
  }

  onMount(async () => {
    const [r, sites] = await Promise.all([
      getOrbitRegimesMoon(getLocale()),
      getMoonSites(getLocale()),
    ]);
    regimes = r;
    moonOrbiterSites = sites.filter((s) => s.kind === 'orbiter');
  });

  // Resolve `?regime=NRHO` deep-link once regimes load.
  $effect(() => {
    void regimes;
    if (regimes.length === 0) return;
    const id = $page.url.searchParams.get('regime');
    if (id && regimes.some((r) => r.id === id)) {
      selectedRegimeId = id;
      regimePanelOpen = true;
    }
  });

  // Moon rover traverses (#361 follow-on) — Lunokhod 1/2, Yutu, Yutu-2,
  // Pragyan. Same optional loadTraverses path Mars uses; missing JSON
  // degrades to "no rendered track" rather than a failure.
  async function loadMoonTraverses(): Promise<Record<string, Traverse>> {
    const ids = ['luna17', 'luna21', 'change3', 'change4', 'chandrayaan3'];
    const entries = await Promise.all(
      ids.map(async (id) => {
        const t = await getMoonTraverse(id);
        return t ? ([id, t] as const) : null;
      }),
    );
    const out: Record<string, Traverse> = {};
    for (const e of entries) if (e) out[e[0]] = e[1];
    return out;
  }
</script>

<svelte:head>
  <title>{m.moon_page_title()}</title>
</svelte:head>

<SurfacePreloadLinks planet="moon" />
<DebugPanelRegistrar label="MOON" />

<SurfaceScene
  config={MOON_CONFIG}
  loadSites={getMoonSites}
  loadGallery={getMoonSiteGallery}
  loadTraverses={loadMoonTraverses}
  onSiteSelect={(id) => (selectedSiteId = id)}
  {regimes}
  onRegimeOpen={openRegime}
  onOrbitsInViewChange={(v) => (orbitsInView = v)}
/>

<TourAnchors route="moon" anchors={MOON_TOUR_ANCHORS} />

<!-- Desktop-only ruler — on mobile the SurfaceScene accordion Ruler tab
     replaces this. .ruler-desktop-only renders display:none at ≤767px. -->
<div class="ruler-desktop-only">
  {#if regimes.length > 0 && orbitsInView}
    <!-- Hidden once the camera dips below LLO — orbits then sit overhead
         and the ruler references nothing on screen (#363). -->
    <OrbitRuler {regimes} {highlightRegime} onSelect={openRegime} anchorBottomPx={14} />
  {/if}
</div>

<RegimePanel
  regime={selectedRegime}
  open={regimePanelOpen}
  onClose={closeRegime}
  {selectableIds}
  {onResidentClick}
/>

<style>
  .ruler-desktop-only {
    display: contents;
  }
  @media (max-width: 767px) {
    .ruler-desktop-only {
      display: none;
    }
  }
</style>
