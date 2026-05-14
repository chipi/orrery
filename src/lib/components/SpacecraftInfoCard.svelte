<!--
  SpacecraftInfoCard — Phase J.4. Live state of the spacecraft on /fly,
  rendered as a fixed bottom-left HTML card. Lens + 'hover' layer gated.

  Mirrors the /explore expanded hover-card pattern (same gold border,
  same chip-linked metric rows) but doesn't follow a cursor — the
  spacecraft on /fly is a single object, so a fixed-position card with
  live numbers is more useful than a hover-pick on the sprite.

  Each metric carries a ScienceChip deep-link into the matching
  /science chapter so users can click straight from "speed = 28 km/s"
  to the vis-viva explainer.
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { onLayerChange } from '$lib/science-layers';
  import ScienceChip from './ScienceChip.svelte';
  import * as m from '$lib/paraglide/messages.js';

  type Props = {
    /** Current heliocentric speed in km/s (vis-viva at the spacecraft's r). */
    heliocentricKms: number;
    /** Distance from Earth in AU. */
    distFromEarthAu: number;
    /** Distance from Mars (or destination) in AU. */
    distFromMarsAu: number;
    /** Mission elapsed time in days. */
    metDays: number;
  };
  let { heliocentricKms, distFromEarthAu, distFromMarsAu, metDays }: Props = $props();

  let layerOn = $state(false);
  let stop: (() => void) | undefined;

  onMount(() => {
    stop = onLayerChange('hover', (on) => {
      layerOn = on;
    });
  });
  onDestroy(() => stop?.());

  // 1 AU ≈ 8.317 light-min — quick conversion for the radio-lag column.
  const lightMinFromEarth = $derived(distFromEarthAu * 8.317);
</script>

{#if layerOn}
  <aside class="card" data-testid="spacecraft-info-card" aria-label="Live spacecraft state">
    <dl class="rows">
      <div class="row">
        <dt>
          <ScienceChip tab="orbits" section="vis-viva" label={m.chip_label_vis_viva()} />SPEED
        </dt>
        <dd>{heliocentricKms.toFixed(2)} km/s</dd>
      </div>
      <div class="row">
        <dt>
          <ScienceChip
            tab="scales-time"
            section="light-minute"
            label={m.chip_label_light_minute()}
          />FROM EARTH
        </dt>
        <dd>{distFromEarthAu.toFixed(3)} AU · {lightMinFromEarth.toFixed(1)} l-min</dd>
      </div>
      <div class="row">
        <dt>FROM TARGET</dt>
        <dd>{distFromMarsAu.toFixed(3)} AU</dd>
      </div>
      <div class="row">
        <dt>
          <ScienceChip tab="mission-phases" section="met" label={m.chip_label_met()} />MET
        </dt>
        <dd>{Math.round(metDays).toLocaleString()} d</dd>
      </div>
    </dl>
  </aside>
{/if}

<style>
  /* Inline card — sits inside the .fly hud-stack as the bottom-most
     left-rail panel. No position:fixed: it inherits flex layout from
     the parent column so it stacks flush right under hud-systems. The
     gold accent border keeps it visually tagged as the Phase J.4
     "live spacecraft state" panel without breaking column rhythm.
     Eyebrow + phase header were dropped — they duplicated the
     identity HUD's mission-name + phase indicator at the top of the
     stack. */
  .card {
    pointer-events: auto;
    padding: 8px 14px;
    background: rgba(8, 10, 22, 0.88);
    border: 1px solid rgba(255, 200, 80, 0.4);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.85);
    min-width: 180px;
    width: 220px;
    box-sizing: border-box;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin: 0;
  }
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .row dt {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
  }
  .row dd {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.92);
    margin: 0;
  }
</style>
