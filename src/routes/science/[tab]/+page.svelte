<!--
  /science/[tab] — tab landing page.

  The right rail (in /science/+layout.svelte) lists every section in
  this tab and persists across the section reading view, so this page
  can focus on the editorial 101 lead-in. A "pick a section to begin"
  hint anchors the eye to the rail when there's no further content.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<svelte:head>
  <title>{tabLabel(data.tab)} · {m.science_page_title()}</title>
</svelte:head>

<nav class="crumb">
  <a href="{base}/science">{m.science_heading()}</a>
  <span class="sep">›</span>
  <span>{tabLabel(data.tab)}</span>
</nav>

<header class="tab-hero">
  <h1>{tabLabel(data.tab)}</h1>
</header>

{#if data.intro}
  <section class="tab-intro" aria-label="A focused 101 for this tab">
    <p class="badge">101 · zoom in</p>
    <p class="headline">{data.intro.headline}</p>
    {#each data.intro.paragraphs as para (para)}
      <p>{para}</p>
    {/each}
  </section>
{/if}

<p class="hint">→ Pick a section from the right rail to start reading.</p>

<style>
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
  .tab-hero {
    margin-bottom: 24px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: 4px;
    margin: 0;
  }
  .tab-intro {
    margin: 0 0 24px;
    padding: 18px 20px;
    background: rgba(78, 205, 196, 0.05);
    border-left: 3px solid rgba(78, 205, 196, 0.6);
    border-radius: 4px;
  }
  .tab-intro .badge {
    font-family: var(--font-display);
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #4ecdc4;
    margin: 0 0 10px;
  }
  .tab-intro .headline {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 14px;
  }
  .tab-intro p:not(.badge):not(.headline) {
    font-family: 'Crimson Pro', serif;
    font-size: 15px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 12px;
  }
  .tab-intro p:not(.badge):not(.headline):last-child {
    margin-bottom: 0;
  }
  .hint {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin: 8px 0 0;
  }
  @media (max-width: 768px) {
    .hint {
      display: none;
    }
  }
</style>
