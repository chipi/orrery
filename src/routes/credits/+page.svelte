<!--
  /credits — public bill of materials for every image and reused
  text fragment in Orrery (ADR-046 + ADR-047 Milestone D).

  Loads three manifests through `$lib/data`:
    static/data/source-logos.json     — agency / publisher mastheads
    static/data/image-provenance.json — per-image TASL
    static/data/text-sources.json     — editorial text BoM

  Mobile-first, fully Paraglide-localised, runtime-only state (no
  localStorage / sessionStorage). The page is intentionally plain
  HTML — long lists, native scrolling, lazy-loaded thumbnails.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import {
    getSourceLogos,
    getImageProvenanceManifest,
    getTextSources,
    type ImageProvenanceManifest,
    type SourceLogosManifest,
    type TextSourcesManifest,
  } from '$lib/data';
  import { groupBySource, pathToRouteKey, type CreditsGroup } from '$lib/credits-grouping';
  import * as m from '$lib/paraglide/messages';

  let logos = $state<SourceLogosManifest | null>(null);
  let provenance = $state<ImageProvenanceManifest | null>(null);
  let textSources = $state<TextSourcesManifest | null>(null);
  let loaded = $state(false);

  $effect(() => {
    void Promise.all([getSourceLogos(), getImageProvenanceManifest(), getTextSources()]).then(
      ([s, p, t]) => {
        logos = s;
        provenance = p;
        textSources = t;
        loaded = true;
      },
    );
  });

  let groups = $derived<CreditsGroup[]>(
    logos && provenance && textSources
      ? groupBySource(logos.sources, provenance.entries, textSources.entries)
      : [],
  );

  let totals = $derived({
    photos: provenance?.entries.length ?? 0,
    texts: textSources?.entries.length ?? 0,
    sources: groups.length,
  });

  function routeLabel(key: string): string {
    switch (key) {
      case 'missions':
        return m.credits_used_route_missions();
      case 'iss':
        return m.credits_used_route_iss();
      case 'moon':
        return m.credits_used_route_moon();
      case 'earth':
        return m.credits_used_route_earth();
      case 'mars':
        return m.credits_used_route_mars();
      case 'explore':
        return m.credits_used_route_explore();
      case 'rockets':
        return m.credits_used_route_rockets();
      case 'logos':
        return m.credits_used_route_logos();
      case 'textures':
        return m.credits_used_route_textures();
      default:
        return key;
    }
  }

  function categoryLabel(c: string): string {
    switch (c) {
      case 'mission':
        return m.credits_category_mission();
      case 'planet':
        return m.credits_category_planet();
      case 'sun':
        return m.credits_category_sun();
      case 'small-body':
        return m.credits_category_small_body();
      case 'moon-site':
        return m.credits_category_moon_site();
      case 'earth-object':
        return m.credits_category_earth_object();
      case 'iss-module':
        return m.credits_category_iss_module();
      case 'rocket':
        return m.credits_category_rocket();
      case 'fleet':
        return m.credits_category_fleet();
      case 'ui':
        return m.credits_category_ui();
      case 'credits':
        return m.credits_category_credits();
      default:
        return c;
    }
  }

  function relationshipLabel(r: string): string {
    switch (r) {
      case 'original':
        return m.credits_relationship_original();
      case 'paraphrased-from':
        return m.credits_relationship_paraphrased();
      case 'quoted-from':
        return m.credits_relationship_quoted();
      case 'translated-from':
        return m.credits_relationship_translated();
      case 'adapted-from':
        return m.credits_relationship_adapted();
      default:
        return r;
    }
  }
</script>

<svelte:head>
  <title>{m.credits_title()} — Orrery</title>
</svelte:head>

<section class="credits" aria-labelledby="credits-title">
  <header class="head">
    <h1 id="credits-title">{m.credits_title()}</h1>
    <h2>{m.credits_intro_heading()}</h2>
    <p class="intro">{m.credits_intro_body_1()}</p>
    <p class="intro">{m.credits_intro_body_2()}</p>
    <p class="totals">
      {m.credits_totals({
        photos: totals.photos,
        texts: totals.texts,
        sources: totals.sources,
      })}
    </p>
    <p class="disclaimer">{m.no_endorsement_disclaimer()}</p>
  </header>

  {#if !loaded}
    <p class="loading">{m.credits_loading()}</p>
  {:else}
    <nav class="toc" aria-label={m.credits_toc_label()}>
      <h3>{m.credits_toc_label()}</h3>
      <ul>
        {#each groups as group}
          <li>
            <a href="#src-{group.source.id}">{group.source.name}</a>
            <span class="counts">
              · {m.credits_count_photos({ n: group.photos.length })} ·
              {m.credits_count_text({ n: group.texts.length })}
            </span>
          </li>
        {/each}
      </ul>
    </nav>

    {#each groups as group}
      <article class="source-block" id="src-{group.source.id}">
        <header class="src-head">
          {#if group.source.logo_path}
            <img
              class="src-logo"
              src="{base}{group.source.logo_path}"
              alt=""
              width="56"
              height="56"
              loading="lazy"
            />
          {/if}
          <div class="src-meta">
            <h2>
              <a href={group.source.url} target="_blank" rel="noopener noreferrer">
                {group.source.name}
              </a>
            </h2>
            <p class="src-license">
              <span class="lbl">{m.credits_license_summary_label()}:</span>
              {group.source.license_summary}
            </p>
          </div>
        </header>

        {#if group.photos.length > 0}
          <h3 class="bom-heading">
            {m.credits_section_photos()}
            <span class="bom-count">{m.credits_count_photos({ n: group.photos.length })}</span>
          </h3>
          <ul class="photo-list">
            {#each group.photos as photo}
              <li class="photo">
                <a
                  class="thumb"
                  href={photo.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={photo.title}
                >
                  <img
                    src="{base}{photo.path}"
                    alt=""
                    width="64"
                    height="64"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <div class="photo-meta">
                  <p class="ph-title">{photo.title}</p>
                  <p class="ph-row">
                    <span class="ph-author">{photo.author ?? photo.agency}</span>
                    <span class="sep">·</span>
                    <a
                      class="ph-source"
                      href={photo.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {m.credits_view_original()}
                    </a>
                    <span class="sep">·</span>
                    {#if photo.license_url}
                      <a
                        class="ph-license"
                        href={photo.license_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {photo.license_short}
                      </a>
                    {:else}
                      <span class="ph-license">{photo.license_short}</span>
                    {/if}
                  </p>
                  <p class="ph-row used">
                    <span class="lbl">{m.credits_used_on()}:</span>
                    {routeLabel(pathToRouteKey(photo.path))}
                    <code class="path">{photo.path}</code>
                  </p>
                  {#if photo.modifications.length > 0}
                    <p class="ph-row mods">{m.image_credit_modifications()}</p>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        {/if}

        {#if group.texts.length > 0}
          <h3 class="bom-heading">
            {m.credits_section_text()}
            <span class="bom-count">{m.credits_count_text({ n: group.texts.length })}</span>
          </h3>
          <ul class="text-list">
            {#each group.texts as t}
              <li class="text-entry">
                <p class="t-row">
                  <span class="t-cat">{categoryLabel(t.category)}</span>
                  <span class="sep">·</span>
                  <span class="t-rel">{relationshipLabel(t.relationship)}</span>
                  <span class="sep">·</span>
                  {#if t.license_url}
                    <a
                      class="t-license"
                      href={t.license_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.license_short}
                    </a>
                  {:else}
                    <span class="t-license">{t.license_short}</span>
                  {/if}
                  {#if t.source_url}
                    <span class="sep">·</span>
                    <a
                      class="t-source"
                      href={t.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {m.credits_view_original()}
                    </a>
                  {/if}
                </p>
                {#if t.snippet}
                  <p class="t-snippet">{t.snippet}</p>
                {/if}
                <p class="t-loc">
                  <code
                    >{t.location.file}{t.location.json_path ? ` ${t.location.json_path}` : ''}{t
                      .location.i18n_key
                      ? ` (${t.location.i18n_key})`
                      : ''}</code
                  >
                </p>
              </li>
            {/each}
          </ul>
        {/if}
      </article>
    {/each}
  {/if}
</section>

<style>
  .credits {
    max-width: 1080px;
    margin: 0 auto;
    padding: 24px 16px 96px;
    color: #dde4ff;
  }
  .head h1 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 56px;
    letter-spacing: 4px;
    margin: 0 0 4px;
    color: #fff;
  }
  .head h2 {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 16px;
  }
  .intro {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 12px;
  }
  .totals,
  .disclaimer {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin: 8px 0 0;
  }
  .disclaimer {
    margin-top: 4px;
  }

  .loading {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    padding: 32px 0;
  }

  .toc {
    margin: 28px 0 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .toc h3 {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 12px;
  }
  .toc ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  .toc li {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
  }
  .toc a {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .toc a:hover,
  .toc a:focus-visible {
    color: #7ddfd8;
    outline: none;
  }
  .counts {
    color: rgba(255, 255, 255, 0.4);
  }

  .source-block {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  .src-head {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .src-logo {
    background: rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 6px;
    object-fit: contain;
    flex-shrink: 0;
  }
  .src-meta h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 2px;
    margin: 0 0 4px;
    color: #fff;
  }
  .src-meta a {
    color: #fff;
    text-decoration: none;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.4);
  }
  .src-license {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.55);
    margin: 0;
    max-width: 720px;
  }
  .src-license .lbl {
    color: rgba(255, 255, 255, 0.4);
    margin-right: 6px;
  }

  .bom-heading {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.6);
    margin: 24px 0 8px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .bom-count {
    color: rgba(255, 255, 255, 0.35);
    font-size: 10px;
  }

  .photo-list,
  .text-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  .photo {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }
  .thumb img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 3px;
    background: #04040c;
  }

  .ph-title {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 4px;
  }
  .ph-row,
  .t-row {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 2px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .ph-row .lbl {
    color: rgba(255, 255, 255, 0.35);
  }
  .ph-row a,
  .t-row a {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .sep {
    color: rgba(255, 255, 255, 0.2);
  }
  .path {
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.4);
  }
  .ph-row.mods {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }

  .text-entry {
    padding: 8px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }
  .t-cat {
    background: rgba(78, 205, 196, 0.12);
    color: #4ecdc4;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .t-rel {
    color: rgba(255, 255, 255, 0.55);
  }
  .t-snippet {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.75);
    margin: 6px 0 4px;
  }
  .t-loc {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.35);
    margin: 0;
  }
  .t-loc code {
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.45);
  }

  @media (min-width: 768px) {
    .credits {
      padding: 36px 32px 96px;
    }
    .toc ul {
      grid-template-columns: 1fr 1fr;
    }
    .photo {
      grid-template-columns: 96px 1fr;
    }
    .thumb img {
      width: 96px;
      height: 96px;
    }
  }
</style>
