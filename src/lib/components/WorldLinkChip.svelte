<!--
  "Go to Mars": the view chip of the Explore panel of a body that has a world page (UXD-028).
  Draws nothing for any other body. The Moon passes its satellite id.
-->
<script lang="ts">
  import Chip from './Chip.svelte';
  import { localHref } from '$lib/locale';
  import { worldLinkLabel, worldPathFor } from '$lib/explore/world-links';

  let { bodyId }: { bodyId: string } = $props();
  const path = $derived(worldPathFor(bodyId));
</script>

{#if path}
  <Chip kind="link" href={localHref(path)} data-testid="panel-world-link"
    >{worldLinkLabel(bodyId)}</Chip
  >
{/if}
