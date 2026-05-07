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

<div class="page">
  <nav class="crumb">
    <a href="{base}/science/">{m.science_heading()}</a>
    <span class="sep">›</span>
    <span>{tabLabel(data.tab)}</span>
  </nav>

  <h1>{tabLabel(data.tab)}</h1>

  {#if data.sections.length === 0}
    <p class="empty">{m.science_tab_empty()}</p>
  {:else}
    <ul class="section-list">
      {#each data.sections as section (section.id)}
        <li>
          <a class="section-row" href="{base}/science/{data.tab}/{section.id}/">
            <span class="section-name">{section.title}</span>
            <span class="section-intro">{section.intro_sentence}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px 48px;
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
    margin: 0 0 24px;
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
