<!--
  The message an outbound interstellar craft carries (#410), as a section of its MissionPanel
  (UXD-019: all 18 iconic rows open the mission panel; the five outbound craft add this).
  Status (how far, since when), heading (the honest substitute for a to-scale line into the
  parsec neighbourhood), how far a signal reaches, and the culture door(s) for its message
  (Golden Record, Pioneer Plaque) via CultureDoorCard. New Horizons carries no formal message
  and says so.
-->
<script lang="ts">
  import CultureDoorCard from './CultureDoorCard.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { InterstellarCraft } from '$lib/data/interstellar';

  let { craft }: { craft: InterstellarCraft } = $props();

  // Per-craft heading prose lives in message keys (translatable), not the
  // trajectory JSON. Resolve by id; the 3D direction label uses heading.star.
  const HEADING_KEY: Record<string, () => string> = {
    'voyager-1': m.explore_heading_voyager_1,
    'voyager-2': m.explore_heading_voyager_2,
    'pioneer-10': m.explore_heading_pioneer_10,
    'pioneer-11': m.explore_heading_pioneer_11,
    'new-horizons': m.explore_heading_new_horizons,
  };
  let headingText = $derived(HEADING_KEY[craft.id]?.() ?? '');
  let signalHours = $derived(craft.signalLightHours.toFixed(1));
</script>

<div class="message" data-testid="mission-message-section" data-craft={craft.id}>
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
</div>

<style>
  .message {
    margin-top: 0.9rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
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
    background: var(--color-accent);
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
    font-size: var(--size-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-label);
    margin: 0 0 0.4rem;
  }
  .heading {
    font-size: 0.82rem;
    line-height: 1.5;
    margin: 0;
    color: var(--text, #e9eefc);
  }
  .arrow {
    color: var(--color-state);
    font-weight: 700;
  }
  .body {
    font-size: 0.85rem;
    line-height: 1.5;
    margin: 0;
    color: var(--text, #e9eefc);
  }
  .muted {
    color: var(--color-text-label);
  }
</style>
