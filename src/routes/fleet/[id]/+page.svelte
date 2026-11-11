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
  const CATEGORY: Record<string, () => string> = {
    launcher: m.fleet_cat_launcher,
    'crewed-spacecraft': m.fleet_cat_crewed,
    'cargo-spacecraft': m.fleet_cat_cargo,
    station: m.fleet_cat_station,
    rover: m.fleet_cat_rover,
    lander: m.fleet_cat_lander,
    orbiter: m.fleet_cat_orbiter,
    observatory: m.fleet_cat_observatory,
    'space-suit': m.fleet_cat_suit,
    constellation: m.fleet_cat_constellation,
    'launch-site': m.fleet_cat_launch_site,
    engine: m.fleet_cat_engine,
  };
  let siteHeading = $derived(
    entry.category === 'lander' || entry.category === 'rover'
      ? m.surface_landing_site()
      : entry.category === 'orbiter' ||
          entry.category === 'station' ||
          entry.category === 'observatory'
        ? m.fleet_operating_orbit()
        : m.fleet_operating_sites(),
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

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/fleet')}>{section}</a>
    <span class="sep">›</span>
    <span>{entry.name}</span>
  </nav>

  <header>
    <p class="meta">
      {entry.agency} · {CATEGORY[entry.category]?.() ?? entry.category} ·
      <span class="status">{fleetStatusLabel(entry.status)}</span>
    </p>
    <h1 class="page-title">{entry.name}</h1>
    {#if entry.tagline}<p class="lede page-lead">{entry.tagline}</p>{/if}
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
      <dt>{m.card_stat_era()}</dt>
      <dd>
        {entry.era === 'planned'
          ? m.fleet_value_planned()
          : entry.era.replace('now', m.programs_meta_now())}
      </dd>
    </div>
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
      <h2 class="page-section-label">{m.panel_tab_missions()}</h2>
      <ul class="linklist">
        {#each data.missions as mission (mission.id)}
          <li>
            <a href={localHref(`/missions/${mission.id}`)}>{mission.name}</a>
            <span class="year">{mission.year}</span>
            {#if mission.first}<span class="note">{mission.first}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.crewed.length}
    <section class="crew">
      <h2 class="page-section-label">{m.panel_tab_crew()}</h2>
      <ul>
        {#each data.crewed as fl (fl.designation)}
          <li>
            {#if fl.missionId}<a class="inline" href={localHref(`/missions/${fl.missionId}`)}
                >{fl.mission}</a
              >{:else}{fl.mission}{/if}
            — {fl.crew.join(', ')}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.sites.length}
    <section class="sites">
      <h2 class="page-section-label">{siteHeading}</h2>
      <ul class="linklist wide">
        {#each data.sites as site (site.href)}
          <li>
            <a href={localHref(site.href)}>{site.name}</a>
            {#if site.place}<span class="year">{site.place}</span>{/if}
            {#if site.text}<span class="note">{site.text}</span>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#each [{ title: m.fleet_engines_heading(), items: data.engines }, { title: m.fleet_used_on(), items: data.usedOn }, { title: section, items: data.alongside }, { title: CATEGORY[entry.category]?.() ?? entry.category, items: data.kin }] as group (group.title)}
    {#if group.items.length}
      <section class="related">
        <h2 class="page-section-label">{group.title}</h2>
        <ul class="linklist">
          {#each group.items as h (h.id)}
            <li>
              <a href={localHref(`/fleet/${h.id}`)}>{h.name}</a>
              {#if h.tagline}<span class="note">{h.tagline}</span>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/each}

  {#if data.museums.length}
    <section class="museums">
      <h2 class="page-section-label">{m.museum_block_heading()}</h2>
      <ul>
        {#each data.museums as museum (museum.id)}
          <li>
            <strong>{museum.name}</strong>, {museum.city}{#if museum.item}&nbsp;— {museum.item}{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(`/fleet?id=${entry.id}`)}>{m.launches_open_in_orrery()}</a>
  </p>
</article>
