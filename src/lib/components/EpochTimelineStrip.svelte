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
  import type { FleetEpoch, FleetIndexEntry } from '$types/fleet';

  interface Epoch {
    id: FleetEpoch;
    label: string;
    yearStart: number;
    yearEnd: number;
  }

  // Year ranges intentionally overlap where two strands ran concurrently
  // (Shuttle program straddles First Stations + ISS Assembly epochs).
  // Start/end clamp to a fixed 1957 → 2030 axis for stable layout.
  const EPOCHS: Epoch[] = [
    { id: 'first-steps', label: 'First Steps', yearStart: 1957, yearEnd: 1961 },
    { id: 'space-race', label: 'Space Race', yearStart: 1961, yearEnd: 1969 },
    { id: 'lunar-era', label: 'Lunar Era', yearStart: 1969, yearEnd: 1972 },
    { id: 'first-stations', label: 'First Stations', yearStart: 1973, yearEnd: 1986 },
    { id: 'shuttle-and-mir', label: 'Shuttle & Mir', yearStart: 1981, yearEnd: 1998 },
    { id: 'iss-assembly', label: 'ISS Assembly', yearStart: 1998, yearEnd: 2011 },
    { id: 'commercial-era', label: 'Commercial Era', yearStart: 2011, yearEnd: 2024 },
    { id: 'lunar-return', label: 'Lunar Return', yearStart: 2024, yearEnd: 2030 },
  ];

  const AXIS_MIN = 1957;
  const AXIS_MAX = 2030;
  const AXIS_RANGE = AXIS_MAX - AXIS_MIN;

  type Props = {
    entries: FleetIndexEntry[];
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
  };

  let { entries, selected, onSelect }: Props = $props();

  let countByEpoch = $derived(() => {
    const map = new Map<FleetEpoch, number>();
    for (const e of entries) {
      map.set(e.epoch, (map.get(e.epoch) ?? 0) + 1);
    }
    return map;
  });

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
      {#each EPOCHS as ep (ep.id)}
        <button
          type="button"
          class="band"
          class:active={selected === ep.id}
          style:left="{pctLeft(ep.yearStart)}%"
          style:width="{pctWidth(ep.yearStart, ep.yearEnd)}%"
          onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
          onkeydown={(e) => handleKey(e, ep.id)}
          aria-label="{ep.label} ({ep.yearStart}–{ep.yearEnd}, {countByEpoch().get(ep.id) ??
            0} entries)"
        >
          <span class="band-label">{ep.label}</span>
          <span class="band-meta"
            >{ep.yearStart}–{ep.yearEnd === 2030 ? '∞' : ep.yearEnd} · {countByEpoch().get(ep.id) ??
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
    {#each EPOCHS as ep (ep.id)}
      <li>
        <button
          type="button"
          class="chip"
          class:active={selected === ep.id}
          role="radio"
          aria-checked={selected === ep.id}
          onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
        >
          {ep.label}
          <span class="chip-count">{countByEpoch().get(ep.id) ?? 0}</span>
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

  .band {
    position: absolute;
    top: 0;
    height: 100%;
    background: rgba(78, 205, 196, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
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
      border-color 0.15s;
  }
  .band:hover {
    background: rgba(78, 205, 196, 0.1);
    border-color: rgba(78, 205, 196, 0.4);
  }
  .band.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
    color: #4ecdc4;
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
  .band-meta {
    margin-top: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 100%;
  }
  .band.active .band-meta {
    color: rgba(78, 205, 196, 0.85);
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
  .tick {
    position: absolute;
    top: 2px;
    font-family: 'Space Mono', monospace;
    font-size: 9.5px;
    color: rgba(255, 255, 255, 0.4);
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
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
    color: #4ecdc4;
  }
  .chip-count {
    font-size: 9.5px;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 5px;
    border-radius: 8px;
  }
  .chip.active .chip-count {
    color: #4ecdc4;
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
