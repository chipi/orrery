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
  import { onScienceLensChange } from '$lib/science-lens';
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
  };
  let { available = [], title, body, tab, section }: Props = $props();

  let lensOn = $state(false);
  // Collapse state: panel ships expanded by default on desktop (room
  // for the body + 12-layer toggle grid), collapsed by default on
  // mobile (≤600 px) — the expanded panel was overlapping bottom-
  // anchored content like /fly's CAPCOM ticker (issue #126), and the
  // collapsed strip is enough on first paint to advertise that the
  // lens is available. State is local-only — re-defaults on next
  // route mount.
  let expanded = $state(
    typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 600px)').matches,
  );
  // Per-layer reactive state mirroring the attribute store. Driven by
  // onLayerChange subscriptions so users see immediate feedback even if
  // another part of the app flipped a layer.
  let layerState = $state<Record<LayerKey, boolean>>({
    soi: false,
    hover: false,
    gravity: false,
    velocity: false,
    centripetal: false,
    apsides: false,
    coast: false,
    conics: false,
    microgravity: false,
    atmosphere: false,
    'tidal-lock': false,
    ozone: false,
  });

  let stops: Array<() => void> = [];

  onMount(() => {
    ensureLayerDefaults();
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
  });

  function toggle(key: LayerKey) {
    setLayer(key, !layerState[key]);
  }

  type LayerMeta = { label: string; description: string };
  function metaFor(key: LayerKey): LayerMeta {
    switch (key) {
      case 'soi':
        return { label: m.science_layer_soi_label(), description: m.science_layer_soi_desc() };
      case 'hover':
        return { label: m.science_layer_hover_label(), description: m.science_layer_hover_desc() };
      case 'gravity':
        return {
          label: m.science_layer_gravity_label(),
          description: m.science_layer_gravity_desc(),
        };
      case 'velocity':
        return {
          label: m.science_layer_velocity_label(),
          description: m.science_layer_velocity_desc(),
        };
      case 'centripetal':
        return {
          label: m.science_layer_centripetal_label(),
          description: m.science_layer_centripetal_desc(),
        };
      case 'apsides':
        return {
          label: m.science_layer_apsides_label(),
          description: m.science_layer_apsides_desc(),
        };
      case 'coast':
        return { label: m.science_layer_coast_label(), description: m.science_layer_coast_desc() };
      case 'conics':
        return {
          label: m.science_layer_conics_label(),
          description: m.science_layer_conics_desc(),
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
    }
  }

  let visibleLayers = $derived(available.filter((k) => LAYER_ORDER.includes(k)));
  let hasLensStory = $derived(Boolean(title && body && tab && section));
  let hasLayers = $derived(visibleLayers.length > 0);
</script>

{#if lensOn && (hasLensStory || hasLayers)}
  <aside
    class="panel"
    class:collapsed={!expanded}
    data-testid="science-lens-panel"
    aria-label="Science Lens"
  >
    <button
      type="button"
      class="panel-head"
      aria-expanded={expanded}
      aria-controls="science-lens-body"
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
          <ul class="rows" aria-label="Science layers">
            {#each visibleLayers as key (key)}
              {@const meta = metaFor(key)}
              <li class="row">
                <label class="row-label">
                  <input
                    type="checkbox"
                    checked={layerState[key]}
                    onchange={() => toggle(key)}
                    data-testid="science-layer-{key}"
                  />
                  <span class="row-name">{meta.label}</span>
                </label>
                <span class="row-desc">{meta.description}</span>
              </li>
            {/each}
          </ul>
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
    top: calc(var(--nav-height) + 12px);
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
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 200, 80, 0.85);
    transition: color 120ms;
  }
  .panel-head:hover .chevron {
    color: #ffc850;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
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
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
  }
  .lens-divider {
    height: 1px;
    background: rgba(255, 200, 80, 0.18);
    margin: 10px 0 8px;
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
    font-family: 'Space Mono', monospace;
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

  /* Mobile: bottom-anchored drawer. Single column for legibility.
     Caps height so it doesn't blanket the page; scrolls if both story
     + many layers are present. */
  @media (max-width: 600px) {
    .panel {
      top: auto;
      bottom: 84px;
      left: 8px;
      right: 8px;
      transform: none;
      width: auto;
      /* Was 50vh — overlapped /fly's CAPCOM ticker (bottom 70 px, max
       * 50vh) when expanded. 40vh leaves the upper third of the
       * viewport clear so the user can still see arc + scene context
       * while picking layers (issue #126). */
      max-height: 40vh;
      overflow-y: auto;
      /* Z-index 37 (was 32) sits above the /fly CAPCOM panel (35) +
       * the hud-collapse button (36), so when both lens + CAPCOM are
       * open the lens — the user's active interaction — is on top.
       * Still below load-banner (40). */
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
