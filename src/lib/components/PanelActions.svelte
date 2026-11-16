<!--
  The panel's one action row (UXD-018): the host's <Chip kind="action" | "link">s under the
  identity block, above the hero, in the order in-scene, view, simulate, plan, then Share last
  when the entity has a collectible card (operator 2026-11-13: Share left the header, whose first
  line belongs to the badges and ×). At most three host chips, four with Share.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy, untrack } from 'svelte';
  import Chip from './Chip.svelte';
  import * as m from '$lib/paraglide/messages';
  import { usePanelShare } from './panel-share.svelte';

  let { children, own = false }: { children?: Snippet; own?: boolean } = $props();

  const panel = usePanelShare();
  // Panel's own fallback row (own) does not count: it is drawn only while no host row exists.
  // `own` is fixed for a row's lifetime, so it is read once.
  const counted = untrack(() => !own);
  if (panel && counted) panel.rows += 1;
  onDestroy(() => {
    if (panel && counted) panel.rows -= 1;
  });
</script>

<div class="ui-chip-group panel-actions">
  {@render children?.()}
  {#if panel?.share}
    <Chip kind="action" onclick={panel.share} aria-haspopup="dialog" data-testid="open-card-btn"
      >{m.panel_share()}</Chip
    >
  {/if}
</div>

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
