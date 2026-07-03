<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';
  import { page } from '$app/stores';
  import { cardChain, goBackCard } from '$lib/card-chain.svelte';

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
    children?: Snippet;
  };
  let { open, onClose, title, grabFocus = true, zIndex = 30, children }: Props = $props();

  let panelEl: HTMLElement | undefined = $state();

  // Back affordance (#29): only when we arrived here by following an in-card
  // link (chain non-empty) AND this view is itself a ?id= detail card.
  let canGoBack = $derived(cardChain.stack.length > 0 && $page.url.searchParams.has('id'));

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
      queueMicrotask(() => panelEl?.focus());
    }

    return () => {
      window.removeEventListener('keydown', handler);
      // Restore focus to whatever was active before the panel opened
      // (typically the canvas or the planet that triggered the open).
      previousActiveElement?.focus?.();
      previousActiveElement = null;
    };
  });

  let touchStartY = $state(0);
  let touchDeltaY = $state(0);

  function onTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    touchDeltaY = 0;
  }

  function onTouchMove(e: TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY;
    touchDeltaY = Math.max(0, delta);
  }

  function onTouchEnd() {
    if (touchDeltaY > 80) onClose();
    touchDeltaY = 0;
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
    bind:this={panelEl}
    tabindex="-1"
    aria-label={title ?? m.panel_default_label()}
    style:transform={touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : ''}
    style:--panel-z={zIndex}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    in:fly={{ y: 14, x: 14, duration: 220 }}
    out:fly={{ y: 14, x: 14, duration: 160 }}
  >
    <!-- Empty dock zone (PRD-016 §S8 follow-up). The compact Curator
         Tour overlay anchors at top: var(--nav-height), right: 0 with
         the same panel width — this reserved space lets it sit visibly
         atop the panel instead of being covered by it. Other top-
         docked affordances (HUD chips, breadcrumb, etc.) can land here
         in future without re-plumbing every consumer panel. -->
    <div class="panel-dock" aria-hidden="true"></div>
    <!-- Global close affordance — lives on Panel itself so every
         consumer (Planet/Sun/SmallBody/Mission/Fleet/Station/etc) gets
         the same control without re-implementing it. Floats on top of
         the content's first row so consumers don't need to leave room
         for it in their layout. -->
    {#if canGoBack}
      <button
        type="button"
        class="panel-back"
        onclick={goBackCard}
        aria-label={m.panel_back()}
        data-audio-stage="panel-back">←</button
      >
    {/if}
    <button
      type="button"
      class="panel-close"
      onclick={onClose}
      aria-label={m.panel_close()}
      data-audio-stage="panel-close">×</button
    >
    <div class="content" class:has-back={canGoBack}>
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
  }

  /* Desktop: right drawer */
  @media (min-width: 768px) {
    .panel {
      top: var(--nav-height);
      right: 0;
      bottom: 0;
      width: var(--panel-width);
      border-left: 1px solid var(--color-border);
    }
  }

  /* Mobile: full-height sheet anchored just below the nav — fills the
     screen so the scene doesn’t bleed through above the panel. No
     max-height cap. Tour-space dock is zeroed on mobile; a dedicated
     tour/mobile pass will revisit if needed. */
  @media (max-width: 767px) {
    .panel {
      top: var(--nav-height);
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px solid var(--color-border);
      z-index: calc(var(--panel-z, 30) + 50);
    }
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
  @media (max-width: 767px) {
    .panel-backdrop {
      display: block;
      z-index: calc(var(--panel-z, 30) + 49);
    }
  }

  .panel:focus {
    outline: none;
  }

  /* Empty top dock zone — same height as the compact tour bar so it
     visually slots in cleanly when the Curator Tour is in compact
     mode. Border-bottom is intentionally absent so panel content
     reads as continuous below it. */
  .panel-dock {
    height: 64px;
    flex-shrink: 0;
  }
  @media (max-width: 767px) {
    .panel-dock {
      height: 0;
    }
  }

  .panel-close {
    position: absolute;
    top: calc(64px + 14px);
    right: 14px;
    width: 44px;
    height: 44px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.65);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }
  .panel-close:hover,
  .panel-close:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: var(--color-text);
    outline: none;
  }
  @media (max-width: 767px) {
    .panel-close {
      top: 14px;
    }
  }

  /* Back affordance (#29) — mirrors .panel-close on the top-LEFT. */
  .panel-back {
    position: absolute;
    top: calc(64px + 14px);
    left: 14px;
    width: 44px;
    height: 44px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.65);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }
  .panel-back:hover,
  .panel-back:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: var(--color-text);
    outline: none;
  }
  @media (max-width: 767px) {
    .panel-back {
      top: 14px;
    }
  }
  /* When the back button is present it shares the top-left with the content's
     first row (agency badges); push the content down so nothing overlaps. */
  .content.has-back {
    padding-top: 58px;
  }

  .content {
    overflow-y: auto;
    padding: 14px 18px;
    /* Bottom safe-area inset + room for the fixed footer pill so the
       last CTA inside the panel (Plan / Fly mission) doesn't slip
       under the version chip in the bottom-right corner. */
    padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px));
    flex: 1;
  }
</style>
