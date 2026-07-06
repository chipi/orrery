// NASA WordPress galleries (nasa.gov/gallery/<slug>). Server-rendered HTML:
// image URLs sit inline under wp-content/uploads. Per-slug, NOT searchable —
// so we map missionId/name → known slugs + a slugified fallback.
// All NASA-produced imagery is public domain (PD-USGov).

export interface SourceCandidate {
  imageUrl: string;
  sourceUrl: string;
  title: string;
  author?: string;
  license_short: string;
  license_url?: string;
  source: string;
}

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// Known-good slugs. Generic 'ksc-history' guarantees a non-empty fallback page.
const SEED_SLUGS: Record<string, string> = {
  'blue-moon-mk1': 'blue-origin-blue-moon-mark-1',
  'ksc-history': 'ksc-history',
  // Mission ids don't map to NASA's gallery slugs by slugify alone
  // (artemis2 → "artemis-ii", not "artemis2"). Pin the known ones.
  artemis2: 'artemis-ii',
  artemis3: 'artemis-iii',
};

/** True when NASA hosts a known gallery for this mission id — including
 *  non-NASA-agency missions NASA flies (e.g. the Blue Origin CLPS lander). */
export function hasNasaGallerySlug(id: string): boolean {
  return id in SEED_SLUGS;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// WordPress appends '-1024x576' / '-scaled' to derivatives; strip to originals.
const toOriginal = (url: string) =>
  url.replace(/-scaled(?=\.\w+$)/i, '').replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/i, '');

export async function fetchNasaGallery(opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}): Promise<SourceCandidate[]> {
  const slugs = Array.from(
    new Set(
      [
        SEED_SLUGS[opts.missionId],
        opts.name ? slugify(opts.name) : undefined,
        opts.query ? slugify(opts.query) : undefined,
        // no generic fallback — precise-or-nothing (avoid wrong-mission imagery)
      ].filter((s): s is string => !!s),
    ),
  );

  const out: SourceCandidate[] = [];
  const seen = new Set<string>();

  for (const slug of slugs) {
    if (out.length >= opts.limit) break;
    const sourceUrl = `https://www.nasa.gov/gallery/${slug}/`;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15_000);
      const res = await fetch(sourceUrl, {
        headers: { 'User-Agent': UA },
        signal: ctl.signal,
      }).finally(() => clearTimeout(t));
      if (!res.ok) continue; // 404 on a bad slug → try next
      const html = await res.text();

      const re = /https?:\/\/[^"'\s)]+?\/wp-content\/uploads\/[^"'\s)]+?\.(?:jpe?g|png|webp)/gi;
      for (const m of html.matchAll(re)) {
        const orig = toOriginal(m[0]);
        if (seen.has(orig)) continue;
        seen.add(orig);
        out.push({
          imageUrl: orig,
          sourceUrl,
          title: opts.name ?? slug,
          author: 'NASA',
          license_short: 'PD-USGov',
          license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
          source: 'nasa-gallery',
        });
        if (out.length >= opts.limit) break;
      }
    } catch {
      continue; // never throw — timeout / network error → skip this slug
    }
  }

  return out.slice(0, opts.limit);
}
