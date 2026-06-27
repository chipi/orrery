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
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { SCIENCE_TABS } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import ScienceSearch from '$lib/components/ScienceSearch.svelte';
  import type { Snippet } from 'svelte';
  import type { LayoutData } from './$types';

  type Props = { children: Snippet; data: LayoutData };
  let { children, data }: Props = $props();

  let searchEl = $state<ScienceSearch | undefined>(undefined);

  // ─── Mobile Cmd-K bridge (issue #137) ───────────────────────────
  // Nav.svelte's hamburger drawer dispatches `orrery-cmd-k-open` when
  // the mobile user taps its Search row. We listen here because this
  // layout owns the dialog mount (`searchEl`). On desktop the Search
  // button in the left rail still calls `searchEl?.open_()` directly;
  // both paths converge on the same dialog instance.
  function onCmdKOpen(): void {
    searchEl?.open_();
  }
  onMount(() => {
    document.addEventListener('orrery-cmd-k-open', onCmdKOpen);
  });
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('orrery-cmd-k-open', onCmdKOpen);
    }
  });

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

  // ─── Roving keyboard nav for the two rails ──────────────────────
  // Same focus-only model as the /missions + /fleet grids, adapted to
  // two linked vertical lists. ↑/↓ move within a rail (wrapping); → jumps
  // from the left tab rail into the right section subnav; ← jumps back.
  // Enter/Space activate the focused <a> natively — which navigates and
  // swaps the centre content (these rails have no detail panel; the
  // centre IS the detail). Nav order is read live from the DOM.
  function railLinks(side: 'left' | 'right'): HTMLAnchorElement[] {
    const sel = side === 'left' ? '.rail-left .tab-card' : '.rail-right .section-row';
    return Array.from(document.querySelectorAll<HTMLAnchorElement>(sel));
  }
  function moveWithin(links: HTMLAnchorElement[], current: EventTarget | null, dir: 1 | -1): void {
    const i = links.indexOf(current as HTMLAnchorElement);
    if (i === -1) return;
    const n = links.length;
    links[(i + dir + n) % n]?.focus();
  }
  /** Focus a rail's active item (or its first) when crossing into it. */
  function focusRail(side: 'left' | 'right'): boolean {
    const links = railLinks(side);
    if (links.length === 0) return false;
    (links.find((l) => l.classList.contains('active')) ?? links[0]).focus();
    return true;
  }
  function onTabKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveWithin(railLinks('left'), e.currentTarget, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveWithin(railLinks('left'), e.currentTarget, -1);
    } else if (e.key === 'ArrowRight') {
      // Jump into the section subnav, if this tab has one rendered.
      if (focusRail('right')) e.preventDefault();
    }
  }
  function onSectionKeydown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveWithin(railLinks('right'), e.currentTarget, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveWithin(railLinks('right'), e.currentTarget, -1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusRail('left');
    }
  }
</script>

<div class="science-root">
  <div class="page" class:has-right-rail={showRightRail}>
    <div class="layout">
      <aside class="rail rail-left" aria-label={m.science_tabs_aria()}>
        <button
          type="button"
          class="search-button"
          data-audio-stage="science-search-button"
          aria-label={m.science_search_kbd_aria()}
          onclick={() => searchEl?.open_()}
        >
          <span class="search-icon" aria-hidden="true">⌕</span>
          <span class="search-label">{m.science_rail_search()}</span>
          <kbd class="search-hint">⌘K</kbd>
        </button>
        <h2 class="rail-heading">{m.science_rail_sections()}</h2>
        <ul class="tab-list" data-audio-stage="science-tabs">
          {#each SCIENCE_TABS as tab (tab)}
            <li>
              <a
                class="tab-card"
                class:active={tab === activeTab}
                data-audio-stage="science-tab-{tab}"
                href="{base}/science/{tab}"
                aria-current={tab === activeTab ? 'page' : undefined}
                onkeydown={onTabKeydown}
                data-sveltekit-keepfocus
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
        <aside class="rail rail-right" aria-label={m.science_sections_tab_aria()}>
          <h2 class="rail-heading">{tabLabel(activeTab)}</h2>
          <ul class="section-list">
            {#each tabSections as section (section.id)}
              <li>
                <a
                  class="section-row"
                  class:active={section.id === activeSection}
                  data-audio-stage="science-section-{section.id}"
                  href="{base}/science/{activeTab}/{section.id}"
                  aria-current={section.id === activeSection ? 'page' : undefined}
                  onkeydown={onSectionKeydown}
                  data-sveltekit-keepfocus
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
  <ScienceSearch bind:this={searchEl} />
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
    /* Was 1200 px — capped /science at a relatively narrow desktop
     * width; on viewports >1200 px the layout sat centered with
     * empty margin and the right rail couldn't grow to use that
     * space. 1440 px gives wider screens more breathing room without
     * stretching prose past the ~80 ch readability bound (the
     * article column is still constrained by its grid track + the
     * inline content's natural max-width). Issue #226.
     */
    max-width: 1440px;
    margin: 0 auto;
    padding: 32px 16px 48px;
  }
  /* #342 Phase 30 — /science is authored mobile-first: defaults below
     hold for the smallest viewport, then each @min-width block layers
     desktop enhancements on top. Reading order tracks viewport order
     (smallest → largest) so the cascade is easy to follow. The four
     ranges are: base ≤ 640, ≥ 641 (compact tablet), ≥ 769 (desktop
     grid), ≥ 1025 (right-rail expansion). */
  .layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  .rail {
    position: static;
  }
  .rail-left {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .rail-heading {
    /* Mobile: hidden — desktop affordance, vertical noise on phones.
       Re-shown at @min-width: 769. */
    display: none;
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .search-button {
    /* Mobile: 44×44 icon-only chip (Phase 24). Square tap target, no
       label, slots into the rail-left flex row alongside the tab
       chips. Phase 30 base — expanded to full-width labelled button
       at @min-width: 769. */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    margin: 0 6px 0 0;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.75);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 1px;
    cursor: pointer;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .search-button:hover,
  .search-button:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.08);
    color: #fff;
    outline: none;
  }
  .search-icon {
    /* Mobile: 22 px icon-only. Scaled back to 14 px on desktop where
       the search-label resurfaces alongside it. */
    font-size: 22px;
    line-height: 1;
    margin: 0;
  }
  .search-label {
    /* Mobile-hidden, desktop-restored at @min-width: 769. */
    display: none;
    flex: 1;
    text-align: left;
  }
  .search-hint {
    /* Mobile-hidden, desktop-restored at @min-width: 769. The
       keyboard-shortcut chip has no meaning on a phone. */
    display: none;
    font-size: 9px;
    padding: 1px 4px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Space Mono', monospace;
  }
  .tab-list {
    /* Mobile: wrapped chip strip, sits in the rail-left flex row.
       Switches to a vertical stack at @min-width: 769. */
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1 1 auto;
    width: auto;
  }
  .section-list {
    /* Mobile: compact 2-col grid for the right-rail section list (so
       the article still gets > 50 % of viewport height). Switches to
       a vertical stack at @min-width: 769. */
    list-style: none;
    margin: 0 0 16px;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }
  .tab-card,
  .section-row {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    /* Mobile: 44 px floor per ADR-018. Desktop relaxes to 40 px. */
    min-height: 44px;
    padding: 6px 12px;
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
    /* Mobile: 11 px / 1.5 px chip font. Desktop bumps to 13/2. */
    font-size: 11px;
    letter-spacing: 1.5px;
    /* Phase 37 (#342) — long-locale guard. DE "Missionsphasen" + JA
       "ライフサポート" sit comfortably in the 200 px desktop rail but
       can blow past chip width on the wrapped mobile strip. Truncate
       cleanly rather than wrap-cascade onto a second row. */
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .section-name {
    font-family: 'Crimson Pro', serif;
    /* Mobile: 12 px / 1.2. Desktop bumps to 14/1.3. */
    font-size: 12px;
    line-height: 1.2;
    /* Phase 37 (#342) — section names are author-written so most are
       short, but a few (Tsiolkovsky-equation-1903) push 30+ chars.
       Allow up to 2 lines then ellipsis so the right-rail card height
       stays predictable. */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .content {
    min-width: 0;
  }

  /* ─── ≥ 641 px — compact tablet ───────────────────────────────────
     Relax the section-list out of the 2-col phone grid into an auto-
     fit grid; loosen section-row padding + bump section-name back
     to 14/1.3. Tab strip + search chip stay in mobile mode. */
  @media (min-width: 641px) {
    .has-right-rail .section-list {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 8px;
    }
    .section-row {
      min-height: 40px;
      padding: 10px 12px;
    }
    .section-name {
      font-size: 14px;
      line-height: 1.3;
    }
  }

  /* ─── ≥ 769 px — desktop grid + sticky rail + full search button ──
     Switch from flex-column to a 2-col grid (rail | content). The
     right-rail variant (`.has-right-rail`) still collapses its third
     column at this width — it only expands at @min-width: 1025.
     Reset the rail-left flex row + tab chips to vertical stacks;
     resurface the rail heading + search label/hint. */
  @media (min-width: 769px) {
    .layout {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 32px;
      align-items: start;
    }
    .has-right-rail .rail-right {
      grid-column: 1 / -1;
      position: static;
    }
    .rail {
      position: sticky;
      top: 16px;
      align-self: start;
    }
    .rail-left {
      display: block;
    }
    .rail-heading {
      display: block;
    }
    .tab-list,
    .section-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0 0 16px;
      width: auto;
      flex: initial;
    }
    .tab-card,
    .section-row {
      flex: initial;
      min-height: 40px;
      padding: 10px 12px;
    }
    .tab-name {
      font-size: 13px;
      letter-spacing: 2px;
    }
    .search-button {
      width: 100%;
      height: auto;
      min-width: 0;
      min-height: 0;
      padding: 8px 10px;
      justify-content: flex-start;
      margin: 0 0 14px;
    }
    .search-label,
    .search-hint {
      display: revert;
    }
    .search-icon {
      font-size: 14px;
    }
  }

  /* ─── ≥ 1025 px — right rail expands to its own column ────────────
     `.has-right-rail` pages get the full 3-col layout with the right
     rail sticky-positioned and section-list back to a vertical stack
     (auto-fit grid only made sense when the rail was inline on
     tablet-sized viewports). Issue #226 motivated the 220–320 px
     range so the rail can claim some of the extra space we freed
     by raising .page max-width to 1440. */
  @media (min-width: 1025px) {
    .has-right-rail .layout {
      grid-template-columns: 200px 1fr minmax(220px, 320px);
    }
    .has-right-rail .rail-right {
      grid-column: auto;
      position: sticky;
    }
    .has-right-rail .section-list {
      display: flex;
      flex-direction: column;
      grid-template-columns: none;
      gap: 6px;
    }
  }
</style>
