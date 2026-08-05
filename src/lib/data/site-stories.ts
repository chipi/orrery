import { get } from './core';

/**
 * #PE path-B (rich multi-agency narrative gallery).
 *
 * A site-story is a hand-curated chapter-based photo set with
 * per-image captions + chapter grouping. Distinct from the existing
 * GALLERY tab (which is a 5-image thumbnail strip with no captions).
 *
 * Stories live under `static/data/site-stories/<siteId>.json`. The
 * file is missing for sites that don't have a story yet — caller
 * gets null and renders nothing (the STORY tab hides on those sites).
 *
 * Per-image attribution / license / source URL is resolved at render
 * time from the existing image-provenance.json — no duplication.
 */
export interface SiteStoryImage {
  src: string;
  caption: string;
  /** Optional chapter id. If omitted, defaults to the enclosing
   *  chapter's id. */
  chapter?: string;
}

export interface SiteStoryChapter {
  id: string;
  title: string;
  subtitle?: string;
  images: SiteStoryImage[];
}

export interface SiteStory {
  site: string;
  intro: string;
  chapters: SiteStoryChapter[];
}

/**
 * Per-locale overlay shape for SiteStory. Only fields that change
 * by language need to be present — image paths, chapter ids, and
 * any shared metadata stay in the base file. Captions are the
 * usual translation target; intros + subtitles next.
 */
interface SiteStoryOverlay {
  intro?: string;
  chapters?: Array<{
    id: string;
    title?: string;
    subtitle?: string;
    images?: Array<{ src: string; caption?: string }>;
  }>;
}

function mergeStoryOverlay(base: SiteStory, overlay: SiteStoryOverlay): SiteStory {
  const overlayChaptersById = new Map((overlay.chapters ?? []).map((c) => [c.id, c]));
  const overlayImagesByChapterSrc = new Map<string, string>();
  for (const c of overlay.chapters ?? []) {
    for (const img of c.images ?? []) {
      if (img.src && img.caption) overlayImagesByChapterSrc.set(`${c.id}::${img.src}`, img.caption);
    }
  }
  return {
    site: base.site,
    intro: overlay.intro ?? base.intro,
    chapters: base.chapters.map((c) => {
      const o = overlayChaptersById.get(c.id);
      return {
        ...c,
        title: o?.title ?? c.title,
        subtitle: o?.subtitle ?? c.subtitle,
        images: c.images.map((img) => {
          const caption = overlayImagesByChapterSrc.get(`${c.id}::${img.src}`);
          return caption ? { ...img, caption } : img;
        }),
      };
    }),
  };
}

/**
 * Site-story loader with per-locale overlay merge. Order:
 *   1. Base story at site-stories/<id>.json (English-authored)
 *   2. Locale overlay at i18n/<locale>/site-stories/<id>.json
 *   3. Locale fallback to en-US overlay if non-default locale
 *      has no overlay (matches the getMarsSites / getMoonSites
 *      pattern from src/lib/data.ts §moon-sites overlays).
 *
 * Overlays only need to carry the fields that differ — usually
 * intro + chapter subtitles + per-image captions. Image paths,
 * chapter ids, and overall structure stay shared. Missing overlay
 * → render the base story (English) gracefully.
 *
 * Hard-membership gate via site-stories/index.json (2026-06-15 user
 * note: console showed `[404] GET /data/site-stories/<id>.json` for
 * every launch site without an editorial story — wenchang-lc-101,
 * xichang-lc-2, taiyuan-lc-9, jiuquan-slc-43, etc.). The loader was
 * already null-tolerant (catch → null), so behaviour was correct;
 * the 404s were just dev-server console noise from the speculative
 * fetch. Now we probe a tiny build-time manifest of available IDs
 * first and skip the request entirely when the ID isn't present.
 */
async function getSiteStoryIndex(): Promise<Set<string>> {
  const idx = await get<{ ids: string[] }>('site-stories/index.json').catch(() => null);
  return new Set(idx?.ids ?? []);
}

export async function getSiteStory(
  siteId: string,
  locale: string = 'en-US',
): Promise<SiteStory | null> {
  const available = await getSiteStoryIndex();
  if (!available.has(siteId)) return null;
  const base = await get<SiteStory>(`site-stories/${siteId}.json`).catch(() => null);
  if (!base) return null;
  if (locale === 'en-US') return base;
  const overlay = await get<SiteStoryOverlay>(`i18n/${locale}/site-stories/${siteId}.json`).catch(
    () => null,
  );
  if (overlay) return mergeStoryOverlay(base, overlay);
  // Fallback to en-US overlay if it exists (no-op today since en-US
  // captions are in the base; reserved for future English editorial
  // revisions that ship as an overlay).
  return base;
}
