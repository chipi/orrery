<!--
  "What you are looking at" on /explore (E9, UXD-027): one card per scale level, hung under the
  level picker's row; the picker chip names the level and the fold chip beside it opens the card
  (plan D15: one control, not a second header). What the level is (the home-grid text), the story the Science Lens used to carry, and up to five /science sections
  to read next (`SCALE_SHELLS[level].science`, titles from the science index). The TierContextCard
  pattern: open on a pointer device, folded on a touch one, the choice remembered. The Science Lens
  panel keeps its layer toggles; its story lives here.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { loadScienceTitles } from '$lib/explore/science-titles';
  import { SCALE_SHELLS } from '$lib/explore/scale-shells';
  import type { ShellId } from '$lib/explore/scale-shell-controller';
  import { pickScienceLinks, refsFromSlugs } from '$lib/science-links';
  import { localeFromPage, localHref } from '$lib/locale';
  import { levelCardBodyId } from '$lib/explore/level-card-state.svelte';
  import type { LevelCardState } from '$lib/explore/level-card-state.svelte';

  let {
    shell,
    card,
    align = 'right',
    panelCoverPx = 0,
    width = $bindable(0),
  }: {
    shell: ShellId;
    /** Open or folded; the fold chip is the navigator row's, beside the level picker (plan D15). */
    card: LevelCardState;
    /** The side the navigator row sits on: the card hangs under it. */
    align?: 'left' | 'right';
    /** Width a docked side panel covers at the right edge; the card sits left of it. */
    panelCoverPx?: number;
    /** The card's measured width, for the HUD row that must stop before it (0 while folded). */
    width?: number;
  } = $props();

  const s = $derived(SCALE_SHELLS[shell]);
  const links = $derived(pickScienceLinks(refsFromSlugs(s.science)));
  const locale = $derived(localeFromPage(page));

  // Section titles in the reader's language. The links are drawn once the index has answered (no
  // flash of English slugs); if it cannot be read at all they read as their slugs.
  let titles = $state(new Map<string, string>());
  let titlesLoaded = $state(false);
  $effect(() => {
    let live = true;
    titlesLoaded = false;
    void loadScienceTitles(locale).then((t) => {
      if (!live) return;
      titles = t;
      titlesLoaded = true;
    });
    return () => {
      live = false;
    };
  });
  const titleOf = (tab: string, section: string) =>
    titles.get(`${tab}/${section}`) ?? section.replace(/-/g, ' ');
</script>

<section
  id={levelCardBodyId}
  class="level-card"
  class:left={align === 'left'}
  bind:clientWidth={width}
  hidden={!card.expanded}
  style:right={align === 'right' ? `${panelCoverPx + 8}px` : undefined}
  aria-label={s.name()}
  data-testid="explore-level-card"
>
  <div class="body">
    <p class="lead" data-testid="explore-level-card-lead">{s.desc()}</p>
    <p class="story">{s.storyBody()}</p>
    {#if links.length && titlesLoaded}
      <ul class="links" data-testid="explore-level-card-links">
        {#each links as r (r.tab + '/' + r.section)}
          <li>
            <a href={localHref(`/science/${r.tab}/${r.section}`)}>{titleOf(r.tab, r.section)}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  /* Under the picker row (top 8 + its chip height + 6), at the right edge, left of a docked panel.
     Under the row's open ladder (z 46) and under the panels (z 30). */
  .level-card {
    position: absolute;
    top: 44px;
    z-index: 7;
    box-sizing: border-box;
    inline-size: 280px;
    max-inline-size: calc(100vw - 16px);
    /* Ends above the scale strip in the same column (46 px up, up to ~200 px tall); scrolls inside. */
    max-block-size: max(120px, calc(100% - 250px));
    overflow-y: auto;
    padding: 8px 12px;
    background: rgba(8, 10, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(6px);
  }
  /* Touch: the strip sits 112 px up in portrait and is ~110 px tall, so the card stops 300 px from
     the bottom (58 top + 232) and its links never run under the KM / AU / LY / PC readout (D16). */
  @media (hover: none), (pointer: coarse) {
    .level-card {
      top: 58px;
      max-block-size: max(120px, calc(100% - 300px));
    }
  }
  .lead {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
  }
  .story {
    margin: 8px 0 0;
    color: var(--color-text-label);
  }
  .links {
    margin: 10px 0 0;
    padding: 8px 0 0;
    list-style: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  /* A link is a 24 px target (44 px on touch): the small-control rule of AGENTS.md. */
  .links a {
    display: flex;
    align-items: center;
    min-block-size: 24px;
    padding: 3px 0;
    color: var(--color-state);
    text-decoration: none;
  }
  @media (pointer: coarse) {
    .links a {
      min-block-size: 44px;
    }
  }
  .links a:hover,
  .links a:focus-visible {
    text-decoration: underline;
  }
  .level-card[hidden] {
    display: none;
  }
  /* At the outer scales the navigator row is flush left, and the card hangs under it there, 8 px
     past the INDEX tab at the left edge (30 px wide with a mouse, 44 px on touch) so the tab stays
     reachable while the card is open. */
  .level-card.left {
    left: 38px;
  }
  @media (hover: none), (pointer: coarse) {
    .level-card.left {
      left: 52px;
    }
  }
</style>
