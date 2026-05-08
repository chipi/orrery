<!--
  StationOrbitBanner — Science Lens narration for /iss + /tiangong.
  Tier-1 deliverable F.1 + F.2 combined: a top-center banner that
  surfaces the station's orbital regime (altitude / inclination /
  period) and routes each value into either a /science chapter or
  an inline WhyPopover for in-context explanation.

  Lens-gated: only renders when the global Science Lens toggle is
  on, mirroring FlightDirectorBanner's pattern. Top-center placement
  matches the lens banner on /explore and /fly so the three feel
  like one family.

  Stations supplied as static props — the canonical orbital figures
  are facts about the station, not per-module data, so they live
  in the route file (not the modules JSON).
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { onScienceLensChange } from '$lib/science-lens';
  import * as m from '$lib/paraglide/messages.js';
  import WhyPopover from './WhyPopover.svelte';

  type Props = {
    /** Display name shown in the header (e.g. "ISS", "Tiangong"). */
    stationName: string;
    /** Mean orbital altitude in km. */
    altitudeKm: number;
    /** Inclination in degrees relative to Earth's equator. */
    inclinationDeg: number;
    /** Mean orbital period in minutes. */
    periodMin: number;
  };
  let { stationName, altitudeKm, inclinationDeg, periodMin }: Props = $props();

  let lensOn = $state(false);
  let stop: (() => void) | undefined;

  onMount(() => {
    stop = onScienceLensChange((v) => {
      lensOn = v;
    });
  });
  onDestroy(() => stop?.());

  // 24h × 60min ÷ period ≈ orbits per day; round to nearest int.
  const sunrisesPerDay = $derived(Math.round((24 * 60) / periodMin));
</script>

{#if lensOn}
  <section class="banner" data-testid="station-orbit-banner" aria-label="Orbital regime">
    <div class="banner-eyebrow">
      {m.station_banner_eyebrow()} · {stationName}
    </div>
    <dl class="banner-grid">
      <div class="cell">
        <dt class="cell-label">
          {m.station_banner_alt_label()}<WhyPopover
            title={m.why_station_altitude_title()}
            body={m.why_station_altitude_body()}
            tab="orbits"
            section="orbit-regimes"
          />
        </dt>
        <dd class="cell-value">{m.station_banner_alt_unit({ value: altitudeKm.toFixed(0) })}</dd>
      </div>
      <div class="cell">
        <dt class="cell-label">
          {m.station_banner_incl_label()}<WhyPopover
            title={m.why_station_inclination_title()}
            body={m.why_station_inclination_body()}
            tab="orbits"
            section="inclination"
          />
        </dt>
        <dd class="cell-value">
          {m.station_banner_incl_unit({ value: inclinationDeg.toFixed(1) })}
        </dd>
      </div>
      <div class="cell">
        <dt class="cell-label">
          {m.station_banner_period_label()}<WhyPopover
            title={m.why_station_period_title()}
            body={m.why_station_period_body()}
            tab="orbits"
            section="keplers-laws"
          />
        </dt>
        <dd class="cell-value">{m.station_banner_period_unit({ value: periodMin.toFixed(0) })}</dd>
      </div>
    </dl>
    <p class="banner-foot">
      <span class="foot-fact"
        >≈ {sunrisesPerDay} sunrises/day<WhyPopover
          title={m.why_station_sunrises_title()}
          body={m.why_station_sunrises_body()}
        /></span
      >
      <a class="banner-link" href="{base}/science/orbits/orbit-regimes">
        {m.station_banner_read_more()}
      </a>
    </p>
  </section>
{/if}

<style>
  /* Same gold accent + chrome as ScienceLensBanner / FlightDirector
     so the three banners read as one family. Top-center placement,
     lens-gated visibility. */
  .banner {
    position: fixed;
    top: calc(var(--nav-height) + 12px);
    left: 50%;
    transform: translateX(-50%);
    width: min(540px, calc(100vw - 32px));
    padding: 12px 18px 10px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 200, 80, 0.55);
    border-radius: 6px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    color: var(--color-text);
    z-index: 30;
  }
  .banner-eyebrow {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 3px;
    color: #ffc850;
    margin-bottom: 8px;
  }
  .banner-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin: 0 0 8px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }
  .cell-value {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0;
  }
  .banner-foot {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 200, 80, 0.18);
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
  }
  .foot-fact {
    display: inline-flex;
    align-items: baseline;
  }
  .banner-link {
    font-family: 'Space Mono', monospace;
    font-style: normal;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 200, 80, 0.85);
    text-decoration: none;
  }
  .banner-link:hover,
  .banner-link:focus-visible {
    color: #ffc850;
    outline: none;
  }
  @media (max-width: 600px) {
    .banner {
      left: 8px;
      right: 8px;
      transform: none;
      width: auto;
    }
    .cell-value {
      font-size: 16px;
    }
  }
</style>
