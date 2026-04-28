<script lang="ts">
  let { children } = $props();
</script>

{@render children?.()}

<style>
  :global(body) {
    margin: 0;
    background: #04040c;
    color: #ffffff;
    font-family: system-ui, sans-serif;
    min-height: 100vh;
  }
  :global(*) {
    box-sizing: border-box;
  }
</style>
