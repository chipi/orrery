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

<!-- grabFocus={false}: mirrors MissionPanel — a craft's legend row / Today-marker
     opens this panel, and focus must stay on the triggering iconic-legend row so
     arrow-key legend nav works immediately after the first click. -->
<Panel {open} {onClose} grabFocus={false} title={craft?.name}>
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
  /* Aligned to the shared detail-panel family (StarPanel / DeepSkyPanel /
     MilkyWayPanel): rem units, var(--muted)/var(--text) tokens, teal #4ecdc4
     accent — NOT bespoke px / colours. */
  .sub {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--muted, #9aa4bf);
    margin: 0 0 0.75rem;
  }
  .status {
    list-style: none;
    margin: 0 0 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .status li {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--text, #e9eefc);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    margin-top: 0.3rem;
    flex: none;
  }
  .d-dist {
    background: #4ecdc4;
  }
  .d-inter {
    background: #ffc850;
  }
  .block {
    margin-top: 0.9rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .block-h {
    font-size: 0.62rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted, #9aa4bf);
    margin: 0 0 0.4rem;
  }
  .heading {
    font-size: 0.82rem;
    line-height: 1.5;
    margin: 0;
    color: var(--text, #e9eefc);
  }
  .arrow {
    color: #4ecdc4;
    font-weight: 700;
  }
  .body {
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0;
    color: var(--text, #e9eefc);
  }
  .muted {
    color: var(--muted, #9aa4bf);
  }
  .mission-link {
    display: inline-block;
    margin-top: 0.9rem;
    padding: 0;
    background: none;
    border: none;
    color: #4ecdc4;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }
  .mission-link:hover,
  .mission-link:focus-visible {
    text-decoration: underline;
    outline: none;
  }
</style>
