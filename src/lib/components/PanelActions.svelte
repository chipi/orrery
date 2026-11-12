<!--
  The panel's one action row (UXD-018): at most three <Chip kind="action" | "link"> under the
  identity block, above the hero, in the order in-scene, view, simulate, plan. The host renders
  it only when it has an action; Share is not here, it lives in the Panel bar.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

<div class="ui-chip-group panel-actions">{@render children?.()}</div>

<style>
  .panel-actions {
    margin: 0 0 12px;
  }
  /* The host's chips are conditional (a site with no panorama, route or zoom): no chip, no row. */
  .panel-actions:not(:has(.ui-chip)) {
    display: none;
  }
  /* A long label wraps inside its chip rather than pushing the row wider than the panel. */
  .panel-actions :global(.ui-chip) {
    min-width: 0;
    white-space: normal;
    text-align: center;
  }
</style>
