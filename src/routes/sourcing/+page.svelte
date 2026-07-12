<!--
  /sourcing — the public sourcing-debt ledger. Content Orrery wanted but could
  not source under its licensing bar (CC / public domain, no watermark,
  authentic — no fan reproductions). Data-driven + localized from
  i18n-src/{locale}/sourcing/gaps.json; append a new entry there as each wall
  is hit.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const STATUS_LABEL: Record<string, () => string> = {
    wall: m.sourcing_status_wall,
    partial: m.sourcing_status_partial,
    resolved: m.sourcing_status_resolved,
  };
</script>

<svelte:head>
  <title>Sourcing wall · Orrery</title>
  <meta
    name="description"
    content="The content Orrery could not source under its licensing bar — what we wanted, where the wall was, and how we handled it honestly."
  />
</svelte:head>

<article class="sourcing" data-route-ready="true">
  <header>
    <h1>{m.sourcing_h1()}</h1>
    <p class="lede">{data.note}</p>
  </header>

  {#if data.gaps.length === 0}
    <p class="empty">{m.sourcing_empty()}</p>
  {/if}

  <ol class="gaps">
    {#each data.gaps as g (g.id)}
      <li class="gap">
        <div class="gap-head">
          <span class="status status-{g.status}">{(STATUS_LABEL[g.status] ?? (() => g.status))()}</span>
          <span class="area">{g.area}</span>
          <span class="date">{g.date}</span>
        </div>

        <div class="subjects">
          {#each g.subjects as s (s)}<span class="chip">{s}</span>{/each}
        </div>

        <p class="field"><span class="k">{m.sourcing_field_wanted()}</span>{g.want}</p>
        <p class="field"><span class="k">{m.sourcing_field_wall()}</span>{g.wall}</p>

        <div class="two">
          <div>
            <p class="k">{m.sourcing_field_checked()}</p>
            <ul>
              {#each g.checked as c (c)}<li>{c}</li>{/each}
            </ul>
          </div>
          {#if g.rejected && g.rejected.length}
            <div>
              <p class="k">{m.sourcing_field_rejected()}</p>
              <ul>
                {#each g.rejected as r (r)}<li>{r}</li>{/each}
              </ul>
            </div>
          {/if}
        </div>

        <p class="field resolution"><span class="k">{m.sourcing_field_resolution()}</span>{g.resolution}</p>
      </li>
    {/each}
  </ol>

  <footer class="sourcing-footer">
    <p>
      {@html m.sourcing_footer({
        colophon: `<a href="${base}${localizeHref('/colophon')}">${m.sourcing_footer_link_colophon()}</a>`,
        gallery: `<a href="${base}${localizeHref('/gallery')}">${m.sourcing_footer_link_gallery()}</a>`,
      })}
    </p>
  </footer>
</article>

<style>
  .sourcing {
    max-width: 760px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 24px) 20px 80px;
    color: var(--color-text, #eef);
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(38px, 8vw, 60px);
    letter-spacing: 1px;
    margin: 0 0 12px;
  }
  .lede {
    font-size: 16px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.72);
  }
  .empty {
    color: rgba(255, 255, 255, 0.6);
    margin-top: 30px;
  }
  .gaps {
    list-style: none;
    padding: 0;
    margin: 30px 0 0;
  }
  .gap {
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    padding: 18px 20px 20px;
    margin-bottom: 20px;
  }
  .gap-head {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .status {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 3px 9px;
    border-radius: 4px;
    border: 1px solid;
  }
  .status-wall {
    color: #f0a892;
    border-color: rgba(230, 140, 120, 0.5);
  }
  .status-partial {
    color: #f0d69f;
    border-color: rgba(220, 190, 120, 0.5);
  }
  .status-resolved {
    color: #9fe6c2;
    border-color: rgba(120, 200, 160, 0.5);
  }
  .area {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 22px;
    letter-spacing: 0.5px;
  }
  .date {
    margin-left: auto;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
  .subjects {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .chip {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    padding: 3px 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.7);
  }
  .field {
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 12px;
  }
  .k {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7fb0e0;
    margin-bottom: 4px;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 12px;
  }
  @media (max-width: 560px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
  .two ul {
    margin: 0;
    padding-left: 18px;
  }
  .two li {
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.72);
    margin-bottom: 3px;
  }
  .resolution {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 12px;
    margin-bottom: 0;
  }
  .sourcing-footer {
    margin-top: 40px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 18px;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.6);
  }
  .sourcing-footer :global(a) {
    color: #cfe3fb;
  }
</style>
