<script lang="ts">
  /**
   * Per-launch row component for /missions/launches Timeline.
   * Shows: T-0 countdown (upcoming) or formatted date (historic), vehicle,
   * payload, agency, tier chip, status chip, optional editorial note,
   * optional webcast-live indicator.
   *
   * PRD-020 M8 + M18 + M20.
   */

  import { formatCountdown, formatNet, type LaunchEntry } from '$lib/launches/manifest.js';
  import ProvenanceChip from './ProvenanceChip.svelte';

  let { entry, mode }: { entry: LaunchEntry; mode: 'upcoming' | 'historic' } = $props();

  // Tick once per minute for the T-0 countdown — cheap, no animation frame.
  let now = $state(new Date());
  $effect(() => {
    if (mode !== 'upcoming') return;
    const t = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(t);
  });

  let timeLabel = $derived(
    mode === 'upcoming' ? formatCountdown(entry.net, now) : formatNet(entry.net, entry.net_precision),
  );

  function tierChipClass(t: string): string {
    if (t === 'T1') return 'tier tier-featured';
    if (t === 'T2') return 'tier tier-notable';
    if (t === 'T4') return 'tier tier-routine';
    return 'tier';
  }
</script>

<article class="launch-row" data-tier={entry.tier} data-launch-id={entry.id}>
  <div class="time-col">
    <time datetime={entry.net} class="net">{timeLabel}</time>
    {#if entry.webcast_live}
      <span class="live-chip" title="Webcast live"><span class="dot"></span>LIVE</span>
    {/if}
  </div>
  <div class="main-col">
    <h3 class="title">
      {entry.rocket_config_name}
      <span class="separator">·</span>
      <span class="mission">{entry.mission_name ?? entry.name}</span>
    </h3>
    {#if entry.editorial_note}
      <p class="editorial-note">{entry.editorial_note}</p>
    {/if}
    <p class="meta">
      <span class="agency">{entry.agency_name}</span>
      {#if entry.orbit_name || entry.orbit_abbrev}
        <span class="separator">·</span>
        <span class="orbit">{entry.orbit_name ?? entry.orbit_abbrev}</span>
      {/if}
      {#if entry.pad_name}
        <span class="separator">·</span>
        <span class="pad">{entry.pad_name}</span>
      {/if}
    </p>
  </div>
  <div class="badges-col">
    {#if entry.tier === 'T1'}
      <span class={tierChipClass(entry.tier)}>FEATURED</span>
    {:else if entry.tier === 'T4'}
      <span class={tierChipClass(entry.tier)}>ROUTINE</span>
    {/if}
    <span class="status status-{entry.status.code.toLowerCase()}">{entry.status.label}</span>
    {#if entry.provenance_chain && entry.provenance_chain.length > 0}
      <ProvenanceChip chain={entry.provenance_chain} />
    {/if}
  </div>
</article>

<style>
  .launch-row {
    display: grid;
    grid-template-columns: 100px 1fr auto;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    align-items: start;
    min-height: 60px;
  }

  @media (min-width: 768px) {
    .launch-row {
      grid-template-columns: 160px 1fr auto;
      padding: 14px 18px;
    }
  }

  .time-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .net {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #ffc850;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .live-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: #ff5252;
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
  }

  .live-chip .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ff5252;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .title {
    margin: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    font-weight: 400;
    color: #fff;
    letter-spacing: 0.5px;
    line-height: 1.2;
  }

  .mission {
    color: #4ecdc4;
  }

  .separator {
    color: rgba(255, 255, 255, 0.3);
    margin: 0 4px;
  }

  .editorial-note {
    margin: 4px 0 0;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    color: rgba(230, 232, 238, 0.85);
  }

  .meta {
    margin: 4px 0 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.7);
  }

  .badges-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .tier {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 700;
  }

  .tier-featured {
    background: rgba(255, 200, 80, 0.18);
    color: #ffc850;
    border: 1px solid rgba(255, 200, 80, 0.5);
  }

  .tier-routine {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(230, 232, 238, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .status {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.7);
  }

  .status-success { color: #4ecdc4; }
  .status-failure { color: #ff5252; }
  .status-go { color: #4b9cd3; }
</style>
