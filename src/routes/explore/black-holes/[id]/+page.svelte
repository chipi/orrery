<!--
  /explore/black-holes/<id> — one black hole as an indexable page: the panel's text (fact,
  bio, discovery line), its mass / distance / Schwarzschild radius for the three real holes,
  and a link into the 3D explorer (?bh=). Gargantua is fiction: a visible badge, no figures,
  nothing styled as a measurement.
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList, absoluteUrl } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let hole = $derived(data.hole);
  let fiction = $derived(hole.kind === 'fictional');
  let section = $derived(ogTitle(m.explore_page_title()));
  let summary = $derived(
    metaDescription([hole.fact, hole.bio].filter(Boolean).join(' ') || hole.discovery),
  );
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/explore/black-holes/${hole.id}`, loc);
    return [
      article({
        headline: hole.name,
        description: summary,
        url,
        inLanguage: loc,
        ...(data.hero ? { image: absoluteUrl(data.hero.src) } : {}),
      }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/explore', loc) },
        { name: hole.name, url },
      ]),
    ];
  });
</script>

<svelte:head>
  <title>{pageTitle(hole.name, section)}</title>
  <meta name="description" content={summary} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading" class:fiction>
  <nav class="crumb page-crumb">
    <a href={localHref('/explore')}>{section}</a>
    <span class="sep">›</span>
    <span>{hole.name}</span>
  </nav>

  <header>
    <p class="meta">{data.kind}</p>
    <h1 class="page-title">{hole.name}</h1>
    {#if fiction}<p class="badge" data-testid="bh-fiction-badge">{m.bh_fiction_badge()}</p>{/if}
    {#if hole.fact}<p class="lede page-lead">{hole.fact}</p>{/if}
  </header>

  {#if data.hero}
    <figure class="hero">
      <img {...responsive(data.hero.src, IMAGE_SIZES.full)} alt={data.hero.alt} decoding="async" />
    </figure>
  {/if}

  {#if hole.bio}<p class="dispatch">{hole.bio}</p>{/if}
  <p class="discovery">{hole.discovery}</p>

  {#if data.rows.length}
    <dl class="facts">
      {#each data.rows as row (row.label)}
        <div>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}

  {#if hole.cultureDoors.length}
    <section class="culture">
      <h2 class="page-section-label">{m.culture_heading()}</h2>
      <ul class="linklist wide">
        {#each hole.cultureDoors as d (d.id)}
          <li>
            <strong>{d.work}{d.year ? ` · ${d.year}` : ''}</strong>
            <span class="note">{d.author}{d.media ? ` · ${d.media}` : ''}</span>
            {#if d.blurb}<span class="note">{d.blurb}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="science">
    <h2 class="page-section-label">{m.panel_tab_science()}</h2>
    <ul class="linklist wide">
      <li>
        <a href={localHref(`/science/observation/${hole.scienceSection}`)}
          >{m.explore_bh_learn_more()}</a
        >
      </li>
    </ul>
  </section>

  <p class="actions">
    <a class="cta" href={localHref(`/explore?bh=${hole.id}`)}>{m.launches_open_in_orrery()}</a>
  </p>
</article>

<style>
  /* Fiction is marked, not dressed as a measurement: a dashed, muted label. */
  .badge {
    display: inline-block;
    margin: 0 0 12px;
    padding: 4px 10px;
    border: 1px dashed var(--color-text-label);
    border-radius: 4px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--color-text-label);
  }
  .discovery {
    color: var(--color-text-label);
  }
  .fiction .discovery {
    font-style: italic;
  }
</style>
