/**
 * Helpers for the public /credits bill of materials (ADR-046 Milestone D).
 *
 * Pure functions only — no DOM, no fetch. The page calls
 * `getImageProvenanceManifest()` + `getSourceLogos()` + `getTextSources()`
 * via `$lib/data` and feeds the entries here.
 */

import type { ImageProvenanceEntry, SourceLogo, TextSourceEntry } from '$lib/data';

/**
 * A single sourced image, plus every emitted variant — aspect-ratio
 * crops AND cross-surface reuse — that share the same upstream file.
 *
 * Two collapse mechanisms run in `bundlePhotos`:
 *
 *   1. **Reliable-id bundle (primary)** — when an entry carries a
 *      per-image identifier that can't collide across distinct images
 *      (`image_url` / `nasa_id` / `pageid` / `revid`), every path
 *      sharing that id collapses into one bundle. Catches aspect-ratio
 *      variants of the same slot (`/images/missions/apollo11/01.jpg`
 *      + `/images/missions/apollo11/01.16x9.jpg`) AND cross-route reuse
 *      (e.g. same Aldrin photo on `/missions/apollo11` and
 *      `/moon-sites/apollo11`). Since the unified-path migration, the
 *      mission card hero IS the gallery's `01.jpg` (no separate
 *      `<id>.jpg` top-level duplicate to bundle anymore).
 *
 *   2. **Stem-fallback bundle** — when no reliable id is available
 *      (notably NASA Images API search-URL entries where `source_url`
 *      is a generic query that doesn't identify a specific image), the
 *      key falls back to `(stem, source_url, title, author)`. This
 *      still collapses aspect-ratio crops of one slot but never merges
 *      distinct images that happen to share a conduit URL.
 */
export interface PhotoBundle {
  /** The entry chosen to represent the bundle on the page (original
   *  un-cropped variant when present, else the first emitted path). */
  representative: ImageProvenanceEntry;
  /** All distinct path stems this bundle covers. Length 1 for the
   *  common aspect-crop-of-one-slot case; >1 when the same upstream
   *  image was emitted under multiple surfaces (hero ↔ panel, or
   *  cross-route reuse like missions ↔ moon-sites). Sorted. */
  stems: string[];
  /** Aspect-ratio chips present anywhere in this bundle, in canonical
   *  order: `16:9, 4:3, 1:1, original`. Single-element `['original']`
   *  for paths that have no crop siblings (logos, textures, sun, …). */
  variants: string[];
  /** All emitted paths that collapsed into this bundle, sorted. */
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

/** Per-image identifier that can't collide across distinct images.
 *  Returns `null` when the entry has no reliable hard id (notably
 *  NASA Images search-result rows where `source_url` is a generic
 *  query URL shared across many distinct results). */
function reliableImageId(p: ImageProvenanceEntry): string | null {
  if (p.image_url) return `image_url|${p.image_url}`;
  if (p.nasa_id) return `nasa_id|${p.nasa_id}`;
  if (p.pageid != null) return `pageid|${p.pageid}`;
  if (p.revid != null) return `revid|${p.revid}`;
  return null;
}

/**
 * Collapse photo entries into bundles. See `PhotoBundle` for the
 * two-tier keying strategy: reliable per-image id when available
 * (catches cross-route + hero/panel reuse), `(stem, source_url, title,
 * author)` fallback otherwise (catches aspect-ratio crops while
 * keeping distinct images apart when only the conduit URL is shared).
 */
export function bundlePhotos(photos: ImageProvenanceEntry[]): PhotoBundle[] {
  const groups = new Map<string, ImageProvenanceEntry[]>();
  const order: string[] = [];
  for (const p of photos) {
    const id = reliableImageId(p);
    const key = id ?? `fallback§${pathStem(p.path)}§${p.source_url}§${p.title}§${p.author ?? ''}`;
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
    // Representative: prefer an un-cropped path (no aspect suffix);
    // among those, prefer the shortest path (hero card `…/apollo11.jpg`
    // wins over panel `…/apollo11/01.jpg` when both share an image_url).
    const uncropped = entries.filter((e) => variantSuffix(e.path) === null);
    const representative = (uncropped.length > 0 ? uncropped : entries).reduce((a, b) =>
      a.path.length <= b.path.length ? a : b,
    );
    const present = new Set<string>();
    for (const e of entries) {
      const v = variantSuffix(e.path);
      present.add(v === null ? 'original' : v.replace('x', ':'));
    }
    const variants = VARIANT_ORDER.filter((v) => present.has(v));
    const stems = Array.from(new Set(entries.map((e) => pathStem(e.path)))).sort();
    bundles.push({
      representative,
      stems,
      variants,
      paths: entries.map((e) => e.path).sort((a, b) => a.localeCompare(b)),
    });
  }
  return bundles;
}

const SOURCE_TYPE_TO_ID: Record<string, string> = {
  'wikimedia-commons': 'wikimedia-commons',
  'nasa-images-api': 'nasa',
  'nasa-image-library': 'nasa',
  'direct-other': 'solar-system-scope',
  esahubble: 'stsci',
  'esa-multimedia': 'esa',
  'sci-esa-int': 'esa',
  'smithsonian-openaccess': 'smithsonian',
  smithsonian: 'smithsonian',
  nara: 'nara',
  jaxa: 'jaxa',
  'europeanspaceagency-flickr': 'esa',
  'roscosmos-flickr': 'roscosmos',
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
  // Phase 3 + Tier 1 additions — new source-logos entries that match
  // operator names appearing in image-provenance.agency.
  if (a.includes('northrop grumman')) return 'northrop-grumman';
  if (a.includes('axiom space')) return 'axiom-space';
  if (a.includes('intuitive machines')) return 'intuitive-machines';
  if (a.includes('ispace')) return 'ispace';
  if (a.includes('arianespace')) return 'arianespace';
  if (a.includes('boeing')) return 'boeing';
  if (a.includes('ula') || a.includes('united launch alliance')) return 'ula';
  if (a.includes('asi') || a.includes('agenzia spaziale italiana')) return 'asi';
  if (a.includes('usgs')) return 'usgs';
  if (a.includes('noaa')) return 'noaa';
  if (a.includes('smithsonian')) return 'smithsonian';
  if (a.includes('national archives') || a.includes('nara')) return 'nara';
  if (a.includes('ussf') || a.includes('us space force') || a.includes('united states space force'))
    return 'us-space-force';
  if (a.includes('eutelsat') || a.includes('oneweb')) return 'eutelsat-oneweb';
  if (a.includes('iridium')) return 'iridium';
  if (a.includes('planet labs')) return 'planet-labs';
  if (a.includes('ses')) return 'ses';
  if (a.includes('sirius')) return 'sirius-xm';
  if (a.includes('viasat') || a.includes('inmarsat')) return 'viasat';
  if (a.includes('amazon')) return 'amazon';
  if (a.includes('esa')) return 'esa';
  if (a.includes('nasa')) return 'nasa';
  return null;
}

export function provenanceSourceId(p: ImageProvenanceEntry): string {
  // Orbital instrument imagery (#360) gets its own section per instrument —
  // HiRISE + CTX surface patches are a distinct product class from general
  // NASA gallery photos, so they shouldn't be mixed into the NASA bucket.
  if (p.instrument === 'HiRISE') return 'nasa-hirise';
  if (p.instrument === 'CTX') return 'nasa-ctx';
  // Moon regional context layer (#361) — JAXA SELENE/Kaguya Terrain Camera,
  // the /moon CTX-equivalent. Its own section, surfaces JAXA.
  if (p.instrument === 'Kaguya TC') return 'jaxa-kaguya-tc';
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
 *   /images/missions/<id>/<nn>.jpg          → /missions panel + card hero
 *                                              (hero = slot 01)
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
  type Acc = { source: SourceLogo; bundles: PhotoBundle[]; texts: TextSourceEntry[] };
  const byId = new Map<string, Acc>(
    sources.map((s) => [s.id, { source: s, bundles: [], texts: [] }]),
  );
  // Bundle photos GLOBALLY before splitting by source. Earlier this code
  // bucketed per-source first and bundled per-bucket, which split the
  // same upstream image into two bundles when its entries routed to
  // different source-ids (e.g. one Hubble photo credited "ESA/Hubble"
  // on one mission and "NASA via Commons" on another rendered twice on
  // /credits). Bundling first guarantees one bundle per upstream image;
  // the bundle's source-id follows its representative entry.
  const sortedPhotos = [...photos].sort((a, b) => a.path.localeCompare(b.path));
  const allBundles = bundlePhotos(sortedPhotos);
  for (const bundle of allBundles) {
    const id = provenanceSourceId(bundle.representative);
    const grp = byId.get(id) ?? byId.get('wikimedia-commons');
    if (grp) grp.bundles.push(bundle);
  }
  for (const t of texts) {
    const id = textSourceId(t);
    const grp = byId.get(id) ?? byId.get('wikipedia');
    if (grp) grp.texts.push(t);
  }
  const out: CreditsGroup[] = [];
  for (const acc of byId.values()) {
    acc.bundles.sort((a, b) => a.representative.path.localeCompare(b.representative.path));
    acc.texts.sort((a, b) => a.id.localeCompare(b.id));
    if (acc.bundles.length + acc.texts.length === 0) continue;
    out.push({ source: acc.source, bundles: acc.bundles, texts: acc.texts });
  }
  return out;
}
