<!--
  /fleet/<id> — one fleet entry as an indexable page: the panel's overview text
  (tagline, dispatch, description, facts and specs, linked missions) in
  prerendered HTML, with a link into the app (the /fleet?id= panel).
-->
<script lang="ts">
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
  {#if entry.best_known_for}<p class="known">{entry.best_known_for}</p>{/if}

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
      <ul>
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

<style>
  .entity {
    max-width: 760px;
    margin: 0 auto;
    padding: 72px 20px 64px;
    color: rgba(255, 255, 255, 0.86);
    line-height: 1.6;
  }
  .crumb {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 18px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.65);
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 6px;
  }
  .meta {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 6px;
  }
  h1 {
    font-size: clamp(28px, 6vw, 44px);
    line-height: 1.1;
    margin: 0 0 12px;
    color: #fff;
  }
  .lede {
    font-size: 18px;
    color: rgba(255, 255, 255, 0.78);
  }
  .hero {
    margin: 24px 0;
  }
  .hero img {
    width: 100%;
    height: auto;
    border-radius: 6px;
  }
  .dispatch {
    font-size: 17px;
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px 20px;
    margin: 24px 0;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
  }
  .facts dt {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
  }
  .facts dd {
    margin: 2px 0 0;
  }
  .missions h2 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin: 28px 0 8px;
  }
  .missions ul {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 6px 16px;
  }
  .missions a {
    color: #7fb0e0;
  }
  .missions .year {
    margin-left: 6px;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }
  .cta {
    display: inline-block;
    padding: 10px 16px;
    border: 1px solid rgba(127, 176, 224, 0.6);
    border-radius: 4px;
    color: #cfe3f7;
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
  }
</style>
