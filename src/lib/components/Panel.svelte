<script lang="ts">
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from '$lib/reduced-motion';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { page } from '$app/state';
  import { cardChain, goBackCard, isCardUrl } from '$lib/card-chain.svelte';
  import { audio } from '$lib/audio-state.svelte';
  import Chip from './Chip.svelte';

  type Props = {
    open: boolean;
    onClose: () => void;
    title?: string;
    /**
     * Whether to move focus into the panel when it opens (and restore it
     * on close). Default true — the modal-ish dialog pattern. Pass false
     * for non-modal side panels driven by an adjacent keyboard-navigable
     * list (e.g. /iss module list, /explore iconic-mission legend) so the
     * caller keeps focus on the triggering row and can continue arrowing
     * the list after opening. Otherwise the panel steals focus on open
     * and list arrow-nav only works from the *second* click onward.
     */
    grabFocus?: boolean;
    /**
     * Override the default z-index (30). Used by panels that need to
     * stack underneath the primary detail panel — /earth's RegimePanel
     * sits at 28 so when a resident click opens the satellite panel
     * (z 30), the satellite panel paints on top of the regime panel
     * (#354 — user direction "new panels open under geo panel, z order
     * has to be swapped").
     */
    zIndex?: number;
    /**
     * Mobile (touch-portrait) sheet height. Default 'full' — the standard
     * full-height bottom sheet that hides the scene behind it. Pass 'partial'
     * for a shorter bottom sheet that leaves the scene visible above it — used
     * by the /explore deep-sky immersion, where the full-frame photo *is* the
     * content and must stay visible above the info card.
     */
    mobileSheet?: 'full' | 'partial';
    /**
     * The entity's Share action (opens its collectible card). Passed by the
     * panels that carry a card; the bar shows the chip only when it is set.
     */
    onShare?: () => void;
    children?: Snippet;
  };
  let {
    open,
    onClose,
    title,
    grabFocus = true,
    zIndex = 30,
    mobileSheet = 'full',
    onShare,
    children,
  }: Props = $props();

  let panelEl: HTMLElement | undefined = $state();

  // The compact Curator Tour bar docks over the panel's top 64px; reserve that
  // space only while the bar is on screen (AudioOverlay's own condition), not always.
  const tourDocked = $derived(audio.open && audio.compact && !!audio.currentEpisode);

  // Back affordance (#29): only when we arrived here by following an in-card
  // link (chain non-empty) AND this view is itself a ?id= detail card.
  let canGoBack = $derived(cardChain.stack.length > 0 && isCardUrl(page.url));

  $effect(() => {
    if (!open) return;

    // Escape-to-close is always wired, independent of focus management.
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);

    // Focus management (dialog pattern) — opt-out via grabFocus={false}.
    let previousActiveElement: HTMLElement | null = null;
    if (grabFocus) {
      // Capture whatever was focused before the panel opened so we can
      // restore it on close, then move focus to the panel container
      // (tabindex=-1) so keyboard users land inside the panel.
      previousActiveElement = (
        typeof document !== 'undefined' ? document.activeElement : null
      ) as HTMLElement | null;
      queueMicrotask(() => panelEl?.focus({ preventScroll: true }));
    }

    return () => {
      window.removeEventListener('keydown', handler);
      // Restore focus to whatever was active before the panel opened
      // (typically the canvas or the planet that triggered the open).
      // preventScroll: `.focus()` otherwise scrolls the element into view — in
      // iOS WKWebView that happens even for already-visible elements, so closing
      // a panel slid the whole app down by ~the safe-area/scroll delta.
      previousActiveElement?.focus?.({ preventScroll: true });
      previousActiveElement = null;
    };
  });

  let barEl: HTMLElement | undefined = $state();
  let contentEl: HTMLElement | undefined = $state();

  // The name joins the bar once the hero (else the first block) has scrolled out of view.
  let nameShown = $state(false);
  let nameRaf = 0;

  function updateName() {
    nameRaf = 0;
    if (!contentEl) return;
    // The hero, else the identity block: Message, Museum and Observatory wrap their whole body
    // in one div whose bottom never scrolls past the top, so the first child is not enough.
    const anchor =
      contentEl.querySelector('.panel-hero') ??
      contentEl.querySelector('.head, .phase-head, h1, h2, h3') ??
      contentEl.firstElementChild;
    nameShown = anchor
      ? anchor.getBoundingClientRect().bottom <= contentEl.getBoundingClientRect().top
      : false;
  }

  function onContentScroll() {
    if (!nameRaf) nameRaf = requestAnimationFrame(updateName);
  }

  $effect(() => {
    // New open or new entity: decide again from where the list sits.
    void open;
    void title;
    nameShown = false;
    if (contentEl) requestAnimationFrame(updateName);
  });

  let touchStartY = $state(0);
  let touchDeltaY = $state(0);
  // Swipe-down closes from the bar, or from the content only while it sits at the top:
  // a finger pulling a scrolled list back up must not close the panel.
  let swipeAllowed = false;

  function onTouchStart(e: TouchEvent) {
    const target = e.target as Node;
    swipeAllowed =
      !!barEl?.contains(target) || (!!contentEl?.contains(target) && contentEl.scrollTop === 0);
    touchStartY = e.touches[0].clientY;
    touchDeltaY = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!swipeAllowed) return;
    const delta = e.touches[0].clientY - touchStartY;
    touchDeltaY = Math.max(0, delta);
  }

  function onTouchEnd() {
    if (swipeAllowed && touchDeltaY > 80) onClose();
    touchDeltaY = 0;
    swipeAllowed = false;
  }
</script>

{#if open}
  <!-- Tap-outside scrim (mobile bottom-sheet only). Fixes the "can't close"
       trap: the sheet had no backdrop, so tapping the visible scene did
       nothing and the × could be occluded by higher-z HUD chrome. The scrim
       dismisses on tap; the z-bump below also lifts the sheet (and its ×)
       above the route HUD on phones. --panel-z carries the caller's zIndex so
       relative panel ordering (Regime 28 < detail 30 < PhasePanel 40) is kept
       while all sit above the HUD on mobile. -->
  <button
    type="button"
    class="panel-backdrop"
    onclick={onClose}
    aria-label={m.panel_close()}
    tabindex="-1"
    style:--panel-z={zIndex}
  ></button>
  <aside
    class="panel"
    class:partial-sheet={mobileSheet === 'partial'}
    class:tour-docked={tourDocked}
    bind:this={panelEl}
    tabindex="-1"
    aria-label={title ?? m.panel_default_label()}
    style:transform={touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : ''}
    style:--panel-z={zIndex}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    in:fly={{ y: 14, x: 14, duration: prefersReducedMotion() ? 0 : 220 }}
    out:fly={{ y: 14, x: 14, duration: prefersReducedMotion() ? 0 : 160 }}
  >
    <!-- Empty dock zone (PRD-016 §S8 follow-up). The compact Curator
         Tour overlay anchors at top: var(--nav-height), right: 0 with
         the same panel width — this reserved space lets it sit visibly
         atop the panel instead of being covered by it. Other top-
         docked affordances (HUD chips, breadcrumb, etc.) can land here
         in future without re-plumbing every consumer panel. -->
    <div class="panel-dock" aria-hidden="true"></div>
    <!-- The panel's header bar (UXD-018). A flex row above the scroll container, so the
         close never overlaps scrolling text: back and close live on Panel itself, so every
         consumer gets the same controls without re-implementing them. Share shows when the
         host passes onShare (the entity has a collectible card). -->
    <div class="panel-bar" bind:this={barEl}>
      {#if canGoBack}
        <Chip
          kind="action"
          class="panel-back"
          onclick={goBackCard}
          aria-label={m.panel_back()}
          data-audio-stage="panel-back">←</Chip
        >
      {/if}
      <span class="panel-bar-name" class:shown={nameShown} aria-hidden="true">{title ?? ''}</span>
      {#if onShare}
        <Chip kind="action" onclick={onShare} aria-haspopup="dialog" data-testid="open-card-btn"
          >{m.panel_share()}</Chip
        >
      {/if}
      <Chip
        kind="action"
        class="panel-close"
        onclick={onClose}
        aria-label={m.panel_close()}
        data-audio-stage="panel-close">×</Chip
      >
    </div>
    <div class="content" bind:this={contentEl} onscroll={onContentScroll}>
      {@render children?.()}
    </div>
  </aside>
{/if}

<style>
  .panel {
    position: fixed;
    background: var(--color-panel-bg);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    z-index: var(--panel-z, 30);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    --panel-dock-h: 0px;
  }
  .panel.tour-docked {
    --panel-dock-h: 64px;
  }

  /* Right side drawer — pointer/desktop AND touch-landscape. A wide landscape
     viewport is drawer-friendly (keeps the scene visible beside the panel);
     landscape's short height makes a full-bleed sheet far worse. */
  :global(html[data-form='desktop']) .panel,
  :global(html[data-touch][data-orientation='landscape']) .panel {
    top: var(--nav-height);
    right: 0;
    bottom: 0;
    width: var(--panel-width);
    border-left: 1px solid var(--color-border);
  }

  /* Touch-portrait: full-height bottom sheet anchored below the nav — fills the
     screen so the scene doesn’t bleed through above the panel. (Touch-landscape
     uses the side drawer above; the tour-space dock is zeroed here too.) */
  :global(html[data-touch][data-orientation='portrait']) .panel {
    top: var(--nav-height);
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid var(--color-border);
    z-index: calc(var(--panel-z, 30) + 50);
  }

  /* Partial sheet — a shorter bottom sheet that leaves the scene visible above
     it (deep-sky immersion). Overrides the full-height rule above. */
  :global(html[data-touch][data-orientation='portrait']) .panel.partial-sheet {
    top: auto;
    max-height: 62vh;
    border-radius: 18px 18px 0 0;
    border-top: 1px solid var(--color-border);
  }

  /* Tap-outside scrim — mobile bottom-sheet only (desktop is a non-modal
     right drawer, left unscrimmed so the scene stays interactive). */
  .panel-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    margin: 0;
    padding: 0;
    border: none;
    background: rgba(2, 2, 8, 0.5);
    cursor: pointer;
    animation: panel-scrim-in 0.18s ease;
  }
  @keyframes panel-scrim-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  :global(html[data-touch][data-orientation='portrait']) .panel-backdrop {
    display: block;
    z-index: calc(var(--panel-z, 30) + 49);
  }

  .panel:focus {
    outline: none;
  }

  /* Empty top dock zone — same height as the compact tour bar so it
     visually slots in cleanly when the Curator Tour is in compact
     mode. Border-bottom is intentionally absent so panel content
     reads as continuous below it. */
  .panel-dock {
    height: var(--panel-dock-h);
    flex-shrink: 0;
  }
  :global(html[data-touch][data-orientation='portrait']) .panel-dock {
    height: 0;
  }

  /* Header bar: back, name, Share, close. A flex row between the dock and the scroll
     container, so nothing scrolls under it. The chips are 30 px on a fine pointer (bar
     38 px) and 44 px on touch (the chip is the bar). */
  .panel-bar {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 14px;
    background: var(--color-panel-bg);
    /* Inset rule, not a border: a border would add 1 px to the 38 / 44 px bar. */
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.06);
  }
  @media (hover: hover) and (pointer: fine) {
    .panel-bar {
      padding-block: 4px;
    }
  }
  /* On touch the bar is flush with the panel's top edge (overflow hidden), so the chip's
     outside focus ring would be clipped; draw it inside. */
  .panel-bar :global(.ui-chip:focus-visible) {
    outline-offset: -3px;
  }
  .panel-bar-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--size-meta);
    color: rgba(255, 255, 255, 0.85);
    opacity: 0;
    transition: opacity 120ms;
  }
  .panel-bar-name.shown {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .panel-bar-name {
      transition: none;
    }
  }

  .content {
    overflow-y: auto;
    padding: 14px 18px;
    /* Bottom safe-area inset + room for the fixed footer pill so the
       last line of the panel doesn't slip under the version chip in the
       bottom-right corner. */
    padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
    flex: 1;
  }
</style>
