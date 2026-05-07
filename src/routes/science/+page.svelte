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
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  let landing = $derived(data.landing);

  /** Render an inline link from `[text](target)` syntax to an `<a>` element.
   * Targets starting with `app:/` map to `${base}/<route>`; otherwise treated
   * as `${base}/science/<tab>/<section>`. */
  type Segment = { kind: 'text'; value: string } | { kind: 'link'; text: string; href: string };
  function parseInline(para: string): Segment[] {
    const segs: Segment[] = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(para)) !== null) {
      if (match.index > last) segs.push({ kind: 'text', value: para.slice(last, match.index) });
      const text = match[1];
      const target = match[2];
      const href = target.startsWith('app:/')
        ? `${base}${target.slice(4)}`
        : `${base}/science/${target}`;
      segs.push({ kind: 'link', text, href });
      last = match.index + match[0].length;
    }
    if (last < para.length) segs.push({ kind: 'text', value: para.slice(last) });
    return segs;
  }
</script>

<svelte:head>
  <title>{m.science_page_title()}</title>
  <meta name="description" content={m.science_meta_description()} />
</svelte:head>

<header class="hero">
  <h1>{m.science_heading()}</h1>
  <p class="lede">{m.science_intro()}</p>
</header>

{#if landing}
  <article class="story">
    <section class="chapter">
      <h2>{landing.intro_heading}</h2>
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
        <h2>{chapter.heading}</h2>
        {#if chapter.diagram}
          <figure class="story-fig">
            <img src="{base}/diagrams/science/{chapter.diagram}" alt={chapter.diagram_alt ?? ''} />
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
      <h2>{landing.tools_heading}</h2>
      <p>{landing.tools_intro}</p>
      <ul class="tools">
        {#each landing.tools as tool, i (i)}
          <li>
            {#each tool.paths as path, p (path)}
              <a href="{base}{path}">{path}</a>{#if p < tool.paths.length - 1}{' · '}{/if}
            {/each}
            {' — '}{tool.text}
          </li>
        {/each}
      </ul>
      <p class="closing">{landing.closing}</p>
    </section>
  </article>
{:else}
  <p class="empty">Landing content unavailable.</p>
{/if}

<style>
  .hero {
    margin-bottom: 24px;
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 4px;
    margin: 0 0 8px;
  }
  .lede {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
    max-width: 560px;
    margin: 0;
  }
  .story {
    margin: 0 0 56px;
    padding: 24px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .chapter {
    margin: 0 0 36px;
  }
  .chapter h2 {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 14px;
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
    font-style: italic;
    color: rgba(255, 255, 255, 0.7);
  }
  .chapter a {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .chapter a:hover {
    border-bottom-color: #4ecdc4;
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
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
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
    border-left: 2px solid rgba(78, 205, 196, 0.3);
  }
  .closing {
    font-style: italic;
    color: rgba(255, 255, 255, 0.7);
  }
  .empty {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }
</style>
