<!--
  "View in AR" affordance (#213 / RFC-021 §1). Three states:
   • enabled     — AR works (Android web/wrapped, wrapped iPhone) → a button that
                   calls `onEnter` (the route wires it to createArScene).
   • ios-fallback — iOS Safari (no WebXR, not wrapped) → a greyed link to the App
                    Store, since AR is only possible in the native app.
   • hidden      — desktop / unsupported → renders nothing.

  Availability is resolved on mount (needs navigator/Capacitor).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as m from '$lib/paraglide/messages';
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
    // Real capability gate: the platform is AR-capable, but confirm the device
    // can actually run an immersive-AR session (ARCore) before showing the
    // button. Not supported → hide it; the flat scene is the graceful fallback.
    state = (await isArSessionSupported()) ? 'enabled' : 'hidden';
  });

  // Placeholder until the app is published (store-ship is #217). Operators/CI can
  // swap this once the App Store listing exists.
  const APP_STORE_URL = 'https://apps.apple.com/app/orrery';
</script>

{#if state === 'enabled'}
  <button type="button" class="enter-ar" aria-label={m.ar_enter_aria()} onclick={onEnter}>
    {m.ar_enter()}
  </button>
{:else if state === 'ios-fallback'}
  <a
    class="enter-ar ios-fallback"
    href={APP_STORE_URL}
    target="_blank"
    rel="noopener noreferrer external"
    title={m.ar_ios_fallback()}
  >
    {m.ar_enter()}
  </a>
{/if}

<style>
  .enter-ar {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px;
    background: rgba(78, 205, 196, 0.18);
    border: 1px solid rgba(78, 205, 196, 0.6);
    border-radius: 6px;
    color: #4ecdc4;
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 1px;
    text-decoration: none;
    cursor: pointer;
  }
  .enter-ar:hover,
  .enter-ar:focus-visible {
    background: rgba(78, 205, 196, 0.28);
    outline: none;
  }
  /* iOS Safari: greyed, reads as "not here — get the app". */
  .enter-ar.ios-fallback {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.45);
    cursor: help;
  }
</style>
