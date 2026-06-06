<script lang="ts">
  /**
   * Next + recent flights widget for the /fleet/launcher detail panel
   * (PRD-020 M10 / US-5).
   *
   * Pure read of launches.json + the current decade historic manifest,
   * filtered by `orrery_launcher_ref`. Hidden when there are no matches
   * for the launcher (e.g. retired vehicles with no historic recording
   * vs new vehicles with no scheduled flight).
   */

  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import {
    loadUpcoming,
    loadHistoricDecade,
    decadeForYear,
    formatCountdown,
    formatNet,
    type LaunchEntry,
  } from '$lib/launches/manifest.js';

  let { launcherId }: { launcherId: string } = $props();

  let next: LaunchEntry | null = $state(null);
  let recent: LaunchEntry[] = $state([]);
  let loaded = $state(false);

  onMount(() => {
    void (async () => {
      const [upcoming, currentDecade] = await Promise.all([
        loadUpcoming(),
        loadHistoricDecade(decadeForYear(new Date().getUTCFullYear())),
      ]);
      // Match by launcher ref (rocket-side: Falcon 9, Ariane 6, …),
      // spacecraft ref (Crew Dragon, Cygnus, …), OR launch-site ref
      // (LC-39A, SLC-40, Kourou ELA-4, …). All three are populated by
      // the build pipeline (resolveSpacecraftRefs +
      // resolveLaunchSiteRef). Same widget powers all three caller
      // surfaces; the prop name stays `launcherId` for backwards
      // compatibility — semantically it's now "any fleet entry id".
      const matches = (e: LaunchEntry): boolean =>
        e.orrery_launcher_ref === launcherId ||
        (e.orrery_spacecraft_refs ?? []).includes(launcherId) ||
        e.orrery_launch_site_ref === launcherId;
      const upMatches = Object.values(upcoming.entries)
        .filter(matches)
        .sort((a, b) => a.net.localeCompare(b.net));
      next = upMatches[0] ?? null;
      const histMatches = Object.values(currentDecade.entries)
        .filter(matches)
        .sort((a, b) => b.net.localeCompare(a.net));
      recent = histMatches.slice(0, 5);
      loaded = true;
    })();
  });
</script>

{#if loaded && (next || recent.length > 0)}
  <section class="launcher-flights" aria-label="Flights of this launcher">
    {#if next}
      <article class="next">
        <h3 class="section-title">{m.launches_widget_next_flight_one()}</h3>
        <a class="row" href="{base}/missions/launches?id={next.id}">
          <span class="when">{formatCountdown(next.net)}</span>
          <span class="payload">{next.mission_name ?? next.name}</span>
          {#if next.pad_name}<span class="pad">{next.pad_name}</span>{/if}
        </a>
      </article>
    {/if}
    {#if recent.length > 0}
      <article class="recent">
        <h3 class="section-title">{m.launches_widget_recent_flights_label()}</h3>
        <ul class="rows">
          {#each recent as e (e.id)}
            <li class="row">
              <span class="when">{formatNet(e.net, e.net_precision)}</span>
              <span class="payload">{e.mission_name ?? e.name}</span>
              {#if e.status.code === 'SUCCESS'}
                <span class="status status-success">✓</span>
              {:else if e.status.code === 'FAILURE'}
                <span class="status status-failure">✗</span>
              {/if}
            </li>
          {/each}
        </ul>
        <a class="see-all" href="{base}/missions/launches?vehicle={launcherId}"
          >{m.launches_widget_see_all_for_vehicle()}</a
        >
      </article>
    {/if}
  </section>
{/if}

<style>
  .launcher-flights {
    margin: 16px 0;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }

  .section-title {
    margin: 0 0 8px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(230, 232, 238, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .next + .recent {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .rows {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: grid;
    grid-template-columns: 100px 1fr auto;
    gap: 8px;
    padding: 6px 0;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: #e6e8ee;
    text-decoration: none;
    min-height: 28px;
  }

  a.row:hover {
    background: rgba(68, 102, 255, 0.06);
  }

  .when {
    color: #ffc850;
    font-size: 11px;
  }

  .payload {
    color: #4ecdc4;
  }

  .pad {
    color: rgba(230, 232, 238, 0.5);
    font-size: 11px;
  }

  .status-success {
    color: #4ecdc4;
  }
  .status-failure {
    color: #ff5252;
  }

  .see-all {
    display: inline-block;
    margin-top: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #4ecdc4;
    text-decoration: none;
  }

  .see-all:hover {
    text-decoration: underline;
  }
</style>
