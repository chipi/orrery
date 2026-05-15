/**
 * Context-aware gallery credit helper (Milestone B of ADR-046 image credit
 * rollout). Given a structured agency string from `static/data/...`, it
 * returns a fully-rendered, locale-aware credit line for the gallery footer.
 *
 * Inputs come from existing data fields, so this is a pure mapping layer:
 *   - mission galleries: `mission.agency` (e.g. "NASA", "ESA", "JAXA",
 *     "ROSCOSMOS", "ISRO", "CNSA", "UAESA", "SpaceX", "Blue Origin",
 *     "Inspiration Mars").
 *   - panel galleries (ISS modules, moon sites, earth-orbit objects):
 *     compound strings like "NASA / ESA", "Roscosmos / NASA (funded)",
 *     "CSA / NASA" appear; we normalise them to a single agency when
 *     possible and fall back to the mixed-source credit when a clean
 *     primary cannot be derived.
 *
 * Per ADR-046 §5: do not collapse heterogeneous license terms into a
 * single false "NASA" credit. If we cannot identify a clean primary, we
 * keep the honest mixed-source string from Milestone A.
 *
 * No exact per-image attribution lives here — that's Milestone C
 * (image-provenance.json) and is rendered next to each photo, not in
 * the footer.
 */

import * as m from '$lib/paraglide/messages';

export type GalleryAgencyKey =
  | 'NASA'
  | 'ROSCOSMOS'
  | 'ESA'
  | 'CNSA'
  | 'ISRO'
  | 'JAXA'
  | 'UAESA'
  | 'CSA'
  | 'SPACEX'
  | 'BLUE_ORIGIN'
  | 'INSPIRATION_MARS'
  | 'MIXED'
  | 'UNKNOWN';

type SingleAgencyKey = Exclude<GalleryAgencyKey, 'MIXED' | 'UNKNOWN'>;

// User-facing agency labels. Same in every locale (proper nouns per
// docs/guides/i18n-style-guide.md §1/§2). The only exception is ROSCOSMOS,
// which we expand for Soviet-era missions to make the credit line
// accurate without falsely re-crediting the modern agency.
const AGENCY_LABELS: Record<SingleAgencyKey, string> = {
  NASA: 'NASA',
  ESA: 'ESA',
  JAXA: 'JAXA',
  ISRO: 'ISRO',
  CNSA: 'CNSA',
  ROSCOSMOS: 'Roscosmos / Soviet Academy of Sciences',
  UAESA: 'MBRSC (UAE Space Agency)',
  CSA: 'CSA',
  SPACEX: 'SpaceX',
  BLUE_ORIGIN: 'Blue Origin',
  INSPIRATION_MARS: 'Inspiration Mars Foundation',
};

function normalizeSingle(token: string): GalleryAgencyKey {
  const a = token.trim().toUpperCase();
  switch (a) {
    case 'NASA':
      return 'NASA';
    case 'ROSCOSMOS':
    case 'ROSKOSMOS':
    case 'SOVIET ACADEMY OF SCIENCES':
    case 'SOVIET':
      return 'ROSCOSMOS';
    case 'ESA':
      return 'ESA';
    case 'CNSA':
      return 'CNSA';
    case 'ISRO':
      return 'ISRO';
    case 'JAXA':
      return 'JAXA';
    case 'UAESA':
    case 'MBRSC':
    case 'UAE':
      return 'UAESA';
    case 'CSA':
      return 'CSA';
    case 'SPACEX':
      return 'SPACEX';
    case 'BLUE ORIGIN':
      return 'BLUE_ORIGIN';
    case 'INSPIRATION MARS':
    case 'INSPIRATION MARS FOUNDATION':
      return 'INSPIRATION_MARS';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Maps a (possibly compound) agency string to a single agency key when
 * the string clearly designates one operator, MIXED when multiple
 * recognised operators appear, and UNKNOWN otherwise.
 *
 * Accepted compound separators: `/`, `,`, ` and `, ` plus `, ` & `, ` + `.
 * Parenthetical notes (e.g. `Roscosmos / NASA (funded)`) are stripped
 * before tokenising.
 */
export function normalizeAgencyForCredit(agency: string): GalleryAgencyKey {
  if (!agency || !agency.trim()) return 'UNKNOWN';
  const cleaned = agency.replace(/\(.*?\)/g, ' ');
  const tokens = cleaned
    .split(/[/,&+]|\band\b|\bplus\b/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return 'UNKNOWN';
  const keys = new Set<SingleAgencyKey>();
  for (const t of tokens) {
    const k = normalizeSingle(t);
    if (k !== 'UNKNOWN' && k !== 'MIXED') keys.add(k);
  }
  if (keys.size === 0) return 'UNKNOWN';
  if (keys.size === 1) return [...keys][0]!;
  return 'MIXED';
}

/**
 * Mission GALLERY tab credit footer (`MissionPanel.svelte`).
 * Returns the agency-specific copy when the mission's agency resolves
 * to a single recognised operator; otherwise falls back to the honest
 * mixed-source string from Milestone A.
 */
export function missionGalleryCredit(missionAgency: string | undefined | null): string {
  if (!missionAgency) return m.mp_gallery_credit();
  const key = normalizeAgencyForCredit(missionAgency);
  if (key === 'UNKNOWN' || key === 'MIXED') return m.mp_gallery_credit();
  return m.mp_gallery_credit_agency({ agency_name: AGENCY_LABELS[key] });
}

/**
 * Panel GALLERY tab credit footer used by ISS modules, moon sites,
 * and earth-orbit objects. Same logic as `missionGalleryCredit`,
 * routed through the panel-specific Paraglide keys.
 */
export function panelGalleryCredit(agency: string | undefined | null): string {
  if (!agency) return m.panel_gallery_credit();
  const key = normalizeAgencyForCredit(agency);
  if (key === 'UNKNOWN' || key === 'MIXED') return m.panel_gallery_credit();
  return m.panel_gallery_credit_agency({ agency_name: AGENCY_LABELS[key] });
}
