<script lang="ts">
  /**
   * Epoch timeline strip — horizontal scrub bar with 8 named historic
   * epoch bands (PRD-012 v0.2 §epochs / RFC-016 v0.2 OQ-17).
   *
   * Each band:
   *  - position derived from year range
   *  - entry count rendered as caption
   *  - clickable to filter the card grid
   *  - active band highlighted with teal accent
   *
   * Mobile (≤600 px): collapses to a horizontal swipe-friendly chip
   * row that surfaces epoch + count without the time axis.
   */
  import type { FleetEpoch } from '$types/fleet';
  import { EPOCH_BANDS, AXIS_MIN, AXIS_MAX } from '$lib/epoch-bands';

  const AXIS_RANGE = AXIS_MAX - AXIS_MIN;

  type Props = {
    /**
     * Count per epoch id. Each consuming route brings its own count
     * map — /fleet counts entries by their explicit `epoch` field,
     * /missions counts by year-range membership. Keeps this component
     * pure presentation. (2026-06-17 refactor — was previously
     * computing counts internally from a FleetIndexEntry[] prop, which
     * only worked for /fleet.)
     */
    countByEpoch: Map<FleetEpoch, number>;
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
  };

  let { countByEpoch, selected, onSelect }: Props = $props();

  function pctLeft(year: number): number {
    return ((year - AXIS_MIN) / AXIS_RANGE) * 100;
  }
  function pctWidth(start: number, end: number): number {
    return ((end - start) / AXIS_RANGE) * 100;
  }

  function handleKey(e: KeyboardEvent, epoch: FleetEpoch) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(selected === epoch ? 'ALL' : epoch);
    }
  }

  // Today indicator (2026-05-10 fixed-ish — recompute on mount for stability)
  const todayYear = new Date().getFullYear();
  const todayPct = Math.max(0, Math.min(100, pctLeft(todayYear)));
</script>

<section class="strip" aria-label="Spaceflight epochs timeline">
  <!-- Desktop: full timeline with bands positioned along the axis -->
  <div class="axis-wrap" aria-hidden="true">
    <div class="axis">
      {#each EPOCH_BANDS as ep (ep.id)}
        <button
          type="button"
          class="band"
          class:active={selected === ep.id}
          style:left="{pctLeft(ep.yearStart)}%"
          style:width="{pctWidth(ep.yearStart, ep.yearEnd)}%"
          style:--band-color={ep.color}
          onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
          onkeydown={(e) => handleKey(e, ep.id)}
          aria-label="{ep.label} ({ep.yearStart}–{ep.yearEnd}, {countByEpoch.get(ep.id) ??
            0} entries)"
        >
          <span class="band-label">{ep.label}</span>
          <span class="band-meta"
            >{ep.yearStart}–{ep.id === 'mars-era' ? '∞' : ep.yearEnd} · {countByEpoch.get(ep.id) ??
              0}</span
          >
        </button>
      {/each}
      <div class="today" style:left="{todayPct}%" title="Today ({todayYear})"></div>
    </div>
    <div class="axis-ticks">
      <span class="tick" style:left="0%">1957</span>
      <span class="tick" style:left="{pctLeft(1969)}%">1969</span>
      <span class="tick" style:left="{pctLeft(1986)}%">1986</span>
      <span class="tick" style:left="{pctLeft(2011)}%">2011</span>
      <span class="tick" style:left="100%" style:transform="translateX(-100%)">2030</span>
    </div>
  </div>

  <!-- Mobile: simple chip carousel -->
  <ul class="chips" role="radiogroup" aria-label="Filter by epoch">
    <li>
      <button
        type="button"
        class="chip"
        class:active={selected === 'ALL'}
        role="radio"
        aria-checked={selected === 'ALL'}
        onclick={() => onSelect('ALL')}>All epochs</button
      >
    </li>
    {#each EPOCH_BANDS as ep (ep.id)}
      <li>
        <button
          type="button"
          class="chip"
          class:active={selected === ep.id}
          style:--band-color={ep.color}
          role="radio"
          aria-checked={selected === ep.id}
          onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
        >
          {ep.label}
          <span class="chip-count">{countByEpoch.get(ep.id) ?? 0}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .strip {
    margin: 0 0 14px;
    padding: 0;
  }

  /* ───── Desktop axis (≥ 720 px) ───── */
  .axis-wrap {
    display: none;
    position: relative;
    padding: 6px 0 22px;
  }
  .axis {
    position: relative;
    height: 56px;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 255, 255, 0.04) 50%,
      rgba(255, 255, 255, 0.02) 100%
    );
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  /* Per-band hue via --band-color (set on the button inline). At rest
     the band carries a faint tint of its colour so the row reads as a
     narrative palette even before any hover/select. Hover deepens the
     tint; active commits to the full hue. (2026-06-17 user direction:
     "could use a dash of color"; epoch-bands.ts picks the hue per era
     and verifies each one against WCAG-AA on the dark background.) */
  .band {
    position: absolute;
    top: 0;
    height: 100%;
    background: color-mix(in srgb, var(--band-color, #4ecdc4) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--band-color, #4ecdc4) 22%, transparent);
    border-radius: 0;
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 4px 6px;
    overflow: hidden;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  .band:hover {
    background: color-mix(in srgb, var(--band-color, #4ecdc4) 12%, transparent);
    border-color: color-mix(in srgb, var(--band-color, #4ecdc4) 55%, transparent);
  }
  .band.active {
    background: color-mix(in srgb, var(--band-color, #4ecdc4) 20%, transparent);
    border-color: var(--band-color, #4ecdc4);
    color: var(--band-color, #4ecdc4);
    z-index: 2;
  }
  .band-label {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.1;
    text-align: center;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 100%;
  }
  /* WCAG-AA: 9.5 px caption text needs ≥ 4.5:1 contrast on the dark
     band background. White at 0.5 alpha → ~5:1 nominally but the
     band's faint coloured tint pulls effective contrast below that.
     Bumped to 0.78 alpha + slight size bump to 10 px so every meta
     line clears AA across all 9 band hues. (2026-06-17 user note:
     "make sure all labels are readable".) */
  .band-meta {
    margin-top: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.78);
    line-height: 1;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 100%;
  }
  .band.active .band-meta {
    color: color-mix(in srgb, var(--band-color, #4ecdc4) 90%, white);
  }

  .today {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 1.5px;
    background: #ffc850;
    box-shadow: 0 0 6px rgba(255, 200, 80, 0.5);
    pointer-events: none;
    z-index: 3;
  }

  .axis-ticks {
    position: relative;
    height: 14px;
  }
  /* WCAG-AA bump from 0.4 → 0.72 + 9.5 → 10 px. The tick labels sit
     on the dark page background (no band tint) so the math is simpler
     but the prior 0.4 alpha was clearly failing AA. */
  .tick {
    position: absolute;
    top: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.72);
    transform: translateX(-50%);
    pointer-events: none;
  }

  /* ───── Mobile chip carousel (< 720 px) ───── */
  .chips {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    display: flex;
    gap: 6px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .chips li {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
  .chip {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.78);
    padding: 6px 10px;
    border-radius: 14px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    cursor: pointer;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
  }
  .chip:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .chip.active {
    background: color-mix(in srgb, var(--band-color, #4ecdc4) 20%, transparent);
    border-color: var(--band-color, #4ecdc4);
    color: var(--band-color, #4ecdc4);
  }
  /* Mobile chip count badge — AA bump from 0.5 → 0.78 alpha. Sits
     inside the chip's white-tinted pill, which already lifts effective
     contrast vs the page; the bump makes the count legible at a
     glance instead of squinting. */
  .chip-count {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.78);
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 5px;
    border-radius: 8px;
  }
  .chip.active .chip-count {
    color: var(--band-color, #4ecdc4);
    background: rgba(78, 205, 196, 0.12);
  }

  @media (min-width: 720px) {
    .axis-wrap {
      display: block;
    }
    .chips {
      display: none;
    }
  }
</style>
