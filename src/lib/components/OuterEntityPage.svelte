<!--
  OuterEntityPage — the template of /explore/galaxies/<id> and /explore/structures/<id> (ADR-096
  item 18), laid out as the deep-sky page: crumb, kind line, name, fact as the lede, bio, the
  value rows (the catalogue's source linked where there is one), the Data sources block, the
  overlay's learn-more links, the Related list (part of, members, same scale: computed from the
  census files, not prose) and the link into the scene (?context=<scale>&pick=<id>). No hero yet.
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
  import DataSources from '$lib/components/DataSources.svelte';
  import type { DataSourceItem } from '$lib/catalogue';
  import type { OuterRow, OuterSection } from '$lib/explore/outer-page';

  type Props = {
    data: {
      text: { fact: string; bio: string; links: { l: string; u: string }[] };
      /** Locale-free path of this page. */
      path: string;
      title: string;
      kind: string;
      rows: OuterRow[];
      sources: DataSourceItem[];
      sections: OuterSection[];
      /** Locale-free `/explore?context=<scale>&pick=<id>`. */
      openPath: string;
    };
  };
  let { data }: Props = $props();
  let section = $derived(ogTitle(m.explore_page_title()));
  let summary = $derived(metaDescription([data.text.fact, data.text.bio].join(' ')));
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(data.path, loc);
    return [
      article({ headline: data.title, description: summary, url, inLanguage: loc }),
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
    <p class="lede page-lead">{data.text.fact}</p>
  </header>

  <p class="dispatch">{data.text.bio}</p>

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

  <DataSources items={data.sources} />

  {#each data.sections as s (s.kind)}
    <section class="related">
      <h2 class="page-section-label">{s.heading}</h2>
      <ul class="linklist wide">
        {#each s.links as l (l.href)}
          <li><a href={localHref(l.href)}>{l.name}</a></li>
        {/each}
      </ul>
    </section>
  {/each}

  {#if data.text.links.length}
    <section class="science">
      <h2 class="page-section-label">{m.science_learn_more()}</h2>
      <ul class="linklist wide">
        {#each data.text.links as l (l.u)}
          <li>
            <a href={l.u} target="_blank" rel="noopener noreferrer external">{l.l}</a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(data.openPath)}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
