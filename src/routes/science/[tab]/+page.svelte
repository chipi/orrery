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
