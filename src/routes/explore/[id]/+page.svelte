<!--
  /explore/<id> — one planet, moon or small body as an indexable page: the
  explore panel's text (type, fact, bio or description, surface, visits) in
  prerendered HTML, with a link into the 3D explorer (?id=).
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
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let body = $derived(data.body);
  let section = $derived(ogTitle(m.explore_page_title()));
  let summary = $derived(metaDescription([body.fact, body.text].filter(Boolean).join(' ')));
  let appHref = $derived(
    localHref(`/explore?id=${body.parent ? `${body.parent}:${body.id}` : body.id}`),
  );
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/explore/${body.id}`, loc);
    return [
      article({ headline: body.name, description: summary, url, inLanguage: loc }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/explore', loc) },
        { name: body.name, url },
      ]),
    ];
  });
</script>

<svelte:head>
  <title>{pageTitle(body.name, section)}</title>
  <meta name="description" content={summary} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity">
  <nav class="crumb">
    <a href={localHref('/explore')}>{section}</a>
    <span class="sep">›</span>
    <span>{body.name}</span>
  </nav>

  <header>
    {#if body.type}<p class="meta">{body.type}</p>{/if}
    <h1>{body.name}</h1>
    {#if body.fact}<p class="lede">{body.fact}</p>{/if}
  </header>

  {#if body.text}<p class="dispatch">{body.text}</p>{/if}
  {#if body.surface}<p>{body.surface}</p>{/if}

  {#if data.facts.length}
    <dl class="facts">
      {#each data.facts as row (row.label)}
        <div>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}

  {#if data.science.length}
    <section class="science">
      <h2>{m.panel_tab_science()}</h2>
      <ul class="linklist wide">
        {#each data.science as sec (sec.href)}
          <li>
            <a href={localHref(sec.href)}>{sec.title}</a>
            {#if sec.why}<span class="note">{sec.why}</span>{/if}
            {#if sec.intro}<span class="note">{sec.intro}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if body.visits.length}
    <section class="visits">
      <h2>{m.panel_tab_missions()}</h2>
      <ul>
        {#each body.visits as v (v)}<li>{v}</li>{/each}
      </ul>
    </section>
  {/if}

  <p class="actions">
    <a class="cta" href={appHref}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
