<!--
  OrbitRuler — vertical altitude reference for /earth's orbital regimes (#354).

  Pinned to the LOWER-LEFT corner of the SurfaceScene at all viewport
  widths (per 2026-06-22 user direction — "always visible"). Vertical
  stack from L2 (top) → LEO (bottom), with a synthetic SURFACE row
  below. Each band:
   - regime color (mirrors REGIME_COLORS the orbit rings use)
   - short name (LEO / MEO / …)
   - altitude in km
  Click a band → emits the regime id via `onSelect`.

  Width and font compress on phone-sized viewports but the ruler is
  never hidden or collapsed.

  Bands are equal-height — real altitudes span six orders of magnitude
  (LEO 400 km → L2 1.5M km), so a true-scale ruler would pancake every
  Earth-orbit band into a sliver. The regime panel (RegimePanel.svelte)
  carries the scale comparisons; this surface teaches the regime
  vocabulary + click-into-detail.

  Bands appear bottom→top in conventional altitude order:
   SURFACE → LEO → HEO → MEO → GEO → MOON → L2
  HEO sits between LEO and MEO since its perigee/apogee straddle that
  region (Molniya: perigee 1,000 km, apogee 40,000 km).
-->
<script lang="ts">
  import type { OrbitRegime } from '$types/orbit-regime';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    regimes: OrbitRegime[];
    onSelect: (regimeId: string) => void;
    /** Regime to flag on the ruler — set by /earth when an orbiter is
     *  selected. Per 2026-06-22 user direction the ruler should "flag
     *  which ruler section it exists in" for the active orbit. */
    highlightRegime?: string | null;
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
  }
  let { regimes, onSelect, highlightRegime = null, order, surfaceAnchor }: Props = $props();

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

  function fmtKm(alt: number | [number, number]): string {
    if (typeof alt === 'number') {
      return alt >= 1000 ? `${(alt / 1000).toFixed(0)},000 km` : `${alt} km`;
    }
    const [lo, hi] = alt;
    const fmt = (x: number) => (x >= 1000 ? `${(x / 1000).toFixed(0)}k` : `${x}`);
    return `${fmt(lo)}-${fmt(hi)} km`;
  }
  function fmtAU(d: number | [number, number]): string {
    const fmt = (x: number) => {
      if (x < 10) return x.toFixed(1);
      if (x < 1000) return x.toFixed(0);
      if (x < 10000) return `${(x / 1000).toFixed(1)}k`;
      return `${(x / 1000).toFixed(0)}k`;
    };
    if (typeof d === 'number') return `${fmt(d)} AU`;
    return `${fmt(d[0])}-${fmt(d[1])} AU`;
  }
  function fmtBand(r: OrbitRegime): string {
    if (r.altitude_km != null) return fmtKm(r.altitude_km);
    if (r.distance_au != null) return fmtAU(r.distance_au);
    return '';
  }
</script>

<aside class="ruler" aria-label={m.earth_orbit_ruler_aria()}>
  <h3 class="ruler-title">{m.earth_orbit_ruler_title()}</h3>
  <ul class="ruler-bands">
    {#each ordered as r (r.id)}
      <li>
        <button
          type="button"
          class="band"
          class:band--highlighted={r.id === highlightRegime}
          style:--regime-color={r.color}
          aria-current={r.id === highlightRegime ? 'true' : undefined}
          onclick={() => onSelect(r.id)}
        >
          {#if r.id === highlightRegime}
            <span class="band-flag" aria-hidden="true">▸</span>
          {:else}
            <span class="band-dot" aria-hidden="true"></span>
          {/if}
          <span class="band-name">{r.short ?? r.id}</span>
          <span class="band-alt">{fmtBand(r)}</span>
        </button>
      </li>
    {/each}
    {#if surfaceAnchor !== null}
      {@const anchor = surfaceAnchor ?? { label: m.earth_orbit_ruler_surface(), value: '0 km' }}
      <li class="surface-row" aria-hidden="true">
        <span class="surface-line"></span>
        <span class="surface-label">{anchor.label}</span>
        <span class="surface-alt">{anchor.value}</span>
      </li>
    {/if}
  </ul>
</aside>

<style>
  /* Pinned LOWER-LEFT and always visible — per 2026-06-22 user note
     "move this to lower left corner so it is always visible". `bottom`
     leaves room above the global footer bar (Gallery / Credits / etc.)
     and above the centred nation legend (bottom: 48 / centred).
     z-index 1 (very low) — the ruler is a passive reference, NEVER
     competes with overlay UI for the same screen real estate. Any
     other panel, sheet, drawer, or popover in this region paints on
     top (per 2026-06-22 user direction "send ruler always in
     background if something shows up in the same place"). */
  .ruler {
    position: absolute;
    left: 12px;
    /* Lifted from 56 to 80 px so the ruler clears the bottom-left
       reference panel (/explore's .earth-compare, /mars' altitude HUD
       etc.) below it — 2026-06-22 user direction "pull it a bit up
       not to overlap with bottom one". */
    bottom: 80px;
    z-index: 1;
    pointer-events: none;
    color: rgba(255, 255, 255, 0.92);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    background: rgba(8, 12, 22, 0.62);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 10px 12px 8px;
    width: 188px;
    /* Cap height so dense rulers (/explore 8 zones) never overflow off
       the top edge when other overlays (iconic-mission legend, etc.)
       are also showing on the left rail (2026-06-22 user direction
       "make sure pulldowns stack on top of this new control. less
       space for it, but no overflow"). Internal scroll if the band
       count would otherwise exceed the budget. */
    max-height: calc(100vh - var(--nav-height, 60px) - 140px);
    overflow-y: auto;
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
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.55);
  }
  .ruler-bands {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .band {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 5px 8px;
    color: inherit;
    font: inherit;
    cursor: pointer;
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 8px;
    transition:
      background 120ms ease,
      border-color 120ms ease;
  }
  .band:hover,
  .band:focus-visible {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--regime-color);
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
    text-align: left;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .band-alt {
    color: rgba(255, 255, 255, 0.62);
    font-size: 10px;
  }
  .surface-row {
    margin-top: 6px;
    padding: 6px 8px 2px;
    display: grid;
    grid-template-columns: 10px 1fr auto;
    align-items: center;
    gap: 8px;
    border-top: 1px dashed rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.45);
    font-size: 10px;
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

  /* Highlighted band — flagged when an orbiter is selected. The band's
     regime colour bleeds into the background and a small ▸ flag
     replaces the dot. */
  .band--highlighted {
    background: color-mix(in srgb, var(--regime-color) 18%, transparent);
    border-color: var(--regime-color);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--regime-color) 50%, transparent);
  }
  .band-flag {
    color: var(--regime-color);
    font-size: 12px;
    line-height: 1;
    text-align: center;
  }

  /* Tighter footprint on phones — keeps the ruler always visible
     (no chip-collapse) but stops it eating the bottom of a 375 px
     viewport. Width drops from 188 to 152; font 11→10; padding 10→6. */
  @media (max-width: 720px) {
    .ruler {
      width: 152px;
      font-size: 10px;
      padding: 6px 8px 4px;
    }
    .ruler-title {
      font-size: 8px;
      letter-spacing: 0.12em;
      margin-bottom: 4px;
    }
    .band {
      padding: 3px 6px;
      grid-template-columns: 8px 1fr auto;
      gap: 6px;
    }
    .band-alt {
      font-size: 9px;
    }
    .surface-row {
      padding: 4px 6px 1px;
      font-size: 9px;
    }
  }
</style>
