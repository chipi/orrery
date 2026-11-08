<!--
  One surface site (Moon, Mars, Venus) as an indexable page: the map panel's
  text (fact, crew, what was left, capability) and the site story's intro and
  chapter titles in prerendered HTML, with a link into the map (?site=).
  Used by /moon/[id], /mars/[id], /venus/[id].
-->
<script lang="ts">
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { surfaceStatusLabel } from '$lib/status-label';
  import { canonicalUrl, metaDescription, pageTitle } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
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

<article class="entity">
  <nav class="crumb">
    <a href={localHref(`/${body}`)}>{section}</a>
    <span class="sep">›</span>
    <span>{name}</span>
  </nav>

  <header>
    <p class="meta">
      {site.agency} · {site.year} ·
      <span class="status">{surfaceStatusLabel(site.surface_status ?? site.status)}</span>
    </p>
    <h1>{name}</h1>
    {#if text.site_name}<p class="lede">{text.site_name}</p>{/if}
  </header>

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

  <p class="actions">
    <a class="cta" href={localHref(`/${body}?site=${site.id}`)}>{m.launches_open_in_orrery()}</a>
    {#if site.mission_id}
      <a class="cta" href={localHref(`/missions/${site.mission_id}`)}
        >{name} · {ogTitle(m.missions_page_title())}</a
      >
    {/if}
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
  .story ol {
    padding-left: 20px;
  }
  .story li {
    margin: 6px 0;
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
