<script lang="ts">
  // ORRERY GALLERY — 27 art-print posters in three style families.
  // Posters are ORRERY originals, AI-generated (provenance on /colophon).
  // Each is a
  // 2:3 raster print; the on-page card uses a width-700 thumbnail and
  // links to the full-resolution JPG for download. Subjects + taglines
  // are baked into the artwork; `sub` here mirrors them for a11y/SEO.
  import { base } from '$app/paths';
  import { localHref } from '$lib/locale';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { assetOrigin } from '$lib/asset-url';
  import { roving } from '$lib/a11y/roving';
  import * as m from '$lib/paraglide/messages';

  type Poster = { id: string; title: string; sub: string };

  const vintage: Poster[] = [
    { id: 'solar-system-orrery', title: 'Solar System', sub: 'Eight planets · one star' },
    { id: 'solar-system-procession', title: 'Solar System', sub: 'Eight planets · one star' },
    { id: 'earth', title: 'Earth', sub: 'One planet · no backup' },
    { id: 'moon', title: 'Moon', sub: 'Twelve footprints · one giant leap' },
    { id: 'mars', title: 'Mars', sub: 'Two years away · always waiting' },
    { id: 'saturn-v', title: 'Saturn V', sub: 'The mightiest rocket' },
    { id: 'mir', title: 'Mir', sub: "Humanity's first great outpost" },
  ];
  const comic: Poster[] = [
    { id: 'sputnik', title: 'Sputnik', sub: 'The world looked up' },
    { id: 'soyuz', title: 'Soyuz', sub: 'Since 1967 · still flying' },
    { id: 'voyager', title: 'Voyager', sub: 'Launched 1977 · still talking' },
    { id: 'sojourner', title: 'Sojourner', sub: 'First wheels' },
    { id: 'footprints', title: 'Footprints', sub: 'For a million years' },
    { id: 'gagarin', title: 'Gagarin', sub: 'One hundred eight minutes' },
    { id: 'rosetta', title: 'Rosetta', sub: 'First to land on a comet' },
    { id: 'huygens', title: 'Huygens', sub: 'First touch of Titan' },
    { id: 'hayabusa2', title: 'Hayabusa2', sub: 'Touched an asteroid, brought it home' },
    { id: 'artemis-ii', title: 'Artemis II', sub: 'Four around the Moon' },
  ];
  const photoreal: Poster[] = [
    { id: 'iss', title: 'ISS', sub: 'Fifteen nations · one outpost' },
    { id: 'tiangong', title: 'Tiangong', sub: 'Above the bamboo forest' },
    { id: 'perseverance', title: 'Perseverance', sub: 'Dare mighty things' },
    { id: 'space-shuttle', title: 'Space Shuttle', sub: 'The winged years' },
    { id: 'solar-sail', title: 'Solar Sail', sub: 'Sailing on sunlight' },
    { id: 'nuclear-drive', title: 'Nuclear Drive', sub: 'The engines of tomorrow' },
    { id: 'jwst', title: 'James Webb', sub: 'Unfolding the dawn of time' },
    { id: 'hubble', title: 'Hubble', sub: 'Thirty years of wonder' },
    { id: 'cassini', title: 'Cassini', sub: 'The Grand Finale' },
    { id: 'starship', title: 'Starship', sub: 'The road to Mars' },
  ];
  const posters: Poster[] = [...vintage, ...comic, ...photoreal];
</script>

<svelte:head>
  <title>{m.gallery_posters_title()} · {m.layout_footer_gallery()} · Orrery</title>
</svelte:head>

<article class="gallery" data-route-ready="true">
  <header>
    <nav class="crumb">
      <a href="{base}{localizeHref('/gallery')}">{m.layout_footer_gallery()}</a><span class="sep"
        >›</span
      ><span>{m.gallery_posters_title()}</span>
    </nav>
    <h1>{m.posters_h1()}</h1>
    <p class="lede">{m.posters_lede()}</p>
  </header>

  <!-- Spatial roving (RFC-031 S1): one Tab stop; arrows / TV D-pad move between
       posters by 2D geometry instead of 27 separate Tab stops. -->
  <div class="grid" use:roving={{ mode: 'spatial' }}>
    {#each posters as p (p.id)}
      <figure class="poster">
        <a
          href="{assetOrigin}/images/posters/{p.id}.jpg"
          download="orrery-{p.id}.jpg"
          aria-label={m.posters_download_aria({ title: p.title, sub: p.sub })}
        >
          <img
            src="{assetOrigin}/images/posters/{p.id}.thumb.jpg"
            alt={m.posters_alt({ title: p.title, sub: p.sub })}
            width="700"
            height="1050"
            loading="lazy"
          />
        </a>
      </figure>
    {/each}
  </div>

  <footer class="gallery-footer">
    <p>
      <strong>{m.posters_footer_free_title()}</strong>
      {m.posters_footer_free_body()}
    </p>
    <p>
      <strong>{m.posters_footer_styles_title()}</strong>
      {m.posters_footer_styles_body()}
    </p>
    <p>
      <strong>{m.posters_footer_orig_title()}</strong>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + local path, no user input -->
      {@html m.posters_footer_orig_body({
        link: `<a href="${localHref('/colophon')}">${m.colophon_title()}</a>`,
      })}
    </p>
  </footer>
</article>

<style>
  .gallery {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    color: var(--color-text);
  }
  header {
    text-align: center;
    margin-bottom: 36px;
  }
  .crumb {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 14px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 8px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 42px;
    letter-spacing: 10px;
    margin: 0 0 12px;
  }
  .lede {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    color: rgba(255, 255, 255, 0.75);
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.55;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .poster {
    margin: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    background: #000;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .poster:hover {
    border-color: rgba(78, 205, 196, 0.4);
    transform: translateY(-2px);
  }
  .poster a {
    display: block;
  }
  .poster img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 3;
    object-fit: cover;
  }
  .gallery-footer {
    margin-top: 48px;
    padding: 20px 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .gallery-footer p {
    font-family: var(--font-mono), monospace;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 10px;
  }
  .gallery-footer p:last-child {
    margin-bottom: 0;
  }
  .gallery-footer strong {
    color: #4ecdc4;
    font-weight: normal;
    letter-spacing: 1px;
  }
  .gallery-footer :global(a) {
    color: #4ecdc4;
    text-decoration: underline;
  }
  .gallery-footer :global(a:hover) {
    text-decoration: underline;
  }
  @media (max-width: 1023px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 639px) {
    .gallery {
      padding: 16px 16px 32px;
    }
    .grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin: 0 auto;
    }
    h1 {
      font-size: 32px;
      letter-spacing: 6px;
    }
  }
</style>
