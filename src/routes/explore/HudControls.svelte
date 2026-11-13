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
  import { PATHS_LEGEND, iconicTagline } from '$lib/explore/paths-legend';
  import { localeFromPage, localHref } from '$lib/locale';
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

  /** The layer chips for LayerChipRow. The phone controls drawer closes after a toggle and
   *  leaves PATHS to its own Iconic Missions tab. */
  function layerChips(after?: () => void, withPaths = true) {
    return [
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
    ];
  }
</script>

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
      <a
        class="paths-legend-why"
        href={localHref(`/science/transfers/coplanar-trajectories`)}
        data-testid="paths-legend-why"
      >
        {m.explore_why_plane()}
      </a>
      <!-- Hover brightens the arc + swaps the tagline but does NOT open
           the panel — click commits. Intentional after the 2026-06-19
           render-storm from async getMission() on every mouseenter. -->
      <div class="paths-legend-tagline" aria-live="polite">
        {#if iconic.state.hoveredId}
          {iconicTagline(iconic.state.hoveredId)}
        {:else if iconic.state.selectedId}
          {iconicTagline(iconic.state.selectedId)}
        {:else}
          {m.explore_iconic_tagline_placeholder()}
        {/if}
      </div>
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
    <a
      class="paths-legend-why"
      href={localHref(`/science/transfers/coplanar-trajectories`)}
      data-testid="paths-legend-why"
    >
      {m.explore_why_plane()}
    </a>
    <div class="paths-legend-tagline" aria-live="polite">
      {#if iconic.state.hoveredId}
        {iconicTagline(iconic.state.hoveredId)}
      {:else if iconic.state.selectedId}
        {iconicTagline(iconic.state.selectedId)}
      {:else}
        {m.explore_iconic_tagline_placeholder()}
      {/if}
    </div>
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
    /* Hidden by default on phones; shown at @min-width: 769 (desktop
       always-on) and inside the MobileDrawerGroup via :global below. */
    display: none;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: rgba(15, 18, 35, 0.85);
    border: 1px solid var(--color-accent-edge);
    border-radius: 4px;
    /* Cap height so the 18-row roster doesn't spill off the bottom on
       short viewports (laptop 13" landscape ≈ 720 px; chips row above
       eats ~140 px). Scroll inside the panel when it exceeds the
       available chrome-budget instead of clipping invisibly past the
       footer. The viewport units leave room for nav + the chips
       cluster + a 24 px breathing tail at the bottom. */
    max-height: calc(100vh - var(--nav-height) - 180px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  /* Inside the mobile drawer the legend flows naturally; no fixed
     positioning needed — the drawer handles its own scroll. */
  :global(.mdg-body) .paths-legend {
    display: flex;
  }
  .paths-legend::-webkit-scrollbar {
    width: 6px;
  }
  .paths-legend::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--color-accent) 50%, transparent);
    border-radius: 3px;
  }
  /* Single-line row — name + logos + year. Slightly more compact
     than the pre-tagline original (44 px → 36 px min-height) per
     2026-06-17 user feedback; the "why it's iconic" copy lives in
     the .paths-legend-tagline strip above so individual rows stay
     stable-width regardless of tagline length. */
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
  /* Hovered-mission tagline strip. Always rendered (with a placeholder
     when no row is hovered) so the legend's vertical footprint is
     stable; only the strip's text changes. Italic + dim by default,
     full-opacity when a row is hovered. Sized generously (2026-06-17
     user note: "text is so small for description I cannot read, be
     generous and use few rows if needed there somehow") — 13.5 px
     italic Crimson Pro with 1.45 line-height, min-height reserves
     ~3 lines so short and long taglines both render without a
     vertical layout shift. */
  .paths-legend-tagline {
    margin: 4px 0 8px;
    padding: 8px 8px 10px;
    font-size: var(--size-lead);
    line-height: 1.45;
    color: rgba(221, 228, 255, 0.78);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    min-height: 76px;
    background: rgba(8, 10, 22, 0.4);
    border-radius: 3px;
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
  .paths-legend-why {
    display: block;
    padding: 4px 6px 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(221, 228, 255, 0.65);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.02em;
    text-decoration: none;
  }
  .paths-legend-why:hover,
  .paths-legend-why:focus-visible {
    color: #fff;
    background: var(--color-accent-soft);
    outline: none;
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
