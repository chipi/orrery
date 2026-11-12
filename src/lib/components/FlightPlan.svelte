<!--
  FlightPlan — the launch / descent beats as a list on a time axis: what is behind (dimmed,
  ticked), the active beat (highlighted) and what is ahead. A window of rows around the active
  one, so a long plan never scrolls; on a narrow screen only the active and next rows.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { hudLabel } from '$lib/orbital/hud-labels';

  interface Beat {
    label: string;
    t: number;
    /** The scene plays this beat on a compressed clock (the parking orbit and injection): show
     *  no time rather than a wrong one. */
    untimed?: boolean;
  }
  let {
    beats,
    t,
    clock,
    compact = false,
  }: {
    beats: Beat[];
    /** Current time, in the beats' own units. */
    t: number;
    /** Formats a beat time for its row (T+mm:ss, E+mm:ss). */
    clock: (t: number) => string;
    /** One line, the next beat only (the phone HUD's collapsed mode). */
    compact?: boolean;
  } = $props();

  const BEFORE = 2;
  const AFTER = 4;
  let active = $derived(beats.findLastIndex((b) => b.t <= t));
  let from = $derived(Math.max(0, Math.min(active - BEFORE, beats.length - (BEFORE + AFTER + 1))));
  let rows = $derived(
    beats.slice(from, from + BEFORE + AFTER + 1).map((b, k) => ({ ...b, i: from + k })),
  );
</script>

{#if compact}
  {#if beats[active + 1]}
    {@const n = beats[active + 1]}
    <div class="compact">
      <span class="k">{m.fly_hud_next_event()}</span>
      <span class="lbl">{hudLabel(n.label)}</span>
      {#if !n.untimed}<span class="time">{clock(n.t)}</span>{/if}
    </div>
  {/if}
{:else if beats.length > 1}
  <section class="plan" aria-label={m.hud_flight_plan()}>
    <div class="title">{m.hud_flight_plan()}</div>
    <ol>
      {#each rows as r (r.i)}
        <li
          class:done={r.i < active}
          class:active={r.i === active}
          class:next={r.i === active + 1}
          aria-current={r.i === active ? 'step' : undefined}
        >
          <span class="mark" aria-hidden="true"
            >{r.i < active ? '✓' : r.i === active ? '●' : '○'}</span
          >
          <span class="lbl">{hudLabel(r.label)}</span>
          <span class="time">{r.untimed ? '' : clock(r.t)}</span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .compact {
    display: flex;
    gap: 8px;
    align-items: baseline;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: #eaf2ff;
  }
  .compact .k {
    color: #ffbe4a;
    font-size: var(--size-label);
  }
  .plan {
    font-family: var(--font-mono, 'Space Mono', monospace);
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
  }
  .title {
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-state);
    margin: 0 0 6px;
    text-align: right;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  li {
    display: grid;
    grid-template-columns: 14px 1fr auto;
    align-items: baseline;
    gap: 8px;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 11px;
    letter-spacing: 1px;
    color: #eaf2ff;
    border: 1px solid transparent;
    transition:
      background 0.4s ease,
      color 0.4s ease;
  }
  li.done {
    color: #6f8399;
  }
  li.done .mark {
    color: var(--color-state);
  }
  li.active {
    background: var(--color-accent-soft);
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
    color: #fff;
  }
  li.active .mark {
    color: var(--color-state);
    animation: pulse 1.6s ease-in-out infinite;
  }
  li.next .mark {
    color: #ffbe4a;
  }
  .mark {
    font-size: var(--size-label);
    text-align: center;
  }
  .time {
    font-size: var(--size-label);
    color: #7d99b5;
    font-variant-numeric: tabular-nums;
  }
  li.active .time {
    color: var(--color-state);
  }
  @keyframes pulse {
    50% {
      opacity: 0.35;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    li.active .mark {
      animation: none;
    }
  }
  /* Narrow screens: only the active and the next beat. */
  @media (max-width: 700px) {
    li:not(.active):not(.next) {
      display: none;
    }
  }
</style>
