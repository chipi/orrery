<!--
  /explore/stars — every star with its own page, A–Z in the reader's language: the
  named stars of the stellar neighbourhood and the stars with known planets. Static
  HTML from a server load, so the links are in the prerendered page (ADR-096 item 11).
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
      { name: m.stars_hub_title(), url: canonicalUrl('/explore/stars', loc) },
    ]);
  });
</script>

<svelte:head>
  <title>{pageTitle(m.stars_hub_title())}</title>
  <meta name="description" content={metaDescription(m.stars_hub_intro())} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/explore/hub')}>{m.nav_group_explore()}</a>
    <span class="sep">›</span>
    <span>{m.stars_hub_title()}</span>
  </nav>

  <header>
    <h1 class="page-title">{m.stars_hub_title()}</h1>
    <p class="lede page-lead">{m.stars_hub_intro()}</p>
  </header>

  <ul class="linklist wide" data-testid="stars-hub-list">
    {#each data.stars as s (s.id)}
      <li>
        <a href={localHref(`/explore/stars/${s.id}`)}>{s.name}</a>
        {#if s.planets}<span class="year">⊕ {m.star_system_planet_count({ count: s.planets })}</span
          >{/if}
        {#if s.fact}<span class="note">{s.fact}</span>{/if}
      </li>
    {/each}
  </ul>
</article>
