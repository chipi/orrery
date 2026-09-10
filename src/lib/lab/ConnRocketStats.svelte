<!--
  ConnRocketStats (FB3) — real launchers, real numbers, inside a goal's practical-
  connection panel. Every number comes from `rockets.json` (the /plan configurator's
  provenanced spec table — never authored here), names come localized via getRockets,
  and logos are the VETTED `static/logos` set through agencyToLogoEntries. Each row
  links into /plan with the rocket preselected, closing the lesson → configurator loop.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { getRockets } from '$lib/data';
  import type { Rocket } from '$types/rocket';
  import { agencyToLogoEntries } from '$lib/agency-logo';
  import { localeFromPage } from '$lib/locale';

  interface Props {
    ids: string[];
    t: (key: string, params?: Record<string, string | number>) => string;
  }
  let { ids, t }: Props = $props();

  let rows = $state<Rocket[]>([]);
  $effect(() => {
    const wanted = ids;
    const locale = localeFromPage(page);
    let alive = true;
    void getRockets(locale).then((all) => {
      if (!alive) return;
      rows = wanted
        .map((id) => all.find((r) => r.id === id))
        .filter((r): r is Rocket => r !== undefined);
    });
    return () => {
      alive = false;
    };
  });

  const fmtT = (kg: number): string =>
    kg >= 1000
      ? `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} t`
      : `${kg} kg`;
</script>

{#if rows.length}
  <div class="crs" aria-label={t('lab.conn.rockets-aria')}>
    <span class="crs__heading">{t('lab.conn.rockets-heading')}</span>
    <ul class="crs__list">
      {#each rows as r (r.id)}
        <li class="crs__row">
          <a class="crs__link" href="{base}/plan?rocket={r.id}">
            {#each agencyToLogoEntries(r.agency) as logo (logo.path)}
              <img class="crs__logo" src={logo.path} alt={logo.full} title={logo.full} />
            {/each}
            <span class="crs__name">{r.name ?? r.id}</span>
            <span class="crs__stats">
              {fmtT(r.payload_to_leo_kg)}
              {t('lab.conn.r-leo')} · Iₛₚ {r.isp_s} s · Δv
              {r.delta_v_capability_km_s.toFixed(1)} km/s
            </span>
            <span class="crs__go" aria-hidden="true">→</span>
          </a>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .crs {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .crs__heading {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 200, 80, 0.75);
  }
  .crs__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .crs__link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    padding: 0.3rem 0.45rem;
    border: 1px solid rgba(78, 205, 196, 0.16);
    border-radius: 6px;
    background: rgba(4, 4, 12, 0.35);
  }
  .crs__link:hover {
    border-color: rgba(78, 205, 196, 0.45);
  }
  /* Link affordance (UX review: the rows read as an inert table — no one taps). */
  .crs__name {
    text-decoration: underline;
    text-decoration-color: rgba(78, 205, 196, 0.5);
    text-underline-offset: 3px;
  }
  .crs__go {
    color: rgba(78, 205, 196, 0.85);
    font-size: 0.8rem;
    flex: 0 0 auto;
    margin-left: 0.35rem;
  }
  .crs__logo {
    height: 16px;
    width: auto;
    max-width: 44px;
    object-fit: contain;
    flex: 0 0 auto;
  }
  .crs__name {
    font-family: 'Space Mono', monospace;
    font-size: 0.68rem;
    color: #e8e8e8;
    white-space: nowrap;
  }
  .crs__stats {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    color: rgba(200, 222, 235, 0.7);
    margin-left: auto;
    text-align: right;
  }
  @media (max-width: 480px) {
    .crs__link {
      flex-wrap: wrap;
    }
    .crs__stats {
      margin-left: 0;
      width: 100%;
      text-align: left;
    }
  }
</style>
