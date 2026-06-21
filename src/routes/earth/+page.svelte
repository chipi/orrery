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
  import { base } from '$app/paths';
  import { makeEarthLaunchSitesConfig } from './earth-launch-sites-config';
  import { getEarthLaunchSites, getEarthLaunchSiteGallery } from '$lib/earth-launch-site-adapter';
  import { viewerLatLon } from '$lib/viewer-location';
  import * as m from '$lib/paraglide/messages';

  const earthSurfaceConfig = makeEarthLaunchSitesConfig(base);
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
/>

<TourAnchors route="earth" anchors={EARTH_TOUR_ANCHORS} />
