<!-- Dev verification of the reusable <LaunchScene> before wiring into /fly. -->
<script lang="ts">
  import LaunchScene from '$lib/components/LaunchScene.svelte';
  import { FALCON9_SAMPLE } from '$lib/orbital/ascent-profiles';

  let handedOff = $state(false);
</script>

<svelte:head><title>/dev/launch — LaunchScene component</title></svelte:head>

{#if handedOff}
  <div class="cruise">→ handed off to cruise (onComplete fired)</div>
{:else}
  <LaunchScene
    profile={FALCON9_SAMPLE}
    mission={{
      name: 'DEMO ASCENT',
      agency: 'SpaceX',
      site: 'SLC-40 · Cape Canaveral',
      destination: 'Low Earth Orbit',
    }}
    onComplete={() => (handedOff = true)}
  />
{/if}

<style>
  .cruise {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    background: #03050c;
    color: #7fdfff;
    font-family: 'Space Mono', monospace;
    font-size: 18px;
    letter-spacing: 2px;
  }
</style>
