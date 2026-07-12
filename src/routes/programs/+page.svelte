<!--
  /programs — editorial index (PRD-029). Era-spined by default, toggle to
  group by agency. Not a dense grid: the browse reads as the arc of
  spaceflight. Cards deep-link into the full editorial page.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import type { ProgramIndexEntry } from '$types/program';
  import type { PageData } from './$types';

  const agencyStr = (p: ProgramIndexEntry) => p.agencies?.join(' / ') ?? p.agency;

  let { data }: { data: PageData } = $props();
  let programs = $derived(data.programs);
  let badges = $derived(data.badges ?? {});
  let mode = $state<'era' | 'kind' | 'agency'>('era');

  const KIND_OF: Record<string, string> = {
    'crewed-campaign': 'Crewed campaigns',
    station: 'Space stations',
    'robotic-campaign': 'Robotic exploration',
    infrastructure: 'Infrastructure',
    'funding-line': 'Funding lines',
  };
  const KIND_ORDER = [
    'Crewed campaigns',
    'Space stations',
    'Robotic exploration',
    'Infrastructure',
    'Funding lines',
  ];

  const ERA_OF: Record<string, string> = {
    'first-steps': 'The Space Race · 1957–1975',
    'space-race': 'The Space Race · 1957–1975',
    'lunar-era': 'The Space Race · 1957–1975',
    'first-stations': 'Shuttle & Stations · 1971–2011',
    'shuttle-and-mir': 'Shuttle & Stations · 1971–2011',
    'iss-assembly': 'The ISS era · 1998–2030',
    'commercial-era': 'New Space & the return to the Moon · 2020+',
    'lunar-return': 'New Space & the return to the Moon · 2020+',
    'mars-era': 'New Space & the return to the Moon · 2020+',
  };
  const ERA_ORDER = [
    'The Space Race · 1957–1975',
    'Shuttle & Stations · 1971–2011',
    'The ISS era · 1998–2030',
    'New Space & the return to the Moon · 2020+',
  ];

  function heroSrc(hero?: string): string {
    if (!hero) return '';
    const parts = hero.split('/');
    const coll = parts[0];
    const id = parts.slice(1, -1).join('/');
    const n = parts[parts.length - 1];
    if (coll === 'missions') return `${base}/images/missions/${id}/${n}.webp`;
    if (coll === 'fleet') return `${base}/images/fleet-galleries/${id}/${n}.webp`;
    return '';
  }

  let groups = $derived.by(() => {
    const by = new Map<string, ProgramIndexEntry[]>();
    for (const p of programs) {
      const key =
        mode === 'era'
          ? (ERA_OF[p.epoch] ?? 'Other')
          : mode === 'kind'
            ? (KIND_OF[p.kind] ?? 'Other')
            : p.agency;
      if (!by.has(key)) by.set(key, []);
      by.get(key)!.push(p);
    }
    const order = mode === 'era' ? ERA_ORDER : mode === 'kind' ? KIND_ORDER : null;
    const keys = order
      ? order.filter((k) => by.has(k))
      : [...by.keys()].sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({ heading: k, items: by.get(k)! }));
  });
</script>

<svelte:head>
  <title>Programs · Orrery</title>
  <meta name="description" content="The campaigns that shaped spaceflight — Apollo, ISS, Artemis and more." />
</svelte:head>

<div class="programs-index">
  <header class="head">
    <h1>Programs</h1>
    <p class="intro">
      Spaceflight is usually remembered as a string of missions and machines. But nothing here
      happened on its own — every rocket, every landing, every station was the work of a
      <em>program</em>: a sustained campaign, backed by a nation or a company, reaching for something
      specific. The programs are where the ambition lived and the rivalries played out. Read
      together, they are the whole arc of getting off the ground — from the first firsts of the Space
      Race to the stations, telescopes, and futures being built right now.
    </p>
    <p class="lede">Browse by era to follow the story in time, by kind to compare like with like, or by agency to see who did what.</p>
    <div class="toggle" role="group" aria-label="Group programs by">
      <button class:active={mode === 'era'} onclick={() => (mode = 'era')}>By era</button>
      <button class:active={mode === 'kind'} onclick={() => (mode = 'kind')}>By kind</button>
      <button class:active={mode === 'agency'} onclick={() => (mode = 'agency')}>By agency</button>
    </div>
  </header>

  {#each groups as g (g.heading)}
    <section class="group">
      <h2>{g.heading}</h2>
      <div class="cards">
        {#each g.items as p (p.id)}
          <a class="card" href="{base}/programs/{p.id}">
            {#if heroSrc(p.hero)}
              <img src={heroSrc(p.hero)} alt="" loading="lazy" decoding="async" />
            {/if}
            <div class="card-body">
              <p class="c-meta">
                <AgencyBadge agency={agencyStr(p)} />
                <span>{p.agency} · {p.start_year}–{p.end_year ?? 'now'}</span>
              </p>
              <div class="c-title-row">
                <h3>{p.name}</h3>
                {#if badges[`program:${p.id}`]}
                  <img class="c-badge" src="{base}{badges[`program:${p.id}`]}" alt="" loading="lazy" />
                {/if}
              </div>
              <p class="c-hook">{p.tagline}</p>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .programs-index {
    max-width: 1040px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 24px) 20px 80px;
    color: var(--color-text, #eef);
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(40px, 8vw, 64px);
    letter-spacing: 1px;
    margin: 0 0 8px;
  }
  .intro {
    font-size: 18px;
    line-height: 1.62;
    color: rgba(255, 255, 255, 0.84);
    max-width: 66ch;
    margin: 0 0 14px;
  }
  .intro :global(em) {
    font-style: italic;
    color: #cfe3fb;
  }
  .lede {
    font-size: 13px;
    line-height: 1.5;
    letter-spacing: 0.2px;
    color: rgba(255, 255, 255, 0.5);
    max-width: 60ch;
  }
  .toggle {
    margin: 16px 0 8px;
  }
  .toggle button {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    padding: 7px 14px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
  }
  .toggle button:not(:first-child) {
    border-left: none;
  }
  .toggle button:first-child {
    border-radius: 4px 0 0 4px;
  }
  .toggle button:last-child {
    border-radius: 0 4px 4px 0;
    border-left: none;
  }
  .toggle button.active {
    background: rgba(127, 176, 224, 0.18);
    border-color: rgba(127, 176, 224, 0.6);
    color: #cfe3fb;
  }
  .group h2 {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7fb0e0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 16px;
    margin: 34px 0 16px;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .card {
    display: block;
    text-decoration: none;
    color: inherit;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.02);
    transition: border-color 0.15s;
  }
  .card:hover {
    border-color: rgba(127, 176, 224, 0.5);
  }
  .card > img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
  }
  .card-body {
    padding: 14px 16px 18px;
  }
  .c-meta {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
  }
  .c-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .card h3 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 28px;
    letter-spacing: 1px;
    margin: 4px 0 6px;
  }
  .c-badge {
    width: 34px;
    height: 34px;
    object-fit: contain;
    flex: 0 0 auto;
    margin-bottom: 2px;
  }
  .c-hook {
    font-size: 14px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.7);
  }
</style>
