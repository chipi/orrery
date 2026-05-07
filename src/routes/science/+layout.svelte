<!--
  /science layout — three-column chrome.

  Left rail: sticky 200px column with the six encyclopedia tabs,
  vertically stacked, persistent across the landing, the tab pages,
  and every section page. Active tab gets a teal accent.

  Centre: route content (the editorial story on /science, the 101
  on /science/[tab], the reading view on /science/[tab]/[section]).

  Right rail: when on a tab or section page, lists every section in
  the active tab so the reader can jump between them without leaving
  the article. Active section gets a teal accent. Falls away on the
  /science landing where there's no active tab.

  Mobile (<768px): collapses to single column; both rails fold above
  the content as wrapping grids.

  KaTeX CSS is imported here once for the whole route tree (ADR-034).
-->
<script lang="ts">
  import 'katex/dist/katex.min.css';
  import { base } from '$app/paths';
  import { SCIENCE_TABS } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  type Props = { children: Snippet; data: LayoutData };
  let { children, data }: Props = $props();

  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Active state + section list come from /science/+layout.ts which
  // inspects the URL and loads the right tab's sections (null on landing).
  const activeTab = $derived(data.railTab);
  const activeSection = $derived(data.railSection);
  const tabSections = $derived(data.railSections);
  const showRightRail = $derived(
    activeTab !== null && tabSections !== null && tabSections.length > 0,
  );
</script>

<div class="science-root">
  <div class="page" class:has-right-rail={showRightRail}>
    <div class="layout">
      <aside class="rail rail-left" aria-label="Encyclopedia tabs">
        <h2 class="rail-heading">Sections</h2>
        <ul class="tab-list">
          {#each SCIENCE_TABS as tab (tab)}
            <li>
              <a
                class="tab-card"
                class:active={tab === activeTab}
                href="{base}/science/{tab}"
                aria-current={tab === activeTab ? 'page' : undefined}
              >
                <span class="tab-name">{tabLabel(tab)}</span>
              </a>
            </li>
          {/each}
        </ul>
      </aside>

      <div class="content">
        {@render children?.()}
      </div>

      {#if showRightRail && tabSections && activeTab}
        <aside class="rail rail-right" aria-label="Sections in this tab">
          <h2 class="rail-heading">{tabLabel(activeTab)}</h2>
          <ul class="section-list">
            {#each tabSections as section (section.id)}
              <li>
                <a
                  class="section-row"
                  class:active={section.id === activeSection}
                  href="{base}/science/{activeTab}/{section.id}"
                  aria-current={section.id === activeSection ? 'page' : undefined}
                >
                  <span class="section-name">{section.title}</span>
                </a>
              </li>
            {/each}
          </ul>
        </aside>
      {/if}
    </div>
  </div>
</div>

<style>
  .science-root {
    position: absolute;
    inset: var(--nav-height) 0 0 0;
    overflow-y: auto;
    background: var(--color-bg);
    color: var(--color-text);
    -webkit-overflow-scrolling: touch;
  }
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }
  .layout {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 32px;
    align-items: start;
  }
  .has-right-rail .layout {
    grid-template-columns: 200px 1fr 220px;
  }
  .rail {
    position: sticky;
    top: 16px;
    align-self: start;
  }
  .rail-heading {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tab-list,
  .section-list {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tab-card,
  .section-row {
    display: flex;
    align-items: center;
    min-height: 40px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: var(--color-text);
    text-decoration: none;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .tab-card:hover,
  .tab-card:focus-visible,
  .section-row:hover,
  .section-row:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.08);
    outline: none;
  }
  .tab-card.active,
  .section-row.active {
    border-color: rgba(78, 205, 196, 0.6);
    background: rgba(78, 205, 196, 0.12);
  }
  .tab-card.active .tab-name,
  .section-row.active .section-name {
    color: #4ecdc4;
  }
  .tab-name {
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 2px;
  }
  .section-name {
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    line-height: 1.3;
  }
  .content {
    min-width: 0;
  }
  @media (max-width: 1024px) {
    .has-right-rail .layout {
      grid-template-columns: 200px 1fr;
    }
    .has-right-rail .rail-right {
      grid-column: 1 / -1;
      position: static;
    }
    .has-right-rail .section-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
  }
  @media (max-width: 768px) {
    .layout {
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .rail {
      position: static;
    }
    .tab-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
    }
  }
</style>
