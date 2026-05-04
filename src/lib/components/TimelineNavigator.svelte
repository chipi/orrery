<script lang="ts">
  /**
   * TimelineNavigator — horizontal mission timeline at the top of
   * /missions (v0.1.7 / ADR-027 / UXS-004 §Extension). Mission dots
   * laid out 1957 → 2035, two drag handles bound a year window, and
   * the parent filters the card grid below to the windowed range.
   *
   * Reduced-motion users get a paired (from/to) number-input variant
   * that controls the same year-window (per ADR-025 tier-1).
   *
   * Pinch-zoom on mobile (v0.1.10): two-finger pinch on the strip
   * widens or narrows the year window symmetrically around the pinch
   * midpoint, clamped to [MIN_YEAR, MAX_YEAR]. Inverse-pinch (spread)
   * zooms out; pinch-in zooms in. The same year-window state drives
   * filtering, so URL sync + reduced-motion variant Just Work.
   */
  import type { Mission } from '$types/mission';
  import { prefersReducedMotion, onReducedMotionChange } from '$lib/reduced-motion';
  import * as m from '$lib/paraglide/messages';
  import { onDestroy } from 'svelte';

  type Props = {
    missions: Mission[];
    fromYear: number;
    toYear: number;
    onChange: (from: number, to: number) => void;
    onSelectMission?: (id: string) => void;
  };
  let { missions, fromYear, toYear, onChange, onSelectMission }: Props = $props();

  // Fixed timeline range (ADR-027 §timeline-navigator). Bound to the
  // launch-cadence epoch so the visual story "1957 → today" is intact.
  const MIN_YEAR = 1957;
  const MAX_YEAR = 2035;

  let strip: HTMLDivElement | undefined = $state();
  // Handle currently being dragged: 'from' / 'to' / null.
  let dragging: 'from' | 'to' | null = $state(null);

  // Reduced-motion preference. Live-subscribed so an OS-level toggle
  // mid-session swaps to the number-input variant without reload.
  let reduced = $state(prefersReducedMotion());
  const stopRmWatch = onReducedMotionChange((r) => (reduced = r));
  onDestroy(stopRmWatch);

  // ─── Geometry helpers ────────────────────────────────────────────
  // Convert a year ↔ a fraction (0 → 1) along the strip.
  function yearToFrac(year: number): number {
    const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
    return (clamped - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
  }
  function fracToYear(frac: number): number {
    const clamped = Math.max(0, Math.min(1, frac));
    return Math.round(MIN_YEAR + clamped * (MAX_YEAR - MIN_YEAR));
  }

  // Decade ticks for the strip's axis. Mobile collapses to fewer
  // labels; the parent stylesheet handles which set is shown.
  const DECADE_TICKS_DESKTOP = [1957, 1965, 1975, 1985, 1995, 2005, 2015, 2025, 2035];
  const DECADE_TICKS_MOBILE = [1957, 1980, 2000, 2020, 2035];

  // ─── Drag interaction (mouse + touch) ────────────────────────────
  function pointerToYear(clientX: number): number {
    if (!strip) return MIN_YEAR;
    const rect = strip.getBoundingClientRect();
    if (rect.width <= 0) return MIN_YEAR;
    const frac = (clientX - rect.left) / rect.width;
    return fracToYear(frac);
  }
  function onHandleDown(which: 'from' | 'to', e: PointerEvent) {
    dragging = which;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandleMove(e: PointerEvent) {
    if (!dragging) return;
    const year = pointerToYear(e.clientX);
    if (dragging === 'from') {
      onChange(Math.min(year, toYear), toYear);
    } else {
      onChange(fromYear, Math.max(year, fromYear));
    }
  }
  function onHandleUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }

  // Click on the strip background nudges the nearest handle to the
  // click year — gives users a non-drag affordance for coarse changes.
  function onStripClick(e: MouseEvent) {
    if (dragging) return;
    if (e.target !== strip) return;
    const year = pointerToYear(e.clientX);
    const distFrom = Math.abs(year - fromYear);
    const distTo = Math.abs(year - toYear);
    if (distFrom <= distTo) onChange(Math.min(year, toYear), toYear);
    else onChange(fromYear, Math.max(year, fromYear));
  }

  // Reset window to full range — keyboard-friendly affordance and
  // makes "show everything" a single tap.
  function resetRange() {
    onChange(MIN_YEAR, MAX_YEAR);
  }

  // ─── Pinch-zoom (mobile, two-finger) ─────────────────────────────
  // Track two active pointers; the strip's effective year-window
  // adjusts symmetrically around the pinch midpoint. Pure scale
  // factor is `currentDistance / startDistance`.
  type PinchState = {
    pointers: Map<number, number>; // pointerId → clientX
    startDistance: number;
    startFrom: number;
    startTo: number;
    midpointYear: number;
  };
  let pinch: PinchState | null = null;

  function onStripPointerDown(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    if (!pinch) pinch = mkPinch();
    pinch.pointers.set(e.pointerId, e.clientX);
    if (pinch.pointers.size === 2) {
      const xs = Array.from(pinch.pointers.values());
      pinch.startDistance = Math.max(1, Math.abs(xs[1] - xs[0]));
      pinch.startFrom = fromYear;
      pinch.startTo = toYear;
      const midX = (xs[0] + xs[1]) / 2;
      pinch.midpointYear = pointerToYear(midX);
      // Cancel any in-progress single-touch drag — pinch takes over.
      dragging = null;
    }
  }
  function onStripPointerMove(e: PointerEvent) {
    if (e.pointerType !== 'touch' || !pinch || !pinch.pointers.has(e.pointerId)) return;
    pinch.pointers.set(e.pointerId, e.clientX);
    if (pinch.pointers.size !== 2) return;
    const xs = Array.from(pinch.pointers.values());
    const dist = Math.max(1, Math.abs(xs[1] - xs[0]));
    const scale = dist / pinch.startDistance;
    // New window width = old width / scale (pinch in shrinks window
    // visually but selects more years; spread out widens).
    const startSpan = pinch.startTo - pinch.startFrom;
    const newSpan = Math.max(1, Math.min(MAX_YEAR - MIN_YEAR, Math.round(startSpan / scale)));
    // Centre the new window on the pinch midpoint, clamped to bounds.
    const halfSpan = newSpan / 2;
    let nextFrom = Math.round(pinch.midpointYear - halfSpan);
    let nextTo = Math.round(pinch.midpointYear + halfSpan);
    if (nextFrom < MIN_YEAR) {
      nextTo += MIN_YEAR - nextFrom;
      nextFrom = MIN_YEAR;
    }
    if (nextTo > MAX_YEAR) {
      nextFrom -= nextTo - MAX_YEAR;
      nextTo = MAX_YEAR;
    }
    nextFrom = Math.max(MIN_YEAR, nextFrom);
    nextTo = Math.min(MAX_YEAR, nextTo);
    if (nextTo > nextFrom) onChange(nextFrom, nextTo);
  }
  function onStripPointerUp(e: PointerEvent) {
    if (!pinch) return;
    pinch.pointers.delete(e.pointerId);
    if (pinch.pointers.size < 2) pinch = null;
  }
  function mkPinch(): PinchState {
    return { pointers: new Map(), startDistance: 0, startFrom: 0, startTo: 0, midpointYear: 0 };
  }

  // Reduced-motion variant: input-pair updates write straight to the
  // year window, clamped to the legal bounds.
  function onFromInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (Number.isFinite(v)) onChange(Math.min(Math.max(v, MIN_YEAR), toYear), toYear);
  }
  function onToInput(e: Event) {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    if (Number.isFinite(v)) onChange(fromYear, Math.max(Math.min(v, MAX_YEAR), fromYear));
  }
</script>

{#if reduced}
  <!-- Reduced-motion variant per ADR-025 tier-1: paired number inputs
       drive the same year window without any drag affordance. -->
  <div class="timeline-rm" role="group" aria-label={m.lib_timeline_label()}>
    <label>
      {m.lib_timeline_from()}
      <input
        type="number"
        min={MIN_YEAR}
        max={MAX_YEAR}
        value={fromYear}
        onchange={onFromInput}
        aria-label={m.lib_timeline_from()}
      />
    </label>
    <label>
      {m.lib_timeline_to()}
      <input
        type="number"
        min={MIN_YEAR}
        max={MAX_YEAR}
        value={toYear}
        onchange={onToInput}
        aria-label={m.lib_timeline_to()}
      />
    </label>
    <button type="button" class="rm-reset" onclick={resetRange}>{m.lib_timeline_reset()}</button>
  </div>
{:else}
  <div class="timeline" role="group" aria-label={m.lib_timeline_label()}>
    <div class="timeline-ticks" aria-hidden="true">
      {#each DECADE_TICKS_DESKTOP as year (year)}
        <span class="tick desktop-only" style:left="{yearToFrac(year) * 100}%">{year}</span>
      {/each}
      {#each DECADE_TICKS_MOBILE as year (year)}
        <span class="tick mobile-only" style:left="{yearToFrac(year) * 100}%">{year}</span>
      {/each}
    </div>
    <div
      class="strip"
      bind:this={strip}
      onclick={onStripClick}
      role="presentation"
      onpointerdown={onStripPointerDown}
      onpointermove={(e) => {
        onHandleMove(e);
        onStripPointerMove(e);
      }}
      onpointerup={(e) => {
        onHandleUp(e);
        onStripPointerUp(e);
      }}
      onpointercancel={(e) => {
        onHandleUp(e);
        onStripPointerUp(e);
      }}
    >
      <div
        class="window"
        style:left="{yearToFrac(fromYear) * 100}%"
        style:width="{(yearToFrac(toYear) - yearToFrac(fromYear)) * 100}%"
        aria-hidden="true"
      ></div>

      {#each missions as mission (mission.id)}
        <button
          type="button"
          class="dot"
          class:in-range={mission.year >= fromYear && mission.year <= toYear}
          style:left="{yearToFrac(mission.year) * 100}%"
          style:background-color={mission.color}
          aria-label="{mission.name ?? mission.id}, {mission.year}"
          title="{mission.name ?? mission.id} · {mission.year}"
          onclick={(e) => {
            e.stopPropagation();
            if (onSelectMission) onSelectMission(mission.id);
          }}
        ></button>
      {/each}

      <button
        type="button"
        class="handle handle-from"
        style:left="{yearToFrac(fromYear) * 100}%"
        role="slider"
        aria-label={m.lib_timeline_from()}
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={fromYear}
        onpointerdown={(e) => onHandleDown('from', e)}
        onpointermove={onHandleMove}
        onpointerup={onHandleUp}
        onpointercancel={onHandleUp}
      >
        <span class="handle-label">{fromYear}</span>
      </button>
      <button
        type="button"
        class="handle handle-to"
        style:left="{yearToFrac(toYear) * 100}%"
        role="slider"
        aria-label={m.lib_timeline_to()}
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={toYear}
        onpointerdown={(e) => onHandleDown('to', e)}
        onpointermove={onHandleMove}
        onpointerup={onHandleUp}
        onpointercancel={onHandleUp}
      >
        <span class="handle-label">{toYear}</span>
      </button>
    </div>
    {#if fromYear !== MIN_YEAR || toYear !== MAX_YEAR}
      <button type="button" class="reset" onclick={resetRange}>{m.lib_timeline_reset()}</button>
    {/if}
  </div>
{/if}

<style>
  .timeline {
    position: relative;
    margin: 0 0 14px;
    padding: 22px 14px 16px;
    background: rgba(20, 30, 55, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    height: 80px;
    box-sizing: border-box;
  }
  .timeline-ticks {
    position: absolute;
    top: 4px;
    left: 14px;
    right: 14px;
    height: 12px;
    pointer-events: none;
  }
  .tick {
    position: absolute;
    transform: translateX(-50%);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: rgba(180, 200, 255, 0.55);
    letter-spacing: 1px;
  }
  .strip {
    position: relative;
    height: 100%;
    margin-top: 8px;
    cursor: pointer;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .window {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(78, 205, 196, 0.18);
    border-left: 1px solid rgba(78, 205, 196, 0.3);
    border-right: 1px solid rgba(78, 205, 196, 0.3);
    pointer-events: none;
  }
  .dot {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
    cursor: pointer;
    transition:
      transform 0.12s ease,
      opacity 0.12s ease;
    opacity: 0.4;
  }
  .dot.in-range {
    opacity: 1;
  }
  .dot:hover,
  .dot:focus-visible {
    transform: translate(-50%, -50%) scale(1.4);
    outline: none;
    z-index: 5;
  }
  .handle {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 44px;
    padding: 0;
    background: #4ecdc4;
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 3px;
    cursor: ew-resize;
    box-shadow: 0 0 8px rgba(78, 205, 196, 0.5);
    z-index: 10;
  }
  .handle:hover,
  .handle:focus-visible {
    outline: none;
    border-color: #fff;
  }
  .handle-label {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    color: #4ecdc4;
    letter-spacing: 1px;
    background: rgba(8, 10, 22, 0.85);
    padding: 1px 4px;
    border-radius: 2px;
    white-space: nowrap;
  }
  .reset {
    position: absolute;
    top: 4px;
    right: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 4px 8px;
    cursor: pointer;
    z-index: 6;
    min-width: 44px;
    min-height: 24px;
  }
  .reset:hover,
  .reset:focus-visible {
    border-color: rgba(255, 255, 255, 0.6);
    color: #fff;
    outline: none;
  }
  .desktop-only {
    display: none;
  }
  @media (min-width: 768px) {
    .desktop-only {
      display: inline;
    }
    .mobile-only {
      display: none;
    }
  }
  @media (max-width: 767px) {
    .timeline {
      height: 64px;
      padding: 18px 12px 12px;
    }
  }

  /* Reduced-motion variant: simple paired number inputs. */
  .timeline-rm {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin: 0 0 14px;
    padding: 12px 14px;
    background: rgba(20, 30, 55, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
  }
  .timeline-rm label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: rgba(180, 200, 255, 0.85);
  }
  .timeline-rm input {
    width: 80px;
    min-height: 36px;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
  }
  .rm-reset {
    margin-left: auto;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.7);
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 6px 10px;
    cursor: pointer;
    min-height: 36px;
  }
</style>
