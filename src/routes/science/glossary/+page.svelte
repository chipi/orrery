<!--
  /science/glossary — the technical terms the site uses, each in one sentence, in the reader's
  language, with the /science page that explains it and the pages that use it most. Built
  from the glossary's `term` section by scripts/build-glossary.mjs; a term added there
  appears here. Each entry has an anchor (#gravity-assist) for deep links. A "see also" tab of
  /science (PRD-038), next to Reading List and Watch List.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { localHref } from '$lib/locale';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // A–Z bar: one link per index letter, to the first term filed under it.
  const letters = $derived.by(() => {
    const first = new Map<string, string>();
    for (const t of data.terms) if (!first.has(t.initial)) first.set(t.initial, t.id);
    return [...first];
  });
</script>

<svelte:head>
  <title>{m.glossary_page_title()} · Orrery</title>
  <meta name="description" content={m.glossary_meta_description()} />
</svelte:head>

<article class="glossary" data-route-ready="true">
  <header>
    <h1>{m.glossary_h1()}</h1>
    <p class="lede">{m.glossary_intro()}</p>
  </header>

  <nav class="az" aria-label={m.glossary_jump()}>
    <div class="az-scroll">
      {#each letters as [letter, id] (letter)}
        <a href="#{id}">{letter}</a>
      {/each}
    </div>
  </nav>

  <dl class="terms">
    {#each data.terms as t (t.id)}
      <div class="term" id={t.id}>
        <dt>{t.name}</dt>
        <dd>
          <p class="definition">{t.definition}</p>
          {#if t.readMore}
            <p class="more">
              <a href={localHref(t.readMore.href)}>{m.glossary_read_more()}: {t.readMore.title}</a>
            </p>
          {/if}
          {#if t.usedOn.length}
            <div class="used">
              <span class="k">{m.glossary_used_on()}</span>
              <!-- one item per page: each title is its own bidi run (Latin names in ar text) -->
              <ul>
                {#each t.usedOn as u (u.href)}
                  <li><a href={localHref(u.href)}>{u.title}</a></li>
                {/each}
              </ul>
            </div>
          {/if}
        </dd>
      </div>
    {/each}
  </dl>
</article>

<style>
  .glossary {
    max-width: 720px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    color: var(--color-text, #eef);
  }
  h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 56px;
    letter-spacing: 2px;
    margin: 0 0 8px;
    color: #ffc850;
  }
  .lede {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 20px;
    line-height: 1.5;
    margin: 0 0 16px;
    color: rgba(255, 255, 255, 0.78);
  }
  @media (max-width: 600px) {
    .glossary {
      padding: 20px 16px 60px;
    }
  }
  /* the /science layout scrolls in its own box below the site nav, so 0 is under the nav */
  .az {
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 20px -4px 0;
    padding: 8px 4px;
    background: var(--color-bg, #04040c);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .az-scroll {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    /* fade the trailing edge (the end in reading direction): more letters scroll into view */
    mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
  }
  :global([dir='rtl']) .az-scroll {
    mask-image: linear-gradient(to left, #000 calc(100% - 28px), transparent);
  }
  .az a {
    flex: none;
    min-width: 32px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 4px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 14px;
    text-decoration: none;
    color: #cfe3fb;
  }
  .az a:hover,
  .az a:focus-visible {
    border-color: #ffc850;
    color: #ffc850;
  }
  .terms {
    margin: 12px 0 0;
  }
  .term {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px 0 14px;
    /* clear the sticky A–Z bar */
    scroll-margin-top: 60px;
  }
  dt {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 24px;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  dd {
    margin: 0;
  }
  .definition {
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.86);
    margin: 0 0 8px;
  }
  .more,
  .used {
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.72);
    margin: 0 0 4px;
  }
  .used ul {
    display: inline;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .used li {
    display: inline;
    unicode-bidi: isolate;
  }
  .used li:not(:last-child)::after {
    content: ' · ';
    color: rgba(255, 255, 255, 0.4);
  }
  .k {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7fb0e0;
    margin-inline-end: 8px;
  }
  a {
    color: #cfe3fb;
  }
</style>
