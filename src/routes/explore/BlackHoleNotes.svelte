<script lang="ts">
  import { dilationPct } from '$lib/explore/format';
  import * as m from '$lib/paraglide/messages';

  let { curvature, time }: { curvature: boolean; time: boolean } = $props();
</script>

<div class="mw-badge" role="note">{m.explore_bh_lensing_badge()}</div>

<!-- The curvature/time toggles moved into the science-lens panel
     (2026-09-11 audit) — bh-curvature / bh-time-dilation layers; the
     note + table below are the layers' rendered content. -->
{#if curvature}
  <div class="lens-note" role="note">{m.explore_lens_curvature_note()}</div>
{/if}

{#if time}
  <div class="time-lens" role="note">
    <div class="tl-title">{m.explore_lens_time_title()}</div>
    <div class="tl-row">
      <span>{m.explore_lens_time_photon()}</span><b>{dilationPct(1.5)}</b>
    </div>
    <div class="tl-row"><span>{m.explore_lens_time_isco()}</span><b>{dilationPct(3)}</b></div>
    <div class="tl-row"><span>{m.explore_lens_time_ten()}</span><b>{dilationPct(10)}</b></div>
    <div class="tl-foot">{m.explore_lens_time_note()}</div>
  </div>
{/if}

<style>
  /* Slice 5 — Milky Way honesty badge (bottom-centre pill). */
  .mw-badge {
    position: absolute;
    bottom: 26px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    padding: 6px 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #cdd4e6;
    background: rgba(10, 14, 26, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 20px;
    backdrop-filter: blur(5px);
    pointer-events: none;
  }

  /* Slice 6 — physics-lens overlays (curvature note + time-dilation readout). */
  .lens-note {
    position: absolute;
    bottom: 70px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 6;
    max-width: 380px;
    padding: 7px 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    line-height: 1.4;
    text-align: center;
    color: #cdd4e6;
    background: rgba(10, 14, 26, 0.6);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 8px;
    backdrop-filter: blur(5px);
    pointer-events: none;
  }
  .time-lens {
    position: absolute;
    top: 84px;
    left: 12px;
    z-index: 6;
    width: 240px;
    padding: 12px 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    background: rgba(8, 11, 20, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .time-lens .tl-title {
    font-size: 12px;
    font-weight: 700;
    color: #e9eefc;
    margin-bottom: 8px;
  }
  .time-lens .tl-row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    color: #9aa4bf;
    margin-bottom: 4px;
  }
  .time-lens .tl-row b {
    color: #4ecdc4;
  }
  .time-lens .tl-foot {
    margin-top: 8px;
    font-size: 10px;
    line-height: 1.4;
    color: #7a8299;
  }
</style>
