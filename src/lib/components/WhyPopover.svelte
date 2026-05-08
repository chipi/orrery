<!--
  WhyPopover — click-to-open inline explanation of a value or term.
  Concept #4 in the science integrations roadmap.

  Distinct from ScienceChip:
    - ScienceChip is a small `?` next to a *concept name* and navigates
      to /science (per ADR-036, no popover modal).
    - WhyPopover wraps a *concrete value* (e.g. "3.6 km/s") with an
      inline popover that explains why this number matters here, with
      an optional "Read full →" link to /science. The user can learn
      without leaving the screen.

  Behaviour:
    - Trigger is a tiny `Why?` chip that sits next to the wrapped value.
    - Click opens an inline popover (positioned below or above the
      trigger depending on viewport space). On mobile (<= 600px) the
      popover renders as a fixed bottom sheet for one-handed reach.
    - Close on: outside click, ESC, close button, or focus leaving the
      popover.

  Props:
    - title (required): popover header
    - body (required): explanation text (1-3 sentences)
    - tab + section (optional): if provided, renders a "Read full" link
      into /science for users who want the full chapter.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages.js';
  import type { ScienceTabId } from '$types/science';

  type Props = {
    title: string;
    body: string;
    tab?: ScienceTabId;
    section?: string;
    /** Override the trigger label. Defaults to "Why?". */
    triggerLabel?: string;
  };
  let { title, body, tab, section, triggerLabel }: Props = $props();

  let open = $state(false);
  let trigger: HTMLButtonElement | null = $state(null);
  let popover: HTMLDivElement | null = $state(null);

  function toggle() {
    open = !open;
  }
  function close() {
    open = false;
  }

  function onDocPointerDown(ev: PointerEvent) {
    if (!open) return;
    const t = ev.target as Node | null;
    if (!t) return;
    if (trigger?.contains(t) || popover?.contains(t)) return;
    close();
  }
  function onDocKey(ev: KeyboardEvent) {
    if (open && ev.key === 'Escape') {
      close();
      trigger?.focus();
    }
  }

  onMount(() => {
    document.addEventListener('pointerdown', onDocPointerDown);
    document.addEventListener('keydown', onDocKey);
  });
  onDestroy(() => {
    document.removeEventListener('pointerdown', onDocPointerDown);
    document.removeEventListener('keydown', onDocKey);
  });
</script>

<span class="wrap">
  <button
    type="button"
    class="trigger"
    class:open
    bind:this={trigger}
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-label={m.why_popover_aria_open({ title })}
    onclick={toggle}
  >
    {triggerLabel ?? m.why_popover_trigger()}
  </button>
  {#if open}
    <div
      class="popover"
      role="dialog"
      aria-label={title}
      bind:this={popover}
      data-testid="why-popover"
    >
      <div class="header">
        <span class="eyebrow">{m.why_popover_eyebrow()}</span>
        <button type="button" class="close" aria-label={m.why_popover_aria_close()} onclick={close}
          >×</button
        >
      </div>
      <p class="title">{title}</p>
      <p class="body">{body}</p>
      {#if tab && section}
        <a class="more" href="{base}/science/{tab}/{section}" onclick={close}>
          {m.why_popover_read_full()}
        </a>
      {/if}
    </div>
  {/if}
</span>

<style>
  .wrap {
    position: relative;
    display: inline-flex;
    align-items: baseline;
  }

  /* Tiny chip-style trigger; matches the size of ScienceChip so the two
     visually rhyme without overlapping in role. ScienceChip is teal+arrow,
     WhyPopover is gold+text. */
  .trigger {
    display: inline-flex;
    align-items: center;
    height: 14px;
    margin-left: 4px;
    padding: 0 5px;
    background: transparent;
    border: 1px solid rgba(255, 200, 80, 0.45);
    border-radius: 7px;
    color: rgba(255, 200, 80, 0.85);
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    transition:
      border-color 120ms,
      color 120ms,
      background 120ms;
  }
  .trigger:hover,
  .trigger:focus-visible,
  .trigger.open {
    border-color: rgba(255, 200, 80, 0.85);
    color: #ffc850;
    background: rgba(255, 200, 80, 0.08);
    outline: none;
  }

  .popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 60;
    width: 280px;
    padding: 10px 12px;
    background: rgba(8, 10, 22, 0.96);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
  }
  .close {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 18px;
    line-height: 1;
    padding: 0 4px;
    cursor: pointer;
  }
  .close:hover,
  .close:focus-visible {
    color: #fff;
    outline: none;
  }
  .title {
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 5px;
  }
  .body {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 0 6px;
  }
  .more {
    display: inline-block;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
    text-decoration: none;
  }
  .more:hover,
  .more:focus-visible {
    color: #ffc850;
    outline: none;
  }

  @media (max-width: 600px) {
    /* Bottom sheet on small screens — easier reach than an absolutely-
       positioned popover that may clip to the right edge. */
    .popover {
      position: fixed;
      top: auto;
      left: 8px;
      right: 8px;
      bottom: 80px;
      width: auto;
    }
  }
</style>
