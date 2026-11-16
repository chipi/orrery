<!--
  EntityHero — the hero figure of a deep-sky, galaxy or structure page (ADR-096 items 17-18): the
  picture its panel shows, through the same loader. A deep-sky photo is its 700 px thumb with the
  full image as the wider srcset rung (the originals are not on the WebP ladder); a webp with a
  ladder (the EHT image) goes through responsive(). The caption names a pictured part ("Pictured:
  Tarantula Nebula" under the LMC) and the credit from the provenance row; `credit={false}` leaves
  the credit to a line the page already has.
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { responsive } from '$lib/responsive-image.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { PageHero } from '$lib/data';

  let { hero, credit = true }: { hero: PageHero; credit?: boolean } = $props();
  let attrs = $derived(
    hero.fullWidth
      ? {
          src: assetUrl(hero.src),
          srcset: `${assetUrl(hero.src)} 700w, ${assetUrl(hero.full)} ${hero.fullWidth}w`,
          sizes: IMAGE_SIZES.column,
        }
      : responsive(assetUrl(hero.src), IMAGE_SIZES.column),
  );
  let caption = $derived(
    [
      hero.pictured ? m.panel_hero_pictured({ part: hero.pictured }) : null,
      credit ? hero.credit : null,
    ]
      .filter(Boolean)
      .join(' · '),
  );
</script>

<figure class="hero" data-testid="entity-hero">
  <img
    {...attrs}
    alt={hero.alt}
    decoding="async"
    fetchpriority="high"
    style:object-position={hero.position}
  />
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>
