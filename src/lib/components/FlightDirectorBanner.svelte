<!--
  FlightDirectorBanner — Science Lens narration on /fly that reflows
  with the simulation. Concept #3 in the science integrations roadmap.

  Phase cadence mirrors the FD stage markers on the /fly arc
  (FD_STAGES in src/routes/fly/+page.svelte). For a one-way mission:
    INJECTION → CRUISE → APPROACH → ARRIVAL
  For a round-trip mission (e.g. ORRERY-1 free return) the return leg
  layers a second pass on top:
    INJECTION → CRUISE → APPROACH → ARRIVAL (Mars)
                         → CRUISE → APPROACH → ARRIVAL (Earth)

  Phase boundaries are LEG-relative progress (0..1 across the leg's
  own arc), not whole-mission arcProgress, so APPROACH at 0.8 fires
  at the same point on outbound and return. Only renders when the
  global Science Lens toggle is on.

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

  type ScPhase = 'pre-launch' | 'outbound' | 'return' | 'arrived';
  type Props = {
    /** Current sc.phase from spacecraftPos — determines which leg's
     *  progress to gate phase reveal against. */
    scPhase: ScPhase;
    /** sc.progress — 0..0.5 across outbound, 0.5..1 across return. */
    progress: number;
    /** True for round-trip missions (retPts.length > 0). When false,
     *  the banner stops at ARRIVAL and never enters the return-leg
     *  phases. */
    isRoundTrip: boolean;
  };
  let { scPhase, progress, isRoundTrip }: Props = $props();

  type Phase = {
    id:
      | 'injection'
      | 'separation'
      | 'cruise'
      | 'approach'
      | 'arrival'
      | 'cruise-return'
      | 'approach-earth'
      | 'arrival-earth';
    /** Word shown in the eyebrow next to "FLIGHT DIRECTOR · PHASE ·".
     *  Return-leg phases reuse the outbound display words (CRUISE,
     *  APPROACH, ARRIVAL) so the cadence reads consistently with the
     *  diamond chips on the arc. */
    displayName: string;
    title: string;
    body: string;
    tab: ScienceTabId;
    section: string;
  };

  // Leg-relative progress (0..1 across each leg's own arc).
  let outboundT = $derived(
    scPhase === 'pre-launch' ? 0 : scPhase === 'outbound' ? progress * 2 : 1,
  );
  let returnT = $derived(
    scPhase === 'pre-launch' || scPhase === 'outbound'
      ? 0
      : scPhase === 'return'
        ? (progress - 0.5) * 2
        : 1,
  );

  // Phase definitions — outbound first, then return-leg counterparts
  // reusing the same content (the physics narration is the same on
  // both legs; the diamond + banner cadence keeps the user oriented).
  const INJECTION: Phase = {
    id: 'injection',
    displayName: 'INJECTION',
    title: m.fly_fd_phase_injection_title(),
    body: m.fly_fd_phase_injection_body(),
    tab: 'mission-phases',
    section: 'trans-x-injection',
  };
  const SEPARATION: Phase = {
    id: 'separation',
    displayName: 'SEPARATION',
    title: m.fly_fd_phase_separation_title(),
    body: m.fly_fd_phase_separation_body(),
    tab: 'mission-phases',
    section: 'trans-x-injection',
  };
  const CRUISE_OUT: Phase = {
    id: 'cruise',
    displayName: 'CRUISE',
    title: m.fly_fd_phase_cruise_title(),
    body: m.fly_fd_phase_cruise_body(),
    tab: 'transfers',
    section: 'hohmann-transfer',
  };
  const APPROACH_OUT: Phase = {
    id: 'approach',
    displayName: 'APPROACH',
    title: m.fly_fd_phase_approach_title(),
    body: m.fly_fd_phase_approach_body(),
    tab: 'propulsion',
    section: 'v-infinity',
  };
  const ARRIVAL_OUT: Phase = {
    id: 'arrival',
    displayName: 'ARRIVAL',
    title: m.fly_fd_phase_arrival_title(),
    body: m.fly_fd_phase_arrival_body(),
    tab: 'mission-phases',
    section: 'orbit-insertion',
  };
  const CRUISE_RETURN: Phase = {
    ...CRUISE_OUT,
    id: 'cruise-return',
  };
  const APPROACH_EARTH: Phase = {
    ...APPROACH_OUT,
    id: 'approach-earth',
  };
  const ARRIVAL_EARTH: Phase = {
    ...ARRIVAL_OUT,
    id: 'arrival-earth',
  };

  let phase = $derived<Phase>(
    scPhase === 'outbound' || scPhase === 'pre-launch'
      ? outboundT < 0.005
        ? INJECTION
        : outboundT < 0.025
          ? SEPARATION
          : outboundT < 0.8
            ? CRUISE_OUT
            : outboundT < 0.95
              ? APPROACH_OUT
              : ARRIVAL_OUT
      : !isRoundTrip
        ? ARRIVAL_OUT
        : scPhase === 'arrived'
          ? ARRIVAL_EARTH
          : returnT < 0.8
            ? CRUISE_RETURN
            : returnT < 0.95
              ? APPROACH_EARTH
              : ARRIVAL_EARTH,
  );

  let lensOn = $state(false);
  let stop: (() => void) | undefined;
  let expanded = $state(true);

  // Note: the legacy publishHeight() / --lens-banner-height logic was
  // removed when /fly moved the FD banner into the bottom-strips
  // layout (no longer top-anchored). Publishing the banner height
  // there caused the top-anchored ScienceLayersPanel to lerp down by
  // the FD banner's offsetHeight, dropping it into the canvas centre.

  onMount(() => {
    stop = onScienceLensChange((v) => {
      lensOn = v;
    });
  });
  onDestroy(() => {
    stop?.();
  });
</script>

{#if lensOn}
  <section
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
      {m.fly_fd_eyebrow()} · {m.fly_fd_phase_label({ phase: phase.displayName })}
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
  }
  .banner.collapsed {
    padding: 8px 36px 7px 18px;
  }
  .banner-eyebrow {
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
