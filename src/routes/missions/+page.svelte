<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { getMissionsForLibrary } from '$lib/data';
  import type { Destination, Mission, MissionStatus } from '$types/mission';
  import MissionPanel from '$lib/components/MissionPanel.svelte';
  import * as m from '$lib/paraglide/messages';

  // ─── State ───────────────────────────────────────────────────────
  let missions: Mission[] = $state([]);
  let loading = $state(true);

  // Filters: parsed from URL query so /missions?dest=MARS pre-applies
  // on first load (RFC-004). Updates write back to the URL via goto().
  let destFilter: Destination | 'ALL' = $state('ALL');
  let statusFilter: MissionStatus | 'ALL' = $state('ALL');

  let filtered = $derived(
    missions.filter(
      (mission) =>
        (destFilter === 'ALL' || mission.dest === destFilter) &&
        (statusFilter === 'ALL' || mission.status === statusFilter),
    ),
  );

  // ─── URL ↔ filter sync ───────────────────────────────────────────
  function applyUrlFilters(url: URL) {
    const dest = url.searchParams.get('dest')?.toUpperCase();
    const status = url.searchParams.get('status')?.toUpperCase();
    destFilter = dest === 'MARS' || dest === 'MOON' ? dest : 'ALL';
    statusFilter =
      status === 'ACTIVE' || status === 'FLOWN' || status === 'PLANNED' ? status : 'ALL';
  }

  function pushFiltersToUrl() {
    const params = new URLSearchParams();
    if (destFilter !== 'ALL') params.set('dest', destFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    const qs = params.toString();
    const target = `${base}/missions${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      // replaceState avoids littering the back-button history with
      // every filter toggle.
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function setDest(value: Destination | 'ALL') {
    destFilter = value;
    pushFiltersToUrl();
  }

  function setStatus(value: MissionStatus | 'ALL') {
    statusFilter = value;
    pushFiltersToUrl();
  }

  // ─── Card click → open MissionPanel ──────────────────────────────
  let selectedId: string | null = $state(null);
  let panelOpen = $state(false);

  let selectedMission = $derived(
    selectedId ? (missions.find((mission) => mission.id === selectedId) ?? null) : null,
  );

  function selectMission(id: string) {
    selectedId = id;
    panelOpen = true;
  }
  function closePanel() {
    panelOpen = false;
  }
  function flyMission(id: string) {
    goto(`${base}/fly?mission=${id}`);
  }

  // ─── Load ────────────────────────────────────────────────────────
  onMount(() => {
    applyUrlFilters($page.url);
    getMissionsForLibrary()
      .then((list) => {
        missions = list;
        loading = false;
      })
      .catch((err) => {
        console.error('Failed to load mission library:', err);
        loading = false;
      });
  });

  // Keep filters in sync if the user navigates with the back/forward
  // button (URL changes without onMount re-firing).
  $effect(() => {
    applyUrlFilters($page.url);
  });
</script>

<svelte:head><title>Mission Library · Orrery</title></svelte:head>

<div class="library">
  <header class="library-header">
    <h1>{m.lib_title()}</h1>
    <div class="counts">
      <span class="count-total">{m.lib_count_total({ count: missions.length.toString() })}</span>
      {#if filtered.length !== missions.length}
        <span class="count-filtered">
          {m.lib_count_filtered({ count: filtered.length.toString() })}
        </span>
      {/if}
    </div>
  </header>

  <nav class="filters" aria-label="Mission filters">
    <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_dest_label()}>
      <span class="filter-label">{m.lib_filter_dest_label()}</span>
      <button
        type="button"
        class="pill"
        class:active={destFilter === 'ALL'}
        role="radio"
        aria-checked={destFilter === 'ALL'}
        onclick={() => setDest('ALL')}>{m.lib_filter_dest_all()}</button
      >
      <button
        type="button"
        class="pill"
        class:active={destFilter === 'MARS'}
        role="radio"
        aria-checked={destFilter === 'MARS'}
        onclick={() => setDest('MARS')}>{m.lib_filter_dest_mars()}</button
      >
      <button
        type="button"
        class="pill"
        class:active={destFilter === 'MOON'}
        role="radio"
        aria-checked={destFilter === 'MOON'}
        onclick={() => setDest('MOON')}>{m.lib_filter_dest_moon()}</button
      >
    </div>

    <div class="filter-group" role="radiogroup" aria-label={m.lib_filter_status_label()}>
      <span class="filter-label">{m.lib_filter_status_label()}</span>
      <button
        type="button"
        class="pill"
        class:active={statusFilter === 'ALL'}
        role="radio"
        aria-checked={statusFilter === 'ALL'}
        onclick={() => setStatus('ALL')}>{m.lib_filter_status_all()}</button
      >
      <button
        type="button"
        class="pill"
        class:active={statusFilter === 'ACTIVE'}
        role="radio"
        aria-checked={statusFilter === 'ACTIVE'}
        onclick={() => setStatus('ACTIVE')}>{m.lib_filter_status_active()}</button
      >
      <button
        type="button"
        class="pill"
        class:active={statusFilter === 'FLOWN'}
        role="radio"
        aria-checked={statusFilter === 'FLOWN'}
        onclick={() => setStatus('FLOWN')}>{m.lib_filter_status_flown()}</button
      >
      <button
        type="button"
        class="pill"
        class:active={statusFilter === 'PLANNED'}
        role="radio"
        aria-checked={statusFilter === 'PLANNED'}
        onclick={() => setStatus('PLANNED')}>{m.lib_filter_status_planned()}</button
      >
    </div>
  </nav>

  {#if loading}
    <div class="loading" role="status" aria-live="polite">Loading…</div>
  {:else if filtered.length === 0}
    <div class="empty">{m.lib_empty()}</div>
  {:else}
    <ul class="grid" aria-label="Mission cards">
      {#each filtered as mission (mission.id)}
        <li>
          <button
            type="button"
            class="card"
            class:selected={selectedId === mission.id}
            style:--accent={mission.color}
            data-testid="mission-card-{mission.id}"
            onclick={() => selectMission(mission.id)}
          >
            <div class="card-accent" aria-hidden="true"></div>
            <div class="card-body">
              <header class="card-head">
                <span class="agency-badge" style:background-color={mission.color}>
                  {mission.agency}
                </span>
                <span class="card-status status-{mission.status.toLowerCase()}">
                  {mission.status}
                </span>
              </header>
              <h2 class="card-name">{mission.name ?? mission.id}</h2>
              {#if mission.type}
                <p class="card-type">{mission.type}</p>
              {/if}
              <div class="card-meta">
                <span class="card-year">{mission.year}</span>
                <span class="card-dest">{mission.dest}</span>
              </div>
              {#if mission.first}
                <p class="card-first">{mission.first}</p>
              {/if}
            </div>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<MissionPanel mission={selectedMission} open={panelOpen} onClose={closePanel} onFly={flyMission} />

<style>
  .library {
    padding: 18px 22px 40px;
    max-width: 1400px;
    margin: 0 auto;
  }

  .library-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 14px;
  }
  .library-header h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 4px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
  .counts {
    display: flex;
    gap: 12px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
  }
  .count-total {
    color: rgba(255, 255, 255, 0.45);
  }
  .count-filtered {
    color: #4ecdc4;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding: 8px 0 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 14px;
    overflow-x: auto;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
  }
  .filter-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.3);
    margin-right: 4px;
  }
  .pill {
    min-height: 32px;
    padding: 6px 14px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .pill:hover:not(.active) {
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.75);
  }
  .pill.active {
    background: rgba(68, 102, 255, 0.25);
    border-color: rgba(68, 102, 255, 0.5);
    color: #fff;
  }
  .pill:focus-visible {
    outline: 2px solid #4466ff;
    outline-offset: 2px;
  }

  .grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 600px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 960px) {
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 1280px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .card {
    width: 100%;
    text-align: left;
    background: rgba(10, 10, 22, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 4px 1fr;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    transition:
      border-color 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
    min-height: 44px;
  }
  .card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
  .card:focus-visible {
    outline: 2px solid var(--accent, #4466ff);
    outline-offset: 2px;
  }
  .card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 20px rgb(from var(--accent) r g b / 0.2);
  }
  .card-accent {
    background: var(--accent);
  }
  .card-body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .agency-badge {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
  .card-status {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid;
  }
  .status-active {
    color: #4ecdc4;
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.08);
  }
  .status-flown {
    color: rgba(255, 255, 255, 0.5);
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);
  }
  .status-planned {
    color: #4466ff;
    border-color: rgba(68, 102, 255, 0.4);
    background: rgba(68, 102, 255, 0.08);
  }

  .card-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    color: #fff;
    line-height: 1;
    margin: 0;
  }
  .card-type {
    font-family: 'Space Mono', monospace;
    font-size: 7px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }
  .card-meta {
    display: flex;
    gap: 10px;
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.3);
  }
  .card-first {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    margin: 0;
  }

  .loading,
  .empty {
    padding: 40px;
    text-align: center;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
  }
</style>
