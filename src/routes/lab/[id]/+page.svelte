<!--
  /lab/<formula> — one Lab calculator as an indexable page. Every string is
  resolved in +page.server.ts; this component imports no Lab code, so the page
  stays light and the calculator itself is one link away in /lab.
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import 'katex/dist/katex.min.css';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const SOURCE_LABEL: Record<string, string> = {
    hyperphysics: 'HyperPhysics',
    'nasa-glenn': 'NASA Glenn',
    wikipedia: 'Wikipedia',
  };
  let section = $derived(ogTitle(m.lab_ui_doc_title()));
  let summary = $derived(metaDescription(data.inWords ?? data.title));
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/lab/${data.id}`, loc);
    return [
      article({ headline: data.title, description: summary, url, inLanguage: loc }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/lab', loc) },
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
    <a href={localHref('/lab')}>{section}</a>
    <span class="sep">›</span>
    <span>{data.title}</span>
  </nav>

  <h1 class="page-title">{data.title}</h1>

  {#if data.equation}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX HTML rendered at build from registry LaTeX (author-controlled) -->
    <div class="equation">{@html data.equation}</div>
  {/if}

  {#if data.inWords}<p class="dispatch">{data.inWords}</p>{/if}

  {#if data.parameters.length}
    <section class="parameters">
      <h2 class="page-section-label">{m.lab_ui_aria_parameters()}</h2>
      <dl class="facts">
        {#each data.parameters as row (row.label)}
          <div>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/if}

  {#if data.results.length}
    <section class="results">
      <h2 class="page-section-label">{m.lab_ui_aria_results()}</h2>
      <dl class="facts">
        {#each data.results as row (row.label)}
          <div>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {:else if data.outputs.length}
    <section class="results">
      <h2 class="page-section-label">{m.lab_ui_aria_results()}</h2>
      <ul>
        {#each data.outputs as label (label)}<li>{label}</li>{/each}
      </ul>
    </section>
  {/if}

  {#if data.assumptions.length}
    <p class="assumptions">
      <strong>{m.lab_ui_assumptions_label()}</strong>
      {data.assumptions.join(' · ')}
    </p>
  {/if}

  {#if data.buildsOn.length}
    <section class="builds-on">
      <h2 class="page-section-label">{m.lab_ui_builds_on()}</h2>
      <ul class="linklist">
        {#each data.buildsOn as f (f.id)}
          <li><a href={localHref(`/lab/${f.id}`)}>{f.title}</a></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.sameDomain.length}
    <section class="same-domain">
      <h2 class="page-section-label">{m.lab_ui_title()}</h2>
      <ul class="linklist">
        {#each data.sameDomain as f (f.id)}
          <li><a href={localHref(`/lab/${f.id}`)}>{f.title}</a></li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.citation || data.learnMore}
    <p class="learn">
      <span>{m.lab_ui_learn_more()}</span>
      {#if data.citation}
        <a href={localHref(`/science/${data.citation}`)}>{m.lab_ui_learn_more_science()}</a>
      {/if}
      {#if data.learnMore}
        <a href={data.learnMore.url} target="_blank" rel="noopener noreferrer"
          >{SOURCE_LABEL[data.learnMore.source]} ↗</a
        >
      {/if}
    </p>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref('/lab')}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
