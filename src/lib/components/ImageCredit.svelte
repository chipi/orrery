<!--
  Per-image attribution rendered in gallery lightboxes (ADR-046 Milestone C).

  Reads `static/data/image-provenance.json` via `$lib/data` and shows the
  exact TASL line for the displayed image: title, author/agency, license
  short name + license URL, source link, modification disclosure, plus
  the no-endorsement disclaimer. Falls back to the contextual gallery
  footer copy from Milestone A/B when the manifest is absent or the
  image path is not yet recorded — the caller is expected to render
  that fallback above this component.
-->
<script lang="ts">
  import { getImageProvenance, type ImageProvenanceEntry } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    src: string | null;
  };
  let { src }: Props = $props();

  let entry: ImageProvenanceEntry | null = $state(null);
  let lastSrc: string | null = $state(null);

  $effect(() => {
    const target = src;
    if (target === lastSrc) return;
    lastSrc = target;
    entry = null;
    if (!target) return;
    void getImageProvenance(target).then((e) => {
      if (lastSrc === target) entry = e;
    });
  });
</script>

{#if entry}
  <div class="image-credit" data-source={entry.source_type}>
    <p class="title">{entry.title}</p>
    <p class="meta">
      <span class="author">{entry.author ?? entry.agency}</span>
      <span class="sep">·</span>
      <a class="source" href={entry.source_url} target="_blank" rel="noopener noreferrer">
        {m.image_credit_source_link()}
      </a>
      <span class="sep">·</span>
      {#if entry.license_url}
        <a class="license" href={entry.license_url} target="_blank" rel="noopener noreferrer">
          {entry.license_short}
        </a>
      {:else}
        <span class="license">{entry.license_short}</span>
      {/if}
    </p>
    {#if entry.modifications && entry.modifications.length > 0}
      <p class="modifications">{m.image_credit_modifications()}</p>
    {/if}
    <p class="disclaimer">{m.no_endorsement_disclaimer()}</p>
  </div>
{/if}

<style>
  .image-credit {
    margin: 8px 0 0;
    padding: 8px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    line-height: 1.5;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.55);
  }
  .image-credit .title {
    margin: 0 0 4px;
    color: rgba(255, 255, 255, 0.75);
    font-size: 9px;
  }
  .image-credit .meta {
    margin: 0 0 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: baseline;
  }
  .image-credit .author {
    color: rgba(255, 255, 255, 0.7);
  }
  .image-credit .sep {
    color: rgba(255, 255, 255, 0.25);
  }
  .image-credit a.source,
  .image-credit a.license {
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .image-credit a.source:hover,
  .image-credit a.license:hover,
  .image-credit a.source:focus-visible,
  .image-credit a.license:focus-visible {
    color: #7ddfd8;
    border-bottom-color: rgba(78, 205, 196, 0.8);
    outline: none;
  }
  .image-credit .modifications,
  .image-credit .disclaimer {
    margin: 0 0 4px;
    color: rgba(255, 255, 255, 0.4);
    font-style: italic;
  }
  .image-credit .disclaimer:last-child {
    margin-bottom: 0;
  }
</style>
