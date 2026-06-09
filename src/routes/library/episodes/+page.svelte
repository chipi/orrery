<!--
  /library/episodes — Audio episode transcripts index (PRD-016 §S10 /
  RFC-019 §11.4). A reading-only surface for the 33-episode corpus
  built so a visitor can read the tour without playing audio.

  Data sources:
    static/data/audio/audio-provenance.json   — per-episode metadata
    static/data/audio/episode-sources.json    — editorial citations sidecar
    static/data/source-logos.json             — publisher logos + license

  Sort:
    Tour episodes in CURATOR_FULL_TOUR documentary order, then non-tour
    episodes grouped by route. Read transcript links point at the
    existing .txt files served from /audio/; no new asset is built.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import {
    getAudioProvenanceManifest,
    getEpisodeSourcesManifest,
    getSourceLogos,
    type AudioProvenanceEntry,
    type AudioProvenanceManifest,
    type EpisodeSourcesManifest,
    type EpisodeSource,
    type SourceLogosManifest,
  } from '$lib/data';
  import { CURATOR_FULL_TOUR } from '$lib/audio-tour';
  import { fmtTime } from '$lib/audio-format';
  import * as m from '$lib/paraglide/messages';

  let provenance = $state<AudioProvenanceManifest | null>(null);
  let sources = $state<EpisodeSourcesManifest | null>(null);
  let logos = $state<SourceLogosManifest | null>(null);
  let loaded = $state(false);

  $effect(() => {
    void Promise.all([
      getAudioProvenanceManifest(),
      getEpisodeSourcesManifest(),
      getSourceLogos(),
    ]).then(([p, s, l]) => {
      provenance = p;
      sources = s;
      logos = l;
      loaded = true;
    });
  });

  // Index sources by episode_id for O(1) lookup at render time.
  const sourcesById = $derived.by<Record<string, EpisodeSource[]>>(() => {
    if (!sources) return {};
    const out: Record<string, EpisodeSource[]> = {};
    for (const e of sources.episodes) out[e.episode_id] = e.sources;
    return out;
  });

  // Logo path + display name by source_id.
  function logoFor(sourceId: string): { src: string; alt: string } | null {
    if (!logos) return null;
    const s = logos.sources.find((x) => x.id === sourceId);
    if (!s || !s.logo_path) return null;
    return { src: `${base}${s.logo_path}`, alt: s.name };
  }

  // Total duration over all episodes for the page header.
  const totalDurationSec = $derived(
    provenance?.entries.map((e) => e.duration_target_sec ?? 0).reduce((a, b) => a + b, 0) ?? 0,
  );

  // Sort order: tour episodes first in documentary order; then non-tour
  // episodes grouped by route alphabetically. De-duplicates per
  // episode_id (audio-provenance carries one row per provider variant —
  // we only want one card per logical episode).
  interface EpisodeCard {
    entry: AudioProvenanceEntry;
    isTour: boolean;
    tourIndex: number | null;
  }

  const orderedEpisodes = $derived.by<EpisodeCard[]>(() => {
    if (!provenance) return [];
    // Pick one representative entry per episode_id — prefer the canonical
    // provider (google) so the transcript path is stable; any variant's
    // .txt has the same prose anyway.
    const byId = new Map<string, AudioProvenanceEntry>();
    for (const entry of provenance.entries) {
      const existing = byId.get(entry.episode_id);
      if (!existing || entry.provider === 'google') byId.set(entry.episode_id, entry);
    }
    const cards: EpisodeCard[] = [];
    const seen = new Set<string>();

    // 1. Tour episodes in documentary order.
    CURATOR_FULL_TOUR.forEach((id, idx) => {
      const entry = byId.get(id);
      if (!entry) return;
      cards.push({ entry, isTour: true, tourIndex: idx });
      seen.add(id);
    });

    // 2. Remaining (non-tour) episodes — sort by (route, title).
    const remaining: AudioProvenanceEntry[] = [];
    for (const [id, entry] of byId) if (!seen.has(id)) remaining.push(entry);
    remaining.sort((a, b) => {
      const ra = a.route ?? '~';
      const rb = b.route ?? '~';
      if (ra !== rb) return ra.localeCompare(rb);
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
    for (const entry of remaining) cards.push({ entry, isTour: false, tourIndex: null });
    return cards;
  });
</script>

<svelte:head>
  <title>{m.library_episodes_page_title()}</title>
  <meta name="description" content={m.library_episodes_meta_description()} />
</svelte:head>

<section class="ep-index" aria-labelledby="ep-index-title" data-route-ready="true">
  <header class="ep-index-head">
    <h1 id="ep-index-title">{m.library_episodes_h1()}</h1>
    <p class="ep-index-blurb">{m.library_episodes_intro()}</p>
    <p class="ep-index-origin-disclosure">{m.audio_origin_disclosure_text()}</p>
    {#if loaded && provenance}
      <p class="ep-index-meta">
        {m.library_episodes_meta({
          count: orderedEpisodes.length,
          duration: fmtTime(totalDurationSec, { withHours: true }),
        })}
      </p>
    {/if}
  </header>

  {#if loaded && provenance}
    <ul class="ep-list">
      {#each orderedEpisodes as card (card.entry.episode_id)}
        {@const ep = card.entry}
        {@const epSources = sourcesById[ep.episode_id] ?? []}
        <li class="ep-card">
          <div class="ep-head">
            <span class="persona-dot persona-{ep.persona}" aria-hidden="true"></span>
            <h2 class="ep-title">{ep.title ?? ep.episode_id}</h2>
            {#if card.isTour && card.tourIndex !== null}
              <span class="tour-chip" aria-label={m.library_episodes_tour_chip_aria()}>
                {m.library_episodes_tour_chip({
                  pos: card.tourIndex + 1,
                  total: CURATOR_FULL_TOUR.length,
                })}
              </span>
            {/if}
          </div>
          <p class="ep-meta">
            <span class="persona-name">{ep.persona}</span>
            {#if ep.route}<span class="ep-meta-sep">·</span><a
                class="ep-route"
                href="{base}{ep.route}">{ep.route}</a
              >{/if}
            {#if ep.duration_target_sec}<span class="ep-meta-sep">·</span><span class="ep-dur"
                >{fmtTime(ep.duration_target_sec)}</span
              >{/if}
            <span class="ep-meta-sep">·</span>
            <span class="ep-author">
              {m.library_episodes_text_authorship({
                authorship: ep.text_authorship.replaceAll('-', ' '),
              })}{#if ep.text_author_model}
                ({ep.text_author_model}){/if}
            </span>
          </p>

          <a class="ep-read" href="{base}{ep.path_txt}" target="_blank" rel="noopener noreferrer">
            {m.library_episodes_read_transcript()}
          </a>

          <div class="ep-sources">
            {#if epSources.length > 0}
              <span class="ep-sources-label">{m.library_episodes_sources_label()}</span>
              <ul class="ep-sources-list">
                {#each epSources as src (src.label)}
                  <li class="ep-source">
                    {#if logoFor(src.source_id)}
                      {@const logo = logoFor(src.source_id)}
                      {#if logo}
                        <img class="ep-source-logo" src={logo.src} alt={logo.alt} loading="lazy" />
                      {/if}
                    {/if}
                    {#if src.url}
                      <a href={src.url} target="_blank" rel="noopener noreferrer external">
                        {src.label}
                      </a>
                    {:else}
                      <span>{src.label}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <span class="ep-sources-pending">{m.library_episodes_sources_pending()}</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="ep-empty">{m.library_episodes_loading()}</p>
  {/if}

  <footer class="ep-index-foot">
    <a href="{base}/library">{m.library_episodes_back()}</a>
    <span class="ep-foot-sep">·</span>
    <a href="{base}/credits">{m.library_episodes_credits_link()}</a>
  </footer>
</section>

<style>
  .ep-index {
    max-width: 920px;
    margin: 0 auto;
    padding: 24px 18px 80px;
    color: var(--color-text);
  }
  .ep-index-head {
    margin-bottom: 24px;
  }
  .ep-index-head h1 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 500;
  }
  .ep-index-blurb {
    margin: 0 0 6px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.55;
  }
  .ep-index-meta {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
  }

  .ep-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  /* Long-list rendering perf — matches /fleet, /library, /credits (W4). */
  .ep-card {
    content-visibility: auto;
    contain-intrinsic-size: 1px 220px;
    padding: 16px 18px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }

  .ep-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }
  .persona-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.35);
  }
  .persona-dot.persona-curator {
    background: #c9aa6f;
  }
  .persona-dot.persona-guide {
    background: #6fb6c9;
  }
  .persona-dot.persona-enthusiast {
    background: #c96fa0;
  }
  .ep-title {
    margin: 0;
    font-size: 17px;
    font-weight: 500;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
  }
  .tour-chip {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #c9aa6f;
    padding: 2px 6px;
    border: 1px solid rgba(201, 170, 111, 0.35);
    border-radius: 2px;
    flex-shrink: 0;
  }

  .ep-meta {
    margin: 0 0 10px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    line-height: 1.4;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
  }
  .persona-name {
    text-transform: capitalize;
  }
  .ep-meta-sep {
    color: rgba(255, 255, 255, 0.25);
  }
  .ep-route {
    color: rgba(255, 255, 255, 0.75);
    text-decoration: none;
    font-family: 'Space Mono', monospace;
  }
  .ep-route:hover,
  .ep-route:focus-visible {
    color: #c9aa6f;
    text-decoration: underline;
    outline: none;
  }
  .ep-dur {
    font-family: 'Space Mono', monospace;
    font-variant-numeric: tabular-nums;
  }
  .ep-author {
    color: rgba(255, 255, 255, 0.4);
  }

  .ep-read {
    display: inline-block;
    margin-bottom: 12px;
    padding: 6px 12px;
    background: rgba(201, 170, 111, 0.08);
    border: 1px solid rgba(201, 170, 111, 0.35);
    border-radius: 3px;
    color: #c9aa6f;
    font-size: 13px;
    text-decoration: none;
  }
  .ep-read:hover,
  .ep-read:focus-visible {
    background: rgba(201, 170, 111, 0.14);
    border-color: rgba(201, 170, 111, 0.6);
    outline: none;
  }

  .ep-sources {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 10px;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.7);
  }
  .ep-sources-label {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin-right: 8px;
  }
  .ep-sources-list {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ep-source {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ep-source-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
    flex-shrink: 0;
    opacity: 0.85;
  }
  .ep-source a {
    color: rgba(255, 255, 255, 0.85);
    text-decoration: underline;
    text-decoration-color: rgba(255, 255, 255, 0.3);
  }
  .ep-source a:hover,
  .ep-source a:focus-visible {
    color: #c9aa6f;
    outline: none;
  }
  .ep-sources-pending {
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }

  .ep-empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 40px;
  }

  .ep-index-foot {
    margin-top: 28px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
  }
  .ep-index-foot a {
    color: rgba(255, 255, 255, 0.75);
    text-decoration: none;
  }
  .ep-index-foot a:hover,
  .ep-index-foot a:focus-visible {
    color: #c9aa6f;
    text-decoration: underline;
    outline: none;
  }
  .ep-foot-sep {
    color: rgba(255, 255, 255, 0.25);
    margin: 0 8px;
  }

  @media (min-width: 768px) {
    .ep-index {
      padding: 36px 32px 96px;
    }
  }
</style>
