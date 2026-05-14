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

  let closeButton: HTMLButtonElement | undefined = $state();
  let previousActiveElement: HTMLElement | null = null;

  $effect(() => {
    if (!open) return;
    // Capture whatever was focused before the panel opened so we can
    // restore it on close. The cleanup function (returned below) runs
    // when `open` flips back to false.
    previousActiveElement = (
      typeof document !== 'undefined' ? document.activeElement : null
    ) as HTMLElement | null;
    // Move focus into the panel (the close button is a safe landing —
    // every panel has one and it's predictable for keyboard users).
    queueMicrotask(() => closeButton?.focus());

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
    aria-label={title ?? m.panel_default_label()}
    style:transform={touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : ''}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    in:fly={{ y: 14, x: 14, duration: 220 }}
    out:fly={{ y: 14, x: 14, duration: 160 }}
  >
    <header>
      <span class="title">{title ?? ''}</span>
      <button bind:this={closeButton} class="close" onclick={onClose} aria-label={m.panel_close()}
        >×</button
      >
    </header>
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

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .title {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 2px;
    color: var(--color-text);
  }

  .close {
    width: 44px;
    height: 44px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-dim);
    cursor: pointer;
    border-radius: var(--border-radius);
    font-size: 24px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .close:hover {
    color: var(--color-text);
    border-color: rgba(255, 255, 255, 0.12);
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
