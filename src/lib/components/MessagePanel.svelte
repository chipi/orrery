<!--
  MessagePanel (#410) — the "message to the cosmos" view of an outbound
  interstellar craft (Voyager 1/2, Pioneer 10/11, New Horizons). Opened by
  clicking the craft's trajectory in the /explore PATHS layer.

  Focused on the message the craft carries — its status (how far, since when),
  where it's heading (the honest substitute for a to-scale line into the parsec
  neighborhood — see #410 analysis), how far a signal reaches, and the culture
  door(s) for its message (Golden Record / Pioneer Plaque) via CultureDoorCard.
  A "Full mission details" link hands off to the regular MissionPanel.
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import CultureDoorCard from './CultureDoorCard.svelte';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import type { InterstellarCraft } from '$lib/data/interstellar';

  let {
    craft,
    open,
    onClose,
    onMissionDetails,
  }: {
    craft: InterstellarCraft | null;
    open: boolean;
    onClose: () => void;
    onMissionDetails?: (missionId: string) => void;
  } = $props();

  // Per-craft heading prose lives in message keys (translatable), not the
  // trajectory JSON. Resolve by id; the 3D direction label uses heading.star.
  const HEADING_KEY: Record<string, () => string> = {
    'voyager-1': m.explore_heading_voyager_1,
    'voyager-2': m.explore_heading_voyager_2,
    'pioneer-10': m.explore_heading_pioneer_10,
    'pioneer-11': m.explore_heading_pioneer_11,
    'new-horizons': m.explore_heading_new_horizons,
  };
  let headingText = $derived(craft ? (HEADING_KEY[craft.id]?.() ?? '') : '');

  let launchLabel = $derived.by(() => {
    if (!craft?.launchDate) return '';
    const d = new Date(craft.launchDate);
    if (Number.isNaN(d.getTime())) return craft.launchDate;
    return d.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  });

  let signalHours = $derived(craft ? craft.signalLightHours.toFixed(1) : '0');
</script>

<Panel {open} {onClose} title={craft?.name}>
  {#if craft}
    <div data-testid="explore-message-panel" data-craft={craft.id}>
      <p class="sub">{craft.agency} · {m.explore_msg_launched({ date: launchLabel })}</p>

      <ul class="status">
        <li>
          <span class="dot d-dist" aria-hidden="true"></span>
          <span>{craft.currentDistanceLabel}</span>
        </li>
        {#if craft.interstellarSinceLabel}
          <li>
            <span class="dot d-inter" aria-hidden="true"></span>
            <span>{craft.interstellarSinceLabel}</span>
          </li>
        {/if}
      </ul>

      {#if headingText}
        <section class="block">
          <h3 class="block-h">{m.explore_msg_heading_label()}</h3>
          <p class="heading"><span class="arrow" aria-hidden="true">→</span> {headingText}</p>
        </section>
      {/if}

      <section class="block">
        <h3 class="block-h">{m.explore_msg_signal_label()}</h3>
        <p class="body">{m.explore_msg_signal_body({ hours: signalHours })}</p>
      </section>

      <section class="block">
        <h3 class="block-h">{m.explore_msg_carries_label()}</h3>
        {#if craft.doors.length > 0}
          {#each craft.doors as door (door.id)}
            <CultureDoorCard {door} />
          {/each}
        {:else}
          <p class="body muted">{m.explore_msg_no_message()}</p>
        {/if}
      </section>

      {#if onMissionDetails}
        <button
          type="button"
          class="mission-link"
          onclick={() => onMissionDetails?.(craft.missionId)}
        >
          {m.explore_msg_mission_details()} →
        </button>
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .sub {
    font-size: 11px;
    color: var(--muted, #8aa0b8);
    letter-spacing: 0.4px;
    margin: 0 0 12px;
  }
  .status {
    list-style: none;
    margin: 0 0 4px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .status li {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    font-size: 12.5px;
    line-height: 1.45;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-top: 5px;
    flex: none;
  }
  .d-dist {
    background: #7fd4ff;
  }
  .d-inter {
    background: #ffd33d;
  }
  .block {
    margin-top: 15px;
    padding-top: 13px;
    border-top: 1px solid rgba(154, 166, 189, 0.18);
  }
  .block-h {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted, #6f8aa6);
    margin: 0 0 7px;
  }
  .heading {
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
  }
  .arrow {
    color: #7fd4ff;
    font-weight: 700;
  }
  .body {
    font-size: 12px;
    line-height: 1.55;
    margin: 0;
  }
  .muted {
    color: var(--muted, #8aa0b8);
  }
  .mission-link {
    margin-top: 16px;
    padding: 0;
    background: none;
    border: none;
    color: #7fd4ff;
    font: inherit;
    font-size: 12px;
    letter-spacing: 0.4px;
    cursor: pointer;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    text-decoration: underline;
    outline: none;
  }
</style>
