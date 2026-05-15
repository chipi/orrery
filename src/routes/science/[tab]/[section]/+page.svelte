<!--
  /science/[tab]/[section] — full reading view of one section.

  Renders headline + intro + body + (optional) formula + (optional)
  diagram + see-in-app cross-links + learn-more tiered links. KaTeX
  is server-rendered at build (ADR-034); the formulaHtml prop is
  plain HTML, no client-side math library.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import ObservatoryShowcase from '$lib/components/ObservatoryShowcase.svelte';
  import { track } from '$lib/analytics';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  let section = $derived(data.section);

  // Umami custom event: which sections out of 85 earn the read.
  // Standard pageview already fires per URL; this carries structured
  // tab + section props that are easier to aggregate in the dashboard.
  onMount(() => {
    track('science-section-view', { tab: section.tab, section: section.id });
  });
  // The space-photography section embeds the ObservatoryShowcase strip
  // (one hero image per observatory in /fleet, deep-link into each
  // fleet panel). Other sections render the standard body only.
  let showObservatoryShowcase = $derived(
    section.tab === 'observation' && section.id === 'space-photography',
  );

  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<svelte:head>
  <title>{section.title} · {m.science_page_title()}</title>
  <meta name="description" content={section.intro_sentence} />
</svelte:head>

<article class="reading">
  <nav class="crumb">
    <a href="{base}/science">{m.science_heading()}</a>
    <span class="sep">›</span>
    <a href="{base}/science/{section.tab}">{tabLabel(section.tab)}</a>
    <span class="sep">›</span>
    <span>{section.title}</span>
  </nav>

  <header>
    <h1>{section.title}</h1>
    <p class="lede">{section.intro_sentence}</p>
  </header>

  {#if section.diagram}
    <figure class="hero-diagram">
      <img src="{base}/diagrams/science/{section.diagram}" alt={section.diagram_caption ?? ''} />
      {#if section.diagram_caption}
        <figcaption>{section.diagram_caption}</figcaption>
      {/if}
    </figure>
  {/if}

  {#if section.narrative_101 && section.narrative_101.length > 0}
    <section class="narrative-101" aria-label="A focused 101">
      <p class="badge">101 · zoom in</p>
      {#each section.narrative_101 as para (para)}
        <p>{para}</p>
      {/each}
    </section>
  {/if}

  {#if data.formulaHtml}
    <figure class="formula">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX server-rendered HTML, ADR-034 -->
      {@html data.formulaHtml}
      {#if section.formula_caption}
        <figcaption>{section.formula_caption}</figcaption>
      {/if}
    </figure>
  {/if}

  <div class="body">
    {#each section.body_paragraphs as para (para)}
      <p>{para}</p>
    {/each}
  </div>

  {#if section.photo}
    <figure class="section-photo">
      <img src="{base}{section.photo.src}" alt={section.photo.alt_key ?? ''} loading="lazy" />
      <figcaption>{section.photo.credit}</figcaption>
    </figure>
  {/if}

  {#if showObservatoryShowcase}
    <ObservatoryShowcase />
  {/if}

  {#if section.see_in_app && section.see_in_app.length > 0}
    <section class="see-in-app">
      <h2>{m.science_see_in_app()}</h2>
      <ul>
        {#each section.see_in_app as link (link.route + link.context_key)}
          <li>
            <a href="{base}{link.route}">{link.route}</a>
            <span class="ctx">{link.context_key}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if section.links.length > 0}
    <section class="learn-more">
      <h2>{m.science_learn_more()}</h2>
      <ul>
        {#each section.links as link (link.u)}
          <li>
            <span class="tier tier-{link.t}">{link.t}</span>
            <a href={link.u} target="_blank" rel="noopener noreferrer external">{link.l}</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  .reading {
    max-width: 720px;
  }
  .crumb {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 12px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .crumb a:hover {
    color: #4ecdc4;
  }
  .sep {
    margin: 0 8px;
    opacity: 0.6;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: 4px;
    margin: 0 0 8px;
  }
  .lede {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 24px;
  }
  .hero-diagram {
    margin: 0 0 24px;
    padding: 24px 16px 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    text-align: center;
  }
  .hero-diagram img {
    max-width: 100%;
    height: auto;
    max-height: 320px;
    opacity: 0.95;
  }
  .section-photo {
    margin: 24px 0 32px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.25);
  }
  .section-photo img {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 540px;
    margin: 0 auto;
  }
  .section-photo figcaption {
    padding: 8px 12px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.2px;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.02);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .hero-diagram figcaption {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 12px;
  }
  .narrative-101 {
    margin: 24px 0;
    padding: 18px 20px;
    background: rgba(78, 205, 196, 0.05);
    border-left: 3px solid rgba(78, 205, 196, 0.6);
    border-radius: 4px;
  }
  .narrative-101 .badge {
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4ecdc4;
    margin: 0 0 10px;
  }
  .narrative-101 p:not(.badge) {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.88);
    margin: 0 0 12px;
  }
  .narrative-101 p:not(.badge):last-child {
    margin-bottom: 0;
  }
  .formula {
    margin: 24px 0;
    padding: 16px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.2);
    border-radius: 6px;
    text-align: center;
    overflow-x: auto;
  }
  .formula figcaption {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 8px;
  }
  .body {
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.85);
  }
  .body p {
    margin: 0 0 16px;
  }
  .see-in-app,
  .learn-more {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .see-in-app h2,
  .learn-more h2 {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 12px;
  }
  .see-in-app ul,
  .learn-more ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .see-in-app li,
  .learn-more li {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
  }
  .see-in-app a,
  .learn-more a {
    color: #4ecdc4;
    text-decoration: none;
  }
  .see-in-app a:hover,
  .learn-more a:hover {
    text-decoration: underline;
  }
  .ctx {
    color: rgba(255, 255, 255, 0.55);
    margin-left: 8px;
  }
  .tier {
    display: inline-block;
    width: 56px;
    padding: 2px 6px;
    margin-right: 8px;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.6);
  }
  .tier-intro {
    border-color: rgba(78, 205, 196, 0.5);
    color: #4ecdc4;
  }
  .tier-core {
    border-color: rgba(123, 156, 255, 0.5);
    color: #7b9cff;
  }
  .tier-deep {
    border-color: rgba(255, 200, 80, 0.5);
    color: #ffc850;
  }
</style>
