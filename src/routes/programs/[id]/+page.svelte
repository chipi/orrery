<!--
  /programs/[id] — full-page editorial for one program (PRD-029).
  Spine: hero → The land → Goals → Outcome → Narrative → Roster → links.
  Images embed inside the editorial (reuse refs resolve into existing
  mission/fleet galleries; program-owned images live under
  static/images/programs/{id}/).
-->
<script lang="ts">
  import { base } from '$app/paths';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import type { ProgramRosterItem } from '$types/program';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let p = $derived(data.program);
  // Insignia map — gate badges so unbadged entries (e.g. Mercury's
  // pre-patch-era flights) render nothing rather than firing a 404.
  let badges = $derived(data.badges ?? {});

  const KIND_LABEL: Record<string, string> = {
    'crewed-campaign': 'Crewed campaign',
    'robotic-campaign': 'Robotic campaign',
    station: 'Station',
    infrastructure: 'Infrastructure',
    'funding-line': 'Funding line',
  };

  function imgSrc(image: { reuse?: string; id?: string }): string {
    if (image.reuse) {
      const parts = image.reuse.split('/');
      const coll = parts[0];
      const id = parts.slice(1, -1).join('/');
      const n = parts[parts.length - 1];
      if (coll === 'missions') return `${base}/images/missions/${id}/${n}.webp`;
      if (coll === 'fleet') return `${base}/images/fleet-galleries/${id}/${n}.webp`;
    }
    if (image.id) return `${base}/images/programs/${p.id}/${image.id}.webp`;
    return '';
  }

  function pretty(id: string): string {
    const mm = id.match(/^apollo(\d+)$/i);
    if (mm) return `Apollo ${mm[1]}`;
    const map: Record<string, string> = {
      'saturn-v': 'Saturn V',
      'saturn-ib': 'Saturn IB',
      'apollo-csm-block-i': 'Apollo CSM · Block I',
      'apollo-csm-block-ii': 'Apollo CSM · Block II',
      'apollo-lm': 'Apollo Lunar Module',
      'lrv-apollo': 'Lunar Roving Vehicle',
      a7l: 'A7L suit',
      a7lb: 'A7LB suit',
    };
    if (map[id]) return map[id];
    if (/^lc-/i.test(id)) return id.toUpperCase();
    return id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function href(r: ProgramRosterItem): string | null {
    if (!r.linked_id) return null;
    if (r.ref === 'mission') return `${base}/missions?id=${r.linked_id}`;
    if (r.ref === 'fleet') return `${base}/fleet?id=${r.linked_id}`;
    return null;
  }

  let sections = $derived([
    { label: 'The land', blocks: p.the_land },
    { label: 'Goals', blocks: p.goals },
    { label: 'Outcome', blocks: p.outcome },
    { label: 'The story', blocks: p.narrative },
    { label: 'What it gave back', blocks: p.legacy },
    { label: 'What we can learn', blocks: p.lessons },
  ]);

  let missions = $derived(
    p.roster
      .filter((r) => r.ref === 'mission' || (!r.ref && !!r.name))
      .slice()
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
  );
  let fleet = $derived(p.roster.filter((r) => r.ref === 'fleet'));
  let heroSrc = $derived(p.hero ? imgSrc({ reuse: p.hero }) : '');

  // Master-detail: selecting a timeline mission shows its summary in the
  // pane beside the timeline (no navigation). Defaults to the first flagship.
  let firstLinked = $derived(missions.find((r) => r.linked_id)?.linked_id ?? null);
  let selected = $state<string | null>(null);
  let activeSel = $derived(selected ?? firstLinked);
  let selectedDetail = $derived(activeSel ? (data.missionDetails[activeSel] ?? null) : null);
</script>

<svelte:head>
  <title>{p.name} · Programs · Orrery</title>
  <meta name="description" content={p.tagline} />
</svelte:head>

<article class="program">
  <nav class="crumb">
    <a href="{base}/programs">Programs</a>
    <span class="sep">›</span>
    <span>{p.name}</span>
  </nav>

  <header class="hero">
    <div class="hero-text">
      <p class="meta">
        <AgencyBadge agency={p.agencies?.join(' / ') ?? p.agency} />
        <span>{p.agency} · {p.country} · {p.start_year}–{p.end_year ?? 'now'}</span>
      </p>
      <div class="title-row">
        <h1>{p.name}</h1>
        {#if badges[`program:${p.id}`]}
          <img class="prog-badge" src="{base}{badges[`program:${p.id}`]}" alt="" />
        {/if}
      </div>
      <p class="tagline">{p.tagline}</p>
      <p class="chips">
        <span class="chip">{KIND_LABEL[p.kind] ?? p.kind}</span>
        <span class="chip chip-status status-{p.status.toLowerCase()}">{p.status}</span>
      </p>
    </div>
    {#if heroSrc}
      <img class="hero-img" src={heroSrc} alt="" fetchpriority="high" decoding="async" />
    {/if}
  </header>

  {#each sections as sec (sec.label)}
    <section class="spine">
      <h2>{sec.label}</h2>
      {#each sec.blocks as block, i (i)}
        {#if block.type === 'prose'}
          <p>{block.md}</p>
        {:else if block.type === 'figure'}
          <figure class="fig fig-{block.align ?? 'full'}">
            <img src={imgSrc(block.image)} alt={block.caption} decoding="async" />
            <figcaption>{block.caption}</figcaption>
          </figure>
        {/if}
      {/each}
    </section>
  {/each}

  <section class="roster">
    <h2>Missions</h2>
    <div class="roster-split">
      <ol class="timeline">
        {#each missions as r, i (i)}
          <li class:context={!r.linked_id} class:sel={!!r.linked_id && r.linked_id === activeSel}>
            <span class="t-year">{r.year ?? ''}</span>
            <span class="t-dot"></span>
            <span class="t-body">
              {#if r.linked_id}
                {#if badges[`mission:${r.linked_id}`]}
                  <img class="t-patch" src="{base}{badges[`mission:${r.linked_id}`]}" alt="" />
                {/if}
                <button type="button" class="t-name" onclick={() => (selected = r.linked_id ?? null)}
                  >{pretty(r.linked_id)}</button
                >
              {:else}
                <span class="t-name t-ctx">{r.name}</span>
              {/if}
              {#if r.note}<span class="t-note">{r.note}</span>{/if}
            </span>
          </li>
        {/each}
      </ol>
      <aside class="detail" aria-live="polite">
        {#if selectedDetail}
          <img class="d-hero" src={imgSrc({ reuse: selectedDetail.hero })} alt="" decoding="async" />
          <p class="d-meta">
            {selectedDetail.year} · {selectedDetail.agency}{selectedDetail.type
              ? ` · ${selectedDetail.type}`
              : ''}
          </p>
          <h3 class="d-name">{selectedDetail.name}</h3>
          <p class="d-blurb">{selectedDetail.blurb}</p>
          <a class="d-open" href="{base}{selectedDetail.href}">Open the full mission →</a>
        {:else}
          <p class="d-empty">Select a mission to see its details.</p>
        {/if}
      </aside>
    </div>

    <h2>Hardware</h2>
    <ul class="hardware">
      {#each fleet as r, i (i)}
        <li>
          <a href={href(r)}>{pretty(r.linked_id ?? '')}</a>
          {#if r.role}<span class="role">{r.role}</span>{/if}
        </li>
      {/each}
    </ul>
  </section>

  {#if p.see_also && p.see_also.length}
    <section class="see-also">
      <h2>Go deeper in Orrery</h2>
      <ul>
        {#each p.see_also as s (s.href)}
          <li>
            <a href="{base}{s.href}"><span class="k">{s.kind}</span>{s.label} →</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if p.related_programs && p.related_programs.length}
    <section class="related">
      <h2>Related programs</h2>
      <p>
        {#each p.related_programs as rid (rid)}
          <a class="rel" href="{base}/programs/{rid}">{pretty(rid)}</a>
        {/each}
      </p>
    </section>
  {/if}

  <section class="sources">
    <h2>Sources</h2>
    <ul>
      {#each p.links as l (l.u)}
        <li><a href={l.u} target="_blank" rel="noopener noreferrer">{l.l} ↗</a></li>
      {/each}
    </ul>
  </section>
</article>

<style>
  .program {
    max-width: 760px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 24px) 20px 80px;
    font-family: var(--font-sans, system-ui, sans-serif);
    color: var(--color-text, #eef);
  }
  .crumb {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 18px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 6px;
  }
  .hero {
    margin-bottom: 40px;
  }
  .hero-img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    margin-top: 18px;
    display: block;
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(40px, 9vw, 72px);
    line-height: 1;
    letter-spacing: 1px;
    margin: 6px 0 10px;
  }
  .tagline {
    font-size: 19px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
    max-width: 40ch;
  }
  .chips {
    margin-top: 14px;
  }
  .chip {
    display: inline-block;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    padding: 4px 9px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    margin-right: 6px;
    color: rgba(255, 255, 255, 0.75);
  }
  .status-completed {
    border-color: rgba(120, 200, 160, 0.5);
    color: #9fe6c2;
  }
  .status-active {
    border-color: rgba(120, 170, 255, 0.5);
    color: #9fc2ff;
  }
  .status-cancelled {
    border-color: rgba(230, 140, 120, 0.5);
    color: #f0a892;
  }
  .spine {
    margin: 0 0 34px;
  }
  .spine h2,
  .roster h2,
  .related h2,
  .sources h2 {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #7fb0e0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 14px;
    margin: 0 0 14px;
  }
  .spine p {
    font-size: 17px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 16px;
  }
  .spine::after {
    content: '';
    display: block;
    clear: both;
  }
  .fig-full {
    margin: 24px 0;
    clear: both;
  }
  .fig-right {
    float: right;
    width: 42%;
    margin: 6px 0 14px 26px;
  }
  .fig-left {
    float: left;
    width: 42%;
    margin: 6px 26px 14px 0;
  }
  @media (max-width: 640px) {
    .fig-right,
    .fig-left {
      float: none;
      width: 100%;
      margin: 20px 0;
    }
  }
  .fig img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    display: block;
  }
  .fig figcaption {
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 8px;
    font-style: italic;
  }
  .timeline {
    list-style: none;
    padding: 0;
    margin: 0 0 30px;
    border-left: 2px solid rgba(127, 176, 224, 0.28);
    margin-left: 6px;
  }
  .timeline li {
    position: relative;
    padding: 2px 0 16px 22px;
  }
  .timeline .t-dot {
    position: absolute;
    left: -7px;
    top: 6px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #7fb0e0;
    box-shadow: 0 0 0 3px rgba(8, 10, 22, 1);
  }
  .timeline li.context .t-dot {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.25);
  }
  .timeline .t-year {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.45);
    margin-right: 10px;
  }
  .timeline .t-name {
    color: #cfe3fb;
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
  }
  .timeline .t-name.t-ctx {
    color: rgba(255, 255, 255, 0.42);
    font-weight: 400;
  }
  .timeline .t-note {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }
  .roster-split {
    display: grid;
    grid-template-columns: minmax(190px, 250px) 1fr;
    gap: 30px;
    align-items: start;
    margin-bottom: 30px;
  }
  .roster-split .timeline {
    margin: 0;
  }
  @media (max-width: 640px) {
    .roster-split {
      grid-template-columns: 1fr;
      gap: 18px;
    }
  }
  button.t-name {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }
  .timeline li.sel .t-dot {
    background: #fff;
    box-shadow:
      0 0 0 3px rgba(8, 10, 22, 1),
      0 0 10px rgba(127, 176, 224, 0.9);
  }
  .timeline li.sel .t-name {
    color: #fff;
  }
  .detail {
    position: sticky;
    top: calc(var(--nav-height, 64px) + 20px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    overflow: hidden;
    padding-bottom: 16px;
  }
  .d-hero {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    display: block;
  }
  .d-meta {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin: 14px 16px 0;
  }
  .d-name {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 30px;
    letter-spacing: 1px;
    margin: 4px 16px 8px;
  }
  .d-blurb {
    font-size: 14px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 16px 14px;
  }
  .d-open {
    color: #cfe3fb;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    margin: 0 16px;
  }
  .d-empty {
    color: rgba(255, 255, 255, 0.5);
    padding: 22px 16px;
    font-size: 14px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .prog-badge {
    width: 80px;
    height: 80px;
    object-fit: contain;
    flex: 0 0 auto;
  }
  .t-patch {
    width: 26px;
    height: 26px;
    object-fit: contain;
    vertical-align: middle;
    margin-right: 8px;
  }
  .see-also ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .see-also li {
    margin-bottom: 8px;
  }
  .see-also a {
    color: #cfe3fb;
    text-decoration: none;
    font-size: 15px;
  }
  .see-also .k {
    display: inline-block;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 1px 6px;
    margin-right: 10px;
  }
  .hardware {
    list-style: none;
    padding: 0;
    margin: 0 0 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }
  .hardware li a {
    color: #cfe3fb;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
  }
  .hardware .role {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
  }
  .rel {
    color: #cfe3fb;
    text-decoration: none;
    margin-right: 14px;
    font-weight: 600;
  }
  .sources ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .sources li {
    margin-bottom: 6px;
  }
  .sources a {
    color: rgba(180, 205, 240, 0.85);
    font-size: 14px;
  }
</style>
