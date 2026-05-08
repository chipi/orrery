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
  };
  let { title, body, tab, section }: Props = $props();

  let lensOn = $state(false);
  let stop: (() => void) | undefined;

  onMount(() => {
    stop = onScienceLensChange((v) => {
      lensOn = v;
    });
  });
  onDestroy(() => stop?.());
</script>

{#if lensOn}
  <a class="banner" href="{base}/science/{tab}/{section}">
    <div class="banner-eyebrow">SCIENCE LENS</div>
    <div class="banner-title">{title}</div>
    <div class="banner-body">{body}</div>
    <div class="banner-link">→ Read in /science</div>
  </a>
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
  .banner:hover {
    border-color: rgba(255, 200, 80, 0.85);
    transform: translateX(-50%) translateY(-2px);
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
    .banner:hover {
      transform: translateY(-2px);
    }
  }
</style>
