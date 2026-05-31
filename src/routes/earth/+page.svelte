<script lang="ts">
  /*
   * /earth — thin mode router (#285 Phase 2 B2).
   *
   * Two mutually-exclusive scene modes share the /earth URL:
   *
   *   - mode='orbital' (default) → EarthOrbitalScene
   *       Bespoke orbital view: satellites, ISS, LEO/MEO/GEO/HEO/MOON
   *       regime rings, atmosphere shell, ozone-hole layer. Unchanged
   *       from the pre-B2 /earth — the file was extracted into a
   *       child component so this route can switch into surface mode.
   *
   *   - mode='surface' → SurfaceScene with EARTH_LAUNCH_CONFIG
   *       New launchpad-marker view that mirrors how /moon and /mars
   *       render surface sites. Markers, traverses, hotspot LOD,
   *       panels, 2D fallback — all owned by the shared SurfaceScene
   *       per ADR-072.
   *
   * URL state — `?mode=surface` deep-links into surface mode; the
   * toggle button writes/clears the param via `history.replaceState`
   * so the back button still navigates between routes, not modes.
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import EarthOrbitalScene from './EarthOrbitalScene.svelte';
  import SurfaceScene from '$lib/surface-scene/SurfaceScene.svelte';
  import { makeEarthLaunchSitesConfig } from './earth-launch-sites-config';
  import {
    getEarthLaunchSites,
    getEarthLaunchSiteGallery,
  } from '$lib/earth-launch-site-adapter';
  import * as m from '$lib/paraglide/messages';

  // Default mode = 'orbital' so existing deep-links + prerendered HTML
  // render the orbital scene. The `?mode=surface` query param is read
  // inside onMount because adapter-static prerender forbids accessing
  // url.searchParams at SSR / module-eval time. Client hydration then
  // switches to surface mode if the URL asked for it.
  let mode = $state<'orbital' | 'surface'>('orbital');

  onMount(() => {
    if ($page.url.searchParams.get('mode') === 'surface') {
      mode = 'surface';
    }
  });

  const earthSurfaceConfig = makeEarthLaunchSitesConfig(base);

  function toggleMode(): void {
    mode = mode === 'orbital' ? 'surface' : 'orbital';
    const url = new URL($page.url);
    if (mode === 'surface') url.searchParams.set('mode', 'surface');
    else url.searchParams.delete('mode');
    history.replaceState({}, '', url.toString());
  }
</script>

<svelte:head><title>{m.earth_page_title()}</title></svelte:head>

<button
  type="button"
  class="earth-mode-toggle"
  onclick={toggleMode}
  aria-pressed={mode === 'surface'}
  data-testid="earth-mode-toggle"
>
  {mode === 'orbital' ? 'LAUNCHPADS' : 'ORBITS'}
</button>

{#if mode === 'orbital'}
  <EarthOrbitalScene />
{:else}
  <SurfaceScene
    config={earthSurfaceConfig}
    loadSites={getEarthLaunchSites}
    loadGallery={getEarthLaunchSiteGallery}
  />
{/if}

<style>
  .earth-mode-toggle {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    min-width: 96px;
    min-height: 32px;
    padding: 4px 14px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.55);
    color: #dde4ff;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    font-weight: 700;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .earth-mode-toggle:hover,
  .earth-mode-toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }
  .earth-mode-toggle[aria-pressed='true'] {
    background: rgba(75, 156, 211, 0.22);
    border-color: rgba(75, 156, 211, 0.75);
    color: #7eb6e0;
  }
  @media (max-width: 500px) {
    .earth-mode-toggle {
      font-size: 9px;
      min-width: 80px;
      min-height: 28px;
      padding: 4px 10px;
    }
  }
</style>
