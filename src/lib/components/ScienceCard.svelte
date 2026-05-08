<!--
  ScienceCard — compact inline preview of a /science section. Used by the
  SCIENCE tab on detail panels (mission, planet, earth-object, moon site,
  mars site, ISS module, Tiangong module).

  Renders:
    - section title (clickable into /science/[tab]/[section])
    - intro_sentence as a one-liner
    - first narrative_101 paragraph (compressed; up to ~180 chars then a
      "read more" link)
    - small bottom-strip with the tab label

  Lazy: fetches the section overlay on mount via getScienceSection. Falls
  back gracefully to a one-line link if the fetch fails (data-layer en-US
  fallback per ADR-017 already handles missing locale overlays).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { getScienceSection } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import type { ScienceSection, ScienceTabId } from '$types/science';

  type Props = {
    /** Encyclopedia tab the card pulls from. */
    tab: ScienceTabId;
    /** Section id within the tab. */
    section: string;
    /** Optional override for the heading display (defaults to section title). */
    heading?: string;
    /** When true, render the first narrative_101 paragraph (default). When
     * false, render only the intro_sentence — use this for very compact
     * lists where space is tight. */
    expanded?: boolean;
  };
  let { tab, section, heading, expanded = true }: Props = $props();

  let sectionData = $state<ScienceSection | null>(null);
  const locale = $derived(localeFromPage($page));

  onMount(async () => {
    sectionData = await getScienceSection(tab, section, locale);
  });

  const previewParagraph = $derived(sectionData?.narrative_101?.[0] ?? null);
</script>

<a class="card" href="{base}/science/{tab}/{section}" data-science-card>
  {#if sectionData}
    <p class="title">{heading ?? sectionData.title}</p>
    <p class="intro">{sectionData.intro_sentence}</p>
    {#if expanded && previewParagraph}
      <p class="preview">{previewParagraph}</p>
    {/if}
    <p class="meta">
      <span class="tab-tag">{tab.replace(/-/g, ' ')}</span>
      <span class="more">Read full section →</span>
    </p>
  {:else}
    <p class="title">{heading ?? `${tab}/${section}`}</p>
    <p class="intro placeholder">Loading science…</p>
  {/if}
</a>

<style>
  .card {
    display: block;
    padding: 12px 14px;
    margin: 0 0 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: var(--color-text);
    text-decoration: none;
    transition:
      border-color 120ms,
      background 120ms;
  }
  .card:hover,
  .card:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    background: rgba(78, 205, 196, 0.06);
    outline: none;
  }
  .title {
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 4px;
  }
  .intro {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 6px;
  }
  .intro.placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .preview {
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.78);
    margin: 0 0 6px;
    /* Clamp to ~3 lines so the panel doesn't overflow on narrow phones. */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 6px 0 0;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .tab-tag {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: rgba(78, 205, 196, 0.85);
    text-transform: uppercase;
  }
  .more {
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
  }
</style>
