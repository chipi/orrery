<!--
  /explore/deep-sky/<id> — one deep-sky object as an indexable page: the panel's text (fact,
  bio), its distance / magnitude / constellation rows (each linked to its catalogue), the Data
  sources block, the culture door where there is one (M13), and a link into the 3D explorer
  (?deepsky=). One page per real object; the INDEX rows of its Milky Way / Local Group twins
  link here too.
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { absoluteUrl, article, breadcrumbList } from '$lib/json-ld';
  import { assetUrl } from '$lib/asset-url';
  import EntityHero from '$lib/components/EntityHero.svelte';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import DataSources from '$lib/components/DataSources.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let obj = $derived(data.object);
  let section = $derived(ogTitle(m.explore_page_title()));
  let summary = $derived(metaDescription([obj.fact, obj.bio].join(' ')));
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/explore/deep-sky/${obj.id}`, loc);
    return [
      article({
        headline: data.title,
        description: summary,
        url,
        inLanguage: loc,
        ...(obj.hero ? { image: absoluteUrl(assetUrl(obj.hero.full)) } : {}),
      }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/explore', loc) },
        { name: data.title, url },
      ]),
    ];
  });
</script>

<svelte:head>
  <title>{pageTitle(data.title, section)}</title>
  <meta name="description" content={summary} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/explore')}>{section}</a>
    <span class="sep">›</span>
    <span>{data.title}</span>
  </nav>

  <header>
    <p class="meta">{data.kind}</p>
    <h1 class="page-title">{data.title}</h1>
    <p class="lede page-lead">{obj.fact}</p>
  </header>

  {#if obj.hero}<EntityHero hero={obj.hero} credit={!obj.gallery} />{/if}

  <p class="dispatch">{obj.bio}</p>

  {#if obj.gallery}<p>{obj.gallery.caption}</p>{/if}

  {#if data.rows.length}
    <dl class="facts">
      {#each data.rows as row (row.label)}
        <div>
          <dt>{row.label}</dt>
          <dd>
            {row.value}
            {#if row.src}
              <a class="src" href={row.src.url} target="_blank" rel="noopener noreferrer external"
                >{row.src.label}</a
              >
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  {/if}

  {#if obj.gatewaySystem}
    <p>{m.explore_ds_gateway_note()}</p>
    <ul class="linklist wide">
      <li>
        <a href={localHref(`/explore/stars/${obj.gatewaySystem}`)}>{m.explore_ds_gateway()} →</a>
      </li>
    </ul>
  {/if}

  <DataSources items={data.sources} links={data.recordLinks} />

  {#if obj.cultureDoors.length}
    <section class="culture">
      <h2 class="page-section-label">{m.culture_heading()}</h2>
      <ul class="linklist wide">
        {#each obj.cultureDoors as d (d.id)}
          <li>
            <strong>{d.work}{d.year ? ` · ${d.year}` : ''}</strong>
            <span class="note">{d.author}{d.media ? ` · ${d.media}` : ''}</span>
            {#if d.blurb}<span class="note">{d.blurb}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if obj.links.length}
    <section class="science">
      <h2 class="page-section-label">{m.science_learn_more()}</h2>
      <ul class="linklist wide">
        {#each obj.links as l (l.u)}
          <li>
            <a href={l.u} target="_blank" rel="noopener noreferrer external">{l.l}</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if obj.gallery}
    <p class="src-line">{obj.gallery.credit}</p>
    <ul class="linklist wide">
      <li><a href={localHref('/gallery/deep-sky')}>{m.explore_ds_gallery_link()} →</a></li>
    </ul>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(`/explore?deepsky=${obj.id}`)}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
