<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';

  const SIM_SPEEDS = [1, 10, 100] as const; // days per second

  let {
    hidden,
    onToggleSizes,
    planetRatio,
    satelliteRatio,
    simSpeed = $bindable(),
    simPaused = $bindable(),
    simDateLabel,
    onResetToday,
  }: {
    hidden: boolean;
    onToggleSizes: () => void;
    /** Focused non-Earth planet's diameter / Earth's, else null. */
    planetRatio: number | null;
    /** Focused moon's diameter / Earth's, else null. */
    satelliteRatio: number | null;
    simSpeed: number;
    simPaused: boolean;
    simDateLabel: string;
    onResetToday: () => void;
  } = $props();

  // Mobile speed popover state — collapses 3 pills into one tap-to-reveal slot.
  let speedPopoverOpen = $state(false);
</script>

<!-- PRD-023 Slice E.2 — Earth-comparison ghost, doubling as the
     REFERENCES launcher (2026-06-06 user direction: move the
     REFERENCES chip from the top HUD to the Earth-for-scale slot;
     click → open the planet-scales overlay). Always visible at the
     bottom-left so it's a stable affordance; the ratio line only
     shows when focused on a non-Earth planet. -->
<button
  type="button"
  class="earth-compare"
  class:context-hidden={hidden}
  aria-label={m.explore_sizes_toggle()}
  onclick={onToggleSizes}
  data-testid="sizes-toggle"
>
  <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
  <span class="earth-compare-label">
    {#if planetRatio !== null}
      EARTH FOR SCALE<br />
      <span class="ratio">{planetRatio.toFixed(2)}× diameter</span>
    {:else if satelliteRatio !== null}
      EARTH FOR SCALE<br />
      <span class="ratio"
        >{satelliteRatio < 0.01 ? satelliteRatio.toFixed(4) : satelliteRatio.toFixed(2)}× diameter</span
      >
    {:else}
      {m.explore_sizes_toggle()}<br />
      <span class="ratio">{m.explore_planet_scales()}</span>
    {/if}
  </span>
</button>

<!-- Time playback (#351 Layer 1) — pause + days-per-second speed over
     the live orbital clock. Pinned bottom-left beside the PLANET SCALES
     button (user direction 2026-06-21). Pills mirror the guide-explore
     narration ("one day per second, ten days, a hundred"). -->
<div class="time-controls" class:context-hidden={hidden} data-audio-stage="explore-time">
  <!-- Mobile-only compact REFERENCES button — the standalone .earth-compare
       is hidden on mobile (z-20 behind footer); this keeps the affordance
       accessible in the scrubber row (z-40). -->
  <button
    type="button"
    class="earth-compact"
    onclick={onToggleSizes}
    aria-label={m.explore_sizes_toggle()}
    title={m.explore_sizes_toggle()}
    data-testid="sizes-toggle-compact"
  >
    <img src="{base}/textures/2k_earth_daymap.1x1.jpg" alt="" loading="lazy" decoding="async" />
    <span class="earth-compact-label">
      {#if planetRatio !== null}
        {planetRatio.toFixed(2)}×
      {:else if satelliteRatio !== null}
        {satelliteRatio < 0.01 ? satelliteRatio.toFixed(4) : satelliteRatio.toFixed(2)}×
      {:else}
        SCALE
      {/if}
    </span>
  </button>
  <button
    type="button"
    class="toggle play-btn"
    onclick={() => (simPaused = !simPaused)}
    aria-pressed={simPaused}
    aria-label={simPaused ? m.fly_play() : m.fly_pause()}
    title={simPaused ? m.fly_play() : m.fly_pause()}
    data-testid="explore-time-play"
    data-audio-stage="explore-time-pause"
  >
    {simPaused ? '▶' : '⏸'}
  </button>
  <div class="speed-group" role="group" aria-label={m.fly_speed_label()}>
    <!-- Mobile: single active-speed slot; tap to reveal all 3 above. -->
    <div class="speed-slot">
      <button
        type="button"
        class="speed-pill"
        class:active={!simPaused}
        aria-expanded={speedPopoverOpen}
        aria-haspopup="listbox"
        aria-label="{simSpeed}× — {m.fly_speed_label()}"
        onclick={() => (speedPopoverOpen = !speedPopoverOpen)}>{simSpeed}×</button
      >
      {#if speedPopoverOpen}
        <div class="speed-popover" role="listbox" aria-label={m.fly_speed_label()}>
          {#each SIM_SPEEDS as sp (sp)}
            {@const speedTip =
              sp === 1
                ? m.explore_speed_tip_1()
                : sp === 100
                  ? m.explore_speed_tip_100()
                  : m.explore_speed_tip_10()}
            <button
              type="button"
              class="speed-pill"
              class:active={!simPaused && simSpeed === sp}
              role="option"
              aria-selected={!simPaused && simSpeed === sp}
              aria-label={speedTip}
              title={speedTip}
              onclick={() => {
                simSpeed = sp;
                simPaused = false;
                speedPopoverOpen = false;
              }}
              data-testid="explore-speed-{sp}"
              data-audio-stage="explore-speed-{sp}">{sp}×</button
            >
          {/each}
        </div>
      {/if}
    </div>
    <!-- Desktop: all 3 pills visible. -->
    {#each SIM_SPEEDS as sp (sp)}
      {@const speedTip =
        sp === 1
          ? m.explore_speed_tip_1()
          : sp === 100
            ? m.explore_speed_tip_100()
            : m.explore_speed_tip_10()}
      <button
        type="button"
        class="speed-pill speed-desktop-pill"
        class:active={!simPaused && simSpeed === sp}
        aria-pressed={!simPaused && simSpeed === sp}
        aria-label={speedTip}
        title={speedTip}
        onclick={() => {
          simSpeed = sp;
          simPaused = false;
        }}
        data-testid="explore-speed-{sp}"
        data-audio-stage="explore-speed-{sp}"
      >
        {sp}×
      </button>
    {/each}
  </div>
  <!-- Date readout + reset (#351 Layer 2-B) — the running simulated date,
       with a dedicated reset-to-today button sized like play/pause. -->
  <span class="time-date" data-testid="explore-sim-date" data-audio-stage="explore-sim-date"
    >{simDateLabel}</span
  >
  <button
    type="button"
    class="play-btn reset-btn"
    onclick={onResetToday}
    title={m.explore_time_today()}
    aria-label={m.explore_time_today()}
    data-testid="explore-time-today"
    data-audio-stage="explore-time-today"
  >
    ⟲
  </button>
</div>

<style>
  .context-hidden {
    display: none !important;
  }

  /* PRD-023 Slice E.2 — Earth comparison ghost. Bottom-right corner.
     #342 Phase 30 — mobile-first: phone values are the defaults below;
     desktop values get layered back at @min-width: 601. */
  .earth-compare {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px 4px 4px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
    cursor: pointer;
    color: inherit;
    text-align: left;
    transition:
      border-color 120ms,
      background 120ms;
    /* Width-aligned to the orbit ruler that sits directly above
       (#357 — 2026-06-22 user direction "expand that reference panel
       to match width of this one"). 188 px is the ruler's default
       desktop width; box-sizing ensures padding stays inside. */
    box-sizing: border-box;
    min-width: 188px;
  }
  .earth-compare:hover,
  .earth-compare:focus-visible {
    border-color: rgba(75, 156, 211, 0.7);
    background: rgba(12, 16, 32, 0.78);
    outline: none;
  }
  .earth-compare img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: block;
  }
  .earth-compare-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 8px;
    letter-spacing: 1.4px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
  .earth-compare-label .ratio {
    color: rgba(255, 255, 255, 0.9);
    font-size: 10px;
    letter-spacing: 1.2px;
  }

  .toggle {
    min-width: 44px;
    min-height: 44px;
    /* Mobile: 12 px font, 0/10 padding. Desktop bumps to 13 / 0 14. */
    padding: 0 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid rgba(68, 102, 255, 0.4);
    color: #dde4ff;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms;
  }
  .toggle:hover,
  .toggle:focus-visible {
    border-color: #4466ff;
    background: rgba(20, 26, 50, 0.95);
    outline: none;
  }

  /* Time playback mini-panel (#351 Layer 1) — pinned bottom-left, styled
     to match the PLANET SCALES button (.earth-compare): same translucent
     navy card, blue hairline border, blur, and matching height. Holds a
     play toggle + a segmented 1×/10×/100× day-per-second speed control.
     Mobile-first: STACKED directly above the scales card (no room to sit
     beside it on a 375 px viewport). At @min-width: 601 it moves to sit
     side-by-side, right of the (larger) scales card. */
  .time-controls {
    position: fixed;
    /* Stacked above .earth-compare (bottom:8 + its ~36px height + gap). */
    bottom: 50px;
    left: 8px;
    /* Above the global .site-footer (z-index 35): on narrow mobile the
       footer's wide link strip (Gallery|Credits|…|ABOUT) overlaps this
       bottom-left control and intercepts taps on the reset / play
       buttons. The interactive control must out-stack the footer. */
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 6px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }
  /* Touch: the two things this 50px clears — the footer and .earth-compare —
     are both hidden on touch, so the scale strip drops to the bottom edge and
     the drawer (--mcd-bottom) sits just above it, closing the gap the removed
     footer used to fill. Desktop keeps the 50px stack. */
  :global(html[data-touch]) .time-controls {
    bottom: max(8px, env(safe-area-inset-bottom, 0px));
  }
  /* Play toggle — overrides .toggle's 44px floor to match the panel's
     footprint (consistent with .earth-compare, which also runs a sub-44
     affordance in this bottom-left zone). */
  .time-controls .play-btn {
    min-width: 32px;
    min-height: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    line-height: 1;
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    color: #cfe0ff;
  }
  .time-controls .play-btn:hover,
  .time-controls .play-btn:focus-visible {
    border-color: #4ecdc4;
    background: rgba(20, 26, 50, 0.85);
    color: #fff;
  }
  .time-controls .play-btn[aria-pressed='true'] {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }
  /* Segmented speed control — one rounded track, hairline dividers, the
     active step glows teal. */
  .speed-group {
    display: flex;
    align-items: stretch;
    pointer-events: auto;
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 5px;
    overflow: hidden;
  }
  .speed-pill {
    min-width: 32px;
    min-height: 32px;
    padding: 0 10px;
    border: none;
    border-right: 1px solid rgba(75, 156, 211, 0.18);
    background: rgba(15, 18, 35, 0.4);
    color: rgba(207, 224, 255, 0.55);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms;
  }
  .speed-pill:last-child {
    border-right: none;
  }
  .speed-pill:hover,
  .speed-pill:focus-visible {
    color: #fff;
    background: rgba(20, 26, 50, 0.7);
    outline: none;
  }
  .speed-pill.active {
    background: rgba(78, 205, 196, 0.22);
    color: #4ecdc4;
    box-shadow: inset 0 0 8px rgba(78, 205, 196, 0.18);
  }
  /* Date readout (#351 Layer 2-B) — non-interactive chip showing the
     running simulated date, in the panel's mono/teal language. */
  .time-date {
    display: inline-flex;
    align-items: center;
    /* Right-align the date in a fixed-width box so the chip (and the
       reset button beside it) never shift as the date ticks (#351
       Layer 2-B). Sized for the widest double-digit string. */
    justify-content: flex-end;
    text-align: right;
    min-width: 108px;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid rgba(75, 156, 211, 0.25);
    border-radius: 5px;
    background: rgba(15, 18, 35, 0.35);
    color: rgba(207, 224, 255, 0.82);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  /* Reset-to-today — same icon-button footprint as play/pause (inherits
     .time-controls .play-btn), teal tint, slightly larger glyph so the ⟲
     reads clearly. Defined after .play-btn so it wins the font-size. */
  .time-controls .reset-btn {
    font-size: 20px;
    color: #4ecdc4;
  }

  @media (min-width: 501px) {
    .toggle {
      padding: 0 14px;
      font-size: 13px;
    }
  }

  /* ─── ≥ 601 px — overlays + earth-compare desktop sizing ───────── */
  @media (min-width: 601px) {
    .earth-compare {
      bottom: 16px;
      left: 16px;
      padding: 6px 10px 6px 6px;
    }
    .earth-compare img {
      width: 32px;
      height: 32px;
    }
    /* Desktop: unstack — sit side-by-side, right of the reference card
       (left:16 + width:188 → right edge 204). Add a 5px gap (matching the
       scrubber's internal button `gap`) so the two boxes don't kiss edges
       (2026-06-28 user direction "put some minimal spacing in between, like
       spacing between buttons inside time scrubber"). */
    .time-controls {
      bottom: 16px;
      left: 209px;
    }
  }

  /* Compact REFERENCES button inside .time-controls — mobile only. */
  .earth-compact {
    display: none;
    height: 32px;
    padding: 2px 9px 2px 2px;
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 16px;
    cursor: pointer;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    color: inherit;
  }
  .earth-compact-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.5px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.82);
    white-space: nowrap;
  }
  .earth-compact img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: block;
  }
  .earth-compact:hover,
  .earth-compact:focus-visible {
    border-color: rgba(75, 156, 211, 0.7);
    outline: none;
  }
  @media (hover: none), (pointer: coarse) {
    .earth-compact {
      display: flex;
    }
    /* Hide standalone .earth-compare on mobile — affordance lives inside
       .time-controls as .earth-compact. */
    .earth-compare {
      display: none;
    }
  }

  /* Mobile speed slot — single pill showing current speed, reveals a
     stacked popover above on tap. */
  .speed-slot {
    display: none;
    position: relative;
  }
  .speed-popover {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(8, 10, 22, 0.95);
    border: 1px solid rgba(75, 156, 211, 0.35);
    border-radius: 5px;
    padding: 3px;
    min-width: 48px;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  .speed-popover .speed-pill {
    border-right: none;
    border-radius: 3px;
  }
  @media (hover: none), (pointer: coarse) {
    .speed-slot {
      display: block;
    }
    .speed-desktop-pill {
      display: none;
    }
    /* Let the tap-to-reveal popover escape the desktop pill-group's
       overflow:hidden clip (that clip only exists for the segmented look). */
    .speed-group {
      overflow: visible;
    }
  }
</style>
