<!--
  /programs — editorial index (PRD-029). Era-spined by default, toggle to
  group by agency. Not a dense grid: the browse reads as the arc of
  spaceflight. Cards deep-link into the full editorial page.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { assetUrl } from '$lib/asset-url';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { ProgramIndexEntry } from '$types/program';
  import type { PageData } from './$types';

  const agencyStr = (p: ProgramIndexEntry) => p.agencies?.join(' / ') ?? p.agency;

  let { data }: { data: PageData } = $props();
  let programs = $derived(data.programs);
  let badges = $derived(data.badges ?? {});
  let mode = $state<'era' | 'kind' | 'agency'>('era');

  // Opening graphic: a wall of the iconic program mission patches (existing,
  // vetted assets). Thematically the page's subject IS programs, and patches are
  // their signature. Capped so the header stays a band, not a gallery.
  let patchWall = $derived(Object.values(badges).slice(0, 28));

  // Group by a stable key; the heading label resolves per-locale via m.*().
  const ERA_KEY: Record<string, string> = {
    'first-steps': 'space-race',
    'space-race': 'space-race',
    'lunar-era': 'space-race',
    'first-stations': 'shuttle',
    'shuttle-and-mir': 'shuttle',
    'iss-assembly': 'iss',
    'commercial-era': 'newspace',
    'lunar-return': 'newspace',
    'mars-era': 'newspace',
  };
  const ERA_ORDER = ['space-race', 'shuttle', 'iss', 'newspace'];
  const ERA_LABEL: Record<string, () => string> = {
    'space-race': m.programs_era_space_race,
    shuttle: m.programs_era_shuttle,
    iss: m.programs_era_iss,
    newspace: m.programs_era_newspace,
  };

  const KIND_KEY: Record<string, string> = {
    'crewed-campaign': 'crewed',
    station: 'station',
    'robotic-campaign': 'robotic',
    infrastructure: 'infrastructure',
    'funding-line': 'funding',
  };
  const KIND_ORDER = ['crewed', 'station', 'robotic', 'infrastructure', 'funding'];
  const KIND_LABEL: Record<string, () => string> = {
    crewed: m.programs_kind_crewed,
    station: m.programs_kind_station,
    robotic: m.programs_kind_robotic,
    infrastructure: m.programs_kind_infrastructure,
    funding: m.programs_kind_funding,
  };

  function heroSrc(hero?: string): string {
    if (!hero) return '';
    const parts = hero.split('/');
    const coll = parts[0];
    const id = parts.slice(1, -1).join('/');
    const n = parts[parts.length - 1];
    if (coll === 'missions') return assetUrl(`/images/missions/${id}/${n}.webp`);
    if (coll === 'fleet') return assetUrl(`/images/fleet-galleries/${id}/${n}.webp`);
    return '';
  }

  let groups = $derived.by(() => {
    const by = new Map<string, ProgramIndexEntry[]>();
    for (const p of programs) {
      const key =
        mode === 'era'
          ? (ERA_KEY[p.epoch] ?? 'other')
          : mode === 'kind'
            ? (KIND_KEY[p.kind] ?? 'other')
            : p.agency;
      if (!by.has(key)) by.set(key, []);
      by.get(key)!.push(p);
    }
    const order = mode === 'era' ? ERA_ORDER : mode === 'kind' ? KIND_ORDER : null;
    const keys = order
      ? order.filter((k) => by.has(k))
      : [...by.keys()].sort((a, b) => a.localeCompare(b));
    const label = (k: string) =>
      mode === 'era' ? (ERA_LABEL[k]?.() ?? k) : mode === 'kind' ? (KIND_LABEL[k]?.() ?? k) : k;
    // Within every section, order chronologically by start date (then name).
    return keys.map((k) => ({
      key: k,
      heading: label(k),
      items: by
        .get(k)!
        .slice()
        .sort((a, b) => (a.start_year ?? 0) - (b.start_year ?? 0) || a.name.localeCompare(b.name)),
    }));
  });
</script>

<svelte:head>
  <title>Programs · Orrery</title>
  <meta
    name="description"
    content="The campaigns that shaped spaceflight — Apollo, ISS, Artemis and more."
  />
</svelte:head>

<div class="programs-index">
  <header class="head">
    {#if patchWall.length}
      <div class="patch-wall" aria-hidden="true">
        {#each patchWall as src (src)}
          <img src={assetUrl(src)} alt="" loading="eager" decoding="async" />
        {/each}
      </div>
    {/if}
    <h1>{m.programs_index_title()}</h1>
    <p class="intro">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output only, no user input -->
      {@html m.programs_index_intro({
        program: `<em>${m.programs_index_intro_program()}</em>`,
      })}
    </p>
    <p class="lede">{m.programs_index_browse_hint()}</p>
    <div class="toggle" role="group" aria-label={m.programs_group_aria()}>
      <button class:active={mode === 'era'} onclick={() => (mode = 'era')}
        >{m.programs_by_era()}</button
      >
      <button class:active={mode === 'kind'} onclick={() => (mode = 'kind')}
        >{m.programs_by_kind()}</button
      >
      <button class:active={mode === 'agency'} onclick={() => (mode = 'agency')}
        >{m.programs_by_agency()}</button
      >
    </div>
  </header>

  {#each groups as g (g.key)}
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
                <span>{p.agency} · {p.start_year}–{p.end_year ?? m.programs_meta_now()}</span>
              </p>
              <div class="c-title-row">
                <h3>{p.name}</h3>
                {#if badges[`program:${p.id}`]}
                  <img
                    class="c-badge"
                    src={assetUrl(badges[`program:${p.id}`])}
                    alt=""
                    loading="lazy"
                  />
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
    /* The sticky nav already occupies its height in flow (like /library, /fleet),
       so only breathing room here — NOT another --nav-height, which double-counted
       it and left a ~60px gap above the title. */
    padding: 24px 20px 80px;
    color: var(--color-text, #eef);
  }
  /* Opening graphic — a masked band of program mission patches (#programs hero). */
  .patch-wall {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px 14px;
    max-height: 128px;
    overflow: hidden;
    margin: 4px 0 20px;
    opacity: 0.92;
    /* Fade the band into the page at the horizontal edges + soften the clipped
       bottom row so it reads as a backdrop, not a cut-off grid. */
    -webkit-mask-image:
      linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent),
      linear-gradient(#000 62%, transparent);
    mask-image:
      linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent),
      linear-gradient(#000 62%, transparent);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }
  .patch-wall img {
    width: 54px;
    height: 54px;
    object-fit: contain;
    flex: none;
    filter: drop-shadow(0 2px 7px rgba(0, 0, 0, 0.55));
  }
  @media (max-width: 560px) {
    .patch-wall {
      max-height: 104px;
      gap: 10px 12px;
    }
    .patch-wall img {
      width: 44px;
      height: 44px;
    }
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
