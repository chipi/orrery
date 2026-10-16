<!--
  One <img> for every raster image the app shows (#482). Given the served URL and a
  `sizes` hint matching the slot's real layout width, it emits the WebP ladder
  srcset (image-ladder.json) so each device picks its rung by width × DPR — phone,
  tablet, desktop and TV alike, with no per-device code. Images without a ladder
  (SVG logos, badges, hotspot tiles) render the plain src.

  Until the manifest has loaded the plain src renders (never worse than before);
  +layout starts loadLadder() at boot, so data-driven lists normally find it ready.

  `sizes`: for loading="lazy" images, lead with `auto` (the browser uses the laid-out
  width where supported) followed by a breakpoint fallback, e.g.
  `auto, (max-width: 840px) 50vw, 340px`. Any other prop (class, alt, loading,
  decoding, fetchpriority, width, height, onerror, onload, …) passes through.
-->
<script lang="ts">
  import type { HTMLImgAttributes } from 'svelte/elements';
  import { ladderSources, loadLadder } from '$lib/image-srcset';

  interface Props extends Omit<HTMLImgAttributes, 'src' | 'srcset' | 'sizes'> {
    src: string;
    sizes: string;
    alt?: string;
  }
  let { src, sizes, alt = '', ...rest }: Props = $props();

  let ladderReady = $state(false);
  void loadLadder().then(() => (ladderReady = true));
  const ladder = $derived(ladderReady ? ladderSources(src) : null);
</script>

{#if ladder?.srcset}
  <img src={ladder.src} srcset={ladder.srcset} {sizes} {alt} {...rest} />
{:else}
  <img src={ladder?.src ?? src} {alt} {...rest} />
{/if}
