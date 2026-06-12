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
  import { base } from '$app/paths';
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import DebugPanel from '$lib/components/DebugPanel.svelte';
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
</script>

<svelte:head><title>{m.earth_page_title()}</title></svelte:head>

<DebugPanel pageLabel="EARTH" />

<SurfaceScene
  config={earthSurfaceConfig}
  loadSites={getEarthLaunchSites}
  loadGallery={getEarthLaunchSiteGallery}
  {initialView}
/>

<!-- Hidden tour anchors (PRD-016 §S11 / RFC-019 §12). Programmatic
     entry points for the Curator Tour's narration "Click ISS or
     Tiangong" / "JWST orbits there" — calls into SurfaceScene's
     selectSite via the window hook it exposes on mount. -->
<div class="tour-anchors" aria-hidden="true">
  <button
    type="button"
    data-audio-stage="earth-select-iss"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('iss')}>select iss</button
  >
  <button
    type="button"
    data-audio-stage="earth-select-tiangong"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('tiangong')}>select tiangong</button
  >
  <button
    type="button"
    data-audio-stage="earth-select-hubble"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('hubble')}>select hubble</button
  >
  <button
    type="button"
    data-audio-stage="earth-select-jwst"
    tabindex="-1"
    onclick={() =>
      (
        window as Window & { __surfaceSceneSelectSite?: (id: string) => void }
      ).__surfaceSceneSelectSite?.('jwst')}>select jwst</button
  >
</div>
