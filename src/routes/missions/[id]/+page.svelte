<!--
  /missions/<id> — one mission as an indexable page: the panel's overview text
  (dispatch, facts, description, events) in prerendered HTML, with links into
  the app (the /missions?id= panel, /fly) and to the vehicles in /fleet.
-->
<script lang="ts">
  import '$lib/components/entity-page.css';
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

<article class="entity page-shell page-shell--reading">
  <nav class="crumb page-crumb">
    <a href={localHref('/missions')}>{section}</a>
    <span class="sep">›</span>
    <span>{name}</span>
  </nav>

  <header>
    <p class="meta">
      {mission.agency} · {mission.year} ·
      <span class="status">{missionStatusLabel(mission.status)}</span>
    </p>
    <h1 class="page-title">{name}</h1>
    {#if mission.first}<p class="lede page-lead">{mission.first}</p>{/if}
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
      <h2 class="page-section-label">{m.mp_flight_section_events()}</h2>
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
