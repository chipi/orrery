<!--
  Hero image at the top of /moon + /mars site-detail panels (#42).

  Click anywhere on the image opens the full-screen lightbox showing
  the first gallery entry. Image carries `fetchpriority="high"` +
  `decoding="async"` so it lands above the fold on slow connections
  without blocking the main thread.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { loadLadder, ladderSources } from '$lib/image-srcset';

  interface Props {
    src: string;
    name: string;
    onOpen: () => void;
  }
  let { src, name, onOpen }: Props = $props();

  // Upgrade to the responsive WebP ladder once the manifest loads; render the
  // plain jpg until then (and for images with no ladder). RFC-030 Slice 3.
  let ladderReady = $state(false);
  loadLadder().then(() => (ladderReady = true));
  const ladder = $derived(ladderReady ? ladderSources(src) : null);
</script>

<div class="panel-hero">
  <button
    type="button"
    class="panel-hero-btn"
    onclick={onOpen}
    aria-label={m.panel_hero_aria({ name })}
  >
    {#if ladder}
      <img
        src={ladder.src}
        srcset={ladder.srcset}
        sizes="100vw"
        alt=""
        fetchpriority="high"
        decoding="async"
      />
    {:else}
      <img {src} alt="" fetchpriority="high" decoding="async" />
    {/if}
  </button>
</div>
