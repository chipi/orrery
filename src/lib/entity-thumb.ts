/**
 * Round list thumbnails (L45, UXD-025): which file is the small photo of a row's own thing, and
 * what colour its ring is.
 *
 * The file is the 192 px WebP of the entity's blessed hero slot, listed in
 * static/data/entity-thumbs.json (scripts/build-entity-thumbs.ts reads the hero overrides, so the
 * slot the operator's review picked is the slot shown, as entityHero() does for the big hero).
 * Returned paths are root-relative; EntityThumb passes them through assetUrl().
 */
import manifestJson from '$data/entity-thumbs.json';

export interface EntityThumbManifest {
  surfaces: Record<
    string,
    { dir: string; flat?: boolean; slots: Record<string, string>; none: string[] }
  >;
}

/** The ring of a row with no identity colour (the C4 neutral). */
export const THUMB_NEUTRAL_RING = 'rgba(255,255,255,0.5)';

/** The thumb of `id` on `surface` (`missions`, `fleet`, `planets`, ...), or null when it has none. */
export function resolveThumb(
  manifest: EntityThumbManifest,
  surface: string,
  id: string,
): string | null {
  const s = manifest.surfaces[surface];
  const slot = s?.slots[id];
  if (!s || !slot) return null;
  return `/credit-thumbs/images/${s.dir}/${s.flat ? '' : `${id}/`}${slot}.1x1.webp`;
}

export const thumbOf = (surface: string, id: string): string | null =>
  resolveThumb(manifestJson as EntityThumbManifest, surface, id);

/** `thumbOf` for a `<surface>/<id>` reference, as the regime panel's per-bundle map stores it. */
export function thumbOfRef(ref: string | undefined | null): string | null {
  const i = ref ? ref.indexOf('/') : -1;
  return ref && i > 0 ? thumbOf(ref.slice(0, i), ref.slice(i + 1)) : null;
}

/** True for a `#rgb` / `#rrggbb` colour whose hue is teal or cyan (160 to 200 degrees). */
export function isTealOrCyan(color: string): boolean {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.1) return false; // grey
  const hue =
    60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return hue >= 160 && hue <= 200;
}

/**
 * The ring colour for a row's identity colour: the colour itself, or the neutral when the row has
 * none or its colour is teal or cyan (UXD-001: no teal ring; the dot or swatch elsewhere in the row
 * keeps the data colour).
 */
export function ringColor(identity: string | null | undefined): string {
  return !identity || isTealOrCyan(identity) ? THUMB_NEUTRAL_RING : identity;
}
