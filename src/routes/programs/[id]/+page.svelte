<!--
  /programs/[id] — full-page editorial for one program (PRD-029).
  Spine: hero → The land → Goals → Outcome → Narrative → Roster → links.
  Images embed inside the editorial (reuse refs resolve into existing
  mission/fleet galleries; program-owned images live under
  static/images/programs/{id}/).
-->
<script lang="ts">
  import { responsive } from '$lib/responsive-image.svelte';
  import { localHref } from '$lib/locale';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { assetUrl } from '$lib/asset-url';
  import AgencyBadge from '$lib/components/AgencyBadge.svelte';
  import EntityThumb from '$lib/components/EntityThumb.svelte';
  import MiniCard from '$lib/components/MiniCard.svelte';
  import CardRail from '$lib/components/CardRail.svelte';
  import {
    deeperLinks,
    hardwareRows,
    milestoneRows,
    missionRows,
    programSections,
    rowPath,
    surfaceSiteHref,
  } from '$lib/program-page';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import { article, breadcrumbList, absoluteUrl } from '$lib/json-ld';
  import { canonicalUrl, pageTitle, seoDescription, seoPageTitle } from '$lib/seo';
  import { getLocale } from '$lib/paraglide/runtime';
  import { countryLabel } from '$lib/country-label';
  import { programStatusLabel } from '$lib/status-label';
  import type { ProgramRosterItem } from '$types/program';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let p = $derived(data.program);
  // Insignia map — gate badges so unbadged entries (e.g. Mercury's
  // pre-patch-era flights) render nothing rather than firing a 404.
  let badges = $derived(data.badges ?? {});

  const KIND_LABEL: Record<string, () => string> = {
    'crewed-campaign': m.program_kind_crewed,
    'robotic-campaign': m.program_kind_robotic,
    station: m.program_kind_station,
    infrastructure: m.program_kind_infrastructure,
    'funding-line': m.program_kind_funding,
  };
  const LINK_KIND: Record<string, () => string> = {
    body: m.program_link_kind_body,
    explore: m.program_link_kind_explore,
    fleet: m.program_link_kind_fleet,
    gallery: m.program_link_kind_gallery,
    program: m.program_link_kind_program,
    science: m.program_link_kind_science,
  };
  const SURFACE_NAME: Record<string, () => string> = {
    moon: m.lab_body_moon,
    mars: m.lab_body_mars,
    earth: m.lab_body_earth,
    venus: m.lab_body_venus,
  };

  function imgSrc(image: { reuse?: string; id?: string }): string {
    if (image.reuse) {
      const parts = image.reuse.split('/');
      const coll = parts[0];
      const id = parts.slice(1, -1).join('/');
      const n = parts[parts.length - 1];
      if (coll === 'missions') return assetUrl(`/images/missions/${id}/${n}.webp`);
      if (coll === 'fleet') return assetUrl(`/images/fleet-galleries/${id}/${n}.webp`);
    }
    if (image.id) return assetUrl(`/images/programs/${p.id}/${image.id}.webp`);
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
    const path = rowPath(p.id, r);
    return path ? localHref(path) : null;
  }

  // The real (localised) name of a linked mission or craft; an id only when it could not be read.
  const missionName = (id: string) => data.missionDetails[id]?.name ?? pretty(id);
  const fleetName = (id: string) => data.fleetNames[id] ?? pretty(id);

  let sections = $derived([
    { label: m.program_section_land(), blocks: p.the_land },
    { label: m.program_section_goals(), blocks: p.goals },
    { label: m.program_section_outcome(), blocks: p.outcome },
    { label: m.program_section_story(), blocks: p.narrative },
    { label: m.program_section_legacy(), blocks: p.legacy },
    { label: m.program_section_lessons(), blocks: p.lessons },
  ]);

  // Chronological; entries without a date (future/TBD) sort to the bottom.
  let missions = $derived(missionRows(p.roster));
  let milestones = $derived(milestoneRows(p.roster));
  // A section with no rows draws nothing, label included.
  let has = $derived(new Set(programSections(p)));
  let deeper = $derived(deeperLinks(p.see_also));
  // Whether any roster entry is actually a clickable mission — drives the
  // master-detail pane. With none, we don't prompt the user to "select" one.
  let hasClickable = $derived(missions.some((r) => !!r.linked_id));
  let fleet = $derived(hardwareRows(p.roster));
  let modules = $derived(
    p.roster
      .filter((r) => r.ref === 'module')
      .slice()
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
  );
  let heroSrc = $derived(p.hero ? imgSrc({ reuse: p.hero }) : '');
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/programs/${p.id}`, loc);
    return [
      article({
        headline: p.name,
        description: p.tagline,
        url,
        inLanguage: loc,
        image: heroSrc ? absoluteUrl(heroSrc, base) : undefined,
      }),
      breadcrumbList([
        { name: m.programs_index_title(), url: canonicalUrl('/programs', loc) },
        { name: p.name, url },
      ]),
    ];
  });

  // Master-detail: selecting a timeline mission shows its summary in the
  // pane beside the timeline (no navigation). Defaults to the first flagship.
  let firstLinked = $derived(missions.find((r) => r.linked_id)?.linked_id ?? null);
  let selected = $state<string | null>(null);
  let activeSel = $derived(selected ?? firstLinked);
  const metaOf = (d: { year: number; agency: string; type?: string }) =>
    `${d.year} · ${d.agency}${d.type ? ` · ${d.type}` : ''}`;
  let selectedDetail = $derived(activeSel ? (data.missionDetails[activeSel] ?? null) : null);
</script>

<svelte:head>
  <title>{seoPageTitle(p.seo_title, pageTitle(p.name, m.programs_index_title()))}</title>
  <meta name="description" content={seoDescription(p.seo_description, p.tagline)} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="program page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref(`/programs`)}>{m.programs_index_title()}</a>
    <span class="sep">›</span>
    <span>{p.name}</span>
  </nav>

  <header class="hero">
    <div class="hero-text">
      <p class="meta">
        <AgencyBadge agency={p.agencies?.join(' / ') ?? p.agency} />
        <span
          >{p.agency} · {countryLabel(p.country)} · {p.start_year}–{p.end_year ??
            m.programs_meta_now()}</span
        >
      </p>
      <div class="title-row">
        <h1 class="page-title">{p.name}</h1>
        {#if badges[`program:${p.id}`]}
          <img class="prog-badge" src={assetUrl(badges[`program:${p.id}`])} alt="" />
        {/if}
      </div>
      <p class="tagline page-lead">{p.tagline}</p>
      <p class="meta-tags">
        <span class="meta-tag">{KIND_LABEL[p.kind]?.() ?? p.kind}</span>
        <span class="meta-tag meta-tag-status status-{p.status.toLowerCase()}"
          >{programStatusLabel(p.status)}</span
        >
      </p>
    </div>
    {#if heroSrc}
      <img
        class="hero-img"
        {...responsive(heroSrc, IMAGE_SIZES.full)}
        alt=""
        fetchpriority="high"
        decoding="async"
      />
    {/if}
  </header>

  {#each sections as sec, ki (ki + ':' + sec.label)}
    <section class="spine">
      <h2 class="page-section-label page-section-label--rule">{sec.label}</h2>
      {#each sec.blocks as block, i (i)}
        {#if block.type === 'prose'}
          <p>{block.md}</p>
        {:else if block.type === 'figure'}
          <figure class="fig fig-{block.align ?? 'full'}">
            <img
              {...responsive(
                imgSrc(block.image),
                block.align === 'left' || block.align === 'right'
                  ? IMAGE_SIZES.floatFig
                  : IMAGE_SIZES.column,
              )}
              alt={block.caption}
              decoding="async"
            />
            <figcaption>{block.caption}</figcaption>
          </figure>
        {/if}
      {/each}
    </section>
  {/each}

  {#if modules.length}
    <section class="assembly">
      <h2 class="page-section-label page-section-label--rule">{m.program_assembly_h()}</h2>
      <ol class="timeline mod-timeline">
        {#each modules as m, i (i)}
          <li>
            <span class="t-year">{m.year ?? ''}</span>
            <span class="t-dot"></span>
            <span class="t-body">
              {#if href(m)}
                <a class="t-name t-mod ui-hit" href={href(m)}
                  >{m.name ?? pretty(m.linked_id ?? '')}</a
                >
              {:else}
                <span class="t-name">{m.name ?? pretty(m.linked_id ?? '')}</span>
              {/if}
              {#if m.note}<span class="t-note">{m.note}</span>{/if}
            </span>
          </li>
        {/each}
      </ol>
      <p class="assembly-foot">
        <a href={localHref(`/${p.id}`)}>{m.program_assembly_cta()}</a>
      </p>
    </section>
  {/if}

  {#if has.has('missions')}
    <section class="roster">
      <h2 class="page-section-label page-section-label--rule">{m.program_section_missions()}</h2>
      <div class="roster-split" class:solo={!hasClickable}>
        <ol class="timeline">
          {#each missions as r, i (i)}
            <li class:context={!r.linked_id} class:sel={!!r.linked_id && r.linked_id === activeSel}>
              <span class="t-year">{r.year ?? ''}</span>
              <span class="t-dot"></span>
              <span class="t-body">
                {#if r.linked_id}
                  {#if badges[`mission:${r.linked_id}`]}
                    <img class="t-patch" src={assetUrl(badges[`mission:${r.linked_id}`])} alt="" />
                  {:else}
                    <span class="t-thumb"
                      ><EntityThumb
                        src={data.thumbs[`mission:${r.linked_id}`] ?? null}
                        fallback="none"
                      /></span
                    >
                  {/if}
                  <button
                    type="button"
                    class="t-name ui-hit"
                    onclick={() => (selected = r.linked_id ?? null)}
                    >{missionName(r.linked_id)}</button
                  >
                {:else if href(r)}
                  <a class="t-name t-link ui-hit" href={href(r)}>{r.name}</a>
                {:else}
                  <span class="t-name t-ctx">{r.name}</span>
                {/if}
                {#if r.note}<span class="t-note">{r.note}</span>{/if}
              </span>
            </li>
          {/each}
        </ol>
        {#if hasClickable}
          <aside class="detail" aria-live="polite">
            {#if selectedDetail}
              <img
                class="d-hero"
                {...responsive(imgSrc({ reuse: selectedDetail.hero }), IMAGE_SIZES.panel)}
                alt=""
                decoding="async"
              />
              <p class="d-meta" title={metaOf(selectedDetail)}>{metaOf(selectedDetail)}</p>
              <h3 class="d-name" title={selectedDetail.name}>{selectedDetail.name}</h3>
              <p class="d-blurb">{selectedDetail.blurb}</p>
              <a class="d-open" href={localHref(`${selectedDetail.href}&from=program:${p.id}`)}
                >{m.program_open_mission()}</a
              >
            {:else}
              <p class="d-empty">{m.program_select_mission()}</p>
            {/if}
          </aside>
        {/if}
      </div>
    </section>
  {/if}

  {#if has.has('milestones')}
    <section class="milestones">
      <h2 class="page-section-label page-section-label--rule">{m.program_section_milestones()}</h2>
      <ol class="timeline">
        {#each milestones as r, i (i)}
          <li class="context">
            <span class="t-year">{r.year ?? ''}</span>
            <span class="t-dot"></span>
            <span class="t-body">
              <span class="t-name t-ctx">{r.name}</span>
              {#if r.note}<span class="t-note">{r.note}</span>{/if}
            </span>
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if has.has('surface')}
    <section class="surface">
      <h2 class="page-section-label page-section-label--rule">{m.programs_on_surface()}</h2>
      <CardRail label={m.programs_on_surface()}>
        {#each data.siteCards as s (s.surface + s.site)}
          <li>
            <MiniCard
              href={localHref(surfaceSiteHref(s.surface, s.site))}
              hero={s.hero}
              kind={SURFACE_NAME[s.surface]?.() ?? s.surface}
              title={s.label}
            />
          </li>
        {/each}
      </CardRail>
    </section>
  {/if}

  {#if has.has('hardware')}
    <section class="hardware-section">
      <h2 class="page-section-label page-section-label--rule">{m.program_section_hardware()}</h2>
      <ul class="hardware">
        {#each fleet as r, i (i)}
          <li>
            <a class="hw-card" href={href(r)}>
              {#if r.linked_id && data.heroes[r.linked_id]}
                <img
                  class="hw-hero"
                  {...responsive(assetUrl(data.heroes[r.linked_id]), IMAGE_SIZES.miniHero)}
                  alt=""
                  width="72"
                  height="48"
                  loading="lazy"
                  decoding="async"
                />
              {:else}
                <span class="hw-hero hw-none" aria-hidden="true"></span>
              {/if}
              <span class="hw-body">
                <span class="hw-name">{fleetName(r.linked_id ?? '')}</span>
                {#if r.role}<span class="role">{r.role}</span>{/if}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if has.has('related')}
    <section class="related">
      <h2 class="page-section-label page-section-label--rule">{m.programs_related()}</h2>
      <CardRail label={m.programs_related()}>
        {#each data.related as r (r.id)}
          <li>
            <MiniCard
              href={localHref(`/programs/${r.id}`)}
              hero={r.hero}
              kind={r.agency}
              title={r.name}
              meta={r.start_year ? `${r.start_year}–${r.end_year ?? m.programs_meta_now()}` : null}
            />
          </li>
        {/each}
      </CardRail>
    </section>
  {/if}

  {#if has.has('deeper')}
    <section class="see-also">
      <h2 class="page-section-label page-section-label--rule">{m.programs_go_deeper()}</h2>
      <ul>
        {#each deeper as s (s.href)}
          <li>
            <a href={localHref(s.href)}
              ><span class="k">{LINK_KIND[s.kind]?.() ?? s.kind}</span>{s.label} →</a
            >
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if has.has('sources')}
    <section class="sources">
      <h2 class="page-section-label page-section-label--rule">{m.program_section_sources()}</h2>
      <ul>
        {#each p.links as l (l.u)}
          <li><a href={l.u} target="_blank" rel="noopener noreferrer">{l.l} ↗</a></li>
        {/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  .crumb a {
    text-decoration: underline;
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--color-text-label);
  }
  .meta-tags {
    margin-top: 14px;
  }
  .meta-tag {
    display: inline-block;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    padding: 4px 9px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    margin-right: 6px;
    color: rgba(255, 255, 255, 0.75);
  }
  .status-completed {
    border-color: color-mix(in srgb, var(--color-ok) 50%, transparent);
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
  /* Sections carry their own spacing; the label sits at their top. */
  .program .page-section-label {
    margin-top: 0;
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
    font-size: var(--size-caption);
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.55);
    margin-top: 8px;
    font-style: italic; /* a1-keep: caption */
    font-family: 'Crimson Pro', serif;
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
    background: var(--color-state);
    box-shadow: 0 0 0 3px rgba(8, 10, 22, 1);
  }
  .timeline li.context .t-dot {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.25);
  }
  .timeline .t-year {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.6);
    margin-right: 10px;
  }
  .timeline .t-name {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    font-size: 15px;
  }
  .timeline .t-name.t-ctx {
    color: var(--color-text-label);
    font-weight: 400;
  }
  .timeline .t-note {
    display: block;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
  }
  .assembly {
    margin: 0 0 34px;
  }
  .mod-timeline {
    margin-bottom: 16px;
  }
  a.t-mod,
  .timeline a.t-link {
    text-decoration: none;
  }
  .timeline a.t-link {
    font-weight: 400;
  }
  a.t-mod:hover,
  .timeline a.t-link:hover {
    text-decoration: underline;
  }
  .assembly-foot {
    margin: 0;
    font-size: 14px;
  }
  .assembly-foot a {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
  }
  .roster-split {
    display: grid;
    grid-template-columns: minmax(190px, 250px) 1fr;
    gap: 30px;
    align-items: start;
    margin-bottom: 30px;
  }
  /* No clickable mission → no detail pane; the timeline runs full width. */
  .roster-split.solo {
    grid-template-columns: 1fr;
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
    top: calc(var(--nav-height) + 20px);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    margin: 14px 16px 0;
  }
  /* The pane keeps one box for every mission (PG4, UXD-032): meta and name are one line, the blurb
     reserves three (the longest of the 70 linked missions' blurbs is three at pane width). */
  .d-meta,
  .d-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .d-name {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 30px;
    line-height: 1.2;
    letter-spacing: 1px;
    margin: 4px 16px 8px;
  }
  .d-blurb {
    font-size: 14px;
    line-height: 1.55;
    min-height: 4.65em;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 16px 14px;
  }
  .d-open {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    margin: 0 16px;
  }
  .d-empty {
    color: rgba(255, 255, 255, 0.5);
    padding: 22px 16px;
    min-height: 4.65em;
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
  .t-thumb {
    display: inline-block;
    vertical-align: middle;
    margin-right: 8px;
    line-height: 0;
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
    margin-bottom: 12px;
  }
  .surface,
  .hardware-section,
  .related {
    margin: 0 0 30px;
  }
  .see-also a {
    color: var(--color-accent);
    text-decoration: none;
    font-size: 15px;
  }
  .see-also .k {
    display: inline-block;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 1px 6px;
    margin-right: 10px;
  }
  .hardware {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 8px;
  }
  @media (max-width: 480px) {
    .hardware {
      grid-template-columns: 1fr;
    }
  }
  /* A compact card: 56 px tall, a rectangular mini hero at the left (E1, UXD-032). */
  .hw-card {
    display: grid;
    grid-template-columns: 72px 1fr;
    align-items: center;
    gap: 10px;
    height: 56px;
    padding: 4px;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    text-decoration: none;
    transition: border-color 0.15s;
  }
  .hw-card:hover,
  .hw-card:focus-visible {
    border-color: rgba(127, 176, 224, 0.5);
  }
  .hw-hero {
    width: 72px;
    height: 48px;
    object-fit: cover;
    border-radius: 4px;
    display: block;
  }
  .hw-none {
    background: rgba(255, 255, 255, 0.04);
  }
  .hardware .hw-body {
    min-width: 0;
  }
  .hw-name {
    display: block;
    color: var(--color-accent);
    font-weight: 600;
    font-size: 14px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .hardware .role {
    display: block;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
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
