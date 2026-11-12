<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import Chip from '$lib/components/Chip.svelte';
  import ChipGroup from '$lib/components/ChipGroup.svelte';

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
<div class="scales-dock" class:context-hidden={hidden}>
  <Chip
    kind="action"
    aria-label={m.explore_sizes_toggle()}
    onclick={onToggleSizes}
    data-testid="sizes-toggle"
  >
    {#snippet icon()}
      <img
        class="earth-img"
        src="{base}/textures/2k_earth_daymap.1x1.jpg"
        alt=""
        loading="lazy"
        decoding="async"
      />
    {/snippet}
    <span class="earth-compare-label">
      {#if planetRatio !== null}
        {m.explore_earth_for_scale()}<br />
        <span class="ratio">{m.explore_ratio_diameter({ ratio: planetRatio.toFixed(2) })}</span>
      {:else if satelliteRatio !== null}
        {m.explore_earth_for_scale()}<br />
        <span class="ratio"
          >{m.explore_ratio_diameter({
            ratio: satelliteRatio < 0.01 ? satelliteRatio.toFixed(4) : satelliteRatio.toFixed(2),
          })}</span
        >
      {:else}
        {m.explore_sizes_toggle()}<br />
        <span class="ratio">{m.explore_planet_scales()}</span>
      {/if}
    </span>
  </Chip>
</div>

<!-- Time playback (#351 Layer 1) — pause + days-per-second speed over
     the live orbital clock. Pinned bottom-left beside the PLANET SCALES
     button (user direction 2026-06-21). Chips mirror the guide-explore
     narration ("one day per second, ten days, a hundred"). -->
<div class="time-controls" class:context-hidden={hidden} data-audio-stage="explore-time">
  <!-- Mobile-only compact REFERENCES button — the standalone scales dock
       is hidden on mobile (z-20 behind footer); this keeps the affordance
       accessible in the scrubber row (z-40). -->
  <div class="scale-compact">
    <Chip
      kind="action"
      onclick={onToggleSizes}
      aria-label={m.explore_sizes_toggle()}
      title={m.explore_sizes_toggle()}
      data-testid="sizes-toggle-compact"
    >
      {#snippet icon()}
        <img
          class="earth-img"
          src="{base}/textures/2k_earth_daymap.1x1.jpg"
          alt=""
          loading="lazy"
          decoding="async"
        />
      {/snippet}
      {#if planetRatio !== null}
        {planetRatio.toFixed(2)}×
      {:else if satelliteRatio !== null}
        {satelliteRatio < 0.01 ? satelliteRatio.toFixed(4) : satelliteRatio.toFixed(2)}×
      {:else}
        {m.explore_scale_short()}
      {/if}
    </Chip>
  </div>
  <Chip
    kind="toggle"
    active={simPaused}
    onclick={() => (simPaused = !simPaused)}
    aria-label={simPaused ? m.fly_play() : m.fly_pause()}
    title={simPaused ? m.fly_play() : m.fly_pause()}
    data-testid="explore-time-play"
    data-audio-stage="explore-time-pause"
  >
    {#snippet icon()}{simPaused ? '▶' : '⏸'}{/snippet}
  </Chip>
  <!-- Mobile: single active-speed slot; tap to reveal all 3 above. -->
  <div class="speed-slot">
    <Chip
      kind="action"
      active={!simPaused}
      aria-expanded={speedPopoverOpen}
      aria-haspopup="true"
      aria-label="{simSpeed}× — {m.fly_speed_label()}"
      onclick={() => (speedPopoverOpen = !speedPopoverOpen)}>{simSpeed}×</Chip
    >
    {#if speedPopoverOpen}
      <ChipGroup role="radiogroup" class="speed-popover" label={m.fly_speed_label()}>
        {#each SIM_SPEEDS as sp, i (sp)}
          {@const speedTip =
            sp === 1
              ? m.explore_speed_tip_1()
              : sp === 100
                ? m.explore_speed_tip_100()
                : m.explore_speed_tip_10()}
          <Chip
            kind="choice"
            active={!simPaused && simSpeed === sp}
            tabstop={simPaused && i === 0}
            aria-label={speedTip}
            title={speedTip}
            onclick={() => {
              simSpeed = sp;
              simPaused = false;
              speedPopoverOpen = false;
            }}
            data-testid="explore-speed-{sp}"
            data-audio-stage="explore-speed-{sp}">{sp}×</Chip
          >
        {/each}
      </ChipGroup>
    {/if}
  </div>
  <ChipGroup role="radiogroup" class="speed-group" label={m.fly_speed_label()}>
    <!-- Desktop: all 3 chips visible. -->
    {#each SIM_SPEEDS as sp, i (sp)}
      {@const speedTip =
        sp === 1
          ? m.explore_speed_tip_1()
          : sp === 100
            ? m.explore_speed_tip_100()
            : m.explore_speed_tip_10()}
      <Chip
        kind="choice"
        class="speed-desktop-chip"
        active={!simPaused && simSpeed === sp}
        tabstop={simPaused && i === 0}
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
      </Chip>
    {/each}
  </ChipGroup>
  <!-- Date readout + reset (#351 Layer 2-B) — the running simulated date,
       with a dedicated reset-to-today chip beside it. -->
  <span class="time-date" data-testid="explore-sim-date" data-audio-stage="explore-sim-date"
    >{simDateLabel}</span
  >
  <Chip
    kind="action"
    onclick={onResetToday}
    title={m.explore_time_today()}
    aria-label={m.explore_time_today()}
    data-testid="explore-time-today"
    data-audio-stage="explore-time-today"
  >
    {#snippet icon()}⟲{/snippet}
  </Chip>
</div>

<style>
  .context-hidden {
    display: none !important;
  }

  /* PRD-023 Slice E.2 — Earth comparison ghost (a Chip). Bottom-left corner.
     #342 Phase 30 — mobile-first: phone values are the defaults below;
     desktop values get layered back at @min-width: 601. */
  .scales-dock {
    position: fixed;
    bottom: 8px;
    left: 8px;
    z-index: 20;
  }
  /* Width-aligned to the orbit ruler that sits directly above
     (#357 — 2026-06-22 user direction "expand that reference panel
     to match width of this one"). 188 px is the ruler's default
     desktop width. */
  .scales-dock :global(.ui-chip) {
    min-width: 188px;
    justify-content: flex-start;
    text-align: left;
    padding-block: 4px;
  }
  .earth-img {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: block;
  }
  .earth-compare-label {
    letter-spacing: 1.4px;
    line-height: 1.4;
  }
  .earth-compare-label .ratio {
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 1.2px;
  }

  /* Time playback mini-panel (#351 Layer 1) — pinned bottom-left, styled
     to match the PLANET SCALES chip: same translucent navy card, blue
     hairline border, blur. Holds a play toggle + the 1×/10×/100×
     day-per-second speed chips. Mobile-first: STACKED directly above the
     scales chip (no room to sit beside it on a 375 px viewport). At
     @min-width: 601 it moves to sit side-by-side, right of the (larger)
     scales chip. */
  .time-controls {
    position: fixed;
    /* Stacked above the scales dock (bottom:8 + its ~36px height + gap). */
    bottom: 50px;
    left: 8px;
    /* Above the global .site-footer (z-index 35): on narrow mobile the
       footer's wide link strip (Gallery|Credits|…|ABOUT) overlaps this
       bottom-left control and intercepts taps on the reset / play
       buttons. The interactive control must out-stack the footer. */
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 6px;
    background: rgba(8, 10, 22, 0.6);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    border-radius: 6px;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }
  /* Touch: the two things this 50px clears — the footer and the scales dock —
     are both hidden on touch, so the scale strip drops to the bottom edge and
     the drawer (--mcd-bottom) sits just above it, closing the gap the removed
     footer used to fill. Desktop keeps the 50px stack. */
  :global(html[data-touch]) .time-controls {
    bottom: max(8px, env(safe-area-inset-bottom, 0px));
  }
  .time-controls :global(.speed-group) {
    flex-wrap: nowrap;
  }
  /* Date readout (#351 Layer 2-B) — non-interactive text showing the
     running simulated date, in the panel's mono/accent blue language. */
  .time-date {
    display: inline-flex;
    align-items: center;
    /* Right-align the date in a fixed-width box so the readout (and the
       reset chip beside it) never shift as the date ticks (#351
       Layer 2-B). Sized for the widest double-digit string. */
    justify-content: flex-end;
    text-align: right;
    min-width: 108px;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    border-radius: 4px;
    background: rgba(15, 18, 35, 0.35);
    color: rgba(207, 224, 255, 0.82);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  /* ─── ≥ 601 px — overlays + scales-dock desktop sizing ─────────── */
  @media (min-width: 601px) {
    .scales-dock {
      bottom: 16px;
      left: 16px;
    }
    /* Desktop: unstack — sit side-by-side, right of the reference chip
       (left:16 + width:188 → right edge 204). Add a 5px gap (matching the
       scrubber's internal button `gap`) so the two boxes don't kiss edges
       (2026-06-28 user direction "put some minimal spacing in between, like
       spacing between buttons inside time scrubber"). */
    .time-controls {
      bottom: 16px;
      left: 209px;
    }
  }

  /* Compact REFERENCES chip inside .time-controls — mobile only. */
  .scale-compact {
    display: none;
    flex-shrink: 0;
  }
  @media (hover: none), (pointer: coarse) {
    .scale-compact {
      display: block;
    }
    /* Hide the standalone scales dock on mobile — the affordance lives
       inside .time-controls as .scale-compact. */
    .scales-dock {
      display: none;
    }
  }

  /* Mobile speed slot — single chip showing current speed, reveals a
     stacked popover above on tap. */
  .speed-slot {
    display: none;
    position: relative;
  }
  .speed-slot :global(.speed-popover) {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: 2px;
    background: rgba(8, 10, 22, 0.95);
    border: 1px solid var(--color-accent-edge);
    border-radius: 5px;
    padding: 3px;
    min-width: 48px;
    z-index: 50;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }
  @media (hover: none), (pointer: coarse) {
    .speed-slot {
      display: block;
    }
    .time-controls :global(.speed-desktop-chip) {
      display: none;
    }
  }
</style>
