<script lang="ts">
  /** schema.org JSON-LD in the page head; build `data` with $lib/json-ld. */
  import { jsonLdScript } from '$lib/json-ld';

  let { data }: { data: unknown } = $props();
</script>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON.stringify output with < escaped (jsonLdScript) -->
  {@html jsonLdScript(data)}
</svelte:head>
