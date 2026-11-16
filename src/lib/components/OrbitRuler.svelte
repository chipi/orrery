<!--
  OrbitRuler — vertical altitude reference for the orbital regimes of /earth, /moon, /mars and the
  heliocentric zones of /explore (#354, UXD-024).

  Sits in the LOWER-LEFT corner of the scene (on the three Worlds inside the HudStackBL column, on
  /explore on its own). Vertical stack from the outermost regime (top) → the innermost (bottom),
  with a synthetic SURFACE row below. Each band is ONE line:
   - regime colour dot (mirrors REGIME_COLORS; the colour stays on the dot only)
   - short name (LEO / MEO / …), ellipsised with the full name as the title when it cannot fit
   - altitude / distance, formatted by orbit-regime-format.ts (the regime panel reads the same)
  Click or Enter on a band → `onSelect(regimeId)`. Hover or keyboard focus → `onPreview(regimeId)`
  so the route can draw that regime in the scene; `activeRegime` is the regime whose panel is open.

  The ruler grows to its longest row (208 → 280 px). The header is a disclosure button: it folds
  the ruler to the header (plus the flagged regime's name), remembered in localStorage and folded
  by default below 560 px of window height (ruler-collapse.ts). The touch drawer passes
  `collapsible={false}`: its tab is the fold.

  Bands are equal-height — real altitudes span six orders of magnitude (LEO 400 km → L2 1.5M km),
  so a true-scale ruler would pancake every Earth-orbit band into a sliver. The regime panel
  (RegimePanel.svelte) carries the scale comparisons; this surface teaches the regime vocabulary
  + click-into-detail.

  Bands appear bottom→top in conventional altitude order:
   SURFACE → LEO → HEO → MEO → GEO → MOON → L2
  HEO sits between LEO and MEO since its perigee/apogee straddle that
  region (Molniya: perigee 1,000 km, apogee 40,000 km).
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { browser } from '$app/environment';
  import type { OrbitRegime } from '$types/orbit-regime';
  import * as m from '$lib/paraglide/messages';
  import { page } from '$app/state';
  import { localeFromPage } from '$lib/locale';
  import { fmtRegimeBand } from '$lib/orbit-regime-format';
  import { initialCollapsed, saveCollapsed } from '$lib/ruler-collapse';

  interface Props {
    regimes: OrbitRegime[];
    onSelect: (regimeId: string) => void;
    /** Hover / keyboard focus on a band (the regime id), cleared with null. */
    onPreview?: (regimeId: string | null) => void;
    /** Regime to flag on the ruler — set by /earth when an orbiter is
     *  selected. Per 2026-06-22 user direction the ruler should "flag
     *  which ruler section it exists in" for the active orbit. */
    highlightRegime?: string | null;
    /** The regime whose panel is open. */
    activeRegime?: string | null;
    /** Explicit top→bottom render order by regime id. When omitted,
     *  regimes stack by descending altitude. /earth passes a curated
     *  list to place HEO (highly elliptical) between LEO and MEO; other
     *  routes typically rely on the altitude default. */
    order?: readonly string[];
    /** Synthetic anchor row painted below the last band. /earth, /moon,
     *  /mars label it "SURFACE / 0 km" so the ruler reads as ground-up.
     *  /explore omits it (set to null) since the Sun is itself the
     *  bottom band and there is no "surface" below it. */
    surfaceAnchor?: { label: string; value: string } | null;
    /** Distance in px from the viewport bottom to pin the ruler when it stands alone (/explore).
     *  Defaults to 80 (clears /explore's bottom-left PLANET SCALES card). Inside a HudStackBL the
     *  stack owns the position and this is unused. */
    anchorBottomPx?: number;
    /** Header folds the ruler (default). The touch drawer passes false. */
    collapsible?: boolean;
    /** Fold the ruler to its header without touching the remembered choice (the iconic legend is
     *  open below it, UXD-026). The header does not toggle while this is true. */
    forceFolded?: boolean;
  }
  let {
    regimes,
    onSelect,
    onPreview,
    highlightRegime = null,
    activeRegime = null,
    order,
    surfaceAnchor,
    anchorBottomPx = 80,
    collapsible = true,
    forceFolded = false,
  }: Props = $props();

  const loc = $derived(localeFromPage(page));
  let collapsed = $state(
    untrack(() => collapsible) && browser ? initialCollapsed(window.innerHeight) : false,
  );
  onMount(() => () => onPreview?.(null));
  const folded = $derived(collapsed || forceFolded);
  $effect(() => {
    if (folded) onPreview?.(null);
  });
  function toggle() {
    if (forceFolded) return;
    collapsed = !collapsed;
    saveCollapsed(collapsed);
  }
  const uid = $props.id();
  const bodyId = `ruler-bands-${uid}`;

  // Render order top→bottom. SURFACE is synthetic (always at 0 km, no
  // panel) — included as a visual anchor so the ruler reads as "ground
  // up", not "magic floating regimes". When the host route omits
  // `order`, regimes are stacked by altitude — single values use the
  // value, ranges use the midpoint. The /earth order is curated
  // (HEO between LEO and MEO since its perigee straddles both); other
  // routes can override.
  type Band = number | [number, number] | undefined;
  function mid(band: Band): number {
    if (band == null) return 0;
    if (typeof band === 'number') return band;
    return (band[0] + band[1]) / 2;
  }
  /** Distance to use for ordering — falls back from km to AU. */
  function midDistance(r: OrbitRegime): number {
    return r.altitude_km != null ? mid(r.altitude_km) : mid(r.distance_au);
  }
  let ordered = $derived(
    order
      ? order
          .map((id) => regimes.find((r) => r.id === id))
          .filter((r): r is OrbitRegime => r != null)
      : [...regimes].sort((a, b) => midDistance(b) - midDistance(a)),
  );
  // Folded, the header still says which section the selected orbiter is in.
  let flagged = $derived(
    ordered.find((r) => r.id === (highlightRegime ?? activeRegime))?.short ?? null,
  );
</script>

<aside
  class="ruler"
  class:ruler--collapsed={collapsible && folded}
  style:--ruler-bottom="{anchorBottomPx}px"
  aria-label={m.earth_orbit_ruler_aria()}
>
  <h3 class="ruler-title">
    {#if collapsible}
      <button
        type="button"
        class="ruler-toggle ui-hit"
        aria-expanded={!folded}
        aria-controls={bodyId}
        data-testid="ruler-toggle"
        onclick={toggle}
      >
        <span class="ruler-title-text"
          >{m.earth_orbit_ruler_title()}{#if folded && flagged}
            · {flagged}{/if}</span
        >
        <span class="ruler-chev" aria-hidden="true">{folded ? '▸' : '▾'}</span>
      </button>
    {:else}
      {m.earth_orbit_ruler_title()}
    {/if}
  </h3>
  <ul class="ruler-bands" id={bodyId} hidden={collapsible && folded}>
    {#each ordered as r (r.id)}
      <li>
        <button
          type="button"
          class="band"
          class:band--highlighted={r.id === highlightRegime}
          class:band--active={r.id === activeRegime}
          style:--regime-color={r.color}
          aria-current={r.id === highlightRegime || r.id === activeRegime ? 'true' : undefined}
          data-regime={r.id}
          title={r.name}
          onclick={() => onSelect(r.id)}
          onpointerenter={() => onPreview?.(r.id)}
          onpointerleave={() => onPreview?.(null)}
          onfocus={(e) => e.currentTarget.matches(':focus-visible') && onPreview?.(r.id)}
          onblur={() => onPreview?.(null)}
        >
          {#if r.id === highlightRegime}
            <span class="band-flag" aria-hidden="true">▸</span>
          {:else}
            <span class="band-dot" aria-hidden="true"></span>
          {/if}
          <span class="band-name">{r.short ?? r.id}</span>
          <span class="band-alt">{fmtRegimeBand(r, loc)}</span>
        </button>
      </li>
    {/each}
    {#if surfaceAnchor !== null}
      {@const anchor = surfaceAnchor ?? {
        label: m.earth_orbit_ruler_surface(),
        value: m.mp_flight_unit_km({ value: '0' }),
      }}
      <li class="surface-row" aria-hidden="true">
        <span class="surface-line"></span>
        <span class="surface-label">{anchor.label}</span>
        <span class="surface-alt">{anchor.value}</span>
      </li>
    {/if}
  </ul>
</aside>

<style>
  /* Standalone (/explore): pinned LOWER-LEFT. The three Worlds put the ruler inside HudStackBL,
     which makes it static (see that component). `bottom` leaves room above the global footer bar
     (--ruler-clear) and any route card (--ruler-bottom).
     z-index 1 (very low) — the ruler is a passive reference, NEVER
     competes with overlay UI for the same screen real estate. Any
     other panel, sheet, drawer, or popover in this region paints on
     top (per 2026-06-22 user direction "send ruler always in
     background if something shows up in the same place"). */
  .ruler {
    position: absolute;
    left: 12px;
    bottom: max(var(--ruler-bottom, 80px), var(--ruler-clear, 0px));
    z-index: 1;
    pointer-events: none;
    color: rgba(255, 255, 255, 0.92);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    background: rgba(8, 12, 22, 0.62);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 10px 12px 8px;
    /* One row, one line: the ruler grows to its longest row (UXD-024). */
    box-sizing: border-box;
    width: max-content;
    min-width: 208px;
    max-width: min(280px, 44vw);
    /* Cap height so dense rulers (/explore 8 zones) never overflow off
       the top edge when other overlays (iconic-mission legend, etc.)
       are also showing on the left rail (2026-06-22 user direction
       "make sure pulldowns stack on top of this new control. less
       space for it, but no overflow"). Internal scroll if the band
       count would otherwise exceed the budget. */
    max-height: min(
      calc(100vh - var(--nav-height) - 140px),
      calc(
        100vh - var(--ruler-top-clear, 0px) -
          max(var(--ruler-bottom, 80px), var(--ruler-clear, 0px))
      )
    );
    overflow-y: auto;
    /* A narrow ruler (the <=600 px cap) cuts its title, it never scrolls sideways. */
    overflow-x: hidden;
    overscroll-behavior: contain;
  }
  .ruler::-webkit-scrollbar {
    width: 4px;
  }
  .ruler::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 2px;
  }
  .ruler > * {
    pointer-events: auto;
  }
  .ruler-title {
    margin: 0 0 8px;
    font-size: var(--size-label);
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--color-text-label);
  }
  .ruler--collapsed .ruler-title {
    margin-bottom: 0;
  }
  .ruler-toggle {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: start;
    cursor: pointer;
  }
  .ruler-toggle:hover,
  .ruler-toggle:focus-visible {
    color: #fff;
    outline: none;
  }
  .ruler-toggle:focus-visible .ruler-chev {
    border-color: var(--color-state);
  }
  .ruler-title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ruler-chev {
    font-size: 12px;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 4px;
    padding: 0 6px;
  }
  .ruler-bands {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ruler-bands[hidden] {
    display: none;
  }
  .band {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 4px 8px;
    color: inherit;
    font: inherit;
    cursor: pointer;
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    transition:
      background 120ms ease,
      border-color 120ms ease;
  }
  /* The row lights in the highlight blue, the same blue the scene draws the regime in; the regime
     colour stays on the dot. */
  .band:hover,
  .band:focus-visible,
  .band--active {
    background: rgba(136, 159, 231, 0.14);
    border-color: var(--color-state);
    outline: none;
  }
  .band-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--regime-color);
    box-shadow: 0 0 8px var(--regime-color);
  }
  .band-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .band-alt {
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.62);
    font-size: var(--size-label);
    font-variant-numeric: tabular-nums;
  }
  .surface-row {
    margin-top: 6px;
    padding: 6px 8px 2px;
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 8px;
    border-top: 1px dashed rgba(255, 255, 255, 0.12);
    color: var(--color-text-label);
    font-size: var(--size-label);
    letter-spacing: 0.06em;
  }
  .surface-line {
    height: 2px;
    background: rgba(180, 180, 180, 0.55);
    border-radius: 1px;
  }
  .surface-label {
    text-align: left;
    font-weight: 700;
  }

  /* Flagged band — set when an orbiter is selected. The band's regime colour bleeds into the
     background and a small ▸ flag replaces the dot. */
  .band--highlighted {
    background: color-mix(in srgb, var(--regime-color) 18%, transparent);
    border-color: var(--regime-color);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--regime-color) 50%, transparent);
  }
  .band--highlighted:hover,
  .band--highlighted:focus-visible,
  .band--highlighted.band--active {
    border-color: var(--color-state);
  }
  .band-flag {
    color: var(--regime-color);
    font-size: 12px;
    line-height: 1;
    text-align: center;
  }

  /* Tighter footprint on short non-touch windows (the touch drawer has its own tab). */
  @media (max-width: 720px) {
    .ruler {
      min-width: 152px;
      max-width: 56vw;
      font-size: var(--size-label);
      padding: 6px 8px 4px;
    }
    .ruler-title {
      font-size: var(--size-label);
      letter-spacing: 0.12em;
      margin-bottom: 4px;
    }
    .band {
      padding: 3px 6px;
      grid-template-columns: 8px minmax(0, 1fr) auto;
      gap: 6px;
    }
    .band-alt {
      font-size: var(--size-label);
    }
    .surface-row {
      padding: 4px 6px 1px;
      font-size: var(--size-label);
    }
  }
</style>
