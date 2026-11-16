<!--
  CardRail — a row of MiniCards that scrolls sideways inside its own box (E1, UXD-032). Native
  scroll and touch swipe, scroll-snap `proximity`, no arrow buttons; the cards are tab stops, so
  the keyboard scrolls the rail into view. `label` is the accessible name (the section label).
  Children are `<li>` items.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<ul class="card-rail" aria-label={label}>
  {@render children()}
</ul>

<style>
  .card-rail {
    list-style: none;
    margin: 0;
    padding: 2px 2px 12px;
    display: flex;
    gap: 10px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    overscroll-behavior-x: contain;
  }
  .card-rail > :global(li) {
    flex: 0 0 auto;
    scroll-snap-align: start;
  }
</style>
