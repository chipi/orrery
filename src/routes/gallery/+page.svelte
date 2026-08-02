<!--
  /gallery — the hub for Orrery's visual collections: Deep-Sky, poster prints,
  and mission insignia. Each collection is a full-bleed horizontal strip built
  from its own real imagery. English-only, matching its children.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { assetOrigin } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';

  // Real imagery from each collection, laid edge-to-edge as the strip art.
  const deepSkyStrip = [
    'jwst-carina',
    'hst-whirlpool',
    'jwst-pillars',
    'hst-butterfly',
    'jwst-cartwheel',
    'hst-carina-pano',
    'jwst-tarantula',
    'hst-sombrero',
  ];
  // A deliberate spread — USSR/Russia, China, Japan, US — across all three
  // poster styles (vintage screen-print · modern comic · photoreal).
  const postersStrip = [
    'mir', // vintage · USSR
    'sputnik', // comic · USSR
    'saturn-v', // vintage · US
    'tiangong', // photoreal · China
    'gagarin', // comic · USSR
    'hubble', // photoreal · US
    'hayabusa2', // comic · Japan
    'space-shuttle', // photoreal · US
    'artemis-ii', // comic · US
    'mars', // vintage · US
  ];
  const patchesStrip = [
    'missions/apollo11',
    'missions/apollo-soyuz',
    'programs/iss',
    'programs/space-shuttle',
    'programs/artemis',
    'programs/spacex',
  ];
</script>

<svelte:head>
  <title>Gallery · Orrery</title>
  <meta
    name="description"
    content="Orrery's visual collections — deep-sky imagery, original space posters, and authentic mission insignia."
  />
</svelte:head>

<article class="gallery-hub" data-route-ready="true">
  <header>
    <h1>{m.gallery_h1()}</h1>
    <p class="lede">{m.gallery_lede()}</p>
  </header>

  <div class="strips">
    <a class="strip" href="{base}{localizeHref('/gallery/deep-sky')}">
      <div class="strip-imgs">
        {#each deepSkyStrip as k (k)}
          <img src="{assetOrigin}/images/deep-sky/{k}.thumb.jpg" alt="" loading="lazy" />
        {/each}
      </div>
      <div class="strip-scrim"></div>
      <div class="strip-text">
        <h2>Deep-Sky</h2>
        <p>
          The universe's greatest hits, as seen by the great observatories — Webb, Hubble, Chandra.
        </p>
        <span class="go">Browse the sky →</span>
      </div>
    </a>

    <a class="strip" href="{base}{localizeHref('/posters')}">
      <div class="strip-imgs strip-imgs-posters">
        {#each postersStrip as id (id)}
          <img src="{assetOrigin}/images/posters/{id}.thumb.jpg" alt="" loading="lazy" />
        {/each}
      </div>
      <div class="strip-scrim"></div>
      <div class="strip-text">
        <h2>{m.gallery_posters_title()}</h2>
        <p>{m.gallery_posters_body()}</p>
        <span class="go">{m.gallery_posters_cta()}</span>
      </div>
    </a>

    <a class="strip strip-patches" href="{base}{localizeHref('/patches')}">
      <div class="strip-imgs">
        {#each patchesStrip as p (p)}
          <img src="{assetOrigin}/images/badges/{p}.webp" alt="" loading="lazy" />
        {/each}
      </div>
      <div class="strip-scrim"></div>
      <div class="strip-text">
        <h2>{m.gallery_insignia_title()}</h2>
        <p>{m.gallery_insignia_body()}</p>
        <span class="go">{m.gallery_insignia_cta()}</span>
      </div>
    </a>
  </div>

  <p class="aside">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + base path, no user input -->
    {@html m.gallery_aside({
      link: `<a href="${base}${localizeHref('/sourcing')}">${m.gallery_link_sourcing()}</a>`,
    })}
  </p>
</article>

<style>
  .gallery-hub {
    max-width: 1080px;
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

  .strips {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 34px 0 30px;
  }
  .strip {
    position: relative;
    display: block;
    height: clamp(168px, 25vh, 240px);
    border-radius: 14px;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    background: #06080f;
  }
  /* The collection's real imagery, laid full-height edge-to-edge; the row is
     wider than the strip so it bleeds off the right edge. */
  .strip-imgs {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
  }
  .strip-imgs img {
    height: 100%;
    width: auto;
    flex: 0 0 auto;
    object-fit: cover;
    object-position: center;
    transition: transform 0.5s ease;
  }
  .strip:hover .strip-imgs img {
    transform: scale(1.05);
  }
  /* Dark on the left for the text, opening up to the art on the right. */
  .strip-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(5, 7, 13, 0.95) 0%,
      rgba(5, 7, 13, 0.72) 36%,
      rgba(5, 7, 13, 0.2) 66%,
      rgba(5, 7, 13, 0.45) 100%
    );
    transition: background 0.3s ease;
  }
  .strip:hover .strip-scrim {
    background: linear-gradient(
      90deg,
      rgba(5, 7, 13, 0.92) 0%,
      rgba(5, 7, 13, 0.6) 36%,
      rgba(5, 7, 13, 0.12) 66%,
      rgba(5, 7, 13, 0.4) 100%
    );
  }
  .strip-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 clamp(24px, 5vw, 56px);
    max-width: min(560px, 64%);
  }
  .strip-text h2 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(30px, 4.6vw, 46px);
    letter-spacing: 2px;
    line-height: 1;
    margin: 0 0 8px;
  }
  .strip-text p {
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 0 12px;
    max-width: 44ch;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .go {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 1.5px;
    color: #cfe3fb;
    transition: color 0.15s;
  }
  .strip:hover .go {
    color: #fff;
  }

  /* Posters are portrait prints — a little breathing room reads as a shelf. */
  .strip-imgs-posters {
    gap: 10px;
    padding-left: 30%;
  }

  /* Insignia are transparent round badges — float them on the right on a soft
     glow instead of a hard photo band. */
  .strip-patches {
    background: radial-gradient(circle at 74% 50%, rgba(127, 176, 224, 0.14), #06080f 68%);
  }
  .strip-patches .strip-imgs {
    gap: clamp(14px, 2.5vw, 30px);
    justify-content: flex-end;
    padding-right: 3%;
  }
  .strip-patches .strip-imgs img {
    height: 66%;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.6));
    transition:
      transform 0.4s ease,
      filter 0.3s ease;
  }
  .strip-patches:hover .strip-imgs img {
    transform: translateY(-3px) scale(1.04);
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

  @media (max-width: 560px) {
    .strip {
      height: clamp(150px, 34vw, 200px);
    }
    .strip-text {
      max-width: 78%;
    }
    .strip-imgs-posters {
      padding-left: 8%;
    }
  }
</style>
