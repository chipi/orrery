<!--
  MicrogravityAxesLegend — colour-key legend for the lens-gated 3D
  axis overlay on /iss + /tiangong (F.3).

  Pairs with buildMicrogravityAxes() in src/lib/microgravity-axes.ts:
  the three colour bands here map to the six arrows in the 3D scene.

  Click → opens /science/orbits/keplers-laws (the closest existing
  chapter explaining what microgravity actually is — free-fall, not
  zero gravity).

  Lens-gated visibility, same as StationOrbitBanner / FlightDirector.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onLayerChange } from '$lib/science-layers';
  import * as m from '$lib/paraglide/messages.js';

  // Tracks the 'microgravity' layer (which itself ANDs against the
  // master lens — see isLayerOn in science-layers.ts). The legend
  // appears only when both the lens AND the layer are on; toggling
  // the layer off in the panel hides this legend along with the 3D
  // arrows it pairs with.
  let layerOn = $state(false);
  let stop: (() => void) | undefined;

  onMount(() => {
    stop = onLayerChange('microgravity', (v) => {
      layerOn = v;
    });
  });
  onDestroy(() => stop?.());
</script>

{#if layerOn}
  <a
    class="legend"
    href="{base}/science/orbits/keplers-laws"
    data-testid="microgravity-axes-legend"
  >
    <div class="eyebrow">{m.microgravity_legend_eyebrow()}</div>
    <ul class="rows">
      <li class="row">
        <span class="swatch swatch-teal" aria-hidden="true"></span>
        <span class="label">{m.microgravity_legend_zenith_nadir()}</span>
      </li>
      <li class="row">
        <span class="swatch swatch-red" aria-hidden="true"></span>
        <span class="label">{m.microgravity_legend_prograde_retrograde()}</span>
      </li>
      <li class="row">
        <span class="swatch swatch-blue" aria-hidden="true"></span>
        <span class="label">{m.microgravity_legend_port_starboard()}</span>
      </li>
    </ul>
    <div class="link">{m.microgravity_legend_read_more()}</div>
  </a>
{/if}

<style>
  /* Bottom-left lens-gated legend, anchored just to the right of the
     /iss + /tiangong modules rail (which sits at left:12px width:300px
     on desktop). Sitting on the left side keeps the right edge clear
     for the StationModulePanel + credits / library buttons; sitting
     past the rail keeps the legend from overlapping the modules list. */
  .legend {
    position: fixed;
    bottom: 16px;
    left: 324px;
    z-index: 31;
    display: block;
    padding: 10px 12px 8px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
    text-decoration: none;
    transition:
      border-color 120ms,
      transform 200ms;
  }
  .legend:hover,
  .legend:focus-visible {
    border-color: rgba(255, 200, 80, 0.85);
    transform: translateY(-2px);
    outline: none;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
    margin-bottom: 6px;
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
    align-items: center;
    gap: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.85);
  }
  .swatch {
    display: block;
    width: 14px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .swatch-teal {
    background: #4ecdc4;
  }
  .swatch-red {
    background: #ff6b6b;
  }
  .swatch-blue {
    background: #6aa9ff;
  }
  .link {
    margin-top: 6px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
  }

  /* Mobile: drawer becomes a bottom sheet, so left:324px no longer
     applies. Anchor to the bottom-left corner, lifted above the
     bottom sheet's typical pinned-edge height. */
  @media (max-width: 600px) {
    .legend {
      bottom: 84px;
      left: 8px;
    }
  }
</style>
