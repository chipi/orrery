<!--
  /explore/black-holes — every black hole with its own page, A–Z in the reader's language:
  the three real ones and Gargantua, the invented one from the film Interstellar (badged
  as fiction). Static HTML from a server load, so the links are in the prerendered page
  (ADR-096 item 11).
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { breadcrumbList } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    return breadcrumbList([
      { name: m.nav_group_explore(), url: canonicalUrl('/explore/hub', loc) },
      { name: m.black_holes_hub_title(), url: canonicalUrl('/explore/black-holes', loc) },
    ]);
  });
  const KIND = {
    supermassive: m.explore_bh_kind_supermassive,
    stellar: m.explore_bh_kind_stellar,
    fictional: m.explore_bh_kind_fictional,
  };
</script>

<svelte:head>
  <title>{pageTitle(m.black_holes_hub_title())}</title>
  <meta name="description" content={metaDescription(m.black_holes_hub_intro())} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/explore/hub')}>{m.nav_group_explore()}</a>
    <span class="sep">›</span>
    <span>{m.black_holes_hub_title()}</span>
  </nav>

  <header>
    <h1 class="page-title">{m.black_holes_hub_title()}</h1>
    <p class="lede page-lead">{m.black_holes_hub_intro()}</p>
  </header>

  <ul class="linklist wide" data-testid="black-holes-hub-list">
    {#each data.holes as h (h.id)}
      <li>
        <a href={localHref(`/explore/black-holes/${h.id}`)}>{h.name}</a>
        <span class="year">{KIND[h.kind]()}</span>
        {#if h.fact}<span class="note">{h.fact}</span>{/if}
      </li>
    {/each}
  </ul>
</article>
