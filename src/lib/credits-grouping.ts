/**
 * Helpers for the public /credits bill of materials (ADR-046 Milestone D).
 *
 * Pure functions only — no DOM, no fetch. The page calls
 * `getImageProvenanceManifest()` + `getSourceLogos()` + `getTextSources()`
 * via `$lib/data` and feeds the entries here.
 */

import type { ImageProvenanceEntry, SourceLogo, TextSourceEntry } from '$lib/data';

export interface CreditsGroup {
  source: SourceLogo;
  photos: ImageProvenanceEntry[];
  texts: TextSourceEntry[];
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
 * agencies first, then platforms / publishers).
 */
export function groupBySource(
  sources: SourceLogo[],
  photos: ImageProvenanceEntry[],
  texts: TextSourceEntry[],
): CreditsGroup[] {
  const byId = new Map<string, CreditsGroup>(
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
  // Sort photos by path inside each group for stable display.
  for (const grp of byId.values()) {
    grp.photos.sort((a, b) => a.path.localeCompare(b.path));
    grp.texts.sort((a, b) => a.id.localeCompare(b.id));
  }
  // Drop empty groups.
  return Array.from(byId.values()).filter((g) => g.photos.length + g.texts.length > 0);
}
