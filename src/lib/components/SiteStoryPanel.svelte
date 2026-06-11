<script lang="ts">
  import { base } from '$app/paths';
  import { type SiteStory, getImageProvenanceManifest, type ImageProvenanceEntry } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getImageAlt } from '$lib/image-alt';
  import { getLocale } from '$lib/paraglide/runtime';

  // Localized titles for the canonical chapter ids — the story JSON
  // files use a fixed vocabulary of chapter.id values (hardware /
  // launch / surface / science / people) and we map those to
  // translatable messages so the chapter rail reads in the user's
  // locale. Sites with a custom chapter id fall back to chapter.title
  // verbatim (English-as-authored).
  const CHAPTER_TITLE_MESSAGES: Record<string, () => string> = {
    hardware: m.story_chapter_hardware,
    launch: m.story_chapter_launch,
    surface: m.story_chapter_surface,
    science: m.story_chapter_science,
    people: m.story_chapter_people,
  };

  function chapterTitle(id: string, fallback: string): string {
    return CHAPTER_TITLE_MESSAGES[id]?.() ?? fallback;
  }

  /**
   * Rich multi-agency narrative gallery (PRD-014 v0.7.x #PE path-B).
   *
   * Distinct from the existing detail-panel GALLERY tab — chapter-
   * grouped, per-image captions, agency badge, and a lightbox with
   * full source/license attribution pulled from
   * `image-provenance.json`. The simple GALLERY tab stays for
   * users who just want a thumbnail strip.
   *
   * Data shape: `static/data/site-stories/<siteId>.json` — chapters
   * with image refs + captions; provenance resolves at render time.
   * Per-image badge colour reads from the provenance entry's
   * `agency` field (NASA, ESA, CNSA, ROSCOSMOS, ISRO, JAXA, SPACEIL,
   * etc.). Missing provenance → grey "credit pending" badge so the
   * panel never crashes on a misconfigured src.
   */

  type StoryProps = {
    story: SiteStory;
    onLightbox?: (src: string) => void;
  };
  let { story, onLightbox = () => {} }: StoryProps = $props();

  // Index provenance by served path for O(1) badge lookups below.
  // The manifest may be absent (fresh checkout, script not yet run);
  // in that case badges fall back to a neutral "CREDIT" pill.
  let provenanceIndex: Map<string, ImageProvenanceEntry> = $state(new Map());
  $effect(() => {
    void getImageProvenanceManifest().then((m) => {
      if (!m) return;
      provenanceIndex = new Map(m.entries.map((e) => [e.path, e]));
    });
  });

  // Agency → display name + accent colour for the badge. Anything not
  // listed falls through to a neutral "OTHER" badge.
  const AGENCY_BADGES: Record<string, { label: string; accent: string }> = {
    NASA: { label: 'NASA', accent: '#0b3d91' },
    ESA: { label: 'ESA', accent: '#003247' },
    CNSA: { label: 'CNSA', accent: '#aa1010' },
    ROSCOSMOS: { label: 'ROSCOSMOS', accent: '#0033a0' },
    ISRO: { label: 'ISRO', accent: '#ff9933' },
    JAXA: { label: 'JAXA', accent: '#0b1d3a' },
    SPACEIL: { label: 'SPACE-IL', accent: '#0038b8' },
  };

  function badgeFor(src: string): { label: string; accent: string; credit: string | null } {
    const p = provenanceIndex.get(src);
    if (!p) return { label: 'CREDIT', accent: 'rgba(255,255,255,0.25)', credit: null };
    const agency = (p.agency ?? '').toUpperCase();
    const meta = AGENCY_BADGES[agency] ?? {
      label: agency || 'OTHER',
      accent: 'rgba(255,255,255,0.25)',
    };
    return { label: meta.label, accent: meta.accent, credit: p.author ?? null };
  }
</script>

<div class="story" data-testid="site-story-panel">
  <p class="intro">{story.intro}</p>
  {#each story.chapters as chapter (chapter.id)}
    <section class="chapter">
      <header class="chapter-head">
        <h4 class="chapter-title">{chapterTitle(chapter.id, chapter.title)}</h4>
        {#if chapter.subtitle}<p class="chapter-sub">{chapter.subtitle}</p>{/if}
      </header>
      <div class="images">
        {#each chapter.images as img (img.src)}
          {@const meta = badgeFor(img.src)}
          <figure class="figure">
            <button
              type="button"
              class="thumb"
              onclick={() => onLightbox(`${base}${img.src}`)}
              aria-label="Open {img.caption}"
            >
              <img
                src="{base}{img.src}"
                alt={getImageAlt(img.src, getLocale()) || img.caption}
                loading="lazy"
                decoding="async"
              />
              <span class="agency-badge" style="background: {meta.accent}">{meta.label}</span>
            </button>
            <figcaption class="caption">
              {img.caption}
              {#if meta.credit}<span class="credit">— {meta.credit}</span>{/if}
            </figcaption>
          </figure>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .story {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0 4px 8px;
  }
  .intro {
    /* Crimson Pro to match the OVERVIEW tab's narrative type. The
     * page body font is Space Mono (var(--font-mono)) — without an
     * explicit override the story text inherits the monospace, which
     * Marko flagged as visually inconsistent with other tabs. */
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.82);
    margin: 0;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .chapter-head {
    margin: 0 0 10px;
  }
  .chapter-title {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: var(--accent, #cc7a55);
    margin: 0 0 3px;
  }
  .chapter-sub {
    font-size: 11px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.55);
    margin: 0;
  }
  .images {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .thumb {
    position: relative;
    display: block;
    width: 100%;
    padding: 0;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .thumb:hover,
  .thumb:focus-visible {
    border-color: var(--accent, #cc7a55);
    outline: none;
  }
  .thumb img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }
  .agency-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 3px 8px;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1.2px;
    color: #fff;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  .caption {
    font-family: 'Crimson Pro', serif;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.78);
    margin: 0;
  }
  .credit {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    color: rgba(255, 255, 255, 0.5);
    margin-left: 4px;
  }
</style>
