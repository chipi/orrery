/**
 * Helpers for the public /credits bill of materials (ADR-046 Milestone D).
 *
 * Pure functions only — no DOM, no fetch. The page calls
 * `getImageProvenanceManifest()` + `getSourceLogos()` + `getTextSources()`
 * via `$lib/data` and feeds the entries here.
 */

import type { ImageProvenanceEntry, SourceLogo, TextSourceEntry } from '$lib/data';

/**
 * A single sourced image, plus every emitted aspect-ratio variant
 * that shares the same source attribution. The asset pipeline writes
 * each panel image at four aspect crops (`<slot>.16x9.jpg`,
 * `<slot>.1x1.jpg`, `<slot>.4x3.jpg`, `<slot>.jpg`) — all derived
 * from one upstream file — so the /credits page collapses them into
 * one row with chips for the variants present. Reuse credit + license
 * apply identically to every variant; bundling avoids 3–4× row
 * duplication on a page that already runs long.
 */
export interface PhotoBundle {
  /** The entry chosen to represent the bundle on the page (original
   *  un-cropped variant when present, else the first emitted path). */
  representative: ImageProvenanceEntry;
  /** Path with the aspect-ratio + extension stripped, e.g.
   *  `/images/missions/lro/02` for any of `02.16x9.jpg`, `02.1x1.jpg`,
   *  `02.4x3.jpg`, `02.jpg`. Used for the "used on" path display. */
  stem: string;
  /** Aspect-ratio chips present in this bundle, in canonical order:
   *  `16:9, 4:3, 1:1, original`. Single-element `['original']` for
   *  paths that have no crop siblings (logos, textures, sun, …). */
  variants: string[];
  /** All emitted paths that collapsed into this bundle. */
  paths: string[];
}

export interface CreditsGroup {
  source: SourceLogo;
  bundles: PhotoBundle[];
  texts: TextSourceEntry[];
}

const ASPECT_RE = /\.(16x9|1x1|4x3)\.[a-z]+$/;
const ASPECT_OR_EXT_RE = /(?:\.(?:16x9|1x1|4x3))?\.[a-z]+$/;
const VARIANT_ORDER = ['16:9', '4:3', '1:1', 'original'];

/** Aspect-ratio suffix between the slot number and the extension, or null. */
function variantSuffix(path: string): '16x9' | '1x1' | '4x3' | null {
  const m = ASPECT_RE.exec(path);
  return (m?.[1] as '16x9' | '1x1' | '4x3' | undefined) ?? null;
}

/** Strip the aspect-ratio crop suffix + extension to get a stable
 *  per-source-image stem. `/images/missions/lro/02.16x9.jpg` and
 *  `/images/missions/lro/02.jpg` both stem to `…/lro/02`;
 *  `/logos/nasa.svg` stems to `/logos/nasa`. */
function pathStem(path: string): string {
  return path.replace(ASPECT_OR_EXT_RE, '');
}

/**
 * Collapse photo entries into bundles. Key is
 * `(stem, source_url, title, author)` — same crop family AND same
 * upstream attribution. Two photos with the same stem but different
 * `source_url`s (e.g. `/images/earth-objects/beidou/01.{16x9,1x1,4x3}.jpg`
 * each from a different Wikimedia file) stay as separate bundles so
 * attribution isn't fudged.
 */
export function bundlePhotos(photos: ImageProvenanceEntry[]): PhotoBundle[] {
  const groups = new Map<string, ImageProvenanceEntry[]>();
  const order: string[] = [];
  for (const p of photos) {
    const key = `${pathStem(p.path)}§${p.source_url}§${p.title}§${p.author ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(p);
    } else {
      groups.set(key, [p]);
      order.push(key);
    }
  }
  const bundles: PhotoBundle[] = [];
  for (const key of order) {
    const entries = groups.get(key)!;
    const representative = entries.find((e) => variantSuffix(e.path) === null) ?? entries[0];
    const present = new Set<string>();
    for (const e of entries) {
      const v = variantSuffix(e.path);
      present.add(v === null ? 'original' : v.replace('x', ':'));
    }
    const variants = VARIANT_ORDER.filter((v) => present.has(v));
    bundles.push({
      representative,
      stem: pathStem(representative.path),
      variants,
      paths: entries.map((e) => e.path).sort((a, b) => a.localeCompare(b)),
    });
  }
  return bundles;
}

const SOURCE_TYPE_TO_ID: Record<string, string> = {
  'wikimedia-commons': 'wikimedia-commons',
  'nasa-images-api': 'nasa',
  'direct-other': 'solar-system-scope',
};

/**
 * Map an image provenance entry to a source-logos id.
 *
 * Editorial rule for the public credits page: the **upstream
 * publisher** (the agency that flew the hardware / produced the
 * image) wins over the **retrieval conduit** (Wikimedia Commons,
 * NASA Images API). A CNSA Chang'e photograph that we retrieved
 * via Commons appears in the CNSA section — Commons is just where
 * we downloaded the bytes; CNSA produced the imagery. The Commons
 * file-page link stays in the per-image TASL row so reuse credit
 * follows the platform's terms.
 *
 * The fallback chain is:
 *   1. Map `agency` (split on " / " — first token wins per ADR-046
 *      primary-credit rule) to a known source-logos id.
 *   2. If the agency is a generic Commons / NASA contributor name,
 *      bucket under the source_type (Commons / NASA / Solar System
 *      Scope) so we don't pretend a Wikimedia volunteer photo is
 *      from CNSA.
 *   3. Otherwise default to wikimedia-commons.
 */
function agencyToSourceId(agency: string): string | null {
  const a = agency.toLowerCase();
  if (!a) return null;
  // Generic / non-agency authorship — let source_type drive bucketing.
  if (a.includes('wikimedia commons contributor')) return null;
  if (a.includes('solar system scope')) return 'solar-system-scope';
  if (a.includes('mbrsc') || a.includes('uae space agency')) return 'uaesa';
  if (a.includes('roscosmos') || a === 'soviet') return 'roscosmos';
  if (a.includes('cnsa')) return 'cnsa';
  if (a.includes('isro')) return 'isro';
  if (a.includes('jaxa')) return 'jaxa';
  if (a.includes('spacex')) return 'spacex';
  if (a.includes('blue origin')) return 'blue-origin';
  // Inspiration Mars doesn't have its own source-logos entry —
  // fall through to source_type so it buckets under the
  // retrieval conduit (Wikimedia Commons) instead of being
  // silently mis-attributed.
  if (a.includes('inspiration mars')) return null;
  if (a.includes('esa')) return 'esa';
  if (a.includes('nasa')) return 'nasa';
  return null;
}

export function provenanceSourceId(p: ImageProvenanceEntry): string {
  // Take the first agency token when the field is a partner credit
  // like "ROSCOSMOS / NASA" or "ESA / NASA" — the first listed is
  // the primary attribution per ADR-046.
  const primary = (p.agency ?? '').split(' / ')[0].trim();
  const byAgency = agencyToSourceId(primary);
  if (byAgency) return byAgency;
  return SOURCE_TYPE_TO_ID[p.source_type] ?? 'wikimedia-commons';
}

const TEXT_PUBLISHER_HINTS: Array<[RegExp, string]> = [
  [/wikipedia/i, 'wikipedia'],
  [/nasa|jpl|goddard|apollo program/i, 'nasa'],
  [/european space agency|esa/i, 'esa'],
  [/jaxa|japan aerospace/i, 'jaxa'],
  [/isro|indian space research/i, 'isro'],
  [/cnsa|china national space/i, 'cnsa'],
  [/roscosmos/i, 'roscosmos'],
  [/mbrsc|mohammed bin rashid|uae/i, 'uaesa'],
  [/spacex/i, 'spacex'],
  [/blue origin/i, 'spacex'],
  [/orrery/i, 'wikipedia'],
];

/**
 * Best-effort grouping of text-sources entries by source. UI-original
 * (license_short === Orrery-Original) goes under the Wikipedia bucket
 * if no better match is found — Wikipedia is the closest analogue for
 * editorial provenance the page already groups by — but a future
 * iteration could add an "Orrery maintainers" source row.
 */
export function textSourceId(t: TextSourceEntry): string {
  const blob = `${t.source_publisher ?? ''} ${t.source_url ?? ''}`;
  for (const [re, id] of TEXT_PUBLISHER_HINTS) {
    if (re.test(blob)) return id;
  }
  return 'wikipedia';
}

/**
 * Map an emitted image path to a localised app-route label. Paths
 * follow the on-disk convention enforced by fetch-assets.ts:
 *   /images/missions/<id>/<nn>.jpg          → /missions panel
 *   /images/missions/<id>.jpg                → /missions card hero
 *   /images/iss-modules/<id>/<nn>.jpg        → /iss panel
 *   /images/earth-objects/<id>/<nn>.jpg      → /earth panel
 *   /images/moon-sites/<id>/<nn>.jpg         → /moon panel
 *   /images/mars-sites/<id>/<nn>.jpg         → /mars panel
 *   /images/planets/<id>/<nn>.jpg            → /explore planet panel
 *   /images/sun/<nn>.jpg                     → /explore sun panel
 *   /images/small-bodies/<id>/<nn>.jpg       → /explore small-body
 *   /images/rockets/<id>.jpg                 → /missions rocket reference
 *   /logos/<id>.<ext>                        → site-wide agency badges
 *   /textures/<file>                          → 3D scenes
 */
export function pathToRouteKey(p: string): string {
  if (p.startsWith('/images/missions/')) return 'missions';
  if (p.startsWith('/images/iss-modules/')) return 'iss';
  if (p.startsWith('/images/earth-objects/')) return 'earth';
  if (p.startsWith('/images/moon-sites/')) return 'moon';
  if (p.startsWith('/images/mars-sites/')) return 'mars';
  if (p.startsWith('/images/planets/')) return 'explore';
  if (p.startsWith('/images/sun/')) return 'explore';
  if (p.startsWith('/images/small-bodies/')) return 'explore';
  if (p.startsWith('/images/rockets/')) return 'rockets';
  if (p.startsWith('/logos/')) return 'logos';
  if (p.startsWith('/textures/')) return 'textures';
  return 'explore';
}

/**
 * Group all provenance + text entries by source. The returned
 * groups follow the order of `sources` (Milestone D style guide:
 * agencies first, then platforms / publishers). Photos are bundled
 * by `bundlePhotos` so aspect-ratio crops of the same source image
 * collapse into one row with variant chips.
 */
export function groupBySource(
  sources: SourceLogo[],
  photos: ImageProvenanceEntry[],
  texts: TextSourceEntry[],
): CreditsGroup[] {
  type Acc = { source: SourceLogo; photos: ImageProvenanceEntry[]; texts: TextSourceEntry[] };
  const byId = new Map<string, Acc>(
    sources.map((s) => [s.id, { source: s, photos: [], texts: [] }]),
  );
  for (const p of photos) {
    const id = provenanceSourceId(p);
    const grp = byId.get(id) ?? byId.get('wikimedia-commons');
    if (grp) grp.photos.push(p);
  }
  for (const t of texts) {
    const id = textSourceId(t);
    const grp = byId.get(id) ?? byId.get('wikipedia');
    if (grp) grp.texts.push(t);
  }
  const out: CreditsGroup[] = [];
  for (const acc of byId.values()) {
    acc.photos.sort((a, b) => a.path.localeCompare(b.path));
    acc.texts.sort((a, b) => a.id.localeCompare(b.id));
    const bundles = bundlePhotos(acc.photos);
    if (bundles.length + acc.texts.length === 0) continue;
    out.push({ source: acc.source, bundles, texts: acc.texts });
  }
  return out;
}
