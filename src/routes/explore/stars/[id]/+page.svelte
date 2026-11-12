<!--
  /explore/stars/<id> — one named star as an indexable page: the star panel's text (fact,
  bio, cultural note, culture doors) and its TECHNICAL rows, and for a host star its
  exoplanet system (each planet's overlay text and rows) as a section, in prerendered
  HTML, with links into the 3D explorer (?goto= or ?system=).
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { LocalizedCultureDoor } from '$lib/data/universe';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let star = $derived(data.star);
  let section = $derived(ogTitle(m.explore_page_title()));
  // The star's own text; a host-only star has none, so its first planet's, else the facts the page lists.
  let summary = $derived(
    metaDescription(
      [star.fact, star.bio].filter(Boolean).join(' ') ||
        star.planets[0]?.fact ||
        star.planets[0]?.cultureDoors[0]?.blurb ||
        [star.name, data.planetCount, data.rows[0]?.value].filter(Boolean).join(' · '),
    ),
  );
  let appHref = $derived(
    localHref(star.named ? `/explore?goto=${star.id}` : `/explore?system=${star.id}`),
  );
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/explore/stars/${star.id}`, loc);
    return [
      article({ headline: star.name, description: summary, url, inLanguage: loc }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/explore', loc) },
        { name: star.name, url },
      ]),
    ];
  });
</script>

{#snippet door(d: LocalizedCultureDoor)}
  <li>
    <strong>{d.work}{d.year ? ` · ${d.year}` : ''}</strong>
    <span class="note">{d.author}{d.media ? ` · ${d.media}` : ''}</span>
    {#if d.blurb}<span class="note">{d.blurb}</span>{/if}
  </li>
{/snippet}

<svelte:head>
  <title>{pageTitle(star.name, section)}</title>
  <meta name="description" content={summary} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/explore')}>{section}</a>
    <span class="sep">›</span>
    <span>{star.name}</span>
  </nav>

  <header>
    {#if data.kind}<p class="meta">{data.kind}</p>{/if}
    <h1 class="page-title">{star.name}</h1>
    {#if star.fact}<p class="lede page-lead">{star.fact}</p>{/if}
  </header>

  {#if star.bio}<p class="dispatch">{star.bio}</p>{/if}

  {#if star.cultural}
    <h2 class="page-section-label">{m.star_across_cultures()}</h2>
    <p>{star.cultural}</p>
  {/if}

  {#if star.cultureDoors.length}
    <section class="culture">
      <h2 class="page-section-label">{m.culture_heading()}</h2>
      <ul class="linklist wide">
        {#each star.cultureDoors as d (d.id)}{@render door(d)}{/each}
      </ul>
    </section>
  {/if}

  <section class="technical">
    <h2 class="page-section-label">{m.panel_tab_technical()}</h2>
    <dl class="facts">
      {#each data.rows as row (row.label)}
        <div>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  {#if star.planets.length}
    <section class="system" id="system">
      <h2 class="page-section-label">{m.star_tab_system()}</h2>
      <p>{data.planetCount}</p>
      {#each star.planets as p (p.id)}
        <section class="planet" id={p.id}>
          <h3 class="planet-name">{p.name}</h3>
          <p class="meta">{m.exo_kind()} · {star.name}</p>
          {#if p.fact}<p class="dispatch">{p.fact}</p>{/if}
          {#if p.bio}<p>{p.bio}</p>{/if}
          <dl class="facts">
            {#each data.planetRows[p.id] as row (row.label)}
              <div>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            {/each}
          </dl>
          {#if p.cultureDoors.length}
            <ul class="linklist wide">
              {#each p.cultureDoors as d (d.id)}{@render door(d)}{/each}
            </ul>
          {/if}
          {#if p.links.length}
            <ul class="linklist wide">
              {#each p.links as l (l.u)}
                <li>
                  <a href={l.u} target="_blank" rel="noopener noreferrer external">{l.l}</a>
                </li>
              {/each}
            </ul>
          {/if}
          <p class="actions">
            <a class="cta" href={localHref(`/explore?system=${star.id}&planet=${p.id}`)}>
              {m.launches_open_in_orrery()}
            </a>
          </p>
        </section>
      {/each}
    </section>
  {/if}

  <section class="science">
    <h2 class="page-section-label">{m.panel_tab_science()}</h2>
    <ul class="linklist wide">
      <li>
        <a href={localHref('/science/observation/hertzsprung-russell')}
          >{m.star_hr_article_link()}</a
        >
      </li>
    </ul>
    {#if star.links.length}
      <h2 class="page-section-label">{m.science_learn_more()}</h2>
      <ul class="linklist wide">
        {#each star.links as l (l.u)}
          <li>
            <a href={l.u} target="_blank" rel="noopener noreferrer external">{l.l}</a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <p class="actions">
    <a class="cta" href={appHref}>{m.launches_open_in_orrery()}</a>
    {#if star.planets.length && star.named}
      <a class="cta" href={localHref(`/explore?system=${star.id}`)}>{m.star_enter_system()}</a>
    {/if}
  </p>
</article>

<style>
  .planet {
    margin: 24px 0 0;
    padding-top: 8px;
    border-top: 1px solid var(--color-border);
  }
  .planet-name {
    margin: 0 0 4px;
    font-family: var(--font-display);
  }
</style>
