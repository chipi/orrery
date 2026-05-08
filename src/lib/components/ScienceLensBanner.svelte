<!--
  ScienceLensBanner — a small floating banner that appears across the
  bottom of a route ONLY when the Science Lens toggle is on.

  Each route (/explore, /plan, /fly, /earth, /moon, /mars) drops in this
  component with its own brief physics description. Reused chrome, per-
  route content. Click the banner → opens the relevant /science section.

  Usage:
    <ScienceLensBanner
      title="Heliocentric view · ecliptic plane"
      body="Every planet's orbit is an ellipse with the Sun at one focus."
      tab="orbits"
      section="keplerian-orbit"
    />
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onScienceLensChange } from '$lib/science-lens';
  import type { ScienceTabId } from '$types/science';

  type Props = {
    title: string;
    body: string;
    tab: ScienceTabId;
    section: string;
    /** Where the banner pins. Default 'bottom' (the original placement
     * for /plan). Pass 'top' on routes whose bottom strip is occupied —
     * e.g. /explore where the bottom-right hosts the small-body chip
     * row, and the top-center band below the nav is otherwise empty. */
    placement?: 'top' | 'bottom';
  };
  let { title, body, tab, section, placement = 'bottom' }: Props = $props();

  let lensOn = $state(false);
  let stop: (() => void) | undefined;
  let bannerEl: HTMLElement | null = $state(null);
  let resizeObs: ResizeObserver | null = null;
  // Collapse state for the banner content. Default expanded so first-
  // time users see the framing copy; collapsed state hides body + link
  // and leaves just the eyebrow strip + chevron, freeing screen space.
  let expanded = $state(true);

  // Publishes the banner's measured height to a CSS custom property
  // on <html> so the ScienceLayersPanel can sit cleanly below it via
  // `top: calc(var(--nav-height) + var(--lens-banner-height) + gap)`.
  // Cleared on dismount so a route without a top-banner falls back to
  // the panel's default offset.
  function publishHeight(h: number) {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--lens-banner-height', `${h}px`);
  }
  function clearHeight() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.removeProperty('--lens-banner-height');
  }

  onMount(() => {
    stop = onScienceLensChange((v) => {
      lensOn = v;
      if (!v) clearHeight();
    });
  });
  onDestroy(() => {
    stop?.();
    resizeObs?.disconnect();
    clearHeight();
  });

  $effect(() => {
    // Re-attach observer whenever the banner element mounts/unmounts.
    resizeObs?.disconnect();
    resizeObs = null;
    if (!bannerEl || placement !== 'top') {
      clearHeight();
      return;
    }
    publishHeight(bannerEl.offsetHeight);
    // Use offsetHeight (full border-box) on every resize so the panel
    // offset accounts for padding + border too. contentRect.height
    // would underreport by ~22px and cause overlap.
    resizeObs = new ResizeObserver(() => {
      if (bannerEl) publishHeight(bannerEl.offsetHeight);
    });
    resizeObs.observe(bannerEl);
  });
</script>

{#if lensOn}
  <section
    bind:this={bannerEl}
    class="banner"
    class:top={placement === 'top'}
    class:collapsed={!expanded}
  >
    <button
      type="button"
      class="collapse-btn"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse Science Lens' : 'Expand Science Lens'}
      onclick={() => (expanded = !expanded)}
    >
      <span class="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    </button>
    <div class="banner-eyebrow">SCIENCE LENS{!expanded ? ` · ${title}` : ''}</div>
    {#if expanded}
      <a class="banner-body-link" href="{base}/science/{tab}/{section}">
        <div class="banner-title">{title}</div>
        <div class="banner-body">{body}</div>
        <div class="banner-link">→ Read in /science</div>
      </a>
    {/if}
  </section>
{/if}

<style>
  .banner {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: block;
    max-width: 540px;
    padding: 12px 18px 10px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
    text-decoration: none;
    z-index: 30;
    transition:
      border-color 120ms,
      transform 200ms;
  }
  .banner.top {
    top: calc(var(--nav-height) + 12px);
    bottom: auto;
  }
  .banner-body-link {
    display: block;
    color: var(--color-text);
    text-decoration: none;
  }
  .banner-body-link:hover {
    color: var(--color-text);
  }
  /* Collapse chevron button — top-right corner of the banner. Tiny so
     the banner reads cohesively when expanded. */
  .collapse-btn {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 22px;
    height: 22px;
    background: transparent;
    border: none;
    color: rgba(255, 200, 80, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    z-index: 1;
  }
  .collapse-btn:hover,
  .collapse-btn:focus-visible {
    color: #ffc850;
    background: rgba(255, 200, 80, 0.08);
    outline: none;
  }
  .chevron {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
  }
  .banner.collapsed {
    /* When collapsed, the banner is just the eyebrow strip — slim it
       down so it doesn't claim the same vertical space as expanded. */
    padding: 8px 36px 7px 18px;
  }
  .banner-eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    color: #ffc850;
    margin-bottom: 4px;
  }
  .banner-title {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 6px;
  }
  .banner-body {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.78);
    margin-bottom: 6px;
  }
  .banner-link {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
  }

  @media (max-width: 600px) {
    .banner {
      bottom: 80px;
      left: 8px;
      right: 8px;
      transform: none;
      max-width: none;
    }
    .banner.top {
      top: calc(var(--nav-height) + 8px);
      bottom: auto;
    }
    .banner:hover {
      transform: translateY(-2px);
    }
  }
</style>
