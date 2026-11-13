<!--
  "What you are looking at" on /explore (E9, UXD-027): one card per scale level, hung under the
  level picker's row. Header (the level's glyph and name, a fold button), then what the level is
  (the home-grid text), the story the Science Lens used to carry, and up to five /science sections
  to read next (`SCALE_SHELLS[level].science`, titles from the science index). The TierContextCard
  pattern: open on a pointer device, folded on a touch one, the choice remembered. The Science Lens
  panel keeps its layer toggles; its story lives here.
-->
<script lang="ts">
  import { page } from '$app/state';
  import * as m from '$lib/paraglide/messages';
  import { loadScienceTitles } from '$lib/explore/science-titles';
  import { SCALE_SHELLS } from '$lib/explore/scale-shells';
  import type { ShellId } from '$lib/explore/scale-shell-controller';
  import { pickScienceLinks, refsFromSlugs } from '$lib/science-links';
  import { localeFromPage, localHref } from '$lib/locale';
  import ScaleGlyphIcon from './ScaleGlyphIcon.svelte';

  let {
    shell,
    panelCoverPx = 0,
  }: {
    shell: ShellId;
    /** Width a docked side panel covers at the right edge; the card sits left of it. */
    panelCoverPx?: number;
  } = $props();

  const STORE_KEY = 'orrery.explore.levelCardExpanded';
  function initialExpanded(): boolean {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch {
      /* storage blocked: fall through to the default */
    }
    // Folded where the HUD has no room for it: a touch screen, or a small window with a mouse.
    const tight =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.(
        '(hover: none), (pointer: coarse), (max-width: 899px), (max-height: 559px)',
      ).matches;
    return !tight;
  }
  let expanded = $state(initialExpanded());
  function toggle() {
    expanded = !expanded;
    try {
      localStorage.setItem(STORE_KEY, expanded ? '1' : '0');
    } catch {
      /* storage blocked: the choice lives for this view only */
    }
  }

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

  const uid = $props.id();
</script>

<section
  class="level-card"
  class:collapsed={!expanded}
  style:right={`${panelCoverPx + 8}px`}
  aria-label={s.name()}
  data-testid="explore-level-card"
>
  <div class="head">
    <ScaleGlyphIcon glyph={s.glyph} size={24} />
    <span class="name" data-testid="explore-level-card-name">{s.name()}</span>
    <button
      type="button"
      class="toggle"
      aria-expanded={expanded}
      aria-controls="{uid}-body"
      aria-label={expanded
        ? m.explore_level_card_collapse_aria()
        : m.explore_level_card_expand_aria()}
      data-testid="explore-level-card-toggle"
      data-a4-keep="disclosure fold (aria-expanded), not a chip: the orbit ruler header's pattern"
      onclick={toggle}
    >
      <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    </button>
  </div>
  <div id="{uid}-body" class="body" hidden={!expanded}>
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
  @media (hover: none), (pointer: coarse) {
    .level-card {
      top: 58px;
    }
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .name {
    flex: 1;
    min-inline-size: 0;
    font-size: 13px;
    letter-spacing: 0.5px;
    color: #fff;
  }
  .toggle {
    flex: none;
    min-inline-size: 44px;
    min-block-size: 44px;
    margin: -10px -12px -10px 0;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .toggle:hover,
  .toggle:focus-visible {
    color: #889fe7;
    background: rgba(136, 159, 231, 0.1);
  }
  .toggle:focus-visible {
    outline: 2px solid #889fe7;
    outline-offset: -2px;
  }
  .lead {
    margin: 8px 0 0;
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
  /* Folded, the card is only its header: as wide as that, so it clears the chip rows beside it. */
  .level-card.collapsed {
    inline-size: max-content;
    padding-block: 8px;
  }
  /* A small window with a mouse is crowded at the top (chip rows, INDEX tab): folded, the card is
     the glyph and the fold button; the picker chip above it already names the level. */
  @media (hover: hover) and (pointer: fine) and ((max-width: 899px) or (max-height: 559px)) {
    .level-card.collapsed .name {
      display: none;
    }
  }
</style>
