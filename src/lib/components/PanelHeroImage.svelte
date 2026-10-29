<!--
  Hero image at the top of a detail panel (#42): /moon + /mars site panels and
  the planet / sun / small-body / belt / satellite / station-module / mission /
  fleet / earth-object panels.

  With `onOpen` the image is a button (click opens the caller's lightbox);
  without it the hero is a plain image. `fetchpriority="high"` +
  `decoding="async"` land it above the fold on slow connections without
  blocking the main thread; `responsive()` upgrades it to the WebP ladder.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';

  interface Props {
    src: string;
    name: string;
    onOpen?: () => void;
    /** Overrides the default "view <name> image" button label. */
    ariaLabel?: string;
    /** Extra wrapper class, for a panel that styles its hero differently. */
    heroClass?: string;
  }
  let { src, name, onOpen, ariaLabel, heroClass = '' }: Props = $props();
</script>

<div class="panel-hero {heroClass}" class:plain={!onOpen}>
  {#if onOpen}
    <button
      type="button"
      class="panel-hero-btn"
      onclick={onOpen}
      aria-label={ariaLabel ?? m.panel_hero_aria({ name })}
    >
      <img {...responsive(src, IMAGE_SIZES.panel)} alt="" fetchpriority="high" decoding="async" />
    </button>
  {:else}
    <img {...responsive(src, IMAGE_SIZES.panel)} alt="" fetchpriority="high" decoding="async" />
  {/if}
</div>

<style>
  /* The clickable hero is styled by .panel-hero-btn in panel-tabs.css; the
     plain one (belt, satellite panels) keeps its framed full-width look. */
  .panel-hero.plain {
    margin: 0 0 14px;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.4);
  }
  .panel-hero.plain img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
