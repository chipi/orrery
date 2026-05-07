<!--
  /science layout — shared two-column chrome.

  Left rail: sticky 220px column with the six encyclopedia tabs,
  vertically stacked, persistent across the landing, the tab pages,
  and every section page. Active tab gets a teal accent so the
  reader always knows where they are.

  Right column: route content (the editorial story on /science,
  the section list on /science/[tab], the reading view on
  /science/[tab]/[section]).

  KaTeX CSS is imported here once for the whole route tree (ADR-034).
-->
<script lang="ts">
  import 'katex/dist/katex.min.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { SCIENCE_TABS } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import type { Snippet } from 'svelte';

  type Props = { children: Snippet };
  let { children }: Props = $props();

  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const activeTab = $derived(
    (() => {
      const path = $page.url.pathname;
      const root = `${base}/science/`;
      if (!path.startsWith(root)) return null;
      const rest = path.slice(root.length).replace(/\/$/, '');
      const first = rest.split('/')[0];
      return SCIENCE_TABS.includes(first as (typeof SCIENCE_TABS)[number]) ? first : null;
    })(),
  );
</script>

<div class="science-root">
  <div class="page">
    <div class="layout">
      <aside class="rail" aria-label="Encyclopedia tabs">
        <h2 class="rail-heading">Reference</h2>
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
        <a class="rail-home" href="{base}/science">← Space 101</a>
      </aside>

      <div class="content">
        {@render children?.()}
      </div>
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
    max-width: 1080px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }
  .layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 40px;
    align-items: start;
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
  .tab-list {
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tab-card {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 12px 14px;
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
  .tab-card:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.08);
    outline: none;
  }
  .tab-card.active {
    border-color: rgba(78, 205, 196, 0.6);
    background: rgba(78, 205, 196, 0.12);
  }
  .tab-card.active .tab-name {
    color: #4ecdc4;
  }
  .tab-name {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 2px;
  }
  .rail-home {
    display: inline-block;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    padding: 4px 0;
  }
  .rail-home:hover {
    color: #4ecdc4;
  }
  .content {
    min-width: 0;
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
    .rail-home {
      display: none;
    }
  }
</style>
