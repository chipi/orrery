<script lang="ts">
  import * as m from '$lib/paraglide/messages';
</script>

<svelte:head><title>{m.landing_page_title()}</title></svelte:head>

<p>{m.landing_redirecting()}</p>

<style>
  p {
    padding: 32px;
    color: var(--color-text-dim);
  }
</style>
