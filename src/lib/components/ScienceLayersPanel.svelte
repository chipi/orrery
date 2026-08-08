<!--
  ScienceLayersPanel — the unified Science Lens panel.

  When the master Science Lens toggle is on, this panel renders BOTH:
    1. The per-route lens story (optional — pass `title`, `body`, `tab`,
       `section`). Same gold-bordered narrative the old ScienceLensBanner
       used to render in its own panel.
    2. The per-route layer sub-toggles (any layer keys passed in
       `available` that match the global LAYER_ORDER).

  One panel, one collapse control. Replaces the previous two-panel
  arrangement (ScienceLensBanner + ScienceLayersPanel) per the v0.6
  Science-Lens UX pass.

  Per-route conventions today:
    - /explore + /earth + /moon + /mars + /plan: pass lens-story props
      AND `available`.
    - /iss + /tiangong: layers only.
    - /fly: layers only (FlightDirectorBanner still owns the multi-phase
      narration on /fly — it's a different chrome family).
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onScienceLensChange, markScienceLensAvailable } from '$lib/science-lens';
  import {
    LAYER_ORDER,
    ensureLayerDefaults,
    setLayer,
    onLayerChange,
    type LayerKey,
  } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages.js';
  import type { ScienceTabId } from '$types/science';

  type Props = {
    /** Layers meaningful on this route. Empty array = layers section
     *  hidden entirely (panel shows just the lens story). */
    available?: LayerKey[];
    /** Lens-story title — when provided, renders the gold-accent
     *  narrative block at the top of the panel. */
    title?: string;
    /** Lens-story body paragraph — required when `title` is set. */
    body?: string;
    /** Target tab in `/science` for the "→ Read in /science" link. */
    tab?: ScienceTabId;
    /** Target section id in `/science` for the link. */
    section?: string;
    /**
     * Optional "historical foundations" footer — pre-anchored cross-links
     * to landmark /science/history articles relevant to this route's
     * physics. /explore wires Kepler 1609 + Newton 1687 to credit the
     * humans who worked out the math behind the visible orbits. Rendered
     * as compact chips at the bottom of the panel body.
     */
    historicalFoundations?: Array<{ tab: ScienceTabId; section: string; label: string }>;
  };
  let { available = [], title, body, tab, section, historicalFoundations = [] }: Props = $props();

  let lensOn = $state(false);
  // Collapse state: the panel ships COLLAPSED to its strip on first paint (all
  // viewports). The expanded body + 12-layer grid eclipsed ~40% of the 3D scene
  // on /fly — the whole point of turning the lens on is to SEE the overlays, so
  // the scene wins by default and the strip ("SCIENCE LENS ▸") advertises the
  // toggles a click away. State is local-only — re-defaults on next route mount.
  let expanded = $state(false);
  // Per-layer reactive state mirroring the attribute store. Driven by
  // onLayerChange subscriptions so users see immediate feedback even if
  // another part of the app flipped a layer.
  let layerState = $state<Record<LayerKey, boolean>>({
    soi: false,
    hover: false,
    gravity: false,
    velocity: false,
    thrust: false,
    drag: false,
    'ascent-losses': false,
    centripetal: false,
    apsides: false,
    coast: false,
    conics: false,
    microgravity: false,
    atmosphere: false,
    'tidal-lock': false,
    ozone: false,
    galaxies: false,
    'hill-sphere': false,
    'lagrange-points': false,
    magnetosphere: false,
    'sub-solar': false,
    climate: false,
    'planet-stats': false,
    moons: false,
    'axial-tilt': false,
    'mag-north': false,
    tides: false,
    hydrosphere: false,
    'sub-earth': false,
    'far-side': false,
    'dead-dynamo': false,
    'polar-caps': false,
    'mars-moons': false,
    constellations: false,
    'deep-sky': false,
    'hr-diagram': false,
    'light-cones': false,
    'rotation-curve': false,
    'dark-matter-halo': false,
    'stellar-populations': false,
  });

  let stops: Array<() => void> = [];

  // The panel's root element + a ResizeObserver that publishes its rendered
  // height to `--science-lens-height`. Secondary lens panels (e.g. the station
  // orbit banner) read this so they stack directly BELOW the lens on mobile —
  // the science lens always sits on top, everything else under it.
  let panelEl: HTMLElement | null = $state(null);
  let panelResizeObs: ResizeObserver | null = null;

  $effect(() => {
    panelResizeObs?.disconnect();
    panelResizeObs = null;
    if (typeof document === 'undefined') return;
    if (!panelEl) {
      document.documentElement.style.removeProperty('--science-lens-height');
      return;
    }
    const publish = () => {
      if (panelEl) {
        document.documentElement.style.setProperty(
          '--science-lens-height',
          `${panelEl.offsetHeight}px`,
        );
      }
    };
    publish();
    panelResizeObs = new ResizeObserver(publish);
    panelResizeObs.observe(panelEl);
  });

  onMount(() => {
    ensureLayerDefaults();
    // Advertise to <html data-science-lens-available> so the nav
    // lens-toggle knows it can do something on this route — gates
    // the hover-affordance in Nav.svelte.
    stops.push(markScienceLensAvailable());
    stops.push(
      onScienceLensChange((on) => {
        lensOn = on;
      }) ?? (() => {}),
    );
    for (const k of LAYER_ORDER) {
      const stop = onLayerChange(k, (on) => {
        layerState[k] = on;
      });
      if (stop) stops.push(stop);
    }
  });
  onDestroy(() => {
    for (const s of stops) s();
    stops = [];
    panelResizeObs?.disconnect();
    panelResizeObs = null;
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--science-lens-height');
    }
  });

  function toggle(key: LayerKey) {
    setLayer(key, !layerState[key]);
  }

  type LayerMeta = {
    label: string;
    description: string;
    // PRD-024 — optional deeplink to a /science article for layers
    // that have a paired editorial section. Renders a small "→ science"
    // link inside the layer row when provided.
    learn?: { tab: ScienceTabId; section: string };
  };
  function metaFor(key: LayerKey): LayerMeta {
    switch (key) {
      case 'soi':
        return {
          label: m.science_layer_soi_label(),
          description: m.science_layer_soi_desc(),
          learn: { tab: 'transfers', section: 'patched-conics' },
        };
      case 'hover':
        return { label: m.science_layer_hover_label(), description: m.science_layer_hover_desc() };
      case 'gravity':
        return {
          label: m.science_layer_gravity_label(),
          description: m.science_layer_gravity_desc(),
          learn: { tab: 'orbits', section: 'keplerian-orbit' },
        };
      case 'velocity':
        return {
          label: m.science_layer_velocity_label(),
          description: m.science_layer_velocity_desc(),
          learn: { tab: 'orbits', section: 'vis-viva' },
        };
      case 'thrust':
        return {
          label: m.science_layer_thrust_label(),
          description: m.science_layer_thrust_desc(),
          learn: { tab: 'propulsion', section: 'thrust-and-twr' },
        };
      case 'drag':
        return {
          label: m.science_layer_drag_label(),
          description: m.science_layer_drag_desc(),
          learn: { tab: 'mission-phases', section: 'ballistic-coefficient' },
        };
      case 'ascent-losses':
        return {
          label: m.science_layer_ascent_losses_label(),
          description: m.science_layer_ascent_losses_desc(),
          learn: { tab: 'propulsion', section: 'dv-budget' },
        };
      case 'centripetal':
        return {
          label: m.science_layer_centripetal_label(),
          description: m.science_layer_centripetal_desc(),
          learn: { tab: 'orbits', section: 'keplerian-orbit' },
        };
      case 'apsides':
        return {
          label: m.science_layer_apsides_label(),
          description: m.science_layer_apsides_desc(),
          learn: { tab: 'orbits', section: 'apsides' },
        };
      case 'coast':
        return {
          label: m.science_layer_coast_label(),
          description: m.science_layer_coast_desc(),
          learn: { tab: 'transfers', section: 'transfer-ellipse' },
        };
      case 'conics':
        return {
          label: m.science_layer_conics_label(),
          description: m.science_layer_conics_desc(),
          learn: { tab: 'transfers', section: 'conic-sections' },
        };
      case 'microgravity':
        return {
          label: m.science_layer_microgravity_label(),
          description: m.science_layer_microgravity_desc(),
        };
      case 'atmosphere':
        return {
          label: m.science_layer_atmosphere_label(),
          description: m.science_layer_atmosphere_desc(),
        };
      case 'tidal-lock':
        return {
          label: m.science_layer_tidal_lock_label(),
          description: m.science_layer_tidal_lock_desc(),
        };
      case 'ozone':
        return {
          label: m.science_layer_ozone_label(),
          description: m.science_layer_ozone_desc(),
        };
      case 'galaxies':
        return {
          label: m.science_layer_galaxies_label(),
          description: m.science_layer_galaxies_desc(),
        };
      case 'hill-sphere':
        return {
          label: m.science_layer_hill_sphere_label(),
          description: m.science_layer_hill_sphere_desc(),
          learn: { tab: 'orbits', section: 'hill-sphere' },
        };
      case 'lagrange-points':
        return {
          label: m.science_layer_lagrange_points_label(),
          description: m.science_layer_lagrange_points_desc(),
          learn: { tab: 'orbits', section: 'lagrange-points' },
        };
      case 'magnetosphere':
        return {
          label: m.science_layer_magnetosphere_label(),
          description: m.science_layer_magnetosphere_desc(),
          learn: { tab: 'planets', section: 'magnetic-fields' },
        };
      case 'sub-solar':
        return {
          label: m.science_layer_sub_solar_label(),
          description: m.science_layer_sub_solar_desc(),
          learn: { tab: 'planets', section: 'sub-solar-and-terminator' },
        };
      case 'climate':
        return {
          label: m.science_layer_climate_label(),
          description: m.science_layer_climate_desc(),
          learn: { tab: 'planets', section: 'axial-tilt-and-seasons' },
        };
      case 'planet-stats':
        return {
          label: m.science_layer_planet_stats_label(),
          description: m.science_layer_planet_stats_desc(),
          learn: { tab: 'planets', section: 'planetary-stats' },
        };
      case 'moons':
        return {
          label: m.science_layer_moons_label(),
          description: m.science_layer_moons_desc(),
        };
      case 'axial-tilt':
        return {
          label: m.science_layer_axial_tilt_label(),
          description: m.science_layer_axial_tilt_desc(),
          learn: { tab: 'planets', section: 'axial-tilt-and-seasons' },
        };
      case 'mag-north':
        return {
          label: m.science_layer_mag_north_label(),
          description: m.science_layer_mag_north_desc(),
          learn: { tab: 'planets', section: 'magnetic-fields' },
        };
      case 'tides':
        return {
          label: m.science_layer_tides_label(),
          description: m.science_layer_tides_desc(),
          learn: { tab: 'planets', section: 'tides' },
        };
      case 'hydrosphere':
        return {
          label: m.science_layer_hydrosphere_label(),
          description: m.science_layer_hydrosphere_desc(),
        };
      case 'sub-earth':
        return {
          label: m.science_layer_sub_earth_label(),
          description: m.science_layer_sub_earth_desc(),
          learn: { tab: 'transfers', section: 'free-return' },
        };
      case 'far-side':
        return {
          label: m.science_layer_far_side_label(),
          description: m.science_layer_far_side_desc(),
        };
      case 'dead-dynamo':
        return {
          label: m.science_layer_dead_dynamo_label(),
          description: m.science_layer_dead_dynamo_desc(),
          learn: { tab: 'planets', section: 'magnetic-fields' },
        };
      case 'polar-caps':
        return {
          label: m.science_layer_polar_caps_label(),
          description: m.science_layer_polar_caps_desc(),
          learn: { tab: 'planets', section: 'axial-tilt-and-seasons' },
        };
      case 'mars-moons':
        return {
          label: m.science_layer_mars_moons_label(),
          description: m.science_layer_mars_moons_desc(),
        };
      // WS-3 (RFC-037 Contract D) — /explore teaching layers. Labels reuse the
      // former chip keys; descriptions + learn links are new.
      case 'constellations':
        return {
          label: m.explore_constellations_toggle(),
          description: m.science_layer_constellations_desc(),
        };
      case 'deep-sky':
        return {
          label: m.explore_deep_sky_toggle(),
          description: m.science_layer_deep_sky_desc(),
          learn: { tab: 'observation', section: 'galaxy-types' },
        };
      case 'hr-diagram':
        return {
          label: m.explore_lens_hr(),
          description: m.science_layer_hr_diagram_desc(),
          learn: { tab: 'observation', section: 'hertzsprung-russell' },
        };
      case 'light-cones':
        return {
          label: m.explore_lens_causality(),
          description: m.science_layer_light_cones_desc(),
          learn: { tab: 'scales-time', section: 'light-minute' },
        };
      case 'rotation-curve':
        return {
          label: m.explore_mw_lens_rotation(),
          description: m.science_layer_rotation_curve_desc(),
          learn: { tab: 'observation', section: 'our-galaxy' },
        };
      case 'dark-matter-halo':
        return {
          label: m.explore_mw_lens_darkmatter(),
          description: m.science_layer_dark_matter_halo_desc(),
          learn: { tab: 'observation', section: 'our-galaxy' },
        };
      case 'stellar-populations':
        return {
          label: m.explore_mw_lens_populations(),
          description: m.science_layer_stellar_populations_desc(),
          learn: { tab: 'observation', section: 'our-galaxy' },
        };
    }
  }

  let visibleLayers = $derived(available.filter((k) => LAYER_ORDER.includes(k)));
  let hasLensStory = $derived(Boolean(title && body && tab && section));
  let hasLayers = $derived(visibleLayers.length > 0);
</script>

{#if lensOn && (hasLensStory || hasLayers)}
  <aside
    bind:this={panelEl}
    class="panel"
    class:collapsed={!expanded}
    data-testid="science-lens-panel"
    aria-label={m.science_lens_aria()}
  >
    <button
      type="button"
      class="panel-head"
      aria-expanded={expanded}
      aria-controls="science-lens-body"
      data-audio-stage="science-lens-collapse"
      onclick={() => (expanded = !expanded)}
    >
      <span class="eyebrow">SCIENCE LENS{!expanded && hasLensStory ? ` · ${title}` : ''}</span>
      <span class="chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    </button>
    {#if expanded}
      <div id="science-lens-body">
        {#if hasLensStory && tab && section}
          <a class="lens-story" href="{base}/science/{tab}/{section}">
            <div class="lens-title">{title}</div>
            <div class="lens-body">{body}</div>
            <div class="lens-link">→ Read in /science</div>
          </a>
        {/if}
        {#if hasLayers}
          {#if hasLensStory}
            <div class="lens-divider" aria-hidden="true"></div>
          {/if}
          <ul class="rows" aria-label={m.science_layers_aria()}>
            {#each visibleLayers as key (key)}
              {@const meta = metaFor(key)}
              <li class="row">
                <label class="row-label">
                  <input
                    type="checkbox"
                    checked={layerState[key]}
                    onchange={() => toggle(key)}
                    data-testid="science-layer-{key}"
                    data-audio-stage="science-layer-{key}"
                  />
                  <span class="row-name">{meta.label}</span>
                </label>
                <span class="row-desc">
                  {meta.description}
                  {#if meta.learn}
                    <a class="row-learn" href="{base}/science/{meta.learn.tab}/{meta.learn.section}"
                      >→ science</a
                    >
                  {/if}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
        {#if historicalFoundations.length > 0}
          {#if hasLensStory || hasLayers}
            <div class="lens-divider" aria-hidden="true"></div>
          {/if}
          <div class="foundations">
            <div class="foundations-eyebrow">FOUNDATIONS</div>
            <ul class="foundations-list">
              {#each historicalFoundations as ref (ref.section)}
                <li>
                  <a class="foundations-link" href="{base}/science/{ref.tab}/{ref.section}">
                    {ref.label} →
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  /* Top-center floating panel. Was two stacked panels (lens banner +
     layers); collapsed into one per the v0.6 Science-Lens UX pass.
     Sits directly under the nav with a small gap. */
  .panel {
    position: fixed;
    /* Sits below the nav AND below any in-page top-center banner
       (StationOrbitBanner publishes its height to --lens-banner-height).
       Without consuming the variable, the science-lens panel would
       cover the orbit-banner content on /iss + /tiangong. */
    top: calc(var(--nav-height) + var(--lens-banner-height, 0px) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 32;
    width: min(540px, calc(100vw - 32px));
    padding: 10px 14px 12px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
  }
  /* Clickable strip header. Acts as the collapse toggle when expanded
     is true; when collapsed, only this strip is visible so the panel
     is compact. */
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 0;
    margin-bottom: 8px;
    color: inherit;
  }
  .panel.collapsed .panel-head {
    margin-bottom: 0;
  }
  .panel-head:hover .eyebrow,
  .panel-head:focus-visible .eyebrow {
    color: rgba(255, 255, 255, 0.95);
  }
  .panel-head:focus-visible {
    outline: 2px solid rgba(255, 200, 80, 0.6);
    outline-offset: 2px;
    border-radius: 3px;
  }
  .chevron {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    color: rgba(255, 200, 80, 0.85);
    transition: color 120ms;
  }
  .panel-head:hover .chevron {
    color: #ffc850;
  }
  .eyebrow {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
    text-align: left;
  }

  /* Lens-story block — the gold-accent narrative carried over from the
     old ScienceLensBanner. Reads as a single editorial unit; the whole
     block is an anchor to the matching /science section. */
  .lens-story {
    display: block;
    color: var(--color-text);
    text-decoration: none;
    margin-bottom: 4px;
  }
  .lens-story:hover .lens-title,
  .lens-story:focus-visible .lens-title {
    color: #fff;
  }
  .lens-story:focus-visible {
    outline: 2px solid rgba(255, 200, 80, 0.6);
    outline-offset: 2px;
    border-radius: 3px;
  }
  .lens-title {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 6px;
    transition: color 120ms;
  }
  .lens-body {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.78);
    margin-bottom: 6px;
  }
  .lens-link {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
  }
  .lens-divider {
    height: 1px;
    background: rgba(255, 200, 80, 0.18);
    margin: 10px 0 8px;
  }
  .foundations {
    margin-top: 4px;
  }
  .foundations-eyebrow {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 200, 80, 0.65);
    margin-bottom: 6px;
  }
  .foundations-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .foundations-link {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: rgba(255, 220, 150, 0.85);
    text-decoration: none;
  }
  .foundations-link:hover,
  .foundations-link:focus-visible {
    color: rgba(255, 200, 80, 1);
    outline: none;
  }

  /* Two-column layer grid when the wider top-center panel has room.
     Single column on narrow viewports. */
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 14px;
  }
  .row {
    display: flex;
    flex-direction: column;
    padding: 4px 2px;
    border-radius: 3px;
  }
  .row-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .row-label input {
    appearance: none;
    width: 14px;
    height: 14px;
    border: 1px solid rgba(255, 200, 80, 0.5);
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    margin: 0;
  }
  .row-label input:checked {
    background: rgba(255, 200, 80, 0.85);
  }
  .row-label input:checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0px;
    width: 5px;
    height: 9px;
    border: solid #04040c;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  .row-label input:focus-visible {
    outline: 2px solid rgba(255, 200, 80, 0.6);
    outline-offset: 2px;
  }
  .row-name {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.92);
  }
  .row-desc {
    margin: 2px 0 0 22px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 11px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.55);
  }
  .row-learn {
    display: inline-block;
    margin-left: 6px;
    color: rgba(255, 215, 102, 0.85);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-style: normal;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-decoration: none;
    border-bottom: 1px solid rgba(255, 215, 102, 0.25);
  }
  .row-learn:hover,
  .row-learn:focus-visible {
    color: rgba(255, 215, 102, 1);
    border-bottom-color: rgba(255, 215, 102, 0.8);
    outline: none;
  }

  /* Mobile: bottom-anchored drawer. Single column for legibility.
     Caps height so it doesn't blanket the page; scrolls if both story
     + many layers are present. */
  @media (max-width: 600px) {
    .panel {
      /* Top-anchored on mobile too (matches desktop) so the lens sticks to the
       * top and stays clear of the bottom controls — accordion / scrubber /
       * station tabs (2026-07 user direction). */
      /* The science lens always sits on top on mobile (2026-07 user rule):
       * pinned just below the top-left control cluster (2D toggle / view +
       * reset). Any secondary lens panel — e.g. the station orbit banner —
       * reads --science-lens-height and stacks BELOW this one. */
      top: calc(var(--nav-height) + 56px);
      bottom: auto;
      left: 8px;
      right: 8px;
      transform: none;
      width: auto;
      max-height: 40vh;
      overflow-y: auto;
      z-index: 37;
    }
    .rows {
      grid-template-columns: 1fr;
    }
    .lens-title {
      font-size: 13px;
      letter-spacing: 1.5px;
    }
    .lens-body {
      font-size: 12px;
    }
  }
</style>
