<!--
  Graphics-quality registration shim (2026-07-13).

  The graphics-quality controls now live in the unified settings panel
  (SensorySheet), so this component no longer renders a popup — it only REGISTERS
  the route's settings availability + resolved tier in the shared store, so the
  unified panel shows its "Graphics" section on this route. Routes keep mounting
  it unchanged:

    <QualitySettingsModal {activeQualityTier} />
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { QualityTier } from '$lib/quality/quality-tier';
  import {
    setSettingsAvailable,
    clearSettingsAvailable,
  } from '$lib/quality/quality-settings-store.svelte';

  let { activeQualityTier }: { activeQualityTier: QualityTier } = $props();

  // Register availability + the active tier on mount; re-runs if the tier
  // resolves asynchronously. Cleared on unmount.
  $effect(() => {
    setSettingsAvailable(activeQualityTier);
  });
  onDestroy(() => {
    clearSettingsAvailable();
  });
</script>
