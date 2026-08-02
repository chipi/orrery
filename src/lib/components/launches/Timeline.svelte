<script lang="ts">
  /**
   * Vertical chronological timeline for /missions/launches.
   * Groups rows by month with a sticky month-key header.
   * PRD-020 §M8 / RFC-023 §8.2.
   */

  import LaunchRow from './LaunchRow.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { LaunchEntry } from '$lib/launches/manifest.js';

  let {
    months,
    mode,
  }: {
    months: Array<{ key: string; label: string; entries: LaunchEntry[] }>;
    mode: 'upcoming' | 'historic';
  } = $props();
</script>

<section class="timeline" aria-label={m.launches_timeline_aria()}>
  {#if months.length === 0}
    <p class="empty">No launches in this view. Try widening the filter.</p>
  {/if}
  {#each months as bucket (bucket.key)}
    <header class="month-header" id="month-{bucket.key}">
      <h2 class="month-title">{bucket.label}</h2>
      <span class="month-count">{bucket.entries.length} launches</span>
    </header>
    {#each bucket.entries as entry (entry.id)}
      <LaunchRow {entry} {mode} />
    {/each}
  {/each}
</section>

<style>
  .timeline {
    display: flex;
    flex-direction: column;
  }

  .empty {
    margin: 32px 16px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    color: rgba(230, 232, 238, 0.5);
    text-align: center;
  }

  .month-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 16px 12px 8px;
    position: sticky;
    top: 52px;
    background: rgba(4, 4, 12, 0.92);
    backdrop-filter: blur(8px);
    z-index: 5;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  @media (min-width: 768px) {
    .month-header {
      padding: 20px 18px 10px;
    }
  }

  .month-title {
    margin: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 24px;
    letter-spacing: 1px;
    color: #fff;
  }

  .month-count {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    color: rgba(230, 232, 238, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
