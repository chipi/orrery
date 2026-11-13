<script lang="ts">
  import { page } from '$app/state';
  import { agencyToLogoPaths } from '$lib/agency-logo';
  import { launchArScene, launchSkyScene } from '$lib/ar/launch-ar';
  import EnterArButton from '$lib/components/EnterArButton.svelte';
  import EnterSkyButton from '$lib/components/EnterSkyButton.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import LayerChipRow from '$lib/components/LayerChipRow.svelte';
  import ResetViewButton from '$lib/components/ResetViewButton.svelte';
  import MobileDrawerGroup from '$lib/components/MobileDrawerGroup.svelte';
  import OrbitRuler from '$lib/components/OrbitRuler.svelte';
  import TacticalScan from '$lib/components/TacticalScan.svelte';
  import WhyPopover from '$lib/components/WhyPopover.svelte';
  import { PATHS_LEGEND, iconicTagline } from '$lib/explore/paths-legend';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import type { LightTime, PlanetStats } from '$lib/physics/util/planet-stats';
  import type { OrbitRegime } from '$types/orbit-regime';
  import type { IconicSelectionService } from './iconic-selection.svelte';

  type ExploreLayers = {
    planets: boolean;
    dwarfs: boolean;
    comets: boolean;
    interstellar: boolean;
    paths: boolean;
  };

  let {
    hidden,
    view,
    toggleView,
    hasSelection,
    onResetView,
    clearRightPx = 16,
    layers,
    onToggleLayer,
    onShowPaths,
    pathsLegendEl = $bindable(),
    legendRowEls,
    iconic,
    onLegendKeydown,
    exploreRegimes,
    openExploreRegime,
    focusedStats,
    scanLabel,
    focusedRotationHours,
    focusedLightTime,
    focusedOnPlanet,
  }: {
    /** True outside the solar system (or in a black-hole takeover). */
    hidden: boolean;
    view: '3d' | '2d';
    toggleView: () => void;
    hasSelection: boolean;
    onResetView: () => void;
    /** Pixels kept free at the right edge: a docked panel plus the scale navigator (flush right
     *  at the solar system, beside the panel). The row wraps before it, the worlds' "stop before
     *  the panel" rule (hud-beside-panel). */
    clearRightPx?: number;
    layers: ExploreLayers;
    onToggleLayer: (key: keyof ExploreLayers) => void;
    onShowPaths: () => void;
    pathsLegendEl: HTMLDivElement | undefined;
    /** The page's array; the desktop legend rows fill it (keyboard nav). */
    legendRowEls: HTMLButtonElement[];
    iconic: IconicSelectionService;
    onLegendKeydown: (e: KeyboardEvent, i: number) => void;
    exploreRegimes: OrbitRegime[];
    openExploreRegime: (id: string) => void;
    focusedStats: PlanetStats | null;
    scanLabel: string;
    focusedRotationHours: number | null;
    focusedLightTime: LightTime | null;
    focusedOnPlanet: boolean;
  } = $props();

  const LAYER_CHIPS: {
    key: 'planets' | 'dwarfs' | 'comets' | 'interstellar';
    label: () => string;
    tip: () => string;
  }[] = [
    { key: 'planets', label: m.ui_layer_planets, tip: m.explore_layer_tip_planets },
    { key: 'dwarfs', label: m.ui_layer_dwarfs, tip: m.explore_layer_tip_dwarfs },
    { key: 'comets', label: m.ui_layer_comets, tip: m.explore_layer_tip_comets },
    {
      key: 'interstellar',
      label: m.ui_layer_interstellar_short,
      tip: m.explore_layer_tip_interstellar,
    },
  ];

  /** The layer chips for LayerChipRow, ICONIC MISSIONS first (it opens the legend below the row,
   *  C7 IM7). The phone controls drawer closes after a toggle and leaves PATHS to its own Iconic
   *  Missions tab. */
  function layerChips(after?: () => void, withPaths = true) {
    return [
      ...(withPaths
        ? [
            {
              testid: 'layer-paths',
              label: m.ui_layer_paths,
              title: m.explore_layer_tip_paths(),
              active: () => layers.paths,
              toggle: () => onToggleLayer('paths'),
              attrs: { 'data-audio-stage': 'explore-layer-paths' },
            },
          ]
        : []),
      ...LAYER_CHIPS.map((chip) => ({
        testid: `layer-${chip.key}`,
        label: chip.label,
        title: chip.tip(),
        active: () => layers[chip.key],
        toggle: () => {
          onToggleLayer(chip.key);
          after?.();
        },
      })),
    ];
  }

  // The hovered craft's tagline is a card beside the legend, level with its row, so the list
  // never shifts (C7 IM1, UXD-026). Only the hovered row: a selection opens its panel.
  let tipEl: HTMLDivElement | undefined = $state();
  let tipTop = $state(0);
  const tipId = $derived(iconic.state.hoveredId);
  $effect(() => {
    const id = tipId;
    const legend = pathsLegendEl;
    if (!id || !legend) return;
    const row = legendRowEls[PATHS_LEGEND.findIndex((e) => e.mission_id === id)];
    if (!row) return;
    const box = legend.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const h = tipEl?.offsetHeight ?? 0;
    // Level with the row, kept inside the viewport (a card beside the last rows would run off it).
    tipTop = Math.max(0, Math.min(r.top - box.top - 4, window.innerHeight - 8 - box.top - h));
  });
  let liveText = $state('');
  $effect(() => {
    const id = tipId;
    const t = setTimeout(() => (liveText = id ? iconicTagline(id) : ''), id ? 250 : 0);
    return () => clearTimeout(t);
  });
</script>

<!-- The legend's title (IM1) with the (i) behind which the "why one plane" explanation sits:
     the WhyPopover, click-to-open, with its "Read full" link into /science. -->
{#snippet legendHead()}
  <div class="paths-legend-head">
    <p class="paths-legend-title">{m.explore_iconic_tagline_placeholder()}</p>
    <span class="paths-legend-why" data-testid="paths-legend-why">
      <WhyPopover
        title={m.explore_why_plane()}
        body={m.explore_why_plane_body()}
        tab="transfers"
        section="coplanar-trajectories"
        triggerLabel="ⓘ"
        eyebrow=""
      />
    </span>
  </div>
{/snippet}
<!-- Secondary HUD controls: 2D/3D chip + layer chips + paths-legend.
     Defined once as a snippet; rendered inline on desktop, inside
     MobileDrawerGroup accordion on mobile (≤767 px). -->
{#snippet exploreControls()}
  <div class="ctrl-row">
    <Chip
      kind="toggle"
      active={view === '2d'}
      onclick={toggleView}
      data-testid="explore-view-toggle"
    >
      {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
    </Chip>
    <ResetViewButton
      onclick={onResetView}
      data-testid="explore-reset-view"
      data-audio-stage="explore-reset-view"
      disabled={!hasSelection}
    />
    <EnterArButton onEnter={() => void launchArScene('explore')} />
    <EnterSkyButton onEnter={() => void launchSkyScene()} />
  </div>
  <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
    <LayerChipRow chips={layerChips()} />
  </div>
  {#if layers.paths}
    <div
      class="paths-legend"
      bind:this={pathsLegendEl}
      role="group"
      aria-label={m.explore_trajectory_legend_aria()}
    >
      {@render legendHead()}
      <!-- Hover brightens the arc + shows the tagline in the card beside the row but does NOT
           open the panel — click commits. Intentional after the 2026-06-19 render-storm from
           async getMission() on every mouseenter. The card is drawn at once; a separate live region
           reads the tagline once the pointer has rested 250 ms, so a sweep over the rows is not
           read row by row. -->
      <div
        class="paths-legend-tip"
        class:is-on={!!tipId}
        bind:this={tipEl}
        style:top="{tipTop}px"
        aria-hidden="true"
        data-testid="paths-legend-tip"
      >
        {#if tipId}{iconicTagline(tipId)}{/if}
      </div>
      <div class="paths-legend-live" aria-live="polite" data-testid="paths-legend-live">
        {liveText}
      </div>
      <div class="paths-legend-list">
        {#each PATHS_LEGEND as entry, i (entry.mission_id)}
          <button
            type="button"
            class="paths-legend-row"
            data-a4-keep="legend row, not a chip"
            bind:this={legendRowEls[i]}
            class:is-selected={iconic.state.selectedId === entry.mission_id}
            class:is-hovered={iconic.state.hoveredId === entry.mission_id}
            aria-pressed={iconic.state.selectedId === entry.mission_id}
            onclick={() => iconic.selectMission(entry.mission_id, localeFromPage(page))}
            onkeydown={(e) => onLegendKeydown(e, i)}
            onmouseenter={() => {
              iconic.state.hoveredId = entry.mission_id;
            }}
            onfocus={() => {
              iconic.state.hoveredId = entry.mission_id;
            }}
            onblur={() => {
              if (iconic.state.hoveredId === entry.mission_id) {
                iconic.state.hoveredId = null;
              }
            }}
            onmouseleave={() => {
              iconic.state.hoveredId = null;
            }}
            data-testid="paths-legend-row-{entry.mission_id}"
            data-audio-stage="iconic-mission-{entry.mission_id}"
          >
            <span class="swatch" style="background-color: {entry.color};" aria-hidden="true"></span>
            <span class="name">{entry.name}</span>
            <span class="logos" aria-hidden="true">
              {#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}
                <img src={logoPath} alt="" loading="lazy" />
              {/each}
            </span>
            <span class="year">{entry.launch_year}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
{/snippet}
<!-- Desktop cluster — hidden on mobile (≤767 px) via CSS. -->
<div
  class="hud-controls"
  class:context-hidden={hidden}
  style:--hud-clear-right="{clearRightPx}px"
  data-audio-stage="explore-hud"
  role="group"
  aria-label={m.ui_view_controls()}
>
  {@render exploreControls()}
</div>
<!-- Mobile-only: 2D/3D toggle + Reset View fixed at top-left (mirrors
     desktop .hud-controls corner; .hud-controls itself is desktop-only). -->
<div
  class="hud-top-mobile"
  class:context-hidden={hidden}
  style:--hud-clear-right="{clearRightPx}px"
  role="group"
  aria-label={m.ui_view_controls()}
>
  <Chip
    kind="toggle"
    active={view === '2d'}
    onclick={toggleView}
    data-testid="explore-view-toggle-mobile"
  >
    {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
  </Chip>
  <ResetViewButton
    onclick={onResetView}
    data-testid="explore-reset-view-mobile"
    data-audio-stage="explore-reset-view"
    disabled={!hasSelection}
  />
  <EnterArButton onEnter={() => void launchArScene('explore')} />
  <EnterSkyButton onEnter={() => void launchSkyScene()} />
</div>
<!-- Mobile-only: 3-tab accordion — Orbit Ruler | Controls | Iconic Missions.
     Desktop uses .hud-controls (above) + .ruler-desktop-only (below). -->
{#snippet mobileRulerContent(close: () => void)}
  {#if exploreRegimes.length > 0 && !hidden}
    <OrbitRuler
      regimes={exploreRegimes}
      highlightRegime={null}
      collapsible={false}
      onSelect={(id) => {
        openExploreRegime(id);
        close();
      }}
      surfaceAnchor={null}
    />
  {/if}
{/snippet}
{#snippet mobileControlsContent(close: () => void)}
  <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
    <LayerChipRow chips={layerChips(close, false)} />
  </div>
{/snippet}
{#snippet mobileIconicContent(close: () => void)}
  <!-- Compact trajectory on/off — a much smaller stand-in for the desktop
       chip. onOpen enables the layer when the drawer opens; this toggle lets
       you switch the arcs off without closing the drawer. -->
  <div class="iconic-row">
    <Chip
      kind="toggle"
      dot
      active={layers.paths}
      onclick={() => onToggleLayer('paths')}
      data-testid="layer-paths"
      title={m.explore_layer_tip_paths()}
    >
      {m.ui_layer_paths()}
    </Chip>
  </div>
  <div class="paths-legend" role="group" aria-label={m.explore_trajectory_legend_aria()}>
    {@render legendHead()}
    <div class="paths-legend-list">
      {#each PATHS_LEGEND as entry, i (entry.mission_id)}
        <button
          type="button"
          class="paths-legend-row"
          data-a4-keep="legend row, not a chip"
          class:is-selected={iconic.state.selectedId === entry.mission_id}
          class:is-hovered={iconic.state.hoveredId === entry.mission_id}
          aria-pressed={iconic.state.selectedId === entry.mission_id}
          onclick={() => {
            iconic.selectMission(entry.mission_id, localeFromPage(page));
            close();
          }}
          onkeydown={(e) => onLegendKeydown(e, i)}
          onmouseenter={() => {
            iconic.state.hoveredId = entry.mission_id;
          }}
          onfocus={() => {
            iconic.state.hoveredId = entry.mission_id;
          }}
          onblur={() => {
            if (iconic.state.hoveredId === entry.mission_id) {
              iconic.state.hoveredId = null;
            }
          }}
          onmouseleave={() => {
            iconic.state.hoveredId = null;
          }}
          data-testid="paths-legend-row-{entry.mission_id}"
          data-audio-stage="iconic-mission-{entry.mission_id}"
        >
          <span class="swatch" style="background-color: {entry.color};" aria-hidden="true"></span>
          <span class="name">{entry.name}</span>
          <span class="logos" aria-hidden="true">
            {#each agencyToLogoPaths(entry.agency) as logoPath (logoPath)}
              <img src={logoPath} alt="" loading="lazy" />
            {/each}
          </span>
          <span class="year">{entry.launch_year}</span>
        </button>
      {/each}
    </div>
  </div>
{/snippet}
<!-- Mobile "Scan" tab (#49) — the planet-stats tactical scan folded into the
     drawer, mirroring the surface route's Scan tab (#386). The floating overlay
     is desktop-only (too tall for a phone); on mobile this inline copy is the
     readout. Only present when the camera has settled on a planet with stats. -->
{#snippet mobileScanContent(_close: () => void)}
  <div class="mobile-scan">
    <TacticalScan
      stats={focusedStats}
      bodyLabel={scanLabel}
      rotationHours={focusedRotationHours}
      lightTime={focusedLightTime}
      inline
    />
  </div>
{/snippet}
<!-- Mobile solar-system drawers (ruler/controls/missions/index) — solar-system
     only; the neighborhood + BodyScenes have their own chrome. -->
{#if !hidden}
  <MobileDrawerGroup
    tabs={[
      // B3: fixed semantic slot order [Measure][Overlays][Highlight][Scene];
      // empty slots (no Overlays in solar-system) are simply omitted.
      { id: 'ruler', label: m.drawer_tab_ruler(), icon: '◎', content: mobileRulerContent },
      { id: 'missions', label: m.drawer_tab_missions(), icon: '➤', content: mobileIconicContent },
      { id: 'controls', label: m.drawer_tab_controls(), icon: '▤', content: mobileControlsContent },
      // Scan appears only when a focused planet has a tactical readout (#49).
      ...(focusedOnPlanet && focusedStats
        ? [{ id: 'scan', label: m.drawer_tab_scan(), icon: '◈', content: mobileScanContent }]
        : []),
    ]}
    onOpen={(id) => {
      if (id === 'missions') onShowPaths();
    }}
    bottomInline
    --mcd-bottom="calc(56px + env(safe-area-inset-bottom, 0px))"
  />
{/if}

<style>
  /* Solar-system chrome hidden out in the stellar neighborhood. */
  .context-hidden {
    display: none !important;
  }

  /* Mobile "Scan" drawer tab body (#49) — stacks the inline tactical scan;
     mirrors the surface route's .mobile-scan. */
  .mobile-scan {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* HUD controls cluster — top-left, opposite the detail panel.
     One row on a fine pointer (view actions + visibility chips). Stays under the nav
     but always above the canvas. Pinned to the left so it never
     collides with the right-drawer detail panel on desktop.
     Phone (≤767 px): hidden — MobileDrawerGroup replaces it.
     @min-width: 501 relaxes the spacing; a fine pointer shows it. */
  .hud-controls {
    position: fixed;
    /* Mobile: tucked at left:8 / top:nav+8 / gap:6 to fit a 375 px
       viewport. Relaxed at @min-width: 501. */
    top: calc(var(--nav-height) + 8px);
    left: 8px;
    /* Above .time-controls (z-index 40) so the iconic-mission legend that
       hangs off this cluster sits over the time scrubber, not under it.
       Stays below the sizes modal / backdrop (60/61). */
    z-index: 45;
    display: none;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    pointer-events: none; /* children re-enable */
  }
  .ctrl-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    pointer-events: auto;
  }
  .ctrl-row.chips {
    /* One flat row (UXD-015), the same as on the worlds: wraps between chips where the
       width runs out. */
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    max-width: calc(100vw - 24px);
  }
  .ctrl-row.chips :global(.ui-chip) {
    flex: none;
  }
  .iconic-row {
    margin-bottom: 8px;
  }
  .paths-legend {
    pointer-events: auto;
    /* Hidden by default on phones; shown on a fine pointer (always on) and inside the
       MobileDrawerGroup via :global below. */
    display: none;
    flex-direction: column;
    padding: 8px 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid var(--color-accent-edge);
    border-radius: 4px;
    /* Cap height so the 18-row roster never spills past the footer on a short window; the page
       measures the legend's real top and tightens this (sizePathsLegend). Only the row list
       scrolls: the title and the (i)'s popover stay put and are never clipped. */
    max-height: calc(100vh - var(--nav-height) - 180px);
  }
  /* Inside the mobile drawer the legend flows naturally; no fixed
     positioning needed — the drawer handles its own scroll. */
  :global(.mdg-body) .paths-legend {
    display: flex;
  }
  .paths-legend-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .paths-legend-list::-webkit-scrollbar {
    width: 6px;
  }
  .paths-legend-list::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-accent) 50%, transparent);
    border-radius: 3px;
  }
  /* Title row (C7 IM1): the line that says what to do, with the (i) at its inline end. */
  .paths-legend-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 2px 2px 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex: none;
  }
  .paths-legend-title {
    margin: 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-meta);
    line-height: 1.35;
    letter-spacing: 0.02em;
    color: rgba(221, 228, 255, 0.78);
  }
  .paths-legend-why {
    flex: none;
    display: inline-flex;
  }
  /* The WhyPopover's trigger is a 14 px "Why?" chip; here it is a 20 px (i) (24 px hit area from
     .ui-hit), and its popover opens under it, right-aligned inside the legend's width. */
  .paths-legend-why :global(.trigger) {
    width: 20px;
    height: 20px;
    margin-left: 0;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
    font-size: var(--size-meta);
    letter-spacing: 0;
    text-transform: none;
  }
  .paths-legend-why :global(.popover) {
    font-family: var(--font-editorial);
  }
  /* AGENTS.md: a touch target is 44 x 44 px; the 20 px (i) keeps its look, the hit area grows. */
  @media (hover: none), (pointer: coarse) {
    .paths-legend-why :global(.trigger)::after {
      width: 44px;
      height: 44px;
    }
  }
  @media (min-width: 601px) {
    .paths-legend-why :global(.popover) {
      left: auto;
      right: auto;
      inset-inline-start: auto;
      inset-inline-end: 0;
      width: 250px;
    }
  }
  /* The hovered craft's tagline: a card beside the legend, level with its row. Desktop only. */
  .paths-legend-tip {
    display: none;
    position: absolute;
    left: calc(100% + 8px);
    width: 240px;
    box-sizing: border-box;
    padding: 8px 10px;
    background: rgba(15, 18, 35, 0.92);
    border: 1px solid var(--color-accent-edge);
    border-radius: 4px;
    font-family: var(--font-editorial);
    font-size: var(--size-lead);
    line-height: 1.4;
    color: rgba(221, 228, 255, 0.92);
    opacity: 0;
    pointer-events: none;
    transition: opacity 80ms linear;
  }
  .paths-legend-live {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .paths-legend-tip.is-on {
    opacity: 1;
  }
  /* Single-line row: swatch, name, agency logos, launch year. */
  .paths-legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    color: #dde4ff;
    padding: 5px 6px;
    border-radius: 3px;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 0.04em;
    min-height: 36px;
    width: 100%;
  }
  .paths-legend-row:hover,
  .paths-legend-row:focus-visible,
  /* is-hovered mirrors :hover but is driven by iconic.state.hoveredId, so
     hovering a trajectory in the 3D scene highlights its legend row too
     (reverse of row-hover → arc highlight). #306 follow-up. */
  .paths-legend-row.is-hovered {
    background: var(--color-accent-soft);
    color: #fff;
    outline: none;
  }
  .paths-legend-row.is-selected {
    background: color-mix(in srgb, var(--color-accent) 28%, transparent);
    color: #fff;
    box-shadow: inset 2px 0 0 rgba(140, 170, 255, 0.95);
  }
  .paths-legend-row.is-selected .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row.is-selected .year {
    color: rgba(255, 255, 255, 0.95);
  }
  .paths-legend-row .swatch {
    display: inline-block;
    width: 18px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .paths-legend-row .name {
    flex: 1;
  }
  .paths-legend-row .logos {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 6px;
  }
  .paths-legend-row .logos img {
    height: 14px;
    width: auto;
    max-width: 24px;
    opacity: 0.7;
    filter: grayscale(0.4);
    object-fit: contain;
  }
  .paths-legend-row:hover .logos img,
  .paths-legend-row:focus-visible .logos img,
  .paths-legend-row.is-hovered .logos img {
    opacity: 1;
    filter: none;
  }
  .paths-legend-row .year {
    color: rgba(221, 228, 255, 0.6);
    font-size: 11px;
    letter-spacing: 0.02em;
    margin-left: 8px;
  }
  .paths-legend-row:hover .year,
  .paths-legend-row:focus-visible .year,
  .paths-legend-row.is-hovered .year {
    color: rgba(255, 255, 255, 0.85);
  }

  /* ─── ≥ 501 px — relax phone-tight cluster spacing ─────────────── */
  @media (min-width: 501px) {
    .hud-controls {
      left: 16px;
      top: calc(var(--nav-height) + 12px);
      gap: 8px;
    }
  }

  /* ─── fine pointer — HUD shown + always-on paths legend ─────────── */
  @media (hover: hover) and (pointer: fine) {
    .paths-legend {
      display: flex;
      /* position: absolute, anchored to the fixed-positioned .hud-controls parent, so its
         content width cannot widen the chip row (flex items take part in max-content
         sizing, so align-self + width was not enough — 2026-06-17). top:100% places it just
         below the in-flow children (view row + chip row). */
      position: absolute;
      top: 100%;
      left: 0;
      right: auto;
      bottom: auto;
      margin-top: 8px;
      width: 280px;
      box-sizing: border-box;
      max-height: calc(100vh - var(--nav-height) - 220px);
      z-index: 36;
    }
    /* 28 px rows (still above the 24 px hit floor): the 18 rows and the title fit a 900 px-high
       window without a scrollbar (C7 IM7). A touch row keeps its 36 px. */
    .paths-legend-row {
      min-height: 28px;
      padding: 3px 6px;
    }
    .paths-legend-tip {
      display: block;
    }
    /* One HUD row (operator 2026-11-12), the same as on the worlds: the view actions, a 12 px
       gap, then the layer chips; it wraps where the width runs out. */
    .hud-controls {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px 12px;
      /* left 16 (above) to the navigator's left edge minus its gutter. */
      max-width: calc(100vw - 16px - var(--hud-clear-right, 16px));
    }
    .ctrl-row.chips {
      max-width: 100%;
    }
  }

  /* FB2 — mobile-only top cluster: 2D/3D toggle + Reset View, mirroring the
     desktop .hud-controls top-left corner (.hud-controls itself is desktop-only). */
  .hud-top-mobile {
    display: none;
  }
  @media (hover: none), (pointer: coarse) {
    .hud-top-mobile {
      display: flex;
      position: fixed;
      top: calc(var(--nav-height) + 8px);
      left: 8px;
      gap: 6px;
      z-index: 45;
      /* Stops before the navigator, as the desktop row does; a long Reset label (fr at 360 px)
         wraps onto a second line instead of running under the picker. */
      flex-wrap: wrap;
      max-width: calc(100vw - 8px - var(--hud-clear-right, 16px));
    }
  }
</style>
