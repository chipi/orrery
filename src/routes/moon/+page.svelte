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
  import { page } from '$app/state';
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
  import { getObserverLocation } from '$lib/geolocation';
  import {
    moonObserverView,
    type MoonObserverView,
    type MoonPhaseName,
  } from '$lib/astronomy/moon-observer';

  // #48 — "view from my location": resolve the observer (getObserverLocation:
  // GPS → timezone → default, shared with AR + /earth), compute tonight's Moon
  // for that place, orient the globe to the real sub-Earth point (near side +
  // libration) and surface the phase / visibility as a readout. Opt-in — no
  // prompt on load.
  let surfaceScene: SurfaceScene | undefined = $state();
  let locating = $state(false);
  let observerView = $state<MoonObserverView | null>(null);
  const PHASE_LABEL: Record<MoonPhaseName, () => string> = {
    new: m.moon_phase_new,
    'waxing-crescent': m.moon_phase_waxing_crescent,
    'first-quarter': m.moon_phase_first_quarter,
    'waxing-gibbous': m.moon_phase_waxing_gibbous,
    full: m.moon_phase_full,
    'waning-gibbous': m.moon_phase_waning_gibbous,
    'last-quarter': m.moon_phase_last_quarter,
    'waning-crescent': m.moon_phase_waning_crescent,
  };
  async function viewFromMyLocation(): Promise<void> {
    if (locating) return;
    locating = true;
    try {
      const loc = await getObserverLocation();
      const view = moonObserverView(new Date(), loc.latDeg, loc.lonDeg);
      observerView = view;
      // Orient to the sub-Earth selenographic point so the near side (wobbled by
      // tonight's libration) faces the camera — "what part you'd actually see".
      // Frame the WHOLE disk (large targetR) so the phase terminator reads.
      surfaceScene?.faceLatLon(view.libration.latDeg, view.libration.lonDeg, 150);
      // Light it from the real sub-solar point so the terminator matches tonight's
      // phase (faceLatLon froze the spin, so both stay consistent with the globe).
      surfaceScene?.aimSunAtBodyLatLon(view.subSolar.latDeg, view.subSolar.lonDeg);
    } finally {
      locating = false;
    }
  }

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
      title: m.science_panel_moon_title(),
      body: m.science_panel_moon_body(),
      tab: 'transfers',
      section: 'free-return',
      available: ['planet-stats', 'sub-solar', 'climate', 'tidal-lock', 'sub-earth', 'far-side'],
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
    const id = page.url.searchParams.get('regime');
    if (id && regimes.some((r) => r.id === id)) {
      selectedRegimeId = id;
      regimePanelOpen = true;
    }
  });

  // Moon rover traverses (#361) — Lunokhod 1/2, Yutu, Yutu-2, Pragyan, and
  // the Apollo 15/16/17 LRV crewed traverses. Same optional loadTraverses
  // path Mars uses; missing JSON degrades to "no rendered track" rather
  // than a failure.
  async function loadMoonTraverses(): Promise<Record<string, Traverse>> {
    const ids = [
      'luna17',
      'luna21',
      'change3',
      'change4',
      'chandrayaan3',
      'apollo15',
      'apollo16',
      'apollo17',
    ];
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
  bind:this={surfaceScene}
  config={MOON_CONFIG}
  body="moon"
  loadSites={getMoonSites}
  loadGallery={getMoonSiteGallery}
  loadTraverses={loadMoonTraverses}
  onSiteSelect={(id) => (selectedSiteId = id)}
  {regimes}
  onRegimeOpen={openRegime}
  onOrbitsInViewChange={(v) => (orbitsInView = v)}
/>

<!-- #48 — observer view. Opt-in (no prompt on load): resolves the observer's
     location, orients to tonight's sub-Earth point + surfaces phase/visibility. -->
<button
  type="button"
  class="locate-me"
  onclick={viewFromMyLocation}
  disabled={locating}
  data-testid="moon-locate-me"
  title={m.moon_locate_me()}
>
  <span class="locate-icon" aria-hidden="true">☾</span>
  {locating ? m.moon_locate_working() : m.moon_locate_me()}
</button>

{#if observerView}
  <div class="moon-observer" data-testid="moon-observer-readout">
    <div class="mo-eyebrow">{m.moon_view_eyebrow()}</div>
    <div class="mo-phase">{PHASE_LABEL[observerView.phase.phaseName]()}</div>
    <div class="mo-row">
      {m.moon_view_lit({ pct: Math.round(observerView.phase.illuminatedFraction * 100) })}
    </div>
    <div class="mo-row">
      {#if observerView.aboveHorizon}
        {m.moon_view_alt_above({ deg: Math.round(observerView.altitudeDeg) })}
      {:else}
        {m.moon_view_alt_below()}
      {/if}
    </div>
    <div class="mo-row mo-dim">
      {m.moon_view_libration({
        lon: `${observerView.libration.lonDeg >= 0 ? '+' : ''}${observerView.libration.lonDeg.toFixed(1)}°`,
        lat: `${observerView.libration.latDeg >= 0 ? '+' : ''}${observerView.libration.latDeg.toFixed(1)}°`,
      })}
    </div>
  </div>
{/if}

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
  /* #48 — observer button + readout, bottom-left. Same treatment as /earth;
     the readout stacks above the button when a location has been resolved. */
  .locate-me {
    position: absolute;
    bottom: calc(60px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    z-index: 7;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 0.04em;
    color: var(--text-base, #e8e8ed);
    background: rgba(8, 10, 22, 0.62);
    border: 1px solid rgba(78, 205, 196, 0.35);
    border-radius: 8px;
    backdrop-filter: blur(5px);
    cursor: pointer;
    min-height: 34px;
  }
  .locate-me:hover:not(:disabled) {
    border-color: rgba(78, 205, 196, 0.7);
  }
  .locate-me:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .locate-icon {
    color: #4ecdc4;
    font-size: 14px;
    line-height: 1;
  }
  .moon-observer {
    position: absolute;
    bottom: calc(106px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    z-index: 7;
    min-width: 190px;
    max-width: min(70vw, 260px);
    padding: 10px 12px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: var(--text-base, #e8e8ed);
    background: rgba(8, 10, 22, 0.72);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 8px;
    backdrop-filter: blur(6px);
  }
  .mo-eyebrow {
    font-size: 9px;
    letter-spacing: 0.18em;
    color: rgba(78, 205, 196, 0.85);
    margin-bottom: 6px;
  }
  .mo-phase {
    font-size: 15px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .mo-row {
    font-size: 12px;
    line-height: 1.5;
  }
  .mo-dim {
    color: var(--text-dim, #9a9aa7);
    font-size: 11px;
    margin-top: 2px;
  }
  .ruler-desktop-only {
    display: contents;
  }
  /* Hide the persistent desktop ruler on touch — the RULER drawer replaces it.
     Keyed on capability, not width, so a landscape phone (wide but touch)
     doesn't show BOTH the default ruler and the drawer one. */
  @media (hover: none), (pointer: coarse) {
    .ruler-desktop-only {
      display: none;
    }
  }
</style>
