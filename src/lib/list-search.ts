/**
 * List-route text-search matcher (RFC-027 Slice A).
 *
 * Pure substring-case-insensitive predicate used by the /missions +
 * /fleet search input. Caller assembles the haystack from whichever
 * card fields it wants searchable so this stays card-shape-agnostic
 * (MissionIndex + Mission overlay + FleetEntry have different fields,
 * but each route knows which of its own fields the user expects to
 * type against).
 *
 * Recommended haystack fields per the RFC:
 *   /missions: [card.name ?? card.id, card.agency, card.type, card.first]
 *   /fleet:    [card.name ?? card.id, card.agency, card.category, card.description, card.tagline]
 *
 * The current locale's resolved-overlay strings (the same object the
 * card already renders) feed in directly — no separate index, no
 * fallback to en-US for the matching corpus (that would surface cards
 * the user can't actually see).
 *
 * Non-goals (per RFC-027):
 *  - fuzzy / typo-tolerant matching (substring is enough at 98 + 245
 *    cards)
 *  - token splitting / multi-word AND semantics (single substring is
 *    what users expect from a card-grid filter; the visible result set
 *    is the disambiguator)
 *  - Unicode normalization (corpus is Latin-script across all 14
 *    locales — CJK overlays fall back to en-US for searchable fields
 *    today; revisit if/when those overlays land)
 */

/**
 * @returns true when `q` is empty/whitespace OR when any field in
 *   `haystackFields` contains `q` as a substring (case-insensitive).
 *   null/undefined fields are skipped (they don't match anything but
 *   they also don't crash).
 */
export function matchesQuery(
  haystackFields: ReadonlyArray<string | null | undefined>,
  q: string,
): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  for (const field of haystackFields) {
    if (field && field.toLowerCase().includes(needle)) return true;
  }
  return false;
}
