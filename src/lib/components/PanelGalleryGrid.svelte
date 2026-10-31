<!--
  Gallery-tab thumbnail grid for the detail panels. Each image is a button
  that hands its src to the caller (which opens PanelLightbox). Videos or
  extra tiles the caller renders before/after the images go in the
  `leading` / `trailing` snippets.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';

  interface Props {
    images: readonly string[];
    /** Accessible name of each thumbnail button. */
    thumbLabel: string;
    onOpen: (src: string) => void;
    /** aria-label of the grid itself. */
    gridLabel?: string;
    /** Extra wrapper class, for a panel that styles its grid differently. */
    gridClass?: string;
    thumbClass?: string;
    leading?: Snippet;
    trailing?: Snippet;
  }
  let {
    images,
    thumbLabel,
    onOpen,
    gridLabel,
    gridClass = '',
    thumbClass = 'gallery-thumb',
    leading,
    trailing,
  }: Props = $props();
</script>

<div class="gallery-grid {gridClass}" aria-label={gridLabel}>
  {@render leading?.()}
  {#each images as src (src)}
    <button type="button" class={thumbClass} onclick={() => onOpen(src)} aria-label={thumbLabel}>
      <img {...responsive(src, IMAGE_SIZES.panelThumb)} alt="" loading="lazy" decoding="async" />
    </button>
  {/each}
  {@render trailing?.()}
</div>
