<!--
  /patches — the insignia gallery. Every program + mission patch Orrery has
  sourced, with per-badge credit + licence. Sister page to /posters under the
  Gallery hub. English-only, matching /posters. Badges + provenance come from
  scripts/fetch-badges.ts (badges.json + badge-provenance.json).
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { assetOrigin } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Insignia · Gallery · Orrery</title>
  <meta
    name="description"
    content="Every program and mission patch in Orrery — authentic NASA insignia, public domain, with full provenance."
  />
</svelte:head>

<article class="patches" data-route-ready="true">
  <header>
    <nav class="crumb">
      <a href="{base}{localizeHref('/gallery')}">{m.layout_footer_gallery()}</a><span class="sep"
        >›</span
      ><span>{m.patches_crumb()}</span>
    </nav>
    <h1>{m.patches_h1()}</h1>
    <p class="lede">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + base path, no user input -->
      {@html m.patches_lede({
        link: `<a href="${base}${localizeHref('/sourcing')}">${m.patches_link_sourcing()}</a>`,
      })}
    </p>
  </header>

  <section class="group">
    <h2>{m.patches_group_programs()}</h2>
    <div class="grid">
      {#each data.programs as p (p.key)}
        <figure class="badge-card">
          <div class="badge-frame">
            <img
              src="{assetOrigin}{p.img}"
              alt={m.patches_alt({ name: p.name })}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption>
            <span class="b-name">{p.name}</span>
            {#if p.credit}
              <a
                class="b-credit"
                href={p.credit.source_url}
                target="_blank"
                rel="noopener noreferrer">{p.credit.author} · {p.credit.license_short}</a
              >
            {/if}
          </figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section class="group">
    <h2>{m.patches_group_missions()}</h2>
    <div class="grid">
      {#each data.missions as mi (mi.key)}
        <figure class="badge-card">
          <div class="badge-frame">
            <img
              src="{assetOrigin}{mi.img}"
              alt={m.patches_alt({ name: mi.name })}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption>
            <span class="b-name">{mi.name}</span>
            {#if mi.credit}
              <a
                class="b-credit"
                href={mi.credit.source_url}
                target="_blank"
                rel="noopener noreferrer">{mi.credit.author} · {mi.credit.license_short}</a
              >
            {/if}
          </figcaption>
        </figure>
      {/each}
    </div>
  </section>

  {#if data.fleet.length}
    <section class="group">
      <h2>{m.credits_category_fleet()}</h2>
      <div class="grid">
        {#each data.fleet as fl (fl.key)}
          <figure class="badge-card">
            <div class="badge-frame">
              <img
                src="{assetOrigin}{fl.img}"
                alt={m.patches_alt({ name: fl.name })}
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>
              <span class="b-name">{fl.name}</span>
              {#if fl.credit}
                <a
                  class="b-credit"
                  href={fl.credit.source_url}
                  target="_blank"
                  rel="noopener noreferrer">{fl.credit.author} · {fl.credit.license_short}</a
                >
              {/if}
            </figcaption>
          </figure>
        {/each}
      </div>
    </section>
  {/if}

  <footer class="patches-footer">
    <p>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + base path, no user input -->
      {@html m.patches_footer({
        sourcing: `<a href="${base}${localizeHref('/sourcing')}">${m.patches_footer_link_sourcing()}</a>`,
        colophon: `<a href="${base}${localizeHref('/colophon')}">${m.patches_footer_link_colophon()}</a>`,
      })}
    </p>
  </footer>
</article>

<style>
  .patches {
    max-width: 1040px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 24px) 20px 80px;
    color: var(--color-text, #eef);
  }
  .crumb {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 14px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 8px;
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(40px, 8vw, 64px);
    letter-spacing: 1px;
    margin: 0 0 10px;
  }
  .lede {
    font-size: 17px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.75);
    max-width: 62ch;
  }
  .lede :global(a),
  .patches-footer :global(a) {
    color: #cfe3fb;
  }
  .group h2 {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #7fb0e0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 16px;
    margin: 40px 0 20px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 22px 16px;
  }
  .badge-card {
    margin: 0;
    text-align: center;
  }
  .badge-frame {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(
      circle at 50% 40%,
      rgba(127, 176, 224, 0.08),
      rgba(255, 255, 255, 0.02)
    );
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 14px;
    transition: border-color 0.15s;
  }
  .badge-card:hover .badge-frame {
    border-color: rgba(127, 176, 224, 0.5);
  }
  .badge-frame img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.5));
  }
  figcaption {
    margin-top: 8px;
  }
  .b-name {
    display: block;
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 16px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.9);
  }
  .b-credit {
    display: block;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    text-decoration: none;
    margin-top: 2px;
  }
  .b-credit:hover {
    color: rgba(255, 255, 255, 0.65);
  }
  .patches-footer {
    margin-top: 46px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 18px;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.6);
  }
</style>
