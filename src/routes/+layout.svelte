<script lang="ts">
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';

  let { children } = $props();
</script>

<Nav />
<main>
  {@render children?.()}
</main>

<style>
  main {
    min-height: calc(100vh - var(--nav-height));
  }
</style>
