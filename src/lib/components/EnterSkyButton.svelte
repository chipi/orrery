<!--
  "SKY" affordance (#393) — enters the sky-pointing AR mode: hold the phone up and
  the Sun/Moon/planets are marked where they actually are in your sky. Same
  capability gating as EnterArButton (needs a heading-capable AR device / the
  wrapped app); hidden on desktop + unsupported, App-Store link on iOS Safari.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    detectArPlatform,
    isIosWeb,
    isArSessionSupported,
    arAvailability,
    type ArAvailability,
  } from '$lib/ar';

  let { onEnter }: { onEnter?: () => void } = $props();

  let state = $state<ArAvailability>('hidden');
  onMount(async () => {
    const base = arAvailability(detectArPlatform(), isIosWeb());
    if (base !== 'enabled') {
      state = base;
      return;
    }
    state = (await isArSessionSupported()) ? 'enabled' : 'hidden';
  });

  const APP_STORE_URL = 'https://apps.apple.com/app/orrery';
</script>

{#if state === 'enabled'}
  <button
    type="button"
    class="enter-sky"
    aria-label="Point your phone at the sky to find the Sun, Moon and planets"
    onclick={onEnter}
  >
    SKY
  </button>
{:else if state === 'ios-fallback'}
  <a
    class="enter-sky ios-fallback"
    href={APP_STORE_URL}
    target="_blank"
    rel="noopener noreferrer external"
    title="Get the app to point at the real sky in AR"
  >
    SKY
  </a>
{/if}

<style>
  /* Matches the 2D/AR chips (44px, dark glass, Space Mono 12px, radius 4) with a
     sky-blue accent so it reads as the "look up" affordance. */
  .enter-sky {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(122, 162, 255, 0.6);
    border-radius: 4px;
    color: #9fc0ff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-decoration: none;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .enter-sky:hover,
  .enter-sky:focus-visible {
    background: rgba(122, 162, 255, 0.16);
    outline: none;
  }
  .enter-sky.ios-fallback {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.45);
    cursor: help;
  }
</style>
