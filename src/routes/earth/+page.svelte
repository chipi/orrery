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
  import { makeEarthLaunchSitesConfig } from './earth-launch-sites-config';
  import { getEarthLaunchSites, getEarthLaunchSiteGallery } from '$lib/earth-launch-site-adapter';
  import * as m from '$lib/paraglide/messages';

  const earthSurfaceConfig = makeEarthLaunchSitesConfig(base);
</script>

<svelte:head><title>{m.earth_page_title()}</title></svelte:head>

<SurfaceScene
  config={earthSurfaceConfig}
  loadSites={getEarthLaunchSites}
  loadGallery={getEarthLaunchSiteGallery}
/>
