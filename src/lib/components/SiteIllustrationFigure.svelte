<!--
  An illustrated site map (static/data/site-illustrations.json) with its caption.
  Given `onOpen` it is a tappable card (the site panel's STORY tab → lightbox);
  without, a plain figure (the /moon/<id> and /mars/<id> pages).
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import * as m from '$lib/paraglide/messages';
  import type { SiteIllustration } from '$lib/data/site-illustrations';

  let { illustration, onOpen }: { illustration: SiteIllustration; onOpen?: (src: string) => void } =
    $props();

  const ALT: Record<string, () => string> = {
    apollo11: m.site_illustration_alt_apollo11,
    apollo12: m.site_illustration_alt_apollo12,
    apollo14: m.site_illustration_alt_apollo14,
    apollo15: m.site_illustration_alt_apollo15,
    apollo16: m.site_illustration_alt_apollo16,
    apollo17: m.site_illustration_alt_apollo17,
    luna17: m.site_illustration_alt_luna17,
    luna21: m.site_illustration_alt_luna21,
    change3: m.site_illustration_alt_change3,
    chandrayaan3: m.site_illustration_alt_chandrayaan3,
    spirit: m.site_illustration_alt_spirit,
    opportunity: m.site_illustration_alt_opportunity,
    curiosity: m.site_illustration_alt_curiosity,
    perseverance: m.site_illustration_alt_perseverance,
    zhurong: m.site_illustration_alt_zhurong,
  };
  let src = $derived(assetUrl(`/${illustration.file}`));
  let alt = $derived(ALT[illustration.siteId]?.() ?? illustration.title);
  let caption = $derived(
    illustration.body === 'mars'
      ? m.site_illustration_caption_mars()
      : m.site_illustration_caption_moon(),
  );
</script>

<figure class="site-illustration" class:card={!!onOpen} data-testid="site-illustration">
  {#if onOpen}
    <p class="kicker">{m.site_illustration_title()}</p>
    <button type="button" class="open" onclick={() => onOpen(src)} aria-label={alt}>
      <img {...responsive(src, IMAGE_SIZES.panel)} {alt} loading="lazy" decoding="async" />
    </button>
  {:else}
    <img {...responsive(src, IMAGE_SIZES.column)} {alt} loading="lazy" decoding="async" />
  {/if}
  <figcaption>{caption}</figcaption>
</figure>

<style>
  .site-illustration {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card {
    margin-bottom: 18px;
  }
  .kicker {
    margin: 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: var(--accent, #889fe7);
  }
  .open {
    display: block;
    width: 100%;
    padding: 0;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .open:hover,
  .open:focus-visible {
    border-color: #889fe7;
    outline: none;
  }
  img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2752 / 1536;
    border-radius: 2px;
  }
  figcaption {
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    line-height: 1.45;
    font-style: italic;
    color: rgba(255, 255, 255, 0.6);
  }
</style>
