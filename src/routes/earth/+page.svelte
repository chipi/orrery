<script lang="ts">
  /*
   * /earth — unified surface + orbital route (#290).
   *
   * Single `<SurfaceScene>` mount that composes:
   *   - launchpads as surface sites (the existing `loadSites` /
   *     `loadGallery` path, identical to /moon and /mars)
   *   - the full orbital stack (atmosphere / ozone / moon-ghost /
   *     orbit-rings / satellites) via `earthOrbitalLayers` on the
   *     SurfaceSceneConfig preset
   *
   * Replaces the legacy mode-router that split /earth between
   * EarthOrbitalScene (orbital) and SurfaceScene (surface-only) — see
   * #290 for the rationale + the 7-slice extraction history. The
   * `?mode=surface` query param is preserved for backward compat with
   * old deep-links but no longer affects rendering; the route is now
   * always the unified scene.
   */
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanelRegistrar from '$lib/components/DebugPanelRegistrar.svelte';
  import TourAnchors from '$lib/components/TourAnchors.svelte';
  import OrbitRuler from '$lib/components/OrbitRuler.svelte';
  import RegimePanel from '$lib/components/RegimePanel.svelte';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { makeEarthLaunchSitesConfig } from './earth-launch-sites-config';
  import { getEarthLaunchSites, getEarthLaunchSiteGallery } from '$lib/earth-launch-site-adapter';
  import { getOrbitRegimes } from '$lib/data';
  import { getLocale } from '$lib/paraglide/runtime';
  import type { OrbitRegime } from '$types/orbit-regime';
  import { viewerLatLon } from '$lib/viewer-location';
  import * as m from '$lib/paraglide/messages';

  const earthSurfaceConfig = makeEarthLaunchSitesConfig(base);

  // Orbit-ruler + regime-panel state (#354). Regimes load asynchronously
  // from the i18n overlay pipeline; the ruler renders nothing until the
  // data lands. `?regime=GEO` deep-link resolves once regimes load.
  let regimes: OrbitRegime[] = $state([]);
  // Orbit ruler auto-hides once the camera dips below the lowest orbit
  // band (#363) — SurfaceScene flips this via onOrbitsInViewChange.
  let orbitsInView = $state(true);
  let regimePanelOpen = $state(false);
  let selectedRegimeId = $state<string | null>(null);
  let selectedRegime = $derived(
    selectedRegimeId ? (regimes.find((r) => r.id === selectedRegimeId) ?? null) : null,
  );

  // Track which orbiter is selected inside SurfaceScene → look up its
  // regime to flag the matching ruler band (#354). EarthObjects live
  // in static/data/earth-objects.json; we fetch once for the lookup.
  let selectedSatId = $state<string | null>(null);
  let earthObjects: import('$types/earth-object').EarthObject[] = $state([]);
  let highlightRegime = $derived(
    selectedSatId ? (earthObjects.find((o) => o.id === selectedSatId)?.regime ?? null) : null,
  );
  let selectableIds = $derived(new Set(earthObjects.map((o) => o.id)));

  // Click handler for residents in the regime panel. Calls
  // SurfaceScene's window-hook (`__surfaceSceneSelectSite`) — same
  // path TourAnchors use. We INTENTIONALLY do not close the regime
  // panel here so the two panels stack (2026-06-22 user direction —
  // "stack that one on top of orbit, so when I close orbiter, I still
  // see orbit I had and need to close it separately"). Panel shells
  // share z-index 30, so the satellite panel paints over the regime
  // panel; closing the satellite reveals the regime underneath.
  function onResidentClick(id: string) {
    (
      window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
    ).__surfaceSceneSelectSite?.(id);
  }

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

  onMount(async () => {
    const [r, objs] = await Promise.all([
      getOrbitRegimes(getLocale()),
      import('$lib/data').then((d) => d.earthObjects()),
    ]);
    regimes = r;
    earthObjects = objs;
  });

  // Resolve `?regime=GEO` once regimes load. void's the dep so the
  // effect re-runs when the async list lands (same Svelte 5 idiom as
  // /explore's id-deep-link).
  $effect(() => {
    void regimes;
    if (regimes.length === 0) return;
    const id = $page.url.searchParams.get('regime');
    if (id && regimes.some((r) => r.id === id)) {
      selectedRegimeId = id;
      regimePanelOpen = true;
    }
  });
  // Auto-orient the camera toward the viewer's approximate location
  // when /earth loads (issue #315). SSR-safe — viewerLatLon() returns
  // null in non-browser contexts. Coarse: timezone-based, no
  // permission, works offline.
  const initialView = viewerLatLon() ?? undefined;

  // Hidden tour anchors emit data-audio-stage="earth-select-{audio}".
  // The audio-tour test (src/lib/audio-tour.test.ts) scans this file
  // for the literal substring `earth-select-` — kept in this comment
  // and on each TourAnchors button below.
  const EARTH_TOUR_ANCHORS = [
    { audio: 'iss', site: 'iss' },
    { audio: 'tiangong', site: 'tiangong' },
    { audio: 'hubble', site: 'hubble' },
    // Navigation constellations (~20,000 km) — narration names all four.
    { audio: 'gps', site: 'gps' },
    { audio: 'galileo', site: 'galileo' },
    { audio: 'glonass', site: 'glonass' },
    { audio: 'beidou', site: 'beidou' },
    // Geostationary band (~36,000 km) + the weather / direct-broadcast
    // satellites the narration calls out as living there.
    { audio: 'geo', site: 'geo' },
    { audio: 'goes', site: 'goes' },
    { audio: 'inmarsat', site: 'inmarsat' },
    // Sun-Earth L2 (~1.5M km).
    { audio: 'jwst', site: 'jwst' },
    { audio: 'gaia', site: 'gaia' },
  ] as const;
</script>

<svelte:head><title>{m.earth_page_title()}</title></svelte:head>

<DebugPanelRegistrar label="EARTH" />

<SurfaceScene
  config={earthSurfaceConfig}
  loadSites={getEarthLaunchSites}
  loadGallery={getEarthLaunchSiteGallery}
  {initialView}
  onSatelliteSelect={(id) => (selectedSatId = id)}
  {regimes}
  onRegimeOpen={openRegime}
  onOrbitsInViewChange={(v) => (orbitsInView = v)}
/>

<TourAnchors route="earth" anchors={EARTH_TOUR_ANCHORS} />

<!-- Desktop-only ruler — on mobile the SurfaceScene accordion Ruler tab
     replaces this. .ruler-desktop-only renders display:none at ≤767px. -->
<div class="ruler-desktop-only">
  {#if regimes.length > 0 && orbitsInView}
    <!-- Curated order: HEO sits between LEO and MEO since its perigee/
         apogee span straddles both; pure altitude-sort would place HEO
         below LEO (perigee 1,000 km) which buries its teaching value.
         Hidden once the camera dips below LEO — orbits then sit overhead
         and the ruler references nothing on screen (#363). -->
    <OrbitRuler
      {regimes}
      {highlightRegime}
      onSelect={openRegime}
      order={['L2', 'MOON', 'GEO', 'MEO', 'HEO', 'LEO']}
      anchorBottomPx={14}
    />
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
  /* Hide the persistent desktop ruler on touch — the RULER drawer replaces it.
     Keyed on capability, not width, so a landscape phone (wide but touch)
     doesn't show BOTH the default ruler and the drawer one. */
  @media (hover: none), (pointer: coarse) {
    .ruler-desktop-only {
      display: none;
    }
  }
</style>
