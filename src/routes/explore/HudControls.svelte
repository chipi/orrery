<script lang="ts">
  import { page } from '$app/state';
  import { agencyToLogoPaths } from '$lib/agency-logo';
  import { launchArScene, launchSkyScene } from '$lib/ar/launch-ar';
  import EnterArButton from '$lib/components/EnterArButton.svelte';
  import EnterSkyButton from '$lib/components/EnterSkyButton.svelte';
  import MobileDrawerGroup from '$lib/components/MobileDrawerGroup.svelte';
  import OrbitRuler from '$lib/components/OrbitRuler.svelte';
  import TacticalScan from '$lib/components/TacticalScan.svelte';
  import { INTERSTELLAR_CRAFT, PATHS_LEGEND, iconicTagline } from '$lib/explore/paths-legend';
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
    layers,
    onToggleLayer,
    onShowPaths,
    pathsLegendEl = $bindable(),
    legendRowEls,
    iconic,
    openMessageCraft,
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
    layers: ExploreLayers;
    onToggleLayer: (key: keyof ExploreLayers) => void;
    onShowPaths: () => void;
    pathsLegendEl: HTMLDivElement | undefined;
    /** The page's array; the desktop legend rows fill it (keyboard nav). */
    legendRowEls: HTMLButtonElement[];
    iconic: IconicSelectionService;
    openMessageCraft: (craftId: string, locale: string) => Promise<void>;
    onLegendKeydown: (e: KeyboardEvent, i: number) => void;
    exploreRegimes: OrbitRegime[];
    openExploreRegime: (id: string) => void;
    focusedStats: PlanetStats | null;
    scanLabel: string;
    focusedRotationHours: number | null;
    focusedLightTime: LightTime | null;
    focusedOnPlanet: boolean;
  } = $props();
</script>

<!-- Secondary HUD controls: 2D/3D toggle + layer chips + paths-legend.
     Defined once as a snippet; rendered inline on desktop, inside
     MobileDrawerGroup accordion on mobile (≤767 px). -->
{#snippet exploreControls()}
  <div class="ctrl-row">
    <button
      class="toggle"
      type="button"
      onclick={toggleView}
      aria-pressed={view === '2d'}
      data-testid="explore-view-toggle"
    >
      {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
    </button>
    {#if hasSelection}
      <button
        class="toggle"
        type="button"
        onclick={onResetView}
        data-testid="explore-reset-view"
        data-audio-stage="explore-reset-view"
      >
        {m.ui_reset_view()}
      </button>
    {/if}
    <EnterArButton onEnter={() => void launchArScene('explore')} />
    <EnterSkyButton onEnter={() => void launchSkyScene()} />
  </div>
  <!-- Inline chips rather than LayerChipRow: the PATHS chip carries
       data-audio-stage which LayerChipRow's interface doesn't expose. -->
  <div class="ctrl-row chips" role="group" aria-label={m.ui_visibility_layers()}>
    <button
      type="button"
      class="chip"
      class:active={layers.planets}
      aria-pressed={layers.planets}
      onclick={() => onToggleLayer('planets')}
      data-testid="layer-planets"
      title={m.explore_layer_tip_planets()}
    >
      {m.ui_layer_planets()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.dwarfs}
      aria-pressed={layers.dwarfs}
      onclick={() => onToggleLayer('dwarfs')}
      data-testid="layer-dwarfs"
      title={m.explore_layer_tip_dwarfs()}
    >
      {m.ui_layer_dwarfs()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.comets}
      aria-pressed={layers.comets}
      onclick={() => onToggleLayer('comets')}
      data-testid="layer-comets"
      title={m.explore_layer_tip_comets()}
    >
      {m.ui_layer_comets()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.interstellar}
      aria-pressed={layers.interstellar}
      onclick={() => onToggleLayer('interstellar')}
      data-testid="layer-interstellar"
      title={m.explore_layer_tip_interstellar()}
    >
      {m.ui_layer_interstellar_short()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.paths}
      aria-pressed={layers.paths}
      onclick={() => onToggleLayer('paths')}
      data-audio-stage="explore-layer-paths"
      data-testid="layer-paths"
      title={m.explore_layer_tip_paths()}
    >
      {m.ui_layer_paths()}
    </button>
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
          bind:this={legendRowEls[i]}
          class:is-selected={iconic.state.selectedId === entry.mission_id}
          class:is-hovered={iconic.state.hoveredId === entry.mission_id}
          aria-pressed={iconic.state.selectedId === entry.mission_id}
          onclick={() =>
            INTERSTELLAR_CRAFT.has(entry.mission_id)
              ? openMessageCraft(entry.mission_id, localeFromPage(page))
              : iconic.selectMission(entry.mission_id, localeFromPage(page))}
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
  role="group"
  aria-label={m.ui_view_controls()}
>
  <button
    class="toggle"
    type="button"
    onclick={toggleView}
    aria-pressed={view === '2d'}
    data-testid="explore-view-toggle-mobile"
  >
    {view === '3d' ? m.ui_view_2d() : m.ui_view_3d()}
  </button>
  {#if hasSelection}
    <button
      class="toggle"
      type="button"
      onclick={onResetView}
      data-testid="explore-reset-view-mobile"
      data-audio-stage="explore-reset-view"
    >
      {m.ui_reset_view()}
    </button>
  {/if}
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
    <button
      type="button"
      class="chip"
      class:active={layers.planets}
      aria-pressed={layers.planets}
      onclick={() => {
        onToggleLayer('planets');
        close();
      }}
      data-testid="layer-planets"
      title={m.explore_layer_tip_planets()}
    >
      {m.ui_layer_planets()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.dwarfs}
      aria-pressed={layers.dwarfs}
      onclick={() => {
        onToggleLayer('dwarfs');
        close();
      }}
      data-testid="layer-dwarfs"
      title={m.explore_layer_tip_dwarfs()}
    >
      {m.ui_layer_dwarfs()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.comets}
      aria-pressed={layers.comets}
      onclick={() => {
        onToggleLayer('comets');
        close();
      }}
      data-testid="layer-comets"
      title={m.explore_layer_tip_comets()}
    >
      {m.ui_layer_comets()}
    </button>
    <button
      type="button"
      class="chip"
      class:active={layers.interstellar}
      aria-pressed={layers.interstellar}
      onclick={() => {
        onToggleLayer('interstellar');
        close();
      }}
      data-testid="layer-interstellar"
      title={m.explore_layer_tip_interstellar()}
    >
      {m.ui_layer_interstellar_short()}
    </button>
  </div>
{/snippet}
{#snippet mobileIconicContent(close: () => void)}
  <!-- Compact trajectory on/off — a much smaller stand-in for the desktop
       chip. onOpen enables the layer when the drawer opens; this toggle lets
       you switch the arcs off without closing the drawer. -->
  <button
    type="button"
    class="iconic-toggle"
    class:active={layers.paths}
    aria-pressed={layers.paths}
    onclick={() => onToggleLayer('paths')}
    data-testid="layer-paths"
    title={m.explore_layer_tip_paths()}
  >
    <span class="iconic-toggle-dot" class:on={layers.paths} aria-hidden="true"></span>
    {m.ui_layer_paths()}
  </button>
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
        class:is-selected={iconic.state.selectedId === entry.mission_id}
        class:is-hovered={iconic.state.hoveredId === entry.mission_id}
        aria-pressed={iconic.state.selectedId === entry.mission_id}
        onclick={() => {
          if (INTERSTELLAR_CRAFT.has(entry.mission_id)) {
            void openMessageCraft(entry.mission_id, localeFromPage(page));
          } else {
            iconic.selectMission(entry.mission_id, localeFromPage(page));
          }
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
      { id: 'ruler', label: 'Ruler', icon: '◎', content: mobileRulerContent },
      { id: 'missions', label: 'Missions', icon: '➤', content: mobileIconicContent },
      { id: 'controls', label: 'Controls', icon: '▤', content: mobileControlsContent },
      // Scan appears only when a focused planet has a tactical readout (#49).
      ...(focusedOnPlanet && focusedStats
        ? [{ id: 'scan', label: 'Scan', icon: '◈', content: mobileScanContent }]
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
     Two rows (mode toggles + visibility chips). Stays under the nav
     but always above the canvas. Pinned to the left so it never
     collides with the right-drawer detail panel on desktop.
     Phone (≤767 px): hidden — MobileDrawerGroup replaces it.
     @min-width: 501 + @min-width: 769 layer desktop spacing + chip
     stretch column back. */
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
    /* Mobile: flex-start so each row takes its natural width (the chip
       row wraps; the toggle row hugs left). align-items: stretch is
       restored at @min-width: 769 so the chip column inherits the
       top-row's computed width — 2026-06-06 user direction: "resize
       those 4 filter chips to fit new width of remaining 2 buttons
       on top". */
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
    /* Mobile: chip row is a single horizontally-scrollable line (A3) so it
       never wraps to a second row and crowds the top edge — even when the
       science lens adds its HR/Light-cone chips. At @min-width: 769 the rail
       returns to a vertical column matching the toggle row's stretch width. */
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    max-width: calc(100vw - 24px);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ctrl-row.chips::-webkit-scrollbar {
    display: none;
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

  /* Layer chips — always-visible visibility toggles. Inactive chips
     are dim outlines; active chips are filled with the teal accent
     so the on-state is obvious. 44 px tall preserves the ADR-018
     touch-target floor.
     #342 Phase 30 — mobile-first: phone values default; desktop
     bumps padding/font/letter-spacing at @min-width: 501 and
     width:100% + chip-stretch column at @min-width: 769. */
  .chip {
    min-height: 44px;
    /* Mobile: chips flow side-by-side, natural width. width: 100%
       (chip-stretch column) reinstated at @min-width: 769. */
    width: auto;
    min-width: 110px;
    padding: 0 8px;
    background: rgba(8, 10, 22, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-align: center;
    border-radius: 999px;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      border-color 120ms,
      background 120ms,
      color 120ms;
  }
  .chip:hover,
  .chip:focus-visible {
    color: #fff;
    border-color: rgba(78, 205, 196, 0.6);
    outline: none;
  }
  .chip.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: rgba(78, 205, 196, 0.7);
    color: #4ecdc4;
  }
  .chip.active:hover,
  .chip.active:focus-visible {
    color: #fff;
    background: rgba(78, 205, 196, 0.32);
    border-color: #4ecdc4;
  }

  /* Compact trajectory on/off inside the Iconic Missions drawer (mobile). */
  .iconic-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 10px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    color: rgba(207, 224, 255, 0.6);
    background: rgba(15, 18, 35, 0.55);
    border: 1px solid rgba(75, 156, 211, 0.3);
    border-radius: 12px;
    cursor: pointer;
  }
  .iconic-toggle.active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.5);
  }
  .iconic-toggle-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(207, 224, 255, 0.25);
    flex-shrink: 0;
  }
  .iconic-toggle-dot.on {
    background: #4ecdc4;
    box-shadow: 0 0 6px rgba(78, 205, 196, 0.7);
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
    border: 1px solid rgba(68, 102, 255, 0.4);
    border-radius: 4px;
    /* Cap height so the 18-row roster doesn't spill off the bottom on
       short viewports (laptop 13" landscape ≈ 720 px; chips row above
       eats ~140 px). Scroll inside the panel when it exceeds the
       available chrome-budget instead of clipping invisibly past the
       footer. The viewport units leave room for nav + the chips
       cluster + a 24 px breathing tail at the bottom. */
    max-height: calc(100vh - var(--nav-height, 60px) - 180px);
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
    background: rgba(68, 102, 255, 0.5);
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
    font-family: 'Crimson Pro', 'Space Mono', serif;
    font-style: italic;
    font-size: 13.5px;
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
    background: rgba(68, 102, 255, 0.15);
    color: #fff;
    outline: none;
  }
  .paths-legend-row.is-selected {
    background: rgba(68, 102, 255, 0.28);
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
    background: rgba(68, 102, 255, 0.12);
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
    color: rgba(221, 228, 255, 0.55);
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
    .toggle {
      padding: 0 14px;
      font-size: 13px;
    }
    .chip {
      padding: 0 10px;
      font-size: 10px;
      letter-spacing: 1.5px;
    }
  }

  /* ─── ≥ 769 px — chip-stretch column + always-on paths legend ──── */
  @media (hover: hover) and (pointer: fine) {
    .paths-legend {
      display: flex;
      /* position: absolute, anchored to the fixed-positioned
         .hud-controls parent. Removed from the flex-column flow so
         its intrinsic content width can no longer drive the chip
         column wider via the parent's align-items: stretch.
         top:100% places it just below the in-flow children (toggle
         row + chip column). (2026-06-17 iteration 2: align-self
         + width was insufficient — the legend still expanded the
         flex container's natural width because flex items
         participate in max-content sizing. Absolute positioning
         fully decouples.) */
      position: absolute;
      top: 100%;
      left: 0;
      right: auto;
      bottom: auto;
      margin-top: 8px;
      width: 280px;
      box-sizing: border-box;
      max-height: calc(100vh - var(--nav-height, 60px) - 220px);
      z-index: 36;
    }
    .ctrl-row.chips {
      /* Layer chips stack vertically so their on/off state reads as a
         compact left-edge column rather than a wide horizontal strip.
         Individual chips set width: 100% so they stretch to match the
         top toggle row via .hud-controls align-items: stretch. */
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
      max-width: none;
    }
    .hud-controls {
      display: flex;
      align-items: stretch;
    }
    .chip {
      width: 100%;
    }
  }

  /* FB5 — controls drawer: chips wrap two-per-row inside the full-width
     accordion panel. flex-grow lets a lone chip (the Iconic-Missions PATHS
     toggle, which lives in its own drawer) stretch to full width, while the
     four Controls chips settle into a tidy 2x2 grid. Scoped to .mdg-body. */
  @media (hover: none), (pointer: coarse) {
    :global(.mdg-body) .ctrl-row.chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    :global(.mdg-body) .ctrl-row.chips .chip {
      flex: 1 1 calc(50% - 3px);
      text-align: center;
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
    }
  }
</style>
