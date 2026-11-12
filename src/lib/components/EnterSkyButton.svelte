<!--
  "SKY" affordance (#393) — enters the sky-pointing AR mode: hold the phone up and
  the Sun/Moon/planets are marked where they actually are in your sky. Enabled on
  any mobile that can run a sky substrate (`skyAvailability`): a real immersive-AR
  session (ARKit / WebXR + compass) OR the non-XR magic window (camera + compass),
  so it works cross-platform — wrapped iPhone, Android (ARCore or not), and iOS
  Safari. Hidden on desktop / devices with no motion sensor.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    isArSessionSupported,
    isMobileSkyCapable,
    skyAvailability,
    type ArAvailability,
  } from '$lib/ar';
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';

  let { onEnter }: { onEnter?: () => void } = $props();

  let state = $state<ArAvailability>('hidden');
  onMount(async () => {
    state = skyAvailability(await isArSessionSupported(), isMobileSkyCapable());
  });
</script>

{#if state === 'enabled'}
  <Chip kind="action" aria-label={m.sky_enter_aria()} onclick={onEnter}>{m.sky_enter()}</Chip>
{/if}
