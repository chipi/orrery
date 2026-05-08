<!--
  ScienceLayersPanel — floating sub-toggle panel that lets users opt
  into individual physics overlays when the master Science Lens is on.
  Phase G of the /science integration roadmap.

  Lens-gated visibility: the panel only renders when the master lens
  is enabled. Each layer is an independent attribute on <html> so CSS
  rules can target it directly.

  Per-route filter:
    - On /explore + /iss + /tiangong + /earth: hide /fly-only layers
      (coast + conics).
    - On /fly: show all eight layers.

  Mirrors the gold-accented chrome of MicrogravityAxesLegend so the
  family stays cohesive.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { onScienceLensChange } from '$lib/science-lens';
  import {
    LAYER_ORDER,
    ensureLayerDefaults,
    setLayer,
    onLayerChange,
    type LayerKey,
  } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages.js';

  type Props = {
    /** Layers that are meaningful on this route. Layers not in this list
     * are hidden from the panel (e.g. /explore hides 'coast' + 'conics'). */
    available: LayerKey[];
  };
  let { available }: Props = $props();

  let lensOn = $state(false);
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
    }
  }

  let visibleLayers = $derived(available.filter((k) => LAYER_ORDER.includes(k)));
</script>

{#if lensOn}
  <aside class="panel" data-testid="science-layers-panel" aria-label="Science layers">
    <header class="panel-head">
      <span class="eyebrow">{m.science_layers_heading()}</span>
    </header>
    <ul class="rows">
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
  </aside>
{/if}

<style>
  .panel {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    right: 16px;
    z-index: 32;
    width: 232px;
    padding: 10px 12px 8px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .row {
    display: flex;
    flex-direction: column;
    padding: 4px 2px;
    border-radius: 3px;
  }
  .row + .row {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 6px;
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

  /* Mobile: bottom drawer instead of right-fixed panel. */
  @media (max-width: 600px) {
    .panel {
      top: auto;
      bottom: 80px;
      right: 8px;
      left: 8px;
      width: auto;
      max-height: 50vh;
      overflow-y: auto;
    }
  }
</style>
