<script lang="ts">
  /**
   * Section hub — the big-box front door for a nav group (Explore, Catalog,
   * Learn). Renders the group heading + an intro paragraph over a
   * RouteCardGrid of the group's destinations. The nav links straight here
   * instead of opening a dropdown (2026-07 IA: dropdown → hub).
   */
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { DEFAULT_LOCALE, localeFromPage } from '$lib/locale';
  import RouteCardGrid from '$lib/components/RouteCardGrid.svelte';

  interface HubCard {
    route: string;
    name: string;
    title: string;
    desc: string;
  }

  let {
    heading,
    intro,
    cards,
    gridTestId,
    gridAudioStage,
  }: {
    heading: string;
    intro: string;
    cards: HubCard[];
    gridTestId: string;
    gridAudioStage: string;
  } = $props();

  const activeLocale = $derived(localeFromPage($page));

  function withLang(path: string): string {
    return activeLocale === DEFAULT_LOCALE
      ? path
      : `${path}?lang=${encodeURIComponent(activeLocale)}`;
  }
</script>

<article class="section-hub">
  <header class="hub-head">
    <h1>{heading}</h1>
    <p class="hub-intro">{intro}</p>
  </header>

  <RouteCardGrid
    {cards}
    hrefFor={(route) => withLang(`${base}${route}`)}
    {gridTestId}
    {gridAudioStage}
  />
</article>

<style>
  .section-hub {
    margin: 0 auto;
    padding: 16px 16px 32px;
    color: var(--color-text);
  }
  .hub-head {
    padding: 8px 0 24px;
    max-width: 60ch;
  }
  .hub-head h1 {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 4px;
    margin: 0 0 12px;
    color: var(--color-text);
  }
  .hub-intro {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.82);
    margin: 0;
  }

  @media (min-width: 768px) {
    .section-hub {
      padding: 24px 24px 48px;
      max-width: 720px;
    }
    .hub-head h1 {
      font-size: 44px;
      letter-spacing: 5px;
    }
    .hub-intro {
      font-size: 18px;
    }
  }
  @media (min-width: 1024px) {
    .section-hub {
      max-width: 880px;
    }
  }
  /* TV / 10-foot landscape (RFC-031 S6): full-width grid so every box sits in
     one screen for D-pad navigation. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .section-hub {
      max-width: none;
      width: 100%;
      box-sizing: border-box;
      padding: 4vh var(--safe-area-inset-right, 48px) 4vh var(--safe-area-inset-left, 48px);
    }
  }
</style>
