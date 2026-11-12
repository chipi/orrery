<!--
  /science — encyclopedia tab index landing.

  The shared sticky rail with the six tabs lives in +layout.svelte; this
  route renders the editorial "Space 101" narrative on the right column
  from `static/data/i18n/[locale]/science/_landing.json` (ADR-017). Inline
  paragraph link syntax is `[text](tab/section)` for /science deep-links
  and `[text](app:/route)` for app routes — translators preserve the parens
  content and translate only the bracket text.
-->
<script lang="ts">
  import { seoDescription, seoPageTitle } from '$lib/seo';
  import { responsive } from '$lib/responsive-image.svelte';
  import { localHref } from '$lib/locale';
  import { parseInline } from '$lib/science-inline';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { base } from '$app/paths';
  import { assetOrigin } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  let landing = $derived(data.landing);
</script>

<svelte:head>
  <title>{seoPageTitle(landing?.seo_title, m.science_page_title())}</title>
  <meta
    name="description"
    content={seoDescription(landing?.seo_description, m.science_meta_description())}
  />
</svelte:head>

<header class="hero">
  <h1 class="page-title">{m.science_heading()}</h1>
  <p class="lede page-lead">{m.science_intro()}</p>
  <img
    class="hero-banner"
    {...responsive(
      `${assetOrigin}/images/science-covers-v2/_science-landing-hero.webp`,
      IMAGE_SIZES.banner,
    )}
    alt=""
    loading="eager"
    decoding="async"
  />
</header>

{#if landing}
  <article class="story">
    <section class="chapter">
      <h2 class="page-section-title">{landing.intro_heading}</h2>
      {#each landing.intro_paragraphs as para, i (i)}
        <p class={i === 0 ? 'kicker' : undefined}>
          {#each parseInline(para) as seg, j (j)}{#if seg.kind === 'text'}{seg.value}{:else}<a
                href={seg.href}>{seg.text}</a
              >{/if}{/each}
        </p>
      {/each}
    </section>

    {#each landing.chapters as chapter, idx (idx)}
      <section class="chapter">
        <h2 class="page-section-title">{chapter.heading}</h2>
        {#if chapter.diagram}
          <figure class="story-fig">
            <img
              {...responsive(`${base}/diagrams/science/${chapter.diagram}`, IMAGE_SIZES.column)}
              alt={chapter.diagram_alt ?? ''}
              loading="lazy"
              decoding="async"
            />
            {#if chapter.diagram_caption}
              <figcaption>{chapter.diagram_caption}</figcaption>
            {/if}
          </figure>
        {/if}
        {#each chapter.paragraphs as para, j (j)}
          <p>
            {#each parseInline(para) as seg, k (k)}{#if seg.kind === 'text'}{seg.value}{:else}<a
                  href={seg.href}>{seg.text}</a
                >{/if}{/each}
          </p>
        {/each}
      </section>
    {/each}

    <section class="chapter">
      <h2 class="page-section-title">{landing.tools_heading}</h2>
      <p>{landing.tools_intro}</p>
      <ul class="tools">
        {#each landing.tools as tool, i (i)}
          <li>
            {#each tool.paths as path, p (path)}
              <!-- eslint-disable-next-line svelte/no-useless-mustaches -- literal separator; the wrapping mustache preserves the surrounding spaces Svelte would otherwise trim -->
              <a href={localHref(path)}>{path}</a>{#if p < tool.paths.length - 1}{' · '}{/if}
            {/each}
            <!-- eslint-disable-next-line svelte/no-useless-mustaches -- literal separator; leading space would be trimmed as indentation without the mustache -->
            {' — '}{tool.text}
          </li>
        {/each}
      </ul>
      <p class="closing">{landing.closing}</p>
      <p class="closing">
        <a href={localHref('/science/glossary')}>→ {m.layout_footer_glossary()}</a>
      </p>
    </section>
  </article>
{:else}
  <p class="empty">{m.science_landing_unavailable()}</p>
{/if}

<style>
  .hero {
    margin-bottom: 24px;
  }
  .hero-banner {
    display: block;
    max-width: 100%;
    height: auto;
    max-height: 260px;
    border-radius: 8px;
    margin: 0 auto 16px;
  }
  .story {
    margin: 0 0 56px;
    padding: 24px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .chapter {
    margin: 0 0 36px;
  }
  .chapter .page-section-title {
    margin-bottom: 14px;
  }
  .chapter p,
  .chapter li {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 14px;
  }
  .chapter .kicker {
    color: rgba(255, 255, 255, 0.7);
  }
  .chapter a {
    color: var(--color-accent);
    text-decoration: none;
    border-bottom: 1px dotted var(--color-accent-edge);
  }
  .chapter a:hover {
    border-bottom-color: var(--color-accent);
  }
  .story-fig {
    margin: 18px 0 22px;
    text-align: center;
  }
  .story-fig img {
    max-width: 100%;
    height: auto;
    max-height: 240px;
    opacity: 0.92;
  }
  .story-fig figcaption {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--color-text-label);
    margin-top: 8px;
  }
  ul.tools {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
  }
  ul.tools li {
    margin: 0 0 10px;
    padding-left: 12px;
    border-left: 2px solid var(--color-accent-edge);
  }
  .closing {
    color: rgba(255, 255, 255, 0.7);
    font-size: var(--size-lead);
  }
  .empty {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }
</style>
