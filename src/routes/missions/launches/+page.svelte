<script lang="ts">
  /**
   * /missions/launches — global launches calendar (PRD-020 / RFC-023).
   *
   * Hybrid UI: horizontal month strip + vertical chronological timeline.
   * Two modes: UPCOMING (default) and HISTORIC. URL-encoded filter state.
   *
   * v0.1 ships the route + UPCOMING/HISTORIC toggle + month-strip jump-
   * to-month + timeline. Full filter palette (agency / vehicle / orbit /
   * outcome / year-range / tier) lands as polish in S8b.
   */

  import { onMount, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import {
    loadUpcoming,
    loadHistoricDecade,
    decadeForYear,
    groupByMonth,
    type Manifest,
  } from '$lib/launches/manifest.js';
  import MonthStrip from '$lib/components/launches/MonthStrip.svelte';
  import Timeline from '$lib/components/launches/Timeline.svelte';

  type Mode = 'upcoming' | 'historic';

  let mode: Mode = $state('upcoming');
  let manifest: Manifest = $state({
    version: 1,
    generated_at: null,
    sources_active: [],
    entries: {},
  });
  let loading = $state(true);
  let activeMonth: string | null = $state(null);

  let entries = $derived(Object.values(manifest.entries));
  let sorted = $derived(
    entries
      .slice()
      .sort((a, b) =>
        mode === 'upcoming' ? a.net.localeCompare(b.net) : b.net.localeCompare(a.net),
      ),
  );
  let months = $derived(groupByMonth(mode === 'upcoming' ? sorted : sorted.slice(0, 200)));

  async function loadForMode(m: Mode) {
    loading = true;
    if (m === 'upcoming') {
      manifest = await loadUpcoming();
    } else {
      manifest = await loadHistoricDecade(decadeForYear(new Date().getUTCFullYear()));
    }
    loading = false;
    if (months.length > 0) activeMonth = months[0].key;
  }

  function setMode(m: Mode) {
    if (m === mode) return;
    mode = m;
    pushUrl();
    void loadForMode(m);
  }

  function applyUrl(url: URL) {
    const m = url.searchParams.get('mode');
    mode = m === 'historic' ? 'historic' : 'upcoming';
  }

  function pushUrl() {
    const params = new URLSearchParams();
    if (mode !== 'upcoming') params.set('mode', mode);
    const qs = params.toString();
    const target = `${base}/missions/launches${qs ? `?${qs}` : ''}`;
    if (target !== $page.url.pathname + $page.url.search) {
      goto(target, { replaceState: true, keepFocus: true, noScroll: true });
    }
  }

  function jumpToMonth(key: string) {
    activeMonth = key;
    const el = document.getElementById(`month-${key}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    applyUrl($page.url);
    void loadForMode(mode);
  });

  $effect(() => {
    const url = $page.url;
    untrack(() => {
      applyUrl(url);
      void loadForMode(mode);
    });
  });

  // GCAT release surfaced in citation strip.
  let gcatRelease = $derived(manifest.gcat_release);
</script>

<svelte:head>
  <title>Launches Calendar — Orrery</title>
  <meta
    name="description"
    content="Global spaceflight launches calendar — upcoming and historic. Sourced agency-first from NASA, SpaceX, ESA, Jonathan McDowell's GCAT, and Launch Library 2."
  />
</svelte:head>

<main
  class="launches-page"
  data-route-ready={!loading}
  data-loading={loading ? 'true' : null}
  data-mode={mode}
>
  <header class="page-header">
    <h1 class="page-title">Launches Calendar</h1>
    <p class="page-subtitle">
      Upcoming and historic global spaceflight launches. Agency-first sourcing with
      provenance per row.
    </p>
    <nav class="mode-tabs" aria-label="Launches view mode">
      <button
        type="button"
        class="tab"
        class:active={mode === 'upcoming'}
        onclick={() => setMode('upcoming')}
      >
        Upcoming
      </button>
      <button
        type="button"
        class="tab"
        class:active={mode === 'historic'}
        onclick={() => setMode('historic')}
      >
        Historic
      </button>
    </nav>
  </header>

  {#if loading}
    <p class="loading">Loading launches…</p>
  {:else}
    <MonthStrip {months} activeKey={activeMonth} onSelect={jumpToMonth} />
    <Timeline {months} {mode} />
  {/if}

  <footer class="citations">
    <p>
      Launch data sourced agency-first from NASA, SpaceX, ESA, and Jonathan
      McDowell's <a
        href="https://planet4589.org/space/gcat/"
        rel="noopener noreferrer external"
        hreflang="en"
        >General Catalog of Artificial Space Objects (GCAT){gcatRelease ? ` Release ${gcatRelease}` : ''}</a
      >
      (CC-BY-4.0); gap-fill from
      <a href="https://thespacedevs.com/llapi" rel="noopener noreferrer external" hreflang="en"
        >Launch Library 2</a
      >.
    </p>
  </footer>
</main>

<style>
  .launches-page {
    min-height: 100vh;
    padding-top: 52px; /* nav bar */
    background: #04040c;
    color: #e6e8ee;
  }

  .page-header {
    padding: 18px 12px 0;
  }

  @media (min-width: 768px) {
    .page-header {
      padding: 24px 24px 0;
    }
  }

  .page-title {
    margin: 0;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 1px;
    color: #fff;
  }

  .page-subtitle {
    margin: 4px 0 16px;
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(230, 232, 238, 0.7);
    max-width: 60ch;
  }

  .mode-tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0 -12px;
    padding: 0 12px;
  }

  @media (min-width: 768px) {
    .mode-tabs {
      margin: 0 -24px;
      padding: 0 24px;
    }
  }

  .tab {
    padding: 12px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(230, 232, 238, 0.6);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    min-height: 44px;
  }

  .tab:hover {
    color: #fff;
  }

  .tab.active {
    color: #4466ff;
    border-bottom-color: #4466ff;
  }

  .loading {
    padding: 32px 16px;
    color: rgba(230, 232, 238, 0.5);
    font-family: 'Space Mono', monospace;
    text-align: center;
  }

  .citations {
    padding: 24px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(230, 232, 238, 0.6);
    line-height: 1.6;
  }

  .citations a {
    color: #4ecdc4;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  @media (min-width: 768px) {
    .citations {
      padding: 28px 24px;
    }
  }
</style>
