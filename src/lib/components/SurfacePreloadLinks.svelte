<!--
  Surface-route preload links.

  Emits `<link rel="preload" as="fetch">` for the per-route site
  catalogue + the shared `surface-hotspots.json` sidecar. The browser
  starts the fetches during HTML parse — before the Svelte bundle has
  finished downloading — so by the time SurfaceScene's onMount() fires
  `loadSites()`, the JSON is already in the cache and resolves
  effectively instantly. Hides the network roundtrip from the user-
  perceived "planet shows, items pop in N ms later" window.

  Extracted 2026-06-17 from /moon and /mars after the perf pass.
  /earth opts out: its loadSites path (getEarthLaunchSites) reads
  fleet entries, not a body-specific site catalogue, so the preload
  shape doesn't apply.

  Usage:
    <SurfacePreloadLinks planet="moon" />
    <SurfacePreloadLinks planet="mars" />

  If another surface body lands later (Mercury? Europa?) and ships
  with its own <body>-sites.json catalogue, add it to the planet
  union and this component picks it up. Anything else needing a
  preload on that route can be added in one place.
-->
<script lang="ts">
  import { base } from '$app/paths';

  interface Props {
    planet: 'moon' | 'mars';
  }
  let { planet }: Props = $props();
</script>

<svelte:head>
  <link rel="preload" as="fetch" href="{base}/data/{planet}-sites.json" crossorigin="anonymous" />
  <link rel="preload" as="fetch" href="{base}/data/surface-hotspots.json" crossorigin="anonymous" />
</svelte:head>
