<script lang="ts">
  /**
   * /missions banner — next 1–3 T1 (FEATURED) launches with T-0 countdown.
   * Mobile: single-card horizontal swipe. Desktop: 3-card row.
   *
   * PRD-020 M7 / US-1 · RFC-023 §8.2.
   */

  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import {
    loadUpcoming,
    formatCountdown,
    type LaunchEntry,
  } from '$lib/launches/manifest.js';

  let entries: LaunchEntry[] = $state([]);
  let now = $state(new Date());
  let loaded = $state(false);

  onMount(() => {
    void (async () => {
      const m = await loadUpcoming();
      entries = Object.values(m.entries)
        .filter((e) => e.tier === 'T1')
        .sort((a, b) => a.net.localeCompare(b.net))
        .slice(0, 3);
      loaded = true;
    })();
    const t = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(t);
  });
</script>

{#if loaded && entries.length > 0}
  <aside class="banner" aria-label="Next featured launches">
    <header class="banner-header">
      <h2 class="eyebrow">Next launches</h2>
      <a class="all-link" href="{base}/missions/launches">All launches →</a>
    </header>
    <div class="cards">
      {#each entries as e (e.id)}
        <a
          class="card"
          href="{base}/missions/launches?id={e.id}"
          data-launch-id={e.id}
        >
          <div class="countdown">{formatCountdown(e.net, now)}</div>
          <h3 class="card-title">{e.rocket_config_name}</h3>
          <p class="mission">{e.mission_name ?? e.name}</p>
          {#if e.editorial_note}
            <p class="editorial-note">{e.editorial_note}</p>
          {/if}
          <p class="meta">{e.agency_name}{e.pad_name ? ` · ${e.pad_name}` : ''}</p>
        </a>
      {/each}
    </div>
  </aside>
{/if}

<style>
  /* Match the .library container on /missions:
       max-width 1400px, auto margins, 22px horizontal padding. */
  .banner {
    max-width: 1400px;
    margin: 12px auto 16px;
    padding: 14px 22px;
    background: linear-gradient(180deg, rgba(68, 102, 255, 0.08), rgba(68, 102, 255, 0.02));
    border: 1px solid rgba(68, 102, 255, 0.2);
    border-radius: 4px;
  }

  @media (max-width: 480px) {
    .banner {
      margin: 8px 12px 14px;
      padding: 12px 14px;
    }
  }

  .banner-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .eyebrow {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #4466ff;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .all-link {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #4ecdc4;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .all-link:hover {
    text-decoration: underline;
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  @media (min-width: 768px) {
    .cards {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .card {
    display: block;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: #e6e8ee;
    text-decoration: none;
    transition: background-color 120ms, border-color 120ms;
    min-height: 44px;
  }

  .card:hover {
    background: rgba(68, 102, 255, 0.08);
    border-color: rgba(68, 102, 255, 0.4);
  }

  .countdown {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #ffc850;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .card-title {
    margin: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    color: #fff;
    letter-spacing: 0.5px;
  }

  .mission {
    margin: 2px 0 0;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #4ecdc4;
  }

  .editorial-note {
    margin: 4px 0 0;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 12px;
    color: rgba(230, 232, 238, 0.85);
  }

  .meta {
    margin: 6px 0 0;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.6);
  }
</style>
