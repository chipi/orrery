<script lang="ts">
  /**
   * Section hub — the big-box front door for a nav group (Explore, Catalog,
   * Learn). Renders the group heading + an intro paragraph over a
   * RouteCardGrid of the group's destinations. The nav links straight here
   * instead of opening a dropdown (2026-07 IA: dropdown → hub).
   */
  import { localHref } from '$lib/locale';
  import RouteCardGrid from '$lib/components/RouteCardGrid.svelte';

  interface HubCard {
    route: string;
    query?: string;
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
</script>

<article class="section-hub page-shell">
  <header class="hub-head">
    <h1 class="page-title">{heading}</h1>
    <p class="hub-intro page-lead">{intro}</p>
  </header>

  <RouteCardGrid {cards} hrefFor={(route) => localHref(route)} {gridTestId} {gridAudioStage} />
</article>

<style>
  .hub-head {
    padding-bottom: 12px;
  }
  /* a2-keep: TV / 10-foot layout (RFC-031 S6), not the page shell.
     TV / 10-foot landscape (RFC-031 S6): full-width grid so every box sits in
     one screen for D-pad navigation. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .section-hub {
      /* a2-keep: TV full-width grid */
      max-width: none;
      width: 100%;
      box-sizing: border-box;
      padding: 4vh var(--safe-area-inset-right, 48px) 4vh var(--safe-area-inset-left, 48px);
    }
  }
</style>
