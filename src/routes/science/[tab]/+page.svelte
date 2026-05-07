<!--
  /science/[tab] — section list within a tab.

  Acts as a navigable menu of sections; the reading experience lives at
  /science/[tab]/[section]. PRD-008 § design hints: this is the
  "tab page" referenced by the desktop left-rail mockup. Mobile shows
  it as the index for a tab.
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

<header class="tab-hero">
  <p class="eyebrow">{m.science_heading()}</p>
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

<h2 class="list-heading">Sections</h2>
{#if data.sections.length === 0}
  <p class="empty">{m.science_tab_empty()}</p>
{:else}
  <ul class="section-list">
    {#each data.sections as section (section.id)}
      <li>
        <a class="section-row" href="{base}/science/{data.tab}/{section.id}">
          <span class="section-name">{section.title}</span>
          <span class="section-intro">{section.intro_sentence}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .tab-hero {
    margin-bottom: 24px;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin: 0 0 6px;
    text-transform: uppercase;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: 4px;
    margin: 0;
  }
  .tab-intro {
    margin: 0 0 32px;
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
  .list-heading {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .empty {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 24px;
  }
  .section-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-row {
    display: block;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: var(--color-text);
    text-decoration: none;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .section-row:hover,
  .section-row:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.06);
    outline: none;
  }
  .section-name {
    display: block;
    font-family: var(--font-display);
    font-size: 16px;
    letter-spacing: 2px;
  }
  .section-intro {
    display: block;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.65);
    margin-top: 4px;
  }
</style>
