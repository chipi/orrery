// ESA Photolibrary adapter — https://photolibrary.esa.int/
// Not a real SPA: it's a WordPress site whose search page is fully
// server-rendered. wp-json REST is 403-blocked and the DAM (Scaleflex
// Filerobot, fmqowdxm.filerobot.com) has no public API, but WP search at
// `/?s=<term>` returns HTML we can scrape. Each result carries a full-res
// lightbox URL + an /asset/?uuid= permalink. The `?vh=<hash>?w=1024` double-`?`
// makes Filerobot ignore `w`, so we get the original-resolution preview.
// All ESA imagery is CC BY-SA 3.0 IGO. Full downloads are login-gated, but the
// lightbox preview URLs are public and directly fetchable.

export interface SourceCandidate {
  imageUrl: string; // direct, fetchable, highest-res image URL
  sourceUrl: string; // human page URL (provenance source_url)
  title: string;
  author?: string; // credit / photographer / agency
  license_short: string; // e.g. 'CC0', 'PD-USGov', 'Unsplash-License'
  license_url?: string;
  source: string; // the adapter key
}

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

// Minimal HTML-entity decode — WP emits numeric + a few named entities in titles.
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .trim();
}

export async function fetchEsaPortal(opts: {
  query: string;
  missionId: string;
  agency?: string;
  name?: string;
  limit: number;
}): Promise<SourceCandidate[]> {
  // Library is ESA-only content; skip when a non-ESA agency owns the mission.
  if (opts.agency && !/esa/i.test(opts.agency)) return [];
  const term = (opts.query || opts.name || '').trim();
  if (!term) return [];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const url = `https://photolibrary.esa.int/?s=${encodeURIComponent(term)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!res.ok) return [];
    const html = await res.text();

    const out: SourceCandidate[] = [];
    // Each result is a <div class="c-item ..."> ... </div> block; split on the
    // opening marker and pull the three fields out of each chunk.
    for (const chunk of html.split('c-item is-masonry__item').slice(1)) {
      const img = chunk.match(/class="c-item__icon"\s+href="([^"]+)"/);
      if (!img) continue; // no lightbox = login-gated placeholder; skip
      const heading = chunk.match(/c-item__heading">\s*([\s\S]*?)\s*<\/h5>/);
      const asset = chunk.match(/href="(https:\/\/photolibrary\.esa\.int\/asset\/\?uuid=[^"]+)"/);
      out.push({
        imageUrl: img[1],
        sourceUrl: asset ? asset[1] : url,
        title: heading ? decode(heading[1]) : term,
        author: 'ESA',
        license_short: 'CC-BY-SA-3.0-IGO',
        license_url: 'https://creativecommons.org/licenses/by-sa/3.0/igo/',
        source: 'esa-portal',
      });
      if (out.length >= opts.limit) break;
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
