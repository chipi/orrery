<!--
  One surface site (Moon, Mars, Venus) as an indexable page: the map panel's
  text (fact, crew, what was left, capability) and the site story's intro and
  chapter titles in prerendered HTML, with a link into the map (?site=).
  Used by /moon/[id], /mars/[id], /venus/[id].
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { surfaceStatusLabel } from '$lib/status-label';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import SiteIllustrationFigure from '$lib/components/SiteIllustrationFigure.svelte';
  import type { SiteBody, SiteEntity } from '$lib/data/site-entity';

  let { body, entity, mapTitle }: { body: SiteBody; entity: SiteEntity; mapTitle: string } =
    $props();

  let site = $derived(entity.site);
  let text = $derived(entity.text);
  let name = $derived(text.name ?? site.id);
  let section = $derived(ogTitle(mapTitle));
  let summary = $derived(
    metaDescription([text.fact, entity.story?.intro].filter(Boolean).join(' ')),
  );
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/${body}/${site.id}`, loc);
    return [
      article({ headline: name, description: summary, url, inLanguage: loc }),
      breadcrumbList([
        { name: section, url: canonicalUrl(`/${body}`, loc) },
        { name, url },
      ]),
    ];
  });
  const latLon = (v: number | undefined, deg: (i: { value: string }) => string) =>
    v === undefined ? '—' : deg({ value: v.toFixed(2) });
</script>

<svelte:head>
  <title>{pageTitle(name, section)}</title>
  <meta name="description" content={summary} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref(`/${body}`)}>{section}</a>
    <span class="sep">›</span>
    <span>{name}</span>
  </nav>

  <header>
    <p class="meta">
      {site.agency} · {site.year} ·
      <span class="status">{surfaceStatusLabel(site.surface_status ?? site.status)}</span>
    </p>
    <h1 class="page-title">{name}</h1>
    {#if text.site_name}<p class="lede page-lead">{text.site_name}</p>{/if}
  </header>

  {#if entity.illustration}
    <div class="site-map"><SiteIllustrationFigure illustration={entity.illustration} /></div>
  {/if}

  {#if text.fact}<p class="dispatch">{text.fact}</p>{/if}

  <dl class="facts">
    {#if site.landing_date}
      <div>
        <dt>{m.moon_panel_landing()}</dt>
        <dd>{site.landing_date}</dd>
      </div>
    {/if}
    <div>
      <dt>{m.moon_panel_lat()}</dt>
      <dd>{latLon(site.lat, m.moon_lat_deg)}</dd>
    </div>
    <div>
      <dt>{m.moon_panel_lon()}</dt>
      <dd>{latLon(site.lon, m.moon_lon_deg)}</dd>
    </div>
    {#if site.surface_duration_days}
      <div>
        <dt>{m.moon_panel_duration()}</dt>
        <dd>{m.moon_days({ value: site.surface_duration_days.toString() })}</dd>
      </div>
    {/if}
    {#if site.eva_duration_hours}
      <div>
        <dt>{m.moon_panel_eva()}</dt>
        <dd>{m.moon_hours({ value: site.eva_duration_hours.toString() })}</dd>
      </div>
    {/if}
    {#if site.samples_kg}
      <div>
        <dt>{m.moon_panel_samples()}</dt>
        <dd>{m.moon_kg({ value: site.samples_kg.toString() })}</dd>
      </div>
    {/if}
    {#if text.crew}
      <div>
        <dt>{m.moon_panel_crew()}</dt>
        <dd>{text.crew}</dd>
      </div>
    {/if}
  </dl>

  {#if text.left}<p>{text.left}</p>{/if}
  {#if text.capability}<p>{text.capability}</p>{/if}

  {#if entity.story}
    <section class="story">
      <p>{entity.story.intro}</p>
      <ol>
        {#each entity.story.chapters as ch (ch.id)}
          <li>
            <strong>{ch.title}</strong>{#if ch.subtitle}&nbsp;— {ch.subtitle}{/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if entity.mission}
    <section class="mission">
      <h2 class="page-section-label">{ogTitle(m.missions_page_title())}</h2>
      <ul class="linklist wide">
        <li>
          <a href={localHref(`/missions/${entity.mission.id}`)}>{entity.mission.name}</a>
          {#if entity.mission.first}<span class="note">{entity.mission.first}</span>{/if}
        </li>
      </ul>
    </section>
    {#if entity.mission.hardware.length}
      <section class="hardware">
        <h2 class="page-section-label">{ogTitle(m.fleet_page_title()).split(/\s[—–]\s/)[0]}</h2>
        <ul class="linklist wide">
          {#each entity.mission.hardware as h (h.id)}
            <li>
              <a href={localHref(`/fleet/${h.id}`)}>{h.name}</a>
              {#if h.tagline}<span class="note">{h.tagline}</span>{/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(`/${body}?site=${site.id}`)}>{m.launches_open_in_orrery()}</a>
    {#if site.mission_id}
      <a class="cta" href={localHref(`/missions/${site.mission_id}`)}
        >{name} · {ogTitle(m.missions_page_title())}</a
      >
    {/if}
  </p>
</article>
