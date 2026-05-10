<!--
  /library — public outbound-link inventory (ADR-051 Milestone L-D).

  Loads two manifests through `$lib`:
    static/data/source-logos.json       — agency / publisher mastheads
    static/data/link-provenance.json    — per-link TASL-equivalent

  Mobile-first, fully Paraglide-localised, runtime-only state (no
  localStorage / sessionStorage). The page is intentionally plain
  HTML — long lists, native scrolling, anchor-based TOC. Mirrors
  `/credits` so a reader who knows one knows the other.

  Editorial purpose:
    Disclose **every** outbound link Orrery emits, grouped by source,
    with language, depth tier, kind, and last-verified date. The page
    itself doesn't fetch any of those URLs — it documents what we
    chose to send the reader to. The link checker (Milestone L-E)
    runs offline and updates `last_verified` here.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { getSourceLogos, type SourceLogosManifest } from '$lib/data';
  import {
    getLinkProvenanceManifest,
    type LinkProvenanceManifest,
    type LinkTier,
    type LinkKind,
  } from '$lib/link-provenance';
  import {
    groupBySource,
    summarise,
    type LibraryGroup,
    type LibrarySummary,
  } from '$lib/library-grouping';
  import * as m from '$lib/paraglide/messages';

  let logos = $state<SourceLogosManifest | null>(null);
  let provenance = $state<LinkProvenanceManifest | null>(null);
  let loaded = $state(false);

  $effect(() => {
    void Promise.all([getSourceLogos(), getLinkProvenanceManifest()]).then(([s, p]) => {
      logos = s;
      provenance = p;
      loaded = true;
    });
  });

  let groups = $derived<LibraryGroup[]>(
    logos && provenance ? groupBySource(logos.sources, provenance.entries) : [],
  );
  let totals = $derived<LibrarySummary>(
    provenance
      ? summarise(provenance.entries)
      : { links: 0, sources: 0, languages: 0, entities: 0, newest_verified: null },
  );

  function tierLabel(t: LinkTier): string {
    switch (t) {
      case 'intro':
        return m.library_tier_intro();
      case 'core':
        return m.library_tier_core();
      case 'deep':
        return m.library_tier_deep();
    }
  }

  function kindLabel(k: LinkKind): string {
    switch (k) {
      case 'agency-official':
        return m.library_kind_agency_official();
      case 'mission-microsite':
        return m.library_kind_mission_microsite();
      case 'science-publisher':
        return m.library_kind_science_publisher();
      case 'encyclopedic':
        return m.library_kind_encyclopedic();
      case 'educational':
        return m.library_kind_educational();
      case 'community':
        return m.library_kind_community();
      case 'vendor-official':
        return m.library_kind_vendor_official();
    }
  }

  function categoryLabel(c: string): string {
    switch (c) {
      case 'mission':
        return m.library_category_mission();
      case 'planet':
        return m.library_category_planet();
      case 'sun':
        return m.library_category_sun();
      case 'small-body':
        return m.library_category_small_body();
      case 'moon-site':
        return m.library_category_moon_site();
      case 'mars-site':
        return m.library_category_mars_site();
      case 'earth-object':
        return m.library_category_earth_object();
      case 'iss-module':
        return m.library_category_iss_module();
      case 'iss-visitor':
        return m.library_category_iss_visitor();
      case 'rocket':
        return m.library_category_rocket();
      case 'fleet':
        return m.library_category_fleet();
      default:
        return c;
    }
  }

  function languageLabel(lang: string): string {
    if (lang === '*') return m.link_credit_multi_lang();
    try {
      const dn = new Intl.DisplayNames(undefined, { type: 'language' });
      return dn.of(lang) ?? lang;
    } catch {
      return lang;
    }
  }
</script>

<svelte:head>
  <title>{m.library_page_title()}</title>
</svelte:head>

<section class="library" aria-labelledby="library-title">
  <header class="head">
    <h1 id="library-title">{m.library_title()}</h1>
    <h2>{m.library_intro_heading()}</h2>
    <p class="intro">{m.library_intro_body_1()}</p>
    <p class="intro">{m.library_intro_body_2()}</p>
    <p class="totals">
      {m.library_totals({
        links: totals.links,
        sources: totals.sources,
        languages: totals.languages,
        entities: totals.entities,
      })}
    </p>
    {#if totals.newest_verified}
      <p class="newest">
        {m.library_newest_verified({ date: totals.newest_verified })}
      </p>
    {/if}
    <p class="disclaimer">{m.no_endorsement_disclaimer()}</p>
  </header>

  {#if !loaded}
    <p class="loading">{m.library_loading()}</p>
  {:else}
    <nav class="toc" aria-label={m.library_toc_label()}>
      <h3>{m.library_toc_label()}</h3>
      <ul>
        {#each groups as group}
          <li>
            <a href="#src-{group.source.id}">{group.source.name}</a>
            <span class="counts">
              · {m.library_count_links({ n: group.total_links })} ·
              {m.library_count_entities({ n: group.entities.length })}
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
              <a href={group.source.url} target="_blank" rel="noopener noreferrer external">
                {group.source.name}
              </a>
            </h2>
            <p class="src-license">
              <span class="lbl">{m.credits_license_summary_label()}:</span>
              {group.source.license_summary}
            </p>
            <p class="src-counts">
              {m.library_count_links({ n: group.total_links })} ·
              {m.library_count_entities({ n: group.entities.length })}
            </p>
          </div>
        </header>

        <ul class="entity-list">
          {#each group.entities as cluster}
            <li class="entity">
              <header class="entity-head">
                <span class="ent-cat">{categoryLabel(cluster.category)}</span>
                <span class="sep">·</span>
                <code class="ent-id">{cluster.entity_id}</code>
                <span class="sep">·</span>
                <a class="ent-route" href="{base}{cluster.route}">{cluster.route}</a>
              </header>

              <ul class="link-list">
                {#each cluster.links as link}
                  <li class="link">
                    <p class="ln-row top">
                      <a
                        class="ln-target"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer external"
                        hreflang={link.language === '*' ? undefined : link.language}
                      >
                        {link.label}
                      </a>
                    </p>
                    <p class="ln-row meta">
                      <span class="ln-tier ln-tier-{link.tier}">{tierLabel(link.tier)}</span>
                      <span class="sep">·</span>
                      <span class="ln-kind">{kindLabel(link.kind)}</span>
                      <span class="sep">·</span>
                      <span class="ln-lang">{languageLabel(link.language)}</span>
                      <span class="sep">·</span>
                      <span class="ln-verified">
                        {m.library_label_last_verified()}:
                        <time datetime={link.last_verified}>{link.last_verified}</time>
                      </span>
                    </p>
                    {#if link.fair_use_rationale}
                      <p class="ln-row rationale">
                        <span class="lbl">{m.library_label_fair_use()}:</span>
                        {link.fair_use_rationale}
                      </p>
                    {/if}
                  </li>
                {/each}
              </ul>
            </li>
          {/each}
        </ul>
      </article>
    {/each}
  {/if}
</section>

<style>
  .library {
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
  .newest,
  .disclaimer {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin: 8px 0 0;
  }
  .newest {
    color: rgba(78, 205, 196, 0.8);
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
  .src-license,
  .src-counts {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.55);
    margin: 0;
    max-width: 720px;
  }
  .src-counts {
    color: rgba(255, 255, 255, 0.4);
    font-size: 10px;
  }
  .src-license .lbl {
    color: rgba(255, 255, 255, 0.4);
    margin-right: 6px;
  }

  .entity-list,
  .link-list {
    list-style: none;
    padding: 0;
    margin: 16px 0 0;
    display: grid;
    gap: 12px;
  }
  .entity {
    padding: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
  }
  .entity-head {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    margin: 0 0 8px;
  }
  .ent-cat {
    background: rgba(78, 205, 196, 0.12);
    color: #4ecdc4;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .ent-id {
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.6);
  }
  .ent-route {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .sep {
    color: rgba(255, 255, 255, 0.2);
  }

  .link-list {
    margin-top: 8px;
    gap: 8px;
  }
  .link {
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.02);
    border-left: 2px solid rgba(78, 205, 196, 0.3);
    border-radius: 0 3px 3px 0;
  }
  .ln-row {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .ln-row.top {
    margin-bottom: 6px;
  }
  .ln-row.meta {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
  }
  .ln-row.rationale {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
  .ln-row .lbl {
    color: rgba(255, 255, 255, 0.35);
    margin-right: 4px;
  }
  .ln-target {
    font-size: 13px;
    color: #fff;
    text-decoration: none;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.4);
  }
  .ln-target:hover,
  .ln-target:focus-visible {
    color: #4ecdc4;
    border-bottom-color: rgba(78, 205, 196, 0.5);
    outline: none;
  }
  .ln-tier {
    padding: 0 6px;
    border-radius: 2px;
    font-size: 9px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .ln-tier-intro {
    background: rgba(255, 200, 80, 0.15);
    color: #ffc850;
  }
  .ln-tier-core {
    background: rgba(78, 205, 196, 0.15);
    color: #4ecdc4;
  }
  .ln-tier-deep {
    background: rgba(150, 180, 255, 0.15);
    color: #8aa9ff;
  }
  .ln-kind,
  .ln-lang,
  .ln-verified {
    color: rgba(255, 255, 255, 0.5);
  }
  .ln-verified time {
    color: rgba(78, 205, 196, 0.75);
  }

  @media (min-width: 768px) {
    .library {
      padding: 36px 32px 96px;
    }
    .toc ul {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
