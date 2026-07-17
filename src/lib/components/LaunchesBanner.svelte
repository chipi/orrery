<script lang="ts">
  /**
   * /missions banner — next 1–3 T1 (FEATURED) launches with T-0 countdown.
   * Mobile: single-card horizontal swipe. Desktop: 3-card row.
   *
   * PRD-020 M7 / US-1 · RFC-023 §8.2.
   */

  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { loadUpcoming, formatCountdown, type LaunchEntry } from '$lib/launches/manifest.js';
  import { deriveLaunchFeedState } from '$lib/live-feeds';
  import { agencyLogo, agencyFullName } from '$lib/agencies';

  let entries: LaunchEntry[] = $state([]);
  let allEntries: LaunchEntry[] = $state([]);
  let now = $state(new Date());
  let loaded = $state(false);

  onMount(() => {
    void (async () => {
      const m = await loadUpcoming();
      allEntries = Object.values(m.entries);
      entries = allEntries
        .filter((e) => e.tier === 'T1')
        .sort((a, b) => a.net.localeCompare(b.net))
        .slice(0, 4);
      loaded = true;
    })();
    const t = setInterval(() => (now = new Date()), 60_000);
    return () => clearInterval(t);
  });

  // Cross-correlate with /live: any launch live-or-imminent right now → pill.
  const liveOrImminent = $derived(
    allEntries.some((e) => deriveLaunchFeedState(e.net, now) !== null),
  );

  // Agency logo lookup delegates to $lib/agencies (unified registry).
  const logoFor = agencyLogo;
</script>

{#if loaded && entries.length > 0}
  <aside class="banner" aria-label={m.launches_banner_aria()}>
    <header class="banner-header">
      <h2 class="eyebrow">{m.launches_banner_eyebrow()}</h2>
      <span class="header-links">
        {#if liveOrImminent}
          <a class="live-pill" href="{base}/live" data-testid="launches-live-pill">
            <span class="live-dot" aria-hidden="true"></span>{m.live_badge_live()}
          </a>
        {/if}
        <a class="all-link" href="{base}/missions/launches">{m.launches_banner_all()}</a>
      </span>
    </header>
    <div class="cards">
      {#each entries as e (e.id)}
        <a class="card" href="{base}/missions/launches?id={e.id}" data-launch-id={e.id}>
          <div class="card-head">
            <div class="countdown">{formatCountdown(e.net, now)}</div>
            {#if logoFor(e.agency_name)}
              <img
                class="agency-logo"
                src={logoFor(e.agency_name)}
                alt="{e.agency_name} logo"
                title={agencyFullName(e.agency_name) ?? e.agency_name}
                loading="lazy"
                decoding="async"
              />
            {/if}
          </div>
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
  /* No outer frame — content flows transparently within the page,
     only per-card borders remain. */
  .banner {
    max-width: 1400px;
    margin: 4px auto 12px;
    padding: 0 22px;
  }

  @media (max-width: 480px) {
    .banner {
      margin: 4px 0 10px;
      padding: 0 12px;
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

  .header-links {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .live-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #fff;
    background: #c62f2f;
    padding: 2px 8px;
    border-radius: 4px;
    text-decoration: none;
  }
  .live-pill .live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #fff;
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

  /* Two-up on tablet, four-up on desktop (matches the .library
     column width and lets us surface 4 featured launches). */
  @media (min-width: 600px) {
    .cards {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 960px) {
    .cards {
      grid-template-columns: repeat(4, 1fr);
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
    transition:
      background-color 120ms,
      border-color 120ms;
    min-height: 44px;
  }

  .card:hover {
    background: rgba(68, 102, 255, 0.08);
    border-color: rgba(68, 102, 255, 0.4);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  .countdown {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #ffc850;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .agency-logo {
    height: 18px;
    width: auto;
    max-width: 56px;
    opacity: 0.85;
    object-fit: contain;
    filter: brightness(1.05);
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
