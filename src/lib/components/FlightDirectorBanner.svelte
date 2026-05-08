<!--
  FlightDirectorBanner — Science Lens narration on /fly that reflows
  with the simulation. Concept #3 in the science integrations roadmap.

  Replaces the static ScienceLensBanner on /fly: instead of one fixed
  blurb, the title/body/link rotate through five physics phases based
  on the current arcProgress. Like a flight director on console.

  Phase boundaries are progress-based (0.0–1.0 along the arc), not
  event-based, so it works the same on Curiosity (254-day cruise) and
  ORRERY-1 (509-day free return). Only renders when the global Science
  Lens toggle is on (data-science-lens="on" on <html>).

  i18n: phase narration text is held in messages/en-US.json under
  fly_fd_* keys; tab/section pointers are language-neutral and live
  here.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onScienceLensChange } from '$lib/science-lens';
  import * as m from '$lib/paraglide/messages.js';
  import type { ScienceTabId } from '$types/science';

  type Props = {
    /** 0..1 along the arc (0 = at departure, 1 = at arrival). */
    arcProgress: number;
  };
  let { arcProgress }: Props = $props();

  type Phase = {
    id: 'departure' | 'injection' | 'cruise' | 'approach' | 'arrival';
    title: string;
    body: string;
    tab: ScienceTabId;
    section: string;
  };

  let phase = $derived<Phase>(
    arcProgress <= 0.02
      ? {
          id: 'departure',
          title: m.fly_fd_phase_departure_title(),
          body: m.fly_fd_phase_departure_body(),
          tab: 'propulsion',
          section: 'c3',
        }
      : arcProgress <= 0.1
        ? {
            id: 'injection',
            title: m.fly_fd_phase_injection_title(),
            body: m.fly_fd_phase_injection_body(),
            tab: 'mission-phases',
            section: 'trans-x-injection',
          }
        : arcProgress <= 0.8
          ? {
              id: 'cruise',
              title: m.fly_fd_phase_cruise_title(),
              body: m.fly_fd_phase_cruise_body(),
              tab: 'transfers',
              section: 'hohmann-transfer',
            }
          : arcProgress <= 0.95
            ? {
                id: 'approach',
                title: m.fly_fd_phase_approach_title(),
                body: m.fly_fd_phase_approach_body(),
                tab: 'propulsion',
                section: 'v-infinity',
              }
            : {
                id: 'arrival',
                title: m.fly_fd_phase_arrival_title(),
                body: m.fly_fd_phase_arrival_body(),
                tab: 'mission-phases',
                section: 'orbit-insertion',
              },
  );

  let lensOn = $state(false);
  let stop: (() => void) | undefined;
  let bannerEl: HTMLElement | null = $state(null);
  let resizeObs: ResizeObserver | null = null;
  let expanded = $state(true);

  // Publish height to --lens-banner-height so the layers panel sits
  // cleanly below the banner. Mirrors ScienceLensBanner.
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
    resizeObs?.disconnect();
    resizeObs = null;
    if (!bannerEl) {
      clearHeight();
      return;
    }
    publishHeight(bannerEl.offsetHeight);
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
    class:collapsed={!expanded}
    data-testid="flight-director-banner"
    data-phase={phase.id}
  >
    <button
      type="button"
      class="collapse-btn"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse Flight Director' : 'Expand Flight Director'}
      onclick={() => (expanded = !expanded)}
    >
      <span class="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    </button>
    <div class="banner-eyebrow">
      {m.fly_fd_eyebrow()} · {m.fly_fd_phase_label({ phase: phase.id.toUpperCase() })}
    </div>
    {#if expanded}
      <a class="banner-body-link" href="{base}/science/{phase.tab}/{phase.section}">
        <div class="banner-title">{phase.title}</div>
        <div class="banner-body">{phase.body}</div>
        <div class="banner-link">{m.fly_fd_read_more()}</div>
      </a>
    {/if}
  </section>
{/if}

<style>
  /* Mirrors ScienceLensBanner chrome (same gold accent + chip box) so
     the two read as one family. Pinned to the TOP-center band on /fly
     because the bottom is occupied by the timeline scrubber + the
     SYSTEMS HUD; the top-center area below the nav is otherwise empty
     (the .hud-stack runs down the left edge). */
  .banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
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
  .banner:hover,
  .banner:focus-visible {
    border-color: rgba(255, 200, 80, 0.85);
    transform: translateX(-50%) translateY(-2px);
    outline: none;
  }
  .banner-body-link {
    display: block;
    color: var(--color-text);
    text-decoration: none;
  }
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
    /* Mobile: stay top-anchored but stretch edge-to-edge so the body
       text wraps cleanly on narrow screens. */
    .banner {
      top: calc(var(--nav-height) + 8px);
      left: 8px;
      right: 8px;
      transform: none;
      max-width: none;
    }
    .banner:hover,
    .banner:focus-visible {
      transform: translateY(-2px);
    }
  }
</style>
