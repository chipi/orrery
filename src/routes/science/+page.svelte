<!--
  /science — encyclopedia tab index landing.

  Lists the six top-level tabs. Each tab links into /science/[tab]
  (its section list). PRD-008 § design hints calls for a left-rail
  tab list on desktop; for V1 this is a centred grid of tab cards.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { SCIENCE_TABS } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  // Map each tab id to its display label. Falls back to a humanised
  // form of the slug if the i18n key is missing (defensive).
  function tabLabel(tab: string): string {
    const key = `science_tab_${tab.replace(/-/g, '_')}` as keyof typeof m;
    const fn = m[key] as (() => string) | undefined;
    return typeof fn === 'function'
      ? fn()
      : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
</script>

<svelte:head>
  <title>{m.science_page_title()}</title>
  <meta name="description" content={m.science_meta_description()} />
</svelte:head>

<div class="page">
  <header class="hero">
    <h1>{m.science_heading()}</h1>
    <p class="lede">{m.science_intro()}</p>
  </header>

  <ul class="tab-grid">
    {#each SCIENCE_TABS as tab (tab)}
      <li>
        <a class="tab-card" href="{base}/science/{tab}">
          <span class="tab-name">{tabLabel(tab)}</span>
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .page {
    max-width: 960px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }
  .hero {
    margin-bottom: 32px;
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
  .tab-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }
  .tab-card {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    padding: 24px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    color: var(--color-text);
    text-decoration: none;
    text-align: center;
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
  .tab-name {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 3px;
  }
</style>
