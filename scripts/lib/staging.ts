// Shared staging-ground helper (RFC-029 / #363, Slice 3).
//
// New image fetches land in static/images/_staging/<…> rather than the
// shipped tree, so a human reviews + promotes them via /dev/staging before
// they appear on the site or /credits. Only gallery-SLOT images
// (`/images/<category>/<id>/<NN>.<ext>` and their crop variants) in the
// staged categories are redirected — textures, logos, fonts, mission
// flight-tab thumbnails (non-numeric slot) and legacy single-file covers
// (`/images/<category>/<id>.jpg`, only two path segments) pass through to
// the shipped tree untouched.

export const STAGING_SEGMENT = '_staging';
export const STAGING_DIR = 'static/images/_staging';

/** Categories whose per-id gallery slots go through the staging ground. */
export const STAGED_CATEGORIES: ReadonlySet<string> = new Set([
  'missions',
  'fleet-galleries',
  'iss-modules',
  'tiangong-modules',
  'rockets',
  'satellites',
  'earth-objects',
  'mars-sites',
  'moon-sites',
  'small-bodies',
  'planets',
  'belts',
]);

// images/<cat>/<id>/<NN>(.1x1|.4x3|.16x9)?.<ext> — gallery slots only.
const SLOT_RE = /(^|\/)images\/([^/]+)\/[^/]+\/\d+(?:\.(?:1x1|4x3|16x9))?\.(?:jpe?g|png|webp)$/i;

/**
 * Redirect a shipped-tree gallery-slot destination into the staging
 * ground. Returns the path unchanged for anything that isn't a staged
 * category's gallery slot (textures/logos/thumbnails/legacy covers/etc).
 */
export function toStagingDest(dest: string): string {
  const m = dest.match(SLOT_RE);
  if (!m) return dest;
  const category = m[2];
  if (!STAGED_CATEGORIES.has(category)) return dest;
  return dest.replace(/(^|\/)images\//, `$1images/${STAGING_SEGMENT}/`);
}
