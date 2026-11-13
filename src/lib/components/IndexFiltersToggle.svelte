<!--
  The FILTERS button of an INDEX (UXD-017, C6-F): folds the filter chips that would wrap past one
  line. Shared by ScaleIndex and SurfaceIndexPanel so every INDEX has one look (index-panel.css,
  `.idx-filters-btn`). `count` is how many filters are on inside the fold: it stays visible while
  the fold is closed, so a hidden filter is never a surprise.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';

  interface Props {
    open: boolean;
    count: number;
    /** id of the folded region this button controls. */
    controls: string;
    onclick: () => void;
  }
  let { open, count, controls, onclick }: Props = $props();
</script>

<Chip
  kind="action"
  class="idx-filters-btn"
  aria-expanded={open}
  aria-controls={controls}
  data-testid="index-filters-toggle"
  {onclick}
>
  {m.filters_eyebrow()}{#if count > 0}<span class="idx-filters-n">{count}</span>{/if}<span
    class="idx-filters-chevron"
    aria-hidden="true">{open ? '▴' : '▾'}</span
  >
</Chip>
