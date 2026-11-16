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
  import Chip from './Chip.svelte';
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

  // The App Store listing for the native app (store-ship is #217). Until it
  // exists the iOS fallback stays hidden: a placeholder store URL was a 404 for
  // every iOS Safari visitor who tapped AR.
  const APP_STORE_URL: string | null = null;
</script>

{#if state === 'enabled'}
  <Chip kind="action" aria-label={m.ar_enter_aria()} onclick={onEnter}>AR</Chip>
{:else if state === 'ios-fallback' && APP_STORE_URL}
  <Chip
    kind="link"
    href={APP_STORE_URL}
    target="_blank"
    rel="noopener noreferrer external"
    title={m.ar_ios_fallback()}
  >
    AR
  </Chip>
{/if}
