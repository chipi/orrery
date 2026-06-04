<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children?: Snippet;
  };
  let { open, onClose, title, children }: Props = $props();

  let panelEl: HTMLElement | undefined = $state();
  let previousActiveElement: HTMLElement | null = null;

  $effect(() => {
    if (!open) return;
    // Capture whatever was focused before the panel opened so we can
    // restore it on close. The cleanup function (returned below) runs
    // when `open` flips back to false.
    previousActiveElement = (
      typeof document !== 'undefined' ? document.activeElement : null
    ) as HTMLElement | null;
    // Move focus to the panel container itself (tabindex=-1) — keyboard
    // users land inside the panel without us having to pick a single
    // "right" focus target. Consumers render their own visible close
    // button in their first content row (PRD-016 §S8 follow-up — the
    // top of the panel is reserved as an empty dock zone).
    queueMicrotask(() => panelEl?.focus());

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
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
  <aside
    class="panel"
    bind:this={panelEl}
    tabindex="-1"
    aria-label={title ?? m.panel_default_label()}
    style:transform={touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : ''}
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
    <button type="button" class="panel-close" onclick={onClose} aria-label={m.panel_close()}
      >×</button
    >
    <div class="content">
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
    z-index: 30;
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

  /* Mobile: bottom sheet */
  @media (max-width: 767px) {
    .panel {
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 80vh;
      border-top: 1px solid var(--color-border);
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
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
      height: 56px;
    }
  }

  .panel-close {
    position: absolute;
    top: calc(64px + 14px);
    right: 14px;
    width: 32px;
    height: 32px;
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
      top: calc(56px + 14px);
    }
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
