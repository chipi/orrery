<!--
  /missions/<id> — one mission as an indexable page: the panel's overview text
  (dispatch, facts, description, events) in prerendered HTML, with links into
  the app (the /missions?id= panel, /fly) and to the vehicles in /fleet.
-->
<script lang="ts">
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { missionStatusLabel } from '$lib/status-label';
  import { canonicalUrl, metaDescription, pageTitle, SITE_ORIGIN } from '$lib/seo';
  import { ogTitle } from '$lib/social-meta';
  import { article, breadcrumbList, absoluteUrl } from '$lib/json-ld';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let mission = $derived(data.mission);
  let name = $derived(mission.name ?? mission.id);
  let section = $derived(ogTitle(m.missions_page_title()));
  let summary = $derived(
    metaDescription([mission.first, mission.description].filter(Boolean).join(' ')),
  );
  let launcherRef = $derived(mission.fleet_refs?.find((r) => r.role === 'launcher')?.id ?? null);
  let craftRef = $derived(
    mission.fleet_refs?.find((r) => r.role === 'payload')?.id ??
      mission.fleet_refs?.find((r) => r.role === 'spacecraft')?.id ??
      null,
  );
  let card = $derived(`${SITE_ORIGIN}/images/cards/mission/${mission.id}.jpg`);
  let jsonLd = $derived.by(() => {
    const loc = getLocale();
    const url = canonicalUrl(`/missions/${mission.id}`, loc);
    return [
      article({
        headline: name,
        description: summary,
        url,
        inLanguage: loc,
        image: data.hero ? absoluteUrl(data.hero) : card,
      }),
      breadcrumbList([
        { name: section, url: canonicalUrl('/missions', loc) },
        { name, url },
      ]),
    ];
  });
</script>

<svelte:head>
  <title>{pageTitle(name, section)}</title>
  <meta name="description" content={summary} />
  <meta property="og:image" content={card} />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1440" />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="entity">
  <nav class="crumb">
    <a href={localHref('/missions')}>{section}</a>
    <span class="sep">›</span>
    <span>{name}</span>
  </nav>

  <header>
    <p class="meta">
      {mission.agency} · {mission.year} ·
      <span class="status">{missionStatusLabel(mission.status)}</span>
    </p>
    <h1>{name}</h1>
    {#if mission.first}<p class="lede">{mission.first}</p>{/if}
  </header>

  {#if data.hero}
    <figure class="hero">
      <img {...responsive(data.hero, IMAGE_SIZES.full)} alt={name} decoding="async" />
    </figure>
  {/if}

  {#if mission.dispatch}<p class="dispatch">{mission.dispatch}</p>{/if}

  <dl class="facts">
    <div>
      <dt>{m.mp_label_agency()}</dt>
      <dd>{mission.agency_full ?? mission.agency}</dd>
    </div>
    <div>
      <dt>{m.mp_label_departure()}</dt>
      <dd>{mission.departure_date ?? '—'}</dd>
    </div>
    <div>
      <dt>{m.mp_label_arrival()}</dt>
      <dd>{mission.arrival_date ?? '—'}</dd>
    </div>
    <div>
      <dt>{m.mp_label_transit()}</dt>
      <dd>
        {mission.transit_days ? m.mp_transit_days({ count: mission.transit_days.toString() }) : '—'}
      </dd>
    </div>
    <div>
      <dt>{m.mp_label_delta_v()}</dt>
      <dd>{mission.delta_v ?? '—'}</dd>
    </div>
    {#if mission.vehicle}
      <div>
        <dt>{m.mp_label_vehicle()}</dt>
        <dd>
          {#if launcherRef}
            <a href={localHref(`/fleet/${launcherRef}`)}>{mission.vehicle}</a>
          {:else}{mission.vehicle}{/if}
        </dd>
      </div>
    {/if}
    {#if mission.payload}
      <div>
        <dt>{m.mp_label_payload()}</dt>
        <dd>
          {#if craftRef}
            <a href={localHref(`/fleet/${craftRef}`)}>{mission.payload}</a>
          {:else}{mission.payload}{/if}
        </dd>
      </div>
    {/if}
  </dl>

  {#if mission.description}<p class="description">{mission.description}</p>{/if}

  {#if mission.events?.length}
    <section class="events">
      <h2>{m.mp_flight_section_events()}</h2>
      <ol>
        {#each mission.events as ev, i (i)}
          <li>
            <strong>{ev.label}</strong>{#if ev.note}&nbsp;— {ev.note}{/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}

  <p class="actions">
    <a class="cta" href={localHref(`/missions?id=${mission.id}`)}>{m.launches_open_in_orrery()}</a>
    {#if mission.flight}
      <a class="cta" href={localHref(`/fly?mission=${mission.id}`)}>{m.mp_fly_button()}</a>
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
  .facts a {
    color: #7fb0e0;
  }
  .events h2 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
    margin: 28px 0 8px;
  }
  .events ol {
    padding-left: 20px;
  }
  .events li {
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
