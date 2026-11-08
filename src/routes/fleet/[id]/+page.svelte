<!--
  /fleet/<id> — one fleet entry as an indexable page: the panel's overview text
  (tagline, dispatch, description, facts and specs, linked missions) in
  prerendered HTML, with a link into the app (the /fleet?id= panel).
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { fleetStatusLabel } from '$lib/status-label';
  import { countryLabel } from '$lib/country-label';
  import { epochLabel } from '$lib/epoch-label';
  import { fleetSpecRows } from '$lib/fleet-spec-rows';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle, DEFAULT_OG_IMAGE } from '$lib/social-meta';
  import { article, breadcrumbList, absoluteUrl } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let entry = $derived(data.entry);
  let section = $derived(ogTitle(m.fleet_page_title()).split(/\s[—–]\s/)[0]);
  let summary = $derived(
    metaDescription([entry.tagline, entry.description].filter(Boolean).join(' ')),
  );
  let specs = $derived(fleetSpecRows(entry, getLocale()));
  let card = $derived(data.card);
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/fleet/${entry.id}`, loc);
    return [
      article({
        headline: entry.name,
        description: summary,
        url,
        inLanguage: loc,
        image: data.hero ? absoluteUrl(data.hero) : (card ?? DEFAULT_OG_IMAGE),
      }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/fleet', loc) },
        { name: entry.name, url },
      ]),
    ];
  });
</script>

<svelte:head>
  <title>{pageTitle(entry.name, section)}</title>
  <meta name="description" content={summary} />
  {#if card}
    <meta property="og:image" content={card} />
    <meta property="og:image:width" content="1080" />
    <meta property="og:image:height" content="1440" />
  {/if}
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity">
  <nav class="crumb">
    <a href={localHref('/fleet')}>{section}</a>
    <span class="sep">›</span>
    <span>{entry.name}</span>
  </nav>

  <header>
    <p class="meta">
      {entry.agency} · <span class="status">{fleetStatusLabel(entry.status)}</span>
    </p>
    <h1>{entry.name}</h1>
    {#if entry.tagline}<p class="lede">{entry.tagline}</p>{/if}
  </header>

  {#if data.hero}
    <figure class="hero">
      <img {...responsive(data.hero, IMAGE_SIZES.full)} alt={entry.name} decoding="async" />
    </figure>
  {/if}

  {#if entry.dispatch}<p class="dispatch">{entry.dispatch}</p>{/if}
  {#if entry.description}<p class="description">{entry.description}</p>{/if}
  {#if entry.best_known_for && entry.best_known_for !== entry.tagline}
    <p class="known">{entry.best_known_for}</p>
  {/if}

  <dl class="facts">
    <div>
      <dt>{m.card_stat_builder()}</dt>
      <dd>{entry.manufacturer}</dd>
    </div>
    <div>
      <dt>{m.card_stat_country()}</dt>
      <dd>{countryLabel(entry.country)}</dd>
    </div>
    <div>
      <dt>{m.fleet_first_flight()}</dt>
      <dd>{entry.first_flight === 'planned' ? m.fleet_value_planned() : entry.first_flight}</dd>
    </div>
    {#if entry.last_flight}
      <div>
        <dt>{m.fleet_last_flight()}</dt>
        <dd>{entry.last_flight}</dd>
      </div>
    {/if}
    <div>
      <dt>{m.fleet_label_epoch()}</dt>
      <dd>{epochLabel(entry.epoch)}</dd>
    </div>
    {#each specs as row (row.key)}
      <div>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
      </div>
    {/each}
  </dl>

  {#if data.missions.length}
    <section class="missions">
      <h2>{m.panel_tab_missions()}</h2>
      <ul class="linklist">
        {#each data.missions as mission (mission.id)}
          <li>
            <a href={localHref(`/missions/${mission.id}`)}>{mission.name}</a>
            <span class="year">{mission.year}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(`/fleet?id=${entry.id}`)}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
