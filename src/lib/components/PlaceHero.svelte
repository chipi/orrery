<!--
  Hero photo at the top of the /earth museum and observatory cards (PRD-027,
  PRD-028): the building or the telescope itself, cropped to 16:9. Uses the
  responsive WebP ladder once its manifest loads; renders nothing for a place
  without a photo. Credit lives on /credits with the rest of the image
  provenance.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { getImageAlt } from '$lib/image-alt';
  import { dataLoadFailed } from '$lib/data/core';

  interface Props {
    /** Served path, e.g. /images/museums/<id>/01.webp */
    src: string;
    locale: string;
  }
  let { src, locale }: Props = $props();

  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);
  // A path with no ladder entry has no photo on disk.
  const ladder = $derived(ladderReady ? ladderSources(`${base}${src}`) : null);
</script>

{#if ladder}
  <div class="place-hero" data-testid="place-hero">
    <img
      src={ladder.src}
      srcset={ladder.srcset}
      sizes="(max-width: 600px) 100vw, 440px"
      alt={getImageAlt(src, locale)}
      decoding="async"
    />
  </div>
{/if}

<style>
  .place-hero {
    margin: 0;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
    aspect-ratio: 16 / 9;
  }
  .place-hero img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
