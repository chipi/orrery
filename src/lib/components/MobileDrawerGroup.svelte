<!--
  MobileDrawerGroup — three-tab bottom accordion for mobile (/explore redesign).

  Single open tab at a time: tapping a closed tab opens it (closing any other);
  tapping the open tab closes it (all-closed = just the tab row visible).

  Content panel renders ABOVE the tab row, full-width (left:8px right:8px).
  Tab row stays visible so the user can switch without reopening. Same visual
  language as MobileControlsDrawer (bg, blur, border, radius, 46vh cap, scroll).

  Desktop (≥768px) renders nothing — routes keep their inline controls.

  Behaviours: Esc-to-close, tap-dim-to-close, swipe-down-to-close (parity with
  MobileControlsDrawer). Position above the route's primary bar via --mcd-bottom.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as m from '$lib/paraglide/messages';

  // content receives a `close` callback so a selection inside a drawer
  // (pick a mission / orbit zone / toggle) can auto-collapse the drawer,
  // revealing the scene change it triggered (2026-07 user direction).
  type Tab = {
    id: string;
    label: string;
    /** Distinct per-content glyph (falls back to the generic tile). */
    icon?: string;
    content?: Snippet<[close: () => void]>;
    /** If set: onclick fires action() without opening a panel (direct toggle). */
    action?: () => void;
    /** Drives active styling + aria-pressed for action tabs. */
    active?: boolean;
  };

  type Props = {
    tabs: Tab[];
    /** Fires when the open tab changes (id, or null when all closed).
        /explore uses it to enable the iconic-missions layer on open. */
    onOpen?: (id: string | null) => void;
  };

  let { tabs, onOpen }: Props = $props();

  let openId = $state<string | null>(null);

  // Notify the host whenever the open tab changes (used to sync a scene layer).
  $effect(() => {
    onOpen?.(openId);
  });

  function toggleTab(id: string) {
    openId = openId === id ? null : id;
  }

  const openTab = $derived(tabs.find((t) => t.id === openId) ?? null);

  // Swipe-down on the panel body collapses it.
  let startY = $state(0);
  let deltaY = $state(0);
  function onTouchStart(e: TouchEvent) {
    startY = e.touches[0]?.clientY ?? 0;
    deltaY = 0;
  }
  function onTouchMove(e: TouchEvent) {
    deltaY = Math.max(0, (e.touches[0]?.clientY ?? 0) - startY);
  }
  function onTouchEnd() {
    if (deltaY > 60) openId = null;
    deltaY = 0;
  }

  // Esc closes the open panel (parity with MobileControlsDrawer + other overlays).
  $effect(() => {
    if (!openId) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openId = null;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
</script>

{#if openId !== null}
  <!-- Light dim — scene stays live and interactive behind it. -->
  <button
    type="button"
    class="mdg-dim"
    aria-label="Close panel"
    tabindex="-1"
    onclick={() => (openId = null)}
  ></button>
{/if}

<div class="mdg" style:transform={deltaY > 0 && openId ? `translateY(${deltaY}px)` : ''}>
  {#if openTab && openTab.content}
    <button
      type="button"
      class="mdg-close"
      aria-label={m.panel_close()}
      onclick={() => (openId = null)}
    >
      ×
    </button>
    <!-- swipe-down-to-close is a supplementary gesture; Esc + tap-dim are the
         accessible closes, so the body needs no interactive role. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="mdg-body"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    >
      {@render openTab.content(() => (openId = null))}
    </div>
  {/if}
  <!-- This is a disclosure/accordion (one panel opens ABOVE the row, all-closed
       is valid), NOT an ARIA tablist: content tabs are aria-expanded disclosure
       buttons, action tabs are aria-pressed toggles. A role="tablist" here
       tripped axe aria-required-children on routes that pass action tabs
       (/iss, /tiangong) because the action buttons aren't role="tab". -->
  <div class="mdg-tabs">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        class="mdg-tab"
        class:active={tab.action ? (tab.active ?? false) : openId === tab.id}
        aria-expanded={tab.action ? undefined : openId === tab.id}
        aria-pressed={tab.action ? (tab.active ?? false) : undefined}
        onclick={() => (tab.action ? tab.action() : toggleTab(tab.id))}
      >
        <span class="mdg-icon" aria-hidden="true">{tab.icon ?? '◫'}</span>
        <span class="mdg-label">{tab.label.toUpperCase()}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  /* Desktop: render nothing. */
  .mdg,
  .mdg-dim {
    display: none;
  }

  @media (hover: none), (pointer: coarse) {
    .mdg {
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 8px;
      right: 8px;
      bottom: var(--mcd-bottom, calc(52px + env(safe-area-inset-bottom, 0px)));
      z-index: 38;
    }
    /* Discoverable close on the expanded panel (tap-away + Esc still work). */
    .mdg-close {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 18, 35, 0.85);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.85);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }

    .mdg-body {
      background: rgba(8, 10, 22, 0.92);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--color-border);
      border-radius: 12px 12px 0 0;
      max-height: 46vh;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 12px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35);
      color: var(--color-text);
    }
    .mdg-body::-webkit-scrollbar {
      width: 4px;
    }
    .mdg-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.18);
      border-radius: 2px;
    }

    .mdg-tabs {
      display: flex;
      gap: 6px;
    }

    /* Each tab is a rounded pill matching the time-scrubber below it (same
       border / blur / teal-active), icon inline beside a short label. */
    .mdg-tab {
      flex: 1;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 40px;
      padding: 8px 6px;
      background: rgba(15, 18, 35, 0.62);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(75, 156, 211, 0.3);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      font-family: 'Space Mono', monospace;
      font-size: 10px;
      letter-spacing: 0.6px;
      color: rgba(207, 224, 255, 0.75);
      cursor: pointer;
      white-space: nowrap;
    }
    .mdg-tab.active {
      color: #4ecdc4;
      border-color: rgba(78, 205, 196, 0.6);
      background: rgba(20, 26, 50, 0.85);
    }
    .mdg-icon {
      font-size: 15px;
      line-height: 1;
      color: #cfe0ff;
    }
    .mdg-tab.active .mdg-icon {
      color: #4ecdc4;
    }
    .mdg-tab:focus-visible {
      outline: 2px solid var(--color-accent, #4ecdc4);
      outline-offset: -2px;
      border-radius: 2px;
    }

    .mdg-dim {
      display: block;
      position: fixed;
      inset: 0;
      margin: 0;
      padding: 0;
      border: none;
      background: rgba(2, 2, 8, 0.28);
      cursor: pointer;
      z-index: 37;
    }
  }
</style>
