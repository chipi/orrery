<!--
  /gallery — the hub for Orrery's visual collections. Currently two: the
  poster prints (/posters) and the insignia (/patches). English-only, matching
  its children. The footer "Gallery" link points here.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { assetOrigin } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';

  // A few insignia for the Patches card preview stack.
  const patchPreview = [
    'programs/apollo',
    'missions/apollo11',
    'programs/gemini',
    'missions/gemini8',
    'programs/iss',
  ];
</script>

<svelte:head>
  <title>Gallery · Orrery</title>
  <meta
    name="description"
    content="Orrery's visual collections — original space posters and authentic mission insignia."
  />
</svelte:head>

<article class="gallery-hub" data-route-ready="true">
  <header>
    <h1>{m.gallery_h1()}</h1>
    <p class="lede">{m.gallery_lede()}</p>
  </header>

  <div class="cards">
    <a class="hub-card" href="{base}{localizeHref('/posters')}">
      <div class="preview preview-posters">
        <img src="{assetOrigin}/images/posters/iss.thumb.jpg" alt="" loading="lazy" />
        <img src="{assetOrigin}/images/posters/gagarin.thumb.jpg" alt="" loading="lazy" />
        <img src="{assetOrigin}/images/posters/mars.thumb.jpg" alt="" loading="lazy" />
      </div>
      <div class="hub-body">
        <h2>{m.gallery_posters_title()}</h2>
        <p>{m.gallery_posters_body()}</p>
        <span class="go">{m.gallery_posters_cta()}</span>
      </div>
    </a>

    <a class="hub-card" href="{base}{localizeHref('/patches')}">
      <div class="preview preview-patches">
        {#each patchPreview as p (p)}
          <img src="{assetOrigin}/images/badges/{p}.webp" alt="" loading="lazy" />
        {/each}
      </div>
      <div class="hub-body">
        <h2>{m.gallery_insignia_title()}</h2>
        <p>{m.gallery_insignia_body()}</p>
        <span class="go">{m.gallery_insignia_cta()}</span>
      </div>
    </a>
  </div>

  <p class="aside">
    {@html m.gallery_aside({
      link: `<a href="${base}${localizeHref('/sourcing')}">${m.gallery_link_sourcing()}</a>`,
    })}
  </p>
</article>

<style>
  .gallery-hub {
    max-width: 1040px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 24px) 20px 80px;
    color: var(--color-text, #eef);
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(40px, 8vw, 64px);
    letter-spacing: 1px;
    margin: 0 0 10px;
  }
  .lede {
    font-size: 17px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.75);
    max-width: 60ch;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 34px 0 30px;
  }
  .hub-card {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 0.15s;
  }
  .hub-card:hover {
    border-color: rgba(127, 176, 224, 0.5);
  }
  .preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    height: 200px;
    padding: 20px;
    background: radial-gradient(circle at 50% 30%, rgba(127, 176, 224, 0.1), rgba(0, 0, 0, 0.25));
  }
  .preview-posters img {
    height: 160px;
    width: auto;
    border-radius: 4px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  }
  .preview-posters img:nth-child(1) {
    transform: rotate(-6deg) translateX(10px);
    z-index: 1;
  }
  .preview-posters img:nth-child(3) {
    transform: rotate(6deg) translateX(-10px);
    z-index: 1;
  }
  .preview-posters img:nth-child(2) {
    z-index: 2;
  }
  .preview-patches img {
    height: 74px;
    width: 74px;
    object-fit: contain;
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
  }
  .preview-patches img:nth-child(even) {
    height: 58px;
    width: 58px;
    opacity: 0.85;
  }
  .hub-body {
    padding: 18px 20px 22px;
  }
  .hub-body h2 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 30px;
    letter-spacing: 1px;
    margin: 0 0 6px;
  }
  .hub-body p {
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px;
  }
  .go {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    color: #cfe3fb;
  }
  .aside {
    font-size: 14px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 18px;
  }
  .aside :global(a) {
    color: #cfe3fb;
  }
</style>
