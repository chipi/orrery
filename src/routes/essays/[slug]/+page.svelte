<!--
  /essays/[slug] — a single essay in The Long View. Long-form editorial:
  base record (structure) + per-locale overlay (prose) via getEssay. Body is
  a block list (heading / prose); prose renders through essayInlineHtml so the
  inline [text](/route) deep-links — the essay's cross-link spine — resolve.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { essayInlineHtml } from '$lib/essay-md';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let essay = $derived(data.essay);

  // Resolve an essay image ref to a URL. `missions/<id>/NN` and `fleet/<id>/NN`
  // reuse the existing vetted galleries; `essays/<slug>/NN` are the essay's own
  // sourced photos and the Wired-style diagram panels (static/images/essays/).
  function imgSrc(ref: string): string {
    const parts = ref.split('/');
    const coll = parts[0];
    const id = parts.slice(1, -1).join('/');
    const n = parts[parts.length - 1];
    if (coll === 'missions') return `${base}/images/missions/${id}/${n}.webp`;
    if (coll === 'fleet') return `${base}/images/fleet-galleries/${id}/${n}.webp`;
    if (coll === 'essays') return `${base}/images/essays/${id}/${n}.webp`;
    return `${base}/images/${ref}.webp`;
  }
</script>

<svelte:head>
  <title>{essay.title} · The Long View · Orrery</title>
  <meta name="description" content={essay.dek} />
</svelte:head>

<article class="essay" data-route-ready="true">
  <nav class="crumb">
    <a href="{base}{localizeHref('/essays')}">The Long View</a><span class="sep">›</span><span
      >{essay.title}</span
    >
  </nav>

  <header class="head">
    <h1>{essay.title}</h1>
    <p class="dek">{essay.dek}</p>
  </header>

  {#if essay.hero}
    <figure class="hero">
      <img src={imgSrc(essay.hero)} alt={essay.dek} decoding="async" />
    </figure>
  {/if}

  <div class="body">
    {#each essay.body as block, i (i)}
      {#if block.type === 'heading'}
        <h2>{block.text}</h2>
      {:else if block.type === 'prose'}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: author-controlled overlay prose (no user input); essayInlineHtml escapes then applies link/em/strong -->
        <p>{@html essayInlineHtml(block.md)}</p>
      {:else if block.type === 'figure'}
        <figure class="fig fig-{block.align ?? 'inline'} fig-{block.kind}">
          <img src={imgSrc(block.image)} alt={block.caption} decoding="async" loading="lazy" />
          <figcaption>
            {block.caption}{#if block.credit}<span class="credit">{block.credit}</span>{/if}
          </figcaption>
        </figure>
      {/if}
    {/each}
  </div>

  {#if essay.read_next && essay.read_next.length}
    <section class="doors">
      <h3>Read next</h3>
      <ul>
        {#each essay.read_next as r (r.href)}
          <li>
            <a href="{base}{r.href}">{r.label}</a>{#if r.kind}<span class="tag">{r.kind}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if essay.sources && essay.sources.length}
    <section class="sources">
      <h3>Sources &amp; further reading</h3>
      <ul>
        {#each essay.sources as s (s.url)}
          <li><a href={s.url} target="_blank" rel="noopener noreferrer external">{s.title}</a></li>
        {/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  .essay {
    max-width: 720px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 28px) 20px 96px;
    color: var(--color-text, #eef);
  }
  .crumb {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 22px;
  }
  .crumb a {
    color: #7fb0e0;
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 8px;
    color: rgba(255, 255, 255, 0.3);
  }
  .head {
    margin-bottom: 32px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 24px;
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(40px, 8vw, 62px);
    line-height: 1.02;
    letter-spacing: 0.5px;
    margin: 0 0 16px;
  }
  .dek {
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 20px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.72);
    margin: 0;
  }
  .body :global(p) {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 19px;
    line-height: 1.72;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 22px;
  }
  .hero {
    margin: 0 0 34px;
  }
  .hero img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  .fig {
    margin: 30px 0;
  }
  .fig img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
  }
  /* Diagrams sit on a faint plate so the Wired-style art reads as a panel. */
  .fig-diagram img {
    background: #0a0e18;
    border: 1px solid rgba(127, 176, 224, 0.18);
  }
  .fig-photo img {
    border: 1px solid rgba(255, 255, 255, 0.08);
  }
  /* Wide figures break out of the 720px text column on larger viewports. */
  .fig-wide {
    margin-inline: calc(50% - 50vw);
    max-width: 100vw;
    padding-inline: 20px;
  }
  @media (min-width: 1080px) {
    .fig-wide {
      margin-inline: -140px;
      padding-inline: 0;
    }
  }
  .fig figcaption {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    line-height: 1.5;
    letter-spacing: 0.3px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 9px;
  }
  .fig .credit {
    display: block;
    margin-top: 3px;
    color: rgba(255, 255, 255, 0.32);
    font-size: 11px;
  }
  .body h2 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7fb0e0;
    margin: 40px 0 18px;
  }
  .body :global(a) {
    color: #cfe3fb;
    text-decoration: none;
    border-bottom: 1px solid rgba(127, 176, 224, 0.4);
  }
  .body :global(a:hover) {
    border-bottom-color: #7fb0e0;
  }
  .body :global(em) {
    font-style: italic;
  }
  .body :global(strong) {
    font-weight: 600;
    color: #fff;
  }
  .doors,
  .sources {
    margin-top: 44px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .doors h3,
  .sources h3 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 12px;
  }
  .doors ul,
  .sources ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .doors a,
  .sources a {
    color: #cfe3fb;
    text-decoration: none;
    border-bottom: 1px solid rgba(127, 176, 224, 0.4);
    font-size: 15px;
  }
  .doors .tag {
    margin-left: 8px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
  }
</style>
