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
    /** Localised phase label ("CRUISE", "ARRIVAL", etc.). */
    phase: string;
  };
  let { heliocentricKms, distFromEarthAu, distFromMarsAu, metDays, phase }: Props = $props();

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
    <div class="eyebrow">{m.fly_info_card_eyebrow()}</div>
    <div class="phase">{phase}</div>
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
  /* Bottom-left fixed card. Doesn't compete with the conic-section
     panel at bottom-right or the timeline scrubber along the bottom-
     center strip. */
  .card {
    position: fixed;
    /* Sit above the scrubber (bottom: 14px + ~50px tall) so the play
       button + timeline stay clickable when the card is open. */
    bottom: 80px;
    left: 16px;
    z-index: 31;
    width: 240px;
    padding: 10px 12px 8px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: #ffc850;
    margin-bottom: 4px;
  }
  .phase {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 16px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255, 200, 80, 0.18);
    padding-bottom: 4px;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
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

  /* Mobile: keep at bottom-left but lifted above the timeline scrubber. */
  @media (max-width: 600px) {
    .card {
      bottom: 84px;
      left: 8px;
      right: 8px;
      width: auto;
    }
  }
</style>
